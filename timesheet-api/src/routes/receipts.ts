/**
 * Receipts Routes - 收據收款API路由
 * 規格來源：docs/開發指南/發票收款-完整規格.md
 * 
 * 總計14個API：
 * - 收據管理：6個（GET list/POST/GET detail/PUT/DELETE/GET check-number）
 * - 收款管理：3個（GET payments/POST payment/DELETE payment）
 * - 統計報表：3個（GET stats/GET ar-aging/GET revenue）
 * - PDF生成：2個（GET receipt-pdf/GET receipt-batch-pdf）
 */

import { Hono } from 'hono';
import { Env } from '../types';
import { ReceiptsService } from '../services/ReceiptsService';
import { PaymentsService } from '../services/PaymentsService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const receipts = new Hono<{ Bindings: Env }>();

// ==================== 收據管理 API ====================
// 規格來源：L256-L345

/**
 * GET /api/v1/receipts - 查詢收據列表[規格:L259]
 * @tags Receipts
 * @security BearerAuth
 * @query {string} status - 收據狀態（unpaid/partial/paid/cancelled）
 * @query {string} client_id - 客戶ID
 * @query {boolean} overdue_only - 僅顯示逾期收據
 */
receipts.get('/', authMiddleware, async (c) => {
  const { status, client_id, overdue_only } = c.req.query();

  const service = new ReceiptsService(c.env.DB);
  
  // 如果status='unpaid'或'partial'，查詢應收帳款
  if (status === 'unpaid' || status === 'partial' || overdue_only === 'true') {
    const data = await service.getUnpaidReceipts({
      client_id,
      overdue_only: overdue_only === 'true'
    });
    return jsonResponse(c, successResponse(data), 200);
  }

  // TODO: 實現完整的收據列表查詢（含分頁）
  const data: any[] = [];
  return jsonResponse(c, successResponse(data), 200);
});

/**
 * POST /api/v1/receipts - 開立收據[規格:L260, L367-L424]
 * @tags Receipts
 * @security BearerAuth
 */
receipts.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const service = new ReceiptsService(c.env.DB);
  const data = await service.createReceipt(body, user.user_id);

  return jsonResponse(c, successResponse(data), 201);
});

/**
 * GET /api/v1/receipts/check-number - 檢查收據號碼是否可用[規格:L264, L267-L293]
 * @tags Receipts
 * @security BearerAuth
 * @query {string} number - 收據號碼（格式：YYYYMM-NNN）
 */
receipts.get('/check-number', authMiddleware, async (c) => {
  const number = c.req.query('number');

  if (!number) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '請提供收據號碼' }
    }, 400);
  }

  const service = new ReceiptsService(c.env.DB);
  const result = await service.checkReceiptNumberAvailable(number);

  return jsonResponse(c, successResponse({
    number,
    ...result
  }), 200);
});

/**
 * GET /api/v1/receipts/stats - 收據統計[規格:L358]
 * @tags Receipts
 * @security BearerAuth
 * @query {number} year - 年份
 * @query {number} month - 月份
 */
receipts.get('/stats', authMiddleware, async (c) => {
  const year = c.req.query('year');
  const month = c.req.query('month');

  const service = new ReceiptsService(c.env.DB);
  const data = await service.getReceiptStatistics({
    year: year ? parseInt(year) : undefined,
    month: month ? parseInt(month) : undefined
  });

  return jsonResponse(c, successResponse(data), 200);
});

/**
 * GET /api/v1/receipts/ar-aging - 應收帳款帳齡分析[規格:L359, L575-L627, L770-L845]
 * @tags Receipts
 * @security BearerAuth
 */
receipts.get('/ar-aging', authMiddleware, async (c) => {
  const service = new ReceiptsService(c.env.DB);
  const data = await service.getAgingAnalysis();

  return jsonResponse(c, successResponse(data), 200);
});

/**
 * GET /api/v1/receipts/:id - 查詢收據詳情[規格:L261]
 * @tags Receipts
 * @security BearerAuth
 */
receipts.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');

  const service = new ReceiptsService(c.env.DB);
  const data = await service.getReceiptDetails(id);

  return jsonResponse(c, successResponse(data), 200);
});

/**
 * PUT /api/v1/receipts/:id - 更新收據[規格:L262]
 * @tags Receipts
 * @security BearerAuth
 */
receipts.put('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const service = new ReceiptsService(c.env.DB);
  const data = await service.updateReceipt(id, body);

  return jsonResponse(c, successResponse(data), 200);
});

/**
 * DELETE /api/v1/receipts/:id - 作廢收據[規格:L263]
 * @tags Receipts
 * @security BearerAuth
 */
receipts.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const service = new ReceiptsService(c.env.DB);
  await service.deleteReceipt(id, user.user_id);

  return jsonResponse(c, successResponse({ message: '收據已作廢' }), 200);
});

// ==================== 收款管理 API ====================
// 規格來源：L347-L353

/**
 * GET /api/v1/receipts/:id/payments - 查詢收據的收款記錄[規格:L350]
 * @tags Payments
 * @security BearerAuth
 */
receipts.get('/:id/payments', authMiddleware, async (c) => {
  const receiptId = c.req.param('id');

  const service = new PaymentsService(c.env.DB);
  const data = await service.getPaymentsByReceipt(receiptId);

  return jsonResponse(c, successResponse(data), 200);
});

/**
 * POST /api/v1/receipts/:id/payments - 記錄收款[規格:L351, L437-L518]
 * @tags Payments
 * @security BearerAuth
 */
receipts.post('/:id/payments', authMiddleware, async (c) => {
  const receiptId = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();

  const service = new PaymentsService(c.env.DB);
  const data = await service.recordPayment({
    receipt_id: receiptId,
    ...body
  }, user.user_id);

  return jsonResponse(c, successResponse(data), 201);
});

/**
 * DELETE /api/v1/payments/:id - 刪除收款記錄[規格:L352]
 * @tags Payments
 * @security BearerAuth
 */
receipts.delete('/payments/:id', authMiddleware, async (c) => {
  const paymentId = parseInt(c.req.param('id'));

  const service = new PaymentsService(c.env.DB);
  await service.deletePayment(paymentId);

  return jsonResponse(c, successResponse({ message: '收款記錄已刪除' }), 200);
});

// ==================== 統計報表 API ====================
// 規格來源：L355-L361

/**
 * GET /api/v1/reports/revenue - 營收報表[規格:L360, L629-L749]
 * @tags Reports
 * @security BearerAuth
 * @query {string} start_date - 起始日期
 * @query {string} end_date - 結束日期
 * @query {string} group_by - 分組方式（month/client/service）
 */
receipts.get('/reports/revenue', authMiddleware, async (c) => {
  const { start_date, end_date, group_by } = c.req.query();

  // TODO: 實現營收報表邏輯（模組14）
  const data = {
    summary: {
      total_receipts: 0,
      total_amount: 0,
      paid_amount: 0,
      unpaid_amount: 0
    },
    details: []
  };

  return jsonResponse(c, successResponse(data), 200);
});

// ==================== PDF生成 API ====================
// 規格來源：L847-L898

/**
 * GET /api/v1/receipts/:id/pdf - 生成收據PDF[規格:L851-L877]
 * @tags PDF
 * @security BearerAuth
 */
receipts.get('/:id/pdf', authMiddleware, async (c) => {
  const id = c.req.param('id');

  // TODO: 實現PDF生成邏輯
  // 1. 查詢收據詳情
  // 2. 使用PDF生成庫（如PDFKit或jsPDF）
  // 3. 返回PDF二進制數據

  return new Response('PDF generation not implemented yet', {
    status: 501,
    headers: { 'Content-Type': 'text/plain' }
  });
});

/**
 * POST /api/v1/receipts/batch-pdf - 批量生成收據PDF[規格:L879-L897]
 * @tags PDF
 * @security BearerAuth
 */
receipts.post('/batch-pdf', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { receipt_ids } = body;

  // TODO: 實現批量PDF生成邏輯
  // 1. 查詢所有收據
  // 2. 生成ZIP壓縮包（包含多個PDF）
  // 3. 返回ZIP二進制數據

  return new Response('Batch PDF generation not implemented yet', {
    status: 501,
    headers: { 'Content-Type': 'text/plain' }
  });
});

export default receipts;

