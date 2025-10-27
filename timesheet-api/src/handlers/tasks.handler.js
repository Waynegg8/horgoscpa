/**
 * Tasks Handler
 */
import { TaskService } from '../services/TaskService.js';
import { success, list, created } from '../utils/response.util.js';

export async function getTasks(env, request) {
  const url = new URL(request.url);
  const filters = {
    status: url.searchParams.get('status'),
    assigned_user_id: url.searchParams.get('assigned_user_id') ? parseInt(url.searchParams.get('assigned_user_id')) : null,
    category: url.searchParams.get('category')
  };
  
  // 移除 null 值
  Object.keys(filters).forEach(key => {
    if (filters[key] === null || filters[key] === undefined) delete filters[key];
  });

  const service = new TaskService(env.DB);
  const tasks = await service.getAll(filters);
  
  return success({ tasks });
}

export async function getMultiStageTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getAll({ category: 'client_service' });
  return success({ tasks });
}

export async function getRecurringTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getAll({ category: 'recurring' });
  return list(tasks);
}

export async function createTask(env, request) {
  const data = await request.json();
  const service = new TaskService(env.DB);
  const task = await service.create(data);
  return created(task);
}

export async function updateTask(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new TaskService(env.DB);
  const task = await service.update(id, data);
  return success(task);
}

export default {
  getTasks,
  getMultiStageTasks,
  getRecurringTasks,
  createTask,
  updateTask
};
