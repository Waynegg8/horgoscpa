// ================================================================
// 專案與任務管理 API
// 檔案: src/projects.js
// 日期: 2025-10-25
// 描述: 整合客戶、員工、工時的專案管理系統
// ================================================================

import { verifySession } from './auth.js';

// ============================================================
// 1. 專案 API
// ============================================================

/**
 * 獲取所有專案（支援篩選）
 */
export async function getProjects(request, env) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const client = url.searchParams.get('client');
    const status = url.searchParams.get('status');
    const assignedTo = url.searchParams.get('assigned_to');
    
    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (client) {
      query += ` AND p.client_name = ?`;
      params.push(client);
    }
    
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    
    if (assignedTo) {
      query += ` AND p.assigned_to = ?`;
      params.push(assignedTo);
    }
    
    // 非管理員只能看到自己相關的專案
    if (sessionData.role !== 'admin') {
      query += ` AND (p.assigned_to = ? OR p.created_by = ?)`;
      params.push(sessionData.employee_name, sessionData.username);
    }
    
    query += ` GROUP BY p.id ORDER BY p.updated_at DESC`;
    
    const stmt = params.length > 0 
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.results 
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
 * 獲取單一專案詳情
 */
export async function getProject(request, env, projectId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
        SUM(t.estimated_hours) as total_estimated_hours,
        SUM(t.actual_hours) as total_actual_hours
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const result = await env.DB.prepare(query).bind(projectId).first();
    
    if (!result) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Project not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 權限檢查
    if (sessionData.role !== 'admin' && 
        result.assigned_to !== sessionData.employee_name && 
        result.created_by !== sessionData.username) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Access denied' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
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
 * 創建專案
 */
export async function createProject(request, env) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO projects (
        name, client_name, description, status, priority,
        start_date, due_date, created_by, assigned_to, progress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.name,
      data.client_name || null,
      data.description || null,
      data.status || 'planning',
      data.priority || 'medium',
      data.start_date || null,
      data.due_date || null,
      sessionData.username,
      data.assigned_to || null,
      data.progress || 0
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Project created successfully'
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
 * 更新專案
 */
export async function updateProject(request, env, projectId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE projects SET
        name = ?,
        client_name = ?,
        description = ?,
        status = ?,
        priority = ?,
        start_date = ?,
        due_date = ?,
        completed_date = ?,
        assigned_to = ?,
        progress = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.name,
      data.client_name || null,
      data.description || null,
      data.status,
      data.priority,
      data.start_date || null,
      data.due_date || null,
      data.completed_date || null,
      data.assigned_to || null,
      data.progress || 0,
      projectId
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Project updated successfully'
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
 * 刪除專案
 */
export async function deleteProject(request, env, projectId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized - Admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Project deleted successfully'
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

// ============================================================
// 2. 任務 API
// ============================================================

/**
 * 獲取專案的所有任務
 */
export async function getProjectTasks(request, env, projectId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `
      SELECT 
        t.*,
        COUNT(DISTINCT c.id) as checklist_count,
        COUNT(DISTINCT CASE WHEN c.is_completed = 1 THEN c.id END) as completed_checklist
      FROM tasks t
      LEFT JOIN task_checklist c ON t.id = c.task_id
      WHERE t.project_id = ?
      GROUP BY t.id
      ORDER BY t.sort_order, t.created_at DESC
    `;
    
    const result = await env.DB.prepare(query).bind(projectId).all();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.results 
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
 * 創建任務
 */
export async function createTask(request, env) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO tasks (
        project_id, title, description, status, assigned_to,
        estimated_hours, due_date, sort_order, parent_task_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.project_id,
      data.title,
      data.description || null,
      data.status || 'todo',
      data.assigned_to || null,
      data.estimated_hours || 0,
      data.due_date || null,
      data.sort_order || 0,
      data.parent_task_id || null
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Task created successfully'
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
 * 更新任務
 */
export async function updateTask(request, env, taskId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE tasks SET
        title = ?,
        description = ?,
        status = ?,
        assigned_to = ?,
        estimated_hours = ?,
        actual_hours = ?,
        due_date = ?,
        completed_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.title,
      data.description || null,
      data.status,
      data.assigned_to || null,
      data.estimated_hours || 0,
      data.actual_hours || 0,
      data.due_date || null,
      data.completed_date || null,
      taskId
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Task updated successfully'
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
 * 刪除任務
 */
export async function deleteTask(request, env, taskId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Task deleted successfully'
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

// ============================================================
// 3. 任務檢核清單 API
// ============================================================

/**
 * 獲取任務檢核清單
 */
export async function getTaskChecklist(request, env, taskId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `SELECT * FROM task_checklist WHERE task_id = ? ORDER BY sort_order`;
    const result = await env.DB.prepare(query).bind(taskId).all();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.results 
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
 * 添加檢核項目
 */
export async function addChecklistItem(request, env) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO task_checklist (task_id, item_text, sort_order)
      VALUES (?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.task_id,
      data.item_text,
      data.sort_order || 0
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id
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
 * 更新檢核項目
 */
export async function updateChecklistItem(request, env, itemId) {
  const sessionData = await verifySession(request, env);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE task_checklist SET
        item_text = ?,
        is_completed = ?
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.item_text,
      data.is_completed ? 1 : 0,
      itemId
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true
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

