/**
 * System Handler
 */
import { SystemService } from '../services/SystemService.js';
import { success, list } from '../utils/response.util.js';

export async function getBusinessTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getBusinessTypes();
  return list(types);
}

export async function getLeaveTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getLeaveTypes();
  return list(types);
}

export async function getHolidays(env, request) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
  
  const service = new SystemService(env.DB);
  const holidays = await service.getHolidays(year);
  return list(holidays);
}

export async function getWorkTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getWorkTypes();
  return list(types);
}

export default {
  getBusinessTypes,
  getLeaveTypes,
  getHolidays,
  getWorkTypes
};

