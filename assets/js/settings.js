/*
 * Settings Page - 系統設定頁面功能
 * 包含客戶、客戶指派、業務類型、假期事件、國定假日管理
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let currentData = {
    clients: [],
    assignments: [],
    businessTypes: [],
    leaveEvents: [],
    holidays: [],
    users: [],
    leaveTypes: [],
    systemParams: [],
    employees: []
};

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initTabs();
    initMobileMenu();
    initSearchFilters();
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
        
        // 如果是管理員，顯示管理員專屬標籤
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
        }
        
        // 載入當前標籤頁資料
        loadCurrentTabData();
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
    
    // 更新帳號設定頁面
    document.getElementById('accountUsername').value = user.username;
    document.getElementById('accountRole').value = user.role === 'admin' ? '管理員' : '員工';
    document.getElementById('accountEmployeeName').value = user.employee_name || '無';
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
    // 更新按鈕狀態
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新內容顯示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // 載入該標籤頁的資料
    loadTabData(tabName);
}

function loadCurrentTabData() {
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        loadTabData(activeTab.dataset.tab);
    }
}

function loadTabData(tabName) {
    switch (tabName) {
        case 'clients':
            loadClients();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'business-types':
            loadBusinessTypes();
            break;
        case 'leave-events':
            loadLeaveEvents();
            break;
        case 'holidays':
            loadHolidays();
            break;
        case 'users':
            if (currentUser.role === 'admin') {
                loadUsers();
            }
            break;
        case 'leave-types':
            if (currentUser.role === 'admin') {
                loadLeaveTypes();
            }
            break;
        case 'system-params':
            if (currentUser.role === 'admin') {
                loadSystemParams();
            }
            break;
        case 'employees':
            if (currentUser.role === 'admin') {
                loadEmployees();
            }
            break;
    }
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
// 搜尋過濾
// =========================================
function initSearchFilters() {
    // 客戶搜尋
    document.getElementById('clientSearch')?.addEventListener('input', (e) => {
        filterTable('clients', e.target.value);
    });

    // 客戶指派搜尋
    document.getElementById('assignmentSearch')?.addEventListener('input', (e) => {
        filterTable('assignments', e.target.value);
    });

    // 業務類型搜尋
    document.getElementById('businessTypeSearch')?.addEventListener('input', (e) => {
        filterTable('business-types', e.target.value);
    });

    // 假期事件搜尋
    document.getElementById('leaveEventSearch')?.addEventListener('input', (e) => {
        filterTable('leave-events', e.target.value);
    });

    // 國定假日搜尋
    document.getElementById('holidaySearch')?.addEventListener('input', (e) => {
        filterTable('holidays', e.target.value);
    });

    document.getElementById('holidayYearFilter')?.addEventListener('change', () => {
        loadHolidays();
    });

    // 用戶搜尋
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        filterTable('users', e.target.value);
    });

    // 假別搜尋
    document.getElementById('leaveTypeSearch')?.addEventListener('input', (e) => {
        filterTable('leave-types', e.target.value);
    });
    
    // 員工搜尋
    document.getElementById('employeeSearch')?.addEventListener('input', (e) => {
        filterTable('employees', e.target.value);
    });
}

function filterTable(tableName, searchTerm) {
    const tableContainer = document.getElementById(`${tableName}TableContainer`);
    if (!tableContainer) return;

    const rows = tableContainer.querySelectorAll('tbody tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
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
                <h3>載入失敗</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function showEmpty(containerId, icon, title, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">${icon}</span>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function showAlert(message, type = 'success') {
    // 創建提示訊息
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1001; min-width: 300px; animation: slideIn 0.3s ease;';
    
    document.body.appendChild(alert);
    
    // 3秒後自動移除
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// 添加動畫樣式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// =========================================
// 模態框管理
// =========================================
function showModal(title, content, onSave) {
    const modalHTML = `
        <div class="modal active" id="dynamicModal">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2>${title}</h2>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                    <button type="button" class="btn btn-primary" id="modalSaveBtn">儲存</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHTML;
    
    document.getElementById('modalSaveBtn').addEventListener('click', onSave);
    
    // 點擊模態框外部關閉
    document.getElementById('dynamicModal').addEventListener('click', (e) => {
        if (e.target.id === 'dynamicModal') {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.remove();
    }
}

// =========================================
// 客戶管理
// =========================================
async function loadClients() {
    showLoading('clientsTableContainer');
    
    try {
        const data = await apiRequest('/api/clients');
        currentData.clients = data;
        
        if (data.length === 0) {
            showEmpty('clientsTableContainer', 'business', '尚無客戶資料', '點擊「新增客戶」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>客戶名稱</th>
                            <th>建立時間</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(client => `
                            <tr>
                                <td>${client.id}</td>
                                <td>${client.name}</td>
                                <td>${new Date(client.created_at).toLocaleString('zh-TW')}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editClient('${client.name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteClient('${client.name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('clientsTableContainer').innerHTML = html;
    } catch (error) {
        showError('clientsTableContainer', error.message);
    }
}

function showAddClientModal() {
    const content = `
        <div class="form-group">
            <label>客戶名稱 <span class="required">*</span></label>
            <input type="text" id="clientName" placeholder="請輸入客戶名稱" autofocus>
        </div>
    `;
    
    showModal('新增客戶', content, async () => {
        const name = document.getElementById('clientName').value.trim();
        if (!name) {
            showAlert('請輸入客戶名稱', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/clients', {
                method: 'POST',
                body: { name }
            });
            
            closeModal();
            showAlert('客戶已成功新增');
            loadClients();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editClient(clientName) {
    const client = currentData.clients.find(c => c.name === clientName);
    if (!client) return;
    
    const content = `
        <div class="form-group">
            <label>客戶名稱 <span class="required">*</span></label>
            <input type="text" id="clientName" value="${client.name}" autofocus>
        </div>
    `;
    
    showModal('編輯客戶', content, async () => {
        const name = document.getElementById('clientName').value.trim();
        if (!name) {
            showAlert('請輸入客戶名稱', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/clients/${encodeURIComponent(clientName)}`, {
                method: 'PUT',
                body: { name }
            });
            
            closeModal();
            showAlert('客戶已成功更新');
            loadClients();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

async function deleteClient(clientName) {
    const client = currentData.clients.find(c => c.name === clientName);
    if (!client) return;
    
    if (!confirm(`確定要刪除客戶「${client.name}」嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/clients/${encodeURIComponent(clientName)}`, {
            method: 'DELETE'
        });
        
        showAlert('客戶已成功刪除');
        loadClients();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 客戶指派管理（續）
// =========================================
async function loadAssignments() {
    showLoading('assignmentsTableContainer');
    
    try {
        const data = await apiRequest('/api/assignments');
        currentData.assignments = data;
        
        if (data.length === 0) {
            showEmpty('assignmentsTableContainer', 'assignment_ind', '尚無客戶指派資料', '點擊「新增指派」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>員工姓名</th>
                            <th>客戶名稱</th>
                            <th>建立時間</th>
                            <th style="width: 100px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(assignment => `
                            <tr>
                                <td>${assignment.id}</td>
                                <td>${assignment.employee_name}</td>
                                <td>${assignment.client_name}</td>
                                <td>${new Date(assignment.created_at).toLocaleString('zh-TW')}</td>
                                <td>
                                    <button class="btn btn-small btn-danger" onclick="deleteAssignment('${assignment.employee_name.replace(/'/g, "\\'")}', '${assignment.client_name.replace(/'/g, "\\'")}')">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('assignmentsTableContainer').innerHTML = html;
    } catch (error) {
        showError('assignmentsTableContainer', error.message);
    }
}

async function showAddAssignmentModal() {
    try {
        // 載入員工和客戶列表
        const [employees, clients] = await Promise.all([
            apiRequest('/api/employees'),
            apiRequest('/api/clients')
        ]);
        
        const content = `
            <div class="form-group">
                <label>員工姓名 <span class="required">*</span></label>
                <select id="employeeName">
                    <option value="">請選擇員工</option>
                    ${employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>客戶名稱 <span class="required">*</span></label>
                <select id="clientName">
                    <option value="">請選擇客戶</option>
                    ${clients.map(client => `<option value="${client.name}">${client.name}</option>`).join('')}
                </select>
            </div>
        `;
        
        showModal('新增客戶指派', content, async () => {
            const employee_name = document.getElementById('employeeName').value;
            const client_name = document.getElementById('clientName').value;
            
            if (!employee_name || !client_name) {
                showAlert('請選擇員工和客戶', 'error');
                return;
            }
            
            try {
                await apiRequest('/api/assignments', {
                    method: 'POST',
                    body: { employee_name, client_name }
                });
                
                closeModal();
                showAlert('客戶指派已成功新增');
                loadAssignments();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    } catch (error) {
        showAlert('載入資料失敗', 'error');
    }
}

async function deleteAssignment(employeeName, clientName) {
    if (!confirm(`確定要刪除「${employeeName} - ${clientName}」的指派嗎？`)) {
        return;
    }
    
    try {
        // 使用 employee|client 格式作為 ID
        const id = `${employeeName}|${clientName}`;
        await apiRequest(`/api/assignments/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        
        showAlert('客戶指派已成功刪除');
        loadAssignments();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 業務類型管理
// =========================================
async function loadBusinessTypes() {
    showLoading('businessTypesTableContainer');
    
    try {
        const data = await apiRequest('/api/business-types');
        currentData.businessTypes = data;
        
        if (data.length === 0) {
            showEmpty('businessTypesTableContainer', 'category', '尚無業務類型資料', '點擊「新增業務類型」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>業務類型名稱</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(type => `
                            <tr>
                                <td>${type.id}</td>
                                <td>${type.name}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editBusinessType('${type.name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteBusinessType('${type.name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('businessTypesTableContainer').innerHTML = html;
    } catch (error) {
        showError('businessTypesTableContainer', error.message);
    }
}

function showAddBusinessTypeModal() {
    const content = `
        <div class="form-group">
            <label>業務類型名稱 <span class="required">*</span></label>
            <input type="text" id="businessTypeName" placeholder="請輸入業務類型名稱" autofocus>
        </div>
    `;
    
    showModal('新增業務類型', content, async () => {
        const name = document.getElementById('businessTypeName').value.trim();
        if (!name) {
            showAlert('請輸入業務類型名稱', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/business-types', {
                method: 'POST',
                body: { name }
            });
            
            closeModal();
            showAlert('業務類型已成功新增');
            loadBusinessTypes();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editBusinessType(typeName) {
    const type = currentData.businessTypes.find(t => t.name === typeName);
    if (!type) return;
    
    const content = `
        <div class="form-group">
            <label>業務類型名稱 <span class="required">*</span></label>
            <input type="text" id="businessTypeName" value="${type.name}" autofocus>
        </div>
    `;
    
    showModal('編輯業務類型', content, async () => {
        const name = document.getElementById('businessTypeName').value.trim();
        if (!name) {
            showAlert('請輸入業務類型名稱', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/business-types/${encodeURIComponent(typeName)}`, {
                method: 'PUT',
                body: { name }
            });
            
            closeModal();
            showAlert('業務類型已成功更新');
            loadBusinessTypes();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

async function deleteBusinessType(typeName) {
    const type = currentData.businessTypes.find(t => t.name === typeName);
    if (!type) return;
    
    if (!confirm(`確定要刪除業務類型「${type.name}」嗎？`)) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/business-types/${encodeURIComponent(typeName)}`, {
            method: 'DELETE'
        });
        
        showAlert('業務類型已成功刪除');
        // 等待一小段時間讓用戶看到成功訊息，然後刷新列表
        setTimeout(() => {
            loadBusinessTypes();
        }, 500);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 假期事件管理
// =========================================
async function loadLeaveEvents() {
    showLoading('leaveEventsTableContainer');
    
    try {
        const data = await apiRequest('/api/leave-events');
        currentData.leaveEvents = data;
        
        if (data.length === 0) {
            showEmpty('leaveEventsTableContainer', 'event', '尚無假期事件資料', '點擊「新增假期事件」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>員工姓名</th>
                            <th>事件日期</th>
                            <th>事件類型</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(event => `
                            <tr>
                                <td>${event.id}</td>
                                <td>${event.employee_name}</td>
                                <td>${event.event_date}</td>
                                <td>${event.event_type}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editLeaveEvent(${event.id})">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteLeaveEvent(${event.id})">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('leaveEventsTableContainer').innerHTML = html;
    } catch (error) {
        showError('leaveEventsTableContainer', error.message);
    }
}

async function showAddLeaveEventModal() {
    try {
        const employees = await apiRequest('/api/employees');
        
        const content = `
            <div class="form-group">
                <label>員工姓名 <span class="required">*</span></label>
                <select id="leaveEventEmployee">
                    <option value="">請選擇員工</option>
                    ${employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>事件日期 <span class="required">*</span></label>
                <input type="date" id="leaveEventDate">
            </div>
            <div class="form-group">
                <label>事件類型 <span class="required">*</span></label>
                <select id="leaveEventType">
                    <option value="">請選擇事件類型</option>
                    <option value="婚假">婚假</option>
                    <option value="喪假-直系血親">喪假-直系血親</option>
                    <option value="喪假-祖父母">喪假-祖父母</option>
                    <option value="喪假-配偶父母">喪假-配偶父母</option>
                    <option value="產假">產假</option>
                    <option value="產檢假">產檢假</option>
                    <option value="陪產假">陪產假</option>
                </select>
            </div>
        `;
        
        showModal('新增假期事件', content, async () => {
            const employee_name = document.getElementById('leaveEventEmployee').value;
            const event_date = document.getElementById('leaveEventDate').value;
            const event_type = document.getElementById('leaveEventType').value;
            
            if (!employee_name || !event_date || !event_type) {
                showAlert('請填寫所有必填欄位', 'error');
                return;
            }
            
            try {
                await apiRequest('/api/leave-events', {
                    method: 'POST',
                    body: { employee_name, event_date, event_type }
                });
                
                closeModal();
                showAlert('假期事件已成功新增');
                loadLeaveEvents();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    } catch (error) {
        showAlert('載入資料失敗', 'error');
    }
}

async function editLeaveEvent(id) {
    const event = currentData.leaveEvents.find(e => e.id === id);
    if (!event) return;
    
    try {
        const employees = await apiRequest('/api/employees');
        
        const content = `
            <div class="form-group">
                <label>員工姓名 <span class="required">*</span></label>
                <select id="leaveEventEmployee">
                    <option value="">請選擇員工</option>
                    ${employees.map(emp => 
                        `<option value="${emp.name}" ${emp.name === event.employee_name ? 'selected' : ''}>${emp.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>事件日期 <span class="required">*</span></label>
                <input type="date" id="leaveEventDate" value="${event.event_date}">
            </div>
            <div class="form-group">
                <label>事件類型 <span class="required">*</span></label>
                <select id="leaveEventType">
                    <option value="">請選擇事件類型</option>
                    <option value="婚假" ${event.event_type === '婚假' ? 'selected' : ''}>婚假</option>
                    <option value="喪假-直系血親" ${event.event_type === '喪假-直系血親' ? 'selected' : ''}>喪假-直系血親</option>
                    <option value="喪假-祖父母" ${event.event_type === '喪假-祖父母' ? 'selected' : ''}>喪假-祖父母</option>
                    <option value="喪假-配偶父母" ${event.event_type === '喪假-配偶父母' ? 'selected' : ''}>喪假-配偶父母</option>
                    <option value="產假" ${event.event_type === '產假' ? 'selected' : ''}>產假</option>
                    <option value="產檢假" ${event.event_type === '產檢假' ? 'selected' : ''}>產檢假</option>
                    <option value="陪產假" ${event.event_type === '陪產假' ? 'selected' : ''}>陪產假</option>
                </select>
            </div>
        `;
        
        showModal('編輯假期事件', content, async () => {
            const employee_name = document.getElementById('leaveEventEmployee').value;
            const event_date = document.getElementById('leaveEventDate').value;
            const event_type = document.getElementById('leaveEventType').value;
            
            if (!employee_name || !event_date || !event_type) {
                showAlert('請填寫所有必填欄位', 'error');
                return;
            }
            
            try {
                await apiRequest(`/api/leave-events/${id}`, {
                    method: 'PUT',
                    body: { employee_name, event_date, event_type }
                });
                
                closeModal();
                showAlert('假期事件已成功更新');
                loadLeaveEvents();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    } catch (error) {
        showAlert('載入資料失敗', 'error');
    }
}

async function deleteLeaveEvent(id) {
    const event = currentData.leaveEvents.find(e => e.id === id);
    if (!event) return;
    
    if (!confirm(`確定要刪除「${event.employee_name} - ${event.event_type}」的事件嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/leave-events/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('假期事件已成功刪除');
        loadLeaveEvents();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 國定假日管理
// =========================================
async function loadHolidays() {
    showLoading('holidaysTableContainer');
    
    try {
        const yearFilter = document.getElementById('holidayYearFilter')?.value;
        const url = yearFilter ? `/api/holidays?year=${yearFilter}` : '/api/holidays';
        const data = await apiRequest(url);
        currentData.holidays = data;
        
        // 填充年份下拉選單
        const years = [...new Set(data.map(h => new Date(h.holiday_date).getFullYear()))].sort((a, b) => b - a);
        const yearSelect = document.getElementById('holidayYearFilter');
        if (yearSelect && yearSelect.options.length === 1) {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year} 年`;
                yearSelect.appendChild(option);
            });
        }
        
        if (data.length === 0) {
            showEmpty('holidaysTableContainer', 'calendar_today', '尚無國定假日資料', '點擊「新增國定假日」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>假日日期</th>
                            <th>假日名稱</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(holiday => `
                            <tr>
                                <td>${holiday.id}</td>
                                <td>${holiday.holiday_date}</td>
                                <td>${holiday.holiday_name}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editHoliday('${holiday.holiday_date}')">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteHoliday('${holiday.holiday_date}')">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('holidaysTableContainer').innerHTML = html;
    } catch (error) {
        showError('holidaysTableContainer', error.message);
    }
}

function showAddHolidayModal() {
    const content = `
        <div class="form-group">
            <label>假日日期 <span class="required">*</span></label>
            <input type="date" id="holidayDate">
        </div>
        <div class="form-group">
            <label>假日名稱 <span class="required">*</span></label>
            <input type="text" id="holidayName" placeholder="例如：春節、端午節" autofocus>
        </div>
    `;
    
    showModal('新增國定假日', content, async () => {
        const holiday_date = document.getElementById('holidayDate').value;
        const holiday_name = document.getElementById('holidayName').value.trim();
        
        if (!holiday_date || !holiday_name) {
            showAlert('請填寫所有必填欄位', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/holidays', {
                method: 'POST',
                body: { holiday_date, holiday_name }
            });
            
            closeModal();
            showAlert('國定假日已成功新增');
            loadHolidays();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editHoliday(holidayDate) {
    const holiday = currentData.holidays.find(h => h.holiday_date === holidayDate);
    if (!holiday) return;
    
    const content = `
        <div class="form-group">
            <label>假日日期 <span class="required">*</span></label>
            <input type="date" id="holidayDate" value="${holiday.holiday_date}">
        </div>
        <div class="form-group">
            <label>假日名稱 <span class="required">*</span></label>
            <input type="text" id="holidayName" value="${holiday.holiday_name}" autofocus>
        </div>
    `;
    
    showModal('編輯國定假日', content, async () => {
        const new_holiday_date = document.getElementById('holidayDate').value;
        const holiday_name = document.getElementById('holidayName').value.trim();
        
        if (!new_holiday_date || !holiday_name) {
            showAlert('請填寫所有必填欄位', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/holidays/${encodeURIComponent(holidayDate)}`, {
                method: 'PUT',
                body: { holiday_date: new_holiday_date, holiday_name }
            });
            
            closeModal();
            showAlert('國定假日已成功更新');
            loadHolidays();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

async function deleteHoliday(holidayDate) {
    const holiday = currentData.holidays.find(h => h.holiday_date === holidayDate);
    if (!holiday) return;
    
    if (!confirm(`確定要刪除「${holiday.holiday_name} (${holiday.holiday_date})」嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/holidays/${encodeURIComponent(holidayDate)}`, {
            method: 'DELETE'
        });
        
        showAlert('國定假日已成功刪除');
        loadHolidays();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 用戶管理（管理員）
// =========================================
async function loadUsers() {
    showLoading('usersTableContainer');
    
    try {
        const data = await apiRequest('/api/admin/users');
        currentData.users = data;
        
        if (data.length === 0) {
            showEmpty('usersTableContainer', 'people', '尚無使用者資料', '點擊「新增使用者」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>使用者名稱</th>
                            <th>角色</th>
                            <th>員工姓名</th>
                            <th>狀態</th>
                            <th>建立時間</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.username}</td>
                                <td><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}">${user.role === 'admin' ? '管理員' : '員工'}</span></td>
                                <td>${user.employee_name || '-'}</td>
                                <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? '啟用' : '停用'}</span></td>
                                <td>${new Date(user.created_at).toLocaleString('zh-TW')}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editUser(${user.id})">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('usersTableContainer').innerHTML = html;
    } catch (error) {
        showError('usersTableContainer', error.message);
    }
}

async function showAddUserModal() {
    try {
        const employees = await apiRequest('/api/employees');
        
        const content = `
            <div class="form-group">
                <label>使用者名稱 <span class="required">*</span></label>
                <input type="text" id="userName" placeholder="請輸入使用者名稱" autofocus>
            </div>
            <div class="form-group">
                <label>密碼 <span class="required">*</span></label>
                <input type="password" id="userPassword" placeholder="至少 6 個字元">
            </div>
            <div class="form-group">
                <label>角色 <span class="required">*</span></label>
                <select id="userRole">
                    <option value="employee">員工</option>
                    <option value="admin">管理員</option>
                </select>
            </div>
            <div class="form-group">
                <label>綁定員工</label>
                <select id="userEmployee">
                    <option value="">不綁定</option>
                    ${employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('')}
                </select>
            </div>
        `;
        
        showModal('新增使用者', content, async () => {
            const username = document.getElementById('userName').value.trim();
            const password = document.getElementById('userPassword').value;
            const role = document.getElementById('userRole').value;
            const employee_name = document.getElementById('userEmployee').value || null;
            
            if (!username || !password || !role) {
                showAlert('請填寫所有必填欄位', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAlert('密碼至少需要 6 個字元', 'error');
                return;
            }
            
            try {
                await apiRequest('/api/admin/users', {
                    method: 'POST',
                    body: { username, password, role, employee_name }
                });
                
                closeModal();
                showAlert('使用者已成功新增');
                setTimeout(() => {
                    loadUsers();
                }, 500);
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    } catch (error) {
        showAlert('載入資料失敗', 'error');
    }
}

async function editUser(id) {
    const user = currentData.users.find(u => u.id === id);
    if (!user) return;
    
    try {
        const employees = await apiRequest('/api/employees');
        
        const content = `
            <div class="form-group">
                <label>使用者名稱 <span class="required">*</span></label>
                <input type="text" id="userName" value="${user.username}" autofocus>
            </div>
            <div class="form-group">
                <label>角色 <span class="required">*</span></label>
                <select id="userRole">
                    <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>員工</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理員</option>
                </select>
            </div>
            <div class="form-group">
                <label>綁定員工</label>
                <select id="userEmployee">
                    <option value="">不綁定</option>
                    ${employees.map(emp => 
                        `<option value="${emp.name}" ${emp.name === user.employee_name ? 'selected' : ''}>${emp.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>狀態</label>
                <select id="userActive">
                    <option value="1" ${user.is_active ? 'selected' : ''}>啟用</option>
                    <option value="0" ${!user.is_active ? 'selected' : ''}>停用</option>
                </select>
            </div>
        `;
        
        showModal('編輯使用者', content, async () => {
            const username = document.getElementById('userName').value.trim();
            const role = document.getElementById('userRole').value;
            const employee_name = document.getElementById('userEmployee').value || null;
            const is_active = document.getElementById('userActive').value === '1';
            
            if (!username || !role) {
                showAlert('請填寫所有必填欄位', 'error');
                return;
            }
            
            try {
                await apiRequest(`/api/admin/users/${id}`, {
                    method: 'PUT',
                    body: { username, role, employee_name, is_active }
                });
                
                closeModal();
                showAlert('使用者已成功更新');
                loadUsers();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    } catch (error) {
        showAlert('載入資料失敗', 'error');
    }
}

async function deleteUser(id) {
    const user = currentData.users.find(u => u.id === id);
    if (!user) return;
    
    if (user.id === currentUser.id) {
        showAlert('無法刪除自己的帳號', 'error');
        return;
    }
    
    if (!confirm(`確定要刪除使用者「${user.username}」嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('使用者已成功刪除');
        loadUsers();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 假別設定（管理員）
// =========================================
async function loadLeaveTypes() {
    showLoading('leaveTypesTableContainer');
    
    try {
        const data = await apiRequest('/api/leave-types');
        currentData.leaveTypes = data;
        
        if (data.length === 0) {
            showEmpty('leaveTypesTableContainer', 'beach_access', '尚無假別資料', '點擊「新增假別」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>假別名稱</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(type => `
                            <tr>
                                <td>${type.id}</td>
                                <td>${type.type_name}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editLeaveType('${type.type_name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteLeaveType('${type.type_name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('leaveTypesTableContainer').innerHTML = html;
    } catch (error) {
        showError('leaveTypesTableContainer', error.message);
    }
}

function showAddLeaveTypeModal() {
    const content = `
        <div class="form-group">
            <label>假別名稱 <span class="required">*</span></label>
            <input type="text" id="leaveTypeName" placeholder="例如：特休、病假、事假" autofocus>
        </div>
    `;
    
    showModal('新增假別', content, async () => {
        const name = document.getElementById('leaveTypeName').value.trim();
        if (!name) {
            showAlert('請輸入假別名稱', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/admin/leave-types', {
                method: 'POST',
                body: { name }
            });
            
            closeModal();
            showAlert('假別已成功新增');
            loadLeaveTypes();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editLeaveType(typeName) {
    const type = currentData.leaveTypes.find(t => t.type_name === typeName);
    if (!type) return;
    
    const content = `
        <div class="form-group">
            <label>假別名稱 <span class="required">*</span></label>
            <input type="text" id="leaveTypeName" value="${type.type_name}" autofocus>
        </div>
    `;
    
    showModal('編輯假別', content, async () => {
        const name = document.getElementById('leaveTypeName').value.trim();
        if (!name) {
            showAlert('請輸入假別名稱', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/admin/leave-types/${encodeURIComponent(typeName)}`, {
                method: 'PUT',
                body: { name }
            });
            
            closeModal();
            showAlert('假別已成功更新');
            loadLeaveTypes();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

async function deleteLeaveType(typeName) {
    const type = currentData.leaveTypes.find(t => t.type_name === typeName);
    if (!type) return;
    
    if (!confirm(`確定要刪除假別「${type.type_name}」嗎？`)) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/admin/leave-types/${encodeURIComponent(typeName)}`, {
            method: 'DELETE'
        });
        
        showAlert('假別已成功刪除');
        // 等待一小段時間讓用戶看到成功訊息，然後刷新列表
        setTimeout(() => {
            loadLeaveTypes();
        }, 500);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 系統參數（管理員）
// =========================================
async function loadSystemParams() {
    showLoading('systemParamsContainer');
    
    try {
        const data = await apiRequest('/api/admin/system-params');
        currentData.systemParams = data;
        
        if (data.length === 0) {
            showEmpty('systemParamsContainer', 'tune', '尚無系統參數', '系統參數將由管理員設定');
            return;
        }
        
        const html = `
            <div style="max-width: 800px;">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30%;">參數名稱</th>
                                <th style="width: 30%;">參數值</th>
                                <th>說明</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(param => `
                                <tr>
                                    <td><strong>${param.param_name}</strong></td>
                                    <td>
                                        <input type="text" 
                                               id="param_${param.param_name}" 
                                               value="${param.param_value || ''}"
                                               style="width: 100%; padding: 5px; border: 1px solid var(--border-color); border-radius: 4px;">
                                    </td>
                                    <td style="font-size: 13px; color: var(--text-secondary);">${param.description || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-primary" onclick="saveSystemParams()">
                        <span class="material-symbols-outlined">save</span>
                        儲存參數
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('systemParamsContainer').innerHTML = html;
    } catch (error) {
        showError('systemParamsContainer', error.message);
    }
}

async function saveSystemParams() {
    try {
        const params = currentData.systemParams.map(param => ({
            name: param.param_name,
            value: document.getElementById(`param_${param.param_name}`).value
        }));
        
        await apiRequest('/api/admin/system-params', {
            method: 'PUT',
            body: { params }
        });
        
        showAlert('系統參數已成功儲存');
        loadSystemParams();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 員工管理 CRUD (僅管理員)
// =========================================
async function loadEmployees() {
    showLoading('employeesTableContainer');
    
    try {
        const data = await apiRequest('/api/admin/employees');
        currentData.employees = data;
        
        if (data.length === 0) {
            showEmpty('employeesTableContainer', 'people', '尚無員工資料', '點擊「新增員工」按鈕開始');
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>員工姓名</th>
                            <th>到職日期</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((emp, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${emp.name}</td>
                                <td>${emp.hire_date || '-'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editEmployee('${emp.name.replace(/'/g, "\\'")}', '${emp.hire_date || ''}')">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteEmployee('${emp.name.replace(/'/g, "\\'")}')">
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('employeesTableContainer').innerHTML = html;
    } catch (error) {
        showError('employeesTableContainer', error.message);
    }
}

function showAddEmployeeModal() {
    const content = `
        <div class="form-group">
            <label>員工姓名 <span class="required">*</span></label>
            <input type="text" id="employeeName" placeholder="請輸入員工姓名" autofocus>
        </div>
        <div class="form-group">
            <label>到職日期</label>
            <input type="date" id="employeeHireDate">
        </div>
    `;
    
    showModal('新增員工', content, async () => {
        const name = document.getElementById('employeeName').value.trim();
        const hire_date = document.getElementById('employeeHireDate').value || null;
        
        if (!name) {
            showAlert('請輸入員工姓名', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/admin/employees', {
                method: 'POST',
                body: { name, hire_date }
            });
            
            closeModal();
            showAlert('員工已成功新增');
            setTimeout(() => {
                loadEmployees();
            }, 500);
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editEmployee(employeeName, hireDate) {
    const content = `
        <div class="form-group">
            <label>員工姓名 <span class="required">*</span></label>
            <input type="text" id="employeeName" value="${employeeName}" autofocus>
        </div>
        <div class="form-group">
            <label>到職日期</label>
            <input type="date" id="employeeHireDate" value="${hireDate}">
        </div>
    `;
    
    showModal('編輯員工', content, async () => {
        const name = document.getElementById('employeeName').value.trim();
        const hire_date = document.getElementById('employeeHireDate').value || null;
        
        if (!name) {
            showAlert('請輸入員工姓名', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/admin/employees/${encodeURIComponent(employeeName)}`, {
                method: 'PUT',
                body: { name, hire_date }
            });
            
            closeModal();
            showAlert('員工已成功更新');
            setTimeout(() => {
                loadEmployees();
            }, 500);
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

async function deleteEmployee(employeeName) {
    if (!confirm(`確定要刪除員工「${employeeName}」嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/admin/employees/${encodeURIComponent(employeeName)}`, {
            method: 'DELETE'
        });
        
        showAlert('員工已成功刪除');
        setTimeout(() => {
            loadEmployees();
        }, 500);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

