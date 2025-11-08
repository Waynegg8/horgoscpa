# dashboard.html 分析

总行数: 881
状态: 进行中

## 代码片段记录

### 段1 (行1-100)

#### 完整代码
```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="儀表板" />
    <title>儀表板｜總覽</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/assets/css/common.css" />
    <link rel="stylesheet" href="/assets/css/dashboard-page.css" />
    
    <!-- ⚡ 預加載系統（必須在所有其他腳本之前加載） -->
    <script src="/assets/js/data-cache.js"></script>
    <script src="/assets/js/fetch-interceptor.js"></script>
    <script src="/assets/js/prerender.js"></script>
    <script>
    // 立即啟動預加載（如果尚未啟動）
    if (window.DataCache && !window.DataCache.getPreloadStatus().isPreloading) {
      const status = window.DataCache.getPreloadStatus();
      if (status.completed.length === 0) {
        console.log('[Dashboard] 🚀 啟動背景預加載');
        window.DataCache.preloadAll({ adminMode: true });
      } else {
        console.log(`[Dashboard] ✅ 預加載已完成 ${status.completed.length}/${status.total} 項`);
      }
    }
    </script>
  </head>
  <body class="dashboard-page">
    <header class="dash-header">
      <div class="dash-top">
        <div class="dash-welcome">
          <span class="welcome-text">歡迎回來，<span id="userName" class="user-name">—</span></span>
          <span class="separator">•</span>
          <span id="today" class="dash-date">—</span>
        </div>
        <div id="noticeList" class="notice-list-inline" aria-label="通知" style="display:none;"></div>
      </div>
      <div id="permBar" class="info-bar" style="display:none;" role="alert">您沒有權限檢視此內容</div>
    </header>

    <main class="dash-content">
      <!-- 自適應網格：依角色顯示不同小部件 -->
      <section id="grid" class="dash-grid"></section>
    </main>

    <script>
      (function(){
        const onProdHost = location.hostname.endsWith('horgoscpa.com');
        const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

        const userNameEl = document.getElementById('userName');
        const todayEl = document.getElementById('today');
        const grid = document.getElementById('grid');
        const permBar = document.getElementById('permBar');
        const noticeList = document.getElementById('noticeList');

        let me = null;
        let refreshTimer = null;
        let currentYm = null;
        let financeMode = 'month';
        let financeYm = null;
        let activityDays = 3;
        let activityUserId = '';
        let activityType = '';

        function formatLocalDate(d){
          try { return new Intl.DateTimeFormat('zh-TW', { dateStyle:'full', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(d); } catch(_) { return d.toISOString().slice(0,10); }
        }

        function formatYm(ym){
          if (!ym) return '';
          const [y, m] = ym.split('-');
          return `${y}年${parseInt(m)}月`;
        }

        function addMonth(ym, delta){
          const [y, m] = ym.split('-').map(Number);
          const d = new Date(y, m - 1 + delta, 1);
          const newY = d.getFullYear();
          const newM = d.getMonth() + 1;
          return `${newY}-${String(newM).padStart(2, '0')}`;
        }

        function getCurrentYm(){
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        function showNotices(items){
          if (!Array.isArray(items) || items.length === 0) { noticeList.style.display='none'; noticeList.innerHTML = ''; return; }
          noticeList.innerHTML = '';
          items.forEach(n => {
            const div = document.createElement('div');
            const level = (n.level||'info');
            div.className = `notice ${level}`;
            div.innerHTML = `<span class="notice-label">${level==='warning'?'警告':'資訊'}</span><span class="notice-text">${n.text||''}</span>${n.link?` <a class="link" href="${n.link}">查看</a>`:''}`;
            noticeList.appendChild(div);
          });
```

#### 发现的内容
- **HTML结构**:
  - DOCTYPE和基础HTML标签（行1-2）
  - Head部分（行3-28）：meta标签、title、CSS链接、预加载脚本
  - Body部分（行29-45）：dash-header、dash-content、dash-grid
- **CSS引用**:
  - common.css（全局样式）
  - dashboard-page.css（页面特定样式）
- **JavaScript**:
  - 预加载系统（data-cache.js、fetch-interceptor.js、prerender.js）
  - 页面初始化脚本（行47-100）
  - 工具函数：formatLocalDate、formatYm、addMonth、getCurrentYm、showNotices
- **组件识别**:
  - DashboardHeader（行30-40）：欢迎信息、日期显示、通知列表
  - 无独立navbar（可能在common.css或其他位置）

## 发现的组件
1. **DashboardHeader** (行30-40)
   - 功能：显示欢迎信息、当前日期、通知列表、权限提示
   - 可复用性：中等（dashboard特定）

## 功能清单
### 段1功能点
- [ ] HTML文档结构
- [ ] 页面元数据（title、meta）
- [ ] CSS样式引入
- [ ] 预加载系统初始化
- [ ] Dashboard头部显示
- [ ] 欢迎信息和用户名
- [ ] 日期显示
- [ ] 通知列表
- [ ] 权限提示栏
- [ ] 主内容区域（grid容器）
- [ ] JavaScript变量初始化
- [ ] 日期格式化函数
- [ ] 月份操作函数
- [ ] 通知显示函数

## 对比验证 - 段1

### 旧代码功能清单
- [x] HTML文档结构 ✓
- [x] 页面元数据（title、meta）✓
- [x] CSS样式引入 ✓
- [x] 预加载系统初始化 ✓
- [x] Dashboard头部显示 ✓
- [x] 欢迎信息和用户名 ✓
- [x] 日期显示 ✓
- [x] 通知列表 ✓
- [x] 权限提示栏 ✓
- [x] 主内容区域（grid容器）✓
- [x] JavaScript变量初始化 ✓
- [x] 日期格式化函数 ✓
- [x] 月份操作函数 ✓
- [x] 通知显示函数 ✓

### 新代码实现状态
- ✓ DashboardHeader组件已提取（DashboardHeader.jsx）
- ✓ 日期工具函数已提取（utils/dateUtils.js）
- ✓ Dashboard主页面已创建（Dashboard.jsx）
- ✓ 所有功能已迁移到React组件中
- ✓ 状态管理使用React Hooks

### 使用的组件
- DashboardHeader.jsx - 头部组件
- utils/dateUtils.js - 日期工具函数
- Dashboard.jsx - 主页面组件

---

### 段2 (行101-200)

#### 完整代码
```javascript
          });
          noticeList.style.display = 'block';
        }

        function statCard(title, value, meta){
          return `<div class="card stat"><div class="stat-label">${title}</div><div class="stat-value">${value}</div>${meta?`<div class="stat-meta muted">${meta}</div>`:''}</div>`;
        }

        function listCard(title, rowsHtml){
          return `<div class="card list"><div class="card-title">${title}</div><div class="list-body">${rowsHtml||'<div class=\"muted\">尚無資料</div>'}</div></div>`;
        }
        
        function listCardWithActivityFilter(title, rowsHtml, users){
          const userOptions = [
            '<option value="">全部員工</option>',
            ...users.map(u => `<option value="${u.userId}" ${activityUserId == u.userId ? 'selected' : ''}>${u.name}</option>`)
          ].join('');
          
          return `<div class="card list">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <div class="card-title">${title}</div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <select id="activityTypeFilter" style="padding:4px 8px;font-size:13px;border:1px solid #e5e7eb;border-radius:4px;background:#fff;">
                  <option value="">全部類型</option>
                  <option value="status_update" ${activityType == 'status_update' ? 'selected' : ''}>任務更新</option>
                  <option value="due_date_adjustment" ${activityType == 'due_date_adjustment' ? 'selected' : ''}>期限調整</option>
                  <option value="leave_application" ${activityType == 'leave_application' ? 'selected' : ''}>假期申請</option>
                  <option value="timesheet_reminder" ${activityType == 'timesheet_reminder' ? 'selected' : ''}>工時提醒</option>
                </select>
                <select id="activityUserFilter" style="padding:4px 8px;font-size:13px;border:1px solid #e5e7eb;border-radius:4px;background:#fff;">
                  ${userOptions}
                </select>
                <select id="activityDaysFilter" style="padding:4px 8px;font-size:13px;border:1px solid #e5e7eb;border-radius:4px;background:#fff;">
                  <option value="3" ${activityDays == 3 ? 'selected' : ''}>3天內</option>
                  <option value="7" ${activityDays == 7 ? 'selected' : ''}>7天內</option>
                  <option value="14" ${activityDays == 14 ? 'selected' : ''}>14天內</option>
                  <option value="30" ${activityDays == 30 ? 'selected' : ''}>30天內</option>
                </select>
              </div>
            </div>
            <div class="list-body" style="max-height:600px;overflow-y:auto;">${rowsHtml||'<div class=\"muted\">尚無資料</div>'}</div>
          </div>`;
        }

        function generateMonthOptions(selectedYm) {
          const options = [];
          const now = new Date();
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = formatYm(ym);
            const selected = ym === selectedYm ? ' selected' : '';
            options.push(`<option value="${ym}"${selected}>${label}</option>`);
          }
          return options.join('');
        }

        function listCardWithMonthDropdown(title, rowsHtml, currentYm){
          const options = generateMonthOptions(currentYm);
          return `<div class="card list"><div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
            <span>${title}</span>
            <select class="month-dropdown" style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:14px;font-weight:500;cursor:pointer;outline:none;transition:border-color 0.2s;" onchange="this.style.borderColor='#3498db'" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
              ${options}
            </select>
          </div><div class="list-body">${rowsHtml||'<div class=\"muted\">尚無資料</div>'}</div></div>`;
        }

        function listCardWithFinanceDropdown(title, rowsHtml, currentYm, mode){
          const options = generateMonthOptions(currentYm);
          return `<div class="card list"><div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
            <span>${title}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <select class="finance-month-dropdown" style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:14px;font-weight:500;cursor:pointer;outline:none;transition:border-color 0.2s;${mode === 'ytd' ? 'opacity:0.5;pointer-events:none;' : ''}" onchange="this.style.borderColor='#3498db'" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                ${options}
              </select>
              <button type="button" class="ytd-btn" style="padding:6px 14px;cursor:pointer;border:1px solid ${mode === 'ytd' ? '#3498db' : '#ddd'};background:${mode === 'ytd' ? '#3498db' : '#fff'};color:${mode === 'ytd' ? '#fff' : '#333'};border-radius:6px;font-weight:500;font-size:14px;transition:all 0.2s;white-space:nowrap;">本年累計</button>
            </div>
          </div><div class="list-body">${rowsHtml||'<div class=\"muted\">尚無資料</div>'}</div></div>`;
        }

        function fmtNum(n){ 
          const val = Number(n||0); 
          if (val === 0) return '-';
          try { 
            return val.toLocaleString('zh-TW'); 
          } catch(_) { 
            return String(val); 
          } 
        }
        
        function fmtTwd(n){ 
          const val = Number(n||0);
          if (val === 0) return '-';
          try {
            return val.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          } catch(_) {
            return String(val);
          }
        }
```

#### 发现的内容
- **工具函数**:
  - `statCard()` - 生成统计卡片HTML（行105-107）
  - `listCard()` - 生成列表卡片HTML（行109-111）
  - `listCardWithActivityFilter()` - 带活动筛选的列表卡片（行113-143）
  - `generateMonthOptions()` - 生成月份选项（行145-157）
  - `listCardWithMonthDropdown()` - 带月份下拉的列表卡片（行159-167）
  - `listCardWithFinanceDropdown()` - 带财务月份下拉的列表卡片（行169-180）
  - `fmtNum()` - 格式化数字（行183-191）
  - `fmtTwd()` - 格式化金额（行194-200）
- **组件识别**:
  - StatCard组件（统计卡片）
  - ListCard组件（列表卡片，多个变体）
  - ActivityFilter组件（活动筛选器）
  - MonthSelector组件（月份选择器）
  - FinanceSelector组件（财务月份选择器）

## 对比验证 - 段2

### 旧代码功能清单
- [x] statCard函数 - 生成统计卡片HTML ✓
- [x] listCard函数 - 生成列表卡片HTML ✓
- [x] listCardWithActivityFilter函数 - 带活动筛选的列表卡片 ✓
- [x] generateMonthOptions函数 - 生成月份选项 ✓
- [x] listCardWithMonthDropdown函数 - 带月份下拉的列表卡片 ✓
- [x] listCardWithFinanceDropdown函数 - 带财务月份下拉的列表卡片 ✓
- [x] fmtNum函数 - 格式化数字 ✓
- [x] fmtTwd函数 - 格式化金额 ✓

### 新代码实现状态
- ✓ StatCard组件已创建（StatCard.jsx）
- ✓ ListCard组件及其变体已创建（ListCard.jsx）
  - ListCard - 基础列表卡片
  - ListCardWithActivityFilter - 带活动筛选器
  - ListCardWithMonthDropdown - 带月份选择器
  - ListCardWithFinanceDropdown - 带财务选择器
- ✓ MonthSelector子组件已集成
- ✓ 格式化工具函数已提取（utils/formatUtils.js）
- ✓ 所有功能已迁移到React组件中
- ✓ 使用受控组件和回调函数管理状态

### 使用的组件
- StatCard.jsx - 统计卡片组件
- ListCard.jsx - 列表卡片组件（包含4个变体）
- utils/formatUtils.js - 格式化工具函数

## 回溯检查 - 段2
⚠️ 无需回溯。段2的实现方式与段1一致：
- 都使用React组件化
- 都将工具函数提取到utils目录
- 都使用props和回调函数管理状态
- 都保持了原有功能的100%迁移

---

### 段3 (行201-300)

#### 完整代码
```javascript
          }
        }
        
        // 格式化百分比：0 显示为 "-"
        function fmtPct(n){ 
          const v = Number(n||0); 
          if (v === 0) return '-';
          return `${(Math.round(v*10)/10).toFixed(1)}%`;
        }

        function renderEmployeeDashboard(data){
          grid.innerHTML = '';
          const frag = document.createElement('div');
          const h = data?.myHours || { total:0, normal:0, overtime:0, completionRate:0 };
          const hoursMeta = `正常：${fmtNum(h.normal)}｜加班：${fmtNum(h.overtime)}｜達成率：${fmtPct(h.completionRate)}`;
          const tasks = Array.isArray(data?.myTasks?.items) ? data.myTasks.items : [];
          const taskRows = tasks.length ? tasks.map(t => {
            const cls = t.urgency==='overdue' ? 'danger' : (t.urgency==='urgent' ? 'warn' : '');
            const badge = t.urgency==='overdue' ? '<span class="badge danger">逾期</span>' : (t.urgency==='urgent' ? '<span class="badge warn">急</span>' : '');
            const due = t.dueDate || '—';
            
            let statusInfo = '';
            if (t.blockerReason) {
              statusInfo = `<div style="margin-top:4px;padding:6px 8px;background:#fef2f2;border-left:3px solid #dc2626;font-size:13px;color:#991b1b;">🚫 ${t.blockerReason}</div>`;
            } else if (t.overdueReason) {
              statusInfo = `<div style="margin-top:4px;padding:6px 8px;background:#fef2f2;border-left:3px solid #dc2626;font-size:13px;color:#991b1b;">⏰ ${t.overdueReason}</div>`;
            } else if (t.statusNote) {
              statusInfo = `<div style="margin-top:4px;padding:6px 8px;background:#f0fdf4;border-left:3px solid #16a34a;font-size:13px;color:#166534;">💬 ${t.statusNote}</div>`;
            }
            
            return `<a href="/internal/task-detail?id=${t.id}" style="text-decoration:none;color:inherit;"><div class="task-row ${cls}">
              <div style="display:flex;flex-direction:column;">
                <div><span class="name">${t.name||''}</span><span class="muted" style="margin-left:8px;">到期：${due}</span> ${badge}</div>
                ${statusInfo}
              </div>
            </div></a>`;
          }).join('') : '<div class="muted">目前沒有待辦任務</div>';
          const lv = data?.myLeaves || { balances:{ annual:0, sick:0, compHours:0 }, recent:[] };
          const leavesHtml = `
              <div class="kv"><span>特休剩餘</span><b>${fmtNum(lv.balances?.annual||0)} 天</b></div>
              <div class="kv"><span>病假剩餘</span><b>${fmtNum(lv.balances?.sick||0)} 天</b></div>
              <div class="kv"><span>補休</span><b>${fmtNum(lv.balances?.compHours||0)} 小時</b></div>`;
          const receiptsPending = Array.isArray(data?.employee?.receiptsPendingTasks) ? data.employee.receiptsPendingTasks : [];
          const receiptsHtml = receiptsPending.length ? receiptsPending.map(r => {
            return `<div class="task-row warn">
              <div style="display:flex;flex-direction:column;gap:4px;">
                <span class="name">${r.client_name} - ${r.service_name}</span>
                <div class="muted" style="font-size:12px;">收據 #${r.receipt_number} | 到期：${r.receipt_due_date || '—'}</div>
                <div style="font-size:13px;color:#d97706;">待完成任務：${r.pending_tasks} / ${r.total_tasks}</div>
              </div>
            </div>`;
          }).join('') : '<div class="muted">無待處理項目</div>';
          
          frag.innerHTML = [
            statCard('本月總工時', fmtNum(h.total), hoursMeta),
            listCard('我的任務（待辦/進行中）', taskRows),
            receiptsPending.length > 0 ? listCard('⚠️ 收據已開但任務未完成', receiptsHtml) : ''
          ].filter(Boolean).join('');
          grid.appendChild(frag);
        }

        function renderAdminDashboard(data){
          console.log('=== RENDER ADMIN DASHBOARD ===');
          console.log('Full data object:', data);
          console.log('data.employeeHours:', data?.employeeHours);
          console.log('data.employeeTasks:', data?.employeeTasks);
          
          try {
            grid.innerHTML = `
              <div style="display:grid;grid-template-columns:2fr 3fr;gap:24px;align-items:start;">
                <div id="leftColumn" style="display:flex;flex-direction:column;gap:20px;"></div>
                <div id="rightColumn" style="display:flex;flex-direction:column;gap:20px;"></div>
              </div>
            `;
            
            const leftColumn = document.getElementById('leftColumn');
            const rightColumn = document.getElementById('rightColumn');
            
            if (!leftColumn || !rightColumn) {
              console.error('ERROR: Could not find leftColumn or rightColumn!');
              grid.innerHTML = '<div style="padding:20px;color:red;">錯誤：無法創建頁面布局</div>';
              return;
            }
            
            console.log('Columns created successfully');
          } catch (err) {
            console.error('ERROR in layout creation:', err);
            grid.innerHTML = `<div style="padding:20px;color:red;">布局創建錯誤：${err.message}</div>`;
            return;
          }
          
          let hoursHtml = '';
          try {
            console.log('=== Processing Employee Hours ===');
            const empHours = Array.isArray(data?.employeeHours) ? data.employeeHours : [];
            console.log('Employee Hours data:', empHours);
```

#### 发现的内容
- **工具函数**:
  - `fmtPct()` - 格式化百分比（行205-209）
- **渲染函数**:
  - `renderEmployeeDashboard()` - 渲染员工仪表板视图（行211-262）
  - `renderAdminDashboard()` - 渲染管理员仪表板视图（开始，行264-300）
- **组件识别**:
  - TaskRow组件（任务行项目，带状态、紧急程度标识）
  - LeaveBalanceDisplay组件（假期余额显示）
  - ReceiptPendingTasksAlert组件（收据未完成任务警告）
- **API字段**:
  - myHours: { total, normal, overtime, completionRate }
  - myTasks: { items: [{ id, name, dueDate, urgency, blockerReason, overdueReason, statusNote, hasSop }], counts }
  - myLeaves: { balances: { annual, sick, compHours }, recent }
  - receiptsPendingTasks: [{ client_name, service_name, receipt_number, receipt_due_date, pending_tasks, total_tasks }]
  - employeeHours: [{ userId, name, total, normal, overtime }]
  - employeeTasks: [{ userId, name, completed, inProgress, overdue }]

## 对比验证 - 段3

### 旧代码功能清单
- [x] fmtPct函数 - 格式化百分比 ✓
- [x] renderEmployeeDashboard函数 - 渲染员工视图 ✓
  - [x] 显示工时统计卡片 ✓
  - [x] 显示任务列表（带紧急程度、状态信息）✓
  - [x] 显示假期余额 ✓
  - [x] 显示收据待办任务警告 ✓
- [x] renderAdminDashboard函数（开始）- 渲染管理员视图 ✓
  - [x] 创建两列布局 ✓
  - [x] 错误处理 ✓

### 新代码实现状态
- ✓ fmtPct函数已添加到formatUtils.js
- ✓ TaskRow组件已创建（TaskRow.jsx）
  - 支持紧急程度显示（逾期/紧急）
  - 支持状态信息显示（阻碍/逾期原因/进度备注）
- ✓ ReceiptPendingTaskRow组件已创建（TaskRow.jsx）
- ✓ EmployeeDashboard组件已创建（EmployeeDashboard.jsx）
  - 集成StatCard、ListCard、TaskRow等组件
  - 完整实现员工视图所有功能
- ✓ AdminDashboard组件已创建（AdminDashboard.jsx）
  - 两列布局框架
  - 后续步骤将填充内容

### 使用的组件
- utils/formatUtils.js - 新增fmtPct函数
- TaskRow.jsx - 任务行组件（包含2个变体）
- EmployeeDashboard.jsx - 员工仪表板视图
- AdminDashboard.jsx - 管理员仪表板视图

## 回溯检查 - 段3
⚠️ 无需回溯。段3的实现方式与段1-2一致：
- 使用React组件化
- 工具函数提取到utils目录
- 组件间通过props传递数据
- 保持原有功能100%迁移
- 新增了视图级别的组件（EmployeeDashboard、AdminDashboard）用于更好的代码组织

---

### 段4 (行301-400)

#### 完整代码
```javascript
            
            if (empHours.length > 0) {
              hoursHtml = empHours.map(e => {
                const totalStr = fmtNum(e.total || 0);
                const meta = (e.total && e.total > 0) ? `正常 ${fmtNum(e.normal)} ｜ 加班 ${fmtNum(e.overtime)}` : '';
                return `<div class="emp-row">
                  <span style="font-size:14px;font-weight:500;color:#1f2937;">${e.name || '未命名'}</span>
                  <div style="display:flex;align-items:center;gap:12px;">
                    ${meta ? `<div style="font-size:13px;color:#6b7280;">${meta}</div>` : ''}
                    <div style="display:flex;align-items:baseline;gap:4px;">
                      <span style="font-size:20px;font-weight:600;color:#2563eb;">${totalStr}</span>
                      <span style="font-size:13px;color:#6b7280;">小時</span>
                    </div>
                  </div>
                </div>`;
              }).join('');
              console.log('Hours HTML generated, length:', hoursHtml.length);
            } else {
              hoursHtml = '<div style="padding:16px;text-align:center;color:#9ca3af;">尚無員工資料</div>';
              console.log('No employee hours data');
            }
          } catch (err) {
            console.error('ERROR in employee hours processing:', err);
            hoursHtml = `<div style="padding:16px;color:red;">工時數據錯誤：${err.message}</div>`;
          }
          
          // 各员工任务状态
          let tasksHtml = '';
          try {
            console.log('=== Processing Employee Tasks ===');
            const empTasks = Array.isArray(data?.employeeTasks) ? data.employeeTasks : [];
            console.log('Employee Tasks data:', empTasks);
            
            function formatMonthDetails(monthObj) {
              if (!monthObj || Object.keys(monthObj).length === 0) return '';
              const details = Object.entries(monthObj)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([month, count]) => {
                  const [y, m] = month.split('-');
                  return `${parseInt(m)}月:${count}件`;
                })
                .join('、');
              return ` (${details})`;
            }
            
            if (empTasks.length > 0) {
              tasksHtml = empTasks.map(e => {
            const overdueTotal = Object.values(e.overdue || {}).reduce((sum, n) => sum + n, 0);
            const inProgressTotal = Object.values(e.inProgress || {}).reduce((sum, n) => sum + n, 0);
            
            const badges = [];
            if (overdueTotal > 0) {
              const details = formatMonthDetails(e.overdue);
              badges.push(`<span style="padding:4px 8px;border-radius:4px;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:500;">逾期 ${overdueTotal}${details}</span>`);
            }
            if (inProgressTotal > 0) {
              const details = formatMonthDetails(e.inProgress);
              badges.push(`<span style="padding:4px 8px;border-radius:4px;background:#dbeafe;color:#2563eb;font-size:13px;font-weight:500;">進行中 ${inProgressTotal}${details}</span>`);
            }
            if (e.completed > 0) {
              badges.push(`<span style="padding:4px 8px;border-radius:4px;background:#d1fae5;color:#059669;font-size:13px;font-weight:500;">已完成 ${e.completed}</span>`);
            }
            
            const summary = badges.length > 0 ? badges.join('') : '<span style="color:#9ca3af;">無任務</span>';
            
            return `<a href="/internal/tasks?assignee=${e.userId}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #f3f4f6;text-decoration:none;color:inherit;transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
              <span style="font-size:14px;font-weight:500;color:#1f2937;">${e.name || '未命名'}</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">${summary}</div>
            </a>`;
              }).join('');
              console.log('Tasks HTML generated, length:', tasksHtml.length);
            } else {
              tasksHtml = '<div style="padding:16px;text-align:center;color:#9ca3af;">尚無任務</div>';
              console.log('No employee tasks data');
            }
          } catch (err) {
            console.error('ERROR in employee tasks processing:', err);
            console.error('Error stack:', err.stack);
            tasksHtml = `<div style="padding:16px;color:red;">任務數據錯誤：${err.message}</div>`;
          }
          
          // 财务状况
          const fs = data?.financialStatus || {};
          const emptyData = { period:'', revenue:0, cost:0, profit:0, margin:0, ar:0, paid:0, overdue:0, collectionRate:0 };
          const currentFinData = (financeMode === 'ytd' ? fs.ytd : fs.month) || emptyData;
          
          const finHtml = `
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                <div style="padding:12px;background:#f9fafb;border-radius:6px;">
                  <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">營收</div>
                  <div style="font-size:18px;font-weight:600;color:#1f2937;">${fmtTwd(currentFinData.revenue)}</div>
                </div>
                <div style="padding:12px;background:#f9fafb;border-radius:6px;">
```

#### 发现的内容
- **HTML渲染逻辑**:
  - 员工工时列表渲染（empHours）
  - 员工任务状态列表渲染（empTasks）
  - 财务状况卡片渲染（开始部分）
- **辅助函数**:
  - `formatMonthDetails()` - 格式化月份详情（行335-345）
- **组件识别**:
  - EmployeeHoursRow组件（员工工时行）
  - EmployeeTasksRow组件（员工任务状态行，可点击跳转）
  - FinancialStatusCard组件（财务状况卡片）
- **API字段**:
  - employeeHours: [{ name, total, normal, overtime }]
  - employeeTasks: [{ userId, name, completed, inProgress: {month: count}, overdue: {month: count} }]
  - financialStatus: { month: {...}, ytd: {...} }
  - 财务数据字段: period, revenue, cost, profit, margin, ar, paid, overdue, collectionRate

## 对比验证 - 段4

### 旧代码功能清单
- [x] 员工工时列表渲染 ✓
  - [x] 显示员工姓名 ✓
  - [x] 显示总工时、正常工时、加班工时 ✓
  - [x] 空数据处理 ✓
  - [x] 错误处理 ✓
- [x] 员工任务状态列表渲染 ✓
  - [x] formatMonthDetails函数 - 格式化月份详情 ✓
  - [x] 显示员工姓名 ✓
  - [x] 显示任务统计（逾期、进行中、已完成）✓
  - [x] 月份详情显示 ✓
  - [x] 点击跳转到员工任务列表 ✓
  - [x] hover效果 ✓
  - [x] 空数据处理 ✓
  - [x] 错误处理 ✓
- [x] 财务状况卡片渲染（开始部分）✓
  - [x] 营收显示 ✓
  - [x] 后续指标将在下一段完成 ✓

### 新代码实现状态
- ✓ EmployeeHoursRow组件已创建（EmployeeHoursRow.jsx）
  - 包含单行组件和列表组件
  - 支持空数据显示
- ✓ EmployeeTasksRow组件已创建（EmployeeTasksRow.jsx）
  - 包含formatMonthDetails辅助函数
  - 包含单行组件和列表组件
  - 支持点击跳转和hover效果
  - 支持空数据显示
- ✓ FinancialStatusCard组件已创建（FinancialStatusCard.jsx）
  - 包含FinancialMetricBox子组件
  - 支持月度和年度累计模式
  - 显示所有财务指标
- ✓ AdminDashboard组件已更新
  - 集成了员工工时列表
  - 集成了员工任务列表
  - 集成了财务状况卡片

### 使用的组件
- EmployeeHoursRow.jsx - 员工工时行组件
- EmployeeTasksRow.jsx - 员工任务状态行组件
- FinancialStatusCard.jsx - 财务状况卡片组件
- AdminDashboard.jsx - 更新以集成新组件

## 回溯检查 - 段4
⚠️ 无需回溯。段4的实现方式与段1-3一致：
- 使用React组件化
- 辅助函数（formatMonthDetails）提取到组件内部
- 组件间通过props传递数据
- 保持原有功能100%迁移
- 继续完善AdminDashboard视图组件

---

### 段5 (行401-500)

#### 完整代码
```javascript
                  <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">成本</div>
                  <div style="font-size:18px;font-weight:600;color:#1f2937;">${fmtTwd(currentFinData.cost)}</div>
                </div>
                <div style="padding:12px;background:#f0fdf4;border-radius:6px;">
                  <div style="font-size:12px;color:#059669;margin-bottom:4px;">毛利</div>
                  <div style="font-size:18px;font-weight:600;color:#059669;">${fmtTwd(currentFinData.profit)}</div>
                </div>
                <div style="padding:12px;background:#f0fdf4;border-radius:6px;">
                  <div style="font-size:12px;color:#059669;margin-bottom:4px;">毛利率</div>
                  <div style="font-size:18px;font-weight:600;color:#059669;">${fmtPct(currentFinData.margin)}</div>
                </div>
              </div>
              
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                <div style="padding:12px;background:#fefce8;border-radius:6px;">
                  <div style="font-size:12px;color:#ca8a04;margin-bottom:4px;">應收</div>
                  <div style="font-size:18px;font-weight:600;color:#ca8a04;">${fmtTwd(currentFinData.ar)}</div>
                </div>
                <div style="padding:12px;background:#dbeafe;border-radius:6px;">
                  <div style="font-size:12px;color:#2563eb;margin-bottom:4px;">收款</div>
                  <div style="font-size:18px;font-weight:600;color:#2563eb;">${fmtTwd(currentFinData.paid)}</div>
                </div>
                <div style="padding:12px;background:#fee2e2;border-radius:6px;">
                  <div style="font-size:12px;color:#dc2626;margin-bottom:4px;">逾期</div>
                  <div style="font-size:18px;font-weight:600;color:#dc2626;">${fmtTwd(currentFinData.overdue)}</div>
                </div>
                <div style="padding:12px;background:#f3f4f6;border-radius:6px;">
                  <div style="font-size:12px;color:#4b5563;margin-bottom:4px;">收款率</div>
                  <div style="font-size:18px;font-weight:600;color:#4b5563;">${fmtPct(currentFinData.collectionRate)}</div>
                </div>
              </div>
            </div>`;
          
          const receiptsPending = Array.isArray(data?.receiptsPendingTasks) ? data.receiptsPendingTasks : [];
          
          const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
          console.log('[Dashboard] recentActivities 数量:', recentActivities.length);
          console.log('[Dashboard] recentActivities 数据:', recentActivities);
          let activitiesHtml = '';
          if (recentActivities.length > 0) {
            activitiesHtml = recentActivities.map(act => {
              console.log('[Dashboard] 处理活动:', act.activity_type, act);
              if (act.activity_type === 'due_date_adjustment') {
                return `<a href="${act.link || '#'}" style="text-decoration:none;color:inherit;">
                  <div style="padding:14px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                      <div style="font-size:15px;font-weight:600;color:#1f2937;">📅 ${act.taskName}</div>
                      <div style="font-size:12px;color:#9ca3af;">${act.time}</div>
                    </div>
                    <div style="font-size:14px;color:#6b7280;margin-bottom:6px;">${act.clientName} · ${act.serviceName}</div>
                    <div style="display:flex;align-items:center;gap:10px;font-size:14px;">
                      <span style="color:#3b82f6;font-weight:500;">${act.change}</span>
                      <span style="color:#6b7280;">${act.assigneeName}</span>
                    </div>
                    ${act.reason ? `<div style="font-size:13px;color:#6b7280;margin-top:6px;line-height:1.5;padding:8px;background:#fffbeb;border-radius:4px;">${act.reason}</div>` : ''}
                  </div>
                </a>`;
              } else if (act.activity_type === 'status_update') {
                return `<a href="${act.link || '#'}" style="text-decoration:none;color:inherit;">
                  <div style="padding:14px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                      <div style="font-size:15px;font-weight:600;color:#1f2937;">📝 ${act.taskName}</div>
                      <div style="font-size:12px;color:#9ca3af;">${act.time}</div>
                    </div>
                    <div style="font-size:14px;color:#6b7280;margin-bottom:6px;">${act.clientName} · ${act.serviceName}</div>
                    <div style="display:flex;align-items:center;gap:10px;font-size:14px;">
                      <span style="color:#10b981;font-weight:500;">${act.change}</span>
                      <span style="color:#6b7280;">${act.assigneeName}</span>
                    </div>
                    ${act.note ? `<div style="font-size:13px;color:#4b5563;margin-top:6px;line-height:1.5;padding:8px;background:${act.note.startsWith('🚫') || act.note.startsWith('⏰') ? '#fef2f2' : '#f0fdf4'};border-radius:4px;">${act.note}</div>` : ''}
                  </div>
                </a>`;
              } else if (act.activity_type === 'leave_application') {
                let unitText = '天';
                if (act.leaveUnit === 'hour') {
                  unitText = '小時';
                } else if (act.leaveUnit === 'half') {
                  unitText = '半天';
                }
                
                return `<a href="${act.link || '#'}" style="text-decoration:none;color:inherit;">
                  <div style="padding:14px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                      <div style="font-size:15px;font-weight:600;color:#1f2937;">🏖️ ${act.text}</div>
                      <div style="font-size:12px;color:#9ca3af;">${act.time}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;font-size:14px;">
                      <span style="color:#6b7280;">${act.period}</span>
                      <span style="padding:4px 8px;border-radius:4px;background:#dbeafe;color:#2563eb;font-weight:500;">${act.leaveDays}${unitText}</span>
                    </div>
                    ${act.reason ? `<div style="font-size:13px;color:#6b7280;margin-top:6px;line-height:1.5;">${act.reason}</div>` : ''}
                  </div>
                </a>`;
              } else if (act.activity_type === 'timesheet_reminder') {
                return `<a href="${act.link || '#'}" style="text-decoration:none;color:inherit;">
                  <div style="padding:14px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;background:#fef2f2;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
```

#### 发现的内容
- **财务状况卡片完整HTML**（继续）:
  - 成本、毛利、毛利率（绿色高亮）
  - 应收（黄色）、收款（蓝色）、逾期（红色）、收款率（灰色）
- **最近动态渲染逻辑**:
  - due_date_adjustment（期限调整）- 显示任务名、客户、服务、变更、原因
  - status_update（状态更新）- 显示任务名、客户、服务、变更、备注
  - leave_application（假期申请）- 显示员工名、假期类型、天数/小时、原因
  - timesheet_reminder（工时提醒）- 红色背景警告
- **组件识别**:
  - ActivityItem组件（活动项，4种类型）
- **API字段**:
  - recentActivities: [{ activity_type, taskName, clientName, serviceName, change, assigneeName, reason, note, time, link, text, period, leaveDays, leaveUnit, userName, missingCount, missingDates }]

