/**
 * Workload Handler
 * 工作量管理
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getWorkloadOverview(env, request) {
  // 简化版：返回基本统计
  const repo = new BaseRepository(env.DB, TABLES.TASKS);
  const tasks = await repo.findAll({ status: 'in_progress' });
  
  return success({
    total_tasks: tasks.length,
    in_progress: tasks.length
  });
}

export async function reassignTask(env, request) {
  const { taskId, newAssigneeId } = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.TASKS);
  
  await repo.update(taskId, { assigned_user_id: newAssigneeId });
  
  return success({ message: '任务已重新分配' });
}

export default {
  getWorkloadOverview,
  reassignTask
};

