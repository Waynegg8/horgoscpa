/**
 * Service Components API
 * 管理客户服务的组成部分
 */

import { jsonResponse, getCorsHeadersForRequest } from '../utils.js';

export async function handleServiceComponents(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;
  
  // 需要登录验证 - 在 index.js 中已处理
  const corsHeaders = getCorsHeadersForRequest(request, env);

  // OPTIONS 请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET /internal/api/v1/client-services/:id/components
  if (method === 'GET' && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await listServiceComponents(env, corsHeaders, clientServiceId);
  }

  // POST /internal/api/v1/client-services/:id/components
  if (method === 'POST' && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await createServiceComponent(request, env, corsHeaders, clientServiceId);
  }

  // PUT /internal/api/v1/service-components/:id
  if (method === 'PUT' && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await updateServiceComponent(request, env, corsHeaders, componentId);
  }

  // DELETE /internal/api/v1/service-components/:id
  if (method === 'DELETE' && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await deleteServiceComponent(env, corsHeaders, componentId);
  }

  return null;
}

async function listServiceComponents(env, corsHeaders, clientServiceId) {
  try {
    const components = await env.DATABASE.prepare(`
      SELECT 
        sc.*,
        s.service_name,
        si.item_name as service_item_name,
        tt.template_name
      FROM ServiceComponents sc
      LEFT JOIN Services s ON sc.service_id = s.service_id
      LEFT JOIN ServiceItems si ON sc.service_item_id = si.item_id
      LEFT JOIN TaskTemplates tt ON sc.task_template_id = tt.template_id
      WHERE sc.client_service_id = ? AND sc.is_active = 1
      ORDER BY sc.component_id
    `).bind(clientServiceId).all();

    // 查询每个组件的多个服务层级SOP和任务配置
    const componentsWithDetails = await Promise.all(
      (components.results || []).map(async (c) => {
        // 查询服务层级的多个SOP
        const componentSOPs = await env.DATABASE.prepare(`
          SELECT sop.sop_id, sop.title, sop.category, scs.sort_order
          FROM ServiceComponentSOPs scs
          JOIN SOPDocuments sop ON sop.sop_id = scs.sop_id
          WHERE scs.component_id = ? AND sop.is_deleted = 0
          ORDER BY scs.sort_order
        `).bind(c.component_id).all();
        
        // 查询任务配置及其关联的SOP
        const tasks = await env.DATABASE.prepare(`
          SELECT * FROM ServiceComponentTasks
          WHERE component_id = ?
          ORDER BY task_order
        `).bind(c.component_id).all();
        
        const tasksWithSOPs = await Promise.all(
          (tasks.results || []).map(async (task) => {
            const taskSOPs = await env.DATABASE.prepare(`
              SELECT sop.sop_id, sop.title, sop.category, scts.sort_order
              FROM ServiceComponentTaskSOPs scts
              JOIN SOPDocuments sop ON sop.sop_id = scts.sop_id
              WHERE scts.task_config_id = ? AND sop.is_deleted = 0
              ORDER BY scts.sort_order
            `).bind(task.task_config_id).all();
            
            return {
              ...task,
              sops: taskSOPs.results || []
            };
          })
        );
        
        return {
          ...c,
          component_sops: componentSOPs.results || [],
          tasks: tasksWithSOPs,
          delivery_months: c.delivery_months ? JSON.parse(c.delivery_months) : null
        };
      })
    );

    return jsonResponse(200, {
      ok: true,
      data: componentsWithDetails
    }, corsHeaders);
  } catch (err) {
    console.error('获取服务组成部分失败:', err);
    return jsonResponse(500, { ok: false, message: '获取失败', error: String(err) }, corsHeaders);
  }
}

async function createServiceComponent(request, env, corsHeaders, clientServiceId) {
  try {
    const body = await request.json();
    const {
      service_id,
      service_item_id,
      component_name,
      delivery_frequency,
      delivery_months,
      task_template_id,
      auto_generate_task = true,
      advance_days = 7,
      due_date_rule,
      due_date_value,
      due_date_offset_days = 0,
      estimated_hours,
      notes,
      component_sop_ids = [],  // 服务层级SOP（多选）
      tasks = []
    } = body;

    // 验证必填字段
    if (!component_name || !service_id) {
      return jsonResponse(400, {
        ok: false,
        message: '缺少必填字段',
        debug: { component_name, service_id, delivery_frequency }
      }, corsHeaders);
    }

    // 验证至少要有任务配置
    if (!tasks || tasks.length === 0) {
      return jsonResponse(400, {
        ok: false,
        message: '請至少新增一個任務'
      }, corsHeaders);
    }

    const result = await env.DATABASE.prepare(`
      INSERT INTO ServiceComponents (
        client_service_id, service_id, service_item_id, component_name,
        delivery_frequency, delivery_months,
        task_template_id, auto_generate_task, advance_days,
        due_date_rule, due_date_value, due_date_offset_days,
        estimated_hours, notes, sop_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clientServiceId,
      service_id,
      service_item_id || null,
      component_name || '任務配置',
      delivery_frequency || 'monthly',
      delivery_months ? JSON.stringify(delivery_months) : null,
      task_template_id || null,
      auto_generate_task ? 1 : 0,
      advance_days || 7,
      due_date_rule || null,
      due_date_value || null,
      due_date_offset_days || 0,
      estimated_hours || null,
      notes || null,
      null  // sop_id保留为null，改用ServiceComponentSOPs表
    ).run();

    const componentId = result.meta.last_row_id;

    // 保存服务层级SOP关联（多个）
    if (component_sop_ids && Array.isArray(component_sop_ids) && component_sop_ids.length > 0) {
      // 过滤掉无效的ID
      const validSopIds = component_sop_ids.filter(id => id && !isNaN(id) && id > 0);
      
      for (let i = 0; i < validSopIds.length; i++) {
        await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentSOPs (component_id, sop_id, sort_order)
          VALUES (?, ?, ?)
        `).bind(componentId, validSopIds[i], i).run();
      }
    }

    // 保存任务配置和任务层级的SOP
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // 插入任务配置
        const taskResult = await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentTasks (
            component_id, task_order, task_name, assignee_user_id, notes,
            due_rule, due_value, estimated_hours, advance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          componentId,
          i,
          task.task_name || '',
          task.assignee_user_id || null,
          task.notes || null,
          task.due_rule || 'end_of_month',
          task.due_value || null,
          task.estimated_hours || null,
          task.advance_days || 7
        ).run();

        const taskConfigId = taskResult.meta.last_row_id;

        // 插入任务的SOP关联
        if (task.sop_ids && Array.isArray(task.sop_ids) && task.sop_ids.length > 0) {
          // 过滤掉无效的ID
          const validTaskSopIds = task.sop_ids.filter(id => id && !isNaN(id) && id > 0);
          
          for (let j = 0; j < validTaskSopIds.length; j++) {
            await env.DATABASE.prepare(`
              INSERT INTO ServiceComponentTaskSOPs (task_config_id, sop_id, sort_order)
              VALUES (?, ?, ?)
            `).bind(taskConfigId, validTaskSopIds[j], j).run();
          }
        }
      }
    }

    return jsonResponse(201, {
      ok: true,
      message: '服务组成部分已创建',
      data: { component_id: componentId }
    }, corsHeaders);
  } catch (err) {
    console.error('创建服务组成部分失败:', err);
    console.error('错误详情:', err.message);
    console.error('错误堆栈:', err.stack);
    return jsonResponse(500, { 
      ok: false, 
      message: '创建失败：' + err.message,
      debug: String(err)
    }, corsHeaders);
  }
}

async function updateServiceComponent(request, env, corsHeaders, componentId) {
  try {
    const body = await request.json();
    const {
      component_name,
      delivery_frequency,
      delivery_months,
      task_template_id,
      auto_generate_task = true,
      advance_days = 7,
      due_date_rule,
      due_date_value,
      due_date_offset_days = 0,
      estimated_hours,
      notes,
      component_sop_ids = [],
      tasks = []
    } = body;

    if (!component_name || !delivery_frequency) {
      return jsonResponse(400, {
        ok: false,
        message: '缺少必填字段'
      }, corsHeaders);
    }

    // 更新基本信息
    await env.DATABASE.prepare(`
      UPDATE ServiceComponents SET
        component_name = ?,
        delivery_frequency = ?,
        delivery_months = ?,
        task_template_id = ?,
        auto_generate_task = ?,
        advance_days = ?,
        due_date_rule = ?,
        due_date_value = ?,
        due_date_offset_days = ?,
        estimated_hours = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE component_id = ?
    `).bind(
      component_name,
      delivery_frequency,
      delivery_months ? JSON.stringify(delivery_months) : null,
      task_template_id || null,
      auto_generate_task ? 1 : 0,
      advance_days,
      due_date_rule || null,
      due_date_value || null,
      due_date_offset_days,
      estimated_hours || null,
      notes || null,
      componentId
    ).run();

    // 删除并重新插入服务层级SOP
    await env.DATABASE.prepare(
      'DELETE FROM ServiceComponentSOPs WHERE component_id = ?'
    ).bind(componentId).run();
    
    if (component_sop_ids && Array.isArray(component_sop_ids) && component_sop_ids.length > 0) {
      // 过滤掉无效的ID
      const validSopIds = component_sop_ids.filter(id => id && !isNaN(id) && id > 0);
      
      for (let i = 0; i < validSopIds.length; i++) {
        await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentSOPs (component_id, sop_id, sort_order)
          VALUES (?, ?, ?)
        `).bind(componentId, validSopIds[i], i).run();
      }
    }

    // 删除旧的任务配置及其SOP关联
    const oldTasks = await env.DATABASE.prepare(
      'SELECT task_config_id FROM ServiceComponentTasks WHERE component_id = ?'
    ).bind(componentId).all();
    
    for (const oldTask of (oldTasks.results || [])) {
      await env.DATABASE.prepare(
        'DELETE FROM ServiceComponentTaskSOPs WHERE task_config_id = ?'
      ).bind(oldTask.task_config_id).run();
    }
    
    await env.DATABASE.prepare(
      'DELETE FROM ServiceComponentTasks WHERE component_id = ?'
    ).bind(componentId).run();

    // 插入新的任务配置
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        const taskResult = await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentTasks (
            component_id, task_order, task_name, assignee_user_id, notes,
            due_rule, due_value, estimated_hours, advance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          componentId,
          i,
          task.task_name || '',
          task.assignee_user_id || null,
          task.notes || null,
          task.due_rule || 'end_of_month',
          task.due_value || null,
          task.estimated_hours || null,
          task.advance_days || 7
        ).run();

        const taskConfigId = taskResult.meta.last_row_id;

        if (task.sop_ids && Array.isArray(task.sop_ids) && task.sop_ids.length > 0) {
          // 过滤掉无效的ID
          const validTaskSopIds = task.sop_ids.filter(id => id && !isNaN(id) && id > 0);
          
          for (let j = 0; j < validTaskSopIds.length; j++) {
            await env.DATABASE.prepare(`
              INSERT INTO ServiceComponentTaskSOPs (task_config_id, sop_id, sort_order)
              VALUES (?, ?, ?)
            `).bind(taskConfigId, validTaskSopIds[j], j).run();
          }
        }
      }
    }

    return jsonResponse(200, {
      ok: true,
      message: '服务组成部分已更新',
      data: { component_id: componentId }
    }, corsHeaders);
  } catch (err) {
    console.error('更新服务组成部分失败:', err);
    return jsonResponse(500, { ok: false, message: '更新失败', error: String(err) }, corsHeaders);
  }
}

async function deleteServiceComponent(env, corsHeaders, componentId) {
  try {
    const tasks = await env.DATABASE.prepare(
      'SELECT COUNT(*) as count FROM ActiveTasks WHERE component_id = ? AND is_deleted = 0'
    ).bind(componentId).first();

    if (tasks && tasks.count > 0) {
      return jsonResponse(400, {
        ok: false,
        message: `无法删除：还有 ${tasks.count} 个关联的任务`
      }, corsHeaders);
    }

    await env.DATABASE.prepare(
      'UPDATE ServiceComponents SET is_active = 0 WHERE component_id = ?'
    ).bind(componentId).run();

    return jsonResponse(200, {
      ok: true,
      message: '服务组成部分已删除'
    }, corsHeaders);
  } catch (err) {
    console.error('删除服务组成部分失败:', err);
    return jsonResponse(500, { ok: false, message: '删除失败' }, corsHeaders);
  }
}
