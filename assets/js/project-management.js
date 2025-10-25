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
let currentProjectTasks = [];
let isDragging = false;

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
                <div class="empty-column" data-status="${status}">
                    <span class="material-symbols-outlined">inbox</span>
                    <p>無專案</p>
                </div>
            `;
        } else {
            container.innerHTML = col.projects.map(project => renderProjectCard(project)).join('');
        }
        
        // 添加拖放事件
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('dragleave', handleDragLeave);
    });
}

function renderProjectCard(project) {
    const priorityClass = `priority-${project.priority}`;
    const progress = project.progress || 0;
    
    return `
        <div class="project-card" 
             draggable="true" 
             data-project-id="${project.id}" 
             data-project-status="${project.status}"
             ondragstart="handleDragStart(event)" 
             ondragend="handleDragEnd(event)"
             onclick="viewProjectDetails(${project.id})">
            <div class="project-card-header">
                <div style="flex: 1;">
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
// 專案詳情
// =========================================
async function viewProjectDetails(projectId) {
    try {
        const response = await apiRequest(`/api/projects/${projectId}`);
        const project = response.data;
        
        currentProjectId = projectId;
        
        // 載入任務
        await loadProjectTasks(projectId);
        
        showProjectDetailModal(project);
    } catch (error) {
        showNotification('載入專案失敗: ' + error.message, 'error');
    }
}

async function loadProjectTasks(projectId) {
    try {
        const response = await apiRequest(`/api/projects/${projectId}/tasks`);
        currentProjectTasks = response.data || [];
    } catch (error) {
        console.error('載入任務失敗:', error);
        currentProjectTasks = [];
    }
}

function showProjectDetailModal(project) {
    const statusLabels = {
        'planning': '規劃中',
        'in_progress': '進行中',
        'on_hold': '暫停',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    
    const priorityLabels = {
        'low': '低',
        'medium': '中',
        'high': '高',
        'urgent': '緊急'
    };
    
    const modal = `
        <div class="modal active" id="projectDetailModal">
            <div class="modal-dialog" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <div>
                        <h2>${escapeHtml(project.name)}</h2>
                        <p style="color: var(--text-secondary); margin: 5px 0 0 0;">
                            ${project.client_name ? `客戶：${escapeHtml(project.client_name)}` : '無指定客戶'}
                        </p>
                    </div>
                    <button class="close-btn" onclick="closeProjectDetailModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- 專案資訊 -->
                    <div style="background: var(--light-bg); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">狀態</label>
                                <select id="projectDetailStatus" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" onchange="updateProjectField('status', this.value)">
                                    ${Object.entries(statusLabels).map(([val, label]) => 
                                        `<option value="${val}" ${project.status === val ? 'selected' : ''}>${label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">優先級</label>
                                <select id="projectDetailPriority" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" onchange="updateProjectField('priority', this.value)">
                                    ${Object.entries(priorityLabels).map(([val, label]) => 
                                        `<option value="${val}" ${project.priority === val ? 'selected' : ''}>${label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">負責人</label>
                                <select id="projectDetailAssigned" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" onchange="updateProjectField('assigned_to', this.value)">
                                    <option value="">未指定</option>
                                    ${employees.map(e => 
                                        `<option value="${escapeHtml(e.name)}" ${project.assigned_to === e.name ? 'selected' : ''}>${escapeHtml(e.name)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">到期日</label>
                                <input type="date" id="projectDetailDueDate" value="${project.due_date || ''}" 
                                       style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;"
                                       onchange="updateProjectField('due_date', this.value)">
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">
                                專案進度：${project.progress}%
                            </label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="range" id="projectProgressSlider" min="0" max="100" value="${project.progress}" 
                                       style="flex: 1;" oninput="updateProgressDisplay(this.value)">
                                <input type="number" id="projectProgressInput" min="0" max="100" value="${project.progress}" 
                                       style="width: 70px; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;"
                                       oninput="updateProgressSlider(this.value)">
                                <button class="btn btn-sm btn-primary" onclick="updateProjectField('progress', document.getElementById('projectProgressInput').value)">
                                    <span class="material-symbols-outlined">save</span>
                                </button>
                            </div>
                            <div class="progress-bar" style="margin-top: 10px;">
                                <div class="progress-fill" style="width: ${project.progress}%"></div>
                            </div>
                        </div>
                        
                        ${project.description ? `
                            <div style="margin-top: 15px;">
                                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 5px;">描述</label>
                                <p style="margin: 0;">${escapeHtml(project.description)}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 任務管理 -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin: 0;">任務列表</h3>
                            <button class="btn btn-sm btn-primary" onclick="showAddTaskModal()">
                                <span class="material-symbols-outlined">add</span>
                                新增任務
                            </button>
                        </div>
                        <div id="tasksList">
                            ${renderTasksList(currentProjectTasks)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeProjectDetailModal()">關閉</button>
                    <button class="btn btn-danger" onclick="deleteProjectConfirm(${project.id})">
                        <span class="material-symbols-outlined">delete</span>
                        刪除專案
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
}

function updateProgressDisplay(value) {
    document.getElementById('projectProgressInput').value = value;
    const modalBody = document.querySelector('#projectDetailModal .progress-fill');
    if (modalBody) {
        modalBody.style.width = value + '%';
    }
}

function updateProgressSlider(value) {
    document.getElementById('projectProgressSlider').value = value;
    const modalBody = document.querySelector('#projectDetailModal .progress-fill');
    if (modalBody) {
        modalBody.style.width = value + '%';
    }
}

async function updateProjectField(field, value) {
    if (!currentProjectId) return;
    
    try {
        await apiRequest(`/api/projects/${currentProjectId}`, {
            method: 'PATCH',
            body: { [field]: value }
        });
        
        showNotification('更新成功', 'success');
        await loadProjects();
    } catch (error) {
        showNotification('更新失敗: ' + error.message, 'error');
    }
}

function closeProjectDetailModal() {
    const modal = document.getElementById('projectDetailModal');
    if (modal) modal.remove();
    currentProjectId = null;
    currentProjectTasks = [];
}

async function deleteProjectConfirm(projectId) {
    if (!confirm('確定要刪除此專案嗎？所有相關任務也會被刪除。')) return;
    
    try {
        await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
        showNotification('專案已刪除', 'success');
        closeProjectDetailModal();
        await loadProjects();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =========================================
// 任務管理
// =========================================
function renderTasksList(tasks) {
    if (!tasks || tasks.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">task_alt</span>
                <p>尚無任務</p>
            </div>
        `;
    }
    
    const statusGroups = {
        'todo': { label: '待辦', tasks: [] },
        'in_progress': { label: '進行中', tasks: [] },
        'review': { label: '審核中', tasks: [] },
        'done': { label: '已完成', tasks: [] },
        'blocked': { label: '受阻', tasks: [] }
    };
    
    tasks.forEach(task => {
        if (statusGroups[task.status]) {
            statusGroups[task.status].tasks.push(task);
        }
    });
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            ${Object.entries(statusGroups).map(([status, group]) => `
                <div style="background: var(--light-bg); border-radius: 8px; padding: 15px;">
                    <h4 style="margin: 0 0 15px 0; font-size: 14px; color: var(--text-secondary);">
                        ${group.label} (${group.tasks.length})
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${group.tasks.map(task => `
                            <div class="task-card" style="background: white; padding: 12px; border-radius: 6px; border-left: 3px solid var(--primary-color); cursor: pointer;"
                                 onclick="viewTaskDetail(${task.id})">
                                <h5 style="margin: 0 0 8px 0; font-size: 14px;">${escapeHtml(task.title)}</h5>
                                ${task.assigned_to ? `
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">person</span>
                                        ${escapeHtml(task.assigned_to)}
                                    </div>
                                ` : ''}
                                ${task.due_date ? `
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">event</span>
                                        ${new Date(task.due_date).toLocaleDateString('zh-TW')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddTaskModal() {
    const taskModal = `
        <div class="modal active" id="taskModal" style="z-index: 10001;">
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>新增任務</h3>
                    <button class="close-btn" onclick="closeTaskModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>任務標題 *</label>
                        <input type="text" id="taskTitle" required>
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea id="taskDescription" rows="3"></textarea>
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label>負責人</label>
                            <select id="taskAssigned">
                                <option value="">未指定</option>
                                ${employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>狀態</label>
                            <select id="taskStatus">
                                <option value="todo">待辦</option>
                                <option value="in_progress">進行中</option>
                                <option value="review">審核中</option>
                                <option value="done">已完成</option>
                                <option value="blocked">受阻</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>預估工時</label>
                            <input type="number" id="taskEstimatedHours" min="0" step="0.5" value="0">
                        </div>
                        <div class="form-group">
                            <label>到期日</label>
                            <input type="date" id="taskDueDate">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeTaskModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveTask()">儲存</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('projectDetailModal');
    if (existingModal) {
        existingModal.insertAdjacentHTML('afterend', taskModal);
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.remove();
}

async function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    
    if (!title) {
        alert('請輸入任務標題');
        return;
    }
    
    try {
        const data = {
            project_id: currentProjectId,
            title,
            description: document.getElementById('taskDescription').value || null,
            assigned_to: document.getElementById('taskAssigned').value || null,
            status: document.getElementById('taskStatus').value,
            estimated_hours: parseFloat(document.getElementById('taskEstimatedHours').value) || 0,
            due_date: document.getElementById('taskDueDate').value || null
        };
        
        await apiRequest('/api/tasks', {
            method: 'POST',
            body: data
        });
        
        showNotification('任務建立成功', 'success');
        closeTaskModal();
        
        // 重新載入任務
        await loadProjectTasks(currentProjectId);
        
        // 更新任務列表顯示
        const tasksList = document.getElementById('tasksList');
        if (tasksList) {
            tasksList.innerHTML = renderTasksList(currentProjectTasks);
        }
    } catch (error) {
        alert('建立失敗: ' + error.message);
    }
}

async function viewTaskDetail(taskId) {
    showNotification('任務詳情功能開發中...', 'info');
}

// =========================================
// 拖放功能
// =========================================
function handleDragStart(event) {
    isDragging = true;
    const projectId = event.target.dataset.projectId;
    const projectStatus = event.target.dataset.projectStatus;
    
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
        projectId,
        projectStatus
    }));
    
    event.target.style.opacity = '0.5';
    
    // 高亮可放置區域
    document.querySelectorAll('.kanban-column > div[id*="column"]').forEach(col => {
        col.style.background = 'rgba(74, 144, 226, 0.05)';
        col.style.border = '2px dashed var(--primary-color)';
        col.style.minHeight = '100px';
    });
}

function handleDragEnd(event) {
    isDragging = false;
    event.target.style.opacity = '1';
    
    // 移除高亮
    document.querySelectorAll('.kanban-column > div[id*="column"]').forEach(col => {
        col.style.background = '';
        col.style.border = '';
        col.style.minHeight = '';
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // 高亮當前欄位
    const column = event.currentTarget;
    if (!column.classList.contains('drag-over')) {
        column.classList.add('drag-over');
        column.style.background = 'rgba(74, 144, 226, 0.1)';
    }
}

function handleDragLeave(event) {
    const column = event.currentTarget;
    column.classList.remove('drag-over');
    column.style.background = 'rgba(74, 144, 226, 0.05)';
}

async function handleDrop(event) {
    event.preventDefault();
    
    const column = event.currentTarget;
    column.classList.remove('drag-over');
    column.style.background = '';
    
    // 獲取目標狀態
    const columnId = column.id;
    const newStatus = columnId.replace('-column', '');
    
    // 獲取專案數據
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    const { projectId, projectStatus } = data;
    
    if (projectStatus === newStatus) {
        showNotification('專案已在此狀態', 'info');
        return;
    }
    
    // 更新專案狀態
    try {
        await apiRequest(`/api/projects/${projectId}`, {
            method: 'PATCH',
            body: { status: newStatus }
        });
        
        showNotification('專案狀態已更新', 'success');
        await loadProjects();
    } catch (error) {
        showNotification('更新失敗: ' + error.message, 'error');
        await loadProjects(); // 重新載入以恢復原狀態
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

