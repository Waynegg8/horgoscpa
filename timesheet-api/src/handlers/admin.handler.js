/**
 * Admin Handler
 * 管理员专用功能
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';
import { hashPassword } from '../auth.js';

export async function getUsers(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.USERS);
  const users = await repo.findAll({}, { orderBy: 'username', order: 'ASC' });
  return list(users);
}

export async function createUser(env, request) {
  const data = await request.json();
  
  // Hash 密码
  if (data.password) {
    data.password_hash = await hashPassword(data.password);
    delete data.password;
  }
  
  const repo = new BaseRepository(env.DB, TABLES.USERS);
  const id = await repo.create(data);
  const user = await repo.findById(id);
  
  return created(user);
}

export async function resetUserPassword(env, request) {
  const { username, newPassword } = await request.json();
  
  const repo = new BaseRepository(env.DB, TABLES.USERS);
  const user = await repo.findOne({ username });
  
  if (!user) {
    return success({ error: '用户不存在' }, null, 404);
  }
  
  const passwordHash = await hashPassword(newPassword);
  await repo.update(user.id, { password_hash: passwordHash });
  
  return success({ message: '密码重置成功' });
}

export async function createAdminClient(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.CLIENTS);
  
  const id = await repo.create(data);
  const client = await repo.findById(id);
  
  return created(client);
}

export async function createAdminEmployee(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.EMPLOYEES);
  
  if (!data.is_active) data.is_active = true;
  
  const id = await repo.create(data);
  const employee = await repo.findById(id);
  
  return created(employee);
}

export async function getAdminEmployees(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.EMPLOYEES);
  const employees = await repo.findAll({}, { orderBy: 'name', order: 'ASC' });
  return list(employees);
}

export async function getSystemParams(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.SYSTEM_PARAMETERS);
  const params = await repo.findAll({});
  return list(params);
}

export async function updateSystemParam(env, request) {
  const { id, value } = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.SYSTEM_PARAMETERS);
  
  await repo.update(id, { param_value: value });
  
  return success({ message: '参数已更新' });
}

export async function createLeaveType(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.LEAVE_TYPES);
  
  if (!data.is_active) data.is_active = true;
  
  const id = await repo.create(data);
  const leaveType = await repo.findById(id);
  
  return created(leaveType);
}

export async function createHoliday(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.HOLIDAYS);
  
  const id = await repo.create(data);
  const holiday = await repo.findById(id);
  
  return created(holiday);
}

export async function getCacheStats(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.REPORT_CACHE);
  const caches = await repo.findAll({});
  
  return success({
    total: caches.length,
    size_mb: 0
  });
}

export default {
  getUsers,
  createUser,
  resetUserPassword,
  createAdminClient,
  createAdminEmployee,
  getAdminEmployees,
  getSystemParams,
  updateSystemParam,
  createLeaveType,
  createHoliday,
  getCacheStats
};

