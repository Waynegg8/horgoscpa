/**
 * CompensatoryLeave Repository - 補休資料訪問層
 */

import { D1Database } from '@cloudflare/workers-types';

export interface CompensatoryLeave {
  compe_leave_id?: number;
  user_id: number;
  hours_earned: number;
  hours_remaining: number;
  earned_date: string;
  expiry_date: string;
  source_timelog_id?: number;
  source_work_type?: string;
  original_rate?: number;
  status: 'active' | 'expired' | 'used' | 'converted';
  converted_to_payment?: boolean;
  conversion_date?: string;
  conversion_rate?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export class CompensatoryLeaveRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢用戶的補休餘額（僅 active 狀態）
   */
  async findActiveByUser(userId: number): Promise<CompensatoryLeave[]> {
    const result = await this.db.prepare(`
      SELECT * FROM CompensatoryLeave
      WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
      ORDER BY earned_date ASC  -- ⭐ FIFO：最早的先使用
    `).bind(userId).all<CompensatoryLeave>();
    
    return result.results || [];
  }

  /**
   * 創建補休記錄
   */
  async create(leave: Omit<CompensatoryLeave, 'compe_leave_id' | 'created_at' | 'updated_at'>): Promise<CompensatoryLeave> {
    await this.db.prepare(`
      INSERT INTO CompensatoryLeave (
        user_id, hours_earned, hours_remaining, earned_date, expiry_date,
        source_timelog_id, source_work_type, original_rate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      leave.user_id,
      leave.hours_earned,
      leave.hours_remaining,
      leave.earned_date,
      leave.expiry_date,
      leave.source_timelog_id || null,
      leave.source_work_type || null,
      leave.original_rate || null,
      leave.status || 'active'
    ).run();
    
    const result = await this.db.prepare(`
      SELECT * FROM CompensatoryLeave
      WHERE user_id = ? AND earned_date = ?
      ORDER BY compe_leave_id DESC LIMIT 1
    `).bind(leave.user_id, leave.earned_date).first<CompensatoryLeave>();
    
    if (!result) throw new Error('創建補休記錄失敗');
    return result;
  }

  /**
   * 更新補休餘額
   */
  async updateRemaining(compeLeaveId: number, hoursRemaining: number): Promise<void> {
    await this.db.prepare(`
      UPDATE CompensatoryLeave
      SET hours_remaining = ?,
          status = CASE WHEN ? = 0 THEN 'used' ELSE status END,
          updated_at = datetime('now')
      WHERE compe_leave_id = ?
    `).bind(hoursRemaining, hoursRemaining, compeLeaveId).run();
  }

  /**
   * 標記為已轉換
   */
  async markAsConverted(compeLeaveId: number, rate: number): Promise<void> {
    await this.db.prepare(`
      UPDATE CompensatoryLeave
      SET status = 'converted',
          converted_to_payment = 1,
          conversion_date = datetime('now'),
          conversion_rate = ?,
          updated_at = datetime('now')
      WHERE compe_leave_id = ?
    `).bind(rate, compeLeaveId).run();
  }

  /**
   * 查詢即將到期的補休（7天內）
   */
  async findExpiringSoon(userId: number, days: number = 7): Promise<CompensatoryLeave[]> {
    const result = await this.db.prepare(`
      SELECT * FROM CompensatoryLeave
      WHERE user_id = ? 
        AND status = 'active' 
        AND hours_remaining > 0
        AND expiry_date <= date('now', '+${days} days')
      ORDER BY expiry_date ASC
    `).bind(userId).all<CompensatoryLeave>();
    
    return result.results || [];
  }

  /**
   * 查詢已到期的補休（用於 Cron Job）
   */
  async findExpired(beforeDate: string): Promise<CompensatoryLeave[]> {
    const result = await this.db.prepare(`
      SELECT * FROM CompensatoryLeave
      WHERE status = 'active' 
        AND hours_remaining > 0
        AND expiry_date < ?
      ORDER BY user_id, earned_date ASC
    `).bind(beforeDate).all<CompensatoryLeave>();
    
    return result.results || [];
  }

  /**
   * 記錄補休使用
   */
  async recordUsage(usage: {
    compe_leave_id: number;
    leave_application_id?: number;
    timelog_id?: number;
    hours_used: number;
    used_date: string;
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO CompensatoryLeaveUsage (
        compe_leave_id, leave_application_id, timelog_id, hours_used, used_date
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      usage.compe_leave_id,
      usage.leave_application_id || null,
      usage.timelog_id || null,
      usage.hours_used,
      usage.used_date
    ).run();
  }
}

