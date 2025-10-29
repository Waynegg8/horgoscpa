/**
 * Salary Routes - 薪資管理API路由
 * 規格來源：docs/開發指南/薪資管理-完整規格.md
 * 
 * 總計16個API：
 * - 薪資項目類型管理：4個（GET/POST/PUT/DELETE）
 * - 年終獎金管理：5個（GET list/GET summary/POST/PUT/DELETE）
 * - 員工薪資設定：3個（GET/POST/PUT）
 * - 薪資計算/查詢：4個（計算月薪/查詢薪資/時薪成本率/批次更新）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { SalaryService } from '../services/SalaryService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const salary = new Hono<{ Bindings: Env }>();

// ==================== 薪資項目類型管理 API ====================
// 規格來源：L650-L667

/**
 * GET /api/v1/admin/salary-item-types - 查詢薪資項目類型列表[規格:L652]
 * @tags Salary - Admin
 * @security BearerAuth
 */
salary.get('/admin/salary-item-types', authMiddleware, adminMiddleware, async (c) => {
  const is_active = c.req.query('is_active');

  const service = new SalaryService(c.env.DB);
  const items = await service.getSalaryItemTypes({
    is_active: is_active !== undefined ? is_active === 'true' : undefined
  });

  return jsonResponse(c, successResponse(items), 200);
});

/**
 * POST /api/v1/admin/salary-item-types - 創建薪資項目類型[規格:L653]
 */
salary.post('/admin/salary-item-types', authMiddleware, adminMiddleware, async (c) => {
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const item = await service.createSalaryItemType(data);

  return jsonResponse(c, successResponse(item), 201);
});

/**
 * PUT /api/v1/admin/salary-item-types/:id - 更新薪資項目類型[規格:L654]
 */
salary.put('/admin/salary-item-types/:id', authMiddleware, adminMiddleware, async (c) => {
  const itemTypeId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const item = await service.updateSalaryItemType(itemTypeId, data);

  return jsonResponse(c, successResponse(item), 200);
});

/**
 * DELETE /api/v1/admin/salary-item-types/:id - 刪除薪資項目類型（軟刪除）[規格:L655]
 */
salary.delete('/admin/salary-item-types/:id', authMiddleware, adminMiddleware, async (c) => {
  const itemTypeId = parseInt(c.req.param('id'));
  
  const service = new SalaryService(c.env.DB);
  await service.deleteSalaryItemType(itemTypeId);

  return jsonResponse(c, successResponse({ message: 'Salary item type deleted successfully' }), 200);
});

// ==================== 年終獎金管理 API ====================
// 規格來源：L669-L689

/**
 * GET /api/v1/admin/year-end-bonus - 查詢年終獎金列表[規格:L671]
 */
salary.get('/admin/year-end-bonus', authMiddleware, adminMiddleware, async (c) => {
  const attribution_year = parseInt(c.req.query('attribution_year') || new Date().getFullYear().toString());

  const service = new SalaryService(c.env.DB);
  const bonuses = await service.getYearEndBonuses(attribution_year);

  return jsonResponse(c, successResponse(bonuses), 200);
});

/**
 * GET /api/v1/admin/year-end-bonus/summary - 查詢年終獎金彙總[規格:L672]
 */
salary.get('/admin/year-end-bonus/summary', authMiddleware, adminMiddleware, async (c) => {
  const attribution_year = parseInt(c.req.query('attribution_year') || new Date().getFullYear().toString());

  const service = new SalaryService(c.env.DB);
  const summary = await service.getYearEndBonusSummary(attribution_year);

  return jsonResponse(c, successResponse(summary), 200);
});

/**
 * POST /api/v1/admin/year-end-bonus - 創建年終獎金[規格:L673]
 */
salary.post('/admin/year-end-bonus', authMiddleware, adminMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const bonus = await service.createYearEndBonus(data, user.user_id);

  return jsonResponse(c, successResponse(bonus), 201);
});

/**
 * PUT /api/v1/admin/year-end-bonus/:id - 更新年終獎金[規格:L674]
 */
salary.put('/admin/year-end-bonus/:id', authMiddleware, adminMiddleware, async (c) => {
  const bonusId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const bonus = await service.updateYearEndBonus(bonusId, data);

  return jsonResponse(c, successResponse(bonus), 200);
});

/**
 * DELETE /api/v1/admin/year-end-bonus/:id - 刪除年終獎金[規格:L675]
 */
salary.delete('/admin/year-end-bonus/:id', authMiddleware, adminMiddleware, async (c) => {
  const bonusId = parseInt(c.req.param('id'));
  
  const service = new SalaryService(c.env.DB);
  await service.deleteYearEndBonus(bonusId);

  return jsonResponse(c, successResponse({ message: 'Year-end bonus deleted successfully' }), 200);
});

// ==================== 員工薪資設定 API ====================
// 規格來源：L743-L780

/**
 * GET /api/v1/admin/employees/:userId/salary - 查詢員工薪資設定[規格:L747]
 */
salary.get('/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('userId'));
  
  const service = new SalaryService(c.env.DB);
  const salaryData = await service.getEmployeeSalary(userId);

  return jsonResponse(c, successResponse(salaryData), 200);
});

/**
 * POST /api/v1/admin/employees/:userId/salary - 設定員工薪資[規格:L748]
 */
salary.post('/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('userId'));
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const salaryData = await service.updateEmployeeSalary(userId, data);

  return jsonResponse(c, successResponse(salaryData), 201);
});

/**
 * PUT /api/v1/admin/employees/:userId/salary - 更新員工薪資[規格:L749]
 */
salary.put('/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('userId'));
  const data = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const salaryData = await service.updateEmployeeSalary(userId, data);

  return jsonResponse(c, successResponse(salaryData), 200);
});

// ==================== 薪資計算/查詢 API ====================
// 規格來源：L582-L647

/**
 * POST /api/v1/admin/payroll/calculate - 計算月度薪資[規格:L586]
 */
salary.post('/admin/payroll/calculate', authMiddleware, adminMiddleware, async (c) => {
  const { user_id, year, month } = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  const payroll = await service.calculateMonthlyPayroll(user_id, year, month);

  return jsonResponse(c, successResponse(payroll), 200);
});

/**
 * GET /api/v1/admin/payroll - 查詢薪資記錄[規格:L587]
 */
salary.get('/admin/payroll', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    user_id: parseInt(c.req.query('user_id') || '0'),
    year: c.req.query('year') ? parseInt(c.req.query('year')!) : undefined,
    limit: parseInt(c.req.query('limit') || '12'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const service = new SalaryService(c.env.DB);
  const payrolls = await service.getPayrolls(filters);

  return jsonResponse(c, successResponse(payrolls), 200);
});

/**
 * GET /api/v1/admin/payroll/:id - 查詢單筆薪資記錄[規格:L588]
 */
salary.get('/admin/payroll/:id', authMiddleware, adminMiddleware, async (c) => {
  const payrollId = parseInt(c.req.param('id'));
  
  const service = new SalaryService(c.env.DB);
  const payroll = await service.getPayrollById(payrollId);

  if (!payroll) {
    return jsonResponse(c, { success: false, error: 'Payroll not found' }, 404);
  }

  return jsonResponse(c, successResponse(payroll), 200);
});

/**
 * GET /api/v1/admin/employees/:userId/hourly-cost-rate - 查詢員工時薪成本率[規格:L589]
 */
salary.get('/admin/employees/:userId/hourly-cost-rate', authMiddleware, adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('userId'));
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const month = parseInt(c.req.query('month') || (new Date().getMonth() + 1).toString());

  const service = new SalaryService(c.env.DB);
  const hourlyRate = await service.calculateFullHourlyCostRate(userId, year, month);

  return jsonResponse(c, successResponse({
    user_id: userId,
    year,
    month,
    hourly_cost_rate: hourlyRate
  }), 200);
});

/**
 * PUT /api/v1/admin/salary/batch-update - 批次更新薪資項目（績效獎金等）[規格:L699-L741]
 */
salary.put('/admin/salary/batch-update', authMiddleware, adminMiddleware, async (c) => {
  const { item_code, target_month, updates } = await c.req.json();
  
  const service = new SalaryService(c.env.DB);
  await service.batchUpdateSalaryItems(item_code, target_month, updates);

  return jsonResponse(c, successResponse({ message: 'Salary items updated successfully' }), 200);
});

export default salary;
