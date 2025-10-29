/**
 * MonthlyPayroll Repository - 月度薪資資料訪問層
 * 規格來源：docs/開發指南/薪資管理-完整規格.md L188-L232
 */

import { D1Database } from '@cloudflare/workers-types';

export interface MonthlyPayroll {
  payroll_id: number;
  user_id: number;
  year: number;
  month: number;
  base_salary: number;
  total_allowances: number;
  total_bonuses: number;
  overtime_weekday_2h: number;
  overtime_weekday_beyond: number;
  overtime_restday_2h: number;
  overtime_restday_beyond: number;
  overtime_holiday: number;
  total_deductions: number;
  total_work_hours: number;
  total_overtime_hours: number;
  total_weighted_hours: number;
  has_full_attendance: boolean;
  gross_salary: number;
  net_salary: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export class MonthlyPayrollRepository {
  constructor(private db: D1Database) {}

  async findById(payrollId: number): Promise<MonthlyPayroll | null> {
    const result = await this.db.prepare(`
      SELECT * FROM MonthlyPayroll WHERE payroll_id = ?
    `).bind(payrollId).first<MonthlyPayroll>();
    return result || null;
  }

  async findByUserAndMonth(userId: number, year: number, month: number): Promise<MonthlyPayroll | null> {
    const result = await this.db.prepare(`
      SELECT * FROM MonthlyPayroll
      WHERE user_id = ? AND year = ? AND month = ?
    `).bind(userId, year, month).first<MonthlyPayroll>();
    return result || null;
  }

  async findByUser(userId: number, options: {
    year?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ payrolls: MonthlyPayroll[]; total: number }> {
    const { year, limit = 12, offset = 0 } = options;

    let sql = 'SELECT * FROM MonthlyPayroll WHERE user_id = ?';
    const params: any[] = [userId];

    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }

    sql += ' ORDER BY year DESC, month DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(sql).bind(...params).all<MonthlyPayroll>();

    // Count total
    let countSql = 'SELECT COUNT(*) as total FROM MonthlyPayroll WHERE user_id = ?';
    const countParams: any[] = [userId];
    if (year) {
      countSql += ' AND year = ?';
      countParams.push(year);
    }
    const countResult = await this.db.prepare(countSql).bind(...countParams).first<{ total: number }>();

    return {
      payrolls: result.results || [],
      total: countResult?.total || 0
    };
  }

  async create(data: Omit<MonthlyPayroll, 'payroll_id' | 'created_at' | 'updated_at'>): Promise<MonthlyPayroll> {
    const result = await this.db.prepare(`
      INSERT INTO MonthlyPayroll (
        user_id, year, month, base_salary, total_allowances, total_bonuses,
        overtime_weekday_2h, overtime_weekday_beyond, overtime_restday_2h,
        overtime_restday_beyond, overtime_holiday, total_deductions,
        total_work_hours, total_overtime_hours, total_weighted_hours,
        has_full_attendance, gross_salary, net_salary, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.user_id, data.year, data.month, data.base_salary,
      data.total_allowances, data.total_bonuses,
      data.overtime_weekday_2h, data.overtime_weekday_beyond,
      data.overtime_restday_2h, data.overtime_restday_beyond,
      data.overtime_holiday, data.total_deductions,
      data.total_work_hours, data.total_overtime_hours, data.total_weighted_hours,
      data.has_full_attendance ? 1 : 0,
      data.gross_salary, data.net_salary, data.notes || null
    ).first<MonthlyPayroll>();

    if (!result) throw new Error('Failed to create payroll');
    return result;
  }

  async update(payrollId: number, data: Partial<Omit<MonthlyPayroll, 'payroll_id' | 'user_id' | 'year' | 'month' | 'created_at' | 'updated_at'>>): Promise<MonthlyPayroll> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(payrollId);
      if (!existing) throw new Error('Payroll not found');
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(payrollId);

    const result = await this.db.prepare(`
      UPDATE MonthlyPayroll SET ${fields.join(', ')}
      WHERE payroll_id = ? RETURNING *
    `).bind(...params).first<MonthlyPayroll>();

    if (!result) throw new Error('Failed to update payroll');
    return result;
  }

  async upsert(data: Omit<MonthlyPayroll, 'payroll_id' | 'created_at' | 'updated_at'>): Promise<MonthlyPayroll> {
    const existing = await this.findByUserAndMonth(data.user_id, data.year, data.month);
    if (existing) {
      return this.update(existing.payroll_id, data);
    }
    return this.create(data);
  }
}

