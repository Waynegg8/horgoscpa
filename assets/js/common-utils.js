/**
 * 共用工具函數模組
 * 提供日期格式化、HTML轉義等常用功能
 */

/**
 * HTML轉義（防止XSS攻擊）
 * @param {string} text - 要轉義的文本
 * @returns {string} 轉義後的HTML安全文本
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 格式化日期為本地格式
 * @param {string|Date} dateString - 日期字符串或Date對象
 * @returns {string} 格式化後的日期
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('zh-TW');
}

/**
 * 格式化日期時間
 * @param {string|Date} dateString - 日期時間字符串
 * @returns {string} 格式化後的日期時間
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString('zh-TW');
}

/**
 * 格式化截止日期（顯示相對時間）
 * @param {string} dateStr - 截止日期
 * @returns {string} 格式化後的文本
 */
function formatDueDate(dateStr) {
    if (!dateStr) return '無截止日期';
    
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
    if (diffDays === 0) return '今天截止';
    if (diffDays === 1) return '明天截止';
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    
    return date.toLocaleDateString('zh-TW');
}

/**
 * 檢查日期是否已過期
 * @param {string} dateStr - 日期字符串
 * @returns {boolean} 是否過期
 */
function isPastDue(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字節數
 * @returns {string} 格式化後的大小
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 顯示通知訊息
 * @param {string} message - 訊息內容
 * @param {string} type - 類型：success, error, warning, info
 * @param {number} duration - 顯示時長（毫秒）
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 16px 20px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
    `;
    
    notification.innerHTML = `
        <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// CSS動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * 防抖函數
 * @param {Function} func - 要防抖的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 防抖後的函數
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 節流函數
 * @param {Function} func - 要節流的函數
 * @param {number} limit - 限制時間（毫秒）
 * @returns {Function} 節流後的函數
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深拷貝對象
 * @param {any} obj - 要拷貝的對象
 * @returns {any} 拷貝後的對象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 從localStorage安全讀取JSON
 * @param {string} key - 鍵名
 * @param {any} defaultValue - 默認值
 * @returns {any} 解析後的值或默認值
 */
function getLocalStorageJSON(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`讀取 localStorage ${key} 失敗:`, error);
        return defaultValue;
    }
}

/**
 * 向localStorage安全寫入JSON
 * @param {string} key - 鍵名
 * @param {any} value - 要保存的值
 * @returns {boolean} 是否成功
 */
function setLocalStorageJSON(key, value) {
    try {
        const jsonString = JSON.stringify(value);
        // 檢查大小（localStorage通常限制5-10MB）
        if (jsonString.length > 5 * 1024 * 1024) {
            console.warn(`數據過大，無法保存到 localStorage: ${key}`);
            return false;
        }
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        console.error(`寫入 localStorage ${key} 失敗:`, error);
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage 空間已滿，嘗試清理舊數據');
            cleanupOldDrafts();
        }
        return false;
    }
}

/**
 * 清理舊草稿（保留最新的幾個）
 */
function cleanupOldDrafts() {
    try {
        const draftKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('post_draft_')) {
                draftKeys.push(key);
            }
        }
        
        // 按時間排序（假設key包含時間戳或ID）
        draftKeys.sort().reverse();
        
        // 只保留最新的3個
        const MAX_DRAFTS = window.CONFIG?.MAX_DRAFTS_KEPT || 3;
        if (draftKeys.length > MAX_DRAFTS) {
            draftKeys.slice(MAX_DRAFTS).forEach(key => {
                localStorage.removeItem(key);
                console.log(`清理舊草稿: ${key}`);
            });
        }
    } catch (error) {
        console.error('清理草稿失敗:', error);
    }
}

/**
 * 格式化數字（添加千分位）
 * @param {number} num - 數字
 * @param {number} decimals - 小數位數
 * @returns {string} 格式化後的數字
 */
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toLocaleString('zh-TW', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * 複製文本到剪貼簿
 * @param {string} text - 要複製的文本
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('已複製到剪貼簿', 'success', 2000);
        return true;
    } catch (error) {
        console.error('複製失敗:', error);
        showNotification('複製失敗', 'error', 2000);
        return false;
    }
}

/**
 * 下載文件
 * @param {string} content - 文件內容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME類型
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 驗證Email格式
 * @param {string} email - Email地址
 * @returns {boolean} 是否有效
 */
function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 驗證統一編號格式（台灣）
 * @param {string} taxId - 統一編號
 * @returns {boolean} 是否有效
 */
function isValidTaxId(taxId) {
    if (!taxId) return false;
    // 台灣統一編號為8位數字
    const taxIdRegex = /^\d{8}$/;
    return taxIdRegex.test(taxId);
}

/**
 * 驗證電話號碼格式（台灣）
 * @param {string} phone - 電話號碼
 * @returns {boolean} 是否有效
 */
function isValidPhone(phone) {
    if (!phone) return false;
    // 支持多種台灣電話格式
    const phoneRegex = /^(\d{2,4}-?\d{6,8}|\d{10})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * 計算年資
 * @param {string} hireDateStr - 到職日期
 * @returns {number} 年資（年）
 */
function calculateYearsOfService(hireDateStr) {
    if (!hireDateStr) return 0;
    const hireDate = new Date(hireDateStr);
    const now = new Date();
    const diffMs = now - hireDate;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, diffYears);
}

/**
 * 顯示載入狀態
 * @param {string} containerId - 容器ID
 * @param {string} message - 載入訊息
 */
function showLoading(containerId, message = '載入中...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <div class="loading-text">${escapeHtml(message)}</div>
            </div>
        `;
    }
}

/**
 * 顯示錯誤狀態
 * @param {string} containerId - 容器ID
 * @param {string} message - 錯誤訊息
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #f44336; opacity: 0.5;">error_outline</span>
                <h3 style="color: var(--text-primary); margin: 16px 0 8px;">載入失敗</h3>
                <p style="color: var(--text-secondary);">${escapeHtml(message)}</p>
            </div>
        `;
    }
}

/**
 * 顯示空狀態
 * @param {string} containerId - 容器ID
 * @param {string} icon - Material Icon名稱
 * @param {string} title - 標題
 * @param {string} message - 訊息
 */
function showEmpty(containerId, icon, title, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3;">${icon}</span>
                <h3 style="color: var(--text-primary); margin: 16px 0 8px;">${escapeHtml(title)}</h3>
                <p style="color: var(--text-secondary);">${escapeHtml(message)}</p>
            </div>
        `;
    }
}

/**
 * 確認對話框（美化版）
 * @param {string} message - 確認訊息
 * @param {string} title - 標題
 * @returns {Promise<boolean>} 是否確認
 */
async function confirmDialog(message, title = '確認操作') {
    // 暫時使用原生confirm，未來可以實現自定義對話框
    return confirm(`${title}\n\n${message}`);
}

/**
 * 提示對話框
 * @param {string} message - 提示訊息
 * @param {string} defaultValue - 默認值
 * @returns {string|null} 用戶輸入或null
 */
function promptDialog(message, defaultValue = '') {
    return prompt(message, defaultValue);
}

/**
 * 取得查詢參數
 * @param {string} param - 參數名
 * @returns {string|null} 參數值
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * 設置查詢參數
 * @param {string} param - 參數名
 * @param {string} value - 參數值
 */
function setUrlParameter(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

// 導出工具函數供全局使用
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatDueDate = formatDueDate;
window.isPastDue = isPastDue;
window.formatFileSize = formatFileSize;
window.showNotification = showNotification;
window.formatNumber = formatNumber;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.isValidEmail = isValidEmail;
window.isValidTaxId = isValidTaxId;
window.isValidPhone = isValidPhone;
window.calculateYearsOfService = calculateYearsOfService;
window.showLoading = showLoading;
window.showError = showError;
window.showEmpty = showEmpty;
window.confirmDialog = confirmDialog;
window.promptDialog = promptDialog;
window.getUrlParameter = getUrlParameter;
window.setUrlParameter = setUrlParameter;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.generateUniqueId = generateUniqueId;
window.getLocalStorageJSON = getLocalStorageJSON;
window.setLocalStorageJSON = setLocalStorageJSON;
window.cleanupOldDrafts = cleanupOldDrafts;

