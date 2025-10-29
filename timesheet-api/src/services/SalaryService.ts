/**
 * Salary Service - 薪資業務邏輯層
 * 規格來源：docs/開發指南/薪資管理-完整規格.md
 */

import { D1Database } from '@cloudflare/workers-types';
import { SalaryItemTypesRepository } from '../repositories/SalaryItemTypesRepository';
import { EmployeeSalaryItemsRepository } from '../repositories/EmployeeSalaryItemsRepository';
import { MonthlyPayrollRepository } from '../repositories/MonthlyPayrollRepository';
import { YearEndBonusRepository } from '../repositories/YearEndBonusRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ValidationError } from '../types';

export class SalaryService {
  private salaryItemTypesRepo: SalaryItemTypesRepository;
  private employeeSalaryItemsRepo: EmployeeSalaryItemsRepository;
  private monthlyPayrollRepo: MonthlyPayrollRepository;
  private yearEndBonusRepo: YearEndBonusRepository;
  private userRepo: UserRepository;

  constructor(private db: D1Database) {
    this.salaryItemTypesRepo = new SalaryItemTypesRepository(db);
    this.employeeSalaryItemsRepo = new EmployeeSalaryItemsRepository(db);
    this.monthlyPayrollRepo = new MonthlyPayrollRepository(db);
    this.yearEndBonusRepo = new YearEndBonusRepository(db);
    this.userRepo = new UserRepository(db);
  }

  /**
   * 計算時薪基準（依勞基法：月薪 ÷ 240 小時）
   * 規格來源：L314-L333
   */
  calculateHourlyBase(monthlySalary: number): number {
    const MONTHLY_STANDARD_HOURS = 240;
    return monthlySalary / MONTHLY_STANDARD_HOURS;
  }

  /**
   * 計算完整時薪成本率（含經常性給與）
   * 規格來源：L445-L473
   */
  async calculateFullHourlyCostRate(userId: number, year: number, month: number): Promise<number> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new ValidationError('User not found');

    // 查詢該月有效的薪資項目（只算經常性給與）
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const salaryItemsMap = await this.employeeSalaryItemsRepo.findForMonth(userId, yearMonth);
    
    let totalFixedSalary = user.base_salary || 0;
    
    // 只累加經常性給與（is_regular_payment = 1）
    for (const [_, item] of salaryItemsMap) {
      if ((item as any).is_regular_payment) {
        totalFixedSalary += item.amount;
      }
    }

    return this.calculateHourlyBase(totalFixedSalary);
  }

  /**
   * 計算加班費
   * 規格來源：L335-L379
   */
  calculateOvertimePay(hourlyBase: number, hours: number, overtimeType: string): number {
    let multiplier: number;
    
    switch (overtimeType) {
      case 'weekday_2h':        // 平日前2小時
        multiplier = 4/3;  // 1.34倍
        break;
      case 'weekday_beyond':    // 平日第3小時起
        multiplier = 5/3;  // 1.67倍
        break;
      case 'restday_2h':        // 休息日前2小時
        multiplier = 4/3;  // 1.34倍
        break;
      case 'restday_beyond':    // 休息日第3小時起
        multiplier = 5/3;  // 1.67倍
        break;
      case 'holiday':           // 國定假日
        multiplier = 2.0;  // 2.0倍
        break;
      default:
        multiplier = 1.0;
    }
    
    return hourlyBase * hours * multiplier;
  }

  /**
   * 檢查全勤資格
   * 規格來源：L381-L426
   */
  async checkFullAttendance(userId: number, year: number, month: number): Promise<boolean> {
    // 查詢該月所有請假記錄
    const leaves = await this.db.prepare(`
      SELECT leave_type_id, hours
      FROM LeaveApplications
      WHERE user_id = ? 
        AND strftime('%Y', start_date) = ?
        AND strftime('%m', start_date) = ?
        AND is_deleted = 0
    `).bind(userId, year.toString(), String(month).padStart(2, '0')).all();
    
    for (const leave of (leaves.results || [])) {
      const leaveTypeId = (leave as any).leave_type_id;
      // 病假(2)或事假(3)會扣除全勤
      if (leaveTypeId === 2 || leaveTypeId === 3) {
        return false;
      }
      // 補休(12)、特休(1)等不影響全勤
    }
    
    return true;
  }

  /**
   * 計算月度薪資
   * 規格來源：L428-L580
   */
  async calculateMonthlyPayroll(userId: number, year: number, month: number): Promise<any> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new ValidationError('User not found');

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const salaryItemsMap = await this.employeeSalaryItemsRepo.findForMonth(userId, yearMonth);
    
    let total_allowances = 0;
    let total_bonuses = 0;
    let attendance_bonus = 0;
    
    // 分類計算薪資項目
    for (const [_, item] of salaryItemsMap) {
      const itemFull = item as any;
      if (itemFull.category === 'allowance') {
        total_allowances += item.amount;
      } else if (itemFull.category === 'bonus') {
        if (itemFull.item_code === 'ATTENDANCE_BONUS') {
          attendance_bonus = item.amount;
        } else {
          total_bonuses += item.amount;
        }
      }
    }

    // 查詢加班記錄（暫時簡化處理）
    const overtime_weekday_2h = 0;
    const overtime_weekday_beyond = 0;
    const overtime_restday_2h = 0;
    const overtime_restday_beyond = 0;
    const overtime_holiday = 0;

    // 判定全勤
    const has_full_attendance = await this.checkFullAttendance(userId, year, month);
    const final_attendance_bonus = has_full_attendance ? attendance_bonus : 0;

    // 計算總薪資
    const gross_salary = 
      (user.base_salary || 0) +
      total_allowances +
      total_bonuses +
      final_attendance_bonus +
      overtime_weekday_2h +
      overtime_weekday_beyond +
      overtime_restday_2h +
      overtime_restday_beyond +
      overtime_holiday;

    const net_salary = gross_salary - 0; // 暫無扣款

    const payrollData = {
      user_id: userId,
      year,
      month,
      base_salary: user.base_salary || 0,
      total_allowances,
      total_bonuses: total_bonuses + final_attendance_bonus,
      overtime_weekday_2h,
      overtime_weekday_beyond,
      overtime_restday_2h,
      overtime_restday_beyond,
      overtime_holiday,
      total_deductions: 0,
      total_work_hours: 0,
      total_overtime_hours: 0,
      total_weighted_hours: 0,
      has_full_attendance,
      gross_salary,
      net_salary
    };

    // 保存或更新薪資記錄
    const payroll = await this.monthlyPayrollRepo.upsert(payrollData);

    return payroll;
  }

  /**
   * 批次更新薪資項目（績效獎金月度調整）
   * 規格來源：L699-L741
   */
  async batchUpdateSalaryItems(itemCode: string, targetMonth: string, updates: Array<{user_id: number; amount: number}>): Promise<void> {
    const itemType = await this.salaryItemTypesRepo.findByCode(itemCode);
    if (!itemType) throw new ValidationError('Salary item type not found');

    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const effectiveDate = `${targetMonth}-01`;
    const expiryDate = `${targetMonth}-${lastDay}`;

    for (const update of updates) {
      await this.employeeSalaryItemsRepo.create({
        user_id: update.user_id,
        item_type_id: itemType.item_type_id,
        amount: update.amount,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        is_active: true
      });
    }
  }

  // 薪資項目類型管理
  async getSalaryItemTypes(options: any = {}) {
    return this.salaryItemTypesRepo.findAll(options);
  }

  async createSalaryItemType(data: any) {
    // 檢查唯一性
    const existing = await this.salaryItemTypesRepo.findByCode(data.item_code);
    if (existing) throw new ValidationError('Salary item code already exists');
    
    return this.salaryItemTypesRepo.create(data);
  }

  async updateSalaryItemType(id: number, data: any) {
    return this.salaryItemTypesRepo.update(id, data);
  }

  async deleteSalaryItemType(id: number) {
    return this.salaryItemTypesRepo.delete(id);
  }

  // 年終獎金管理
  async getYearEndBonuses(attributionYear: number) {
    return this.yearEndBonusRepo.findByYear(attributionYear);
  }

  async createYearEndBonus(data: any, recordedBy: number) {
    // 檢查唯一性
    const existing = await this.yearEndBonusRepo.findByUserAndYear(data.user_id, data.attribution_year);
    if (existing) throw new ValidationError('Year-end bonus already exists for this user and year');
    
    // 自動解析 payment_year 和 payment_month
    if (data.payment_date) {
      const date = new Date(data.payment_date);
      data.payment_year = date.getFullYear();
      data.payment_month = date.getMonth() + 1;
    }
    
    return this.yearEndBonusRepo.create({ ...data, recorded_by: recordedBy });
  }

  async updateYearEndBonus(id: number, data: any) {
    return this.yearEndBonusRepo.update(id, data);
  }

  async deleteYearEndBonus(id: number) {
    return this.yearEndBonusRepo.delete(id);
  }

  async getYearEndBonusSummary(attributionYear: number) {
    return this.yearEndBonusRepo.getSummary(attributionYear);
  }

  // 員工薪資設定
  async getEmployeeSalary(userId: number) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new ValidationError('User not found');

    const salaryItems = await this.employeeSalaryItemsRepo.findByUserId(userId, { is_active: true });
    
    return {
      user_id: userId,
      username: user.name,
      base_salary: user.base_salary || 0,
      salary_items: salaryItems
    };
  }

  async updateEmployeeSalary(userId: number, data: {base_salary: number; salary_items: any[]}) {
    // 更新 base_salary
    await this.userRepo.update(userId, { base_salary: data.base_salary } as any);

    // 刪除舊的薪資項目
    await this.employeeSalaryItemsRepo.deleteByUserId(userId);

    // 批次創建新的薪資項目
    const items = data.salary_items.map(item => ({
      user_id: userId,
      item_type_id: item.item_type_id,
      amount: item.amount,
      effective_date: item.effective_date || new Date().toISOString().split('T')[0],
      expiry_date: item.expiry_date || null,
      is_active: true
    }));

    await this.employeeSalaryItemsRepo.batchCreate(items);

    return this.getEmployeeSalary(userId);
  }

  // 薪資查詢
  async getPayrolls(options: any) {
    const { user_id, year, limit, offset } = options;
    return this.monthlyPayrollRepo.findByUser(user_id, { year, limit, offset });
  }

  async getPayrollById(payrollId: number) {
    return this.monthlyPayrollRepo.findById(payrollId);
  }
}


