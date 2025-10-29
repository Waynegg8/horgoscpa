/**
 * Client Repository - 客戶資料訪問層
 * ⚠️ 重點：使用 JOIN 避免 N+1 查詢問題
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Client {
  client_id: string;
  company_name: string;
  tax_registration_number?: string;
  business_status: '營業中' | '暫停營業' | '已結束營業';
  assignee_user_id: number;
  assignee_name?: string;              // JOIN 查詢獲取
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  contact_title?: string;
  client_notes?: string;               // 客戶備註
  payment_notes?: string;              // 收款備註
  tags?: string[];                     // JOIN 查詢獲取
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export interface CustomerTag {
  tag_id?: number;
  tag_name: string;
  tag_color?: string;
  description?: string;
  sort_order?: number;
  created_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export class ClientRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢客戶列表（含 N+1 優化）
   */
  async findAll(options: {
    company_name?: string;
    assignee_user_id?: number;
    business_status?: string;
    tag_id?: number;
    limit?: number;
    offset?: number;
    fields?: string[];
  } = {}): Promise<{ clients: Client[]; total: number }> {
    const { limit = 50, offset = 0, fields = ['*'] } = options;
    
    // ✅ 使用 JOIN 一次查詢，避免 N+1 問題
    let selectClause = `
      c.client_id,
      c.company_name,
      c.tax_registration_number,
      c.business_status,
      c.assignee_user_id,
      c.phone,
      c.email,
      c.address,
      c.contact_person,
      c.contact_title,
      c.client_notes,
      c.payment_notes,
      c.created_at,
      c.updated_at,
      u.name as assignee_name,
      GROUP_CONCAT(t.tag_name) as tags
    `;
    
    // 字段選擇器（Sparse Fieldsets）
    if (!fields.includes('*') && fields.length > 0) {
      const selectedFields = fields.map(f => {
        if (f === 'assignee_name') return 'u.name as assignee_name';
        if (f === 'tags') return 'GROUP_CONCAT(t.tag_name) as tags';
        return `c.${f}`;
      });
      selectClause = selectedFields.join(', ');
    }
    
    let sql = `
      SELECT ${selectClause}
      FROM Clients c
      LEFT JOIN Users u ON c.assignee_user_id = u.user_id
      LEFT JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
      LEFT JOIN CustomerTags t ON cta.tag_id = t.tag_id AND t.is_deleted = 0
      WHERE c.is_deleted = 0
    `;
    
    const params: any[] = [];
    
    // 動態條件
    if (options.company_name) {
      sql += ` AND c.company_name LIKE ?`;
      params.push(`%${options.company_name}%`);
    }
    
    if (options.assignee_user_id) {
      sql += ` AND c.assignee_user_id = ?`;
      params.push(options.assignee_user_id);
    }
    
    if (options.business_status) {
      sql += ` AND c.business_status = ?`;
      params.push(options.business_status);
    }
    
    if (options.tag_id) {
      sql += ` AND cta.tag_id = ?`;
      params.push(options.tag_id);
    }
    
    // 分組
    sql += ` GROUP BY c.client_id`;
    
    // 查詢總數（在分組前）
    const countSql = `
      SELECT COUNT(DISTINCT c.client_id) as total
      FROM Clients c
      LEFT JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
      WHERE c.is_deleted = 0
      ${options.company_name ? 'AND c.company_name LIKE ?' : ''}
      ${options.assignee_user_id ? 'AND c.assignee_user_id = ?' : ''}
      ${options.business_status ? 'AND c.business_status = ?' : ''}
      ${options.tag_id ? 'AND cta.tag_id = ?' : ''}
    `;
    
    const countParams = params.slice(); // 複製參數
    const countResult = await this.db.prepare(countSql).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    // 排序和分頁
    sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const result = await this.db.prepare(sql).bind(...params).all<any>();
    
    // 處理標籤字符串 → 數組
    const clients = (result.results || []).map(row => ({
      ...row,
      tags: row.tags ? row.tags.split(',') : [],
    }));
    
    return { clients, total };
  }

  /**
   * 根據 ID 查詢客戶（含標籤）
   */
  async findById(clientId: string): Promise<Client | null> {
    const sql = `
      SELECT 
        c.*,
        u.name as assignee_name,
        GROUP_CONCAT(t.tag_name) as tags
      FROM Clients c
      LEFT JOIN Users u ON c.assignee_user_id = u.user_id
      LEFT JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
      LEFT JOIN CustomerTags t ON cta.tag_id = t.tag_id AND t.is_deleted = 0
      WHERE c.client_id = ? AND c.is_deleted = 0
      GROUP BY c.client_id
    `;
    
    const result = await this.db.prepare(sql).bind(clientId).first<any>();
    
    if (!result) {
      return null;
    }
    
    return {
      ...result,
      tags: result.tags ? result.tags.split(',') : [],
    };
  }

  /**
   * 創建客戶
   */
  async create(client: Omit<Client, 'created_at' | 'updated_at' | 'is_deleted' | 'assignee_name' | 'tags'>): Promise<Client> {
    await this.db.prepare(`
      INSERT INTO Clients (
        client_id, company_name, tax_registration_number, business_status,
        assignee_user_id, phone, email, address,
        contact_person, contact_title, client_notes, payment_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      client.client_id,
      client.company_name,
      client.tax_registration_number || null,
      client.business_status || '營業中',
      client.assignee_user_id,
      client.phone || null,
      client.email || null,
      client.address || null,
      client.contact_person || null,
      client.contact_title || null,
      client.client_notes || null,
      client.payment_notes || null
    ).run();
    
    const result = await this.findById(client.client_id);
    if (!result) {
      throw new Error('創建客戶失敗');
    }
    
    return result;
  }

  /**
   * 更新客戶
   */
  async update(clientId: string, updates: Partial<Client>): Promise<Client> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = [
      'company_name', 'tax_registration_number', 'business_status',
      'assignee_user_id', 'phone', 'email', 'address',
      'contact_person', 'contact_title', 'client_notes', 'payment_notes'
    ];
    
    for (const field of allowedFields) {
      if (updates[field as keyof Client] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof Client]);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('沒有可更新的欄位');
    }
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(clientId);
    
    await this.db.prepare(`
      UPDATE Clients
      SET ${fields.join(', ')}
      WHERE client_id = ?
    `).bind(...values).run();
    
    const result = await this.findById(clientId);
    if (!result) {
      throw new Error('客戶不存在');
    }
    
    return result;
  }

  /**
   * 軟刪除
   */
  async delete(clientId: string, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Clients
      SET is_deleted = 1,
          deleted_at = datetime('now'),
          deleted_by = ?
      WHERE client_id = ?
    `).bind(deletedBy, clientId).run();
  }

  /**
   * 檢查統一編號是否已存在
   */
  async existsById(clientId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM Clients
      WHERE client_id = ? AND is_deleted = 0
    `).bind(clientId).first<{ count: number }>();
    
    return (result?.count || 0) > 0;
  }

  /**
   * 指派標籤給客戶
   */
  async assignTag(clientId: string, tagId: number, assignedBy: number): Promise<void> {
    await this.db.prepare(`
      INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_by)
      VALUES (?, ?, ?)
    `).bind(clientId, tagId, assignedBy).run();
  }

  /**
   * 移除客戶的標籤
   */
  async removeTag(clientId: string, tagId: number): Promise<void> {
    await this.db.prepare(`
      DELETE FROM ClientTagAssignments
      WHERE client_id = ? AND tag_id = ?
    `).bind(clientId, tagId).run();
  }

  /**
   * 批量更新客戶（僅管理員）
   */
  async batchUpdate(clientIds: string[], updates: Partial<Client>, updatedBy: number): Promise<number> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = ['business_status', 'assignee_user_id'];
    
    for (const field of allowedFields) {
      if (updates[field as keyof Client] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof Client]);
      }
    }
    
    if (fields.length === 0) {
      return 0;
    }
    
    fields.push('updated_at = datetime(\'now\')');
    
    // 批量更新
    const placeholders = clientIds.map(() => '?').join(',');
    values.push(...clientIds);
    
    const result = await this.db.prepare(`
      UPDATE Clients
      SET ${fields.join(', ')}
      WHERE client_id IN (${placeholders}) AND is_deleted = 0
    `).bind(...values).run();
    
    return result.meta?.changes || 0;
  }
}

/**
 * CustomerTag Repository
 */
export class CustomerTagRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有標籤
   */
  async findAll(): Promise<CustomerTag[]> {
    const result = await this.db.prepare(`
      SELECT * FROM CustomerTags
      WHERE is_deleted = 0
      ORDER BY sort_order ASC, tag_name ASC
    `).all<CustomerTag>();
    
    return result.results || [];
  }

  /**
   * 根據 ID 查詢
   */
  async findById(tagId: number): Promise<CustomerTag | null> {
    const result = await this.db.prepare(`
      SELECT * FROM CustomerTags
      WHERE tag_id = ? AND is_deleted = 0
    `).bind(tagId).first<CustomerTag>();
    
    return result || null;
  }

  /**
   * 創建標籤
   */
  async create(tag: Omit<CustomerTag, 'tag_id' | 'created_at' | 'is_deleted'>): Promise<CustomerTag> {
    await this.db.prepare(`
      INSERT INTO CustomerTags (tag_name, tag_color, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).bind(
      tag.tag_name,
      tag.tag_color || '#3B82F6',
      tag.description || null,
      tag.sort_order || 0
    ).run();
    
    const result = await this.db.prepare(`
      SELECT * FROM CustomerTags
      WHERE tag_name = ? AND is_deleted = 0
      ORDER BY tag_id DESC
      LIMIT 1
    `).bind(tag.tag_name).first<CustomerTag>();
    
    if (!result) {
      throw new Error('創建標籤失敗');
    }
    
    return result;
  }

  /**
   * 檢查名稱是否已存在
   */
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM CustomerTags
      WHERE tag_name = ? AND is_deleted = 0
    `;
    const params: any[] = [name];
    
    if (excludeId) {
      query += ' AND tag_id != ?';
      params.push(excludeId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }

  /**
   * 軟刪除標籤
   */
  async delete(tagId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE CustomerTags
      SET is_deleted = 1,
          deleted_at = datetime('now'),
          deleted_by = ?
      WHERE tag_id = ?
    `).bind(deletedBy, tagId).run();
  }
}

