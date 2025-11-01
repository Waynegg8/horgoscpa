/**
 * 工时统计API
 * 区分员工和管理员权限
 */

import { requireLogin } from '../auth.js';
import { jsonResponse, errorResponse } from '../utils.js';

/**
 * 获取我的工时统计（员工权限）
 * GET /internal/api/v1/timesheets/my-stats?month=2025-01
 */
async function getMyStats(request, env, userId) {
  const url = new URL(request.url);
  const month = url.searchParams.get('month'); // YYYY-MM format
  
  let dateFilter = '';
  const binds = [userId];
  
  if (month) {
    const [year, monthNum] = month.split('-');
    dateFilter = ` AND strftime('%Y-%m', work_date) = ?`;
    binds.push(month);
  }
  
  try {
    // 获取工时数据（支持有任务和无任务两种情况）
    const stats = await env.DB.prepare(`
      SELECT 
        t.timesheet_id,
        t.work_date,
        t.client_id,
        t.task_id,
        t.service_id,
        t.service_item_id,
        t.hours,
        t.note,
        c.company_name,
        at.task_name,
        at.component_id,
        sc.component_name,
        sc.estimated_hours,
        cs.client_service_id,
        s1.service_name as task_service_name,
        s2.service_name as direct_service_name,
        si.item_name as service_item_name
      FROM Timesheets t
      LEFT JOIN Clients c ON t.client_id = c.client_id
      -- 如果有task_id，关联任务
      LEFT JOIN ActiveTasks at ON t.task_id = at.task_id
      LEFT JOIN ServiceComponents sc ON at.component_id = sc.component_id
      LEFT JOIN ClientServices cs ON at.client_service_id = cs.client_service_id
      LEFT JOIN Services s1 ON cs.service_id = s1.service_id
      -- 如果没有task_id，直接使用service_id
      LEFT JOIN Services s2 ON t.service_id = s2.service_id
      LEFT JOIN ServiceItems si ON t.service_item_id = si.item_id
      WHERE t.user_id = ? ${dateFilter}
        AND t.is_deleted = 0
      ORDER BY t.work_date DESC, t.timesheet_id DESC
    `).bind(...binds).all();
    
    // 计算总工时
    const totalHours = stats.results.reduce((sum, row) => sum + (row.hours || 0), 0);
    
    // 按客户分组统计
    const byClient = {};
    
    for (const row of stats.results) {
      const clientKey = row.client_id || 'internal';
      const clientName = row.company_name || '内部工时';
      
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          client_id: row.client_id,
          client_name: clientName,
          total_hours: 0,
          services: {}
        };
      }
      
      byClient[clientKey].total_hours += row.hours || 0;
      
      // 按服务子项目分组（不管有没有任务）
      const serviceName = row.direct_service_name || row.task_service_name || '其他';
      const itemName = row.service_item_name || '一般工作';
      const serviceKey = `${serviceName}_${itemName}`;
      
      if (!byClient[clientKey].services[serviceKey]) {
        byClient[clientKey].services[serviceKey] = {
          service_name: serviceName,
          service_item_name: itemName,
          actual_hours: 0,
          estimated_hours: row.component_id ? row.estimated_hours : null,
          has_estimate: !!row.component_id
        };
      }
      
      byClient[clientKey].services[serviceKey].actual_hours += row.hours || 0;
    }
    
    // 转换为数组
    const clientStats = Object.values(byClient).map(client => ({
      ...client,
      services: Object.values(client.services).map(svc => ({
        ...svc,
        over_time: svc.estimated_hours ? (svc.actual_hours - svc.estimated_hours) : null,
        status: !svc.estimated_hours ? '无预估' : 
                (svc.actual_hours <= svc.estimated_hours ? '正常' : '超时')
      }))
    }));
    
    return jsonResponse({
      ok: true,
      data: {
        total_hours: totalHours,
        period: month || '所有时间',
        by_client: clientStats,
        details: stats.results
      }
    });
    
  } catch (err) {
    console.error('获取工时统计失败:', err);
    return errorResponse('获取统计失败', 500);
  }
}

/**
 * 获取成本分析（管理员权限）
 * GET /internal/api/v1/admin/cost-analysis?client_id=xxx&month=2025-01
 */
async function getCostAnalysis(request, env) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const month = url.searchParams.get('month');
  
  if (!clientId) {
    return errorResponse('缺少client_id参数', 400);
  }
  
  let dateFilter = '';
  const binds = [clientId];
  
  if (month) {
    dateFilter = ` AND strftime('%Y-%m', t.work_date) = ?`;
    binds.push(month);
  }
  
  try {
    // 获取客户信息和收费
    const client = await env.DB.prepare(`
      SELECT 
        c.*,
        cs.client_service_id,
        srv.service_name,
        SUM(sb.billing_amount) as monthly_revenue
      FROM Clients c
      LEFT JOIN ClientServices cs ON c.client_id = cs.client_id AND cs.is_deleted = 0
      LEFT JOIN Services srv ON cs.service_id = srv.service_id
      LEFT JOIN ServiceBillingSchedule sb ON cs.client_service_id = sb.client_service_id
      WHERE c.client_id = ?
        AND c.is_deleted = 0
      GROUP BY c.client_id
    `).bind(clientId).first();
    
    if (!client) {
      return errorResponse('客户不存在', 404);
    }
    
    // 获取工时和成本数据
    const costData = await env.DB.prepare(`
      SELECT 
        sc.component_id,
        sc.component_name,
        sc.estimated_hours,
        SUM(t.hours) as actual_hours,
        COUNT(DISTINCT t.user_id) as worker_count,
        GROUP_CONCAT(DISTINCT u.name) as workers,
        SUM(t.hours * COALESCE(u.hourly_cost, 200)) as total_cost
      FROM Timesheets t
      JOIN Users u ON t.user_id = u.user_id
      JOIN ActiveTasks at ON t.task_id = at.task_id
      JOIN ServiceComponents sc ON at.component_id = sc.component_id
      WHERE t.client_id = ? ${dateFilter}
        AND t.is_deleted = 0
        AND at.is_deleted = 0
      GROUP BY sc.component_id
    `).bind(...binds).all();
    
    // 计算总成本和利润
    const totalCost = costData.results.reduce((sum, row) => sum + (row.total_cost || 0), 0);
    const revenue = client.monthly_revenue || 0;
    const profit = revenue - totalCost;
    const profitRate = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
    
    return jsonResponse({
      ok: true,
      data: {
        client: {
          client_id: client.client_id,
          company_name: client.company_name,
          service_name: client.service_name
        },
        period: month || '所有时间',
        revenue: revenue,
        total_cost: totalCost,
        profit: profit,
        profit_rate: profitRate + '%',
        components: costData.results.map(row => ({
          component_id: row.component_id,
          component_name: row.component_name,
          estimated_hours: row.estimated_hours,
          actual_hours: row.actual_hours,
          over_time: row.actual_hours - (row.estimated_hours || 0),
          total_cost: row.total_cost,
          worker_count: row.worker_count,
          workers: row.workers ? row.workers.split(',') : []
        }))
      }
    });
    
  } catch (err) {
    console.error('获取成本分析失败:', err);
    return errorResponse('获取分析失败', 500);
  }
}

/**
 * 路由处理
 */
export async function handleTimesheetStats(request, env, path) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;
  
  const method = request.method;
  
  if (method !== 'GET') {
    return errorResponse('方法不允许', 405);
  }
  
  // 员工工时统计
  if (path === '/internal/api/v1/timesheets/my-stats') {
    return await getMyStats(request, env, user.data.user_id);
  }
  
  // 管理员成本分析
  if (path === '/internal/api/v1/admin/cost-analysis') {
    if (!user.data.is_admin) {
      return errorResponse('无权访问', 403);
    }
    return await getCostAnalysis(request, env);
  }
  
  return errorResponse('路由不存在', 404);
}

