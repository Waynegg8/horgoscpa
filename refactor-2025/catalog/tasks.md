# tasks.html 重构记录

## 文件信息
- 文件路径：tasks.html
- 总行数：1194行
- 页面标题：任務管理
- 样式文件：common.css, tasks-page.css

## 分段计划
将按每100行分段分析和重构：
- 段1：行1-100（步骤47）
- 段2：行101-200（步骤48）
- 段3：行201-300（步骤49）
- ...
- 段12：行1101-1194（步骤58）

## 组件清单
（待提取）

## API端点
（待记录）

## 数据库字段
（待记录）

---

### 段1 (行1-100)

#### 完整代码
```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="任務管理" />
    <title>任務管理</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/assets/css/common.css" />
    <link rel="stylesheet" href="/assets/css/tasks-page.css" />
    
    <!-- 预加载系统 -->
    <script src="/assets/js/data-cache.js"></script>
    <script src="/assets/js/fetch-interceptor.js"></script>
    <script src="/assets/js/prerender.js"></script>
    <script src="/assets/js/page-prerender.js"></script>
    
    <style>
      /* 日期选择器样式 */
      input[type="date"] {
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        cursor: pointer !important;
        position: relative !important;
      }
      
      input[type="date"]::-webkit-calendar-picker-indicator {
        position: absolute !important;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100% !important; height: 100% !important;
        margin: 0; padding: 0; opacity: 0; cursor: pointer !important;
      }
      
      .client-group { /* 客户组样式 */ }
      .client-header { /* 客户头部样式 */ }
      .service-group { /* 服务组样式 */ }
      .service-header { /* 服务头部样式 */ }
      .task-row { /* 任务行样式 - 7列网格布局 */ }
    </style>
  </head>
  <body>
    <main class="clients-content" style="padding:24px;">
      <section class="clients-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="toolbar">
            <input id="q" type="search" placeholder="搜尋任務/客戶/統編…" />
            <select id="f_year">
              <option value="all">全部年份</option>
            </select>
            <select id="f_month">
              <option value="all">全部月份</option>
              <option value="1">1月</option>
              ...
            </select>
```

#### 发现的内容
- **HTML头部**:
  - 页面标题：任務管理
  - CSS文件：common.css, tasks-page.css
  - 预加载系统：data-cache.js, fetch-interceptor.js, prerender.js, page-prerender.js
- **内联样式**:
  - 日期选择器样式（完整框可点击）
  - .client-group - 客户分组容器
  - .client-header - 客户头部（可点击、hover效果）
  - .service-group - 服务分组
  - .service-header - 服务头部（可点击、hover效果）
  - .task-row - 任务行（7列网格布局：40px 2fr 140px 90px 110px 110px 100px）
- **页面结构**:
  - 工具栏：搜索框、年份筛选、月份筛选
- **组件识别**:
  - TasksToolbar组件（搜索和筛选工具栏）
  - TaskClientGroup组件（客户分组）
  - TaskServiceGroup组件（服务分组）
  - TaskRow组件（任务行）

## 对比验证 - 段1

### 旧代码功能清单
- [x] HTML头部结构 ✓
- [x] CSS引用（common.css, tasks-page.css）✓
- [x] 预加载系统脚本 ✓
- [x] 日期选择器样式 ✓
- [x] 客户分组样式 ✓
- [x] 服务分组样式 ✓
- [x] 任务行样式（7列网格）✓
- [x] 搜索框 ✓
- [x] 年份筛选下拉框 ✓
- [x] 月份筛选下拉框 ✓

### 新代码实现状态
- ✓ 样式将通过CSS模块或styled-components实现
- ✓ 预加载系统将在主应用中配置
- ✓ 工具栏将提取为TasksToolbar组件
- ✓ 客户/服务/任务结构将提取为对应组件

### 使用的组件
- TasksToolbar.jsx - 搜索和筛选工具栏（待创建）
- TaskClientGroup.jsx - 客户分组（待创建）
- TaskServiceGroup.jsx - 服务分组（待创建）
- TaskRow.jsx - 任务行（可复用dashboard的TaskRow或创建新的）

## 回溯检查 - 段1
⚠️ 无需回溯。与dashboard.html段1类似：
- HTML头部结构一致
- 预加载系统一致
- 样式定义方式一致
- 工具栏结构类似（都有搜索和筛选）

---

### 段2 (行101-200)

#### 完整代码
```html
              <option value="5">5月</option>
              ...
              <option value="12">12月</option>
            </select>
            <select id="f_assignee">
              <option value="all">全部負責人</option>
            </select>
            <select id="f_tags">
              <option value="all">全部標籤</option>
            </select>
            <select id="f_status">
              <option value="all">全部狀態</option>
              <option value="in_progress">進行中</option>
              <option value="completed">已完成</option>
            </select>
            <select id="f_due">
              <option value="all">全部到期狀態</option>
              <option value="soon">即將到期（≤3天）</option>
              <option value="overdue">已逾期</option>
            </select>
            <label>
              <input type="checkbox" id="f_hide_completed" />
              <span>隐藏已完成</span>
            </label>
            <button id="btn-batch-assign">批量分配</button>
            <button id="btn-new-task">新增任務</button>
          </div>
        </div>

        <p id="tasks-error"></p>
        <div id="tasks-list"></div>
      </section>
    </main>

    <!-- 批量分配弹窗 -->
    <div class="modal-overlay" id="batchModal">
      <div class="modal">
        <div class="modal__header">
          <h2>批量分配負責人</h2>
          <button id="batch-close">✕</button>
        </div>
        <div class="modal__body">
          <p>已選擇 <strong id="selected-count">0</strong> 個任務</p>
          <div class="field">
            <label for="batch_assignee">選擇負責人</label>
            <select id="batch_assignee">
              <option value="">請選擇負責人</option>
            </select>
          </div>
          <div class="modal__actions">
            <button id="batch-cancel">取消</button>
            <button id="batch-submit">確認分配</button>
          </div>
        </div>
      </div>
    </div>

    <script>
      (function(){
        const apiBase = ...;
        
        let allTasks = [];
        let allClients = [];
        let allTags = [];
        let employeesList = [];
        let selectedTaskIds = new Set();

        const zhStatus = { in_progress:'進行中', completed:'已完成', cancelled:'已取消' };

        async function init() {
          // 初始化年份下拉（最近5年）
          const currentYear = new Date().getFullYear();
          const yearSelect = document.getElementById('f_year');
          for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const selected = i === 0 ? ' selected' : '';
            yearSelect.innerHTML += `<option value="${year}"${selected}>${year}年</option>`;
          }
          
          // 默认：当前年 + 全部月份 + 隐藏已完成
          document.getElementById('f_month').value = 'all';
          document.getElementById('f_hide_completed').checked = true;
          
          await Promise.all([
            loadEmployees(),
            loadAllClients(),
            loadAllTags(),
            loadAllTasks()
          ]);
```

#### 发现的内容
- **工具栏筛选器（继续）**:
  - f_assignee - 负责人筛选
  - f_tags - 标签筛选
  - f_status - 状态筛选（进行中/已完成）
  - f_due - 到期状态筛选（即将到期≤3天/已逾期）
  - f_hide_completed - 隐藏已完成复选框
  - btn-batch-assign - 批量分配按钮
  - btn-new-task - 新增任务按钮
- **页面容器**:
  - tasks-error - 错误提示
  - tasks-list - 任务列表容器
- **批量分配弹窗**:
  - modal-overlay, modal结构
  - selected-count - 已选择任务数
  - batch_assignee - 负责人选择器
  - batch-cancel, batch-submit - 取消和确认按钮
- **JavaScript初始化**:
  - API base URL判断
  - 状态变量：allTasks, allClients, allTags, employeesList, selectedTaskIds
  - zhStatus - 状态中文映射
  - init函数：初始化年份下拉（最近5年），默认筛选（当前年+全部月份+隐藏已完成）
  - 并行加载：loadEmployees, loadAllClients, loadAllTags, loadAllTasks
- **组件识别**:
  - BatchAssignModal组件（批量分配弹窗）
  - 需要状态管理：筛选状态、选中任务集合

## 对比验证 - 段2

### 旧代码功能清单
- [x] 月份选项（5-12月）✓
- [x] 负责人筛选下拉框 ✓
- [x] 标签筛选下拉框 ✓
- [x] 状态筛选下拉框 ✓
- [x] 到期状态筛选下拉框 ✓
- [x] 隐藏已完成复选框 ✓
- [x] 批量分配按钮 ✓
- [x] 新增任务按钮 ✓
- [x] 错误提示容器 ✓
- [x] 任务列表容器 ✓
- [x] 批量分配弹窗结构 ✓
- [x] JavaScript状态变量 ✓
- [x] API base配置 ✓
- [x] 年份初始化（最近5年）✓
- [x] 默认筛选设置 ✓
- [x] 并行数据加载 ✓

### 新代码实现状态
- ✓ 工具栏筛选器将整合到TasksToolbar组件
- ✓ 批量分配弹窗提取为BatchAssignModal组件
- ✓ 状态管理使用React hooks（useState）
- ✓ 数据加载使用自定义hook（useTasksData）
- ✓ API配置复用现有配置

### 使用的组件
- TasksToolbar.jsx - 完整工具栏（包含所有筛选器）
- BatchAssignModal.jsx - 批量分配弹窗
- hooks/useTasksData.js - 任务数据管理hook

## 回溯检查 - 段2
⚠️ 无需回溯。与dashboard类似的模式：
- 筛选器结构与dashboard类似
- 弹窗模态框结构标准
- 状态管理模式一致
- 并行数据加载策略一致

---

### 段3 (行201-300)

#### 完整代码
```javascript
        }
        
        // 加载员工
        async function loadEmployees() {
          try {
            const res = await fetch(`${apiBase}/users`, { credentials: 'include' });
            if (res.status === 401) { location.href = '/login?redirect=/internal/tasks'; return; }
            const json = await res.json();
            if (json.ok) {
              employeesList = json.data || [];
              
              // 填充筛选下拉
              document.getElementById('f_assignee').innerHTML = ...
              
              // 填充批量分配下拉
              document.getElementById('batch_assignee').innerHTML = ...
              
              // 填充快速新增任务的负责人下拉框
              document.getElementById('quick-assignee').innerHTML = ...
            }
          } catch (e) {
            console.error('載入員工失敗', e);
          }
        }
        
        // 加载客户
        async function loadAllClients() {
          try {
            const res = await fetch(`${apiBase}/clients?perPage=1000`, { credentials: 'include' });
            if (res.status === 401) { location.href = '/login?redirect=/internal/tasks'; return; }
            const json = await res.json();
            if (json.ok) {
              allClients = json.data || [];
            }
          } catch (e) {
            console.error('載入客戶失敗', e);
          }
        }
        
        // 加载标签
        async function loadAllTags() {
          try {
            const res = await fetch(`${apiBase}/tags`, { credentials: 'include' });
            if (res.status === 401) { location.href = '/login?redirect=/internal/tasks'; return; }
            const json = await res.json();
            if (json.ok) {
              allTags = json.data || [];
              document.getElementById('f_tags').innerHTML = ...
            }
          } catch (e) {
            console.error('載入標籤失敗', e);
          }
        }
        
        // 加载任务
        async function loadAllTasks() {
          try {
            const params = new URLSearchParams({ perPage: '1000' });
            
            // 年月筛选
            const year = document.getElementById('f_year').value;
            const month = document.getElementById('f_month').value;
            if (year !== 'all') params.append('service_year', year);
            if (month !== 'all') params.append('service_month', month);
            
            // 注意：不传 hide_completed 给后端，前端自己处理
            
            const res = await fetch(`${apiBase}/tasks?${params}`, { credentials: 'include' });
            if (res.status === 401) { location.href = '/login?redirect=/internal/tasks'; return; }
            const json = await res.json();
            if (json.ok) {
              allTasks = json.data || [];
              render();
            }
          } catch (e) {
            console.error('載入任務失敗', e);
            document.getElementById('tasks-error').textContent = '載入失敗';
          }
        }
        
        // 筛选任务
        function filterTasks() {
          const q = document.getElementById('q').value.toLowerCase();
          const assignee = document.getElementById('f_assignee').value;
          const tags = document.getElementById('f_tags').value;
          const status = document.getElementById('f_status').value;
          const due = document.getElementById('f_due').value;
          
          return allTasks.filter(task => {
            // 搜索
            if (q && !task.taskName.toLowerCase().includes(q) && 
                !task.clientName.toLowerCase().includes(q) &&
                !(task.clientTaxId && task.clientTaxId.includes(q))) {
              return false;
            }
```

#### 发现的内容
- **loadEmployees函数**:
  - API: /users
  - 401处理：重定向到登录页
  - 填充3个下拉框：f_assignee（筛选）、batch_assignee（批量分配）、quick-assignee（快速新增）
  - 错误处理
- **loadAllClients函数**:
  - API: /clients?perPage=1000
  - 401处理
  - 存储到allClients
  - 错误处理
- **loadAllTags函数**:
  - API: /tags
  - 401处理
  - 填充f_tags下拉框
  - 错误处理
- **loadAllTasks函数**:
  - API: /tasks?perPage=1000&service_year=&service_month=
  - 查询参数：perPage, service_year, service_month
  - 注意：hide_completed在前端处理，不传给后端
  - 401处理
  - 加载后调用render()
  - 错误处理并显示到tasks-error
- **filterTasks函数**（开始）:
  - 获取筛选条件：q（搜索）、assignee、tags、status、due
  - 搜索逻辑：匹配taskName、clientName、clientTaxId
- **API端点**:
  - GET /users - 获取员工列表
  - GET /clients?perPage=1000 - 获取客户列表
  - GET /tags - 获取标签列表
  - GET /tasks?perPage=1000&service_year=&service_month= - 获取任务列表
- **组件识别**:
  - 数据加载逻辑将整合到useTasksData hook

## 对比验证 - 段3

### 旧代码功能清单
- [x] loadEmployees函数 ✓
  - [x] API调用 /users ✓
  - [x] 401处理 ✓
  - [x] 填充f_assignee下拉框 ✓
  - [x] 填充batch_assignee下拉框 ✓
  - [x] 填充quick-assignee下拉框 ✓
  - [x] 错误处理 ✓
- [x] loadAllClients函数 ✓
  - [x] API调用 /clients ✓
  - [x] 401处理 ✓
  - [x] 存储数据 ✓
  - [x] 错误处理 ✓
- [x] loadAllTags函数 ✓
  - [x] API调用 /tags ✓
  - [x] 401处理 ✓
  - [x] 填充f_tags下拉框 ✓
  - [x] 错误处理 ✓
- [x] loadAllTasks函数 ✓
  - [x] API调用 /tasks ✓
  - [x] 查询参数构建 ✓
  - [x] 年月筛选 ✓
  - [x] 401处理 ✓
  - [x] 调用render() ✓
  - [x] 错误处理 ✓
- [x] filterTasks函数（开始）✓
  - [x] 获取筛选条件 ✓
  - [x] 搜索逻辑 ✓

### 新代码实现状态
- ✓ 数据加载函数将整合到useTasksData hook
- ✓ API调用使用统一的fetch wrapper
- ✓ 401处理使用统一的认证逻辑
- ✓ 下拉框填充通过React状态和渲染实现
- ✓ 筛选逻辑使用useMemo优化
- ✓ 错误处理通过状态管理

### 使用的组件/工具
- hooks/useTasksData.js - 任务数据管理hook（需创建）
- hooks/useEmployees.js - 员工数据hook（可选，或整合到useTasksData）
- hooks/useClients.js - 客户数据hook（可选）
- hooks/useTags.js - 标签数据hook（可选）

## 回溯检查 - 段3
⚠️ 无需回溯。与dashboard数据加载模式一致：
- API调用结构相同
- 401处理方式相同
- 错误处理模式相同
- 数据存储和状态管理模式一致

---

### 段4 (行301-400)

#### 完整代码
```javascript
            
            // 负责人
            if (assignee !== 'all' && String(task.assigneeUserId) !== assignee) {
              return false;
            }
            
            // 状态
            if (status !== 'all' && task.status !== status) {
              return false;
            }
            
            // 到期
            if (due === 'soon') {
              const dueDate = new Date(task.dueDate);
              const today = new Date();
              const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              if (diff > 3 || diff < 0) return false;
            } else if (due === 'overdue') {
              const dueDate = new Date(task.dueDate);
              const today = new Date();
              if (dueDate >= today || task.status === 'completed') return false;
            }
            
            return true;
          });
        }
        
        // 按客户和服务+月份分组
        function groupByClientAndService(tasks) {
          const hideCompleted = document.getElementById('f_hide_completed').checked;
          const grouped = new Map();
          
          // 先添加所有客户
          allClients.sort(...).forEach(client => {
            grouped.set(client.clientId, {
              clientId, clientName, clientTaxId,
              serviceGroups: new Map()
            });
          });
          
          // 添加任务（按服务+月份分组）
          tasks.forEach(task => {
            const groupKey = serviceMonth ? `${serviceName}|||${serviceMonth}` : serviceName;
            
            if (!client.serviceGroups.has(groupKey)) {
              client.serviceGroups.set(groupKey, {
                serviceName, serviceMonth, clientServiceId, serviceId, clientId,
                tasks: []
              });
            }
            
            client.serviceGroups.get(groupKey).tasks.push(task);
          });
          
          // 如果勾选"隐藏已完成"，过滤掉全部完成的组
          if (hideCompleted) {
            grouped.forEach(client => {
              const filteredGroups = new Map();
              
              client.serviceGroups.forEach((group, key) => {
                const hasIncomplete = group.tasks.some(t => t.status !== 'completed');
                if (hasIncomplete) {
                  filteredGroups.set(key, group);
                }
              });
              
              client.serviceGroups = filteredGroups;
            });
          }
          
          // 排序服务组和任务
          grouped.forEach(client => {
            const sortedGroups = new Map([...client.serviceGroups.entries()].sort((a, b) => {
              // 先按服务名排序
              const serviceCompare = a[1].serviceName.localeCompare(b[1].serviceName, 'zh-TW');
              if (serviceCompare !== 0) return serviceCompare;
```

#### 发现的内容
- **filterTasks函数（继续）**:
  - 负责人筛选：匹配assigneeUserId
  - 状态筛选：匹配status
  - 到期状态筛选：
    - soon：计算距离到期日≤3天且≥0天
    - overdue：到期日<今天且状态不是completed
- **groupByClientAndService函数**:
  - 获取hideCompleted复选框状态
  - 创建Map存储分组数据
  - 先添加所有客户（按公司名排序）
  - 遍历任务按服务+月份分组（groupKey: serviceName|||serviceMonth）
  - 如果hideCompleted=true：过滤掉所有任务都已完成的组
  - 排序服务组：先按服务名排序（中文排序）
- **数据结构**:
  - grouped: Map<clientId, {clientId, clientName, clientTaxId, serviceGroups}>
  - serviceGroups: Map<groupKey, {serviceName, serviceMonth, clientServiceId, serviceId, clientId, tasks[]}>
- **组件识别**:
  - 筛选逻辑将使用useMemo实现
  - 分组逻辑将使用useMemo实现
  - 中文排序需要使用localeCompare('zh-TW')

## 对比验证 - 段4

### 旧代码功能清单
- [x] filterTasks函数（继续）✓
  - [x] 负责人筛选 ✓
  - [x] 状态筛选 ✓
  - [x] 到期状态筛选（soon/overdue）✓
  - [x] soon：≤3天且≥0天 ✓
  - [x] overdue：已过期且未完成 ✓
- [x] groupByClientAndService函数 ✓
  - [x] 获取hideCompleted状态 ✓
  - [x] 创建Map分组结构 ✓
  - [x] 添加所有客户（按公司名排序）✓
  - [x] 按服务+月份分组任务 ✓
  - [x] groupKey组合键（serviceName|||serviceMonth）✓
  - [x] hideCompleted逻辑：过滤全部完成的组 ✓
  - [x] 服务组排序（中文）✓

### 新代码实现状态
- ✓ 筛选逻辑使用useMemo优化
- ✓ 分组逻辑使用useMemo优化
- ✓ Map数据结构保持一致
- ✓ 中文排序使用localeCompare
- ✓ hideCompleted逻辑保持一致
- ✓ 到期日期计算逻辑保持一致

### 使用的组件/工具
- hooks/useTasksData.js - 整合筛选和分组逻辑
- utils/taskUtils.js - 任务相关工具函数（可选）

## 回溯检查 - 段4
⚠️ 无需回溯。筛选和分组逻辑清晰：
- 筛选条件完整（搜索、负责人、标签、状态、到期）
- 分组逻辑合理（客户->服务+月份->任务）
- hideCompleted逻辑特殊：过滤组而非任务
- 排序使用中文locale
- 数据结构使用Map保持性能

---

### 段5 (行401-500)

#### 完整代码
```javascript
            
            // 再按月份降序排序（最新月份在前）
            return (b[1].serviceMonth || '').localeCompare(a[1].serviceMonth || '');
          }));
          
          client.serviceGroups = sortedGroups;
        });
        
        return grouped;
      }
      
      // 渲染
      function render() {
        const filtered = filterTasks();
        const grouped = groupByClientAndService(filtered);
        const container = document.getElementById('tasks-list');
        
        let html = '';
        
        grouped.forEach((client, clientId) => {
          const hasGroups = client.serviceGroups.size > 0;
          const clientIdSafe = clientId.replace(/[^a-zA-Z0-9]/g, '_');
          
          html += `
            <div class="client-group">
              <div class="client-header" onclick="toggleClient('${clientIdSafe}')">
                <span id="icon-${clientIdSafe}" style="font-size:16px;">▶</span>
                <strong style="font-size:16px;color:#1f2937;">${client.clientName} ${client.clientTaxId !== '—' ? `(${client.clientTaxId})` : ''}</strong>
              </div>
              <div id="group-${clientIdSafe}" style="display:none;">
          `;
          
          if (!hasGroups) {
            html += `
              <div style="padding:16px;text-align:center;color:#9ca3af;font-size:14px;">
                此客戶目前沒有任務
              </div>
            `;
          } else {
            client.serviceGroups.forEach((group, groupKey) => {
              const tasks = group.tasks;
              if (tasks.length === 0) return;
              
              // 计算完成情况
              const completed = tasks.filter(t => t.status === 'completed').length;
              const total = tasks.length;
              
              // 格式化服务+月份标题
              const monthText = group.serviceMonth ? ` - ${group.serviceMonth.slice(0, 4)}年${parseInt(group.serviceMonth.slice(5))}月` : '';
              const serviceTitle = `${group.serviceName}${monthText}`;
              
              // 生成唯一ID：使用Base64编码确保ID唯一且有效
              const groupIdSafe = `${clientIdSafe}_${btoa(encodeURIComponent(groupKey)).replace(/[^a-zA-Z0-9]/g, '_')}`;
              
              html += `
                <div class="service-group">
                  <div class="service-header" style="display:flex;align-items:center;justify-content:space-between;">
                    <div onclick="toggleService('${groupIdSafe}')" style="flex:1;cursor:pointer;display:flex;align-items:center;gap:8px;">
                      <span id="icon-${groupIdSafe}" style="font-size:14px;">▶</span>
                      <strong style="font-size:14px;color:#374151;">${serviceTitle}</strong>
                      <span style="color:#9ca3af;font-size:13px;">(${total}個任務: ${completed}已完成, ${total - completed}未完成)</span>
                    </div>
                    <button onclick="openQuickAddTask('${group.clientId}', '${group.clientServiceId}', '${group.serviceId}', '${group.serviceName}', '${group.serviceMonth}', event)" 
                            style="padding:4px 12px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;"
                            title="為此服務新增任務">
                      <span style="font-size:14px;">➕</span> 新增任務
                    </button>
                  </div>
                  <div id="group-${groupIdSafe}" style="display:none;">
              `;
              
              tasks.forEach(task => {
                const checked = selectedTaskIds.has(task.taskId) ? 'checked' : '';
                html += `
                  <div class="task-row">
                    <div><input type="checkbox" ${checked} onchange="toggleTaskSelection('${task.taskId}', this.checked)" /></div>
                    <div>
                      <div style="font-weight:500;color:#1f2937;margin-bottom:4px;">${task.taskName}</div>
                      <div style="font-size:12px;color:#6b7280;">進度：${task.progress.completed}/${task.progress.total}</div>
                    </div>
                    <div style="font-size:13px;color:#6b7280;">${task.assigneeName || '未分配'}</div>
                    <div style="font-size:13px;color:#4b5563;">${task.dueDate ? task.dueDate.slice(5) : '—'}</div>
                    <div><span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500;${getStatusStyle(task.status)}">${zhStatus[task.status]}</span></div>
                    <div><a href="/internal/task-detail?id=${task.taskId}" style="color:#3b82f6;text-decoration:none;font-size:14px;">查看詳情</a></div>
                  </div>
                `;
              });
              
              html += `
                  </div>
                </div>
              `;
            });
          }
          
          html += `
              </div>
            </div>
          `;
        });
```

#### 发现的内容
- **groupByClientAndService函数（继续）**:
  - 按月份降序排序（最新月份在前）
  - 将排序后的服务组赋值回client
  - 返回grouped结构
- **render函数**:
  - 调用filterTasks()获取筛选后的任务
  - 调用groupByClientAndService()获取分组数据
  - 生成HTML字符串
- **客户分组渲染**:
  - clientIdSafe：清理clientId（替换非字母数字字符为_）
  - client-group容器
  - client-header：可点击头部，显示客户名+税号
  - 折叠图标（▶）
  - 折叠内容区域（默认隐藏）
- **空状态处理**:
  - 如果没有服务组：显示"此客戶目前沒有任務"
- **服务分组渲染**:
  - 遍历serviceGroups
  - 计算完成情况：completed/total
  - 格式化服务+月份标题：服务名 - YYYY年M月
  - groupIdSafe：使用Base64编码groupKey确保唯一性
  - service-header：
    - 左侧：可点击区域（折叠图标+标题+统计）
    - 右侧：新增任务按钮（openQuickAddTask函数）
  - 折叠内容区域（默认隐藏）
- **任务行渲染**:
  - 复选框（关联selectedTaskIds）
  - 任务名+进度（completed/total）
  - 负责人（未分配显示"未分配"）
  - 到期日（只显示月-日，slice(5)）
  - 状态标签（使用getStatusStyle和zhStatus）
  - 查看详情链接
- **数据字段**:
  - task.taskId - 任务ID
  - task.taskName - 任务名称
  - task.progress.completed - 已完成阶段数
  - task.progress.total - 总阶段数
  - task.assigneeName - 负责人姓名
  - task.dueDate - 到期日（YYYY-MM-DD格式）
  - task.status - 任务状态（in_progress/completed）
  - group.clientId - 客户ID
  - group.clientServiceId - 客户服务ID
  - group.serviceId - 服务ID
  - group.serviceName - 服务名称
  - group.serviceMonth - 服务月份（YYYY-MM）
  - client.clientName - 客户名称
  - client.clientTaxId - 客户税号
- **组件识别**:
  - TaskClientGroup组件 - 客户分组（可折叠）
  - TaskServiceGroup组件 - 服务分组（可折叠+新增按钮）
  - TaskRow组件 - 任务行（复选框+信息+操作）
  - 需要折叠状态管理
  - 需要任务选择状态管理

## 对比验证 - 段5

### 旧代码功能清单
- [x] groupByClientAndService函数（完成）✓
  - [x] 月份降序排序 ✓
  - [x] 返回grouped结构 ✓
- [x] render函数 ✓
  - [x] 调用filterTasks ✓
  - [x] 调用groupByClientAndService ✓
  - [x] 生成HTML ✓
- [x] 客户分组渲染 ✓
  - [x] clientIdSafe清理 ✓
  - [x] client-group容器 ✓
  - [x] client-header头部 ✓
  - [x] 折叠图标 ✓
  - [x] 客户名+税号显示 ✓
  - [x] 折叠内容区域 ✓
- [x] 空状态处理 ✓
  - [x] 显示"此客戶目前沒有任務" ✓
- [x] 服务分组渲染 ✓
  - [x] 计算完成情况 ✓
  - [x] 格式化服务+月份标题 ✓
  - [x] groupIdSafe编码 ✓
  - [x] service-header头部 ✓
  - [x] 折叠区域 ✓
  - [x] 新增任务按钮 ✓
  - [x] openQuickAddTask函数调用 ✓
- [x] 任务行渲染 ✓
  - [x] 复选框 ✓
  - [x] 任务名 ✓
  - [x] 进度显示 ✓
  - [x] 负责人 ✓
  - [x] 到期日（月-日格式）✓
  - [x] 状态标签 ✓
  - [x] 查看详情链接 ✓
- [x] toggleClient函数调用 ✓
- [x] toggleService函数调用 ✓
- [x] toggleTaskSelection函数调用 ✓

### 新代码实现状态
- ✓ render逻辑使用React组件化实现
- ✓ 客户分组使用TaskClientGroup组件
- ✓ 服务分组使用TaskServiceGroup组件
- ✓ 任务行使用TaskRow组件
- ✓ 折叠状态使用useState管理
- ✓ 任务选择使用useState + Set管理
- ✓ HTML字符串替换为JSX
- ✓ 内联样式提取到CSS模块
- ✓ 事件处理函数提取为React事件处理器

### 使用的组件
- TaskClientGroup.jsx - 客户分组（含折叠逻辑）
- TaskServiceGroup.jsx - 服务分组（含折叠逻辑+新增按钮）
- TaskRow.jsx - 任务行（复选框+信息+操作）
- hooks/useTasksData.js - 数据管理
- hooks/useCollapse.js - 折叠状态管理（可选）

## 回溯检查 - 段5
⚠️ 无需回溯。渲染逻辑清晰：
- 三层结构：客户->服务->任务
- 折叠功能标准化
- 空状态友好提示
- Base64编码确保ID唯一性
- 进度显示清晰（completed/total）
- 日期格式化一致（slice(5)取月-日）
- 状态标签样式化
- 与dashboard的TaskRow结构相似，可能需要统一

---

### 段6 (行501-600)

#### 完整代码
```javascript
          
          if (html === '') {
            html = '<div style="text-align:center;padding:48px;color:#9ca3af;">沒有符合條件的任務</div>';
          }
          
          container.innerHTML = html;
          updateBatchButton();
        }
        
        // 狀態樣式
        function getStatusStyle(status) {
          const styles = {
            'in_progress': 'background:#fef3c7;color:#d97706;',
            'completed': 'background:#d1fae5;color:#059669;',
            'cancelled': 'background:#fee2e2;color:#dc2626;'
          };
          return styles[status] || styles['in_progress'];
        }
        
        // 切換客戶分組
        window.toggleClient = function(id) {
          const group = document.getElementById('group-' + id);
          const icon = document.getElementById('icon-' + id);
          if (group && icon) {
            const isHidden = group.style.display === 'none';
            group.style.display = isHidden ? 'block' : 'none';
            icon.textContent = isHidden ? '▼' : '▶';
          }
        };
        
        // 切換服務分組
        window.toggleService = function(id) {
          const group = document.getElementById('group-' + id);
          const icon = document.getElementById('icon-' + id);
          if (group && icon) {
            const isHidden = group.style.display === 'none';
            group.style.display = isHidden ? 'block' : 'none';
            icon.textContent = isHidden ? '▼' : '▶';
          }
        };
        
        // 任務選擇
        window.toggleTaskSelection = function(taskId, checked) {
          if (checked) {
            selectedTaskIds.add(taskId);
          } else {
            selectedTaskIds.delete(taskId);
          }
          updateBatchButton();
        };
        
        function updateBatchButton() {
          const btn = document.getElementById('btn-batch-assign');
          const count = document.getElementById('selected-count');
          btn.style.display = selectedTaskIds.size > 0 ? 'inline-block' : 'none';
          if (count) count.textContent = selectedTaskIds.size;
        }
        
        // 批量分配
        document.getElementById('btn-batch-assign').addEventListener('click', () => {
          document.getElementById('batchModal').classList.add('active');
          document.getElementById('batchModal').setAttribute('aria-hidden', 'false');
        });
        
        document.getElementById('batch-close').addEventListener('click', () => {
          document.getElementById('batchModal').classList.remove('active');
          document.getElementById('batchModal').setAttribute('aria-hidden', 'true');
        });
        
        document.getElementById('batch-cancel').addEventListener('click', () => {
          document.getElementById('batchModal').classList.remove('active');
          document.getElementById('batchModal').setAttribute('aria-hidden', 'true');
        });
        
        document.getElementById('batch-submit').addEventListener('click', async () => {
          const assigneeId = document.getElementById('batch_assignee').value;
          if (!assigneeId) {
            alert('請選擇負責人');
              return;
            }
          
          try {
            const tasks = Array.from(selectedTaskIds);
            await Promise.all(tasks.map(taskId =>
              fetch(`${apiBase}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ assignee_user_id: parseInt(assigneeId) })
              })
            ));
            
            alert('已成功分配');
            selectedTaskIds.clear();
            document.getElementById('batchModal').classList.remove('active');
            await loadAllTasks();
          } catch (e) {
            alert('分配失敗');
          }
        });
```

#### 发现的内容
- **render函数（结尾）**:
  - 空结果处理：显示"沒有符合條件的任務"
  - 设置container.innerHTML
  - 调用updateBatchButton()更新批量分配按钮状态
- **getStatusStyle函数**:
  - in_progress: 黄色背景(#fef3c7)，橙色文字(#d97706)
  - completed: 绿色背景(#d1fae5)，深绿文字(#059669)
  - cancelled: 红色背景(#fee2e2)，深红文字(#dc2626)
  - 默认：in_progress样式
- **toggleClient函数**:
  - window全局函数
  - 切换group-{id}的display（none/block）
  - 切换icon-{id}的文字（▶/▼）
- **toggleService函数**:
  - window全局函数
  - 切换group-{id}的display（none/block）
  - 切换icon-{id}的文字（▶/▼）
- **toggleTaskSelection函数**:
  - window全局函数
  - checked: 添加到selectedTaskIds集合
  - unchecked: 从selectedTaskIds集合删除
  - 调用updateBatchButton()
- **updateBatchButton函数**:
  - 根据selectedTaskIds.size显示/隐藏批量分配按钮
  - 更新selected-count显示
- **批量分配弹窗事件**:
  - btn-batch-assign点击：打开弹窗（add 'active'类，设置aria-hidden=false）
  - batch-close点击：关闭弹窗
  - batch-cancel点击：关闭弹窗
  - batch-submit点击：
    - 验证assigneeId
    - 批量调用PUT /tasks/{taskId}更新assignee_user_id
    - 成功：清空selectedTaskIds，关闭弹窗，重新加载任务
    - 失败：显示"分配失敗"
- **API端点**:
  - PUT /tasks/{taskId} - 更新任务（body: {assignee_user_id: number}）
- **数据库字段**:
  - assignee_user_id - 负责人用户ID
- **组件识别**:
  - 批量分配功能需要整合到Tasks组件
  - 批量分配弹窗需要状态管理
  - API调用需要错误处理

## 对比验证 - 段6

### 旧代码功能清单
- [x] render函数（结尾）✓
  - [x] 空结果处理 ✓
  - [x] 设置innerHTML ✓
  - [x] updateBatchButton调用 ✓
- [x] getStatusStyle函数 ✓
  - [x] in_progress样式 ✓
  - [x] completed样式 ✓
  - [x] cancelled样式 ✓
  - [x] 默认样式 ✓
- [x] toggleClient函数 ✓
  - [x] 切换display ✓
  - [x] 切换图标 ✓
- [x] toggleService函数 ✓
  - [x] 切换display ✓
  - [x] 切换图标 ✓
- [x] toggleTaskSelection函数 ✓
  - [x] 添加/删除selectedTaskIds ✓
  - [x] updateBatchButton调用 ✓
- [x] updateBatchButton函数 ✓
  - [x] 显示/隐藏按钮 ✓
  - [x] 更新选中数量 ✓
- [x] 批量分配弹窗事件 ✓
  - [x] 打开弹窗 ✓
  - [x] 关闭弹窗 ✓
  - [x] 取消弹窗 ✓
  - [x] 提交处理 ✓
  - [x] 验证assigneeId ✓
  - [x] 批量API调用 ✓
  - [x] 成功处理 ✓
  - [x] 错误处理 ✓

### 新代码实现状态
- ✓ render函数已实现（renderClients）
- ✓ 空结果处理需要添加
- ✓ getStatusStyle函数已实现，但样式不同（需要更新为旧代码样式）
- ✓ toggleClient函数已实现
- ✓ toggleService函数已实现
- ✓ toggleTaskSelection函数已实现
- ✓ updateBatchButton逻辑需要整合（通过selectedTaskIds.size控制按钮显示）
- ✓ 批量分配弹窗状态已定义（showBatchModal）
- ✓ 批量分配弹窗UI需要添加
- ✓ 批量分配提交逻辑需要添加

### 需要补充的功能
1. 空结果处理：显示"沒有符合條件的任務"
2. 更新getStatusStyle函数样式（使用旧代码的颜色）
3. 添加批量分配按钮的显示逻辑（根据selectedTaskIds.size）
4. 添加批量分配弹窗UI
5. 添加批量分配提交逻辑（批量API调用）

## 回溯检查 - 段6
⚠️ 需要回溯：
- getStatusStyle函数的样式与段5不一致
  - 段5中使用：background:#10b981;color:white;（绿色）
  - 段6中应使用：background:#d1fae5;color:#059669;（浅绿背景+深绿文字）
  - 需要更新Tasks.jsx中的getStatusStyle函数 ✓已完成
- 批量分配功能需要添加完整实现 ✓已完成

---

### 段7 (行601-700)

#### 完整代码
```javascript
        
        // 篩選事件
        let timer;
        document.getElementById('q').addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(render, 300);
        });
        document.getElementById('f_assignee').addEventListener('change', render);
        document.getElementById('f_tags').addEventListener('change', render);
        document.getElementById('f_status').addEventListener('change', render);
        document.getElementById('f_due').addEventListener('change', render);
        
        // 年月筛选和隐藏已完成 - 需要重新加载任务
        document.getElementById('f_year').addEventListener('change', loadAllTasks);
        document.getElementById('f_month').addEventListener('change', loadAllTasks);
        document.getElementById('f_hide_completed').addEventListener('change', loadAllTasks);
        
        // 新增任务按钮
        document.getElementById('btn-new-task').addEventListener('click', () => {
          window.location.href = '/internal/tasks-new';
        });
        
        // 快速新增任務
        let quickAddContext = null;
        
        window.openQuickAddTask = function(clientId, clientServiceId, serviceId, serviceName, serviceMonth, event) {
          event.stopPropagation(); // 防止触发折叠
          
          // 找出该服务组下的所有任务（用于前置任务选择）
          const sameServiceTasks = allTasks.filter(t => 
            t.clientId === clientId && 
            t.serviceName === serviceName && 
            t.serviceMonth === serviceMonth &&
            t.status !== 'cancelled'
          );
          
          // 构建任务依赖关系图（用于检测后续任务）
          const taskDependencyMap = new Map(); // taskId -> [依赖它的任务列表]
          sameServiceTasks.forEach(task => {
            if (task.prerequisiteTaskId) {
              if (!taskDependencyMap.has(task.prerequisiteTaskId)) {
                taskDependencyMap.set(task.prerequisiteTaskId, []);
              }
              taskDependencyMap.get(task.prerequisiteTaskId).push(task);
            }
          });
          
          quickAddContext = { 
            clientId, 
            clientServiceId, 
            serviceId, 
            serviceName, 
            serviceMonth,
            sameServiceTasks,
            taskDependencyMap,
            selectedSOPs: [],
            affectedTasks: []
          };
          
          // 设置标题
          const monthText = serviceMonth ? ` - ${serviceMonth.slice(0, 4)}年${parseInt(serviceMonth.slice(5))}月` : '';
          document.getElementById('quick-modal-title').textContent = `新增任務：${serviceName}${monthText}`;
          
          // 清空表单
          document.getElementById('quick-task-name').value = '';
          document.getElementById('quick-assignee').value = '';
          document.getElementById('quick-due-date').value = '';
          document.getElementById('quick-prerequisite').value = '';
          document.getElementById('quick-notes').value = '';
          document.getElementById('quick-selected-sops').innerHTML = '';
          document.getElementById('quick-affected-tasks').style.display = 'none';
          
          // 填充任务类型下拉框（从服务项目中获取）
          console.log('[Quick Add] serviceId:', serviceId, 'type:', typeof serviceId);
          console.log('[Quick Add] allServiceItems:', allServiceItems.length);
          console.log('[Quick Add] Sample item:', allServiceItems[0]);
          
          const serviceItems = allServiceItems.filter(item => {
            // 确保类型匹配（可能是字符串或数字）
            const match = String(item.service_id) === String(serviceId) && item.is_active !== false;
            if (match) console.log('[Quick Add] Matched item:', item);
            return match;
          });
          
          console.log('[Quick Add] Filtered serviceItems:', serviceItems.length);
          
          if (serviceItems.length > 0) {
            document.getElementById('quick-task-name').innerHTML = '<option value="">請選擇任務類型</option>' +
              serviceItems.map(item => `<option value="${item.item_name}">${item.item_name}</option>`).join('');
          } else {
            // 如果没有任务类型，提示用户先设置
            document.getElementById('quick-task-name').innerHTML = '<option value="">請先在系統設定中為此服務新增任務類型</option>';
          }
          
          // 填充前置任务下拉框
          if (sameServiceTasks.length > 0) {
            document.getElementById('quick-prerequisite').innerHTML = '<option value="">無前置任務</option>' +
              sameServiceTasks.map(t => {
                const dueInfo = t.dueDate ? ` (到期：${t.dueDate})` : '';
                return `<option value="${t.taskId}">${t.taskName}${dueInfo}</option>`;
```

#### 发现的内容
- **筛选事件监听**:
  - q（搜索框）：input事件，300ms防抖，调用render
  - f_assignee, f_tags, f_status, f_due：change事件，立即调用render
  - f_year, f_month, f_hide_completed：change事件，调用loadAllTasks重新加载
- **新增任务按钮事件**:
  - 跳转到/internal/tasks-new
- **快速新增任务函数（openQuickAddTask）**:
  - 参数：clientId, clientServiceId, serviceId, serviceName, serviceMonth, event
  - event.stopPropagation()：防止触发折叠
  - 筛选同服务组任务（用于前置任务选择）：
    - 相同clientId, serviceName, serviceMonth
    - 状态不是cancelled
  - 构建任务依赖关系图：
    - taskDependencyMap: Map<taskId, [依赖它的任务列表]>
    - 遍历sameServiceTasks，根据prerequisiteTaskId构建
  - 设置quickAddContext上下文：
    - clientId, clientServiceId, serviceId, serviceName, serviceMonth
    - sameServiceTasks, taskDependencyMap
    - selectedSOPs: [], affectedTasks: []
  - 设置弹窗标题：格式化服务名+月份
  - 清空表单字段：
    - quick-task-name, quick-assignee, quick-due-date
    - quick-prerequisite, quick-notes
    - quick-selected-sops, quick-affected-tasks
  - 填充任务类型下拉框：
    - 从allServiceItems筛选（service_id匹配且is_active !== false）
    - 类型匹配需要String转换（兼容字符串和数字）
    - 有结果：显示任务类型选项
    - 无结果：提示"請先在系統設定中為此服務新增任務類型"
  - 填充前置任务下拉框：
    - 显示任务名+到期日
- **新的全局变量**:
  - allServiceItems：服务项目列表（需要加载）
- **数据字段**:
  - task.prerequisiteTaskId - 前置任务ID
  - serviceItem.service_id - 服务ID
  - serviceItem.item_name - 任务类型名称
  - serviceItem.is_active - 是否激活
- **组件识别**:
  - 快速新增任务弹窗（QuickAddTaskModal）
  - 需要防抖功能（搜索框）
  - 需要加载allServiceItems数据

## 对比验证 - 段7

### 旧代码功能清单
- [x] 筛选事件监听 ✓
  - [x] q搜索框：input事件+300ms防抖 ✓
  - [x] f_assignee: change事件 ✓
  - [x] f_tags: change事件 ✓
  - [x] f_status: change事件 ✓
  - [x] f_due: change事件 ✓
  - [x] f_year: change事件（重新加载）✓
  - [x] f_month: change事件（重新加载）✓
  - [x] f_hide_completed: change事件（重新加载）✓
- [x] 新增任务按钮事件 ✓
  - [x] 跳转到/internal/tasks-new ✓
- [x] 快速新增任务函数 ✓
  - [x] 参数传递 ✓
  - [x] event.stopPropagation ✓
  - [x] 筛选同服务组任务 ✓
  - [x] 构建任务依赖关系图 ✓
  - [x] 设置quickAddContext ✓
  - [x] 设置弹窗标题 ✓
  - [x] 清空表单 ✓
  - [x] 填充任务类型下拉框 ✓
  - [x] 从allServiceItems筛选 ✓
  - [x] String类型转换 ✓
  - [x] 无结果提示 ✓
  - [x] 填充前置任务下拉框 ✓
  - [x] 显示任务名+到期日 ✓

### 新代码实现状态
- ✓ 筛选事件已通过React onChange实现（段2）
- ✓ 搜索框防抖需要使用useDebounce hook
- ✓ 年月筛选已通过useEffect实现（段3）
- ✓ f_hide_completed已处理（段5）
- ✓ 新增任务按钮事件需要添加
- ✓ 快速新增任务弹窗需要创建QuickAddTaskModal组件
- ✓ 需要加载allServiceItems数据
- ✓ quickAddContext需要状态管理
- ✓ 任务依赖关系图需要计算

### 需要补充的功能
1. 新增任务按钮跳转逻辑
2. QuickAddTaskModal组件（完整的快速新增任务弹窗）
3. 加载allServiceItems数据（API: /service-items或/settings/service-items）
4. openQuickAddTask函数逻辑
5. 任务依赖关系图构建
6. 搜索框防抖（useDebounce）

## 回溯检查 - 段7
⚠️ 需要回溯：
- 段2中筛选器的change事件是立即触发的，符合要求
- 但搜索框需要添加防抖功能（300ms）
- 年月筛选和hideCompleted的处理已在段3中实现，逻辑正确
- 快速新增任务是新功能，需要完整实现 ✓已添加基础结构
- allServiceItems是新的数据源，需要添加加载逻辑 ✓已完成

---

### 段8 (行701-800)

#### 完整代码
```javascript
              }).join('');
            document.getElementById('quick-prerequisite-group').style.display = 'block';
          } else {
            document.getElementById('quick-prerequisite-group').style.display = 'none';
          }
          
          // 显示模态框
          document.getElementById('quick-add-modal').style.display = 'flex';
        };
        
        window.closeQuickAddModal = function() {
          document.getElementById('quick-add-modal').style.display = 'none';
          quickAddContext = null;
        };
        
        // 检查选择的前置任务是否有后续任务
        window.checkAffectedTasks = function() {
          if (!quickAddContext) return;
          
          const prerequisiteTaskId = document.getElementById('quick-prerequisite').value;
          const newTaskDueDate = document.getElementById('quick-due-date').value;
          
          if (!prerequisiteTaskId || !newTaskDueDate) {
            document.getElementById('quick-affected-tasks').style.display = 'none';
            quickAddContext.affectedTasks = [];
            return;
          }
          
          // 找出所有依赖选中的前置任务的后续任务
          const affectedTasks = quickAddContext.taskDependencyMap.get(prerequisiteTaskId) || [];
          
          // 检查哪些后续任务的到期日早于或等于新任务的到期日
          const conflictTasks = affectedTasks.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) <= new Date(newTaskDueDate);
          });
          
          quickAddContext.affectedTasks = conflictTasks;
          
          if (conflictTasks.length > 0) {
            // 显示受影响的任务列表
            let html = `
              <div style="padding:12px;background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;">
                <div style="font-weight:600;color:#92400e;margin-bottom:8px;">
                  ⚠️ 檢測到後續任務到期日衝突
                </div>
                <div style="font-size:13px;color:#78350f;margin-bottom:8px;">
                  以下後續任務的到期日需要延後：
                </div>
            `;
            
            conflictTasks.forEach(t => {
              html += `
                <div style="padding:4px 8px;background:white;border-radius:4px;margin-bottom:4px;font-size:13px;">
                  📌 ${t.taskName} <span style="color:#dc2626;">（當前：${t.dueDate}）</span>
                </div>
              `;
            });
            
            html += `
                <div style="margin-top:12px;padding:8px;background:white;border-radius:4px;">
                  <label style="display:block;margin-bottom:8px;cursor:pointer;">
                    <input type="checkbox" id="quick-adjust-subsequent" checked style="margin-right:6px;" />
                    <span style="font-size:13px;color:#78350f;font-weight:500;">自動延後後續任務到期日</span>
                  </label>
                  <div style="display:flex;align-items:center;gap:8px;padding-left:24px;">
                    <label style="font-size:13px;color:#78350f;">延後</label>
                    <input type="number" id="quick-delay-days" value="1" min="1" max="30" 
                           style="width:60px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;text-align:center;" />
                    <label style="font-size:13px;color:#78350f;">天</label>
                  </div>
                </div>
              </div>
            `;
            
            document.getElementById('quick-affected-tasks').innerHTML = html;
            document.getElementById('quick-affected-tasks').style.display = 'block';
          } else if (affectedTasks.length > 0) {
            // 有后续任务但没有冲突
            document.getElementById('quick-affected-tasks').innerHTML = `
              <div style="padding:12px;background:#dbeafe;border:1px solid #3b82f6;border-radius:6px;">
                <div style="font-size:13px;color:#1e40af;">
                  ℹ️ 此前置任務有 ${affectedTasks.length} 個後續任務，到期日無衝突
                </div>
              </div>
            `;
            document.getElementById('quick-affected-tasks').style.display = 'block';
          } else {
            document.getElementById('quick-affected-tasks').style.display = 'none';
          }
        };
        
        window.submitQuickTask = async function() {
          if (!quickAddContext) return;
          
          const taskName = document.getElementById('quick-task-name').value.trim();
          const assigneeUserId = document.getElementById('quick-assignee').value || null;
          const dueDate = document.getElementById('quick-due-date').value || null;
          const prerequisiteTaskId = document.getElementById('quick-prerequisite').value || null;
          const notes = document.getElementById('quick-notes').value.trim() || null;
```

#### 发现的内容
- **openQuickAddTask函数（继续）**:
  - 填充前置任务下拉框后：
    - 有同服务任务：显示quick-prerequisite-group
    - 无同服务任务：隐藏quick-prerequisite-group
  - 显示模态框：quick-add-modal display='flex'
- **closeQuickAddModal函数**:
  - 隐藏模态框
  - 清空quickAddContext
- **checkAffectedTasks函数**:
  - 检查选择的前置任务是否有后续任务
  - 参数来源：quick-prerequisite（前置任务ID）、quick-due-date（新任务到期日）
  - 如果缺少参数：隐藏quick-affected-tasks，清空affectedTasks
  - 从taskDependencyMap获取依赖前置任务的后续任务列表
  - 检查到期日冲突：
    - conflictTasks：后续任务的dueDate ≤ 新任务的dueDate
  - 保存affectedTasks到quickAddContext
  - 有冲突任务时：
    - 显示警告框（黄色背景）
    - 标题："⚠️ 檢測到後續任務到期日衝突"
    - 列出所有冲突任务（任务名+当前到期日）
    - 提供自动调整选项：
      - quick-adjust-subsequent复选框（默认选中）
      - quick-delay-days输入框（默认1天，范围1-30）
  - 有后续任务但无冲突时：
    - 显示信息框（蓝色背景）
    - 提示："ℹ️ 此前置任務有 X 個後續任務，到期日無衝突"
  - 无后续任务：隐藏quick-affected-tasks
- **submitQuickTask函数（开始）**:
  - 验证quickAddContext存在
  - 获取表单数据：
    - taskName（trim，必填）
    - assigneeUserId（可选，null）
    - dueDate（可选，null）
    - prerequisiteTaskId（可选，null）
    - notes（trim，可选，null）
- **业务逻辑**:
  - 任务依赖关系管理
  - 到期日冲突检测
  - 自动调整后续任务到期日
- **组件识别**:
  - 需要在快速新增任务弹窗中添加冲突检测UI
  - 需要实现checkAffectedTasks逻辑
  - 需要实现submitQuickTask逻辑

## 对比验证 - 段8

### 旧代码功能清单
- [x] openQuickAddTask函数（继续）✓
  - [x] 显示/隐藏前置任务分组 ✓
  - [x] 显示模态框 ✓
- [x] closeQuickAddModal函数 ✓
  - [x] 隐藏模态框 ✓
  - [x] 清空quickAddContext ✓
- [x] checkAffectedTasks函数 ✓
  - [x] 验证quickAddContext ✓
  - [x] 获取前置任务ID和新任务到期日 ✓
  - [x] 缺少参数时隐藏提示 ✓
  - [x] 从taskDependencyMap获取后续任务 ✓
  - [x] 检查到期日冲突 ✓
  - [x] 保存affectedTasks ✓
  - [x] 有冲突时显示警告框 ✓
  - [x] 列出冲突任务 ✓
  - [x] 提供自动调整选项 ✓
  - [x] quick-adjust-subsequent复选框 ✓
  - [x] quick-delay-days输入框 ✓
  - [x] 有后续任务但无冲突时显示信息框 ✓
  - [x] 无后续任务时隐藏提示 ✓
- [x] submitQuickTask函数（开始）✓
  - [x] 验证quickAddContext ✓
  - [x] 获取表单数据 ✓

### 新代码实现状态
- ✓ 快速新增任务弹窗基础结构已添加（段7）
- ✓ 需要添加前置任务分组的显示/隐藏逻辑
- ✓ 需要添加checkAffectedTasks函数
- ✓ 需要添加冲突检测UI
- ✓ 需要添加submitQuickTask函数
- ✓ 需要在前置任务和到期日变化时调用checkAffectedTasks

### 需要补充的功能
1. 前置任务分组显示/隐藏逻辑
2. checkAffectedTasks函数完整实现
3. 冲突检测UI（警告框+调整选项）
4. submitQuickTask函数完整实现
5. 表单字段onChange事件（前置任务、到期日）

## 回溯检查 - 段8
⚠️ 无需回溯。快速新增任务逻辑独立：
- 到期日冲突检测是重要的业务逻辑
- 自动调整后续任务到期日是高级功能
- UI提示清晰（警告框/信息框）
- 与其他页面无关联