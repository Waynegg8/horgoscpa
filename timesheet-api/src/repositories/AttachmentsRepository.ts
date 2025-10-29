/**
 * Attachments Repository - 附件管理資料存取層
 * 規格來源：docs/開發指南/附件系統-完整規格.md
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Attachment {
  attachment_id: number;
  entity_type: 'client' | 'receipt' | 'sop' | 'task';
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  uploaded_at: string;
  is_deleted: boolean;
}

export class AttachmentsRepository {
  constructor(private db: D1Database) {}

  /**
   * 創建附件記錄
   * 規格來源：L36-L50
   */
  async create(data: {
    entity_type: string;
    entity_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_by: number;
  }): Promise<Attachment> {
    const stmt = this.db.prepare(`
      INSERT INTO Attachments (
        entity_type, entity_id, file_name, file_path,
        file_size, mime_type, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.entity_type,
      data.entity_id,
      data.file_name,
      data.file_path,
      data.file_size,
      data.mime_type,
      data.uploaded_by
    );

    return await stmt.first() as Attachment;
  }

  /**
   * 查詢附件詳情
   */
  async findById(attachmentId: number): Promise<Attachment | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM Attachments
      WHERE attachment_id = ? AND is_deleted = 0
    `).bind(attachmentId);

    return await stmt.first() as Attachment | null;
  }

  /**
   * 查詢實體的所有附件
   * 規格來源：L52（索引優化）
   */
  async findByEntity(entityType: string, entityId: string): Promise<Attachment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM Attachments
      WHERE entity_type = ? AND entity_id = ? AND is_deleted = 0
      ORDER BY uploaded_at DESC
    `).bind(entityType, entityId);

    const result = await stmt.all();
    return result.results as Attachment[];
  }

  /**
   * 統計實體的附件數量
   * 規格來源：L84-L90（數量限制檢查）
   */
  async countByEntity(entityType: string, entityId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM Attachments
      WHERE entity_type = ? AND entity_id = ? AND is_deleted = 0
    `).bind(entityType, entityId);

    const result = await stmt.first() as { count: number };
    return result?.count || 0;
  }

  /**
   * 軟刪除附件
   * 規格來源：L46（is_deleted欄位）
   */
  async delete(attachmentId: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE Attachments
      SET is_deleted = 1
      WHERE attachment_id = ?
    `).bind(attachmentId);

    await stmt.run();
  }

  /**
   * 批量查詢附件（含分頁）
   */
  async findAll(filters: {
    entity_type?: string;
    uploaded_by?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<Attachment[]> {
    let query = `
      SELECT * FROM Attachments
      WHERE is_deleted = 0
    `;
    const params: any[] = [];

    if (filters.entity_type) {
      query += ` AND entity_type = ?`;
      params.push(filters.entity_type);
    }

    if (filters.uploaded_by) {
      query += ` AND uploaded_by = ?`;
      params.push(filters.uploaded_by);
    }

    query += ` ORDER BY uploaded_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);

      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results as Attachment[];
  }

  /**
   * 統計附件總數
   */
  async count(filters: {
    entity_type?: string;
    uploaded_by?: number;
  } = {}): Promise<number> {
    let query = `
      SELECT COUNT(*) as count FROM Attachments
      WHERE is_deleted = 0
    `;
    const params: any[] = [];

    if (filters.entity_type) {
      query += ` AND entity_type = ?`;
      params.push(filters.entity_type);
    }

    if (filters.uploaded_by) {
      query += ` AND uploaded_by = ?`;
      params.push(filters.uploaded_by);
    }

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.first() as { count: number };
    return result?.count || 0;
  }
}

