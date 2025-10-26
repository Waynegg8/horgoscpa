// ================================================================
// 客戶關係管理 API
// 檔案: src/clients.js
// 日期: 2025-10-25
// ================================================================

import { verifySession, getSessionToken } from './auth.js';
import { jsonResponse } from './utils.js';

// ============================================================
// 1. Unified Client API
// ============================================================

/**
 * Gets a list of all clients with filtering options.
 */
export async function getClients(request, env) {
    const auth = await requireAuth(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    try {
        const url = new URL(request.url);
        const params = url.searchParams;
        const status = params.get('status');
        const region = params.get('region');
        const searchTerm = params.get('search');

        let query = `SELECT id, name, tax_id, contact_person, phone, email, status, region FROM clients WHERE 1=1`;
        const bindings = [];

        if (status) {
            query += ' AND status = ?';
            bindings.push(status);
        }
        if (region) {
            query += ' AND region = ?';
            bindings.push(region);
        }
        if (searchTerm) {
            query += ' AND (name LIKE ? OR tax_id LIKE ? OR contact_person LIKE ?)';
            const searchTermLike = `%${searchTerm}%`;
            bindings.push(searchTermLike, searchTermLike, searchTermLike);
        }
        
        query += ' ORDER BY name';

        const stmt = env.DB.prepare(query);
        const { results } = await (bindings.length > 0 ? stmt.bind(...bindings).all() : stmt.all());
        
        return jsonResponse({ success: true, data: results || [] });
    } catch (error) {
        console.error('Error fetching clients:', error);
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

/**
 * Gets the full details for a single client.
 */
export async function getClientDetails(request, env, clientId) {
    const auth = await requireAuth(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    try {
        const client = await env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(clientId).first();

        if (!client) {
            return jsonResponse({ success: false, error: 'Client not found' }, 404);
        }
        
        // Optionally, fetch related data like services and interactions here in the future
        // const services = await env.DB.prepare(`SELECT * FROM client_services WHERE client_id = ?`).bind(clientId).all();
        // const interactions = await env.DB.prepare(`SELECT * FROM client_interactions WHERE client_id = ? ORDER BY interaction_date DESC LIMIT 5`).bind(clientId).all();

        return jsonResponse({
            success: true,
            data: client
        });
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}


/**
 * Creates a new client.
 */
export async function createClient(request, env) {
    const auth = await requireAdmin(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Forbidden' }, 403);
    }

    try {
        const body = await request.json();

        if (!body.name) {
            return jsonResponse({ success: false, error: 'Client name is required' }, 400);
        }

        const result = await env.DB.prepare(
            `INSERT INTO clients (name, tax_id, contact_person, phone, email, address, status, region, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            body.name,
            body.tax_id || null,
            body.contact_person || null,
            body.phone || null,
            body.email || null,
            body.address || null,
            body.status || 'active',
            body.region || null,
            body.notes || null
        ).run();

        return jsonResponse({
            success: true,
            id: result.meta.last_row_id,
            message: 'Client created successfully'
        }, 201);
    } catch (error) {
        console.error('Error creating client:', error);
        if (error.message.includes('UNIQUE constraint failed')) {
            return jsonResponse({ success: false, error: 'A client with this name or Tax ID already exists.' }, 409);
        }
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

/**
 * Updates an existing client.
 */
export async function updateClient(request, env, clientId) {
    const auth = await requireAdmin(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Forbidden' }, 403);
    }

    try {
        const body = await request.json();
        const fields = [];
        const bindings = [];

        const allowedFields = ['name', 'tax_id', 'contact_person', 'phone', 'email', 'address', 'status', 'region', 'notes'];
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                fields.push(`${field} = ?`);
                bindings.push(body[field]);
            }
        });

        if (fields.length === 0) {
            return jsonResponse({ success: false, error: 'No fields to update' }, 400);
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        bindings.push(clientId);

        const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`;
        await env.DB.prepare(query).bind(...bindings).run();

        return jsonResponse({ success: true, message: 'Client updated successfully' });
    } catch (error) {
        console.error(`Error updating client ${clientId}:`, error);
        if (error.message.includes('UNIQUE constraint failed')) {
            return jsonResponse({ success: false, error: 'A client with this name or Tax ID already exists.' }, 409);
        }
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

/**
 * Deletes a client.
 */
export async function deleteClient(request, env, clientId) {
    const auth = await requireAdmin(env.DB, request);
    if (!auth.authorized) {
        return jsonResponse({ error: 'Forbidden' }, 403);
    }

    try {
        // Foreign key constraints with ON DELETE CASCADE will handle related records.
        await env.DB.prepare(`DELETE FROM clients WHERE id = ?`).bind(clientId).run();
        return jsonResponse({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        console.error(`Error deleting client ${clientId}:`, error);
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

// ============================================================
// 2. Client Services API
// ============================================================

/**
 * 獲取客戶服務配置列表
 * GET /api/client-services?client_id=&service_type=&assigned_to=
 */
export async function getClientServices(request, env) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Unauthorized' }, 401); }

  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const serviceType = url.searchParams.get('service_type');
    const assignedTo = url.searchParams.get('assigned_to');
    
    let query = `
      SELECT 
        cs.*,
        c.name as client_name,
        u.username as assigned_to_name
      FROM client_services cs
      JOIN clients c ON cs.client_id = c.id
      LEFT JOIN users u ON cs.assigned_to = u.id
      WHERE 1=1
    `;
    const bindings = [];
    
    if (clientId) {
      query += ` AND cs.client_id = ?`;
      bindings.push(clientId);
    }
    
    if (serviceType) {
      query += ` AND cs.service_type = ?`;
      bindings.push(serviceType);
    }
    
    if (assignedTo) {
      query += ` AND cs.assigned_to = ?`;
      bindings.push(assignedTo);
    }
    
    query += ` ORDER BY c.name, cs.service_type`;
    
    const stmt = env.DB.prepare(query);
    const { results } = await (bindings.length > 0 ? stmt.bind(...bindings).all() : stmt.all());
    
    return jsonResponse({ 
      success: true, 
      data: results || []
    });
  } catch (error) {
    console.error('Error in getClientServices:', error);
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

/**
 * 創建客戶服務配置
 * POST /api/client-services
 */
export async function createClientService(request, env) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Forbidden' }, 403); }

  try {
    const body = await request.json();
    const {
      client_id, service_type, frequency, fee, estimated_hours, assigned_to,
      execution_day, advance_days, due_days, difficulty_level, is_active,
      notes, special_requirements, start_month, backup_assignee, invoice_count
    } = body;
    
    if (!client_id || !service_type || !frequency) {
      return jsonResponse({ success: false, error: 'Client ID, service type, and frequency are required.' }, 400);
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO client_services 
      (client_id, service_type, frequency, fee, estimated_hours, assigned_to, execution_day, advance_days, due_days, difficulty_level, is_active, notes, special_requirements, start_month, backup_assignee, invoice_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      client_id, service_type, frequency, fee || 0, estimated_hours || 0, assigned_to || null,
      execution_day || 15, advance_days || 7, due_days || 15, difficulty_level || 3,
      is_active === false ? 0 : 1, notes || null, special_requirements || null,
      start_month || null, backup_assignee || null, invoice_count || 0
    ).run();
    
    return jsonResponse({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Client service created successfully'
    }, 201);
  } catch (error) {
    console.error('Error in createClientService:', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 更新客戶服務配置
 * PUT /api/client-services/:id
 */
export async function updateClientService(request, env, serviceId) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Forbidden' }, 403); }

  try {
    const body = await request.json();
    const fields = [];
    const bindings = [];
    
    const allowedFields = [
      'service_type', 'frequency', 'fee', 'estimated_hours', 'assigned_to',
      'backup_assignee', 'start_month', 'execution_day', 'advance_days', 'due_days',
      'difficulty_level', 'invoice_count', 'is_active', 'notes', 'special_requirements'
    ];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        bindings.push(body[field]);
      }
    });
    
    if (fields.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(serviceId);
    
    await env.DB.prepare(`
      UPDATE client_services 
      SET ${fields.join(', ')}
      WHERE id = ?
    `).bind(...bindings).run();
    
    return jsonResponse({ success: true, message: 'Client service updated successfully' });
  } catch (error) {
    console.error(`Error updating client service ${serviceId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 切換服務啟用狀態
 * POST /api/client-services/:id/toggle
 */
export async function toggleClientService(request, env, serviceId) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Forbidden' }, 403); }

  try {
    const body = await request.json();
    const isActive = body.is_active;

    if (isActive === undefined) {
        return jsonResponse({ success: false, error: 'is_active field is required'}, 400);
    }
    
    await env.DB.prepare(`
      UPDATE client_services 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(isActive ? 1 : 0, serviceId).run();
    
    return jsonResponse({ 
      success: true,
      message: `Service has been ${isActive ? 'enabled' : 'disabled'}.`
    });
  } catch (error) {
    console.error(`Error toggling client service ${serviceId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 刪除客戶服務配置
 * DELETE /api/client-services/:id
 */
export async function deleteClientService(request, env, serviceId) {
  const auth = await requireAdmin(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Forbidden' }, 403); }

  try {
    await env.DB.prepare(`DELETE FROM client_services WHERE id = ?`).bind(serviceId).run();
    return jsonResponse({ success: true, message: 'Client service deleted successfully' });
  } catch (error) {
    console.error(`Error deleting client service ${serviceId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}


// ============================================================
// 3. Client Interactions API
// ============================================================

/**
 * 獲取客戶互動記錄（可依客戶篩選）
 */
export async function getClientInteractions(request, env) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Unauthorized' }, 401); }

  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    
    let query = `
        SELECT ci.*, c.name as client_name 
        FROM client_interactions ci
        JOIN clients c ON ci.client_id = c.id
    `;
    let params = [];
    
    if (clientId) {
      query += ` WHERE ci.client_id = ?`;
      params.push(clientId);
    }
    
    query += ` ORDER BY ci.interaction_date DESC, ci.created_at DESC`;
    
    const stmt = params.length > 0 
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);
    
    const { results } = await stmt.all();
    
    return jsonResponse({ success: true, data: results || [] });
  } catch (error) {
    console.error('Error getting client interactions:', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 創建客戶互動記錄
 */
export async function createClientInteraction(request, env) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Unauthorized' }, 401); }

  try {
    const data = await request.json();
    
    if (!data.client_id || !data.interaction_type || !data.interaction_date) {
        return jsonResponse({ success: false, error: 'Client ID, interaction type, and date are required.'}, 400);
    }

    const result = await env.DB.prepare(`
      INSERT INTO client_interactions (
        client_id, interaction_type, interaction_date,
        subject, content, created_by, participants, 
        follow_up_required, follow_up_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.client_id,
      data.interaction_type,
      data.interaction_date,
      data.subject || null,
      data.content || null,
      auth.user.username,
      data.participants || null,
      data.follow_up_required ? 1 : 0,
      data.follow_up_date || null
    ).run();
    
    return jsonResponse({ 
        success: true, 
        id: result.meta.last_row_id, 
        message: 'Interaction created successfully' 
    }, 201);
  } catch (error) {
    console.error('Error creating client interaction:', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 更新客戶互動記錄
 */
export async function updateClientInteraction(request, env, interactionId) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Unauthorized' }, 401); }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE client_interactions SET
        client_id = ?, interaction_type = ?, interaction_date = ?,
        subject = ?, content = ?, participants = ?, 
        follow_up_required = ?, follow_up_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.client_id,
      data.interaction_type,
      data.interaction_date,
      data.subject || null,
      data.content || null,
      data.participants || null,
      data.follow_up_required ? 1 : 0,
      data.follow_up_date || null,
      interactionId
    ).run();
    
    return jsonResponse({ success: true, message: 'Interaction updated successfully' });
  } catch (error) {
    console.error(`Error updating client interaction ${interactionId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 刪除客戶互動記錄
 */
export async function deleteClientInteraction(request, env, interactionId) {
  const auth = await requireAuth(env.DB, request);
  if (!auth.authorized) { return jsonResponse({ success: false, error: 'Unauthorized' }, 401); }

  try {
    await env.DB.prepare('DELETE FROM client_interactions WHERE id = ?')
      .bind(interactionId)
      .run();
    
    return jsonResponse({ success: true, message: 'Interaction deleted successfully' });
  } catch (error) {
    console.error(`Error deleting client interaction ${interactionId}:`, error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

