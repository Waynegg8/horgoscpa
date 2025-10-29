/**
 * Attachments Routes - 附件系統API路由
 * 規格來源：docs/開發指南/附件系統-完整規格.md
 * 
 * 總計5個API：
 * - POST /api/v1/attachments/upload - 上傳附件
 * - GET /api/v1/attachments/:id - 查詢附件資訊
 * - GET /api/v1/attachments/:id/download - 下載附件
 * - DELETE /api/v1/attachments/:id - 刪除附件
 * - GET /api/v1/attachments - 查詢附件列表
 */

import { Hono } from 'hono';
import { Env } from '../types';
import { AttachmentsService } from '../services/AttachmentsService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const attachments = new Hono<{ Bindings: Env }>();

// ==================== 附件管理 API ====================
// 規格來源：L290-L299

/**
 * POST /api/v1/attachments/upload - 上傳附件[規格:L295]
 * @tags Attachments
 * @security BearerAuth
 * @consumes multipart/form-data
 */
attachments.post('/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();

  // 獲取表單欄位
  const entity_type = formData.get('entity_type') as string;
  const entity_id = formData.get('entity_id') as string;
  const file = formData.get('file') as File;

  // 驗證必填欄位
  if (!entity_type || !entity_id || !file) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '缺少必填欄位' }
    }, 400);
  }

  // 驗證 entity_type
  const validTypes = ['client', 'receipt', 'sop', 'task'];
  if (!validTypes.includes(entity_type)) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'INVALID_ENTITY_TYPE', message: '無效的實體類型' }
    }, 400);
  }

  try {
    const service = new AttachmentsService(c.env.DB, c.env.R2_ATTACHMENTS);
    const data = await service.uploadFile({
      entity_type,
      entity_id,
      file
    }, user.user_id);

    return jsonResponse(c, successResponse(data), 201);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'UPLOAD_FAILED', message: (error as Error).message }
    }, 400);
  }
});

/**
 * GET /api/v1/attachments/:id - 查詢附件資訊[規格:L296]
 * @tags Attachments
 * @security BearerAuth
 */
attachments.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const service = new AttachmentsService(c.env.DB, c.env.R2_ATTACHMENTS);
    const data = await service.getAttachment(id);

    return jsonResponse(c, successResponse(data), 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message }
    }, 404);
  }
});

/**
 * GET /api/v1/attachments/:id/download - 下載附件[規格:L297]
 * @tags Attachments
 * @security BearerAuth
 */
attachments.get('/:id/download', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const service = new AttachmentsService(c.env.DB, c.env.R2_ATTACHMENTS);
    const result = await service.downloadFile(id);

    // 返回文件流（規格來源：L252-L258）
    return new Response(result.file.body, {
      headers: {
        'Content-Type': result.metadata.mime_type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.metadata.file_name)}"`,
        'Content-Length': result.metadata.file_size.toString()
      }
    });
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message }
    }, 404);
  }
});

/**
 * DELETE /api/v1/attachments/:id - 刪除附件[規格:L298]
 * @tags Attachments
 * @security BearerAuth
 * @description 小型事務所彈性設計：所有人皆可刪除附件[規格:L292-L293]
 */
attachments.delete('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const service = new AttachmentsService(c.env.DB, c.env.R2_ATTACHMENTS);
    await service.deleteFile(id);

    return jsonResponse(c, successResponse({ message: '附件已刪除' }), 200);
  } catch (error) {
    return jsonResponse(c, {
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message }
    }, 404);
  }
});

/**
 * GET /api/v1/attachments - 查詢附件列表[規格:L299]
 * @tags Attachments
 * @security BearerAuth
 * @query {string} entity_type - 實體類型（client/receipt/sop/task）
 * @query {number} entity_id - 實體ID
 * @query {number} page - 頁碼
 * @query {number} page_size - 每頁筆數
 */
attachments.get('/', authMiddleware, async (c) => {
  const entity_type = c.req.query('entity_type');
  const entity_id = c.req.query('entity_id');
  const page = c.req.query('page');
  const page_size = c.req.query('page_size');

  const service = new AttachmentsService(c.env.DB, c.env.R2_ATTACHMENTS);

  // 如果提供 entity_id，查詢特定實體的附件
  if (entity_id && entity_type) {
    const data = await service.listByEntity(entity_type, entity_id);
    return jsonResponse(c, successResponse(data), 200);
  }

  // 否則查詢所有附件（含分頁）
  const data = await service.listAll({
    entity_type,
    page: page ? parseInt(page) : undefined,
    page_size: page_size ? parseInt(page_size) : undefined
  });

  return jsonResponse(c, successResponse(data), 200);
});

export default attachments;

