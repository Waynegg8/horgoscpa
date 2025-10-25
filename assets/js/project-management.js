/*
 * 專案與任務管理系統
 * 整合客戶、員工、工時系統
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let projects = [];
let clients = [];
let employees = [];
let currentView = 'kanban';
let currentProjectId = null;

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    await loadInitialData();
    initEventListeners();
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

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('session_token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const finalOptions = { ...options };
    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...defaultOptions,
        ...finalOptions,
        headers: {
            ...defaultOptions.headers,
            ...finalOptions.headers
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

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const menu = document.getElementById('navMenu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }
}

function initEventListeners() {
    document.getElementById('projectSearch')?.addEventListener('input', handleSearch);
    document.getElementById('clientFilter')?.addEventListener('change', applyFilters);
    document.getElementById('assigneeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

// =========================================
// 載入初始資料
// =========================================
async function loadInitialData() {
    try {
        const [clientsRes, employeesRes] = await Promise.all([
            apiRequest('/api/clients'),
            apiRequest('/api/employees')
        ]);
        
        clients = clientsRes;
        employees = employeesRes;
        
        renderFilters();
        await loadProjects();
    } catch (error) {
        showNotification('載入資料失敗: ' + error.message, 'error');
    }
}

function renderFilters() {
    const clientFilter = document.getElementById('clientFilter');
    const assigneeFilter = document.getElementById('assigneeFilter');
    
    if (clientFilter) {
        clientFilter.innerHTML = '<option value="">所有客戶</option>' +
            clients.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    }
    
    if (assigneeFilter) {
        assigneeFilter.innerHTML = '<option value="">所有負責人</option>' +
            employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('');
    }
}

async function loadProjects() {
    try {
        const response = await apiRequest('/api/projects');
        projects = response.data || [];
        
        if (currentView === 'kanban') {
            renderKanbanView();
        } else {
            renderListView();
        }
    } catch (error) {
        showNotification('載入專案失敗: ' + error.message, 'error');
    }
}

// =========================================
// 看板視圖
// =========================================
function renderKanbanView() {
    const columns = {
        planning: { id: 'planning-column', countId: 'planning-count', projects: [] },
        in_progress: { id: 'progress-column', countId: 'progress-count', projects: [] },
        on_hold: { id: 'hold-column', countId: 'hold-count', projects: [] },
        completed: { id: 'completed-column', countId: 'completed-count', projects: [] }
    };
    
    // 分類專案
    projects.forEach(project => {
        if (columns[project.status]) {
            columns[project.status].projects.push(project);
        }
    });
    
    // 渲染每個欄位
    Object.entries(columns).forEach(([status, col]) => {
        const container = document.getElementById(col.id);
        const countEl = document.getElementById(col.countId);
        
        if (countEl) countEl.textContent = col.projects.length;
        
        if (col.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-column">
                    <span class="material-symbols-outlined">inbox</span>
                    <p>無專案</p>
                </div>
            `;
        } else {
            container.innerHTML = col.projects.map(project => renderProjectCard(project)).join('');
        }
    });
}

function renderProjectCard(project) {
    const priorityClass = `priority-${project.priority}`;
    const progress = project.progress || 0;
    
    return `
        <div class="project-card" onclick="viewProjectDetails(${project.id})">
            <div class="project-card-header">
                <div>
                    <h4 class="project-title">${escapeHtml(project.name)}</h4>
                    ${project.client_name ? `
                        <p class="project-client">
                            <span class="material-symbols-outlined" style="font-size: 16px;">business</span>
                            ${escapeHtml(project.client_name)}
                        </p>
                    ` : ''}
                </div>
                <span class="priority-badge ${priorityClass}">
                    ${getPriorityLabel(project.priority)}
                </span>
            </div>
            
            ${project.description ? `<p style="font-size: 13px; color: var(--text-secondary); margin: 10px 0;">${escapeHtml(project.description).substring(0, 80)}...</p>` : ''}
            
            <div class="project-progress">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                    <span>進度</span>
                    <span><strong>${progress}%</strong></span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="project-meta">
                ${project.assigned_to ? `
                    <div class="project-assignee">
                        <span class="material-symbols-outlined" style="font-size: 14px;">person</span>
                        ${escapeHtml(project.assigned_to)}
                    </div>
                ` : ''}
                ${project.due_date ? `
                    <span style="font-size: 12px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">event</span>
                        ${new Date(project.due_date).toLocaleDateString('zh-TW')}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

function getPriorityLabel(priority) {
    const labels = {
        low: '低',
        medium: '中',
        high: '高',
        urgent: '緊急'
    };
    return labels[priority] || '中';
}

// =========================================
// 列表視圖
// =========================================
function renderListView() {
    const container = document.getElementById('projectListContainer');
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 80px 20px; text-align: center;">
                <span class="material-symbols-outlined" style="font-size: 80px; opacity: 0.3;">folder_open</span>
                <p style="font-size: 18px; font-weight: 600; margin: 20px 0 10px;">尚無專案</p>
                <p style="color: var(--text-secondary);">點擊「新增專案」開始建立專案</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>專案名稱</th>
                    <th>客戶</th>
                    <th>負責人</th>
                    <th>狀態</th>
                    <th>優先級</th>
                    <th>進度</th>
                    <th>到期日</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(project => {
                    const statusLabels = {
                        planning: '規劃中',
                        in_progress: '進行中',
                        on_hold: '暫停',
                        completed: '已完成',
                        cancelled: '已取消'
                    };
                    
                    return `
                        <tr>
                            <td><strong>${escapeHtml(project.name)}</strong></td>
                            <td>${escapeHtml(project.client_name || '-')}</td>
                            <td>${escapeHtml(project.assigned_to || '-')}</td>
                            <td><span class="badge badge-primary">${statusLabels[project.status]}</span></td>
                            <td><span class="priority-badge priority-${project.priority}">${getPriorityLabel(project.priority)}</span></td>
                            <td>
                                <div class="progress-bar" style="width: 100px;">
                                    <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                                </div>
                            </td>
                            <td>${project.due_date ? new Date(project.due_date).toLocaleDateString('zh-TW') : '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewProjectDetails(${project.id})">
                                    <span class="material-symbols-outlined">visibility</span>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// =========================================
// 視圖切換
// =========================================
function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    
    if (view === 'kanban') {
        document.getElementById('kanban-view').style.display = 'block';
        document.getElementById('list-view').style.display = 'none';
        renderKanbanView();
    } else {
        document.getElementById('kanban-view').style.display = 'none';
        document.getElementById('list-view').style.display = 'block';
        renderListView();
    }
}

// =========================================
// 新增專案
// =========================================
function showNewProjectModal() {
    const modal = `
        <div class="modal active" id="projectModal">
            <div class="modal-dialog" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>新增專案</h2>
                    <button class="close-btn" onclick="closeProjectModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>專案名稱 *</label>
                        <input type="text" id="projectName" required>
                    </div>
                    
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label>客戶</label>
                            <select id="projectClient">
                                <option value="">無</option>
                                ${clients.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>負責人</label>
                            <select id="projectAssignee">
                                <option value="">無</option>
                                ${employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>優先級</label>
                            <select id="projectPriority">
                                <option value="low">低</option>
                                <option value="medium" selected>中</option>
                                <option value="high">高</option>
                                <option value="urgent">緊急</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>狀態</label>
                            <select id="projectStatus">
                                <option value="planning">規劃中</option>
                                <option value="in_progress">進行中</option>
                                <option value="on_hold">暫停</option>
                                <option value="completed">已完成</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>開始日期</label>
                            <input type="date" id="projectStartDate">
                        </div>
                        
                        <div class="form-group">
                            <label>到期日</label>
                            <input type="date" id="projectDueDate">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>專案描述</label>
                        <textarea id="projectDescription" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeProjectModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveProject()">儲存</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) modal.remove();
}

async function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    
    if (!name) {
        alert('請輸入專案名稱');
        return;
    }
    
    try {
        const data = {
            name,
            client_name: document.getElementById('projectClient').value || null,
            assigned_to: document.getElementById('projectAssignee').value || null,
            priority: document.getElementById('projectPriority').value,
            status: document.getElementById('projectStatus').value,
            start_date: document.getElementById('projectStartDate').value || null,
            due_date: document.getElementById('projectDueDate').value || null,
            description: document.getElementById('projectDescription').value || null
        };
        
        await apiRequest('/api/projects', {
            method: 'POST',
            body: data
        });
        
        showNotification('專案建立成功', 'success');
        closeProjectModal();
        await loadProjects();
    } catch (error) {
        alert('建立失敗: ' + error.message);
    }
}

// =========================================
// 搜尋與篩選
// =========================================
function handleSearch() {
    applyFilters();
}

function applyFilters() {
    // 重新載入並應用篩選
    loadProjects();
}

// =========================================
// 專案詳情（簡化版）
// =========================================
async function viewProjectDetails(projectId) {
    try {
        const response = await apiRequest(`/api/projects/${projectId}`);
        const project = response.data;
        
        alert(`專案：${project.name}\n客戶：${project.client_name || '無'}\n進度：${project.progress}%\n\n詳細任務管理功能將在後續實作`);
    } catch (error) {
        alert('載入專案失敗: ' + error.message);
    }
}

// =========================================
// 工具函數
// =========================================
function showNotification(message, type = 'info') {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
}

// 全域函數
window.switchView = switchView;
window.showNewProjectModal = showNewProjectModal;
window.closeProjectModal = closeProjectModal;
window.saveProject = saveProject;
window.viewProjectDetails = viewProjectDetails;

