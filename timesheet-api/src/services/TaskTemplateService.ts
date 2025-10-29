/**
 * Task Template Service - 任務模板管理服務
 */

import { D1Database } from '@cloudflare/workers-types';
import { ValidationError, NotFoundError, ConflictError, User } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class TaskTemplateService {
  constructor(private db: D1Database) {}

  async getTemplates(filters: any = {}): Promise<any[]> {
    let whereClause = 'WHERE is_deleted = 0';
    const params: any[] = [];

    if (filters.service_id) {
      whereClause += ' AND service_id = ?';
      params.push(filters.service_id);
    }

    if (filters.is_client_specific !== undefined) {
      whereClause += ' AND is_client_specific = ?';
      params.push(filters.is_client_specific ? 1 : 0);
    }

    if (filters.specific_client_id) {
      whereClause += ' AND specific_client_id = ?';
      params.push(filters.specific_client_id);
    }

    const result = await this.db.prepare(`
      SELECT tt.*, s.service_name
      FROM TaskTemplates tt
      LEFT JOIN Services s ON tt.service_id = s.service_id
      ${whereClause}
      ORDER BY tt.created_at DESC
    `).bind(...params).all();

    return result.results || [];
  }

  async createTemplate(data: any, user: User): Promise<any> {
    validateRequired(data.template_name, '模板名稱');

    await this.db.prepare(`
      INSERT INTO TaskTemplates (
        template_name, service_id, description, estimated_days,
        related_sop_id, is_client_specific, specific_client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.template_name,
      data.service_id || null,
      data.description || null,
      data.estimated_days || null,
      data.related_sop_id || null,
      data.is_client_specific ? 1 : 0,
      data.specific_client_id || null
    ).run();

    const template = await this.db.prepare(`
      SELECT * FROM TaskTemplates WHERE template_name = ? ORDER BY template_id DESC LIMIT 1
    `).bind(data.template_name).first();

    // 創建階段
    if (data.stages && Array.isArray(data.stages)) {
      for (const stage of data.stages) {
        await this.db.prepare(`
          INSERT INTO TaskStageTemplates (
            template_id, stage_name, stage_order, estimated_days, description
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(
          template.template_id,
          stage.stage_name,
          stage.stage_order,
          stage.estimated_days || null,
          stage.description || null
        ).run();
      }
    }

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'CREATE',
      table_name: 'TaskTemplates',
      record_id: template.template_id.toString(),
      changes: JSON.stringify(data),
    });

    return template;
  }

  async updateTemplate(templateId: number, updates: any, user: User): Promise<any> {
    const existing = await this.db.prepare(`
      SELECT * FROM TaskTemplates WHERE template_id = ? AND is_deleted = 0
    `).bind(templateId).first();

    if (!existing) throw new NotFoundError('模板不存在');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.template_name) {
      fields.push('template_name = ?');
      values.push(updates.template_name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.estimated_days !== undefined) {
      fields.push('estimated_days = ?');
      values.push(updates.estimated_days);
    }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(templateId);

      await this.db.prepare(`
        UPDATE TaskTemplates SET ${fields.join(', ')} WHERE template_id = ?
      `).bind(...values).run();
    }

    return await this.db.prepare(`
      SELECT * FROM TaskTemplates WHERE template_id = ?
    `).bind(templateId).first();
  }

  async deleteTemplate(templateId: number, user: User): Promise<void> {
    await this.db.prepare(`
      UPDATE TaskTemplates
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE template_id = ?
    `).bind(user.user_id, templateId).run();
  }

  async copyTemplate(templateId: number, newName: string, user: User): Promise<any> {
    const original = await this.db.prepare(`
      SELECT * FROM TaskTemplates WHERE template_id = ? AND is_deleted = 0
    `).bind(templateId).first<any>();

    if (!original) throw new NotFoundError('原模板不存在');

    // 複製模板
    await this.db.prepare(`
      INSERT INTO TaskTemplates (
        template_name, service_id, description, estimated_days,
        related_sop_id, is_client_specific, specific_client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newName,
      original.service_id,
      original.description,
      original.estimated_days,
      original.related_sop_id,
      original.is_client_specific,
      original.specific_client_id
    ).run();

    const newTemplate = await this.db.prepare(`
      SELECT * FROM TaskTemplates WHERE template_name = ? ORDER BY template_id DESC LIMIT 1
    `).bind(newName).first<any>();

    // 複製階段
    const stages = await this.db.prepare(`
      SELECT * FROM TaskStageTemplates WHERE template_id = ? ORDER BY stage_order
    `).bind(templateId).all();

    for (const stage of stages.results || []) {
      await this.db.prepare(`
        INSERT INTO TaskStageTemplates (
          template_id, stage_name, stage_order, estimated_days, description
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        newTemplate.template_id,
        stage.stage_name,
        stage.stage_order,
        stage.estimated_days,
        stage.description
      ).run();
    }

    return newTemplate;
  }
}

