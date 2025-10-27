/**
 * Projects Handler
 * 专案管理（已整合到 tasks，此处为兼容层）
 */
import { TaskService } from '../services/TaskService.js';
import { success, list, created } from '../utils/response.util.js';

export async function getProjects(env, request) {
  // 专案实际是 task_type='project' 的任务
  const service = new TaskService(env.DB);
  const projects = await service.getAll({ task_type: 'project' });
  return list(projects);
}

export async function getProject(env, request) {
  const id = parseInt(request.params.id);
  const service = new TaskService(env.DB);
  const project = await service.getById(id);
  return success(project);
}

export async function createProject(env, request) {
  const data = await request.json();
  data.task_type = 'project'; // 标记为专案类型
  
  const service = new TaskService(env.DB);
  const project = await service.create(data);
  return created(project);
}

export async function updateProject(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  
  const service = new TaskService(env.DB);
  const project = await service.update(id, data);
  return success(project);
}

export async function deleteProject(env, request) {
  const id = parseInt(request.params.id);
  const service = new TaskService(env.DB);
  await service.delete(id);
  return success({ message: '专案已删除' });
}

export default {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};

