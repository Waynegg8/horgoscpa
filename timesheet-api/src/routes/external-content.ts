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

import { Router } from 'itty-router';
import { ExternalContentService } from '../services/ExternalContentService';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

export function createExternalContentRoutes(router: Router, env: any) {
  const getService = () => new ExternalContentService(env.DB, env.R2_BUCKET, env.CDN_BASE_URL);

  // ==================== Blog 文章管理 API ====================
  // 規格來源：L111-L122

  /**
   * GET /api/v1/admin/articles - 查詢文章列表（管理員）[規格:L111]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/articles', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;
    const is_published = url.searchParams.get('is_published');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const service = getService();
    const result = await service.getArticles({
      category,
      is_published: is_published !== null ? is_published === 'true' : undefined,
      limit,
      offset
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/articles - 創建文章（管理員）[規格:L112]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/articles', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const service = getService();
    
    const article = await service.createArticle(body, request.user.user_id);

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/articles/:id - 查詢單篇文章（管理員）[規格:L113]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/articles/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const articleId = parseInt(request.params.id);
    const service = getService();
    
    const article = await service.getArticleById(articleId);
    if (!article) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Article not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/articles/:id - 更新文章（管理員）[規格:L114]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/articles/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const articleId = parseInt(request.params.id);
    const body = await request.json();
    const service = getService();
    
    const article = await service.updateArticle(articleId, body);

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/articles/:id - 刪除文章（管理員）[規格:L115]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/articles/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const articleId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteArticle(articleId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Article deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/articles/:id/publish - 發布文章（管理員）[規格:L116]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/articles/:id/publish', authMiddleware, adminMiddleware, async (request: any) => {
    const articleId = parseInt(request.params.id);
    const service = getService();
    
    const article = await service.publishArticle(articleId);

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/articles/:id/unpublish - 取消發布文章（管理員）[規格:L117]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/articles/:id/unpublish', authMiddleware, adminMiddleware, async (request: any) => {
    const articleId = parseInt(request.params.id);
    const service = getService();
    
    const article = await service.unpublishArticle(articleId);

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/articles - 查詢已發布文章列表（公開）[規格:L120]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/articles', async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const service = getService();
    const result = await service.getArticles({
      category,
      is_published: true, // 只返回已發布的文章
      limit,
      offset
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/articles/:slug - 根據slug查詢文章（公開）[規格:L121]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/articles/:slug', async (request: any) => {
    const slug = request.params.slug;
    const service = getService();
    
    const article = await service.getArticleBySlug(slug, true); // 自動增加瀏覽次數
    if (!article) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Article not found or not published'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: article
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // ==================== FAQ 管理 API ====================
  // 規格來源：L126-L134

  /**
   * GET /api/v1/admin/faq - 查詢FAQ列表（管理員）[規格:L126]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/faq', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;

    const service = getService();
    const faqs = await service.getFAQs({ category });

    return new Response(JSON.stringify({
      success: true,
      data: faqs
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/faq - 創建FAQ（管理員）[規格:L127]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/faq', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json();
    const service = getService();
    
    const faq = await service.createFAQ(body);

    return new Response(JSON.stringify({
      success: true,
      data: faq
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/faq/:id - 更新FAQ（管理員）[規格:L128]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/faq/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const faqId = parseInt(request.params.id);
    const body = await request.json();
    const service = getService();
    
    const faq = await service.updateFAQ(faqId, body);

    return new Response(JSON.stringify({
      success: true,
      data: faq
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/faq/:id - 刪除FAQ（管理員）[規格:L129]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/faq/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const faqId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteFAQ(faqId);

    return new Response(JSON.stringify({
      success: true,
      message: 'FAQ deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/faq/reorder - 重新排序FAQ（管理員）[規格:L130]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/faq/reorder', authMiddleware, adminMiddleware, async (request: any) => {
    const body = await request.json(); // Array<{faq_id, sort_order}>
    const service = getService();
    
    await service.reorderFAQs(body);

    return new Response(JSON.stringify({
      success: true,
      message: 'FAQ reordered successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/faq - 查詢已發布FAQ列表（公開）[規格:L133]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/faq', async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;

    const service = getService();
    const faqs = await service.getFAQs({ category, is_published: true });

    return new Response(JSON.stringify({
      success: true,
      data: faqs
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // ==================== 資源中心管理 API ====================
  // 規格來源：L138-L147

  /**
   * GET /api/v1/admin/resources - 查詢資源列表（管理員）[規格:L138]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/resources', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;
    const file_type = url.searchParams.get('file_type') || undefined;

    const service = getService();
    const resources = await service.getResources({ category, file_type });

    return new Response(JSON.stringify({
      success: true,
      data: resources
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/resources/upload - 上傳資源文件（管理員）[規格:L139]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/resources/upload', authMiddleware, adminMiddleware, async (request: any) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const is_published = formData.get('is_published') === 'true';

    const service = getService();
    const resource = await service.uploadResource(file, {
      title,
      description,
      category,
      is_published
    }, request.user.user_id);

    return new Response(JSON.stringify({
      success: true,
      data: resource
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/resources/:id - 查詢單個資源（管理員）[規格:L140]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/resources/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const resourceId = parseInt(request.params.id);
    const service = getService();
    
    const resource = await service.getResources({}); // 簡化處理
    const found = resource.find((r: any) => r.resource_id === resourceId);

    if (!found) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Resource not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: found
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * PUT /api/v1/admin/resources/:id - 更新資源元數據（管理員）[規格:L141]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.put('/api/v1/admin/resources/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const resourceId = parseInt(request.params.id);
    const body = await request.json();
    const service = getService();
    
    const resource = await service.updateResource(resourceId, body);

    return new Response(JSON.stringify({
      success: true,
      data: resource
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/resources/:id - 刪除資源（管理員）[規格:L142]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/resources/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const resourceId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteResource(resourceId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Resource deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/resources - 查詢已發布資源列表（公開）[規格:L145]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/resources', async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;

    const service = getService();
    const resources = await service.getResources({ category, is_published: true });

    return new Response(JSON.stringify({
      success: true,
      data: resources
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/resources/:id/download - 下載資源文件（公開）[規格:L146]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/resources/:id/download', async (request: any) => {
    const resourceId = parseInt(request.params.id);
    const service = getService();
    
    const { stream, contentType, fileName } = await service.downloadResource(resourceId);

    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  });

  // ==================== 圖片管理 API ====================
  // 規格來源：L151-L158

  /**
   * GET /api/v1/admin/images - 查詢圖片列表（管理員）[規格:L151]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/images', authMiddleware, adminMiddleware, async (request: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;

    const service = getService();
    const images = await service.getImages({ category });

    return new Response(JSON.stringify({
      success: true,
      data: images
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * POST /api/v1/admin/images/upload - 上傳圖片（管理員）[規格:L152]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.post('/api/v1/admin/images/upload', authMiddleware, adminMiddleware, async (request: any) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const alt_text = formData.get('alt_text') as string;
    const category = formData.get('category') as string;

    const service = getService();
    const image = await service.uploadImage(file, {
      title,
      alt_text,
      category
    }, request.user.user_id);

    return new Response(JSON.stringify({
      success: true,
      data: image
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * DELETE /api/v1/admin/images/:id - 刪除圖片（管理員）[規格:L153]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.delete('/api/v1/admin/images/:id', authMiddleware, adminMiddleware, async (request: any) => {
    const imageId = parseInt(request.params.id);
    const service = getService();
    
    await service.deleteImage(imageId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Image deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/admin/images/categories - 查詢圖片分類列表（管理員）[規格:L154]
   * @tags External Content - Admin
   * @security BearerAuth
   */
  router.get('/api/v1/admin/images/categories', authMiddleware, adminMiddleware, async (request: any) => {
    const service = getService();
    const categories = await service.getImageCategories();

    return new Response(JSON.stringify({
      success: true,
      data: categories
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  /**
   * GET /api/v1/public/images/:id - 查詢單張圖片（公開）[規格:L157]
   * @tags External Content - Public
   */
  router.get('/api/v1/public/images/:id', async (request: any) => {
    const imageId = parseInt(request.params.id);
    const service = getService();
    
    const image = await service.getImageById(imageId);
    if (!image) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Image not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: image
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

