/**
 * EmployeeSalaryItems Repository - 員工薪資項目資料訪問層
 * 負責所有與 EmployeeSalaryItems 表的資料庫操作
 * 規格來源：docs/開發指南/薪資管理-完整規格.md L126-L185
 */

import { D1Database } from '@cloudflare/workers-types';

export interface EmployeeSalaryItem {
  employee_item_id: number;
  user_id: number;
  item_type_id: number;
  amount: number;
  effective_date: string;  // YYYY-MM-DD
  expiry_date?: string | null;  // YYYY-MM-DD or null (永久有效)
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class EmployeeSalaryItemsRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢員工的所有薪資項目
   */
  async findByUserId(userId: number, options: {
    is_active?: boolean;
    targetMonth?: string;  // YYYY-MM format, 用於月度查詢
  } = {}): Promise<EmployeeSalaryItem[]> {
    let sql = `
      SELECT esi.*, sit.item_name, sit.item_code, sit.category, sit.is_regular_payment
      FROM EmployeeSalaryItems esi
      JOIN SalaryItemTypes sit ON esi.item_type_id = sit.item_type_id
      WHERE esi.user_id = ?
    `;
    const params: any[] = [userId];

    if (options.is_active !== undefined) {
      sql += ' AND esi.is_active = ?';
      params.push(options.is_active ? 1 : 0);
    }

    // 月度查詢：查找該月有效的薪資項目
    if (options.targetMonth) {
      const targetMonthStart = `${options.targetMonth}-01`;
      sql += ' AND esi.effective_date <= ?';
      sql += ' AND (esi.expiry_date IS NULL OR esi.expiry_date >= ?)';
      params.push(targetMonthStart, targetMonthStart);
    }

    // 排序：月份專屬優先（有expiry_date的），然後按生效日期降序
    sql += ` ORDER BY 
      CASE WHEN esi.expiry_date IS NOT NULL THEN 0 ELSE 1 END,
      esi.effective_date DESC
    `;

    const result = await this.db.prepare(sql).bind(...params).all();
    return result.results || [];
  }

  /**
   * 根據 ID 查詢薪資項目
   */
  async findById(employeeItemId: number): Promise<EmployeeSalaryItem | null> {
    const result = await this.db.prepare(`
      SELECT * FROM EmployeeSalaryItems
      WHERE employee_item_id = ?
    `).bind(employeeItemId).first<EmployeeSalaryItem>();

    return result || null;
  }

  /**
   * 創建員工薪資項目
   */
  async create(data: Omit<EmployeeSalaryItem, 'employee_item_id' | 'created_at' | 'updated_at'>): Promise<EmployeeSalaryItem> {
    const result = await this.db.prepare(`
      INSERT INTO EmployeeSalaryItems (
        user_id, item_type_id, amount, effective_date, expiry_date, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.user_id,
      data.item_type_id,
      data.amount,
      data.effective_date,
      data.expiry_date || null,
      data.notes || null,
      data.is_active ? 1 : 0
    ).first<EmployeeSalaryItem>();

    if (!result) {
      throw new Error('Failed to create employee salary item');
    }

    return result;
  }

  /**
   * 更新員工薪資項目
   */
  async update(employeeItemId: number, data: Partial<Omit<EmployeeSalaryItem, 'employee_item_id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<EmployeeSalaryItem> {
    const existing = await this.findById(employeeItemId);
    if (!existing) {
      throw new Error(`Employee salary item ${employeeItemId} not found`);
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (data.amount !== undefined) {
      fields.push('amount = ?');
      params.push(data.amount);
    }

    if (data.effective_date !== undefined) {
      fields.push('effective_date = ?');
      params.push(data.effective_date);
    }

    if (data.expiry_date !== undefined) {
      fields.push('expiry_date = ?');
      params.push(data.expiry_date || null);
    }

    if (data.notes !== undefined) {
      fields.push('notes = ?');
      params.push(data.notes || null);
    }

    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(employeeItemId);

    const result = await this.db.prepare(`
      UPDATE EmployeeSalaryItems
      SET ${fields.join(', ')}
      WHERE employee_item_id = ?
      RETURNING *
    `).bind(...params).first<EmployeeSalaryItem>();

    if (!result) {
      throw new Error('Failed to update employee salary item');
    }

    return result;
  }

  /**
   * 刪除員工薪資項目（軟刪除）
   */
  async delete(employeeItemId: number): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE EmployeeSalaryItems
      SET is_active = 0, updated_at = datetime('now')
      WHERE employee_item_id = ?
    `).bind(employeeItemId).run();

    if (!result.success) {
      throw new Error('Failed to delete employee salary item');
    }
  }

  /**
   * 批次創建員工薪資項目（用於整批更新）
   */
  async batchCreate(items: Omit<EmployeeSalaryItem, 'employee_item_id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    if (items.length === 0) return;

    // 使用事務批次插入
    const statements = items.map(item => ({
      sql: `INSERT INTO EmployeeSalaryItems (
        user_id, item_type_id, amount, effective_date, expiry_date, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        item.user_id,
        item.item_type_id,
        item.amount,
        item.effective_date,
        item.expiry_date || null,
        item.notes || null,
        item.is_active ? 1 : 0
      ]
    }));

    await this.db.batch(statements.map(s => this.db.prepare(s.sql).bind(...s.params)));
  }

  /**
   * 刪除員工的所有薪資項目（用於整批更新前清理）
   */
  async deleteByUserId(userId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE EmployeeSalaryItems
      SET is_active = 0, updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();
  }

  /**
   * 查詢員工在指定月份的薪資項目（去重，優先月份專屬）
   * 規格來源：docs/開發指南/薪資管理-完整規格.md L149-L177
   */
  async findForMonth(userId: number, yearMonth: string): Promise<Map<number, EmployeeSalaryItem>> {
    const targetMonthStart = `${yearMonth}-01`;
    
    const items = await this.findByUserId(userId, {
      is_active: true,
      targetMonth: yearMonth
    });

    // 去重：同一個 item_type_id 只取一筆（月份專屬優先）
    const uniqueItems = new Map<number, EmployeeSalaryItem>();
    for (const item of items) {
      if (!uniqueItems.has(item.item_type_id)) {
        uniqueItems.set(item.item_type_id, item);
      }
    }

    return uniqueItems;
  }
}

