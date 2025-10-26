/**
 * 格式化工具函數
 * 重構自 common-utils.js，移除重複功能
 */

/**
 * HTML轉義（防止XSS攻擊）
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化日期
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-TW');
}

/**
 * 格式化日期時間
 */
export function formatDateTime(dateString) {
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
  
  return formatDate(dateString);
}

/**
 * 格式化數字
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * 顯示通知訊息
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // 移除現有通知
  const existing = document.getElementById('notification-toast');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'notification-toast';
  notification.className = `notification notification-${type}`;
  
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
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
    <span class="material-symbols-outlined">${icons[type] || icons.info}</span>
    <span>${escapeHtml(message)}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * 顯示載入狀態
 */
export function showLoading(containerId, message = '載入中...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #666;">
      <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2c5f7c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div class="loading-text" style="margin-top: 16px; font-size: 14px;">${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * 顯示錯誤狀態
 */
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
      <span class="material-symbols-outlined" style="font-size: 64px; color: #f44336; opacity: 0.5;">error_outline</span>
      <h3 style="color: #333; margin: 16px 0 8px;">載入失敗</h3>
      <p style="color: #666;">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * 顯示空狀態
 */
export function showEmpty(containerId, icon, title, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
      <span class="material-symbols-outlined" style="font-size: 64px; color: #999; opacity: 0.5;">${icon}</span>
      <h3 style="color: #333; margin: 16px 0 8px;">${escapeHtml(title)}</h3>
      <p style="color: #666;">${escapeHtml(message)}</p>
    </div>
  `;
}

// 添加必要的 CSS 動畫
if (!document.getElementById('format-utils-styles')) {
  const style = document.createElement('style');
  style.id = 'format-utils-styles';
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// 導出到全局（向後兼容）
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatNumber = formatNumber;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.showError = showError;
window.showEmpty = showEmpty;

export default {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNumber,
  showNotification,
  showLoading,
  showError,
  showEmpty
};

