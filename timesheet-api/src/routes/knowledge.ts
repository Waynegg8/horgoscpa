/**
 * 知識管理 API 路由
 * 
 * SOP 文件管理（6個 API）：
 * GET    /api/v1/sop - 查詢 SOP 列表
 * POST   /api/v1/sop - 新增 SOP
 * GET    /api/v1/sop/:id - 查詢 SOP 詳情
 * PUT    /api/v1/sop/:id - 更新 SOP
 * DELETE /api/v1/sop/:id - 刪除 SOP（僅管理員）
 * POST   /api/v1/sop/:id/publish - 發布 SOP
 * 
 * 客戶專屬 SOP（3個 API）：
 * GET    /api/v1/clients/:clientId/sop - 查詢客戶關聯的 SOP
 * POST   /api/v1/clients/:clientId/sop - 關聯 SOP 到客戶
 * DELETE /api/v1/clients/:clientId/sop/:sopId - 移除客戶 SOP 關聯
 * 
 * 知識庫（6個 API）：
 * GET    /api/v1/knowledge - 查詢知識庫列表
 * POST   /api/v1/knowledge - 新增知識文章
 * GET    /api/v1/knowledge/:id - 查詢知識文章詳情
 * PUT    /api/v1/knowledge/:id - 更新知識文章
 * DELETE /api/v1/knowledge/:id - 刪除知識文章（僅管理員）
 * GET    /api/v1/knowledge/search - 搜尋知識庫
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { KnowledgeService } from '../services/KnowledgeService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const knowledge = new Hono<{ Bindings: Env }>();

// ==================== SOP 文件管理 ====================

/**
 * GET /api/v1/sop
 * 查詢 SOP 列表
 * ⭐ 所有人可查看
 */
knowledge.get('/sop', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  const filters = {
    category: c.req.query('category'),
    is_published: c.req.query('is_published') === 'true' ? true : undefined,
    search: c.req.query('search'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const knowledgeService = new KnowledgeService(c.env.DB);
  const result = await knowledgeService.getSOPs(filters, user);

  return jsonResponse(
    c,
    successResponse(result.sops, createPagination(result.total, filters.limit, filters.offset)),
    200
  );
});

/**
 * POST /api/v1/sop
 * 新增 SOP
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.post('/sop', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();

  const knowledgeService = new KnowledgeService(c.env.DB);
  const sop = await knowledgeService.createSOP(data, user);

  return jsonResponse(c, successResponse(sop), 201);
});

/**
 * GET /api/v1/sop/:id
 * 查詢 SOP 詳情
 */
knowledge.get('/sop/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const sopId = parseInt(c.req.param('id'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  const sop = await knowledgeService.getSOPById(sopId, user);

  return jsonResponse(c, successResponse(sop), 200);
});

/**
 * PUT /api/v1/sop/:id
 * 更新 SOP（版本號自動+1）
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.put('/sop/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const sopId = parseInt(c.req.param('id'));
  const updates = await c.req.json();

  const knowledgeService = new KnowledgeService(c.env.DB);
  const sop = await knowledgeService.updateSOP(sopId, updates, user);

  return jsonResponse(c, successResponse(sop), 200);
});

/**
 * DELETE /api/v1/sop/:id
 * 刪除 SOP
 * ⭐ 僅管理員可用
 */
knowledge.delete('/sop/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const sopId = parseInt(c.req.param('id'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  await knowledgeService.deleteSOP(sopId, user);

  return jsonResponse(c, successResponse({ message: '刪除成功' }), 200);
});

/**
 * POST /api/v1/sop/:id/publish
 * 發布 SOP
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.post('/sop/:id/publish', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const sopId = parseInt(c.req.param('id'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  await knowledgeService.publishSOP(sopId, user);

  return jsonResponse(c, successResponse({ message: '發布成功' }), 200);
});

// ==================== 客戶專屬 SOP ====================

/**
 * GET /api/v1/clients/:clientId/sop
 * 查詢客戶關聯的 SOP
 */
knowledge.get('/clients/:clientId/sop', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('clientId');

  const knowledgeService = new KnowledgeService(c.env.DB);
  const sops = await knowledgeService.getClientSOPs(clientId, user);

  return jsonResponse(c, successResponse(sops), 200);
});

/**
 * POST /api/v1/clients/:clientId/sop
 * 關聯 SOP 到客戶
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.post('/clients/:clientId/sop', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('clientId');
  const { sop_id, notes } = await c.req.json();

  const knowledgeService = new KnowledgeService(c.env.DB);
  const result = await knowledgeService.assignSOPToClient(clientId, sop_id, notes, user);

  return jsonResponse(c, successResponse(result), 201);
});

/**
 * DELETE /api/v1/clients/:clientId/sop/:sopId
 * 移除客戶 SOP 關聯
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.delete('/clients/:clientId/sop/:sopId', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('clientId');
  const sopId = parseInt(c.req.param('sopId'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  await knowledgeService.removeClientSOP(clientId, sopId, user);

  return jsonResponse(c, successResponse({ message: '移除成功' }), 200);
});

// ==================== 知識庫 ====================

/**
 * GET /api/v1/knowledge
 * 查詢知識庫列表
 */
knowledge.get('/knowledge', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  const filters = {
    category: c.req.query('category'),
    is_published: c.req.query('is_published') === 'true' ? true : undefined,
    search: c.req.query('search'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const knowledgeService = new KnowledgeService(c.env.DB);
  const result = await knowledgeService.getKnowledge(filters, user);

  return jsonResponse(
    c,
    successResponse(result.articles, createPagination(result.total, filters.limit, filters.offset)),
    200
  );
});

/**
 * POST /api/v1/knowledge
 * 新增知識文章
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.post('/knowledge', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();

  const knowledgeService = new KnowledgeService(c.env.DB);
  const article = await knowledgeService.createKnowledge(data, user);

  return jsonResponse(c, successResponse(article), 201);
});

/**
 * GET /api/v1/knowledge/search
 * 搜尋知識庫（全文搜尋）
 * ⚠️ 必須放在 /knowledge/:id 之前，否則會被 :id 路由捕獲
 */
knowledge.get('/knowledge/search', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const query = c.req.query('q') || '';

  const knowledgeService = new KnowledgeService(c.env.DB);
  const results = await knowledgeService.searchKnowledge(query, user);

  return jsonResponse(c, successResponse(results), 200);
});

/**
 * GET /api/v1/knowledge/:id
 * 查詢知識文章詳情（並增加瀏覽次數）
 */
knowledge.get('/knowledge/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const articleId = parseInt(c.req.param('id'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  const article = await knowledgeService.getKnowledgeById(articleId, user);

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * PUT /api/v1/knowledge/:id
 * 更新知識文章
 * ⭐ 小型事務所彈性設計：所有人可用
 */
knowledge.put('/knowledge/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const articleId = parseInt(c.req.param('id'));
  const updates = await c.req.json();

  const knowledgeService = new KnowledgeService(c.env.DB);
  const article = await knowledgeService.updateKnowledge(articleId, updates, user);

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * DELETE /api/v1/knowledge/:id
 * 刪除知識文章
 * ⭐ 僅管理員可用
 */
knowledge.delete('/knowledge/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const articleId = parseInt(c.req.param('id'));

  const knowledgeService = new KnowledgeService(c.env.DB);
  await knowledgeService.deleteKnowledge(articleId, user);

  return jsonResponse(c, successResponse({ message: '刪除成功' }), 200);
});

export default knowledge;

