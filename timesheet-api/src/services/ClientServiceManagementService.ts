/**
 * ClientService Management Service - 客戶服務管理服務
 * 負責客戶服務的 CRUD（設定哪些客戶訂閱哪些服務）
 */

import { D1Database } from '@cloudflare/workers-types';
import { ValidationError, NotFoundError, ForbiddenError, User } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class ClientServiceManagementService {
  constructor(private db: D1Database) {}

  async getClientServices(filters: any, user: User): Promise<any[]> {
    let whereClause = 'WHERE cs.is_deleted = 0';
    const params: any[] = [];

    if (filters.client_id) {
      whereClause += ' AND cs.client_id = ?';
      params.push(filters.client_id);
    }

    if (filters.status) {
      whereClause += ' AND cs.status = ?';
      params.push(filters.status);
    }

    // 員工只能看自己負責客戶的服務
    if (!user.is_admin) {
      whereClause += ' AND c.assignee_user_id = ?';
      params.push(user.user_id);
    }

    const result = await this.db.prepare(`
      SELECT 
        cs.*,
        c.company_name,
        s.service_name,
        ft.name as frequency_name,
        tt.template_name
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      JOIN ServiceFrequencyTypes ft ON cs.frequency_id = ft.frequency_id
      LEFT JOIN TaskTemplates tt ON cs.template_id = tt.template_id
      ${whereClause}
      ORDER BY cs.created_at DESC
    `).bind(...params).all();

    return result.results || [];
  }

  async createClientService(data: any, user: User): Promise<any> {
    validateRequired(data.client_id, '客戶ID');
    validateRequired(data.service_id, '服務ID');
    validateRequired(data.frequency_id, '週期ID');
    validateRequired(data.start_date, '開始日期');

    // 計算觸發月份
    const frequency = await this.db.prepare(`
      SELECT * FROM ServiceFrequencyTypes WHERE frequency_id = ?
    `).bind(data.frequency_id).first<any>();

    let triggerMonths = '';
    if (frequency) {
      if (frequency.months_interval === 1) {
        triggerMonths = '1,2,3,4,5,6,7,8,9,10,11,12';
      } else if (frequency.months_interval === 2) {
        triggerMonths = '1,3,5,7,9,11';
      } else if (frequency.months_interval === 3) {
        triggerMonths = '1,4,7,10';
      } else if (frequency.months_interval === 6) {
        triggerMonths = '1,7';
      } else if (frequency.months_interval === 12) {
        triggerMonths = '1';
      }
    }

    await this.db.prepare(`
      INSERT INTO ClientServices (
        client_id, service_id, frequency_id, template_id,
        custom_template_id, trigger_months, start_date, end_date,
        price, billing_cycle, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      data.client_id,
      data.service_id,
      data.frequency_id,
      data.template_id || null,
      data.custom_template_id || null,
      triggerMonths,
      data.start_date,
      data.end_date || null,
      data.price || null,
      data.billing_cycle || 'monthly',
      data.notes || null
    ).run();

    const clientService = await this.db.prepare(`
      SELECT * FROM ClientServices 
      WHERE client_id = ? AND service_id = ?
      ORDER BY client_service_id DESC LIMIT 1
    `).bind(data.client_id, data.service_id).first();

    return clientService;
  }

  async updateClientService(serviceId: number, updates: any, user: User): Promise<any> {
    const existing = await this.db.prepare(`
      SELECT cs.*, c.assignee_user_id
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!existing) throw new NotFoundError('客戶服務不存在');

    // 權限控制
    if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權更新此客戶的服務');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.template_id !== undefined) {
      fields.push('template_id = ?');
      values.push(updates.template_id);
    }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(serviceId);

      await this.db.prepare(`
        UPDATE ClientServices SET ${fields.join(', ')} WHERE client_service_id = ?
      `).bind(...values).run();
    }

    return await this.db.prepare(`
      SELECT * FROM ClientServices WHERE client_service_id = ?
    `).bind(serviceId).first();
  }

  async deleteClientService(serviceId: number, user: User): Promise<void> {
    const existing = await this.db.prepare(`
      SELECT cs.*, c.assignee_user_id
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!existing) throw new NotFoundError('客戶服務不存在');

    // 權限控制
    if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權刪除此客戶的服務');
    }

    await this.db.prepare(`
      UPDATE ClientServices
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE client_service_id = ?
    `).bind(user.user_id, serviceId).run();
  }

  async getClientServices(clientId: string, user: User): Promise<any[]> {
    // 權限控制
    const client = await this.db.prepare(`
      SELECT assignee_user_id FROM Clients WHERE client_id = ?
    `).bind(clientId).first<{ assignee_user_id: number }>();

    if (!user.is_admin && client?.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權查看此客戶的服務');
    }

    const result = await this.db.prepare(`
      SELECT 
        cs.*,
        s.service_name,
        ft.name as frequency_name
      FROM ClientServices cs
      JOIN Services s ON cs.service_id = s.service_id
      JOIN ServiceFrequencyTypes ft ON cs.frequency_id = ft.frequency_id
      WHERE cs.client_id = ? AND cs.is_deleted = 0
      ORDER BY cs.created_at DESC
    `).bind(clientId).all();

    return result.results || [];
  }

  async getAvailableTemplates(clientId: string, serviceId?: number): Promise<any> {
    // 通用模板
    const generalTemplates = await this.db.prepare(`
      SELECT * FROM TaskTemplates
      WHERE is_client_specific = 0 AND is_deleted = 0
        ${serviceId ? 'AND (service_id = ? OR service_id IS NULL)' : ''}
      ORDER BY template_name
    `).bind(...(serviceId ? [serviceId] : [])).all();

    // 客戶專屬模板
    const clientSpecificTemplates = await this.db.prepare(`
      SELECT * FROM TaskTemplates
      WHERE is_client_specific = 1 AND specific_client_id = ? AND is_deleted = 0
        ${serviceId ? 'AND (service_id = ? OR service_id IS NULL)' : ''}
      ORDER BY template_name
    `).bind(clientId, ...(serviceId ? [serviceId] : [])).all();

    return {
      general_templates: generalTemplates.results || [],
      client_specific_templates: clientSpecificTemplates.results || [],
    };
  }
}

