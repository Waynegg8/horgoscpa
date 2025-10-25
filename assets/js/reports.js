/*
 * Reports Page - 報表分析頁面功能
 * 包含工時分析、請假總覽、樞紐分析報表
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let employeesCache = [];

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
        employeesCache = employees || [];
        
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
        const response = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(employee)}&year=${year}&month=${month}`);
        
        // 從 API 回應中提取工時記錄
        const data = [];
        if (response.workEntries && Array.isArray(response.workEntries)) {
            response.workEntries.forEach(entry => {
                for (const day in entry.hours) {
                    if (entry.hours[day] > 0) {
                        data.push({
                            client_name: entry.clientName,
                            business_type: entry.businessType,
                            work_type: entry.workType,
                            normal_hours: entry.workType === '正常工時' ? entry.hours[day] : 0,
                            weighted_hours: entry.hours[day] // 簡化處理
                        });
                    }
                }
            });
        }
        
        if (!data || data.length === 0) {
            showEmpty('workAnalysisResult', '該期間沒有工時記錄');
            return;
        }

        // 按客戶和業務類型分組統計
        const grouped = {};
        // 另外累計每種加班類型
        const otByType = {}; // key -> { '平日1.34':x, '平日1.67':y, '休1.34':z, '休1.67':..., '例假日2':..., '國假1.34':... }
        
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

            // 累計工時（根據工時類型）
            const hours = parseFloat(record.normal_hours || 0);
            const isOvertime = record.work_type && record.work_type.includes('加班');
            
            if (isOvertime) {
                grouped[key].overtimeHours += hours;
            } else {
                grouped[key].normalHours += hours;
            }
            
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
        // 統計各種假別的使用時數
        const leaveStats = {};
        
        // 獲取該年度的每個月份
        for (let month = 1; month <= 12; month++) {
            const response = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(employee)}&year=${year}&month=${month}`);
            
            if (response.leaveEntries && Array.isArray(response.leaveEntries)) {
                response.leaveEntries.forEach(entry => {
                    const leaveType = entry.leaveType;
                    if (!leaveStats[leaveType]) {
                        leaveStats[leaveType] = 0;
                    }
                    
                    // 累計該假別的所有時數
                    for (const day in entry.hours) {
                        leaveStats[leaveType] += parseFloat(entry.hours[day] || 0);
                    }
                });
            }
        }

        // 讀取 DB 配額
        let leaveTypes = [
            { name: '特休', key: '特休', hasQuota: true },
            { name: '事假', key: '事假', hasQuota: true },
            { name: '病假', key: '病假', hasQuota: true },
            { name: '生理假', key: '生理假', hasQuota: true },
            { name: '婚假', key: '婚假', hasQuota: true },
            { name: '喪假-直系血親', key: '喪假-直系血親', hasQuota: true },
            { name: '喪假-祖父母', key: '喪假-祖父母', hasQuota: true },
            { name: '產假', key: '產假', hasQuota: true },
            { name: '陪產假', key: '陪產假', hasQuota: true }
        ];
        let quotaMap = {};
        try {
            const quotaData = await apiRequest(`/api/leave-quota?employee=${encodeURIComponent(employee)}&year=${year}`);
            (quotaData.quota || []).forEach(q => { quotaMap[q.type] = q.quota_hours || 0; });
        } catch (_) {}

        let totalUsed = 0;
        leaveTypes.forEach(type => {
            if (leaveStats[type.key]) {
                totalUsed += leaveStats[type.key];
            }
        });

        // 計算特休配額（依到職日與年資）
        function getAnnualLeaveDays(hireDateStr, y) {
            if (!hireDateStr) return 0;
            const hire = new Date(hireDateStr);
            const yearStart = new Date(parseInt(y), 0, 1);
            const yearEnd = new Date(parseInt(y), 11, 31);
            // 年初到年尾在職月數
            let months = 0;
            // 若到職當年即 y 年，按月份計算是否大於等於 6 個月 → 3 天
            if (hire.getFullYear() === parseInt(y)) {
                months = (yearEnd.getMonth() - hire.getMonth()) + 1;
                if (months >= 6) return 3; // 半年 3 天
                return 0;
            }
            // 否則用年資計算
            const seniorityYears = Math.max(0, parseInt(y) - hire.getFullYear());
            const rule = [
                { y: 0.5, d: 3 }, { y: 1, d: 7 }, { y: 2, d: 10 }, { y: 3, d: 14 },
                { y: 4, d: 14 }, { y: 5, d: 15 }, { y: 10, d: 15 }, { y: 11, d: 16 },
                { y: 12, d: 17 }, { y: 13, d: 18 }, { y: 14, d: 19 }, { y: 15, d: 20 }
            ];
            // 找到不大於年資的最大規則
            let days = 0;
            for (const r of rule) {
                if (seniorityYears >= r.y) days = r.d;
            }
            return days;
        }

        const empObj = employeesCache.find(e => e.name === employee);
        const annualLeaveHours = quotaMap['特休'] ?? (getAnnualLeaveDays(empObj?.hire_date, year) * 8);
        const usedAnnualLeaveHours = leaveStats['特休'] || 0;
        const remainingAnnualLeaveHours = Math.max(0, annualLeaveHours - usedAnnualLeaveHours);

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
                                    <th class="number">配額(時)</th>
                                    <th class="number">已使用時數</th>
                                    <th class="number">剩餘時數</th>
                                    <th class="number">已使用天數</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaveTypes.map(type => {
                                    const used = leaveStats[type.key] || 0;
                                    if (used === 0 && !type.hasQuota) return '';
                                    const quota = type.key === '特休' ? annualLeaveHours : 0;
                                    const remaining = type.key === '特休' ? remainingAnnualLeaveHours : 0;
                                    return `
                                        <tr>
                                            <td>${type.name}</td>
                                            <td class="number">${quota.toFixed(1)}</td>
                                            <td class="number">${used.toFixed(1)}</td>
                                            <td class="number">${remaining.toFixed(1)}</td>
                                            <td class="number">${(used / 8).toFixed(1)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${totalUsed > 0 ? `
                                    <tr class="total-row">
                                        <td>總計</td>
                                        <td class="number">${annualLeaveHours.toFixed(1)}</td>
                                        <td class="number">${totalUsed.toFixed(1)}</td>
                                        <td class="number">${remainingAnnualLeaveHours.toFixed(1)}</td>
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
        // 並行載入所有員工
        const employees = await apiRequest('/api/employees');
        const months = month ? [parseInt(month)] : [1,2,3,4,5,6,7,8,9,10,11,12];

        // 並行請求所有 (員工×月份) 的 timesheet
        const requests = [];
        for (const emp of employees) {
            for (const m of months) {
                requests.push(apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(emp.name)}&year=${year}&month=${m}`).then(res => ({ res, emp })));
            }
        }

        const grouped = {};

        const responses = await Promise.all(requests);
        for (const { res: response, emp } of responses) {
            // 工時
            (response.workEntries || []).forEach(entry => {
                let key = '';
                switch (groupBy) {
                    case 'employee': key = emp.name; break;
                    case 'client': key = entry.clientName || '未分類'; break;
                    case 'business_type': key = entry.businessType || '未分類'; break;
                }
                if (!grouped[key]) grouped[key] = { name: key, normalHours: 0, overtimeHours: 0, weightedHours: 0, leaveHours: 0 };
                for (const day in entry.hours) {
                    const hours = parseFloat(entry.hours[day] || 0);
                    const wt = entry.workType || '';
                    const isOT = wt.includes('加班');
                    if (isOT) grouped[key].overtimeHours += hours; else grouped[key].normalHours += hours;
                    // 加權工時：根據類型估算倍率
                    let multiplier = 1;
                    if (wt.includes('1.34')) multiplier = 1.34;
                    else if (wt.includes('1.67')) multiplier = 1.67;
                    else if (wt.includes('2.67')) multiplier = 2.67;
                    else if (wt.includes('加班(2)')) multiplier = 2;
                    grouped[key].weightedHours += hours * multiplier;

                    // 類型分類統計
                    const mapKey = (() => {
                        if (wt.includes('平日加班(1.34)')) return '平日1.34';
                        if (wt.includes('平日加班(1.67)')) return '平日1.67';
                        if (wt.includes('休息日加班(1.34)')) return '休1.34';
                        if (wt.includes('休息日加班(1.67)')) return '休1.67';
                        if (wt.includes('休息日加班(2.67)')) return '休2.67';
                        if (wt.includes('例假日加班(2)')) return '例2.0';
                        if (wt.includes('例假日加班')) return '例1.0';
                        if (wt.includes('國定假日加班(1.34)')) return '國1.34';
                        if (wt.includes('國定假日加班(1.67)')) return '國1.67';
                        if (wt.includes('國定假日加班')) return '國1.0';
                        return '';
                    })();
                    if (mapKey) {
                        if (!otByType[key]) otByType[key] = {};
                        otByType[key][mapKey] = (otByType[key][mapKey] || 0) + hours;
                    }
                }
            });

            // 請假
            (response.leaveEntries || []).forEach(entry => {
                let key = groupBy === 'employee' ? emp.name : '請假';
                if (!grouped[key]) grouped[key] = { name: key, normalHours: 0, overtimeHours: 0, weightedHours: 0, leaveHours: 0 };
                for (const day in entry.hours) grouped[key].leaveHours += parseFloat(entry.hours[day] || 0);
            });
        }

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
                                    <th class="number">平日1.34</th>
                                    <th class="number">平日1.67</th>
                                    <th class="number">休1.34</th>
                                    <th class="number">休1.67</th>
                                    <th class="number">休2.67</th>
                                    <th class="number">例2.0</th>
                                    <th class="number">國1.34</th>
                                    <th class="number">國1.67</th>
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
                                        <td class="number">${(otByType[item.name]?.['平日1.34']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['平日1.67']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['休1.34']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['休1.67']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['休2.67']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['例2.0']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['國1.34']||0).toFixed(2)}</td>
                                        <td class="number">${(otByType[item.name]?.['國1.67']||0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td>總計</td>
                                    <td class="number">${totals.normalHours.toFixed(2)}</td>
                                    <td class="number">${totals.overtimeHours.toFixed(2)}</td>
                                    <td class="number">${totals.weightedHours.toFixed(2)}</td>
                                    <td class="number">${totals.leaveHours.toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['平日1.34']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['平日1.67']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['休1.34']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['休1.67']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['休2.67']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['例2.0']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['國1.34']||0),0).toFixed(2)}</td>
                                    <td class="number">${results.reduce((s,i)=>s+(otByType[i.name]?.['國1.67']||0),0).toFixed(2)}</td>
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

