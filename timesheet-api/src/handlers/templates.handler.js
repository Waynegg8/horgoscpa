/**
 * Templates Handler
 * 任务模板管理
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getTemplates(env, request) {
  const url = new URL(request.url);
  const templateType = url.searchParams.get('template_type');
  
  const repo = new BaseRepository(env.DB, TABLES.TASK_TEMPLATES);
  const filters = templateType ? { template_type: templateType } : {};
  filters.is_active = 1;
  
  const templates = await repo.findAll(filters, { orderBy: 'template_name', order: 'ASC' });
  return list(templates);
}

export async function getMultiStageTemplates(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.TASK_TEMPLATES);
  const templates = await repo.findAll(
    { template_type: 'general', is_active: 1 },
    { orderBy: 'template_name', order: 'ASC' }
  );
  return list(templates);
}

export async function getRecurringTemplates(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.TASK_TEMPLATES);
  const templates = await repo.findAll(
    { template_type: 'service_checklist', is_active: 1 },
    { orderBy: 'template_name', order: 'ASC' }
  );
  return list(templates);
}

export async function createTemplate(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.TASK_TEMPLATES);
  
  data.created_by_user_id = request.user.id;
  if (!data.is_active) data.is_active = true;
  if (!data.version) data.version = 1;
  
  const id = await repo.create(data);
  const template = await repo.findById(id);
  
  return created(template);
}

export default {
  getTemplates,
  getMultiStageTemplates,
  getRecurringTemplates,
  createTemplate
};

