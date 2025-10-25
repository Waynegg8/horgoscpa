/**
 * 工作台（Dashboard）
 * 顯示今日概覽和快速操作
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    updateGreeting();
    await loadDashboardData();
});

async function initAuth() {
    const token = localStorage.getItem('session_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await apiRequest('/api/auth/me');
        currentUser = response.user;
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '管理員' : '員工';
        document.getElementById('greetingUser').textContent = currentUser.username;
    } catch (error) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    }
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        },
        ...options
    });

    if (response.status === 401) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
        throw new Error('未授權');
    }

    if (!response.ok) throw new Error('請求失敗');
    return await response.json();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
});

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '早安';
    if (hour >= 12 && hour < 18) greeting = '午安';
    else if (hour >= 18) greeting = '晚安';
    
    document.getElementById('greetingTime').textContent = greeting;
    
    const today = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    document.getElementById('todayDate').textContent = 
        `今天是 ${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()} ${weekdays[today.getDay()]}`;
}

async function loadDashboardData() {
    await Promise.all([
        loadTodayTasks(),
        loadWeeklyStats(),
        loadRecentActivity()
    ]);
}

async function loadTodayTasks() {
    const container = document.getElementById('todayTasks');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        const response = await apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`);
        const tasks = (response.tasks || []).filter(task => {
            if (task.status === 'completed') return false;
            if (!task.assigned_to || task.assigned_to === currentUser.employee_name || currentUser.role === 'admin') {
                // 檢查是否今日到期或逾期
                if (task.due_date) {
                    const due = new Date(task.due_date);
                    const today = new Date();
                    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                    return diffDays <= 2; // 今天和明後天的任務
                }
            }
            return false;
        });
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">mood</span>
                    <p style="margin-top: 10px;">今日沒有緊急任務<br>可以規劃其他工作</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasks.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date();
            return `
                <div class="todo-item ${isOverdue ? 'overdue' : ''}" onclick="window.location.href='recurring-tasks.html#task-${task.id}';">
                    <span class="material-symbols-outlined" style="color: ${isOverdue ? '#f44336' : 'var(--primary-color)'};">
                        ${task.status === 'in_progress' ? 'schedule' : 'radio_button_unchecked'}
                    </span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 3px;">${escapeHtml(task.task_name)}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            ${task.due_date ? formatDueDate(task.due_date) : '無期限'}
                            ${isOverdue ? ' <span style="color: #f44336; font-weight: 600;">⚠️ 已逾期</span>' : ''}
                        </div>
                    </div>
                    <span class="material-symbols-outlined" style="color: var(--text-secondary);">arrow_forward</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<div style="color: #f44336;">載入失敗</div>';
    }
}

async function loadWeeklyStats() {
    const container = document.getElementById('weeklyStats');
    
    try {
        // 獲取本週日期範圍
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        
        // 獲取任務數據
        const response = await apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`);
        const tasks = (response.tasks || []).filter(task => 
            !task.assigned_to || task.assigned_to === currentUser.employee_name || currentUser.role === 'admin'
        );
        
        const completedThisWeek = tasks.filter(t => {
            if (t.status !== 'completed' || !t.completed_at) return false;
            const completedDate = new Date(t.completed_at);
            return completedDate >= weekStart;
        }).length;
        
        const totalHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                <div>
                    <div style="font-size: 36px; font-weight: 700; color: var(--primary-color);">${totalHours.toFixed(1)}</div>
                    <div style="color: var(--text-secondary); font-size: 14px;">總工時</div>
                </div>
                <div>
                    <div style="font-size: 36px; font-weight: 700; color: var(--primary-color);">${completedThisWeek}</div>
                    <div style="color: var(--text-secondary); font-size: 14px;">本週完成</div>
                </div>
                <div>
                    <div style="font-size: 36px; font-weight: 700; color: var(--primary-color);">${tasks.filter(t => t.status !== 'completed').length}</div>
                    <div style="color: var(--text-secondary); font-size: 14px;">進行中</div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div style="color: #f44336;">載入失敗</div>';
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        const response = await apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`);
        const tasks = (response.tasks || [])
            .filter(t => t.completed_at && (t.assigned_to === currentUser.employee_name || currentUser.role === 'admin'))
            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
            .slice(0, 5);
        
        if (tasks.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">尚無活動記錄</div>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; background: var(--light-bg); border-radius: 6px;">
                <span class="material-symbols-outlined" style="color: #4caf50;">check_circle</span>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(task.task_name)}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        完成於 ${new Date(task.completed_at).toLocaleDateString('zh-TW')}
                        ${task.actual_hours ? ` | ${task.actual_hours}小時` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div style="color: #f44336;">載入失敗</div>';
    }
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${date.toLocaleDateString('zh-TW')}`;
    if (diffDays === 0) return '今天到期';
    if (diffDays === 1) return '明天到期';
    return `${diffDays}天後到期`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

