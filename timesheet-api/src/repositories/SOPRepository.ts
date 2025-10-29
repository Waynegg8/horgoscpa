/**
 * SOP Repository - SOP 文件資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface SOP {
  sop_id?: number;
  title: string;
  content: string;
  category?: string;
  tags?: string;
  version?: number;
  is_published?: boolean;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export class SOPRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢 SOP 列表
   */
  async findAll(options: {
    category?: string;
    is_published?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ sops: any[]; total: number }> {
    let whereClause = 'WHERE sop.is_deleted = 0';
    const params: any[] = [];

    if (options.category) {
      whereClause += ' AND sop.category = ?';
      params.push(options.category);
    }

    if (options.is_published !== undefined) {
      whereClause += ' AND sop.is_published = ?';
      params.push(options.is_published ? 1 : 0);
    }

    if (options.search) {
      whereClause += ' AND (sop.title LIKE ? OR sop.content LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM SOPDocuments sop ${whereClause}
    `).bind(...params).first<{ total: number }>();

    const total = countResult?.total || 0;

    // 查詢數據（含創建者資訊）
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);

    const result = await this.db.prepare(`
      SELECT 
        sop.*,
        u.name as creator_name
      FROM SOPDocuments sop
      LEFT JOIN Users u ON sop.created_by = u.user_id
      ${whereClause}
      ORDER BY sop.updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params).all<any>();

    return {
      sops: result.results || [],
      total,
    };
  }

  /**
   * 根據 ID 查詢
   */
  async findById(sopId: number): Promise<SOP | null> {
    const result = await this.db.prepare(`
      SELECT 
        sop.*,
        u.name as creator_name
      FROM SOPDocuments sop
      LEFT JOIN Users u ON sop.created_by = u.user_id
      WHERE sop.sop_id = ? AND sop.is_deleted = 0
    `).bind(sopId).first<any>();

    return result || null;
  }

  /**
   * 創建 SOP
   */
  async create(sop: Omit<SOP, 'sop_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<SOP> {
    const result = await this.db.prepare(`
      INSERT INTO SOPDocuments (
        title, content, category, tags, version, is_published, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sop.title,
      sop.content,
      sop.category || null,
      sop.tags || null,
      sop.version || 1,
      sop.is_published ? 1 : 0,
      sop.created_by
    ).first<SOP>();

    if (!result) {
      const inserted = await this.db.prepare(`
        SELECT * FROM SOPDocuments
        WHERE created_by = ? AND title = ?
        ORDER BY sop_id DESC LIMIT 1
      `).bind(sop.created_by, sop.title).first<SOP>();

      if (!inserted) throw new Error('創建 SOP 失敗');
      return inserted;
    }

    return result;
  }

  /**
   * 更新 SOP（版本號自動+1）
   */
  async update(sopId: number, updates: Partial<SOP>): Promise<SOP> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = ['title', 'content', 'category', 'tags'];

    for (const field of allowedFields) {
      if (updates[field as keyof SOP] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof SOP]);
      }
    }

    if (fields.length === 0) throw new Error('沒有可更新的欄位');

    // ⭐ 版本號自動+1
    fields.push('version = version + 1');
    fields.push('updated_at = datetime(\'now\')');
    values.push(sopId);

    await this.db.prepare(`
      UPDATE SOPDocuments SET ${fields.join(', ')} WHERE sop_id = ?
    `).bind(...values).run();

    const result = await this.findById(sopId);
    if (!result) throw new Error('SOP 不存在');

    return result;
  }

  /**
   * 發布 SOP
   */
  async publish(sopId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE SOPDocuments
      SET is_published = 1, updated_at = datetime('now')
      WHERE sop_id = ?
    `).bind(sopId).run();
  }

  /**
   * 軟刪除
   */
  async delete(sopId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE SOPDocuments
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE sop_id = ?
    `).bind(deletedBy, sopId).run();
  }
}

