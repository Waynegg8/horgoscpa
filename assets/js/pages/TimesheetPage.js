/**
 * Timesheet Page
 * 工时管理页面
 */

import { AuthUtils } from '../core/utils/auth.js';
import { TimesheetService } from '../modules/timesheets/TimesheetService.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';
import { DateUtils } from '../core/utils/date.js';

export class TimesheetPage {
  constructor() {
    this.currentUser = null;
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.timesheetData = null;
  }

  async init() {
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    this._bindEvents();
    await this.loadData();
  }

  _bindEvents() {
    // 月份切换
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 1) {
          this.currentMonth = 12;
          this.currentYear--;
        }
        this.loadData();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 12) {
          this.currentMonth = 1;
          this.currentYear++;
        }
        this.loadData();
      });
    }

    // 保存按钮
    const saveBtn = document.getElementById('saveTimesheetBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveTimesheet());
    }
  }

  async loadData() {
    const container = document.getElementById('timesheetContainer');
    if (!container) return;

    Loading.show(container);

    try {
      const employeeName = this.currentUser.employee_name || this.currentUser.username;
      
      const data = await TimesheetService.getData(
        employeeName,
        this.currentYear,
        this.currentMonth
      );

      this.timesheetData = data;
      this.renderTimesheet(container);
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  renderTimesheet(container) {
    const { workEntries = [], leaveEntries = [] } = this.timesheetData;

    // 更新月份显示
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) {
      monthDisplay.textContent = `${this.currentYear}年${this.currentMonth}月`;
    }

    container.innerHTML = `
      <div class="timesheet-summary">
        <div class="summary-card">
          <h4>工作天数</h4>
          <p class="summary-value">${workEntries.length} 天</p>
        </div>
        <div class="summary-card">
          <h4>请假天数</h4>
          <p class="summary-value">${leaveEntries.length} 天</p>
        </div>
      </div>
      
      <div class="timesheet-table">
        <h3>工时明细</h3>
        ${workEntries.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>客户</th>
                <th>正常工时</th>
                <th>加班工时</th>
              </tr>
            </thead>
            <tbody>
              ${workEntries.map(entry => `
                <tr>
                  <td>${entry.date}</td>
                  <td>${entry.client_name || '-'}</td>
                  <td>${entry.regular_hours || 0}</td>
                  <td>${entry.overtime_hours || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="empty-message">本月暂无工时记录</p>'}
      </div>
    `;
  }

  async saveTimesheet() {
    Toast.info('保存功能待完善');
  }
}

window.TimesheetPage = TimesheetPage;
export default TimesheetPage;

