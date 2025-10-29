/**
 * 客戶服務生命週期 API 路由
 * 
 * POST /api/v1/client-services/:id/suspend - 暫停服務（所有人可用）
 * POST /api/v1/client-services/:id/resume - 恢復服務（所有人可用）
 * POST /api/v1/client-services/:id/cancel - 取消服務（僅管理員）
 * GET  /api/v1/client-services/:id/history - 查詢變更歷史
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { ClientServiceLifecycleService } from '../services/ClientServiceLifecycleService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const clientservices = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/client-services/:id/suspend
 * 暫停服務（小型事務所彈性設計：所有人可用）
 * 
 * @openapi
 * /client-services/{id}/suspend:
 *   post:
 *     tags:
 *       - 服務生命週期
 *     summary: 暫停服務
 *     description: |
 *       暫停客戶服務（所有人可用，員工只能操作自己負責的客戶）
 *       - 相關任務將不再自動生成
 *       - 未完成的任務將標記為暫停狀態
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "客戶要求暫時中止"
 *               notes:
 *                 type: string
 *                 example: "預計3個月後恢復"
 *     responses:
 *       200:
 *         description: 暫停成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 服務不存在
 *       422:
 *         description: 狀態錯誤
 */
clientservices.post('/client-services/:id/suspend', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const service = new ClientServiceLifecycleService(c.env.DB);
  const result = await service.suspendService(serviceId, data, user);

  return jsonResponse(c, successResponse(result), 200);
});

/**
 * POST /api/v1/client-services/:id/resume
 * 恢復服務（小型事務所彈性設計：所有人可用）
 * 
 * @openapi
 * /client-services/{id}/resume:
 *   post:
 *     tags:
 *       - 服務生命週期
 *     summary: 恢復服務
 *     description: |
 *       恢復已暫停的服務（所有人可用，員工只能操作自己負責的客戶）
 *       - 服務將重新開始自動生成任務
 *       - 已暫停的任務將恢復為待辦狀態
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "客戶已重新啟動服務"
 *     responses:
 *       200:
 *         description: 恢復成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 服務不存在
 *       422:
 *         description: 只能恢復已暫停的服務
 */
clientservices.post('/client-services/:id/resume', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const service = new ClientServiceLifecycleService(c.env.DB);
  const result = await service.resumeService(serviceId, data, user);

  return jsonResponse(c, successResponse(result), 200);
});

/**
 * POST /api/v1/client-services/:id/cancel
 * 取消服務（僅管理員）
 * 
 * @openapi
 * /client-services/{id}/cancel:
 *   post:
 *     tags:
 *       - 服務生命週期
 *     summary: 取消服務
 *     description: |
 *       取消客戶服務（僅管理員）
 *       - 此操作不可恢復
 *       - 可選擇同時取消相關的未完成任務
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "客戶不再需要此服務"
 *               cancel_pending_tasks:
 *                 type: boolean
 *                 default: true
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 取消成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 服務不存在
 */
clientservices.post('/client-services/:id/cancel', authMiddleware, requireAdmin, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const service = new ClientServiceLifecycleService(c.env.DB);
  const result = await service.cancelService(serviceId, data, user);

  return jsonResponse(c, successResponse(result), 200);
});

/**
 * GET /api/v1/client-services/:id/history
 * 查詢服務變更歷史
 * 
 * @openapi
 * /client-services/{id}/history:
 *   get:
 *     tags:
 *       - 服務生命週期
 *     summary: 查詢服務變更歷史
 *     description: |
 *       查詢服務狀態變更的歷史記錄
 *       - 顯示誰在何時暫停/恢復/取消了服務
 *       - 包含原因和備註
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 服務不存在
 */
clientservices.get('/client-services/:id/history', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));

  const service = new ClientServiceLifecycleService(c.env.DB);
  const history = await service.getServiceHistory(serviceId, user);

  return jsonResponse(c, successResponse(history), 200);
});

export default clientservices;

