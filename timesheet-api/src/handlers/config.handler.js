/**
 * System Config Handler
 * 系统配置管理
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getConfigCategories(env, request) {
  // 返回配置分类
  const categories = [
    { id: 'general', name: '一般设定' },
    { id: 'task', name: '任务设定' },
    { id: 'notification', name: '通知设定' },
    { id: 'report', name: '报表设定' }
  ];
  return list(categories);
}

export async function getConfigByCategory(env, request) {
  const category = request.params.category;
  const repo = new BaseRepository(env.DB, TABLES.SYSTEM_PARAMETERS);
  
  const params = await repo.findAll({ param_category: category });
  return list(params);
}

export async function updateConfig(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.SYSTEM_PARAMETERS);
  
  // 批量更新
  if (Array.isArray(data.updates)) {
    for (const update of data.updates) {
      const existing = await repo.findOne({
        param_category: update.category,
        param_key: update.key
      });
      
      if (existing) {
        await repo.update(existing.id, { param_value: update.value });
      }
    }
  }
  
  return success({ message: '配置已更新' });
}

export default {
  getConfigCategories,
  getConfigByCategory,
  updateConfig
};

