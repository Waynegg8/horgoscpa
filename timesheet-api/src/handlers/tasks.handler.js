/**
 * Tasks API Handler
 * 處理任務相關的 HTTP 請求
 */

import { TaskService } from '../services/TaskService.js';
import { success, created, noContent, paginated } from '../utils/response.util.js';

/**
 * 獲取任務列表
 * GET /api/tasks
 */
export async function getTaskList(env, request) {
  const url = new URL(request.url);
  
  const options = {
    page: parseInt(url.searchParams.get('page')) || 1,
    pageSize: parseInt(url.searchParams.get('pageSize')) || 20,
    status: url.searchParams.get('status'),
    task_type: url.searchParams.get('task_type'),
    category: url.searchParams.get('category'),
    assigned_user_id: url.searchParams.get('assigned_user_id') ? parseInt(url.searchParams.get('assigned_user_id')) : null,
    client_id: url.searchParams.get('client_id') ? parseInt(url.searchParams.get('client_id')) : null,
    search: url.searchParams.get('search')
  };

  const service = new TaskService(env.DB);
  const result = await service.getList(options);

  return paginated(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.pageSize
  );
}

/**
 * 獲取任務詳情
 * GET /api/tasks/:id
 */
export async function getTaskDetail(env, request) {
  const id = parseInt(request.params.id);

  const service = new TaskService(env.DB);
  const task = await service.getDetail(id);

  return success(task);
}

/**
 * 創建任務
 * POST /api/tasks
 */
export async function createTask(env, request) {
  const data = await request.json();
  const user = request.user;

  const service = new TaskService(env.DB);
  const task = await service.create(data, { user });

  return created(task, '任務創建成功');
}

/**
 * 更新任務
 * PUT /api/tasks/:id
 */
export async function updateTask(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;

  const service = new TaskService(env.DB);
  const task = await service.update(id, data, { user });

  return success(task);
}

/**
 * 刪除任務
 * DELETE /api/tasks/:id
 */
export async function deleteTask(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;

  const service = new TaskService(env.DB);
  await service.delete(id, { user });

  return noContent();
}

/**
 * 獲取用戶任務統計
 * GET /api/tasks/stats/user/:userId
 */
export async function getUserTaskStats(env, request) {
  const userId = parseInt(request.params.userId);

  const service = new TaskService(env.DB);
  const stats = await service.getUserStats(userId);

  return success(stats);
}

/**
 * 獲取即將到期的任務
 * GET /api/tasks/due-soon
 */
export async function getDueSoonTasks(env, request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days')) || 3;

  const service = new TaskService(env.DB);
  const tasks = await service.getDueSoonTasks(days);

  return success(tasks);
}

/**
 * 獲取逾期任務
 * GET /api/tasks/overdue
 */
export async function getOverdueTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getOverdueTasks();

  return success(tasks);
}

export default {
  getTaskList,
  getTaskDetail,
  createTask,
  updateTask,
  deleteTask,
  getUserTaskStats,
  getDueSoonTasks,
  getOverdueTasks
};

