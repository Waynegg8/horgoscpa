/**
 * 多階段任務管理
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let templates = [];
let tasks = [];

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    await loadTemplates();
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
// 數據載入
// =========================================

async function loadTemplates() {
    try {
        const response = await apiRequest('/api/multi-stage-templates');
        templates = response.templates || [];
        
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">請選擇模板</option>' +
            templates.map(t => `<option value="${t.id}">${t.name} (${t.total_stages}階段)</option>`).join('');
    } catch (error) {
        console.error('載入模板失敗:', error);
    }
}

async function loadTasks() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    try {
        let url = '/api/tasks/multi-stage';
        if (statusFilter) {
            url += `?status=${statusFilter}`;
        }
        
        const response = await apiRequest(url);
        tasks = response.tasks || [];
        displayTasks();
    } catch (error) {
        console.error('載入任務失敗:', error);
        alert('載入任務失敗: ' + error.message);
    }
}

function displayTasks() {
    const container = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">沒有任務</div>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-detail-card" onclick="viewTaskDetail(${task.id})" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0 0 10px 0; color: var(--primary-color);">${escapeHtml(task.task_name)}</h2>
                    <div style="display: flex; gap: 20px; font-size: 14px; color: #666;">
                        <span>👤 ${escapeHtml(task.client_name)}</span>
                        <span>📋 ${escapeHtml(task.template_name)}</span>
                        <span>👨‍💼 ${escapeHtml(task.assigned_to || '未指派')}</span>
                    </div>
                </div>
                <span class="status-badge status-${task.status}">
                    ${getStatusText(task.status)}
                </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="flex: 1; background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(task.current_stage / task.total_stages * 100)}%; height: 100%; background: var(--primary-color);"></div>
                </div>
                <span style="font-size: 14px; font-weight: 600; color: var(--primary-color);">
                    第 ${task.current_stage}/${task.total_stages} 階段
                </span>
            </div>
        </div>
    `).join('');
}

// =========================================
// 模態框操作
// =========================================

function showCreateModal() {
    document.getElementById('createModal').classList.add('show');
}

function hideCreateModal() {
    document.getElementById('createModal').classList.remove('show');
    document.getElementById('templateSelect').value = '';
    document.getElementById('clientNameInput').value = '';
    document.getElementById('taskNameInput').value = '';
    document.getElementById('assignedToInput').value = '';
    document.getElementById('notesInput').value = '';
}

async function createTask() {
    const templateId = document.getElementById('templateSelect').value;
    const clientName = document.getElementById('clientNameInput').value.trim();
    const taskName = document.getElementById('taskNameInput').value.trim();
    const assignedTo = document.getElementById('assignedToInput').value.trim();
    const notes = document.getElementById('notesInput').value.trim();
    
    if (!templateId || !clientName || !taskName) {
        alert('請填寫必要欄位：模板、客戶名稱、任務名稱');
        return;
    }
    
    try {
        await apiRequest('/api/tasks/multi-stage', {
            method: 'POST',
            body: JSON.stringify({
                template_id: parseInt(templateId),
                client_name: clientName,
                task_name: taskName,
                assigned_to: assignedTo,
                notes: notes
            })
        });
        
        alert('任務創建成功！');
        hideCreateModal();
        await loadTasks();
    } catch (error) {
        console.error('創建任務失敗:', error);
        alert('創建任務失敗: ' + error.message);
    }
}

async function viewTaskDetail(taskId) {
    try {
        const response = await apiRequest(`/api/tasks/multi-stage/${taskId}`);
        // TODO: 顯示詳細資訊和階段進度
        alert('任務詳情功能開發中...\n' + JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('載入任務詳情失敗:', error);
        alert('載入失敗: ' + error.message);
    }
}

// =========================================
// 輔助函數
// =========================================

function getStatusText(status) {
    const statusMap = {
        'not_started': '未開始',
        'in_progress': '進行中',
        'on_hold': '暫停',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

