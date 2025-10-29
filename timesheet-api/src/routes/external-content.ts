/**
 * External Content Routes - 外部內容管理API路由
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md
 * 
 * 總計27個API：
 * - Blog文章管理：9個（管理員7個 + 公開2個）
 * - FAQ管理：6個（管理員5個 + 公開1個）
 * - 資源中心管理：7個（管理員5個 + 公開2個）
 * - 圖片管理：5個（管理員4個 + 公開1個）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { ExternalContentService } from '../services/ExternalContentService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const externalContent = new Hono<{ Bindings: Env }>();

// ==================== Blog 文章管理 API ====================
// 規格來源：L111-L122

/**
 * GET /api/v1/admin/articles - 查詢文章列表（管理員）[規格:L111]
 * @tags External Content - Admin
 * @security BearerAuth
 */
externalContent.get('/admin/articles', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    category: c.req.query('category'),
    is_published: c.req.query('is_published') ? c.req.query('is_published') === 'true' : undefined,
    limit: parseInt(c.req.query('limit') || '20'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const result = await service.getArticles(filters);

  return jsonResponse(c, successResponse(result), 200);
});

/**
 * POST /api/v1/admin/articles - 創建文章（管理員）[規格:L112]
 */
externalContent.post('/admin/articles', authMiddleware, adminMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.createArticle(data, user.user_id);

  return jsonResponse(c, successResponse(article), 201);
});

/**
 * GET /api/v1/admin/articles/:id - 查詢單篇文章（管理員）[規格:L113]
 */
externalContent.get('/admin/articles/:id', authMiddleware, adminMiddleware, async (c) => {
  const articleId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.getArticleById(articleId);

  if (!article) {
    return jsonResponse(c, { success: false, error: 'Article not found' }, 404);
  }

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * PUT /api/v1/admin/articles/:id - 更新文章（管理員）[規格:L114]
 */
externalContent.put('/admin/articles/:id', authMiddleware, adminMiddleware, async (c) => {
  const articleId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.updateArticle(articleId, data);

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * DELETE /api/v1/admin/articles/:id - 刪除文章（管理員）[規格:L115]
 */
externalContent.delete('/admin/articles/:id', authMiddleware, adminMiddleware, async (c) => {
  const articleId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  await service.deleteArticle(articleId);

  return jsonResponse(c, successResponse({ message: 'Article deleted successfully' }), 200);
});

/**
 * POST /api/v1/admin/articles/:id/publish - 發布文章（管理員）[規格:L116]
 */
externalContent.post('/admin/articles/:id/publish', authMiddleware, adminMiddleware, async (c) => {
  const articleId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.publishArticle(articleId);

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * POST /api/v1/admin/articles/:id/unpublish - 取消發布文章（管理員）[規格:L117]
 */
externalContent.post('/admin/articles/:id/unpublish', authMiddleware, adminMiddleware, async (c) => {
  const articleId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.unpublishArticle(articleId);

  return jsonResponse(c, successResponse(article), 200);
});

/**
 * GET /api/v1/public/articles - 查詢已發布文章列表（公開）[規格:L120]
 */
externalContent.get('/public/articles', async (c) => {
  const filters = {
    category: c.req.query('category'),
    is_published: true,
    limit: parseInt(c.req.query('limit') || '20'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const result = await service.getArticles(filters);

  return jsonResponse(c, successResponse(result), 200);
});

/**
 * GET /api/v1/public/articles/:slug - 根據slug查詢文章（公開）[規格:L121]
 */
externalContent.get('/public/articles/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const article = await service.getArticleBySlug(slug, true);

  if (!article) {
    return jsonResponse(c, { success: false, error: 'Article not found or not published' }, 404);
  }

  return jsonResponse(c, successResponse(article), 200);
});

// ==================== FAQ 管理 API ====================
// 規格來源：L126-L134

/**
 * GET /api/v1/admin/faq - 查詢FAQ列表（管理員）[規格:L126]
 */
externalContent.get('/admin/faq', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    category: c.req.query('category'),
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const faqs = await service.getFAQs(filters);

  return jsonResponse(c, successResponse(faqs), 200);
});

/**
 * POST /api/v1/admin/faq - 創建FAQ（管理員）[規格:L127]
 */
externalContent.post('/admin/faq', authMiddleware, adminMiddleware, async (c) => {
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const faq = await service.createFAQ(data);

  return jsonResponse(c, successResponse(faq), 201);
});

/**
 * PUT /api/v1/admin/faq/:id - 更新FAQ（管理員）[規格:L128]
 */
externalContent.put('/admin/faq/:id', authMiddleware, adminMiddleware, async (c) => {
  const faqId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const faq = await service.updateFAQ(faqId, data);

  return jsonResponse(c, successResponse(faq), 200);
});

/**
 * DELETE /api/v1/admin/faq/:id - 刪除FAQ（管理員）[規格:L129]
 */
externalContent.delete('/admin/faq/:id', authMiddleware, adminMiddleware, async (c) => {
  const faqId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  await service.deleteFAQ(faqId);

  return jsonResponse(c, successResponse({ message: 'FAQ deleted successfully' }), 200);
});

/**
 * PUT /api/v1/admin/faq/reorder - 重新排序FAQ（管理員）[規格:L130]
 */
externalContent.put('/admin/faq/reorder', authMiddleware, adminMiddleware, async (c) => {
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  await service.reorderFAQs(data);

  return jsonResponse(c, successResponse({ message: 'FAQ reordered successfully' }), 200);
});

/**
 * GET /api/v1/public/faq - 查詢已發布FAQ列表（公開）[規格:L133]
 */
externalContent.get('/public/faq', async (c) => {
  const filters = {
    category: c.req.query('category'),
    is_published: true,
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const faqs = await service.getFAQs(filters);

  return jsonResponse(c, successResponse(faqs), 200);
});

// ==================== 資源中心管理 API ====================
// 規格來源：L138-L147

/**
 * GET /api/v1/admin/resources - 查詢資源列表（管理員）[規格:L138]
 */
externalContent.get('/admin/resources', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    category: c.req.query('category'),
    file_type: c.req.query('file_type'),
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const resources = await service.getResources(filters);

  return jsonResponse(c, successResponse(resources), 200);
});

/**
 * POST /api/v1/admin/resources/upload - 上傳資源文件（管理員）[規格:L139]
 */
externalContent.post('/admin/resources/upload', authMiddleware, adminMiddleware, async (c) => {
  const user = c.get('user') as User;
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const is_published = formData.get('is_published') === 'true';

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const resource = await service.uploadResource(file, {
    title,
    description,
    category,
    is_published
  }, user.user_id);

  return jsonResponse(c, successResponse(resource), 201);
});

/**
 * GET /api/v1/admin/resources/:id - 查詢單個資源（管理員）[規格:L140]
 */
externalContent.get('/admin/resources/:id', authMiddleware, adminMiddleware, async (c) => {
  const resourceId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const resource = await service.getResourceById(resourceId);

  if (!resource) {
    return jsonResponse(c, { success: false, error: 'Resource not found' }, 404);
  }

  return jsonResponse(c, successResponse(resource), 200);
});

/**
 * PUT /api/v1/admin/resources/:id - 更新資源元數據（管理員）[規格:L141]
 */
externalContent.put('/admin/resources/:id', authMiddleware, adminMiddleware, async (c) => {
  const resourceId = parseInt(c.req.param('id'));
  const data = await c.req.json();
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const resource = await service.updateResource(resourceId, data);

  return jsonResponse(c, successResponse(resource), 200);
});

/**
 * DELETE /api/v1/admin/resources/:id - 刪除資源（管理員）[規格:L142]
 */
externalContent.delete('/admin/resources/:id', authMiddleware, adminMiddleware, async (c) => {
  const resourceId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  await service.deleteResource(resourceId);

  return jsonResponse(c, successResponse({ message: 'Resource deleted successfully' }), 200);
});

/**
 * GET /api/v1/public/resources - 查詢已發布資源列表（公開）[規格:L145]
 */
externalContent.get('/public/resources', async (c) => {
  const filters = {
    category: c.req.query('category'),
    is_published: true,
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const resources = await service.getResources(filters);

  return jsonResponse(c, successResponse(resources), 200);
});

/**
 * GET /api/v1/public/resources/:id/download - 下載資源文件（公開）[規格:L146]
 */
externalContent.get('/public/resources/:id/download', async (c) => {
  const resourceId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const { stream, contentType, fileName } = await service.downloadResource(resourceId);

  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
});

// ==================== 圖片管理 API ====================
// 規格來源：L151-L158

/**
 * GET /api/v1/admin/images - 查詢圖片列表（管理員）[規格:L151]
 */
externalContent.get('/admin/images', authMiddleware, adminMiddleware, async (c) => {
  const filters = {
    category: c.req.query('category'),
  };

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const images = await service.getImages(filters);

  return jsonResponse(c, successResponse(images), 200);
});

/**
 * POST /api/v1/admin/images/upload - 上傳圖片（管理員）[規格:L152]
 */
externalContent.post('/admin/images/upload', authMiddleware, adminMiddleware, async (c) => {
  const user = c.get('user') as User;
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const alt_text = formData.get('alt_text') as string;
  const category = formData.get('category') as string;

  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const image = await service.uploadImage(file, {
    title,
    alt_text,
    category
  }, user.user_id);

  return jsonResponse(c, successResponse(image), 201);
});

/**
 * DELETE /api/v1/admin/images/:id - 刪除圖片（管理員）[規格:L153]
 */
externalContent.delete('/admin/images/:id', authMiddleware, adminMiddleware, async (c) => {
  const imageId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  await service.deleteImage(imageId);

  return jsonResponse(c, successResponse({ message: 'Image deleted successfully' }), 200);
});

/**
 * GET /api/v1/admin/images/categories - 查詢圖片分類列表（管理員）[規格:L154]
 */
externalContent.get('/admin/images/categories', authMiddleware, adminMiddleware, async (c) => {
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const categories = await service.getImageCategories();

  return jsonResponse(c, successResponse(categories), 200);
});

/**
 * GET /api/v1/public/images/:id - 查詢單張圖片（公開）[規格:L157]
 */
externalContent.get('/public/images/:id', async (c) => {
  const imageId = parseInt(c.req.param('id'));
  
  const service = new ExternalContentService(c.env.DB, c.env.R2_BUCKET, c.env.CDN_BASE_URL);
  const image = await service.getImageById(imageId);

  if (!image) {
    return jsonResponse(c, { success: false, error: 'Image not found' }, 404);
  }

  return jsonResponse(c, successResponse(image), 200);
});

export default externalContent;
