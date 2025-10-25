/**
 * 週期性任務管理
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let allTasks = [];
let currentCategory = 'all';

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    initEventListeners();
    setCurrentMonth();
    await loadTasks();
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

function initEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('yearSelect').addEventListener('change', loadTasks);
    document.getElementById('monthSelect').addEventListener('change', loadTasks);
}

function setCurrentMonth() {
    const now = new Date();
    document.getElementById('yearSelect').value = now.getFullYear();
    document.getElementById('monthSelect').value = now.getMonth() + 1;
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

function logout() {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
}

// =========================================
// 數據載入
// =========================================

async function loadTasks() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    
    try {
        const response = await apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`);
        allTasks = response.tasks || [];
        
        await loadStats();
        filterByCategory(currentCategory);
    } catch (error) {
        console.error('載入任務失敗:', error);
        alert('載入任務失敗: ' + error.message);
    }
}

async function loadStats() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    
    try {
        const response = await apiRequest(`/api/tasks/recurring/stats?year=${year}&month=${month}`);
        displayStats(response.stats || []);
    } catch (error) {
        console.error('載入統計失敗:', error);
    }
}

function displayStats(stats) {
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const totalHours = allTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${totalTasks}</div>
            <div class="stat-label">總任務數</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completedTasks}</div>
            <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${inProgressTasks}</div>
            <div class="stat-label">進行中</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${pendingTasks}</div>
            <div class="stat-label">待處理</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(1)}</div>
            <div class="stat-label">總工時</div>
        </div>
    `;
}

// =========================================
// 顯示任務
// =========================================

function filterByCategory(category) {
    currentCategory = category;
    
    // 更新分頁按鈕
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 篩選任務
    const filteredTasks = category === 'all' 
        ? allTasks 
        : allTasks.filter(t => t.category === category);
    
    displayTasks(filteredTasks);
}

function displayTasks(tasks) {
    const grid = document.getElementById('taskGrid');
    
    if (tasks.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">沒有任務</div>';
        return;
    }
    
    grid.innerHTML = tasks.map(task => `
        <div class="task-card">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.task_name)}</div>
                    <div class="task-meta">
                        <span class="task-meta-item">
                            <span class="material-symbols-outlined" style="font-size: 18px;">person</span>
                            ${escapeHtml(task.assigned_to || '未指派')}
                        </span>
                        <span class="task-meta-item">
                            <span class="material-symbols-outlined" style="font-size: 18px;">schedule</span>
                            ${task.due_date ? formatDate(task.due_date) : '無期限'}
                        </span>
                        <span class="task-meta-item">
                            <span class="material-symbols-outlined" style="font-size: 18px;">category</span>
                            ${escapeHtml(task.category)}
                        </span>
                    </div>
                </div>
                <span class="status-badge status-${task.status}">
                    ${getStatusText(task.status)}
                </span>
            </div>
            
            ${task.description ? `<p style="color: #666; margin-bottom: 10px;">${escapeHtml(task.description)}</p>` : ''}
            
            ${renderChecklist(task)}
            
            <div class="task-actions">
                ${renderTaskActions(task)}
            </div>
        </div>
    `).join('');
}

function renderChecklist(task) {
    const checklist = task.checklist_data?.items || [];
    if (checklist.length === 0) return '';
    
    const completedCount = checklist.filter(item => item.completed).length;
    
    return `
        <div class="checklist">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>檢核清單</strong>
                <span style="color: #666; font-size: 14px;">${completedCount}/${checklist.length} 完成</span>
            </div>
            ${checklist.map((item, index) => `
                <div class="checklist-item">
                    <input 
                        type="checkbox" 
                        ${item.completed ? 'checked' : ''}
                        onchange="updateChecklistItem(${task.id}, ${index}, this.checked)"
                        ${task.status === 'completed' ? 'disabled' : ''}
                    >
                    <span style="${item.completed ? 'text-decoration: line-through; color: #999;' : ''}">${escapeHtml(item.text)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderTaskActions(task) {
    if (task.status === 'completed') {
        return `
            <button class="btn-action" onclick="viewTaskDetail(${task.id})" style="background: #6c757d; color: white;">
                <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
                查看詳情
            </button>
        `;
    }
    
    if (task.status === 'pending') {
        return `
            <button class="btn-action btn-start" onclick="startTask(${task.id})">
                <span class="material-symbols-outlined" style="font-size: 18px;">play_arrow</span>
                開始執行
            </button>
        `;
    }
    
    if (task.status === 'in_progress') {
        return `
            <button class="btn-action btn-complete" onclick="completeTask(${task.id})">
                <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
                標記完成
            </button>
            <button class="btn-action" onclick="viewTaskDetail(${task.id})" style="background: #6c757d; color: white;">
                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                編輯
            </button>
        `;
    }
    
    return '';
}

// =========================================
// 任務操作
// =========================================

async function startTask(taskId) {
    try {
        await apiRequest(`/api/tasks/recurring/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'in_progress' })
        });
        
        await loadTasks();
        alert('任務已開始！');
    } catch (error) {
        console.error('開始任務失敗:', error);
        alert('開始任務失敗: ' + error.message);
    }
}

async function completeTask(taskId) {
    const hours = prompt('請輸入實際工時（小時）:');
    if (!hours) return;
    
    const notes = prompt('完成備註（選填）:');
    
    try {
        await apiRequest(`/api/tasks/recurring/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                status: 'completed',
                actual_hours: parseFloat(hours),
                notes: notes || ''
            })
        });
        
        await loadTasks();
        alert('任務已完成！');
    } catch (error) {
        console.error('完成任務失敗:', error);
        alert('完成任務失敗: ' + error.message);
    }
}

async function updateChecklistItem(taskId, itemIndex, checked) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const checklist = task.checklist_data;
    checklist.items[itemIndex].completed = checked;
    
    try {
        await apiRequest(`/api/tasks/recurring/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ checklist_data: checklist })
        });
        
        // 更新本地數據
        task.checklist_data = checklist;
    } catch (error) {
        console.error('更新檢核項目失敗:', error);
        alert('更新失敗: ' + error.message);
    }
}

function viewTaskDetail(taskId) {
    // TODO: 打開詳情對話框
    alert('詳情功能開發中...');
}

async function generateTasks() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    
    if (!confirm(`確定要生成 ${year}年${month}月 的週期性任務嗎？`)) {
        return;
    }
    
    try {
        const response = await apiRequest('/api/tasks/recurring/generate', {
            method: 'POST',
            body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
        });
        
        alert(`成功生成 ${response.tasks_generated} 個任務！`);
        await loadTasks();
    } catch (error) {
        console.error('生成任務失敗:', error);
        alert('生成任務失敗: ' + error.message);
    }
}

// =========================================
// 輔助函數
// =========================================

function getStatusText(status) {
    const statusMap = {
        'pending': '待處理',
        'in_progress': '進行中',
        'completed': '已完成',
        'cancelled': '已取消',
        'skipped': '已跳過'
    };
    return statusMap[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

