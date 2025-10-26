/**
 * 工時系統主功能腳本
 * 使用共用模組進行模組化開發
 */

let holidaysCache = null;
let currentData = {
    workEntries: [],
    leaveEntries: []
};
let clientsCache = [];
let businessTypesCache = [];
let leaveTypesCache = [];
let workTypesCache = [];
let hasChanges = false;

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', () => {
    initPage(async () => {
        setCurrentMonth();
        await loadInitialData();
        setupEventListeners();
    });
});

// 設定當前月份
function setCurrentMonth() {
    const now = new Date();
    document.getElementById('month').value = now.getMonth() + 1;
    document.getElementById('year').value = now.getFullYear();
}

// 載入初始下拉選單資料
async function loadInitialData() {
    try {
        const [employees, businessTypes, leaveTypes, workTypes] = await Promise.all([
            apiRequest('/api/admin/employees'),
            apiRequest('/api/business-types'),
            apiRequest('/api/leave-types'),
            apiRequest('/api/work-types')
        ]);

        // 填充員工下拉選單
        const employeeSelect = document.getElementById('employee');
        employeeSelect.innerHTML = '';
        if (window.currentUser.role === 'admin') {
             employees.data.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.name;
                option.textContent = emp.name;
                employeeSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = window.currentUser.employee_name;
            option.textContent = window.currentUser.employee_name;
            employeeSelect.appendChild(option);
            employeeSelect.disabled = true;
        }
       
        employeeSelect.disabled = false;
        
        businessTypesCache = businessTypes.data.map(t => t.name);
        leaveTypesCache = leaveTypes.data.map(t => t.type_name);
        workTypesCache = workTypes.data;

        // 自動選擇當前用戶（如果是員工）
        if (window.currentUser.role === 'employee' && window.currentUser.employee_name) {
            employeeSelect.value = window.currentUser.employee_name;
        }

        // 載入第一個員工的工時表
        await loadTimesheetData();

    } catch (error) {
        handleApiError(error, '載入初始資料');
    }
}


// 設定事件監聽器
function setupEventListeners() {
    document.getElementById('employee').addEventListener('change', loadTimesheetData);
    document.getElementById('year').addEventListener('change', loadTimesheetData);
    document.getElementById('month').addEventListener('change', loadTimesheetData);
    document.getElementById('addWorkBtn').addEventListener('click', showAddWorkModal);
    document.getElementById('addLeaveBtn').addEventListener('click', showAddLeaveModal);
    document.getElementById('saveBtn').addEventListener('click', saveTimesheet);
    document.getElementById('cancelWorkBtn').addEventListener('click', hideAddWorkModal);
    document.getElementById('confirmWorkBtn').addEventListener('click', confirmAddWork);
    document.getElementById('cancelLeaveBtn').addEventListener('click', hideAddLeaveModal);
    document.getElementById('confirmLeaveBtn').addEventListener('click', confirmAddLeave);

    // 點擊 Modal 外部可關閉
    document.getElementById('addWorkModal').addEventListener('click', (e) => {
        if (e.target.id === 'addWorkModal') hideAddWorkModal();
    });
    document.getElementById('addLeaveModal').addEventListener('click', (e) => {
        if (e.target.id === 'addLeaveModal') hideAddLeaveModal();
    });
}

// 載入工時資料
async function loadTimesheetData() {
    const emp = document.getElementById('employee').value;
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    
    if (!emp) {
        showEmpty('tableBody', 'person_off', '請選擇員工', '請從上方下拉選單選擇一位員工以載入工時資料。');
        return;
    }
    
    showLoading('tableBody');
    document.getElementById('monthInfo').style.display = 'none';
    
    try {
        // 並行載入
        const [holidays, clients, timesheetData] = await Promise.all([
            apiRequest(`/api/holidays?year=${year}`),
            apiRequest(`/api/clients?employee=${encodeURIComponent(emp)}`),
            apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(emp)}&year=${year}&month=${month}`)
        ]);

        holidaysCache = holidays.data || [];
        clientsCache = clients.data || [];

        // 更新月份資訊
        document.getElementById('monthTitle').textContent = `${year}年${month}月 - ${emp}`;
        document.getElementById('monthInfo').style.display = 'flex';

        currentData.workEntries = timesheetData.workEntries || [];
        currentData.leaveEntries = timesheetData.leaveEntries || [];
        hasChanges = false;
        
        generateTable(year, month);
        
    } catch (error) {
        handleApiError(error, '載入工時資料');
        showError('tableBody', `無法載入工時資料: ${error.message}`);
    }
}

function generateTable(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    generateTableHeader(year, month, daysInMonth);
    generateTableBody(year, month, daysInMonth);
}


// ... (The rest of the functions: generateTableHeader, generateTableBody, updateCellValue, saveTimesheet, etc.)
// ... The logic from the old <script> block will be pasted here, but refactored to use 
// ... global functions like apiRequest, showNotification, handleApiError, etc.
// ... For brevity, I will only show the key refactored functions.

function generateTableHeader(year, month, daysInMonth) {
    const tableHead = document.getElementById('tableHead');
    let headerRow1 = '<tr><th>客戶名稱</th><th>業務類型</th><th>工時類型</th>';
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isHol = holidaysCache.includes(dateStr);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isWe = dayOfWeek === 0 || dayOfWeek === 6;
        const className = isHol ? 'holiday' : (isWe ? 'weekend' : '');
        headerRow1 += `<th class="day-cell ${className}">${day}</th>`;
    }
    headerRow1 += '<th class="total-cell">月總計</th></tr>';

    let headerRow2 = '<tr><th></th><th></th><th></th>';
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        headerRow2 += `<th class="day-cell">${'週' + weekdays[dayOfWeek]}</th>`;
    }
    headerRow2 += '<th class="total-cell">小時</th></tr>';
    tableHead.innerHTML = headerRow1 + headerRow2;
}

function generateTableBody(year, month, daysInMonth) {
    const tableBody = document.getElementById('tableBody');
    const allEntries = [
        ...currentData.workEntries.map((e, i) => ({ ...e, type: 'work', index: i })),
        ...currentData.leaveEntries.map((e, i) => ({ ...e, type: 'leave', index: i, clientName: '-', businessType: '-', workType: e.leaveType }))
    ];
    
    if (allEntries.length === 0) {
        showEmpty('tableBody', 'event_busy', '本月尚無記錄', '請點選上方按鈕新增工時或請假記錄。');
        document.getElementById('totalHours').textContent = '0';
        return;
    }
    
    let totalAllHours = 0;
    tableBody.innerHTML = ''; // Clear previous content

    allEntries.forEach((entry, rowIndex) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="cell-content">
                    <span>${escapeHtml(entry.clientName)}</span>
                    <button class="delete-row-btn" onclick="deleteEntry('${entry.type}', ${entry.index})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
            <td>${escapeHtml(entry.businessType)}</td>
            <td>${escapeHtml(entry.workType)}</td>
        `;
        
        let rowTotal = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const hours = entry.hours[day] || '';
            const td = document.createElement('td');
            td.className = 'day-cell editable';
            td.innerHTML = `<input type="text" inputmode="decimal" value="${hours}" placeholder="">`;
            td.querySelector('input').addEventListener('input', (e) => {
                updateCellValue(entry.type, entry.index, day, e.target.value);
            });
            tr.appendChild(td);
            if (hours) rowTotal += parseFloat(hours);
        }

        const totalCell = document.createElement('td');
        totalCell.className = 'total-cell';
        totalCell.textContent = rowTotal.toFixed(1);
        totalCell.id = `total-${entry.type}-${entry.index}`;
        tr.appendChild(totalCell);
        
        tableBody.appendChild(tr);
        totalAllHours += rowTotal;
    });

    document.getElementById('totalHours').textContent = totalAllHours.toFixed(1);
    // Add daily total row
    addDailyTotalRow(daysInMonth);
}


function addDailyTotalRow(daysInMonth) {
    const tableBody = document.getElementById('tableBody');
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = '<td colspan="3" style="font-weight: 700; text-align: right;">每日總計</td>';
    
    let grandTotal = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        let dayTotal = 0;
        currentData.workEntries.forEach(entry => {
            dayTotal += parseFloat(entry.hours[day]) || 0;
        });
        currentData.leaveEntries.forEach(entry => {
            dayTotal += parseFloat(entry.hours[day]) || 0;
        });
        
        const td = document.createElement('td');
        td.className = 'day-cell total-cell';
        td.textContent = dayTotal > 0 ? dayTotal.toFixed(1) : '';
        totalRow.appendChild(td);
        grandTotal += dayTotal;
    }
    
    const totalCell = document.createElement('td');
    totalCell.className = 'total-cell';
    totalCell.textContent = grandTotal.toFixed(1);
    totalRow.appendChild(totalCell);
    
    tableBody.appendChild(totalRow);
}

function updateCellValue(type, index, day, value) {
    hasChanges = true;
    const numValue = parseFloat(value) || 0;
    
    if (type === 'work') {
        if (!currentData.workEntries[index].hours) {
            currentData.workEntries[index].hours = {};
        }
        if (value === '' || numValue === 0) {
            delete currentData.workEntries[index].hours[day];
        } else {
            currentData.workEntries[index].hours[day] = numValue;
        }
    } else if (type === 'leave') {
        if (!currentData.leaveEntries[index].hours) {
            currentData.leaveEntries[index].hours = {};
        }
        if (value === '' || numValue === 0) {
            delete currentData.leaveEntries[index].hours[day];
        } else {
            currentData.leaveEntries[index].hours[day] = numValue;
        }
    }
    
    // 更新行總計
    let rowTotal = 0;
    const entry = type === 'work' ? currentData.workEntries[index] : currentData.leaveEntries[index];
    Object.values(entry.hours || {}).forEach(h => rowTotal += parseFloat(h) || 0);
    
    const totalCell = document.getElementById(`total-${type}-${index}`);
    if (totalCell) {
        totalCell.textContent = rowTotal.toFixed(1);
    }
    
    // 更新總工時
    let totalAllHours = 0;
    [...currentData.workEntries, ...currentData.leaveEntries].forEach(e => {
        Object.values(e.hours || {}).forEach(h => totalAllHours += parseFloat(h) || 0);
    });
    document.getElementById('totalHours').textContent = totalAllHours.toFixed(1);
}

function showAddWorkModal() {
    const emp = document.getElementById('employee').value;
    if (!emp) {
        showNotification('請先選擇員工', 'error');
        return;
    }
    
    // 填充下拉選單
    const clientSelect = document.getElementById('workClient');
    clientSelect.innerHTML = '<option value="">請選擇客戶</option>';
    clientsCache.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        clientSelect.appendChild(option);
    });
    
    const businessTypeSelect = document.getElementById('workBusinessType');
    businessTypeSelect.innerHTML = '<option value="">請選擇類型</option>';
    businessTypesCache.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        businessTypeSelect.appendChild(option);
    });
    
    const workTypeSelect = document.getElementById('workType');
    workTypeSelect.innerHTML = '<option value="">請選擇工時類型</option>';
    workTypesCache.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        workTypeSelect.appendChild(option);
    });
    
    document.getElementById('addWorkModal').style.display = 'flex';
}

function hideAddWorkModal() {
    document.getElementById('addWorkModal').style.display = 'none';
    document.getElementById('workClient').value = '';
    document.getElementById('workBusinessType').value = '';
    document.getElementById('workType').value = '';
}

function showAddLeaveModal() {
    const emp = document.getElementById('employee').value;
    if (!emp) {
        showNotification('請先選擇員工', 'error');
        return;
    }
    
    const leaveTypeSelect = document.getElementById('leaveType');
    leaveTypeSelect.innerHTML = '<option value="">請選擇假別</option>';
    leaveTypesCache.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        leaveTypeSelect.appendChild(option);
    });
    
    document.getElementById('addLeaveModal').style.display = 'flex';
}

function hideAddLeaveModal() {
    document.getElementById('addLeaveModal').style.display = 'none';
    document.getElementById('leaveType').value = '';
}

function confirmAddWork() {
    const client = document.getElementById('workClient').value;
    const businessType = document.getElementById('workBusinessType').value;
    const workType = document.getElementById('workType').value;
    
    if (!client || !businessType || !workType) {
        showNotification('請填寫所有必填欄位', 'error');
        return;
    }
    
    // 檢查是否重複
    const exists = currentData.workEntries.find(e => 
        e.clientName === client && e.businessType === businessType && e.workType === workType
    );
    if (exists) {
        showNotification('此記錄已存在', 'error');
        return;
    }
    
    currentData.workEntries.push({
        clientName: client,
        businessType: businessType,
        workType: workType,
        hours: {}
    });
    
    hasChanges = true;
    hideAddWorkModal();
    
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    generateTable(year, month);
    
    showNotification('工時記錄已新增', 'success');
}

function confirmAddLeave() {
    const leaveType = document.getElementById('leaveType').value;
    
    if (!leaveType) {
        showNotification('請選擇假別', 'error');
        return;
    }
    
    // 檢查是否重複
    const exists = currentData.leaveEntries.find(e => e.leaveType === leaveType);
    if (exists) {
        showNotification('此假別已存在', 'error');
        return;
    }
    
    currentData.leaveEntries.push({
        leaveType: leaveType,
        hours: {}
    });
    
    hasChanges = true;
    hideAddLeaveModal();
    
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    generateTable(year, month);
    
    showNotification('請假記錄已新增', 'success');
}

async function deleteEntry(type, index) {
    if (!await confirmDialog('確定要刪除此記錄嗎？')) {
        return;
    }
    
    if (type === 'work') {
        currentData.workEntries.splice(index, 1);
    } else if (type === 'leave') {
        currentData.leaveEntries.splice(index, 1);
    }
    
    hasChanges = true;
    
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    generateTable(year, month);
    
    showNotification('記錄已刪除', 'success');
}

async function saveTimesheet() {
    if (!hasChanges) {
        showNotification('沒有變更需要儲存', 'info');
        return;
    }
    if (!await confirmDialog('確定要儲存本月的工時記錄嗎？')) return;

    const emp = document.getElementById('employee').value;
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    
    showNotification('正在儲存...', 'info');

    try {
        const payload = {
            employee: emp,
            year: year,
            month: month,
            workEntries: currentData.workEntries,
            leaveEntries: currentData.leaveEntries
        };
        
        await apiRequest('/api/save-timesheet', { method: 'POST', body: payload });
        
        showNotification('工時記錄已成功儲存', 'success');
        hasChanges = false;
        setTimeout(loadTimesheetData, 1000); // Reload data after save
        
    } catch (error) {
        handleApiError(error, '儲存工時表');
    }
}


