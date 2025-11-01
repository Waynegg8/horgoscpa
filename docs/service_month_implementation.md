# service_month 功能实现说明

## 📋 功能概述

添加 `service_month` 字段到任务系统，用于标识任务归属的服务月份，解决"1月的任务可能2月才到期"的管理问题。

---

## 🎯 核心逻辑

### service_month 设置规则

| 场景 | service_month 来源 | 可否修改 |
|-----|------------------|---------|
| **自动生成任务** | 生成器执行月份（如1月25日生成 → "2025-01"） | ✅ 可修改 |
| **手动创建任务** | 创建时的当前月份（默认值） | ✅ 可修改 |
| **编辑现有任务** | 保持原值 | ✅ 可修改 |

**格式：** `YYYY-MM` （如 `2025-01`）  
**必填：** 是（不允许为空）

---

## 🗄️ 数据库变更

### 迁移文件
`cloudflare/worker-router/migrations/2025-11-01T220000Z_add_service_month.sql`

```sql
-- 1. 添加字段
ALTER TABLE ActiveTasks ADD COLUMN service_month TEXT;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_active_tasks_service_month 
  ON ActiveTasks(service_month);

-- 3. 回填历史数据（从任务名称解析或使用创建时间）
UPDATE ActiveTasks 
SET service_month = strftime('%Y-%m', created_at)
WHERE service_month IS NULL AND is_deleted = 0;
```

---

## 🔧 后端API变更

### 1. 任务生成器 (`task_generator.js`)

**修改点：** 自动生成任务时设置 `service_month`

```javascript
// 生成任务时添加
const serviceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

INSERT INTO ActiveTasks (
  ...,
  service_month,
  ...
) VALUES (..., ?, ...)
```

---

### 2. 任务列表 API (`tasks.js` - GET /api/v1/tasks)

**新增查询参数：**
- `service_year`: 服务年份（如 `2025`）
- `service_month`: 服务月份（1-12，如 `1`）
- `hide_completed`: 隐藏已完成任务（`1` 或 `0`）

**筛选逻辑：**
```javascript
// 按服务月份筛选
if (serviceYear && serviceMonth) {
  where.push("t.service_month = ?");
  binds.push(`${serviceYear}-${serviceMonth.padStart(2, '0')}`);
} else if (serviceYear) {
  where.push("t.service_month LIKE ?");
  binds.push(`${serviceYear}-%`);
}

// 隐藏已完成
if (hideCompleted) {
  where.push("t.status != 'completed'");
}
```

**返回数据增加：**
```javascript
{
  taskId: "123",
  taskName: "客户A - 2025年1月记账",
  serviceMonth: "2025-01",  // ← 新增字段
  dueDate: "2025-02-05",
  // ...
}
```

---

### 3. 创建任务 API (`tasks.js` - POST /api/v1/tasks)

**请求参数（新增）：**
- `service_month`: 可选，默认当前月份

**逻辑：**
```javascript
let serviceMonth = body?.service_month || null;
if (!serviceMonth) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  serviceMonth = `${year}-${month}`;
}

// 格式验证
if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) {
  errors.push({ field: "service_month", message: "格式需 YYYY-MM" });
}
```

---

### 4. 更新任务 API (`tasks.js` - PUT /api/v1/tasks/:id)

**可更新字段（新增）：**
```javascript
if (body.hasOwnProperty('service_month')) {
  const serviceMonth = body.service_month ? String(body.service_month).trim() : null;
  if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) {
    errors.push({ field: "service_month", message: "格式需 YYYY-MM" });
  } else {
    updates.push("service_month = ?");
    binds.push(serviceMonth);
  }
}
```

---

## 🖥️ 前端变更

### 任务页面 (`tasks.html`)

#### 1. 工具栏增加筛选控件

```html
<!-- 年份筛选 -->
<select id="f_year">
  <option value="all">全部年份</option>
  <option value="2025" selected>2025年</option>
  <option value="2024">2024年</option>
  <!-- 动态生成最近5年 -->
</select>

<!-- 月份筛选 -->
<select id="f_month">
  <option value="all">全部月份</option>
  <option value="1">1月</option>
  <option value="2">2月</option>
  ...
</select>

<!-- 隐藏已完成 -->
<label>
  <input type="checkbox" id="f_hide_completed" />
  <span>隐藏已完成</span>
</label>
```

#### 2. 初始化逻辑

```javascript
async function init() {
  // 初始化年份下拉（最近5年，默认当前年）
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const selected = i === 0 ? ' selected' : '';
    yearSelect.innerHTML += `<option value="${year}"${selected}>${year}年</option>`;
  }
  
  // 默认设置：显示当前年 + 全部月份 + 隐藏已完成
  // 这样能看到当前年所有未完成的任务（包括历史遗留的）
  document.getElementById('f_month').value = 'all';  // 全部月份
  document.getElementById('f_hide_completed').checked = true;  // 默认隐藏已完成
  
  await loadAllTasks();
}
```

**默认筛选逻辑：**
- ✅ 年份：当前年（如 2025年）
- ✅ 月份：**全部月份**（不限制月份）
- ✅ 隐藏已完成：**默认勾选**

**效果：** 显示当前年所有未完成的任务，包括历史遗留任务

#### 3. 加载任务逻辑

```javascript
async function loadAllTasks() {
  const params = new URLSearchParams({ perPage: '1000' });
  
  // 年月筛选
  const year = document.getElementById('f_year').value;
  const month = document.getElementById('f_month').value;
  if (year !== 'all') params.append('service_year', year);
  if (month !== 'all') params.append('service_month', month);
  
  // 隐藏已完成
  if (document.getElementById('f_hide_completed').checked) {
    params.append('hide_completed', '1');
  }
  
  const res = await fetch(`${apiBase}/tasks?${params}`, { credentials: 'include' });
  // ...
}
```

#### 4. 事件监听器

```javascript
// 年月筛选和隐藏已完成 - 需要重新加载任务
document.getElementById('f_year').addEventListener('change', loadAllTasks);
document.getElementById('f_month').addEventListener('change', loadAllTasks);
document.getElementById('f_hide_completed').addEventListener('change', loadAllTasks);
```

---

## 📊 使用场景示例

### 场景 1：日常工作视图（默认）⭐

**默认筛选：** `2025年` + `全部月份` + ☑️ `隐藏已完成`

**"隐藏已完成"的真正含义：**
- ✅ 隐藏**全部完成**的服务组（整组不显示）
- ✅ 保留**有未完成任务**的服务组，并显示该组的**所有任务**（包括已完成的）

**效果：**
```
工具栏：
[2025年▼] [全部月份▼] ☑ 隐藏已完成

▼ 客户A (12345678)
  ▼ 记账服务 - 2025年9月 (5个任务: 4已完成, 1未完成)
    ✅ 收集凭证 | 已完成
    ✅ 输入账务 | 已完成
    ✅ 月结对账 | 已完成
    ✅ 审核     | 已完成
    ⏳ 报表产制 | 待开始 ⚠️逾期2个月
  
  ▼ 记账服务 - 2025年10月 (5个任务: 3已完成, 2未完成)
    ✅ 收集凭证 | 已完成
    ✅ 输入账务 | 已完成
    ✅ 月结对账 | 已完成
    ⏳ 审核 | 进行中 ⚠️逾期
    ⏳ 归档 | 待开始 ⚠️逾期
  
  ▼ 记账服务 - 2025年11月 (3个任务: 0已完成, 3未完成)
    ⏳ 收资料 | 进行中
    ⏳ 记账   | 待开始
    ⏳ 审核   | 待开始

▼ 客户B (87654321)
  ▼ 税务申报 - 2025年10月 (2个任务: 1已完成, 1未完成)
    ✅ 准备资料 | 已完成
    ⏳ 营业税申报 | 待开始 ⚠️逾期
```

**查询逻辑：**
```sql
-- 后端：返回所有符合年月筛选的任务（不过滤已完成）
WHERE service_month LIKE '2025-%'

-- 前端：智能筛选
// 1. 按"客户-服务-月份"分组
// 2. 对于每个组，如果有未完成任务，显示该组的所有任务（包括已完成的）
// 3. 对于全部完成的组，隐藏整组
```

**核心优势：**
- ✅ **一眼看到所有需要处理的任务**（包括历史遗留的）
- ✅ **看到完整进度**（如"5个任务: 3已完成, 2未完成"）
- ✅ **上下文完整**，知道已经完成了什么，还剩什么没做
- ✅ **便于判断优先级**，逾期任务标注警告
- ✅ **不会漏掉以前月份未完成的任务**

---

### 场景 2：查看某月的完整情况

**操作：** 选择 `2025年` + `10月` + ☐ `取消隐藏已完成`

**效果：**
```
▼ 客户A (12345678)
  ▼ 记账服务 - 2025年10月 (5个任务: 3已完成, 2未完成)
    ✅ 收集凭证 | 到期:10-28 | 已完成
    ✅ 输入账务 | 到期:11-03 | 已完成
    ⏳ 审核 | 到期:11-03 | 进行中 ⚠️逾期
    ✅ 月结对账 | 到期:11-05 | 已完成
    ⏳ 归档 | 到期:11-10 | 待开始 ⚠️逾期
```

**查询逻辑：**
```sql
WHERE service_month = '2025-10'
```

**用途：**
- 📊 **回顾某月工作完成情况**
- 📈 **统计某月任务完成率**
- 🔍 **追溯历史遗留问题的来源**

---

### 场景 3：只看某月未完成的任务

**操作：** 选择 `2025年` + `10月` + ☑️ `隐藏已完成`

**效果：**
```
▼ 客户A (12345678)
  ▼ 记账服务 - 2025年10月 (2个任务: 未完成)
    ⏳ 审核 | 到期:11-03 | 进行中 ⚠️逾期
    ⏳ 归档 | 到期:11-10 | 待开始 ⚠️逾期
```

**查询逻辑：**
```sql
WHERE service_month = '2025-10' AND status != 'completed'
```

**用途：**
- 🎯 **聚焦某月的遗留问题**
- ⚡ **快速处理特定月份的积压任务**

---

### 场景 4：手动创建临时任务

**操作：** 点击"新增任务"

**表单默认值：**
- 任务名称：（用户输入）
- 到期日期：（用户选择）
- service_month：**自动填充当前月份**（如 `2025-11`），用户可修改

**保存结果：**
```json
{
  "task_name": "客户B - 临时税务咨询",
  "due_date": "2025-11-30",
  "service_month": "2025-11",  // 默认创建月份
  "status": "pending"
}
```

---

## ✅ 核心优势

| 维度 | 优势 |
|-----|-----|
| **语义清晰** | "服务月份"准确描述任务归属，不涉及收费概念 |
| **适用性强** | 适用所有任务，包括收费和不收费的 |
| **查询简单** | 一个字段解决问题，索引优化性能 |
| **历史追溯** | 完整呈现某月的工作范围和完成情况 |
| **默认智能** | 手动创建时自动填充当前月份 |
| **灵活可改** | 用户可随时修改任务的归属月份 |

---

## 🚀 部署检查清单

- [ ] 运行数据库迁移 `2025-11-01T220000Z_add_service_month.sql`
- [ ] 验证历史任务已回填 `service_month`
- [ ] 部署后端 API 更新（`task_generator.js`, `tasks.js`）
- [ ] 部署前端页面更新（`tasks.html`）
- [ ] 测试自动生成任务是否正确设置 `service_month`
- [ ] 测试手动创建任务的默认值和修改功能
- [ ] 测试年月筛选和隐藏已完成功能

---

## 📝 后续优化建议

1. **跨月项目支持**：未来可支持多个月份（如 `["2025-01", "2025-02"]`）
2. **统计报表**：按 `service_month` 生成月度任务完成率报表
3. **收费对账**：将 `service_month` 与 `ServiceBillingSchedule` 关联，实现自动对账
4. **提醒功能**：当前月任务未完成时，在下个月页面顶部显示提醒横幅

---

**实现日期：** 2025-11-01  
**文档版本：** 1.0

