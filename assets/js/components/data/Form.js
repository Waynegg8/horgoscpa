/**
 * Form Component
 * 表单组件
 */

export class Form {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      fields: [],
      onSubmit: null,
      submitText: '提交',
      cancelText: '取消',
      showCancel: false,
      ...options
    };

    this.data = {};
    this.render();
  }

  render() {
    const fieldsHtml = this.options.fields.map(field => this._renderField(field)).join('');

    const html = `
      <form class="dynamic-form">
        ${fieldsHtml}
        <div class="form-actions">
          ${this.options.showCancel ? `
            <button type="button" class="btn-secondary form-cancel">${this.options.cancelText}</button>
          ` : ''}
          <button type="submit" class="btn-primary form-submit">${this.options.submitText}</button>
        </div>
      </form>
    `;

    this.container.innerHTML = html;
    this._bindEvents();
  }

  _renderField(field) {
    const { name, label, type = 'text', required = false, options = [] } = field;

    let inputHtml = '';

    switch (type) {
      case 'select':
        inputHtml = `
          <select id="${name}" name="${name}" ${required ? 'required' : ''}>
            <option value="">请选择</option>
            ${options.map(opt => `
              <option value="${opt.value}">${opt.label}</option>
            `).join('')}
          </select>
        `;
        break;

      case 'textarea':
        inputHtml = `<textarea id="${name}" name="${name}" ${required ? 'required' : ''}></textarea>`;
        break;

      default:
        inputHtml = `<input type="${type}" id="${name}" name="${name}" ${required ? 'required' : ''} />`;
    }

    return `
      <div class="form-group">
        <label for="${name}">
          ${label}
          ${required ? '<span class="required">*</span>' : ''}
        </label>
        ${inputHtml}
      </div>
    `;
  }

  _bindEvents() {
    const form = this.container.querySelector('form');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // 收集表单数据
      const formData = new FormData(form);
      this.data = Object.fromEntries(formData.entries());

      // 调用提交回调
      if (this.options.onSubmit) {
        try {
          await this.options.onSubmit(this.data);
        } catch (error) {
          console.error('[Form] Submit failed:', error);
        }
      }
    });

    // 取消按钮
    const cancelBtn = this.container.querySelector('.form-cancel');
    if (cancelBtn && this.options.onCancel) {
      cancelBtn.addEventListener('click', () => {
        this.options.onCancel();
      });
    }
  }

  /**
   * 获取表单数据
   */
  getData() {
    return this.data;
  }

  /**
   * 设置表单数据
   */
  setData(data) {
    Object.keys(data).forEach(key => {
      const input = this.container.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = data[key];
      }
    });
  }

  /**
   * 重置表单
   */
  reset() {
    const form = this.container.querySelector('form');
    if (form) {
      form.reset();
    }
    this.data = {};
  }
}

// 导出到全局
window.Form = Form;

export default Form;

