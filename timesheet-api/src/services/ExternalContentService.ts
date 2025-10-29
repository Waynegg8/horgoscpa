/**
 * External Content Service - 外部內容業務邏輯層
 * 整合所有外部內容管理功能（Blog文章、FAQ、資源中心、圖片）
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md
 */

import { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { ExternalArticlesRepository, ExternalArticle } from '../repositories/ExternalArticlesRepository';
import { ExternalFAQRepository, ExternalFAQ } from '../repositories/ExternalFAQRepository';
import { ResourceCenterRepository, Resource } from '../repositories/ResourceCenterRepository';
import { ExternalImagesRepository, ExternalImage } from '../repositories/ExternalImagesRepository';
import {
  uploadToR2,
  getFromR2,
  deleteFromR2,
  validateImageFile,
  validateResourceFile,
  validateSlug,
  validateSEO
} from '../utils/r2Utils';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ExternalContentService {
  private articlesRepo: ExternalArticlesRepository;
  private faqRepo: ExternalFAQRepository;
  private resourcesRepo: ResourceCenterRepository;
  private imagesRepo: ExternalImagesRepository;

  constructor(
    private db: D1Database,
    private r2Bucket?: R2Bucket,
    private cdnBaseUrl: string = 'https://cdn.yourfirm.com' // L621-L622
  ) {
    this.articlesRepo = new ExternalArticlesRepository(db);
    this.faqRepo = new ExternalFAQRepository(db);
    this.resourcesRepo = new ResourceCenterRepository(db);
    this.imagesRepo = new ExternalImagesRepository(db);
  }

  // ==================== Blog 文章管理 ====================
  // 規格來源：L401-L456

  /**
   * 創建文章 (L401-L420)
   */
  async createArticle(data: Omit<ExternalArticle, 'article_id' | 'view_count' | 'created_at' | 'updated_at' | 'is_deleted'>, createdBy: number): Promise<ExternalArticle> {
    // 驗證必填欄位 (L403-L405)
    if (!data.title || !data.slug) {
      throw new ValidationError('Title and slug are required');
    }

    // 驗證 Slug 格式 (L635-L638)
    validateSlug(data.slug);

    // 檢查 Slug 唯一性 (L407-L411)
    const existing = await this.articlesRepo.findBySlug(data.slug);
    if (existing) {
      throw new ValidationError(`Slug '${data.slug}' already exists`);
    }

    // 驗證 SEO 欄位 (L645-L648)
    validateSEO(data.seo_title ?? undefined, data.seo_description ?? undefined);

    // 創建文章 (L414-L419)
    return this.articlesRepo.create({
      ...data,
      created_by: createdBy,
      is_published: false, // 預設為草稿
      published_at: null
    });
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId: number, data: Partial<ExternalArticle>): Promise<ExternalArticle> {
    // 如果更新 Slug，檢查唯一性
    if (data.slug) {
      validateSlug(data.slug);
      const existing = await this.articlesRepo.findBySlug(data.slug);
      if (existing && existing.article_id !== articleId) {
        throw new ValidationError(`Slug '${data.slug}' already exists`);
      }
    }

    validateSEO(data.seo_title ?? undefined, data.seo_description ?? undefined);

    return this.articlesRepo.update(articleId, data);
  }

  /**
   * 發布文章 (L422-L433)
   */
  async publishArticle(articleId: number): Promise<ExternalArticle> {
    const article = await this.articlesRepo.findById(articleId);
    if (!article) {
      throw new ValidationError('Article not found');
    }

    return this.articlesRepo.publish(articleId);
  }

  /**
   * 取消發布文章
   */
  async unpublishArticle(articleId: number): Promise<ExternalArticle> {
    return this.articlesRepo.unpublish(articleId);
  }

  /**
   * 根據 Slug 查詢文章（公開 API）(L521-L544)
   */
  async getArticleBySlug(slug: string, incrementView: boolean = true): Promise<ExternalArticle | null> {
    const article = await this.articlesRepo.findBySlug(slug);
    
    if (!article) return null;

    // 公開查詢只返回已發布的文章
    if (!article.is_published) return null;

    // 自動增加瀏覽次數 (L541-L544)
    if (incrementView) {
      await this.articlesRepo.incrementViewCount(article.article_id);
      article.view_count += 1;
    }

    return article;
  }

  /**
   * 查詢文章列表
   */
  async getArticles(options: { category?: string; is_published?: boolean; limit?: number; offset?: number } = {}) {
    return this.articlesRepo.findAll(options);
  }

  /**
   * 查詢單篇文章（管理員）
   */
  async getArticleById(articleId: number): Promise<ExternalArticle | null> {
    return this.articlesRepo.findById(articleId);
  }

  /**
   * 刪除文章（軟刪除）
   */
  async deleteArticle(articleId: number): Promise<void> {
    return this.articlesRepo.delete(articleId);
  }

  // ==================== FAQ 管理 ====================

  /**
   * 創建 FAQ
   */
  async createFAQ(data: Omit<ExternalFAQ, 'faq_id' | 'view_count' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<ExternalFAQ> {
    if (!data.question || !data.answer) {
      throw new ValidationError('Question and answer are required');
    }

    return this.faqRepo.create(data);
  }

  /**
   * 更新 FAQ
   */
  async updateFAQ(faqId: number, data: Partial<ExternalFAQ>): Promise<ExternalFAQ> {
    return this.faqRepo.update(faqId, data);
  }

  /**
   * 重新排序 FAQ
   */
  async reorderFAQs(updates: Array<{ faq_id: number; sort_order: number }>): Promise<void> {
    return this.faqRepo.updateSortOrder(updates);
  }

  /**
   * 查詢 FAQ 列表（支持分組）(L576-L585)
   */
  async getFAQs(options: { category?: string; is_published?: boolean } = {}): Promise<ExternalFAQ[]> {
    return this.faqRepo.findAll(options);
  }

  /**
   * 刪除 FAQ
   */
  async deleteFAQ(faqId: number): Promise<void> {
    return this.faqRepo.delete(faqId);
  }

  // ==================== 資源中心管理 ====================
  // 規格來源：L435-L477

  /**
   * 上傳資源文件 (L435-L456)
   */
  async uploadResource(
    file: File,
    metadata: { title: string; description?: string; category?: string; is_published?: boolean },
    uploadedBy: number
  ): Promise<Resource> {
    if (!this.r2Bucket) {
      throw new Error('R2 Bucket not configured');
    }

    // 驗證文件大小和類型 (L436-L439, L640-L643)
    validateResourceFile(file);

    // 上傳到 R2 (L442-L443, L612-L624)
    const { fileUrl, r2Key } = await uploadToR2(this.r2Bucket, file, 'resources', this.cdnBaseUrl);

    // 創建資源記錄 (L446-L455)
    return this.resourcesRepo.create({
      title: metadata.title,
      description: metadata.description || null,
      file_url: r2Key, // 存儲 R2 key，而不是完整 URL
      file_type: file.type,
      file_size: file.size,
      category: metadata.category || null,
      is_published: metadata.is_published ?? true,
      created_by: uploadedBy
    });
  }

  /**
   * 下載資源文件 (L458-L477)
   */
  async downloadResource(resourceId: number): Promise<{ stream: ReadableStream; contentType: string; fileName: string }> {
    if (!this.r2Bucket) {
      throw new Error('R2 Bucket not configured');
    }

    // 查詢資源 (L460-L464)
    const resource = await this.resourcesRepo.findById(resourceId);
    if (!resource) {
      throw new ValidationError('Resource not found');
    }

    if (!resource.is_published) {
      throw new ValidationError('Resource is not published');
    }

    // 增加下載次數 (L466-L467, L554-L557)
    await this.resourcesRepo.incrementDownloadCount(resourceId);

    // 從 R2 獲取文件 (L469-L470, L560)
    const object = await getFromR2(this.r2Bucket, resource.file_url);
    if (!object) {
      throw new Error('File not found in storage');
    }

    // 返回文件流 (L562-L568)
    return {
      stream: object.body,
      contentType: resource.file_type || 'application/octet-stream',
      fileName: resource.title
    };
  }

  /**
   * 更新資源元數據
   */
  async updateResource(resourceId: number, data: Partial<Resource>): Promise<Resource> {
    return this.resourcesRepo.update(resourceId, data);
  }

  /**
   * 查詢資源列表
   */
  async getResources(options: { category?: string; file_type?: string; is_published?: boolean } = {}): Promise<Resource[]> {
    return this.resourcesRepo.findAll(options);
  }

  /**
   * 刪除資源（同時刪除 R2 文件）
   */
  async deleteResource(resourceId: number): Promise<void> {
    if (!this.r2Bucket) {
      throw new Error('R2 Bucket not configured');
    }

    const resource = await this.resourcesRepo.findById(resourceId);
    if (resource) {
      // 從 R2 刪除文件
      await deleteFromR2(this.r2Bucket, resource.file_url);
    }

    return this.resourcesRepo.delete(resourceId);
  }

  // ==================== 圖片管理 ====================
  // 規格來源：L479-L508

  /**
   * 上傳圖片 (L479-L508)
   */
  async uploadImage(
    file: File,
    metadata: { title?: string; alt_text?: string; category?: string },
    uploadedBy: number
  ): Promise<ExternalImage> {
    if (!this.r2Bucket) {
      throw new Error('R2 Bucket not configured');
    }

    // 驗證圖片格式和大小 (L481-L488, L641)
    validateImageFile(file);

    // 上傳到 R2 (L490-L492, L606)
    const { fileUrl, r2Key } = await uploadToR2(this.r2Bucket, file, 'images', this.cdnBaseUrl);

    // 創建圖片記錄 (L497-L507)
    // 注意：width 和 height 應該由前端提供或使用圖片解析庫獲取
    return this.imagesRepo.create({
      title: metadata.title || null,
      image_url: r2Key,
      alt_text: metadata.alt_text || null,
      category: metadata.category || null,
      file_size: file.size,
      width: null, // 前端應提供
      height: null, // 前端應提供
      uploaded_by: uploadedBy
    });
  }

  /**
   * 查詢圖片列表
   */
  async getImages(options: { category?: string } = {}): Promise<ExternalImage[]> {
    return this.imagesRepo.findAll(options);
  }

  /**
   * 查詢單張圖片
   */
  async getImageById(imageId: number): Promise<ExternalImage | null> {
    return this.imagesRepo.findById(imageId);
  }

  /**
   * 刪除圖片（同時刪除 R2 文件）
   */
  async deleteImage(imageId: number): Promise<void> {
    if (!this.r2Bucket) {
      throw new Error('R2 Bucket not configured');
    }

    const image = await this.imagesRepo.findById(imageId);
    if (image) {
      // 從 R2 刪除文件
      await deleteFromR2(this.r2Bucket, image.image_url);
    }

    return this.imagesRepo.delete(imageId);
  }

  /**
   * 查詢所有圖片分類
   */
  async getImageCategories(): Promise<string[]> {
    return this.imagesRepo.getCategories();
  }
}

