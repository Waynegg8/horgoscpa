/**
 * YearEndBonus Repository - 年終獎金資料訪問層
 * 規格來源：docs/開發指南/薪資管理-完整規格.md L258-L306
 */

import { D1Database } from '@cloudflare/workers-types';

export interface YearEndBonus {
  bonus_id: number;
  user_id: number;
  attribution_year: number;
  amount: number;
  payment_year?: number | null;
  payment_month?: number | null;
  payment_date?: string | null;
  decision_date?: string | null;
  notes?: string | null;
  recorded_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export class YearEndBonusRepository {
  constructor(private db: D1Database) {}

  async findById(bonusId: number): Promise<YearEndBonus | null> {
    const result = await this.db.prepare(`
      SELECT * FROM YearEndBonus
      WHERE bonus_id = ? AND is_deleted = 0
    `).bind(bonusId).first<YearEndBonus>();
    return result || null;
  }

  async findByUserAndYear(userId: number, attributionYear: number): Promise<YearEndBonus | null> {
    const result = await this.db.prepare(`
      SELECT * FROM YearEndBonus
      WHERE user_id = ? AND attribution_year = ? AND is_deleted = 0
    `).bind(userId, attributionYear).first<YearEndBonus>();
    return result || null;
  }

  async findByYear(attributionYear: number): Promise<YearEndBonus[]> {
    const result = await this.db.prepare(`
      SELECT yeb.*, u.name as username
      FROM YearEndBonus yeb
      JOIN Users u ON yeb.user_id = u.user_id
      WHERE yeb.attribution_year = ? AND yeb.is_deleted = 0
      ORDER BY yeb.amount DESC
    `).bind(attributionYear).all();
    return result.results || [];
  }

  async create(data: Omit<YearEndBonus, 'bonus_id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<YearEndBonus> {
    const result = await this.db.prepare(`
      INSERT INTO YearEndBonus (
        user_id, attribution_year, amount, payment_year, payment_month,
        payment_date, decision_date, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.user_id, data.attribution_year, data.amount,
      data.payment_year || null, data.payment_month || null,
      data.payment_date || null, data.decision_date || null,
      data.notes || null, data.recorded_by
    ).first<YearEndBonus>();

    if (!result) throw new Error('Failed to create year-end bonus');
    return result;
  }

  async update(bonusId: number, data: Partial<Omit<YearEndBonus, 'bonus_id' | 'user_id' | 'attribution_year' | 'created_at' | 'updated_at' | 'is_deleted'>>): Promise<YearEndBonus> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value ?? null);
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(bonusId);
      if (!existing) throw new Error('Year-end bonus not found');
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(bonusId);

    const result = await this.db.prepare(`
      UPDATE YearEndBonus SET ${fields.join(', ')}
      WHERE bonus_id = ? AND is_deleted = 0 RETURNING *
    `).bind(...params).first<YearEndBonus>();

    if (!result) throw new Error('Failed to update year-end bonus');
    return result;
  }

  async delete(bonusId: number): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE YearEndBonus
      SET is_deleted = 1, updated_at = datetime('now')
      WHERE bonus_id = ?
    `).bind(bonusId).run();

    if (!result.success) throw new Error('Failed to delete year-end bonus');
  }

  async getSummary(attributionYear: number): Promise<{
    total_amount: number;
    employee_count: number;
    average_bonus: number;
    details: any[];
  }> {
    const bonuses = await this.findByYear(attributionYear);
    
    const total_amount = bonuses.reduce((sum, b) => sum + b.amount, 0);
    const employee_count = bonuses.length;
    const average_bonus = employee_count > 0 ? total_amount / employee_count : 0;

    return {
      total_amount,
      employee_count,
      average_bonus,
      details: bonuses
    };
  }
}


