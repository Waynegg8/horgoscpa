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
