/*
 * Settings Page - 系統設定頁面功能
 * 包含客戶、客戶指派、業務類型、假期事件、國定假日管理
 */

// 使用共用模組的全局變量（由 auth-common.js 提供 currentUser）
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
    // 使用統一的初始化函數
    await initPage(async () => {
        // currentUser 由 auth-common.js 設定
        initTabs();
        initSearchFilters();
        if (typeof initClientsExtended === 'function') {
            initClientsExtended();
        }
        // 載入當前標籤頁資料
        loadCurrentTabData();
    });
});

// 移除重複的 initAuth、apiRequest、initMobileMenu
// 這些功能已在 auth-common.js 中提供

function updateUserInfo(user) {
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '管理員' : '員工';
    
    // 更新帳號設定頁面
    document.getElementById('accountUsername').value = user.username;
    document.getElementById('accountRole').value = user.role === 'admin' ? '管理員' : '員工';
    document.getElementById('accountEmployeeName').value = user.employee_name || '無';
}

// 登出
document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

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
        case 'clients-extended':
            if (typeof loadClientsExtended === 'function') {
                loadClientsExtended();
            }
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
        case 'client-services':
            if (currentUser.role === 'admin') {
                loadClientServices();
            }
            break;
        case 'cache-management':
            if (currentUser.role === 'admin') {
                loadCacheStats();
            }
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
                // 載入所有分類的配置
                loadConfigByCategory('timesheet');
            }
            break;
        case 'employees':
            if (currentUser.role === 'admin') {
                loadEmployeesAdmin();
            }
            break;
    }
}

// =========================================
// 移動端選單
// =========================================
// 已由 auth-common.js 提供 initMobileMenu，移除此重複實作

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

// 添加動畫樣式（避免全域名稱衝突）
const settingsAnimationsStyleEl = document.createElement('style');
settingsAnimationsStyleEl.textContent = `
     @keyframes slideIn {
         from { transform: translateX(400px); opacity: 0; }
         to { transform: translateX(0); opacity: 1; }
     }
     @keyframes slideOut {
         from { transform: translateX(0); opacity: 1; }
         to { transform: translateX(400px); opacity: 0; }
     }
 `;
document.head.appendChild(settingsAnimationsStyleEl);

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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>客戶名稱</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(client => `
                            <tr>
                                <td>${client.id}</td>
                                <td>${client.name}</td>
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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>員工姓名</th>
                            <th>客戶名稱</th>
                            <th>建立時間</th>
                            <th>最後更新</th>
                            <th style="width: 100px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(assignment => `
                            <tr>
                                <td>${assignment.employee_name}</td>
                                <td>${assignment.client_name}</td>
                                <td>${assignment.created_at ? new Date(assignment.created_at).toLocaleString('zh-TW') : '-'}</td>
                                <td>${assignment.updated_at ? new Date(assignment.updated_at).toLocaleString('zh-TW') : '-'}</td>
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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>業務類型名稱</th>
                            <th>建立時間</th>
                            <th>最後更新</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(type => `
                            <tr>
                                <td><strong>${type.name}</strong></td>
                                <td>${type.created_at ? new Date(type.created_at).toLocaleString('zh-TW') : '-'}</td>
                                <td>${type.updated_at ? new Date(type.updated_at).toLocaleString('zh-TW') : '-'}</td>
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
                <table class="data-table">
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
                <table class="data-table">
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
                <table class="data-table">
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
                                        <button class="btn btn-small btn-secondary" onclick="editUser(${user.id})" title="編輯">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-warning" onclick="resetUserPassword('${user.username}')" title="重設密碼">
                                            <span class="material-symbols-outlined">lock_reset</span>
                                        </button>
                                        <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''} title="刪除">
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
            // 僅在彈窗內查找表單元素，避免被頁面上其他同名元素干擾
            const modal = document.getElementById('dynamicModal');
            const usernameEl = modal?.querySelector('#userName');
            const passwordEl = modal?.querySelector('#userPassword');
            const roleEl = modal?.querySelector('#userRole');
            const employeeEl = modal?.querySelector('#userEmployee');
            if (!usernameEl || !passwordEl || !roleEl || !employeeEl) {
                showAlert('表單元素初始化失敗', 'error');
                return;
            }
            const username = (usernameEl.value || '').trim();
            const password = passwordEl.value || '';
            const role = roleEl.value || 'employee';
            const employee_name = employeeEl.value ? employeeEl.value : null;
            
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

async function resetUserPassword(username) {
    const newPassword = prompt(`請輸入 ${username} 的新密碼（至少 6 個字元）:`);
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        showAlert('密碼至少需要 6 個字元', 'error');
        return;
    }
    
    if (!confirm(`確定要將 ${username} 的密碼重設為新密碼嗎？`)) {
        return;
    }
    
    try {
        await apiRequest(`/api/admin/users/${encodeURIComponent(username)}/reset-password`, {
            method: 'POST',
            body: { new_password: newPassword }
        });
        
        showAlert(`已成功重設 ${username} 的密碼`);
    } catch (error) {
        showAlert('密碼重設失敗: ' + error.message, 'error');
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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>假別名稱</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((type, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
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
                    <table class="data-table">
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
async function loadEmployeesAdmin() {
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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>員工姓名</th>
                            <th>到職日期</th>
                            <th>性別</th>
                            <th style="width: 150px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((emp, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${emp.name}</td>
                                <td>${emp.hire_date || '-'}</td>
                                <td>${emp.gender || '-'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editEmployee('${emp.name.replace(/'/g, "\\'")}', '${emp.hire_date || ''}', '${emp.gender || ''}')">
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
        <div class="form-group">
            <label>性別</label>
            <select id="employeeGender">
                <option value="">未設定</option>
                <option value="male">男</option>
                <option value="female">女</option>
            </select>
        </div>
    `;
    
    showModal('新增員工', content, async () => {
        const name = document.getElementById('employeeName').value.trim();
        const hire_date = document.getElementById('employeeHireDate').value || null;
        const gender = document.getElementById('employeeGender').value || null;
        
        if (!name) {
            showAlert('請輸入員工姓名', 'error');
            return;
        }
        
        try {
            await apiRequest('/api/admin/employees', {
                method: 'POST',
                body: { name, hire_date, gender }
            });
            
            closeModal();
            showAlert('員工已成功新增');
            setTimeout(() => {
                loadEmployeesAdmin();
            }, 500);
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function editEmployee(employeeName, hireDate, gender) {
    const content = `
        <div class="form-group">
            <label>員工姓名 <span class="required">*</span></label>
            <input type="text" id="employeeName" value="${employeeName}" autofocus>
        </div>
        <div class="form-group">
            <label>到職日期</label>
            <input type="date" id="employeeHireDate" value="${hireDate}">
        </div>
        <div class="form-group">
            <label>性別</label>
            <select id="employeeGender">
                <option value="" ${!gender ? 'selected' : ''}>未設定</option>
                <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
            </select>
        </div>
    `;
    
    showModal('編輯員工', content, async () => {
        const name = document.getElementById('employeeName').value.trim();
        const hire_date = document.getElementById('employeeHireDate').value || null;
        const genderVal = document.getElementById('employeeGender').value || null;
        
        if (!name) {
            showAlert('請輸入員工姓名', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/admin/employees/${encodeURIComponent(employeeName)}`, {
                method: 'PUT',
                body: { name, hire_date, gender: genderVal }
            });
            
            closeModal();
            showAlert('員工已成功更新');
            setTimeout(() => {
                loadEmployeesAdmin();
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
            loadEmployeesAdmin();
        }, 500);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 快取管理（管理員專用）
// =========================================

async function loadCacheStats() {
    const container = document.getElementById('cacheStatsContainer');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>載入中...</div>';
    
    try {
        const response = await apiRequest('/api/admin/cache/stats');
        
        const performanceStats = response.performance_stats || [];
        const cacheStorage = response.cache_storage || [];
        
        // 生成統計表格
        let html = '<h4>效能統計（最近 7 天）</h4>';
        
        if (performanceStats.length > 0) {
            html += `
                <div class="table-container" style="margin-bottom: 20px;">
                    <table>
                        <thead>
                            <tr>
                                <th>報表類型</th>
                                <th>總請求數</th>
                                <th>快取命中數</th>
                                <th>命中率</th>
                                <th>平均執行時間</th>
                                <th>快取時間</th>
                                <th>計算時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${performanceStats.map(stat => `
                                <tr>
                                    <td>${getReportTypeName(stat.report_type)}</td>
                                    <td>${stat.total_requests}</td>
                                    <td>${stat.cache_hits}</td>
                                    <td><strong style="color: var(--primary-color);">${stat.hit_rate}</strong></td>
                                    <td>${stat.avg_execution_time}</td>
                                    <td>${stat.avg_cache_time}</td>
                                    <td>${stat.avg_compute_time}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p style="color: #666; margin: 20px 0;">尚無統計資料（生成報表後會顯示）</p>';
        }
        
        html += '<h4>快取儲存狀態</h4>';
        
        if (cacheStorage.length > 0) {
            html += `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>報表類型</th>
                                <th>快取數量</th>
                                <th>儲存大小</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cacheStorage.map(cache => `
                                <tr>
                                    <td>${getReportTypeName(cache.report_type)}</td>
                                    <td>${cache.cache_count} 筆</td>
                                    <td>${formatBytes(cache.total_size || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p style="color: #666; margin: 20px 0;">目前無快取資料</p>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>載入失敗: ${error.message}</p>
            </div>
        `;
    }
}

function getReportTypeName(type) {
    const names = {
        'annual_leave': '年度請假總覽',
        'work_analysis': '工時分析',
        'pivot': '樞紐分析'
    };
    return names[type] || type;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function clearCache(type) {
    const confirmMessages = {
        'all': '確定要清除所有報表快取嗎？',
        'annual_leave': '確定要清除年度請假總覽的快取嗎？',
        'work_analysis': '確定要清除工時分析的快取嗎？',
        'pivot': '確定要清除樞紐分析的快取嗎？'
    };
    
    if (!confirm(confirmMessages[type] || '確定要清除快取嗎？')) {
        return;
    }
    
    try {
        let url = '/api/admin/cache/clear';
        if (type !== 'all') {
            url += `?type=${type}`;
        }
        
        const response = await apiRequest(url, { method: 'POST' });
        
        showAlert(response.message || '快取已清除', 'success');
        
        // 重新載入統計
        setTimeout(() => {
            loadCacheStats();
        }, 500);
        
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// =========================================
// 配置管理功能
// =========================================

/**
 * 切換配置分類標籤
 */
function switchConfigTab(category) {
    // 更新按鈕狀態
    document.querySelectorAll('.config-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    if (typeof event !== 'undefined' && event.target) {
        event.target.closest('.config-tab-button')?.classList.add('active');
    }

    // 更新內容顯示
    document.querySelectorAll('.config-category').forEach(cat => {
        cat.classList.remove('active');
    });
    
    const targetConfig = document.getElementById(`${category}-config`);
    if (targetConfig) {
        targetConfig.classList.add('active');
    }
    
    // 載入該分類的配置
    loadConfigByCategory(category);
}

/**
 * 載入特定分類的系統配置
 */
async function loadConfigByCategory(category) {
    try {
        const response = await apiRequest(`/api/system-config/${category}`);
        
        if (response.success && response.parameters) {
            // 填充表單值
            response.parameters.forEach(param => {
                const element = document.getElementById(param.param_key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = param.param_value === 'true' || param.param_value === '1';
                    } else {
                        element.value = param.param_value || '';
                    }
                }
            });
        }
    } catch (error) {
        console.error(`載入 ${category} 配置失敗:`, error);
    }
}

/**
 * 儲存所有參數
 */
async function saveAllParameters() {
    if (!confirm('確定要儲存所有系統參數嗎？')) {
        return;
    }

    const updates = [];
    
    // 收集所有參數
    const paramInputs = document.querySelectorAll('.config-input, .toggle-switch input');
    paramInputs.forEach(input => {
        const paramKey = input.id;
        let paramValue;
        
        if (input.type === 'checkbox') {
            paramValue = input.checked ? 'true' : 'false';
        } else {
            paramValue = input.value;
        }
        
        if (paramKey && paramValue !== undefined) {
            updates.push({ param_key: paramKey, param_value: paramValue });
        }
    });

    try {
        // 批量更新（假設API存在）
        const response = await apiRequest('/api/system-config/batch', {
            method: 'PUT',
            body: { updates }
        });
        
        showAlert('系統參數已成功儲存', 'success');
    } catch (error) {
        // 如果批量API不存在，逐個更新
        console.warn('批量API不可用，使用逐個更新:', error);
        
        let successCount = 0;
        for (const update of updates) {
            try {
                await apiRequest(`/api/system-parameters/${update.param_key}`, {
                    method: 'PUT',
                    body: { param_value: update.param_value }
                });
                successCount++;
            } catch (err) {
                console.error(`更新參數 ${update.param_key} 失敗:`, err);
            }
        }
        
        showAlert(`已儲存 ${successCount}/${updates.length} 個參數`, 'info');
    }
}

/**
 * 重置所有參數
 */
async function resetAllParameters() {
    if (!confirm('確定要重置所有參數為預設值嗎？此操作無法還原！')) {
        return;
    }

    try {
        const response = await apiRequest('/api/system-config/reset-all', {
            method: 'POST'
        });
        
        showAlert('已重置為預設值，請重新載入頁面', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        showAlert('重置失敗: ' + error.message, 'error');
    }
}

/**
 * 輸入驗證
 */
function validateConfigInput(input) {
    const value = input.value;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const type = input.type;

    // 數字驗證
    if (type === 'number') {
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        }
        
        if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        }
    }

    // 驗證成功
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// 為所有配置輸入添加驗證
document.addEventListener('DOMContentLoaded', () => {
    const configInputs = document.querySelectorAll('.config-input[type="number"]');
    configInputs.forEach(input => {
        input.addEventListener('input', () => validateConfigInput(input));
        input.addEventListener('blur', () => validateConfigInput(input));
    });
});

// =========================================
// 客戶服務配置管理
// =========================================

let clientServicesData = [];
const SERVICE_TYPE_NAMES = {
    'accounting': '記帳服務',
    'vat': '營業稅申報',
    'income_tax': '營所稅申報',
    'withholding': '扣繳申報',
    'prepayment': '暫繳申報',
    'dividend': '盈餘分配',
    'nhi': '二代健保補充保費',
    'shareholder_tax': '股東可扣抵稅額',
    'audit': '財務簽證',
    'company_setup': '公司設立登記'
};

const FREQUENCY_NAMES = {
    'monthly': '每月',
    'bimonthly': '雙月',
    'quarterly': '每季',
    'biannual': '半年',
    'annual': '年度'
};

/**
 * 載入客戶服務配置
 */
async function loadClientServices() {
    const container = document.getElementById('clientServicesContainer');
    if (!container) return;

    try {
        const response = await apiRequest('/api/client-services');
        clientServicesData = response.services || response || [];
        
        renderClientServices(clientServicesData);
        
        // 填充篩選選項
        populateClientServiceFilters();
    } catch (error) {
        console.error('載入服務配置失敗:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error_outline</span>
                <p>載入失敗: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadClientServices()">重試</button>
            </div>
        `;
    }
}

/**
 * 渲染客戶服務配置
 */
function renderClientServices(services) {
    const container = document.getElementById('clientServicesContainer');
    if (!container) return;

    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">fact_check</span>
                <p style="font-size: 16px; margin: 10px 0;">尚無服務配置</p>
                <p style="font-size: 14px; color: #666;">點擊上方「新增服務配置」按鈕開始</p>
            </div>
        `;
        return;
    }

    let html = '<div class="services-grid" style="display: flex; flex-direction: column; gap: 16px;">';
    
    services.forEach(service => {
        const serviceTypeName = SERVICE_TYPE_NAMES[service.service_type] || service.service_type;
        const frequencyName = FREQUENCY_NAMES[service.frequency] || service.frequency;
        const difficultyStars = '⭐'.repeat(service.difficulty_level || 3);
        const isActive = service.is_active !== false;
        
        html += `
            <div class="service-config-card ${!isActive ? 'inactive' : ''}" data-service-id="${service.id}">
                <div class="service-config-header">
                    <div>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-primary);">
                            ${service.client_name || '未知客戶'} - ${serviceTypeName}
                        </h3>
                        <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
                            <span class="badge" style="background: #e3f2fd; color: #0d6efd;">${frequencyName}</span>
                            <span class="badge" style="background: #fff3cd; color: #856404;">${difficultyStars} 難度</span>
                            ${isActive ? 
                                '<span class="badge" style="background: #d4edda; color: #155724;">✓ 啟用中</span>' :
                                '<span class="badge" style="background: #f8d7da; color: #721c24;">✗ 已停用</span>'
                            }
                        </div>
                    </div>
                </div>
                
                <div class="service-config-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0;">
                    <div class="config-info-item">
                        <span class="config-info-label">負責人</span>
                        <span class="config-info-value">${service.assigned_to || '未指派'}</span>
                    </div>
                    <div class="config-info-item">
                        <span class="config-info-label">執行日</span>
                        <span class="config-info-value">每月 ${service.execution_day || 15} 日</span>
                    </div>
                    <div class="config-info-item">
                        <span class="config-info-label">提前生成</span>
                        <span class="config-info-value">${service.advance_days || 7} 天</span>
                    </div>
                    <div class="config-info-item">
                        <span class="config-info-label">任務期限</span>
                        <span class="config-info-value">${service.due_days || 15} 天</span>
                    </div>
                    <div class="config-info-item">
                        <span class="config-info-label">預估工時</span>
                        <span class="config-info-value">${service.estimated_hours || 0} 小時</span>
                    </div>
                    <div class="config-info-item">
                        <span class="config-info-label">服務費用</span>
                        <span class="config-info-value">$${service.fee || 0}</span>
                    </div>
                </div>
                
                <div class="service-config-footer">
                    <button class="btn btn-sm btn-secondary" onclick="editClientService(${service.id})">
                        <span class="material-symbols-outlined">edit</span>
                        編輯
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="viewServiceHistory(${service.id})">
                        <span class="material-symbols-outlined">history</span>
                        執行歷史
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="testGenerateService(${service.id})">
                        <span class="material-symbols-outlined">play_arrow</span>
                        測試生成
                    </button>
                    <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" onclick="toggleClientService(${service.id}, ${!isActive})">
                        <span class="material-symbols-outlined">${isActive ? 'pause' : 'play_arrow'}</span>
                        ${isActive ? '停用' : '啟用'}
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * 填充篩選選項
 */
function populateClientServiceFilters() {
    // 填充客戶選項
    const clientFilter = document.getElementById('csClientFilter');
    if (clientFilter && clientServicesData.length > 0) {
        const clients = [...new Set(clientServicesData.map(s => s.client_name))].sort();
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client;
            option.textContent = client;
            clientFilter.appendChild(option);
        });
    }

    // 填充負責人選項
    const assignedFilter = document.getElementById('csAssignedFilter');
    if (assignedFilter && clientServicesData.length > 0) {
        const assignees = [...new Set(clientServicesData.map(s => s.assigned_to).filter(Boolean))].sort();
        assignees.forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee;
            option.textContent = assignee;
            assignedFilter.appendChild(option);
        });
    }
}

/**
 * 篩選客戶服務
 */
function filterClientServices() {
    const clientFilter = document.getElementById('csClientFilter')?.value || '';
    const serviceTypeFilter = document.getElementById('csServiceTypeFilter')?.value || '';
    const assignedFilter = document.getElementById('csAssignedFilter')?.value || '';
    const searchText = document.getElementById('csSearch')?.value.toLowerCase() || '';

    const filtered = clientServicesData.filter(service => {
        if (clientFilter && service.client_name !== clientFilter) return false;
        if (serviceTypeFilter && service.service_type !== serviceTypeFilter) return false;
        if (assignedFilter && service.assigned_to !== assignedFilter) return false;
        
        if (searchText) {
            const searchable = `${service.client_name} ${SERVICE_TYPE_NAMES[service.service_type]}`.toLowerCase();
            if (!searchable.includes(searchText)) return false;
        }
        
        return true;
    });

    renderClientServices(filtered);
}

/**
 * 編輯客戶服務
 */
function editClientService(serviceId) {
    alert(`編輯服務配置功能開發中...\n服務 ID: ${serviceId}`);
    // TODO: 實現編輯模態框
}

/**
 * 查看服務歷史
 */
async function viewServiceHistory(serviceId) {
    alert(`查看執行歷史功能開發中...\n服務 ID: ${serviceId}`);
    // TODO: 實現歷史查看
}

/**
 * 測試生成任務
 */
async function testGenerateService(serviceId) {
    if (!confirm('確定要為此服務立即生成任務嗎？')) {
        return;
    }

    try {
        const response = await apiRequest(`/api/automated-tasks/generate/${serviceId}`, {
            method: 'POST'
        });
        
        showAlert(`成功生成任務: ${response.task_name || '未命名'}`, 'success');
    } catch (error) {
        showAlert('生成失敗: ' + error.message, 'error');
    }
}

/**
 * 切換服務啟用狀態
 */
async function toggleClientService(serviceId, enable) {
    try {
        const response = await apiRequest(`/api/client-services/${serviceId}/toggle`, {
            method: 'POST',
            body: { is_active: enable }
        });
        
        showAlert(enable ? '服務已啟用' : '服務已停用', 'success');
        
        // 重新載入列表
        await loadClientServices();
    } catch (error) {
        showAlert('操作失敗: ' + error.message, 'error');
    }
}

/**
 * 新增客戶服務
 */
function addNewClientService() {
    alert('新增服務配置功能開發中...');
    // TODO: 實現新增模態框
}

/**
 * 匯入 CSV
 */
function importClientServicesCSV() {
    alert('CSV 匯入功能開發中...');
    // TODO: 實現 CSV 匯入
}

