/**
 * 任務自動生成 Cron Job
 * 執行時間：每月 1 日 00:00
 * 功能：根據客戶服務配置自動生成任務
 */

import { D1Database } from '@cloudflare/workers-types';

/**
 * 月度任務自動生成
 */
export async function generateMonthlyTasks(db: D1Database): Promise<{
  generated: number;
  skipped: number;
  errors: string[];
}> {
  console.log('[Cron] 開始執行月度任務生成...');
  
  const currentMonth = new Date().getMonth() + 1;
  const today = new Date().toISOString().split('T')[0];
  
  // 查詢所有啟用中的客戶服務
  const services = await db.prepare(`
    SELECT cs.*, c.company_name, c.assignee_user_id
    FROM ClientServices cs
    JOIN Clients c ON cs.client_id = c.client_id
    WHERE cs.status = 'active' AND cs.is_deleted = 0
  `).all();
  
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  for (const service of services.results || []) {
    try {
      // 檢查是否在觸發月份
      if (service.trigger_months) {
        const triggerMonths = service.trigger_months.split(',').map((m: string) => parseInt(m));
        if (!triggerMonths.includes(currentMonth)) {
          skipped++;
          continue;
        }
      }
      
      // ⭐ 優先使用客戶專屬模板，其次使用通用模板
      let template;
      
      if (service.custom_template_id) {
        template = await db.prepare(`
          SELECT * FROM TaskTemplates WHERE template_id = ? AND is_deleted = 0
        `).bind(service.custom_template_id).first();
        
        if (template) {
          console.log(`使用客戶專屬模板：${template.template_name}`);
        }
      }
      
      if (!template && service.template_id) {
        template = await db.prepare(`
          SELECT * FROM TaskTemplates WHERE template_id = ? AND is_deleted = 0
        `).bind(service.template_id).first();
      }
      
      if (!template) {
        errors.push(`客戶 ${service.client_id} 服務 ${service.service_id} 缺少任務模板`);
        skipped++;
        continue;
      }
      
      // 計算到期日
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (template.estimated_days || 15));
      const dueDateStr = dueDate.toISOString().split('T')[0];
      
      // 生成任務
      const taskResult = await db.prepare(`
        INSERT INTO ActiveTasks (
          client_service_id, template_id, task_name,
          start_date, due_date, assignee_user_id,
          related_sop_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        service.client_service_id,
        template.template_id,
        `${service.company_name} - ${template.template_name}`,
        today,
        dueDateStr,
        service.assignee_user_id,
        template.related_sop_id || null
      ).run();
      
      const taskId = taskResult.meta?.last_row_id;
      
      // 生成階段
      const stages = await db.prepare(`
        SELECT * FROM TaskStageTemplates 
        WHERE template_id = ? 
        ORDER BY stage_order ASC
      `).bind(template.template_id).all();
      
      for (const stage of stages.results || []) {
        await db.prepare(`
          INSERT INTO ActiveTaskStages (
            task_id, stage_template_id, stage_name, stage_order, status
          ) VALUES (?, ?, ?, ?, 'pending')
        `).bind(
          taskId,
          stage.stage_template_id,
          stage.stage_name,
          stage.stage_order
        ).run();
      }
      
      generated++;
    } catch (error) {
      errors.push(`客戶 ${service.client_id}: ${(error as Error).message}`);
    }
  }
  
  // 記錄執行
  await db.prepare(`
    INSERT INTO CronJobExecutions (
      job_name, execution_date, status, affected_records, details
    ) VALUES (?, ?, 'success', ?, ?)
  `).bind(
    'monthly_task_generation',
    today,
    generated,
    JSON.stringify({ generated, skipped, errors: errors.length })
  ).run();
  
  console.log(`[Cron] 任務生成完成：生成 ${generated} 個，跳過 ${skipped} 個`);
  
  return { generated, skipped, errors };
}

