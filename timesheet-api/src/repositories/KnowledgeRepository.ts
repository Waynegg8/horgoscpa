/**
 * Knowledge Repository - 知識庫資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface KnowledgeArticle {
  article_id?: number;
  title: string;
  content: string;
  category?: string;
  tags?: string;
  is_published?: boolean;
  view_count?: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export class KnowledgeRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢知識文章列表
   */
  async findAll(options: {
    category?: string;
    is_published?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ articles: any[]; total: number }> {
    let whereClause = 'WHERE a.is_deleted = 0';
    const params: any[] = [];

    if (options.category) {
      whereClause += ' AND a.category = ?';
      params.push(options.category);
    }

    if (options.is_published !== undefined) {
      whereClause += ' AND a.is_published = ?';
      params.push(options.is_published ? 1 : 0);
    }

    if (options.search) {
      whereClause += ' AND (a.title LIKE ? OR a.content LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM KnowledgeArticles a ${whereClause}
    `).bind(...params).first<{ total: number }>();

    const total = countResult?.total || 0;

    // 查詢數據
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);

    const result = await this.db.prepare(`
      SELECT 
        a.*,
        u.name as creator_name
      FROM KnowledgeArticles a
      LEFT JOIN Users u ON a.created_by = u.user_id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params).all<any>();

    return {
      articles: result.results || [],
      total,
    };
  }

  /**
   * 根據 ID 查詢（並增加瀏覽次數）
   */
  async findById(articleId: number, incrementView: boolean = false): Promise<KnowledgeArticle | null> {
    if (incrementView) {
      await this.db.prepare(`
        UPDATE KnowledgeArticles
        SET view_count = view_count + 1
        WHERE article_id = ?
      `).bind(articleId).run();
    }

    const result = await this.db.prepare(`
      SELECT 
        a.*,
        u.name as creator_name
      FROM KnowledgeArticles a
      LEFT JOIN Users u ON a.created_by = u.user_id
      WHERE a.article_id = ? AND a.is_deleted = 0
    `).bind(articleId).first<any>();

    return result || null;
  }

  /**
   * 創建知識文章
   */
  async create(article: Omit<KnowledgeArticle, 'article_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<KnowledgeArticle> {
    const result = await this.db.prepare(`
      INSERT INTO KnowledgeArticles (
        title, content, category, tags, is_published, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      article.title,
      article.content,
      article.category || null,
      article.tags || null,
      article.is_published ? 1 : 0,
      article.created_by
    ).first<KnowledgeArticle>();

    if (!result) {
      const inserted = await this.db.prepare(`
        SELECT * FROM KnowledgeArticles
        WHERE created_by = ? AND title = ?
        ORDER BY article_id DESC LIMIT 1
      `).bind(article.created_by, article.title).first<KnowledgeArticle>();

      if (!inserted) throw new Error('創建知識文章失敗');
      return inserted;
    }

    return result;
  }

  /**
   * 更新知識文章
   */
  async update(articleId: number, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = ['title', 'content', 'category', 'tags', 'is_published'];

    for (const field of allowedFields) {
      if (updates[field as keyof KnowledgeArticle] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof KnowledgeArticle]);
      }
    }

    if (fields.length === 0) throw new Error('沒有可更新的欄位');

    fields.push('updated_at = datetime(\'now\')');
    values.push(articleId);

    await this.db.prepare(`
      UPDATE KnowledgeArticles SET ${fields.join(', ')} WHERE article_id = ?
    `).bind(...values).run();

    const result = await this.findById(articleId);
    if (!result) throw new Error('知識文章不存在');

    return result;
  }

  /**
   * 軟刪除
   */
  async delete(articleId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE KnowledgeArticles
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE article_id = ?
    `).bind(deletedBy, articleId).run();
  }
}

