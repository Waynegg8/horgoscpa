/**
 * 工作台（Dashboard）
 * 顯示待辦任務、本週工時及團隊進度（管理員）
 */

// 使用共用模組的全局變量（由 auth-common.js 提供 currentUser）

document.addEventListener('DOMContentLoaded', async () => {
    // 使用統一的初始化函數
    await initPage(async () => {
        // currentUser 由 auth-common.js 設定
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
            loadAdminWeeklyStats()
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
    if (!container) {
        console.warn("Dashboard task list container not found.");
        return;
    }
    
    showLoading('tasksList', '載入待辦任務...');

    try {
        if (!currentUser || !currentUser.id) {
            throw new Error("Current user not defined.");
        }

        const params = new URLSearchParams({
            status_not: 'completed',
            assigned_user_id: currentUser.id
        });
        
        const response = await apiRequest(`/api/tasks/multi-stage?${params.toString()}`);
        const allTasks = response.tasks || [];
        
        // 按優先級和到期日期排序
        allTasks.sort((a, b) => {
            const aOverdue = a.due_date && isPastDue(a.due_date);
            const bOverdue = b.due_date && isPastDue(b.due_date);
            
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            
            if (a.due_date && !b.due_date) return -1;
            if (!a.due_date && b.due_date) return 1;
            if (a.due_date && b.due_date) {
                return new Date(a.due_date) - new Date(b.due_date);
            }
            return 0;
        });

        // Update summary card
        const myTasksCountEl = document.getElementById('myTasksCount');
        const pendingTasksCountEl = document.getElementById('pendingTasksCount');
        if (myTasksCountEl) myTasksCountEl.textContent = allTasks.length;
        if (pendingTasksCountEl) {
            pendingTasksCountEl.textContent = allTasks.filter(t => t.status === 'pending').length;
        }
        
        if (allTasks.length === 0) {
            showEmpty('tasksList', 'task_alt', '沒有待辦任務', '所有工作都已完成！');
            return;
        }
        
        container.innerHTML = allTasks.map(task => renderTaskItem(task)).join('');
    } catch (error) {
        console.error('載入任務失敗:', error);
        showError('tasksList', `無法載入任務: ${error.message}`);
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
        const empRes = await apiRequest('/api/employees').catch(() => ({ data: [] }));
        const employees = empRes.data || [];
        
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
        
        // 已移除團隊工時對比圖表
    } catch (error) {
        console.error('載入管理員工時統計失敗:', error);
        container.innerHTML = '<div style="color: #f44336; text-align: center;">載入失敗</div>';
    }
}

// 已移除 drawTeamHoursChart

async function loadTeamProgress() {
    const container = document.getElementById('teamProgress');
    if (!container) return;
    
    try {
        // 獲取所有員工
        const employees = await apiRequest('/api/employees');
        
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 獲取所有任務
        const [recurringRes, multiStageRes] = await Promise.all([
            apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`).catch(() => []), // 直接返回空陣列
            apiRequest(`/api/tasks/multi-stage`).catch(() => ({ tasks: [] })) // 保持物件結構
        ]);
        
        const allRecurringTasks = recurringRes || [];
        // 統一處理響應格式，只依賴 .tasks
        const allMultiStageTasks = multiStageRes?.tasks || [];
        
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
    const priorityClass = task.due_date && isPastDue(task.due_date) ? 'high-priority' : 
                          task.status === 'in_progress' ? 'medium-priority' : '';
    
    const statusBadge = getStatusBadge(task.status); // Now uses global function
    const dueDateText = task.due_date ? formatDueDate(task.due_date) : '無截止日期';
    
    // Use CONFIG for mapping
    const categoryName = CONFIG.TASK_CATEGORY_NAMES[task.category] || task.category || '一般';

    return `
        <div class="task-item ${priorityClass}" onclick="goToTaskDetail('${task.id}')">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        ${task.client_name ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">person</span>
                                <span>${escapeHtml(task.client_name)}</span>
                            </div>
                        ` : ''}
                        ${task.project_name ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">folder</span>
                                <span>${escapeHtml(task.project_name)}</span>
                            </div>
                        ` : ''}
                        <div class="task-meta-item">
                            <span class="material-symbols-outlined">category</span>
                            <span>${escapeHtml(categoryName)}</span>
                        </div>
                        <div class="task-meta-item">
                            <span class="material-symbols-outlined">event</span>
                            <span>${dueDateText}</span>
                        </div>
                    </div>
                </div>
                ${statusBadge}
            </div>
            
            <div class="task-actions">
                <button class="btn-task btn-details" onclick="event.stopPropagation(); goToTaskDetail('${task.id}')">
                    <span class="material-symbols-outlined">visibility</span>
                    查看詳情
                </button>
                ${task.status !== 'completed' ? `
                    <button class="btn-task btn-complete" onclick="event.stopPropagation(); markTaskComplete('${task.id}')">
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

function formatDueDate(dateStr) {
    if (!dateStr) return '無截止日期';
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
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date < today;
}

function goToTaskDetail(taskId) {
    window.location.href = `tasks.html?task=${taskId}`;
}

async function markTaskComplete(taskId) {
    if (!await confirmDialog('確定要標記此任務為已完成嗎？')) {
        return;
    }
    
    try {
        // Use the unified task update endpoint
        await apiRequest(`/api/tasks/multi-stage/${taskId}`, {
            method: 'PUT',
            body: { status: 'completed' }
        });
        
        showNotification('任務已標記為完成！', 'success');
        
        // 重新載入任務列表
        await loadPendingTasks();
        
    } catch (error) {
        handleApiError(error, '標記任務完成');
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

        // 1) 取得年度配額（含特休與其他）
        const quotaRes = await apiRequest(`/api/leave-quota?employee=${encodeURIComponent(employeeName)}&year=${currentYear}`);
        const quotaList = quotaRes?.quota || [];
        const annualQuotaHours = (quotaList.find(q => q.type === '特休')?.quota_hours) || 0;

        // 2) 取得年度已使用（報表）
        const reportRes = await apiRequest(`/api/reports/annual-leave?employee=${encodeURIComponent(employeeName)}&year=${currentYear}`);
        const annualLeaveUsedHours = (reportRes?.leave_stats?.['特休']) || 0;

        const totalDays = annualQuotaHours / 8;
        const remainingDays = Math.max(0, (annualQuotaHours - annualLeaveUsedHours) / 8);
        const percentage = totalDays > 0 ? (remainingDays / totalDays * 100) : 0;

        const remainingEl = document.getElementById('annualLeaveRemaining');
        const totalEl = document.getElementById('annualLeaveTotal');
        const barEl = document.getElementById('annualLeaveProgress');
        if (remainingEl) remainingEl.textContent = `${remainingDays.toFixed(1)} 天`;
        if (totalEl) totalEl.textContent = `${totalDays.toFixed(1)}`;
        if (barEl) barEl.style.width = `${percentage}%`;
    } catch (error) {
        console.error('載入年假餘額失敗:', error);
        document.getElementById('annualLeaveRemaining').textContent = '-';
        document.getElementById('annualLeaveTotal').textContent = '-';
    }
}

// 已移除 loadWorkloadBalance 與 /api/workload/overview 呼叫

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
