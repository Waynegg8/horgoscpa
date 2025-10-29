/**
 * ClientService Lifecycle Service - 服務生命週期管理服務
 * 負責服務暫停、恢復、取消的業務邏輯
 */

import { D1Database } from '@cloudflare/workers-types';
import { ValidationError, NotFoundError, ForbiddenError, User } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class ClientServiceLifecycleService {
  constructor(private db: D1Database) {}

  /**
   * 暫停服務（小型事務所彈性設計：所有人可用）
   */
  async suspendService(
    serviceId: number,
    data: {
      reason: string;
      notes?: string;
    },
    user: User
  ): Promise<any> {
    validateRequired(data.reason, '暫停原因');

    // 1. 查詢服務
    const service = await this.db.prepare(`
      SELECT cs.*, c.company_name, s.service_name
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!service) {
      throw new NotFoundError('服務不存在');
    }

    // 權限控制：員工只能操作自己負責客戶的服務
    if (!user.is_admin) {
      const client = await this.db.prepare(`
        SELECT assignee_user_id FROM Clients WHERE client_id = ?
      `).bind(service.client_id).first<{ assignee_user_id: number }>();

      if (client?.assignee_user_id !== user.user_id) {
        throw new ForbiddenError('無權操作此客戶的服務');
      }
    }

    if (service.status === 'suspended') {
      throw new ValidationError('服務已處於暫停狀態', 'status');
    }

    if (service.status === 'cancelled') {
      throw new ValidationError('已取消的服務無法暫停', 'status');
    }

    // 2. 更新狀態為暫停
    await this.db.prepare(`
      UPDATE ClientServices
      SET status = 'suspended',
          suspended_at = datetime('now'),
          suspension_reason = ?,
          updated_at = datetime('now')
      WHERE client_service_id = ?
    `).bind(data.reason, serviceId).run();

    // 3. 記錄變更歷史
    await this.db.prepare(`
      INSERT INTO ServiceChangeHistory (
        client_service_id, old_status, new_status, changed_by, reason, notes
      ) VALUES (?, ?, 'suspended', ?, ?, ?)
    `).bind(
      serviceId,
      service.status,
      user.user_id,
      data.reason,
      data.notes || null
    ).run();

    // 4. 暫停相關未完成任務
    await this.db.prepare(`
      UPDATE ActiveTasks
      SET status = 'suspended',
          notes = COALESCE(notes || '; ', '') || '服務已暫停: ' || ?
      WHERE client_service_id = ?
        AND status NOT IN ('completed', 'cancelled')
    `).bind(data.reason, serviceId).run();

    // 5. 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'ClientServices',
      record_id: serviceId.toString(),
      changes: JSON.stringify({
        action: 'suspend',
        old_status: service.status,
        new_status: 'suspended',
        reason: data.reason,
      }),
    });

    return {
      client_service_id: serviceId,
      company_name: service.company_name,
      service_name: service.service_name,
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      message: '服務已暫停，相關任務將不再自動生成',
    };
  }

  /**
   * 恢復服務（小型事務所彈性設計：所有人可用）
   */
  async resumeService(
    serviceId: number,
    data: {
      notes?: string;
    },
    user: User
  ): Promise<any> {
    // 1. 查詢服務
    const service = await this.db.prepare(`
      SELECT cs.*, c.company_name, s.service_name
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!service) {
      throw new NotFoundError('服務不存在');
    }

    // 權限控制
    if (!user.is_admin) {
      const client = await this.db.prepare(`
        SELECT assignee_user_id FROM Clients WHERE client_id = ?
      `).bind(service.client_id).first<{ assignee_user_id: number }>();

      if (client?.assignee_user_id !== user.user_id) {
        throw new ForbiddenError('無權操作此客戶的服務');
      }
    }

    if (service.status !== 'suspended') {
      throw new ValidationError('只能恢復已暫停的服務', 'status');
    }

    // 2. 更新狀態為活躍
    await this.db.prepare(`
      UPDATE ClientServices
      SET status = 'active',
          resumed_at = datetime('now'),
          suspended_at = NULL,
          suspension_reason = NULL,
          updated_at = datetime('now')
      WHERE client_service_id = ?
    `).bind(serviceId).run();

    // 3. 記錄變更歷史
    await this.db.prepare(`
      INSERT INTO ServiceChangeHistory (
        client_service_id, old_status, new_status, changed_by, notes
      ) VALUES (?, 'suspended', 'active', ?, ?)
    `).bind(serviceId, user.user_id, data.notes || null).run();

    // 4. 恢復相關任務（可選）
    await this.db.prepare(`
      UPDATE ActiveTasks
      SET status = 'pending',
          notes = COALESCE(notes || '; ', '') || '服務已恢復'
      WHERE client_service_id = ?
        AND status = 'suspended'
    `).bind(serviceId).run();

    // 5. 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'ClientServices',
      record_id: serviceId.toString(),
      changes: JSON.stringify({
        action: 'resume',
        old_status: 'suspended',
        new_status: 'active',
        notes: data.notes,
      }),
    });

    return {
      client_service_id: serviceId,
      company_name: service.company_name,
      service_name: service.service_name,
      status: 'active',
      resumed_at: new Date().toISOString(),
      message: '服務已恢復，將於下個週期重新生成任務',
    };
  }

  /**
   * 取消服務（僅管理員）
   */
  async cancelService(
    serviceId: number,
    data: {
      reason: string;
      cancel_pending_tasks: boolean;
      notes?: string;
    },
    user: User
  ): Promise<any> {
    validateRequired(data.reason, '取消原因');

    // 權限檢查：僅管理員
    if (!user.is_admin) {
      throw new ForbiddenError('取消服務僅限管理員操作');
    }

    // 1. 查詢服務
    const service = await this.db.prepare(`
      SELECT cs.*, c.company_name, s.service_name
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!service) {
      throw new NotFoundError('服務不存在');
    }

    if (service.status === 'cancelled') {
      throw new ValidationError('服務已處於取消狀態', 'status');
    }

    // 2. 更新狀態為取消
    await this.db.prepare(`
      UPDATE ClientServices
      SET status = 'cancelled',
          cancelled_at = datetime('now'),
          cancelled_by = ?,
          updated_at = datetime('now')
      WHERE client_service_id = ?
    `).bind(user.user_id, serviceId).run();

    // 3. 記錄變更歷史
    await this.db.prepare(`
      INSERT INTO ServiceChangeHistory (
        client_service_id, old_status, new_status, changed_by, reason, notes
      ) VALUES (?, ?, 'cancelled', ?, ?, ?)
    `).bind(
      serviceId,
      service.status,
      user.user_id,
      data.reason,
      data.notes || null
    ).run();

    // 4. 處理相關任務
    let tasksCancelled = 0;
    if (data.cancel_pending_tasks) {
      const result = await this.db.prepare(`
        UPDATE ActiveTasks
        SET status = 'cancelled',
            cancelled_at = datetime('now'),
            notes = COALESCE(notes || '; ', '') || '服務已取消: ' || ?
        WHERE client_service_id = ?
          AND status NOT IN ('completed', 'cancelled')
      `).bind(data.reason, serviceId).run();

      tasksCancelled = result.meta?.changes || 0;
    }

    // 5. 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'ClientServices',
      record_id: serviceId.toString(),
      changes: JSON.stringify({
        action: 'cancel',
        old_status: service.status,
        new_status: 'cancelled',
        reason: data.reason,
        tasks_cancelled: tasksCancelled,
      }),
    });

    return {
      client_service_id: serviceId,
      company_name: service.company_name,
      service_name: service.service_name,
      status: 'cancelled',
      tasks_cancelled: tasksCancelled,
      message: '服務已取消',
    };
  }

  /**
   * 查詢服務變更歷史
   */
  async getServiceHistory(serviceId: number, user: User): Promise<any[]> {
    // 查詢服務
    const service = await this.db.prepare(`
      SELECT cs.client_id, c.assignee_user_id
      FROM ClientServices cs
      JOIN Clients c ON cs.client_id = c.client_id
      WHERE cs.client_service_id = ? AND cs.is_deleted = 0
    `).bind(serviceId).first<any>();

    if (!service) {
      throw new NotFoundError('服務不存在');
    }

    // 權限控制
    if (!user.is_admin && service.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權查看此服務的歷史');
    }

    // 查詢變更歷史
    const result = await this.db.prepare(`
      SELECT 
        sch.*,
        u.name as changed_by_name
      FROM ServiceChangeHistory sch
      LEFT JOIN Users u ON sch.changed_by = u.user_id
      WHERE sch.client_service_id = ?
      ORDER BY sch.changed_at DESC
    `).bind(serviceId).all();

    return result.results || [];
  }
}

