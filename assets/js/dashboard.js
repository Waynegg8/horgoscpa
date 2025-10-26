/**
 * 工作台（Dashboard）
 * 顯示待辦任務、本週工時及團隊進度（管理員）
 */

// 使用共用模組的全局變量
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 使用統一的初始化函數
    await initPage(async () => {
        currentUser = window.currentUser; // 從 auth-common.js 獲取
        updateDashboardGreeting();
        updateDashboardView();
        await loadDashboardData();
    });
});

// 更新問候語
function updateDashboardGreeting() {
    if (!currentUser) return;
    
    const displayName = currentUser.employee_name || currentUser.username;
    const hour = new Date().getHours();
    let greeting = '早安';
    if (hour >= 12 && hour < 18) greeting = '午安';
    else if (hour >= 18) greeting = '晚安';
    
    const greetingEl = document.getElementById('greetingUser');
    if (greetingEl) {
        greetingEl.textContent = `${greeting}，${displayName}`;
    }
}

// 根據角色顯示不同視圖
function updateDashboardView() {
    if (!currentUser) return;
    
    if (currentUser.role === 'admin') {
        document.getElementById('adminView').style.display = 'block';
        document.getElementById('employeeView').style.display = 'none';
    } else {
        document.getElementById('employeeView').style.display = 'block';
        document.getElementById('adminView').style.display = 'none';
    }
}

function updateGreeting() {
    const today = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    document.getElementById('todayDate').textContent = 
        `${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()} ${weekdays[today.getDay()]}`;
}

async function loadDashboardData() {
    if (currentUser && currentUser.role === 'admin') {
        // 管理員：載入團隊進度和全體工時
        await Promise.all([
            loadTeamProgress(),
            loadAdminWeeklyStats(),
            loadWorkloadBalance()  // 新增：工作量平衡視圖
        ]);
    } else {
        // 員工：載入個人待辦任務和工時
        await Promise.all([
            loadPendingTasks(),
            loadWeeklyStats(),
            loadAnnualLeave(),     // 新增：年假餘額
            loadReminders()        // 新增：提醒系統
        ]);
    }
}

async function loadPendingTasks() {
    const container = document.getElementById('tasksList');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 載入所有類型的未完成任務
        const [recurringRes, multiStageRes] = await Promise.all([
            apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`).catch(() => ({ tasks: [] })),
            apiRequest(`/api/tasks/multi-stage?status!=completed`).catch(() => ({ tasks: [] }))
        ]);
        
        const allTasks = [];
        
        // 處理週期任務（只顯示員工自己的）
        const recurringTasks = (recurringRes.tasks || []).filter(task => 
            task.status !== 'completed' && 
            (!task.assigned_to || task.assigned_to === currentUser.employee_name)
        );
        
        recurringTasks.forEach(task => {
            allTasks.push({
                id: task.id,
                title: task.task_name || '未命名任務',
                type: 'recurring',
                category: task.category || '其他',
                client: task.client_name,
                status: task.status || 'pending',
                dueDate: task.due_date,
                assignedTo: task.assigned_to
            });
        });
        
        // 處理多階段任務（工商、財稅）- 只顯示員工自己的
        const multiStageTasks = (multiStageRes.tasks || []).filter(task =>
            task.status !== 'completed' &&
            (!task.assigned_to || task.assigned_to === currentUser.employee_name)
        );
        
        multiStageTasks.forEach(task => {
            const category = task.template_name || '其他';
            allTasks.push({
                id: task.id,
                title: task.task_name || task.client_name || '未命名任務',
                type: 'multistage',
                category: category,
                client: task.client_name,
                status: task.status || 'not_started',
                dueDate: task.due_date,
                assignedTo: task.assigned_to,
                currentStage: task.current_stage
            });
        });
        
        // 按優先級和到期日期排序
        allTasks.sort((a, b) => {
            const aOverdue = a.dueDate && isPastDue(a.dueDate);
            const bOverdue = b.dueDate && isPastDue(b.dueDate);
            
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return 0;
        });
        
        if (allTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">task_alt</span>
                    <p style="font-weight: 600; font-size: 18px; margin: 10px 0;">沒有待辦任務</p>
                    <p style="font-size: 14px;">所有工作都已完成！</p>
                </div>
            `;
            return;
        }
        
        // 動態附加 SOP 連結（以任務分類作為關鍵字），失敗時略過
        await attachSopLinks(allTasks).catch(() => {});
        container.innerHTML = allTasks.map(task => renderTaskItem(task)).join('');
    } catch (error) {
        console.error('載入任務失敗:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error_outline</span>
                <p style="font-weight: 600; font-size: 18px; margin: 10px 0; color: #f44336;">載入失敗</p>
            </div>
        `;
    }
}

async function loadWeeklyStats() {
    const container = document.getElementById('weeklyStats');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 員工：只顯示自己的工時
        const employeeName = currentUser.employee_name;
        if (employeeName) {
            const data = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(employeeName)}&year=${year}&month=${month}`);
            const workEntries = data.workEntries || [];
            const leaveEntries = data.leaveEntries || [];
            
            let totalHours = 0;
            workEntries.forEach(entry => {
                Object.values(entry.hours || {}).forEach(h => totalHours += parseFloat(h) || 0);
            });
            
            let leaveHours = 0;
            leaveEntries.forEach(entry => {
                Object.values(entry.hours || {}).forEach(h => leaveHours += parseFloat(h) || 0);
            });
            
            // 更新統計卡片
            document.getElementById('weeklyHours').textContent = totalHours.toFixed(1) + ' 小時';
            document.getElementById('overtimeHours').textContent = '0';  // 可以進一步計算加班工時
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalHours.toFixed(1)}</div>
                        <div class="stat-label">本月工時</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${leaveHours.toFixed(1)}</div>
                        <div class="stat-label">請假時數</div>
                    </div>
                </div>
            `;
            
            // 繪製工時趨勢圖
            drawWeeklyHoursChart(workEntries, year, month);
        } else {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center;">無員工資料</div>';
        }
    } catch (error) {
        console.error('載入工時統計失敗:', error);
        container.innerHTML = '<div style="color: #f44336; text-align: center;">載入失敗</div>';
    }
}

/**
 * 繪製本週工時趨勢圖
 */
function drawWeeklyHoursChart(workEntries, year, month) {
    const canvas = document.getElementById('weeklyHoursChart');
    if (!canvas) return;
    
    // 計算每日工時
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyHours = new Array(daysInMonth).fill(0);
    const labels = [];
    
    workEntries.forEach(entry => {
        Object.entries(entry.hours || {}).forEach(([day, hours]) => {
            const dayIndex = parseInt(day) - 1;
            if (dayIndex >= 0 && dayIndex < daysInMonth) {
                dailyHours[dayIndex] += parseFloat(hours) || 0;
            }
        });
    });
    
    // 只顯示最近7天
    const today = new Date();
    const currentDay = today.getDate();
    const startDay = Math.max(1, currentDay - 6);
    
    for (let i = startDay; i <= Math.min(currentDay, daysInMonth); i++) {
        labels.push(`${month}/${i}`);
    }
    
    const chartData = dailyHours.slice(startDay - 1, Math.min(currentDay, daysInMonth));
    
    // 銷毀舊圖表（如果存在）
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    // 創建新圖表
    canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '工時（小時）',
                data: chartData,
                backgroundColor: 'rgba(44, 95, 124, 0.8)',
                borderColor: 'rgba(44, 95, 124, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 2,
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

async function loadAdminWeeklyStats() {
    const container = document.getElementById('adminWeeklyStats');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 管理員：顯示所有員工的工時統計
        const employees = await apiRequest('/api/employees').catch(() => []);
        
        const statsPromises = employees.map(async (emp) => {
            try {
                const data = await apiRequest(`/api/timesheet-data?employee=${encodeURIComponent(emp.name)}&year=${year}&month=${month}`);
                const workEntries = data.workEntries || [];
                
                let empHours = 0;
                workEntries.forEach(entry => {
                    Object.values(entry.hours || {}).forEach(h => empHours += parseFloat(h) || 0);
                });
                
                return { name: emp.name, hours: empHours };
            } catch {
                return { name: emp.name, hours: 0 };
            }
        });
        
        const employeeStats = await Promise.all(statsPromises);
        employeeStats.sort((a, b) => b.hours - a.hours);
        
        // 直接顯示各員工工時
        container.innerHTML = `
            <div style="font-size: 14px;">
                <div style="font-weight: 700; margin-bottom: 16px; color: var(--text-primary); font-size: 16px;">
                    <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 6px;">groups</span>
                    各員工本月工時
                </div>
                <div style="display: grid; gap: 12px;">
                    ${employeeStats.map(emp => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: var(--light-bg); border-radius: 8px; border-left: 4px solid var(--primary-color); transition: all 0.2s;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="material-symbols-outlined" style="color: var(--primary-color);">person</span>
                                <span style="font-weight: 600; font-size: 15px;">${escapeHtml(emp.name)}</span>
                            </div>
                            <div style="font-weight: 700; font-size: 18px; color: var(--primary-color);">${emp.hours.toFixed(1)} <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">小時</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 繪製團隊工時對比圖表
        drawTeamHoursChart(employeeStats);
    } catch (error) {
        console.error('載入管理員工時統計失敗:', error);
        container.innerHTML = '<div style="color: #f44336; text-align: center;">載入失敗</div>';
    }
}

/**
 * 繪製團隊工時對比圖表
 */
function drawTeamHoursChart(employeeStats) {
    const canvas = document.getElementById('teamHoursChart');
    if (!canvas) return;
    
    const labels = employeeStats.map(emp => emp.name);
    const data = employeeStats.map(emp => emp.hours);
    
    // 銷毀舊圖表（如果存在）
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    // 創建新圖表
    canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '本月工時',
                data: data,
                backgroundColor: [
                    'rgba(44, 95, 124, 0.8)',
                    'rgba(74, 144, 226, 0.8)',
                    'rgba(90, 158, 229, 0.8)',
                    'rgba(106, 172, 233, 0.8)',
                    'rgba(122, 186, 237, 0.8)'
                ],
                borderColor: [
                    'rgba(44, 95, 124, 1)',
                    'rgba(74, 144, 226, 1)',
                    'rgba(90, 158, 229, 1)',
                    'rgba(106, 172, 233, 1)',
                    'rgba(122, 186, 237, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return `工時: ${context.parsed.y.toFixed(1)} 小時`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 20,
                        font: { size: 12 },
                        callback: function(value) {
                            return value + 'h';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 12, weight: '600' }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

async function loadTeamProgress() {
    const container = document.getElementById('teamProgress');
    
    try {
        // 獲取所有員工
        const employees = await apiRequest('/api/employees');
        
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 獲取所有任務
        const [recurringRes, multiStageRes] = await Promise.all([
            apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`).catch(() => ({ tasks: [] })),
            apiRequest(`/api/tasks/multi-stage`).catch(() => [])
        ]);
        
        const allRecurringTasks = recurringRes.tasks || [];
        // 統一處理響應格式
        const allMultiStageTasks = multiStageRes.tasks || multiStageRes.data || (Array.isArray(multiStageRes) ? multiStageRes : []);
        
        // 統計每個員工的任務進度
        const employeeProgress = employees.map(emp => {
            const empRecurringTasks = allRecurringTasks.filter(t => t.assigned_to === emp.name);
            const empMultiStageTasks = allMultiStageTasks.filter(t => t.assigned_to === emp.name);
            
            const totalTasks = empRecurringTasks.length + empMultiStageTasks.length;
            const completedTasks = empRecurringTasks.filter(t => t.status === 'completed').length +
                                   empMultiStageTasks.filter(t => t.status === 'completed').length;
            const inProgressTasks = empRecurringTasks.filter(t => t.status === 'in_progress').length +
                                    empMultiStageTasks.filter(t => t.status === 'in_progress').length;
            const pendingTasks = totalTasks - completedTasks - inProgressTasks;
            
            return {
                name: emp.name,
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks
            };
        });
        
        // 過濾出有任務的員工
        const activeEmployees = employeeProgress.filter(emp => emp.totalTasks > 0);
        
        if (activeEmployees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">group</span>
                    <p style="font-weight: 600; font-size: 18px; margin: 10px 0;">暫無團隊任務</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activeEmployees.map(emp => `
            <div class="employee-progress">
                <div class="employee-name">
                    <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">person</span>
                    ${escapeHtml(emp.name)}
                </div>
                <div class="progress-stats">
                    <div class="progress-item">
                        <span class="material-symbols-outlined" style="color: #4caf50; font-size: 18px;">check_circle</span>
                        <span>已完成：<strong>${emp.completedTasks}</strong></span>
                    </div>
                    <div class="progress-item">
                        <span class="material-symbols-outlined" style="color: #2196f3; font-size: 18px;">pending</span>
                        <span>進行中：<strong>${emp.inProgressTasks}</strong></span>
                    </div>
                    <div class="progress-item">
                        <span class="material-symbols-outlined" style="color: #ff9800; font-size: 18px;">schedule</span>
                        <span>待處理：<strong>${emp.pendingTasks}</strong></span>
                    </div>
                    <div class="progress-item" style="margin-left: auto;">
                        <span>總計：<strong>${emp.totalTasks}</strong></span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('載入團隊進度失敗:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error_outline</span>
                <p style="font-weight: 600; font-size: 18px; margin: 10px 0; color: #f44336;">載入失敗</p>
            </div>
        `;
    }
}

function renderTaskItem(task) {
    const priorityClass = task.dueDate && isPastDue(task.dueDate) ? 'high-priority' : 
                          task.status === 'in_progress' ? 'medium-priority' : '';
    
    const statusBadge = getStatusBadge(task.status);
    const dueDateText = task.dueDate ? formatDueDate(task.dueDate) : '無截止日期';
    
    return `
        <div class="task-item ${priorityClass}">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        ${task.client ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">person</span>
                                <span>${escapeHtml(task.client)}</span>
                            </div>
                        ` : ''}
                        ${task.category ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">category</span>
                                <span>${escapeHtml(task.category)}</span>
                            </div>
                        ` : ''}
                        <div class="task-meta-item">
                            <span class="material-symbols-outlined">event</span>
                            <span>${dueDateText}</span>
                        </div>
                        ${task.currentStage ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">timeline</span>
                                <span>${escapeHtml(task.currentStage)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${statusBadge}
            </div>
            
            ${task.sop || task.notes ? `
                <div class="task-info-section">
                    ${task.sop ? `
                        <div style="margin-bottom: 10px;">
                            ${task.sop.map(sop => `
                                <a href="${sop.link}" class="sop-link">
                                    <span class="material-symbols-outlined">description</span>
                                    ${escapeHtml(sop.name)}
                                </a>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${task.notes ? `
                        <div class="task-notes">
                            <div class="task-notes-title">
                                <span class="material-symbols-outlined">lightbulb</span>
                                注意事項
                            </div>
                            <div>${escapeHtml(task.notes)}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="task-actions">
                <button class="btn-task btn-details" onclick="goToTaskDetail('${task.type}', ${task.id})">
                    <span class="material-symbols-outlined">visibility</span>
                    查看詳情
                </button>
                ${task.status !== 'completed' ? `
                    <button class="btn-task btn-complete" onclick="markTaskComplete('${task.type}', ${task.id})">
                        <span class="material-symbols-outlined">check_circle</span>
                        標記完成
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function getSopForTask(type, category) {
    return null;
}

function getNotesForTask(type, category, task) {
    return null;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': { text: '待處理', class: 'status-pending' },
        'in_progress': { text: '進行中', class: 'status-in_progress' },
        'completed': { text: '已完成', class: 'status-completed' },
        'not_started': { text: '未開始', class: 'status-pending' },
        'on_hold': { text: '暫停', class: 'status-pending' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-pending' };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
    if (diffDays === 0) return '今天截止';
    if (diffDays === 1) return '明天截止';
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    
    return date.toLocaleDateString('zh-TW');
}

function isPastDue(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date < today;
}

function goToTaskDetail(type, id) {
    if (type === 'recurring') {
        window.location.href = `tasks.html?tab=recurring#task-${id}`;
    } else if (type === 'multistage') {
        window.location.href = `tasks.html?tab=all&task=${id}`;
    } else {
        window.location.href = `tasks.html?task=${id}`;
    }
}

async function markTaskComplete(type, id) {
    if (!confirm('確定要標記此任務為已完成嗎？')) {
        return;
    }
    
    try {
        const endpoint = type === 'recurring' ? `/api/tasks/recurring/${id}` : `/api/tasks/multi-stage/${id}`;
        await apiRequest(endpoint, {
            method: 'PATCH',
            body: { status: 'completed', completed_at: new Date().toISOString() }
        });
        
        // 重新載入任務列表
        await loadPendingTasks();
        
        alert('任務已標記為完成！');
    } catch (error) {
        alert('更新失敗：' + error.message);
    }
}

// escapeHtml 已在 common-utils.js 中定義，此處移除重複定義

// ==================== 新增：提醒系統 ====================

async function loadReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    
    try {
        // 傳遞當前用戶ID和只查詢未讀提醒
        const userId = currentUser?.id;
        if (!userId) return;
        
        const response = await apiRequest(`/api/reminders?user_id=${userId}&is_read=0`);
        const reminders = response.reminders || [];
        
        // 顯示未讀提醒
        const unreadReminders = reminders;
        
        if (unreadReminders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">check_circle</span>
                    <p style="margin-top: 10px;">目前沒有重要提醒</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = unreadReminders.map(reminder => {
            const priorityColors = {
                high: '#f44336',
                normal: '#ffc107',
                low: '#4caf50'
            };
            const priorityIcons = {
                high: 'error',
                normal: 'warning',
                low: 'info'
            };
            
            return `
                <div style="padding: 12px; background: #fff; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${priorityColors[reminder.priority] || priorityColors.normal}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: ${priorityColors[reminder.priority] || priorityColors.normal}; font-size: 20px;">
                            ${priorityIcons[reminder.priority] || priorityIcons.normal}
                        </span>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px; color: var(--text-primary);">
                                ${escapeHtml(reminder.message)}
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ${formatDateTime(reminder.created_at)}
                            </div>
                        </div>
                        <button onclick="markReminderAsRead(${reminder.id})" 
                                style="background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-secondary);"
                                title="標記為已讀">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('載入提醒失敗:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f44336;">
                <p>載入提醒失敗，請稍後再試</p>
            </div>
        `;
    }
}

async function markReminderAsRead(reminderId) {
    try {
        await apiRequest(`/api/reminders/${reminderId}/read`, {
            method: 'PUT'
        });
        await loadReminders(); // 重新載入
    } catch (error) {
        console.error('標記失敗:', error);
    }
}

// ==================== 新增：年假餘額 ====================

async function loadAnnualLeave() {
    try {
        const employeeName = currentUser.employee_name;
        if (!employeeName) return;
        
        const currentYear = new Date().getFullYear();
        
        // 使用報表API查詢年假資料
        const response = await apiRequest(`/api/reports/annual-leave?employee=${encodeURIComponent(employeeName)}&year=${currentYear}`);
        
        if (response && response.leave_stats) {
            // 從報表API提取年假數據
            const annualLeaveUsed = response.leave_stats['特休'] || 0;
            
            // 簡化計算：假設標準年假15天（實際應該根據年資計算）
            // TODO: 可以調用 /api/leave-quota API 獲取準確配額
            const totalDays = 15; // 暫時使用預設值
            const remainingDays = Math.max(0, totalDays - (annualLeaveUsed / 8));
            const percentage = totalDays > 0 ? (remainingDays / totalDays * 100) : 0;
            
            document.getElementById('annualLeaveRemaining').textContent = `${remainingDays.toFixed(1)} 天`;
            document.getElementById('annualLeaveTotal').textContent = `${totalDays.toFixed(1)}`;
            document.getElementById('annualLeaveProgress').style.width = `${percentage}%`;
        }
    } catch (error) {
        console.error('載入年假餘額失敗:', error);
        document.getElementById('annualLeaveRemaining').textContent = '-';
        document.getElementById('annualLeaveTotal').textContent = '-';
    }
}

// ==================== 新增：工作量平衡視圖（管理員） ====================

async function loadWorkloadBalance() {
    const container = document.getElementById('workloadBalanceList');
    if (!container) return;
    
    try {
        const response = await apiRequest('/api/workload/overview');
        const workloads = response.workloads || [];
        
        if (workloads.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>目前沒有工作量資料</p>
                </div>
            `;
            return;
        }
        
        // 找出最大工時用於比例計算
        const maxHours = Math.max(...workloads.map(w => w.remaining_hours || 0), 1);
        
        container.innerHTML = `
            <div style="display: grid; gap: 15px;">
                ${workloads.map(workload => {
                    const percentage = (workload.remaining_hours / maxHours * 100) || 0;
                    const taskCount = workload.pending_tasks || 0;
                    const hours = workload.remaining_hours || 0;
                    
                    // 根據工作量設定顏色
                    let barColor = '#4caf50'; // 綠色：輕鬆
                    if (percentage > 70) barColor = '#f44336'; // 紅色：超載
                    else if (percentage > 50) barColor = '#ffc107'; // 黃色：適中
                    
                    return `
                        <div style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span class="material-symbols-outlined" style="color: ${barColor};">person</span>
                                    <span style="font-weight: 600; font-size: 15px;">${escapeHtml(workload.employee_name)}</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 12px; color: var(--text-secondary);">${taskCount} 個任務</div>
                                    <div style="font-weight: 700; color: ${barColor};">${hours.toFixed(1)} 小時</div>
                                </div>
                            </div>
                            <div style="background: var(--light-bg); height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${barColor}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('載入工作量平衡失敗:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f44336;">
                <p>載入工作量資料失敗</p>
            </div>
        `;
    }
}

// ==================== 輔助函數 ====================

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString('zh-TW');
}
