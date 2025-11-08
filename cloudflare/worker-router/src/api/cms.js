import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleCMS(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

  // Public API - 获取已发布的文章列表（不需要登录）
  if (path === "/api/v1/public/articles" && method === "GET") {
    try {
      const p = url.searchParams;
      const category = (p.get("category") || "").trim();
      const tag = (p.get("tag") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(50, Math.max(1, parseInt(p.get("perPage") || "10", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0", "is_published = 1"]; const binds = [];
      if (category) { where.push("category = ?"); binds.push(category); }
      if (tag) { where.push("tags LIKE ?"); binds.push(`%${tag}%`); }
      if (keyword) { where.push("(title LIKE ? OR summary LIKE ?)"); binds.push(`%${keyword}%`, `%${keyword}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ExternalArticles ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT article_id, title, slug, summary, featured_image, category, tags, published_at, view_count
         FROM ExternalArticles
         ${whereSql}
         ORDER BY published_at DESC, article_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map(r => ({
        id: r.article_id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        featuredImage: r.featured_image,
        category: r.category || '',
        tags: (()=>{ try { return JSON.parse(r.tags || '[]'); } catch(_) { return []; } })(),
        publishedAt: r.published_at,
        viewCount: Number(r.view_count || 0),
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Public API - 获取单篇已发布文章
  if (path.match(/^\/api\/v1\/public\/articles\/[\w-]+$/) && method === "GET") {
    try {
      const slugOrId = path.split('/').pop();
      const isId = /^\d+$/.test(slugOrId);
      const article = await env.DATABASE.prepare(
        `SELECT article_id, title, slug, summary, content, featured_image, category, tags, 
                published_at, view_count, seo_title, seo_description, seo_keywords
         FROM ExternalArticles
         WHERE ${isId ? 'article_id' : 'slug'} = ? AND is_deleted = 0 AND is_published = 1`
      ).bind(isId ? parseInt(slugOrId) : slugOrId).first();
      
      if (!article) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"文章不存在", meta:{ requestId } }, corsHeaders);
      }
      
      // 增加浏览次数
      await env.DATABASE.prepare(
        `UPDATE ExternalArticles SET view_count = view_count + 1 WHERE article_id = ?`
      ).bind(article.article_id).run();
      
      const data = {
        id: article.article_id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        featuredImage: article.featured_image,
        category: article.category,
        tags: (()=>{ try { return JSON.parse(article.tags || '[]'); } catch(_) { return []; } })(),
        publishedAt: article.published_at,
        viewCount: Number(article.view_count || 0) + 1,
        seoTitle: article.seo_title,
        seoDescription: article.seo_description,
        seoKeywords: article.seo_keywords,
      };
      
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // 全部端點皆要求管理員；上層 router 已檢查，但這裡再保險
  if (!me?.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);

  // Articles list
  if (path === "/internal/api/v1/admin/articles" && method === "GET") {
    try {
      const p = url.searchParams;
      const status = (p.get("status") || "all").trim();
      const category = (p.get("category") || "").trim();
      const tag = (p.get("tag") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0"]; const binds = [];
      if (status === 'published') { where.push("is_published = 1"); }
      if (status === 'draft') { where.push("is_published = 0"); }
      if (category) { where.push("category = ?"); binds.push(category); }
      if (tag) { where.push("tags LIKE ?"); binds.push(`%${tag}%`); }
      if (keyword) { where.push("(title LIKE ? OR summary LIKE ?)"); binds.push(`%${keyword}%`, `%${keyword}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ExternalArticles ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT article_id, title, slug, category, tags, is_published, updated_at, view_count
         FROM ExternalArticles
         ${whereSql}
         ORDER BY updated_at DESC, article_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map(r => ({
        id: r.article_id,
        title: r.title,
        slug: r.slug,
        category: r.category || '',
        tags: (()=>{ try { return JSON.parse(r.tags || '[]'); } catch(_) { return []; } })(),
        isPublished: r.is_published === 1,
        updatedAt: r.updated_at,
        viewCount: Number(r.view_count || 0),
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // FAQ list
  if (path === "/internal/api/v1/admin/faq" && method === "GET") {
    try {
      const p = url.searchParams;
      const status = (p.get("status") || "all").trim();
      const category = (p.get("category") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0"]; const binds = [];
      if (status === 'published') where.push("is_published = 1");
      if (status === 'draft') where.push("is_published = 0");
      if (category) { where.push("category = ?"); binds.push(category); }
      if (keyword) { where.push("question LIKE ?"); binds.push(`%${keyword}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ExternalFAQ ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT faq_id, question, category, sort_order, is_published, updated_at
         FROM ExternalFAQ
         ${whereSql}
         ORDER BY updated_at DESC, sort_order ASC, faq_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map(r => ({
        id: r.faq_id,
        question: r.question,
        category: r.category || '',
        sortOrder: Number(r.sort_order || 0),
        isPublished: r.is_published === 1,
        updatedAt: r.updated_at,
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Resources list
  if (path === "/internal/api/v1/admin/resources" && method === "GET") {
    try {
      const p = url.searchParams;
      const category = (p.get("category") || "").trim();
      const fileType = (p.get("file_type") || p.get("type") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0"]; const binds = [];
      if (category) { where.push("category = ?"); binds.push(category); }
      if (fileType) { where.push("file_type = ?"); binds.push(fileType); }
      if (keyword) { where.push("title LIKE ?"); binds.push(`%${keyword}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ResourceCenter ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT resource_id, title, category, file_type, file_size, file_url, download_count, updated_at
         FROM ResourceCenter
         ${whereSql}
         ORDER BY updated_at DESC, resource_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map(r => ({
        id: r.resource_id,
        title: r.title,
        category: r.category || '',
        fileType: r.file_type || '',
        fileSize: Number(r.file_size || 0),
        fileUrl: r.file_url || '',
        downloadCount: Number(r.download_count || 0),
        updatedAt: r.updated_at,
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Services list (admin): return all services including unpublished
  if (path === "/internal/api/v1/admin/services" && method === "GET") {
    try {
      const rows = await env.DATABASE.prepare(
        `SELECT service_id, service_key, title, is_published, sort_order, updated_at
         FROM ExternalServices
         WHERE is_deleted = 0
         ORDER BY sort_order ASC, service_id ASC`
      ).all();
      const data = (rows?.results || []).map(r => ({
        id: r.service_id,
        key: r.service_key,
        title: r.title,
        isPublished: r.is_published === 1,
        sortOrder: Number(r.sort_order || 0),
        updatedAt: r.updated_at,
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, count: data.length } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Get single article (for editing)
  if (path.match(/^\/internal\/api\/v1\/admin\/articles\/\d+$/) && method === "GET") {
    try {
      const articleId = parseInt(path.split('/').pop());
      const article = await env.DATABASE.prepare(
        `SELECT article_id, title, slug, summary, content, featured_image, category, tags, 
                is_published, published_at, view_count, seo_title, seo_description, seo_keywords,
                created_at, updated_at
         FROM ExternalArticles
         WHERE article_id = ? AND is_deleted = 0`
      ).bind(articleId).first();
      
      if (!article) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"文章不存在", meta:{ requestId } }, corsHeaders);
      }
      
      const data = {
        id: article.article_id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        featuredImage: article.featured_image,
        category: article.category,
        tags: (()=>{ try { return JSON.parse(article.tags || '[]'); } catch(_) { return []; } })(),
        isPublished: article.is_published === 1,
        publishedAt: article.published_at,
        viewCount: article.view_count,
        seoTitle: article.seo_title,
        seoDescription: article.seo_description,
        seoKeywords: article.seo_keywords,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
      };
      
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Create article
  if (path === "/internal/api/v1/admin/articles" && method === "POST") {
    try {
      const body = await request.json();
      const { title, slug, summary, content, featuredImage, category, tags, isPublished, seoTitle, seoDescription, seoKeywords } = body;
      
      if (!title || !content) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"標題和內容為必填", meta:{ requestId } }, corsHeaders);
      }
      
      // Generate slug if not provided
      const finalSlug = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-\u4e00-\u9fa5]/g, '') + '-' + Date.now();
      
      const now = new Date().toISOString();
      const publishedAt = isPublished ? now : null;
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO ExternalArticles 
         (title, slug, summary, content, featured_image, category, tags, is_published, published_at, 
          seo_title, seo_description, seo_keywords, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        title, finalSlug, summary || '', content, featuredImage || '', category || '', tags || '[]',
        isPublished ? 1 : 0, publishedAt, seoTitle || '', seoDescription || '', seoKeywords || '',
        me.user_id, now, now
      ).run();
      
      return jsonResponse(201, { 
        ok:true, 
        code:"CREATED", 
        message:"文章已創建", 
        data: { id: result.meta.last_row_id }, 
        meta:{ requestId } 
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Update article
  if (path.match(/^\/internal\/api\/v1\/admin\/articles\/\d+$/) && method === "PUT") {
    try {
      const articleId = parseInt(path.split('/').pop());
      const body = await request.json();
      const { title, slug, summary, content, featuredImage, category, tags, isPublished, seoTitle, seoDescription, seoKeywords } = body;
      
      if (!title || !content) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"標題和內容為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const now = new Date().toISOString();
      
      // Check if article exists
      const existing = await env.DATABASE.prepare(
        `SELECT article_id, is_published, published_at FROM ExternalArticles WHERE article_id = ? AND is_deleted = 0`
      ).bind(articleId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"文章不存在", meta:{ requestId } }, corsHeaders);
      }
      
      // Update published_at if changing from draft to published
      let publishedAt = existing.published_at;
      if (isPublished && existing.is_published === 0) {
        publishedAt = now;
      }
      
      await env.DATABASE.prepare(
        `UPDATE ExternalArticles 
         SET title = ?, slug = ?, summary = ?, content = ?, featured_image = ?, category = ?, tags = ?,
             is_published = ?, published_at = ?, seo_title = ?, seo_description = ?, seo_keywords = ?,
             updated_at = ?
         WHERE article_id = ?`
      ).bind(
        title, slug || existing.slug, summary || '', content, featuredImage || '', category || '', tags || '[]',
        isPublished ? 1 : 0, publishedAt, seoTitle || '', seoDescription || '', seoKeywords || '',
        now, articleId
      ).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"文章已更新", data: { id: articleId }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Delete article (soft delete)
  if (path.match(/^\/internal\/api\/v1\/admin\/articles\/\d+$/) && method === "DELETE") {
    try {
      const articleId = parseInt(path.split('/').pop());
      
      const existing = await env.DATABASE.prepare(
        `SELECT article_id FROM ExternalArticles WHERE article_id = ? AND is_deleted = 0`
      ).bind(articleId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"文章不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ExternalArticles SET is_deleted = 1, updated_at = ? WHERE article_id = ?`
      ).bind(new Date().toISOString(), articleId).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"文章已刪除", meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Create FAQ
  if (path === "/internal/api/v1/admin/faq" && method === "POST") {
    try {
      const body = await request.json();
      const { question, answer, category, sortOrder, isPublished } = body;
      
      if (!question || !answer) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"問題和答案為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const now = new Date().toISOString();
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO ExternalFAQ (question, answer, category, sort_order, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(question, answer, category || '', sortOrder || 0, isPublished ? 1 : 0, now, now).run();
      
      return jsonResponse(201, { 
        ok:true, 
        code:"CREATED", 
        message:"FAQ 已創建", 
        data: { id: result.meta.last_row_id }, 
        meta:{ requestId } 
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Get single FAQ
  if (path.match(/^\/internal\/api\/v1\/admin\/faq\/\d+$/) && method === "GET") {
    try {
      const faqId = parseInt(path.split('/').pop());
      const faq = await env.DATABASE.prepare(
        `SELECT faq_id, question, answer, category, sort_order, is_published, created_at, updated_at
         FROM ExternalFAQ WHERE faq_id = ? AND is_deleted = 0`
      ).bind(faqId).first();
      
      if (!faq) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"FAQ 不存在", meta:{ requestId } }, corsHeaders);
      }
      
      const data = {
        id: faq.faq_id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sort_order,
        isPublished: faq.is_published === 1,
        createdAt: faq.created_at,
        updatedAt: faq.updated_at,
      };
      
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Update FAQ
  if (path.match(/^\/internal\/api\/v1\/admin\/faq\/\d+$/) && method === "PUT") {
    try {
      const faqId = parseInt(path.split('/').pop());
      const body = await request.json();
      const { question, answer, category, sortOrder, isPublished } = body;
      
      if (!question || !answer) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"問題和答案為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const existing = await env.DATABASE.prepare(
        `SELECT faq_id FROM ExternalFAQ WHERE faq_id = ? AND is_deleted = 0`
      ).bind(faqId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"FAQ 不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ExternalFAQ 
         SET question = ?, answer = ?, category = ?, sort_order = ?, is_published = ?, updated_at = ?
         WHERE faq_id = ?`
      ).bind(question, answer, category || '', sortOrder || 0, isPublished ? 1 : 0, new Date().toISOString(), faqId).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"FAQ 已更新", data: { id: faqId }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Delete FAQ
  if (path.match(/^\/internal\/api\/v1\/admin\/faq\/\d+$/) && method === "DELETE") {
    try {
      const faqId = parseInt(path.split('/').pop());
      
      const existing = await env.DATABASE.prepare(
        `SELECT faq_id FROM ExternalFAQ WHERE faq_id = ? AND is_deleted = 0`
      ).bind(faqId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"FAQ 不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ExternalFAQ SET is_deleted = 1, updated_at = ? WHERE faq_id = ?`
      ).bind(new Date().toISOString(), faqId).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"FAQ 已刪除", meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Get single service
  if (path.match(/^\/internal\/api\/v1\/admin\/services\/\d+$/) && method === "GET") {
    try {
      const serviceId = parseInt(path.split('/').pop());
      const service = await env.DATABASE.prepare(
        `SELECT service_id, service_key, title, summary, content, hero_image, is_published, sort_order, updated_at
         FROM ExternalServices WHERE service_id = ? AND is_deleted = 0`
      ).bind(serviceId).first();
      
      if (!service) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
      }
      
      const data = {
        id: service.service_id,
        key: service.service_key,
        title: service.title,
        summary: service.summary,
        content: service.content,
        heroImage: service.hero_image,
        isPublished: service.is_published === 1,
        sortOrder: service.sort_order,
        updatedAt: service.updated_at,
      };
      
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Update service
  if (path.match(/^\/internal\/api\/v1\/admin\/services\/\d+$/) && method === "PUT") {
    try {
      const serviceId = parseInt(path.split('/').pop());
      const body = await request.json();
      const { title, summary, content, heroImage, isPublished } = body;
      
      if (!title || !content) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"標題和內容為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const existing = await env.DATABASE.prepare(
        `SELECT service_id FROM ExternalServices WHERE service_id = ? AND is_deleted = 0`
      ).bind(serviceId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ExternalServices 
         SET title = ?, summary = ?, content = ?, hero_image = ?, is_published = ?, updated_at = ?
         WHERE service_id = ?`
      ).bind(title, summary || '', content, heroImage || '', isPublished ? 1 : 0, new Date().toISOString(), serviceId).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"服務已更新", data: { id: serviceId }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Create resource
  if (path === "/internal/api/v1/admin/resources" && method === "POST") {
    try {
      const body = await request.json();
      const { title, description, fileUrl, fileType, fileSize, category, coverImage, isPublished } = body;
      
      if (!title || !fileUrl) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"標題和文件 URL 為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const now = new Date().toISOString();
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO ResourceCenter 
         (title, description, file_url, file_type, file_size, category, cover_image, is_published, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        title, description || '', fileUrl, fileType || '', fileSize || 0, category || '',
        coverImage || '', isPublished !== false ? 1 : 0, me.user_id, now, now
      ).run();
      
      return jsonResponse(201, { 
        ok:true, 
        code:"CREATED", 
        message:"資源已創建", 
        data: { id: result.meta.last_row_id }, 
        meta:{ requestId } 
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Get single resource
  if (path.match(/^\/internal\/api\/v1\/admin\/resources\/\d+$/) && method === "GET") {
    try {
      const resourceId = parseInt(path.split('/').pop());
      const resource = await env.DATABASE.prepare(
        `SELECT resource_id, title, description, file_url, file_type, file_size, category, cover_image, is_published, download_count, created_at, updated_at
         FROM ResourceCenter WHERE resource_id = ? AND is_deleted = 0`
      ).bind(resourceId).first();
      
      if (!resource) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"資源不存在", meta:{ requestId } }, corsHeaders);
      }
      
      const data = {
        id: resource.resource_id,
        title: resource.title,
        description: resource.description,
        fileUrl: resource.file_url,
        fileType: resource.file_type,
        fileSize: resource.file_size,
        category: resource.category,
        coverImage: resource.cover_image,
        isPublished: resource.is_published === 1,
        downloadCount: resource.download_count,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at,
      };
      
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Update resource
  if (path.match(/^\/internal\/api\/v1\/admin\/resources\/\d+$/) && method === "PUT") {
    try {
      const resourceId = parseInt(path.split('/').pop());
      const body = await request.json();
      const { title, description, fileUrl, fileType, fileSize, category, coverImage, isPublished } = body;
      
      if (!title || !fileUrl) {
        return jsonResponse(400, { ok:false, code:"INVALID_INPUT", message:"標題和文件 URL 為必填", meta:{ requestId } }, corsHeaders);
      }
      
      const existing = await env.DATABASE.prepare(
        `SELECT resource_id FROM ResourceCenter WHERE resource_id = ? AND is_deleted = 0`
      ).bind(resourceId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"資源不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ResourceCenter 
         SET title = ?, description = ?, file_url = ?, file_type = ?, file_size = ?, category = ?, cover_image = ?, is_published = ?, updated_at = ?
         WHERE resource_id = ?`
      ).bind(
        title, description || '', fileUrl, fileType || '', fileSize || 0, category || '',
        coverImage || '', isPublished !== false ? 1 : 0, new Date().toISOString(), resourceId
      ).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"資源已更新", data: { id: resourceId }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Delete resource
  if (path.match(/^\/internal\/api\/v1\/admin\/resources\/\d+$/) && method === "DELETE") {
    try {
      const resourceId = parseInt(path.split('/').pop());
      
      const existing = await env.DATABASE.prepare(
        `SELECT resource_id FROM ResourceCenter WHERE resource_id = ? AND is_deleted = 0`
      ).bind(resourceId).first();
      
      if (!existing) {
        return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"資源不存在", meta:{ requestId } }, corsHeaders);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ResourceCenter SET is_deleted = 1, updated_at = ? WHERE resource_id = ?`
      ).bind(new Date().toISOString(), resourceId).run();
      
      return jsonResponse(200, { ok:true, code:"OK", message:"資源已刪除", meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


