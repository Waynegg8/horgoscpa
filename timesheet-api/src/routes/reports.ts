/**
 * Reports Routes - 報表分析API路由
 * 規格來源：docs/開發指南/報表分析-完整規格.md
 * 
 * 總計4個API：
 * - GET /api/v1/reports/client-cost-analysis - 客戶成本分析報表
 * - GET /api/v1/reports/employee-hours - 員工工時分析報表
 * - GET /api/v1/reports/payroll-summary - 薪資彙總報表
 * - GET /api/v1/reports/revenue - 營收報表
 */

import { Hono } from 'hono';
import { Env } from '../types';
import { ReportsService } from '../services/ReportsService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const reports = new Hono<{ Bindings: Env }>();

// ==================== 客戶成本分析 API ====================
// 規格來源：L35-L401

/**
 * GET /api/v1/reports/client-cost-analysis - 客戶成本分析報表[規格:L39]
 * @tags Reports
 * @security BearerAuth
 * @query {string} start_date - 起始日期（必填）
 * @query {string} end_date - 結束日期（必填）
 * @query {string} client_id - 客戶ID（可選）
 * @query {boolean} include_year_end_bonus - 是否包含年終獎金分攤（預設false）[規格:L47]
 * @description 含加權工時、完整時薪成本率、年終獎金分攤、管理成本警告
 */
reports.get('/client-cost-analysis', authMiddleware, adminMiddleware, async (c) => {
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  const client_id = c.req.query('client_id');
  const include_year_end_bonus = c.req.query('include_year_end_bonus') === 'true';

  if (!start_date || !end_date) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '缺少必填參數：start_date, end_date' }
    }, 400);
  }

  try {
    const service = new ReportsService(c.env.DB);
    const result = await service.getClientCostAnalysis({
      start_date,
      end_date,
      client_id
    }, include_year_end_bonus);

    return jsonResponse(c, {
      success: true,
      ...result  // 包含 data 和 warnings
    }, 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'REPORT_ERROR', message: (error as Error).message }
    }, 500);
  }
});

// ==================== 員工工時分析 API ====================
// 規格來源：L406-L568

/**
 * GET /api/v1/reports/employee-hours - 員工工時分析報表[規格:L410]
 * @tags Reports
 * @security BearerAuth
 * @query {number} year - 年份（必填）
 * @query {number} month - 月份（必填）
 * @query {number} user_id - 員工ID（可選）
 * @description 含使用率計算、客戶分布、每日工時趨勢
 */
reports.get('/employee-hours', authMiddleware, adminMiddleware, async (c) => {
  const year = c.req.query('year');
  const month = c.req.query('month');
  const user_id = c.req.query('user_id');

  if (!year || !month) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '缺少必填參數：year, month' }
    }, 400);
  }

  try {
    const service = new ReportsService(c.env.DB);
    const result = await service.getEmployeeHoursAnalysis({
      year: parseInt(year),
      month: parseInt(month),
      user_id: user_id ? parseInt(user_id) : undefined
    });

    return jsonResponse(c, successResponse(result), 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'REPORT_ERROR', message: (error as Error).message }
    }, 500);
  }
});

// ==================== 薪資彙總報表 API ====================
// 規格來源：L573-L678

/**
 * GET /api/v1/reports/payroll-summary - 薪資彙總報表[規格:L577]
 * @tags Reports
 * @security BearerAuth
 * @query {number} year - 年份（必填）
 * @query {number} month - 月份（必填）
 * @description 月度薪資明細、加班費統計、總計彙總
 */
reports.get('/payroll-summary', authMiddleware, adminMiddleware, async (c) => {
  const year = c.req.query('year');
  const month = c.req.query('month');

  if (!year || !month) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '缺少必填參數：year, month' }
    }, 400);
  }

  try {
    const service = new ReportsService(c.env.DB);
    const result = await service.getPayrollSummary({
      year: parseInt(year),
      month: parseInt(month)
    });

    return jsonResponse(c, successResponse(result), 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'REPORT_ERROR', message: (error as Error).message }
    }, 500);
  }
});

// ==================== 營收報表 API ====================
// 規格來源：L683-L825

/**
 * GET /api/v1/reports/revenue - 營收報表[規格:L687]
 * @tags Reports
 * @security BearerAuth
 * @query {string} start_date - 起始日期（必填）
 * @query {string} end_date - 結束日期（必填）
 * @query {string} group_by - 分組方式（month/client/service，預設month）
 * @description 含應收帳款統計、收款趨勢分析
 */
reports.get('/revenue', authMiddleware, adminMiddleware, async (c) => {
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  const group_by = c.req.query('group_by') as 'month' | 'client' | 'service' | undefined;

  if (!start_date || !end_date) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '缺少必填參數：start_date, end_date' }
    }, 400);
  }

  try {
    const service = new ReportsService(c.env.DB);
    const result = await service.getRevenueReport({
      start_date,
      end_date,
      group_by
    });

    return jsonResponse(c, successResponse(result), 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'REPORT_ERROR', message: (error as Error).message }
    }, 500);
  }
});

export default reports;

