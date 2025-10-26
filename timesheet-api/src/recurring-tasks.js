/**
 * 週期性任務管理 API
 * 處理每月固定任務、客戶服務配置
 */

import { verifySession, getSessionToken } from './auth.js';

// =========================================
// 客戶服務配置
// =========================================

/**
 * 獲取所有客戶服務配置
 */
export async function getClientServices(env, searchParams) {
  const { DB } = env;
  const clientName = searchParams.get('client_name');
  const category = searchParams.get('category');
  const assignedTo = searchParams.get('assigned_to');
  
  let query = `
    SELECT cs.*, c.type as client_type, c.representative, c.phone, c.email
    FROM client_services cs
    LEFT JOIN clients c ON cs.client_name = c.name
    WHERE cs.is_active = 1
  `;
  const params = [];
  
  if (clientName) {
    query += ` AND cs.client_name = ?`;
    params.push(clientName);
  }
  
  if (category) {
    query += ` AND cs.service_category = ?`;
    params.push(category);
  }
  
  if (assignedTo) {
    query += ` AND cs.assigned_to = ?`;
    params.push(assignedTo);
  }
  
  query += ` ORDER BY cs.client_name, cs.service_name`;
  
  const stmt = DB.prepare(query);
  const result = await (params.length > 0 ? stmt.bind(...params).all() : stmt.all());
  
  // 解析 monthly_schedule JSON
  const services = result.results.map(service => ({
    ...service,
    monthly_schedule: service.monthly_schedule ? JSON.parse(service.monthly_schedule) : {}
  }));
  
  return new Response(JSON.stringify({ services }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取單個客戶的服務配置
 */
export async function getClientServicesByClient(env, clientName) {
  const { DB } = env;
  
  const stmt = DB.prepare(`
    SELECT * FROM client_services
    WHERE client_name = ? AND is_active = 1
    ORDER BY service_category, service_name
  `);
  
  const result = await stmt.bind(clientName).all();
  
  const services = result.results.map(service => ({
    ...service,
    monthly_schedule: service.monthly_schedule ? JSON.parse(service.monthly_schedule) : {}
  }));
  
  return new Response(JSON.stringify({ services }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 刪除客戶服務配置（僅管理員）
 */
export async function deleteClientService(request, env, serviceId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  
  // 檢查是否為管理員
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: '只有管理員可以刪除服務配置' 
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 檢查是否有關聯的任務實例
    const instanceCheck = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM recurring_task_instances
      WHERE client_service_id = ?
    `).bind(serviceId).first();
    
    if (instanceCheck.count > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `此服務配置有 ${instanceCheck.count} 個關聯任務，建議將其設為停用而非刪除` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 執行刪除
    await env.DB.prepare('DELETE FROM client_services WHERE id = ?')
      .bind(serviceId)
      .run();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Service deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 創建或更新客戶服務配置（所有員工可用）
 */
export async function upsertClientService(request, env, data) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  
  if (!sessionData) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unauthorized' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { DB } = env;
  
  const {
    id,
    client_name,
    client_tax_id,
    service_name,
    service_category,
    frequency,
    fee = 0,
    estimated_hours = 0,
    monthly_schedule = {},
    billing_timing,
    billing_notes,
    service_notes,
    assigned_to
  } = data;
  
  const monthly_schedule_json = JSON.stringify(monthly_schedule);
  
  try {
    if (id) {
      // 更新
      const stmt = DB.prepare(`
        UPDATE client_services
        SET client_tax_id = ?,
            service_name = ?,
            service_category = ?,
            frequency = ?,
            fee = ?,
            estimated_hours = ?,
            monthly_schedule = ?,
            billing_timing = ?,
            billing_notes = ?,
            service_notes = ?,
            assigned_to = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      await stmt.bind(
        client_tax_id || null,
        service_name,
        service_category,
        frequency,
        fee,
        estimated_hours,
        monthly_schedule_json,
        billing_timing || null,
        billing_notes || null,
        service_notes || null,
        assigned_to || null,
        id
      ).run();
      
      return new Response(JSON.stringify({ success: true, id }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // 創建
      const stmt = DB.prepare(`
        INSERT INTO client_services (
          client_name, client_tax_id, service_name, service_category,
          frequency, fee, estimated_hours, monthly_schedule,
          billing_timing, billing_notes, service_notes, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = await stmt.bind(
        client_name,
        client_tax_id || null,
        service_name,
        service_category,
        frequency,
        fee,
        estimated_hours,
        monthly_schedule_json,
        billing_timing || null,
        billing_notes || null,
        service_notes || null,
        assigned_to || null
      ).run();
      
      return new Response(JSON.stringify({ 
        success: true, 
        id: result.meta.last_row_id 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =========================================
// 週期性任務模板
// =========================================

/**
 * 獲取任務模板列表
 */
export async function getRecurringTemplates(env, category) {
  const { DB } = env;
  
  let query = `
    SELECT * FROM recurring_task_templates
    WHERE is_active = 1
  `;
  
  if (category) {
    query += ` AND category = ?`;
  }
  
  query += ` ORDER BY category, name`;
  
  const stmt = DB.prepare(query);
  const result = await (category ? stmt.bind(category).all() : stmt.all());
  
  const templates = result.results.map(tpl => ({
    ...tpl,
    default_checklist: tpl.default_checklist ? JSON.parse(tpl.default_checklist) : []
  }));
  
  return new Response(JSON.stringify({ templates }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// =========================================
// 週期性任務實例生成與管理
// =========================================

/**
 * 生成指定月份的週期性任務
 */
export async function generateRecurringTasks(env, data, username) {
  const { DB } = env;
  const { year, month, force = false } = data;
  
  // 備註：月層級的 recurring_task_generation_log 已棄用，
  // 如需防重，將在每個服務層級寫入 task_generation_log（execution_period = YYYY-MM）。
  
  // 獲取所有啟用的客戶服務
  const servicesStmt = DB.prepare(`
    SELECT * FROM client_services
    WHERE is_active = 1
  `);
  const servicesResult = await servicesStmt.all();
  
  let tasksGenerated = 0;
  const monthStr = month.toString();
  
  for (const service of servicesResult.results) {
    const schedule = service.monthly_schedule ? JSON.parse(service.monthly_schedule) : {};
    
    // 檢查該月是否需要執行
    if (!schedule[monthStr]) {
      continue;
    }
    // 防重檢查（以 task_generation_log 為準）
    const executionPeriod = `${year}-${String(month).padStart(2, '0')}`;
    if (!force) {
      const dup = await DB.prepare(`
        SELECT 1 FROM task_generation_log WHERE client_service_id = ? AND execution_period = ?
      `).bind(service.id, executionPeriod).first();
      if (dup) {
        continue;
      }
    }
    
    // 查找對應的模板
    const templateStmt = DB.prepare(`
      SELECT * FROM recurring_task_templates
      WHERE name LIKE ? AND category = ? AND is_active = 1
      LIMIT 1
    `);
    const templateResult = await templateStmt.bind(
      `%${service.service_name}%`,
      service.service_category
    ).first();
    
    // 計算截止日期
    let dueDate = null;
    if (templateResult && templateResult.default_due_day) {
      const dueDay = templateResult.default_due_day;
      if (dueDay === 0) {
        // 月底
        dueDate = new Date(year, month, 0).toISOString().split('T')[0];
      } else if (dueDay === -1) {
        // 下月初
        dueDate = new Date(year, month, 1).toISOString().split('T')[0];
      } else {
        dueDate = new Date(year, month - 1, dueDay).toISOString().split('T')[0];
      }
    }
    
    // 準備檢核清單
    const checklist = templateResult && templateResult.default_checklist 
      ? JSON.parse(templateResult.default_checklist)
      : [];
    const checklistData = JSON.stringify({
      items: checklist.map(item => ({
        text: typeof item === 'string' ? item : item.text,
        completed: false,
        required: typeof item === 'object' ? item.required : true
      }))
    });
    
    // 創建任務實例
    const insertStmt = DB.prepare(`
      INSERT INTO recurring_task_instances (
        client_service_id, template_id, task_name, category,
        description, year, month, quarter,
        due_date, assigned_to, checklist_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const quarter = Math.ceil(month / 3);
    const taskName = `${service.client_name} - ${service.service_name}`;
    const description = service.service_notes || templateResult?.description || '';
    
    await insertStmt.bind(
      service.id,
      templateResult?.id || null,
      taskName,
      service.service_category,
      description,
      year,
      month,
      quarter,
      dueDate,
      service.assigned_to,
      checklistData
    ).run();
    
    tasksGenerated++;

    // 寫入統一的生成日誌（不關聯任務ID，因為這裡是 recurring 實例）
    try {
      await DB.prepare(`
        INSERT INTO task_generation_log (client_service_id, execution_period, generated_task_id, generation_method)
        VALUES (?, ?, NULL, 'recurring')
      `).bind(service.id, executionPeriod).run();
    } catch (_) {}
  }
  
  // 月層級日誌保留兼容（可選）
  try {
    const logStmt = DB.prepare(`
      INSERT INTO recurring_task_generation_log (year, month, tasks_generated, generated_by)
      VALUES (?, ?, ?, ?)
    `);
    await logStmt.bind(year, month, tasksGenerated, username).run();
  } catch (_) {}
  
  return new Response(JSON.stringify({ 
    success: true,
    year,
    month,
    tasks_generated: tasksGenerated
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取週期性任務列表
 */
export async function getRecurringTaskInstances(env, searchParams) {
  const { DB } = env;
  
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const assignedTo = searchParams.get('assigned_to');
  
  let query = `
    SELECT 
      rti.*,
      cs.client_name,
      cs.fee,
      cs.estimated_hours as planned_hours
    FROM recurring_task_instances rti
    LEFT JOIN client_services cs ON rti.client_service_id = cs.id
    WHERE 1=1
  `;
  const params = [];
  
  if (year) {
    query += ` AND rti.year = ?`;
    params.push(parseInt(year));
  }
  
  if (month) {
    query += ` AND rti.month = ?`;
    params.push(parseInt(month));
  }
  
  if (status) {
    query += ` AND rti.status = ?`;
    params.push(status);
  }
  
  if (category) {
    query += ` AND rti.category = ?`;
    params.push(category);
  }
  
  if (assignedTo) {
    query += ` AND rti.assigned_to = ?`;
    params.push(assignedTo);
  }
  
  query += ` ORDER BY rti.due_date, rti.client_service_id`;
  
  const stmt = DB.prepare(query);
  const result = await (params.length > 0 ? stmt.bind(...params).all() : stmt.all());
  
  const tasks = result.results.map(task => ({
    ...task,
    checklist_data: task.checklist_data ? JSON.parse(task.checklist_data) : { items: [] }
  }));
  
  return new Response(JSON.stringify({ tasks }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 更新週期性任務實例
 */
export async function updateRecurringTaskInstance(env, instanceId, data, username) {
  const { DB } = env;
  const {
    status,
    assigned_to,
    checklist_data,
    actual_hours,
    notes
  } = data;
  
  let updates = [];
  let params = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'in_progress' && !data.started_at) {
      updates.push('started_at = CURRENT_TIMESTAMP');
    }
    
    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
      updates.push('completed_by = ?');
      params.push(username);
    }
  }
  
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }
  
  if (checklist_data !== undefined) {
    updates.push('checklist_data = ?');
    params.push(JSON.stringify(checklist_data));
  }
  
  if (actual_hours !== undefined) {
    updates.push('actual_hours = ?');
    params.push(actual_hours);
  }
  
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(instanceId);
  
  const stmt = DB.prepare(`
    UPDATE recurring_task_instances
    SET ${updates.join(', ')}
    WHERE id = ?
  `);
  
  await stmt.bind(...params).run();
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取週期性任務統計
 */
export async function getRecurringTaskStats(env, year, month) {
  const { DB } = env;
  
  const stmt = DB.prepare(`
    SELECT 
      category,
      status,
      COUNT(*) as count,
      SUM(actual_hours) as total_hours,
      AVG(actual_hours) as avg_hours
    FROM recurring_task_instances
    WHERE year = ? AND month = ?
    GROUP BY category, status
  `);
  
  const result = await stmt.bind(year, month).all();
  
  return new Response(JSON.stringify({ stats: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

