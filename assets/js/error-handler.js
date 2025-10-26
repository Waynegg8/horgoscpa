/**
 * 全局錯誤處理模組
 * 捕獲未處理的錯誤並提供友好的用戶提示
 */

/**
 * 初始化全局錯誤處理
 */
function initGlobalErrorHandler() {
    // 捕獲未處理的 Promise 錯誤
    window.addEventListener('unhandledrejection', function(event) {
        console.error('未處理的 Promise 錯誤:', event.reason);
        
        // 區分不同類型的錯誤
        let message = '發生未預期的錯誤';
        
        if (event.reason && event.reason.message) {
            const errorMsg = event.reason.message.toLowerCase();
            
            if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
                message = '網絡連接錯誤，請檢查您的網絡';
            } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
                message = '登入已過期，請重新登入';
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else if (errorMsg.includes('timeout')) {
                message = '請求超時，請稍後再試';
            } else {
                message = `錯誤: ${event.reason.message}`;
            }
        }
        
        // 顯示錯誤通知
        if (typeof showNotification === 'function') {
            showNotification(message, 'error', 5000);
        } else {
            alert(message);
        }
        
        // 防止默認錯誤處理
        event.preventDefault();
    });
    
    // 捕獲一般 JavaScript 錯誤
    window.addEventListener('error', function(event) {
        console.error('全局錯誤:', event.error);
        
        // 忽略腳本加載錯誤（由瀏覽器擴展等引起）
        if (event.filename && !event.filename.includes(window.location.hostname)) {
            return;
        }
        
        let message = '頁面發生錯誤';
        
        if (event.error && event.error.message) {
            message = `錯誤: ${event.error.message}`;
        }
        
        // 顯示錯誤通知
        if (typeof showNotification === 'function') {
            showNotification(message, 'error', 5000);
        }
        
        // 對於關鍵錯誤，建議刷新頁面
        if (event.error && (
            event.error.message.includes('undefined') ||
            event.error.message.includes('null')
        )) {
            setTimeout(() => {
                if (confirm('頁面出現錯誤，是否刷新頁面重試？')) {
                    window.location.reload();
                }
            }, 1000);
        }
    });
    
    // API 錯誤統一處理
    window.handleApiError = function(error, context = '') {
        console.error(`API錯誤 ${context}:`, error);
        
        let message = '操作失敗';
        
        if (error.message) {
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                message = '未授權，請重新登入';
                setTimeout(() => {
                    localStorage.removeItem('session_token');
                    window.location.href = '/login.html';
                }, 2000);
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                message = '您沒有權限執行此操作';
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                message = '請求的資源不存在';
            } else if (error.message.includes('500')) {
                message = '服務器錯誤，請稍後再試';
            } else if (error.message.includes('timeout') || error.message.includes('超時')) {
                message = '請求超時，請檢查網絡連接';
            } else {
                message = error.message;
            }
        }
        
        if (typeof showNotification === 'function') {
            showNotification(message, 'error', 5000);
        } else {
            alert(message);
        }
        
        return message;
    };
    
    // 表單驗證錯誤處理
    window.handleValidationError = function(field, message) {
        console.warn(`驗證錯誤 [${field}]:`, message);
        
        if (typeof showNotification === 'function') {
            showNotification(message, 'warning', 3000);
        } else {
            alert(message);
        }
    };
    
    console.log('✅ 全局錯誤處理已初始化');
}

// 頁面載入時自動初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalErrorHandler);
} else {
    initGlobalErrorHandler();
}

// 導出供全局使用
window.initGlobalErrorHandler = initGlobalErrorHandler;
window.handleApiError = handleApiError;
window.handleValidationError = handleValidationError;

