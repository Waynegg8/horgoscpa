/**
 * SalaryItemTypes Repository - 薪資項目類型資料訪問層
 * 負責所有與 SalaryItemTypes 表的資料庫操作
 * 規格來源：docs/開發指南/薪資管理-完整規格.md L49-L106
 */

import { D1Database } from '@cloudflare/workers-types';

export interface SalaryItemType {
  item_type_id: number;
  item_code: string;
  item_name: string;
  category: 'allowance' | 'bonus' | 'deduction';
  is_taxable: boolean;
  is_fixed: boolean;
  is_regular_payment: boolean;  // ⭐ 是否為經常性給與（影響時薪計算）
  affects_labor_insurance: boolean;
  affects_attendance: boolean;
  calculation_formula?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export class SalaryItemTypesRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有薪資項目類型
   */
  async findAll(options: {
    is_active?: boolean;
    category?: string;
  } = {}): Promise<SalaryItemType[]> {
    let sql = 'SELECT * FROM SalaryItemTypes WHERE 1=1';
    const params: any[] = [];

    if (options.is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(options.is_active ? 1 : 0);
    }

    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    sql += ' ORDER BY display_order ASC, item_name ASC';

    const result = await this.db.prepare(sql).bind(...params).all<SalaryItemType>();
    return result.results || [];
  }

  /**
   * 根據 ID 查詢薪資項目類型
   */
  async findById(itemTypeId: number): Promise<SalaryItemType | null> {
    const result = await this.db.prepare(`
      SELECT * FROM SalaryItemTypes
      WHERE item_type_id = ?
    `).bind(itemTypeId).first<SalaryItemType>();

    return result || null;
  }

  /**
   * 根據代碼查詢薪資項目類型
   */
  async findByCode(itemCode: string): Promise<SalaryItemType | null> {
    const result = await this.db.prepare(`
      SELECT * FROM SalaryItemTypes
      WHERE item_code = ?
    `).bind(itemCode).first<SalaryItemType>();

    return result || null;
  }

  /**
   * 創建薪資項目類型
   */
  async create(data: Omit<SalaryItemType, 'item_type_id' | 'created_at'>): Promise<SalaryItemType> {
    const result = await this.db.prepare(`
      INSERT INTO SalaryItemTypes (
        item_code, item_name, category, is_taxable, is_fixed,
        is_regular_payment, affects_labor_insurance, affects_attendance,
        calculation_formula, display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.item_code,
      data.item_name,
      data.category,
      data.is_taxable ? 1 : 0,
      data.is_fixed ? 1 : 0,
      data.is_regular_payment ? 1 : 0,
      data.affects_labor_insurance ? 1 : 0,
      data.affects_attendance ? 1 : 0,
      data.calculation_formula || null,
      data.display_order,
      data.is_active ? 1 : 0
    ).first<SalaryItemType>();

    if (!result) {
      throw new Error('Failed to create salary item type');
    }

    return result;
  }

  /**
   * 更新薪資項目類型
   */
  async update(itemTypeId: number, data: Partial<Omit<SalaryItemType, 'item_type_id' | 'created_at'>>): Promise<SalaryItemType> {
    const existing = await this.findById(itemTypeId);
    if (!existing) {
      throw new Error(`Salary item type ${itemTypeId} not found`);
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (data.item_name !== undefined) {
      fields.push('item_name = ?');
      params.push(data.item_name);
    }

    if (data.category !== undefined) {
      fields.push('category = ?');
      params.push(data.category);
    }

    if (data.is_taxable !== undefined) {
      fields.push('is_taxable = ?');
      params.push(data.is_taxable ? 1 : 0);
    }

    if (data.is_fixed !== undefined) {
      fields.push('is_fixed = ?');
      params.push(data.is_fixed ? 1 : 0);
    }

    if (data.is_regular_payment !== undefined) {
      fields.push('is_regular_payment = ?');
      params.push(data.is_regular_payment ? 1 : 0);
    }

    if (data.affects_labor_insurance !== undefined) {
      fields.push('affects_labor_insurance = ?');
      params.push(data.affects_labor_insurance ? 1 : 0);
    }

    if (data.affects_attendance !== undefined) {
      fields.push('affects_attendance = ?');
      params.push(data.affects_attendance ? 1 : 0);
    }

    if (data.calculation_formula !== undefined) {
      fields.push('calculation_formula = ?');
      params.push(data.calculation_formula || null);
    }

    if (data.display_order !== undefined) {
      fields.push('display_order = ?');
      params.push(data.display_order);
    }

    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return existing;
    }

    params.push(itemTypeId);

    const result = await this.db.prepare(`
      UPDATE SalaryItemTypes
      SET ${fields.join(', ')}
      WHERE item_type_id = ?
      RETURNING *
    `).bind(...params).first<SalaryItemType>();

    if (!result) {
      throw new Error('Failed to update salary item type');
    }

    return result;
  }

  /**
   * 軟刪除薪資項目類型（設置 is_active = 0）
   */
  async delete(itemTypeId: number): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE SalaryItemTypes
      SET is_active = 0
      WHERE item_type_id = ?
    `).bind(itemTypeId).run();

    if (!result.success) {
      throw new Error('Failed to delete salary item type');
    }
  }

  /**
   * 查詢經常性給與項目（用於時薪計算）
   */
  async findRegularPaymentTypes(): Promise<SalaryItemType[]> {
    const result = await this.db.prepare(`
      SELECT * FROM SalaryItemTypes
      WHERE is_regular_payment = 1 AND is_active = 1
      ORDER BY display_order ASC
    `).all<SalaryItemType>();

    return result.results || [];
  }
}


