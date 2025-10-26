/**
 * Table Component
 * 可重用的表格组件
 */

export class Table {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      columns: [],
      data: [],
      onRowClick: null,
      onEdit: null,
      onDelete: null,
      ...options
    };
    
    this.render();
  }

  /**
   * 渲染表格
   */
  render() {
    const { columns, data } = this.options;
    
    const html = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => this._renderRow(row)).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    this.container.innerHTML = html;
    this._bindEvents();
  }

  /**
   * 渲染行
   * @private
   */
  _renderRow(row) {
    const { columns } = this.options;
    
    return `
      <tr data-id="${row.id}">
        ${columns.map(col => `
          <td>${col.render ? col.render(row[col.field], row) : row[col.field]}</td>
        `).join('')}
      </tr>
    `;
  }

  /**
   * 綁定事件
   * @private
   */
  _bindEvents() {
    if (this.options.onRowClick) {
      this.container.querySelectorAll('tr[data-id]').forEach(tr => {
        tr.addEventListener('click', (e) => {
          const id = parseInt(tr.dataset.id);
          const row = this.options.data.find(r => r.id === id);
          this.options.onRowClick(row, e);
        });
      });
    }
  }

  /**
   * 更新數據
   */
  setData(data) {
    this.options.data = data;
    this.render();
  }
}

export default Table;

