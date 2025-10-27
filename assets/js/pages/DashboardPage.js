/**
 * Dashboard Page
 * 工作台页面（完全重建版）
 */

import { AuthUtils } from '../core/utils/auth.js';
import { TaskService } from '../modules/tasks/TaskService.js';
import { ClientService } from '../modules/clients/ClientService.js';
import { apiClient } from '../core/api/client.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';

export class DashboardPage {
  constructor() {
    this.currentUser = null;
  }

  async init() {
    // 检查认证
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    
    // 更新用户信息显示
    this.updateUserInfo();

    // 加载数据
    await this.loadDashboardData();
  }

  updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && this.currentUser) {
      userNameEl.textContent = this.currentUser.employee_name || this.currentUser.username;
    }
  }

  async loadDashboardData() {
    try {
      if (this.currentUser.role === 'admin') {
        await Promise.all([
          this.loadTeamProgress(),
          this.loadAdminStats()
        ]);
      } else {
        await Promise.all([
          this.loadPendingTasks(),
          this.loadWeeklyStats(),
          this.loadAnnualLeave(),
          this.loadReminders()
        ]);
      }
    } catch (error) {
      console.error('[Dashboard] Load failed:', error);
      Toast.error('加载失败: ' + error.message);
    }
  }

  async loadPendingTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    Loading.show(container, '加载待办任务...');

    try {
      const tasks = await TaskService.getMultiStageTasks({
        status_not: 'completed',
        assigned_user_id: this.currentUser.id
      });

      if (tasks.length === 0) {
        Loading.showEmpty(container, '暂无待办任务');
        return;
      }

      // 渲染任务列表
      container.innerHTML = tasks.map(task => `
        <div class="task-item">
          <h4>${task.title}</h4>
          <p>${task.description || ''}</p>
          <div class="task-meta">
            <span class="status-${task.status}">${task.status}</span>
            ${task.due_date ? `<span class="due-date">${task.due_date}</span>` : ''}
          </div>
        </div>
      `).join('');
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async loadWeeklyStats() {
    const container = document.getElementById('weeklyStats');
    if (!container) return;

    // 简化版：显示基本信息
    container.innerHTML = `
      <div class="stats-card">
        <h4>本周工时</h4>
        <p class="stats-value">0 小时</p>
      </div>
    `;
  }

  async loadAnnualLeave() {
    const container = document.getElementById('annualLeave');
    if (!container) return;

    try {
      const employeeName = this.currentUser.employee_name;
      if (!employeeName) return;

      const year = new Date().getFullYear();
      const quotaRes = await apiClient.get(`/api/leave-quota?employee=${encodeURIComponent(employeeName)}&year=${year}`);
      const quotaList = quotaRes.data?.quota || quotaRes.quota || [];
      const annualQuota = quotaList.find(q => q.type === '特休');

      if (annualQuota) {
        container.innerHTML = `
          <div class="leave-card">
            <h4>年假余额</h4>
            <p class="leave-value">${annualQuota.remaining_hours / 8} 天</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('[Dashboard] Load annual leave failed:', error);
    }
  }

  async loadReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;

    try {
      const response = await apiClient.get(`/api/reminders?user_id=${this.currentUser.id}&is_read=0`);
      const reminders = response.data?.reminders || response.reminders || [];

      if (reminders.length === 0) {
        Loading.showEmpty(container, '暂无提醒');
        return;
      }

      container.innerHTML = reminders.map(r => `
        <div class="reminder-item">
          <p>${r.message}</p>
          <small>${r.remind_at}</small>
        </div>
      `).join('');
    } catch (error) {
      console.error('[Dashboard] Load reminders failed:', error);
    }
  }

  async loadTeamProgress() {
    // 管理员视图：团队进度
    const container = document.getElementById('teamProgress');
    if (!container) return;

    Loading.show(container, '加载团队进度...');

    try {
      const employees = await apiClient.get('/api/employees');
      const empList = employees.data || employees || [];

      container.innerHTML = `
        <div class="team-stats">
          <p>团队成员：${empList.length} 人</p>
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async loadAdminStats() {
    // 管理员统计
    const container = document.getElementById('adminStats');
    if (!container) return;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h4>总任务</h4>
          <p>-</p>
        </div>
      </div>
    `;
  }
}

// 导出到全局
window.DashboardPage = DashboardPage;

export default DashboardPage;

