/**
 * ResourceCenter Repository - 資源中心資料訪問層
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md L61-L82
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Resource {
  resource_id: number;
  title: string;
  description?: string | null;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  category?: string | null;
  is_published: boolean;
  download_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export class ResourceCenterRepository {
  constructor(private db: D1Database) {}

  async findAll(options: {
    category?: string;
    file_type?: string;
    is_published?: boolean;
  } = {}): Promise<Resource[]> {
    const { category, file_type, is_published } = options;

    let sql = 'SELECT * FROM ResourceCenter WHERE is_deleted = 0';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (file_type) {
      sql += ' AND file_type = ?';
      params.push(file_type);
    }

    if (is_published !== undefined) {
      sql += ' AND is_published = ?';
      params.push(is_published ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await this.db.prepare(sql).bind(...params).all<Resource>();
    return result.results || [];
  }

  async findById(resourceId: number): Promise<Resource | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ResourceCenter
      WHERE resource_id = ? AND is_deleted = 0
    `).bind(resourceId).first<Resource>();
    return result || null;
  }

  async create(data: Omit<Resource, 'resource_id' | 'download_count' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Resource> {
    const result = await this.db.prepare(`
      INSERT INTO ResourceCenter (
        title, description, file_url, file_type, file_size, category,
        is_published, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.title, data.description || null, data.file_url,
      data.file_type || null, data.file_size || null, data.category || null,
      data.is_published ? 1 : 0, data.created_by
    ).first<Resource>();

    if (!result) throw new Error('Failed to create resource');
    return result;
  }

  async update(resourceId: number, data: Partial<Omit<Resource, 'resource_id' | 'download_count' | 'file_url' | 'created_by' | 'created_at' | 'updated_at' | 'is_deleted'>>): Promise<Resource> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? null));
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(resourceId);
      if (!existing) throw new Error('Resource not found');
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(resourceId);

    const result = await this.db.prepare(`
      UPDATE ResourceCenter SET ${fields.join(', ')}
      WHERE resource_id = ? AND is_deleted = 0 RETURNING *
    `).bind(...params).first<Resource>();

    if (!result) throw new Error('Failed to update resource');
    return result;
  }

  async incrementDownloadCount(resourceId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ResourceCenter
      SET download_count = download_count + 1
      WHERE resource_id = ?
    `).bind(resourceId).run();
  }

  async delete(resourceId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ResourceCenter
      SET is_deleted = 1, updated_at = datetime('now')
      WHERE resource_id = ?
    `).bind(resourceId).run();
  }
}

