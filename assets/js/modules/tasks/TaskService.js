/**
 * Task Service Module
 * 任务相关的业务逻辑
 */

import { apiClient } from '../../core/api/client.js';
import endpoints from '../../core/api/endpoints.js';

export class TaskService {
  /**
   * 获取任务列表
   */
  static async getList(filters = {}) {
    const response = await apiClient.get(endpoints.tasks.list, { params: filters });
    return response.data?.tasks || response.tasks || [];
  }

  /**
   * 获取多阶段任务
   */
  static async getMultiStageTasks(filters = {}) {
    const response = await apiClient.get(endpoints.tasks.list + '/multi-stage', { params: filters });
    return response.data?.tasks || response.tasks || [];
  }

  /**
   * 获取周期任务
   */
  static async getRecurringTasks(filters = {}) {
    const response = await apiClient.get(endpoints.tasks.list + '/recurring', { params: filters });
    return response.data || response || [];
  }

  /**
   * 创建任务
   */
  static async create(data) {
    const response = await apiClient.post(endpoints.tasks.create, data);
    return response.data || response;
  }

  /**
   * 更新任务
   */
  static async update(id, data) {
    const response = await apiClient.put(endpoints.tasks.update(id), data);
    return response.data || response;
  }

  /**
   * 删除任务
   */
  static async delete(id) {
    await apiClient.delete(endpoints.tasks.delete(id));
  }

  /**
   * 获取任务统计
   */
  static async getStats() {
    const response = await apiClient.get(endpoints.tasks.stats);
    return response.data || response;
  }
}

// 导出到全局
window.TaskService = TaskService;

export default TaskService;

