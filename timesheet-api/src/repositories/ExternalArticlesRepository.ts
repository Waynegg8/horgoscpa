/**
 * ExternalArticles Repository - 外部文章資料訪問層
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md L11-L37
 */

import { D1Database } from '@cloudflare/workers-types';

export interface ExternalArticle {
  article_id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  featured_image?: string | null;
  category?: string | null;
  tags?: string | null; // JSON string
  is_published: boolean;
  published_at?: string | null;
  view_count: number;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export class ExternalArticlesRepository {
  constructor(private db: D1Database) {}

  async findAll(options: {
    category?: string;
    is_published?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ articles: ExternalArticle[]; total: number }> {
    const { category, is_published, limit = 20, offset = 0 } = options;

    let sql = 'SELECT * FROM ExternalArticles WHERE is_deleted = 0';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (is_published !== undefined) {
      sql += ' AND is_published = ?';
      params.push(is_published ? 1 : 0);
    }

    sql += ' ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(sql).bind(...params).all<ExternalArticle>();

    // Count total
    let countSql = 'SELECT COUNT(*) as total FROM ExternalArticles WHERE is_deleted = 0';
    const countParams: any[] = [];

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    if (is_published !== undefined) {
      countSql += ' AND is_published = ?';
      countParams.push(is_published ? 1 : 0);
    }

    const countResult = await this.db.prepare(countSql).bind(...countParams).first<{ total: number }>();

    return {
      articles: result.results || [],
      total: countResult?.total || 0
    };
  }

  async findById(articleId: number): Promise<ExternalArticle | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ExternalArticles
      WHERE article_id = ? AND is_deleted = 0
    `).bind(articleId).first<ExternalArticle>();
    return result || null;
  }

  async findBySlug(slug: string): Promise<ExternalArticle | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ExternalArticles
      WHERE slug = ? AND is_deleted = 0
    `).bind(slug).first<ExternalArticle>();
    return result || null;
  }

  async create(data: Omit<ExternalArticle, 'article_id' | 'view_count' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<ExternalArticle> {
    const result = await this.db.prepare(`
      INSERT INTO ExternalArticles (
        title, slug, summary, content, featured_image, category, tags,
        is_published, published_at, seo_title, seo_description, seo_keywords,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.title, data.slug, data.summary || null, data.content,
      data.featured_image || null, data.category || null, data.tags || null,
      data.is_published ? 1 : 0, data.published_at || null,
      data.seo_title || null, data.seo_description || null, data.seo_keywords || null,
      data.created_by
    ).first<ExternalArticle>();

    if (!result) throw new Error('Failed to create article');
    return result;
  }

  async update(articleId: number, data: Partial<Omit<ExternalArticle, 'article_id' | 'view_count' | 'created_by' | 'created_at' | 'updated_at' | 'is_deleted'>>): Promise<ExternalArticle> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? null));
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(articleId);
      if (!existing) throw new Error('Article not found');
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(articleId);

    const result = await this.db.prepare(`
      UPDATE ExternalArticles SET ${fields.join(', ')}
      WHERE article_id = ? AND is_deleted = 0 RETURNING *
    `).bind(...params).first<ExternalArticle>();

    if (!result) throw new Error('Failed to update article');
    return result;
  }

  async publish(articleId: number): Promise<ExternalArticle> {
    const result = await this.db.prepare(`
      UPDATE ExternalArticles
      SET is_published = 1, published_at = datetime('now'), updated_at = datetime('now')
      WHERE article_id = ? AND is_deleted = 0
      RETURNING *
    `).bind(articleId).first<ExternalArticle>();

    if (!result) throw new Error('Failed to publish article');
    return result;
  }

  async unpublish(articleId: number): Promise<ExternalArticle> {
    const result = await this.db.prepare(`
      UPDATE ExternalArticles
      SET is_published = 0, updated_at = datetime('now')
      WHERE article_id = ? AND is_deleted = 0
      RETURNING *
    `).bind(articleId).first<ExternalArticle>();

    if (!result) throw new Error('Failed to unpublish article');
    return result;
  }

  async incrementViewCount(articleId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ExternalArticles
      SET view_count = view_count + 1
      WHERE article_id = ?
    `).bind(articleId).run();
  }

  async delete(articleId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ExternalArticles
      SET is_deleted = 1, updated_at = datetime('now')
      WHERE article_id = ?
    `).bind(articleId).run();
  }
}


