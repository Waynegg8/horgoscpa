/**
 * Setting Repository - 系統設定資料訪問層
 * 負責所有與 Settings 表的資料庫操作
 */

import { D1Database } from '@cloudflare/workers-types';
import { Setting, NotFoundError } from '../types';

export class SettingRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有設定
   */
  async findAll(): Promise<Setting[]> {
    const result = await this.db.prepare(`
      SELECT * FROM Settings
      ORDER BY 
        CASE 
          WHEN is_dangerous = 1 THEN 0 
          ELSE 1 
        END,
        setting_key ASC
    `).all<Setting>();
    
    return result.results || [];
  }

  /**
   * 根據 key 查詢設定
   */
  async findByKey(key: string): Promise<Setting | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Settings
      WHERE setting_key = ?
    `).bind(key).first<Setting>();
    
    return result || null;
  }

  /**
   * 更新設定值
   */
  async update(key: string, value: string, updatedBy: number): Promise<Setting> {
    await this.db.prepare(`
      UPDATE Settings
      SET setting_value = ?,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE setting_key = ?
    `).bind(value, updatedBy, key).run();
    
    const setting = await this.findByKey(key);
    if (!setting) {
      throw new NotFoundError('設定不存在');
    }
    
    return setting;
  }

  /**
   * 創建新設定
   */
  async create(setting: Omit<Setting, 'updated_at' | 'updated_by'>): Promise<Setting> {
    await this.db.prepare(`
      INSERT INTO Settings (setting_key, setting_value, description, is_dangerous, is_readonly)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      setting.setting_key,
      setting.setting_value,
      setting.description || null,
      setting.is_dangerous ? 1 : 0,
      setting.is_readonly ? 1 : 0
    ).run();
    
    const newSetting = await this.findByKey(setting.setting_key);
    if (!newSetting) {
      throw new NotFoundError('創建設定失敗');
    }
    
    return newSetting;
  }

  /**
   * 刪除設定
   */
  async delete(key: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM Settings
      WHERE setting_key = ?
    `).bind(key).run();
  }
}

