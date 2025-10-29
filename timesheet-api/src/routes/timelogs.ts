/**
 * 工時管理 API 路由
 * 
 * GET    /api/v1/timelogs - 查詢工時記錄
 * POST   /api/v1/timelogs - 新增工時
 * PUT    /api/v1/timelogs/:id - 更新工時
 * DELETE /api/v1/timelogs/:id - 刪除工時
 * POST   /api/v1/weighted-hours/calculate - 計算加權工時
 * GET    /api/v1/compensatory-leave - 查詢補休餘額
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { TimeLogService } from '../services/TimeLogService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const timelogs = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/timelogs
 * 查詢工時記錄
 * 
 * @openapi
 * /timelogs:
 *   get:
 *     tags:
 *       - 工時管理
 *     summary: 查詢工時記錄
 *     description: |
 *       查詢工時記錄
 *       - 管理員可查看所有人的工時
 *       - 員工只能查看自己的工時
 *     parameters:
 *       - name: start_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: end_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: client_id
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 */
timelogs.get('/timelogs', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const filters = {
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    client_id: c.req.query('client_id'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };
  
  const timeLogService = new TimeLogService(c.env.DB);
  const result = await timeLogService.getTimeLogs(filters, user);
  
  return jsonResponse(
    c,
    successResponse(result.logs, createPagination(result.total, filters.limit, filters.offset)),
    200
  );
});

/**
 * POST /api/v1/timelogs
 * 新增工時記錄
 * ⭐ 加班時自動累積補休
 * 
 * @openapi
 * /timelogs:
 *   post:
 *     tags:
 *       - 工時管理
 *     summary: 新增工時記錄
 *     description: |
 *       新增工時記錄（只能新增自己的）
 *       - 加班時自動累積補休
 *       - 自動計算加權工時
 *       - 驗證工時精度（必須是0.5的倍數）
 *       - 驗證每日工時上限（12小時）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - work_date
 *               - work_type_id
 *               - hours
 *             properties:
 *               work_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-01"
 *               client_id:
 *                 type: string
 *                 example: "12345678"
 *               service_id:
 *                 type: integer
 *                 example: 1
 *               work_type_id:
 *                 type: integer
 *                 example: 1
 *               hours:
 *                 type: number
 *                 example: 8.5
 *               leave_type_id:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: "整理傳票"
 *     responses:
 *       201:
 *         description: 創建成功
 *       422:
 *         description: 驗證錯誤
 */
timelogs.post('/timelogs', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const timeLogService = new TimeLogService(c.env.DB);
  const timeLog = await timeLogService.createTimeLog(data, user.user_id);
  
  return jsonResponse(c, successResponse(timeLog), 201);
});

/**
 * PUT /api/v1/timelogs/:id
 * 更新工時記錄
 */
timelogs.put('/timelogs/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const logId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const timeLogService = new TimeLogService(c.env.DB);
  const timeLog = await timeLogService.updateTimeLog(logId, updates, user.user_id, user);
  
  return jsonResponse(c, successResponse(timeLog), 200);
});

/**
 * DELETE /api/v1/timelogs/:id
 * 刪除工時記錄
 */
timelogs.delete('/timelogs/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const logId = parseInt(c.req.param('id'));
  
  const timeLogService = new TimeLogService(c.env.DB);
  await timeLogService.deleteTimeLog(logId, user.user_id, user);
  
  return jsonResponse(c, successResponse({ message: '工時記錄已刪除' }), 200);
});

/**
 * POST /api/v1/weighted-hours/calculate
 * 計算加權工時
 */
timelogs.post('/weighted-hours/calculate', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const { user_id, start_date, end_date } = await c.req.json();
  
  // 權限控制：員工只能查詢自己的
  const targetUserId = user.is_admin && user_id ? user_id : user.user_id;
  
  const timeLogService = new TimeLogService(c.env.DB);
  const result = await timeLogService.calculateWeightedHours(targetUserId, start_date, end_date);
  
  return jsonResponse(c, successResponse(result), 200);
});

/**
 * GET /api/v1/compensatory-leave
 * 查詢補休餘額
 */
timelogs.get('/compensatory-leave', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const userId = c.req.query('user_id');
  
  // 權限控制：員工只能查詢自己的
  const targetUserId = user.is_admin && userId ? parseInt(userId) : user.user_id;
  
  const timeLogService = new TimeLogService(c.env.DB);
  const balance = await timeLogService.getCompensatoryLeaveBalance(targetUserId);
  
  return jsonResponse(c, successResponse(balance), 200);
});

/**
 * POST /api/v1/compensatory-leave/use
 * 使用補休（FIFO 先進先出）
 */
timelogs.post('/compensatory-leave/use', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const { hours, use_date, leave_application_id } = await c.req.json();
  
  const timeLogService = new TimeLogService(c.env.DB);
  const result = await timeLogService.useCompensatoryLeave(
    user.user_id,
    hours,
    use_date,
    leave_application_id
  );
  
  return jsonResponse(c, successResponse(result), 200);
});

/**
 * POST /api/v1/compensatory-leave/convert
 * 手動轉換補休為加班費
 */
timelogs.post('/compensatory-leave/convert', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const { compe_leave_ids, conversion_rate } = await c.req.json();
  
  const timeLogService = new TimeLogService(c.env.DB);
  const result = await timeLogService.convertCompensatoryLeaveToPayment(
    compe_leave_ids,
    conversion_rate,
    user.user_id
  );
  
  return jsonResponse(c, successResponse(result), 200);
});

/**
 * GET /api/v1/compensatory-leave/history
 * 查詢補休使用歷史
 */
timelogs.get('/compensatory-leave/history', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');
  
  const timeLogService = new TimeLogService(c.env.DB);
  const history = await timeLogService.getCompensatoryLeaveHistory(
    user.user_id,
    startDate,
    endDate
  );
  
  return jsonResponse(c, successResponse(history), 200);
});

export default timelogs;

