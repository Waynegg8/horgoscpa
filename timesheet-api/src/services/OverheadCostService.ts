/**
 * OverheadCostService - 管理成本業務邏輯層
 * 規格來源：docs/開發指南/管理成本-完整規格.md
 * 
 * 核心功能：
 * 1. 成本項目管理
 * 2. 月度成本記錄
 * 3. 三種分攤方式計算（per_employee/per_hour/per_revenue）
 * 4. 成本分析報表
 */

import { OverheadCostTypesRepository } from '../repositories/OverheadCostTypesRepository';
import { MonthlyOverheadCostsRepository } from '../repositories/MonthlyOverheadCostsRepository';

export class OverheadCostService {
  private costTypesRepo: OverheadCostTypesRepository;
  private monthlyCostsRepo: MonthlyOverheadCostsRepository;

  constructor(private db: D1Database) {
    this.costTypesRepo = new OverheadCostTypesRepository(db);
    this.monthlyCostsRepo = new MonthlyOverheadCostsRepository(db);
  }

  // ==================== 成本項目類型管理 ====================

  /**
   * 查詢所有成本項目類型
   */
  async getCostTypes(filters?: { is_active?: boolean; category?: string }) {
    return await this.costTypesRepo.findAll(filters as any);
  }

  /**
   * 查詢單個成本項目類型
   */
  async getCostTypeById(cost_type_id: number) {
    const costType = await this.costTypesRepo.findById(cost_type_id);
    if (!costType) {
      throw new Error('Cost type not found');
    }
    return costType;
  }

  /**
   * 創建成本項目類型
   */
  async createCostType(data: {
    cost_code: string;
    cost_name: string;
    category: 'fixed' | 'variable';
    allocation_method: 'per_employee' | 'per_hour' | 'per_revenue';
    description?: string;
    display_order?: number;
  }) {
    // 檢查 cost_code 唯一性
    const existing = await this.costTypesRepo.findByCode(data.cost_code);
    if (existing) {
      throw new Error(`Cost code "${data.cost_code}" already exists`);
    }

    return await this.costTypesRepo.create(data);
  }

  /**
   * 更新成本項目類型
   */
  async updateCostType(cost_type_id: number, data: any) {
    await this.getCostTypeById(cost_type_id); // 檢查是否存在
    return await this.costTypesRepo.update(cost_type_id, data);
  }

  /**
   * 刪除成本項目類型（軟刪除）
   */
  async deleteCostType(cost_type_id: number) {
    await this.getCostTypeById(cost_type_id); // 檢查是否存在
    await this.costTypesRepo.delete(cost_type_id);
  }

  // ==================== 月度成本記錄管理 ====================

  /**
   * 查詢月度成本列表
   */
  async getMonthlyCosts(filters?: { year?: number; month?: number; cost_type_id?: number }) {
    return await this.monthlyCostsRepo.findAll(filters);
  }

  /**
   * 查詢單筆月度成本
   */
  async getMonthlyCostById(overhead_id: number) {
    const cost = await this.monthlyCostsRepo.findById(overhead_id);
    if (!cost) {
      throw new Error('Monthly overhead cost not found');
    }
    return cost;
  }

  /**
   * 創建月度成本記錄
   */
  async createMonthlyCost(data: {
    cost_type_id: number;
    year: number;
    month: number;
    amount: number;
    notes?: string;
    recorded_by: number;
  }) {
    // 檢查成本項目是否存在
    await this.getCostTypeById(data.cost_type_id);

    // 檢查該月該成本項目是否已存在
    const existing = await this.monthlyCostsRepo.findByTypeAndMonth(
      data.cost_type_id,
      data.year,
      data.month
    );
    if (existing) {
      throw new Error(`Cost record for this type and month already exists`);
    }

    return await this.monthlyCostsRepo.create(data);
  }

  /**
   * 更新月度成本記錄
   */
  async updateMonthlyCost(overhead_id: number, data: { amount?: number; notes?: string }) {
    await this.getMonthlyCostById(overhead_id); // 檢查是否存在
    return await this.monthlyCostsRepo.update(overhead_id, data);
  }

  /**
   * 刪除月度成本記錄（軟刪除）
   */
  async deleteMonthlyCost(overhead_id: number) {
    await this.getMonthlyCostById(overhead_id); // 檢查是否存在
    await this.monthlyCostsRepo.delete(overhead_id);
  }

  // ==================== 成本分攤計算 [規格:L100-L175] ====================

  /**
   * 按人頭分攤（per_employee）[規格:L102-L124]
   * 適用成本：租金、水電、網路等固定成本
   */
  calculatePerEmployeeOverhead(totalOverhead: number, employeeCount: number): number {
    if (employeeCount === 0) return 0;
    return totalOverhead / employeeCount;
  }

  /**
   * 按工時分攤（per_hour）[規格:L126-L148]
   * 適用成本：維護費用等變動成本
   */
  calculatePerHourOverhead(totalOverhead: number, totalWorkHours: number): number {
    if (totalWorkHours === 0) return 0;
    return totalOverhead / totalWorkHours;
  }

  /**
   * 按營收分攤（per_revenue）[規格:L150-L175]
   * 適用成本：行銷費用等
   */
  calculatePerRevenueOverhead(totalOverhead: number, totalRevenue: number): number {
    if (totalRevenue === 0) return 0;
    return totalOverhead / totalRevenue;
  }

  /**
   * 計算員工的完整時薪成本率（含管理成本）[規格:L177-L276]
   * 整合薪資成本 + 管理成本分攤
   */
  async calculateFullHourlyCostRate(
    user_id: number,
    year: number,
    month: number
  ): Promise<number> {
    const MONTHLY_STANDARD_HOURS = 240;

    // 1. 取得員工基本資料
    const user = await this.db
      .prepare(`SELECT * FROM Users WHERE user_id = ?`)
      .bind(user_id)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // 2. 查詢員工所有薪資項目（只算經常性給與）
    const salaryItemsResult = await this.db
      .prepare(`
        SELECT sit.*, esi.amount
        FROM EmployeeSalaryItems esi
        JOIN SalaryItemTypes sit ON esi.item_type_id = sit.item_type_id
        WHERE esi.user_id = ?
          AND esi.is_active = 1
          AND sit.is_regular_payment = 1
          AND (esi.expiry_date IS NULL OR esi.expiry_date >= date('now'))
      `)
      .bind(user_id)
      .all();

    // 計算固定薪資總和
    const totalFixedSalary = 
      ((user as any).base_salary || 0) + 
      (salaryItemsResult.results || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

    // 3. 查詢當月管理成本（按人頭分攤的部分）
    const employeeCountResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM Users WHERE is_deleted = 0`)
      .first();
    const employeeCount = (employeeCountResult as any)?.count || 1;

    const perEmployeeOverheadResult = await this.db
      .prepare(`
        SELECT COALESCE(SUM(moc.amount), 0) as total
        FROM MonthlyOverheadCosts moc
        JOIN OverheadCostTypes oct ON moc.cost_type_id = oct.cost_type_id
        WHERE moc.year = ?
          AND moc.month = ?
          AND oct.allocation_method = 'per_employee'
          AND moc.is_deleted = 0
      `)
      .bind(year, month)
      .first();

    const overheadPerEmployee = 
      ((perEmployeeOverheadResult as any)?.total || 0) / employeeCount;

    // 4. 計算時薪成本率
    const monthlyCost = totalFixedSalary + overheadPerEmployee;
    const hourlyCostRate = monthlyCost / MONTHLY_STANDARD_HOURS;

    return hourlyCostRate;
  }

  // ==================== 成本分析報表 [規格:L350-L397] ====================

  /**
   * 管理成本分析報表
   */
  async getOverheadAnalysis(year: number, month: number) {
    // 取得成本明細
    const breakdown = await this.monthlyCostsRepo.getMonthlyBreakdown(year, month);

    // 取得員工數
    const employeeCountResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM Users WHERE is_deleted = 0`)
      .first();
    const employeeCount = (employeeCountResult as any)?.count || 0;

    // 計算每人分攤
    const overhead_per_employee = 
      employeeCount > 0 ? breakdown.total / employeeCount : 0;

    // TODO: 計算對時薪成本率的影響（需要整合薪資數據）
    const cost_rate_impact = {
      average_hourly_cost_without_overhead: 0,
      average_hourly_cost_with_overhead: 0,
      overhead_impact_percentage: 0
    };

    return {
      year,
      month,
      total_overhead: breakdown.total,
      employee_count: employeeCount,
      overhead_per_employee,
      breakdown_by_category: breakdown.by_category,
      breakdown_by_type: breakdown.by_type,
      cost_rate_impact
    };
  }

  /**
   * 管理成本彙總
   */
  async getOverheadSummary(year: number, start_month = 1, end_month = 12) {
    const monthlyData = [];

    for (let month = start_month; month <= end_month; month++) {
      const breakdown = await this.monthlyCostsRepo.getMonthlyBreakdown(year, month);
      monthlyData.push({
        year,
        month,
        total: breakdown.total,
        fixed: breakdown.by_category.fixed,
        variable: breakdown.by_category.variable
      });
    }

    const yearTotal = monthlyData.reduce((sum, m) => sum + m.total, 0);
    const yearAverage = monthlyData.length > 0 ? yearTotal / monthlyData.length : 0;

    return {
      year,
      monthly_data: monthlyData,
      year_total: yearTotal,
      year_average: yearAverage
    };
  }
}

