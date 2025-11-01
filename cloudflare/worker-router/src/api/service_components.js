/**
 * Service Components API
 * 管理客户服务的组成部分
 */

import { requireLogin } from '../auth.js';
import { corsHeaders, jsonResponse, errorResponse } from '../utils.js';

/**
 * 获取某个客户服务的所有组成部分
 * GET /internal/api/v1/client-services/:clientServiceId/components
 */
async function listServiceComponents(request, env, clientServiceId) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;

  try {
    const components = await env.DB.prepare(`
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

    return jsonResponse({
      ok: true,
      data: components.results.map(c => ({
        ...c,
        delivery_months: c.delivery_months ? JSON.parse(c.delivery_months) : null
      }))
    });
  } catch (err) {
    console.error('获取服务组成部分失败:', err);
    return errorResponse('获取服务组成部分失败', 500);
  }
}

/**
 * 创建服务组成部分
 * POST /internal/api/v1/client-services/:clientServiceId/components
 */
async function createServiceComponent(request, env, clientServiceId) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;

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
      cost_ratio,
      notes
    } = body;

    // 验证必填字段
    const errors = [];
    if (!component_name) errors.push({ field: 'component_name', message: '服务名称为必填' });
    if (!service_id) errors.push({ field: 'service_id', message: '服务类型为必填' });
    if (!delivery_frequency) errors.push({ field: 'delivery_frequency', message: '提供频率为必填' });

    // 验证delivery_frequency
    const validFrequencies = ['monthly', 'bi-monthly', 'quarterly', 'yearly', 'one-time'];
    if (delivery_frequency && !validFrequencies.includes(delivery_frequency)) {
      errors.push({ field: 'delivery_frequency', message: '无效的提供频率' });
    }

    // 验证due_date_rule
    if (due_date_rule) {
      const validRules = ['end_of_month', 'specific_day', 'next_month_day', 'days_after_start'];
      if (!validRules.includes(due_date_rule)) {
        errors.push({ field: 'due_date_rule', message: '无效的期限规则' });
      }
    }

    if (errors.length > 0) {
      return errorResponse('验证失败', 400, errors);
    }

    // 验证客户服务是否存在
    const clientService = await env.DB.prepare(
      'SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0'
    ).bind(clientServiceId).first();

    if (!clientService) {
      return errorResponse('客户服务不存在', 404);
    }

    // 插入数据
    const result = await env.DB.prepare(`
      INSERT INTO ServiceComponents (
        client_service_id, service_id, service_item_id, component_name,
        delivery_frequency, delivery_months,
        task_template_id, auto_generate_task, advance_days,
        due_date_rule, due_date_value, due_date_offset_days,
        estimated_hours, cost_ratio, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      cost_ratio || null,
      notes || null
    ).run();

    return jsonResponse({
      ok: true,
      message: '服务组成部分已创建',
      data: { component_id: result.meta.last_row_id }
    }, 201);
  } catch (err) {
    console.error('创建服务组成部分失败:', err);
    return errorResponse('创建失败', 500);
  }
}

/**
 * 更新服务组成部分
 * PUT /internal/api/v1/service-components/:componentId
 */
async function updateServiceComponent(request, env, componentId) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;

  try {
    const body = await request.json();
    const {
      component_name,
      service_id,
      service_item_id,
      delivery_frequency,
      delivery_months,
      task_template_id,
      auto_generate_task,
      advance_days,
      due_date_rule,
      due_date_value,
      due_date_offset_days,
      estimated_hours,
      cost_ratio,
      notes
    } = body;

    // 验证组成部分是否存在
    const existing = await env.DB.prepare(
      'SELECT component_id FROM ServiceComponents WHERE component_id = ? AND is_active = 1'
    ).bind(componentId).first();

    if (!existing) {
      return errorResponse('服务组成部分不存在', 404);
    }

    // 构建更新语句
    const updates = [];
    const values = [];

    if (component_name !== undefined) {
      updates.push('component_name = ?');
      values.push(component_name);
    }
    if (service_id !== undefined) {
      updates.push('service_id = ?');
      values.push(service_id);
    }
    if (service_item_id !== undefined) {
      updates.push('service_item_id = ?');
      values.push(service_item_id || null);
    }
    if (delivery_frequency !== undefined) {
      updates.push('delivery_frequency = ?');
      values.push(delivery_frequency);
    }
    if (delivery_months !== undefined) {
      updates.push('delivery_months = ?');
      values.push(delivery_months ? JSON.stringify(delivery_months) : null);
    }
    if (task_template_id !== undefined) {
      updates.push('task_template_id = ?');
      values.push(task_template_id || null);
    }
    if (auto_generate_task !== undefined) {
      updates.push('auto_generate_task = ?');
      values.push(auto_generate_task ? 1 : 0);
    }
    if (advance_days !== undefined) {
      updates.push('advance_days = ?');
      values.push(advance_days);
    }
    if (due_date_rule !== undefined) {
      updates.push('due_date_rule = ?');
      values.push(due_date_rule || null);
    }
    if (due_date_value !== undefined) {
      updates.push('due_date_value = ?');
      values.push(due_date_value || null);
    }
    if (due_date_offset_days !== undefined) {
      updates.push('due_date_offset_days = ?');
      values.push(due_date_offset_days);
    }
    if (estimated_hours !== undefined) {
      updates.push('estimated_hours = ?');
      values.push(estimated_hours || null);
    }
    if (cost_ratio !== undefined) {
      updates.push('cost_ratio = ?');
      values.push(cost_ratio || null);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes || null);
    }

    updates.push('updated_at = datetime("now")');
    values.push(componentId);

    await env.DB.prepare(`
      UPDATE ServiceComponents 
      SET ${updates.join(', ')}
      WHERE component_id = ?
    `).bind(...values).run();

    return jsonResponse({
      ok: true,
      message: '服务组成部分已更新'
    });
  } catch (err) {
    console.error('更新服务组成部分失败:', err);
    return errorResponse('更新失败', 500);
  }
}

/**
 * 删除服务组成部分
 * DELETE /internal/api/v1/service-components/:componentId
 */
async function deleteServiceComponent(request, env, componentId) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;

  try {
    // 检查是否有关联的任务
    const tasks = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM ActiveTasks WHERE component_id = ? AND is_deleted = 0'
    ).bind(componentId).first();

    if (tasks.count > 0) {
      return errorResponse(`无法删除：还有 ${tasks.count} 个关联的任务`, 400);
    }

    // 软删除
    await env.DB.prepare(
      'UPDATE ServiceComponents SET is_active = 0 WHERE component_id = ?'
    ).bind(componentId).run();

    return jsonResponse({
      ok: true,
      message: '服务组成部分已删除'
    });
  } catch (err) {
    console.error('删除服务组成部分失败:', err);
    return errorResponse('删除失败', 500);
  }
}

/**
 * 获取单个服务组成部分
 * GET /internal/api/v1/service-components/:componentId
 */
async function getServiceComponent(request, env, componentId) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;

  try {
    const component = await env.DB.prepare(`
      SELECT 
        sc.*,
        s.service_name,
        si.item_name as service_item_name,
        tt.template_name,
        cs.client_id,
        c.company_name
      FROM ServiceComponents sc
      LEFT JOIN Services s ON sc.service_id = s.service_id
      LEFT JOIN ServiceItems si ON sc.service_item_id = si.item_id
      LEFT JOIN TaskTemplates tt ON sc.task_template_id = tt.template_id
      LEFT JOIN ClientServices cs ON sc.client_service_id = cs.client_service_id
      LEFT JOIN Clients c ON cs.client_id = c.client_id
      WHERE sc.component_id = ? AND sc.is_active = 1
    `).bind(componentId).first();

    if (!component) {
      return errorResponse('服务组成部分不存在', 404);
    }

    return jsonResponse({
      ok: true,
      data: {
        ...component,
        delivery_months: component.delivery_months ? JSON.parse(component.delivery_months) : null
      }
    });
  } catch (err) {
    console.error('获取服务组成部分失败:', err);
    return errorResponse('获取失败', 500);
  }
}

/**
 * 路由处理
 */
export async function handleServiceComponents(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;

  // OPTIONS 请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET /internal/api/v1/client-services/:id/components
  if (method === 'GET' && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await listServiceComponents(request, env, clientServiceId);
  }

  // POST /internal/api/v1/client-services/:id/components
  if (method === 'POST' && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await createServiceComponent(request, env, clientServiceId);
  }

  // GET /internal/api/v1/service-components/:id
  if (method === 'GET' && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await getServiceComponent(request, env, componentId);
  }

  // PUT /internal/api/v1/service-components/:id
  if (method === 'PUT' && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await updateServiceComponent(request, env, componentId);
  }

  // DELETE /internal/api/v1/service-components/:id
  if (method === 'DELETE' && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await deleteServiceComponent(request, env, componentId);
  }

  return null;
}

