/**
 * Client Repository
 * 負責客戶表的所有資料庫操作
 */

import { BaseRepository } from './BaseRepository.js';
import { TABLES, FIELDS } from '../config/constants.js';

export class ClientRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.CLIENTS);
  }

  /**
   * 查詢客戶（帶服務）
   * @param {number} id - 客戶 ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithServices(id) {
    const client = await this.findById(id);
    if (!client) return null;

    // 查詢客戶的所有服務
    const services = await this.db
      .prepare(`
        SELECT * FROM ${TABLES.CLIENT_SERVICES}
        WHERE ${FIELDS.CLIENT_ID} = ?
        ORDER BY ${FIELDS.CREATED_AT} DESC
      `)
      .bind(id)
      .all();

    return {
      ...client,
      services: services.results || []
    };
  }

  /**
   * 根據統一編號查詢
   * @param {string} taxId - 統一編號
   * @returns {Promise<Object|null>}
   */
  async findByTaxId(taxId) {
    return this.findOne({ tax_id: taxId });
  }

  /**
   * 根據名稱查詢
   * @param {string} name - 客戶名稱
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return this.findOne({ name });
  }

  /**
   * 檢查名稱是否已存在
   * @param {string} name - 客戶名稱
   * @param {number} excludeId - 排除的 ID（用於更新時檢查）
   * @returns {Promise<boolean>}
   */
  async nameExists(name, excludeId = null) {
    let query = `SELECT ${FIELDS.ID} FROM ${this.tableName} WHERE name = ?`;
    const params = [name];

    if (excludeId) {
      query += ` AND ${FIELDS.ID} != ?`;
      params.push(excludeId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }

  /**
   * 檢查統一編號是否已存在
   * @param {string} taxId - 統一編號
   * @param {number} excludeId - 排除的 ID
   * @returns {Promise<boolean>}
   */
  async taxIdExists(taxId, excludeId = null) {
    let query = `SELECT ${FIELDS.ID} FROM ${this.tableName} WHERE tax_id = ?`;
    const params = [taxId];

    if (excludeId) {
      query += ` AND ${FIELDS.ID} != ?`;
      params.push(excludeId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }

  /**
   * 獲取客戶統計
   * @param {number} clientId - 客戶 ID
   * @returns {Promise<Object>}
   */
  async getStats(clientId) {
    // 統計任務數量
    const taskStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM ${TABLES.TASKS}
      WHERE ${FIELDS.CLIENT_ID} = ?
    `).bind(clientId).first();

    // 統計服務數量
    const serviceStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_services,
        SUM(CASE WHEN ${FIELDS.IS_ACTIVE} = 1 THEN 1 ELSE 0 END) as active_services
      FROM ${TABLES.CLIENT_SERVICES}
      WHERE ${FIELDS.CLIENT_ID} = ?
    `).bind(clientId).first();

    return {
      tasks: taskStats || { total_tasks: 0, completed_tasks: 0, in_progress_tasks: 0 },
      services: serviceStats || { total_services: 0, active_services: 0 }
    };
  }
}

export default ClientRepository;

