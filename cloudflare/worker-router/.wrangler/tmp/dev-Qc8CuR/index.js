var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
function generateRequestId() {
  const random = crypto.getRandomValues(new Uint8Array(8));
  return "req_" + Array.from(random).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateRequestId, "generateRequestId");
async function verifyPasswordPBKDF2(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1e5) return false;
  const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    keyMaterial,
    expected.byteLength * 8
  );
  const derived = new Uint8Array(derivedBits);
  if (derived.byteLength !== expected.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < derived.byteLength; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}
__name(verifyPasswordPBKDF2, "verifyPasswordPBKDF2");
function generateSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}
__name(generateSessionId, "generateSessionId");
function getCorsHeadersForRequest(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return {};
  try {
    const o = new URL(origin);
    const host = o.hostname || "";
    if (host.endsWith(".pages.dev") || host.endsWith("horgoscpa.com")) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin"
      };
    }
  } catch (_) {
  }
  return {};
}
__name(getCorsHeadersForRequest, "getCorsHeadersForRequest");
function corsPreflightResponse(request, env) {
  const headers = {
    ...getCorsHeadersForRequest(request, env),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type, X-Request-Id",
    "Access-Control-Max-Age": "600"
  };
  return new Response(null, { status: 204, headers });
}
__name(corsPreflightResponse, "corsPreflightResponse");
function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const parts = raw.split(";");
  for (const p of parts) {
    const [k, ...v] = p.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
__name(getCookie, "getCookie");
async function getSessionUser(request, env) {
  const cookieName = String(env.SESSION_COOKIE_NAME || "session");
  const sessionId = getCookie(request, cookieName);
  if (!sessionId || !env.DATABASE) return null;
  const row = await env.DATABASE.prepare(
    "SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.name, u.email, u.is_admin FROM sessions s JOIN Users u ON u.user_id = s.user_id WHERE s.id = ? LIMIT 1"
  ).bind(sessionId).first();
  if (!row) return null;
  const exp = Date.parse(row.expires_at);
  if (Number.isNaN(exp) || exp <= Date.now()) return null;
  return row;
}
__name(getSessionUser, "getSessionUser");
async function hashPasswordPBKDF2(password, iterations = 1e5, keyLen = 32) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    keyLen * 8
  );
  const derived = new Uint8Array(derivedBits);
  const b64 = /* @__PURE__ */ __name((u8) => btoa(String.fromCharCode(...u8)), "b64");
  return `pbkdf2${"$"}${iterations}${"$"}${b64(salt)}${"$"}${b64(derived)}`;
}
__name(hashPasswordPBKDF2, "hashPasswordPBKDF2");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const requestId = request.headers.get("X-Request-Id") || generateRequestId();
    const proxy = /* @__PURE__ */ __name((host, newPath) => {
      const target = new URL(request.url);
      target.protocol = "https:";
      target.hostname = host;
      target.pathname = newPath;
      return fetch(new Request(target.toString(), request));
    }, "proxy");
    if (path.startsWith("/internal/api/") && method === "OPTIONS") {
      return corsPreflightResponse(request, env);
    }
    if (path === "/internal/api/v1/auth/login") {
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      let payload;
      try {
        payload = await request.json();
      } catch (_) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const username = (payload?.username || "").trim().toLowerCase();
      const password = payload?.password || "";
      const errors = [];
      if (!username) errors.push({ field: "username", message: "\u5FC5\u586B" });
      if (!password) errors.push({ field: "password", message: "\u5FC5\u586B" });
      if (errors.length > 0) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      if (!env.DATABASE) {
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u8CC7\u6599\u5EAB\u672A\u7D81\u5B9A", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      try {
        const userRow = await env.DATABASE.prepare(
          "SELECT user_id, username, password_hash, name, email, is_admin, login_attempts, last_failed_login, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
        ).bind(username).first();
        const corsHeaders = getCorsHeadersForRequest(request, env);
        const unauthorized = /* @__PURE__ */ __name(() => jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4", meta: { requestId } }, corsHeaders), "unauthorized");
        if (!userRow || userRow.is_deleted === 1) {
          return unauthorized();
        }
        const attempts = Number(userRow.login_attempts || 0);
        if (attempts >= 5 && userRow.last_failed_login) {
          const lastFailedAt = Date.parse(userRow.last_failed_login);
          if (!Number.isNaN(lastFailedAt)) {
            const fifteenMinAgo = Date.now() - 15 * 60 * 1e3;
            if (lastFailedAt > fifteenMinAgo) {
              return jsonResponse(401, { ok: false, code: "ACCOUNT_LOCKED", message: "\u5617\u8A66\u904E\u591A\uFF0C\u7A0D\u5F8C\u518D\u8A66", meta: { requestId } }, corsHeaders);
            }
          }
        }
        const hash = userRow.password_hash || "";
        const passOk = await verifyPasswordPBKDF2(password, hash);
        if (!passOk) {
          await env.DATABASE.prepare(
            "UPDATE Users SET login_attempts = COALESCE(login_attempts,0) + 1, last_failed_login = ? WHERE user_id = ?"
          ).bind((/* @__PURE__ */ new Date()).toISOString(), userRow.user_id).run();
          return unauthorized();
        }
        await env.DATABASE.prepare(
          "UPDATE Users SET login_attempts = 0, last_login = ? WHERE user_id = ?"
        ).bind((/* @__PURE__ */ new Date()).toISOString(), userRow.user_id).run();
        const sessionId = generateSessionId();
        const ttlSec = parseInt(env.SESSION_TTL_SECONDS || "2592000", 10);
        const createdAt = /* @__PURE__ */ new Date();
        const expiresAt = new Date(createdAt.getTime() + ttlSec * 1e3);
        await env.DATABASE.prepare(
          "INSERT INTO sessions (id, user_id, created_at, expires_at, meta_json) VALUES (?, ?, ?, ?, ?)"
        ).bind(sessionId, String(userRow.user_id), createdAt.toISOString(), expiresAt.toISOString(), JSON.stringify({ ua: request.headers.get("User-Agent") || "" })).run();
        const cookieName = String(env.SESSION_COOKIE_NAME || "session");
        const cookie = [
          `${cookieName}=${sessionId}`,
          "Path=/",
          "HttpOnly",
          "Secure",
          "SameSite=Lax",
          `Max-Age=${ttlSec}`
        ].join("; ");
        const data = {
          userId: String(userRow.user_id),
          username: userRow.username,
          name: userRow.name,
          email: userRow.email,
          isAdmin: userRow.is_admin === 1
        };
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, { "Set-Cookie": cookie, ...corsHeaders });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
        return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
      }
    }
    if (path === "/internal/api/v1/auth/me") {
      if (method !== "GET") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      try {
        const row = await getSessionUser(request, env);
        if (!row) {
          return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
        }
        const data = {
          userId: String(row.user_id),
          username: row.username,
          name: row.name,
          email: row.email,
          isAdmin: row.is_admin === 1
        };
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, getCorsHeadersForRequest(request, env));
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
        return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
      }
    }
    if (path === "/internal/api/v1/admin/dev-debug-cookie") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      const cookieName = String(env.SESSION_COOKIE_NAME || "session");
      const sid = getCookie(request, cookieName);
      let exists = null;
      let exp = null;
      if (sid && env.DATABASE) {
        const row = await env.DATABASE.prepare("SELECT id, expires_at FROM sessions WHERE id = ? LIMIT 1").bind(sid).first();
        exists = !!row;
        exp = row?.expires_at || null;
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { cookieName, sid, exists, exp }, meta: { requestId } }, getCorsHeadersForRequest(request, env));
    }
    if (path === "/internal/api/v1/clients") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method === "GET") {
        const params = url.searchParams;
        const page = Math.max(1, parseInt(params.get("page") || "1", 10));
        const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
        const offset = (page - 1) * perPage;
        const companyName = (params.get("company_name") || params.get("q") || "").trim();
        try {
          const where = ["c.is_deleted = 0"];
          const binds = [];
          if (companyName) {
            where.push("c.company_name LIKE ?");
            binds.push(`%${companyName}%`);
          }
          const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
          const countRow = await env.DATABASE.prepare(
            `SELECT COUNT(1) as total FROM Clients c ${whereSql}`
          ).bind(...binds).first();
          const total = Number(countRow?.total || 0);
          const rows = await env.DATABASE.prepare(
            `SELECT c.client_id, c.company_name, c.tax_registration_number, c.phone, c.email, c.created_at, 
						        u.name as assignee_name,
						        GROUP_CONCAT(t.tag_name, ',') as tags
						 FROM Clients c
						 LEFT JOIN Users u ON u.user_id = c.assignee_user_id
						 LEFT JOIN ClientTagAssignments a ON a.client_id = c.client_id
						 LEFT JOIN CustomerTags t ON t.tag_id = a.tag_id
						 ${whereSql}
						 GROUP BY c.client_id
						 ORDER BY c.created_at DESC
						 LIMIT ? OFFSET ?`
          ).bind(...binds, perPage, offset).all();
          const data = (rows?.results || []).map((r) => ({
            clientId: r.client_id,
            companyName: r.company_name,
            taxId: r.tax_registration_number,
            assigneeName: r.assignee_name || "",
            tags: r.tags ? String(r.tags).split(",").filter(Boolean) : [],
            phone: r.phone || "",
            email: r.email || "",
            createdAt: r.created_at
          }));
          const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
          return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
          return jsonResponse(500, body, corsHeaders);
        }
      }
      if (method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch (_) {
          return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
        const errors = [];
        const clientId = String(body?.client_id || "").trim();
        const companyName = String(body?.company_name || "").trim();
        const assigneeUserId = Number(body?.assignee_user_id || 0);
        const phone = (body?.phone || "").trim();
        const email = (body?.email || "").trim();
        const clientNotes = (body?.client_notes || "").trim();
        const paymentNotes = (body?.payment_notes || "").trim();
        const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
        if (!/^\d{8}$/.test(clientId)) errors.push({ field: "client_id", message: "\u5FC5\u586B\u4E14\u9808\u70BA8\u4F4D\u6578\u5B57" });
        if (companyName.length < 1 || companyName.length > 100) errors.push({ field: "company_name", message: "\u9577\u5EA6\u9700 1\u2013100" });
        if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) errors.push({ field: "assignee_user_id", message: "\u5FC5\u586B" });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: "email", message: "Email \u683C\u5F0F\u932F\u8AA4" });
        if (phone && !/^[-+()\s0-9]{6,}$/.test(phone)) errors.push({ field: "phone", message: "\u96FB\u8A71\u683C\u5F0F\u932F\u8AA4" });
        if (errors.length) {
          return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
        }
        try {
          const dup = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
          if (dup) {
            return jsonResponse(409, { ok: false, code: "CONFLICT", message: "\u5BA2\u6236\u5DF2\u5B58\u5728", meta: { requestId } }, corsHeaders);
          }
          const assExist = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
          if (!assExist) {
            return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8CA0\u8CAC\u4EBA\u4E0D\u5B58\u5728", errors: [{ field: "assignee_user_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
          }
          if (tagIds.length > 0) {
            const placeholders = tagIds.map(() => "?").join(",");
            const row = await env.DATABASE.prepare(`SELECT COUNT(1) as cnt FROM CustomerTags WHERE tag_id IN (${placeholders})`).bind(...tagIds).first();
            if (Number(row?.cnt || 0) !== tagIds.length) {
              return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u6A19\u7C64\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
            }
          }
          const now = (/* @__PURE__ */ new Date()).toISOString();
          await env.DATABASE.prepare(
            "INSERT INTO Clients (client_id, company_name, assignee_user_id, phone, email, client_notes, payment_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, now, now).run();
          for (const tagId of tagIds) {
            await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)").bind(clientId, tagId, now).run();
          }
          const data = { clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, tags: tagIds };
          return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data, meta: { requestId } }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
          return jsonResponse(500, body2, corsHeaders);
        }
      }
      return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    }
    if (path === "/internal/api/v1/tasks") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method === "GET") {
        try {
          const params = url.searchParams;
          const page = Math.max(1, parseInt(params.get("page") || "1", 10));
          const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
          const offset = (page - 1) * perPage;
          const q = (params.get("q") || "").trim();
          const status = (params.get("status") || "").trim();
          const due = (params.get("due") || "").trim();
          const where = ["t.is_deleted = 0"];
          const binds = [];
          if (!me.is_admin) {
            where.push("t.assignee_user_id = ?");
            binds.push(String(me.user_id));
          }
          if (q) {
            where.push("(t.task_name LIKE ? OR c.company_name LIKE ?)");
            binds.push(`%${q}%`, `%${q}%`);
          }
          if (status && ["pending", "in_progress", "completed", "cancelled"].includes(status)) {
            where.push("t.status = ?");
            binds.push(status);
          }
          if (due === "overdue") {
            where.push("date(t.due_date) < date('now') AND t.status != 'completed'");
          }
          if (due === "soon") {
            where.push("date(t.due_date) BETWEEN date('now') AND date('now','+3 days')");
          }
          const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
          const countRow = await env.DATABASE.prepare(
            `SELECT COUNT(1) as total
					 FROM ActiveTasks t
					 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
					 LEFT JOIN Clients c ON c.client_id = cs.client_id
					 ${whereSql}`
          ).bind(...binds).first();
          const total = Number(countRow?.total || 0);
          const rows = await env.DATABASE.prepare(
            `SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id,
					        c.company_name AS client_name,
					        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
					        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
					        (CASE WHEN t.related_sop_id IS NOT NULL OR t.client_specific_sop_id IS NOT NULL THEN 1 ELSE 0 END) AS has_sop,
					        u.name AS assignee_name
					 FROM ActiveTasks t
					 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
					 LEFT JOIN Clients c ON c.client_id = cs.client_id
					 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
					 ${whereSql}
					 ORDER BY date(t.due_date) ASC NULLS LAST, t.task_id DESC
					 LIMIT ? OFFSET ?`
          ).bind(...binds, perPage, offset).all();
          const data = (rows?.results || []).map((r) => ({
            taskId: String(r.task_id),
            taskName: r.task_name,
            clientName: r.client_name || "",
            assigneeName: r.assignee_name || "",
            progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
            dueDate: r.due_date || null,
            status: r.status,
            hasSop: Number(r.has_sop || 0) === 1
          }));
          const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
          return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
          return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
        }
      }
      if (method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch (_) {
          return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
        const clientServiceId = Number(body?.client_service_id || 0);
        const taskName = String(body?.task_name || "").trim();
        const dueDate = body?.due_date ? String(body.due_date) : null;
        const assigneeUserId = body?.assignee_user_id ? Number(body.assignee_user_id) : null;
        const stageNames = Array.isArray(body?.stage_names) ? body.stage_names.filter((s) => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : [];
        const errors = [];
        if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) errors.push({ field: "client_service_id", message: "\u5FC5\u586B" });
        if (taskName.length < 1 || taskName.length > 200) errors.push({ field: "task_name", message: "\u9577\u5EA6\u9700 1\u2013200" });
        if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field: "due_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
        if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) errors.push({ field: "assignee_user_id", message: "\u683C\u5F0F\u932F\u8AA4" });
        if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
        try {
          const cs = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_service_id = ? LIMIT 1").bind(clientServiceId).first();
          if (!cs) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5BA2\u6236\u670D\u52D9\u4E0D\u5B58\u5728", errors: [{ field: "client_service_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
          if (assigneeUserId) {
            const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
            if (!u) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8CA0\u8CAC\u4EBA\u4E0D\u5B58\u5728", errors: [{ field: "assignee_user_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
          }
          const now = (/* @__PURE__ */ new Date()).toISOString();
          await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, template_id, task_name, start_date, due_date, status, assignee_user_id, created_at) VALUES (?, NULL, ?, NULL, ?, 'pending', ?, ?)").bind(clientServiceId, taskName, dueDate, assigneeUserId, now).run();
          const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
          const taskId = String(idRow?.id);
          if (stageNames.length > 0) {
            let order = 1;
            for (const s of stageNames) {
              await env.DATABASE.prepare("INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status) VALUES (?, ?, ?, 'pending')").bind(taskId, s, order++).run();
            }
          }
          return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data: { taskId, taskName, clientServiceId, dueDate, assigneeUserId }, meta: { requestId } }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
          return jsonResponse(500, body2, corsHeaders);
        }
      }
      return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    }
    if (path === "/internal/api/v1/receipts") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method !== "GET") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
      }
      try {
        const params = url.searchParams;
        const page = Math.max(1, parseInt(params.get("page") || "1", 10));
        const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
        const offset = (page - 1) * perPage;
        const q = (params.get("q") || "").trim();
        const status = (params.get("status") || "").trim();
        const dateFrom = (params.get("dateFrom") || "").trim();
        const dateTo = (params.get("dateTo") || "").trim();
        const where = ["r.is_deleted = 0"];
        const binds = [];
        if (q) {
          where.push("(r.receipt_id LIKE ? OR c.company_name LIKE ?)");
          binds.push(`%${q}%`, `%${q}%`);
        }
        if (status && ["unpaid", "partial", "paid", "cancelled"].includes(status)) {
          where.push("r.status = ?");
          binds.push(status);
        }
        if (dateFrom) {
          where.push("r.receipt_date >= ?");
          binds.push(dateFrom);
        }
        if (dateTo) {
          where.push("r.receipt_date <= ?");
          binds.push(dateTo);
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const countRow = await env.DATABASE.prepare(
          `SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
        ).bind(...binds).first();
        const total = Number(countRow?.total || 0);
        const rows = await env.DATABASE.prepare(
          `SELECT r.receipt_id, r.client_id, c.company_name AS client_name, r.total_amount, r.receipt_date, r.due_date, r.status
					 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
					 ${whereSql}
					 ORDER BY r.receipt_date DESC, r.receipt_id DESC
					 LIMIT ? OFFSET ?`
        ).bind(...binds, perPage, offset).all();
        const data = (rows?.results || []).map((r) => ({
          receiptId: r.receipt_id,
          clientId: r.client_id,
          clientName: r.client_name || "",
          totalAmount: Number(r.total_amount || 0),
          receiptDate: r.receipt_date,
          dueDate: r.due_date || null,
          status: r.status
        }));
        const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
    }
    if (path === "/internal/api/v1/timesheets") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method === "GET") {
        try {
          const params = url.searchParams;
          const page = Math.max(1, parseInt(params.get("page") || "1", 10));
          const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
          const offset = (page - 1) * perPage;
          const dateFrom = (params.get("dateFrom") || "").trim();
          const dateTo = (params.get("dateTo") || "").trim();
          const q = (params.get("q") || "").trim();
          const type = (params.get("type") || "").trim();
          const where = ["t.is_deleted = 0"];
          const binds = [];
          if (!me.is_admin) {
            where.push("t.user_id = ?");
            binds.push(String(me.user_id));
          }
          if (dateFrom) {
            where.push("t.work_date >= ?");
            binds.push(dateFrom);
          }
          if (dateTo) {
            where.push("t.work_date <= ?");
            binds.push(dateTo);
          }
          if (q) {
            where.push("(c.company_name LIKE ? OR t.service_name LIKE ? OR t.note LIKE ?)");
            binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
          }
          if (type) {
            where.push("t.work_type = ?");
            binds.push(type);
          }
          const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
          const countRow = await env.DATABASE.prepare(
            `SELECT COUNT(1) AS total FROM Timesheets t LEFT JOIN Clients c ON c.client_id = t.client_id ${whereSql}`
          ).bind(...binds).first();
          const total = Number(countRow?.total || 0);
          const rows = await env.DATABASE.prepare(
            `SELECT t.timesheet_id, t.work_date, t.client_id, c.company_name AS client_name, t.service_name, t.work_type, t.hours, t.note
					 FROM Timesheets t LEFT JOIN Clients c ON c.client_id = t.client_id
					 ${whereSql}
					 ORDER BY t.work_date DESC, t.timesheet_id DESC
					 LIMIT ? OFFSET ?`
          ).bind(...binds, perPage, offset).all();
          const data = (rows?.results || []).map((r) => ({
            id: String(r.timesheet_id),
            date: r.work_date,
            clientId: r.client_id || null,
            clientName: r.client_name || "",
            service: r.service_name || "",
            type: r.work_type,
            hours: Number(r.hours || 0),
            note: r.note || ""
          }));
          const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
          return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
          return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
        }
      }
      if (method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch (_) {
          return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
        const work_date = String(body?.work_date || "").trim();
        const client_id = (body?.client_id || "").trim();
        const service_name = String(body?.service_name || "").trim();
        const work_type = String(body?.work_type || "").trim();
        const hours = Number(body?.hours);
        const note = (body?.note || "").trim();
        const errors = [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) errors.push({ field: "work_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
        if (!client_id) errors.push({ field: "client_id", message: "\u5FC5\u586B" });
        if (!service_name) errors.push({ field: "service_name", message: "\u5FC5\u586B" });
        if (!work_type) errors.push({ field: "work_type", message: "\u5FC5\u586B" });
        if (!Number.isFinite(hours) || hours <= 0) errors.push({ field: "hours", message: "\u5FC5\u9808\u5927\u65BC 0" });
        if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) errors.push({ field: "hours", message: "\u5FC5\u9808\u662F 0.5 \u7684\u500D\u6578" });
        if (hours > 12) errors.push({ field: "hours", message: "\u4E0D\u53EF\u8D85\u904E 12 \u5C0F\u6642" });
        if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
        try {
          const sumRow = await env.DATABASE.prepare("SELECT COALESCE(SUM(hours),0) AS s FROM Timesheets WHERE user_id = ? AND work_date = ? AND is_deleted = 0").bind(String(me.user_id), work_date).first();
          const current = Number(sumRow?.s || 0);
          if (current + hours > 12 + 1e-9) {
            return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u6BCF\u65E5\u5DE5\u6642\u5408\u8A08\u4E0D\u53EF\u8D85\u904E 12 \u5C0F\u6642", errors: [{ field: "hours", message: "\u8D85\u904E\u4E0A\u9650" }], meta: { requestId } }, corsHeaders);
          }
          await env.DATABASE.prepare(
            "INSERT INTO Timesheets (user_id, work_date, client_id, service_name, work_type, hours, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(String(me.user_id), work_date, client_id, service_name, work_type, hours, note, (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString()).run();
          const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
          const data = { id: String(idRow?.id), date: work_date, clientId: client_id, service: service_name, type: work_type, hours, note };
          return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data, meta: { requestId } }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
          return jsonResponse(500, body2, corsHeaders);
        }
      }
      return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    }
    if (path === "/internal/api/v1/leaves") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method === "GET") {
        try {
          const params = url.searchParams;
          const page = Math.max(1, parseInt(params.get("page") || "1", 10));
          const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
          const offset = (page - 1) * perPage;
          const q = (params.get("q") || "").trim();
          const status = (params.get("status") || "").trim();
          const type = (params.get("type") || "").trim();
          const dateFrom = (params.get("dateFrom") || "").trim();
          const dateTo = (params.get("dateTo") || "").trim();
          const where = ["l.is_deleted = 0"];
          const binds = [];
          if (!me.is_admin) {
            where.push("l.user_id = ?");
            binds.push(String(me.user_id));
          }
          if (q) {
            where.push("(l.reason LIKE ? OR l.leave_type LIKE ?)");
            binds.push(`%${q}%`, `%${q}%`);
          }
          if (status && ["pending", "approved", "rejected"].includes(status)) {
            where.push("l.status = ?");
            binds.push(status);
          }
          if (type) {
            where.push("l.leave_type = ?");
            binds.push(type);
          }
          if (dateFrom) {
            where.push("l.start_date >= ?");
            binds.push(dateFrom);
          }
          if (dateTo) {
            where.push("l.end_date <= ?");
            binds.push(dateTo);
          }
          const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
          const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM LeaveRequests l ${whereSql}`).bind(...binds).first();
          const total = Number(countRow?.total || 0);
          const rows = await env.DATABASE.prepare(
            `SELECT l.leave_id, l.leave_type, l.start_date, l.end_date, l.unit, l.amount, l.reason, l.status, l.submitted_at
					 FROM LeaveRequests l
					 ${whereSql}
					 ORDER BY l.submitted_at DESC, l.leave_id DESC
					 LIMIT ? OFFSET ?`
          ).bind(...binds, perPage, offset).all();
          const data = (rows?.results || []).map((r) => ({
            leaveId: String(r.leave_id),
            type: r.leave_type,
            start: r.start_date,
            end: r.end_date,
            unit: r.unit,
            amount: Number(r.amount || 0),
            reason: r.reason || "",
            status: r.status,
            submittedAt: r.submitted_at
          }));
          const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
          return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
          if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
          return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
        }
      }
      if (method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch (_) {
          return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
        const leave_type = String(body?.leave_type || "").trim();
        const start_date = String(body?.start_date || "").trim();
        const end_date = String(body?.end_date || "").trim();
        const unit = String(body?.unit || "day").trim();
        const amount = Number(body?.amount);
        const reason = (body?.reason || "").trim();
        const errors = [];
        if (!leave_type) errors.push({ field: "leave_type", message: "\u5FC5\u9078\u5047\u5225" });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push({ field: "start_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) errors.push({ field: "end_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
        if (start_date && end_date && end_date < start_date) errors.push({ field: "end_date", message: "\u7D50\u675F\u65E5\u671F\u4E0D\u53EF\u65E9\u65BC\u958B\u59CB\u65E5\u671F" });
        if (!["day", "half", "hour"].includes(unit)) errors.push({ field: "unit", message: "\u55AE\u4F4D\u932F\u8AA4" });
        if (!Number.isFinite(amount) || amount <= 0) errors.push({ field: "amount", message: "\u9700\u5927\u65BC 0" });
        if (reason.length > 200) errors.push({ field: "reason", message: "\u8ACB\u52FF\u8D85\u904E 200 \u5B57" });
        if (["maternity", "menstrual"].includes(leave_type) && me.gender === "M") errors.push({ field: "leave_type", message: "\u6B64\u5047\u5225\u50C5\u9650\u5973\u6027" });
        if (leave_type === "paternity" && me.gender === "F") errors.push({ field: "leave_type", message: "\u6B64\u5047\u5225\u50C5\u9650\u7537\u6027" });
        if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
        try {
          await env.DATABASE.prepare(
            "INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, reason, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))"
          ).bind(String(me.user_id), leave_type, start_date, end_date, unit, amount, reason).run();
          const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
          return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u9001\u51FA\u5BE9\u6838", data: { leaveId: String(idRow?.id) }, meta: { requestId } }, corsHeaders);
        } catch (err) {
          console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
          return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
      }
      return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    }
    if (path === "/internal/api/v1/leaves/balances") {
      const me = await getSessionUser(request, env);
      if (!me) {
        return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const corsHeaders = getCorsHeadersForRequest(request, env);
      if (method !== "GET") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
      }
      try {
        const params = url.searchParams;
        const year = parseInt(params.get("year") || String((/* @__PURE__ */ new Date()).getFullYear()), 10);
        const rows = await env.DATABASE.prepare(
          "SELECT leave_type, year, total, used, remain FROM LeaveBalances WHERE user_id = ? AND year = ?"
        ).bind(String(me.user_id), year).all();
        const data = (rows?.results || []).map((r) => ({ type: r.leave_type, year: Number(r.year), total: Number(r.total), used: Number(r.used), remain: Number(r.remain) }));
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, year } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-user") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      const username = (body?.username || "").trim().toLowerCase();
      const name = (body?.name || "\u6E2C\u8A66\u7528\u6236").trim();
      const password = body?.password || "changeme";
      let email = (body?.email || "").trim();
      if (!username || !password) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "username/password \u5FC5\u586B", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      if (!env.DATABASE) {
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u8CC7\u6599\u5EAB\u672A\u7D81\u5B9A", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      }
      try {
        const exists = await env.DATABASE.prepare(
          "SELECT user_id FROM Users WHERE LOWER(username) = ? LIMIT 1"
        ).bind(username).first();
        if (!email) email = `${username}@example.com`;
        const passwordHash = await hashPasswordPBKDF2(password);
        if (exists) {
          await env.DATABASE.prepare(
            "UPDATE Users SET username = ?, name = ?, email = ?, password_hash = ?, updated_at = ? WHERE user_id = ?"
          ).bind(username, name, email, passwordHash, (/* @__PURE__ */ new Date()).toISOString(), exists.user_id).run();
        } else {
          await env.DATABASE.prepare(
            "INSERT INTO Users (username, password_hash, name, email, gender, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'M', date('now'), datetime('now'), datetime('now'))"
          ).bind(username, passwordHash, name, email).run();
        }
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB/\u66F4\u65B0\u6E2C\u8A66\u7528\u6236", data: { username, email }, meta: { requestId } }, getCorsHeadersForRequest(request, env));
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
        return jsonResponse(500, body2, getCorsHeadersForRequest(request, env));
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-clients") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      try {
        await env.DATABASE.prepare("INSERT OR IGNORE INTO CustomerTags(tag_id, tag_name, tag_color) VALUES (1,'\u4E00\u822C','#3b5bdb'),(2,'VIP','#ef4444')").run();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DATABASE.prepare(
          "INSERT OR IGNORE INTO Clients(client_id, company_name, tax_registration_number, assignee_user_id, phone, email, created_at, updated_at) VALUES ('c_001','\u661F\u6CB3\u8CC7\u8A0A\u80A1\u4EFD\u6709\u9650\u516C\u53F8','12345678',1,'02-1234-5678','contact@galaxy.com',?,?),('c_002','\u677E\u67CF\u6709\u9650\u516C\u53F8','87654321',1,'02-8765-4321','service@pine.com',?,?),('c_003','\u5B89\u548C\u9867\u554F\u80A1\u4EFD\u6709\u9650\u516C\u53F8','11223344',1,'02-5566-7788','info@anhe.com',?,?)"
        ).bind(now, now, now, now, now, now).run();
        await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments(client_id, tag_id) VALUES ('c_001',1),('c_001',2),('c_002',2),('c_003',1)").run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u5BA2\u6236/\u6A19\u7C64", meta: { requestId } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
        return jsonResponse(500, body);
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-tasks") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      try {
        await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientServices(client_id, service_id, status) VALUES ('c_001',1,'active'),('c_002',1,'active'),('c_003',1,'active')").run();
        const cs1 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_001' LIMIT 1").first();
        const cs2 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_002' LIMIT 1").first();
        const cs3 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_003' LIMIT 1").first();
        const today = /* @__PURE__ */ new Date();
        const fmt = /* @__PURE__ */ __name((d) => new Date(today.getTime() + d * 864e5).toISOString().slice(0, 10), "fmt");
        await env.DATABASE.prepare(
          "INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))"
        ).bind(cs1.client_service_id, "\u661F\u6CB3\u8CC7\u8A0A \u2212 12 \u6708\u8A18\u5E33", fmt(2), "pending", 1).run();
        await env.DATABASE.prepare(
          "INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))"
        ).bind(cs2.client_service_id, "\u677E\u67CF \u2212 12 \u6708\u71DF\u696D\u7A05", fmt(-1), "in_progress", 1).run();
        await env.DATABASE.prepare(
          "INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))"
        ).bind(cs3.client_service_id, "\u5B89\u548C \u2212 \u5E74\u5EA6\u7D50\u7B97", fmt(10), "completed", 1).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u4EFB\u52D9", meta: { requestId } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
        return jsonResponse(500, body);
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-timesheets") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      try {
        const today = /* @__PURE__ */ new Date();
        const d = /* @__PURE__ */ __name((off) => new Date(today.getTime() + off * 864e5).toISOString().slice(0, 10), "d");
        await env.DATABASE.prepare(
          "INSERT INTO Timesheets (user_id, work_date, client_id, service_name, work_type, hours, note) VALUES (1, ?, 'c_001', '\u8A18\u5E33', 'normal', 2.5, ''),(1, ?, 'c_002', '\u71DF\u696D\u7A05', 'ot-weekday', 1.0, '\u52A0\u73ED'),(1, ?, 'c_003', '\u7D50\u7B97', 'normal', 3.0, '\u6574\u7406')"
        ).bind(d(-2), d(-1), d(0)).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u5DE5\u6642", meta: { requestId } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } });
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-leaves") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      try {
        const y = (/* @__PURE__ */ new Date()).getFullYear();
        await env.DATABASE.prepare(
          "INSERT OR REPLACE INTO LeaveBalances(user_id, leave_type, year, total, used, remain, updated_at) VALUES (1,'annual',?,30,3,27,datetime('now')),(1,'sick',?,30,1,29,datetime('now')),(1,'comp',?,24,16,8,datetime('now'))"
        ).bind(y, y, y).run();
        await env.DATABASE.prepare(
          "INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, reason, status, submitted_at) VALUES (1,'annual',date('now','-10 day'),date('now','-10 day'),'day',1,'', 'approved', datetime('now','-10 day')),(1,'sick',date('now','-25 day'),date('now','-25 day'),'half',0.5,'\u770B\u91AB\u751F','approved', datetime('now','-25 day')),(1,'comp',date('now','-5 day'),date('now','-5 day'),'hour',2,'\u52A0\u73ED\u88DC\u4F11','pending', datetime('now','-5 day'))"
        ).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u5047\u671F\u9918\u984D\u8207\u7533\u8ACB\u8CC7\u6599", meta: { requestId, year: y } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } });
      }
    }
    if (path === "/internal/api/v1/admin/dev-seed-receipts") {
      if (env.APP_ENV === "prod") {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
      }
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      try {
        await env.DATABASE.prepare(
          "INSERT OR IGNORE INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, status, is_auto_generated, created_by) VALUES ('202510-001','c_001','2025-10-01','2025-10-31',12000,'paid',1,1),('202510-002','c_002','2025-10-10','2025-10-30',8000,'unpaid',1,1),('202509-003','c_003','2025-09-20','2025-10-05',5000,'unpaid',1,1)"
        ).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u6536\u64DA", meta: { requestId } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } });
      }
    }
    if (path.startsWith("/internal/api/")) {
      return proxy(env.INTERNAL_API_HOST, path.replace("/internal", ""));
    }
    if (path === "/login" || path.startsWith("/login/")) {
      return proxy(env.INTERNAL_BASE_HOST, "/login");
    }
    if (path.startsWith("/internal/")) {
      const row = await getSessionUser(request, env);
      if (!row) {
        const location = `/login?redirect=${encodeURIComponent(path)}`;
        return new Response(null, { status: 302, headers: { Location: location } });
      }
      return proxy(env.INTERNAL_BASE_HOST, path.replace("/internal", ""));
    }
    return fetch(request);
  }
};

// ../../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-baIFTX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-baIFTX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
