/**
 * Media Handler
 * 媒体库管理
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getMediaList(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.MEDIA_LIBRARY);
  const media = await repo.findAll({}, { orderBy: 'created_at', order: 'DESC' });
  return list(media);
}

export async function uploadMedia(env, request) {
  // 简化版：只记录元数据，实际上传到 R2 在前端处理
  const data = await request.json();
  
  const repo = new BaseRepository(env.DB, TABLES.MEDIA_LIBRARY);
  data.uploaded_by_user_id = request.user.id;
  
  const id = await repo.create(data);
  const media = await repo.findById(id);
  
  return created(media);
}

export async function deleteMedia(env, request) {
  const id = parseInt(request.params.id);
  const repo = new BaseRepository(env.DB, TABLES.MEDIA_LIBRARY);
  await repo.delete(id);
  return success({ message: '删除成功' });
}

export default {
  getMediaList,
  uploadMedia,
  deleteMedia
};

