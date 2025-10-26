/**
 * 共用認證模組
 * 提供統一的認證檢查、用戶信息更新等功能
 * 避免在每個頁面重複相同代碼
 */

const SESSION_TOKEN_KEY = 'session_token';

let sessionToken = null;
let currentUser = null;

// 從 CONFIG 獲取 API URL（需要先載入 config.js）
function getAPIBaseURL() {
    return window.CONFIG?.API_BASE || 'https://timesheet-api.hergscpa.workers.dev';
}

/**
 * 檢查認證狀態
 * @returns {Promise<boolean>} 是否已登入
 */
async function checkAuth() {
    sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${getAPIBaseURL()}/api/verify`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserInfo();
            updateUIByRole();
            return true;
        }
    } catch (err) {
        console.error('驗證失敗:', err);
    }
    
    return false;
}

/**
 * 更新使用者資訊顯示
 */
function updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    
    if (currentUser && userNameEl && userRoleEl) {
        const displayName = currentUser.employee_name || currentUser.username;
        const roleText = currentUser.role === 'admin' ? '管理員' : '員工';
        userNameEl.textContent = displayName;
        userRoleEl.textContent = roleText;
    }
}

/**
 * 根據角色更新UI
 */
function updateUIByRole() {
    if (!currentUser) return;
    
    // 顯示管理員專屬元素
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
    } else {
        // 隱藏管理員專屬元素
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

/**
 * 統一的API請求函數
 * @param {string} url - API端點路徑（可以是完整URL或相對路徑）
 * @param {object} options - fetch選項
 * @param {number} timeout - 超時時間（毫秒）
 * @returns {Promise<any>} API響應數據
 */
async function apiRequest(url, options = {}, timeout = 30000) {
    // 確保使用完整URL
    const fullUrl = url.startsWith('http') ? url : `${getAPIBaseURL()}${url}`;
    
    // 添加認證標頭
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        ...options.headers
    };
    
    // 自動序列化JSON body
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }
    
    // 添加超時控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 處理401未授權
        if (response.status === 401) {
            localStorage.removeItem(SESSION_TOKEN_KEY);
            localStorage.removeItem('user_info');
            window.location.href = '/login.html';
            throw new Error('未授權，請重新登入');
        }
        
        // 處理其他錯誤
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || error.message || `請求失敗 (${response.status})`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('請求超時，請檢查網絡連接');
        }
        
        throw error;
    }
}

/**
 * 登出功能
 */
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    try {
        await apiRequest('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error('登出錯誤:', err);
    }
    
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem('user_info');
    window.location.href = '/login.html';
}

/**
 * 初始化移動端選單
 */
function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        // 點擊外部關閉選單
        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }
}

/**
 * 初始化登出按鈕
 */
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * 頁面初始化（統一入口）
 * @param {Function} callback - 認證成功後的回調函數
 */
async function initPage(callback) {
    // 檢查認證
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        window.location.href = '/login.html';
        return;
    }
    
    // 初始化移動端選單
    initMobileMenu();
    
    // 初始化登出按鈕
    initLogoutButton();
    
    // 執行頁面特定的初始化
    if (callback && typeof callback === 'function') {
        await callback();
    }
}

// 導出供全局使用
window.checkAuth = checkAuth;
window.updateUserInfo = updateUserInfo;
window.updateUIByRole = updateUIByRole;
window.apiRequest = apiRequest;
window.handleLogout = handleLogout;
window.initMobileMenu = initMobileMenu;
window.initLogoutButton = initLogoutButton;
window.initPage = initPage;
window.getAPIBaseURL = getAPIBaseURL;
window.SESSION_TOKEN_KEY = SESSION_TOKEN_KEY;
// 為了向後兼容，也導出 WORKER_URL（從 CONFIG 獲取）
Object.defineProperty(window, 'WORKER_URL', {
    get: function() { return getAPIBaseURL(); }
});

