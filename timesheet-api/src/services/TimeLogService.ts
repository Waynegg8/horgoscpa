/**
 * TimeLog Service - 工時管理服務
 * 核心功能：工時 CRUD、補休自動累積、加權工時計算
 */

import { D1Database } from '@cloudflare/workers-types';
import { TimeLogRepository, TimeLog } from '../repositories/TimeLogRepository';
import { CompensatoryLeaveRepository } from '../repositories/CompensatoryLeaveRepository';
import { SettingRepository } from '../repositories/SettingRepository';
import { ValidationError, ForbiddenError, NotFoundError, User, ErrorCode, AppError } from '../types';
import { validateRequired, validateDateFormat } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class TimeLogService {
  private timeLogRepo: TimeLogRepository;
  private compeLeaveRepo: CompensatoryLeaveRepository;
  private settingRepo: SettingRepository;

  constructor(private db: D1Database) {
    this.timeLogRepo = new TimeLogRepository(db);
    this.compeLeaveRepo = new CompensatoryLeaveRepository(db);
    this.settingRepo = new SettingRepository(db);
  }

  /**
   * 查詢工時記錄（員工自動過濾）
   */
  async getTimeLogs(
    filters: {
      start_date?: string;
      end_date?: string;
      client_id?: string;
      limit?: number;
      offset?: number;
    },
    user: User
  ): Promise<{ logs: TimeLog[]; total: number }> {
    const options = { ...filters };
    
    // ⭐ 權限控制：員工只能看自己的工時
    if (!user.is_admin) {
      options.user_id = user.user_id;
    }
    
    return await this.timeLogRepo.findAll(options);
  }

  /**
   * 新增工時記錄
   * ⭐ 核心邏輯：加班時自動累積補休
   */
  async createTimeLog(
    data: {
      work_date: string;
      client_id?: string;
      service_id?: number;
      work_type_id: number;
      hours: number;
      leave_type_id?: number;
      notes?: string;
    },
    userId: number
  ): Promise<TimeLog> {
    // 驗證必填欄位
    validateRequired(data.work_date, '工作日期');
    validateRequired(data.work_type_id, '工作類型');
    validateRequired(data.hours, '工時');
    validateDateFormat(data.work_date, '工作日期');

    // ⭐ 驗證工時必須是 0.5 的倍數
    if (data.hours % 0.5 !== 0) {
      throw new AppError(
        422,
        'HOURS_PRECISION_ERROR',
        '工時必須是 0.5 的倍數（如：0.5、1.0、1.5、2.0...）',
        'hours'
      );
    }

    // ⭐ 驗證每日工時上限（12小時）
    const dailyTotal = await this.timeLogRepo.getDailyTotal(userId, data.work_date);
    const limitSetting = await this.settingRepo.findByKey('daily_work_hours_limit');
    const dailyLimit = parseInt(limitSetting?.setting_value || '12');
    
    if (dailyTotal + data.hours > dailyLimit) {
      throw new AppError(
        422,
        'DAILY_HOURS_EXCEEDED',
        `超過每日工時上限（${dailyLimit} 小時）。當前已填：${dailyTotal} 小時`,
        'hours'
      );
    }

    // ⭐ 補班日驗證（防止誤選休息日加班）[規格:L512-L527]
    // ⚠️ 必須在創建記錄之前驗證！
    const holiday = await this.db.prepare(`
      SELECT is_makeup_workday, is_national_holiday FROM Holidays 
      WHERE holiday_date = ?
    `).bind(data.work_date).first<any>();
    
    if (holiday?.is_makeup_workday) {
      // 補班日不可選「休息日加班」類型（4, 5, 6）
      const isRestDayOvertimeType = [4, 5, 6].includes(data.work_type_id);
      if (isRestDayOvertimeType) {
        throw new ValidationError(
          '今天是補班日（正常上班日），請選擇「正常工時」或「平日加班」類型',
          'work_type_id'
        );
      }
    }
    
    // ⭐ 國定假日/例假日「8小時內」類型的工時限制 [規格:L529-L535]
    if ((data.work_type_id === 7 || data.work_type_id === 10) && data.hours > 8) {
      throw new ValidationError(
        '工作類型「國定假日8小時內」或「例假日8小時內」的工時不可超過8小時，' +
        '超過部分請分別選擇「第9-10小時」或「第11-12小時」類型',
        'hours'
      );
    }

    // 查詢工作類型資訊
    const workType = await this.db.prepare(`
      SELECT * FROM WorkTypes WHERE work_type_id = ?
    `).bind(data.work_type_id).first<any>();
    
    if (!workType) {
      throw new NotFoundError('工作類型不存在');
    }

    // ⭐ 計算加權工時（國定假日/例假日特殊處理）[規格:L537-L547]
    let weightedHours: number;
    if (data.work_type_id === 7 || data.work_type_id === 10) {
      // ⚠️ 國定假日/例假日 8小時內：統一為 8 小時加權工時（不是實際工時 × 2.0）
      weightedHours = 8.0;
    } else {
      // 一般情況：實際工時 × 費率倍數
      weightedHours = data.hours * (workType.rate_multiplier || 1.0);
    }

    // 創建工時記錄
    const timeLog = await this.timeLogRepo.create({
      user_id: userId,
      work_date: data.work_date,
      client_id: data.client_id,
      service_id: data.service_id,
      work_type_id: data.work_type_id,
      hours: data.hours,
      weighted_hours: weightedHours,
      leave_type_id: data.leave_type_id,
      notes: data.notes,
    });

    // ⭐ 如果是加班，自動累積補休（含國定假日特殊規則）
    if (workType.generates_comp_leave && workType.is_overtime) {
      // ⚠️ 國定假日/例假日 8小時內：統一產生 8 小時補休
      const compHours = (data.work_type_id === 7 || data.work_type_id === 10) ? 8.0 : data.hours;
      await this.accumulateCompensatoryLeave(userId, timeLog.log_id!, compHours, data.work_date, workType);
    }
    
    // ⭐ 自動移除工時缺填提醒
    await this.dismissMissingTimesheetNotification(userId, data.work_date);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: userId,
      action: 'CREATE',
      table_name: 'TimeLogs',
      record_id: timeLog.log_id!.toString(),
      changes: JSON.stringify(data),
    });

    return timeLog;
  }

  /**
   * ⭐ 補休自動累積邏輯
   */
  private async accumulateCompensatoryLeave(
    userId: number,
    timelogId: number,
    hours: number,
    earnedDate: string,
    workType: any
  ): Promise<void> {
    // 獲取補休有效期規則
    const expirySetting = await this.settingRepo.findByKey('comp_leave_expiry_rule');
    const expiryRule = expirySetting?.setting_value || 'current_month';
    
    // 計算到期日
    let expiryDate: string;
    const earned = new Date(earnedDate);
    
    switch (expiryRule) {
      case 'current_month':
        // 當月有效，次月1日歸0
        expiryDate = new Date(earned.getFullYear(), earned.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'next_month':
        // 次月有效
        expiryDate = new Date(earned.getFullYear(), earned.getMonth() + 2, 0).toISOString().split('T')[0];
        break;
      case '3_months':
        expiryDate = new Date(earned.getFullYear(), earned.getMonth() + 3, 0).toISOString().split('T')[0];
        break;
      case '6_months':
        expiryDate = new Date(earned.getFullYear(), earned.getMonth() + 6, 0).toISOString().split('T')[0];
        break;
      default:
        expiryDate = new Date(earned.getFullYear(), earned.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    
    // 創建補休記錄
    await this.compeLeaveRepo.create({
      user_id: userId,
      hours_earned: hours,
      hours_remaining: hours,
      earned_date: earnedDate,
      expiry_date: expiryDate,
      source_timelog_id: timelogId,
      source_work_type: workType.type_name,
      original_rate: workType.rate_multiplier,
      status: 'active',
    });
  }

  /**
   * 更新工時記錄
   */
  async updateTimeLog(
    logId: number,
    updates: Partial<TimeLog>,
    userId: number,
    user: User
  ): Promise<TimeLog> {
    // 檢查是否存在
    const existing = await this.timeLogRepo.findById(logId);
    if (!existing) {
      throw new NotFoundError('工時記錄不存在');
    }

    // ⭐ 權限控制：員工只能修改自己的工時
    if (!user.is_admin && existing.user_id !== user.user_id) {
      throw new AppError(422, 'TIMELOG_NOT_OWNER', '只能修改自己的工時記錄');
    }

    // 重新計算加權工時（如果更新了 hours 或 work_type_id）
    if (updates.hours || updates.work_type_id) {
      const workTypeId = updates.work_type_id || existing.work_type_id;
      const hours = updates.hours || existing.hours;
      
      const workType = await this.db.prepare(`
        SELECT rate_multiplier FROM WorkTypes WHERE work_type_id = ?
      `).bind(workTypeId).first<{ rate_multiplier: number }>();
      
      if (workType) {
        updates.weighted_hours = hours * workType.rate_multiplier;
      }
    }

    const updated = await this.timeLogRepo.update(logId, updates);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: userId,
      action: 'UPDATE',
      table_name: 'TimeLogs',
      record_id: logId.toString(),
      changes: JSON.stringify({ old: existing, new: updates }),
    });

    return updated;
  }

  /**
   * 刪除工時記錄
   */
  async deleteTimeLog(logId: number, deletedBy: number, user: User): Promise<void> {
    const existing = await this.timeLogRepo.findById(logId);
    if (!existing) {
      throw new NotFoundError('工時記錄不存在');
    }

    // ⭐ 權限控制：員工只能刪除自己的工時
    if (!user.is_admin && existing.user_id !== user.user_id) {
      throw new AppError(422, 'TIMELOG_NOT_OWNER', '只能刪除自己的工時記錄');
    }

    await this.timeLogRepo.delete(logId, deletedBy);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'TimeLogs',
      record_id: logId.toString(),
      changes: JSON.stringify(existing),
    });
  }

  /**
   * 計算加權工時
   */
  async calculateWeightedHours(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    total_hours: number;
    weighted_hours: number;
    breakdown: Record<string, number>;
  }> {
    const result = await this.db.prepare(`
      SELECT 
        SUM(t.hours) as total_hours,
        SUM(t.weighted_hours) as weighted_hours,
        wt.type_name,
        SUM(t.hours) as type_hours
      FROM TimeLogs t
      JOIN WorkTypes wt ON t.work_type_id = wt.work_type_id
      WHERE t.user_id = ? 
        AND t.work_date >= ? 
        AND t.work_date <= ?
        AND t.is_deleted = 0
      GROUP BY wt.type_name
    `).bind(userId, startDate, endDate).all<any>();

    const breakdown: Record<string, number> = {};
    let totalHours = 0;
    let weightedHours = 0;

    for (const row of result.results || []) {
      breakdown[row.type_name] = row.type_hours;
      totalHours += row.total_hours || 0;
      weightedHours += row.weighted_hours || 0;
    }

    return {
      total_hours: totalHours,
      weighted_hours: weightedHours,
      breakdown,
    };
  }

  /**
   * 查詢補休餘額
   */
  async getCompensatoryLeaveBalance(userId: number): Promise<{
    total_hours: number;
    details: any[];
    expiring_soon: any[];
  }> {
    const activeLeaves = await this.compeLeaveRepo.findActiveByUser(userId);
    const expiringSoon = await this.compeLeaveRepo.findExpiringSoon(userId, 7);
    
    const totalHours = activeLeaves.reduce((sum, leave) => sum + leave.hours_remaining, 0);
    
    return {
      total_hours: totalHours,
      details: activeLeaves,
      expiring_soon: expiringSoon,
    };
  }

  /**
   * ⭐ 自動移除工時缺填提醒
   */
  private async dismissMissingTimesheetNotification(userId: number, workDate: string): Promise<void> {
    // 移除員工自己的提醒
    await this.db.prepare(`
      UPDATE Notifications
      SET is_deleted = 1,
          dismissed_at = datetime('now')
      WHERE user_id = ?
        AND type = 'missing_timesheet'
        AND related_date = ?
        AND auto_dismiss = 1
        AND is_deleted = 0
    `).bind(userId, workDate).run();
    
    // 移除管理員關於該員工的提醒
    await this.db.prepare(`
      UPDATE Notifications
      SET is_deleted = 1,
          dismissed_at = datetime('now')
      WHERE type = 'missing_timesheet'
        AND related_date = ?
        AND related_user_id = ?
        AND auto_dismiss = 1
        AND is_deleted = 0
    `).bind(workDate, userId).run();
  }

  /**
   * ⭐ 使用補休（FIFO 先進先出）
   */
  async useCompensatoryLeave(
    userId: number,
    hoursToUse: number,
    useDate: string,
    leaveApplicationId?: number
  ): Promise<{
    used_compensatory_leaves: any[];
    total_hours_used: number;
    remaining_total: number;
  }> {
    // 1. 查詢可用補休（按累積日期排序 - FIFO）
    const availableLeaves = await this.compeLeaveRepo.findActiveByUser(userId);
    
    if (availableLeaves.length === 0) {
      throw new ValidationError('沒有可用的補休');
    }
    
    // 2. 計算總可用時數
    const totalAvailable = availableLeaves.reduce((sum, leave) => sum + leave.hours_remaining, 0);
    
    if (totalAvailable < hoursToUse) {
      throw new ValidationError(
        `補休時數不足。可用：${totalAvailable} 小時，需求：${hoursToUse} 小時`,
        'hours'
      );
    }
    
    // 3. 按 FIFO 順序扣除
    let remainingToUse = hoursToUse;
    const usedLeaves = [];
    
    for (const leave of availableLeaves) {
      if (remainingToUse <= 0) break;
      
      const hoursToUseFromThis = Math.min(leave.hours_remaining, remainingToUse);
      
      // 更新補休餘額
      const newRemaining = leave.hours_remaining - hoursToUseFromThis;
      await this.compeLeaveRepo.updateRemaining(leave.compe_leave_id!, newRemaining);
      
      // 記錄使用歷史
      await this.compeLeaveRepo.recordUsage({
        compe_leave_id: leave.compe_leave_id!,
        leave_application_id: leaveApplicationId,
        hours_used: hoursToUseFromThis,
        used_date: useDate,
      });
      
      usedLeaves.push({
        compe_leave_id: leave.compe_leave_id,
        hours_used: hoursToUseFromThis,
        hours_remaining: newRemaining,
      });
      
      remainingToUse -= hoursToUseFromThis;
    }
    
    return {
      used_compensatory_leaves: usedLeaves,
      total_hours_used: hoursToUse,
      remaining_total: totalAvailable - hoursToUse,
    };
  }

  /**
   * ⭐ 手動轉換補休為加班費
   */
  async convertCompensatoryLeaveToPayment(
    compeLeaveIds: number[],
    conversionRate: number,
    userId: number
  ): Promise<{
    total_hours_converted: number;
    conversion_rate: number;
    payment_amount: number;
    converted_leaves: any[];
  }> {
    let totalHours = 0;
    const convertedLeaves = [];
    
    for (const compeLeaveId of compeLeaveIds) {
      // 查詢補休記錄
      const leave = await this.db.prepare(`
        SELECT * FROM CompensatoryLeave WHERE compe_leave_id = ? AND user_id = ?
      `).bind(compeLeaveId, userId).first<any>();
      
      if (!leave || leave.hours_remaining <= 0) {
        continue;
      }
      
      // 標記為已轉換
      await this.compeLeaveRepo.markAsConverted(compeLeaveId, conversionRate);
      
      totalHours += leave.hours_remaining;
      convertedLeaves.push({
        compe_leave_id: compeLeaveId,
        hours: leave.hours_remaining,
      });
    }
    
    const paymentAmount = totalHours * conversionRate;
    
    return {
      total_hours_converted: totalHours,
      conversion_rate: conversionRate,
      payment_amount: paymentAmount,
      converted_leaves: convertedLeaves,
    };
  }

  /**
   * ⭐ 查詢補休使用歷史
   */
  async getCompensatoryLeaveHistory(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    let whereClause = 'WHERE cl.user_id = ?';
    const params: any[] = [userId];
    
    if (startDate) {
      whereClause += ' AND cl.earned_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND cl.earned_date <= ?';
      params.push(endDate);
    }
    
    const result = await this.db.prepare(`
      SELECT 
        cl.*,
        clu.usage_id,
        clu.hours_used,
        clu.used_date
      FROM CompensatoryLeave cl
      LEFT JOIN CompensatoryLeaveUsage clu ON cl.compe_leave_id = clu.compe_leave_id
      ${whereClause}
      ORDER BY cl.earned_date DESC, clu.used_date DESC
    `).bind(...params).all();
    
    return result.results || [];
  }
}

