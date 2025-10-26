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
 * 檢查值是否不為空（null, undefined, 空字符串）
 * @param {*} value - 要檢查的值
 * @returns {boolean}
 */
function isNotEmpty(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
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
function isValidTaiwanTaxId(taxId) {
    if (!/^\d{8}$/.test(taxId)) {
        return false;
    }
    const logic = [1, 2, 1, 2, 1, 2, 4, 1];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        const n = parseInt(taxId[i]) * logic[i];
        sum += Math.floor(n / 10) + (n % 10);
    }
    return sum % 10 === 0 || (taxId[6] === '7' && (sum + 1) % 10 === 0);
}

/**
 * 驗證電話號碼格式（台灣）
 * @param {string} phone - 電話號碼
 * @returns {boolean} 是否有效
 */
function isValidTaiwanPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s-]/g, '');
    // 支援格式: 09xx-xxxxxx, (0x)xxxx-xxxx, 0x-xxxx-xxxx, 09xxxxxxxx
    const mobile = /^09\d{8}$/;
    const landline = /^(0\d{1,3})\d{6,8}$/;
    return mobile.test(cleaned) || landline.test(cleaned);
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
 * 時區轉換工具（處理UTC時間）
 */

/**
 * UTC時間轉台北時間
 * @param {string|Date} utcTime - UTC時間
 * @returns {Date} 台北時間
 */
function utcToTaipei(utcTime) {
    const date = new Date(utcTime);
    // 台北是 UTC+8
    const taipeiOffset = 8 * 60; // 分鐘
    const localOffset = date.getTimezoneOffset(); // 當前時區相對UTC的偏移（分鐘）
    const offsetDiff = taipeiOffset + localOffset;
    return new Date(date.getTime() + offsetDiff * 60 * 1000);
}

/**
 * 台北時間轉UTC時間
 * @param {string|Date} taipeiTime - 台北時間
 * @returns {Date} UTC時間
 */
function taipeiToUTC(taipeiTime) {
    const date = new Date(taipeiTime);
    const taipeiOffset = 8 * 60;
    const localOffset = date.getTimezoneOffset();
    const offsetDiff = taipeiOffset + localOffset;
    return new Date(date.getTime() - offsetDiff * 60 * 1000);
}

/**
 * 格式化為台北時間字符串
 * @param {string|Date} dateTime - 日期時間
 * @returns {string} 格式化的台北時間
 */
function formatTaipeiTime(dateTime) {
    const taipeiDate = utcToTaipei(dateTime);
    return taipeiDate.toLocaleString('zh-TW', { 
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * GitHub Actions cron 時間轉換（UTC → 台北）
 * @param {number} taipeiHour - 台北時間（0-23）
 * @returns {number} UTC時間（0-23）
 */
function taipeiHourToUTC(taipeiHour) {
    // 台北 = UTC + 8
    const utcHour = (taipeiHour - 8 + 24) % 24;
    return utcHour;
}

/**
 * 生成年份選項（當前年份 ± 範圍）
 * @param {number} range - 範圍（默認5年）
 * @returns {Array<number>} 年份陣列
 */
function generateYearOptions(range = 5) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - range; i--) {
        years.push(i);
    }
    return years;
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
    return new Promise(resolve => {
        const dialogId = `confirm-dialog-${generateUniqueId()}`;
        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;

        dialog.innerHTML = `
            <div class="confirm-dialog-content" style="background: white; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); width: 90%; max-width: 400px; padding: 24px; text-align: left; transform: scale(0.9); transition: transform 0.2s ease;">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; color: #333;">${escapeHtml(title)}</h3>
                <p style="margin-bottom: 24px; font-size: 15px; color: #666; line-height: 1.6;">${escapeHtml(message)}</p>
                <div class="confirm-dialog-buttons" style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn btn-secondary confirm-cancel" style="padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; background: #eee; color: #333;">取消</button>
                    <button class="btn btn-danger confirm-ok" style="padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; background: #f44336; color: white;">確認</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Animate in
        setTimeout(() => {
            dialog.style.opacity = '1';
            dialog.querySelector('.confirm-dialog-content').style.transform = 'scale(1)';
        }, 10);

        const closeDialog = (value) => {
            dialog.style.opacity = '0';
            dialog.querySelector('.confirm-dialog-content').style.transform = 'scale(0.9)';
            setTimeout(() => {
                dialog.remove();
                resolve(value);
            }, 200);
        };

        dialog.querySelector('.confirm-ok').addEventListener('click', () => closeDialog(true));
        dialog.querySelector('.confirm-cancel').addEventListener('click', () => closeDialog(false));
        dialog.addEventListener('click', (e) => {
            if (e.target.id === dialogId) {
                closeDialog(false);
            }
        });
    });
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
window.isValidTaxId = isValidTaiwanTaxId; // Deprecated, use isValidTaiwanTaxId
window.isValidPhone = isValidTaiwanPhone; // Deprecated, use isValidTaiwanPhone
window.isNotEmpty = isNotEmpty;
window.isValidTaiwanTaxId = isValidTaiwanTaxId;
window.isValidTaiwanPhone = isValidTaiwanPhone;
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
window.utcToTaipei = utcToTaipei;
window.taipeiToUTC = taipeiToUTC;
window.formatTaipeiTime = formatTaipeiTime;
window.taipeiHourToUTC = taipeiHourToUTC;
window.generateYearOptions = generateYearOptions;

