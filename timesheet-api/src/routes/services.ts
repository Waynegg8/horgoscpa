/**
 * 服務項目 API 路由
 * 
 * ⚠️ 小型事務所彈性設計 - 所有人可協助維護
 * 
 * GET    /api/v1/services - 查詢服務項目
 * POST   /api/v1/services - 新增服務項目
 * PUT    /api/v1/services/:id - 更新服務項目
 * DELETE /api/v1/services/:id - 刪除服務項目
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { ServiceService } from '../services/ServiceService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const services = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/services
 * 查詢所有服務項目
 * 
 * @openapi
 * /services:
 *   get:
 *     tags:
 *       - 業務規則
 *     summary: 查詢服務項目列表
 *     description: 查詢所有服務項目（含層級結構，所有人可查看）
 *     responses:
 *       200:
 *         description: 成功
 */
services.get('/services', authMiddleware, async (c) => {
  const serviceService = new ServiceService(c.env.DB);
  const allServices = await serviceService.getAllServices();
  
  return jsonResponse(c, successResponse(allServices), 200);
});

/**
 * POST /api/v1/services
 * 新增服務項目（小型事務所彈性設計：所有人可用）
 * 
 * @openapi
 * /services:
 *   post:
 *     tags:
 *       - 業務規則
 *     summary: 新增服務項目
 *     description: 新增服務項目（所有人可用，最多兩層結構）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_name
 *             properties:
 *               parent_service_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: 父服務ID（NULL表示頂層服務）
 *               service_name:
 *                 type: string
 *                 example: "每月記帳"
 *               description:
 *                 type: string
 *                 example: "每月會計帳務處理"
 *               default_price:
 *                 type: number
 *                 example: 5000
 *               sort_order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: 創建成功
 *       409:
 *         description: 服務名稱已存在
 *       422:
 *         description: 驗證錯誤（如：超過兩層結構）
 */
services.post('/services', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const serviceService = new ServiceService(c.env.DB);
  const service = await serviceService.createService(data, user.user_id);
  
  return jsonResponse(c, successResponse(service), 201);
});

/**
 * PUT /api/v1/services/:id
 * 更新服務項目
 * 
 * @openapi
 * /services/{id}:
 *   put:
 *     tags:
 *       - 業務規則
 *     summary: 更新服務項目
 *     description: 更新服務項目資訊（所有人可用）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_name:
 *                 type: string
 *               description:
 *                 type: string
 *               default_price:
 *                 type: number
 *               sort_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 服務項目不存在
 *       409:
 *         description: 服務名稱已存在
 */
services.put('/services/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const serviceService = new ServiceService(c.env.DB);
  const service = await serviceService.updateService(serviceId, updates, user.user_id);
  
  return jsonResponse(c, successResponse(service), 200);
});

/**
 * DELETE /api/v1/services/:id
 * 刪除服務項目
 * 
 * @openapi
 * /services/{id}:
 *   delete:
 *     tags:
 *       - 業務規則
 *     summary: 刪除服務項目
 *     description: 軟刪除服務項目（所有人可用，有子服務或被客戶使用時無法刪除）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 刪除成功
 *       403:
 *         description: 有子服務或正在被使用，無法刪除
 *       404:
 *         description: 服務項目不存在
 */
services.delete('/services/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  
  const serviceService = new ServiceService(c.env.DB);
  await serviceService.deleteService(serviceId, user.user_id);
  
  return jsonResponse(c, successResponse({ message: '服務項目已刪除' }), 200);
});

export default services;

