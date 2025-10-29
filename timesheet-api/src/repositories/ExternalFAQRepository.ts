/**
 * ExternalFAQ Repository - 外部FAQ資料訪問層
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md L41-L57
 */

import { D1Database } from '@cloudflare/workers-types';

export interface ExternalFAQ {
  faq_id: number;
  question: string;
  answer: string;
  category?: string | null;
  sort_order: number;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export class ExternalFAQRepository {
  constructor(private db: D1Database) {}

  async findAll(options: {
    category?: string;
    is_published?: boolean;
  } = {}): Promise<ExternalFAQ[]> {
    const { category, is_published } = options;

    let sql = 'SELECT * FROM ExternalFAQ WHERE is_deleted = 0';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (is_published !== undefined) {
      sql += ' AND is_published = ?';
      params.push(is_published ? 1 : 0);
    }

    sql += ' ORDER BY sort_order ASC';

    const result = await this.db.prepare(sql).bind(...params).all<ExternalFAQ>();
    return result.results || [];
  }

  async findById(faqId: number): Promise<ExternalFAQ | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ExternalFAQ
      WHERE faq_id = ? AND is_deleted = 0
    `).bind(faqId).first<ExternalFAQ>();
    return result || null;
  }

  async create(data: Omit<ExternalFAQ, 'faq_id' | 'view_count' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<ExternalFAQ> {
    const result = await this.db.prepare(`
      INSERT INTO ExternalFAQ (question, answer, category, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.question, data.answer, data.category || null,
      data.sort_order || 0, data.is_published ? 1 : 0
    ).first<ExternalFAQ>();

    if (!result) throw new Error('Failed to create FAQ');
    return result;
  }

  async update(faqId: number, data: Partial<Omit<ExternalFAQ, 'faq_id' | 'view_count' | 'created_at' | 'updated_at' | 'is_deleted'>>): Promise<ExternalFAQ> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? null));
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(faqId);
      if (!existing) throw new Error('FAQ not found');
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(faqId);

    const result = await this.db.prepare(`
      UPDATE ExternalFAQ SET ${fields.join(', ')}
      WHERE faq_id = ? AND is_deleted = 0 RETURNING *
    `).bind(...params).first<ExternalFAQ>();

    if (!result) throw new Error('Failed to update FAQ');
    return result;
  }

  async updateSortOrder(updates: Array<{ faq_id: number; sort_order: number }>): Promise<void> {
    for (const { faq_id, sort_order } of updates) {
      await this.db.prepare(`
        UPDATE ExternalFAQ
        SET sort_order = ?, updated_at = datetime('now')
        WHERE faq_id = ?
      `).bind(sort_order, faq_id).run();
    }
  }

  async delete(faqId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ExternalFAQ
      SET is_deleted = 1, updated_at = datetime('now')
      WHERE faq_id = ?
    `).bind(faqId).run();
  }
}


