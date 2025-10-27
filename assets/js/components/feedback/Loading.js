/**
 * Loading Component
 * 加载指示器组件
 */

export class Loading {
  /**
   * 显示加载指示器
   */
  static show(container, message = '加载中...') {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }

    if (!container) return;

    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;
  }

  /**
   * 隐藏加载指示器
   */
  static hide(container) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }

    if (!container) return;

    const loadingEl = container.querySelector('.loading-container');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  /**
   * 显示错误消息
   */
  static showError(container, message) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }

    if (!container) return;

    container.innerHTML = `
      <div class="error-container">
        <span class="material-symbols-rounded">error</span>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * 显示空状态
   */
  static showEmpty(container, message = '暂无数据') {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }

    if (!container) return;

    container.innerHTML = `
      <div class="empty-container">
        <span class="material-symbols-rounded">inbox</span>
        <p>${message}</p>
      </div>
    `;
  }
}

// 导出到全局
window.Loading = Loading;

export default Loading;

