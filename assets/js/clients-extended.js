/*
 * 客戶詳細資料管理模組
 * 包含客戶擴展資料、服務排程、互動記錄、CSV 匯入
 */

// =========================================
// 初始化
// =========================================
let clientsExtendedData = [];
let serviceScheduleData = [];
let clientInteractionsData = [];
let currentEditingClient = null;
let currentClientExtendedData = null;

// 使用全局通知（common-utils.js 提供）

// 在主頁面初始化後調用
function initClientsExtended() {
    // 添加搜尋和篩選功能
    document.getElementById('clientExtendedSearch')?.addEventListener('input', filterClientsExtended);
    document.getElementById('statusFilter')?.addEventListener('change', filterClientsExtended);
}

// =========================================
// 載入客戶詳細資料
// =========================================
async function loadClientsExtended() {
    try {
        const container = document.getElementById('clientsExtendedTableContainer');
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                載入中...
            </div>
        `;

        const response = await apiRequest('/api/clients/extended');
        clientsExtendedData = response.data || [];
        
        renderClientsExtendedTable();
    } catch (error) {
        showNotification('載入失敗：' + error.message, 'error');
        document.getElementById('clientsExtendedTableContainer').innerHTML = `
            <div class="error-state">
                <span class="material-symbols-outlined">error</span>
                <p>載入失敗</p>
            </div>
        `;
    }
}

// =========================================
// 渲染表格
// =========================================
function renderClientsExtendedTable(data = clientsExtendedData) {
    const container = document.getElementById('clientsExtendedTableContainer');
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">inbox</span>
                <p>尚無客戶詳細資料</p>
                <p style="font-size: 14px; color: var(--text-secondary);">
                    請從「客戶管理」新增基本客戶後，再到此處編輯詳細資料
                </p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>客戶名稱</th>
                    <th>統一編號</th>
                    <th>聯絡人</th>
                    <th>電話</th>
                    <th>服務項目</th>
                    <th>月費</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(client => {
                    const services = [];
                    if (client.service_accounting) services.push('記帳');
                    if (client.service_tax_return) services.push('報稅');
                    if (client.service_income_tax) services.push('所得稅');
                    if (client.service_registration) services.push('登記');
                    if (client.service_withholding) services.push('扣繳');
                    if (client.service_prepayment) services.push('預估');
                    if (client.service_payroll) services.push('薪資');
                    if (client.service_annual_report) services.push('年報');
                    if (client.service_audit) services.push('審計');
                    
                    const statusBadge = {
                        'active': '<span class="badge badge-success">活躍</span>',
                        'inactive': '<span class="badge badge-secondary">停用</span>',
                        'potential': '<span class="badge badge-warning">潛在</span>'
                    }[client.status || 'active'] || '';
                    
                    return `
                        <tr>
                            <td><strong>${escapeHtml(client.client_name || client.name || '')}</strong></td>
                            <td>${escapeHtml(client.tax_id || '-')}</td>
                            <td>${escapeHtml(client.contact_person_1 || '-')}</td>
                            <td>${escapeHtml(client.phone || '-')}</td>
                            <td>
                                <div style="font-size: 12px;">
                                    ${services.length > 0 ? services.join('、') : '-'}
                                </div>
                            </td>
                            <td>$${(client.monthly_fee || 0).toLocaleString()}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="showEditClientExtendedModal('${escapeHtml(client.client_name || client.name)}')">
                                    <span class="material-symbols-outlined">edit</span>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// =========================================
// 搜尋和篩選
// =========================================
function filterClientsExtended() {
    const searchTerm = document.getElementById('clientExtendedSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter')?.value;
    
    let filtered = clientsExtendedData;
    
    // 搜尋
    if (searchTerm) {
        filtered = filtered.filter(client => {
            const name = (client.client_name || client.name || '').toLowerCase();
            const taxId = (client.tax_id || '').toLowerCase();
            return name.includes(searchTerm) || 
                   taxId.includes(searchTerm);
        });
    }
    
    // 狀態篩選
    if (statusFilter) {
        filtered = filtered.filter(client => (client.status || 'active') === statusFilter);
    }
    
    renderClientsExtendedTable(filtered);
}

// =========================================
// 新增客戶 Modal
// =========================================
async function showAddNewClientModal() {
    currentEditingClient = null;
    
    // 直接插入 modal HTML
    const container = document.getElementById('modalContainer');
    container.innerHTML = renderNewClientForm();
}

function renderNewClientForm() {
    return `
        <div class="modal active" id="newClientModal">
            <div class="modal-dialog" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>新增客戶</h2>
                    <button class="close-btn" onclick="closeNewClientModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div class="form-group">
                            <label>客戶名稱 *</label>
                            <input type="text" id="newClientName" placeholder="請輸入客戶名稱" required>
                        </div>
                        
                        <div class="form-group">
                            <label>統一編號 *</label>
                            <input type="text" id="newTaxId" placeholder="12345678" required>
                        </div>
                        
                        <div class="form-group">
                            <label>地區</label>
                            <select id="newRegion">
                                <option value="">請選擇</option>
                                <option value="台中">台中</option>
                                <option value="台北">台北</option>
                                <option value="其他">其他</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>聯絡人</label>
                            <input type="text" id="newContactPerson1">
                        </div>
                        
                        <div class="form-group">
                            <label>電話</label>
                            <input type="text" id="newPhone">
                        </div>
                        
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="newEmail">
                        </div>
                        
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>地址</label>
                            <input type="text" id="newAddress">
                        </div>
                        
                        <div class="form-group">
                            <label>月費</label>
                            <input type="number" id="newMonthlyFee" value="0" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label>狀態</label>
                            <select id="newClientStatus">
                                <option value="active">活躍</option>
                                <option value="inactive">停用</option>
                                <option value="potential">潛在客戶</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>服務項目</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceAccounting">
                                <span>記帳</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceTaxReturn">
                                <span>報稅</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceIncomeTax">
                                <span>所得稅申報</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceRegistration">
                                <span>登記</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceWithholding">
                                <span>扣繳</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServicePrepayment">
                                <span>預估</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServicePayroll">
                                <span>薪資</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceAnnualReport">
                                <span>年報</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="newServiceAudit">
                                <span>審計</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label>備註</label>
                        <textarea id="newClientNotes" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeNewClientModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveNewClient()">儲存</button>
                </div>
            </div>
        </div>
    `;
}

function closeNewClientModal() {
    const modal = document.getElementById('newClientModal');
    if (modal) {
        modal.remove();
    }
}

async function saveNewClient() {
    const clientName = document.getElementById('newClientName').value.trim();
    const taxId = document.getElementById('newTaxId').value.trim();
    
    if (!clientName || !taxId) {
        showNotification('請填寫客戶名稱和統一編號', 'error');
        return;
    }
    
    try {
        // 先創建基本客戶記錄
        await apiRequest('/api/clients', {
            method: 'POST',
            body: {
                name: clientName,
                contact_person: document.getElementById('newContactPerson1').value
            }
        });
        
        // 再創建詳細資料
        const data = {
            tax_id: taxId,
            contact_person_1: document.getElementById('newContactPerson1').value,
            contact_person_2: '',
            phone: document.getElementById('newPhone').value,
            email: document.getElementById('newEmail').value,
            address: document.getElementById('newAddress').value,
            monthly_fee: parseInt(document.getElementById('newMonthlyFee').value) || 0,
            region: document.getElementById('newRegion').value,
            status: document.getElementById('newClientStatus').value,
            service_accounting: document.getElementById('newServiceAccounting').checked,
            service_tax_return: document.getElementById('newServiceTaxReturn').checked,
            service_income_tax: document.getElementById('newServiceIncomeTax').checked,
            service_registration: document.getElementById('newServiceRegistration').checked,
            service_withholding: document.getElementById('newServiceWithholding').checked,
            service_prepayment: document.getElementById('newServicePrepayment').checked,
            service_payroll: document.getElementById('newServicePayroll').checked,
            service_annual_report: document.getElementById('newServiceAnnualReport').checked,
            service_audit: document.getElementById('newServiceAudit').checked,
            notes: document.getElementById('newClientNotes').value
        };
        
        await apiRequest(`/api/clients/${encodeURIComponent(clientName)}/extended`, {
            method: 'POST',
            body: data
        });
        
        showNotification('新增成功', 'success');
        closeNewClientModal();
        loadClientsExtended();
    } catch (error) {
        showNotification('新增失敗：' + error.message, 'error');
    }
}

// =========================================
// 編輯客戶詳細資料 Modal
// =========================================
async function showEditClientExtendedModal(clientName) {
    try {
        // 載入客戶資料
        const response = await apiRequest(`/api/clients/${encodeURIComponent(clientName)}/extended`);
        const client = response.data || {};
        currentEditingClient = clientName;
        currentClientExtendedData = client;
        
        // 載入服務排程
        const scheduleResponse = await apiRequest(`/api/service-schedule?client=${encodeURIComponent(clientName)}`);
        serviceScheduleData = scheduleResponse.data || [];
        
        // 載入互動記錄
        const interactionsResponse = await apiRequest(`/api/client-interactions?client=${encodeURIComponent(clientName)}`);
        clientInteractionsData = interactionsResponse.data || [];
        
        // 直接插入 modal HTML
        const container = document.getElementById('modalContainer');
        container.innerHTML = renderEditClientExtendedForm(client, clientName);
    } catch (error) {
        showNotification('載入客戶資料失敗: ' + error.message, 'error');
    }
}

function renderEditClientExtendedForm(client, clientName) {
    return `
        <div class="modal active" id="editClientExtendedModal">
            <div class="modal-dialog" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>${escapeHtml(clientName)} - 詳細資料</h2>
                    <button class="close-btn" onclick="closeClientExtendedModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <!-- 標籤導航 -->
                    <div class="tab-nav" style="margin-bottom: 20px; border-bottom: 2px solid var(--light-bg);">
                        <button class="tab-button active" data-tab="basic-info" onclick="switchModalTab('basic-info')">基本資料</button>
                        <button class="tab-button" data-tab="service-schedule" onclick="switchModalTab('service-schedule')">服務排程</button>
                        <button class="tab-button" data-tab="interactions" onclick="switchModalTab('interactions')">互動記錄</button>
                    </div>
                    
                    <!-- 基本資料 -->
                    <div id="basic-info-content" class="modal-tab-content active">
                        <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div class="form-group">
                                <label>統一編號 *</label>
                                <input type="text" id="taxId" value="${escapeHtml(client.tax_id || '')}" placeholder="12345678">
                            </div>
                            
                            <div class="form-group">
                                <label>地區</label>
                                <select id="region">
                                    <option value="">請選擇</option>
                                    <option value="台中" ${client.region === '台中' ? 'selected' : ''}>台中</option>
                                    <option value="台北" ${client.region === '台北' ? 'selected' : ''}>台北</option>
                                    <option value="其他" ${client.region === '其他' ? 'selected' : ''}>其他</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>聯絡人 1</label>
                                <input type="text" id="contactPerson1" value="${escapeHtml(client.contact_person_1 || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label>聯絡人 2</label>
                                <input type="text" id="contactPerson2" value="${escapeHtml(client.contact_person_2 || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label>電話</label>
                                <input type="text" id="phone" value="${escapeHtml(client.phone || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="email" value="${escapeHtml(client.email || '')}">
                            </div>
                            
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label>地址</label>
                                <input type="text" id="address" value="${escapeHtml(client.address || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label>月費</label>
                                <input type="number" id="monthlyFee" value="${client.monthly_fee || 0}" min="0">
                            </div>
                            
                            <div class="form-group">
                                <label>狀態</label>
                                <select id="clientStatus">
                                    <option value="active" ${(client.status || 'active') === 'active' ? 'selected' : ''}>活躍</option>
                                    <option value="inactive" ${client.status === 'inactive' ? 'selected' : ''}>停用</option>
                                    <option value="potential" ${client.status === 'potential' ? 'selected' : ''}>潛在客戶</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px;">
                            <label>服務項目</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceAccounting" ${client.service_accounting ? 'checked' : ''}>
                                    <span>記帳</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceTaxReturn" ${client.service_tax_return ? 'checked' : ''}>
                                    <span>報稅</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceIncomeTax" ${client.service_income_tax ? 'checked' : ''}>
                                    <span>所得稅申報</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceRegistration" ${client.service_registration ? 'checked' : ''}>
                                    <span>登記</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceWithholding" ${client.service_withholding ? 'checked' : ''}>
                                    <span>扣繳</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="servicePrepayment" ${client.service_prepayment ? 'checked' : ''}>
                                    <span>預估</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="servicePayroll" ${client.service_payroll ? 'checked' : ''}>
                                    <span>薪資</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceAnnualReport" ${client.service_annual_report ? 'checked' : ''}>
                                    <span>年報</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="serviceAudit" ${client.service_audit ? 'checked' : ''}>
                                    <span>審計</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-top: 15px;">
                            <label>備註</label>
                            <textarea id="clientNotes" rows="3">${escapeHtml(client.notes || '')}</textarea>
                        </div>
                    </div>
                    
                    <!-- 服務排程 -->
                    <div id="service-schedule-content" class="modal-tab-content" style="display: none;">
                        <button class="btn btn-sm btn-primary" onclick="showAddServiceScheduleForm()" style="margin-bottom: 15px;">
                            <span class="material-symbols-outlined">add</span>
                            新增排程
                        </button>
                        <div id="serviceScheduleList">
                            ${renderServiceScheduleList()}
                        </div>
                    </div>
                    
                    <!-- 互動記錄 -->
                    <div id="interactions-content" class="modal-tab-content" style="display: none;">
                        <button class="btn btn-sm btn-primary" onclick="showAddInteractionForm()" style="margin-bottom: 15px;">
                            <span class="material-symbols-outlined">add</span>
                            新增記錄
                        </button>
                        <div id="interactionsList">
                            ${renderInteractionsList()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeClientExtendedModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveClientExtended()">儲存</button>
                </div>
            </div>
        </div>
    `;
}

// Modal 內的標籤切換
function switchModalTab(tabName) {
    // 切換標籤按鈕
    document.querySelectorAll('#editClientExtendedModal .tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#editClientExtendedModal [data-tab="${tabName}"]`).classList.add('active');
    
    // 切換內容
    document.querySelectorAll('#editClientExtendedModal .modal-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}-content`).style.display = 'block';
}

// 關閉 Modal
function closeClientExtendedModal() {
    const modal = document.getElementById('editClientExtendedModal');
    if (modal) {
        modal.remove();
    }
    currentEditingClient = null;
}

// =========================================
// 儲存客戶詳細資料
// =========================================
async function saveClientExtended() {
    try {
        const data = {
            tax_id: document.getElementById('taxId').value,
            contact_person_1: document.getElementById('contactPerson1').value,
            contact_person_2: document.getElementById('contactPerson2').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            monthly_fee: parseInt(document.getElementById('monthlyFee').value) || 0,
            region: document.getElementById('region').value,
            status: document.getElementById('clientStatus').value,
            service_accounting: document.getElementById('serviceAccounting').checked,
            service_tax_return: document.getElementById('serviceTaxReturn').checked,
            service_income_tax: document.getElementById('serviceIncomeTax').checked,
            service_registration: document.getElementById('serviceRegistration').checked,
            service_withholding: document.getElementById('serviceWithholding').checked,
            service_prepayment: document.getElementById('servicePrepayment').checked,
            service_payroll: document.getElementById('servicePayroll').checked,
            service_annual_report: document.getElementById('serviceAnnualReport').checked,
            service_audit: document.getElementById('serviceAudit').checked,
            notes: document.getElementById('clientNotes').value
        };
        
        await apiRequest(`/api/clients/${encodeURIComponent(currentEditingClient)}/extended`, {
            method: 'POST',
            body: data
        });
        
        showNotification('儲存成功', 'success');
        closeClientExtendedModal();
        loadClientsExtended();
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

// =========================================
// 服務排程相關
// =========================================
function renderServiceScheduleList() {
    if (!serviceScheduleData || serviceScheduleData.length === 0) {
        return '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">尚無服務排程</p>';
    }
    
    return serviceScheduleData.map(schedule => {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            if (schedule[`month_${i}`]) {
                months.push(i + '月');
            }
        }
        
        return `
            <div class="service-schedule-card" style="border: 1px solid var(--border-color); border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0 0 10px 0;">${escapeHtml(schedule.service_type)}</h4>
                        <p style="margin: 5px 0; color: var(--text-secondary); font-size: 14px;">
                            頻率: ${escapeHtml(schedule.frequency || '每月')} | 月費: $${(schedule.monthly_fee || 0).toLocaleString()}
                        </p>
                        <p style="margin: 5px 0; font-size: 14px;">
                            服務月份: ${months.join('、') || '無'}
                        </p>
                        ${schedule.service_details ? `<p style="margin: 5px 0; font-size: 14px;">詳情: ${escapeHtml(schedule.service_details)}</p>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick='editServiceSchedule(${JSON.stringify(schedule).replace(/'/g, "&#39;")})' title="編輯">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteServiceSchedule(${schedule.id})" title="刪除">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAddServiceScheduleForm() {
    showServiceScheduleEditor(null);
}

function editServiceSchedule(schedule) {
    showServiceScheduleEditor(schedule);
}

function showServiceScheduleEditor(schedule = null) {
    const isEdit = schedule !== null;
    const title = isEdit ? '編輯服務排程' : '新增服務排程';
    
    const modal = `
        <div class="modal active" id="serviceScheduleEditorModal">
            <div class="modal-dialog" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-btn" onclick="closeServiceScheduleEditor()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${isEdit ? `<input type="hidden" id="scheduleId" value="${schedule.id}">` : ''}
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>服務類型 *</label>
                            <input type="text" id="scheduleServiceType" value="${escapeHtml(schedule?.service_type || '')}" required>
                        </div>
                        <div class="form-group">
                            <label>頻率</label>
                            <select id="scheduleFrequency">
                                <option value="每月" ${schedule?.frequency === '每月' ? 'selected' : ''}>每月</option>
                                <option value="每兩月" ${schedule?.frequency === '每兩月' ? 'selected' : ''}>每兩月</option>
                                <option value="每季" ${schedule?.frequency === '每季' ? 'selected' : ''}>每季</option>
                                <option value="半年" ${schedule?.frequency === '半年' ? 'selected' : ''}>半年</option>
                                <option value="每年" ${schedule?.frequency === '每年' ? 'selected' : ''}>每年</option>
                                <option value="不定期" ${schedule?.frequency === '不定期' ? 'selected' : ''}>不定期</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>月費</label>
                            <input type="number" id="scheduleMonthlyFee" value="${schedule?.monthly_fee || 0}" min="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>服務月份（勾選執行月份）</label>
                        <div class="month-selector" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 10px;">
                            ${Array.from({length: 12}, (_, i) => i + 1).map(month => `
                                <label class="checkbox-card" style="display: flex; flex-direction: column; align-items: center; padding: 15px; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                    <input type="checkbox" id="month_${month}" ${schedule?.[`month_${month}`] ? 'checked' : ''} style="margin-bottom: 8px; transform: scale(1.3);">
                                    <span style="font-weight: 600; font-size: 14px;">${month}月</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>服務詳情</label>
                        <textarea id="scheduleServiceDetails" rows="2">${escapeHtml(schedule?.service_details || '')}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>備註</label>
                        <textarea id="scheduleNotes" rows="2">${escapeHtml(schedule?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeServiceScheduleEditor()">取消</button>
                    <button class="btn btn-primary" onclick="saveServiceSchedule(${isEdit})">
                        <span class="material-symbols-outlined">save</span>
                        儲存
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    
    // 添加月份勾選框的視覺效果
    document.querySelectorAll('.checkbox-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.checkbox-card');
            if (this.checked) {
                card.style.borderColor = 'var(--primary-color)';
                card.style.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(90, 158, 229, 0.05))';
                card.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.2)';
            } else {
                card.style.borderColor = 'var(--border-color)';
                card.style.background = 'white';
                card.style.boxShadow = 'none';
            }
        });
        // 初始化樣式
        checkbox.dispatchEvent(new Event('change'));
    });
}

function closeServiceScheduleEditor() {
    const modal = document.getElementById('serviceScheduleEditorModal');
    if (modal) {
        modal.remove();
    }
}

async function saveServiceSchedule(isEdit) {
    try {
        const data = {
            tax_id: currentClientExtendedData?.tax_id || '',
            client_name: currentEditingClient,
            service_type: document.getElementById('scheduleServiceType').value,
            frequency: document.getElementById('scheduleFrequency').value,
            monthly_fee: parseInt(document.getElementById('scheduleMonthlyFee').value) || 0,
            service_details: document.getElementById('scheduleServiceDetails').value,
            notes: document.getElementById('scheduleNotes').value
        };
        
        // 12個月的勾選狀態
        for (let i = 1; i <= 12; i++) {
            data[`month_${i}`] = document.getElementById(`month_${i}`).checked;
        }
        
        if (!data.service_type) {
            showNotification('請輸入服務類型', 'error');
            return;
        }
        
        if (isEdit) {
            const scheduleId = document.getElementById('scheduleId').value;
            await apiRequest(`/api/service-schedule/${scheduleId}`, {
                method: 'PUT',
                body: data
            });
        } else {
            await apiRequest('/api/service-schedule', {
                method: 'POST',
                body: data
            });
        }
        
        showNotification('儲存成功', 'success');
        closeServiceScheduleEditor();
        
        // 重新載入客戶資料
        await showEditClientExtendedModal(currentEditingClient);
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

async function deleteServiceSchedule(scheduleId) {
    if (!confirm('確定要刪除此服務排程嗎？')) return;
    
    try {
        await apiRequest(`/api/service-schedule/${scheduleId}`, {
            method: 'DELETE'
        });
        
        showNotification('刪除成功', 'success');
        // 重新載入
        await showEditClientExtendedModal(currentEditingClient);
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =========================================
// 互動記錄相關
// =========================================
function renderInteractionsList() {
    if (!clientInteractionsData || clientInteractionsData.length === 0) {
        return '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">尚無互動記錄</p>';
    }
    
    return clientInteractionsData.map(interaction => {
        const typeLabels = {
            'meeting': '會議',
            'phone': '電話',
            'email': '郵件',
            'service': '服務'
        };
        
        return `
            <div class="interaction-card" style="border-left: 3px solid var(--primary-color); padding: 15px; margin-bottom: 10px; background: var(--light-bg); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span class="badge badge-primary">${typeLabels[interaction.interaction_type] || interaction.interaction_type}</span>
                            <span style="color: var(--text-secondary); font-size: 14px;">${interaction.interaction_date}</span>
                        </div>
                        ${interaction.subject ? `<h4 style="margin: 0 0 8px 0;">${escapeHtml(interaction.subject)}</h4>` : ''}
                        ${interaction.content ? `<p style="margin: 0; font-size: 14px; color: var(--text-secondary);">${escapeHtml(interaction.content)}</p>` : ''}
                        ${interaction.handled_by ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: var(--text-secondary);">處理人: ${escapeHtml(interaction.handled_by)}</p>` : ''}
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteClientInteraction(${interaction.id})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddInteractionForm() {
    showInteractionEditor(null);
}

function showInteractionEditor(interaction = null) {
    const isEdit = interaction !== null;
    const title = isEdit ? '編輯互動記錄' : '新增互動記錄';
    
    const modal = `
        <div class="modal active" id="interactionEditorModal">
            <div class="modal-dialog" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-btn" onclick="closeInteractionEditor()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${isEdit ? `<input type="hidden" id="interactionId" value="${interaction.id}">` : ''}
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>類型 *</label>
                            <select id="interactionType">
                                <option value="meeting" ${interaction?.interaction_type === 'meeting' ? 'selected' : ''}>會議</option>
                                <option value="phone" ${interaction?.interaction_type === 'phone' ? 'selected' : ''}>電話</option>
                                <option value="email" ${interaction?.interaction_type === 'email' ? 'selected' : ''}>郵件</option>
                                <option value="service" ${interaction?.interaction_type === 'service' ? 'selected' : ''}>服務</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>日期 *</label>
                            <input type="date" id="interactionDate" value="${interaction?.interaction_date || new Date().toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>主旨</label>
                        <input type="text" id="interactionSubject" value="${escapeHtml(interaction?.subject || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label>內容</label>
                        <textarea id="interactionContent" rows="4">${escapeHtml(interaction?.content || '')}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>處理人</label>
                        <input type="text" id="interactionHandledBy" value="${escapeHtml(interaction?.handled_by || '')}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeInteractionEditor()">取消</button>
                    <button class="btn btn-primary" onclick="saveInteraction(${isEdit})">
                        <span class="material-symbols-outlined">save</span>
                        儲存
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function closeInteractionEditor() {
    const modal = document.getElementById('interactionEditorModal');
    if (modal) {
        modal.remove();
    }
}

async function saveInteraction(isEdit) {
    try {
        const data = {
            client_name: currentEditingClient,
            interaction_type: document.getElementById('interactionType').value,
            interaction_date: document.getElementById('interactionDate').value,
            subject: document.getElementById('interactionSubject').value,
            content: document.getElementById('interactionContent').value,
            handled_by: document.getElementById('interactionHandledBy').value
        };
        
        if (!data.interaction_date) {
            showNotification('請選擇日期', 'error');
            return;
        }
        
        if (isEdit) {
            const interactionId = document.getElementById('interactionId').value;
            await apiRequest(`/api/client-interactions/${interactionId}`, {
                method: 'PUT',
                body: data
            });
        } else {
            await apiRequest('/api/client-interactions', {
                method: 'POST',
                body: data
            });
        }
        
        showNotification('儲存成功', 'success');
        closeInteractionEditor();
        
        // 重新載入客戶資料
        await showEditClientExtendedModal(currentEditingClient);
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

async function deleteClientInteraction(interactionId) {
    if (!confirm('確定要刪除此互動記錄嗎？')) return;
    
    try {
        await apiRequest(`/api/client-interactions/${interactionId}`, {
            method: 'DELETE'
        });
        
        showNotification('刪除成功', 'success');
        // 重新載入
        await showEditClientExtendedModal(currentEditingClient);
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =========================================
// CSV 匯入功能
// =========================================
function showImportCSVModal() {
    const modal = `
        <div class="modal active" id="importCSVModal">
            <div class="modal-dialog" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>匯入客戶資料（CSV）</h2>
                    <button class="close-btn" onclick="closeImportModal()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="info-box" style="margin-bottom: 20px;">
                        <span class="material-symbols-outlined">info</span>
                        <div>
                            <p><strong>匯入說明：</strong></p>
                            <p>1. 下載 CSV 模板並填寫客戶資料</p>
                            <p>2. 服務項目欄位請填「是」或「否」</p>
                            <p>3. 狀態可填：active（活躍）、inactive（停用）、potential（潛在）</p>
                            <p>4. <strong style="color: #f44336;">匯入模式：自動合併（已存在則更新，不存在則新增）</strong></p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button class="btn btn-secondary" onclick="downloadTemplate()">
                            <span class="material-symbols-outlined">download</span>
                            下載 CSV 模板
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label>選擇 CSV 檔案</label>
                        <input type="file" id="csvFileInput" accept=".csv" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; width: 100%;">
                    </div>

                    <div class="form-group" style="margin-top: 10px;">
                        <label>
                            <input type="checkbox" id="csvIsSchedule"> 這份 CSV 來自活頁簿2（服務排程），匯入月度任務
                        </label>
                    </div>
                    
                    <div id="csvPreview" style="display: none; margin-top: 20px;">
                        <h4>預覽（前 5 筆）</h4>
                        <div id="csvPreviewContent" style="max-height: 200px; overflow: auto; background: var(--light-bg); padding: 10px; border-radius: 4px; font-size: 12px;"></div>
                        <p style="margin-top: 10px; color: var(--text-secondary);" id="csvCount"></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeImportModal()">取消</button>
                    <button class="btn btn-primary" id="importBtn" onclick="executeImport()" disabled>開始匯入</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // 綁定檔案選擇事件
    document.getElementById('csvFileInput').addEventListener('change', handleCSVFileSelect);
}

function closeImportModal() {
    const modal = document.getElementById('importCSVModal');
    if (modal) modal.remove();
}

function downloadTemplate() {
    const csv = `客戶名稱,統一編號,地區,聯絡人1,聯絡人2,電話,Email,地址,月費,狀態,服務_記帳,服務_報稅,服務_所得稅,服務_登記,服務_扣繳,服務_預估,服務_薪資,服務_年報,服務_審計,備註
範例公司,12345678,台中,王小明,李小華,04-12345678,example@example.com,台中市西區五權路100號,5000,active,是,是,否,否,是,是,否,是,否,這是範例資料`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '客戶匯入模板.csv';
    link.click();
}

let parsedCSVData = [];

function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parsedCSVData = parseCSV(text);
        
        if (parsedCSVData.length === 0) {
            showNotification('CSV 檔案為空或格式錯誤', 'error');
            return;
        }
        
        // 顯示預覽
        const preview = parsedCSVData.slice(0, 5);
        const previewHTML = `
            <table style="width: 100%; font-size: 11px;">
                <tr style="background: white;">
                    <th>客戶名稱</th>
                    <th>統編</th>
                    <th>地區</th>
                    <th>聯絡人</th>
                    <th>狀態</th>
                </tr>
                ${preview.map(row => `
                    <tr>
                        <td>${escapeHtml(row.client_name)}</td>
                        <td>${escapeHtml(row.tax_id)}</td>
                        <td>${escapeHtml(row.region)}</td>
                        <td>${escapeHtml(row.contact_person_1)}</td>
                        <td>${escapeHtml(row.status)}</td>
                    </tr>
                `).join('')}
            </table>
        `;
        
        document.getElementById('csvPreviewContent').innerHTML = previewHTML;
        document.getElementById('csvCount').textContent = `共 ${parsedCSVData.length} 筆資料（自動合併模式：已存在則更新，不存在則新增）`;
        document.getElementById('csvPreview').style.display = 'block';
        document.getElementById('importBtn').disabled = false;
    };
    reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {
            client_name: values[0]?.trim() || '',
            tax_id: values[1]?.trim() || '',
            region: values[2]?.trim() || '',
            contact_person_1: values[3]?.trim() || '',
            contact_person_2: values[4]?.trim() || '',
            phone: values[5]?.trim() || '',
            email: values[6]?.trim() || '',
            address: values[7]?.trim() || '',
            monthly_fee: parseInt(values[8]) || 0,
            status: values[9]?.trim() || 'active',
            service_accounting: values[10]?.trim() === '是',
            service_tax_return: values[11]?.trim() === '是',
            service_income_tax: values[12]?.trim() === '是',
            service_registration: values[13]?.trim() === '是',
            service_withholding: values[14]?.trim() === '是',
            service_prepayment: values[15]?.trim() === '是',
            service_payroll: values[16]?.trim() === '是',
            service_annual_report: values[17]?.trim() === '是',
            service_audit: values[18]?.trim() === '是',
            notes: values[19]?.trim() || ''
        };
        
        if (row.client_name && row.tax_id) {
            data.push(row);
        }
    }
    
    return data;
}

async function executeImport() {
    if (parsedCSVData.length === 0) {
        showNotification('沒有資料可匯入', 'error');
        return;
    }
    
    if (!confirm(`確定要匯入 ${parsedCSVData.length} 筆客戶資料嗎？\n\n匯入模式：自動合併\n- 客戶已存在 → 更新資料\n- 客戶不存在 → 新增資料`)) {
        return;
    }
    
    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;
    importBtn.textContent = '匯入中...';
    
    try {
        const isSchedule = document.getElementById('csvIsSchedule')?.checked;
        let importResponse;
        if (isSchedule) {
            // 轉換活頁簿2格式（活頁簿2.csv 的 parse 在 scripts 內；此處提供簡化版以支援直接上傳 UTF-8 CSV）
            const scheduleRecords = parsedCSVData.map(r => ({
                tax_id: r.tax_id || '',
                client_name: r.client_name,
                service_type: r.service_type || '定期服務',
                frequency: r.frequency || '每月',
                monthly_fee: r.monthly_fee || 0,
                months: r.months || {},
                service_details: r.service_details || '',
                notes: r.notes || ''
            }));
            importResponse = await apiRequest('/api/import/service-schedule', {
                method: 'POST',
                body: { records: scheduleRecords }
            });
            showNotification(`匯入完成！成功：${importResponse.successCount} 筆；失敗：${importResponse.errorCount} 筆`, 'success');
        } else {
            importResponse = await apiRequest('/api/import/clients', {
                method: 'POST',
                body: { records: parsedCSVData }
            });
            showNotification(`匯入完成！成功：${importResponse.successCount} 筆；失敗：${importResponse.errorCount} 筆`, 'success');
        }
        
        if (importResponse && importResponse.errors && importResponse.errors.length > 0) {
            console.error('匯入錯誤：', importResponse.errors);
        }
        
        closeImportModal();
        loadClientsExtended();
    } catch (error) {
        showNotification('匯入失敗：' + error.message, 'error');
        importBtn.disabled = false;
        importBtn.textContent = '開始匯入';
    }
}

// =========================================
// 工具函數
// =========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 導出函數供全域使用
window.initClientsExtended = initClientsExtended;
window.loadClientsExtended = loadClientsExtended;
window.showAddNewClientModal = showAddNewClientModal;
window.closeNewClientModal = closeNewClientModal;
window.saveNewClient = saveNewClient;
window.showEditClientExtendedModal = showEditClientExtendedModal;
window.closeClientExtendedModal = closeClientExtendedModal;
window.switchModalTab = switchModalTab;
window.saveClientExtended = saveClientExtended;
window.showAddServiceScheduleForm = showAddServiceScheduleForm;
window.deleteServiceSchedule = deleteServiceSchedule;
window.showAddInteractionForm = showAddInteractionForm;
window.deleteClientInteraction = deleteClientInteraction;
window.showImportCSVModal = showImportCSVModal;
window.closeImportModal = closeImportModal;
window.downloadTemplate = downloadTemplate;
window.executeImport = executeImport;

