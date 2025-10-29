/**
 * 客戶管理 API 路由
 * 
 * ⚠️ 小型事務所彈性設計 - 所有人可用（員工自動過濾權限）
 * 
 * GET    /api/v1/clients - 查詢客戶列表
 * POST   /api/v1/clients - 新增客戶
 * GET    /api/v1/clients/:id - 查詢客戶詳情
 * PUT    /api/v1/clients/:id - 更新客戶
 * DELETE /api/v1/clients/:id - 刪除客戶
 * GET    /api/v1/clients/tags - 獲取所有標籤
 * POST   /api/v1/clients/tags - 新增標籤
 * POST   /api/v1/clients/batch-update - 批量更新（僅管理員）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { ClientService } from '../services/ClientService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const clients = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/clients
 * 查詢客戶列表
 * 
 * @openapi
 * /clients:
 *   get:
 *     tags:
 *       - 客戶管理
 *     summary: 查詢客戶列表
 *     description: |
 *       查詢客戶列表，支持搜尋和分頁
 *       - 管理員可查看所有客戶
 *       - 員工只能查看自己負責的客戶
 *       - 支援 N+1 查詢優化（使用 JOIN）
 *     parameters:
 *       - name: company_name
 *         in: query
 *         description: 公司名稱搜尋（模糊匹配）
 *         schema:
 *           type: string
 *       - name: business_status
 *         in: query
 *         description: 營業狀態
 *         schema:
 *           type: string
 *           enum: [營業中, 暫停營業, 已結束營業]
 *       - name: tag_id
 *         in: query
 *         description: 標籤 ID 篩選
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: fields
 *         in: query
 *         description: 返回字段（逗號分隔，如：client_id,company_name,tags）
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 */
clients.get('/clients', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const filters = {
    company_name: c.req.query('company_name'),
    business_status: c.req.query('business_status'),
    tag_id: c.req.query('tag_id') ? parseInt(c.req.query('tag_id')!) : undefined,
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
    fields: c.req.query('fields')?.split(','),
  };
  
  const clientService = new ClientService(c.env.DB);
  const result = await clientService.getClients(filters, user);
  
  return jsonResponse(
    c,
    successResponse(result.clients, createPagination(result.total, filters.limit, filters.offset)),
    200
  );
});

/**
 * POST /api/v1/clients
 * 新增客戶
 * 
 * @openapi
 * /clients:
 *   post:
 *     tags:
 *       - 客戶管理
 *     summary: 新增客戶
 *     description: 新增客戶（所有人可用，小型事務所彈性設計）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - company_name
 *             properties:
 *               client_id:
 *                 type: string
 *                 example: "12345678"
 *                 description: 統一編號（8位數字）
 *               company_name:
 *                 type: string
 *                 example: "測試會計事務所"
 *               tax_registration_number:
 *                 type: string
 *                 example: "12345678"
 *               business_status:
 *                 type: string
 *                 enum: [營業中, 暫停營業, 已結束營業]
 *                 default: 營業中
 *               assignee_user_id:
 *                 type: integer
 *                 example: 1
 *                 description: 負責員工 ID（未指定時預設為建立者）
 *               phone:
 *                 type: string
 *                 example: "02-1234-5678"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "client@example.com"
 *               client_notes:
 *                 type: string
 *                 example: "喜歡提前收到報表"
 *               payment_notes:
 *                 type: string
 *                 example: "由財務陳小姐負責"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *     responses:
 *       201:
 *         description: 創建成功
 *       409:
 *         description: 統一編號已存在
 *       422:
 *         description: 驗證錯誤
 */
clients.post('/clients', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const clientService = new ClientService(c.env.DB);
  const client = await clientService.createClient(data, user.user_id, user);
  
  return jsonResponse(c, successResponse(client), 201);
});

/**
 * GET /api/v1/clients/:id
 * 查詢客戶詳情
 * 
 * @openapi
 * /clients/{id}:
 *   get:
 *     tags:
 *       - 客戶管理
 *     summary: 查詢客戶詳情
 *     description: 查詢指定客戶的詳細資訊（員工只能查看自己負責的客戶）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 無權查看此客戶
 *       404:
 *         description: 客戶不存在
 */
clients.get('/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('id');
  
  const clientService = new ClientService(c.env.DB);
  const client = await clientService.getClientById(clientId, user);
  
  return jsonResponse(c, successResponse(client), 200);
});

/**
 * PUT /api/v1/clients/:id
 * 更新客戶
 * 
 * @openapi
 * /clients/{id}:
 *   put:
 *     tags:
 *       - 客戶管理
 *     summary: 更新客戶資訊
 *     description: 更新客戶資料（所有人可用，員工只能編輯自己負責的客戶）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               client_notes:
 *                 type: string
 *               payment_notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 無權編輯此客戶
 *       404:
 *         description: 客戶不存在
 */
clients.put('/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('id');
  const updates = await c.req.json();
  
  const clientService = new ClientService(c.env.DB);
  const client = await clientService.updateClient(clientId, updates, user.user_id, user);
  
  return jsonResponse(c, successResponse(client), 200);
});

/**
 * DELETE /api/v1/clients/:id
 * 刪除客戶
 * 
 * @openapi
 * /clients/{id}:
 *   delete:
 *     tags:
 *       - 客戶管理
 *     summary: 刪除客戶
 *     description: 軟刪除客戶（所有人可用，員工只能刪除自己負責的客戶）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 刪除成功
 *       403:
 *         description: 無權刪除或客戶有啟用中的服務
 *       404:
 *         description: 客戶不存在
 */
clients.delete('/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('id');
  
  const clientService = new ClientService(c.env.DB);
  await clientService.deleteClient(clientId, user.user_id, user);
  
  return jsonResponse(c, successResponse({ message: '客戶已刪除' }), 200);
});

/**
 * GET /api/v1/clients/tags
 * 獲取所有標籤
 * 
 * @openapi
 * /clients/tags:
 *   get:
 *     tags:
 *       - 客戶管理
 *     summary: 獲取所有標籤
 *     description: 獲取所有客戶標籤（所有人可查看）
 *     responses:
 *       200:
 *         description: 成功
 */
clients.get('/clients/tags', authMiddleware, async (c) => {
  const clientService = new ClientService(c.env.DB);
  const tags = await clientService.getAllTags();
  
  return jsonResponse(c, successResponse(tags), 200);
});

/**
 * POST /api/v1/clients/tags
 * 新增標籤
 * 
 * @openapi
 * /clients/tags:
 *   post:
 *     tags:
 *       - 客戶管理
 *     summary: 新增客戶標籤
 *     description: 新增客戶標籤（所有人可用，小型事務所彈性設計）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tag_name
 *             properties:
 *               tag_name:
 *                 type: string
 *                 example: "優先客戶"
 *               tag_color:
 *                 type: string
 *                 example: "#EF4444"
 *               description:
 *                 type: string
 *                 example: "需要優先處理的客戶"
 *               sort_order:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       201:
 *         description: 創建成功
 *       409:
 *         description: 標籤名稱已存在
 */
clients.post('/clients/tags', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const clientService = new ClientService(c.env.DB);
  const tag = await clientService.createTag(data, user.user_id);
  
  return jsonResponse(c, successResponse(tag), 201);
});

/**
 * POST /api/v1/clients/batch-update
 * 批量更新客戶（僅管理員）
 * 
 * @openapi
 * /clients/batch-update:
 *   post:
 *     tags:
 *       - 客戶管理
 *     summary: 批量更新客戶
 *     description: 批量更新多個客戶的資訊（僅管理員）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_ids
 *               - updates
 *             properties:
 *               client_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["12345678", "87654321"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   business_status:
 *                     type: string
 *                     enum: [營業中, 暫停營業, 已結束營業]
 *                   assignee_user_id:
 *                     type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 權限不足
 */
clients.post('/clients/batch-update', authMiddleware, requireAdmin, async (c) => {
  const user = c.get('user') as User;
  const { client_ids, updates } = await c.req.json();
  
  const clientService = new ClientService(c.env.DB);
  const result = await clientService.batchUpdateClients(client_ids, updates, user.user_id);
  
  return jsonResponse(c, successResponse(result), 200);
});

export default clients;

