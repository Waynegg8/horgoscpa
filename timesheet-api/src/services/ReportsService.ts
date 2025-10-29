/**
 * Reports Service - 報表分析服務
 * 規格來源：docs/開發指南/報表分析-完整規格.md
 * 
 * 核心功能：
 * 1. 客戶成本分析報表（含年終獎金分攤）
 * 2. 員工工時分析報表（含使用率計算）
 * 3. 薪資彙總報表（含年終獎金）
 * 4. 營收報表（含應收帳款統計）
 */

import { D1Database } from '@cloudflare/workers-types';
import { OverheadCostService } from './OverheadCostService';

export class ReportsService {
  private overheadService: OverheadCostService;

  constructor(private db: D1Database) {
    this.overheadService = new OverheadCostService(db);
  }

  /**
   * 客戶成本分析報表
   * 規格來源：L35-L401
   * 
   * @param filters - 查詢參數
   * @param include_year_end_bonus - 是否包含年終獎金分攤（預設false）
   */
  async getClientCostAnalysis(filters: {
    start_date: string;
    end_date: string;
    client_id?: string;
  }, include_year_end_bonus: boolean = false): Promise<any> {
    // 1. 查詢所有工時記錄（使用加權工時）(L170-L185)
    let timeLogsQuery = `
      SELECT 
        tl.client_id,
        c.company_name,
        tl.user_id,
        u.name as username,
        tl.work_date,
        tl.hours as actual_hours,
        tl.work_type_id,
        wt.weight_factor,
        (tl.hours * wt.weight_factor) as weighted_hours,
        tl.is_billable
      FROM TimeLogs tl
      JOIN Users u ON tl.user_id = u.user_id
      JOIN Clients c ON tl.client_id = c.client_id
      LEFT JOIN WorkTypes wt ON tl.work_type_id = wt.work_type_id
      WHERE tl.work_date >= ? AND tl.work_date <= ?
        AND tl.is_deleted = 0
    `;

    const params: any[] = [filters.start_date, filters.end_date];

    if (filters.client_id) {
      timeLogsQuery += ` AND tl.client_id = ?`;
      params.push(filters.client_id);
    }

    const timeLogsStmt = this.db.prepare(timeLogsQuery).bind(...params);
    const timeLogsResult = await timeLogsStmt.all();
    const timeLogs = timeLogsResult.results as any[];

    // 2. 按客戶分組統計
    const clientMap = new Map<string, any>();

    for (const log of timeLogs) {
      const clientId = log.client_id;

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_id: clientId,
          company_name: log.company_name,
          total_actual_hours: 0,
          total_weighted_hours: 0,
          user_breakdown: new Map()
        });
      }

      const client = clientMap.get(clientId);
      const weightFactor = log.weight_factor || 1.0;

      client.total_actual_hours += log.actual_hours;
      client.total_weighted_hours += log.weighted_hours || (log.actual_hours * weightFactor);

      // 按員工分組
      if (!client.user_breakdown.has(log.user_id)) {
        client.user_breakdown.set(log.user_id, {
          user_id: log.user_id,
          username: log.username,
          actual_hours: 0,
          weighted_hours: 0,
          client_hours: 0  // 該客戶的工時（用於年終分攤）
        });
      }

      const userStats = client.user_breakdown.get(log.user_id);
      userStats.actual_hours += log.actual_hours;
      userStats.weighted_hours += log.weighted_hours || (log.actual_hours * weightFactor);
      userStats.client_hours += log.weighted_hours || (log.actual_hours * weightFactor);
    }

    // 3. 計算每位員工的完整時薪成本率（含管理成本）(L196-L203)
    const userIds = [...new Set(timeLogs.map(log => log.user_id))];
    const userCostRates = new Map<number, any>();

    for (const userId of userIds) {
      const costRate = await this.overheadService.calculateFullHourlyCostRate(userId);
      userCostRates.set(userId, costRate);
    }

    // 4. 年終獎金分攤邏輯（優化版：批次查詢）(L247-L312)
    let yearEndBonusMap = new Map<number, any>();

    if (include_year_end_bonus) {
      // 4.1 一次性查詢所有員工的全年工時統計 (L255-L266)
      const yearStart = filters.start_date.substring(0, 4) + '-01-01';
      const yearEnd = filters.start_date.substring(0, 4) + '-12-31';

      const yearlyHoursStmt = this.db.prepare(`
        SELECT 
          tl.user_id,
          SUM(tl.hours * COALESCE(wt.weight_factor, 1.0)) as total_yearly_hours
        FROM TimeLogs tl
        LEFT JOIN WorkTypes wt ON tl.work_type_id = wt.work_type_id
        WHERE tl.work_date >= ? AND tl.work_date <= ?
          AND tl.is_deleted = 0
        GROUP BY tl.user_id
      `).bind(yearStart, yearEnd);

      const yearlyHoursResult = await yearlyHoursStmt.all();
      const yearlyHoursMap = new Map(
        yearlyHoursResult.results.map((r: any) => [r.user_id, r.total_yearly_hours])
      );

      // 4.2 一次性查詢所有年終獎金 (L269-L275)
      const year = parseInt(filters.start_date.substring(0, 4));

      const bonusStmt = this.db.prepare(`
        SELECT user_id, amount
        FROM YearEndBonus
        WHERE year = ? AND is_deleted = 0
      `).bind(year);

      const bonusResult = await bonusStmt.all();

      // 4.3 計算每位員工的年終分攤 (L277-L311)
      for (const bonus of bonusResult.results as any[]) {
        const userId = bonus.user_id;
        const bonusAmount = bonus.amount;
        const yearlyHours = yearlyHoursMap.get(userId) || 0;

        if (yearlyHours > 0) {
          yearEndBonusMap.set(userId, {
            total_bonus: bonusAmount,
            yearly_hours: yearlyHours,
            hourly_bonus_rate: bonusAmount / yearlyHours
          });
        }
      }
    }

    // 5. 查詢收費金額（發票）
    const revenueStmt = this.db.prepare(`
      SELECT 
        client_id,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM Receipts
      WHERE receipt_date >= ? AND receipt_date <= ?
        AND is_deleted = 0
      GROUP BY client_id
    `).bind(filters.start_date, filters.end_date);

    const revenueResult = await revenueStmt.all();
    const revenueMap = new Map(
      revenueResult.results.map((r: any) => [r.client_id, r.revenue])
    );

    // 6. 組裝最終報表數據
    const reportData = [];

    for (const [clientId, client] of clientMap) {
      const userBreakdown = [];
      let totalSalaryCost = 0;
      let totalOverheadCost = 0;
      let totalYearEndBonus = 0;

      for (const [userId, userStats] of client.user_breakdown) {
        const costRate = userCostRates.get(userId) || { 
          hourly_salary_cost: 0, 
          hourly_overhead_cost: 0,
          hourly_total_cost: 0
        };

        const salaryCost = userStats.weighted_hours * costRate.hourly_salary_cost;
        const overheadCost = userStats.weighted_hours * costRate.hourly_overhead_cost;
        
        // 年終獎金分攤
        let yearEndBonusAllocated = 0;
        let yearEndBonusRatio = 0;

        if (include_year_end_bonus && yearEndBonusMap.has(userId)) {
          const bonusInfo = yearEndBonusMap.get(userId);
          yearEndBonusAllocated = userStats.client_hours * bonusInfo.hourly_bonus_rate;
          yearEndBonusRatio = userStats.client_hours / bonusInfo.yearly_hours;
        }

        totalSalaryCost += salaryCost;
        totalOverheadCost += overheadCost;
        totalYearEndBonus += yearEndBonusAllocated;

        userBreakdown.push({
          user_id: userId,
          username: userStats.username,
          actual_hours: Math.round(userStats.actual_hours * 10) / 10,
          weighted_hours: Math.round(userStats.weighted_hours * 10) / 10,
          hourly_cost_rate: Math.round(costRate.hourly_total_cost),
          salary_rate: Math.round(costRate.hourly_salary_cost),
          overhead_rate: Math.round(costRate.hourly_overhead_cost),
          total_cost: Math.round(salaryCost + overheadCost + yearEndBonusAllocated),
          salary_cost: Math.round(salaryCost),
          overhead_cost: Math.round(overheadCost),
          year_end_bonus_allocated: Math.round(yearEndBonusAllocated),
          year_end_bonus_ratio: Math.round(yearEndBonusRatio * 1000) / 10  // 百分比
        });
      }

      const revenue = revenueMap.get(clientId) || 0;
      const totalCost = totalSalaryCost + totalOverheadCost + totalYearEndBonus;
      const grossProfit = revenue - totalCost;
      const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      reportData.push({
        client_id: clientId,
        company_name: client.company_name,
        total_actual_hours: Math.round(client.total_actual_hours * 10) / 10,
        total_weighted_hours: Math.round(client.total_weighted_hours * 10) / 10,
        cost_breakdown: {
          salary_cost: Math.round(totalSalaryCost),
          overhead_cost: Math.round(totalOverheadCost),
          year_end_bonus: Math.round(totalYearEndBonus),
          total_cost: Math.round(totalCost)
        },
        labor_cost: Math.round(totalCost),
        revenue: Math.round(revenue),
        gross_profit: Math.round(grossProfit),
        profit_margin: Math.round(profitMargin * 10) / 10,
        user_breakdown: userBreakdown
      });
    }

    // 7. 管理成本警告檢查 (L125-L152)
    const warnings = await this.checkOverheadWarnings(filters.start_date, filters.end_date);

    return {
      data: reportData,
      warnings
    };
  }

  /**
   * 檢查管理成本是否完整輸入
   * 規格來源：L125-L152
   */
  private async checkOverheadWarnings(startDate: string, endDate: string): Promise<any[]> {
    // TODO: 實現管理成本警告邏輯
    return [];
  }

  /**
   * 員工工時分析報表
   * 規格來源：L406-L568
   */
  async getEmployeeHoursAnalysis(filters: {
    year: number;
    month: number;
    user_id?: number;
  }): Promise<any> {
    // 1. 計算標準工時 (L541-L545)
    const standardHours = 160;  // 每月標準工時（簡化版）

    // 2. 查詢工時記錄 (L467-L484)
    let query = `
      SELECT 
        tl.user_id,
        u.name as username,
        tl.client_id,
        c.company_name,
        tl.work_date,
        tl.hours,
        tl.is_billable,
        tl.work_type_id,
        wt.weight_factor
      FROM TimeLogs tl
      JOIN Users u ON tl.user_id = u.user_id
      JOIN Clients c ON tl.client_id = c.client_id
      LEFT JOIN WorkTypes wt ON tl.work_type_id = wt.work_type_id
      WHERE strftime('%Y', tl.work_date) = ?
        AND strftime('%m', tl.work_date) = ?
        AND tl.is_deleted = 0
    `;

    const params: any[] = [
      filters.year.toString(),
      String(filters.month).padStart(2, '0')
    ];

    if (filters.user_id) {
      query += ` AND tl.user_id = ?`;
      params.push(filters.user_id);
    }

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    const timeLogs = result.results as any[];

    // 3. 按員工分組統計 (L486-L539)
    const userMap = new Map<number, any>();

    for (const log of timeLogs) {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, {
          user_id: log.user_id,
          username: log.username,
          total_hours: 0,
          billable_hours: 0,
          client_distribution: new Map(),
          daily_hours: new Map()
        });
      }

      const user = userMap.get(log.user_id);
      user.total_hours += log.hours;

      if (log.is_billable) {
        user.billable_hours += log.hours;
      }

      // 客戶分布
      if (!user.client_distribution.has(log.client_id)) {
        user.client_distribution.set(log.client_id, {
          client_id: log.client_id,
          company_name: log.company_name,
          hours: 0
        });
      }
      user.client_distribution.get(log.client_id).hours += log.hours;

      // 每日工時
      if (!user.daily_hours.has(log.work_date)) {
        user.daily_hours.set(log.work_date, 0);
      }
      user.daily_hours.set(log.work_date, user.daily_hours.get(log.work_date) + log.hours);
    }

    // 4. 組裝報表數據
    const reportData = [];

    for (const [userId, user] of userMap) {
      const utilization = (user.billable_hours / standardHours) * 100;

      const clientDistribution = Array.from(user.client_distribution.values()).map(c => ({
        ...c,
        percentage: (c.hours / user.total_hours) * 100
      }));

      const dailyTrend = Array.from(user.daily_hours.entries()).map(([date, hours]) => ({
        date,
        hours
      })).sort((a, b) => a.date.localeCompare(b.date));

      reportData.push({
        user_id: userId,
        username: user.username,
        total_hours: Math.round(user.total_hours * 10) / 10,
        billable_hours: Math.round(user.billable_hours * 10) / 10,
        utilization: Math.round(utilization * 10) / 10,
        client_distribution: clientDistribution,
        daily_trend: dailyTrend
      });
    }

    return {
      data: reportData,
      period: {
        year: filters.year,
        month: filters.month,
        standard_hours: standardHours
      }
    };
  }

  /**
   * 薪資彙總報表
   * 規格來源：L573-L678
   */
  async getPayrollSummary(filters: {
    year: number;
    month: number;
  }): Promise<any> {
    // 查詢月度薪資記錄
    const stmt = this.db.prepare(`
      SELECT 
        mp.*,
        u.name as username,
        u.email
      FROM MonthlyPayroll mp
      JOIN Users u ON mp.user_id = u.user_id
      WHERE mp.year = ? AND mp.month = ?
        AND mp.is_deleted = 0
      ORDER BY u.name
    `).bind(filters.year, filters.month);

    const result = await stmt.all();
    const payrollRecords = result.results as any[];

    // 統計總計
    const totalSalary = payrollRecords.reduce((sum, r) => sum + (r.total_salary || 0), 0);
    const totalOvertimePay = payrollRecords.reduce((sum, r) => sum + (r.overtime_pay || 0), 0);

    return {
      data: payrollRecords,
      summary: {
        total_employees: payrollRecords.length,
        total_salary: Math.round(totalSalary),
        total_overtime_pay: Math.round(totalOvertimePay),
        grand_total: Math.round(totalSalary + totalOvertimePay)
      },
      period: {
        year: filters.year,
        month: filters.month
      }
    };
  }

  /**
   * 營收報表
   * 規格來源：L683-L825
   */
  async getRevenueReport(filters: {
    start_date: string;
    end_date: string;
    group_by?: 'month' | 'client' | 'service';
  }): Promise<any> {
    const groupBy = filters.group_by || 'month';

    if (groupBy === 'month') {
      // 按月份分組
      const stmt = this.db.prepare(`
        SELECT 
          strftime('%Y-%m', receipt_date) as month,
          COUNT(*) as receipt_count,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partial') THEN total_amount ELSE 0 END), 0) as unpaid_amount
        FROM Receipts
        WHERE receipt_date >= ? AND receipt_date <= ?
          AND is_deleted = 0
        GROUP BY month
        ORDER BY month
      `).bind(filters.start_date, filters.end_date);

      const result = await stmt.all();
      return { data: result.results };
    }

    // TODO: 實現其他分組方式
    return { data: [] };
  }
}

