/**
 * SOPs Handler
 */
import { SopService } from '../services/SopService.js';
import { success, list, created } from '../utils/response.util.js';

export async function getSopCategories(env, request) {
  const service = new SopService(env.DB);
  const categories = await service.getCategories();
  return list(categories);
}

export async function getSops(env, request) {
  const service = new SopService(env.DB);
  const sops = await service.getAll();
  return success(sops);
}

export async function searchSops(env, request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('q') || url.searchParams.get('keyword');
  
  const service = new SopService(env.DB);
  const results = await service.search(keyword || '');
  return success(results);
}

export async function getSop(env, request) {
  const id = parseInt(request.params.id);
  const service = new SopService(env.DB);
  const sop = await service.getById(id);
  return success(sop);
}

export async function createSop(env, request) {
  const data = await request.json();
  const service = new SopService(env.DB);
  const sop = await service.create(data);
  return created(sop);
}

export async function updateSop(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new SopService(env.DB);
  const sop = await service.update(id, data);
  return success(sop);
}

export default {
  getSopCategories,
  getSops,
  searchSops,
  getSop,
  createSop,
  updateSop
};

