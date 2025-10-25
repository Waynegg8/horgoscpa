/**
 * 週期性任務管理（整合版）
 * 包含服務配置和任務執行兩個 Tab
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let allTasks = [];
let allServices = [];
let allClients = [];
let allEmployees = [];
let currentCategory = 'all';

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    initEventListeners();
    await loadClientsAndEmployees();
    setCurrentMonth();
    
    // 預設載入任務執行 Tab
    switchTab('tasks');
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
// Tab 切換
// =========================================
function switchTab(tabName) {
    // 更新按鈕狀態
    document.querySelectorAll('.content-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 顯示對應內容
    document.getElementById('config-tab').style.display = 'none';
    document.getElementById('tasks-tab').style.display = 'none';
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    // 載入對應數據
    if (tabName === 'config') {
        loadServicesInTab();
    } else if (tabName === 'tasks') {
        loadTasks();
    }
}

// =========================================
// 服務配置 Tab 功能
// =========================================
async function loadClientsAndEmployees() {
    try {
        const clientsResponse = await apiRequest('/api/clients');
        allClients = clientsResponse || [];
        
        const employeesResponse = await apiRequest('/api/employees');
        allEmployees = employeesResponse || [];
    } catch (error) {
        console.error('載入客戶/員工資料失敗:', error);
    }
}

async function loadServicesInTab() {
    const category = document.getElementById('configCategoryFilter').value;
    
    try {
        let url = '/api/services/clients';
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        
        const response = await apiRequest(url);
        allServices = response.services || [];
        displayServicesInTab(allServices);
    } catch (error) {
        console.error('載入服務配置失敗:', error);
        showNotification('載入失敗: ' + error.message, 'error');
    }
}

function displayServicesInTab(services) {
    const grid = document.getElementById('serviceGridInTab');
    
    if (services.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary); background: white; border-radius: 12px;">
                <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3;">settings_suggest</span>
                <h3 style="margin: 20px 0 10px;">尚無服務配置</h3>
                <p>點擊「新增服務配置」開始設定客戶的週期性服務項目</p>
                <button onclick="showServiceDialogInTab()" class="btn-primary" style="margin-top: 20px;">
                    <span class="material-symbols-outlined">add</span>
                    新增服務配置
                </button>
            </div>
        `;
        return;
    }
    
    // 計算統計信息
    const totalClients = new Set(services.map(s => s.client_name)).size;
    const totalServices = services.length;
    const totalRevenue = services.reduce((sum, s) => sum + (s.fee || 0), 0);
    const totalHours = services.reduce((sum, s) => sum + (s.estimated_hours || 0), 0);
    
    const stats = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: 700; margin-bottom: 5px;">${totalClients}</div>
                <div style="font-size: 14px; opacity: 0.9;">服務客戶數</div>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: 700; margin-bottom: 5px;">${totalServices}</div>
                <div style="font-size: 14px; opacity: 0.9;">服務項目數</div>
            </div>
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: 700; margin-bottom: 5px;">$${totalRevenue.toLocaleString()}</div>
                <div style="font-size: 14px; opacity: 0.9;">月度總收費</div>
            </div>
            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: 700; margin-bottom: 5px;">${totalHours.toFixed(1)}h</div>
                <div style="font-size: 14px; opacity: 0.9;">預計總工時</div>
            </div>
        </div>
    `;
    
    grid.innerHTML = stats + services.map(service => `
        <div class="service-card">
            <div class="service-header">
                <div>
                    <div class="client-name">${escapeHtml(service.client_name)}</div>
                    <div class="service-name">${escapeHtml(service.service_name)}</div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="category-badge category-${service.service_category}">
                        ${service.service_category}
                    </span>
                    <button class="btn btn-sm btn-secondary" onclick="showServiceDialogInTab(${service.id});" title="編輯">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                    </button>
                    ${currentUser.role === 'admin' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteServiceInTab(${service.id});" title="刪除">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="service-meta">
                <div class="meta-item">
                    <div class="meta-label">頻率</div>
                    <div class="meta-value">${escapeHtml(service.frequency)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">收費</div>
                    <div class="meta-value">$${service.fee.toLocaleString()}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">預計工時</div>
                    <div class="meta-value">${service.estimated_hours}小時</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">負責人</div>
                    <div class="meta-value">${escapeHtml(service.assigned_to || '未指派')}</div>
                </div>
            </div>
            
            <div style="margin-top: 15px;">
                <div style="font-weight: 500; margin-bottom: 10px;">每月執行配置：</div>
                <div class="monthly-schedule">
                    ${Array.from({length: 12}, (_, i) => {
                        const month = i + 1;
                        const active = service.monthly_schedule && service.monthly_schedule[month.toString()];
                        return `<div class="month-cell ${active ? 'active' : 'inactive'}">${month}月</div>`;
                    }).join('')}
                </div>
            </div>
            
            ${service.service_notes ? `
                <div style="margin-top: 15px; padding: 10px; background: #fffbf0; border-radius: 6px; font-size: 14px;">
                    📝 ${escapeHtml(service.service_notes)}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function filterServicesInTab() {
    const searchText = document.getElementById('configClientSearch').value.toLowerCase();
    const filtered = allServices.filter(service => 
        service.client_name.toLowerCase().includes(searchText) ||
        service.service_name.toLowerCase().includes(searchText)
    );
    displayServicesInTab(filtered);
}

// 服務範本定義
const serviceTemplates = {
    '月度記帳': {
        category: '記帳',
        frequency: '每月',
        fee: 3000,
        hours: 4,
        months: [1,2,3,4,5,6,7,8,9,10,11,12],
        billing: '每月'
    },
    '雙月營業稅申報': {
        category: '稅簽',
        frequency: '每季',
        fee: 2000,
        hours: 2,
        months: [2,4,6,8,10,12],
        billing: '雙月'
    },
    '營所稅申報': {
        category: '稅簽',
        frequency: '每年',
        fee: 8000,
        hours: 8,
        months: [5],
        billing: '年度'
    },
    '季度財報': {
        category: '財簽',
        frequency: '每季',
        fee: 5000,
        hours: 6,
        months: [3,6,9,12],
        billing: '季末'
    },
    '工商變更': {
        category: '工商',
        frequency: '不定期',
        fee: 3000,
        hours: 4,
        months: [],
        billing: '完成後'
    }
};

function showServiceDialogInTab(serviceId = null) {
    const dialog = document.getElementById('serviceDialog');
    const title = document.getElementById('dialogTitle');
    
    // 重置表單
    document.getElementById('serviceId').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientTaxId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceCategory').value = '';
    document.getElementById('frequency').value = '每月';
    document.getElementById('assignedTo').value = '';
    document.getElementById('fee').value = '0';
    document.getElementById('estimatedHours').value = '0';
    document.getElementById('billingTiming').value = '';
    document.getElementById('billingNotes').value = '';
    document.getElementById('serviceNotes').value = '';
    document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = false);
    
    // 填充客戶下拉選單
    const clientSelect = document.getElementById('clientName');
    clientSelect.innerHTML = '<option value="">選擇客戶</option>' + 
        allClients.map(client => `<option value="${escapeHtml(client.name)}">${escapeHtml(client.name)}</option>`).join('');
    
    // 填充員工下拉選單
    const employeeSelect = document.getElementById('assignedTo');
    employeeSelect.innerHTML = '<option value="">選擇員工</option>' + 
        allEmployees.map(emp => `<option value="${escapeHtml(emp.name)}">${escapeHtml(emp.name)}</option>`).join('');
    
    if (serviceId) {
        // 編輯模式
        title.textContent = '編輯服務配置';
        const service = allServices.find(s => s.id === serviceId);
        if (service) {
            document.getElementById('serviceId').value = service.id;
            document.getElementById('clientName').value = service.client_name;
            document.getElementById('clientTaxId').value = service.client_tax_id || '';
            document.getElementById('serviceName').value = service.service_name;
            document.getElementById('serviceCategory').value = service.service_category;
            document.getElementById('frequency').value = service.frequency;
            document.getElementById('assignedTo').value = service.assigned_to || '';
            document.getElementById('fee').value = service.fee || 0;
            document.getElementById('estimatedHours').value = service.estimated_hours || 0;
            document.getElementById('billingTiming').value = service.billing_timing || '';
            document.getElementById('billingNotes').value = service.billing_notes || '';
            document.getElementById('serviceNotes').value = service.service_notes || '';
            
            // 設定月份勾選
            const schedule = service.monthly_schedule || {};
            document.querySelectorAll('.month-checkbox').forEach(cb => {
                const month = cb.dataset.month;
                cb.checked = schedule[month] === true;
            });
        }
    } else {
        // 新增模式
        title.textContent = '新增服務配置';
    }
    
    // 監聽服務名稱變化，自動套用範本
    const serviceNameInput = document.getElementById('serviceName');
    serviceNameInput.addEventListener('blur', applyServiceTemplate);
    
    dialog.style.display = 'flex';
}

function applyServiceTemplate() {
    const serviceName = document.getElementById('serviceName').value.trim();
    
    // 查找匹配的範本
    for (const [templateName, template] of Object.entries(serviceTemplates)) {
        if (serviceName.includes(templateName) || templateName.includes(serviceName)) {
            if (confirm(`偵測到「${templateName}」範本，要套用預設值嗎？`)) {
                document.getElementById('serviceCategory').value = template.category;
                document.getElementById('frequency').value = template.frequency;
                document.getElementById('fee').value = template.fee;
                document.getElementById('estimatedHours').value = template.hours;
                document.getElementById('billingTiming').value = template.billing;
                
                // 設定月份
                document.querySelectorAll('.month-checkbox').forEach(cb => {
                    cb.checked = template.months.includes(parseInt(cb.dataset.month));
                });
                
                showNotification('已套用範本預設值', 'success');
            }
            break;
        }
    }
}

function useTemplate(templateName) {
    const template = serviceTemplates[templateName];
    if (!template) return;
    
    document.getElementById('serviceName').value = templateName;
    document.getElementById('serviceCategory').value = template.category;
    document.getElementById('frequency').value = template.frequency;
    document.getElementById('fee').value = template.fee;
    document.getElementById('estimatedHours').value = template.hours;
    document.getElementById('billingTiming').value = template.billing;
    
    // 設定月份
    document.querySelectorAll('.month-checkbox').forEach(cb => {
        cb.checked = template.months.includes(parseInt(cb.dataset.month));
    });
    
    showNotification('已套用範本：' + templateName, 'success');
}

function closeServiceDialogInTab() {
    document.getElementById('serviceDialog').style.display = 'none';
}

async function saveServiceInTab() {
    const serviceId = document.getElementById('serviceId').value;
    const clientName = document.getElementById('clientName').value;
    const serviceName = document.getElementById('serviceName').value;
    const serviceCategory = document.getElementById('serviceCategory').value;
    const assignedTo = document.getElementById('assignedTo').value;
    
    if (!clientName || !serviceName || !serviceCategory || !assignedTo) {
        showNotification('請填寫所有必填欄位', 'error');
        return;
    }
    
    // 收集月份配置
    const monthlySchedule = {};
    document.querySelectorAll('.month-checkbox').forEach(cb => {
        monthlySchedule[cb.dataset.month] = cb.checked;
    });
    
    // 檢查是否至少選擇一個月份
    const hasAnyMonth = Object.values(monthlySchedule).some(v => v === true);
    if (!hasAnyMonth) {
        showNotification('請至少選擇一個執行月份', 'error');
        return;
    }
    
    const data = {
        id: serviceId || undefined,
        client_name: clientName,
        client_tax_id: document.getElementById('clientTaxId').value,
        service_name: serviceName,
        service_category: serviceCategory,
        frequency: document.getElementById('frequency').value,
        fee: parseFloat(document.getElementById('fee').value) || 0,
        estimated_hours: parseFloat(document.getElementById('estimatedHours').value) || 0,
        monthly_schedule: monthlySchedule,
        billing_timing: document.getElementById('billingTiming').value,
        billing_notes: document.getElementById('billingNotes').value,
        service_notes: document.getElementById('serviceNotes').value,
        assigned_to: assignedTo
    };
    
    try {
        await apiRequest('/api/services', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification('儲存成功！', 'success');
        closeServiceDialogInTab();
        await loadServicesInTab();
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

async function deleteServiceInTab(serviceId) {
    if (currentUser.role !== 'admin') {
        showNotification('為保護數據安全，只有管理員可以刪除服務配置', 'warning');
        return;
    }
    
    if (!confirm('確定要刪除此服務配置嗎？\n\n刪除後無法恢復，且會影響相關的週期性任務生成。')) {
        return;
    }
    
    try {
        await apiRequest(`/api/services/${serviceId}`, {
            method: 'DELETE'
        });
        
        showNotification('刪除成功', 'success');
        await loadServicesInTab();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// 月份選擇輔助函數
function selectAllMonths() {
    document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllMonths() {
    document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = false);
}

function selectQuarterMonths() {
    document.querySelectorAll('.month-checkbox').forEach(cb => {
        const month = parseInt(cb.dataset.month);
        cb.checked = (month % 3 === 0);
    });
}

// =========================================
// 任務執行 Tab 功能（原有功能）
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
        showNotification('載入任務失敗: ' + error.message, 'error');
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

function filterByCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    const filteredTasks = category === 'all' 
        ? allTasks 
        : allTasks.filter(t => t.category === category);
    
    displayTasks(filteredTasks);
}

function displayTasks(tasks) {
    const grid = document.getElementById('taskGrid');
    
    if (tasks.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary); background: white; border-radius: 12px;">
                <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3;">task_alt</span>
                <h3 style="margin: 20px 0 10px;">本月尚無任務</h3>
                <p>點擊「生成本月任務」根據服務配置創建任務<br>或前往「服務配置」Tab 設定服務項目</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="switchTab('config')" class="btn-secondary">
                        <span class="material-symbols-outlined">tune</span>
                        前往服務配置
                    </button>
                    <button onclick="generateTasks()" class="btn-primary">
                        <span class="material-symbols-outlined">add_circle</span>
                        生成本月任務
                    </button>
                </div>
            </div>
        `;
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

async function startTask(taskId) {
    try {
        await apiRequest(`/api/tasks/recurring/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'in_progress' })
        });
        
        await loadTasks();
        showNotification('任務已開始！', 'success');
    } catch (error) {
        showNotification('開始任務失敗: ' + error.message, 'error');
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
        showNotification('任務已完成！', 'success');
    } catch (error) {
        showNotification('完成任務失敗: ' + error.message, 'error');
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
        
        task.checklist_data = checklist;
    } catch (error) {
        showNotification('更新檢核項目失敗: ' + error.message, 'error');
    }
}

function viewTaskDetail(taskId) {
    // TODO: 打開詳情對話框
    showNotification('詳情功能開發中...', 'info');
}

async function generateTasks() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    
    if (!confirm(`確定要生成 ${year}年${month}月 的週期性任務嗎？\n\n系統會根據服務配置自動創建任務。`)) {
        return;
    }
    
    try {
        const response = await apiRequest('/api/tasks/recurring/generate', {
            method: 'POST',
            body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
        });
        
        showNotification(`成功生成 ${response.tasks_generated} 個任務！`, 'success');
        await loadTasks();
    } catch (error) {
        showNotification('生成任務失敗: ' + error.message, 'error');
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

