/**
 * 假別類型 API 路由（小型事務所彈性設計：所有人可用）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { LeaveTypeRepository } from '../repositories/LeaveTypeRepository';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { ConflictError, NotFoundError, ValidationError } from '../types';
import { createAuditLog } from '../middleware/logger';

const leavetypes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/leave-types
 */
leavetypes.get('/leave-types', authMiddleware, async (c) => {
  const leaveTypeRepo = new LeaveTypeRepository(c.env.DB);
  const types = await leaveTypeRepo.findAll();
  return jsonResponse(c, successResponse(types), 200);
});

/**
 * POST /api/v1/leave-types
 */
leavetypes.post('/leave-types', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const leaveTypeRepo = new LeaveTypeRepository(c.env.DB);
  
  // 檢查名稱是否已存在
  const exists = await leaveTypeRepo.existsByName(data.type_name);
  if (exists) throw new ConflictError('假別類型已存在', 'type_name');
  
  const leaveType = await leaveTypeRepo.create(data);
  
  await createAuditLog(c.env.DB, {
    user_id: user.user_id,
    action: 'CREATE',
    table_name: 'LeaveTypes',
    record_id: leaveType.leave_type_id!.toString(),
    changes: JSON.stringify(data),
  });
  
  return jsonResponse(c, successResponse(leaveType), 201);
});

/**
 * PUT /api/v1/leave-types/:id
 */
leavetypes.put('/leave-types/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const leaveTypeId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const leaveTypeRepo = new LeaveTypeRepository(c.env.DB);
  const leaveType = await leaveTypeRepo.update(leaveTypeId, updates);
  
  await createAuditLog(c.env.DB, {
    user_id: user.user_id,
    action: 'UPDATE',
    table_name: 'LeaveTypes',
    record_id: leaveTypeId.toString(),
    changes: JSON.stringify(updates),
  });
  
  return jsonResponse(c, successResponse(leaveType), 200);
});

/**
 * POST /api/v1/leave-types/:id/enable
 */
leavetypes.post('/leave-types/:id/enable', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const leaveTypeId = parseInt(c.req.param('id'));
  
  const leaveTypeRepo = new LeaveTypeRepository(c.env.DB);
  await leaveTypeRepo.updateEnabled(leaveTypeId, true);
  
  return jsonResponse(c, successResponse({ message: '已啟用' }), 200);
});

/**
 * POST /api/v1/leave-types/:id/disable
 */
leavetypes.post('/leave-types/:id/disable', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const leaveTypeId = parseInt(c.req.param('id'));
  
  const leaveTypeRepo = new LeaveTypeRepository(c.env.DB);
  await leaveTypeRepo.updateEnabled(leaveTypeId, false);
  
  return jsonResponse(c, successResponse({ message: '已停用' }), 200);
});

export default leavetypes;

