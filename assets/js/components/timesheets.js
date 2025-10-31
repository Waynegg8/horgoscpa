/**
 * 工時管理模組 - 完全重製版本
 * 對應文檔：
 * - docs/使用手冊/功能模組-03-工時管理.md
 * - docs/開發指南/前端/工時管理-前端規格.md
 * - docs/開發指南/後端/工時管理-後端規格.md
 */

// ==================== 全域狀態 ====================

const state = {
  currentWeekStart: null,          // 當前週的週一日期
  clients: [],                     // 客戶列表
  clientServices: new Map(),       // Map<client_id, Array<service>>
  serviceItems: new Map(),         // Map<`${client_id}_${service_id}`, Array<item>>
  workTypes: [],                   // 工時類型列表（硬編碼）
  holidays: new Map(),             // Map<iso, {is_national_holiday, is_makeup_workday, is_weekly_restday}>
  leaves: new Map(),               // Map<iso, {hours, types:[{type, hours}]}>
  rows: [],                        // [{client_id, service_id, service_item_id, work_type_id, hours:[h0..h6]}]
  pending: new Map(),              // Map<`${rowIdx}_${dayIdx}`, {rowIndex, dayIndex, value}>
  weekDateTypes: new Map(),        // Map<iso, type>
  weekDays: [],                    // [{index, iso, dow, type, mustWork}]
  dailyNormalHours: new Map(),     // Map<iso, hours>
  monthlySummary: null,            // {totalHours, overtimeHours, weightedHours, leaveHours}
  token: 0,                        // 防止競態條件
  ready: false                     // 資料是否載入完成
};

let isLoading = false;             // 週導航加載鎖

// ==================== 工時類型定義 ====================

function initWorkTypes() {
  state.workTypes = [
    {
      id: 1,
      name: '一般',
      multiplier: 1.0,
      isOvertime: false,
      allowedOn: ['workday', 'makeup']
    },
    {
      id: 2,
      name: '平日OT前2h',
      multiplier: 1.34,
      isOvertime: true,
      maxHours: 2,
      allowedOn: ['workday', 'makeup']
    },
    {
      id: 3,
      name: '平日OT後2h',
      multiplier: 1.67,
      isOvertime: true,
      maxHours: 2,
      requiresTypes: [2],
      allowedOn: ['workday', 'makeup']
    },
    {
      id: 4,
      name: '休息日前2h',
      multiplier: 1.34,
      isOvertime: true,
      maxHours: 2,
      allowedOn: ['restday']
    },
    {
      id: 5,
      name: '休息日3-8h',
      multiplier: 1.67,
      isOvertime: true,
      maxHours: 6,
      requiresTypes: [4],
      allowedOn: ['restday']
    },
    {
      id: 6,
      name: '休息日9-12h',
      multiplier: 2.67,
      isOvertime: true,
      maxHours: 4,
      requiresTypes: [4, 5],
      allowedOn: ['restday']
    },
    {
      id: 7,
      name: '國定8h內',
      multiplier: 2.0,
      isOvertime: true,
      maxHours: 8,
      allowedOn: ['national_holiday']
    },
    {
      id: 8,
      name: '國定9-10h',
      multiplier: 1.34,
      isOvertime: true,
      maxHours: 2,
      requiresTypes: [7],
      allowedOn: ['national_holiday']
    },
    {
      id: 9,
      name: '國定11-12h',
      multiplier: 1.67,
      isOvertime: true,
      maxHours: 2,
      requiresTypes: [7, 8],
      allowedOn: ['national_holiday']
    },
    {
      id: 10,
      name: '例假8h內',
      multiplier: 2.0,
      isOvertime: true,
      maxHours: 8,
      allowedOn: ['weekly_restday']
    },
    {
      id: 11,
      name: '例假9-12h',
      multiplier: 2.0,
      isOvertime: true,
      maxHours: 4,
      requiresTypes: [10],
      allowedOn: ['weekly_restday']
    }
  ];
}

// ==================== 日期工具函數 ====================

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  
  const startYear = monday.getFullYear();
  const startMonth = monday.getMonth() + 1;
  const startDay = monday.getDate();
  const endYear = sunday.getFullYear();
  const endMonth = sunday.getMonth() + 1;
  const endDay = sunday.getDate();
  
  return `${startYear}年${startMonth}月${startDay}日 - ${endYear}年${endMonth}月${endDay}日`;
}

// ==================== 日期類型判定 ====================

function getDateType(dateStr) {
  const holiday = state.holidays.get(dateStr);
  
  // 優先級 1: 國定假日
  if (holiday && holiday.is_national_holiday) {
    return 'national_holiday';
  }
  
  // 優先級 2: 補班日
  if (holiday && holiday.is_makeup_workday) {
    return 'makeup';
  }
  
  const date = new Date(dateStr + 'T00:00:00');
  const dow = date.getDay();
  
  // 優先級 3: 週日（例假日）
  if (dow === 0) {
    return 'weekly_restday';
  }
  
  // 優先級 4: 週六（休息日）
  if (dow === 6) {
    return 'restday';
  }
  
  // 預設: 工作日
  return 'workday';
}

function buildWeekDays() {
  state.weekDays = [];
  state.weekDateTypes.clear();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(state.currentWeekStart);
    date.setDate(date.getDate() + i);
    const iso = formatDate(date);
    const dow = date.getDay();
    const type = getDateType(iso);
    const mustWork = (type === 'workday' || type === 'makeup');
    
    state.weekDays.push({ index: i, iso, dow, type, mustWork });
    state.weekDateTypes.set(iso, type);
  }
}

// ==================== API 調用 ====================

async function apiCall(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '請求失敗' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

async function loadClients() {
  try {
    const data = await apiCall('/internal/api/v1/clients?perPage=100');
    state.clients = data.data || [];
  } catch (error) {
    showToast('載入客戶列表失敗：' + error.message, 'error');
    state.clients = [];
  }
}

async function loadClientServices(clientId) {
  if (!clientId) return [];
  
  // 檢查快取
  if (state.clientServices.has(clientId)) {
    console.log('[DEBUG] 使用快取的服務項目:', clientId);
    return state.clientServices.get(clientId);
  }
  
  try {
    console.log('[DEBUG] 載入服務項目 API:', `/internal/api/v1/clients/${clientId}/services`);
    const response = await apiCall(`/internal/api/v1/clients/${clientId}/services`);
    console.log('[DEBUG] API 完整回應:', response);
    console.log('[DEBUG] response.data:', response.data);
    
    // API 回應結構: { ok, code, message, data: [...] }
    const services = response.data || [];
    console.log('[DEBUG] 最終解析服務項目 (應該是陣列):', services);
    state.clientServices.set(clientId, services);
    return services;
  } catch (error) {
    console.error('[DEBUG] 載入服務項目失敗:', error);
    showToast('載入服務項目失敗：' + error.message, 'error');
    return [];
  }
}

async function loadServiceItems(clientId, serviceId) {
  if (!clientId || !serviceId) return [];
  
  const key = `${clientId}_${serviceId}`;
  
  // 檢查快取
  if (state.serviceItems.has(key)) {
    return state.serviceItems.get(key);
  }
  
  try {
    const data = await apiCall(`/internal/api/v1/clients/${clientId}/services/${serviceId}/items`);
    const items = data.data || [];
    state.serviceItems.set(key, items);
    return items;
  } catch (error) {
    showToast('載入服務子項目失敗：' + error.message, 'error');
    return [];
  }
}

async function loadHolidays() {
  const start = formatDate(state.currentWeekStart);
  const endDate = new Date(state.currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const end = formatDate(endDate);
  
  try {
    const data = await apiCall(`/internal/api/v1/holidays?start_date=${start}&end_date=${end}`);
    state.holidays.clear();
    
    if (data.data) {
      data.data.forEach(h => {
        state.holidays.set(h.holiday_date, {
          is_national_holiday: h.is_national_holiday || false,
          is_makeup_workday: h.is_makeup_workday || false,
          is_weekly_restday: h.is_weekly_restday || false
        });
      });
    }
  } catch (error) {
    showToast('載入假日資料失敗：' + error.message, 'error');
  }
}

async function loadLeaves() {
  const start = formatDate(state.currentWeekStart);
  const endDate = new Date(state.currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const end = formatDate(endDate);
  
  try {
    const data = await apiCall(`/internal/api/v1/leaves?dateFrom=${start}&dateTo=${end}&status=approved&perPage=100`);
    state.leaves.clear();
    
    if (data.data) {
      data.data.forEach(leave => {
        const leaveType = leave.type || leave.leave_type || 'other';
        const unit = leave.unit || 'day';
        const amount = parseFloat(leave.amount) || 0;
        
        // 根據單位計算小時數
        let hours = 0;
        if (unit === 'hour') {
          hours = amount;
        } else if (unit === 'half') {
          hours = amount * 4; // 半天 = 4 小時
        } else { // day
          hours = amount * 8; // 1 天 = 8 小時
        }
        
        // 處理日期範圍
        const startDate = new Date((leave.start || leave.start_date) + 'T00:00:00');
        const endDate = new Date((leave.end || leave.end_date) + 'T00:00:00');
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = formatDate(d);
          
          if (!state.leaves.has(dateStr)) {
            state.leaves.set(dateStr, { hours: 0, types: [] });
          }
          
          const dayLeave = state.leaves.get(dateStr);
          dayLeave.hours += hours;
          dayLeave.types.push({ type: leaveType, hours });
        }
      });
    }
  } catch (error) {
    showToast('載入請假資料失敗：' + error.message, 'error');
  }
}

async function loadTimesheets() {
  const start = formatDate(state.currentWeekStart);
  const endDate = new Date(state.currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const end = formatDate(endDate);
  
  try {
    const data = await apiCall(`/internal/api/v1/timelogs?start_date=${start}&end_date=${end}`);
    const logs = data.data || [];
    
    // 建立 rows 結構
    const rowMap = new Map();
    
    logs.forEach(log => {
      const key = `${log.client_id}_${log.service_id}_${log.service_item_id}_${log.work_type_id}`;
      
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          client_id: log.client_id,
          service_id: log.service_id,
          service_item_id: log.service_item_id,
          work_type_id: log.work_type_id,
          hours: [null, null, null, null, null, null, null]
        });
      }
      
      const row = rowMap.get(key);
      const dayIndex = state.weekDays.findIndex(d => d.iso === log.work_date);
      
      if (dayIndex >= 0) {
        row.hours[dayIndex] = parseFloat(log.hours) || 0;
      }
    });
    
    state.rows = Array.from(rowMap.values());
    state.dailyNormalHours.clear();
    
    // 計算每日正常工時（用於完整性檢查）
    logs.forEach(log => {
      const workType = state.workTypes.find(wt => wt.id === log.work_type_id);
      if (workType && !workType.isOvertime) {
        const current = state.dailyNormalHours.get(log.work_date) || 0;
        state.dailyNormalHours.set(log.work_date, current + parseFloat(log.hours));
      }
    });
    
  } catch (error) {
    showToast('載入工時資料失敗：' + error.message, 'error');
    state.rows = [];
  }
}

async function loadMonthlySummary() {
  const year = state.currentWeekStart.getFullYear();
  const month = String(state.currentWeekStart.getMonth() + 1).padStart(2, '0');
  const monthStr = `${year}-${month}`;
  
  try {
    const data = await apiCall(`/internal/api/v1/timelogs/summary?month=${monthStr}`);
    state.monthlySummary = data.data || {
      total_hours: 0,
      overtime_hours: 0,
      weighted_hours: 0,
      leave_hours: 0
    };
    renderMonthlySummary();
  } catch (error) {
    showToast('載入月統計失敗：' + error.message, 'error');
    state.monthlySummary = {
      total_hours: 0,
      overtime_hours: 0,
      weighted_hours: 0,
      leave_hours: 0
    };
    renderMonthlySummary();
  }
}

// ==================== 週資料載入流程 ====================

async function loadWeek() {
  const token = ++state.token;
  state.ready = false;
  
  // 1. 載入假日和請假資料（並行）
  await Promise.all([loadHolidays(), loadLeaves()]);
  if (token !== state.token) return;
  
  // 2. 建立週模型和更新週標題
  buildWeekDays();
  renderWeekHeader();
  if (token !== state.token) return;
  
  // 3. 載入工時資料
  await loadTimesheets();
  if (token !== state.token) return;
  
  // 4. 載入月統計
  await loadMonthlySummary();
  if (token !== state.token) return;
  
  // 5. 渲染表格
  state.ready = true;
  renderTable();
  
  // 6. 延遲渲染表尾（避免阻塞）
  requestAnimationFrame(() => {
    renderLeaveRow();
    renderCompleteness();
  });
}

function resetWeekView() {
  state.rows = [];
  state.pending.clear();
  state.holidays.clear();
  state.leaves.clear();
  state.dailyNormalHours.clear();
  state.weekDays = [];
  state.ready = false;
}

// ==================== 渲染函數 ====================

function renderWeekHeader() {
  const title = formatWeekRange(state.currentWeekStart);
  document.getElementById('weekTitle').textContent = title;
  
  // 更新日期標籤和表頭背景色
  state.weekDays.forEach(day => {
    const label = document.getElementById(`dateLabel${day.index}`);
    const header = document.getElementById(`dateHeader${day.index}`);
    
    if (label) {
      const displayDate = formatDateDisplay(new Date(day.iso + 'T00:00:00'));
      
      // 建立徽章
      let badge = '';
      if (day.type === 'national_holiday') {
        badge = '<span class="date-badge badge-holiday">國定</span>';
      } else if (day.type === 'makeup') {
        badge = '<span class="date-badge badge-makeup">補班</span>';
      } else if (day.type === 'weekly_restday') {
        badge = '<span class="date-badge badge-restday">例假</span>';
      } else if (day.type === 'restday') {
        badge = '<span class="date-badge badge-restday">休息</span>';
      }
      
      label.innerHTML = displayDate + (badge ? '<br>' + badge : '');
    }
    
    // 為表頭添加背景色
    if (header) {
      // 移除舊的樣式類別
      header.classList.remove('header-holiday', 'header-weekend');
      
      // 添加新的樣式類別
      if (day.type === 'national_holiday') {
        header.classList.add('header-holiday');
      } else if (day.type === 'restday' || day.type === 'weekly_restday') {
        header.classList.add('header-weekend');
      }
    }
  });
}

function renderTable() {
  const tbody = document.getElementById('timesheetBody');
  tbody.innerHTML = '';
  
  if (state.rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="empty-state">尚無工時記錄，點擊右上角「新增列」開始填寫</td></tr>';
    updateWeeklySummary();
    updateDailyNormalHours();
    renderCompleteness();
    return;
  }
  
  state.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.dataset.rowIndex = rowIndex;
    
    // 客戶欄
    tr.appendChild(createClientCell(row, rowIndex));
    
    // 服務項目欄
    tr.appendChild(createServiceCell(row, rowIndex));
    
    // 服務子項目欄
    tr.appendChild(createServiceItemCell(row, rowIndex));
    
    // 工時類型欄
    tr.appendChild(createWorkTypeCell(row, rowIndex));
    
    // 日期欄位（7天）
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      tr.appendChild(createHoursCell(row, rowIndex, dayIndex));
    }
    
    // 操作欄
    tr.appendChild(createActionCell(rowIndex));
    
    tbody.appendChild(tr);
  });
  
  updateWeeklySummary();
  updateDailyNormalHours();
  renderCompleteness();
}

function createClientCell(row, rowIndex) {
  const td = document.createElement('td');
  td.className = 'cell-client sticky-col';
  
  const select = document.createElement('select');
  select.className = 'cell-select';
  select.dataset.rowIndex = rowIndex;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '請選擇客戶...';
  select.appendChild(defaultOption);
  
  state.clients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.clientId || client.client_id;
    option.textContent = client.companyName || client.company_name || client.name;
    if (option.value == row.client_id) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => handleClientChange(rowIndex, e.target.value));
  
  td.appendChild(select);
  return td;
}

function createServiceCell(row, rowIndex) {
  const td = document.createElement('td');
  td.className = 'cell-service sticky-col';
  
  const select = document.createElement('select');
  select.className = 'cell-select';
  select.dataset.rowIndex = rowIndex;
  select.id = `service-select-${rowIndex}`;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = row.client_id ? '載入中...' : '請先選擇客戶...';
  select.appendChild(defaultOption);
  
  // 如果有客戶ID，載入服務項目
  if (row.client_id) {
    loadClientServices(row.client_id).then(services => {
      select.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '請選擇服務項目...';
      select.appendChild(opt);
      
      services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.service_id;
        option.textContent = service.service_name;
        if (option.value == row.service_id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  }
  
  select.addEventListener('change', (e) => handleServiceChange(rowIndex, e.target.value));
  
  td.appendChild(select);
  return td;
}

function createServiceItemCell(row, rowIndex) {
  const td = document.createElement('td');
  td.className = 'cell-service-item sticky-col';
  
  const select = document.createElement('select');
  select.className = 'cell-select';
  select.dataset.rowIndex = rowIndex;
  select.id = `service-item-select-${rowIndex}`;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = row.service_id ? '載入中...' : '請先選擇服務項目...';
  select.appendChild(defaultOption);
  
  // 如果有客戶ID和服務ID，載入服務子項目
  if (row.client_id && row.service_id) {
    loadServiceItems(row.client_id, row.service_id).then(items => {
      select.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '請選擇服務子項目...';
      select.appendChild(opt);
      
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.item_id;
        option.textContent = item.item_name;
        if (option.value == row.service_item_id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  }
  
  select.addEventListener('change', (e) => handleServiceItemChange(rowIndex, e.target.value));
  
  td.appendChild(select);
  return td;
}

function createWorkTypeCell(row, rowIndex) {
  const td = document.createElement('td');
  td.className = 'cell-worktype sticky-col';
  
  const select = document.createElement('select');
  select.className = 'cell-select';
  select.dataset.rowIndex = rowIndex;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '請選擇工時類型...';
  select.appendChild(defaultOption);
  
  state.workTypes.forEach(wt => {
    const option = document.createElement('option');
    option.value = wt.id;
    option.textContent = wt.name;
    if (wt.id == row.work_type_id) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => handleWorkTypeChange(rowIndex, e.target.value));
  
  td.appendChild(select);
  return td;
}

function createHoursCell(row, rowIndex, dayIndex) {
  const td = document.createElement('td');
  td.className = 'cell-hours';
  const day = state.weekDays[dayIndex];
  
  // 添加日期類型樣式
  if (day.type === 'national_holiday') {
    td.classList.add('cell-holiday');
  } else if (day.type === 'restday' || day.type === 'weekly_restday') {
    td.classList.add('cell-weekend');
  }
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'hours-input';
  input.step = '0.5';
  input.min = '0';
  input.max = '12';
  input.dataset.rowIndex = rowIndex;
  input.dataset.dayIndex = dayIndex;
  
  const hours = row.hours[dayIndex];
  if (hours !== null && hours !== undefined && hours > 0) {
    input.value = hours;
    td.classList.add('has-value');
  }
  
  input.addEventListener('input', (e) => handleHoursInput(rowIndex, dayIndex, e.target.value));
  input.addEventListener('blur', (e) => handleHoursBlur(rowIndex, dayIndex));
  
  td.appendChild(input);
  return td;
}

function createActionCell(rowIndex) {
  const td = document.createElement('td');
  td.className = 'cell-action';
  
  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.innerHTML = '×';
  btnDelete.title = '刪除此列';
  btnDelete.addEventListener('click', () => handleDeleteRow(rowIndex));
  
  td.appendChild(btnDelete);
  return td;
}

// ==================== 事件處理函數 ====================

async function handleClientChange(rowIndex, clientId) {
  const row = state.rows[rowIndex];
  row.client_id = clientId;
  row.service_id = null;
  row.service_item_id = null;
  
  // 重新渲染服務項目和服務子項目下拉選單
  const serviceSelect = document.getElementById(`service-select-${rowIndex}`);
  const serviceItemSelect = document.getElementById(`service-item-select-${rowIndex}`);
  
  if (serviceSelect) {
    serviceSelect.innerHTML = '<option value="">載入中...</option>';
    
    if (clientId) {
      const services = await loadClientServices(clientId);
      serviceSelect.innerHTML = '<option value="">請選擇服務項目...</option>';
      services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.service_id;
        option.textContent = service.service_name;
        serviceSelect.appendChild(option);
      });
    } else {
      serviceSelect.innerHTML = '<option value="">請先選擇客戶...</option>';
    }
  }
  
  if (serviceItemSelect) {
    serviceItemSelect.innerHTML = '<option value="">請先選擇服務項目...</option>';
  }
}

async function handleServiceChange(rowIndex, serviceId) {
  const row = state.rows[rowIndex];
  row.service_id = serviceId;
  row.service_item_id = null;
  
  // 重新渲染服務子項目下拉選單
  const serviceItemSelect = document.getElementById(`service-item-select-${rowIndex}`);
  
  if (serviceItemSelect) {
    serviceItemSelect.innerHTML = '<option value="">載入中...</option>';
    
    if (serviceId && row.client_id) {
      const items = await loadServiceItems(row.client_id, serviceId);
      serviceItemSelect.innerHTML = '<option value="">請選擇服務子項目...</option>';
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.item_id;
        option.textContent = item.item_name;
        serviceItemSelect.appendChild(option);
      });
    } else {
      serviceItemSelect.innerHTML = '<option value="">請先選擇服務項目...</option>';
    }
  }
}

function handleServiceItemChange(rowIndex, serviceItemId) {
  const row = state.rows[rowIndex];
  row.service_item_id = serviceItemId;
}

function handleWorkTypeChange(rowIndex, workTypeId) {
  const row = state.rows[rowIndex];
  row.work_type_id = parseInt(workTypeId);
  
  // 驗證現有工時是否與新工時類型相容
  row.hours.forEach((hours, dayIndex) => {
    if (hours && hours > 0) {
      const day = state.weekDays[dayIndex];
      const workType = state.workTypes.find(wt => wt.id == workTypeId);
      
      if (workType && !isWorkTypeAllowed(workType, day.type)) {
        // 清空不相容的工時
        row.hours[dayIndex] = null;
        const input = document.querySelector(`input[data-row-index="${rowIndex}"][data-day-index="${dayIndex}"]`);
        if (input) {
          input.value = '';
          input.closest('td').classList.remove('has-value');
        }
        showToast(`${day.iso} 不可使用「${workType.name}」`, 'warning');
      }
    }
  });
  
  updateWeeklySummary();
}

function handleHoursInput(rowIndex, dayIndex, value) {
  const row = state.rows[rowIndex];
  const day = state.weekDays[dayIndex];
  
  // 檢查必填欄位
  if (!row.client_id || !row.service_id || !row.service_item_id || !row.work_type_id) {
    showToast('請先選擇客戶、服務項目、服務子項目與工時類型', 'warning');
    return;
  }
  
  const hours = parseFloat(value);
  
  if (isNaN(hours) || hours <= 0) {
    row.hours[dayIndex] = null;
    const key = `${rowIndex}_${dayIndex}`;
    state.pending.delete(key);
    updatePendingCount();
    updateWeeklySummary();
    updateDailyNormalHours(); // 更新每日工時統計
    renderCompleteness(); // 重新渲染完整性檢查
    return;
  }
  
  // 四捨五入至 0.5
  const rounded = Math.round(hours * 2) / 2;
  
  // 驗證工時類型與日期相容性
  const workType = state.workTypes.find(wt => wt.id == row.work_type_id);
  
  if (workType && !isWorkTypeAllowed(workType, day.type)) {
    showToast(`該日期不可使用「${workType.name}」`, 'error');
    row.hours[dayIndex] = null;
    const input = document.querySelector(`input[data-row-index="${rowIndex}"][data-day-index="${dayIndex}"]`);
    if (input) {
      input.value = '';
      input.closest('td').classList.remove('has-value');
    }
    return;
  }
  
  // 驗證時數限制
  if (workType && workType.maxHours && rounded > workType.maxHours) {
    showToast(`${workType.name}最多只能填 ${workType.maxHours} 小時`, 'error');
    return;
  }
  
  // 驗證前置要求
  if (workType && workType.requiresTypes) {
    const hasRequired = workType.requiresTypes.every(reqId => {
      return state.rows.some(r => 
        r.client_id == row.client_id &&
        r.service_id == row.service_id &&
        r.service_item_id == row.service_item_id &&
        r.work_type_id == reqId &&
        r.hours[dayIndex] > 0
      );
    });
    
    if (!hasRequired) {
      showToast('請先填寫前置加班類型', 'error');
      row.hours[dayIndex] = null;
      const input = document.querySelector(`input[data-row-index="${rowIndex}"][data-day-index="${dayIndex}"]`);
      if (input) {
        input.value = '';
        input.closest('td').classList.remove('has-value');
      }
      return;
    }
  }
  
  row.hours[dayIndex] = rounded;
  
  // 記錄待儲存變更
  const key = `${rowIndex}_${dayIndex}`;
  state.pending.set(key, { rowIndex, dayIndex, value: rounded });
  
  // 更新輸入框
  const input = document.querySelector(`input[data-row-index="${rowIndex}"][data-day-index="${dayIndex}"]`);
  if (input) {
    input.value = rounded;
    input.closest('td').classList.add('has-value');
  }
  
  updatePendingCount();
  updateWeeklySummary();
  updateDailyNormalHours(); // 更新每日工時統計
  renderCompleteness(); // 重新渲染完整性檢查
}

function handleHoursBlur(rowIndex, dayIndex) {
  // 可選：失焦時自動儲存
  // saveSingleCell(rowIndex, dayIndex);
}

async function handleDeleteRow(rowIndex) {
  const row = state.rows[rowIndex];
  
  // 檢查是否有工時
  const hasHours = row.hours.some(h => h && h > 0);
  
  if (hasHours) {
    if (!confirm('刪除此列將清除本週該組合的所有工時，確定刪除？')) {
      return;
    }
    
    // 調用批量刪除 API
    try {
      const start = formatDate(state.currentWeekStart);
      const endDate = new Date(state.currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);
      const end = formatDate(endDate);
      
      await apiCall('/internal/api/v1/timelogs/batch', {
        method: 'DELETE',
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          client_id: row.client_id,
          service_id: row.service_id,
          service_item_id: row.service_item_id,
          work_type_id: row.work_type_id
        })
      });
      
      showToast('已刪除列', 'success');
    } catch (error) {
      showToast('刪除失敗：' + error.message, 'error');
      return;
    }
  }
  
  // 從 state.rows 移除
  state.rows.splice(rowIndex, 1);
  
  // 清除相關的 pending 變更
  for (let i = 0; i < 7; i++) {
    state.pending.delete(`${rowIndex}_${i}`);
  }
  
  // 重新渲染
  renderTable();
  updatePendingCount();
}

// ==================== 驗證函數 ====================

function isWorkTypeAllowed(workType, dateType) {
  if (!workType.allowedOn) return true;
  return workType.allowedOn.includes(dateType);
}

// ==================== 儲存函數 ====================

async function saveAllChanges() {
  if (state.pending.size === 0) {
    showToast('沒有待儲存的變更', 'info');
    return;
  }
  
  const changes = Array.from(state.pending.values());
  const savePromises = changes.map(change => {
    const row = state.rows[change.rowIndex];
    const day = state.weekDays[change.dayIndex];
    
    return apiCall('/internal/api/v1/timelogs', {
      method: 'POST',
      body: JSON.stringify({
        work_date: day.iso,
        client_id: row.client_id,
        service_id: row.service_id,
        service_item_id: row.service_item_id,
        work_type_id: row.work_type_id,
        hours: change.value
      })
    });
  });
  
  try {
    await Promise.all(savePromises);
    state.pending.clear();
    updatePendingCount();
    showToast('已儲存所有變更', 'success');
    
    // 重新載入資料
    await loadWeek();
  } catch (error) {
    showToast('儲存失敗：' + error.message, 'error');
  }
}

// ==================== 統計計算 ====================

function updateWeeklySummary() {
  let totalHours = 0;
  let overtimeHours = 0;
  let weightedHours = 0;
  
  state.rows.forEach(row => {
    const workType = state.workTypes.find(wt => wt.id == row.work_type_id);
    if (!workType) return;
    
    row.hours.forEach(hours => {
      if (hours && hours > 0) {
        totalHours += hours;
        
        if (workType.isOvertime) {
          overtimeHours += hours;
        }
        
        weightedHours += hours * workType.multiplier;
      }
    });
  });
  
  // 計算本週請假時數
  let leaveHours = 0;
  state.weekDays.forEach(day => {
    const leave = state.leaves.get(day.iso);
    if (leave) {
      leaveHours += leave.hours;
    }
  });
  
  document.getElementById('weeklyTotalHours').textContent = totalHours.toFixed(1);
  document.getElementById('weeklyOvertimeHours').textContent = overtimeHours.toFixed(1);
  document.getElementById('weeklyWeightedHours').textContent = weightedHours.toFixed(1);
  document.getElementById('weeklyLeaveHours').textContent = leaveHours.toFixed(1);
}

function updateDailyNormalHours() {
  // 重新計算每日正常工時
  state.dailyNormalHours.clear();
  
  state.rows.forEach(row => {
    const workType = state.workTypes.find(wt => wt.id == row.work_type_id);
    if (!workType || workType.isOvertime) return; // 只計算正常工時
    
    row.hours.forEach((hours, dayIndex) => {
      if (hours && hours > 0) {
        const day = state.weekDays[dayIndex];
        const current = state.dailyNormalHours.get(day.iso) || 0;
        state.dailyNormalHours.set(day.iso, current + hours);
      }
    });
  });
}

function renderMonthlySummary() {
  if (!state.monthlySummary) return;
  
  document.getElementById('monthlyTotalHours').textContent = 
    (state.monthlySummary.total_hours || 0).toFixed(1);
  document.getElementById('monthlyOvertimeHours').textContent = 
    (state.monthlySummary.overtime_hours || 0).toFixed(1);
  document.getElementById('monthlyWeightedHours').textContent = 
    (state.monthlySummary.weighted_hours || 0).toFixed(1);
  document.getElementById('monthlyLeaveHours').textContent = 
    (state.monthlySummary.leave_hours || 0).toFixed(1);
}

// ==================== 請假記錄渲染 ====================

function renderLeaveRow() {
  state.weekDays.forEach(day => {
    const cell = document.getElementById(`leaveCell${day.index}`);
    if (!cell) return;
    
    const leave = state.leaves.get(day.iso);
    
    if (leave && leave.hours > 0) {
      const types = leave.types.map(t => {
        const typeName = getLeaveTypeName(t.type);
        return `${typeName} ${t.hours}h`;
      }).join(', ');
      
      cell.textContent = types;
      cell.classList.add('has-leave');
    } else {
      cell.textContent = '-';
      cell.classList.remove('has-leave');
    }
  });
}

function getLeaveTypeName(type) {
  const names = {
    annual: '特休',
    sick: '病假',
    personal: '事假',
    comp: '補休',
    maternity: '產假',
    paternity: '陪產假',
    menstrual: '生理假',
    marriage: '婚假',
    bereavement: '喪假',
    official: '公假',
    other: '其他'
  };
  return names[type] || type;
}

// ==================== 完整性檢查渲染 ====================

function renderCompleteness() {
  state.weekDays.forEach(day => {
    const cell = document.getElementById(`completenessCell${day.index}`);
    if (!cell) return;
    
    // 只檢查工作日和補班日
    if (!day.mustWork) {
      cell.textContent = '-';
      cell.className = 'completeness-cell';
      return;
    }
    
    const normalHours = state.dailyNormalHours.get(day.iso) || 0;
    const leave = state.leaves.get(day.iso);
    const leaveHours = leave ? leave.hours : 0;
    const total = normalHours + leaveHours;
    
    if (total >= 8) {
      cell.textContent = '✓ 完整';
      cell.className = 'completeness-cell status-complete';
    } else if (total >= 6) {
      const missing = 8 - total;
      cell.textContent = `⚠ 缺${missing.toFixed(1)}h`;
      cell.className = 'completeness-cell status-warning';
    } else {
      const missing = 8 - total;
      cell.textContent = `✗ 缺${missing.toFixed(1)}h`;
      cell.className = 'completeness-cell status-error';
    }
    
    cell.title = `工時 ${normalHours.toFixed(1)}h + 請假 ${leaveHours.toFixed(1)}h = ${total.toFixed(1)}h`;
  });
}

// ==================== 新增列 ====================

function addNewRow() {
  state.rows.push({
    client_id: null,
    service_id: null,
    service_item_id: null,
    work_type_id: null,
    hours: [null, null, null, null, null, null, null]
  });
  
  renderTable();
}

// ==================== 待儲存計數 ====================

function updatePendingCount() {
  const count = state.pending.size;
  const countEl = document.getElementById('pendingCount');
  
  if (count > 0) {
    countEl.textContent = `(${count})`;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }
}

// ==================== Toast 通知 ====================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// ==================== 週導航事件 ====================

document.getElementById('btnPrevWeek').addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  resetWeekView();
  state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
  await loadWeek();
  isLoading = false;
});

document.getElementById('btnThisWeek').addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  resetWeekView();
  state.currentWeekStart = getMonday(new Date());
  await loadWeek();
  isLoading = false;
});

document.getElementById('btnNextWeek').addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  resetWeekView();
  state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
  await loadWeek();
  isLoading = false;
});

document.getElementById('btnAddRow').addEventListener('click', addNewRow);
document.getElementById('btnSaveAll').addEventListener('click', saveAllChanges);

// ==================== 初始化 ====================

async function init() {
  initWorkTypes();
  state.currentWeekStart = getMonday(new Date());
  
  await loadClients();
  await loadWeek();
}

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
