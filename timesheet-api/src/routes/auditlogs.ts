/**
 * 審計日誌 API 路由
 * 
 * GET  /api/v1/admin/audit-logs - 查詢操作日誌
 * GET  /api/v1/admin/audit-logs/user/:userId - 查詢特定員工的日誌
 */

import { Hono } from 'hono';
import { Env } from '../types';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const auditlogs = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/admin/audit-logs
 * 查詢操作日誌（僅管理員）
 * 
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags:
 *       - 審計日誌
 *     summary: 查詢操作日誌
 *     description: 查詢系統操作日誌（僅管理員）
 *     parameters:
 *       - name: user_id
 *         in: query
 *         schema:
 *           type: integer
 *       - name: table_name
 *         in: query
 *         schema:
 *           type: string
 *       - name: action
 *         in: query
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT]
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
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 權限不足
 */
auditlogs.get('/admin/audit-logs', authMiddleware, requireAdmin, async (c) => {
  const filters = {
    user_id: c.req.query('user_id') ? parseInt(c.req.query('user_id')!) : undefined,
    table_name: c.req.query('table_name'),
    action: c.req.query('action'),
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    limit: parseInt(c.req.query('limit') || '100'),
    offset: parseInt(c.req.query('offset') || '0'),
  };
  
  const auditLogRepo = new AuditLogRepository(c.env.DB);
  const result = await auditLogRepo.findAll(filters);
  
  return jsonResponse(
    c,
    successResponse(result.logs, createPagination(result.total, filters.limit, filters.offset)),
    200
  );
});

/**
 * GET /api/v1/admin/audit-logs/user/:userId
 * 查詢特定員工的操作日誌（僅管理員）
 * 
 * @openapi
 * /admin/audit-logs/user/{userId}:
 *   get:
 *     tags:
 *       - 審計日誌
 *     summary: 查詢特定員工的操作日誌
 *     description: 查詢指定員工的所有操作記錄（僅管理員）
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
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
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 權限不足
 */
auditlogs.get('/admin/audit-logs/user/:userId', authMiddleware, requireAdmin, async (c) => {
  const userId = parseInt(c.req.param('userId'));
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const auditLogRepo = new AuditLogRepository(c.env.DB);
  const result = await auditLogRepo.findByUser(userId, limit, offset);
  
  return jsonResponse(
    c,
    successResponse(result.logs, createPagination(result.total, limit, offset)),
    200
  );
});

export default auditlogs;

