/**
 * 任务自动生成器
 * 根据 ServiceComponents 配置自动生成任务
 */

/**
 * 计算截止日期
 */
function calculateDueDate(component, targetYear, targetMonth) {
  const dueRule = component.due_date_rule;
  const dueValue = component.due_date_value;
  const offsetDays = component.due_date_offset_days || 0;
  
  let dueDate;
  
  switch (dueRule) {
    case 'end_of_month':
      // 当月最后一天
      dueDate = new Date(targetYear, targetMonth + 1, 0);
      break;
      
    case 'specific_day':
      // 当月指定日
      dueDate = new Date(targetYear, targetMonth, dueValue || 1);
      break;
      
    case 'next_month_day':
      // 次月指定日
      dueDate = new Date(targetYear, targetMonth + 1, dueValue || 1);
      break;
      
    case 'days_after_start':
      // 相对天数
      dueDate = new Date(targetYear, targetMonth, 1);
      dueDate.setDate(dueDate.getDate() + (dueValue || 30));
      break;
      
    default:
      // 默认：当月最后一天
      dueDate = new Date(targetYear, targetMonth + 1, 0);
  }
  
  // 应用微调天数
  if (offsetDays) {
    dueDate.setDate(dueDate.getDate() + offsetDays);
  }
  
  return dueDate;
}

/**
 * 检查组件是否应该在指定月份生成任务
 */
function shouldGenerateInMonth(component, month) {
  const frequency = component.delivery_frequency;
  const deliveryMonths = component.delivery_months ? JSON.parse(component.delivery_months) : null;
  
  // 如果指定了具体月份，检查是否在列表中
  if (deliveryMonths && Array.isArray(deliveryMonths)) {
    return deliveryMonths.includes(month + 1); // month is 0-based, deliveryMonths is 1-based
  }
  
  // 根据频率判断
  switch (frequency) {
    case 'monthly':
      return true; // 每月都生成
      
    case 'bi-monthly':
      return (month + 1) % 2 === 1; // 奇数月
      
    case 'quarterly':
      return [0, 3, 6, 9].includes(month); // 1,4,7,10月
      
    case 'yearly':
      return month === 0; // 仅1月
      
    case 'one-time':
      return false; // 一次性服务需要手动创建
      
    default:
      return false;
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 生成任务名称
 */
function generateTaskName(component, client, targetYear, targetMonth) {
  const monthStr = `${targetYear}年${targetMonth + 1}月`;
  const compName = component.component_name || component.service_name || '服务';
  const clientName = client.company_name || '客户';
  
  return `${clientName} - ${monthStr}${compName}`;
}

/**
 * 从模板复制阶段
 */
async function copyStagesFromTemplate(env, taskId, templateId) {
  if (!templateId) return;
  
  try {
    const stages = await env.DATABASE.prepare(`
      SELECT stage_name, stage_order, description, estimated_hours
      FROM TaskTemplateStages
      WHERE template_id = ?
      ORDER BY stage_order
    `).bind(templateId).all();
    
    for (const stage of stages.results || []) {
      await env.DATABASE.prepare(`
        INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status)
        VALUES (?, ?, ?, 'pending')
      `).bind(taskId, stage.stage_name, stage.stage_order).run();
    }
  } catch (err) {
    console.error('复制任务阶段失败:', err);
  }
}

/**
 * 主函数：生成所有需要的任务
 */
export async function generateTasksForComponents(env, targetDate = null) {
  const now = targetDate ? new Date(targetDate) : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  console.log(`[任务生成器] 开始检查 ${currentYear}-${currentMonth + 1} 的任务`);
  
  const result = {
    checked: 0,
    generated: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // 获取所有启用的服务组成部分
    const components = await env.DATABASE.prepare(`
      SELECT 
        sc.*,
        cs.client_id,
        c.company_name,
        c.assignee_user_id,
        s.service_name
      FROM ServiceComponents sc
      JOIN ClientServices cs ON sc.client_service_id = cs.client_service_id
      JOIN Clients c ON cs.client_id = c.client_id
      LEFT JOIN Services s ON sc.service_id = s.service_id
      WHERE sc.is_active = 1 
        AND cs.is_deleted = 0
        AND c.is_deleted = 0
        AND sc.auto_generate_task = 1
        AND cs.status = 'active'
    `).all();
    
    console.log(`[任务生成器] 找到 ${components.results.length} 个服务组成部分`);
    
    for (const component of components.results || []) {
      result.checked++;
      
      // 检查是否应该在这个月生成
      if (!shouldGenerateInMonth(component, currentMonth)) {
        result.skipped++;
        continue;
      }
      
      // 计算截止日期
      const dueDate = calculateDueDate(component, currentYear, currentMonth);
      const dueDateStr = formatDate(dueDate);
      
      // 计算任务应该生成的日期（提前N天）
      const advanceDays = component.advance_days || 7;
      const generateDate = new Date(dueDate);
      generateDate.setDate(generateDate.getDate() - advanceDays);
      
      // 如果还没到生成日期，跳过
      if (now < generateDate) {
        result.skipped++;
        continue;
      }
      
      // 检查是否已经生成过（避免重复）
      const existing = await env.DATABASE.prepare(`
        SELECT task_id FROM ActiveTasks
        WHERE component_id = ?
          AND due_date = ?
          AND is_deleted = 0
      `).bind(component.component_id, dueDateStr).first();
      
      if (existing) {
        console.log(`[任务生成器] 任务已存在: ${component.component_name} - ${dueDateStr}`);
        result.skipped++;
        continue;
      }
      
      // 生成任务
      try {
        const taskName = generateTaskName(
          component,
          { company_name: component.company_name },
          currentYear,
          currentMonth
        );
        
        const startDateStr = formatDate(now);
        
        // 设置服务归属月份（格式：YYYY-MM）
        const serviceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const insertResult = await env.DATABASE.prepare(`
          INSERT INTO ActiveTasks (
            client_service_id,
            component_id,
            template_id,
            task_name,
            start_date,
            due_date,
            service_month,
            status,
            assignee_user_id,
            notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(
          component.client_service_id,
          component.component_id,
          component.task_template_id || null,
          taskName,
          startDateStr,
          dueDateStr,
          serviceMonth,
          component.assignee_user_id || null,
          `由系統於 ${startDateStr} 自動生成`
        ).run();
        
        const taskId = insertResult.meta.last_row_id;
        
        // 从模板复制阶段
        if (component.task_template_id) {
          await copyStagesFromTemplate(env, taskId, component.task_template_id);
        }
        
        console.log(`[任务生成器] 已生成任务: ${taskName} (ID: ${taskId})`);
        result.generated++;
        
      } catch (err) {
        console.error(`[任务生成器] 生成任务失败:`, err);
        result.errors.push({
          component_id: component.component_id,
          component_name: component.component_name,
          error: String(err)
        });
      }
    }
    
  } catch (err) {
    console.error('[任务生成器] 执行失败:', err);
    throw err;
  }
  
  console.log(`[任务生成器] 完成: 检查 ${result.checked}, 生成 ${result.generated}, 跳过 ${result.skipped}, 错误 ${result.errors.length}`);
  
  return result;
}

/**
 * API端点：手动触发任务生成
 * POST /internal/api/v1/admin/tasks/generate-from-components
 */
export async function handleManualGeneration(request, env) {
  try {
    const result = await generateTasksForComponents(env);
    
    return new Response(JSON.stringify({
      ok: true,
      message: '任务生成完成',
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('手动任务生成失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      message: '任务生成失败',
      error: String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

