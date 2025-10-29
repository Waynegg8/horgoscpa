/**
 * MonthlyOverheadCostsRepository - 月度管理成本數據訪問層
 * 規格來源：docs/開發指南/管理成本-完整規格.md L65-L96
 */

export interface MonthlyOverheadCost {
  overhead_id: number;
  cost_type_id: number;
  year: number;
  month: number;
  amount: number;
  notes?: string;
  recorded_by: number;
  recorded_at: string;
  updated_at: string;
  is_deleted: boolean;
  // JOIN fields
  cost_name?: string;
  cost_code?: string;
  category?: string;
  allocation_method?: string;
}

export interface MonthlyOverheadCostFilters {
  year?: number;
  month?: number;
  cost_type_id?: number;
}

export class MonthlyOverheadCostsRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢月度成本列表（含成本項目信息）
   */
  async findAll(filters?: MonthlyOverheadCostFilters): Promise<MonthlyOverheadCost[]> {
    let query = `
      SELECT 
        moc.*,
        oct.cost_name,
        oct.cost_code,
        oct.category,
        oct.allocation_method
      FROM MonthlyOverheadCosts moc
      JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
      WHERE moc.is_deleted = 0
    `;
    const bindings: any[] = [];

    if (filters?.year) {
      query += ` AND moc.year = ?`;
      bindings.push(filters.year);
    }

    if (filters?.month) {
      query += ` AND moc.month = ?`;
      bindings.push(filters.month);
    }

    if (filters?.cost_type_id) {
      query += ` AND moc.cost_type_id = ?`;
      bindings.push(filters.cost_type_id);
    }

    query += ` ORDER BY moc.year DESC, moc.month DESC, oct.display_order ASC`;

    const { results } = await this.db.prepare(query).bind(...bindings).all();
    return results as MonthlyOverheadCost[];
  }

  /**
   * 根據 ID 查詢單筆月度成本
   */
  async findById(overhead_id: number): Promise<MonthlyOverheadCost | null> {
    const result = await this.db
      .prepare(`
        SELECT 
          moc.*,
          oct.cost_name,
          oct.cost_code,
          oct.category,
          oct.allocation_method
        FROM MonthlyOverheadCosts moc
        JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
        WHERE moc.overhead_id = ? AND moc.is_deleted = 0
      `)
      .bind(overhead_id)
      .first();
    
    return result as MonthlyOverheadCost | null;
  }

  /**
   * 檢查特定月份的成本項目是否已存在（用於唯一性檢查）
   */
  async findByTypeAndMonth(
    cost_type_id: number,
    year: number,
    month: number
  ): Promise<MonthlyOverheadCost | null> {
    const result = await this.db
      .prepare(`
        SELECT * FROM MonthlyOverheadCosts
        WHERE cost_type_id = ?
          AND year = ?
          AND month = ?
          AND is_deleted = 0
      `)
      .bind(cost_type_id, year, month)
      .first();
    
    return result as MonthlyOverheadCost | null;
  }

  /**
   * 創建月度成本記錄
   */
  async create(data: {
    cost_type_id: number;
    year: number;
    month: number;
    amount: number;
    notes?: string;
    recorded_by: number;
  }): Promise<MonthlyOverheadCost> {
    const result = await this.db
      .prepare(`
        INSERT INTO MonthlyOverheadCosts (
          cost_type_id, year, month, amount, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(
        data.cost_type_id,
        data.year,
        data.month,
        data.amount,
        data.notes || null,
        data.recorded_by
      )
      .first();

    return result as MonthlyOverheadCost;
  }

  /**
   * 更新月度成本記錄
   */
  async update(overhead_id: number, data: Partial<MonthlyOverheadCost>): Promise<MonthlyOverheadCost> {
    const updates: string[] = [];
    const bindings: any[] = [];

    if (data.amount !== undefined) {
      updates.push('amount = ?');
      bindings.push(data.amount);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      bindings.push(data.notes);
    }

    updates.push("updated_at = datetime('now')");
    bindings.push(overhead_id);

    const result = await this.db
      .prepare(`
        UPDATE MonthlyOverheadCosts
        SET ${updates.join(', ')}
        WHERE overhead_id = ?
        RETURNING *
      `)
      .bind(...bindings)
      .first();

    return result as MonthlyOverheadCost;
  }

  /**
   * 刪除月度成本記錄（軟刪除）
   */
  async delete(overhead_id: number): Promise<void> {
    await this.db
      .prepare(`
        UPDATE MonthlyOverheadCosts
        SET is_deleted = 1, updated_at = datetime('now')
        WHERE overhead_id = ?
      `)
      .bind(overhead_id)
      .run();
  }

  /**
   * 查詢特定月份的總成本（按分攤方式分組）
   * 用於成本分析報表
   */
  async getTotalByAllocationMethod(
    year: number,
    month: number,
    allocation_method: string
  ): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COALESCE(SUM(moc.amount), 0) as total
        FROM MonthlyOverheadCosts moc
        JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
        WHERE moc.year = ?
          AND moc.month = ?
          AND oct.allocation_method = ?
          AND moc.is_deleted = 0
      `)
      .bind(year, month, allocation_method)
      .first();
    
    return (result as any)?.total || 0;
  }

  /**
   * 查詢特定月份的成本明細（含分類統計）
   */
  async getMonthlyBreakdown(year: number, month: number): Promise<{
    total: number;
    by_category: { fixed: number; variable: number };
    by_type: Array<{
      cost_type_id: number;
      cost_name: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    // 查詢總成本
    const totalResult = await this.db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM MonthlyOverheadCosts
        WHERE year = ? AND month = ? AND is_deleted = 0
      `)
      .bind(year, month)
      .first();
    
    const total = (totalResult as any)?.total || 0;

    // 按類別統計
    const categoryResults = await this.db
      .prepare(`
        SELECT 
          oct.category,
          COALESCE(SUM(moc.amount), 0) as total
        FROM MonthlyOverheadCosts moc
        JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
        WHERE moc.year = ? AND moc.month = ? AND moc.is_deleted = 0
        GROUP BY oct.category
      `)
      .bind(year, month)
      .all();

    const by_category = {
      fixed: 0,
      variable: 0
    };

    (categoryResults.results as any[]).forEach(row => {
      if (row.category === 'fixed') by_category.fixed = row.total;
      if (row.category === 'variable') by_category.variable = row.total;
    });

    // 按類型統計
    const typeResults = await this.db
      .prepare(`
        SELECT 
          moc.cost_type_id,
          oct.cost_name,
          moc.amount
        FROM MonthlyOverheadCosts moc
        JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
        WHERE moc.year = ? AND moc.month = ? AND moc.is_deleted = 0
        ORDER BY moc.amount DESC
      `)
      .bind(year, month)
      .all();

    const by_type = (typeResults.results as any[]).map(row => ({
      cost_type_id: row.cost_type_id,
      cost_name: row.cost_name,
      amount: row.amount,
      percentage: total > 0 ? (row.amount / total * 100) : 0
    }));

    return {
      total,
      by_category,
      by_type
    };
  }
}

