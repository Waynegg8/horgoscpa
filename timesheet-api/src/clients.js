// ================================================================
// 客戶關係管理 API
// 檔案: src/clients.js
// 日期: 2025-10-25
// ================================================================

import { verifySession, getSessionToken } from './auth.js';
import { jsonResponse } from './utils.js';

// ============================================================
// 1. 客戶詳細資料 API
// ============================================================

/**
 * 獲取所有客戶詳細資料
 */
export async function getClientsExtended(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // 聯合查詢 clients 和 clients_extended
    const query = `
      SELECT 
        c.name,
        ce.*
      FROM clients c
      LEFT JOIN clients_extended ce ON c.name = ce.client_name
      ORDER BY c.name
    `;
    
    const result = await env.DB.prepare(query).all();
    
    return jsonResponse({ 
      success: true, 
      data: result.results 
    });
  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

/**
 * 獲取單一客戶詳細資料
 */
export async function getClientExtended(request, env, clientName) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const query = `
      SELECT 
        c.name,
        ce.*
      FROM clients c
      LEFT JOIN clients_extended ce ON c.name = ce.client_name
      WHERE c.name = ?
    `;
    
    const result = await env.DB.prepare(query).bind(clientName).first();
    
    if (!result) {
      return jsonResponse({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }
    
    return jsonResponse({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

/**
 * 創建或更新客戶詳細資料
 */
export async function upsertClientExtended(request, env, clientName) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    // 使用 UPSERT (INSERT OR REPLACE)
    const query = `
      INSERT INTO clients_extended (
        client_name, tax_id, contact_person_1, contact_person_2,
        phone, email, address, monthly_fee,
        service_accounting, service_tax_return, service_income_tax,
        service_registration, service_withholding, service_prepayment,
        service_payroll, service_annual_report, service_audit,
        notes, region, status, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(client_name) DO UPDATE SET
        tax_id = excluded.tax_id,
        contact_person_1 = excluded.contact_person_1,
        contact_person_2 = excluded.contact_person_2,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        monthly_fee = excluded.monthly_fee,
        service_accounting = excluded.service_accounting,
        service_tax_return = excluded.service_tax_return,
        service_income_tax = excluded.service_income_tax,
        service_registration = excluded.service_registration,
        service_withholding = excluded.service_withholding,
        service_prepayment = excluded.service_prepayment,
        service_payroll = excluded.service_payroll,
        service_annual_report = excluded.service_annual_report,
        service_audit = excluded.service_audit,
        notes = excluded.notes,
        region = excluded.region,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await env.DB.prepare(query).bind(
      clientName,
      data.tax_id || null,
      data.contact_person_1 || null,
      data.contact_person_2 || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.monthly_fee || 0,
      data.service_accounting ? 1 : 0,
      data.service_tax_return ? 1 : 0,
      data.service_income_tax ? 1 : 0,
      data.service_registration ? 1 : 0,
      data.service_withholding ? 1 : 0,
      data.service_prepayment ? 1 : 0,
      data.service_payroll ? 1 : 0,
      data.service_annual_report ? 1 : 0,
      data.service_audit ? 1 : 0,
      data.notes || null,
      data.region || null,
      data.status || 'active'
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Client extended data saved successfully'
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
// 2. 服務排程 API
// ============================================================

/**
 * 獲取所有服務排程（可依客戶篩選）
 */
export async function getServiceSchedule(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const clientName = url.searchParams.get('client');
    
    let query = `SELECT * FROM service_schedule`;
    let params = [];
    
    if (clientName) {
      query += ` WHERE client_name = ?`;
      params.push(clientName);
    }
    
    query += ` ORDER BY client_name, service_type`;
    
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
 * 創建服務排程
 */
export async function createServiceSchedule(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO service_schedule (
        tax_id, client_name, service_type, frequency, monthly_fee,
        month_1, month_2, month_3, month_4, month_5, month_6,
        month_7, month_8, month_9, month_10, month_11, month_12,
        service_details, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.tax_id,
      data.client_name,
      data.service_type,
      data.frequency || '每月',
      data.monthly_fee || 0,
      data.month_1 ? 1 : 0,
      data.month_2 ? 1 : 0,
      data.month_3 ? 1 : 0,
      data.month_4 ? 1 : 0,
      data.month_5 ? 1 : 0,
      data.month_6 ? 1 : 0,
      data.month_7 ? 1 : 0,
      data.month_8 ? 1 : 0,
      data.month_9 ? 1 : 0,
      data.month_10 ? 1 : 0,
      data.month_11 ? 1 : 0,
      data.month_12 ? 1 : 0,
      data.service_details || null,
      data.notes || null
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Service schedule created successfully'
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
 * 更新服務排程
 */
export async function updateServiceSchedule(request, env, scheduleId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE service_schedule SET
        tax_id = ?,
        client_name = ?,
        service_type = ?,
        frequency = ?,
        monthly_fee = ?,
        month_1 = ?, month_2 = ?, month_3 = ?, month_4 = ?,
        month_5 = ?, month_6 = ?, month_7 = ?, month_8 = ?,
        month_9 = ?, month_10 = ?, month_11 = ?, month_12 = ?,
        service_details = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.tax_id,
      data.client_name,
      data.service_type,
      data.frequency || '每月',
      data.monthly_fee || 0,
      data.month_1 ? 1 : 0,
      data.month_2 ? 1 : 0,
      data.month_3 ? 1 : 0,
      data.month_4 ? 1 : 0,
      data.month_5 ? 1 : 0,
      data.month_6 ? 1 : 0,
      data.month_7 ? 1 : 0,
      data.month_8 ? 1 : 0,
      data.month_9 ? 1 : 0,
      data.month_10 ? 1 : 0,
      data.month_11 ? 1 : 0,
      data.month_12 ? 1 : 0,
      data.service_details || null,
      data.notes || null,
      scheduleId
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Service schedule updated successfully'
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
 * 刪除服務排程
 */
export async function deleteServiceSchedule(request, env, scheduleId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.DB.prepare('DELETE FROM service_schedule WHERE id = ?')
      .bind(scheduleId)
      .run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Service schedule deleted successfully'
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
// 3. 客戶互動記錄 API
// ============================================================

/**
 * 獲取客戶互動記錄（可依客戶篩選）
 */
export async function getClientInteractions(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const clientName = url.searchParams.get('client');
    
    let query = `SELECT * FROM client_interactions`;
    let params = [];
    
    if (clientName) {
      query += ` WHERE client_name = ?`;
      params.push(clientName);
    }
    
    query += ` ORDER BY interaction_date DESC, created_at DESC`;
    
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
 * 創建客戶互動記錄
 */
export async function createClientInteraction(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO client_interactions (
        client_name, interaction_type, interaction_date,
        subject, content, handled_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.client_name,
      data.interaction_type,
      data.interaction_date,
      data.subject || null,
      data.content || null,
      data.handled_by || null
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Interaction created successfully'
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
 * 更新客戶互動記錄
 */
export async function updateClientInteraction(request, env, interactionId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE client_interactions SET
        client_name = ?,
        interaction_type = ?,
        interaction_date = ?,
        subject = ?,
        content = ?,
        handled_by = ?
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.client_name,
      data.interaction_type,
      data.interaction_date,
      data.subject || null,
      data.content || null,
      data.handled_by || null,
      interactionId
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Interaction updated successfully'
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
 * 刪除客戶互動記錄
 */
export async function deleteClientInteraction(request, env, interactionId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.DB.prepare('DELETE FROM client_interactions WHERE id = ?')
      .bind(interactionId)
      .run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Interaction deleted successfully'
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
// 4. CSV 匯入功能
// ============================================================

/**
 * 匯入客戶資料（從 CSV）
 */
export async function importClients(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized - Admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const records = data.records; // 陣列格式的 CSV 資料
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const record of records) {
      try {
        // 先確保基本客戶存在
        const clientExists = await env.DB.prepare(
          'SELECT name FROM clients WHERE name = ?'
        ).bind(record.client_name).first();
        
        if (!clientExists) {
          // 創建基本客戶記錄
          await env.DB.prepare(`
            INSERT INTO clients (name, contact_person)
            VALUES (?, ?)
          `).bind(record.client_name, record.contact_person_1 || '').run();
        }
        
        // 插入或更新詳細資料
        await env.DB.prepare(`
          INSERT INTO clients_extended (
            client_name, tax_id, contact_person_1, contact_person_2,
            phone, email, address, monthly_fee,
            service_accounting, service_tax_return, service_income_tax,
            service_registration, service_withholding, service_prepayment,
            service_payroll, service_annual_report, service_audit,
            notes, region, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(client_name) DO UPDATE SET
            tax_id = excluded.tax_id,
            contact_person_1 = excluded.contact_person_1,
            contact_person_2 = excluded.contact_person_2,
            phone = excluded.phone,
            email = excluded.email,
            address = excluded.address,
            monthly_fee = excluded.monthly_fee,
            service_accounting = excluded.service_accounting,
            service_tax_return = excluded.service_tax_return,
            service_income_tax = excluded.service_income_tax,
            service_registration = excluded.service_registration,
            service_withholding = excluded.service_withholding,
            service_prepayment = excluded.service_prepayment,
            service_payroll = excluded.service_payroll,
            service_annual_report = excluded.service_annual_report,
            service_audit = excluded.service_audit,
            notes = excluded.notes,
            region = excluded.region,
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          record.client_name,
          record.tax_id || null,
          record.contact_person_1 || null,
          record.contact_person_2 || null,
          record.phone || null,
          record.email || null,
          record.address || null,
          record.monthly_fee || 0,
          record.service_accounting ? 1 : 0,
          record.service_tax_return ? 1 : 0,
          record.service_income_tax ? 1 : 0,
          record.service_registration ? 1 : 0,
          record.service_withholding ? 1 : 0,
          record.service_prepayment ? 1 : 0,
          record.service_payroll ? 1 : 0,
          record.service_annual_report ? 1 : 0,
          record.service_audit ? 1 : 0,
          record.notes || null,
          record.region || null,
          record.status || 'active'
        ).run();
        
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({
          client_name: record.client_name,
          error: err.message
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      successCount,
      errorCount,
      errors,
      message: `Imported ${successCount} clients successfully, ${errorCount} failed`
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

