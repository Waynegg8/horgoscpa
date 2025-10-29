/**
 * Client Service - 客戶管理服務
 */

import { D1Database } from '@cloudflare/workers-types';
import { ClientRepository, CustomerTagRepository, Client, CustomerTag } from '../repositories/ClientRepository';
import { ValidationError, ConflictError, NotFoundError, ForbiddenError, User } from '../types';
import { validateRequired, validateEmail } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class ClientService {
  private clientRepo: ClientRepository;
  private tagRepo: CustomerTagRepository;

  constructor(private db: D1Database) {
    this.clientRepo = new ClientRepository(db);
    this.tagRepo = new CustomerTagRepository(db);
  }

  /**
   * 查詢客戶列表（員工自動過濾）
   */
  async getClients(
    filters: {
      company_name?: string;
      business_status?: string;
      tag_id?: number;
      limit?: number;
      offset?: number;
      fields?: string[];
    },
    user: User
  ): Promise<{ clients: Client[]; total: number }> {
    // ⭐ 權限控制：員工只能看自己負責的客戶
    const options = { ...filters };
    if (!user.is_admin) {
      options.assignee_user_id = user.user_id;
    }
    
    return await this.clientRepo.findAll(options);
  }

  /**
   * 查詢客戶詳情
   */
  async getClientById(clientId: string, user: User): Promise<Client> {
    const client = await this.clientRepo.findById(clientId);
    
    if (!client) {
      throw new NotFoundError('客戶不存在');
    }
    
    // ⭐ 權限控制：員工只能看自己負責的客戶
    if (!user.is_admin && client.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權查看此客戶');
    }
    
    return client;
  }

  /**
   * 新增客戶（小型事務所彈性設計：所有人可用）
   */
  async createClient(
    data: {
      client_id: string;
      company_name: string;
      tax_registration_number?: string;
      business_status?: '營業中' | '暫停營業' | '已結束營業';
      assignee_user_id?: number;
      phone?: string;
      email?: string;
      address?: string;
      contact_person?: string;
      contact_title?: string;
      client_notes?: string;
      payment_notes?: string;
      tags?: number[];                // 標籤 ID 數組
    },
    createdBy: number,
    user: User
  ): Promise<Client> {
    // 驗證必填欄位
    validateRequired(data.client_id, '統一編號');
    validateRequired(data.company_name, '公司名稱');
    
    // 驗證統一編號格式（8位數字）
    if (!/^\d{8}$/.test(data.client_id)) {
      throw new ValidationError('統一編號必須為 8 位數字', 'client_id');
    }
    
    // 驗證 Email 格式
    if (data.email) {
      validateEmail(data.email, 'Email');
    }
    
    // 檢查統一編號是否已存在
    const exists = await this.clientRepo.existsById(data.client_id);
    if (exists) {
      throw new ConflictError('統一編號已存在', 'client_id');
    }
    
    // ⭐ 小型事務所彈性設計：員工新增客戶時，預設負責人為自己
    const assigneeUserId = data.assignee_user_id || user.user_id;
    
    // 創建客戶
    const client = await this.clientRepo.create({
      ...data,
      assignee_user_id: assigneeUserId,
    });
    
    // 指派標籤
    if (data.tags && data.tags.length > 0) {
      for (const tagId of data.tags) {
        await this.clientRepo.assignTag(client.client_id, tagId, createdBy);
      }
      
      // 重新查詢以獲取完整資料（含標籤）
      const updatedClient = await this.clientRepo.findById(client.client_id);
      if (updatedClient) {
        Object.assign(client, updatedClient);
      }
    }
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'Clients',
      record_id: client.client_id,
      changes: JSON.stringify(data),
    });
    
    return client;
  }

  /**
   * 更新客戶（小型事務所彈性設計：所有人可用）
   */
  async updateClient(
    clientId: string,
    updates: Partial<Client> & { tags?: number[] },
    updatedBy: number,
    user: User
  ): Promise<Client> {
    // 檢查客戶是否存在
    const existing = await this.clientRepo.findById(clientId);
    if (!existing) {
      throw new NotFoundError('客戶不存在');
    }
    
    // ⭐ 權限控制：員工只能編輯自己負責的客戶
    if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權編輯此客戶');
    }
    
    // 驗證格式
    if (updates.email) {
      validateEmail(updates.email, 'Email');
    }
    
    // 處理標籤（如果提供）
    const { tags, ...clientUpdates } = updates;
    
    // 更新客戶基本資料
    let updatedClient = existing;
    if (Object.keys(clientUpdates).length > 0) {
      updatedClient = await this.clientRepo.update(clientId, clientUpdates);
    }
    
    // 更新標籤
    if (tags !== undefined) {
      // 刪除現有標籤
      await this.db.prepare(`
        DELETE FROM ClientTagAssignments
        WHERE client_id = ?
      `).bind(clientId).run();
      
      // 新增新標籤
      for (const tagId of tags) {
        await this.clientRepo.assignTag(clientId, tagId, updatedBy);
      }
      
      // 重新查詢以獲取完整資料
      const refreshed = await this.clientRepo.findById(clientId);
      if (refreshed) {
        updatedClient = refreshed;
      }
    }
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'Clients',
      record_id: clientId,
      changes: JSON.stringify({ old: existing, new: updates }),
    });
    
    return updatedClient;
  }

  /**
   * 刪除客戶（小型事務所彈性設計：所有人可用）
   */
  async deleteClient(clientId: string, deletedBy: number, user: User): Promise<void> {
    const existing = await this.clientRepo.findById(clientId);
    if (!existing) {
      throw new NotFoundError('客戶不存在');
    }
    
    // ⭐ 權限控制：員工只能刪除自己負責的客戶
    if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權刪除此客戶');
    }
    
    // 檢查客戶是否有啟用中的服務
    const activeServices = await this.db.prepare(`
      SELECT COUNT(*) as count FROM ClientServices
      WHERE client_id = ? AND is_deleted = 0
    `).bind(clientId).first<{ count: number }>();
    
    if ((activeServices?.count || 0) > 0) {
      throw new ForbiddenError('客戶有啟用中的服務，無法刪除');
    }
    
    await this.clientRepo.delete(clientId, deletedBy);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'Clients',
      record_id: clientId,
      changes: JSON.stringify(existing),
    });
  }

  /**
   * 獲取所有標籤
   */
  async getAllTags(): Promise<CustomerTag[]> {
    return await this.tagRepo.findAll();
  }

  /**
   * 新增標籤（小型事務所彈性設計：所有人可用）
   */
  async createTag(
    data: {
      tag_name: string;
      tag_color?: string;
      description?: string;
      sort_order?: number;
    },
    createdBy: number
  ): Promise<CustomerTag> {
    validateRequired(data.tag_name, '標籤名稱');
    
    // 檢查名稱是否已存在
    const exists = await this.tagRepo.existsByName(data.tag_name);
    if (exists) {
      throw new ConflictError('標籤名稱已存在', 'tag_name');
    }
    
    const tag = await this.tagRepo.create(data);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'CustomerTags',
      record_id: tag.tag_id!.toString(),
      changes: JSON.stringify(data),
    });
    
    return tag;
  }

  /**
   * 批量更新客戶（僅管理員）
   */
  async batchUpdateClients(
    clientIds: string[],
    updates: {
      business_status?: string;
      assignee_user_id?: number;
    },
    updatedBy: number
  ): Promise<{ updated: number }> {
    const count = await this.clientRepo.batchUpdate(clientIds, updates, updatedBy);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'Clients',
      record_id: `batch:${clientIds.length}`,
      changes: JSON.stringify({ client_ids: clientIds, updates }),
    });
    
    return { updated: count };
  }
}

