/**
 * AuditLog Repository - 審計日誌資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';
import { AuditLog } from '../types';

export class AuditLogRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢審計日誌（含分頁）
   */
  async findAll(options: {
    user_id?: number;
    table_name?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AuditLog[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (options.user_id) {
      whereClause += ' AND al.user_id = ?';
      params.push(options.user_id);
    }
    
    if (options.table_name) {
      whereClause += ' AND al.table_name = ?';
      params.push(options.table_name);
    }
    
    if (options.action) {
      whereClause += ' AND al.action = ?';
      params.push(options.action);
    }
    
    if (options.start_date) {
      whereClause += ' AND al.created_at >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      whereClause += ' AND al.created_at <= ?';
      params.push(options.end_date + ' 23:59:59');
    }
    
    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM AuditLogs al ${whereClause}
    `).bind(...params).first<{ total: number }>();
    
    const total = countResult?.total || 0;
    
    // 查詢數據
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    params.push(limit, offset);
    
    const result = await this.db.prepare(`
      SELECT 
        al.*,
        u.name as user_name
      FROM AuditLogs al
      LEFT JOIN Users u ON al.user_id = u.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params).all<any>();
    
    return {
      logs: result.results || [],
      total,
    };
  }

  /**
   * 查詢特定用戶的日誌
   */
  async findByUser(userId: number, limit: number = 50, offset: number = 0): Promise<{ logs: AuditLog[]; total: number }> {
    return await this.findAll({ user_id: userId, limit, offset });
  }
}

