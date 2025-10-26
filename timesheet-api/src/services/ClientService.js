/**
 * Client Service
 * 負責客戶相關的業務邏輯
 */

import { ClientRepository } from '../repositories/ClientRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/error.middleware.js';
import { validate } from '../utils/validation.util.js';
import { CLIENT_STATUS } from '../config/constants.js';

export class ClientService {
  constructor(db) {
    this.repository = new ClientRepository(db);
  }

  /**
   * 獲取客戶列表
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>}
   */
  async getList(options = {}) {
    const { page = 1, pageSize = 20, status, region, search } = options;

    // 構建過濾條件
    const filters = {};
    if (status) filters.status = status;
    if (region) filters.region = region;

    // 查詢數據
    let allClients = await this.repository.findAll(filters);

    // 搜尋過濾
    if (search) {
      const searchLower = search.toLowerCase();
      allClients = allClients.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        (client.tax_id && client.tax_id.includes(searchLower))
      );
    }

    // 分頁
    const total = allClients.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const clients = allClients.slice(start, end);

    return {
      data: clients,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 獲取客戶詳情（帶服務）
   * @param {number} id - 客戶 ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const client = await this.repository.findByIdWithServices(id);
    
    if (!client) {
      throw new NotFoundError('客戶不存在');
    }

    // 獲取統計信息
    const stats = await this.repository.getStats(id);
    client.stats = stats;

    return client;
  }

  /**
   * 創建客戶
   * @param {Object} data - 客戶數據
   * @param {Object} context - 上下文（當前用戶等）
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    // 驗證數據
    this._validateClientData(data);

    // 檢查名稱是否重複
    if (await this.repository.nameExists(data.name)) {
      throw new ConflictError(`客戶名稱「${data.name}」已存在`);
    }

    // 檢查統一編號是否重複
    if (data.tax_id && await this.repository.taxIdExists(data.tax_id)) {
      throw new ConflictError(`統一編號「${data.tax_id}」已存在`);
    }

    // 設置默認值
    if (!data.status) {
      data.status = CLIENT_STATUS.ACTIVE;
    }

    // 創建記錄
    const id = await this.repository.create(data);

    // 記錄操作日誌（可選）
    console.log(`[ClientService] Client created: ${id} by user ${context?.user?.id}`);

    // 返回完整記錄
    return this.repository.findById(id);
  }

  /**
   * 更新客戶
   * @param {number} id - 客戶 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    // 檢查客戶是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('客戶不存在');
    }

    // 驗證數據（部分驗證）
    if (data.name) {
      validate(data).required('name').throwIfFailed();
      
      // 檢查名稱是否重複
      if (await this.repository.nameExists(data.name, id)) {
        throw new ConflictError(`客戶名稱「${data.name}」已存在`);
      }
    }

    // 檢查統一編號是否重複
    if (data.tax_id && await this.repository.taxIdExists(data.tax_id, id)) {
      throw new ConflictError(`統一編號「${data.tax_id}」已存在`);
    }

    // 執行更新
    const updated = await this.repository.update(id, data);

    // 記錄操作日誌
    console.log(`[ClientService] Client updated: ${id} by user ${context?.user?.id}`);

    return updated;
  }

  /**
   * 刪除客戶（軟刪除）
   * @param {number} id - 客戶 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    // 檢查客戶是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('客戶不存在');
    }

    // 檢查是否有關聯的啟用服務
    const activeServices = await this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM client_services 
      WHERE client_id = ? AND is_active = 1
    `).bind(id).first();

    if (activeServices.count > 0) {
      throw new ConflictError('客戶有啟用的服務，無法刪除。請先停用所有服務。');
    }

    // 執行軟刪除
    await this.repository.softDelete(id);

    // 記錄操作日誌
    console.log(`[ClientService] Client deleted: ${id} by user ${context?.user?.id}`);

    return true;
  }

  /**
   * 驗證客戶數據
   * @private
   */
  _validateClientData(data) {
    const validator = validate(data)
      .required('name', '客戶名稱為必填');

    // 驗證統一編號（如果提供）
    if (data.tax_id) {
      validator.taiwanTaxId('tax_id');
    }

    // 驗證電話（如果提供）
    if (data.phone) {
      validator.taiwanPhone('phone');
    }

    // 驗證 Email（如果提供）
    if (data.email) {
      validator.email('email');
    }

    // 驗證狀態
    if (data.status) {
      validator.enum('status', Object.values(CLIENT_STATUS));
    }

    validator.throwIfFailed();
  }
}

export default ClientService;

