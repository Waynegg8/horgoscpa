/**
 * Base Repository
 * 所有 Repository 的基礎類，提供標準的 CRUD 操作
 * 
 * 職責：
 * - 提供基礎的資料庫操作方法
 * - 標準化查詢方式
 * - 統一錯誤處理
 * 
 * 不負責：
 * - 業務邏輯（應在 Service 層）
 * - HTTP 處理（應在 Handler 層）
 */

export class BaseRepository {
  /**
   * 構造函數
   * @param {Object} db - D1 Database 實例
   * @param {string} tableName - 表名
   */
  constructor(db, tableName) {
    if (!db) {
      throw new Error('Database instance is required');
    }
    if (!tableName) {
      throw new Error('Table name is required');
    }
    
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * 查詢所有記錄
   * @param {Object} filters - 過濾條件
   * @param {Object} options - 查詢選項（排序、分頁等）
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}, options = {}) {
    const { orderBy = 'created_at', order = 'DESC', limit, offset } = options;
    
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];

    // 構建 WHERE 條件
    const conditions = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // 添加排序
    query += ` ORDER BY ${orderBy} ${order}`;

    // 添加分頁
    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
      
      if (offset) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  /**
   * 根據 ID 查詢單個記錄
   * @param {number} id - 記錄 ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .first();
    
    return result;
  }

  /**
   * 根據條件查詢單個記錄
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Object|null>}
   */
  async findOne(filters = {}) {
    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length === 0) {
      throw new Error('At least one filter condition is required');
    }

    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const result = await this.db.prepare(query).bind(...params).first();
    
    return result;
  }

  /**
   * 創建記錄
   * @param {Object} data - 記錄數據
   * @returns {Promise<number>} 新記錄的 ID
   */
  async create(data) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Data is required for create operation');
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
    `;

    const result = await this.db.prepare(query).bind(...values).run();
    
    if (!result.success) {
      throw new Error('Failed to create record');
    }

    return result.meta.last_row_id;
  }

  /**
   * 更新記錄
   * @param {number} id - 記錄 ID
   * @param {Object} data - 更新數據
   * @returns {Promise<Object>} 更新後的記錄
   */
  async update(id, data) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Data is required for update operation');
    }

    // 添加 updated_at
    data.updated_at = new Date().toISOString();

    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const query = `
      UPDATE ${this.tableName}
      SET ${sets}
      WHERE id = ?
    `;

    const result = await this.db.prepare(query).bind(...values).run();
    
    if (!result.success) {
      throw new Error('Failed to update record');
    }

    return this.findById(id);
  }

  /**
   * 刪除記錄（硬刪除）
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.prepare(query).bind(id).run();
    
    return result.success;
  }

  /**
   * 軟刪除（推薦使用）
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async softDelete(id) {
    return this.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString()
    });
  }

  /**
   * 統計記錄數量
   * @param {Object} filters - 過濾條件
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    const conditions = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.count || 0;
  }

  /**
   * 檢查記錄是否存在
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const result = await this.db
      .prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`)
      .bind(id)
      .first();
    
    return !!result;
  }

  /**
   * 批量創建
   * @param {Array<Object>} records - 記錄數組
   * @returns {Promise<Array<number>>} 新記錄的 ID 數組
   */
  async batchCreate(records) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Records array is required');
    }

    const ids = [];
    
    // 使用事務
    for (const record of records) {
      const id = await this.create(record);
      ids.push(id);
    }

    return ids;
  }

  /**
   * 執行原始 SQL 查詢
   * @param {string} query - SQL 查詢語句
   * @param {Array} params - 參數
   * @returns {Promise<Object>}
   */
  async raw(query, params = []) {
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  /**
   * 執行原始 SQL（單條記錄）
   * @param {string} query - SQL 查詢語句
   * @param {Array} params - 參數
   * @returns {Promise<Object|null>}
   */
  async rawFirst(query, params = []) {
    const result = await this.db.prepare(query).bind(...params).first();
    return result;
  }

  /**
   * 驗證必填欄位
   * @protected
   */
  _validateRequired(data, requiredFields) {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new Error(`欄位 ${field} 為必填`);
      }
    }
  }

  /**
   * 驗證欄位類型
   * @protected
   */
  _validateTypes(data, typeMap) {
    for (const [field, expectedType] of Object.entries(typeMap)) {
      if (data[field] !== undefined) {
        const actualType = typeof data[field];
        if (actualType !== expectedType) {
          throw new Error(`欄位 ${field} 類型錯誤，期望 ${expectedType}，實際 ${actualType}`);
        }
      }
    }
  }
}

export default BaseRepository;

