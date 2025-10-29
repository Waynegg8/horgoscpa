/**
 * LeaveType Repository - 假別類型資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface LeaveType {
  leave_type_id?: number;
  type_name: string;
  annual_quota?: number;
  deduct_leave: boolean;
  is_paid: boolean;
  gender_specific?: 'M' | 'F' | null;
  is_enabled: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

export class LeaveTypeRepository {
  constructor(private db: D1Database) {}

  async findAll(options: { is_enabled?: boolean } = {}): Promise<LeaveType[]> {
    let whereClause = 'WHERE is_deleted = 0';
    const params: any[] = [];
    
    if (options.is_enabled !== undefined) {
      whereClause += ' AND is_enabled = ?';
      params.push(options.is_enabled ? 1 : 0);
    }
    
    const result = await this.db.prepare(`
      SELECT * FROM LeaveTypes ${whereClause}
      ORDER BY sort_order ASC, type_name ASC
    `).bind(...params).all<LeaveType>();
    
    return result.results || [];
  }

  async findById(leaveTypeId: number): Promise<LeaveType | null> {
    return await this.db.prepare(`
      SELECT * FROM LeaveTypes WHERE leave_type_id = ? AND is_deleted = 0
    `).bind(leaveTypeId).first<LeaveType>();
  }

  async create(leaveType: Omit<LeaveType, 'leave_type_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<LeaveType> {
    await this.db.prepare(`
      INSERT INTO LeaveTypes (
        type_name, annual_quota, deduct_leave, is_paid, 
        gender_specific, is_enabled, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      leaveType.type_name,
      leaveType.annual_quota || null,
      leaveType.deduct_leave ? 1 : 0,
      leaveType.is_paid ? 1 : 0,
      leaveType.gender_specific || null,
      leaveType.is_enabled ? 1 : 0,
      leaveType.sort_order || 0
    ).run();
    
    const result = await this.db.prepare(`
      SELECT * FROM LeaveTypes WHERE type_name = ? ORDER BY leave_type_id DESC LIMIT 1
    `).bind(leaveType.type_name).first<LeaveType>();
    
    if (!result) throw new Error('創建假別類型失敗');
    return result;
  }

  async update(leaveTypeId: number, updates: Partial<LeaveType>): Promise<LeaveType> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = ['type_name', 'annual_quota', 'deduct_leave', 'is_paid', 'gender_specific', 'sort_order'];
    
    for (const field of allowedFields) {
      if (updates[field as keyof LeaveType] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof LeaveType]);
      }
    }
    
    if (fields.length === 0) throw new Error('沒有可更新的欄位');
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(leaveTypeId);
    
    await this.db.prepare(`
      UPDATE LeaveTypes SET ${fields.join(', ')} WHERE leave_type_id = ?
    `).bind(...values).run();
    
    const result = await this.findById(leaveTypeId);
    if (!result) throw new Error('假別類型不存在');
    return result;
  }

  async updateEnabled(leaveTypeId: number, isEnabled: boolean): Promise<void> {
    await this.db.prepare(`
      UPDATE LeaveTypes SET is_enabled = ?, updated_at = datetime('now')
      WHERE leave_type_id = ?
    `).bind(isEnabled ? 1 : 0, leaveTypeId).run();
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    let query = `SELECT COUNT(*) as count FROM LeaveTypes WHERE type_name = ? AND is_deleted = 0`;
    const params: any[] = [name];
    
    if (excludeId) {
      query += ' AND leave_type_id != ?';
      params.push(excludeId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }
}

