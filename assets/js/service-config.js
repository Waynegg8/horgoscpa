/**
 * 客戶服務配置管理
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let allServices = [];

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
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

