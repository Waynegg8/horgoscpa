/**
 * 統一任務中心
 * 整合所有類型的任務（專案、週期、複雜）
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let allMyTasks = [];

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    await loadMyTasks();
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
        updateUserInfo(currentUser);
    } catch (error) {
        console.error('驗證錯誤:', error);
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

function updateUserInfo(user) {
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '管理員' : '員工';
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
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
        headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (response.status === 401) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
        throw new Error('未授權');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '請求失敗');
    }

    return await response.json();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
});

// =========================================
// Tab 切換
// =========================================
function switchTaskTab(tab) {
    document.querySelectorAll('.task-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    if (tab === 'mytasks') {
        loadMyTasks();
    }
}

// =========================================
// 載入我的所有任務
// =========================================
async function loadMyTasks() {
    try {
        showLoading();
        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // 並行載入所有來源的任務
        const [recurringRes, projectsRes] = await Promise.all([
            apiRequest(`/api/tasks/recurring?year=${currentYear}&month=${currentMonth}`).catch(() => ({tasks: []})),
            apiRequest(`/api/projects`).catch(() => ({projects: []}))
        ]);
        
        // 整合所有任務
        const tasks = [];
        
        // 週期任務
        (recurringRes.tasks || []).forEach(task => {
            if (task.assigned_to === currentUser.employee_name || currentUser.role === 'admin') {
                tasks.push({
                    ...task,
                    source: 'recurring',
                    sourceName: '週期',
                    priority: getPriorityFromDueDate(task.due_date),
                    link: `recurring-tasks.html#task-${task.id}`
                });
            }
        });
        
        // 專案任務（需要進一步獲取）
        for (const project of (projectsRes.projects || [])) {
            try {
                const tasksRes = await apiRequest(`/api/projects/${project.id}/tasks`);
                (tasksRes.tasks || []).forEach(task => {
                    if (task.assigned_to === currentUser.employee_name || currentUser.role === 'admin') {
                        tasks.push({
                            ...task,
                            source: 'project',
                            sourceName: '專案',
                            projectName: project.name,
                            priority: task.priority || 'medium',
                            link: `projects.html#project-${project.id}`
                        });
                    }
                });
            } catch (err) {
                console.error('載入專案任務失敗:', err);
            }
        }
        
        // 按期限和優先級排序
        allMyTasks = tasks.sort((a, b) => {
            // 先按狀態（待處理和進行中優先）
            const statusOrder = {pending: 0, in_progress: 1, completed: 2};
            const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
            if (statusDiff !== 0) return statusDiff;
            
            // 再按期限
            if (a.due_date && b.due_date) {
                return new Date(a.due_date) - new Date(b.due_date);
            }
            
            return 0;
        });
        
        displayMyTasks(allMyTasks);
    } catch (error) {
        console.error('載入任務失敗:', error);
        showError('載入任務失敗: ' + error.message);
    }
}

function getPriorityFromDueDate(dueDate) {
    if (!dueDate) return 'low';
    
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'high';  // 已逾期
    if (diffDays <= 2) return 'high'; // 2天內
    if (diffDays <= 7) return 'medium'; // 1週內
    return 'low';
}

function displayMyTasks(tasks) {
    const container = document.getElementById('myTasksList');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="background: white; padding: 60px; border-radius: 12px; text-align: center;">
                <span class="material-symbols-outlined" style="font-size: 80px; opacity: 0.3; color: var(--primary-color);">task_alt</span>
                <h3 style="margin: 20px 0 10px;">太棒了！沒有待辦任務</h3>
                <p style="color: var(--text-secondary);">您已完成所有任務，可以放鬆一下 😊</p>
            </div>
        `;
        return;
    }
    
    // 分組統計
    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length
    };
    
    const statsHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 32px; font-weight: 700;">${stats.total}</div>
                <div style="font-size: 14px; opacity: 0.9;">總任務</div>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 32px; font-weight: 700;">${stats.pending}</div>
                <div style="font-size: 14px; opacity: 0.9;">待處理</div>
            </div>
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 32px; font-weight: 700;">${stats.in_progress}</div>
                <div style="font-size: 14px; opacity: 0.9;">進行中</div>
            </div>
            ${stats.overdue > 0 ? `
                <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${stats.overdue}</div>
                    <div style="font-size: 14px; opacity: 0.9;">⚠️ 已逾期</div>
                </div>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = statsHTML + tasks.map(task => `
        <div class="task-card priority-${task.priority}" onclick="window.location.href='${task.link}';" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span class="task-source-badge source-${task.source}">
                            ${task.sourceName}
                        </span>
                        <span class="status-badge status-${task.status}">
                            ${getStatusText(task.status)}
                        </span>
                        ${task.priority === 'high' ? '<span style="color: #f44336; font-weight: 700;">🔥 緊急</span>' : ''}
                    </div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">
                        ${escapeHtml(task.task_name || task.name)}
                    </h3>
                    ${task.projectName ? `
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">
                            📁 ${escapeHtml(task.projectName)}
                        </div>
                    ` : ''}
                    <div style="display: flex; gap: 15px; font-size: 14px; color: var(--text-secondary);">
                        ${task.due_date ? `
                            <span>📅 ${formatDate(task.due_date)}</span>
                        ` : ''}
                        ${task.assigned_to ? `
                            <span>👤 ${escapeHtml(task.assigned_to)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterMyTasks() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value;
    const searchText = document.getElementById('taskSearch').value.toLowerCase();
    
    const filtered = allMyTasks.filter(task => {
        if (statusFilter && task.status !== statusFilter) return false;
        if (sourceFilter && task.source !== sourceFilter) return false;
        if (searchText) {
            const taskName = (task.task_name || task.name || '').toLowerCase();
            const projectName = (task.projectName || '').toLowerCase();
            if (!taskName.includes(searchText) && !projectName.includes(searchText)) {
                return false;
            }
        }
        return true;
    });
    
    displayMyTasks(filtered);
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待處理',
        'in_progress': '進行中',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${date.toLocaleDateString('zh-TW')} (逾期${Math.abs(diffDays)}天)`;
    if (diffDays === 0) return `${date.toLocaleDateString('zh-TW')} (今天)`;
    if (diffDays === 1) return `${date.toLocaleDateString('zh-TW')} (明天)`;
    return `${date.toLocaleDateString('zh-TW')} (${diffDays}天後)`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    const container = document.getElementById('myTasksList');
    container.innerHTML = `
        <div style="text-align: center; padding: 60px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 15px; color: var(--text-secondary);">載入中...</p>
        </div>
    `;
}

function showError(message) {
    const container = document.getElementById('myTasksList');
    container.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 12px; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3; color: #f44336;">error</span>
            <h3>載入失敗</h3>
            <p>${message}</p>
        </div>
    `;
}

