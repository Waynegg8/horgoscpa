// ================================================================
// SOP 文件管理 API
// 檔案: src/sop.js
// 日期: 2025-10-25
// ================================================================

import { verifySession, getSessionToken } from './auth.js';

// ============================================================
// 1. SOP 分類 API
// ============================================================

/**
 * 獲取所有 SOP 分類
 */
export async function getSopCategories(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `
      SELECT * FROM sop_categories
      ORDER BY sort_order, name
    `;
    
    const result = await env.DB.prepare(query).all();
    
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
 * 創建 SOP 分類
 */
export async function createSopCategory(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO sop_categories (name, parent_id, sort_order, description, icon)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.name,
      data.parent_id || null,
      data.sort_order || 0,
      data.description || null,
      data.icon || null
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: result.meta.last_row_id,
      message: 'Category created successfully'
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
// 2. SOP 文檔 API
// ============================================================

/**
 * 獲取所有 SOP（支援篩選）
 */
export async function getSops(request, env) {
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
    const categoryId = url.searchParams.get('category');
    const businessType = url.searchParams.get('business_type');
    const status = url.searchParams.get('status');
    
    let query = `
      SELECT 
        s.*,
        c.name as category_name
      FROM sops s
      LEFT JOIN sop_categories c ON s.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (categoryId) {
      query += ` AND s.category_id = ?`;
      params.push(categoryId);
    }
    
    if (businessType) {
      query += ` AND s.business_type = ?`;
      params.push(businessType);
    }
    
    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY s.updated_at DESC`;
    
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
 * 獲取單一 SOP
 */
export async function getSop(request, env, sopId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `
      SELECT 
        s.*,
        c.name as category_name
      FROM sops s
      LEFT JOIN sop_categories c ON s.category_id = c.id
      WHERE s.id = ?
    `;
    
    const result = await env.DB.prepare(query).bind(sopId).first();
    
    if (!result) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SOP not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 獲取標籤
    const tags = await env.DB.prepare(
      'SELECT tag FROM sop_tags WHERE sop_id = ?'
    ).bind(sopId).all();
    
    result.tags = tags.results.map(t => t.tag);
    
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
 * 創建 SOP
 */
export async function createSop(request, env) {
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
    
    // 插入 SOP
    const query = `
      INSERT INTO sops (
        title, category_id, content, version, status,
        business_type, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.title,
      data.category_id || null,
      data.content,
      data.version || '1.0',
      data.status || 'draft',
      data.business_type || null,
      sessionData.username
    ).run();
    
    const sopId = result.meta.last_row_id;
    
    // 插入標籤
    if (data.tags && Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        await env.DB.prepare(
          'INSERT INTO sop_tags (sop_id, tag) VALUES (?, ?)'
        ).bind(sopId, tag).run();
      }
    }
    
    // 創建初始版本記錄
    await env.DB.prepare(`
      INSERT INTO sop_versions (sop_id, version, content, changed_by, change_notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sopId,
      data.version || '1.0',
      data.content,
      sessionData.username,
      '初始版本'
    ).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      id: sopId,
      message: 'SOP created successfully'
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
 * 更新 SOP
 */
export async function updateSop(request, env, sopId) {
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
    
    // 獲取舊版本
    const oldSop = await env.DB.prepare('SELECT * FROM sops WHERE id = ?')
      .bind(sopId).first();
    
    if (!oldSop) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SOP not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 更新 SOP
    const query = `
      UPDATE sops SET
        title = ?,
        category_id = ?,
        content = ?,
        version = ?,
        status = ?,
        business_type = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.title || oldSop.title,
      data.category_id !== undefined ? data.category_id : oldSop.category_id,
      data.content || oldSop.content,
      data.version || oldSop.version,
      data.status || oldSop.status,
      data.business_type !== undefined ? data.business_type : oldSop.business_type,
      sessionData.username,
      sopId
    ).run();
    
    // 如果內容有變更，創建版本記錄
    if (data.content && data.content !== oldSop.content) {
      await env.DB.prepare(`
        INSERT INTO sop_versions (sop_id, version, content, changed_by, change_notes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        sopId,
        data.version || oldSop.version,
        data.content,
        sessionData.username,
        data.change_notes || '內容更新'
      ).run();
    }
    
    // 更新標籤
    if (data.tags && Array.isArray(data.tags)) {
      // 刪除舊標籤
      await env.DB.prepare('DELETE FROM sop_tags WHERE sop_id = ?').bind(sopId).run();
      
      // 插入新標籤
      for (const tag of data.tags) {
        await env.DB.prepare(
          'INSERT INTO sop_tags (sop_id, tag) VALUES (?, ?)'
        ).bind(sopId, tag).run();
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'SOP updated successfully'
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
 * 刪除 SOP
 */
export async function deleteSop(request, env, sopId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.DB.prepare('DELETE FROM sops WHERE id = ?').bind(sopId).run();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'SOP deleted successfully'
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
// 3. SOP 版本歷史 API
// ============================================================

/**
 * 獲取 SOP 版本歷史
 */
export async function getSopVersions(request, env, sopId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const query = `
      SELECT * FROM sop_versions
      WHERE sop_id = ?
      ORDER BY changed_at DESC
    `;
    
    const result = await env.DB.prepare(query).bind(sopId).all();
    
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

// ============================================================
// 4. SOP 搜尋 API
// ============================================================

/**
 * 搜尋 SOP
 */
export async function searchSops(request, env) {
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
    const q = url.searchParams.get('q');
    
    if (!q) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Search query required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const query = `
      SELECT 
        s.*,
        c.name as category_name
      FROM sops s
      LEFT JOIN sop_categories c ON s.category_id = c.id
      WHERE s.status = 'published'
        AND (s.title LIKE ? OR s.content LIKE ?)
      ORDER BY s.updated_at DESC
      LIMIT 50
    `;
    
    const searchTerm = `%${q}%`;
    const result = await env.DB.prepare(query).bind(searchTerm, searchTerm).all();
    
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

