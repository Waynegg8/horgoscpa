/**
 * Service Repository - 服務項目資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Service {
  service_id?: number;
  parent_service_id?: number | null;
  service_name: string;
  description?: string;
  default_price?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export class ServiceRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有服務（含層級結構）
   */
  async findAll(): Promise<Service[]> {
    const result = await this.db.prepare(`
      SELECT * FROM Services
      WHERE is_deleted = 0
      ORDER BY 
        CASE WHEN parent_service_id IS NULL THEN 0 ELSE 1 END,
        parent_service_id ASC,
        sort_order ASC
    `).all<Service>();
    
    return result.results || [];
  }

  /**
   * 根據 ID 查詢
   */
  async findById(serviceId: number): Promise<Service | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Services
      WHERE service_id = ? AND is_deleted = 0
    `).bind(serviceId).first<Service>();
    
    return result || null;
  }

  /**
   * 查詢子服務
   */
  async findChildren(parentId: number): Promise<Service[]> {
    const result = await this.db.prepare(`
      SELECT * FROM Services
      WHERE parent_service_id = ? AND is_deleted = 0
      ORDER BY sort_order ASC
    `).bind(parentId).all<Service>();
    
    return result.results || [];
  }

  /**
   * 創建服務
   */
  async create(service: Omit<Service, 'service_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Service> {
    const result = await this.db.prepare(`
      INSERT INTO Services (
        parent_service_id, service_name, description, default_price, sort_order
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      service.parent_service_id || null,
      service.service_name,
      service.description || null,
      service.default_price || null,
      service.sort_order || 0
    ).first<Service>();
    
    if (!result) {
      // SQLite 可能不支援 RETURNING，降級方案
      const inserted = await this.db.prepare(`
        SELECT * FROM Services
        WHERE service_name = ? AND is_deleted = 0
        ORDER BY service_id DESC
        LIMIT 1
      `).bind(service.service_name).first<Service>();
      
      if (!inserted) {
        throw new Error('創建服務失敗');
      }
      return inserted;
    }
    
    return result;
  }

  /**
   * 更新服務
   */
  async update(serviceId: number, updates: Partial<Service>): Promise<Service> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = ['service_name', 'description', 'default_price', 'sort_order'];
    
    for (const field of allowedFields) {
      if (updates[field as keyof Service] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof Service]);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('沒有可更新的欄位');
    }
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(serviceId);
    
    await this.db.prepare(`
      UPDATE Services
      SET ${fields.join(', ')}
      WHERE service_id = ?
    `).bind(...values).run();
    
    const result = await this.findById(serviceId);
    if (!result) {
      throw new Error('服務不存在');
    }
    
    return result;
  }

  /**
   * 軟刪除
   */
  async delete(serviceId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Services
      SET is_deleted = 1,
          deleted_at = datetime('now'),
          deleted_by = ?
      WHERE service_id = ?
    `).bind(deletedBy, serviceId).run();
  }

  /**
   * 檢查名稱是否已存在
   */
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM Services
      WHERE service_name = ? AND is_deleted = 0
    `;
    const params: any[] = [name];
    
    if (excludeId) {
      query += ' AND service_id != ?';
      params.push(excludeId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }
}

