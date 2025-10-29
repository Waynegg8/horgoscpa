/**
 * Overhead Costs Routes - 管理成本API路由
 * 規格來源：docs/開發指南/管理成本-完整規格.md
 * 
 * 總計10個API：
 * - 成本項目類型管理：4個（GET/POST/PUT/DELETE）
 * - 月度成本記錄：4個（GET/POST/PUT/DELETE）
 * - 成本分析彙總：2個（analysis/summary）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { OverheadCostService } from '../services/OverheadCostService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const overheadCosts = new Hono<{ Bindings: Env }>();

// ==================== 成本項目類型管理 API ====================
// 規格來源：L285-L314

/**
 * GET /api/v1/admin/overhead-types - 查詢所有成本項目類型[規格:L286]
 * @tags Overhead Costs - Admin
 * @security BearerAuth
 */
overheadCosts.get('/admin/overhead-types', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    is_active: c.req.query('is_active') ? c.req.query('is_active') === 'true' : undefined,
    category: c.req.query('category'),
  };

  const service = new OverheadCostService(c.env.DB);
  const types = await service.getCostTypes(filters);

  return jsonResponse(c, successResponse(types), 200);
});

/**
 * POST /api/v1/admin/overhead-types - 新增成本項目類型[規格:L287]
 */
overheadCosts.post('/admin/overhead-types', authMiddleware, adminMiddleware, async (c) => {
  const data = await c.req.json();
  
  const service = new OverheadCostService(c.env.DB);
  const costType = await service.createCostType(data);

  return jsonResponse(c, successResponse(costType), 201);
});

/**
 * PUT /api/v1/admin/overhead-types/:id - 更新成本項目類型[規格:L288]
 */
overheadCosts.put('/admin/overhead-types/:id', authMiddleware, adminMiddleware, async (c) => {
  const costTypeId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new OverheadCostService(c.env.DB);
  const costType = await service.updateCostType(costTypeId, data);

  return jsonResponse(c, successResponse(costType), 200);
});

/**
 * DELETE /api/v1/admin/overhead-types/:id - 刪除成本項目類型[規格:L289]
 */
overheadCosts.delete('/admin/overhead-types/:id', authMiddleware, adminMiddleware, async (c) => {
  const costTypeId = parseInt(c.req.param('id'));
  
  const service = new OverheadCostService(c.env.DB);
  await service.deleteCostType(costTypeId);

  return jsonResponse(c, successResponse({ message: 'Cost type deleted successfully' }), 200);
});

// ==================== 月度成本記錄 API ====================
// 規格來源：L316-L348

/**
 * GET /api/v1/admin/overhead-costs - 查詢月度成本[規格:L319]
 * @tags Overhead Costs - Admin
 * @security BearerAuth
 */
overheadCosts.get('/admin/overhead-costs', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    year: c.req.query('year') ? parseInt(c.req.query('year')!) : undefined,
    month: c.req.query('month') ? parseInt(c.req.query('month')!) : undefined,
    cost_type_id: c.req.query('cost_type_id') ? parseInt(c.req.query('cost_type_id')!) : undefined,
  };

  const service = new OverheadCostService(c.env.DB);
  const costs = await service.getMonthlyCosts(filters);

  return jsonResponse(c, successResponse(costs), 200);
});

/**
 * POST /api/v1/admin/overhead-costs - 新增月度成本[規格:L320]
 */
overheadCosts.post('/admin/overhead-costs', authMiddleware, adminMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const service = new OverheadCostService(c.env.DB);
  const cost = await service.createMonthlyCost({
    ...data,
    recorded_by: user.user_id
  });

  return jsonResponse(c, successResponse(cost), 201);
});

/**
 * PUT /api/v1/admin/overhead-costs/:id - 更新月度成本[規格:L321]
 */
overheadCosts.put('/admin/overhead-costs/:id', authMiddleware, adminMiddleware, async (c) => {
  const overheadId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new OverheadCostService(c.env.DB);
  const cost = await service.updateMonthlyCost(overheadId, data);

  return jsonResponse(c, successResponse(cost), 200);
});

/**
 * DELETE /api/v1/admin/overhead-costs/:id - 刪除月度成本[規格:L322]
 */
overheadCosts.delete('/admin/overhead-costs/:id', authMiddleware, adminMiddleware, async (c) => {
  const overheadId = parseInt(c.req.param('id'));
  
  const service = new OverheadCostService(c.env.DB);
  await service.deleteMonthlyCost(overheadId);

  return jsonResponse(c, successResponse({ message: 'Monthly overhead cost deleted successfully' }), 200);
});

// ==================== 成本分析 API ====================
// 規格來源：L350-L397

/**
 * GET /api/v1/admin/overhead-analysis - 管理成本分析報表[規格:L353]
 * @tags Overhead Costs - Admin
 * @security BearerAuth
 */
overheadCosts.get('/admin/overhead-analysis', authMiddleware, adminMiddleware, async (c) => {
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const month = parseInt(c.req.query('month') || (new Date().getMonth() + 1).toString());

  const service = new OverheadCostService(c.env.DB);
  const analysis = await service.getOverheadAnalysis(year, month);

  return jsonResponse(c, successResponse(analysis), 200);
});

/**
 * GET /api/v1/admin/overhead-summary - 管理成本彙總[規格:L354]
 * @tags Overhead Costs - Admin
 * @security BearerAuth
 */
overheadCosts.get('/admin/overhead-summary', authMiddleware, adminMiddleware, async (c) => {
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const start_month = parseInt(c.req.query('start_month') || '1');
  const end_month = parseInt(c.req.query('end_month') || '12');

  const service = new OverheadCostService(c.env.DB);
  const summary = await service.getOverheadSummary(year, start_month, end_month);

  return jsonResponse(c, successResponse(summary), 200);
});

export default overheadCosts;

