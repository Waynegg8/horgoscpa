/**
 * Reports Page
 * 报表页面
 */

import { AuthUtils } from '../core/utils/auth.js';
import { ReportService } from '../modules/reports/ReportService.js';
import { EmployeeService } from '../modules/employees/EmployeeService.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';

export class ReportsPage {
  constructor() {
    this.currentUser = null;
    this.currentReport = 'annual-leave';
  }

  async init() {
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    await this.loadEmployees();
    this._bindEvents();
  }

  async loadEmployees() {
    try {
      const employees = await EmployeeService.getAll();
      
      // 填充员工下拉选单
      const selects = document.querySelectorAll('.employee-select');
      selects.forEach(select => {
        select.innerHTML = `
          <option value="">请选择员工</option>
          ${employees.map(emp => `
            <option value="${emp.name}">${emp.name}</option>
          `).join('')}
        `;
      });
    } catch (error) {
      console.error('[Reports] Load employees failed:', error);
    }
  }

  _bindEvents() {
    // 生成报表按钮
    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateReport());
    }

    // 清除缓存
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn && this.currentUser.role === 'admin') {
      clearCacheBtn.addEventListener('click', () => this.clearCache());
    }
  }

  async generateReport() {
    const reportType = this.currentReport;
    const container = document.getElementById('reportContainer');
    if (!container) return;

    Loading.show(container, '生成报表中...');

    try {
      let report = null;

      switch (reportType) {
        case 'annual-leave':
          const employee = document.getElementById('annualLeaveEmployee').value;
          const year = document.getElementById('annualLeaveYear').value || new Date().getFullYear();
          
          if (!employee) {
            Toast.error('请选择员工');
            return;
          }

          report = await ReportService.getAnnualLeave(employee, year);
          this.renderAnnualLeaveReport(container, report);
          break;

        case 'work-analysis':
          report = await ReportService.getWorkAnalysis({});
          this.renderWorkAnalysisReport(container, report);
          break;

        case 'pivot':
          report = await ReportService.getPivot({});
          this.renderPivotReport(container, report);
          break;
      }
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  renderAnnualLeaveReport(container, report) {
    const { leave_stats = {}, employee, year } = report;

    container.innerHTML = `
      <div class="report-header">
        <h3>${employee} - ${year}年度年假报表</h3>
      </div>
      <div class="report-body">
        ${Object.keys(leave_stats).length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>请假类型</th>
                <th>使用时数</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(leave_stats).map(([type, hours]) => `
                <tr>
                  <td>${type}</td>
                  <td>${hours} 小时</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="empty-message">本年度暂无请假记录</p>'}
      </div>
    `;
  }

  renderWorkAnalysisReport(container, report) {
    container.innerHTML = `
      <div class="report-header">
        <h3>工时分析报表</h3>
      </div>
      <div class="report-body">
        <p class="empty-message">工时分析功能待完善</p>
      </div>
    `;
  }

  renderPivotReport(container, report) {
    container.innerHTML = `
      <div class="report-header">
        <h3>枢纽分析报表</h3>
      </div>
      <div class="report-body">
        <p class="empty-message">枢纽分析功能待完善</p>
      </div>
    `;
  }

  async clearCache() {
    try {
      await ReportService.clearCache();
      Toast.success('缓存已清除');
    } catch (error) {
      Toast.error('清除失败: ' + error.message);
    }
  }
}

window.ReportsPage = ReportsPage;
export default ReportsPage;

