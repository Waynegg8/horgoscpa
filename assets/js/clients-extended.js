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

// 通知函數
function showNotification(message, type = 'info') {
    alert(message);
}

// 在主頁面初始化後調用
function initClientsExtended() {
    // 添加搜尋和篩選功能
    document.getElementById('clientExtendedSearch')?.addEventListener('input', filterClientsExtended);
    document.getElementById('regionFilter')?.addEventListener('change', filterClientsExtended);
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
        alert('載入失敗: ' + error.message);
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
                    <th>地區</th>
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
                            <td>${escapeHtml(client.region || '-')}</td>
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
    const regionFilter = document.getElementById('regionFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = clientsExtendedData;
    
    // 搜尋
    if (searchTerm) {
        filtered = filtered.filter(client => {
            const name = (client.client_name || client.name || '').toLowerCase();
            const taxId = (client.tax_id || '').toLowerCase();
            const region = (client.region || '').toLowerCase();
            return name.includes(searchTerm) || 
                   taxId.includes(searchTerm) || 
                   region.includes(searchTerm);
        });
    }
    
    // 地區篩選
    if (regionFilter) {
        filtered = filtered.filter(client => client.region === regionFilter);
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
        alert('請填寫客戶名稱和統一編號');
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
        
        alert('新增成功');
        closeNewClientModal();
        loadClientsExtended();
    } catch (error) {
        alert('新增失敗: ' + error.message);
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
                    <button class="btn btn-sm btn-danger" onclick="deleteServiceSchedule(${schedule.id})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddServiceScheduleForm() {
    // 簡化版：直接用 prompt（之後可以改成完整的 modal）
    const serviceType = prompt('服務類型:');
    if (!serviceType) return;
    
    // 這裡可以創建一個完整的表單，暫時簡化
    showNotification('請在專案後續開發中實作完整的服務排程編輯器', 'info');
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
    showNotification('請在專案後續開發中實作完整的互動記錄編輯器', 'info');
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
    showNotification('CSV 匯入功能將在後續實作', 'info');
    // TODO: 實作 CSV 上傳和解析
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

