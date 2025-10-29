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
 * GET /api/v1/admin/overtime-rates
 * 查詢加班費率（管理員）[規格:L174]
 */
businessrules.get('/admin/overtime-rates', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM OvertimeRates WHERE is_current = 1
    ORDER BY work_type_id ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * POST /api/v1/admin/overtime-rates
 * 新增加班費率（管理員）[規格:L175]
 */
businessrules.post('/admin/overtime-rates', authMiddleware, async (c) => {
  const user = c.get('user') as any;
  const data = await c.req.json();
  
  await c.env.DB.prepare(`
    INSERT INTO OvertimeRates (
      work_type_id, work_type_name, rate_multiplier, effective_date, is_current, description
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    data.work_type_id,
    data.work_type_name,
    data.rate_multiplier,
    data.effective_date,
    1,
    data.description || null
  ).run();
  
  return jsonResponse(c, successResponse({ message: '新增成功' }), 201);
});

/**
 * PUT /api/v1/admin/overtime-rates/:id
 * 更新加班費率（管理員）[規格:L176]
 */
businessrules.put('/admin/overtime-rates/:id', authMiddleware, async (c) => {
  const rateId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE OvertimeRates 
    SET rate_multiplier = ?, effective_date = ?, description = ?
    WHERE rate_id = ?
  `).bind(updates.rate_multiplier, updates.effective_date, updates.description, rateId).run();
  
  return jsonResponse(c, successResponse({ message: '更新成功' }), 200);
});

/**
 * POST /api/v1/admin/overtime-rates/restore-defaults
 * 恢復預設費率（管理員）[規格:L177]
 */
businessrules.post('/admin/overtime-rates/restore-defaults', authMiddleware, async (c) => {
  await c.env.DB.prepare(`DELETE FROM OvertimeRates`).run();
  
  // 恢復法定預設值
  await c.env.DB.prepare(`
    INSERT INTO OvertimeRates (work_type_id, work_type_name, rate_multiplier, effective_date, is_current, description) VALUES
    (1, '正常工時', 1.00, '2024-01-01', 1, '正常上班時間'),
    (2, '平日加班', 1.34, '2024-01-01', 1, '平日延長工時'),
    (3, '休息日加班（前2小時）', 1.34, '2024-01-01', 1, '休息日前2小時'),
    (4, '休息日加班（第3小時起）', 1.67, '2024-01-01', 1, '休息日第3小時起'),
    (5, '國定假日加班', 2.00, '2024-01-01', 1, '國定假日或例假日')
  `).run();
  
  return jsonResponse(c, successResponse({ message: '已恢復預設值' }), 200);
});

/**
 * GET /api/v1/admin/annual-leave-rules
 * 查詢特休規則（管理員）[規格:L165]
 */
businessrules.get('/admin/annual-leave-rules', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM AnnualLeaveRules
    ORDER BY min_months ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * POST /api/v1/admin/annual-leave-rules
 * 新增特休規則（管理員）[規格:L166]
 */
businessrules.post('/admin/annual-leave-rules', authMiddleware, async (c) => {
  const data = await c.req.json();
  
  await c.env.DB.prepare(`
    INSERT INTO AnnualLeaveRules (min_months, max_months, days, description)
    VALUES (?, ?, ?, ?)
  `).bind(data.min_months, data.max_months || null, data.days, data.description || null).run();
  
  return jsonResponse(c, successResponse({ message: '新增成功' }), 201);
});

/**
 * PUT /api/v1/admin/annual-leave-rules/:id
 * 更新特休規則（管理員）[規格:L167]
 */
businessrules.put('/admin/annual-leave-rules/:id', authMiddleware, async (c) => {
  const ruleId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE AnnualLeaveRules
    SET min_months = ?, max_months = ?, days = ?, description = ?
    WHERE rule_id = ?
  `).bind(updates.min_months, updates.max_months, updates.days, updates.description, ruleId).run();
  
  return jsonResponse(c, successResponse({ message: '更新成功' }), 200);
});

/**
 * DELETE /api/v1/admin/annual-leave-rules/:id
 * 刪除特休規則（管理員）[規格:L168]
 */
businessrules.delete('/admin/annual-leave-rules/:id', authMiddleware, async (c) => {
  const ruleId = parseInt(c.req.param('id'));
  
  await c.env.DB.prepare(`
    DELETE FROM AnnualLeaveRules WHERE rule_id = ?
  `).bind(ruleId).run();
  
  return jsonResponse(c, successResponse({ message: '刪除成功' }), 200);
});

/**
 * POST /api/v1/admin/annual-leave-rules/restore-defaults
 * 恢復法定預設規則（管理員）[規格:L169]
 */
businessrules.post('/admin/annual-leave-rules/restore-defaults', authMiddleware, async (c) => {
  await c.env.DB.prepare(`DELETE FROM AnnualLeaveRules`).run();
  
  // 恢復勞基法規定
  await c.env.DB.prepare(`
    INSERT INTO AnnualLeaveRules (min_months, max_months, days, description) VALUES
    (6, 11, 3, '6個月以上未滿1年'),
    (12, 23, 7, '1年以上未滿2年'),
    (24, 35, 10, '2年以上未滿3年'),
    (36, 59, 14, '3年以上未滿5年'),
    (60, 119, 15, '5年以上未滿10年'),
    (120, NULL, 15, '10年以上（每滿1年+1天，最高30天）')
  `).run();
  
  return jsonResponse(c, successResponse({ message: '已恢復法定預設規則' }), 200);
});

/**
 * GET /api/v1/admin/frequency-types
 * 查詢週期類型（管理員）[規格:L182]
 */
businessrules.get('/admin/frequency-types', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM ServiceFrequencyTypes 
    WHERE is_deleted = 0
    ORDER BY sort_order ASC
  `).all();
  
  return jsonResponse(c, successResponse(result.results), 200);
});

/**
 * POST /api/v1/admin/frequency-types
 * 新增週期類型（管理員）[規格:L183]
 */
businessrules.post('/admin/frequency-types', authMiddleware, async (c) => {
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
 * PUT /api/v1/admin/frequency-types/:id
 * 更新週期類型（管理員）[規格:L184]
 */
businessrules.put('/admin/frequency-types/:id', authMiddleware, async (c) => {
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

/**
 * POST /api/v1/admin/frequency-types/:id/enable
 * 啟用週期類型（管理員）[規格:L185]
 */
businessrules.post('/admin/frequency-types/:id/enable', authMiddleware, async (c) => {
  const frequencyId = parseInt(c.req.param('id'));
  
  await c.env.DB.prepare(`
    UPDATE ServiceFrequencyTypes SET is_enabled = 1 WHERE frequency_id = ?
  `).bind(frequencyId).run();
  
  return jsonResponse(c, successResponse({ message: '已啟用' }), 200);
});

/**
 * POST /api/v1/admin/frequency-types/:id/disable
 * 停用週期類型（管理員）[規格:L186]
 */
businessrules.post('/admin/frequency-types/:id/disable', authMiddleware, async (c) => {
  const frequencyId = parseInt(c.req.param('id'));
  
  await c.env.DB.prepare(`
    UPDATE ServiceFrequencyTypes SET is_enabled = 0 WHERE frequency_id = ?
  `).bind(frequencyId).run();
  
  return jsonResponse(c, successResponse({ message: '已停用' }), 200);
});

export default businessrules;

