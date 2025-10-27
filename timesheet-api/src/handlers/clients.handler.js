/**
 * Clients Handler
 */
import { ClientService } from '../services/ClientService.js';
import { ClientServiceRepository } from '../repositories/ClientServiceRepository.js';
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
  
  const repo = new ClientServiceRepository(env.DB);
  const services = clientId 
    ? await repo.findByClient(parseInt(clientId))
    : await repo.findAllWithClient();
  
  return success(services);
}

export async function getClientInteractions(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  
  const repo = new BaseRepository(env.DB, TABLES.CLIENT_INTERACTIONS);
  const filters = clientId ? { client_id: parseInt(clientId) } : {};
  const interactions = await repo.findAll(filters, { orderBy: 'interaction_date', order: 'DESC' });
  
  return success(interactions);
}

export default {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientServices,
  getClientInteractions
};
