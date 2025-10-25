/*
 * Reports Page - 報表分析頁面功能
 * 包含工時分析、請假總覽、樞紐分析報表
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initTabs();
    initMobileMenu();
    await loadEmployees();
    populateYearOptions();
});

// =========================================
// 認證管理
// =========================================
async function initAuth() {
    const token = localStorage.getItem('session_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await apiRequest('/api/auth/me');
        currentUser = response.user;
        updateUserInfo(currentUser);
    } catch (error) {
        console.error('驗證錯誤:', error);
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('session_token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const response = await fetch(`${API_BASE}${url}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('session_token');
            window.location.href = 'login.html';
            throw new Error('未授權');
        }
        const error = await response.json();
        throw new Error(error.error || '請求失敗');
    }

    return await response.json();
}

function updateUserInfo(user) {
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '管理員' : '員工';
}

// 登出
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('登出錯誤:', error);
    }
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
});

// =========================================
// 標籤頁管理
// =========================================
function initTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// =========================================
// 移動端選單
// =========================================
function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// =========================================
// 初始化資料
// =========================================
async function loadEmployees() {
    try {
        const employees = await apiRequest('/api/employees');
        
        // 填充工時分析的員工下拉選單
        const workAnalysisSelect = document.getElementById('workAnalysisEmployee');
        workAnalysisSelect.innerHTML = '<option value="">請選擇員工</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            workAnalysisSelect.appendChild(option);
        });

        // 填充請假總覽的員工下拉選單
        const leaveOverviewSelect = document.getElementById('leaveOverviewEmployee');
        leaveOverviewSelect.innerHTML = '<option value="">請選擇員工</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            leaveOverviewSelect.appendChild(option);
        });

        // 如果是一般員工，自動選擇自己
        if (currentUser.role === 'employee' && currentUser.employee_name) {
            workAnalysisSelect.value = currentUser.employee_name;
            leaveOverviewSelect.value = currentUser.employee_name;
            // 禁用選單（員工只能看自己的報表）
            workAnalysisSelect.disabled = true;
            leaveOverviewSelect.disabled = true;
        }
    } catch (error) {
        console.error('載入員工列表失敗:', error);
    }
}

function populateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
        years.push(i);
    }

    // 工時分析年度
    const workYearSelect = document.getElementById('workAnalysisYear');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year} 年`;
        workYearSelect.appendChild(option);
    });
    workYearSelect.value = currentYear;

    // 請假總覽年度
    const leaveYearSelect = document.getElementById('leaveOverviewYear');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year} 年`;
        leaveYearSelect.appendChild(option);
    });
    leaveYearSelect.value = currentYear;

    // 樞紐分析年度
    const pivotYearSelect = document.getElementById('pivotYear');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year} 年`;
        pivotYearSelect.appendChild(option);
    });
    pivotYearSelect.value = currentYear;

    // 設定當前月份
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('workAnalysisMonth').value = currentMonth;
}

// =========================================
// 工具函數
// =========================================
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>載入中...</div>';
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <h3>錯誤</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function showEmpty(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">info</span>
                <h3>無資料</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// =========================================
// 工時分析報表
// =========================================
async function generateWorkAnalysis() {
    const employee = document.getElementById('workAnalysisEmployee').value;
    const year = document.getElementById('workAnalysisYear').value;
    const month = document.getElementById('workAnalysisMonth').value;

    if (!employee || !year || !month) {
        alert('請選擇員工、年度和月份');
        return;
    }

    showLoading('workAnalysisResult');

    try {
        // 獲取該員工該月的工時資料
        const data = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(employee)}&year=${year}&month=${month}`);
        
        if (!data || data.length === 0) {
            showEmpty('workAnalysisResult', '該期間沒有工時記錄');
            return;
        }

        // 按客戶和業務類型分組統計
        const grouped = {};
        
        data.forEach(record => {
            if (!record.client_name) return;
            
            const key = `${record.client_name}|${record.business_type || '未分類'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    client: record.client_name,
                    businessType: record.business_type || '未分類',
                    normalHours: 0,
                    overtimeHours: 0,
                    weightedHours: 0
                };
            }

            // 累計正常工時
            grouped[key].normalHours += parseFloat(record.normal_hours || 0);
            
            // 累計加班工時（所有加班類型）
            grouped[key].overtimeHours += 
                parseFloat(record.weekday_ot_134 || 0) +
                parseFloat(record.weekday_ot_167 || 0) +
                parseFloat(record.restday_ot_134 || 0) +
                parseFloat(record.restday_ot_167 || 0) +
                parseFloat(record.restday_ot_267 || 0) +
                parseFloat(record.exception_ot_1 || 0) +
                parseFloat(record.exception_ot_2 || 0) +
                parseFloat(record.holiday_ot_1 || 0) +
                parseFloat(record.holiday_ot_134 || 0) +
                parseFloat(record.holiday_ot_167 || 0);

            // 累計加權工時
            grouped[key].weightedHours += parseFloat(record.weighted_hours || 0);
        });

        const results = Object.values(grouped);
        
        if (results.length === 0) {
            showEmpty('workAnalysisResult', '該期間沒有工時記錄');
            return;
        }

        // 計算總計
        const totals = results.reduce((acc, item) => ({
            normalHours: acc.normalHours + item.normalHours,
            overtimeHours: acc.overtimeHours + item.overtimeHours,
            weightedHours: acc.weightedHours + item.weightedHours
        }), { normalHours: 0, overtimeHours: 0, weightedHours: 0 });

        // 生成報表 HTML
        const html = `
            <div class="report-content">
                <div class="report-header">
                    <h2>${year} 年 ${month} 月 工時分析報表</h2>
                    <p class="subtitle">員工：${employee}</p>
                </div>
                <div class="report-body">
                    <div class="report-summary">
                        <div class="summary-card">
                            <div class="label">正常工時</div>
                            <div class="value">${totals.normalHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">加班工時</div>
                            <div class="value">${totals.overtimeHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">加權總時數</div>
                            <div class="value">${totals.weightedHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                    </div>

                    <div class="export-buttons">
                        <button class="btn btn-secondary btn-small" onclick="exportToCSV('workAnalysis')">
                            <span class="material-symbols-outlined">download</span>
                            匯出 CSV
                        </button>
                    </div>

                    <div class="table-responsive">
                        <table id="workAnalysisTable">
                            <thead>
                                <tr>
                                    <th>客戶名稱</th>
                                    <th>業務類型</th>
                                    <th class="number">正常工時</th>
                                    <th class="number">加班工時</th>
                                    <th class="number">加權總時數</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.map(item => `
                                    <tr>
                                        <td>${item.client}</td>
                                        <td>${item.businessType}</td>
                                        <td class="number">${item.normalHours.toFixed(2)}</td>
                                        <td class="number">${item.overtimeHours.toFixed(2)}</td>
                                        <td class="number">${item.weightedHours.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="2">總計</td>
                                    <td class="number">${totals.normalHours.toFixed(2)}</td>
                                    <td class="number">${totals.overtimeHours.toFixed(2)}</td>
                                    <td class="number">${totals.weightedHours.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('workAnalysisResult').innerHTML = html;
    } catch (error) {
        showError('workAnalysisResult', error.message);
    }
}

// =========================================
// 請假總覽報表
// =========================================
async function generateLeaveOverview() {
    const employee = document.getElementById('leaveOverviewEmployee').value;
    const year = document.getElementById('leaveOverviewYear').value;

    if (!employee || !year) {
        alert('請選擇員工和年度');
        return;
    }

    showLoading('leaveOverviewResult');

    try {
        // 獲取該員工該年的所有工時資料
        const data = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(employee)}&year=${year}`);
        
        // 統計各種假別的使用時數
        const leaveStats = {};
        
        data.forEach(record => {
            if (!record.leave_type) return;
            
            const leaveType = record.leave_type;
            if (!leaveStats[leaveType]) {
                leaveStats[leaveType] = 0;
            }
            leaveStats[leaveType] += parseFloat(record.leave_hours || 0);
        });

        // 準備報表資料
        const leaveTypes = [
            { name: '特休', key: '特休', hasQuota: true },
            { name: '加班補休', key: '加班補休', hasQuota: false },
            { name: '事假', key: '事假', hasQuota: false },
            { name: '病假', key: '病假', hasQuota: true },
            { name: '生理假', key: '生理假', hasQuota: false },
            { name: '婚假', key: '婚假', hasQuota: true },
            { name: '喪假-直系血親', key: '喪假-直系血親', hasQuota: true },
            { name: '喪假-祖父母', key: '喪假-祖父母', hasQuota: true },
            { name: '產假', key: '產假', hasQuota: true },
            { name: '陪產假', key: '陪產假', hasQuota: true }
        ];

        let totalUsed = 0;
        leaveTypes.forEach(type => {
            if (leaveStats[type.key]) {
                totalUsed += leaveStats[type.key];
            }
        });

        // 生成報表 HTML
        const html = `
            <div class="report-content">
                <div class="report-header">
                    <h2>${year} 年 請假狀況總覽</h2>
                    <p class="subtitle">員工：${employee}</p>
                </div>
                <div class="report-body">
                    <div class="report-summary">
                        <div class="summary-card">
                            <div class="label">總請假時數</div>
                            <div class="value">${totalUsed.toFixed(1)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">總請假天數</div>
                            <div class="value">${(totalUsed / 8).toFixed(1)}<span class="unit">天</span></div>
                        </div>
                    </div>

                    <div class="export-buttons">
                        <button class="btn btn-secondary btn-small" onclick="exportToCSV('leaveOverview')">
                            <span class="material-symbols-outlined">download</span>
                            匯出 CSV
                        </button>
                    </div>

                    <div class="table-responsive">
                        <table id="leaveOverviewTable">
                            <thead>
                                <tr>
                                    <th>假別類型</th>
                                    <th class="number">已使用時數</th>
                                    <th class="number">已使用天數</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaveTypes.map(type => {
                                    const used = leaveStats[type.key] || 0;
                                    if (used === 0 && !type.hasQuota) return '';
                                    return `
                                        <tr>
                                            <td>${type.name}</td>
                                            <td class="number">${used.toFixed(1)}</td>
                                            <td class="number">${(used / 8).toFixed(1)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${totalUsed > 0 ? `
                                    <tr class="total-row">
                                        <td>總計</td>
                                        <td class="number">${totalUsed.toFixed(1)}</td>
                                        <td class="number">${(totalUsed / 8).toFixed(1)}</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('leaveOverviewResult').innerHTML = html;
    } catch (error) {
        showError('leaveOverviewResult', error.message);
    }
}

// =========================================
// 樞紐分析報表
// =========================================
async function generatePivotAnalysis() {
    const year = document.getElementById('pivotYear').value;
    const month = document.getElementById('pivotMonth').value;
    const groupBy = document.getElementById('pivotGroupBy').value;

    if (!year) {
        alert('請選擇年度');
        return;
    }

    showLoading('pivotAnalysisResult');

    try {
        let url = `/api/timesheet-data?year=${year}`;
        if (month) {
            url += `&month=${month}`;
        }

        const data = await apiRequest(url);
        
        if (!data || data.length === 0) {
            showEmpty('pivotAnalysisResult', '該期間沒有工時記錄');
            return;
        }

        // 根據分組方式統計
        const grouped = {};
        
        data.forEach(record => {
            let key = '';
            switch (groupBy) {
                case 'employee':
                    key = record.employee_name || '未知';
                    break;
                case 'client':
                    key = record.client_name || '未分類';
                    break;
                case 'business_type':
                    key = record.business_type || '未分類';
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = {
                    name: key,
                    normalHours: 0,
                    overtimeHours: 0,
                    weightedHours: 0,
                    leaveHours: 0
                };
            }

            grouped[key].normalHours += parseFloat(record.normal_hours || 0);
            grouped[key].overtimeHours += 
                parseFloat(record.weekday_ot_134 || 0) +
                parseFloat(record.weekday_ot_167 || 0) +
                parseFloat(record.restday_ot_134 || 0) +
                parseFloat(record.restday_ot_167 || 0) +
                parseFloat(record.restday_ot_267 || 0) +
                parseFloat(record.exception_ot_1 || 0) +
                parseFloat(record.exception_ot_2 || 0) +
                parseFloat(record.holiday_ot_1 || 0) +
                parseFloat(record.holiday_ot_134 || 0) +
                parseFloat(record.holiday_ot_167 || 0);
            grouped[key].weightedHours += parseFloat(record.weighted_hours || 0);
            grouped[key].leaveHours += parseFloat(record.leave_hours || 0);
        });

        const results = Object.values(grouped).sort((a, b) => 
            b.weightedHours - a.weightedHours
        );

        // 計算總計
        const totals = results.reduce((acc, item) => ({
            normalHours: acc.normalHours + item.normalHours,
            overtimeHours: acc.overtimeHours + item.overtimeHours,
            weightedHours: acc.weightedHours + item.weightedHours,
            leaveHours: acc.leaveHours + item.leaveHours
        }), { normalHours: 0, overtimeHours: 0, weightedHours: 0, leaveHours: 0 });

        const groupByText = {
            'employee': '員工',
            'client': '客戶',
            'business_type': '業務類型'
        };

        const periodText = month ? `${year} 年 ${month} 月` : `${year} 年`;

        // 生成報表 HTML
        const html = `
            <div class="report-content">
                <div class="report-header">
                    <h2>${periodText} 樞紐分析報表</h2>
                    <p class="subtitle">分組方式：${groupByText[groupBy]}</p>
                </div>
                <div class="report-body">
                    <div class="report-summary">
                        <div class="summary-card">
                            <div class="label">正常工時</div>
                            <div class="value">${totals.normalHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">加班工時</div>
                            <div class="value">${totals.overtimeHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">加權總時數</div>
                            <div class="value">${totals.weightedHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                        <div class="summary-card">
                            <div class="label">請假時數</div>
                            <div class="value">${totals.leaveHours.toFixed(2)}<span class="unit">小時</span></div>
                        </div>
                    </div>

                    <div class="export-buttons">
                        <button class="btn btn-secondary btn-small" onclick="exportToCSV('pivotAnalysis')">
                            <span class="material-symbols-outlined">download</span>
                            匯出 CSV
                        </button>
                    </div>

                    <div class="table-responsive">
                        <table id="pivotAnalysisTable">
                            <thead>
                                <tr>
                                    <th>${groupByText[groupBy]}</th>
                                    <th class="number">正常工時</th>
                                    <th class="number">加班工時</th>
                                    <th class="number">加權總時數</th>
                                    <th class="number">請假時數</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td class="number">${item.normalHours.toFixed(2)}</td>
                                        <td class="number">${item.overtimeHours.toFixed(2)}</td>
                                        <td class="number">${item.weightedHours.toFixed(2)}</td>
                                        <td class="number">${item.leaveHours.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td>總計</td>
                                    <td class="number">${totals.normalHours.toFixed(2)}</td>
                                    <td class="number">${totals.overtimeHours.toFixed(2)}</td>
                                    <td class="number">${totals.weightedHours.toFixed(2)}</td>
                                    <td class="number">${totals.leaveHours.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pivotAnalysisResult').innerHTML = html;
    } catch (error) {
        showError('pivotAnalysisResult', error.message);
    }
}

// =========================================
// 匯出 CSV 功能
// =========================================
function exportToCSV(reportType) {
    let table, filename;
    
    switch (reportType) {
        case 'workAnalysis':
            table = document.getElementById('workAnalysisTable');
            filename = '工時分析報表.csv';
            break;
        case 'leaveOverview':
            table = document.getElementById('leaveOverviewTable');
            filename = '請假總覽報表.csv';
            break;
        case 'pivotAnalysis':
            table = document.getElementById('pivotAnalysisTable');
            filename = '樞紐分析報表.csv';
            break;
        default:
            return;
    }

    if (!table) {
        alert('無法匯出：找不到報表資料');
        return;
    }

    let csv = '';
    
    // 加入 BOM 以支援中文
    csv = '\ufeff';
    
    // 處理表頭
    const headers = table.querySelectorAll('thead th');
    const headerRow = Array.from(headers).map(th => `"${th.textContent}"`).join(',');
    csv += headerRow + '\n';
    
    // 處理資料行
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(td => `"${td.textContent}"`).join(',');
        csv += rowData + '\n';
    });
    
    // 建立下載連結
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

