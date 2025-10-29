/**
 * Holiday Repository - 國定假日資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Holiday {
  holiday_id?: number;
  holiday_date: string;
  name: string;
  is_national_holiday: boolean;
  is_makeup_workday: boolean;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export class HolidayRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有國定假日
   */
  async findAll(options: {
    year?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ holidays: Holiday[]; total: number }> {
    let whereClause = 'WHERE is_deleted = 0';
    const params: any[] = [];
    
    if (options.year) {
      whereClause += ` AND strftime('%Y', holiday_date) = ?`;
      params.push(options.year.toString());
    }
    
    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM Holidays ${whereClause}
    `).bind(...params).first<{ total: number }>();
    
    const total = countResult?.total || 0;
    
    // 查詢數據
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    params.push(limit, offset);
    
    const result = await this.db.prepare(`
      SELECT * FROM Holidays
      ${whereClause}
      ORDER BY holiday_date ASC
      LIMIT ? OFFSET ?
    `).bind(...params).all<Holiday>();
    
    return {
      holidays: result.results || [],
      total,
    };
  }

  /**
   * 根據 ID 查詢
   */
  async findById(holidayId: number): Promise<Holiday | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Holidays
      WHERE holiday_id = ? AND is_deleted = 0
    `).bind(holidayId).first<Holiday>();
    
    return result || null;
  }

  /**
   * 根據日期查詢
   */
  async findByDate(date: string): Promise<Holiday | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Holidays
      WHERE holiday_date = ? AND is_deleted = 0
    `).bind(date).first<Holiday>();
    
    return result || null;
  }

  /**
   * 創建國定假日
   */
  async create(holiday: Omit<Holiday, 'holiday_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Holiday> {
    await this.db.prepare(`
      INSERT INTO Holidays (
        holiday_date, name, is_national_holiday, is_makeup_workday
      ) VALUES (?, ?, ?, ?)
    `).bind(
      holiday.holiday_date,
      holiday.name,
      holiday.is_national_holiday ? 1 : 0,
      holiday.is_makeup_workday ? 1 : 0
    ).run();
    
    const result = await this.findByDate(holiday.holiday_date);
    if (!result) {
      throw new Error('創建國定假日失敗');
    }
    
    return result;
  }

  /**
   * 更新國定假日
   */
  async update(holidayId: number, updates: Partial<Holiday>): Promise<Holiday> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = ['name', 'is_national_holiday', 'is_makeup_workday'];
    
    for (const field of allowedFields) {
      if (updates[field as keyof Holiday] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof Holiday]);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('沒有可更新的欄位');
    }
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(holidayId);
    
    await this.db.prepare(`
      UPDATE Holidays
      SET ${fields.join(', ')}
      WHERE holiday_id = ?
    `).bind(...values).run();
    
    const result = await this.findById(holidayId);
    if (!result) {
      throw new Error('國定假日不存在');
    }
    
    return result;
  }

  /**
   * 軟刪除
   */
  async delete(holidayId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Holidays
      SET is_deleted = 1,
          deleted_at = datetime('now'),
          deleted_by = ?
      WHERE holiday_id = ?
    `).bind(deletedBy, holidayId).run();
  }

  /**
   * 檢查日期是否已存在
   */
  async existsByDate(date: string, excludeId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM Holidays
      WHERE holiday_date = ? AND is_deleted = 0
    `;
    const params: any[] = [date];
    
    if (excludeId) {
      query += ' AND holiday_id != ?';
      params.push(excludeId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }
}

