import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function todayStr() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")); }

export async function handleClientServices(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

  // GET list: /internal/api/v1/client-services?status=active&q=...
  if (path === "/internal/api/v1/client-services" && method === "GET") {
    try {
      const p = url.searchParams;
      const status = (p.get("status") || "all").trim();
      const q = (p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "12", 10)));
      const offset = (page - 1) * perPage;
      const where = ["cs.is_deleted = 0"]; const binds = [];
      if (["active","suspended","expired","cancelled"].includes(status)) { where.push("cs.status = ?"); binds.push(status); }
      if (q) { where.push("(c.company_name LIKE ?)"); binds.push(`%${q}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ClientServices cs LEFT JOIN Clients c ON c.client_id = cs.client_id ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT cs.client_service_id, cs.client_id, cs.status, cs.suspension_effective_date, c.company_name
         FROM ClientServices cs LEFT JOIN Clients c ON c.client_id = cs.client_id
         ${whereSql}
         ORDER BY cs.client_service_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map(r => ({
        id: r.client_service_id,
        clientId: r.client_id,
        clientName: r.company_name || r.client_id,
        status: r.status,
        suspensionEffectiveDate: r.suspension_effective_date || null,
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // POST suspend/resume/cancel
  const suspendMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/suspend$/);
  const resumeMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/resume$/);
  const cancelMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/cancel$/);
  const historyMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/history$/);

  // Suspend
  if (suspendMatch) {
    if (method !== "POST") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
    const id = parseId(suspendMatch[1]);
    const reason = String(body?.reason || "").trim();
    const notes = String(body?.notes || "").trim();
    const effective = String(body?.effective_date || "").trim();
    if (!id) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
    if (!isValidYmd(effective)) return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"日期格式錯誤", meta:{ requestId } }, corsHeaders);
    if (!reason) return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"原因必填", meta:{ requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status, suspension_effective_date FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
      if (svc.status !== 'active') return jsonResponse(400, { ok:false, code:"INVALID_STATE", message:"目前狀態不允許此操作", meta:{ requestId } }, corsHeaders);
      if (svc.suspension_effective_date && svc.suspension_effective_date > todayStr()) return jsonResponse(400, { ok:false, code:"ALREADY_SCHEDULED", message:"已有未來排程，不可重複排程", meta:{ requestId } }, corsHeaders);
      const nowIso = new Date().toISOString();
      if (effective <= todayStr()) {
        await env.DATABASE.prepare("UPDATE ClientServices SET status='suspended', suspended_at = ?, suspension_reason = ?, suspension_effective_date = NULL WHERE client_service_id = ?").bind(nowIso, reason, id).run();
        await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, 'active', 'suspended', ?, ?, ?)").bind(id, String(me.user_id), reason, notes).run();
        return jsonResponse(200, { ok:true, code:"OK", message:"服務已暫停", data:{ client_service_id: id, status:'suspended', suspended_at: nowIso } }, corsHeaders);
      }
      await env.DATABASE.prepare("UPDATE ClientServices SET suspension_effective_date = ?, suspension_reason = ? WHERE client_service_id = ?").bind(effective, reason, id).run();
      return jsonResponse(200, { ok:true, code:"OK", message:`已排程於 ${effective} 暫停`, data:{ client_service_id: id, status:'active', suspension_effective_date: effective } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Resume
  if (resumeMatch) {
    if (method !== "POST") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    let body; try { body = await request.json(); } catch (_) { body = {}; }
    const id = parseId(resumeMatch[1]);
    const notes = String(body?.notes || "").trim();
    if (!id) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
      if (svc.status !== 'suspended') return jsonResponse(400, { ok:false, code:"INVALID_STATE", message:"目前狀態不允許此操作", meta:{ requestId } }, corsHeaders);
      const nowIso = new Date().toISOString();
      await env.DATABASE.prepare("UPDATE ClientServices SET status='active', resumed_at = ?, suspended_at = NULL, suspension_reason = NULL, suspension_effective_date = NULL WHERE client_service_id = ?").bind(nowIso, id).run();
      await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, 'suspended', 'active', ?, '', ?)").bind(id, String(me.user_id), notes).run();
      return jsonResponse(200, { ok:true, code:"OK", message:"服務已恢復", data:{ client_service_id: id, status:'active', resumed_at: nowIso } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Cancel
  if (cancelMatch) {
    if (method !== "POST") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
    let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
    const id = parseId(cancelMatch[1]);
    const reason = String(body?.reason || "").trim();
    const cancelTasks = Boolean(body?.cancel_pending_tasks);
    if (!id) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
    if (!reason) return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"取消原因必填", meta:{ requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
      if (svc.status === 'cancelled') return jsonResponse(400, { ok:false, code:"INVALID_STATE", message:"已為取消狀態", meta:{ requestId } }, corsHeaders);
      const nowIso = new Date().toISOString();
      await env.DATABASE.prepare("UPDATE ClientServices SET status='cancelled', cancelled_at = ?, cancelled_by = ? WHERE client_service_id = ?").bind(nowIso, String(me.user_id), id).run();
      await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, ?, 'cancelled', ?, ?, '')").bind(id, svc.status, String(me.user_id), reason).run();
      let tasksCancelled = false;
      if (cancelTasks) {
        await env.DATABASE.prepare("UPDATE ActiveTasks SET status='cancelled' WHERE client_service_id = ? AND status NOT IN ('completed','cancelled')").bind(id).run();
        tasksCancelled = true;
      }
      return jsonResponse(200, { ok:true, code:"OK", message:"服務已取消", data:{ client_service_id: id, status:'cancelled', tasks_cancelled: tasksCancelled } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // History
  if (historyMatch) {
    if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    const id = parseId(historyMatch[1]);
    if (!id) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"服務不存在", meta:{ requestId } }, corsHeaders);
    try {
      const rows = await env.DATABASE.prepare(
        `SELECT h.change_id, h.old_status, h.new_status, h.changed_by, u.name AS changed_by_name, h.changed_at, h.reason, h.notes
         FROM ServiceChangeHistory h LEFT JOIN Users u ON u.user_id = h.changed_by
         WHERE h.client_service_id = ?
         ORDER BY h.changed_at DESC, h.change_id DESC`
      ).bind(id).all();
      const data = (rows?.results || []).map(r => ({ change_id: r.change_id, old_status: r.old_status, new_status: r.new_status, changed_by: r.changed_by_name || String(r.changed_by), changed_at: r.changed_at, reason: r.reason || '', notes: r.notes || '' }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, count: data.length } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


