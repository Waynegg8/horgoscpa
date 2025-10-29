/**
 * Setting Service - 系統設定服務
 * 負責系統參數管理的業務邏輯
 */

import { D1Database } from '@cloudflare/workers-types';
import { SettingRepository } from '../repositories/SettingRepository';
import { 
  Setting, 
  ValidationError, 
  NotFoundError,
  ForbiddenError
} from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class SettingService {
  private settingRepo: SettingRepository;

  constructor(private db: D1Database) {
    this.settingRepo = new SettingRepository(db);
  }

  /**
   * 獲取所有系統設定
   */
  async getAllSettings(): Promise<Setting[]> {
    return await this.settingRepo.findAll();
  }

  /**
   * 獲取單個設定
   */
  async getSetting(key: string): Promise<Setting> {
    const setting = await this.settingRepo.findByKey(key);
    
    if (!setting) {
      throw new NotFoundError(`設定 ${key} 不存在`);
    }
    
    return setting;
  }

  /**
   * 更新設定值
   */
  async updateSetting(
    key: string,
    value: string,
    confirmed: boolean,
    updatedBy: number
  ): Promise<{ setting: Setting; old_value: string; warning?: string }> {
    validateRequired(value, '設定值');

    // 檢查設定是否存在
    const existingSetting = await this.settingRepo.findByKey(key);
    if (!existingSetting) {
      throw new NotFoundError(`設定 ${key} 不存在`);
    }

    const oldValue = existingSetting.setting_value;

    // ⭐ 檢查是否為唯讀設定（勞基法規定，不可修改）
    if (existingSetting.is_readonly) {
      throw new ForbiddenError(`此設定受勞基法限制，不可修改`);
    }

    // ⭐ 檢查是否為危險設定（需要確認）
    if (existingSetting.is_dangerous && !confirmed) {
      throw new ValidationError(
        '這是危險設定，可能影響系統運作或增加成本。請勾選「我了解風險」後再試',
        'confirmed'
      );
    }

    // 特定設定的驗證邏輯
    let warning: string | undefined;

    switch (key) {
      case 'comp_leave_expiry_rule':
        // 補休有效期規則驗證
        const validRules = ['current_month', 'next_month', '3_months', '6_months'];
        if (!validRules.includes(value)) {
          throw new ValidationError(
            `補休有效期規則只能是：${validRules.join(', ')}`,
            'setting_value'
          );
        }
        
        if (value !== 'current_month') {
          warning = '⚠️ 延長補休有效期會增加人力成本（到期時需轉換為加班費）';
        }
        break;

      case 'daily_work_hours_limit':
        const hoursLimit = parseInt(value);
        if (isNaN(hoursLimit) || hoursLimit < 8 || hoursLimit > 12) {
          throw new ValidationError('每日工時上限必須在 8-12 小時之間', 'setting_value');
        }
        break;

      case 'hourly_wage_base':
        const wageBase = parseInt(value);
        if (isNaN(wageBase) || wageBase <= 0) {
          throw new ValidationError('時薪換算基數必須大於 0', 'setting_value');
        }
        break;

      case 'fiscal_year_start_month':
        const month = parseInt(value);
        if (isNaN(month) || month < 1 || month > 12) {
          throw new ValidationError('會計年度起始月份必須在 1-12 之間', 'setting_value');
        }
        break;

      case 'default_work_hours_per_day':
        const defaultHours = parseInt(value);
        if (isNaN(defaultHours) || defaultHours <= 0 || defaultHours > 12) {
          throw new ValidationError('預設每日工作時數必須在 1-12 小時之間', 'setting_value');
        }
        break;
    }

    // 更新設定
    const updatedSetting = await this.settingRepo.update(key, value, updatedBy);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'Settings',
      record_id: key,
      changes: JSON.stringify({
        setting_key: key,
        old_value: oldValue,
        new_value: value,
        is_dangerous: existingSetting.is_dangerous,
      }),
    });

    return {
      setting: updatedSetting,
      old_value: oldValue,
      warning,
    };
  }

  /**
   * 創建新設定
   */
  async createSetting(
    setting: Omit<Setting, 'updated_at' | 'updated_by'>,
    createdBy: number
  ): Promise<Setting> {
    // 檢查是否已存在
    const existing = await this.settingRepo.findByKey(setting.setting_key);
    if (existing) {
      throw new ValidationError('設定已存在', 'setting_key');
    }

    const newSetting = await this.settingRepo.create(setting);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'Settings',
      record_id: setting.setting_key,
      changes: JSON.stringify(setting),
    });

    return newSetting;
  }

  /**
   * 刪除設定
   */
  async deleteSetting(key: string, deletedBy: number): Promise<void> {
    // 檢查設定是否存在
    const setting = await this.settingRepo.findByKey(key);
    if (!setting) {
      throw new NotFoundError(`設定 ${key} 不存在`);
    }

    // 不能刪除危險設定或唯讀設定
    if (setting.is_dangerous || setting.is_readonly) {
      throw new ForbiddenError('不能刪除此系統設定');
    }

    await this.settingRepo.delete(key);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'Settings',
      record_id: key,
      changes: JSON.stringify(setting),
    });
  }
}

