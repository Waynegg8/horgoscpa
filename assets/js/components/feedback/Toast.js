/**
 * Toast Component
 * 統一的通知提示組件
 */

export class Toast {
  static success(message, duration = 3000) {
    return Toast.show(message, 'success', duration);
  }

  static error(message, duration = 5000) {
    return Toast.show(message, 'error', duration);
  }

  static info(message, duration = 3000) {
    return Toast.show(message, 'info', duration);
  }

  static warning(message, duration = 4000) {
    return Toast.show(message, 'warning', duration);
  }

  static show(message, type = 'info', duration = 3000) {
    // 創建 Toast 元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 添加到頁面
    document.body.appendChild(toast);

    // 顯示動畫
    setTimeout(() => toast.classList.add('show'), 10);

    // 自動隱藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  }
}

// 導出到全局
window.Toast = Toast;

export default Toast;

