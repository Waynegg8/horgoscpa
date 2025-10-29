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

import { Router } from 'itty-router';
import { SalaryService } from '../services/SalaryService';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

export function createSalaryRoutes(router: Router, env: any) {
  const getService = () => new SalaryService(env.DB);

  // ==================== 薪資項目類型管理 API ====================
  // 規格來源：L650-L667

  /**
   * GET /api/v1/admin/salary-item-types - 查詢薪資項目類型列表[規格:L652]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/salary-item-types', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const is_active = url.searchParams.get('is_active');

    const service = getService();
    const items = await service.getSalaryItemTypes({
      is_active: is_active !== null ? is_active === 'true' : undefined
    });

    return new Response(JSON.stringify({
      success: true,
      data: items
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/salary-item-types - 創建薪資項目類型[規格:L653]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/salary-item-types', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const service = getService();
    
    const item = await service.createSalaryItemType(body);

    return new Response(JSON.stringify({
      success: true,
      data: item
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/salary-item-types/:id - 更新薪資項目類型[規格:L654]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/salary-item-types/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const itemTypeId = parseInt(request.params.id);
    const body = await request.json();
    const service = getService();
    
    const item = await service.updateSalaryItemType(itemTypeId, body);

    return new Response(JSON.stringify({
      success: true,
      data: item
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/salary-item-types/:id - 刪除薪資項目類型（軟刪除）[規格:L655]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/salary-item-types/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const itemTypeId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteSalaryItemType(itemTypeId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Salary item type deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // ==================== 年終獎金管理 API ====================
  // 規格來源：L669-L689

  /**
   * GET /api/v1/admin/year-end-bonus - 查詢年終獎金列表[規格:L671]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/year-end-bonus', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const attribution_year = parseInt(url.searchParams.get('attribution_year') || new Date().getFullYear().toString());

    const service = getService();
    const bonuses = await service.getYearEndBonuses(attribution_year);

    return new Response(JSON.stringify({
      success: true,
      data: bonuses
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/year-end-bonus/summary - 查詢年終獎金彙總[規格:L672]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/year-end-bonus/summary', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const attribution_year = parseInt(url.searchParams.get('attribution_year') || new Date().getFullYear().toString());

    const service = getService();
    const summary = await service.getYearEndBonusSummary(attribution_year);

    return new Response(JSON.stringify({
      success: true,
      data: summary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/year-end-bonus - 創建年終獎金[規格:L673]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/year-end-bonus', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const service = getService();
    
    const bonus = await service.createYearEndBonus(body, request.user.user_id);

    return new Response(JSON.stringify({
      success: true,
      data: bonus
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/year-end-bonus/:id - 更新年終獎金[規格:L674]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/year-end-bonus/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const bonusId = parseInt(request.params.id);
    const body = await request.json();
    const service = getService();
    
    const bonus = await service.updateYearEndBonus(bonusId, body);

    return new Response(JSON.stringify({
      success: true,
      data: bonus
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/year-end-bonus/:id - 刪除年終獎金[規格:L675]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/year-end-bonus/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const bonusId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteYearEndBonus(bonusId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Year-end bonus deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // ==================== 員工薪資設定 API ====================
  // 規格來源：L743-L780

  /**
   * GET /api/v1/admin/employees/:userId/salary - 查詢員工薪資設定[規格:L747]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (request: any) => {
    const userId = parseInt(request.params.userId);
    const service = getService();
    
    const salary = await service.getEmployeeSalary(userId);

    return new Response(JSON.stringify({
      success: true,
      data: salary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/employees/:userId/salary - 設定員工薪資[規格:L748]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (request: any) => {
    const userId = parseInt(request.params.userId);
    const body = await request.json();
    const service = getService();
    
    const salary = await service.updateEmployeeSalary(userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: salary
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/employees/:userId/salary - 更新員工薪資[規格:L749]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/employees/:userId/salary', authMiddleware, adminMiddleware, async (request: any) => {
    const userId = parseInt(request.params.userId);
    const body = await request.json();
    const service = getService();
    
    const salary = await service.updateEmployeeSalary(userId, body);

    return new Response(JSON.stringify({
      success: true,
      data: salary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // ==================== 薪資計算/查詢 API ====================
  // 規格來源：L582-L647

  /**
   * POST /api/v1/admin/payroll/calculate - 計算月度薪資[規格:L586]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/payroll/calculate', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const { user_id, year, month } = body;
    
    const service = getService();
    const payroll = await service.calculateMonthlyPayroll(user_id, year, month);

    return new Response(JSON.stringify({
      success: true,
      data: payroll
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/payroll - 查詢薪資記錄[規格:L587]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/payroll', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const user_id = parseInt(url.searchParams.get('user_id') || '0');
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : undefined;
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const service = getService();
    const payrolls = await service.getPayrolls({ user_id, year, limit, offset });

    return new Response(JSON.stringify({
      success: true,
      data: payrolls
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/payroll/:id - 查詢單筆薪資記錄[規格:L588]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/payroll/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const payrollId = parseInt(request.params.id);
    const service = getService();
    
    const payroll = await service.getPayrollById(payrollId);
    if (!payroll) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Payroll not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: payroll
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/employees/:userId/hourly-cost-rate - 查詢員工時薪成本率[規格:L589]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/employees/:userId/hourly-cost-rate', authMiddleware, adminMiddleware, async (request: any) => {
    const userId = parseInt(request.params.userId);
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const service = getService();
    const hourlyRate = await service.calculateFullHourlyCostRate(userId, year, month);

    return new Response(JSON.stringify({
      success: true,
      data: {
        user_id: userId,
        year,
        month,
        hourly_cost_rate: hourlyRate
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/salary/batch-update - 批次更新薪資項目（績效獎金等）[規格:L699-L741]
   * @tags Salary - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/salary/batch-update', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const { item_code, target_month, updates } = body; // updates: [{user_id, amount}]
    
    const service = getService();
    await service.batchUpdateSalaryItems(item_code, target_month, updates);

    return new Response(JSON.stringify({
      success: true,
      message: 'Salary items updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

