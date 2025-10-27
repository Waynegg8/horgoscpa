/**
 * Clients Handler
 */
import { ClientService } from '../services/ClientService.js';
import { ClientServiceConfigService } from '../services/ClientServiceConfigService.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created, noContent } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getClients(env, request) {
  const service = new ClientService(env.DB);
  const clients = await service.getAll();
  return list(clients);
}

export async function getClient(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientService(env.DB);
  const client = await service.getById(id);
  return success(client);
}

export async function createClient(env, request) {
  const data = await request.json();
  const service = new ClientService(env.DB);
  const client = await service.create(data);
  return created(client);
}

export async function updateClient(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new ClientService(env.DB);
  const client = await service.update(id, data);
  return success(client);
}

export async function deleteClient(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientService(env.DB);
  await service.delete(id);
  return noContent();
}

export async function getClientServices(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  
  const service = new ClientServiceConfigService(env.DB);
  const filters = clientId ? { client_id: parseInt(clientId) } : {};
  const services = await service.getAll(filters);
  
  return success(services);
}

export async function createClientService(env, request) {
  const data = await request.json();
  const service = new ClientServiceConfigService(env.DB);
  const result = await service.create(data);
  return created(result);
}

export async function updateClientService(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new ClientServiceConfigService(env.DB);
  const result = await service.update(id, data);
  return success(result);
}

export async function toggleClientService(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientServiceConfigService(env.DB);
  const result = await service.toggleActive(id);
  return success(result);
}

export async function deleteClientService(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientServiceConfigService(env.DB);
  await service.delete(id);
  return noContent();
}

export async function getClientInteractions(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  
  const repo = new BaseRepository(env.DB, TABLES.CLIENT_INTERACTIONS);
  const filters = clientId ? { client_id: parseInt(clientId) } : {};
  const interactions = await repo.findAll(filters, { orderBy: 'interaction_date', order: 'DESC' });
  
  return success(interactions);
}

export async function getClientsExtended(env, request) {
  // 扩展客户信息（含服务统计）
  const service = new ClientService(env.DB);
  const clients = await service.getAll();
  
  // 添加服务统计
  const csRepo = new ClientServiceRepository(env.DB);
  for (const client of clients) {
    const services = await csRepo.findByClient(client.id);
    client.active_services = services.filter(s => s.is_active).length;
    client.total_services = services.length;
  }
  
  return list(clients);
}

export async function getServiceSchedule(env, request) {
  // 服务排程（实际是 client_services 的别名）
  const repo = new ClientServiceRepository(env.DB);
  const services = await repo.findAllWithClient();
  return list(services);
}

export async function createServiceSchedule(env, request) {
  const data = await request.json();
  const service = new ClientServiceConfigService(env.DB);
  const result = await service.create(data);
  return created(result);
}

export default {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientServices,
  createClientService,
  updateClientService,
  toggleClientService,
  deleteClientService,
  getClientInteractions,
  getClientsExtended,
  getServiceSchedule,
  createServiceSchedule
};
