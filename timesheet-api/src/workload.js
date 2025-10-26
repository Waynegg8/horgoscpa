/**
 * 工作量管理 API
 * 提供團隊工作量統計、工作量平衡視圖等功能
 */

/**
 * 取得團隊工作量概覽
 * GET /api/workload/overview?period=YYYY-MM
 */
export async function getWorkloadOverview(request, env) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || getCurrentPeriod();
    const db = env.DB;
    
    // 計算各員工的工作量
    const workload = await db.prepare(`
      SELECT 
        u.id as user_id,
        u.employee_name,
        u.username,
        COUNT(DISTINCT t.id) as task_count,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        COALESCE(SUM(ts.estimated_hours), 0) as total_estimated_hours,
        COALESCE(SUM(ts.actual_hours), 0) as total_actual_hours,
        COALESCE(AVG(cs.difficulty_level), 0) as avg_difficulty
      FROM users u
      LEFT JOIN tasks t ON (u.username = t.assigned_user OR u.employee_name = t.assigned_user)
        AND strftime('%Y-%m', t.created_at) = ?
      LEFT JOIN multi_stage_tasks mst ON t.id = mst.task_id
      LEFT JOIN task_stages ts ON mst.id = ts.multi_stage_task_id
      LEFT JOIN client_services cs ON mst.client_service_id = cs.id
      WHERE u.role IN ('employee', 'accountant', 'admin')
      GROUP BY u.id
      ORDER BY total_estimated_hours DESC
    `).bind(period).all();
    
    // 計算工作量百分比
    const workloadData = workload.results || [];
    const maxHours = Math.max(...workloadData.map(w => w.total_estimated_hours || 0), 160);
    
    workloadData.forEach(w => {
      w.workload_percentage = maxHours > 0 ? Math.round((w.total_estimated_hours / maxHours) * 100) : 0;
      w.remaining_hours = w.total_estimated_hours - w.total_actual_hours;
    });
    
    // 計算總體統計
    const summary = {
      total_employees: workloadData.length,
      total_tasks: workloadData.reduce((sum, w) => sum + (w.task_count || 0), 0),
      total_hours: workloadData.reduce((sum, w) => sum + (w.total_estimated_hours || 0), 0),
      avg_utilization: workloadData.length > 0 
        ? Math.round(workloadData.reduce((sum, w) => sum + w.workload_percentage, 0) / workloadData.length)
        : 0
    };
    
    return new Response(JSON.stringify({
      success: true,
      period: period,
      summary: summary,
      employees: workloadData
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
 * 重新分配任務
 * POST /api/workload/reassign
 */
export async function reassignTask(request, env) {
  try {
    const db = env.DB;
    const body = await request.json();
    const { task_id, from_user, to_user, reason } = body;
    
    if (!task_id || !to_user) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少必要參數'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 更新任務的負責人
    await db.prepare(`
      UPDATE tasks 
      SET assigned_user = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(to_user, task_id).run();
    
    // 記錄轉移日誌（如果有日誌表）
    // TODO: 實現任務轉移日誌
    
    return new Response(JSON.stringify({
      success: true,
      message: '任務已重新分配',
      task_id: task_id,
      new_assignee: to_user
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
 * 更新工作量統計
 * POST /api/workload/update-stats
 */
export async function updateWorkloadStats(request, env) {
  try {
    const db = env.DB;
    const period = getCurrentPeriod();
    
    // 重新計算所有員工的工作量統計
    const users = await db.prepare(`
      SELECT id FROM users WHERE role IN ('employee', 'accountant', 'admin')
    `).all();
    
    for (const user of users.results || []) {
      const stats = await calculateUserWorkload(db, user.id, period);
      
      await db.prepare(`
        INSERT OR REPLACE INTO user_workload_stats 
        (user_id, period, total_tasks, completed_tasks, total_hours, actual_hours, avg_difficulty, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        user.id,
        period,
        stats.total_tasks,
        stats.completed_tasks,
        stats.total_hours,
        stats.actual_hours,
        stats.avg_difficulty
      ).run();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '工作量統計已更新',
      period: period
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
 * 輔助函數：計算用戶工作量
 */
async function calculateUserWorkload(db, userId, period) {
  const result = await db.prepare(`
    SELECT 
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      COALESCE(SUM(ts.estimated_hours), 0) as total_hours,
      COALESCE(SUM(ts.actual_hours), 0) as actual_hours,
      COALESCE(AVG(cs.difficulty_level), 0) as avg_difficulty
    FROM tasks t
    LEFT JOIN multi_stage_tasks mst ON t.id = mst.task_id
    LEFT JOIN task_stages ts ON mst.id = ts.multi_stage_task_id
    LEFT JOIN client_services cs ON mst.client_service_id = cs.id
    WHERE (t.assigned_user = (SELECT username FROM users WHERE id = ?)
           OR t.assigned_user = (SELECT employee_name FROM users WHERE id = ?))
      AND strftime('%Y-%m', t.created_at) = ?
  `).bind(userId, userId, period).first();
  
  return result || {
    total_tasks: 0,
    completed_tasks: 0,
    total_hours: 0,
    actual_hours: 0,
    avg_difficulty: 0
  };
}

/**
 * 輔助函數：取得當前期間
 */
function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

