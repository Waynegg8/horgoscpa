/**
 * System Repository
 * 处理系统基础数据
 */
import { TABLES } from '../config/constants.js';

export class SystemRepository {
  constructor(db) {
    this.db = db;
  }

  async getBusinessTypes() {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.BUSINESS_TYPES} WHERE is_active = 1 ORDER BY type_name
    `).all();
    return result.results || [];
  }

  async getLeaveTypes() {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.LEAVE_TYPES} WHERE is_active = 1 ORDER BY type_name
    `).all();
    return result.results || [];
  }

  async getHolidays(year) {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.HOLIDAYS}
      WHERE strftime('%Y', holiday_date) = ?
      ORDER BY holiday_date
    `).bind(year.toString()).all();
    return result.results || [];
  }

  async getSystemParameter(category, key) {
    const result = await this.db.prepare(`
      SELECT param_value FROM ${TABLES.SYSTEM_PARAMETERS}
      WHERE param_category = ? AND param_key = ?
    `).bind(category, key).first();
    return result?.param_value || null;
  }
}

export default SystemRepository;

