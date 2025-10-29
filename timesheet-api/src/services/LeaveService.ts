/**
 * Leave Service - 假期管理服務
 * 核心功能：請假申請、假期餘額計算、生活事件登記、性別限制驗證
 */

import { D1Database } from '@cloudflare/workers-types';
import { ValidationError, ConflictError, NotFoundError, User, AppError } from '../types';
import { validateRequired, validateDateFormat } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class LeaveService {
  constructor(private db: D1Database) {}

  /**
   * 申請假期（含性別驗證、餘額檢查、重疊檢查）
   */
  async applyLeave(data: {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    hours?: number;
    reason?: string;
  }, user: User): Promise<any> {
    validateRequired(data.leave_type_id, '假別');
    validateRequired(data.start_date, '開始日期');
    validateRequired(data.end_date, '結束日期');
    validateRequired(data.days, '天數');
    validateDateFormat(data.start_date, '開始日期');
    validateDateFormat(data.end_date, '結束日期');

    // 0. ⭐ 驗證性別限制
    await this.validateGenderRestriction(user, data.leave_type_id);

    // 1. 驗證日期
    if (data.end_date < data.start_date) {
      throw new ValidationError('結束日期不能早於開始日期', 'end_date');
    }

    // 2. 檢查重疊
    const overlap = await this.checkOverlap(user.user_id, data.start_date, data.end_date);
    if (overlap) {
      throw new AppError(422, 'LEAVE_OVERLAP', '與現有假期重疊');
    }

    // 3. ⭐ 生理假特殊處理：判斷是否併入病假
    let countsAsSickLeave = false;
    if (data.leave_type_id === 8) {  // 生理假
      const currentYear = new Date(data.start_date).getFullYear();
      const menstrualUsed = await this.db.prepare(`
        SELECT COALESCE(SUM(days), 0) as total
        FROM LeaveApplications
        WHERE user_id = ? AND leave_type_id = 8 
          AND strftime('%Y', start_date) = ? AND is_deleted = 0
      `).bind(user.user_id, currentYear.toString()).first<{ total: number }>();
      
      const totalMenstrualDays = (menstrualUsed?.total || 0) + data.days;
      if (totalMenstrualDays > 3) {
        countsAsSickLeave = true;
      }
    }

    // 4. 創建申請
    await this.db.prepare(`
      INSERT INTO LeaveApplications (
        user_id, leave_type_id, start_date, end_date, days, hours, reason, counts_as_sick_leave
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.user_id, data.leave_type_id, data.start_date, data.end_date,
      data.days, data.hours || null, data.reason || null, countsAsSickLeave ? 1 : 0
    ).run();

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'CREATE',
      table_name: 'LeaveApplications',
      changes: JSON.stringify(data),
    });

    return { message: '假期申請成功' };
  }

  /**
   * ⭐ 驗證性別限制
   */
  private async validateGenderRestriction(user: User, leaveTypeId: number): Promise<void> {
    const leaveType = await this.db.prepare(`
      SELECT gender_specific, type_name FROM LeaveTypes WHERE leave_type_id = ?
    `).bind(leaveTypeId).first<any>();

    if (!leaveType) throw new NotFoundError('假別不存在');

    if (leaveType.gender_specific) {
      if (leaveType.gender_specific === 'F' && user.gender !== 'F') {
        throw new AppError(422, 'GENDER_RESTRICTION_VIOLATED', `${leaveType.type_name}僅限女性員工申請`);
      }
      if (leaveType.gender_specific === 'M' && user.gender !== 'M') {
        throw new AppError(422, 'GENDER_RESTRICTION_VIOLATED', `${leaveType.type_name}僅限男性員工申請`);
      }
    }
  }

  /**
   * 檢查假期重疊
   */
  private async checkOverlap(userId: number, startDate: string, endDate: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM LeaveApplications
      WHERE user_id = ? AND is_deleted = 0
        AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
    `).bind(userId, startDate, startDate, endDate, endDate).first<{ count: number }>();
    
    return (result?.count || 0) > 0;
  }

  /**
   * 查詢假期記錄
   */
  async getLeaveApplications(filters: any, user: User): Promise<any> {
    const options = { ...filters };
    if (!user.is_admin) {
      options.user_id = user.user_id;
    }
    
    const result = await this.db.prepare(`
      SELECT la.*, lt.type_name, u.name as user_name
      FROM LeaveApplications la
      JOIN LeaveTypes lt ON la.leave_type_id = lt.leave_type_id
      JOIN Users u ON la.user_id = u.user_id
      WHERE la.is_deleted = 0
        ${options.user_id ? 'AND la.user_id = ?' : ''}
      ORDER BY la.start_date DESC
      LIMIT ? OFFSET ?
    `).bind(
      ...(options.user_id ? [options.user_id] : []),
      options.limit || 50,
      options.offset || 0
    ).all();
    
    return result.results || [];
  }

  /**
   * ⭐ 查詢可申請的假別（依性別過濾）
   */
  async getAvailableLeaveTypes(user: User): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT * FROM LeaveTypes
      WHERE is_enabled = 1 AND is_deleted = 0
        AND (gender_specific IS NULL OR gender_specific = ?)
      ORDER BY sort_order ASC
    `).bind(user.gender).all();
    
    return result.results || [];
  }

  /**
   * 登記生活事件（婚假、喪假等）
   */
  async registerLifeEvent(data: {
    event_type: string;
    event_date: string;
    description?: string;
  }, user: User): Promise<any> {
    validateRequired(data.event_type, '事件類型');
    validateRequired(data.event_date, '事件日期');

    // 查詢對應規則
    const rule = await this.db.prepare(`
      SELECT olr.*, lt.type_name
      FROM OtherLeaveRules olr
      JOIN LeaveTypes lt ON olr.leave_type_id = lt.leave_type_id
      WHERE olr.event_type = ?
    `).bind(data.event_type).first<any>();

    if (!rule) throw new NotFoundError('找不到對應的假期規則');

    // 計算有效期
    const validFrom = data.event_date;
    const eventDate = new Date(data.event_date);
    const validUntilDate = new Date(eventDate.getTime() + rule.validity_days * 24 * 60 * 60 * 1000);
    const validUntil = validUntilDate.toISOString().split('T')[0];

    // 創建假期額度記錄
    await this.db.prepare(`
      INSERT INTO LifeEventLeaveGrants (
        user_id, leave_type_id, event_type, event_date,
        total_days, remaining_days, valid_from, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.user_id, rule.leave_type_id, data.event_type, data.event_date,
      rule.days, rule.days, validFrom, validUntil
    ).run();

    return {
      event_type: data.event_type,
      leave_type: rule.type_name,
      total_days: rule.days,
      valid_until: validUntil,
    };
  }

  /**
   * 查詢生活事件記錄
   */
  async getLifeEvents(userId: number): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT leg.*, lt.type_name
      FROM LifeEventLeaveGrants leg
      JOIN LeaveTypes lt ON leg.leave_type_id = lt.leave_type_id
      WHERE leg.user_id = ? AND leg.is_deleted = 0
      ORDER BY leg.event_date DESC
    `).bind(userId).all();
    
    return result.results || [];
  }

  /**
   * ⭐ 查詢假期餘額（完整實現）
   * 包含：特休累積制、病假、生理假併入、生活事件假期
   */
  async getLeaveBalance(userId: number, year?: number): Promise<any> {
    const currentYear = year || new Date().getFullYear();
    const balances: any[] = [];

    // 1. ⭐ 特休餘額（累積制：去年剩餘 + 今年新增）
    const annualLeaveBalance = await this.calculateAnnualLeaveBalance(userId, currentYear);
    balances.push({
      leave_type_id: 1,
      leave_type: '特休',
      entitled_days: annualLeaveBalance.entitled_days,
      carried_over_days: annualLeaveBalance.carried_over_days,  // ⭐ 去年累積
      used_days: annualLeaveBalance.used_days,
      remaining_days: annualLeaveBalance.remaining_days,
      total_available: annualLeaveBalance.entitled_days + annualLeaveBalance.carried_over_days,
      is_accumulated: true,  // 標記為累積制
    });

    // 2. ⭐ 病假餘額（含生理假併入計算）
    const sickLeaveBalance = await this.calculateSickLeaveBalance(userId, currentYear);
    balances.push({
      leave_type_id: 2,
      leave_type: '病假',
      entitled_days: 30,
      used_days: sickLeaveBalance.used,
      remaining_days: sickLeaveBalance.remaining,
      breakdown: sickLeaveBalance.breakdown,  // 顯示生理假併入的部分
    });

    // 3. 事假餘額
    const casualLeaveUsed = await this.db.prepare(`
      SELECT COALESCE(SUM(days), 0) as total
      FROM LeaveApplications
      WHERE user_id = ? AND leave_type_id = 3 
        AND strftime('%Y', start_date) = ? AND is_deleted = 0
    `).bind(userId, currentYear.toString()).first<{ total: number }>();
    
    balances.push({
      leave_type_id: 3,
      leave_type: '事假',
      entitled_days: 14,
      used_days: casualLeaveUsed?.total || 0,
      remaining_days: 14 - (casualLeaveUsed?.total || 0),
    });

    // 4. ⭐ 生活事件假期（婚假、喪假等，含有效期）
    const lifeEventGrants = await this.db.prepare(`
      SELECT 
        leg.*,
        lt.type_name,
        CASE 
          WHEN leg.valid_until < date('now') THEN 'expired'
          WHEN leg.remaining_days <= 0 THEN 'used_up'
          ELSE 'active'
        END as status
      FROM LifeEventLeaveGrants leg
      JOIN LeaveTypes lt ON leg.leave_type_id = lt.leave_type_id
      WHERE leg.user_id = ? AND leg.is_deleted = 0
      ORDER BY leg.event_date DESC
    `).bind(userId).all();

    for (const grant of lifeEventGrants.results || []) {
      balances.push({
        leave_type_id: grant.leave_type_id,
        leave_type: grant.type_name,
        event_type: grant.event_type,
        event_date: grant.event_date,
        total_days: grant.total_days,
        used_days: grant.used_days,
        remaining_days: grant.remaining_days,
        valid_from: grant.valid_from,
        valid_until: grant.valid_until,
        status: grant.status,
        is_life_event: true,  // 標記為生活事件假期
      });
    }

    return {
      user_id: userId,
      year: currentYear,
      balances,
    };
  }

  /**
   * ⭐ 計算特休餘額（累積制）
   */
  private async calculateAnnualLeaveBalance(userId: number, year: number): Promise<{
    entitled_days: number;
    carried_over_days: number;
    used_days: number;
    remaining_days: number;
  }> {
    // 1. 查詢員工到職日
    const user = await this.db.prepare(`
      SELECT start_date FROM Users WHERE user_id = ?
    `).bind(userId).first<{ start_date: string }>();
    
    if (!user) {
      throw new NotFoundError('員工不存在');
    }

    // 2. 計算年資（月數，到當年度12月31日）
    const joinDate = new Date(user.start_date);
    const endOfYear = new Date(year, 11, 31);
    const months = this.calculateMonthsBetween(joinDate, endOfYear);

    // 3. 查詢當年度應得特休
    const rule = await this.db.prepare(`
      SELECT days FROM AnnualLeaveRules
      WHERE min_months <= ? AND (max_months IS NULL OR max_months > ?)
      ORDER BY min_months DESC
      LIMIT 1
    `).bind(months, months).first<{ days: number }>();

    const entitledDays = rule?.days || 0;

    // 4. ⭐ 查詢去年剩餘特休（累積制）
    const lastYearBalance = await this.db.prepare(`
      SELECT remaining_days FROM AnnualLeaveBalance
      WHERE user_id = ? AND year = ?
    `).bind(userId, year - 1).first<{ remaining_days: number }>();

    const carriedOverDays = lastYearBalance?.remaining_days || 0;

    // 5. 查詢今年已使用天數
    const usedResult = await this.db.prepare(`
      SELECT COALESCE(SUM(days), 0) as total FROM LeaveApplications
      WHERE user_id = ? AND leave_type_id = 1 
        AND strftime('%Y', start_date) = ? AND is_deleted = 0
    `).bind(userId, year.toString()).first<{ total: number }>();

    const usedDays = usedResult?.total || 0;

    // 6. 計算剩餘
    const remainingDays = entitledDays + carriedOverDays - usedDays;

    return {
      entitled_days: entitledDays,
      carried_over_days: carriedOverDays,  // ⭐ 去年累積
      used_days: usedDays,
      remaining_days: remainingDays,
    };
  }

  /**
   * ⭐ 計算病假餘額（含生理假併入）
   */
  private async calculateSickLeaveBalance(userId: number, year: number): Promise<{
    entitled: number;
    used: number;
    remaining: number;
    breakdown: {
      sick_leave_used: number;
      menstrual_as_sick_leave: number;
    };
  }> {
    // 1. 查詢病假使用天數
    const sickLeaveUsed = await this.db.prepare(`
      SELECT COALESCE(SUM(days), 0) as total
      FROM LeaveApplications
      WHERE user_id = ? AND leave_type_id = 2 
        AND strftime('%Y', start_date) = ? AND is_deleted = 0
    `).bind(userId, year.toString()).first<{ total: number }>();

    // 2. ⭐ 查詢生理假併入病假的天數（counts_as_sick_leave = 1）
    const menstrualAsSickLeave = await this.db.prepare(`
      SELECT COALESCE(SUM(days), 0) as total
      FROM LeaveApplications
      WHERE user_id = ? AND leave_type_id = 8 
        AND counts_as_sick_leave = 1 
        AND strftime('%Y', start_date) = ? AND is_deleted = 0
    `).bind(userId, year.toString()).first<{ total: number }>();

    const totalUsed = (sickLeaveUsed?.total || 0) + (menstrualAsSickLeave?.total || 0);

    return {
      entitled: 30,
      used: totalUsed,
      remaining: 30 - totalUsed,
      breakdown: {
        sick_leave_used: sickLeaveUsed?.total || 0,
        menstrual_as_sick_leave: menstrualAsSickLeave?.total || 0,
      },
    };
  }

  /**
   * 計算年資（月數）
   */
  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    months += endDate.getMonth() - startDate.getMonth();
    return months;
  }
}

