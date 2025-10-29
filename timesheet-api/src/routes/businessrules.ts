/**
 * 業務規則 API 路由（唯讀類）
 * - 加班費率（勞基法規定，僅查看）
 * - 特休規則（勞基法規定，僅查看）
 * - 週期類型管理
 */

import { Hono } from 'hono';
import { Env } from '../types';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const businessrules = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/overtime-rates
 * 查詢加班費率（唯讀，勞基法規定）
 */
businessrules.get('/overtime-rates', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM OvertimeRates WHERE is_current = 1
    ORDER BY work_type_id ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * GET /api/v1/annual-leave-rules
 * 查詢特休規則（唯讀，勞基法規定）
 */
businessrules.get('/annual-leave-rules', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM AnnualLeaveRules
    ORDER BY min_months ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * GET /api/v1/frequency-types
 * 查詢週期類型
 */
businessrules.get('/frequency-types', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM ServiceFrequencyTypes 
    WHERE is_deleted = 0 AND is_enabled = 1
    ORDER BY sort_order ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * POST /api/v1/frequency-types
 * 新增週期類型（小型事務所彈性設計：所有人可用）
 */
businessrules.post('/frequency-types', authMiddleware, async (c) => {
  const data = await c.req.json();
  
  await c.env.DB.prepare(`
    INSERT INTO ServiceFrequencyTypes (
      name, days_interval, months_interval, is_recurring, sort_order
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.days_interval || null,
    data.months_interval || null,
    data.is_recurring !== false ? 1 : 0,
    data.sort_order || 0
  ).run();
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM ServiceFrequencyTypes WHERE name = ? ORDER BY frequency_id DESC LIMIT 1
  `).bind(data.name).first();
  
  return jsonResponse(c, successResponse(result), 201);
});

/**
 * PUT /api/v1/frequency-types/:id
 * 更新週期類型
 */
businessrules.put('/frequency-types/:id', authMiddleware, async (c) => {
  const frequencyId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.days_interval !== undefined) {
    fields.push('days_interval = ?');
    values.push(updates.days_interval);
  }
  if (updates.months_interval !== undefined) {
    fields.push('months_interval = ?');
    values.push(updates.months_interval);
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sort_order);
  }
  
  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\')');
    values.push(frequencyId);
    
    await c.env.DB.prepare(`
      UPDATE ServiceFrequencyTypes SET ${fields.join(', ')} WHERE frequency_id = ?
    `).bind(...values).run();
  }
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM ServiceFrequencyTypes WHERE frequency_id = ?
  `).bind(frequencyId).first();
  
  return jsonResponse(c, successResponse(result), 200);
});

export default businessrules;

