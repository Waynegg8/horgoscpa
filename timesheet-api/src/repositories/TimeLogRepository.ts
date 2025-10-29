/**
 * TimeLog Repository - 工時記錄資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface TimeLog {
  log_id?: number;
  user_id: number;
  work_date: string;
  client_id?: string;
  service_id?: number;
  work_type_id: number;
  hours: number;
  weighted_hours?: number;
  leave_type_id?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export class TimeLogRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢工時記錄
   */
  async findAll(options: {
    user_id?: number;
    start_date?: string;
    end_date?: string;
    client_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: TimeLog[]; total: number }> {
    let whereClause = 'WHERE t.is_deleted = 0';
    const params: any[] = [];
    
    if (options.user_id) {
      whereClause += ' AND t.user_id = ?';
      params.push(options.user_id);
    }
    
    if (options.start_date) {
      whereClause += ' AND t.work_date >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      whereClause += ' AND t.work_date <= ?';
      params.push(options.end_date);
    }
    
    if (options.client_id) {
      whereClause += ' AND t.client_id = ?';
      params.push(options.client_id);
    }
    
    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM TimeLogs t ${whereClause}
    `).bind(...params).first<{ total: number }>();
    
    const total = countResult?.total || 0;
    
    // 查詢數據（含關聯資料）
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);
    
    const result = await this.db.prepare(`
      SELECT 
        t.*,
        c.company_name,
        s.service_name,
        wt.type_name as work_type_name,
        lt.type_name as leave_type_name
      FROM TimeLogs t
      LEFT JOIN Clients c ON t.client_id = c.client_id
      LEFT JOIN Services s ON t.service_id = s.service_id
      LEFT JOIN WorkTypes wt ON t.work_type_id = wt.work_type_id
      LEFT JOIN LeaveTypes lt ON t.leave_type_id = lt.leave_type_id
      ${whereClause}
      ORDER BY t.work_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params).all<any>();
    
    return {
      logs: result.results || [],
      total,
    };
  }

  /**
   * 根據 ID 查詢
   */
  async findById(logId: number): Promise<TimeLog | null> {
    const result = await this.db.prepare(`
      SELECT * FROM TimeLogs
      WHERE log_id = ? AND is_deleted = 0
    `).bind(logId).first<TimeLog>();
    
    return result || null;
  }

  /**
   * 創建工時記錄
   */
  async create(log: Omit<TimeLog, 'log_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<TimeLog> {
    const result = await this.db.prepare(`
      INSERT INTO TimeLogs (
        user_id, work_date, client_id, service_id, work_type_id,
        hours, weighted_hours, leave_type_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      log.user_id,
      log.work_date,
      log.client_id || null,
      log.service_id || null,
      log.work_type_id,
      log.hours,
      log.weighted_hours || null,
      log.leave_type_id || null,
      log.notes || null
    ).first<TimeLog>();
    
    if (!result) {
      // 降級方案
      const inserted = await this.db.prepare(`
        SELECT * FROM TimeLogs
        WHERE user_id = ? AND work_date = ?
        ORDER BY log_id DESC LIMIT 1
      `).bind(log.user_id, log.work_date).first<TimeLog>();
      
      if (!inserted) throw new Error('創建工時記錄失敗');
      return inserted;
    }
    
    return result;
  }

  /**
   * 更新工時記錄
   */
  async update(logId: number, updates: Partial<TimeLog>): Promise<TimeLog> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = ['client_id', 'service_id', 'work_type_id', 'hours', 'weighted_hours', 'notes'];
    
    for (const field of allowedFields) {
      if (updates[field as keyof TimeLog] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof TimeLog]);
      }
    }
    
    if (fields.length === 0) throw new Error('沒有可更新的欄位');
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(logId);
    
    await this.db.prepare(`
      UPDATE TimeLogs SET ${fields.join(', ')} WHERE log_id = ?
    `).bind(...values).run();
    
    const result = await this.findById(logId);
    if (!result) throw new Error('工時記錄不存在');
    
    return result;
  }

  /**
   * 軟刪除
   */
  async delete(logId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE TimeLogs
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE log_id = ?
    `).bind(deletedBy, logId).run();
  }

  /**
   * 查詢指定日期的每日總工時
   */
  async getDailyTotal(userId: number, workDate: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT SUM(hours) as total
      FROM TimeLogs
      WHERE user_id = ? AND work_date = ? AND is_deleted = 0
    `).bind(userId, workDate).first<{ total: number }>();
    
    return result?.total || 0;
  }
}

