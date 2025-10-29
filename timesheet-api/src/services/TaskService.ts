/**
 * Task Service - 任務管理服務
 * 核心功能：任務CRUD、階段順序控制、SOP關聯
 */

import { D1Database } from '@cloudflare/workers-types';
import { ValidationError, NotFoundError, ForbiddenError, User, AppError } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class TaskService {
  constructor(private db: D1Database) {}

  /**
   * 查詢任務列表（員工自動過濾）
   */
  async getTasks(filters: any, user: User): Promise<any> {
    const options = { ...filters };
    if (!user.is_admin) {
      options.assignee_user_id = user.user_id;
    }

    let whereClause = 'WHERE t.is_deleted = 0';
    const params: any[] = [];

    if (options.assignee_user_id) {
      whereClause += ' AND t.assignee_user_id = ?';
      params.push(options.assignee_user_id);
    }

    if (options.status) {
      whereClause += ' AND t.status = ?';
      params.push(options.status);
    }

    const result = await this.db.prepare(`
      SELECT 
        t.*,
        cs.client_id,
        c.company_name,
        s.service_name,
        u.name as assignee_name
      FROM ActiveTasks t
      JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      LEFT JOIN Users u ON t.assignee_user_id = u.user_id
      ${whereClause}
      ORDER BY t.due_date ASC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, options.limit || 50, options.offset || 0).all();

    return result.results || [];
  }

  /**
   * 查詢任務詳情（含階段和SOP）
   * ⚠️ 完整實現：包含通用SOP和客戶專屬SOP的詳細資訊
   */
  async getTaskById(taskId: number, user: User): Promise<any> {
    const task = await this.db.prepare(`
      SELECT 
        t.*,
        cs.client_id,
        c.company_name,
        s.service_name,
        u.name as assignee_name,
        sop1.sop_id as related_sop_id,
        sop1.title as related_sop_title,
        sop1.version as related_sop_version,
        sop2.sop_id as client_specific_sop_id,
        sop2.title as client_specific_sop_title,
        sop2.version as client_specific_sop_version
      FROM ActiveTasks t
      JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      LEFT JOIN Users u ON t.assignee_user_id = u.user_id
      LEFT JOIN SOPDocuments sop1 ON t.related_sop_id = sop1.sop_id
      LEFT JOIN SOPDocuments sop2 ON t.client_specific_sop_id = sop2.sop_id
      WHERE t.task_id = ? AND t.is_deleted = 0
    `).bind(taskId).first<any>();

    if (!task) throw new NotFoundError('任務不存在');

    // 權限控制
    if (!user.is_admin && task.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權查看此任務');
    }

    // 查詢階段
    const stages = await this.db.prepare(`
      SELECT * FROM ActiveTaskStages
      WHERE task_id = ?
      ORDER BY stage_order ASC
    `).bind(taskId).all();

    // ⭐ 格式化響應（符合規格要求）
    const response = {
      task_id: task.task_id,
      task_name: task.task_name,
      client_id: task.client_id,
      company_name: task.company_name,
      service_name: task.service_name,
      status: task.status,
      assignee_user_id: task.assignee_user_id,
      assignee_name: task.assignee_name,
      start_date: task.start_date,
      due_date: task.due_date,
      completed_date: task.completed_date,
      notes: task.notes,
      related_sop: task.related_sop_id ? {
        knowledge_id: task.related_sop_id,
        title: task.related_sop_title,
        version: task.related_sop_version,
      } : null,
      client_specific_sop: task.client_specific_sop_id ? {
        knowledge_id: task.client_specific_sop_id,
        title: task.client_specific_sop_title,
        version: task.client_specific_sop_version,
      } : null,
      stages: stages.results || [],
    };

    return response;
  }

  /**
   * ⭐ 查詢任務關聯的SOP（獨立API）
   */
  async getTaskSOPs(taskId: number, user: User): Promise<any> {
    const task = await this.db.prepare(`
      SELECT 
        t.assignee_user_id,
        t.related_sop_id,
        t.client_specific_sop_id
      FROM ActiveTasks t
      WHERE t.task_id = ? AND t.is_deleted = 0
    `).bind(taskId).first<any>();

    if (!task) throw new NotFoundError('任務不存在');

    // 權限控制
    if (!user.is_admin && task.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權查看此任務');
    }

    // 查詢通用SOP
    const relatedSOP = task.related_sop_id ? await this.db.prepare(`
      SELECT sop_id as knowledge_id, title, content, version, created_at, updated_at
      FROM SOPDocuments
      WHERE sop_id = ? AND is_deleted = 0
    `).bind(task.related_sop_id).first() : null;

    // 查詢客戶專屬SOP
    const clientSpecificSOP = task.client_specific_sop_id ? await this.db.prepare(`
      SELECT sop_id as knowledge_id, title, content, version, created_at, updated_at
      FROM SOPDocuments
      WHERE sop_id = ? AND is_deleted = 0
    `).bind(task.client_specific_sop_id).first() : null;

    return {
      related_sop: relatedSOP,
      client_specific_sop: clientSpecificSOP,
    };
  }

  /**
   * ⭐ 開始階段（含順序驗證）
   */
  async startStage(taskId: number, stageId: number, user: User): Promise<any> {
    const task = await this.db.prepare(`
      SELECT * FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first<any>();

    if (!task) throw new NotFoundError('任務不存在');

    // 權限控制
    if (!user.is_admin && task.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權操作此任務');
    }

    const stage = await this.db.prepare(`
      SELECT * FROM ActiveTaskStages WHERE active_stage_id = ?
    `).bind(stageId).first<any>();

    if (!stage) throw new NotFoundError('階段不存在');

    // ⭐ 檢查順序：必須前一階段已完成
    if (stage.stage_order > 1) {
      const previousStage = await this.db.prepare(`
        SELECT stage_name, status FROM ActiveTaskStages
        WHERE task_id = ? AND stage_order = ?
      `).bind(taskId, stage.stage_order - 1).first<any>();

      if (previousStage && previousStage.status !== 'completed') {
        throw new AppError(
          422,
          'STAGE_ORDER_VIOLATION',
          `請先完成「${previousStage.stage_name}」（階段${stage.stage_order - 1}）`
        );
      }
    }

    // 更新階段狀態
    await this.db.prepare(`
      UPDATE ActiveTaskStages
      SET status = 'in_progress',
          started_at = datetime('now'),
          assignee_user_id = ?
      WHERE active_stage_id = ?
    `).bind(user.user_id, stageId).run();

    // 更新任務狀態為進行中
    await this.db.prepare(`
      UPDATE ActiveTasks
      SET status = 'in_progress', updated_at = datetime('now')
      WHERE task_id = ?
    `).bind(taskId).run();

    return { message: '階段已開始' };
  }

  /**
   * ⭐ 完成階段
   */
  async completeStage(taskId: number, stageId: number, user: User): Promise<any> {
    const task = await this.db.prepare(`
      SELECT * FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first<any>();

    if (!task) throw new NotFoundError('任務不存在');

    // 權限控制
    if (!user.is_admin && task.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權操作此任務');
    }

    const stage = await this.db.prepare(`
      SELECT * FROM ActiveTaskStages WHERE active_stage_id = ?
    `).bind(stageId).first<any>();

    if (!stage) throw new NotFoundError('階段不存在');

    // ⭐ 只能完成進行中的階段
    if (stage.status !== 'in_progress') {
      throw new AppError(
        422,
        'STAGE_NOT_IN_PROGRESS',
        '只能完成「進行中」的階段，請先開始此階段'
      );
    }

    // 完成階段
    await this.db.prepare(`
      UPDATE ActiveTaskStages
      SET status = 'completed', completed_at = datetime('now')
      WHERE active_stage_id = ?
    `).bind(stageId).run();

    // 檢查是否所有階段都完成
    const allStages = await this.db.prepare(`
      SELECT * FROM ActiveTaskStages WHERE task_id = ?
    `).bind(taskId).all();

    const allCompleted = allStages.results?.every(s => s.status === 'completed') || false;

    if (allCompleted) {
      await this.db.prepare(`
        UPDATE ActiveTasks
        SET status = 'completed', 
            completed_date = datetime('now'),
            updated_at = datetime('now')
        WHERE task_id = ?
      `).bind(taskId).run();
    }

    return { message: allCompleted ? '階段已完成，任務全部完成！' : '階段已完成' };
  }

  /**
   * 更新任務
   */
  async updateTask(taskId: number, updates: any, user: User): Promise<any> {
    const task = await this.db.prepare(`
      SELECT * FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first<any>();

    if (!task) throw new NotFoundError('任務不存在');

    // 權限控制
    if (!user.is_admin && task.assignee_user_id !== user.user_id) {
      throw new ForbiddenError('無權更新此任務');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.due_date);
    }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(taskId);

      await this.db.prepare(`
        UPDATE ActiveTasks SET ${fields.join(', ')} WHERE task_id = ?
      `).bind(...values).run();
    }

    return await this.getTaskById(taskId, user);
  }
}

