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

export default {
  getUsers,
  createUser,
  resetUserPassword
};

