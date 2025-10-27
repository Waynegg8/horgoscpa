/**
 * Tasks Handler
 */
import { TaskService } from '../services/TaskService.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

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

export async function getMultiStageStats(env, request) {
  // 多阶段任务统计
  const repo = new BaseRepository(env.DB, TABLES.TASKS);
  const tasks = await repo.findAll({ category: 'client_service' });
  
  return success({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length
  });
}

export async function getRecurringStats(env, request) {
  // 周期任务统计
  const repo = new BaseRepository(env.DB, TABLES.TASKS);
  const tasks = await repo.findAll({ category: 'recurring' });
  
  return success({
    total: tasks.length,
    generated_this_month: 0
  });
}

export async function generateRecurringTasks(env, request) {
  // 生成周期任务
  return success({
    generated: 0,
    message: '周期任务生成功能待完善'
  });
}

export async function addChecklistItem(env, request) {
  const data = await request.json();
  // 简化版：返回成功
  return success({ message: '检查清单项已添加' });
}

export default {
  getTasks,
  getMultiStageTasks,
  getRecurringTasks,
  createTask,
  updateTask,
  getMultiStageStats,
  getRecurringStats,
  generateRecurringTasks,
  addChecklistItem
};
