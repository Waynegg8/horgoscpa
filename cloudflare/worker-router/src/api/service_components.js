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

    return jsonResponse(200, {
      ok: true,
      data: components.results.map(c => ({
        ...c,
        delivery_months: c.delivery_months ? JSON.parse(c.delivery_months) : null
      }))
    }, corsHeaders);
  } catch (err) {
    console.error('获取服务组成部分失败:', err);
    return jsonResponse(500, { ok: false, message: '获取失败' }, corsHeaders);
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
      notes
    } = body;

    if (!component_name || !service_id || !delivery_frequency) {
      return jsonResponse(400, {
        ok: false,
        message: '缺少必填字段'
      }, corsHeaders);
    }

    const result = await env.DATABASE.prepare(`
      INSERT INTO ServiceComponents (
        client_service_id, service_id, service_item_id, component_name,
        delivery_frequency, delivery_months,
        task_template_id, auto_generate_task, advance_days,
        due_date_rule, due_date_value, due_date_offset_days,
        estimated_hours, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clientServiceId,
      service_id,
      service_item_id || null,
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
      notes || null
    ).run();

    return jsonResponse(201, {
      ok: true,
      message: '服务组成部分已创建',
      data: { component_id: result.meta.last_row_id }
    }, corsHeaders);
  } catch (err) {
    console.error('创建服务组成部分失败:', err);
    return jsonResponse(500, { ok: false, message: '创建失败' }, corsHeaders);
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
