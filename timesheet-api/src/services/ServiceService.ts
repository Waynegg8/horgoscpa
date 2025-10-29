/**
 * Service Service - 服務項目服務
 */

import { D1Database } from '@cloudflare/workers-types';
import { ServiceRepository, Service } from '../repositories/ServiceRepository';
import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class ServiceService {
  private serviceRepo: ServiceRepository;

  constructor(private db: D1Database) {
    this.serviceRepo = new ServiceRepository(db);
  }

  /**
   * 查詢所有服務項目（含層級結構）
   */
  async getAllServices(): Promise<Service[]> {
    return await this.serviceRepo.findAll();
  }

  /**
   * 新增服務項目（小型事務所彈性設計：所有人可用）
   */
  async createService(
    data: {
      parent_service_id?: number;
      service_name: string;
      description?: string;
      default_price?: number;
      sort_order?: number;
    },
    createdBy: number
  ): Promise<Service> {
    // 驗證必填欄位
    validateRequired(data.service_name, '服務名稱');

    // 檢查名稱是否已存在
    const exists = await this.serviceRepo.existsByName(data.service_name);
    if (exists) {
      throw new ConflictError('服務名稱已存在', 'service_name');
    }

    // ⭐ 驗證層級結構（最多兩層）
    if (data.parent_service_id) {
      const parent = await this.serviceRepo.findById(data.parent_service_id);
      if (!parent) {
        throw new NotFoundError('父服務不存在');
      }
      
      // 禁止三層結構
      if (parent.parent_service_id !== null) {
        throw new ValidationError('服務項目最多只能有兩層結構', 'parent_service_id');
      }
    }

    const service = await this.serviceRepo.create(data);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'Services',
      record_id: service.service_id!.toString(),
      changes: JSON.stringify(data),
    });

    return service;
  }

  /**
   * 更新服務項目
   */
  async updateService(
    serviceId: number,
    updates: {
      service_name?: string;
      description?: string;
      default_price?: number;
      sort_order?: number;
    },
    updatedBy: number
  ): Promise<Service> {
    // 檢查服務是否存在
    const existing = await this.serviceRepo.findById(serviceId);
    if (!existing) {
      throw new NotFoundError('服務項目不存在');
    }

    // 如果更新名稱，檢查是否重複
    if (updates.service_name) {
      const exists = await this.serviceRepo.existsByName(updates.service_name, serviceId);
      if (exists) {
        throw new ConflictError('服務名稱已存在', 'service_name');
      }
    }

    const service = await this.serviceRepo.update(serviceId, updates);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'Services',
      record_id: serviceId.toString(),
      changes: JSON.stringify({ old: existing, new: updates }),
    });

    return service;
  }

  /**
   * 刪除服務項目
   */
  async deleteService(serviceId: number, deletedBy: number): Promise<void> {
    const existing = await this.serviceRepo.findById(serviceId);
    if (!existing) {
      throw new NotFoundError('服務項目不存在');
    }

    // 檢查是否有子服務
    const children = await this.serviceRepo.findChildren(serviceId);
    if (children.length > 0) {
      throw new ForbiddenError('此服務項目有子服務，無法刪除。請先刪除子服務。');
    }

    // 檢查是否有客戶正在使用此服務
    const usageCount = await this.db.prepare(`
      SELECT COUNT(*) as count FROM ClientServices
      WHERE service_id = ? AND is_deleted = 0
    `).bind(serviceId).first<{ count: number }>();

    if ((usageCount?.count || 0) > 0) {
      throw new ForbiddenError('此服務項目正在被客戶使用，無法刪除');
    }

    await this.serviceRepo.delete(serviceId, deletedBy);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'Services',
      record_id: serviceId.toString(),
      changes: JSON.stringify(existing),
    });
  }
}

