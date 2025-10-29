/**
 * Holiday Service - 國定假日服務
 */

import { D1Database } from '@cloudflare/workers-types';
import { HolidayRepository, Holiday } from '../repositories/HolidayRepository';
import { ValidationError, ConflictError, NotFoundError } from '../types';
import { validateRequired, validateDateFormat } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class HolidayService {
  private holidayRepo: HolidayRepository;

  constructor(private db: D1Database) {
    this.holidayRepo = new HolidayRepository(db);
  }

  /**
   * 查詢國定假日列表
   */
  async getHolidays(options: {
    year?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ holidays: Holiday[]; total: number }> {
    return await this.holidayRepo.findAll(options);
  }

  /**
   * 新增國定假日（小型事務所彈性設計：所有人可用）
   */
  async createHoliday(
    data: {
      holiday_date: string;
      name: string;
      is_national_holiday?: boolean;
      is_makeup_workday?: boolean;
    },
    createdBy: number
  ): Promise<Holiday> {
    // 驗證必填欄位
    validateRequired(data.holiday_date, '日期');
    validateRequired(data.name, '名稱');
    validateDateFormat(data.holiday_date, '日期');

    // 檢查日期是否已存在
    const exists = await this.holidayRepo.existsByDate(data.holiday_date);
    if (exists) {
      throw new ConflictError('該日期已存在國定假日記錄', 'holiday_date');
    }

    // 邏輯驗證：不能同時是國定假日和補班日
    if (data.is_national_holiday && data.is_makeup_workday) {
      throw new ValidationError('不能同時設定為國定假日和補班日', 'is_makeup_workday');
    }

    const holiday = await this.holidayRepo.create({
      holiday_date: data.holiday_date,
      name: data.name,
      is_national_holiday: data.is_national_holiday !== false,
      is_makeup_workday: data.is_makeup_workday || false,
    });

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'Holidays',
      record_id: holiday.holiday_id!.toString(),
      changes: JSON.stringify(data),
    });

    return holiday;
  }

  /**
   * 更新國定假日
   */
  async updateHoliday(
    holidayId: number,
    updates: {
      name?: string;
      is_national_holiday?: boolean;
      is_makeup_workday?: boolean;
    },
    updatedBy: number
  ): Promise<Holiday> {
    // 檢查是否存在
    const existing = await this.holidayRepo.findById(holidayId);
    if (!existing) {
      throw new NotFoundError('國定假日不存在');
    }

    // 邏輯驗證
    const finalIsNational = updates.is_national_holiday ?? existing.is_national_holiday;
    const finalIsMakeup = updates.is_makeup_workday ?? existing.is_makeup_workday;
    
    if (finalIsNational && finalIsMakeup) {
      throw new ValidationError('不能同時設定為國定假日和補班日', 'is_makeup_workday');
    }

    const holiday = await this.holidayRepo.update(holidayId, updates);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'Holidays',
      record_id: holidayId.toString(),
      changes: JSON.stringify({
        old: existing,
        new: updates,
      }),
    });

    return holiday;
  }

  /**
   * 刪除國定假日
   */
  async deleteHoliday(holidayId: number, deletedBy: number): Promise<void> {
    const existing = await this.holidayRepo.findById(holidayId);
    if (!existing) {
      throw new NotFoundError('國定假日不存在');
    }

    await this.holidayRepo.delete(holidayId, deletedBy);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'Holidays',
      record_id: holidayId.toString(),
      changes: JSON.stringify(existing),
    });
  }

  /**
   * 批量導入國定假日（僅管理員）
   */
  async importHolidays(
    holidays: Array<{
      holiday_date: string;
      name: string;
      is_national_holiday?: boolean;
      is_makeup_workday?: boolean;
    }>,
    importedBy: number
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const holiday of holidays) {
      try {
        // 檢查是否已存在
        const exists = await this.holidayRepo.existsByDate(holiday.holiday_date);
        if (exists) {
          skipped++;
          continue;
        }

        await this.holidayRepo.create({
          holiday_date: holiday.holiday_date,
          name: holiday.name,
          is_national_holiday: holiday.is_national_holiday !== false,
          is_makeup_workday: holiday.is_makeup_workday || false,
        });

        imported++;
      } catch (error) {
        errors.push(`${holiday.holiday_date}: ${(error as Error).message}`);
      }
    }

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: importedBy,
      action: 'IMPORT',
      table_name: 'Holidays',
      changes: JSON.stringify({
        total: holidays.length,
        imported,
        skipped,
        errors: errors.length,
      }),
    });

    return { imported, skipped, errors };
  }
}

