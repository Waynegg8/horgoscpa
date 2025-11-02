/**
 * 内部文档资源中心 API
 * 提供文档上传、列表、删除功能
 */

import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleDocumentsRequest(request, env, ctx, pathname, me) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method;
  
  // GET /internal/api/v1/documents - 获取文档列表
  if (method === 'GET' && pathname === '/internal/api/v1/documents') {
    return await getDocumentsList(request, env, me, corsHeaders);
  }
  
  // GET /internal/api/v1/documents/:id - 获取单个文档详情
  if (method === 'GET' && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split('/').pop());
    return await getDocumentById(env, docId, me, corsHeaders);
  }
  
  // GET /internal/api/v1/documents/:id/download - 下载文档
  if (method === 'GET' && pathname.match(/^\/internal\/api\/v1\/documents\/\d+\/download$/)) {
    const docId = parseInt(pathname.split('/').slice(-2)[0]);
    return await downloadDocument(env, docId, me, corsHeaders);
  }
  
  // POST /internal/api/v1/documents/upload - 上传文档（一步完成）
  if (method === 'POST' && pathname === '/internal/api/v1/documents/upload') {
    return await uploadDocument(request, env, me, corsHeaders);
  }
  
  // POST /internal/api/v1/documents - 创建文档记录（上传后）
  if (method === 'POST' && pathname === '/internal/api/v1/documents') {
    return await createDocument(request, env, me, corsHeaders);
  }
  
  // PUT /internal/api/v1/documents/:id - 更新文档信息
  if (method === 'PUT' && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split('/').pop());
    return await updateDocument(request, env, docId, me, corsHeaders);
  }
  
  // DELETE /internal/api/v1/documents/:id - 删除文档
  if (method === 'DELETE' && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split('/').pop());
    return await deleteDocument(env, docId, me, corsHeaders);
  }
  
  return null;
}

// 获取文档列表
async function getDocumentsList(request, env, me, corsHeaders) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('perPage')) || 20;
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const scope = url.searchParams.get('scope') || '';
    const tags = url.searchParams.get('tags') || '';
    
    const offset = (page - 1) * perPage;
    
    // 构建查询条件
    let whereClauses = ['d.is_deleted = 0'];
    const params = [];
    
    if (q) {
      whereClauses.push('(d.title LIKE ? OR d.description LIKE ? OR d.file_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    
    if (category && category !== 'all') {
      whereClauses.push('d.category = ?');
      params.push(category);
    }
    
    if (scope && (scope === 'service' || scope === 'task')) {
      whereClauses.push('d.scope = ?');
      params.push(scope);
    }
    
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      tagList.forEach(tag => {
        whereClauses.push('d.tags LIKE ?');
        params.push(`%${tag}%`);
      });
    }
    
    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 查询总数
    const countSQL = `SELECT COUNT(*) as total FROM InternalDocuments d ${whereSQL}`;
    const countResult = await env.DATABASE.prepare(countSQL).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 查询数据
    const dataSQL = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.file_name,
        d.file_url,
        d.file_size,
        d.file_type,
        d.category,
        d.scope,
        d.tags,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        COALESCE(u.username, u.name, '未知') as uploader_name
      FROM InternalDocuments d
      LEFT JOIN Users u ON d.uploaded_by = u.user_id
      ${whereSQL}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await env.DATABASE.prepare(dataSQL)
      .bind(...params, perPage, offset)
      .all();
    
    const documents = (results.results || []).map(row => ({
      document_id: row.document_id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      fileType: row.file_type,
      category: row.category,
      scope: row.scope || null,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
      uploadedBy: row.uploaded_by,
      uploaderName: row.uploader_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return new Response(JSON.stringify({
      ok: true,
      code: 'OK',
      message: '成功',
      data: documents,
      meta: { total, page, perPage, requestId: 'doc-list' }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('获取文档列表失败:', err);
    console.error('错误详情:', err.message, err.stack);
    return new Response(JSON.stringify({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: '伺服器錯誤',
      error: err.message || String(err),
      stack: err.stack || '',
      meta: { requestId: 'doc-list' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 获取单个文档详情
async function getDocumentById(env, docId, me, corsHeaders) {
  try {
    const result = await env.DATABASE.prepare(`
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.file_name,
        d.file_url,
        d.file_size,
        d.file_type,
        d.category,
        d.tags,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        COALESCE(u.username, u.name, '未知') as uploader_name
      FROM InternalDocuments d
      LEFT JOIN Users u ON d.uploaded_by = u.user_id
      WHERE d.document_id = ? AND d.is_deleted = 0
    `).bind(docId).first();
    
    if (!result) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文档不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const document = {
      document_id: result.document_id,
      title: result.title,
      description: result.description,
      fileName: result.file_name,
      fileUrl: result.file_url,
      fileSize: result.file_size,
      fileType: result.file_type,
      category: result.category,
      tags: result.tags ? result.tags.split(',').map(t => t.trim()) : [],
      uploadedBy: result.uploaded_by,
      uploaderName: result.uploader_name,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
    
    return new Response(JSON.stringify({
      ok: true,
      data: document
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('获取文档详情失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '获取文档详情失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 下载文档
async function downloadDocument(env, docId, me, corsHeaders) {
  try {
    // 获取文档信息
    const doc = await env.DATABASE.prepare(`
      SELECT file_url, file_name, file_type
      FROM InternalDocuments
      WHERE document_id = ? AND is_deleted = 0
    `).bind(docId).first();
    
    if (!doc) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文档不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 从 R2 获取文件
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'R2 未配置'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const object = await env.R2_BUCKET.get(doc.file_url);
    
    if (!object) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文件不存在於存儲中'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 返回文件
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.file_name || 'document'}"`,
        'Cache-Control': 'private, max-age=3600',
        ...corsHeaders
      }
    });
    
  } catch (err) {
    console.error('下载文档失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '下载文档失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 上传文档（一步完成：上传到R2 + 创建DB记录）
async function uploadDocument(request, env, me, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const category = formData.get('category') || '';
    const scope = formData.get('scope') || '';
    const tags = formData.get('tags') || '';
    
    // 验证必填字段
    if (!file || !title) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文件和标题为必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return new Response(JSON.stringify({
        ok: false,
        error: '必須指定資源適用層級（service或task）'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文件大小不能超过 10MB'
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 生成 R2 对象键
    const now = Date.now();
    const envName = String(env.APP_ENV || 'dev');
    const ext = file.name.split('.').pop() || 'bin';
    const objectKey = `private/${envName}/documents/${now}_${file.name}`;
    
    // 上传到 R2
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'R2 未配置'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    await env.R2_BUCKET.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`
      },
      customMetadata: {
        ownerId: String(me.user_id),
        module: 'documents'
      }
    });
    
    // 创建数据库记录
    const tagsStr = tags;
    const nowISO = new Date().toISOString();
    
    const result = await env.DATABASE.prepare(`
      INSERT INTO InternalDocuments (
        title,
        description,
        file_name,
        file_url,
        file_size,
        file_type,
        category,
        scope,
        tags,
        uploaded_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      title,
      description || null,
      file.name,
      objectKey,
      file.size,
      file.type,
      category || null,
      scope,
      tagsStr,
      me?.user_id || null,
      nowISO,
      nowISO
    ).run();
    
    return new Response(JSON.stringify({
      ok: true,
      data: {
        document_id: result.meta.last_row_id,
        title,
        description,
        fileName: file.name,
        fileUrl: objectKey,
        fileSize: file.size,
        fileType: file.type,
        category,
        scope,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
        uploadedBy: me?.user_id,
        createdAt: nowISO,
        updatedAt: nowISO
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('上传文档失败:', err);
    console.error('错误详情:', err.message, err.stack);
    return new Response(JSON.stringify({
      ok: false,
      error: '上传文档失败：' + (err.message || String(err))
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 创建文档记录
async function createDocument(request, env, me, corsHeaders) {
  try {
    const body = await request.json();
    const { title, description, file_name, file_url, file_size, file_type, category, scope, tags } = body;
    
    // 验证必填字段
    if (!title || !file_name || !file_url) {
      return new Response(JSON.stringify({
        ok: false,
        error: '标题、文件名和文件URL为必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return new Response(JSON.stringify({
        ok: false,
        error: '必須指定資源適用層級（service或task）'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const now = new Date().toISOString();
    
    const result = await env.DATABASE.prepare(`
      INSERT INTO InternalDocuments (
        title,
        description,
        file_name,
        file_url,
        file_size,
        file_type,
        category,
        scope,
        tags,
        uploaded_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      title,
      description || null,
      file_name,
      file_url,
      file_size || null,
      file_type || null,
      category || null,
      scope,
      tagsStr,
      me?.user_id || null,
      now,
      now
    ).run();
    
    return new Response(JSON.stringify({
      ok: true,
      data: {
        document_id: result.meta.last_row_id,
        title,
        description,
        fileName: file_name,
        fileUrl: file_url,
        fileSize: file_size,
        fileType: file_type,
        category,
        scope,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
        uploadedBy: me?.user_id,
        createdAt: now,
        updatedAt: now
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('创建文档记录失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '创建文档记录失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 更新文档信息
async function updateDocument(request, env, docId, me, corsHeaders) {
  try {
    const body = await request.json();
    const { title, description, category, scope, tags } = body;
    
    // 验证文档是否存在
    const existing = await env.DATABASE.prepare(
      'SELECT document_id FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0'
    ).bind(docId).first();
    
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文档不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 验证必填字段
    if (!title) {
      return new Response(JSON.stringify({
        ok: false,
        error: '标题为必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return new Response(JSON.stringify({
        ok: false,
        error: '必須指定資源適用層級（service或task）'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const now = new Date().toISOString();
    
    await env.DATABASE.prepare(`
      UPDATE InternalDocuments
      SET 
        title = ?,
        description = ?,
        category = ?,
        scope = ?,
        tags = ?,
        updated_at = ?
      WHERE document_id = ? AND is_deleted = 0
    `).bind(
      title,
      description || null,
      category || null,
      scope,
      tagsStr,
      now,
      docId
    ).run();
    
    return new Response(JSON.stringify({
      ok: true,
      data: {
        document_id: docId,
        title,
        description,
        category,
        scope,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
        updatedAt: now
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('更新文档信息失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '更新文档信息失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 删除文档
async function deleteDocument(env, docId, me, corsHeaders) {
  try {
    // 验证文档是否存在
    const existing = await env.DATABASE.prepare(
      'SELECT document_id, file_url FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0'
    ).bind(docId).first();
    
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文档不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 软删除
    await env.DATABASE.prepare(`
      UPDATE InternalDocuments
      SET is_deleted = 1, updated_at = ?
      WHERE document_id = ?
    `).bind(new Date().toISOString(), docId).run();
    
    // TODO: 可选：从R2删除实际文件
    // if (existing.file_url && env.R2_BUCKET) {
    //   const key = existing.file_url.split('/').pop();
    //   await env.R2_BUCKET.delete(key);
    // }
    
    return new Response(JSON.stringify({
      ok: true,
      message: '文档已删除'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (err) {
    console.error('删除文档失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '删除文档失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

