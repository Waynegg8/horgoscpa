// Timesheet Page Logic (extracted from inline script)

let holidaysCache = null;
let currentData = { workEntries: [], leaveEntries: [] };
let clientsCache = [];
let businessTypesCache = [];
let leaveTypesCache = [];
let workTypesCache = [];
let hasChanges = false;

document.addEventListener('DOMContentLoaded', async () => {
  await initPage(async () => {
    setCurrentMonth();
    await loadEmployees();
    setupEventListeners();
  });
});

function timesheetShowError(message) {
  const errorMsg = document.getElementById('errorMsg');
  if (!errorMsg) return;
  errorMsg.innerHTML = `<span class="material-symbols-outlined">error</span><span>${escapeHtml(message)}</span>`;
  errorMsg.classList.add('show');
  setTimeout(() => errorMsg.classList.remove('show'), 3000);
}

function timesheetShowLoading(show) {
  const loadingMsg = document.getElementById('loadingMsg');
  if (!loadingMsg) return;
  if (show) loadingMsg.classList.add('show');
  else loadingMsg.classList.remove('show');
}

function hideTimesheetMessages() {
  const errorMsg = document.getElementById('errorMsg');
  const loadingMsg = document.getElementById('loadingMsg');
  if (errorMsg) errorMsg.classList.remove('show');
  if (loadingMsg) loadingMsg.classList.remove('show');
}

function setupEventListeners() {
  const employeeSelect = document.getElementById('employee');
  const yearInput = document.getElementById('year');
  const monthSelect = document.getElementById('month');

  if (employeeSelect) employeeSelect.addEventListener('change', loadTimesheetData);
  if (yearInput) yearInput.addEventListener('change', loadTimesheetData);
  if (monthSelect) monthSelect.addEventListener('change', loadTimesheetData);

  const addWorkBtn = document.getElementById('addWorkBtn');
  const addLeaveBtn = document.getElementById('addLeaveBtn');
  const saveBtn = document.getElementById('saveBtn');
  if (addWorkBtn) addWorkBtn.addEventListener('click', showAddWorkModal);
  if (addLeaveBtn) addLeaveBtn.addEventListener('click', showAddLeaveModal);
  if (saveBtn) saveBtn.addEventListener('click', saveTimesheet);

  const cancelWorkBtn = document.getElementById('cancelWorkBtn');
  const confirmWorkBtn = document.getElementById('confirmWorkBtn');
  const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');
  const confirmLeaveBtn = document.getElementById('confirmLeaveBtn');
  if (cancelWorkBtn) cancelWorkBtn.addEventListener('click', hideAddWorkModal);
  if (confirmWorkBtn) confirmWorkBtn.addEventListener('click', confirmAddWork);
  if (cancelLeaveBtn) cancelLeaveBtn.addEventListener('click', hideAddLeaveModal);
  if (confirmLeaveBtn) confirmLeaveBtn.addEventListener('click', confirmAddLeave);

  const addWorkModal = document.getElementById('addWorkModal');
  const addLeaveModal = document.getElementById('addLeaveModal');
  if (addWorkModal) addWorkModal.addEventListener('click', (e) => { if (e.target.id === 'addWorkModal') hideAddWorkModal(); });
  if (addLeaveModal) addLeaveModal.addEventListener('click', (e) => { if (e.target.id === 'addLeaveModal') hideAddLeaveModal(); });
}

async function loadEmployees() {
  const employeeSelect = document.getElementById('employee');
  if (!employeeSelect) return;
  try {
    const employees = await apiRequest('/api/employees');
    const list = Array.isArray(employees) ? employees : [];

    employeeSelect.innerHTML = '';
    if (list.length === 0) {
      employeeSelect.innerHTML = '<option value="">無員工資料</option>';
      timesheetShowError('資料庫中沒有員工資料');
      return;
    }

    list.forEach(emp => {
      const name = emp?.name || emp?.employee_name || emp;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      employeeSelect.appendChild(option);
    });

    employeeSelect.disabled = false;

    if (window.currentUser?.role === 'employee' && window.currentUser?.employee_name) {
      employeeSelect.value = window.currentUser.employee_name;
    }

    await loadTimesheetData();
  } catch (err) {
    employeeSelect.innerHTML = '<option value="">載入失敗</option>';
    timesheetShowError('載入員工列表失敗：' + err.message);
  }
}

function setCurrentMonth() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthSelect = document.getElementById('month');
  const yearInput = document.getElementById('year');
  if (monthSelect) monthSelect.value = currentMonth;
  if (yearInput) yearInput.value = currentYear;
}

async function loadHolidays(year) {
  try {
    const holidays = await apiRequest(`/api/holidays?year=${year}`);
    holidaysCache = holidays || [];
    return holidaysCache;
  } catch (err) {
    console.error('載入假日失敗:', err);
    return [];
  }
}

async function loadClients(employee) {
  try {
    const clients = await apiRequest(`/api/clients?employee=${encodeURIComponent(employee)}`);
    clientsCache = Array.isArray(clients) ? clients : [];
    return clientsCache;
  } catch (err) {
    console.error('載入客戶失敗:', err);
    return [];
  }
}

async function loadBusinessTypes() {
  try {
    const types = await apiRequest('/api/business-types');
    businessTypesCache = (types || []).map(t => t.name || t.type_name || t);
    return businessTypesCache;
  } catch (err) {
    console.error('載入業務類型失敗:', err);
    return [];
  }
}

async function loadLeaveTypes() {
  try {
    const types = await apiRequest('/api/leave-types');
    leaveTypesCache = (types || []).map(t => t.type_name || t.name || t);
    return leaveTypesCache;
  } catch (err) {
    console.error('載入請假類型失敗:', err);
    return [];
  }
}

async function loadWorkTypes() {
  try {
    const types = await apiRequest('/api/work-types');
    workTypesCache = Array.isArray(types) ? types : [];
    return workTypesCache;
  } catch (err) {
    console.error('載入工時類型失敗:', err);
    return [];
  }
}

function isHoliday(dateStr) {
  return holidaysCache && holidaysCache.includes(dateStr);
}

function isWeekend(year, month, day) {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getWeekdayText(year, month, day) {
  const date = new Date(year, month - 1, day);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return '週' + weekdays[date.getDay()];
}

async function loadTimesheetData() {
  const emp = document.getElementById('employee')?.value;
  const year = parseInt(document.getElementById('year')?.value);
  const month = parseInt(document.getElementById('month')?.value);
  const tableBody = document.getElementById('tableBody');
  const monthInfo = document.getElementById('monthInfo');

  if (!emp) {
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="35" class="empty-state">
            <div class="material-symbols-rounded">inbox</div>
            <div>請選擇員工</div>
          </td>
        </tr>
      `;
    }
    if (monthInfo) monthInfo.style.display = 'none';
    return;
  }

  hideTimesheetMessages();
  timesheetShowLoading(true);

  try {
    await Promise.all([
      loadHolidays(year),
      loadClients(emp),
      loadBusinessTypes(),
      loadLeaveTypes(),
      loadWorkTypes()
    ]);

    const data = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(emp)}&year=${year}&month=${month}`);

    timesheetShowLoading(false);

    if (!data || data.error) {
      timesheetShowError(`載入資料失敗：${data?.error || '未知錯誤'}`);
      return;
    }

    const monthTitle = document.getElementById('monthTitle');
    if (monthTitle) monthTitle.textContent = `${year}年${month}月 - ${emp}`;
    if (monthInfo) monthInfo.style.display = 'flex';

    currentData.workEntries = data.workEntries || [];
    currentData.leaveEntries = data.leaveEntries || [];
    hasChanges = false;

    const daysInMonth = new Date(year, month, 0).getDate();
    generateTableHeader(year, month, daysInMonth);
    generateTableBody(year, month, daysInMonth);
  } catch (err) {
    timesheetShowLoading(false);
    timesheetShowError('載入資料時發生錯誤：' + err.message);
  }
}

function generateTableHeader(year, month, daysInMonth) {
  const tableHead = document.getElementById('tableHead');
  if (!tableHead) return;

  let headerRow1 = '<tr><th>客戶名稱</th><th>業務類型</th><th>工時類型</th>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const klass = isHoliday(dateStr) ? 'holiday' : (isWeekend(year, month, day) ? 'weekend' : '');
    headerRow1 += `<th class="day-cell ${klass}">${day}</th>`;
  }
  headerRow1 += '<th class="total-cell">月總計</th></tr>';

  let headerRow2 = '<tr><th></th><th></th><th></th>';
  for (let day = 1; day <= daysInMonth; day++) {
    const weekdayText = getWeekdayText(year, month, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const klass = isHoliday(dateStr) ? 'holiday' : (isWeekend(year, month, day) ? 'weekend' : '');
    headerRow2 += `<th class="day-cell ${klass}">${weekdayText}</th>`;
  }
  headerRow2 += '<th class="total-cell">小時</th></tr>';

  tableHead.innerHTML = headerRow1 + headerRow2;
}

function generateTableBody(year, month, daysInMonth) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;

  const allEntries = [];
  currentData.workEntries.forEach((entry, index) => {
    allEntries.push({ type: 'work', index, clientName: entry.clientName || '-', businessType: entry.businessType || '-', workType: entry.workType || '-', hours: entry.hours || {} });
  });
  currentData.leaveEntries.forEach((entry, index) => {
    allEntries.push({ type: 'leave', index, clientName: '-', businessType: '-', workType: entry.leaveType || '-', hours: entry.hours || {} });
  });

  if (allEntries.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${daysInMonth + 4}" class="empty-state">
          <div class="material-symbols-outlined">event_busy</div>
          <div>本月尚無工時或請假記錄，請點選上方按鈕新增</div>
        </td>
      </tr>
    `;
    const totalHoursEl = document.getElementById('totalHours');
    if (totalHoursEl) totalHoursEl.textContent = '0';
    return;
  }

  let totalAllHours = 0;
  tableBody.innerHTML = '';

  allEntries.forEach((entry) => {
    const tr = document.createElement('tr');

    const firstCol = document.createElement('td');
    firstCol.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 5px;">
        <span>${escapeHtml(entry.clientName)}</span>
        <button class="delete-row-btn" data-type="${entry.type}" data-index="${entry.index}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
    tr.appendChild(firstCol);

    const secondCol = document.createElement('td');
    secondCol.textContent = entry.businessType;
    tr.appendChild(secondCol);

    const thirdCol = document.createElement('td');
    thirdCol.textContent = entry.workType;
    tr.appendChild(thirdCol);

    let rowTotal = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const hours = entry.hours[day] || '';
      const td = document.createElement('td');
      td.className = 'day-cell editable';
      if (hours) td.classList.add(entry.type === 'leave' ? 'leave-cell' : 'has-value');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.pattern = '[0-9]*\\.?[0-9]*';
      input.value = hours;
      input.placeholder = '';
      input.style.textAlign = 'center';
      const captureDay = day;
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9.]/g, '');
        let val = parseFloat(e.target.value || 0) || 0;
        if (entry.type === 'leave' && entry.workType === '生理假') {
          let monthSumExcludingDay = 0;
          for (const d in entry.hours) {
            if (parseInt(d) !== captureDay) monthSumExcludingDay += parseFloat(entry.hours[d] || 0);
          }
          const allowed = Math.max(0, 8 - monthSumExcludingDay);
          if (val > allowed) {
            val = allowed;
            e.target.value = allowed > 0 ? String(allowed) : '';
            timesheetShowError('生理假每月上限為 8 小時，已自動調整');
          }
        }
        updateCellValue(entry.type, entry.index, captureDay, String(val));
      });
      td.appendChild(input);
      tr.appendChild(td);
      if (hours) rowTotal += parseFloat(hours);
    }

    const totalCol = document.createElement('td');
    totalCol.className = 'total-cell';
    totalCol.textContent = rowTotal.toFixed(1);
    totalCol.id = `total-${entry.type}-${entry.index}`;
    tr.appendChild(totalCol);

    tableBody.appendChild(tr);
    totalAllHours += rowTotal;
  });

  const totalHoursEl = document.getElementById('totalHours');
  if (totalHoursEl) totalHoursEl.textContent = totalAllHours.toFixed(1);

  const dailyTotals = new Array(daysInMonth + 1).fill(0);
  allEntries.forEach(entry => {
    for (let day = 1; day <= daysInMonth; day++) {
      const val = parseFloat(entry.hours[day] || 0);
      if (!isNaN(val)) dailyTotals[day] += val;
    }
  });
  const totalRow = document.createElement('tr');
  const totalTitle1 = document.createElement('td'); totalTitle1.textContent = '—'; totalRow.appendChild(totalTitle1);
  const totalTitle2 = document.createElement('td'); totalTitle2.textContent = '—'; totalRow.appendChild(totalTitle2);
  const totalTitle3 = document.createElement('td'); totalTitle3.textContent = '當日合計'; totalTitle3.style.fontWeight = '700'; totalRow.appendChild(totalTitle3);
  let monthlySum = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const td = document.createElement('td');
    td.className = 'day-cell';
    td.style.fontWeight = '700';
    td.textContent = dailyTotals[day] ? dailyTotals[day].toFixed(1) : '';
    totalRow.appendChild(td);
    monthlySum += dailyTotals[day];
  }
  const monthlyTotalCell = document.createElement('td');
  monthlyTotalCell.className = 'total-cell';
  monthlyTotalCell.textContent = monthlySum.toFixed(1);
  totalRow.appendChild(monthlyTotalCell);
  tableBody.appendChild(totalRow);

  tableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-type');
      const index = parseInt(e.currentTarget.getAttribute('data-index'));
      deleteEntry(type, index);
    });
  });
}

function updateCellValue(type, index, day, value) {
  const numValue = value ? parseFloat(value) : 0;
  if (type === 'work') {
    if (!currentData.workEntries[index].hours) currentData.workEntries[index].hours = {};
    if (numValue > 0) currentData.workEntries[index].hours[day] = numValue; else delete currentData.workEntries[index].hours[day];
  } else if (type === 'leave') {
    if (!currentData.leaveEntries[index].hours) currentData.leaveEntries[index].hours = {};
    if (numValue > 0) currentData.leaveEntries[index].hours[day] = numValue; else delete currentData.leaveEntries[index].hours[day];
  }
  hasChanges = true;
  updateRowTotal(type, index);
  updateGrandTotal();
}

function updateRowTotal(type, index) {
  const entry = type === 'work' ? currentData.workEntries[index] : currentData.leaveEntries[index];
  let total = 0;
  for (const d in entry.hours) total += entry.hours[d];
  const totalEl = document.getElementById(`total-${type}-${index}`);
  if (totalEl) totalEl.textContent = total.toFixed(1);
}

function updateGrandTotal() {
  let total = 0;
  currentData.workEntries.forEach(entry => { for (const d in entry.hours) total += entry.hours[d]; });
  currentData.leaveEntries.forEach(entry => { for (const d in entry.hours) total += entry.hours[d]; });
  const totalHoursEl = document.getElementById('totalHours');
  if (totalHoursEl) totalHoursEl.textContent = total.toFixed(1);
}

function deleteEntry(type, index) {
  if (!confirm('確定要刪除這筆記錄嗎？')) return;
  if (type === 'work') currentData.workEntries.splice(index, 1); else currentData.leaveEntries.splice(index, 1);
  hasChanges = true;
  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const daysInMonth = new Date(year, month, 0).getDate();
  generateTableBody(year, month, daysInMonth);
}

function showAddWorkModal() {
  const emp = document.getElementById('employee')?.value;
  if (!emp) { timesheetShowError('請先選擇員工'); return; }
  const clientSelect = document.getElementById('workClient');
  const businessTypeSelect = document.getElementById('workBusinessType');
  const workTypeSelect = document.getElementById('workType');
  if (clientSelect) {
    clientSelect.innerHTML = '<option value="">請選擇客戶</option>';
    clientsCache.forEach(client => {
      const option = document.createElement('option');
      option.value = client;
      option.textContent = client;
      clientSelect.appendChild(option);
    });
  }
  if (businessTypeSelect) {
    businessTypeSelect.innerHTML = '<option value="">請選擇業務類型</option>';
    businessTypesCache.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      businessTypeSelect.appendChild(option);
    });
  }
  if (workTypeSelect) {
    workTypeSelect.innerHTML = '<option value="">請選擇工時類型</option>';
    workTypesCache.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      workTypeSelect.appendChild(option);
    });
  }
  document.getElementById('addWorkModal')?.classList.add('show');
}

function hideAddWorkModal() {
  document.getElementById('addWorkModal')?.classList.remove('show');
  const clientSelect = document.getElementById('workClient');
  const businessTypeSelect = document.getElementById('workBusinessType');
  const workTypeSelect = document.getElementById('workType');
  if (clientSelect) clientSelect.value = '';
  if (businessTypeSelect) businessTypeSelect.value = '';
  if (workTypeSelect) workTypeSelect.value = '';
}

function confirmAddWork() {
  const clientName = document.getElementById('workClient')?.value;
  const businessType = document.getElementById('workBusinessType')?.value;
  const workType = document.getElementById('workType')?.value;
  if (!clientName || !businessType || !workType) { alert('請填寫所有必填欄位'); return; }
  const exists = currentData.workEntries.some(entry => entry.clientName === clientName && entry.businessType === businessType && entry.workType === workType);
  if (exists) { alert('此工時記錄已存在，請直接在表格中編輯'); return; }
  currentData.workEntries.push({ clientName, businessType, workType, hours: {} });
  hasChanges = true;
  hideAddWorkModal();
  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const daysInMonth = new Date(year, month, 0).getDate();
  generateTableBody(year, month, daysInMonth);
}

function showAddLeaveModal() {
  const emp = document.getElementById('employee')?.value;
  if (!emp) { timesheetShowError('請先選擇員工'); return; }
  const leaveTypeSelect = document.getElementById('leaveType');
  if (leaveTypeSelect) {
    leaveTypeSelect.innerHTML = '<option value="">請選擇假別</option>';
    leaveTypesCache.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      leaveTypeSelect.appendChild(option);
    });
  }
  document.getElementById('addLeaveModal')?.classList.add('show');
}

function hideAddLeaveModal() {
  document.getElementById('addLeaveModal')?.classList.remove('show');
  const leaveTypeSelect = document.getElementById('leaveType');
  if (leaveTypeSelect) leaveTypeSelect.value = '';
}

function confirmAddLeave() {
  const leaveType = document.getElementById('leaveType')?.value;
  if (!leaveType) { alert('請選擇假別'); return; }
  const exists = currentData.leaveEntries.some(entry => entry.leaveType === leaveType);
  if (exists) { alert('此請假記錄已存在，請直接在表格中編輯'); return; }
  currentData.leaveEntries.push({ leaveType, hours: {} });
  hasChanges = true;
  hideAddLeaveModal();
  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const daysInMonth = new Date(year, month, 0).getDate();
  generateTableBody(year, month, daysInMonth);
}

async function saveTimesheet() {
  if (!hasChanges) { alert('沒有變更需要儲存'); return; }
  const emp = document.getElementById('employee')?.value;
  const year = parseInt(document.getElementById('year')?.value);
  const month = parseInt(document.getElementById('month')?.value);
  if (!emp) { timesheetShowError('請選擇員工'); return; }
  if (!confirm('確定要儲存本月的工時記錄嗎？')) return;
  timesheetShowLoading(true);
  try {
    const payload = { employee: emp, year, month, workEntries: currentData.workEntries, leaveEntries: currentData.leaveEntries };
    const result = await apiRequest('/api/save-timesheet', { method: 'POST', body: payload });
    timesheetShowLoading(false);
    if (!result || result.error) { timesheetShowError(`儲存失敗：${result?.error || '未知錯誤'}`); return; }
    hasChanges = false;
    showNotification('工時記錄已成功儲存', 'success', 2000);
    setTimeout(() => { loadTimesheetData(); }, 600);
  } catch (err) {
    timesheetShowLoading(false);
    timesheetShowError('儲存時發生錯誤：' + err.message);
  }
}


