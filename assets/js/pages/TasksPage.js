/**
 * Tasks Page
 * 任务管理页面
 */

import { AuthUtils } from '../core/utils/auth.js';
import { TaskService } from '../modules/tasks/TaskService.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';
import { Modal } from '../components/layout/Modal.js';

export class TasksPage {
  constructor() {
    this.currentUser = null;
    this.currentTab = 'multi-stage';
    this.tasks = [];
  }

  async init() {
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    this._bindEvents();
    await this.loadTasks();
  }

  _bindEvents() {
    // Tab 切换
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', async (e) => {
        this.currentTab = e.target.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        await this.loadTasks();
      });
    });

    // 新增任务按钮
    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddTaskModal());
    }
  }

  async loadTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;

    Loading.show(container);

    try {
      let tasks = [];

      switch (this.currentTab) {
        case 'multi-stage':
          tasks = await TaskService.getMultiStageTasks();
          break;
        case 'recurring':
          tasks = await TaskService.getRecurringTasks();
          break;
        case 'all':
        default:
          tasks = await TaskService.getList();
          break;
      }

      this.tasks = tasks;
      this.renderTasks(container);
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  renderTasks(container) {
    if (this.tasks.length === 0) {
      Loading.showEmpty(container, '暂无任务');
      return;
    }

    container.innerHTML = `
      <div class="tasks-list">
        ${this.tasks.map(task => this.renderTaskCard(task)).join('')}
      </div>
    `;
  }

  renderTaskCard(task) {
    return `
      <div class="task-card" data-id="${task.id}">
        <div class="task-header">
          <h3>${task.title}</h3>
          <span class="task-status status-${task.status}">${task.status}</span>
        </div>
        <div class="task-body">
          <p>${task.description || ''}</p>
          ${task.client_name ? `<p class="task-client">客户：${task.client_name}</p>` : ''}
          ${task.due_date ? `<p class="task-due">截止：${task.due_date}</p>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn-sm btn-primary" onclick="window.tasksPage.editTask(${task.id})">编辑</button>
          ${task.status !== 'completed' ? `
            <button class="btn-sm btn-success" onclick="window.tasksPage.completeTask(${task.id})">完成</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  async showAddTaskModal() {
    const modal = new Modal({
      title: '新增任务',
      content: `
        <div class="form-group">
          <label>任务标题 <span class="required">*</span></label>
          <input type="text" id="taskTitle" required />
        </div>
        <div class="form-group">
          <label>任务描述</label>
          <textarea id="taskDescription" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>截止日期</label>
          <input type="date" id="taskDueDate" />
        </div>
      `,
      onConfirm: async () => {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const dueDate = document.getElementById('taskDueDate').value;

        if (!title) {
          Toast.error('请输入任务标题');
          return false;
        }

        try {
          await TaskService.create({
            title,
            description,
            due_date: dueDate || null,
            assigned_user_id: this.currentUser.id,
            created_by_user_id: this.currentUser.id
          });

          Toast.success('任务创建成功');
          await this.loadTasks();
        } catch (error) {
          Toast.error('创建失败: ' + error.message);
          return false;
        }
      }
    });
  }

  async editTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const modal = new Modal({
      title: '编辑任务',
      content: `
        <div class="form-group">
          <label>任务标题 <span class="required">*</span></label>
          <input type="text" id="editTaskTitle" value="${task.title}" required />
        </div>
        <div class="form-group">
          <label>任务描述</label>
          <textarea id="editTaskDescription" rows="4">${task.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select id="editTaskStatus">
            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>待处理</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>进行中</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>已完成</option>
          </select>
        </div>
      `,
      onConfirm: async () => {
        const title = document.getElementById('editTaskTitle').value;
        const description = document.getElementById('editTaskDescription').value;
        const status = document.getElementById('editTaskStatus').value;

        try {
          await TaskService.update(id, { title, description, status });
          Toast.success('任务更新成功');
          await this.loadTasks();
        } catch (error) {
          Toast.error('更新失败: ' + error.message);
          return false;
        }
      }
    });
  }

  async completeTask(id) {
    try {
      await TaskService.update(id, { status: 'completed' });
      Toast.success('任务已完成');
      await this.loadTasks();
    } catch (error) {
      Toast.error('操作失败: ' + error.message);
    }
  }
}

// 导出到全局
window.TasksPage = TasksPage;

export default TasksPage;

