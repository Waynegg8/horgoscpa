/**
 * 客戶服務配置管理
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let allServices = [];
let allClients = [];
let allEmployees = [];

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    await loadClientsAndEmployees();
    await loadServices();
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
// 載入服務配置
// =========================================
async function loadServices() {
    const category = document.getElementById('categoryFilter').value;
    
    try {
        let url = '/api/services/clients';
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        
        const response = await apiRequest(url);
        allServices = response.services || [];
        displayServices(allServices);
    } catch (error) {
        console.error('載入服務配置失敗:', error);
        alert('載入失敗: ' + error.message);
    }
}

function displayServices(services) {
    const grid = document.getElementById('serviceGrid');
    
    if (services.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">沒有服務配置</div>';
        return;
    }
    
    grid.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="service-header">
                <div>
                    <div class="client-name">${escapeHtml(service.client_name)}</div>
                    <div class="service-name">${escapeHtml(service.service_name)}</div>
                </div>
                <span class="category-badge category-${service.service_category}">
                    ${service.service_category}
                </span>
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

function filterServices() {
    const searchText = document.getElementById('clientSearch').value.toLowerCase();
    const filtered = allServices.filter(service => 
        service.client_name.toLowerCase().includes(searchText) ||
        service.service_name.toLowerCase().includes(searchText)
    );
    displayServices(filtered);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// 載入客戶和員工資料
// =========================================
async function loadClientsAndEmployees() {
    try {
        // 載入客戶
        const clientsResponse = await apiRequest('/api/clients');
        allClients = clientsResponse || [];
        
        // 載入員工
        const employeesResponse = await apiRequest('/api/employees');
        allEmployees = employeesResponse || [];
    } catch (error) {
        console.error('載入客戶/員工資料失敗:', error);
    }
}

// =========================================
// 服務配置對話框
// =========================================
function showServiceDialog(serviceId = null) {
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
    
    dialog.style.display = 'flex';
}

function closeServiceDialog() {
    document.getElementById('serviceDialog').style.display = 'none';
}

async function saveService() {
    const serviceId = document.getElementById('serviceId').value;
    const clientName = document.getElementById('clientName').value;
    const serviceName = document.getElementById('serviceName').value;
    const serviceCategory = document.getElementById('serviceCategory').value;
    const assignedTo = document.getElementById('assignedTo').value;
    
    if (!clientName || !serviceName || !serviceCategory || !assignedTo) {
        alert('請填寫所有必填欄位');
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
        alert('請至少選擇一個執行月份');
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
        closeServiceDialog();
        await loadServices();
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

async function deleteService(serviceId) {
    if (!confirm('確定要刪除此服務配置嗎？\n\n注意：刪除後無法恢復，且會影響相關的週期性任務生成。')) {
        return;
    }
    
    try {
        await apiRequest(`/api/services/${serviceId}`, {
            method: 'DELETE'
        });
        
        showNotification('刪除成功', 'success');
        await loadServices();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =========================================
// 月份選擇輔助函數
// =========================================
function selectAllMonths() {
    document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllMonths() {
    document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = false);
}

function selectQuarterMonths() {
    // 選擇每季末月：3, 6, 9, 12
    document.querySelectorAll('.month-checkbox').forEach(cb => {
        const month = parseInt(cb.dataset.month);
        cb.checked = (month % 3 === 0);
    });
}

// =========================================
// 通知功能
// =========================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
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

