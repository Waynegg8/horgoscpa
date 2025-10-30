import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleCMS(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

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
        `SELECT resource_id, title, category, file_type, file_size, download_count, updated_at
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

  return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


