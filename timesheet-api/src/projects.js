// ================================================================
// 專案與任務管理 API
// 檔案: src/projects.js
// 日期: 2025-10-25
// 描述: 整合客戶、員工、工時的專案管理系統
// ================================================================

import { verifySession, getSessionToken } from './auth.js';
import { jsonResponse } from './utils.js';

// ============================================================
// 1. 專案 API
// ============================================================

/**
 * 獲取所有專案（支援篩選）
 */
export async function getProjects(request, env) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');
    const assignedToId = url.searchParams.get('assigned_to_user_id');
    const category = url.searchParams.get('category');
    
    let query = `
      SELECT 
        p.*,
        c.name as client_name,
        u.username as assigned_to_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.assigned_to_user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (clientId) {
      query += ` AND p.client_id = ?`;
      params.push(clientId);
    }
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (assignedToId) {
      query += ` AND p.assigned_to_user_id = ?`;
      params.push(assignedToId);
    }
    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }
    
    if (auth.user.role !== 'admin') {
      query += ` AND (p.assigned_to_user_id = ? OR p.created_by_user_id = ?)`;
      params.push(auth.user.id, auth.user.id);
    }
    
    query += ` ORDER BY p.updated_at DESC`;
    
    const stmt = params.length > 0 
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);
    
    const { results } = await stmt.all();
    
    return jsonResponse({ success: true, data: results || [] });
  } catch (error) {
    console.error("Error in getProjects:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 獲取單一專案詳情
 */
export async function getProject(request, env, projectId) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const query = `
      SELECT 
        p.*,
        c.name as client_name,
        u.username as assigned_to_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.assigned_to_user_id = u.id
      WHERE p.id = ?
    `;
    
    const project = await env.DB.prepare(query).bind(projectId).first();
    
    if (!project) {
      return jsonResponse({ success: false, error: 'Project not found' }, 404);
    }
    
    if (auth.user.role !== 'admin' && 
        project.assigned_to_user_id !== auth.user.id && 
        project.created_by_user_id !== auth.user.id) {
      return jsonResponse({ success: false, error: 'Access denied' }, 403);
    }
    
    return jsonResponse({ success: true, data: project });
  } catch (error) {
    console.error(`Error in getProject for id ${projectId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 創建專案
 */
export async function createProject(request, env) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO projects (
        name, client_id, description, status, priority,
        start_date, due_date, created_by_user_id, assigned_to_user_id, category, budget
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.name,
      data.client_id || null,
      data.description || null,
      data.status || 'planning',
      data.priority || 'medium',
      data.start_date || null,
      data.due_date || null,
      auth.user.id,
      data.assigned_to_user_id || null,
      data.category || null,
      data.budget || null
    ).run();
    
    return jsonResponse({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Project created successfully'
    }, 201);
  } catch (error) {
    console.error("Error in createProject:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 更新專案
 */
export async function updateProject(request, env, projectId) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const data = await request.json();
    
    // Logic to check if user has permission to update
    if (auth.user.role !== 'admin') {
        const project = await env.DB.prepare('SELECT created_by_user_id, assigned_to_user_id FROM projects WHERE id = ?').bind(projectId).first();
        if (project.created_by_user_id !== auth.user.id && project.assigned_to_user_id !== auth.user.id) {
            return jsonResponse({ error: 'Access Denied' }, 403);
        }
    }

    const fields = [];
    const bindings = [];
    const allowedFields = [
        'name', 'client_id', 'description', 'status', 'priority', 'start_date', 
        'due_date', 'completed_date', 'assigned_to_user_id', 'category', 'budget', 'actual_cost'
    ];

    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            fields.push(`${field} = ?`);
            bindings.push(data[field]);
        }
    });

    if (fields.length === 0) {
        return jsonResponse({ success: false, error: 'No fields to update' }, 400);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(projectId);

    const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
    
    await env.DB.prepare(query).bind(...bindings).run();
    
    return jsonResponse({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error(`Error in updateProject for id ${projectId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 刪除專案
 */
export async function deleteProject(request, env, projectId) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.authorized) {
      return jsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    // We assume ON DELETE CASCADE will handle related tasks if that's the desired behavior.
    // If not, we should check for tasks first.
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();
    
    return jsonResponse({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error(`Error in deleteProject for id ${projectId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// ============================================================
// 2. 任務 API (Remains Largely Unchanged)
// NOTE: This section is now simplified, as the main task logic
// is handled in multi-stage-tasks.js. These functions might be
// deprecated in the future in favor of the unified task endpoints.
// ============================================================

/**
 * 獲取專案的所有任務
 */
export async function getProjectTasks(request, env, projectId) {
  const auth = await requireAuth(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

  try {
    // This query is simplified as it should ideally go through the unified task endpoint
    const query = `
      SELECT 
        t.*
      FROM tasks t
      WHERE t.category = 'project' AND t.client_id = (SELECT client_id FROM projects WHERE id = ?) -- This is an assumption
      ORDER BY t.created_at DESC
    `;
    
    // NOTE: This logic is flawed. A project is not directly linked to tasks in the new schema.
    // Tasks are linked to clients. This function should be deprecated.
    // For now, returning an empty array to avoid errors.
    console.warn("getProjectTasks is deprecated and returns a placeholder. Use /api/tasks/multi-stage?client_id=... instead.");

    const { results } = await env.DB.prepare("SELECT * FROM tasks WHERE 1=0").all(); // Return no tasks
    
    return jsonResponse({ 
      success: true, 
      data: results || [],
      message: "This endpoint is deprecated. Please use the unified task endpoint."
    });
  } catch (error) {
    console.error(`Error in getProjectTasks for project id ${projectId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

