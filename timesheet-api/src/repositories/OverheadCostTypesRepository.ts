/**
 * OverheadCostTypesRepository - 管理成本項目類型數據訪問層
 * 規格來源：docs/開發指南/管理成本-完整規格.md L29-L63
 */

export interface OverheadCostType {
  cost_type_id: number;
  cost_code: string;
  cost_name: string;
  category: 'fixed' | 'variable';
  allocation_method: 'per_employee' | 'per_hour' | 'per_revenue';
  description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface OverheadCostTypeFilters {
  is_active?: boolean;
  category?: 'fixed' | 'variable';
}

export class OverheadCostTypesRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有成本項目類型（支持過濾）
   */
  async findAll(filters?: OverheadCostTypeFilters): Promise<OverheadCostType[]> {
    let query = `
      SELECT * FROM OverheadCostTypes
      WHERE 1=1
    `;
    const bindings: any[] = [];

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = ?`;
      bindings.push(filters.is_active ? 1 : 0);
    }

    if (filters?.category) {
      query += ` AND category = ?`;
      bindings.push(filters.category);
    }

    query += ` ORDER BY display_order ASC, cost_type_id ASC`;

    const { results } = await this.db.prepare(query).bind(...bindings).all();
    return results as OverheadCostType[];
  }

  /**
   * 根據 ID 查詢單個成本項目類型
   */
  async findById(cost_type_id: number): Promise<OverheadCostType | null> {
    const result = await this.db
      .prepare(`SELECT * FROM OverheadCostTypes WHERE cost_type_id = ?`)
      .bind(cost_type_id)
      .first();
    
    return result as OverheadCostType | null;
  }

  /**
   * 根據 cost_code 查詢（用於唯一性檢查）
   */
  async findByCode(cost_code: string): Promise<OverheadCostType | null> {
    const result = await this.db
      .prepare(`SELECT * FROM OverheadCostTypes WHERE cost_code = ?`)
      .bind(cost_code)
      .first();
    
    return result as OverheadCostType | null;
  }

  /**
   * 創建成本項目類型
   */
  async create(data: {
    cost_code: string;
    cost_name: string;
    category: 'fixed' | 'variable';
    allocation_method: 'per_employee' | 'per_hour' | 'per_revenue';
    description?: string;
    display_order?: number;
  }): Promise<OverheadCostType> {
    const result = await this.db
      .prepare(`
        INSERT INTO OverheadCostTypes (
          cost_code, cost_name, category, allocation_method,
          description, display_order
        ) VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(
        data.cost_code,
        data.cost_name,
        data.category,
        data.allocation_method,
        data.description || null,
        data.display_order || 0
      )
      .first();

    return result as OverheadCostType;
  }

  /**
   * 更新成本項目類型
   */
  async update(cost_type_id: number, data: Partial<OverheadCostType>): Promise<OverheadCostType> {
    const updates: string[] = [];
    const bindings: any[] = [];

    if (data.cost_name !== undefined) {
      updates.push('cost_name = ?');
      bindings.push(data.cost_name);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      bindings.push(data.category);
    }
    if (data.allocation_method !== undefined) {
      updates.push('allocation_method = ?');
      bindings.push(data.allocation_method);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      bindings.push(data.description);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      bindings.push(data.is_active ? 1 : 0);
    }
    if (data.display_order !== undefined) {
      updates.push('display_order = ?');
      bindings.push(data.display_order);
    }

    updates.push("updated_at = datetime('now')");
    bindings.push(cost_type_id);

    const result = await this.db
      .prepare(`
        UPDATE OverheadCostTypes
        SET ${updates.join(', ')}
        WHERE cost_type_id = ?
        RETURNING *
      `)
      .bind(...bindings)
      .first();

    return result as OverheadCostType;
  }

  /**
   * 刪除成本項目類型（軟刪除 - 設為 is_active = 0）
   */
  async delete(cost_type_id: number): Promise<void> {
    await this.db
      .prepare(`
        UPDATE OverheadCostTypes
        SET is_active = 0, updated_at = datetime('now')
        WHERE cost_type_id = ?
      `)
      .bind(cost_type_id)
      .run();
  }
}

