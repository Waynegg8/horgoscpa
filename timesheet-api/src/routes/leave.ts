/**
 * 假期管理 API 路由
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { LeaveService } from '../services/LeaveService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const leave = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/leave/applications - 申請假期
 */
leave.post('/leave/applications', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const leaveService = new LeaveService(c.env.DB);
  const result = await leaveService.applyLeave(data, user);
  
  return jsonResponse(c, successResponse(result), 201);
});

/**
 * GET /api/v1/leave/applications - 查詢假期記錄
 */
leave.get('/leave/applications', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const filters = {
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };
  
  const leaveService = new LeaveService(c.env.DB);
  const applications = await leaveService.getLeaveApplications(filters, user);
  
  return jsonResponse(c, successResponse(applications), 200);
});

/**
 * GET /api/v1/leave/balance - 查詢假期餘額
 * ⭐ 核心功能：顯示所有假別的餘額
 * 
 * @openapi
 * /leave/balance:
 *   get:
 *     tags:
 *       - 假期管理
 *     summary: 查詢假期餘額
 *     description: |
 *       查詢所有假別的餘額
 *       - 特休：含累積制（去年剩餘+今年新增）
 *       - 病假：含生理假併入計算
 *       - 生活事件假期：含有效期和狀態
 *     parameters:
 *       - name: user_id
 *         in: query
 *         description: 用戶ID（管理員可查詢其他員工）
 *         schema:
 *           type: integer
 *       - name: year
 *         in: query
 *         description: 年度（預設當年）
 *         schema:
 *           type: integer
 *           example: 2025
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     year:
 *                       type: integer
 *                     balances:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           leave_type:
 *                             type: string
 *                           entitled_days:
 *                             type: number
 *                           carried_over_days:
 *                             type: number
 *                             description: 去年累積（僅特休）
 *                           used_days:
 *                             type: number
 *                           remaining_days:
 *                             type: number
 */
leave.get('/leave/balance', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const userId = c.req.query('user_id');
  const year = c.req.query('year');
  
  // 權限控制：員工只能查詢自己的
  const targetUserId = user.is_admin && userId ? parseInt(userId) : user.user_id;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  
  const leaveService = new LeaveService(c.env.DB);
  const balance = await leaveService.getLeaveBalance(targetUserId, targetYear);
  
  return jsonResponse(c, successResponse(balance), 200);
});

/**
 * GET /api/v1/leave/available-types - 查詢可申請假別（依性別過濾）
 */
leave.get('/leave/available-types', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const leaveService = new LeaveService(c.env.DB);
  const types = await leaveService.getAvailableLeaveTypes(user);
  
  return jsonResponse(c, successResponse(types), 200);
});

/**
 * POST /api/v1/leave/life-events - 登記生活事件
 */
leave.post('/leave/life-events', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const leaveService = new LeaveService(c.env.DB);
  const event = await leaveService.registerLifeEvent(data, user);
  
  return jsonResponse(c, successResponse(event), 201);
});

/**
 * GET /api/v1/leave/life-events - 查詢生活事件
 */
leave.get('/leave/life-events', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const userId = c.req.query('user_id');
  const targetUserId = user.is_admin && userId ? parseInt(userId) : user.user_id;
  
  const leaveService = new LeaveService(c.env.DB);
  const events = await leaveService.getLifeEvents(targetUserId);
  
  return jsonResponse(c, successResponse(events), 200);
});

/**
 * POST /api/v1/admin/cron/execute - 手動觸發 Cron Job
 */
leave.post('/admin/cron/execute', authMiddleware, requireAdmin, async (c) => {
  const { job_name, target_date } = await c.req.json();
  
  // 這裡會調用對應的 Cron Job 函數
  // 實際實現在 src/cron/ 目錄
  
  return jsonResponse(c, successResponse({ message: 'Cron Job 已手動觸發' }), 200);
});

/**
 * GET /api/v1/admin/cron/history - 查詢 Cron 執行歷史
 */
leave.get('/admin/cron/history', authMiddleware, requireAdmin, async (c) => {
  const jobName = c.req.query('job_name');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM CronJobExecutions
    ${jobName ? 'WHERE job_name = ?' : ''}
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(...(jobName ? [jobName] : [])).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

export default leave;

