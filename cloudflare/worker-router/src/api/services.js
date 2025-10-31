import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function handleServices(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

  // ========================================
  // 服务项目（Services）管理
  // ========================================

  // GET /internal/api/v1/services - 获取所有服务项目
  if (method === "GET" && path === "/internal/api/v1/services") {
    try {
      const rows = await env.DATABASE.prepare(`
        SELECT service_id, service_name, service_code, description, 
               is_active, sort_order, created_at, updated_at
        FROM Services
        WHERE is_active = 1
        ORDER BY sort_order ASC, service_id ASC
      `).all();

      const data = (rows?.results || []).map(r => ({
        service_id: r.service_id,
        service_name: r.service_name || "",
        service_code: r.service_code || "",
        description: r.description || "",
        is_active: Boolean(r.is_active),
        sort_order: r.sort_order || 0,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "查询成功",
        data,
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "服务器错误",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // POST /internal/api/v1/services - 创建服务项目
  if (method === "POST" && path === "/internal/api/v1/services") {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "请求格式错误",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceName = String(body?.service_name || "").trim();
    const serviceCode = String(body?.service_code || "").trim();
    const description = String(body?.description || "").trim();
    const sortOrder = parseInt(body?.sort_order || "0", 10);

    if (!serviceName) {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "服务名称不能为空",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      const result = await env.DATABASE.prepare(`
        INSERT INTO Services (service_name, service_code, description, sort_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).bind(serviceName, serviceCode || null, description || null, sortOrder).run();

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "创建成功",
        data: { service_id: result.meta.last_row_id },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "创建失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // PUT /internal/api/v1/services/:id - 更新服务项目
  const matchUpdate = path.match(/^\/internal\/api\/v1\/services\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceId = parseId(matchUpdate[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的服务ID",
        meta: { requestId }
      }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "请求格式错误",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceName = String(body?.service_name || "").trim();
    const serviceCode = String(body?.service_code || "").trim();
    const description = String(body?.description || "").trim();
    const sortOrder = parseInt(body?.sort_order || "0", 10);

    if (!serviceName) {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "服务名称不能为空",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      await env.DATABASE.prepare(`
        UPDATE Services 
        SET service_name = ?, service_code = ?, description = ?, 
            sort_order = ?, updated_at = datetime('now')
        WHERE service_id = ?
      `).bind(serviceName, serviceCode || null, description || null, sortOrder, serviceId).run();

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "更新成功",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "更新失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // DELETE /internal/api/v1/services/:id - 删除服务项目（软删除）
  const matchDelete = path.match(/^\/internal\/api\/v1\/services\/(\d+)$/);
  if (method === "DELETE" && matchDelete) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceId = parseId(matchDelete[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的服务ID",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      await env.DATABASE.prepare(`
        UPDATE Services SET is_active = 0, updated_at = datetime('now')
        WHERE service_id = ?
      `).bind(serviceId).run();

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "删除成功",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "删除失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // ========================================
  // 服务子项目（ServiceItems）管理
  // ========================================

  // GET /internal/api/v1/services/:id/items - 获取服务的所有子项目
  const matchGetItems = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items$/);
  if (method === "GET" && matchGetItems) {
    const serviceId = parseId(matchGetItems[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的服务ID",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      const rows = await env.DATABASE.prepare(`
        SELECT item_id, service_id, item_name, item_code, description,
               is_active, sort_order, created_at, updated_at
        FROM ServiceItems
        WHERE service_id = ? AND is_active = 1
        ORDER BY sort_order ASC, item_id ASC
      `).bind(serviceId).all();

      const data = (rows?.results || []).map(r => ({
        item_id: r.item_id,
        service_id: r.service_id,
        item_name: r.item_name || "",
        item_code: r.item_code || "",
        description: r.description || "",
        is_active: Boolean(r.is_active),
        sort_order: r.sort_order || 0,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "查询成功",
        data,
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "服务器错误",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // POST /internal/api/v1/services/:id/items - 创建服务子项目
  const matchCreateItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items$/);
  if (method === "POST" && matchCreateItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceId = parseId(matchCreateItem[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的服务ID",
        meta: { requestId }
      }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "请求格式错误",
        meta: { requestId }
      }, corsHeaders);
    }

    const itemName = String(body?.item_name || "").trim();
    const itemCode = String(body?.item_code || "").trim();
    const description = String(body?.description || "").trim();
    const sortOrder = parseInt(body?.sort_order || "0", 10);

    if (!itemName) {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "子项目名称不能为空",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      const result = await env.DATABASE.prepare(`
        INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).bind(serviceId, itemName, itemCode || null, description || null, sortOrder).run();

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "创建成功",
        data: { item_id: result.meta.last_row_id },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "创建失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // PUT /internal/api/v1/services/:sid/items/:iid - 更新服务子项目
  const matchUpdateItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items\/(\d+)$/);
  if (method === "PUT" && matchUpdateItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceId = parseId(matchUpdateItem[1]);
    const itemId = parseId(matchUpdateItem[2]);
    
    if (!serviceId || !itemId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的ID",
        meta: { requestId }
      }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "请求格式错误",
        meta: { requestId }
      }, corsHeaders);
    }

    const itemName = String(body?.item_name || "").trim();
    const itemCode = String(body?.item_code || "").trim();
    const description = String(body?.description || "").trim();
    const sortOrder = parseInt(body?.sort_order || "0", 10);

    if (!itemName) {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "子项目名称不能为空",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      await env.DATABASE.prepare(`
        UPDATE ServiceItems 
        SET item_name = ?, item_code = ?, description = ?, 
            sort_order = ?, updated_at = datetime('now')
        WHERE service_id = ? AND item_id = ?
      `).bind(itemName, itemCode || null, description || null, sortOrder, serviceId, itemId).run();

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "更新成功",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "更新失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  // DELETE /internal/api/v1/services/:sid/items/:iid - 删除服务子项目
  const matchDeleteItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items\/(\d+)$/);
  if (method === "DELETE" && matchDeleteItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "需要管理员权限",
        meta: { requestId }
      }, corsHeaders);
    }

    const serviceId = parseId(matchDeleteItem[1]);
    const itemId = parseId(matchDeleteItem[2]);
    
    if (!serviceId || !itemId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "无效的ID",
        meta: { requestId }
      }, corsHeaders);
    }

    try {
      await env.DATABASE.prepare(`
        UPDATE ServiceItems SET is_active = 0, updated_at = datetime('now')
        WHERE service_id = ? AND item_id = ?
      `).bind(serviceId, itemId).run();

      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "删除成功",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "删除失败",
        meta: { requestId }
      }, corsHeaders);
    }
  }

  return jsonResponse(404, {
    ok: false,
    code: "NOT_FOUND",
    message: "API路径不存在",
    meta: { requestId }
  }, corsHeaders);
}

