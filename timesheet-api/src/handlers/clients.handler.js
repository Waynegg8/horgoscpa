/**
 * Clients API Handler
 * 處理客戶相關的 HTTP 請求
 */

import { ClientService } from '../services/ClientService.js';
import { success, created, noContent, paginated } from '../utils/response.util.js';

/**
 * 獲取客戶列表
 * GET /api/clients
 */
export async function getClientList(env, request) {
  const url = new URL(request.url);
  
  const options = {
    page: parseInt(url.searchParams.get('page')) || 1,
    pageSize: parseInt(url.searchParams.get('pageSize')) || 20,
    status: url.searchParams.get('status'),
    region: url.searchParams.get('region'),
    search: url.searchParams.get('search')
  };

  const service = new ClientService(env.DB);
  const result = await service.getList(options);

  return paginated(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.pageSize
  );
}

/**
 * 獲取客戶詳情
 * GET /api/clients/:id
 */
export async function getClientDetail(env, request) {
  const id = parseInt(request.params.id);

  const service = new ClientService(env.DB);
  const client = await service.getDetail(id);

  return success(client);
}

/**
 * 創建客戶
 * POST /api/clients
 */
export async function createClient(env, request) {
  const data = await request.json();
  const user = request.user;

  const service = new ClientService(env.DB);
  const client = await service.create(data, { user });

  return created(client, '客戶創建成功');
}

/**
 * 更新客戶
 * PUT /api/clients/:id
 */
export async function updateClient(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;

  const service = new ClientService(env.DB);
  const client = await service.update(id, data, { user });

  return success(client);
}

/**
 * 刪除客戶
 * DELETE /api/clients/:id
 */
export async function deleteClient(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;

  const service = new ClientService(env.DB);
  await service.delete(id, { user });

  return noContent();
}

export default {
  getClientList,
  getClientDetail,
  createClient,
  updateClient,
  deleteClient
};

