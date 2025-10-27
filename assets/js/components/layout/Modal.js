/**
 * Modal Component
 * 模态对话框组件
 */

export class Modal {
  constructor(options = {}) {
    this.options = {
      title: '',
      content: '',
      width: '600px',
      onConfirm: null,
      onCancel: null,
      confirmText: '确定',
      cancelText: '取消',
      showCancel: true,
      ...options
    };

    this.element = null;
    this.render();
  }

  render() {
    const modalHtml = `
      <div class="modal-overlay">
        <div class="modal-container" style="max-width: ${this.options.width}">
          <div class="modal-header">
            <h3>${this.options.title}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="modal-body">
            ${this.options.content}
          </div>
          <div class="modal-footer">
            ${this.options.showCancel ? `
              <button class="btn-secondary modal-cancel">${this.options.cancelText}</button>
            ` : ''}
            <button class="btn-primary modal-confirm">${this.options.confirmText}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.element = document.body.lastElementChild;

    this._bindEvents();
  }

  _bindEvents() {
    // 确定按钮
    const confirmBtn = this.element.querySelector('.modal-confirm');
    if (confirmBtn && this.options.onConfirm) {
      confirmBtn.addEventListener('click', async () => {
        const result = await this.options.onConfirm();
        if (result !== false) {
          this.close();
        }
      });
    }

    // 取消按钮
    const cancelBtn = this.element.querySelector('.modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.options.onCancel) {
          this.options.onCancel();
        }
        this.close();
      });
    }

    // 点击遮罩关闭
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // ESC 键关闭
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  close() {
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
    }
    this.element.remove();
  }

  /**
   * 静态方法：快速显示确认对话框
   */
  static confirm(title, message, onConfirm) {
    return new Modal({
      title,
      content: `<p>${message}</p>`,
      onConfirm
    });
  }

  /**
   * 静态方法：快速显示提示对话框
   */
  static alert(title, message) {
    return new Modal({
      title,
      content: `<p>${message}</p>`,
      showCancel: false,
      confirmText: '知道了'
    });
  }
}

// 导出到全局
window.Modal = Modal;

export default Modal;

