/**
 * FAQ管理 API
 * 提供FAQ的CRUD操作
 */

export async function handleFAQRequest(request, env, ctx, pathname, me) {
  const method = request.method;
  
  // GET /internal/api/v1/faq - 获取FAQ列表
  if (method === 'GET' && pathname === '/internal/api/v1/faq') {
    return await getFAQList(request, env, me);
  }
  
  // GET /internal/api/v1/faq/:id - 获取单个FAQ详情
  if (method === 'GET' && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split('/').pop());
    return await getFAQById(env, faqId, me);
  }
  
  // POST /internal/api/v1/faq - 创建FAQ
  if (method === 'POST' && pathname === '/internal/api/v1/faq') {
    return await createFAQ(request, env, me);
  }
  
  // PUT /internal/api/v1/faq/:id - 更新FAQ
  if (method === 'PUT' && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split('/').pop());
    return await updateFAQ(request, env, faqId, me);
  }
  
  // DELETE /internal/api/v1/faq/:id - 删除FAQ（软删除）
  if (method === 'DELETE' && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split('/').pop());
    return await deleteFAQ(env, faqId, me);
  }
  
  return null;
}

// 获取FAQ列表
async function getFAQList(request, env, me) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('perPage')) || 20;
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const scope = url.searchParams.get('scope') || '';
    const clientId = url.searchParams.get('client_id') || '';
    const tags = url.searchParams.get('tags') || '';
    
    const offset = (page - 1) * perPage;
    
    // 构建查询条件
    let whereClauses = ['is_deleted = 0'];
    const params = [];
    
    if (q) {
      whereClauses.push('(question LIKE ? OR answer LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    
    if (category && category !== 'all') {
      whereClauses.push('category = ?');
      params.push(category);
    }
    
    if (scope && (scope === 'service' || scope === 'task')) {
      whereClauses.push('scope = ?');
      params.push(scope);
    }
    
    if (clientId && clientId !== 'all') {
      whereClauses.push('client_id = ?');
      params.push(parseInt(clientId));
    }
    
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      tagList.forEach(tag => {
        whereClauses.push('tags LIKE ?');
        params.push(`%${tag}%`);
      });
    }
    
    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 查询总数
    const countSQL = `SELECT COUNT(*) as total FROM InternalFAQ ${whereSQL}`;
    const countResult = await env.DATABASE.prepare(countSQL).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 查询数据
    const dataSQL = `
      SELECT 
        faq_id, 
        question, 
        answer, 
        category, 
        scope,
        client_id,
        tags, 
        created_by, 
        created_at, 
        updated_at
      FROM InternalFAQ
      ${whereSQL}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await env.DATABASE.prepare(dataSQL)
      .bind(...params, perPage, offset)
      .all();
    
    const faqs = (results.results || []).map(row => ({
      faq_id: row.faq_id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      scope: row.scope || null,
      clientId: row.client_id || null,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return new Response(JSON.stringify({
      ok: true,
      data: faqs,
      meta: { total, page, perPage }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('获取FAQ列表失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '获取FAQ列表失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取单个FAQ详情
async function getFAQById(env, faqId, me) {
  try {
    const result = await env.DATABASE.prepare(`
      SELECT 
        faq_id, 
        question, 
        answer, 
        category, 
        scope,
        client_id,
        tags, 
        created_by, 
        created_at, 
        updated_at
      FROM InternalFAQ
      WHERE faq_id = ? AND is_deleted = 0
    `).bind(faqId).first();
    
    if (!result) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'FAQ不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const faq = {
      faq_id: result.faq_id,
      question: result.question,
      answer: result.answer,
      category: result.category,
      scope: result.scope || null,
      clientId: result.client_id || null,
      tags: result.tags ? result.tags.split(',').map(t => t.trim()) : [],
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
    
    return new Response(JSON.stringify({
      ok: true,
      data: faq
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('获取FAQ详情失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '获取FAQ详情失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 创建FAQ
async function createFAQ(request, env, me) {
  try {
    const body = await request.json();
    const { question, answer, category, scope, client_id, tags } = body;
    
    // 验证必填字段
    if (!question || !answer) {
      return new Response(JSON.stringify({
        ok: false,
        error: '问题和答案为必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return new Response(JSON.stringify({
        ok: false,
        error: '必須指定FAQ適用層級（service或task）'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const now = new Date().toISOString();
    
    const result = await env.DATABASE.prepare(`
      INSERT INTO InternalFAQ (
        question, 
        answer, 
        category, 
        scope,
        client_id,
        tags, 
        created_by, 
        created_at, 
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      question,
      answer,
      category || null,
      scope,
      client_id || null,
      tagsStr,
      me?.user_id || null,
      now,
      now
    ).run();
    
    return new Response(JSON.stringify({
      ok: true,
      data: { 
        faq_id: result.meta.last_row_id,
        question,
        answer,
        category,
        scope,
        clientId: client_id || null,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
        createdBy: me?.user_id,
        createdAt: now,
        updatedAt: now
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('创建FAQ失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '创建FAQ失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 更新FAQ
async function updateFAQ(request, env, faqId, me) {
  try {
    const body = await request.json();
    const { question, answer, category, scope, client_id, tags } = body;
    
    // 验证FAQ是否存在
    const existing = await env.DATABASE.prepare(
      'SELECT faq_id FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0'
    ).bind(faqId).first();
    
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'FAQ不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 验证必填字段
    if (!question || !answer) {
      return new Response(JSON.stringify({
        ok: false,
        error: '问题和答案为必填项'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return new Response(JSON.stringify({
        ok: false,
        error: '必須指定FAQ適用層級（service或task）'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const now = new Date().toISOString();
    
    await env.DATABASE.prepare(`
      UPDATE InternalFAQ
      SET 
        question = ?,
        answer = ?,
        category = ?,
        scope = ?,
        client_id = ?,
        tags = ?,
        updated_at = ?
      WHERE faq_id = ? AND is_deleted = 0
    `).bind(
      question,
      answer,
      category || null,
      scope,
      client_id || null,
      tagsStr,
      now,
      faqId
    ).run();
    
    return new Response(JSON.stringify({
      ok: true,
      data: {
        faq_id: faqId,
        question,
        answer,
        category,
        scope,
        clientId: client_id || null,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
        updatedAt: now
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('更新FAQ失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '更新FAQ失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 删除FAQ（软删除）
async function deleteFAQ(env, faqId, me) {
  try {
    // 验证FAQ是否存在
    const existing = await env.DATABASE.prepare(
      'SELECT faq_id FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0'
    ).bind(faqId).first();
    
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'FAQ不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 软删除
    await env.DATABASE.prepare(`
      UPDATE InternalFAQ
      SET is_deleted = 1, updated_at = ?
      WHERE faq_id = ?
    `).bind(new Date().toISOString(), faqId).run();
    
    return new Response(JSON.stringify({
      ok: true,
      message: 'FAQ已删除'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('删除FAQ失败:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: '删除FAQ失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

