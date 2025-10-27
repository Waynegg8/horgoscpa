/**
 * Posts Handler (CMS)
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getPosts(env, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  
  const repo = new BaseRepository(env.DB, TABLES.POSTS);
  const filters = status ? { status } : {};
  const posts = await repo.findAll(filters, { orderBy: 'created_at', order: 'DESC' });
  
  return list(posts);
}

export async function getPost(env, request) {
  const id = parseInt(request.params.id);
  const repo = new BaseRepository(env.DB, TABLES.POSTS);
  const post = await repo.findById(id);
  return success(post);
}

export async function createPost(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.POSTS);
  
  if (!data.status) data.status = 'draft';
  if (!data.author_user_id) data.author_user_id = request.user.id;
  
  const id = await repo.create(data);
  const post = await repo.findById(id);
  
  return created(post);
}

export async function updatePost(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  
  const repo = new BaseRepository(env.DB, TABLES.POSTS);
  await repo.update(id, data);
  const post = await repo.findById(id);
  
  return success(post);
}

export async function deletePost(env, request) {
  const id = parseInt(request.params.id);
  const repo = new BaseRepository(env.DB, TABLES.POSTS);
  await repo.delete(id);
  return success({ message: '删除成功' });
}

export default {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
};

