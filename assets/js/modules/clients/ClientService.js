/**
 * Client Service Module
 * 客户相关的业务逻辑
 */

import { apiClient } from '../../core/api/client.js';
import endpoints from '../../core/api/endpoints.js';

export class ClientService {
  /**
   * 获取客户列表
   */
  static async getList(filters = {}) {
    const response = await apiClient.get(endpoints.clients.list, { params: filters });
    return response.data || response || [];
  }

  /**
   * 获取客户详情
   */
  static async getDetail(id) {
    const response = await apiClient.get(endpoints.clients.detail(id));
    return response.data || response;
  }

  /**
   * 创建客户
   */
  static async create(data) {
    const response = await apiClient.post(endpoints.clients.create, data);
    return response.data || response;
  }

  /**
   * 更新客户
   */
  static async update(id, data) {
    const response = await apiClient.put(endpoints.clients.update(id), data);
    return response.data || response;
  }

  /**
   * 删除客户
   */
  static async delete(id) {
    await apiClient.delete(endpoints.clients.delete(id));
  }

  /**
   * 获取客户服务配置
   */
  static async getServices(clientId = null) {
    const params = clientId ? { client_id: clientId } : {};
    const response = await apiClient.get(endpoints.clientServices.list(clientId), { params });
    return response.data || response || [];
  }
}

// 导出到全局
window.ClientService = ClientService;

export default ClientService;

