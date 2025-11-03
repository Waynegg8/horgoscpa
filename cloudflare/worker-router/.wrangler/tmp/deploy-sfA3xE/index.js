var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cache-helper.js
var cache_helper_exports = {};
__export(cache_helper_exports, {
  cleanupInvalidatedCache: () => cleanupInvalidatedCache,
  generateCacheKey: () => generateCacheKey,
  getCache: () => getCache,
  getCacheStats: () => getCacheStats,
  invalidateCache: () => invalidateCache,
  invalidateCacheByType: () => invalidateCacheByType,
  saveCache: () => saveCache
});
function generateCacheKey(cacheType, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return cacheType;
  }
  const sortedParams = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return `${cacheType}:${sortedParams}`;
}
async function getCache(env, cacheKey) {
  try {
    const cache = await env.DATABASE.prepare(
      `SELECT cached_data, last_updated_at, hit_count, data_version
			 FROM UniversalDataCache
			 WHERE cache_key = ? AND invalidated = 0`
    ).bind(cacheKey).first();
    if (!cache) return null;
    await env.DATABASE.prepare(
      `UPDATE UniversalDataCache 
			 SET last_accessed_at = datetime('now'), 
			     hit_count = hit_count + 1 
			 WHERE cache_key = ?`
    ).bind(cacheKey).run();
    const data = JSON.parse(cache.cached_data || "{}");
    console.log("[Cache] \u2713 \u7F13\u5B58\u547D\u4E2D", {
      key: cacheKey,
      hits: (cache.hit_count || 0) + 1,
      version: cache.data_version,
      updated: cache.last_updated_at
    });
    return {
      data,
      meta: {
        cached: true,
        hit_count: (cache.hit_count || 0) + 1,
        version: cache.data_version,
        last_updated: cache.last_updated_at
      }
    };
  } catch (err) {
    console.error("[Cache] \u8BFB\u53D6\u5931\u8D25:", err);
    return null;
  }
}
async function saveCache(env, cacheKey, cacheType, data, options = {}) {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const cachedData = JSON.stringify(data);
    const dataSize = new TextEncoder().encode(cachedData).length;
    const userId = options.userId || null;
    const scopeParams = options.scopeParams ? JSON.stringify(options.scopeParams) : null;
    await env.DATABASE.prepare(
      `INSERT INTO UniversalDataCache (cache_key, cache_type, cached_data, data_version, invalidated, user_id, scope_params, data_size, last_updated_at, last_accessed_at, created_at)
			 VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(cache_key) DO UPDATE SET
			   cached_data = excluded.cached_data,
			   data_version = data_version + 1,
			   invalidated = 0,
			   data_size = excluded.data_size,
			   last_updated_at = excluded.last_updated_at,
			   last_accessed_at = excluded.last_accessed_at`
    ).bind(cacheKey, cacheType, cachedData, userId, scopeParams, dataSize, now, now, now).run();
    console.log("[Cache] \u2713 \u7F13\u5B58\u5DF2\u4FDD\u5B58", {
      key: cacheKey,
      type: cacheType,
      size: `${(dataSize / 1024).toFixed(1)}KB`
    });
    return true;
  } catch (err) {
    console.error("[Cache] \u4FDD\u5B58\u5931\u8D25:", err);
    return false;
  }
}
async function invalidateCache(env, cacheKey) {
  try {
    await env.DATABASE.prepare(
      `UPDATE UniversalDataCache 
			 SET invalidated = 1 
			 WHERE cache_key = ?`
    ).bind(cacheKey).run();
    console.log("[Cache] \u2713 \u7F13\u5B58\u5DF2\u5931\u6548", { key: cacheKey });
  } catch (err) {
    console.error("[Cache] \u5931\u6548\u5931\u8D25:", err);
  }
}
async function invalidateCacheByType(env, cacheType, filters = {}) {
  try {
    let sql = `UPDATE UniversalDataCache SET invalidated = 1 WHERE cache_type = ?`;
    const binds = [cacheType];
    if (filters.userId) {
      sql += ` AND user_id = ?`;
      binds.push(filters.userId);
    }
    const result = await env.DATABASE.prepare(sql).bind(...binds).run();
    console.log("[Cache] \u2713 \u6279\u91CF\u5931\u6548", {
      type: cacheType,
      filters,
      affected: result.changes || 0
    });
  } catch (err) {
    console.error("[Cache] \u6279\u91CF\u5931\u6548\u5931\u8D25:", err);
  }
}
async function cleanupInvalidatedCache(env, daysOld = 7) {
  try {
    const result = await env.DATABASE.prepare(
      `DELETE FROM UniversalDataCache 
			 WHERE invalidated = 1 
			   AND datetime(last_updated_at) < datetime('now', '-' || ? || ' days')`
    ).bind(daysOld).run();
    console.log("[Cache] \u2713 \u6E05\u7406\u5B8C\u6210", {
      deleted: result.changes || 0,
      older_than_days: daysOld
    });
  } catch (err) {
    console.error("[Cache] \u6E05\u7406\u5931\u8D25:", err);
  }
}
async function getCacheStats(env) {
  try {
    const stats = await env.DATABASE.prepare(
      `SELECT * FROM CacheStats`
    ).all();
    return stats.results || [];
  } catch (err) {
    console.error("[Cache] \u83B7\u53D6\u7EDF\u8BA1\u5931\u8D25:", err);
    return [];
  }
}
var init_cache_helper = __esm({
  "src/cache-helper.js"() {
    __name(generateCacheKey, "generateCacheKey");
    __name(getCache, "getCache");
    __name(saveCache, "saveCache");
    __name(invalidateCache, "invalidateCache");
    __name(invalidateCacheByType, "invalidateCacheByType");
    __name(cleanupInvalidatedCache, "cleanupInvalidatedCache");
    __name(getCacheStats, "getCacheStats");
  }
});

// src/kv-cache-helper.js
var kv_cache_helper_exports = {};
__export(kv_cache_helper_exports, {
  deleteKVCache: () => deleteKVCache,
  deleteKVCacheByPrefix: () => deleteKVCacheByPrefix,
  generateCacheKey: () => generateCacheKey2,
  getHybridCache: () => getHybridCache,
  getKVCache: () => getKVCache,
  saveKVCache: () => saveKVCache
});
function generateCacheKey2(cacheType, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return cacheType;
  }
  const sortedParams = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return `${cacheType}:${sortedParams}`;
}
async function getKVCache(env, cacheKey) {
  try {
    const cached = await env.CACHE.get(cacheKey, { type: "json" });
    if (!cached) return null;
    const stats = {
      hit_count: (cached.meta?.hit_count || 0) + 1,
      last_accessed: (/* @__PURE__ */ new Date()).toISOString()
    };
    env.CACHE.put(
      cacheKey,
      JSON.stringify({ ...cached, meta: { ...cached.meta, ...stats } }),
      { expirationTtl: 3600 }
      // 1小时过期
    ).catch((err) => console.error("[KV Cache] \u66F4\u65B0\u7EDF\u8BA1\u5931\u8D25:", err));
    console.log("[KV Cache] \u2713 \u7F13\u5B58\u547D\u4E2D", {
      key: cacheKey,
      hits: stats.hit_count,
      age: Math.round((Date.now() - new Date(cached.meta?.cached_at || 0).getTime()) / 1e3) + "s"
    });
    return {
      data: cached.data,
      meta: {
        cached: true,
        hit_count: stats.hit_count,
        cached_at: cached.meta?.cached_at
      }
    };
  } catch (err) {
    console.error("[KV Cache] \u8BFB\u53D6\u5931\u8D25:", err);
    return null;
  }
}
async function saveKVCache(env, cacheKey, cacheType, data, options = {}) {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const cacheData = {
      data,
      meta: {
        cached_at: now,
        cache_type: cacheType,
        hit_count: 0,
        version: 1,
        user_id: options.userId || null,
        scope_params: options.scopeParams || null
      }
    };
    const jsonData = JSON.stringify(cacheData);
    const dataSize = new TextEncoder().encode(jsonData).length;
    await env.CACHE.put(cacheKey, jsonData, {
      expirationTtl: options.ttl || 3600,
      // 默认1小时过期
      metadata: {
        type: cacheType,
        size: dataSize,
        cached_at: now
      }
    });
    console.log("[KV Cache] \u2713 \u7F13\u5B58\u5DF2\u4FDD\u5B58", {
      key: cacheKey,
      type: cacheType,
      size: `${(dataSize / 1024).toFixed(1)}KB`,
      ttl: `${options.ttl || 3600}s`
    });
    return true;
  } catch (err) {
    console.error("[KV Cache] \u4FDD\u5B58\u5931\u8D25:", err);
    return false;
  }
}
async function deleteKVCache(env, cacheKey) {
  try {
    await env.CACHE.delete(cacheKey);
    console.log("[KV Cache] \u2713 \u7F13\u5B58\u5DF2\u5220\u9664", { key: cacheKey });
  } catch (err) {
    console.error("[KV Cache] \u5220\u9664\u5931\u8D25:", err);
  }
}
async function deleteKVCacheByPrefix(env, prefix) {
  try {
    const list = await env.CACHE.list({ prefix });
    const deletePromises = list.keys.map((key) => env.CACHE.delete(key.name));
    await Promise.all(deletePromises);
    console.log("[KV Cache] \u2713 \u6279\u91CF\u5220\u9664\u5B8C\u6210", {
      prefix,
      count: list.keys.length
    });
  } catch (err) {
    console.error("[KV Cache] \u6279\u91CF\u5220\u9664\u5931\u8D25:", err);
  }
}
async function getHybridCache(env, cacheKey, fetchData, options = {}) {
  try {
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached) {
      return { ...kvCached, source: "kv" };
    }
    if (options.useD1Fallback) {
      const { getCache: getCache2 } = await Promise.resolve().then(() => (init_cache_helper(), cache_helper_exports));
      const d1Cached = await getCache2(env, cacheKey);
      if (d1Cached) {
        saveKVCache(env, cacheKey, options.cacheType, d1Cached.data, options).catch((err) => console.error("[Hybrid Cache] KV\u540C\u6B65\u5931\u8D25:", err));
        return { ...d1Cached, source: "d1" };
      }
    }
    const freshData = await fetchData();
    const savePromises = [
      saveKVCache(env, cacheKey, options.cacheType, freshData, options)
    ];
    if (options.useD1Fallback) {
      const { saveCache: saveCache2 } = await Promise.resolve().then(() => (init_cache_helper(), cache_helper_exports));
      savePromises.push(
        saveCache2(env, cacheKey, options.cacheType, freshData, options)
      );
    }
    await Promise.all(savePromises);
    return {
      data: freshData,
      meta: { cached: false, source: "fresh" }
    };
  } catch (err) {
    console.error("[Hybrid Cache] \u5931\u8D25:", err);
    const freshData = await fetchData();
    return {
      data: freshData,
      meta: { cached: false, source: "error_fallback" }
    };
  }
}
var init_kv_cache_helper = __esm({
  "src/kv-cache-helper.js"() {
    __name(generateCacheKey2, "generateCacheKey");
    __name(getKVCache, "getKVCache");
    __name(saveKVCache, "saveKVCache");
    __name(deleteKVCache, "deleteKVCache");
    __name(deleteKVCacheByPrefix, "deleteKVCacheByPrefix");
    __name(getHybridCache, "getHybridCache");
  }
});

// src/utils.js
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
    "SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.name, u.email, u.is_admin, u.gender FROM sessions s JOIN Users u ON u.user_id = s.user_id WHERE s.id = ? LIMIT 1"
  ).bind(sessionId).first();
  if (!row) return null;
  const exp = Date.parse(row.expires_at);
  if (Number.isNaN(exp) || exp <= Date.now()) return null;
  return row;
}
__name(getSessionUser, "getSessionUser");

// src/auth.js
async function handleLogin(request, env, requestId) {
  if (request.method.toUpperCase() !== "POST") {
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
      "SELECT user_id, username, password_hash, name, email, is_admin, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
    ).bind(username).first();
    const corsHeaders = getCorsHeadersForRequest(request, env);
    const unauthorized = /* @__PURE__ */ __name(() => jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4", meta: { requestId } }, corsHeaders), "unauthorized");
    if (!userRow || userRow.is_deleted === 1) {
      return unauthorized();
    }
    const hash = userRow.password_hash || "";
    const passOk = await verifyPasswordPBKDF2(password, hash);
    if (!passOk) {
      return unauthorized();
    }
    await env.DATABASE.prepare(
      "UPDATE Users SET last_login = ? WHERE user_id = ?"
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
      "Domain=horgoscpa.com",
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
    console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/login", err: String(err) }));
    const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
    return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
  }
}
__name(handleLogin, "handleLogin");
async function handleAuthMe(request, env, requestId) {
  if (request.method.toUpperCase() !== "GET") {
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
      isAdmin: row.is_admin === 1,
      gender: row.gender || "M"
    };
    return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, getCorsHeadersForRequest(request, env));
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/me", err: String(err) }));
    const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
    return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
  }
}
__name(handleAuthMe, "handleAuthMe");
async function handleLogout(request, env, requestId) {
  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, getCorsHeadersForRequest(request, env));
  }
  try {
    const cookieName = String(env.SESSION_COOKIE_NAME || "session");
    const cookie = request.headers.get("Cookie") || "";
    const sessionId = cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`))?.split("=")[1];
    if (sessionId && env.DATABASE) {
      await env.DATABASE.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    }
    const clearCookie = [
      `${cookieName}=`,
      "Domain=horgoscpa.com",
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Max-Age=0"
    ].join("; ");
    const corsHeaders = getCorsHeadersForRequest(request, env);
    return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u767B\u51FA", meta: { requestId } }, { "Set-Cookie": clearCookie, ...corsHeaders });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/logout", err: String(err) }));
    const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
    return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
  }
}
__name(handleLogout, "handleLogout");

// src/api/clients.js
init_cache_helper();
init_kv_cache_helper();
async function handleClients(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  console.log(`[CLIENTS.JS] \u6536\u5230\u8ACB\u6C42: ${method} ${url.pathname}`);
  const matchItems = url.pathname.match(/^\/internal\/api\/v1\/clients\/([^\/]+)\/services\/(\d+)\/items$/);
  console.log(`[CLIENTS.JS] \u8DEF\u75311\u5339\u914D\u7D50\u679C (items):`, matchItems);
  if (method === "GET" && matchItems) {
    const clientId = matchItems[1];
    const serviceId = parseInt(matchItems[2]);
    try {
      const cacheKey = generateCacheKey("service_items", { serviceId });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached && kvCached.data) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data,
          meta: { requestId, ...kvCached.meta, cache_source: "kv" }
        }, corsHeaders);
      }
      const client = await env.DATABASE.prepare(
        `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
      ).bind(clientId).first();
      if (!client) {
        return jsonResponse(404, {
          ok: false,
          code: "NOT_FOUND",
          message: "\u5BA2\u6236\u4E0D\u5B58\u5728",
          meta: { requestId }
        }, corsHeaders);
      }
      const items = await env.DATABASE.prepare(
        `SELECT item_id, item_name, item_code, description, sort_order
				 FROM ServiceItems
				 WHERE service_id = ? AND is_active = 1
				 ORDER BY sort_order ASC, item_id ASC`
      ).bind(serviceId).all();
      const data = items.results.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        description: item.description || ""
      }));
      await saveKVCache(env, cacheKey, "service_items", data, { ttl: 3600 }).catch((err) => console.error("[Service Items] KV\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err));
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  const matchServices = url.pathname.match(/^\/internal\/api\/v1\/clients\/([^\/]+)\/services$/);
  console.log(`[CLIENTS.JS] \u8DEF\u75312\u5339\u914D\u7D50\u679C (services):`, matchServices);
  if (method === "GET" && matchServices) {
    const clientId = matchServices[1];
    console.log("[API DEBUG] \u670D\u52D9\u9805\u76EE\u8DEF\u7531\u5339\u914D\uFF01clientId:", clientId);
    const cacheKey = generateCacheKey("client_services", { clientId });
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached && kvCached.data) {
      console.log("[API DEBUG] \u2713 \u4F7F\u7528KV\u7F13\u5B58\u7684\u670D\u52A1\u9879\u76EE");
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data,
        meta: { requestId, ...kvCached.meta, cache_source: "kv" }
      }, corsHeaders);
    }
    const d1Cached = await getCache(env, cacheKey);
    if (d1Cached && d1Cached.data) {
      saveKVCache(env, cacheKey, "client_services", d1Cached.data, {
        scopeParams: { clientId },
        ttl: 3600
      }).catch((err) => console.error("[CLIENTS] KV\u540C\u6B65\u5931\u8D25:", err));
      console.log("[API DEBUG] \u2713 \u4F7F\u7528D1\u7F13\u5B58\u7684\u670D\u52A1\u9879\u76EE");
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
        data: d1Cached.data,
        meta: { requestId, ...d1Cached.meta, cache_source: "d1" }
      }, corsHeaders);
    }
    try {
      const client = await env.DATABASE.prepare(
        `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
      ).bind(clientId).first();
      if (!client) {
        return jsonResponse(404, {
          ok: false,
          code: "NOT_FOUND",
          message: "\u5BA2\u6236\u4E0D\u5B58\u5728",
          meta: { requestId }
        }, corsHeaders);
      }
      const clientServices = await env.DATABASE.prepare(
        `SELECT DISTINCT cs.service_id
				 FROM ClientServices cs
				 WHERE cs.client_id = ? AND cs.is_deleted = 0 AND cs.service_id IS NOT NULL`
      ).bind(clientId).all();
      console.log("[API DEBUG] ClientServices \u67E5\u8A62\u7D50\u679C:", clientServices.results);
      let services;
      if (clientServices.results && clientServices.results.length > 0) {
        const serviceIds = clientServices.results.map((r) => r.service_id);
        const placeholders = serviceIds.map(() => "?").join(",");
        console.log("[API DEBUG] \u5BA2\u6236\u6709\u6307\u5B9A\u670D\u52D9\uFF0CserviceIds:", serviceIds);
        services = await env.DATABASE.prepare(
          `SELECT service_id, service_name, service_code, description
					 FROM Services
					 WHERE service_id IN (${placeholders}) AND is_active = 1
					 ORDER BY sort_order ASC, service_id ASC`
        ).bind(...serviceIds).all();
      } else {
        console.log("[API DEBUG] \u5BA2\u6236\u6C92\u6709\u6307\u5B9A\u670D\u52D9\uFF0C\u8FD4\u56DE\u6240\u6709\u53EF\u7528\u670D\u52D9");
        services = await env.DATABASE.prepare(
          `SELECT service_id, service_name, service_code, description
					 FROM Services
					 WHERE is_active = 1
					 ORDER BY sort_order ASC, service_id ASC`
        ).all();
      }
      const data = services.results.map((service) => ({
        service_id: service.service_id,
        service_name: service.service_name,
        service_code: service.service_code,
        description: service.description || ""
      }));
      console.log("[API DEBUG] \u6700\u7D42\u8FD4\u56DE\u670D\u52D9\u5217\u8868:", data);
      try {
        await Promise.all([
          saveKVCache(env, cacheKey, "client_services", data, {
            scopeParams: { clientId },
            ttl: 3600
            // 1小时
          }),
          saveCache(env, cacheKey, "client_services", data, {
            scopeParams: { clientId }
          })
        ]);
        console.log("[CLIENTS] \u2713 \u5BA2\u6237\u670D\u52A1\u9879\u76EE\u7F13\u5B58\u5DF2\u4FDD\u5B58\uFF08KV+D1\uFF09");
      } catch (err) {
        console.error("[CLIENTS] \u2717 \u670D\u52A1\u9879\u76EE\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
      }
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  const matchSingle = url.pathname.match(/\/clients\/[^\/]+$/);
  console.log(`[CLIENTS.JS] \u8DEF\u75313\u5339\u914D\u7D50\u679C (single):`, matchSingle);
  if (method === "GET" && matchSingle) {
    const clientId = url.pathname.split("/").pop();
    try {
      const cacheKey = generateCacheKey("client_detail", { clientId });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data,
          meta: { requestId, cache_source: "kv" }
        }, corsHeaders);
      }
      const row = await env.DATABASE.prepare(
        `SELECT c.client_id, c.company_name, c.tax_registration_number, c.contact_person_1, c.contact_person_2, c.phone, c.email, 
				        c.client_notes, c.payment_notes, c.created_at, c.updated_at,
				        u.user_id as assignee_id, u.name as assignee_name,
				        GROUP_CONCAT(t.tag_id || ':' || t.tag_name || ':' || COALESCE(t.tag_color, ''), '|') as tags
				 FROM Clients c
				 LEFT JOIN Users u ON u.user_id = c.assignee_user_id
				 LEFT JOIN ClientTagAssignments a ON a.client_id = c.client_id
				 LEFT JOIN CustomerTags t ON t.tag_id = a.tag_id
				 WHERE c.client_id = ? AND c.is_deleted = 0
				 GROUP BY c.client_id`
      ).bind(clientId).first();
      if (!row) {
        return jsonResponse(404, {
          ok: false,
          code: "NOT_FOUND",
          message: "\u5BA2\u6236\u4E0D\u5B58\u5728",
          meta: { requestId }
        }, corsHeaders);
      }
      const tags = [];
      if (row.tags) {
        const tagParts = String(row.tags).split("|");
        tagParts.forEach((part) => {
          const [id, name, color] = part.split(":");
          if (id && name) {
            tags.push({
              tag_id: parseInt(id),
              tag_name: name,
              tag_color: color || null
            });
          }
        });
      }
      const servicesRows = await env.DATABASE.prepare(
        `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
				        cs.task_template_id, cs.auto_generate_tasks,
				        cs.start_date, cs.end_date, cs.service_notes,
				        s.service_name, s.service_code
				 FROM ClientServices cs
				 LEFT JOIN Services s ON s.service_id = cs.service_id
				 WHERE cs.client_id = ? AND cs.is_deleted = 0
				 ORDER BY cs.client_service_id ASC`
      ).bind(clientId).all();
      const services = await Promise.all((servicesRows?.results || []).map(async (svc) => {
        const billingRows = await env.DATABASE.prepare(
          `SELECT billing_month, billing_amount, payment_due_days, notes
					 FROM ServiceBillingSchedule
					 WHERE client_service_id = ?
					 ORDER BY billing_month ASC`
        ).bind(svc.client_service_id).all();
        const billing_schedule = (billingRows?.results || []).map((b) => ({
          billing_month: b.billing_month,
          billing_amount: Number(b.billing_amount || 0),
          payment_due_days: Number(b.payment_due_days || 30),
          notes: b.notes || ""
        }));
        const year_total = billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0);
        return {
          client_service_id: svc.client_service_id,
          service_id: svc.service_id,
          service_name: svc.service_name || "",
          service_code: svc.service_code || "",
          status: svc.status || "active",
          service_cycle: svc.service_cycle || "monthly",
          task_template_id: svc.task_template_id || null,
          auto_generate_tasks: Boolean(svc.auto_generate_tasks),
          start_date: svc.start_date || null,
          end_date: svc.end_date || null,
          service_notes: svc.service_notes || "",
          billing_schedule,
          year_total
        };
      }));
      const data = {
        clientId: row.client_id,
        companyName: row.company_name,
        taxId: row.tax_registration_number,
        contact_person_1: row.contact_person_1 || "",
        contact_person_2: row.contact_person_2 || "",
        assigneeUserId: row.assignee_id,
        assigneeName: row.assignee_name || "",
        phone: row.phone || "",
        email: row.email || "",
        clientNotes: row.client_notes || "",
        paymentNotes: row.payment_notes || "",
        tags,
        services,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      await saveKVCache(env, cacheKey, "client_detail", data, { ttl: 3600 });
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  const matchList = url.pathname === "/internal/api/v1/clients";
  console.log(`[CLIENTS.JS] \u8DEF\u75314\u5339\u914D\u7D50\u679C (list):`, matchList, "pathname:", url.pathname);
  if (method === "GET" && matchList) {
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
    const offset = (page - 1) * perPage;
    const searchQuery = (params.get("q") || "").trim();
    const tagId = params.get("tag_id") || "";
    const cacheKey = generateCacheKey("clients_list", { page, perPage, q: searchQuery, tag_id: tagId });
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached && kvCached.data) {
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data.list,
        meta: { ...kvCached.data.meta, requestId, ...kvCached.meta, cache_source: "kv" }
      }, corsHeaders);
    }
    const d1Cached = await getCache(env, cacheKey);
    if (d1Cached && d1Cached.data) {
      saveKVCache(env, cacheKey, "clients_list", d1Cached.data, {
        scopeParams: { page, perPage, q: searchQuery, tag_id: tagId },
        ttl: 3600
      }).catch((err) => console.error("[CLIENTS] KV\u540C\u6B65\u5931\u8D25:", err));
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
        data: d1Cached.data.list,
        meta: { ...d1Cached.data.meta, requestId, ...d1Cached.meta, cache_source: "d1" }
      }, corsHeaders);
    }
    try {
      const where = ["is_deleted = 0"];
      const binds = [];
      if (searchQuery) {
        where.push("(company_name LIKE ? OR tax_registration_number LIKE ?)");
        binds.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }
      if (tagId) {
        where.push("EXISTS (SELECT 1 FROM ClientTagAssignments cta WHERE cta.client_id = Clients.client_id AND cta.tag_id = ?)");
        binds.push(tagId);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const countRow = await env.DATABASE.prepare(
        `SELECT COUNT(*) as total FROM Clients ${whereSql}`
      ).bind(...binds).first();
      const total = Number(countRow?.total || 0);
      const rows = await env.DATABASE.prepare(
        `SELECT client_id, company_name, tax_registration_number, contact_person_1, 
				        phone, email, created_at, assignee_user_id
				 FROM Clients
				 ${whereSql}
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        clientId: r.client_id,
        companyName: r.company_name,
        taxId: r.tax_registration_number,
        contact_person_1: r.contact_person_1 || "",
        assigneeName: "",
        // 暂时为空，避免额外查询
        tags: [],
        // 暂时为空，避免额外查询
        phone: r.phone || "",
        email: r.email || "",
        createdAt: r.created_at,
        year_total: 0
      }));
      const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
      const cacheData = { list: data, meta };
      try {
        await Promise.all([
          saveKVCache(env, cacheKey, "clients_list", cacheData, {
            scopeParams: { page, perPage, q: searchQuery, tag_id: tagId },
            ttl: 3600
            // 1小时
          }),
          saveCache(env, cacheKey, "clients_list", cacheData, {
            scopeParams: { page, perPage, q: searchQuery, tag_id: tagId }
          })
        ]);
        console.log("[CLIENTS] \u2713 \u5BA2\u6237\u5217\u8868\u7F13\u5B58\u5DF2\u4FDD\u5B58\uFF08KV+D1\uFF09");
      } catch (err) {
        console.error("[CLIENTS] \u2717 \u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  console.log(`[CLIENTS.JS] \u6AA2\u67E5\u5275\u5EFA\u5BA2\u6236\u8DEF\u7531: ${method} === "POST" && ${url.pathname} === "/internal/api/v1/clients" => ${method === "POST" && url.pathname === "/internal/api/v1/clients"}`);
  if (method === "POST" && url.pathname === "/internal/api/v1/clients") {
    console.log("[CLIENTS.JS] \u2705 \u5339\u914D\u5275\u5EFA\u5BA2\u6236\u8DEF\u7531");
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
      const contactPerson1 = (body?.contact_person_1 || "").trim();
      const contactPerson2 = (body?.contact_person_2 || "").trim();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        "INSERT INTO Clients (client_id, company_name, contact_person_1, contact_person_2, assignee_user_id, phone, email, client_notes, payment_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(clientId, companyName, contactPerson1, contactPerson2, assigneeUserId, phone, email, clientNotes, paymentNotes, now, now).run();
      for (const tagId of tagIds) {
        await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)").bind(clientId, tagId, now).run();
      }
      const data = { clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, tags: tagIds };
      Promise.all([
        deleteKVCacheByPrefix(env, "clients_list"),
        invalidateCacheByType(env, "clients_list")
      ]).catch((err) => console.error("[CLIENTS] \u5931\u6548\u7F13\u5B58\u5931\u8D25:", err));
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "PUT" && url.pathname.match(/\/clients\/[^\/]+$/)) {
    const clientId = url.pathname.split("/").pop();
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const companyName = String(body?.company_name || "").trim();
    const contactPerson1 = (body?.contact_person_1 || "").trim();
    const contactPerson2 = (body?.contact_person_2 || "").trim();
    const assigneeUserId = Number(body?.assignee_user_id || 0);
    const phone = (body?.phone || "").trim();
    const email = (body?.email || "").trim();
    const clientNotes = (body?.client_notes || "").trim();
    const paymentNotes = (body?.payment_notes || "").trim();
    const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    if (companyName.length < 1 || companyName.length > 100) errors.push({ field: "company_name", message: "\u9577\u5EA6\u9700 1\u2013100" });
    if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) errors.push({ field: "assignee_user_id", message: "\u5FC5\u586B" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: "email", message: "Email \u683C\u5F0F\u932F\u8AA4" });
    if (phone && !/^[-+()\s0-9]{6,}$/.test(phone)) errors.push({ field: "phone", message: "\u96FB\u8A71\u683C\u5F0F\u932F\u8AA4" });
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
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
        "UPDATE Clients SET company_name = ?, contact_person_1 = ?, contact_person_2 = ?, assignee_user_id = ?, phone = ?, email = ?, client_notes = ?, payment_notes = ?, updated_at = ? WHERE client_id = ?"
      ).bind(companyName, contactPerson1, contactPerson2, assigneeUserId, phone, email, clientNotes, paymentNotes, now, clientId).run();
      await env.DATABASE.prepare("DELETE FROM ClientTagAssignments WHERE client_id = ?").bind(clientId).run();
      for (const tagId of tagIds) {
        await env.DATABASE.prepare("INSERT INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)").bind(clientId, tagId, now).run();
      }
      const data = { clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, tags: tagIds, updatedAt: now };
      invalidateCacheByType(env, "clients_list").catch(
        (err) => console.error("[CLIENTS] \u5931\u6548\u7F13\u5B58\u5931\u8D25:", err)
      );
      return jsonResponse(200, { ok: true, code: "SUCCESS", message: "\u5DF2\u66F4\u65B0", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "DELETE" && url.pathname.match(/\/clients\/[^\/]+$/)) {
    const clientId = url.pathname.split("/").pop();
    try {
      const existing = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        "UPDATE Clients SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE client_id = ?"
      ).bind(now, me.user_id, clientId).run();
      invalidateCacheByType(env, "clients_list").catch(
        (err) => console.error("[CLIENTS] \u5931\u6548\u7F13\u5B58\u5931\u8D25:", err)
      );
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u5DF2\u522A\u9664",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  if (method === "POST" && url.pathname === "/internal/api/v1/clients/batch-assign") {
    if (!me.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u6B0A\u9650\u4E0D\u8DB3\uFF0C\u50C5\u7BA1\u7406\u54E1\u53EF\u57F7\u884C",
        meta: { requestId }
      }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const clientIds = Array.isArray(body?.client_ids) ? body.client_ids : [];
    const assigneeUserId = Number(body?.assignee_user_id || 0);
    if (clientIds.length === 0) {
      errors.push({ field: "client_ids", message: "\u8ACB\u9078\u64C7\u81F3\u5C11\u4E00\u500B\u5BA2\u6236" });
    }
    if (clientIds.length > 100) {
      errors.push({ field: "client_ids", message: "\u4E00\u6B21\u6700\u591A\u5206\u914D 100 \u500B\u5BA2\u6236" });
    }
    if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) {
      errors.push({ field: "assignee_user_id", message: "\u8ACB\u9078\u64C7\u8CA0\u8CAC\u4EBA\u54E1" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const assExist = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
      if (!assExist) {
        return jsonResponse(422, {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "\u8CA0\u8CAC\u4EBA\u4E0D\u5B58\u5728",
          errors: [{ field: "assignee_user_id", message: "\u4E0D\u5B58\u5728" }],
          meta: { requestId }
        }, corsHeaders);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const placeholders = clientIds.map(() => "?").join(",");
      const result = await env.DATABASE.prepare(
        `UPDATE Clients SET assignee_user_id = ?, updated_at = ? WHERE client_id IN (${placeholders}) AND is_deleted = 0`
      ).bind(assigneeUserId, now, ...clientIds).run();
      const updatedCount = result?.meta?.changes || 0;
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: `\u5DF2\u66F4\u65B0 ${updatedCount} \u500B\u5BA2\u6236`,
        data: { updated_count: updatedCount },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  const matchAddService = url.pathname.match(/^\/internal\/api\/v1\/clients\/([^\/]+)\/services$/);
  console.log(`[CLIENTS.JS] \u6AA2\u67E5\u65B0\u589E\u670D\u52D9\u8DEF\u7531: matchAddService =`, matchAddService, `method = ${method}`);
  if (method === "POST" && matchAddService) {
    console.log("[CLIENTS.JS] \u2705 \u5339\u914D\u65B0\u589E\u670D\u52D9\u8DEF\u7531");
    console.log("[CLIENTS.JS] \u65B0\u589E\u670D\u52D9 - pathname =", url.pathname);
    const clientId = matchAddService[1];
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    console.log("[CLIENTS.JS] \u65B0\u589E\u670D\u52D9 - clientId =", clientId, " body =", JSON.stringify({
      service_id: body?.service_id,
      status: body?.status,
      service_cycle: body?.service_cycle,
      start_date: body?.start_date,
      end_date: body?.end_date
    }));
    const errors = [];
    const serviceId = Number(body?.service_id || 0);
    const serviceCycle = String(body?.service_cycle || "monthly").trim();
    const status = String(body?.status || "active").trim();
    const taskTemplateId = body?.task_template_id ? Number(body.task_template_id) : null;
    const autoGenerateTasks = body?.auto_generate_tasks !== false;
    const startDate = String(body?.start_date || "").trim();
    const endDate = String(body?.end_date || "").trim();
    const serviceNotes = String(body?.service_notes || "").trim();
    if (!serviceId || serviceId <= 0) {
      errors.push({ field: "service_id", message: "\u8ACB\u9078\u64C7\u670D\u52D9\u9805\u76EE" });
    }
    if (!["monthly", "quarterly", "yearly", "one-time"].includes(serviceCycle)) {
      errors.push({ field: "service_cycle", message: "\u670D\u52D9\u9031\u671F\u683C\u5F0F\u932F\u8AA4" });
    }
    if (!["active", "suspended", "expired", "cancelled"].includes(status)) {
      errors.push({ field: "status", message: "\u72C0\u614B\u683C\u5F0F\u932F\u8AA4" });
    }
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      errors.push({ field: "start_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      errors.push({ field: "end_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const client = await env.DATABASE.prepare(
        "SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0"
      ).bind(clientId).first();
      if (!client) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const service = await env.DATABASE.prepare(
        "SELECT service_id FROM Services WHERE service_id = ? AND is_active = 1"
      ).bind(serviceId).first();
      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const result = await env.DATABASE.prepare(
        `INSERT INTO ClientServices (client_id, service_id, status, service_cycle, 
				 task_template_id, auto_generate_tasks, start_date, end_date, service_notes)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        clientId,
        serviceId,
        status,
        serviceCycle,
        taskTemplateId,
        autoGenerateTasks ? 1 : 0,
        startDate || null,
        endDate || null,
        serviceNotes
      ).run();
      console.log("[CLIENTS.JS] \u65B0\u589E\u670D\u52D9 - \u63D2\u5165\u6210\u529F client_service_id =", result?.meta?.last_row_id);
      const clientServiceId = result?.meta?.last_row_id;
      const invalidateCacheKey = generateCacheKey("client_services", { clientId });
      invalidateCache(env, invalidateCacheKey).catch(
        (err) => console.error("[CLIENTS] \u5931\u6548\u670D\u52A1\u9879\u76EE\u7F13\u5B58\u5931\u8D25:", err)
      );
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u670D\u52D9\u5DF2\u65B0\u589E",
        data: { client_service_id: clientServiceId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  const matchUpdateService = url.pathname.match(/^\/internal\/api\/v1\/clients\/([^\/]+)\/services\/(\d+)$/);
  if (method === "PUT" && matchUpdateService) {
    const clientId = matchUpdateService[1];
    const clientServiceId = Number(matchUpdateService[2]);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const serviceCycle = String(body?.service_cycle || "monthly").trim();
    const taskTemplateId = body?.task_template_id ? Number(body.task_template_id) : null;
    const autoGenerateTasks = body?.auto_generate_tasks !== false;
    const startDate = String(body?.start_date || "").trim();
    const endDate = String(body?.end_date || "").trim();
    const serviceNotes = String(body?.service_notes || "").trim();
    const status = String(body?.status || "active").trim();
    if (!["monthly", "quarterly", "yearly", "one-time"].includes(serviceCycle)) {
      errors.push({ field: "service_cycle", message: "\u670D\u52D9\u9031\u671F\u683C\u5F0F\u932F\u8AA4" });
    }
    if (!["active", "suspended", "expired", "cancelled"].includes(status)) {
      errors.push({ field: "status", message: "\u72C0\u614B\u683C\u5F0F\u932F\u8AA4" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND client_id = ? AND is_deleted = 0"
      ).bind(clientServiceId, clientId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        `UPDATE ClientServices SET service_cycle = ?, task_template_id = ?, auto_generate_tasks = ?,
				 start_date = ?, end_date = ?, service_notes = ?, status = ?
				 WHERE client_service_id = ?`
      ).bind(
        serviceCycle,
        taskTemplateId,
        autoGenerateTasks ? 1 : 0,
        startDate || null,
        endDate || null,
        serviceNotes,
        status,
        clientServiceId
      ).run();
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u670D\u52D9\u5DF2\u66F4\u65B0",
        data: { client_service_id: clientServiceId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "DELETE" && matchUpdateService) {
    const clientId = matchUpdateService[1];
    const clientServiceId = Number(matchUpdateService[2]);
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND client_id = ? AND is_deleted = 0"
      ).bind(clientServiceId, clientId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        "UPDATE ClientServices SET is_deleted = 1 WHERE client_service_id = ?"
      ).bind(clientServiceId).run();
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u670D\u52D9\u5DF2\u522A\u9664",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleClients, "handleClients");

// src/api/task_adjustments.js
function daysBetween(date1Str, date2Str) {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  return Math.round((d2 - d1) / (1e3 * 60 * 60 * 24));
}
__name(daysBetween, "daysBetween");
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
__name(addDays, "addDays");
async function autoAdjustDependentTasks(env, taskId, userId) {
  try {
    const completedTask = await env.DATABASE.prepare(`
      SELECT task_id, due_date, completed_at, original_due_date
      FROM ActiveTasks
      WHERE task_id = ? AND status = 'completed'
    `).bind(taskId).first();
    if (!completedTask || !completedTask.due_date || !completedTask.completed_at) {
      return { adjusted: 0, errors: [] };
    }
    const completedDate = completedTask.completed_at.split("T")[0];
    const dueDate = completedTask.due_date;
    const delayDays = daysBetween(dueDate, completedDate);
    if (delayDays <= 0) {
      return { adjusted: 0, errors: [] };
    }
    console.log(`[\u4EFB\u52A1\u8C03\u6574] \u4EFB\u52A1 ${taskId} \u5EF6\u8FDF\u4E86 ${delayDays} \u5929`);
    const dependentTasks = await env.DATABASE.prepare(`
      SELECT task_id, task_name, due_date, status
      FROM ActiveTasks
      WHERE prerequisite_task_id = ?
        AND is_deleted = 0
        AND status NOT IN ('completed', 'cancelled')
    `).bind(taskId).all();
    const results = { adjusted: 0, errors: [] };
    for (const task of dependentTasks.results || []) {
      try {
        const adjustDays = Math.min(delayDays, 7);
        const newDueDate = addDays(task.due_date, adjustDays);
        await env.DATABASE.prepare(`
          UPDATE ActiveTasks
          SET due_date = ?,
              due_date_adjusted = 1,
              adjustment_count = adjustment_count + 1,
              last_adjustment_date = datetime('now'),
              can_start_date = ?
          WHERE task_id = ?
        `).bind(newDueDate, completedDate, task.task_id).run();
        await env.DATABASE.prepare(`
          INSERT INTO TaskDueDateAdjustments (
            task_id, old_due_date, new_due_date, days_changed,
            adjustment_reason, adjustment_type,
            requested_by, is_system_auto
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
          task.task_id,
          task.due_date,
          newDueDate,
          adjustDays,
          `\u7CFB\u7EDF\u81EA\u52A8\u8C03\u6574\uFF1A\u524D\u7F6E\u4EFB\u52A1 ${completedTask.task_id} \u5EF6\u8FDF ${delayDays} \u5929\u5B8C\u6210`,
          "system_auto",
          userId
        ).run();
        results.adjusted++;
        console.log(`[\u4EFB\u52A1\u8C03\u6574] \u5DF2\u81EA\u52A8\u8C03\u6574\u4EFB\u52A1 ${task.task_id} \u7684\u5230\u671F\u65E5\uFF1A${task.due_date} \u2192 ${newDueDate}`);
      } catch (err) {
        console.error(`[\u4EFB\u52A1\u8C03\u6574] \u8C03\u6574\u4EFB\u52A1 ${task.task_id} \u5931\u8D25:`, err);
        results.errors.push({
          task_id: task.task_id,
          error: String(err)
        });
      }
    }
    return results;
  } catch (err) {
    console.error("[\u4EFB\u52A1\u8C03\u6574] autoAdjustDependentTasks \u5931\u8D25:", err);
    throw err;
  }
}
__name(autoAdjustDependentTasks, "autoAdjustDependentTasks");
async function recordStatusUpdate(env, taskId, newStatus, userId, notes = {}) {
  try {
    const task = await env.DATABASE.prepare(`
      SELECT status FROM ActiveTasks WHERE task_id = ?
    `).bind(taskId).first();
    const oldStatus = task?.status || "pending";
    await env.DATABASE.prepare(`
      INSERT INTO TaskStatusUpdates (
        task_id, old_status, new_status, status, updated_by,
        progress_note, blocker_reason, overdue_reason,
        expected_completion_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      oldStatus,
      newStatus,
      newStatus,
      // 保持兼容性
      userId,
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null
    ).run();
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET status_note = ?,
          blocker_reason = ?,
          overdue_reason = ?,
          expected_completion_date = ?,
          last_status_update = datetime('now')
      WHERE task_id = ?
    `).bind(
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null,
      taskId
    ).run();
    return { success: true };
  } catch (err) {
    console.error("[\u4EFB\u52A1\u8C03\u6574] recordStatusUpdate \u5931\u8D25:", err);
    throw err;
  }
}
__name(recordStatusUpdate, "recordStatusUpdate");
async function recordDueDateAdjustment(env, taskId, oldDueDate, newDueDate, reason, adjustmentType, userId, isOverdue = false, isInitial = false) {
  try {
    const daysChanged = daysBetween(oldDueDate, newDueDate);
    await env.DATABASE.prepare(`
      INSERT INTO TaskDueDateAdjustments (
        task_id, old_due_date, new_due_date, days_changed,
        adjustment_reason, adjustment_type,
        requested_by, is_overdue_adjustment, is_initial_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      oldDueDate,
      newDueDate,
      daysChanged,
      reason,
      adjustmentType,
      userId,
      isOverdue ? 1 : 0,
      isInitial ? 1 : 0
    ).run();
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET due_date = ?,
          due_date_adjusted = 1,
          adjustment_count = adjustment_count + 1,
          last_adjustment_date = datetime('now'),
          adjustment_reason = ?
      WHERE task_id = ?
    `).bind(newDueDate, reason, taskId).run();
    return { success: true };
  } catch (err) {
    console.error("[\u4EFB\u52A1\u8C03\u6574] recordDueDateAdjustment \u5931\u8D25:", err);
    throw err;
  }
}
__name(recordDueDateAdjustment, "recordDueDateAdjustment");
async function getAdjustmentHistory(env, taskId) {
  try {
    console.log("[\u8C03\u6574\u5386\u53F2] \u5F00\u59CB\u67E5\u8BE2, taskId:", taskId);
    let dueDateAdjustments;
    try {
      dueDateAdjustments = await env.DATABASE.prepare(`
        SELECT 
          adjustment_id as id,
          old_due_date,
          new_due_date,
          days_changed,
          adjustment_reason as reason,
          adjustment_type,
          is_overdue_adjustment,
          is_initial_creation,
          is_system_auto,
          requested_at,
          u.name as requested_by_name
        FROM TaskDueDateAdjustments tda
        LEFT JOIN Users u ON u.user_id = tda.requested_by
        WHERE tda.task_id = ?
          AND tda.old_due_date IS NOT NULL
          AND tda.new_due_date IS NOT NULL
          AND tda.adjustment_type IS NOT NULL
        ORDER BY tda.requested_at DESC
      `).bind(taskId).all();
      console.log("[\u8C03\u6574\u5386\u53F2] \u5230\u671F\u65E5\u8C03\u6574\u67E5\u8BE2\u6210\u529F, \u8BB0\u5F55\u6570:", dueDateAdjustments?.results?.length || 0);
    } catch (err) {
      console.error("[\u8C03\u6574\u5386\u53F2] \u5230\u671F\u65E5\u8C03\u6574\u67E5\u8BE2\u5931\u8D25:", err.message);
      throw new Error("\u67E5\u8BE2\u5230\u671F\u65E5\u8C03\u6574\u5931\u8D25: " + err.message);
    }
    let statusUpdates;
    try {
      statusUpdates = await env.DATABASE.prepare(`
        SELECT 
          tsu.update_id as id,
          tsu.old_status,
          tsu.new_status,
          tsu.progress_note,
          tsu.blocker_reason,
          tsu.overdue_reason,
          tsu.updated_at as requested_at,
          u.name as requested_by_name
        FROM TaskStatusUpdates tsu
        LEFT JOIN Users u ON u.user_id = tsu.updated_by
        WHERE tsu.task_id = ?
          AND tsu.old_status IS NOT NULL
          AND tsu.new_status IS NOT NULL
        ORDER BY tsu.updated_at DESC
      `).bind(taskId).all();
      console.log("[\u8C03\u6574\u5386\u53F2] \u72B6\u6001\u66F4\u65B0\u67E5\u8BE2\u6210\u529F, \u8BB0\u5F55\u6570:", statusUpdates?.results?.length || 0);
    } catch (err) {
      console.error("[\u8C03\u6574\u5386\u53F2] \u72B6\u6001\u66F4\u65B0\u67E5\u8BE2\u5931\u8D25:", err.message);
      throw new Error("\u67E5\u8BE2\u72B6\u6001\u66F4\u65B0\u5931\u8D25: " + err.message);
    }
    let allRecords;
    try {
      allRecords = [
        ...(dueDateAdjustments.results || []).map((adj) => ({
          record_type: "due_date",
          id: adj.id,
          old_due_date: adj.old_due_date,
          new_due_date: adj.new_due_date,
          days_changed: adj.days_changed,
          reason: adj.reason || "",
          adjustment_type: adj.adjustment_type,
          is_overdue_adjustment: adj.is_overdue_adjustment === 1,
          is_initial_creation: adj.is_initial_creation === 1,
          is_system_auto: adj.is_system_auto === 1,
          requested_at: adj.requested_at,
          requested_by_name: adj.requested_by_name || ""
        })),
        ...(statusUpdates.results || []).map((upd) => ({
          record_type: "status_update",
          id: upd.id,
          old_status: upd.old_status,
          new_status: upd.new_status,
          progress_note: upd.progress_note || "",
          blocker_reason: upd.blocker_reason || "",
          overdue_reason: upd.overdue_reason || "",
          requested_at: upd.requested_at,
          requested_by_name: upd.requested_by_name || ""
        }))
      ];
      console.log("[\u8C03\u6574\u5386\u53F2] \u5408\u5E76\u8BB0\u5F55\u6210\u529F, \u603B\u6570:", allRecords.length);
    } catch (err) {
      console.error("[\u8C03\u6574\u5386\u53F2] \u5408\u5E76\u8BB0\u5F55\u5931\u8D25:", err.message);
      throw new Error("\u5408\u5E76\u8BB0\u5F55\u5931\u8D25: " + err.message);
    }
    try {
      allRecords.sort((a, b) => {
        if (!a.requested_at) return 1;
        if (!b.requested_at) return -1;
        return (b.requested_at || "").localeCompare(a.requested_at || "");
      });
      console.log("[\u8C03\u6574\u5386\u53F2] \u6392\u5E8F\u6210\u529F, \u8FD4\u56DE", allRecords.length, "\u6761\u8BB0\u5F55");
    } catch (err) {
      console.error("[\u8C03\u6574\u5386\u53F2] \u6392\u5E8F\u5931\u8D25:", err.message);
      throw new Error("\u6392\u5E8F\u5931\u8D25: " + err.message);
    }
    return allRecords;
  } catch (err) {
    console.error("[\u4EFB\u52A1\u8C03\u6574] getAdjustmentHistory \u5931\u8D25:", err);
    console.error("[\u4EFB\u52A1\u8C03\u6574] \u9519\u8BEF\u5806\u6808:", err.stack);
    throw err;
  }
}
__name(getAdjustmentHistory, "getAdjustmentHistory");

// src/api/tasks.js
init_kv_cache_helper();
init_kv_cache_helper();
async function handleTasks(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "GET" && url.pathname.match(/\/tasks\/\d+$/)) {
    const taskId = url.pathname.split("/").pop();
    try {
      const cacheKey = generateCacheKey2("task_detail", { taskId });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data,
          meta: { requestId, cache_source: "kv" }
        }, corsHeaders);
      }
      const task = await env.DATABASE.prepare(
        `SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id, t.notes, t.client_service_id,
			        t.completed_date, t.created_at, t.service_month, t.component_id,
			        t.prerequisite_task_id, t.original_due_date, t.due_date_adjusted, t.adjustment_reason,
			        t.adjustment_count, t.last_adjustment_date, t.can_start_date, t.estimated_work_days,
			        t.status_note, t.blocker_reason, t.overdue_reason, t.expected_completion_date,
			        t.is_overdue, t.completed_at, t.last_status_update,
			        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
			        s.service_name,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
			        u.name AS assignee_name,
			        pt.task_name AS prerequisite_task_name
			 FROM ActiveTasks t
			 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
			 LEFT JOIN Clients c ON c.client_id = cs.client_id
			 LEFT JOIN Services s ON s.service_id = cs.service_id
			 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
			 LEFT JOIN ActiveTasks pt ON pt.task_id = t.prerequisite_task_id AND pt.is_deleted = 0
			 WHERE t.task_id = ? AND t.is_deleted = 0`
      ).bind(taskId).first();
      if (!task) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4EFB\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const data = {
        task_id: String(task.task_id),
        task_name: task.task_name,
        client_name: task.client_name || "",
        client_tax_id: task.client_tax_id || "",
        client_id: task.client_id || "",
        service_name: task.service_name || "",
        service_month: task.service_month || "",
        assignee_name: task.assignee_name || "",
        assignee_user_id: task.assignee_user_id || null,
        client_service_id: task.client_service_id || null,
        component_id: task.component_id || null,
        completed_stages: Number(task.completed_stages || 0),
        total_stages: Number(task.total_stages || 0),
        due_date: task.due_date || null,
        original_due_date: task.original_due_date || null,
        due_date_adjusted: Boolean(task.due_date_adjusted),
        adjustment_reason: task.adjustment_reason || "",
        adjustment_count: Number(task.adjustment_count || 0),
        last_adjustment_date: task.last_adjustment_date || null,
        can_start_date: task.can_start_date || null,
        estimated_work_days: Number(task.estimated_work_days || 3),
        prerequisite_task_id: task.prerequisite_task_id || null,
        prerequisite_task_name: task.prerequisite_task_name || null,
        status: task.status,
        status_note: task.status_note || "",
        blocker_reason: task.blocker_reason || "",
        overdue_reason: task.overdue_reason || "",
        expected_completion_date: task.expected_completion_date || null,
        is_overdue: Boolean(task.is_overdue),
        last_status_update: task.last_status_update || null,
        notes: task.notes || "",
        completed_date: task.completed_date || null,
        completed_at: task.completed_at || null,
        created_at: task.created_at || null
      };
      await saveKVCache(env, cacheKey, "task_detail", data, { ttl: 1800 });
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/sops$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    try {
      const sops = await env.DATABASE.prepare(
        `SELECT s.sop_id, s.title, s.category, s.version
				 FROM ActiveTaskSOPs ats
				 JOIN SOPDocuments s ON s.sop_id = ats.sop_id
				 WHERE ats.task_id = ? AND s.is_deleted = 0
				 ORDER BY ats.sort_order ASC`
      ).bind(taskId).all();
      const data = (sops?.results || []).map((s) => ({
        id: s.sop_id,
        title: s.title,
        category: s.category || "",
        version: s.version || 1
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "PUT" && url.pathname.match(/\/tasks\/\d+\/sops$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const sopIds = Array.isArray(body?.sop_ids) ? body.sop_ids : [];
    try {
      await env.DATABASE.prepare(`DELETE FROM ActiveTaskSOPs WHERE task_id = ?`).bind(taskId).run();
      for (let i = 0; i < sopIds.length; i++) {
        await env.DATABASE.prepare(
          `INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`
        ).bind(taskId, sopIds[i], i).run();
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "GET" && url.pathname.match(/\/tasks$/)) {
    try {
      const params = url.searchParams;
      const page = Math.max(1, parseInt(params.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const q = (params.get("q") || "").trim();
      const status = (params.get("status") || "").trim();
      const due = (params.get("due") || "").trim();
      const componentId = (params.get("component_id") || "").trim();
      const serviceYear = (params.get("service_year") || "").trim();
      const serviceMonth = (params.get("service_month") || "").trim();
      const hideCompleted = params.get("hide_completed") === "1";
      const cacheKey = generateCacheKey2("tasks_list", {
        page,
        perPage,
        q,
        status,
        due,
        componentId,
        serviceYear,
        serviceMonth,
        hideCompleted: hideCompleted ? "1" : "0",
        userId: me.is_admin ? "all" : String(me.user_id)
      });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data.list,
          meta: { ...kvCached.data.meta, requestId, cache_source: "kv" }
        }, corsHeaders);
      }
      const where = ["t.is_deleted = 0"];
      const binds = [];
      if (!me.is_admin && !componentId) {
        where.push("t.assignee_user_id = ?");
        binds.push(String(me.user_id));
      }
      if (componentId) {
        where.push("t.component_id = ?");
        binds.push(componentId);
      }
      if (q) {
        where.push("(t.task_name LIKE ? OR c.company_name LIKE ? OR c.tax_registration_number LIKE ?)");
        binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (status && ["in_progress", "completed", "cancelled"].includes(status)) {
        where.push("t.status = ?");
        binds.push(status);
      }
      if (due === "overdue") {
        where.push("date(t.due_date) < date('now') AND t.status != 'completed'");
      }
      if (due === "soon") {
        where.push("date(t.due_date) BETWEEN date('now') AND date('now','+3 days')");
      }
      if (serviceYear && serviceMonth) {
        where.push("t.service_month = ?");
        binds.push(`${serviceYear}-${serviceMonth.padStart(2, "0")}`);
      } else if (serviceYear) {
        where.push("t.service_month LIKE ?");
        binds.push(`${serviceYear}-%`);
      }
      if (hideCompleted) {
        where.push("t.status != 'completed'");
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
        `SELECT t.task_id, t.task_name, t.due_date, t.original_due_date, t.status, t.assignee_user_id, t.notes, t.service_month, t.component_id,
				        t.prerequisite_task_id, t.is_overdue, t.due_date_adjusted, t.adjustment_count, t.overdue_reason,
				        t.client_service_id, cs.service_id,
				        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
				        s.service_name,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
				        (CASE WHEN t.related_sop_id IS NOT NULL OR t.client_specific_sop_id IS NOT NULL THEN 1 ELSE 0 END) AS has_sop,
				        u.name AS assignee_name,
				        pt.task_name AS prerequisite_task_name
				 FROM ActiveTasks t
				 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
				 LEFT JOIN Clients c ON c.client_id = cs.client_id
				 LEFT JOIN Services s ON s.service_id = cs.service_id
				 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
				 LEFT JOIN ActiveTasks pt ON pt.task_id = t.prerequisite_task_id AND pt.is_deleted = 0
				 ${whereSql}
				 ORDER BY c.company_name ASC, s.service_name ASC, t.service_month DESC, date(t.due_date) ASC NULLS LAST, t.task_id DESC
				 LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        taskId: String(r.task_id),
        taskName: r.task_name,
        clientName: r.client_name || "",
        clientTaxId: r.client_tax_id || "",
        clientId: r.client_id || "",
        clientServiceId: r.client_service_id || null,
        serviceId: r.service_id || null,
        serviceName: r.service_name || "",
        serviceMonth: r.service_month || "",
        componentId: r.component_id || null,
        assigneeName: r.assignee_name || "",
        assigneeUserId: r.assignee_user_id || null,
        progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
        dueDate: r.due_date || null,
        originalDueDate: r.original_due_date || null,
        dueDateAdjusted: Boolean(r.due_date_adjusted),
        adjustmentCount: Number(r.adjustment_count || 0),
        prerequisiteTaskId: r.prerequisite_task_id || null,
        prerequisiteTaskName: r.prerequisite_task_name || null,
        isOverdue: Boolean(r.is_overdue),
        overdueReason: r.overdue_reason || "",
        status: r.status,
        notes: r.notes || "",
        hasSop: Number(r.has_sop || 0) === 1
      }));
      const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
      const cacheData = { list: data, meta: { page, perPage, total, hasNext: offset + perPage < total } };
      await saveKVCache(env, cacheKey, "tasks_list", cacheData, { ttl: 1800 });
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
    }
  }
  if (method === "POST" && url.pathname.match(/\/tasks$/)) {
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
    const prerequisiteTaskId = body?.prerequisite_task_id ? Number(body.prerequisite_task_id) : null;
    const defaultDueDate = body?.default_due_date ? String(body.default_due_date) : null;
    const adjustmentReason = body?.adjustment_reason ? String(body.adjustment_reason).trim() : null;
    let serviceMonth = body?.service_month ? String(body.service_month).trim() : null;
    if (!serviceMonth) {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      serviceMonth = `${year}-${month}`;
    }
    const errors = [];
    if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) errors.push({ field: "client_service_id", message: "\u5FC5\u586B" });
    if (taskName.length < 1 || taskName.length > 200) errors.push({ field: "task_name", message: "\u9577\u5EA6\u9700 1\u2013200" });
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field: "due_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) errors.push({ field: "service_month", message: "\u683C\u5F0F\u9700 YYYY-MM" });
    if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) errors.push({ field: "assignee_user_id", message: "\u683C\u5F0F\u932F\u8AA4" });
    if (defaultDueDate && dueDate && defaultDueDate !== dueDate && !adjustmentReason) {
      errors.push({ field: "adjustment_reason", message: "\u8ABF\u6574\u9810\u8A2D\u671F\u9650\u6642\u5FC5\u9808\u586B\u5BEB\u539F\u56E0" });
    }
    if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    try {
      const cs = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_service_id = ? LIMIT 1").bind(clientServiceId).first();
      if (!cs) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5BA2\u6236\u670D\u52D9\u4E0D\u5B58\u5728", errors: [{ field: "client_service_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
      if (assigneeUserId) {
        const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
        if (!u) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8CA0\u8CAC\u4EBA\u4E0D\u5B58\u5728", errors: [{ field: "assignee_user_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const originalDueDate = defaultDueDate || dueDate;
      const expectedCompletionDate = dueDate;
      await env.DATABASE.prepare(`
			INSERT INTO ActiveTasks (
				client_service_id, template_id, task_name, start_date, due_date, service_month, 
				status, assignee_user_id, prerequisite_task_id, original_due_date, 
				expected_completion_date, created_at
			) VALUES (?, NULL, ?, NULL, ?, ?, 'in_progress', ?, ?, ?, ?, ?)
		`).bind(clientServiceId, taskName, dueDate, serviceMonth, assigneeUserId, prerequisiteTaskId, originalDueDate, expectedCompletionDate, now).run();
      const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      const taskId = String(idRow?.id);
      if (defaultDueDate && dueDate && defaultDueDate !== dueDate && adjustmentReason) {
        await recordDueDateAdjustment(
          env,
          taskId,
          defaultDueDate,
          dueDate,
          adjustmentReason,
          "initial_create",
          me.user_id,
          false,
          true
          // 标记为初始创建时的调整
        );
      }
      if (stageNames.length > 0) {
        let order = 1;
        for (const s of stageNames) {
          await env.DATABASE.prepare("INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status) VALUES (?, ?, ?, 'pending')").bind(taskId, s, order++).run();
        }
      }
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data: { taskId, taskName, clientServiceId, dueDate, serviceMonth, assigneeUserId }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "PUT" && url.pathname.match(/\/tasks\/\d+$/)) {
    const taskId = url.pathname.split("/").pop();
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const updates = [];
    const binds = [];
    if (body.hasOwnProperty("task_name")) {
      const taskName = String(body.task_name || "").trim();
      if (taskName.length < 1 || taskName.length > 200) errors.push({ field: "task_name", message: "\u9577\u5EA6\u9700 1\u2013200" });
      else {
        updates.push("task_name = ?");
        binds.push(taskName);
      }
    }
    if (body.hasOwnProperty("due_date")) {
      const dueDate = body.due_date ? String(body.due_date) : null;
      if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field: "due_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
      else {
        updates.push("due_date = ?");
        binds.push(dueDate);
      }
    }
    if (body.hasOwnProperty("status")) {
      const status = String(body.status || "").trim();
      if (!["in_progress", "completed", "cancelled"].includes(status)) errors.push({ field: "status", message: "\u72C0\u614B\u7121\u6548" });
      else {
        updates.push("status = ?");
        binds.push(status);
        if (status === "completed") {
          updates.push("completed_date = ?");
          binds.push((/* @__PURE__ */ new Date()).toISOString());
        }
      }
    }
    if (body.hasOwnProperty("assignee_user_id")) {
      const assigneeUserId = body.assignee_user_id ? Number(body.assignee_user_id) : null;
      if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
        errors.push({ field: "assignee_user_id", message: "\u683C\u5F0F\u932F\u8AA4" });
      } else {
        if (assigneeUserId) {
          const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
          if (!u) {
            errors.push({ field: "assignee_user_id", message: "\u8CA0\u8CAC\u4EBA\u4E0D\u5B58\u5728" });
          }
        }
        if (errors.length === 0) {
          updates.push("assignee_user_id = ?");
          binds.push(assigneeUserId);
        }
      }
    }
    if (body.hasOwnProperty("notes")) {
      const notes = String(body.notes || "").trim();
      updates.push("notes = ?");
      binds.push(notes || null);
    }
    if (body.hasOwnProperty("service_month")) {
      const serviceMonth = body.service_month ? String(body.service_month).trim() : null;
      if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) {
        errors.push({ field: "service_month", message: "\u683C\u5F0F\u9700 YYYY-MM" });
      } else {
        updates.push("service_month = ?");
        binds.push(serviceMonth);
      }
    }
    if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    if (updates.length === 0) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u6C92\u6709\u8981\u66F4\u65B0\u7684\u6B04\u4F4D", meta: { requestId } }, corsHeaders);
    try {
      const task = await env.DATABASE.prepare("SELECT task_id, assignee_user_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0 LIMIT 1").bind(taskId).first();
      if (!task) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4EFB\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      if (!me.is_admin && Number(task.assignee_user_id) !== Number(me.user_id)) {
        return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u7121\u6B0A\u9650\u66F4\u65B0\u6B64\u4EFB\u52D9", meta: { requestId } }, corsHeaders);
      }
      const sql = `UPDATE ActiveTasks SET ${updates.join(", ")} WHERE task_id = ?`;
      await env.DATABASE.prepare(sql).bind(...binds, taskId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0", data: { taskId }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/stages$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    try {
      const stages = await env.DATABASE.prepare(
        `SELECT active_stage_id, stage_name, stage_order, status, started_at, completed_at
				 FROM ActiveTaskStages
				 WHERE task_id = ?
				 ORDER BY stage_order ASC`
      ).bind(taskId).all();
      const data = (stages?.results || []).map((s) => ({
        stage_id: s.active_stage_id,
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/stages\/\d+\/start$/)) {
    const parts = url.pathname.split("/");
    const taskId = parts[parts.length - 4];
    const stageId = parts[parts.length - 2];
    try {
      await env.DATABASE.prepare(
        `UPDATE ActiveTaskStages SET status = 'in_progress', started_at = ? WHERE active_stage_id = ?`
      ).bind((/* @__PURE__ */ new Date()).toISOString(), stageId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u958B\u59CB", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/stages\/\d+\/complete$/)) {
    const parts = url.pathname.split("/");
    const taskId = parts[parts.length - 4];
    const stageId = parts[parts.length - 2];
    try {
      await env.DATABASE.prepare(
        `UPDATE ActiveTaskStages SET status = 'completed', completed_at = ? WHERE active_stage_id = ?`
      ).bind((/* @__PURE__ */ new Date()).toISOString(), stageId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5B8C\u6210", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/update-status$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const status = body?.status;
    const progress_note = (body?.progress_note || "").trim() || null;
    const blocker_reason = (body?.blocker_reason || "").trim() || null;
    const overdue_reason = (body?.overdue_reason || "").trim() || null;
    const expected_completion_date = body?.expected_completion_date || null;
    console.log("[\u4EFB\u52A1\u72B6\u6001\u66F4\u65B0] \u6536\u5230\u6570\u636E:", { status, progress_note, overdue_reason, blocker_reason, expected_completion_date });
    const errors = [];
    if (!["in_progress", "completed", "cancelled"].includes(status)) {
      errors.push({ field: "status", message: "\u72B6\u6001\u65E0\u6548" });
    }
    try {
      const task = await env.DATABASE.prepare(`
				SELECT task_id, due_date, status as current_status
				FROM ActiveTasks
				WHERE task_id = ? AND is_deleted = 0
			`).bind(taskId).first();
      if (!task) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4EFB\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const isOverdue = task.due_date && task.due_date < today && task.current_status !== "completed";
      console.log("[\u4EFB\u52A1\u72B6\u6001\u66F4\u65B0] \u903E\u671F\u68C0\u67E5:", { due_date: task.due_date, today, isOverdue, overdue_reason });
      if (isOverdue && !overdue_reason) {
        errors.push({ field: "overdue_reason", message: "\u4EFB\u52A1\u903E\u671F\uFF0C\u5FC5\u987B\u586B\u5199\u903E\u671F\u539F\u56E0" });
      }
      if (errors.length) {
        console.log("[\u4EFB\u52A1\u72B6\u6001\u66F4\u65B0] \u9A8C\u8BC1\u5931\u8D25:", errors);
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
      }
      await recordStatusUpdate(env, taskId, status, me.user_id, {
        progress_note,
        blocker_reason,
        overdue_reason,
        expected_completion_date
      });
      let completedAt = null;
      if (status === "completed") {
        completedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      await env.DATABASE.prepare(`
				UPDATE ActiveTasks
				SET status = ?,
					completed_at = ?,
					is_overdue = ?
				WHERE task_id = ?
			`).bind(status, completedAt, isOverdue ? 1 : 0, taskId).run();
      if (status === "completed") {
        try {
          const adjustResult = await autoAdjustDependentTasks(env, taskId, me.user_id);
          console.log(`[\u4EFB\u52A1\u5B8C\u6210] \u81EA\u52A8\u8C03\u6574\u4E86 ${adjustResult.adjusted} \u4E2A\u540E\u7EED\u4EFB\u52A1`);
        } catch (err) {
          console.error("[\u4EFB\u52A1\u5B8C\u6210] \u81EA\u52A8\u8C03\u6574\u540E\u7EED\u4EFB\u52A1\u5931\u8D25:", err);
        }
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0\u72C0\u614B", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const resBody = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") resBody.error = String(err);
      return jsonResponse(500, resBody, corsHeaders);
    }
  }
  if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/adjust-due-date$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const new_due_date = body?.new_due_date;
    const reason = (body?.reason || "").trim();
    console.log("[\u8C03\u6574\u5230\u671F\u65E5] \u6536\u5230\u6570\u636E:", { taskId, new_due_date, reason });
    const errors = [];
    if (!new_due_date || !/^\d{4}-\d{2}-\d{2}$/.test(new_due_date)) {
      errors.push({ field: "new_due_date", message: "\u65E5\u671F\u683C\u5F0F\u65E0\u6548 (YYYY-MM-DD)" });
    }
    if (!reason) {
      errors.push({ field: "reason", message: "\u5FC5\u987B\u586B\u5199\u8C03\u6574\u539F\u56E0" });
    }
    if (errors.length) {
      console.log("[\u8C03\u6574\u5230\u671F\u65E5] \u9A8C\u8BC1\u5931\u8D25:", errors);
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const task = await env.DATABASE.prepare(`
				SELECT task_id, due_date, status
				FROM ActiveTasks
				WHERE task_id = ? AND is_deleted = 0
			`).bind(taskId).first();
      if (!task) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4EFB\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const isOverdue = task.due_date && task.due_date < today && task.status !== "completed";
      await recordDueDateAdjustment(
        env,
        taskId,
        task.due_date,
        new_due_date,
        reason,
        isOverdue ? "overdue_adjust" : "manual_adjust",
        me.user_id,
        isOverdue,
        false
      );
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u8ABF\u6574\u5230\u671F\u65E5", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const resBody = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") resBody.error = String(err);
      return jsonResponse(500, resBody, corsHeaders);
    }
  }
  if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/adjustment-history$/)) {
    const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
    console.log("[\u8DEF\u7531] \u8FDB\u5165\u8C03\u6574\u5386\u53F2\u8DEF\u7531, taskId:", taskId, "path:", url.pathname);
    try {
      console.log("[\u8DEF\u7531] \u5F00\u59CB\u8C03\u7528 getAdjustmentHistory");
      const history = await getAdjustmentHistory(env, taskId);
      console.log("[\u8DEF\u7531] getAdjustmentHistory \u8FD4\u56DE\u6210\u529F, \u8BB0\u5F55\u6570:", history?.length);
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: history, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error("[\u8DEF\u7531] getAdjustmentHistory \u5931\u8D25");
      console.error("[\u8DEF\u7531] \u9519\u8BEF\u4FE1\u606F:", err.message);
      console.error("[\u8DEF\u7531] \u9519\u8BEF\u5806\u6808:", err.stack);
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err), stack: err.stack }));
      const resBody = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") {
        resBody.error = String(err);
        resBody.errorMessage = err.message;
        resBody.stack = err.stack;
      }
      return jsonResponse(500, resBody, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleTasks, "handleTasks");

// src/api/timesheets.js
init_cache_helper();
init_kv_cache_helper();
var WORK_TYPES = {
  1: { name: "\u6B63\u5E38\u5DE5\u6642", multiplier: 1, isOvertime: false },
  2: { name: "\u5E73\u65E5\u52A0\u73ED\uFF08\u524D2\u5C0F\u6642\uFF09", multiplier: 1.34, isOvertime: true },
  3: { name: "\u5E73\u65E5\u52A0\u73ED\uFF08\u5F8C2\u5C0F\u6642\uFF09", multiplier: 1.67, isOvertime: true },
  4: { name: "\u4F11\u606F\u65E5\u52A0\u73ED\uFF08\u524D2\u5C0F\u6642\uFF09", multiplier: 1.34, isOvertime: true },
  5: { name: "\u4F11\u606F\u65E5\u52A0\u73ED\uFF08\u7B2C3-8\u5C0F\u6642\uFF09", multiplier: 1.67, isOvertime: true },
  6: { name: "\u4F11\u606F\u65E5\u52A0\u73ED\uFF08\u7B2C9-12\u5C0F\u6642\uFF09", multiplier: 2.67, isOvertime: true },
  7: { name: "\u570B\u5B9A\u5047\u65E5\u52A0\u73ED\uFF088\u5C0F\u6642\u5167\uFF09", multiplier: 2, isOvertime: true, maxHours: 8, special: "fixed_8h" },
  8: { name: "\u570B\u5B9A\u5047\u65E5\u52A0\u73ED\uFF08\u7B2C9-10\u5C0F\u6642\uFF09", multiplier: 1.34, isOvertime: true },
  9: { name: "\u570B\u5B9A\u5047\u65E5\u52A0\u73ED\uFF08\u7B2C11-12\u5C0F\u6642\uFF09", multiplier: 1.67, isOvertime: true },
  10: { name: "\u4F8B\u5047\u65E5\u52A0\u73ED\uFF088\u5C0F\u6642\u5167\uFF09", multiplier: 2, isOvertime: true, maxHours: 8, special: "fixed_8h" },
  11: { name: "\u4F8B\u5047\u65E5\u52A0\u73ED\uFF08\u7B2C9-12\u5C0F\u6642\uFF09", multiplier: 2, isOvertime: true }
};
function calculateWeightedHours(workTypeId, hours) {
  const workType = WORK_TYPES[workTypeId];
  if (!workType) return hours;
  if (workType.special === "fixed_8h") {
    return 8;
  }
  return hours * workType.multiplier;
}
__name(calculateWeightedHours, "calculateWeightedHours");
async function invalidateWeekCache(env, userId, weekStart) {
  try {
    await env.DATABASE.prepare(
      `UPDATE WeeklyTimesheetCache 
			 SET invalidated = 1 
			 WHERE user_id = ? AND week_start_date = ?`
    ).bind(userId, weekStart).run();
    console.log("[WeekCache] \u2713 \u7F13\u5B58\u5DF2\u5931\u6548", { userId, week: weekStart });
  } catch (err) {
    console.error("[WeekCache] \u5931\u6548\u7F13\u5B58\u5931\u8D25:", err);
  }
}
__name(invalidateWeekCache, "invalidateWeekCache");
async function getWeekCache(env, userId, weekStart) {
  try {
    const cache = await env.DATABASE.prepare(
      `SELECT rows_data, last_updated_at, rows_count, total_hours, hit_count, data_version
			 FROM WeeklyTimesheetCache
			 WHERE user_id = ? AND week_start_date = ? AND invalidated = 0`
    ).bind(userId, weekStart).first();
    if (!cache) return null;
    await env.DATABASE.prepare(
      `UPDATE WeeklyTimesheetCache 
			 SET last_accessed_at = datetime('now'), 
			     hit_count = hit_count + 1 
			 WHERE user_id = ? AND week_start_date = ?`
    ).bind(userId, weekStart).run();
    return {
      data: JSON.parse(cache.rows_data || "[]"),
      meta: {
        cached: true,
        rows_count: cache.rows_count,
        total_hours: cache.total_hours,
        last_updated: cache.last_updated_at,
        hit_count: (cache.hit_count || 0) + 1,
        version: cache.data_version
      }
    };
  } catch (err) {
    console.error("[WeekCache] \u8BFB\u53D6\u7F13\u5B58\u5931\u8D25:", err);
    return null;
  }
}
__name(getWeekCache, "getWeekCache");
async function handleGetTimelogs(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  try {
    const params = url.searchParams;
    const startDate = (params.get("start_date") || "").trim();
    const endDate = (params.get("end_date") || "").trim();
    const useCache = params.get("use_cache") !== "false";
    if (useCache && !me.is_admin && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = (end - start) / (1e3 * 60 * 60 * 24);
      if (daysDiff === 6 && start.getDay() === 1) {
        const weekCache = await getWeekCache(env, me.user_id, startDate);
        if (weekCache) {
          console.log("[WeekCache] \u2713 \u7F13\u5B58\u547D\u4E2D", { userId: me.user_id, week: startDate });
          return jsonResponse(200, {
            ok: true,
            code: "SUCCESS",
            message: "\u67E5\u8A62\u6210\u529F\uFF08\u4F7F\u7528\u7F13\u5B58\uFF09",
            data: weekCache.data,
            meta: { requestId, ...weekCache.meta }
          }, corsHeaders);
        }
      }
    }
    const where = ["t.is_deleted = 0"];
    const binds = [];
    if (!me.is_admin) {
      where.push("t.user_id = ?");
      binds.push(String(me.user_id));
    }
    if (startDate) {
      where.push("t.work_date >= ?");
      binds.push(startDate);
    }
    if (endDate) {
      where.push("t.work_date <= ?");
      binds.push(endDate);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await env.DATABASE.prepare(
      `SELECT t.timesheet_id, t.user_id, t.work_date, t.client_id, t.service_id, t.service_item_id, t.service_name, t.work_type, t.hours, t.note,
			        u.name as user_name, u.username
			 FROM Timesheets t
			 LEFT JOIN Users u ON t.user_id = u.user_id
			 ${whereSql}
			 ORDER BY t.work_date ASC, t.timesheet_id ASC`
    ).bind(...binds).all();
    const data = (rows?.results || []).map((r) => ({
      log_id: r.timesheet_id,
      timesheet_id: r.timesheet_id,
      user_id: r.user_id,
      user_name: r.user_name || r.username || "\u672A\u77E5",
      work_date: r.work_date,
      client_id: r.client_id || "",
      service_id: parseInt(r.service_id) || parseInt(r.service_name) || 1,
      service_item_id: parseInt(r.service_item_id) || 1,
      work_type_id: parseInt(r.work_type) || 1,
      hours: Number(r.hours || 0),
      notes: r.note || ""
    }));
    return jsonResponse(200, {
      ok: true,
      code: "SUCCESS",
      message: "\u67E5\u8A62\u6210\u529F",
      data,
      meta: { requestId, cached: false }
    }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
    const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
    return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
  }
}
__name(handleGetTimelogs, "handleGetTimelogs");
async function handlePostTimelogs(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(400, {
      ok: false,
      code: "BAD_REQUEST",
      message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4",
      meta: { requestId }
    }, corsHeaders);
  }
  const work_date = String(body?.work_date || "").trim();
  const client_id = String(body?.client_id || "").trim();
  const service_id = parseInt(body?.service_id) || 0;
  const service_item_id = parseInt(body?.service_item_id) || 0;
  const work_type_id = parseInt(body?.work_type_id) || 0;
  const hours = Number(body?.hours);
  const notes = String(body?.notes || "").trim();
  const timesheet_id = body?.timesheet_id ? parseInt(body.timesheet_id) : null;
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
    errors.push({ field: "work_date", message: "\u65E5\u671F\u683C\u5F0F\u5FC5\u9808\u70BA YYYY-MM-DD" });
  }
  if (!client_id) {
    errors.push({ field: "client_id", message: "\u8ACB\u9078\u64C7\u5BA2\u6236" });
  }
  if (!service_id) {
    errors.push({ field: "service_id", message: "\u8ACB\u9078\u64C7\u670D\u52D9\u9805\u76EE" });
  }
  if (!service_item_id) {
    errors.push({ field: "service_item_id", message: "\u8ACB\u9078\u64C7\u670D\u52D9\u5B50\u9805\u76EE" });
  }
  if (!work_type_id || !WORK_TYPES[work_type_id]) {
    errors.push({ field: "work_type_id", message: "\u8ACB\u9078\u64C7\u6709\u6548\u7684\u5DE5\u6642\u985E\u578B" });
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    errors.push({ field: "hours", message: "\u5DE5\u6642\u5FC5\u9808\u5927\u65BC 0" });
  }
  if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) {
    errors.push({ field: "hours", message: "\u5DE5\u6642\u5FC5\u9808\u662F 0.5 \u7684\u500D\u6578" });
  }
  const workType = WORK_TYPES[work_type_id];
  if (workType && workType.maxHours && hours > workType.maxHours) {
    errors.push({
      field: "hours",
      message: `${workType.name}\u6700\u591A\u53EA\u80FD\u586B ${workType.maxHours} \u5C0F\u6642`
    });
  }
  if (hours > 12) {
    errors.push({ field: "hours", message: "\u5DE5\u6642\u4E0D\u53EF\u8D85\u904E 12 \u5C0F\u6642" });
  }
  if (errors.length) {
    return jsonResponse(422, {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "\u8F38\u5165\u6709\u8AA4",
      errors,
      meta: { requestId }
    }, corsHeaders);
  }
  try {
    const workType2 = WORK_TYPES[work_type_id];
    if (!workType2) {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "\u7121\u6548\u7684\u5DE5\u6642\u985E\u578B",
        errors: [{ field: "work_type_id", message: "\u5DE5\u6642\u985E\u578B\u4E0D\u5B58\u5728" }],
        meta: { requestId }
      }, corsHeaders);
    }
    const holidayRow = await env.DATABASE.prepare(
      `SELECT is_national_holiday FROM Holidays WHERE holiday_date = ?`
    ).bind(work_date).first();
    const date = /* @__PURE__ */ new Date(work_date + "T00:00:00");
    const dow = date.getDay();
    let dateType = "workday";
    if (holidayRow?.is_national_holiday === 1) {
      dateType = "national_holiday";
    } else if (dow === 0) {
      dateType = "weekly_restday";
    } else if (dow === 6) {
      dateType = "restday";
    }
    const allowedTypes = {
      "workday": [1, 2, 3],
      // 一般、平日OT前2h、平日OT後2h
      "restday": [4, 5, 6],
      // 休息日前2h、休息日3-8h、休息日9-12h
      "weekly_restday": [10, 11],
      // 例假日加班
      "national_holiday": [7, 8, 9]
      // 國定假日加班
    };
    const dateTypeNames = {
      "workday": "\u5DE5\u4F5C\u65E5",
      "restday": "\u4F11\u606F\u65E5",
      "weekly_restday": "\u4F8B\u5047\u65E5",
      "national_holiday": "\u570B\u5B9A\u5047\u65E5"
    };
    if (!allowedTypes[dateType].includes(work_type_id)) {
      const dateTypeName = dateTypeNames[dateType] || dateType;
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: `${work_date}\uFF08${dateTypeName}\uFF09\u4E0D\u53EF\u4F7F\u7528\u300C${workType2.name}\u300D`,
        errors: [{
          field: "work_type_id",
          message: `\u8A72\u65E5\u671F\u985E\u578B\u70BA${dateTypeName}\uFF0C\u8ACB\u9078\u64C7\u9069\u5408\u7684\u5DE5\u6642\u985E\u578B`
        }],
        meta: { requestId, work_date, dateType, workType: workType2.name }
      }, corsHeaders);
    }
    const weighted_hours = calculateWeightedHours(work_type_id, hours);
    let log_id;
    let isUpdate = false;
    if (timesheet_id) {
      const existingRow = await env.DATABASE.prepare(
        `SELECT timesheet_id FROM Timesheets 
				 WHERE timesheet_id = ? AND user_id = ? AND is_deleted = 0`
      ).bind(timesheet_id, String(me.user_id)).first();
      if (existingRow) {
        log_id = timesheet_id;
        isUpdate = true;
        const oldData = await env.DATABASE.prepare(
          `SELECT hours, work_type FROM Timesheets WHERE timesheet_id = ?`
        ).bind(log_id).first();
        const oldHours = Number(oldData?.hours || 0);
        const hoursDiff = hours - oldHours;
        if (hoursDiff > 0) {
          const sumRow = await env.DATABASE.prepare(
            `SELECT COALESCE(SUM(hours), 0) AS s 
					 FROM Timesheets 
					 WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
          ).bind(String(me.user_id), work_date).first();
          const currentTotal = Number(sumRow?.s || 0);
          if (currentTotal + hoursDiff > 12 + 1e-9) {
            return jsonResponse(422, {
              ok: false,
              code: "VALIDATION_ERROR",
              message: "\u4FEE\u6539\u5F8C\u6BCF\u65E5\u5DE5\u6642\u5408\u8A08\u4E0D\u53EF\u8D85\u904E 12 \u5C0F\u6642",
              errors: [{ field: "hours", message: "\u8D85\u904E\u6BCF\u65E5\u4E0A\u9650" }],
              meta: { requestId }
            }, corsHeaders);
          }
        }
        if (workType2.maxHours) {
          const workTypeSum = await env.DATABASE.prepare(
            `SELECT COALESCE(SUM(hours), 0) AS s 
					 FROM Timesheets 
					 WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0`
          ).bind(String(me.user_id), work_date, String(work_type_id)).first();
          const currentWorkTypeTotal = Number(workTypeSum?.s || 0);
          const newWorkTypeTotal = currentWorkTypeTotal - oldHours + hours;
          if (newWorkTypeTotal > workType2.maxHours + 1e-9) {
            return jsonResponse(422, {
              ok: false,
              code: "VALIDATION_ERROR",
              message: `\u4FEE\u6539\u5F8C\u300C${workType2.name}\u300D\u7576\u65E5\u7D2F\u8A08\u4E0D\u53EF\u8D85\u904E ${workType2.maxHours} \u5C0F\u6642`,
              errors: [{
                field: "hours",
                message: `\u7576\u65E5\u5DF2\u6709 ${currentWorkTypeTotal} \u5C0F\u6642\uFF0C\u4FEE\u6539\u5F8C\u5C07\u8B8A\u6210 ${newWorkTypeTotal.toFixed(1)} \u5C0F\u6642\uFF08\u8D85\u904E\u4E0A\u9650\uFF09`
              }],
              meta: { requestId }
            }, corsHeaders);
          }
        }
        await env.DATABASE.prepare(
          `UPDATE Timesheets 
				 SET client_id = ?, 
				     service_id = ?, 
				     service_item_id = ?, 
				     service_name = ?, 
				     work_type = ?, 
				     hours = ?, 
				     note = ?, 
				     updated_at = ?
				 WHERE timesheet_id = ?`
        ).bind(
          client_id,
          service_id,
          service_item_id,
          String(service_id),
          // 保留舊欄位以向後相容
          String(work_type_id),
          hours,
          notes,
          (/* @__PURE__ */ new Date()).toISOString(),
          log_id
        ).run();
      } else {
        log_id = null;
      }
    }
    if (!log_id) {
      const duplicateRow = await env.DATABASE.prepare(
        `SELECT timesheet_id 
				 FROM Timesheets 
				 WHERE user_id = ? 
				   AND work_date = ? 
				   AND client_id = ? 
				   AND service_id = ? 
				   AND service_item_id = ? 
				   AND work_type = ? 
				   AND is_deleted = 0`
      ).bind(
        String(me.user_id),
        work_date,
        client_id,
        service_id,
        service_item_id,
        String(work_type_id)
      ).first();
      if (duplicateRow) {
        log_id = duplicateRow.timesheet_id;
        isUpdate = true;
        const existingRow = await env.DATABASE.prepare(
          `SELECT hours FROM Timesheets WHERE timesheet_id = ?`
        ).bind(log_id).first();
        const existingHours = Number(existingRow?.hours || 0);
        const newTotalHours = existingHours + hours;
        if (workType2.maxHours && newTotalHours > workType2.maxHours) {
          return jsonResponse(422, {
            ok: false,
            code: "VALIDATION_ERROR",
            message: `\u7D2F\u52A0\u5F8C\u300C${workType2.name}\u300D\u5DE5\u6642\u70BA ${newTotalHours} \u5C0F\u6642\uFF0C\u8D85\u904E\u4E0A\u9650 ${workType2.maxHours} \u5C0F\u6642`,
            errors: [{
              field: "hours",
              message: `\u8A72\u65E5\u5DF2\u6709 ${existingHours} \u5C0F\u6642\uFF0C\u6700\u591A\u9084\u53EF\u586B ${workType2.maxHours - existingHours} \u5C0F\u6642`
            }]
          }, corsHeaders);
        }
        const sumRow = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND is_deleted = 0 AND timesheet_id != ?`
        ).bind(String(me.user_id), work_date, log_id).first();
        const otherHoursTotal = Number(sumRow?.s || 0);
        const dailyTotal = otherHoursTotal + newTotalHours;
        if (dailyTotal > 12 + 1e-9) {
          return jsonResponse(422, {
            ok: false,
            code: "VALIDATION_ERROR",
            message: `\u7D2F\u52A0\u5F8C\u7576\u65E5\u7E3D\u5DE5\u6642\u70BA ${dailyTotal.toFixed(1)} \u5C0F\u6642\uFF0C\u8D85\u904E\u4E0A\u9650 12 \u5C0F\u6642`,
            errors: [{
              field: "hours",
              message: `\u7576\u65E5\u5DF2\u6709 ${otherHoursTotal.toFixed(1)} \u5C0F\u6642\uFF0C\u672C\u8A18\u9304\u5DF2\u6709 ${existingHours} \u5C0F\u6642\uFF0C\u6700\u591A\u9084\u53EF\u7D2F\u52A0 ${Math.max(0, 12 - otherHoursTotal - existingHours).toFixed(1)} \u5C0F\u6642`
            }]
          }, corsHeaders);
        }
        await env.DATABASE.prepare(
          `UPDATE Timesheets 
				 SET hours = hours + ?, updated_at = ?
				 WHERE timesheet_id = ?`
        ).bind(hours, (/* @__PURE__ */ new Date()).toISOString(), log_id).run();
      }
    }
    if (!log_id) {
      const sumRow = await env.DATABASE.prepare(
        `SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
      ).bind(String(me.user_id), work_date).first();
      const currentTotal = Number(sumRow?.s || 0);
      if (currentTotal + hours > 12 + 1e-9) {
        return jsonResponse(422, {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "\u6BCF\u65E5\u5DE5\u6642\u5408\u8A08\u4E0D\u53EF\u8D85\u904E 12 \u5C0F\u6642",
          errors: [{ field: "hours", message: "\u8D85\u904E\u6BCF\u65E5\u4E0A\u9650" }],
          meta: { requestId }
        }, corsHeaders);
      }
      if (workType2.maxHours) {
        const workTypeSum = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0`
        ).bind(String(me.user_id), work_date, String(work_type_id)).first();
        const existingWorkTypeTotal = Number(workTypeSum?.s || 0);
        const newWorkTypeTotal = existingWorkTypeTotal + hours;
        if (newWorkTypeTotal > workType2.maxHours + 1e-9) {
          return jsonResponse(422, {
            ok: false,
            code: "VALIDATION_ERROR",
            message: `\u300C${workType2.name}\u300D\u7576\u65E5\u7D2F\u8A08\u4E0D\u53EF\u8D85\u904E ${workType2.maxHours} \u5C0F\u6642`,
            errors: [{
              field: "hours",
              message: `\u8A72\u65E5\u5DF2\u6709 ${existingWorkTypeTotal} \u5C0F\u6642\u300C${workType2.name}\u300D\uFF0C\u6700\u591A\u9084\u53EF\u586B ${Math.max(0, workType2.maxHours - existingWorkTypeTotal)} \u5C0F\u6642`
            }],
            meta: { requestId }
          }, corsHeaders);
        }
      }
      await env.DATABASE.prepare(
        `INSERT INTO Timesheets (user_id, work_date, client_id, service_id, service_item_id, service_name, work_type, hours, note, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        String(me.user_id),
        work_date,
        client_id,
        service_id,
        service_item_id,
        String(service_id),
        // 保留舊欄位以向後相容
        String(work_type_id),
        hours,
        notes,
        (/* @__PURE__ */ new Date()).toISOString(),
        (/* @__PURE__ */ new Date()).toISOString()
      ).run();
      const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      log_id = idRow?.id;
    }
    const comp_hours_generated = workType2.isOvertime ? workType2.special === "fixed_8h" ? 8 : hours : 0;
    if (comp_hours_generated > 0) {
      const generatedDate = work_date;
      const dateObj = /* @__PURE__ */ new Date(work_date + "T00:00:00Z");
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth();
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      const expiryDate = `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDay.getUTCDate()).padStart(2, "0")}`;
      await env.DATABASE.prepare(
        `INSERT INTO CompensatoryLeaveGrants 
				 (user_id, source_timelog_id, hours_generated, hours_remaining, generated_date, expiry_date, original_rate, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
      ).bind(
        String(me.user_id),
        log_id,
        // log_id 就是 timesheet_id
        comp_hours_generated,
        comp_hours_generated,
        // 初始時 remaining = generated
        generatedDate,
        expiryDate,
        workType2.multiplier
      ).run();
    }
    console.log("[TIMELOG] \u4FDD\u5B58\u6210\u529F:", { log_id, weighted_hours, comp_hours_generated });
    const workDateObj = /* @__PURE__ */ new Date(work_date + "T00:00:00");
    const dayOfWeek = workDateObj.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(workDateObj);
    monday.setDate(monday.getDate() + mondayOffset);
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const workMonth = `${workDateObj.getFullYear()}-${String(workDateObj.getMonth() + 1).padStart(2, "0")}`;
    Promise.all([
      invalidateWeekCache(env, String(me.user_id), weekStart),
      invalidateCacheByType(env, "monthly_summary", { userId: String(me.user_id) })
    ]).catch((err) => {
      console.error("[TIMELOG] \u5931\u6548\u7F13\u5B58\u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u4FDD\u5B58\uFF09:", err);
    });
    return jsonResponse(200, {
      ok: true,
      code: "SUCCESS",
      message: isUpdate ? "\u5DF2\u66F4\u65B0" : "\u5DF2\u5EFA\u7ACB",
      data: {
        log_id,
        weighted_hours,
        comp_hours_generated
      },
      meta: { requestId }
    }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      requestId,
      path: url.pathname,
      err: String(err),
      stack: err.stack
    }));
    const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
    return jsonResponse(500, body2, corsHeaders);
  }
}
__name(handlePostTimelogs, "handlePostTimelogs");
async function handleDeleteTimelogsBatch(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(400, {
      ok: false,
      code: "BAD_REQUEST",
      message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4",
      meta: { requestId }
    }, corsHeaders);
  }
  const start_date = String(body?.start_date || "").trim();
  const end_date = String(body?.end_date || "").trim();
  const client_id = String(body?.client_id || "").trim();
  const service_id = parseInt(body?.service_id) || 0;
  const service_item_id = parseInt(body?.service_item_id) || 0;
  const work_type_id = String(body?.work_type_id || "").trim();
  if (!start_date || !end_date || !client_id || !service_id || !service_item_id || !work_type_id) {
    return jsonResponse(400, {
      ok: false,
      code: "BAD_REQUEST",
      message: "\u7F3A\u5C11\u5FC5\u8981\u53C3\u6578",
      meta: { requestId }
    }, corsHeaders);
  }
  try {
    const result = await env.DATABASE.prepare(
      `UPDATE Timesheets 
			 SET is_deleted = 1, updated_at = ?
			 WHERE user_id = ? 
			   AND work_date >= ? 
			   AND work_date <= ? 
			   AND client_id = ? 
			   AND service_id = ? 
			   AND service_item_id = ?
			   AND work_type = ?
			   AND is_deleted = 0`
    ).bind(
      (/* @__PURE__ */ new Date()).toISOString(),
      String(me.user_id),
      start_date,
      end_date,
      client_id,
      service_id,
      service_item_id,
      work_type_id
    ).run();
    const deleted_count = result.changes || 0;
    if (deleted_count > 0) {
      const startDateObj = /* @__PURE__ */ new Date(start_date + "T00:00:00");
      const endDateObj = /* @__PURE__ */ new Date(end_date + "T00:00:00");
      const weeksToInvalidate = /* @__PURE__ */ new Set();
      let currentDate = new Date(startDateObj);
      while (currentDate <= endDateObj) {
        const dayOfWeek = currentDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(currentDate);
        monday.setDate(monday.getDate() + mondayOffset);
        const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
        weeksToInvalidate.add(weekStart);
        currentDate.setDate(currentDate.getDate() + 7);
      }
      Promise.all([...weeksToInvalidate].map(
        (weekStart) => invalidateWeekCache(env, String(me.user_id), weekStart)
      )).catch((err) => {
        console.error("[TIMELOG] \u6279\u91CF\u5931\u6548\u7F13\u5B58\u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u5220\u9664\uFF09:", err);
      });
    }
    return jsonResponse(200, {
      ok: true,
      code: "SUCCESS",
      message: `\u5DF2\u522A\u9664 ${deleted_count} \u7B46\u8A18\u9304`,
      data: { deleted_count },
      meta: { requestId }
    }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
    const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
    return jsonResponse(500, body2, corsHeaders);
  }
}
__name(handleDeleteTimelogsBatch, "handleDeleteTimelogsBatch");
async function handleGetMonthlySummary(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  try {
    const params = url.searchParams;
    const month = (params.get("month") || "").trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return jsonResponse(400, {
        ok: false,
        code: "INVALID_MONTH",
        message: "\u6708\u4EFD\u683C\u5F0F\u932F\u8AA4\uFF0C\u61C9\u70BA YYYY-MM",
        meta: { requestId }
      }, corsHeaders);
    }
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, "0")}`;
    const endDate = `${nextMonth}-01`;
    let userId = me.user_id;
    if (me.is_admin && params.get("user_id")) {
      userId = parseInt(params.get("user_id"));
    }
    const cacheKey = generateCacheKey("monthly_summary", { userId, month });
    console.log("[MONTHLY_SUMMARY] \u{1F50D} \u67E5\u8BE2\u7F13\u5B58", { userId, month, cacheKey });
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached && kvCached.data) {
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data,
        meta: { requestId, month, userId, ...kvCached.meta, cache_source: "kv" }
      }, corsHeaders);
    }
    const d1Cached = await getCache(env, cacheKey);
    if (d1Cached && d1Cached.data) {
      saveKVCache(env, cacheKey, "monthly_summary", d1Cached.data, {
        userId: String(userId),
        scopeParams: { userId, month },
        ttl: 3600
      }).catch((err) => console.error("[TIMELOGS] KV\u540C\u6B65\u5931\u8D25:", err));
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
        data: d1Cached.data,
        meta: { requestId, month, userId, ...d1Cached.meta, cache_source: "d1" }
      }, corsHeaders);
    }
    const timelogs = await env.DATABASE.prepare(
      `SELECT work_type, hours
			 FROM Timesheets
			 WHERE user_id = ?
			   AND work_date >= ?
			   AND work_date < ?
			   AND is_deleted = 0`
    ).bind(userId, startDate, endDate).all();
    let totalHours = 0;
    let overtimeHours = 0;
    let weightedHours = 0;
    timelogs.results.forEach((log) => {
      const hours = parseFloat(log.hours) || 0;
      const workTypeId = parseInt(log.work_type) || 1;
      const workType = WORK_TYPES[workTypeId];
      if (workType) {
        totalHours += hours;
        if (workType.isOvertime) {
          overtimeHours += hours;
        }
        weightedHours += calculateWeightedHours(workTypeId, hours);
      }
    });
    const leaveRows = await env.DATABASE.prepare(
      `SELECT unit, amount
		 FROM LeaveRequests
		 WHERE user_id = ?
		   AND start_date >= ?
		   AND start_date < ?
		   AND status = 'approved'
		   AND is_deleted = 0`
    ).bind(userId, startDate, endDate).all();
    let leaveHours = 0;
    if (leaveRows.results) {
      leaveRows.results.forEach((row) => {
        const amount = parseFloat(row.amount) || 0;
        if (row.unit === "hour") {
          leaveHours += amount;
        } else if (row.unit === "day") {
          leaveHours += amount * 8;
        }
      });
    }
    const summaryData = {
      month,
      total_hours: Math.round(totalHours * 10) / 10,
      overtime_hours: Math.round(overtimeHours * 10) / 10,
      weighted_hours: Math.round(weightedHours * 10) / 10,
      leave_hours: Math.round(leaveHours * 10) / 10
    };
    try {
      await Promise.all([
        saveKVCache(env, cacheKey, "monthly_summary", summaryData, {
          userId: String(userId),
          scopeParams: { userId, month },
          ttl: 3600
          // 1小时
        }),
        saveCache(env, cacheKey, "monthly_summary", summaryData, {
          userId: String(userId),
          scopeParams: { userId, month }
        })
      ]);
      console.log("[TIMELOGS] \u2713 \u6708\u5EA6\u7EDF\u8BA1\u7F13\u5B58\u5DF2\u4FDD\u5B58\uFF08KV+D1\uFF09");
    } catch (err) {
      console.error("[TIMELOGS] \u2717 \u6708\u5EA6\u7EDF\u8BA1\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
    }
    return jsonResponse(200, {
      ok: true,
      code: "SUCCESS",
      message: "\u67E5\u8A62\u6210\u529F",
      data: summaryData,
      meta: { requestId }
    }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
    const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
    return jsonResponse(500, body, corsHeaders);
  }
}
__name(handleGetMonthlySummary, "handleGetMonthlySummary");
async function handleSaveWeekCache(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(400, {
      ok: false,
      code: "BAD_REQUEST",
      message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4",
      meta: { requestId }
    }, corsHeaders);
  }
  const weekStart = String(body?.week_start || "").trim();
  const rowsData = body?.rows_data || [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_DATE",
      message: "\u65E5\u671F\u683C\u5F0F\u932F\u8AA4",
      meta: { requestId }
    }, corsHeaders);
  }
  if (!Array.isArray(rowsData)) {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_DATA",
      message: "\u6578\u64DA\u683C\u5F0F\u932F\u8AA4",
      meta: { requestId }
    }, corsHeaders);
  }
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const rowsJson = JSON.stringify(rowsData);
    const rowsCount = rowsData.length;
    const totalHours = rowsData.reduce((sum, row) => {
      const rowTotal = (row.hours || []).reduce((s, h) => s + (Number(h) || 0), 0);
      return sum + rowTotal;
    }, 0);
    await env.DATABASE.prepare(
      `INSERT INTO WeeklyTimesheetCache (user_id, week_start_date, rows_data, rows_count, total_hours, data_version, invalidated, last_updated_at, created_at)
			 VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
			 ON CONFLICT(user_id, week_start_date) DO UPDATE SET
			   rows_data = excluded.rows_data,
			   rows_count = excluded.rows_count,
			   total_hours = excluded.total_hours,
			   data_version = data_version + 1,
			   invalidated = 0,
			   last_updated_at = excluded.last_updated_at`
    ).bind(me.user_id, weekStart, rowsJson, rowsCount, totalHours, now, now).run();
    console.log("[WeekCache] \u2713 \u7F13\u5B58\u5DF2\u4FDD\u5B58", {
      userId: me.user_id,
      week: weekStart,
      rows: rowsCount,
      hours: totalHours
    });
    return jsonResponse(200, {
      ok: true,
      code: "SUCCESS",
      message: "\u7DE9\u5B58\u5DF2\u4FDD\u5B58",
      data: {
        week_start: weekStart,
        rows_count: rowsCount,
        total_hours: totalHours
      },
      meta: { requestId }
    }, corsHeaders);
  } catch (err) {
    console.error("[WeekCache] \u4FDD\u5B58\u7F13\u5B58\u5931\u8D25:", err);
    const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4FDD\u5B58\u7DE9\u5B58\u5931\u6557", meta: { requestId } };
    if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
    return jsonResponse(500, body2, corsHeaders);
  }
}
__name(handleSaveWeekCache, "handleSaveWeekCache");
async function handleTimesheets(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "POST" && url.pathname.endsWith("/week-cache")) {
    return handleSaveWeekCache(request, env, me, requestId, url);
  }
  if (method === "GET" && (url.pathname.endsWith("/monthly-summary") || url.pathname.endsWith("/summary"))) {
    return handleGetMonthlySummary(request, env, me, requestId, url);
  }
  if (method === "GET") {
    return handleGetTimelogs(request, env, me, requestId, url);
  }
  if (method === "POST") {
    return handlePostTimelogs(request, env, me, requestId, url);
  }
  if (method === "DELETE" && url.pathname.endsWith("/batch")) {
    return handleDeleteTimelogsBatch(request, env, me, requestId, url);
  }
  return jsonResponse(405, {
    ok: false,
    code: "METHOD_NOT_ALLOWED",
    message: "\u65B9\u6CD5\u4E0D\u5141\u8A31",
    meta: { requestId }
  }, corsHeaders);
}
__name(handleTimesheets, "handleTimesheets");

// src/api/receipts.js
async function handleReceipts(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  if (method === "GET" && path === "/internal/api/v1/receipts/health") {
    return jsonResponse(200, { ok: true, message: "Receipts API is healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() }, corsHeaders);
  }
  if (method === "GET" && path === "/internal/api/v1/receipts/reminders") {
    try {
      const now = /* @__PURE__ */ new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const serviceMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const reminders = await env.DATABASE.prepare(
        `SELECT DISTINCT
				   c.client_id, c.company_name AS client_name,
				   cs.client_service_id, s.service_name,
				   sbs.billing_month, sbs.billing_amount AS amount,
				   (SELECT COUNT(*) FROM ActiveTasks t 
				    WHERE t.client_service_id = cs.client_service_id 
				      AND t.service_month = ?
				      AND t.is_deleted = 0) as total_tasks,
				   (SELECT COUNT(*) FROM ActiveTasks t 
				    WHERE t.client_service_id = cs.client_service_id 
				      AND t.service_month = ?
				      AND t.is_deleted = 0
				      AND t.status = 'completed') as completed_tasks
				 FROM ClientServices cs
				 JOIN Clients c ON c.client_id = cs.client_id
				 JOIN Services s ON s.service_id = cs.service_id
				 JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
				 WHERE cs.status = 'active'
				   AND sbs.billing_month = ?
				   -- \u8BE5\u6708\u4EFD\u8FD8\u6CA1\u5F00\u6536\u636E\uFF08\u6392\u9664\u5DF2\u4F5C\u5E9F\u7684\u6536\u636E\uFF09
				   AND NOT EXISTS (
				     SELECT 1 FROM Receipts r 
				     WHERE r.client_service_id = cs.client_service_id 
				       AND r.billing_month = sbs.billing_month
				       AND r.is_deleted = 0
				       AND r.status != 'cancelled'
				   )
				   -- \u8BE5\u670D\u52A1\u8BE5\u6708\u6709\u4EFB\u52A1
				   AND EXISTS (
				     SELECT 1 FROM ActiveTasks t
				     WHERE t.client_service_id = cs.client_service_id
				       AND t.service_month = ?
				       AND t.is_deleted = 0
				   )
				   -- \u8BE5\u670D\u52A1\u8BE5\u6708\u7684\u4EFB\u52A1\u5168\u90E8\u5B8C\u6210\uFF08\u6CA1\u6709\u672A\u5B8C\u6210\u7684\u4EFB\u52A1\uFF09
				   AND NOT EXISTS (
				     SELECT 1 FROM ActiveTasks t
				     WHERE t.client_service_id = cs.client_service_id
				       AND t.service_month = ?
				       AND t.is_deleted = 0
				       AND t.status != 'completed'
				   )
				 ORDER BY c.company_name, s.service_name
				 LIMIT 20`
      ).bind(serviceMonth, serviceMonth, currentMonth, serviceMonth, serviceMonth).all();
      const data = (reminders?.results || []).map((r) => ({
        client_id: r.client_id,
        client_name: r.client_name,
        client_service_id: r.client_service_id,
        service_name: r.service_name,
        billing_month: r.billing_month,
        amount: Number(r.amount || 0),
        total_tasks: Number(r.total_tasks || 0),
        completed_tasks: Number(r.completed_tasks || 0)
      }));
      console.log(`[\u6536\u636E\u63D0\u9192] \u5F53\u524D\u6708\u4EFD: ${currentMonth} (${serviceMonth}), \u627E\u5230 ${data.length} \u4E2A\u5F85\u5F00\u6536\u636E\uFF08\u4EFB\u52A1\u5DF2\u5B8C\u6210\uFF09`);
      if (data.length > 0) {
        data.forEach((item) => {
          console.log(`  - ${item.client_name} (client_service_id: ${item.client_service_id}), ${item.service_name}, ${item.billing_month}\u6708, $${item.amount}`);
        });
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "GET" && path === "/internal/api/v1/receipts/suggest-amount") {
    const clientServiceId = parseInt(url.searchParams.get("client_service_id") || "0", 10);
    const billingMonth = parseInt(url.searchParams.get("billing_month") || "0", 10);
    if (!clientServiceId || billingMonth < 1 || billingMonth > 12) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u8BF7\u63D0\u4F9B\u6709\u6548\u7684client_service_id\u548Cbilling_month\uFF081-12\uFF09",
        meta: { requestId }
      }, corsHeaders);
    }
    try {
      const schedule = await env.DATABASE.prepare(
        `SELECT billing_amount, payment_due_days 
				 FROM ServiceBillingSchedule 
				 WHERE client_service_id = ? AND billing_month = ?`
      ).bind(clientServiceId, billingMonth).first();
      if (!schedule) {
        return jsonResponse(200, {
          ok: true,
          code: "OK",
          message: "\u8BE5\u6708\u4EFD\u672A\u8BBE\u5B9A\u6536\u8D39",
          data: {
            suggested_amount: 0,
            payment_due_days: 30,
            has_schedule: false
          },
          meta: { requestId }
        }, corsHeaders);
      }
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F\u83B7\u53D6\u5EFA\u8BAE\u91D1\u989D",
        data: {
          suggested_amount: Number(schedule.billing_amount || 0),
          payment_due_days: Number(schedule.payment_due_days || 30),
          has_schedule: true
        },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "GET" && path === "/internal/api/v1/receipts") {
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
    const offset = (page - 1) * perPage;
    const q = (params.get("q") || "").trim();
    const status = (params.get("status") || "").trim();
    const receiptType = (params.get("receipt_type") || "").trim();
    const dateFrom = (params.get("dateFrom") || "").trim();
    const dateTo = (params.get("dateTo") || "").trim();
    try {
      console.log(`[\u6536\u636E\u5217\u8868] \u67E5\u8BE2\u53C2\u6570:`, { page, perPage, status, q, dateFrom, dateTo });
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
      if (receiptType && ["normal", "prepayment", "deposit"].includes(receiptType)) {
        where.push("r.receipt_type = ?");
        binds.push(receiptType);
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
      console.log(`[\u6536\u636E\u5217\u8868] SQL WHERE:`, whereSql, `\u7ED1\u5B9A\u53C2\u6570:`, binds.length);
      const countRow = await env.DATABASE.prepare(
        `SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
      ).bind(...binds).first();
      const total = Number(countRow?.total || 0);
      console.log(`[\u6536\u636E\u5217\u8868] \u603B\u8BB0\u5F55\u6570:`, total);
      const rows = await env.DATABASE.prepare(
        `SELECT r.receipt_id, r.client_id, c.company_name AS client_name, c.tax_registration_number AS client_tax_id, 
				        r.total_amount, r.receipt_date, r.due_date, r.status, r.receipt_type
				 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
				 ${whereSql}
				 ORDER BY r.receipt_date DESC, r.receipt_id DESC
				 LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      console.log(`[\u6536\u636E\u5217\u8868] \u67E5\u8BE2\u5230 ${rows?.results?.length || 0} \u6761\u8BB0\u5F55`);
      const data = (rows?.results || []).map((r, index) => {
        try {
          return {
            receiptId: r.receipt_id,
            clientId: r.client_id,
            clientName: r.client_name || "",
            clientTaxId: r.client_tax_id || "",
            totalAmount: Number(r.total_amount || 0),
            receiptDate: r.receipt_date,
            dueDate: r.due_date || null,
            status: r.status,
            receiptType: r.receipt_type || "normal"
          };
        } catch (mapErr) {
          console.error(`[\u6536\u636E\u5217\u8868] \u6620\u5C04\u7B2C${index}\u6761\u8BB0\u5F55\u5931\u8D25:`, JSON.stringify({
            receipt_id: r.receipt_id,
            error: String(mapErr),
            raw: r
          }));
          return null;
        }
      }).filter((r) => r !== null);
      console.log(`[\u6536\u636E\u5217\u8868] \u6210\u529F\u8FD4\u56DE ${data.length} \u6761\u8BB0\u5F55`);
      const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta }, corsHeaders);
    } catch (err) {
      const errorDetail = {
        level: "error",
        requestId,
        path: url.pathname,
        method: "GET /receipts",
        params: {
          page,
          perPage,
          status,
          q,
          dateFrom,
          dateTo
        },
        err: String(err),
        stack: err.stack || "",
        message: err.message || "",
        name: err.name || ""
      };
      console.error(JSON.stringify(errorDetail));
      if (env.APP_ENV === "dev") {
        return jsonResponse(500, {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "\u4F3A\u670D\u5668\u932F\u8AA4",
          debug: errorDetail,
          meta: { requestId }
        }, getCorsHeadersForRequest(request, env));
      }
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, getCorsHeadersForRequest(request, env));
    }
  }
  if (method === "GET" && path === "/internal/api/v1/receipts/statistics") {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const totalRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as total_receivable
				 FROM Receipts 
				 WHERE is_deleted = 0 AND status IN ('unpaid', 'partial')`
      ).first();
      const overdueRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as overdue_receivable
				 FROM Receipts 
				 WHERE is_deleted = 0 AND status IN ('unpaid', 'partial') AND due_date < ?`
      ).bind(today).first();
      const statusStats = await env.DATABASE.prepare(
        `SELECT status, COUNT(*) as count, SUM(total_amount) as amount
				 FROM Receipts 
				 WHERE is_deleted = 0
				 GROUP BY status`
      ).all();
      const data = {
        totalReceivable: Number(totalRow?.total_receivable || 0),
        overdueReceivable: Number(overdueRow?.overdue_receivable || 0),
        statusBreakdown: (statusStats?.results || []).map((s) => ({
          status: s.status,
          count: Number(s.count || 0),
          amount: Number(s.amount || 0)
        }))
      };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "GET" && path === "/internal/api/v1/receipts/aging-report") {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const receipts = await env.DATABASE.prepare(
        `SELECT r.receipt_id, r.client_id, c.company_name as client_name,
				        r.receipt_date, r.due_date, r.total_amount, 
				        COALESCE(r.paid_amount, 0) as paid_amount,
				        (r.total_amount - COALESCE(r.paid_amount, 0)) as outstanding_amount,
				        julianday(?) - julianday(r.due_date) as days_overdue
				 FROM Receipts r
				 LEFT JOIN Clients c ON c.client_id = r.client_id
				 WHERE r.is_deleted = 0 AND r.status IN ('unpaid', 'partial')
				 ORDER BY days_overdue DESC`
      ).bind(today).all();
      const aging = {
        current: [],
        // 未到期
        days_30: [],
        // 1-30天
        days_60: [],
        // 31-60天
        days_90: [],
        // 61-90天
        over_90: []
        // 90天以上
      };
      let totals = { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0 };
      (receipts?.results || []).forEach((r) => {
        const item = {
          receiptId: r.receipt_id,
          clientId: r.client_id,
          clientName: r.client_name || "",
          receiptDate: r.receipt_date,
          dueDate: r.due_date,
          outstandingAmount: Number(r.outstanding_amount || 0),
          daysOverdue: Math.round(Number(r.days_overdue || 0))
        };
        const days = item.daysOverdue;
        if (days < 0) {
          aging.current.push(item);
          totals.current += item.outstandingAmount;
        } else if (days <= 30) {
          aging.days_30.push(item);
          totals.days_30 += item.outstandingAmount;
        } else if (days <= 60) {
          aging.days_60.push(item);
          totals.days_60 += item.outstandingAmount;
        } else if (days <= 90) {
          aging.days_90.push(item);
          totals.days_90 += item.outstandingAmount;
        } else {
          aging.over_90.push(item);
          totals.over_90 += item.outstandingAmount;
        }
      });
      const data = { aging, totals };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const getDetailMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
  if (method === "GET" && getDetailMatch) {
    const receiptId = decodeURIComponent(getDetailMatch[1]);
    try {
      console.log(`[\u6536\u636E\u8BE6\u60C5] \u67E5\u8BE2\u6536\u636EID: ${receiptId}`);
      const receipt = await env.DATABASE.prepare(
        `SELECT r.receipt_id, r.client_id, r.receipt_date, r.due_date, r.total_amount, 
				        r.paid_amount, r.status, r.receipt_type, r.related_task_id, 
				        r.client_service_id, r.billing_month, r.service_month, r.notes, 
				        r.created_at, r.created_by,
				        c.company_name as client_name, c.tax_registration_number as client_tax_id,
				        u.name as created_by_name
				 FROM Receipts r
				 LEFT JOIN Clients c ON c.client_id = r.client_id
				 LEFT JOIN Users u ON u.user_id = r.created_by
				 WHERE r.receipt_id = ? AND r.is_deleted = 0`
      ).bind(receiptId).first();
      console.log(`[\u6536\u636E\u8BE6\u60C5] \u67E5\u8BE2\u7ED3\u679C: ${receipt ? "\u627E\u5230" : "\u672A\u627E\u5230"}`);
      if (!receipt) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u64DA\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      let items;
      try {
        items = await env.DATABASE.prepare(
          `SELECT item_id, service_name, quantity, unit_price, subtotal, notes, 
					        COALESCE(service_fee, 0) as service_fee, 
					        COALESCE(government_fee, 0) as government_fee, 
					        COALESCE(miscellaneous_fee, 0) as miscellaneous_fee
					 FROM ReceiptItems
					 WHERE receipt_id = ?
					 ORDER BY item_id`
        ).bind(receiptId).all();
      } catch (err) {
        console.log("[ReceiptItems] \u4F7F\u7528\u65E7\u683C\u5F0F\u67E5\u8BE2\uFF08\u65B0\u5B57\u6BB5\u53EF\u80FD\u4E0D\u5B58\u5728\uFF09:", err.message);
        items = await env.DATABASE.prepare(
          `SELECT item_id, service_name, quantity, unit_price, subtotal, notes
					 FROM ReceiptItems
					 WHERE receipt_id = ?
					 ORDER BY item_id`
        ).bind(receiptId).all();
      }
      const payments = await env.DATABASE.prepare(
        `SELECT p.payment_id, p.payment_date, p.payment_amount, p.payment_method,
				        p.reference_number, p.notes, p.created_at, u.name as created_by_name
				 FROM Payments p
				 LEFT JOIN Users u ON u.user_id = p.created_by
				 WHERE p.receipt_id = ? AND p.is_deleted = 0
				 ORDER BY p.payment_date DESC, p.payment_id DESC`
      ).bind(receiptId).all();
      const data = {
        receiptId: receipt.receipt_id,
        clientId: receipt.client_id,
        clientName: receipt.client_name || "",
        clientTaxId: receipt.client_tax_id || "",
        receiptDate: receipt.receipt_date,
        dueDate: receipt.due_date,
        totalAmount: Number(receipt.total_amount || 0),
        paidAmount: Number(receipt.paid_amount || 0),
        outstandingAmount: Number(receipt.total_amount || 0) - Number(receipt.paid_amount || 0),
        status: receipt.status,
        receiptType: receipt.receipt_type || "normal",
        relatedTaskId: receipt.related_task_id,
        clientServiceId: receipt.client_service_id,
        billingMonth: receipt.billing_month,
        notes: receipt.notes || "",
        createdBy: receipt.created_by_name || "",
        createdAt: receipt.created_at,
        items: (items?.results || []).map((i) => ({
          itemId: i.item_id,
          serviceName: i.service_name,
          quantity: Number(i.quantity || 1),
          unitPrice: Number(i.unit_price || 0),
          serviceFee: Number(i.service_fee || 0),
          governmentFee: Number(i.government_fee || 0),
          miscellaneousFee: Number(i.miscellaneous_fee || 0),
          subtotal: Number(i.subtotal || 0),
          notes: i.notes || ""
        })),
        payments: (payments?.results || []).map((p) => ({
          paymentId: p.payment_id,
          paymentDate: p.payment_date,
          paymentAmount: Number(p.payment_amount || 0),
          paymentMethod: p.payment_method,
          referenceNumber: p.reference_number || "",
          notes: p.notes || "",
          createdBy: p.created_by_name || "",
          createdAt: p.created_at
        }))
      };
      console.log(`[\u6536\u636E\u8BE6\u60C5] \u6210\u529F\u8FD4\u56DE\u6570\u636E`);
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      const errorDetail = {
        level: "error",
        requestId,
        path,
        receiptId,
        err: String(err),
        stack: err.stack || "",
        message: err.message || "",
        name: err.name || ""
      };
      console.error(JSON.stringify(errorDetail));
      if (env.APP_ENV === "dev") {
        return jsonResponse(500, {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "\u4F3A\u670D\u5668\u932F\u8AA4",
          debug: errorDetail,
          meta: { requestId }
        }, corsHeaders);
      }
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const addPaymentMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)\/payments$/);
  if (method === "POST" && addPaymentMatch) {
    const receiptId = decodeURIComponent(addPaymentMatch[1]);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const payment_date = String(body?.payment_date || "").trim();
    const payment_amount = Number(body?.payment_amount);
    const payment_method = String(body?.payment_method || "transfer").trim();
    const reference_number = String(body?.reference_number || "").trim();
    const notes = String(body?.notes || "").trim();
    const errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) errors.push({ field: "payment_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    if (!Number.isFinite(payment_amount) || payment_amount <= 0) errors.push({ field: "payment_amount", message: "\u5FC5\u9808\u5927\u65BC 0" });
    if (!["cash", "transfer", "check", "other"].includes(payment_method)) errors.push({ field: "payment_method", message: "\u6536\u6B3E\u65B9\u5F0F\u4E0D\u5408\u6CD5" });
    if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    try {
      const receipt = await env.DATABASE.prepare(
        "SELECT receipt_id, total_amount, COALESCE(paid_amount, 0) as paid_amount, status FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
      ).bind(receiptId).first();
      if (!receipt) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u64DA\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      if (receipt.status === "cancelled") {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5DF2\u4F5C\u5EE2\u7684\u6536\u64DA\u4E0D\u53EF\u6536\u6B3E", meta: { requestId } }, corsHeaders);
      }
      const outstanding = Number(receipt.total_amount) - Number(receipt.paid_amount);
      if (payment_amount > outstanding) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: `\u6536\u6B3E\u91D1\u984D\u8D85\u904E\u672A\u6536\u91D1\u984D\uFF08${outstanding}\uFF09`, meta: { requestId } }, corsHeaders);
      }
      const insertResult = await env.DATABASE.prepare(
        `INSERT INTO Payments (receipt_id, payment_date, payment_amount, payment_method, reference_number, notes, created_by, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        receiptId,
        payment_date,
        payment_amount,
        payment_method,
        reference_number,
        notes,
        String(me.user_id),
        (/* @__PURE__ */ new Date()).toISOString(),
        (/* @__PURE__ */ new Date()).toISOString()
      ).run();
      const newPaidAmount = Number(receipt.paid_amount) + payment_amount;
      const newStatus = newPaidAmount >= Number(receipt.total_amount) ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid";
      await env.DATABASE.prepare(
        "UPDATE Receipts SET paid_amount = ?, status = ?, updated_at = ? WHERE receipt_id = ?"
      ).bind(newPaidAmount, newStatus, (/* @__PURE__ */ new Date()).toISOString(), receiptId).run();
      const data = {
        paymentId: insertResult.meta.last_row_id,
        receiptId,
        paymentDate: payment_date,
        paymentAmount: payment_amount,
        paymentMethod: payment_method,
        receiptStatus: newStatus,
        paidAmount: newPaidAmount,
        outstandingAmount: Number(receipt.total_amount) - newPaidAmount
      };
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u8A18\u9304\u6536\u6B3E", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && path === "/internal/api/v1/receipts") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const client_id = String(body?.client_id || "").trim();
    const receipt_date = String(body?.receipt_date || "").trim();
    const due_date_raw = String(body?.due_date || "").trim();
    const total_amount = Number(body?.total_amount);
    const withholding_amount = Number(body?.withholding_amount || 0);
    let statusVal = String(body?.status || "unpaid").trim();
    const notes = (body?.notes || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    let receiptType = String(body?.receipt_type || "normal").trim();
    const relatedTaskId = body?.related_task_id ? parseInt(body.related_task_id, 10) : null;
    const clientServiceId = body?.client_service_id ? parseInt(body.client_service_id, 10) : null;
    const billingMonth = body?.billing_month ? parseInt(body.billing_month, 10) : null;
    const errors = [];
    if (!client_id) errors.push({ field: "client_id", message: "\u5FC5\u586B" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt_date)) errors.push({ field: "receipt_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    if (!Number.isFinite(total_amount) || total_amount <= 0) errors.push({ field: "total_amount", message: "\u5FC5\u9808\u5927\u65BC 0" });
    if (!statusVal) statusVal = "unpaid";
    if (!["unpaid", "partial", "paid", "cancelled"].includes(statusVal)) errors.push({ field: "status", message: "\u72C0\u614B\u4E0D\u5408\u6CD5" });
    if (!["normal", "prepayment", "deposit"].includes(receiptType)) {
      receiptType = "normal";
    }
    if (billingMonth && (billingMonth < 1 || billingMonth > 12)) {
      errors.push({ field: "billing_month", message: "\u6708\u4EFD\u5FC5\u987B\u57281-12\u4E4B\u95F4" });
    }
    if (items.length > 0) {
      let itemsTotal = 0;
      items.forEach((item, idx) => {
        const service_name = String(item?.service_name || "").trim();
        const quantity = Number(item?.quantity || 1);
        const unit_price = Number(item?.unit_price || 0);
        if (!service_name) errors.push({ field: `items[${idx}].service_name`, message: "\u5FC5\u586B" });
        if (!Number.isFinite(quantity) || quantity <= 0) errors.push({ field: `items[${idx}].quantity`, message: "\u5FC5\u9808\u5927\u65BC 0" });
        if (!Number.isFinite(unit_price) || unit_price < 0) errors.push({ field: `items[${idx}].unit_price`, message: "\u5FC5\u9808\u5927\u65BC\u7B49\u65BC 0" });
        itemsTotal += quantity * unit_price;
      });
      if (Math.abs(itemsTotal - total_amount) > 0.01) {
        errors.push({ field: "items", message: `\u660E\u7D30\u7E3D\u8A08\uFF08${itemsTotal}\uFF09\u8207\u7E3D\u91D1\u984D\uFF08${total_amount}\uFF09\u4E0D\u7B26` });
      }
    }
    if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    try {
      const c = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(client_id).first();
      if (!c) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5BA2\u6236\u4E0D\u5B58\u5728", errors: [{ field: "client_id", message: "\u4E0D\u5B58\u5728" }], meta: { requestId } }, corsHeaders);
      const [yyyy, mm] = receipt_date.split("-");
      const prefix = `${yyyy}${mm}`;
      const maxRow = await env.DATABASE.prepare("SELECT receipt_id FROM Receipts WHERE receipt_id LIKE ? ORDER BY receipt_id DESC LIMIT 1").bind(`${prefix}-%`).first();
      let seq = 1;
      if (maxRow && typeof maxRow.receipt_id === "string") {
        const m = maxRow.receipt_id.match(/^(\d{6})-(\d{3})$/);
        if (m) seq = Math.max(seq, parseInt(m[2], 10) + 1);
      }
      const receipt_id = `${prefix}-${String(seq).padStart(3, "0")}`;
      let due_date = due_date_raw;
      if (!due_date) {
        let dueDays = 30;
        if (clientServiceId && billingMonth) {
          const schedule = await env.DATABASE.prepare(
            "SELECT payment_due_days FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ?"
          ).bind(clientServiceId, billingMonth).first();
          if (schedule && schedule.payment_due_days) {
            dueDays = Number(schedule.payment_due_days);
          }
        }
        const d = /* @__PURE__ */ new Date(receipt_date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + dueDays);
        const y = d.getUTCFullYear();
        const m2 = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        due_date = `${y}-${m2}-${day}`;
      }
      let serviceMonth = null;
      if (billingMonth) {
        const year = receipt_date.split("-")[0];
        serviceMonth = `${year}-${String(billingMonth).padStart(2, "0")}`;
      } else {
        serviceMonth = receipt_date.substring(0, 7);
      }
      await env.DATABASE.prepare(
        `INSERT INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, withholding_amount, paid_amount, status, 
				 receipt_type, related_task_id, client_service_id, billing_month, service_month,
				 is_auto_generated, notes, created_by, created_at, updated_at) 
				 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
      ).bind(
        receipt_id,
        client_id,
        receipt_date,
        due_date,
        total_amount,
        withholding_amount,
        statusVal,
        receiptType,
        relatedTaskId,
        clientServiceId,
        billingMonth,
        serviceMonth,
        notes,
        String(me.user_id),
        (/* @__PURE__ */ new Date()).toISOString(),
        (/* @__PURE__ */ new Date()).toISOString()
      ).run();
      if (items.length > 0) {
        for (const item of items) {
          const service_name = String(item.service_name).trim();
          const service_fee = Number(item.service_fee || 0);
          const government_fee = Number(item.government_fee || 0);
          const miscellaneous_fee = Number(item.miscellaneous_fee || 0);
          const subtotal = service_fee + government_fee + miscellaneous_fee;
          const item_notes = String(item.notes || "").trim();
          const quantity = Number(item.quantity || 1);
          const unit_price = Number(item.unit_price || subtotal);
          try {
            await env.DATABASE.prepare(
              `INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, service_fee, government_fee, miscellaneous_fee, created_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(receipt_id, service_name, quantity, unit_price, subtotal, item_notes, service_fee, government_fee, miscellaneous_fee, (/* @__PURE__ */ new Date()).toISOString()).run();
          } catch (err) {
            console.log("[ReceiptItems] \u4F7F\u7528\u65E7\u683C\u5F0F\u63D2\u5165\uFF08\u65B0\u5B57\u6BB5\u53EF\u80FD\u4E0D\u5B58\u5728\uFF09:", err.message);
            await env.DATABASE.prepare(
              `INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, created_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(receipt_id, service_name, quantity, unit_price, subtotal, item_notes, (/* @__PURE__ */ new Date()).toISOString()).run();
          }
        }
      }
      const data = {
        receiptId: receipt_id,
        clientId: client_id,
        totalAmount: total_amount,
        receiptDate: receipt_date,
        dueDate: due_date,
        status: statusVal,
        receiptType,
        relatedTaskId,
        clientServiceId,
        billingMonth,
        itemsCount: items.length
      };
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  const patchMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
  if (method === "PATCH" && patchMatch) {
    const receiptId = decodeURIComponent(patchMatch[1]);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT * FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
      ).bind(receiptId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u64DA\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const updates = [];
      const binds = [];
      if (body.due_date !== void 0) {
        const due_date = String(body.due_date || "").trim();
        if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
          return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5230\u671F\u65E5\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
        }
        updates.push("due_date = ?");
        binds.push(due_date || null);
      }
      if (body.notes !== void 0) {
        updates.push("notes = ?");
        binds.push(String(body.notes || "").trim());
      }
      if (body.status !== void 0) {
        const status = String(body.status).trim();
        if (!["unpaid", "partial", "paid", "cancelled"].includes(status)) {
          return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u72C0\u614B\u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
        }
        updates.push("status = ?");
        binds.push(status);
      }
      if (updates.length === 0) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u672A\u63D0\u4F9B\u66F4\u65B0\u5B57\u6BB5", meta: { requestId } }, corsHeaders);
      }
      updates.push("updated_at = ?");
      binds.push((/* @__PURE__ */ new Date()).toISOString());
      binds.push(receiptId);
      await env.DATABASE.prepare(
        `UPDATE Receipts SET ${updates.join(", ")} WHERE receipt_id = ?`
      ).bind(...binds).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const deleteMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
  if (method === "DELETE" && deleteMatch) {
    const receiptId = decodeURIComponent(deleteMatch[1]);
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT receipt_id, status FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
      ).bind(receiptId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u64DA\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        "UPDATE Receipts SET status = 'cancelled', is_deleted = 1, updated_at = ? WHERE receipt_id = ?"
      ).bind((/* @__PURE__ */ new Date()).toISOString(), receiptId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u4F5C\u5EE2", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleReceipts, "handleReceipts");

// src/api/payroll.js
async function handlePayroll(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  return jsonResponse(501, {
    ok: false,
    code: "NOT_IMPLEMENTED",
    message: "\u85AA\u8CC7\u529F\u80FD\u5C1A\u672A\u5BE6\u4F5C",
    meta: { requestId }
  }, corsHeaders);
}
__name(handlePayroll, "handlePayroll");

// src/api/leaves.js
init_cache_helper();
init_kv_cache_helper();
async function ensureBasicLeaveBalances(env, userId, year) {
  await env.DATABASE.prepare(
    "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'sick', ?, 30, 0, 30, datetime('now'))"
  ).bind(userId, year).run();
  await env.DATABASE.prepare(
    "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'personal', ?, 14, 0, 14, datetime('now'))"
  ).bind(userId, year).run();
}
__name(ensureBasicLeaveBalances, "ensureBasicLeaveBalances");
async function handleLeaves(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/leaves/balances") {
    if (method !== "GET") {
      return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    }
    try {
      const params = url.searchParams;
      const year = parseInt(params.get("year") || String((/* @__PURE__ */ new Date()).getFullYear()), 10);
      const queryUserId = params.get("user_id");
      let targetUserId = String(me.user_id);
      if (queryUserId && me.is_admin) {
        targetUserId = String(queryUserId);
      }
      const cacheKey = generateCacheKey("leaves_balances", { userId: targetUserId, year });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached && kvCached.data) {
        return jsonResponse(200, {
          ok: true,
          code: "OK",
          message: "\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data,
          meta: { requestId, year, userId: targetUserId, ...kvCached.meta, cache_source: "kv" }
        }, corsHeaders);
      }
      const d1Cached = await getCache(env, cacheKey);
      if (d1Cached && d1Cached.data) {
        saveKVCache(env, cacheKey, "leaves_balances", d1Cached.data, {
          userId: targetUserId,
          scopeParams: { userId: targetUserId, year },
          ttl: 3600
        }).catch((err) => console.error("[LEAVES] KV\u540C\u6B65\u5931\u8D25:", err));
        return jsonResponse(200, {
          ok: true,
          code: "OK",
          message: "\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
          data: d1Cached.data,
          meta: { requestId, year, userId: targetUserId, ...d1Cached.meta, cache_source: "d1" }
        }, corsHeaders);
      }
      await ensureBasicLeaveBalances(env, targetUserId, year);
      const rows = await env.DATABASE.prepare(
        "SELECT leave_type, year, total, used, remain FROM LeaveBalances WHERE user_id = ? AND year = ? AND leave_type != 'comp'"
      ).bind(targetUserId, year).all();
      const data = (rows?.results || []).map((r) => ({ type: r.leave_type, year: Number(r.year), total: Number(r.total), used: Number(r.used), remain: Number(r.remain) }));
      const compRow = await env.DATABASE.prepare(
        `SELECT SUM(hours_remaining) as total FROM CompensatoryLeaveGrants 
				 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
      ).bind(targetUserId).first();
      const compRemain = Number(compRow?.total || 0);
      if (compRemain > 0) {
        data.push({ type: "comp", year, total: compRemain, used: 0, remain: compRemain });
      }
      const lifeEventRows = await env.DATABASE.prepare(
        `SELECT event_type, leave_type, days_granted, days_used, days_remaining, valid_until
				 FROM LifeEventLeaveGrants 
				 WHERE user_id = ? AND status = 'active' AND days_remaining > 0 
				 AND date(valid_until) >= date('now')`
      ).bind(targetUserId).all();
      (lifeEventRows?.results || []).forEach((r) => {
        const typeName = r.leave_type;
        data.push({
          type: typeName,
          year,
          total: Number(r.days_granted || 0),
          used: Number(r.days_used || 0),
          remain: Number(r.days_remaining || 0),
          validUntil: r.valid_until
        });
      });
      try {
        await Promise.all([
          saveKVCache(env, cacheKey, "leaves_balances", data, {
            userId: targetUserId,
            scopeParams: { userId: targetUserId, year },
            ttl: 3600
            // 1小时
          }),
          saveCache(env, cacheKey, "leaves_balances", data, {
            userId: targetUserId,
            scopeParams: { userId: targetUserId, year }
          })
        ]);
        console.log("[LEAVES] \u2713 \u5047\u671F\u4F59\u989D\u7F13\u5B58\u5DF2\u4FDD\u5B58\uFF08KV+D1\uFF09");
      } catch (err) {
        console.error("[LEAVES] \u2717 \u4F59\u989D\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, year, userId: targetUserId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/leaves") {
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
        const queryUserId = params.get("user_id");
        const cacheKey = generateCacheKey("leaves_list", {
          page,
          perPage,
          q,
          status,
          type,
          dateFrom,
          dateTo,
          userId: queryUserId || me.user_id
        });
        const kvCached = await getKVCache(env, cacheKey);
        if (kvCached && kvCached.data) {
          return jsonResponse(200, {
            ok: true,
            code: "SUCCESS",
            message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
            data: kvCached.data.list,
            meta: { ...kvCached.data.meta, requestId, cache_source: "kv" }
          }, corsHeaders);
        }
        const cached = await getCache(env, cacheKey);
        if (cached && cached.data) {
          saveKVCache(env, cacheKey, "leaves_list", cached.data, { ttl: 3600 }).catch((err) => console.error("[LEAVES] KV\u540C\u6B65\u5931\u8D25:", err));
          return jsonResponse(200, {
            ok: true,
            code: "OK",
            message: "\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
            data: cached.data.list,
            meta: { ...cached.data.meta, requestId, cache_source: "d1" }
          }, corsHeaders);
        }
        const where = ["l.is_deleted = 0"];
        const binds = [];
        if (queryUserId && me.is_admin) {
          where.push("l.user_id = ?");
          binds.push(String(queryUserId));
        } else if (!me.is_admin) {
          where.push("l.user_id = ?");
          binds.push(String(me.user_id));
        }
        if (q) {
          where.push("l.leave_type LIKE ?");
          binds.push(`%${q}%`);
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
          `SELECT l.leave_id, l.leave_type, l.start_date, l.end_date, l.unit, l.amount, l.start_time, l.end_time, l.status, l.submitted_at
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
          startTime: r.start_time || null,
          endTime: r.end_time || null,
          status: r.status,
          submittedAt: r.submitted_at
        }));
        const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
        const cacheData = { list: data, meta: { page, perPage, total, hasNext: offset + perPage < total } };
        try {
          await Promise.all([
            saveKVCache(env, cacheKey, "leaves_list", cacheData, { ttl: 3600 }),
            saveCache(env, cacheKey, "leaves_list", cacheData, {
              userId: queryUserId || String(me.user_id),
              scopeParams: { page, perPage, q, status, type, dateFrom, dateTo }
            })
          ]);
          console.log("[LEAVES] \u2713 \u5047\u671F\u5217\u8868\u5DF2\u4FDD\u5B58\u5230 KV+D1 \u7F13\u5B58");
        } catch (err) {
          console.error("[LEAVES] \u2717 \u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
        }
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
      const amount = Number(body?.amount);
      const start_time = String(body?.start_time || "").trim();
      const end_time = String(body?.end_time || "").trim();
      const errors = [];
      if (!leave_type) errors.push({ field: "leave_type", message: "\u5FC5\u9078\u5047\u5225" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push({ field: "start_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
      if (!Number.isFinite(amount) || amount <= 0) errors.push({ field: "amount", message: "\u9700\u5927\u65BC 0" });
      if (Math.abs(amount * 2 - Math.round(amount * 2)) > 1e-9) {
        errors.push({ field: "amount", message: "\u8ACB\u5047\u5C0F\u6642\u6578\u5FC5\u9808\u662F 0.5 \u7684\u500D\u6578\uFF08\u4F8B\u5982\uFF1A0.5\u30011\u30011.5\u30012\uFF09" });
      }
      if (!/^\d{2}:\d{2}$/.test(start_time)) errors.push({ field: "start_time", message: "\u8ACB\u9078\u64C7\u958B\u59CB\u6642\u9593\uFF08\u683C\u5F0F HH:MM\uFF09" });
      if (!/^\d{2}:\d{2}$/.test(end_time)) errors.push({ field: "end_time", message: "\u8ACB\u9078\u64C7\u7D50\u675F\u6642\u9593\uFF08\u683C\u5F0F HH:MM\uFF09" });
      if (start_time && /^\d{2}:\d{2}$/.test(start_time)) {
        const [h, m] = start_time.split(":").map(Number);
        if (m !== 0 && m !== 30) errors.push({ field: "start_time", message: "\u6642\u9593\u5FC5\u9808\u662F\u6574\u9EDE\u6216\u534A\u9EDE\uFF08\u5982 9:00\u30019:30\uFF09" });
      }
      if (end_time && /^\d{2}:\d{2}$/.test(end_time)) {
        const [h, m] = end_time.split(":").map(Number);
        if (m !== 0 && m !== 30) errors.push({ field: "end_time", message: "\u6642\u9593\u5FC5\u9808\u662F\u6574\u9EDE\u6216\u534A\u9EDE\uFF08\u5982 9:00\u30019:30\uFF09" });
      }
      const femaleOnlyLeaveTypes = ["maternity", "menstrual", "prenatal_checkup"];
      const maleOnlyLeaveTypes = ["paternity"];
      if (femaleOnlyLeaveTypes.includes(leave_type) && me.gender === "M") {
        errors.push({ field: "leave_type", message: "\u6B64\u5047\u5225\u50C5\u9650\u5973\u6027" });
      }
      if (maleOnlyLeaveTypes.includes(leave_type) && me.gender === "F") {
        errors.push({ field: "leave_type", message: "\u6B64\u5047\u5225\u50C5\u9650\u7537\u6027" });
      }
      const lifeEventLeaveTypes = ["marriage", "funeral", "maternity", "prenatal_checkup", "paternity"];
      if (lifeEventLeaveTypes.includes(leave_type)) {
        const daysNeeded = amount / 8;
        const grantRow = await env.DATABASE.prepare(
          `SELECT SUM(days_remaining) as available FROM LifeEventLeaveGrants 
					 WHERE user_id = ? AND leave_type = ? AND status = 'active' 
					 AND date(valid_until) >= date('now')`
        ).bind(String(me.user_id), leave_type).first();
        const availableDays = Number(grantRow?.available || 0);
        if (availableDays < daysNeeded) {
          errors.push({ field: "leave_type", message: `${leave_type}\u9918\u984D\u4E0D\u8DB3\uFF0C\u8ACB\u5148\u767B\u8A18\u751F\u6D3B\u4E8B\u4EF6\u3002\u5269\u9918\uFF1A${availableDays}\u65E5\uFF0C\u9700\u8981\uFF1A${daysNeeded}\u65E5` });
        }
      }
      if (leave_type === "comp") {
        const hoursNeeded = amount;
        const compGrants = await env.DATABASE.prepare(
          `SELECT grant_id, hours_remaining FROM CompensatoryLeaveGrants 
					 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0 
					 ORDER BY generated_date ASC`
        ).bind(String(me.user_id)).all();
        const totalAvailable = (compGrants?.results || []).reduce((sum, g) => sum + Number(g.hours_remaining || 0), 0);
        if (totalAvailable < hoursNeeded) {
          errors.push({ field: "amount", message: `\u88DC\u4F11\u4E0D\u8DB3\uFF08\u5269\u9918 ${totalAvailable} \u5C0F\u6642\uFF0C\u9700\u8981 ${hoursNeeded} \u5C0F\u6642\uFF09` });
        }
      }
      if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
      try {
        await env.DATABASE.prepare(
          "INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, start_time, end_time, status, submitted_at, reviewed_at, reviewed_by) VALUES (?, ?, ?, ?, 'hour', ?, ?, ?, 'approved', datetime('now'), datetime('now'), ?)"
        ).bind(String(me.user_id), leave_type, start_date, start_date, amount, start_time || null, end_time || null, String(me.user_id)).run();
        const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
        const leaveId = String(idRow?.id);
        if (leave_type === "comp") {
          const hoursNeeded = amount;
          const compGrants = await env.DATABASE.prepare(
            `SELECT grant_id, hours_remaining FROM CompensatoryLeaveGrants 
						 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0 
						 ORDER BY generated_date ASC`
          ).bind(String(me.user_id)).all();
          let remaining = hoursNeeded;
          for (const grant of compGrants?.results || []) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, Number(grant.hours_remaining || 0));
            const newRemaining = Number(grant.hours_remaining || 0) - deduct;
            const newUsed = (await env.DATABASE.prepare(`SELECT hours_used FROM CompensatoryLeaveGrants WHERE grant_id = ?`).bind(grant.grant_id).first())?.hours_used || 0;
            const newStatus = newRemaining <= 0 ? "fully_used" : "active";
            await env.DATABASE.prepare(
              `UPDATE CompensatoryLeaveGrants 
							 SET hours_used = ?, hours_remaining = ?, status = ? 
							 WHERE grant_id = ?`
            ).bind(Number(newUsed) + deduct, newRemaining, newStatus, grant.grant_id).run();
            remaining -= deduct;
          }
        }
        Promise.all([
          invalidateCacheByType(env, "leaves_list", { userId: String(me.user_id) }),
          invalidateCacheByType(env, "leaves_balances", { userId: String(me.user_id) })
        ]).catch((err) => console.error("[LEAVES] \u5931\u6548\u7F13\u5B58\u5931\u8D25:", err));
        return jsonResponse(201, { ok: true, code: "CREATED", message: "\u7533\u8ACB\u6210\u529F", data: { leaveId }, meta: { requestId } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
  }
  if (path === "/internal/api/v1/admin/cron/execute" && method === "POST") {
    if (!me?.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const jobName = String(body?.job_name || "").trim();
    if (jobName !== "comp_leave_expiry") {
      return jsonResponse(400, { ok: false, code: "INVALID_JOB", message: "\u4E0D\u652F\u63F4\u7684 Job \u540D\u7A31", meta: { requestId } }, corsHeaders);
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
      const expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, "0")}`;
      const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const expiredGrants = await env.DATABASE.prepare(
        `SELECT g.grant_id, g.user_id, g.hours_remaining, g.original_rate, u.base_salary
				 FROM CompensatoryLeaveGrants g
				 LEFT JOIN Users u ON g.user_id = u.user_id
				 WHERE g.expiry_date = ? AND g.status = 'active' AND g.hours_remaining > 0`
      ).bind(expiryDate).all();
      let processedCount = 0;
      const grantIds = [];
      for (const grant of expiredGrants?.results || []) {
        const baseSalary = Number(grant.base_salary || 0);
        const hourlyRate = baseSalary / 240;
        const hours = Number(grant.hours_remaining || 0);
        const rate = Number(grant.original_rate || 1);
        const amountCents = Math.round(hours * hourlyRate * rate * 100);
        await env.DATABASE.prepare(
          `INSERT INTO CompensatoryOvertimePay 
					 (user_id, year_month, hours_expired, amount_cents, source_grant_ids)
					 VALUES (?, ?, ?, ?, ?)`
        ).bind(
          String(grant.user_id),
          currentMonth,
          hours,
          amountCents,
          JSON.stringify([grant.grant_id])
        ).run();
        await env.DATABASE.prepare(
          `UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
        ).bind(grant.grant_id).run();
        grantIds.push(grant.grant_id);
        processedCount++;
      }
      await env.DATABASE.prepare(
        `INSERT INTO CronJobExecutions 
				 (job_name, status, executed_at, details)
				 VALUES (?, 'success', datetime('now'), ?)`
      ).bind(jobName, JSON.stringify({
        expiryDate,
        processedCount,
        grantIds,
        currentMonth
      })).run();
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: `\u5DF2\u8655\u7406 ${processedCount} \u7B46\u5230\u671F\u88DC\u4F11`,
        data: {
          processedCount,
          expiryDate,
          currentMonth
        },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      try {
        await env.DATABASE.prepare(
          `INSERT INTO CronJobExecutions 
					 (job_name, status, executed_at, error_message)
					 VALUES (?, 'failed', datetime('now'), ?)`
        ).bind(jobName, String(err)).run();
      } catch (_) {
      }
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/cron/history" && method === "GET") {
    if (!me?.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    }
    try {
      const params = url.searchParams;
      const jobName = params.get("job_name") || "";
      const page = Math.max(1, parseInt(params.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const whereSql = jobName ? "WHERE job_name = ?" : "";
      const binds = jobName ? [jobName] : [];
      const totalRow = await env.DATABASE.prepare(
        `SELECT COUNT(1) AS total FROM CronJobExecutions ${whereSql}`
      ).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT execution_id, job_name, status, executed_at, details, error_message
				 FROM CronJobExecutions ${whereSql}
				 ORDER BY executed_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        id: r.execution_id,
        jobName: r.job_name,
        status: r.status,
        executedAt: r.executed_at,
        details: r.details ? JSON.parse(r.details) : null,
        errorMessage: r.error_message
      }));
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F",
        data,
        meta: {
          requestId,
          page,
          perPage,
          total: Number(totalRow?.total || 0)
        }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/leaves/life-events" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const event_type = String(body?.event_type || "").trim();
    const event_date = String(body?.event_date || "").trim();
    const notes = String(body?.notes || "").trim();
    const user_id = body?.user_id ? String(body.user_id) : String(me.user_id);
    if (!me.is_admin && user_id !== String(me.user_id)) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    if (!event_type) errors.push({ field: "event_type", message: "\u8ACB\u9078\u64C7\u4E8B\u4EF6\u985E\u578B" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) errors.push({ field: "event_date", message: "\u65E5\u671F\u683C\u5F0F YYYY-MM-DD" });
    const eventRules = {
      marriage: { leave_type: "marriage", days: 8, valid_days: 365, name: "\u5A5A\u5047", gender: null },
      funeral_parent: { leave_type: "funeral", days: 8, valid_days: 365, name: "\u55AA\u5047\uFF08\u7236\u6BCD/\u990A\u7236\u6BCD/\u7E7C\u7236\u6BCD/\u914D\u5076\u55AA\u4EA1\uFF09", gender: null },
      funeral_grandparent: { leave_type: "funeral", days: 6, valid_days: 365, name: "\u55AA\u5047\uFF08\u7956\u7236\u6BCD/\u5B50\u5973/\u914D\u5076\u4E4B\u7236\u6BCD\u55AA\u4EA1\uFF09", gender: null },
      funeral_sibling: { leave_type: "funeral", days: 3, valid_days: 365, name: "\u55AA\u5047\uFF08\u66FE\u7956\u7236\u6BCD/\u5144\u5F1F\u59CA\u59B9/\u914D\u5076\u4E4B\u7956\u7236\u6BCD\u55AA\u4EA1\uFF09", gender: null },
      maternity: { leave_type: "maternity", days: 56, valid_days: 180, name: "\u7522\u5047\uFF08\u5206\u5A29\u524D\u5F8C8\u9031\uFF09", gender: "F" },
      miscarriage: { leave_type: "maternity", days: 28, valid_days: 180, name: "\u7522\u5047\uFF08\u598A\u5A203\u500B\u6708\u4EE5\u4E0A\u6D41\u75224\u9031\uFF09", gender: "F" },
      pregnancy: { leave_type: "prenatal_checkup", days: 7, valid_days: 365, name: "\u7522\u6AA2\u5047\uFF08\u598A\u5A20\u671F\u95937\u65E5\uFF09", gender: "F" },
      paternity: { leave_type: "paternity", days: 7, valid_days: 60, name: "\u966A\u7522\u6AA2\u53CA\u966A\u7522\u5047\uFF08\u914D\u5076\u5206\u5A29\u6216\u61F7\u5B557\u65E5\uFF09", gender: "M" }
    };
    const rule = eventRules[event_type];
    if (!rule) {
      errors.push({ field: "event_type", message: "\u7121\u6548\u7684\u4E8B\u4EF6\u985E\u578B" });
    }
    if (rule && rule.gender) {
      const userRow = await env.DATABASE.prepare(
        "SELECT gender FROM Users WHERE user_id = ?"
      ).bind(user_id).first();
      const userGender = userRow?.gender;
      if (userGender !== rule.gender) {
        const genderName = rule.gender === "F" ? "\u5973\u6027" : "\u7537\u6027";
        errors.push({ field: "event_type", message: `\u6B64\u4E8B\u4EF6\u985E\u578B\u50C5\u9650${genderName}` });
      }
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const eventDateObj = new Date(event_date);
      const validFrom = event_date;
      const validUntilObj = new Date(eventDateObj);
      validUntilObj.setDate(validUntilObj.getDate() + rule.valid_days);
      const validUntil = validUntilObj.toISOString().slice(0, 10);
      await env.DATABASE.prepare(
        `INSERT INTO LifeEventLeaveGrants 
				 (user_id, event_type, event_date, leave_type, days_granted, days_used, days_remaining, 
				  valid_from, valid_until, notes, status, created_by) 
				 VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', ?)`
      ).bind(
        user_id,
        event_type,
        event_date,
        rule.leave_type,
        rule.days,
        rule.days,
        validFrom,
        validUntil,
        notes || null,
        String(me.user_id)
      ).run();
      const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      const grantId = String(idRow?.id);
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: `\u5DF2\u767B\u8A18${rule.name}\uFF0C\u6388\u4E88 ${rule.days} \u5929\u5047\u671F`,
        data: { grantId, daysGranted: rule.days, validUntil },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleLeaves, "handleLeaves");

// src/api/dev.js
async function handleDevSeeding(request, env, requestId, path) {
  if (env.APP_ENV === "prod") {
    return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } });
  }
  const corsHeaders = getCorsHeadersForRequest(request, env);
  if (path === "/internal/api/v1/admin/dev-debug-cookie") {
    const cookieName = String(env.SESSION_COOKIE_NAME || "session");
    const sid = getCookie(request, cookieName);
    let exists = null;
    let exp = null;
    if (sid && env.DATABASE) {
      const row = await env.DATABASE.prepare("SELECT id, expires_at FROM sessions WHERE id = ? LIMIT 1").bind(sid).first();
      exists = !!row;
      exp = row?.expires_at || null;
    }
    return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { cookieName, sid, exists, exp }, meta: { requestId } }, corsHeaders);
  }
  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
  }
  if (path === "/internal/api/v1/admin/dev-seed-user") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const username = (body?.username || "").trim().toLowerCase();
    const name = (body?.name || "\u6E2C\u8A66\u7528\u6236").trim();
    const password = body?.password || "changeme";
    let email = (body?.email || "").trim();
    if (!username || !password) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "username/password \u5FC5\u586B", meta: { requestId } }, corsHeaders);
    }
    try {
      const exists = await env.DATABASE.prepare("SELECT user_id FROM Users WHERE LOWER(username) = ? LIMIT 1").bind(username).first();
      if (!email) email = `${username}@example.com`;
      const passwordHash = await hashPasswordPBKDF2(password);
      let userId;
      if (exists) {
        await env.DATABASE.prepare("UPDATE Users SET username = ?, name = ?, email = ?, password_hash = ?, updated_at = ? WHERE user_id = ?").bind(username, name, email, passwordHash, (/* @__PURE__ */ new Date()).toISOString(), exists.user_id).run();
        userId = exists.user_id;
      } else {
        await env.DATABASE.prepare("INSERT INTO Users (username, password_hash, name, email, gender, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'M', date('now'), datetime('now'), datetime('now'))").bind(username, passwordHash, name, email).run();
        const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
        userId = idRow?.id;
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        await env.DATABASE.prepare(
          "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'sick', ?, 30, 0, 30, datetime('now'))"
        ).bind(userId, currentYear).run();
        await env.DATABASE.prepare(
          "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'personal', ?, 14, 0, 14, datetime('now'))"
        ).bind(userId, currentYear).run();
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB/\u66F4\u65B0\u6E2C\u8A66\u7528\u6236", data: { username, email, userId }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/dev-seed-clients") {
    try {
      await env.DATABASE.prepare("INSERT OR IGNORE INTO CustomerTags(tag_id, tag_name, tag_color) VALUES (1,'\u4E00\u822C','#3b5bdb'),(2,'VIP','#ef4444')").run();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        "INSERT OR IGNORE INTO Clients(client_id, company_name, tax_registration_number, assignee_user_id, phone, email, created_at, updated_at) VALUES ('c_001','\u661F\u6CB3\u8CC7\u8A0A\u80A1\u4EFD\u6709\u9650\u516C\u53F8','12345678',1,'02-1234-5678','contact@galaxy.com',?,?),('c_002','\u677E\u67CF\u6709\u9650\u516C\u53F8','87654321',1,'02-8765-4321','service@pine.com',?,?),('c_003','\u5B89\u548C\u9867\u554F\u80A1\u4EFD\u6709\u9650\u516C\u53F8','11223344',1,'02-5566-7788','info@anhe.com',?,?)"
      ).bind(now, now, now, now, now, now).run();
      await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments(client_id, tag_id) VALUES ('c_001',1),('c_001',2),('c_002',2),('c_003',1)").run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u5BA2\u6236/\u6A19\u7C64", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body);
    }
  }
  if (path === "/internal/api/v1/admin/dev-seed-tasks") {
    try {
      await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientServices(client_id, service_id, status) VALUES ('c_001',1,'active'),('c_002',1,'active'),('c_003',1,'active')").run();
      const cs1 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_001' LIMIT 1").first();
      const cs2 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_002' LIMIT 1").first();
      const cs3 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_003' LIMIT 1").first();
      const today = /* @__PURE__ */ new Date();
      const fmt = /* @__PURE__ */ __name((d) => new Date(today.getTime() + d * 864e5).toISOString().slice(0, 10), "fmt");
      await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs1.client_service_id, "\u661F\u6CB3\u8CC7\u8A0A \u2212 12 \u6708\u8A18\u5E33", fmt(2), "pending", 1).run();
      await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs2.client_service_id, "\u677E\u67CF \u2212 12 \u6708\u71DF\u696D\u7A05", fmt(-1), "in_progress", 1).run();
      await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs3.client_service_id, "\u5B89\u548C \u2212 \u5E74\u5EA6\u7D50\u7B97", fmt(10), "completed", 1).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB\u6E2C\u8A66\u4EFB\u52D9", meta: { requestId } });
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body);
    }
  }
  if (path === "/internal/api/v1/admin/dev-seed-timesheets") {
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
    try {
      const y = (/* @__PURE__ */ new Date()).getFullYear();
      await env.DATABASE.prepare(
        "INSERT OR REPLACE INTO LeaveBalances(user_id, leave_type, year, total, used, remain, updated_at) VALUES (1,'annual',?,30,3,27,datetime('now')),(1,'sick',?,30,1,29,datetime('now')),(1,'personal',?,14,0,14,datetime('now'))"
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
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleDevSeeding, "handleDevSeeding");

// src/api/overhead.js
async function handleOverhead(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/admin/overhead-types") {
    if (method === "GET") {
      try {
        const params = url.searchParams;
        const page = Math.max(1, parseInt(params.get("page") || "1", 10));
        const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
        const offset = (page - 1) * perPage;
        const q = (params.get("q") || "").trim();
        const category = (params.get("category") || "").trim();
        const isActive = params.get("is_active");
        const where = [];
        const binds = [];
        if (q) {
          where.push("(cost_code LIKE ? OR cost_name LIKE ?)");
          binds.push(`%${q}%`, `%${q}%`);
        }
        if (category && ["fixed", "variable"].includes(category)) {
          where.push("category = ?");
          binds.push(category);
        }
        if (isActive === "0" || isActive === "1") {
          where.push("is_active = ?");
          binds.push(parseInt(isActive, 10));
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM OverheadCostTypes ${whereSql}`).bind(...binds).first();
        const total = Number(countRow?.total || 0);
        const rows = await env.DATABASE.prepare(
          `SELECT cost_type_id, cost_code, cost_name, category, allocation_method, description, is_active, display_order, created_at, updated_at
					 FROM OverheadCostTypes
					 ${whereSql}
					 ORDER BY display_order ASC, cost_code ASC
					 LIMIT ? OFFSET ?`
        ).bind(...binds, perPage, offset).all();
        const data = (rows?.results || []).map((r) => ({
          id: r.cost_type_id,
          code: r.cost_code,
          name: r.cost_name,
          category: r.category,
          allocationMethod: r.allocation_method,
          description: r.description || "",
          isActive: r.is_active === 1,
          displayOrder: Number(r.display_order || 0),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
    if (method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
      const code = String(body?.cost_code || body?.code || "").trim();
      const name = String(body?.cost_name || body?.name || "").trim();
      const category = String(body?.category || "").trim();
      const methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
      const description = (body?.description || "").trim();
      const errors = [];
      if (!/^[A-Z0-9_]{1,20}$/.test(code)) errors.push({ field: "cost_code", message: "\u683C\u5F0F\u9700\u70BA A-Z0-9_\uFF0C\u226420" });
      if (!name || name.length > 50) errors.push({ field: "cost_name", message: "\u5FC5\u586B\u4E14 \u2264 50" });
      if (!["fixed", "variable"].includes(category)) errors.push({ field: "category", message: "\u4E0D\u5408\u6CD5" });
      if (!["per_employee", "per_hour", "per_revenue"].includes(methodVal)) errors.push({ field: "allocation_method", message: "\u4E0D\u5408\u6CD5" });
      if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
      try {
        await env.DATABASE.prepare(
          "INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active) VALUES (?, ?, ?, ?, ?, 1)"
        ).bind(code, name, category, methodVal, description).run();
        const row = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ?").bind(code).first();
        return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data: { id: row?.cost_type_id, code, name, category, allocationMethod: methodVal }, meta: { requestId } }, corsHeaders);
      } catch (err) {
        const msg = String(err || "");
        if (msg.includes("UNIQUE") && msg.includes("cost_code")) {
          return jsonResponse(409, { ok: false, code: "CONFLICT", message: "\u4EE3\u78BC\u5DF2\u5B58\u5728", meta: { requestId } }, corsHeaders);
        }
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
  }
  if (path === "/internal/api/v1/admin/overhead-costs") {
    if (method === "GET") {
      try {
        const params = url.searchParams;
        const year = parseInt(params.get("year") || "0", 10);
        const month = parseInt(params.get("month") || "0", 10);
        if (!Number.isFinite(year) || year < 2e3 || month < 1 || month > 12) {
          return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "year/month \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
        }
        const q = (params.get("q") || "").trim();
        const where = ["m.is_deleted = 0", "m.year = ?", "m.month = ?"];
        const binds = [year, month];
        if (q) {
          where.push("(t.cost_code LIKE ? OR t.cost_name LIKE ? OR m.notes LIKE ?)");
          binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        const whereSql = `WHERE ${where.join(" AND ")}`;
        const rows = await env.DATABASE.prepare(
          `SELECT m.overhead_id, m.cost_type_id, t.cost_name, t.cost_code, t.category, t.allocation_method, m.amount, m.notes, m.recorded_by, m.recorded_at, m.updated_at
					 FROM MonthlyOverheadCosts m
					 JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
					 ${whereSql}
					 ORDER BY t.display_order ASC, t.cost_code ASC`
        ).bind(...binds).all();
        const items = (rows?.results || []).map((r) => ({
          id: r.overhead_id,
          costTypeId: r.cost_type_id,
          costName: r.cost_name,
          costCode: r.cost_code,
          category: r.category,
          allocationMethod: r.allocation_method,
          amount: Number(r.amount || 0),
          notes: r.notes || "",
          recordedBy: r.recorded_by,
          recordedAt: r.recorded_at,
          updatedAt: r.updated_at
        }));
        const total = items.reduce((s, x) => s + x.amount, 0);
        const totalFixed = items.filter((x) => x.category === "fixed").reduce((s, x) => s + x.amount, 0);
        const totalVariable = total - totalFixed;
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { year, month, items, total, totalFixed, totalVariable }, meta: { requestId, count: items.length } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
    if (method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
      const cost_type_id = parseInt(body?.cost_type_id, 10);
      const year = parseInt(body?.year, 10);
      const month = parseInt(body?.month, 10);
      const amount = Number(body?.amount);
      const notes = (body?.notes || "").trim();
      const errors = [];
      if (!Number.isFinite(cost_type_id)) errors.push({ field: "cost_type_id", message: "\u5FC5\u586B" });
      if (!Number.isFinite(year) || year < 2e3) errors.push({ field: "year", message: "\u4E0D\u5408\u6CD5" });
      if (!Number.isFinite(month) || month < 1 || month > 12) errors.push({ field: "month", message: "\u4E0D\u5408\u6CD5" });
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) errors.push({ field: "amount", message: "\u9700\u4ECB\u65BC 0 ~ 1e9" });
      if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
      try {
        const t = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_type_id = ? AND is_active = 1 LIMIT 1").bind(cost_type_id).first();
        if (!t) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u6210\u672C\u9805\u76EE\u4E0D\u5B58\u5728\u6216\u672A\u555F\u7528", errors: [{ field: "cost_type_id", message: "\u4E0D\u5B58\u5728\u6216\u672A\u555F\u7528" }], meta: { requestId } }, corsHeaders);
        await env.DATABASE.prepare(
          "INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(cost_type_id, year, month, amount, notes, String(me.user_id)).run();
        const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
        return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data: { id: String(idRow?.id) }, meta: { requestId } }, corsHeaders);
      } catch (err) {
        const msg = String(err || "");
        if (msg.includes("UNIQUE") && msg.includes("MonthlyOverheadCosts")) {
          return jsonResponse(409, { ok: false, code: "CONFLICT", message: "\u8A72\u6708\u4EFD\u5DF2\u6709\u6B64\u9805\u76EE\u8A18\u9304", meta: { requestId } }, corsHeaders);
        }
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
  }
  if (path === "/internal/api/v1/admin/overhead-summary" || path === "/internal/api/v1/admin/overhead-analysis") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const params = url.searchParams;
      const year = parseInt(params.get("year") || "0", 10);
      const month = parseInt(params.get("month") || "0", 10);
      if (!Number.isFinite(year) || year < 2e3 || month < 1 || month > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "year/month \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      }
      const rows = await env.DATABASE.prepare(
        `SELECT t.category, t.cost_type_id, t.cost_name, SUM(m.amount) AS amt
				 FROM MonthlyOverheadCosts m JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
				 WHERE m.is_deleted = 0 AND m.year = ? AND m.month = ?
				 GROUP BY t.category, t.cost_type_id, t.cost_name`
      ).bind(year, month).all();
      const list = rows?.results || [];
      const total = list.reduce((s, r) => s + Number(r.amt || 0), 0);
      const byCategory = { fixed: 0, variable: 0 };
      for (const r of list) {
        byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amt || 0);
      }
      const typeBreakdown = list.map((r) => ({ costTypeId: r.cost_type_id, costName: r.cost_name, amount: Number(r.amt || 0), percentage: total ? Number((Number(r.amt || 0) / total * 100).toFixed(1)) : 0 }));
      const empRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Users WHERE is_deleted = 0").first();
      const employeeCount = Number(empRow?.c || 0);
      const overheadPerEmployee = employeeCount ? Math.round(total / employeeCount) : 0;
      const data = { year, month, total_overhead: total, employee_count: employeeCount, overhead_per_employee: overheadPerEmployee, breakdown_by_category: byCategory, breakdown_by_type: typeBreakdown };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/costs/employee") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const params = url.searchParams;
      const year = parseInt(params.get("year") || "0", 10);
      const month = parseInt(params.get("month") || "0", 10);
      if (!Number.isFinite(year) || year < 2e3 || month < 1 || month > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "year/month \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      }
      const usersRows = await env.DATABASE.prepare(
        "SELECT user_id, full_name, hire_date FROM Users WHERE is_deleted = 0 ORDER BY full_name ASC"
      ).all();
      const users = usersRows?.results || [];
      const employees = [];
      for (const user of users) {
        const userId = user.user_id;
        const annualSalary = 4e4 * 12;
        const annualHours = 2080;
        const leaveBalanceRow = await env.DATABASE.prepare(
          "SELECT annual_leave_balance FROM LeaveBalances WHERE user_id = ? AND year = ?"
        ).bind(userId, year).first();
        const annualLeaveHours = Number(leaveBalanceRow?.annual_leave_balance || 0);
        const actualHours = annualHours - annualLeaveHours;
        const hourlyRate = actualHours > 0 ? annualSalary / actualHours : 0;
        const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
        const timesheetRows = await env.DATABASE.prepare(
          `SELECT work_type, hours
					 FROM Timesheets 
					 WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
        ).bind(userId, yearMonth).all();
        const timesheets = timesheetRows?.results || [];
        const WORK_TYPE_MULTIPLIERS = {
          1: 1,
          // 正常工時
          2: 1.34,
          // 平日加班（前2小時）
          3: 1.67,
          // 平日加班（後2小時）
          4: 1.34,
          // 休息日加班（前2小時）
          5: 1.67,
          // 休息日加班（第3-8小時）
          6: 2.67,
          // 休息日加班（第9-12小時）
          7: 2,
          // 國定假日加班（8小時內）- 特殊處理（強制補休）
          8: 1.34,
          // 國定假日加班（第9-10小時）
          9: 1.67,
          // 國定假日加班（第11-12小時）
          10: 2,
          // 例假日加班（8小時內）- 特殊處理（強制補休）
          11: 2
          // 例假日加班（第9-12小時）
        };
        const MANDATORY_COMP_LEAVE_TYPES2 = [7, 10];
        let monthHours = 0;
        let weightedHours = 0;
        for (const ts of timesheets) {
          const hours = Number(ts.hours || 0);
          const workTypeId = parseInt(ts.work_type) || 1;
          const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1;
          monthHours += hours;
          if (MANDATORY_COMP_LEAVE_TYPES2.includes(workTypeId)) {
            weightedHours += 8 + 8;
          } else {
            weightedHours += hours * multiplier;
          }
        }
        const laborCost = Math.round(hourlyRate * weightedHours);
        const expiredCompRow = await env.DATABASE.prepare(
          `SELECT SUM(amount_cents) as expired_amount 
					 FROM CompensatoryOvertimePay 
					 WHERE user_id = ? AND year_month = ?`
        ).bind(userId, `${year}-${String(month).padStart(2, "0")}`).first();
        const expiredCompCost = Math.round(Number(expiredCompRow?.expired_amount || 0) / 100);
        const totalLaborCost = laborCost + expiredCompCost;
        const overheadRow = await env.DATABASE.prepare(
          `SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
					 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
        ).bind(year, month).first();
        const totalOverhead = Number(overheadRow?.total || 0);
        const totalMonthHoursRow = await env.DATABASE.prepare(
          `SELECT SUM(hours) as total FROM Timesheets 
					 WHERE year = ? AND month = ? AND is_deleted = 0`
        ).bind(year, month).first();
        const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
        const overheadAllocation = totalMonthHours > 0 ? Math.round(totalOverhead * (monthHours / totalMonthHours)) : 0;
        employees.push({
          userId,
          name: user.full_name,
          annualSalary,
          annualHours,
          annualLeaveHours,
          actualHours,
          hourlyRate: Math.round(hourlyRate),
          monthHours,
          weightedHours,
          laborCost: totalLaborCost,
          expiredCompCost,
          // 補休到期轉加班費
          overheadAllocation,
          totalCost: totalLaborCost + overheadAllocation
        });
      }
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F",
        data: { year, month, employees },
        meta: { requestId, count: employees.length }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/costs/client") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const params = url.searchParams;
      const year = parseInt(params.get("year") || "0", 10);
      const month = parseInt(params.get("month") || "0", 10);
      if (!Number.isFinite(year) || year < 2e3 || month < 1 || month > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "year/month \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      }
      const WORK_TYPE_MULTIPLIERS = {
        1: 1,
        2: 1.34,
        3: 1.67,
        4: 1.34,
        5: 1.67,
        6: 2.67,
        7: 2,
        8: 1.34,
        9: 1.67,
        10: 2,
        11: 2
      };
      const clientsRows = await env.DATABASE.prepare(
        "SELECT client_id, company_name FROM Clients WHERE is_deleted = 0 ORDER BY company_name ASC"
      ).all();
      const clientsList = clientsRows?.results || [];
      const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
      const clients = [];
      for (const client of clientsList) {
        const clientId = client.client_id;
        const timesheetRows = await env.DATABASE.prepare(
          `SELECT ts.user_id, ts.work_type, ts.hours, ts.task_id
					 FROM Timesheets ts
					 JOIN Tasks t ON t.task_id = ts.task_id
					 WHERE t.client_id = ? AND substr(ts.work_date, 1, 7) = ? 
					   AND ts.is_deleted = 0 AND t.is_deleted = 0`
        ).bind(clientId, yearMonth).all();
        const timesheets = timesheetRows?.results || [];
        if (timesheets.length === 0) continue;
        let totalHours = 0;
        let weightedHours = 0;
        let laborCost = 0;
        const taskCount = /* @__PURE__ */ new Set();
        const userHourlyRates = {};
        for (const ts of timesheets) {
          if (!ts.user_id) continue;
          taskCount.add(ts.task_id);
          const hours = Number(ts.hours || 0);
          const workTypeId = parseInt(ts.work_type) || 1;
          const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1;
          totalHours += hours;
          let tsWeightedHours;
          if (MANDATORY_COMP_LEAVE_TYPES.includes(workTypeId)) {
            tsWeightedHours = 8 + 8;
          } else {
            tsWeightedHours = hours * multiplier;
          }
          weightedHours += tsWeightedHours;
          if (!userHourlyRates[ts.user_id]) {
            userHourlyRates[ts.user_id] = 200;
          }
          laborCost += Math.round(userHourlyRates[ts.user_id] * tsWeightedHours);
        }
        const overheadRow = await env.DATABASE.prepare(
          `SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
					 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
        ).bind(year, month).first();
        const totalOverhead = Number(overheadRow?.total || 0);
        const totalMonthHoursRow = await env.DATABASE.prepare(
          `SELECT SUM(hours) as total FROM Timesheets 
					 WHERE year = ? AND month = ? AND is_deleted = 0`
        ).bind(year, month).first();
        const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
        const overheadAllocation = totalMonthHours > 0 ? Math.round(totalOverhead * (totalHours / totalMonthHours)) : 0;
        const revenueRow = await env.DATABASE.prepare(
          `SELECT SUM(amount_cents) as total FROM Receipts 
					 WHERE client_id = ? AND year = ? AND month = ? AND is_deleted = 0`
        ).bind(clientId, year, month).first();
        const revenue = Math.round(Number(revenueRow?.total || 0) / 100);
        if (totalHours > 0 || revenue > 0) {
          clients.push({
            clientId,
            clientName: client.company_name,
            taskCount: taskCount.size,
            totalHours,
            weightedHours,
            laborCost,
            overheadAllocation,
            totalCost: laborCost + overheadAllocation,
            revenue
          });
        }
      }
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F",
        data: { year, month, clients },
        meta: { requestId, count: clients.length }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/costs/task") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const params = url.searchParams;
      const year = parseInt(params.get("year") || "0", 10);
      const month = parseInt(params.get("month") || "0", 10);
      if (!Number.isFinite(year) || year < 2e3 || month < 1 || month > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "year/month \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      }
      const WORK_TYPE_MULTIPLIERS = {
        1: 1,
        2: 1.34,
        3: 1.67,
        4: 1.34,
        5: 1.67,
        6: 2.67,
        7: 2,
        8: 1.34,
        9: 1.67,
        10: 2,
        11: 2
      };
      const MANDATORY_COMP_LEAVE_TYPES2 = [7, 10];
      const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
      const taskRows = await env.DATABASE.prepare(
        `SELECT DISTINCT
					t.task_id, 
					t.title, 
					t.client_id,
					c.company_name,
					t.assigned_to,
					u.full_name as assignee_name
				 FROM Tasks t
				 JOIN Clients c ON c.client_id = t.client_id
				 LEFT JOIN Users u ON u.user_id = t.assigned_to
				 JOIN Timesheets ts ON ts.task_id = t.task_id AND substr(ts.work_date, 1, 7) = ? AND ts.is_deleted = 0
				 WHERE t.is_deleted = 0 AND c.is_deleted = 0
				 ORDER BY c.company_name ASC, t.title ASC`
      ).bind(yearMonth).all();
      const taskList = taskRows?.results || [];
      const totalHoursRow = await env.DATABASE.prepare(
        `SELECT SUM(hours) as total FROM Timesheets 
				 WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
      ).bind(yearMonth).first();
      const totalMonthHours = Number(totalHoursRow?.total || 0);
      const overheadRow = await env.DATABASE.prepare(
        `SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
				 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
      ).bind(year, month).first();
      const totalOverhead = Number(overheadRow?.total || 0);
      const tasks = [];
      for (const task of taskList) {
        const timesheetRows = await env.DATABASE.prepare(
          `SELECT work_type, hours
					 FROM Timesheets 
					 WHERE task_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
        ).bind(task.task_id, yearMonth).all();
        const timesheets = timesheetRows?.results || [];
        let hours = 0;
        let weightedHours = 0;
        for (const ts of timesheets) {
          const tsHours = Number(ts.hours || 0);
          const workTypeId = parseInt(ts.work_type) || 1;
          const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1;
          hours += tsHours;
          if (MANDATORY_COMP_LEAVE_TYPES2.includes(workTypeId)) {
            weightedHours += 8 + 8;
          } else {
            weightedHours += tsHours * multiplier;
          }
        }
        const hourlyRate = 200;
        const laborCost = Math.round(hourlyRate * weightedHours);
        const overheadAllocation = totalMonthHours > 0 ? Math.round(totalOverhead * (hours / totalMonthHours)) : 0;
        tasks.push({
          taskId: task.task_id,
          taskTitle: task.title,
          clientId: task.client_id,
          clientName: task.company_name,
          assigneeId: task.assigned_to,
          assigneeName: task.assignee_name || "\u672A\u6307\u6D3E",
          hours,
          weightedHours,
          laborCost,
          overheadAllocation,
          totalCost: laborCost + overheadAllocation
        });
      }
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6210\u529F",
        data: { year, month, tasks },
        meta: { requestId, count: tasks.length }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleOverhead, "handleOverhead");

// src/api/reports.js
async function handleReports(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  const parseDate = /* @__PURE__ */ __name((s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!m) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : s;
  }, "parseDate");
  const parseYearMonth = /* @__PURE__ */ __name((s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
    return { year: y, month: mo };
  }, "parseYearMonth");
  if (path === "/internal/api/v1/reports/client-cost-analysis") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    try {
      const p = url.searchParams;
      const start = parseDate(p.get("start_date"));
      const end = parseDate(p.get("end_date"));
      const clientId = (p.get("client_id") || "").trim() || null;
      const includeBonus = (p.get("include_year_end_bonus") || "").toLowerCase() === "true";
      if (!start || !end || start > end) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8ACB\u9078\u64C7\u6709\u6548\u65E5\u671F\u5340\u9593", meta: { requestId } }, corsHeaders);
      }
      const workTypeMultipliers = {
        "normal": 1,
        "ot-weekday": 1.34,
        "ot-rest": 1.67,
        "holiday": 2
      };
      const binds = [start, end];
      let where = "t.is_deleted = 0 AND t.work_date >= ? AND t.work_date <= ?";
      if (clientId) {
        where += " AND t.client_id = ?";
        binds.push(clientId);
      }
      const hoursRows = await env.DATABASE.prepare(
        `SELECT t.client_id, t.user_id, t.work_type, SUM(t.hours) AS hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.client_id, t.user_id, t.work_type`
      ).bind(...binds).all();
      const clientUserHours = /* @__PURE__ */ new Map();
      const allUserIds = /* @__PURE__ */ new Set();
      const allClientIds = /* @__PURE__ */ new Set();
      for (const r of hoursRows?.results || []) {
        if (!r.client_id) continue;
        allClientIds.add(r.client_id);
        allUserIds.add(r.user_id);
        if (!clientUserHours.has(r.client_id)) {
          clientUserHours.set(r.client_id, /* @__PURE__ */ new Map());
        }
        const userMap = clientUserHours.get(r.client_id);
        if (!userMap.has(r.user_id)) {
          userMap.set(r.user_id, { actual: 0, weighted: 0, byType: {} });
        }
        const userData = userMap.get(r.user_id);
        const hours = Number(r.hours || 0);
        const multiplier = workTypeMultipliers[r.work_type] || 1;
        userData.actual += hours;
        userData.weighted += hours * multiplier;
        userData.byType[r.work_type] = hours;
      }
      const userSalaries = /* @__PURE__ */ new Map();
      if (allUserIds.size > 0) {
        const userIdArray = Array.from(allUserIds);
        const placeholders = userIdArray.map(() => "?").join(",");
        const salaryRows = await env.DATABASE.prepare(
          `SELECT user_id, username, COALESCE(base_salary, 40000) AS base_salary, 
					 COALESCE(regular_allowance, 0) AS regular_allowance
					 FROM Users WHERE user_id IN (${placeholders})`
        ).bind(...userIdArray).all();
        for (const r of salaryRows?.results || []) {
          const baseSalary = Number(r.base_salary || 4e4);
          const allowance = Number(r.regular_allowance || 0);
          const salaryHourlyRate = (baseSalary + allowance) / 240;
          userSalaries.set(r.user_id, {
            username: r.username,
            base_salary: baseSalary,
            regular_allowance: allowance,
            salary_rate: Number(salaryHourlyRate.toFixed(2))
          });
        }
      }
      const startYm = parseInt(start.slice(0, 4) + start.slice(5, 7), 10);
      const endYm = parseInt(end.slice(0, 4) + end.slice(5, 7), 10);
      const ohRows = await env.DATABASE.prepare(
        `SELECT (year*100+month) AS ym, SUM(amount) AS amt
				 FROM MonthlyOverheadCosts
				 WHERE is_deleted = 0 AND (year*100+month) >= ? AND (year*100+month) <= ?
				 GROUP BY ym`
      ).bind(startYm, endYm).all();
      const totalOverhead = (ohRows?.results || []).reduce((s, r) => s + Number(r.amt || 0), 0);
      const totalActualHours = Array.from(clientUserHours.values()).reduce((sum, userMap) => {
        return sum + Array.from(userMap.values()).reduce((s, u) => s + u.actual, 0);
      }, 0);
      const overheadPerHour = totalActualHours > 0 ? totalOverhead / totalActualHours : 0;
      const warnings = [];
      if (totalOverhead <= 0) warnings.push({ type: "overhead_missing", message: "\u672C\u671F\u9593\u7BA1\u7406\u6210\u672C\u672A\u8F38\u5165" });
      const recBinds = [start, end];
      let recWhere = "is_deleted = 0 AND status != 'cancelled' AND receipt_date >= ? AND receipt_date <= ?";
      if (clientId) {
        recWhere += " AND client_id = ?";
        recBinds.push(clientId);
      }
      const recRows = await env.DATABASE.prepare(
        `SELECT client_id, SUM(total_amount) AS total_receipts
				 FROM Receipts
				 WHERE ${recWhere}
				 GROUP BY client_id`
      ).bind(...recBinds).all();
      const revenueByClient = /* @__PURE__ */ new Map();
      for (const r of recRows?.results || []) {
        revenueByClient.set(r.client_id, Number(r.total_receipts || 0));
        allClientIds.add(r.client_id);
      }
      const nameMap = /* @__PURE__ */ new Map();
      if (allClientIds.size > 0) {
        const clientIdArray = Array.from(allClientIds);
        const placeholders = clientIdArray.map(() => "?").join(",");
        const nameRows = await env.DATABASE.prepare(
          `SELECT client_id, company_name FROM Clients WHERE client_id IN (${placeholders})`
        ).bind(...clientIdArray).all();
        for (const r of nameRows?.results || []) nameMap.set(r.client_id, r.company_name);
      }
      const data = [];
      for (const cid of allClientIds) {
        const userMap = clientUserHours.get(cid) || /* @__PURE__ */ new Map();
        let totalActual = 0;
        let totalWeighted = 0;
        let totalSalaryCost = 0;
        let totalOverheadCost = 0;
        const userBreakdown = [];
        for (const [uid, userData] of userMap.entries()) {
          const userInfo = userSalaries.get(uid) || { username: `User${uid}`, salary_rate: 167 };
          const actual = userData.actual;
          const weighted = userData.weighted;
          const overheadRate = Number(overheadPerHour.toFixed(2));
          const hourlyCostRate = userInfo.salary_rate + overheadRate;
          const salaryCost = Math.round(weighted * userInfo.salary_rate);
          const overheadCost = Math.round(actual * overheadRate);
          const userTotalCost = salaryCost + overheadCost;
          totalActual += actual;
          totalWeighted += weighted;
          totalSalaryCost += salaryCost;
          totalOverheadCost += overheadCost;
          userBreakdown.push({
            user_id: uid,
            username: userInfo.username,
            actual_hours: Number(actual.toFixed(2)),
            weighted_hours: Number(weighted.toFixed(2)),
            hourly_cost_rate: Number(hourlyCostRate.toFixed(2)),
            salary_rate: userInfo.salary_rate,
            overhead_rate: overheadRate,
            total_cost: userTotalCost,
            salary_cost: salaryCost,
            overhead_cost: overheadCost,
            year_end_bonus_allocated: 0,
            // 暫時未實現年終分攤
            year_end_bonus_ratio: 0
          });
        }
        const revenue = revenueByClient.get(cid) || 0;
        const totalCost = totalSalaryCost + totalOverheadCost;
        const grossProfit = revenue - totalCost;
        const margin = revenue > 0 ? Number((grossProfit / revenue * 100).toFixed(1)) : 0;
        data.push({
          client_id: cid,
          company_name: nameMap.get(cid) || cid,
          total_actual_hours: Number(totalActual.toFixed(2)),
          total_weighted_hours: Number(totalWeighted.toFixed(2)),
          cost_breakdown: {
            salary_cost: totalSalaryCost,
            overhead_cost: totalOverheadCost,
            year_end_bonus: 0,
            total_cost: totalCost
          },
          labor_cost: totalCost,
          revenue,
          gross_profit: grossProfit,
          profit_margin: margin,
          cost_percentage: totalCost > 0 ? {
            salary: Number((totalSalaryCost / totalCost * 100).toFixed(1)),
            overhead: Number((totalOverheadCost / totalCost * 100).toFixed(1))
          } : { salary: 0, overhead: 0 },
          user_breakdown: userBreakdown
        });
      }
      data.sort((a, b) => b.profit_margin - a.profit_margin);
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, warnings, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/reports/employee-hours") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const p = url.searchParams;
      const y = parseInt(p.get("year") || "0", 10);
      const m = parseInt(p.get("month") || "0", 10);
      let qUserId = p.get("user_id");
      if (!Number.isFinite(y) || y < 2e3 || !Number.isFinite(m) || m < 1 || m > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8ACB\u9078\u64C7\u67E5\u8A62\u6708\u4EFD", meta: { requestId } }, corsHeaders);
      }
      let userFilterId = null;
      if (!me.is_admin) userFilterId = String(me.user_id);
      else if (qUserId) userFilterId = String(parseInt(qUserId, 10));
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      const whereBase = "t.is_deleted = 0 AND substr(t.work_date,1,7) = ?";
      let where = whereBase;
      const binds = [ym];
      if (userFilterId) {
        where += " AND t.user_id = ?";
        binds.push(userFilterId);
      }
      const aggRows = await env.DATABASE.prepare(
        `SELECT t.user_id, 
					SUM(t.hours) AS total_hours,
					SUM(CASE WHEN t.work_type = 'normal' THEN t.hours ELSE 0 END) AS normal_hours,
					SUM(CASE WHEN t.work_type LIKE 'ot-%' OR t.work_type = 'holiday' THEN t.hours ELSE 0 END) AS overtime_hours,
					SUM(CASE WHEN t.client_id IS NOT NULL THEN t.hours ELSE 0 END) AS billable_hours,
					SUM(CASE WHEN t.client_id IS NULL THEN t.hours ELSE 0 END) AS non_billable_hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.user_id`
      ).bind(...binds).all();
      const dailyRows = await env.DATABASE.prepare(
        `SELECT t.user_id, t.work_date, SUM(t.hours) AS hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.user_id, t.work_date
				 ORDER BY t.work_date ASC`
      ).bind(...binds).all();
      const distRows = await env.DATABASE.prepare(
        `SELECT t.user_id, t.client_id, SUM(t.hours) AS hours
				 FROM Timesheets t
				 WHERE ${where} AND t.client_id IS NOT NULL
				 GROUP BY t.user_id, t.client_id`
      ).bind(...binds).all();
      const userIds = (aggRows?.results || []).map((r) => r.user_id);
      let usersMap = /* @__PURE__ */ new Map();
      if (userIds.length) {
        const placeholders = userIds.map(() => "?").join(",");
        const uRows = await env.DATABASE.prepare(`SELECT user_id, username FROM Users WHERE user_id IN (${placeholders})`).bind(...userIds).all();
        usersMap = new Map((uRows?.results || []).map((r) => [String(r.user_id), r.username]));
      }
      const clientIds = Array.from(new Set((distRows?.results || []).map((r) => r.client_id).filter(Boolean)));
      let clientMap = /* @__PURE__ */ new Map();
      if (clientIds.length) {
        const placeholders = clientIds.map(() => "?").join(",");
        const cRows = await env.DATABASE.prepare(`SELECT client_id, company_name FROM Clients WHERE client_id IN (${placeholders})`).bind(...clientIds).all();
        clientMap = new Map((cRows?.results || []).map((r) => [r.client_id, r.company_name]));
      }
      const dailyByUser = /* @__PURE__ */ new Map();
      for (const r of dailyRows?.results || []) {
        const arr = dailyByUser.get(String(r.user_id)) || [];
        arr.push({ date: r.work_date, hours: Number(r.hours || 0) });
        dailyByUser.set(String(r.user_id), arr);
      }
      const distByUser = /* @__PURE__ */ new Map();
      for (const r of distRows?.results || []) {
        const arr = distByUser.get(String(r.user_id)) || [];
        const hours = Number(r.hours || 0);
        arr.push({ client_id: r.client_id, company_name: clientMap.get(r.client_id) || r.client_id, hours });
        distByUser.set(String(r.user_id), arr);
      }
      const workingDays = 22;
      const data = [];
      for (const r of aggRows?.results || []) {
        const uid = String(r.user_id);
        const total = Number(r.total_hours || 0);
        const normal = Number(r.normal_hours || 0);
        const ot = Number(r.overtime_hours || 0);
        const billable = Number(r.billable_hours || 0);
        const nonBillable = Number(r.non_billable_hours || 0);
        const utilization = workingDays * 8 > 0 ? Number((billable / (workingDays * 8) * 100).toFixed(2)) : 0;
        let dist = distByUser.get(uid) || [];
        const distTotal = dist.reduce((s, x) => s + x.hours, 0) || 1;
        dist = dist.map((x) => ({ client_id: x.client_id, company_name: x.company_name, hours: x.hours, percentage: Number((x.hours / distTotal * 100).toFixed(2)) }));
        const daily = dailyByUser.get(uid) || [];
        data.push({
          user_id: Number(uid),
          username: usersMap.get(uid) || uid,
          total_hours: Number(total.toFixed(2)),
          normal_hours: Number(normal.toFixed(2)),
          overtime_hours: Number(ot.toFixed(2)),
          billable_hours: Number(billable.toFixed(2)),
          non_billable_hours: Number(nonBillable.toFixed(2)),
          utilization_rate: utilization,
          client_distribution: dist,
          daily_hours: daily
        });
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, year: y, month: m } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/reports/payroll-summary") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    try {
      const p = url.searchParams;
      const y = parseInt(p.get("year") || "0", 10);
      const m = parseInt(p.get("month") || "0", 10);
      let userId = p.get("user_id");
      if (!Number.isFinite(y) || y < 2e3 || !Number.isFinite(m) || m < 1 || m > 12) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8ACB\u9078\u64C7\u67E5\u8A62\u6708\u4EFD", meta: { requestId } }, corsHeaders);
      }
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      const run = await env.DATABASE.prepare("SELECT run_id FROM PayrollRuns WHERE month = ? LIMIT 1").bind(ym).first();
      if (!run) {
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { summary: { total_base_salary: 0, total_allowances: 0, total_bonuses: 0, total_overtime_pay: 0, total_gross_salary: 0, total_net_salary: 0 }, by_employee: [] }, meta: { requestId, month: ym } }, corsHeaders);
      }
      let q = "SELECT mp.user_id, u.username, mp.base_salary_cents, mp.regular_allowance_cents, mp.bonus_cents, mp.overtime_cents, mp.total_cents, mp.is_full_attendance FROM MonthlyPayroll mp JOIN Users u ON u.user_id = mp.user_id WHERE mp.run_id = ?";
      const binds = [run.run_id];
      if (userId) {
        q += " AND mp.user_id = ?";
        binds.push(String(parseInt(userId, 10)));
      }
      const rows = await env.DATABASE.prepare(q).bind(...binds).all();
      const list = rows?.results || [];
      const cents = /* @__PURE__ */ __name((v) => Number(v || 0), "cents");
      const toAmt = /* @__PURE__ */ __name((c) => Math.round(c / 100), "toAmt");
      const byEmployee = list.map((r) => ({
        user_id: r.user_id,
        username: r.username,
        base_salary: toAmt(cents(r.base_salary_cents)),
        total_allowances: toAmt(cents(r.regular_allowance_cents)),
        total_bonuses: toAmt(cents(r.bonus_cents)),
        overtime_pay: toAmt(cents(r.overtime_cents)),
        gross_salary: toAmt(cents(r.total_cents)),
        net_salary: toAmt(cents(r.total_cents)),
        has_full_attendance: r.is_full_attendance === 1
      }));
      const sum = /* @__PURE__ */ __name((k) => byEmployee.reduce((s, x) => s + Number(x[k] || 0), 0), "sum");
      const summary = {
        total_base_salary: sum("base_salary"),
        total_allowances: sum("total_allowances"),
        total_bonuses: sum("total_bonuses"),
        total_overtime_pay: sum("overtime_pay"),
        total_gross_salary: sum("gross_salary"),
        total_net_salary: sum("net_salary")
      };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { summary, by_employee: byEmployee }, meta: { requestId, month: ym } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/reports/revenue") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    try {
      const p = url.searchParams;
      const start = parseDate(p.get("start_date"));
      const end = parseDate(p.get("end_date"));
      if (!start || !end || start > end) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8ACB\u9078\u64C7\u6709\u6548\u65E5\u671F\u5340\u9593", meta: { requestId } }, corsHeaders);
      }
      const rows = await env.DATABASE.prepare(
        `SELECT strftime('%Y-%m', receipt_date) AS ym,
					SUM(total_amount) AS receipts,
					SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid
				 FROM Receipts
				 WHERE is_deleted = 0 AND status != 'cancelled' AND receipt_date >= ? AND receipt_date <= ?
				 GROUP BY ym
				 ORDER BY ym`
      ).bind(start, end).all();
      const monthly_trend = (rows?.results || []).map((r) => ({ month: r.ym, receipts: Number(r.receipts || 0), paid: Number(r.paid || 0), outstanding: Math.max(0, Number(r.receipts || 0) - Number(r.paid || 0)) }));
      const total_receipts = monthly_trend.reduce((s, x) => s + x.receipts, 0);
      const total_paid = monthly_trend.reduce((s, x) => s + x.paid, 0);
      const total_outstanding = Math.max(0, total_receipts - total_paid);
      const collection_rate = total_receipts > 0 ? Number((total_paid / total_receipts * 100).toFixed(1)) : 0;
      const byClientRows = await env.DATABASE.prepare(
        `SELECT r.client_id, c.company_name, SUM(r.total_amount) AS total_receipts,
					SUM(CASE WHEN r.status = 'paid' THEN r.total_amount ELSE 0 END) AS total_paid
				 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
				 WHERE r.is_deleted = 0 AND r.status != 'cancelled' AND r.receipt_date >= ? AND r.receipt_date <= ?
				 GROUP BY r.client_id, c.company_name`
      ).bind(start, end).all();
      const by_client = (byClientRows?.results || []).map((r) => ({ client_id: r.client_id, company_name: r.company_name || r.client_id, total_receipts: Number(r.total_receipts || 0), total_paid: Number(r.total_paid || 0), total_outstanding: Math.max(0, Number(r.total_receipts || 0) - Number(r.total_paid || 0)) }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { summary: { total_receipts, total_paid, total_outstanding, collection_rate }, monthly_trend, by_client }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleReports, "handleReports");

// src/api/attachments.js
function b64urlEncode(u8) {
  const b64 = btoa(String.fromCharCode(...u8));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
__name(b64urlEncode, "b64urlEncode");
async function hmacSha256(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}
__name(hmacSha256, "hmacSha256");
function utf8(str) {
  return new TextEncoder().encode(str);
}
__name(utf8, "utf8");
function sanitizeFilename(name) {
  const n = String(name || "");
  return n.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".").slice(0, 200) || "file";
}
__name(sanitizeFilename, "sanitizeFilename");
function extFromFilename(name) {
  const m = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return m ? m[1] : "";
}
__name(extFromFilename, "extFromFilename");
async function handleAttachments(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/attachments/upload-sign") {
    if (method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const entityType = String(body?.entity_type || "").trim();
    const entityId = String(body?.entity_id || "").trim();
    const filenameRaw = String(body?.filename || "").trim();
    const contentType = String(body?.content_type || "").trim().toLowerCase();
    const contentLength = Number(body?.content_length || 0);
    if (!["client", "receipt", "sop", "task"].includes(entityType)) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "entity_type \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
    if (!entityId) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "entity_id \u5FC5\u586B", meta: { requestId } }, corsHeaders);
    if (!filenameRaw) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "filename \u5FC5\u586B", meta: { requestId } }, corsHeaders);
    if (!Number.isFinite(contentLength) || contentLength <= 0) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "content_length \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
    if (contentLength > 10 * 1024 * 1024) return jsonResponse(413, { ok: false, code: "PAYLOAD_TOO_LARGE", message: "\u6A94\u6848\u5927\u5C0F\u8D85\u904E\u9650\u5236\uFF08\u6700\u5927 10MB\uFF09", meta: { requestId } }, corsHeaders);
    const allowedExt = ["pdf", "jpg", "jpeg", "png", "xlsx", "xls", "docx", "doc"];
    const allowedMime = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    const safeName = sanitizeFilename(filenameRaw);
    const ext = extFromFilename(safeName);
    if (!allowedExt.includes(ext)) return jsonResponse(422, { ok: false, code: "INVALID_EXTENSION", message: "\u4E0D\u652F\u63F4\u7684\u526F\u6A94\u540D", meta: { requestId } }, corsHeaders);
    if (!allowedMime.includes(contentType)) return jsonResponse(422, { ok: false, code: "INVALID_FILE_TYPE", message: "\u4E0D\u652F\u63F4\u7684\u6A94\u6848\u578B\u5225", meta: { requestId } }, corsHeaders);
    const limits = { client: 20, receipt: 5, sop: 10, task: 10 };
    const limit = limits[entityType] ?? 20;
    const cntRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Attachments WHERE is_deleted = 0 AND entity_type = ? AND entity_id = ?").bind(entityType, entityId).first();
    if (Number(cntRow?.c || 0) >= limit) return jsonResponse(409, { ok: false, code: "TOO_MANY_FILES", message: `\u5DF2\u9054\u5230\u9644\u4EF6\u6578\u91CF\u4E0A\u9650\uFF08\u6700\u591A ${limit} \u500B\uFF09`, meta: { requestId } }, corsHeaders);
    const envName = String(env.APP_ENV || "dev");
    const now = Math.floor(Date.now() / 1e3);
    const rand = crypto.getRandomValues(new Uint8Array(6));
    const randStr = b64urlEncode(rand);
    const folder = `private/${envName}/attachments/${entityType}_${entityId}`;
    const objectKey = `${folder}/f_${now}_${randStr}.${ext}`;
    const expiresAt = now + 300;
    const payload = {
      objectKey,
      entityType,
      entityId,
      filename: safeName,
      contentType,
      contentLength,
      userId: String(me.user_id),
      exp: expiresAt
    };
    const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
    const pBytes = utf8(JSON.stringify(payload));
    const sig = await hmacSha256(utf8(secret), pBytes);
    const token = `${b64urlEncode(pBytes)}.${b64urlEncode(sig)}`;
    const uploadUrl = `${url.origin}/internal/api/v1/attachments/upload-direct?token=${token}`;
    const data = { uploadUrl, objectKey, headers: { "Content-Type": contentType, "Content-Length": String(contentLength) } };
    return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, expiresAt } }, corsHeaders);
  }
  if (path === "/internal/api/v1/attachments/upload-direct") {
    if (method !== "PUT") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const token = url.searchParams.get("token") || "";
      const parts = token.split(".");
      if (parts.length !== 2) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7C3D\u540D\u7121\u6548", meta: { requestId } }, corsHeaders);
      const pBytes = Uint8Array.from(atob(parts[0].replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
      const sBytes = Uint8Array.from(atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
      const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
      const expected = await hmacSha256(utf8(secret), pBytes);
      if (expected.length !== sBytes.length) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7C3D\u540D\u7121\u6548", meta: { requestId } }, corsHeaders);
      let okSig = 0;
      for (let i = 0; i < expected.length; i++) okSig |= expected[i] ^ sBytes[i];
      if (okSig !== 0) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7C3D\u540D\u7121\u6548", meta: { requestId } }, corsHeaders);
      const payload = JSON.parse(new TextDecoder().decode(pBytes));
      if (!payload || typeof payload !== "object") return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7C3D\u540D\u7121\u6548", meta: { requestId } }, corsHeaders);
      if (payload.exp < Math.floor(Date.now() / 1e3)) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7C3D\u540D\u5DF2\u904E\u671F", meta: { requestId } }, corsHeaders);
      if (String(payload.userId) !== String(me.user_id)) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4E0D\u5141\u8A31\u7684\u4F7F\u7528\u8005", meta: { requestId } }, corsHeaders);
      const reqCt = (request.headers.get("Content-Type") || "").toLowerCase();
      const reqLen = parseInt(request.headers.get("Content-Length") || "0", 10);
      if (reqCt !== String(payload.contentType).toLowerCase()) return jsonResponse(415, { ok: false, code: "INVALID_FILE_TYPE", message: "Content-Type \u4E0D\u5339\u914D", meta: { requestId } }, corsHeaders);
      if (!Number.isFinite(reqLen) || reqLen !== Number(payload.contentLength)) return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "Content-Length \u4E0D\u5339\u914D", meta: { requestId } }, corsHeaders);
      if (!env.R2_BUCKET) return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "R2 \u672A\u7D81\u5B9A", meta: { requestId } }, corsHeaders);
      const cd = `attachment; filename="${sanitizeFilename(payload.filename)}"`;
      await env.R2_BUCKET.put(payload.objectKey, request.body, {
        httpMetadata: { contentType: payload.contentType, contentDisposition: cd },
        customMetadata: { ownerId: String(me.user_id), module: "attachments", entityId: `${payload.entityType}:${payload.entityId}` }
      });
      await env.DATABASE.prepare(
        "INSERT INTO Attachments (entity_type, entity_id, object_key, filename, content_type, size_bytes, uploader_user_id, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(payload.entityType, payload.entityId, payload.objectKey, payload.filename, payload.contentType, String(payload.contentLength), String(me.user_id), (/* @__PURE__ */ new Date()).toISOString()).run();
      const row = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      if (payload.entityType === "task") {
        try {
          const task = await env.DATABASE.prepare(`
						SELECT 
							t.task_id,
							t.task_title,
							cs.client_id,
							cs.service_id,
							t.service_month,
							s.service_code,
							s.service_name
						FROM Tasks t
						LEFT JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
						LEFT JOIN Services s ON cs.service_id = s.service_id
						WHERE t.task_id = ?
					`).bind(payload.entityId).first();
          if (task) {
            let docYear = null;
            let docMonth = null;
            if (task.service_month) {
              const match = task.service_month.match(/^(\d{4})-(\d{2})$/);
              if (match) {
                docYear = parseInt(match[1]);
                docMonth = parseInt(match[2]);
              }
            }
            const category = task.service_code || null;
            const scope = "task";
            let description = `\u4F86\u81EA\u4EFB\u52D9\uFF1A${task.task_title || task.task_id}`;
            if (task.service_name) {
              description += ` | \u670D\u52D9\uFF1A${task.service_name}`;
            }
            if (task.service_month) {
              description += ` | \u671F\u5225\uFF1A${task.service_month}`;
            }
            const nowISO = (/* @__PURE__ */ new Date()).toISOString();
            await env.DATABASE.prepare(`
							INSERT INTO InternalDocuments (
								title,
								description,
								file_name,
								file_url,
								file_size,
								file_type,
								category,
								scope,
								client_id,
								doc_year,
								doc_month,
								task_id,
								tags,
								uploaded_by,
								created_at,
								updated_at,
								is_deleted
							) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
						`).bind(
              payload.filename,
              // title
              description,
              // description (包含任務和服務信息)
              payload.filename,
              // file_name
              payload.objectKey,
              // file_url (使用同一個R2路徑)
              payload.contentLength,
              // file_size
              payload.contentType,
              // file_type
              category,
              // category (自動從任務關聯的服務取得)
              scope,
              // scope (自動設置為'task')
              task.client_id || null,
              // client_id (自動從任務取得)
              docYear,
              // doc_year (自動從service_month解析)
              docMonth,
              // doc_month (自動從service_month解析)
              task.task_id,
              // task_id (關聯任務)
              "\u4EFB\u52D9\u9644\u4EF6",
              // tags (自動標記)
              me.user_id,
              // uploaded_by
              nowISO,
              // created_at
              nowISO
              // updated_at
            ).run();
            console.log(`\u2705 \u4EFB\u52D9\u9644\u4EF6\u5DF2\u81EA\u52D5\u540C\u6B65\u5230\u77E5\u8B58\u5EAB:`);
            console.log(`   - \u6587\u4EF6: ${payload.filename}`);
            console.log(`   - \u4EFB\u52D9: ${task.task_id} (${task.task_title})`);
            console.log(`   - \u670D\u52D9\u985E\u578B: ${category || "\u672A\u8A2D\u5B9A"} (${task.service_name || ""})`);
            console.log(`   - \u5BA2\u6236: ${task.client_id || "\u672A\u8A2D\u5B9A"}`);
            console.log(`   - \u5E74\u6708: ${docYear || "?"}\u5E74${docMonth || "?"}\u6708`);
            console.log(`   - \u9069\u7528\u5C64\u7D1A: ${scope} (\u81EA\u52D5\u8A2D\u7F6E)`);
          }
        } catch (err) {
          console.error(`\u26A0\uFE0F \u4FDD\u5B58\u5230\u77E5\u8B58\u5EAB\u5931\u6557\uFF0C\u4F46\u9644\u4EF6\u5DF2\u4E0A\u50B3:`, err);
        }
      }
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u4E0A\u50B3", data: { attachment_id: row?.id, object_key: payload.objectKey }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/attachments" && method === "GET") {
    try {
      const params = url.searchParams;
      const entityType = (params.get("entity_type") || "").trim();
      const entityId = (params.get("entity_id") || "").trim();
      console.log(JSON.stringify({ level: "info", requestId, action: "get_attachments", entityType, entityId }));
      if (!entityType || !entityId) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "entity_type \u8207 entity_id \u5FC5\u586B", meta: { requestId } }, corsHeaders);
      }
      if (!["client", "receipt", "sop", "task"].includes(entityType)) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "entity_type \u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      }
      const page = Math.max(1, parseInt(params.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const q = (params.get("q") || "").trim();
      const fileType = (params.get("file_type") || "all").trim();
      const dateFrom = (params.get("dateFrom") || "").trim();
      const dateTo = (params.get("dateTo") || "").trim();
      const where = ["is_deleted = 0", "entity_type = ?", "entity_id = ?"];
      const binds = [entityType, entityId];
      if (q) {
        where.push("(filename LIKE ?)");
        binds.push(`%${q}%`);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        where.push("uploaded_at >= ?");
        binds.push(`${dateFrom}T00:00:00.000Z`);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        where.push("uploaded_at <= ?");
        binds.push(`${dateTo}T23:59:59.999Z`);
      }
      if (fileType !== "all") {
        if (fileType === "pdf") {
          where.push("(LOWER(filename) LIKE '%.pdf' OR LOWER(content_type) = 'application/pdf')");
        } else if (fileType === "image") {
          where.push("(LOWER(content_type) LIKE 'image/%' OR LOWER(filename) GLOB '*.jpg' OR LOWER(filename) GLOB '*.jpeg' OR LOWER(filename) GLOB '*.png')");
        } else if (fileType === "excel") {
          where.push("(LOWER(filename) GLOB '*.xls' OR LOWER(filename) GLOB '*.xlsx' OR LOWER(content_type) IN ('application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))");
        } else if (fileType === "word") {
          where.push("(LOWER(filename) GLOB '*.doc' OR LOWER(filename) GLOB '*.docx' OR LOWER(content_type) IN ('application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'))");
        }
      }
      const whereSql = `WHERE ${where.join(" AND ")}`;
      console.log(JSON.stringify({ level: "debug", requestId, whereSql, binds }));
      const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM Attachments ${whereSql}`).bind(...binds).first();
      const total = Number(countRow?.total || 0);
      console.log(JSON.stringify({ level: "debug", requestId, total }));
      const sql = `SELECT a.attachment_id, a.filename, a.content_type, a.size_bytes, a.uploader_user_id, a.uploaded_at
				 FROM Attachments a
				 ${whereSql}
				 ORDER BY a.uploaded_at DESC
				 LIMIT ? OFFSET ?`;
      console.log(JSON.stringify({ level: "debug", requestId, sql: sql.substring(0, 200) }));
      const rows = await env.DATABASE.prepare(sql).bind(...binds, perPage, offset).all();
      console.log(JSON.stringify({ level: "debug", requestId, rowCount: rows?.results?.length || 0 }));
      const uploaderIds = [...new Set((rows?.results || []).map((r) => r.uploader_user_id).filter(Boolean))];
      let uploaderMap = {};
      if (uploaderIds.length > 0) {
        const placeholders = uploaderIds.map(() => "?").join(",");
        const uploaders = await env.DATABASE.prepare(
          `SELECT user_id, name FROM Users WHERE user_id IN (${placeholders})`
        ).bind(...uploaderIds).all();
        uploaders?.results?.forEach((u) => {
          uploaderMap[u.user_id] = u.name;
        });
      }
      const data = (rows?.results || []).map((r) => ({
        id: r.attachment_id,
        filename: r.filename,
        contentType: r.content_type,
        sizeBytes: Number(r.size_bytes || 0),
        uploaderUserId: r.uploader_user_id,
        uploaderName: uploaderMap[r.uploader_user_id] || String(r.uploader_user_id || ""),
        uploadedAt: r.uploaded_at
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/attachments", err: String(err), stack: err.stack }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const matchDownload = path.match(/^\/internal\/api\/v1\/attachments\/(\d+)\/download$/);
  if (method === "GET" && matchDownload) {
    const attachmentId = matchDownload[1];
    try {
      const attachment = await env.DATABASE.prepare(
        `SELECT object_key, filename, content_type FROM Attachments WHERE attachment_id = ? AND is_deleted = 0`
      ).bind(attachmentId).first();
      if (!attachment) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u9644\u4EF6\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      if (!env.R2_BUCKET) {
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "R2 \u672A\u7D81\u5B9A", meta: { requestId } }, corsHeaders);
      }
      const object = await env.R2_BUCKET.get(attachment.object_key);
      if (!object) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A94\u6848\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      return new Response(object.body, {
        headers: {
          "Content-Type": attachment.content_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${attachment.filename}"`,
          ...corsHeaders
        }
      });
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const matchDelete = path.match(/^\/internal\/api\/v1\/attachments\/(\d+)$/);
  if (method === "DELETE" && matchDelete) {
    const attachmentId = matchDelete[1];
    try {
      await env.DATABASE.prepare(
        `UPDATE Attachments SET is_deleted = 1 WHERE attachment_id = ?`
      ).bind(attachmentId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u522A\u9664", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleAttachments, "handleAttachments");

// src/api/sop.js
init_kv_cache_helper();
init_kv_cache_helper();
async function handleSOP(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/sop" && method === "POST") {
    try {
      const body = await request.json();
      const { title, content, category, tags, scope, client_id } = body;
      if (!title || !content) {
        return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u6A19\u984C\u548C\u5167\u5BB9\u70BA\u5FC5\u586B", meta: { requestId } }, corsHeaders);
      }
      if (!scope || scope !== "service" && scope !== "task") {
        return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u5FC5\u9808\u6307\u5B9ASOP\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09", meta: { requestId } }, corsHeaders);
      }
      const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const result = await env.DATABASE.prepare(
        `INSERT INTO SOPDocuments (title, content, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at, is_deleted)
				 VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, 0)`
      ).bind(title, content, category || "", tagsJson, scope, client_id || null, String(me.user_id), now, now).run();
      const sopId = result.meta.last_row_id;
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5275\u5EFA\u6210\u529F", data: { sop_id: sopId }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/sop") {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    try {
      const p = url.searchParams;
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "12", 10)));
      const offset = (page - 1) * perPage;
      const q = (p.get("q") || "").trim();
      const category = (p.get("category") || "").trim();
      const scope = (p.get("scope") || "").trim();
      const clientId = (p.get("client_id") || "").trim();
      const tagsCsv = (p.get("tags") || "").trim();
      const published = (p.get("published") || "all").trim().toLowerCase();
      const cacheKey = generateCacheKey2("sop_list", {
        page,
        perPage,
        q,
        category,
        scope,
        client_id: clientId,
        tags: tagsCsv,
        published
      });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data.items,
          meta: { ...kvCached.data.meta, requestId, cache_source: "kv" }
        }, corsHeaders);
      }
      const where = ["is_deleted = 0"];
      const binds = [];
      if (q) {
        where.push("(title LIKE ? OR tags LIKE ?)");
        binds.push(`%${q}%`, `%${q}%`);
      }
      if (category && category !== "all") {
        where.push("category = ?");
        binds.push(category);
      }
      if (scope && (scope === "service" || scope === "task")) {
        where.push("scope = ?");
        binds.push(scope);
      }
      if (clientId && clientId !== "all") {
        where.push("client_id = ?");
        binds.push(parseInt(clientId));
      }
      if (published !== "all") {
        if (["1", "true", "published"].includes(published)) {
          where.push("is_published = 1");
        } else if (["0", "false", "draft"].includes(published)) {
          where.push("is_published = 0");
        }
      }
      if (tagsCsv) {
        const tagList = tagsCsv.split(",").map((s) => s.trim()).filter(Boolean);
        for (const t of tagList) {
          where.push("(tags LIKE ?)");
          binds.push(`%${t}%`);
        }
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM SOPDocuments ${whereSql}`).bind(...binds).first();
      const total = Number(countRow?.total || 0);
      const rows = await env.DATABASE.prepare(
        `SELECT sop_id, title, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at
				 FROM SOPDocuments
				 ${whereSql}
				 ORDER BY updated_at DESC, sop_id DESC
				 LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const items = (rows?.results || []).map((r) => ({
        id: r.sop_id,
        title: r.title,
        category: r.category || "",
        scope: r.scope || null,
        clientId: r.client_id || null,
        tags: (() => {
          try {
            return JSON.parse(r.tags || "[]");
          } catch (_) {
            return [];
          }
        })(),
        version: Number(r.version || 1),
        isPublished: r.is_published === 1,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
      const cacheData = {
        items,
        meta: { page, perPage, total }
      };
      await saveKVCache(env, cacheKey, "sop_list", cacheData, { ttl: 3600 });
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: items, meta: { requestId, page, perPage, total } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const matchDetail = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
  if (method === "GET" && matchDetail) {
    const sopId = parseInt(matchDetail[1]);
    try {
      const row = await env.DATABASE.prepare(
        `SELECT sop_id, title, content, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at
				 FROM SOPDocuments
				 WHERE sop_id = ? AND is_deleted = 0`
      ).bind(sopId).first();
      if (!row) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "SOP \u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const data = {
        id: row.sop_id,
        title: row.title,
        content: row.content || "",
        category: row.category || "",
        scope: row.scope || null,
        clientId: row.client_id || null,
        tags: (() => {
          try {
            return JSON.parse(row.tags || "[]");
          } catch (_) {
            return [];
          }
        })(),
        version: Number(row.version || 1),
        isPublished: row.is_published === 1,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const matchUpdate = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    const sopId = parseInt(matchUpdate[1]);
    try {
      const body = await request.json();
      const { title, content, category, tags, scope, client_id } = body;
      if (!title || !content) {
        return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u6A19\u984C\u548C\u5167\u5BB9\u70BA\u5FC5\u586B", meta: { requestId } }, corsHeaders);
      }
      const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
      if (!scope || scope !== "service" && scope !== "task") {
        return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u5FC5\u9808\u6307\u5B9ASOP\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09", meta: { requestId } }, corsHeaders);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        `UPDATE SOPDocuments 
				 SET title = ?, content = ?, category = ?, tags = ?, scope = ?, client_id = ?, updated_at = ?, version = version + 1
				 WHERE sop_id = ? AND is_deleted = 0`
      ).bind(title, content, category || "", tagsJson, scope, client_id || null, now, sopId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u66F4\u65B0\u6210\u529F", data: { sop_id: sopId }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const matchDelete = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
  if (method === "DELETE" && matchDelete) {
    const sopId = parseInt(matchDelete[1]);
    try {
      await env.DATABASE.prepare(
        `UPDATE SOPDocuments SET is_deleted = 1, updated_at = ? WHERE sop_id = ?`
      ).bind((/* @__PURE__ */ new Date()).toISOString(), sopId).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u522A\u9664\u6210\u529F", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleSOP, "handleSOP");

// src/api/faq.js
init_kv_cache_helper();
init_kv_cache_helper();
async function handleFAQRequest(request, env, ctx, pathname, me) {
  const method = request.method;
  if (method === "GET" && pathname === "/internal/api/v1/faq") {
    return await getFAQList(request, env, me);
  }
  if (method === "GET" && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split("/").pop());
    return await getFAQById(env, faqId, me);
  }
  if (method === "POST" && pathname === "/internal/api/v1/faq") {
    return await createFAQ(request, env, me);
  }
  if (method === "PUT" && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split("/").pop());
    return await updateFAQ(request, env, faqId, me);
  }
  if (method === "DELETE" && pathname.match(/^\/internal\/api\/v1\/faq\/\d+$/)) {
    const faqId = parseInt(pathname.split("/").pop());
    return await deleteFAQ(env, faqId, me);
  }
  return null;
}
__name(handleFAQRequest, "handleFAQRequest");
async function getFAQList(request, env, me) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const perPage = parseInt(url.searchParams.get("perPage")) || 20;
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const scope = url.searchParams.get("scope") || "";
    const clientId = url.searchParams.get("client_id") || "";
    const tags = url.searchParams.get("tags") || "";
    const cacheKey = generateCacheKey2("faq_list", {
      page,
      perPage,
      q,
      category,
      scope,
      client_id: clientId,
      tags
    });
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached) {
      return new Response(JSON.stringify({
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data.items,
        meta: { ...kvCached.data.meta, cache_source: "kv" }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const offset = (page - 1) * perPage;
    let whereClauses = ["is_deleted = 0"];
    const params = [];
    if (q) {
      whereClauses.push("(question LIKE ? OR answer LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category && category !== "all") {
      whereClauses.push("category = ?");
      params.push(category);
    }
    if (scope && (scope === "service" || scope === "task")) {
      whereClauses.push("scope = ?");
      params.push(scope);
    }
    if (clientId && clientId !== "all") {
      whereClauses.push("client_id = ?");
      params.push(parseInt(clientId));
    }
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      tagList.forEach((tag) => {
        whereClauses.push("tags LIKE ?");
        params.push(`%${tag}%`);
      });
    }
    const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
    const countSQL = `SELECT COUNT(*) as total FROM InternalFAQ ${whereSQL}`;
    const countResult = await env.DATABASE.prepare(countSQL).bind(...params).first();
    const total = countResult?.total || 0;
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
    const results = await env.DATABASE.prepare(dataSQL).bind(...params, perPage, offset).all();
    const faqs = (results.results || []).map((row) => ({
      faq_id: row.faq_id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      scope: row.scope || null,
      clientId: row.client_id || null,
      tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    const cacheData = {
      items: faqs,
      meta: { total, page, perPage }
    };
    await saveKVCache(env, cacheKey, "faq_list", cacheData, { ttl: 3600 });
    return new Response(JSON.stringify({
      ok: true,
      data: faqs,
      meta: { total, page, perPage }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u83B7\u53D6FAQ\u5217\u8868\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u83B7\u53D6FAQ\u5217\u8868\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(getFAQList, "getFAQList");
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
        error: "FAQ\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const faq = {
      faq_id: result.faq_id,
      question: result.question,
      answer: result.answer,
      category: result.category,
      scope: result.scope || null,
      clientId: result.client_id || null,
      tags: result.tags ? result.tags.split(",").map((t) => t.trim()) : [],
      createdBy: result.created_by,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
    return new Response(JSON.stringify({
      ok: true,
      data: faq
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u83B7\u53D6FAQ\u8BE6\u60C5\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u83B7\u53D6FAQ\u8BE6\u60C5\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(getFAQById, "getFAQById");
async function createFAQ(request, env, me) {
  try {
    const body = await request.json();
    const { question, answer, category, scope, client_id, tags } = body;
    if (!question || !answer) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u95EE\u9898\u548C\u7B54\u6848\u4E3A\u5FC5\u586B\u9879"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!scope || scope !== "service" && scope !== "task") {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u5FC5\u9808\u6307\u5B9AFAQ\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const tagsStr = Array.isArray(tags) ? tags.join(",") : tags || "";
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [],
        createdBy: me?.user_id,
        createdAt: now,
        updatedAt: now
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u521B\u5EFAFAQ\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u521B\u5EFAFAQ\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(createFAQ, "createFAQ");
async function updateFAQ(request, env, faqId, me) {
  try {
    const body = await request.json();
    const { question, answer, category, scope, client_id, tags } = body;
    const existing = await env.DATABASE.prepare(
      "SELECT faq_id FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0"
    ).bind(faqId).first();
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: "FAQ\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!question || !answer) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u95EE\u9898\u548C\u7B54\u6848\u4E3A\u5FC5\u586B\u9879"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!scope || scope !== "service" && scope !== "task") {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u5FC5\u9808\u6307\u5B9AFAQ\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const tagsStr = Array.isArray(tags) ? tags.join(",") : tags || "";
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [],
        updatedAt: now
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u66F4\u65B0FAQ\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u66F4\u65B0FAQ\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(updateFAQ, "updateFAQ");
async function deleteFAQ(env, faqId, me) {
  try {
    const existing = await env.DATABASE.prepare(
      "SELECT faq_id FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0"
    ).bind(faqId).first();
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: "FAQ\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.DATABASE.prepare(`
      UPDATE InternalFAQ
      SET is_deleted = 1, updated_at = ?
      WHERE faq_id = ?
    `).bind((/* @__PURE__ */ new Date()).toISOString(), faqId).run();
    return new Response(JSON.stringify({
      ok: true,
      message: "FAQ\u5DF2\u5220\u9664"
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u5220\u9664FAQ\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u5220\u9664FAQ\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(deleteFAQ, "deleteFAQ");

// src/api/documents.js
init_kv_cache_helper();
init_kv_cache_helper();
async function handleDocumentsRequest(request, env, ctx, pathname, me) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method;
  if (method === "GET" && pathname === "/internal/api/v1/documents") {
    return await getDocumentsList(request, env, me, corsHeaders);
  }
  if (method === "GET" && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split("/").pop());
    return await getDocumentById(env, docId, me, corsHeaders);
  }
  if (method === "GET" && pathname.match(/^\/internal\/api\/v1\/documents\/\d+\/download$/)) {
    const docId = parseInt(pathname.split("/").slice(-2)[0]);
    return await downloadDocument(env, docId, me, corsHeaders);
  }
  if (method === "POST" && pathname === "/internal/api/v1/documents/upload") {
    return await uploadDocument(request, env, me, corsHeaders);
  }
  if (method === "POST" && pathname === "/internal/api/v1/documents") {
    return await createDocument(request, env, me, corsHeaders);
  }
  if (method === "PUT" && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split("/").pop());
    return await updateDocument(request, env, docId, me, corsHeaders);
  }
  if (method === "DELETE" && pathname.match(/^\/internal\/api\/v1\/documents\/\d+$/)) {
    const docId = parseInt(pathname.split("/").pop());
    return await deleteDocument(env, docId, me, corsHeaders);
  }
  return null;
}
__name(handleDocumentsRequest, "handleDocumentsRequest");
async function getDocumentsList(request, env, me, corsHeaders) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const perPage = parseInt(url.searchParams.get("perPage")) || 20;
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const scope = url.searchParams.get("scope") || "";
    const clientId = url.searchParams.get("client_id") || "";
    const year = url.searchParams.get("year") || "";
    const month = url.searchParams.get("month") || "";
    const tags = url.searchParams.get("tags") || "";
    const cacheKey = generateCacheKey2("documents_list", {
      page,
      perPage,
      q,
      category,
      scope,
      client_id: clientId,
      year,
      month,
      tags
    });
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached) {
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data.items,
        meta: { ...kvCached.data.meta, cache_source: "kv" }
      }, corsHeaders);
    }
    const offset = (page - 1) * perPage;
    let whereClauses = ["d.is_deleted = 0"];
    const params = [];
    if (q) {
      whereClauses.push("(d.title LIKE ? OR d.description LIKE ? OR d.file_name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category && category !== "all") {
      whereClauses.push("d.category = ?");
      params.push(category);
    }
    if (scope && (scope === "service" || scope === "task")) {
      whereClauses.push("d.scope = ?");
      params.push(scope);
    }
    if (clientId && clientId !== "all") {
      whereClauses.push("d.client_id = ?");
      params.push(parseInt(clientId));
    }
    if (year && year !== "all") {
      whereClauses.push("d.doc_year = ?");
      params.push(parseInt(year));
    }
    if (month && month !== "all") {
      whereClauses.push("d.doc_month = ?");
      params.push(parseInt(month));
    }
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      tagList.forEach((tag) => {
        whereClauses.push("d.tags LIKE ?");
        params.push(`%${tag}%`);
      });
    }
    const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
    const countSQL = `SELECT COUNT(*) as total FROM InternalDocuments d ${whereSQL}`;
    const countResult = await env.DATABASE.prepare(countSQL).bind(...params).first();
    const total = countResult?.total || 0;
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
        d.client_id,
        d.doc_year,
        d.doc_month,
        d.task_id,
        d.tags,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        COALESCE(u.username, u.name, '\u672A\u77E5') as uploader_name
      FROM InternalDocuments d
      LEFT JOIN Users u ON d.uploaded_by = u.user_id
      ${whereSQL}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const results = await env.DATABASE.prepare(dataSQL).bind(...params, perPage, offset).all();
    const documents = (results.results || []).map((row) => ({
      document_id: row.document_id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      fileType: row.file_type,
      category: row.category,
      scope: row.scope || null,
      clientId: row.client_id || null,
      docYear: row.doc_year || null,
      docMonth: row.doc_month || null,
      taskId: row.task_id || null,
      tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
      uploadedBy: row.uploaded_by,
      uploaderName: row.uploader_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    const cacheData = {
      items: documents,
      meta: { total, page, perPage, requestId: "doc-list" }
    };
    await saveKVCache(env, cacheKey, "documents_list", cacheData, { ttl: 3600 });
    return new Response(JSON.stringify({
      ok: true,
      code: "OK",
      message: "\u6210\u529F",
      data: documents,
      meta: { total, page, perPage, requestId: "doc-list" }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u83B7\u53D6\u6587\u6863\u5217\u8868\u5931\u8D25:", err);
    console.error("\u9519\u8BEF\u8BE6\u60C5:", err.message, err.stack);
    return new Response(JSON.stringify({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "\u4F3A\u670D\u5668\u932F\u8AA4",
      error: err.message || String(err),
      stack: err.stack || "",
      meta: { requestId: "doc-list" }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(getDocumentsList, "getDocumentsList");
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
        d.client_id,
        d.doc_year,
        d.doc_month,
        d.task_id,
        d.tags,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        COALESCE(u.username, u.name, '\u672A\u77E5') as uploader_name
      FROM InternalDocuments d
      LEFT JOIN Users u ON d.uploaded_by = u.user_id
      WHERE d.document_id = ? AND d.is_deleted = 0
    `).bind(docId).first();
    if (!result) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u6863\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
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
      clientId: result.client_id || null,
      docYear: result.doc_year || null,
      docMonth: result.doc_month || null,
      taskId: result.task_id || null,
      tags: result.tags ? result.tags.split(",").map((t) => t.trim()) : [],
      uploadedBy: result.uploaded_by,
      uploaderName: result.uploader_name,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
    return new Response(JSON.stringify({
      ok: true,
      data: document
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u83B7\u53D6\u6587\u6863\u8BE6\u60C5\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u83B7\u53D6\u6587\u6863\u8BE6\u60C5\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(getDocumentById, "getDocumentById");
async function downloadDocument(env, docId, me, corsHeaders) {
  try {
    const doc = await env.DATABASE.prepare(`
      SELECT file_url, file_name, file_type
      FROM InternalDocuments
      WHERE document_id = ? AND is_deleted = 0
    `).bind(docId).first();
    if (!doc) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u6863\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        ok: false,
        error: "R2 \u672A\u914D\u7F6E"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const object = await env.R2_BUCKET.get(doc.file_url);
    if (!object) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u4EF6\u4E0D\u5B58\u5728\u65BC\u5B58\u5132\u4E2D"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    return new Response(object.body, {
      headers: {
        "Content-Type": doc.file_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.file_name || "document"}"`,
        "Cache-Control": "private, max-age=3600",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("\u4E0B\u8F7D\u6587\u6863\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u4E0B\u8F7D\u6587\u6863\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(downloadDocument, "downloadDocument");
async function uploadDocument(request, env, me, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const description = formData.get("description") || "";
    const category = formData.get("category") || "";
    const scope = formData.get("scope") || "";
    const clientId = formData.get("client_id") || "";
    const docYear = formData.get("doc_year") || "";
    const docMonth = formData.get("doc_month") || "";
    const taskId = formData.get("task_id") || "";
    const tags = formData.get("tags") || "";
    if (!file || !title) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u4EF6\u548C\u6807\u9898\u4E3A\u5FC5\u586B\u9879"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!scope || scope !== "service" && scope !== "task") {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u5FC5\u9808\u6307\u5B9A\u8CC7\u6E90\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u4EF6\u5927\u5C0F\u4E0D\u80FD\u8D85\u8FC7 10MB"
      }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const now = Date.now();
    const envName = String(env.APP_ENV || "dev");
    const ext = file.name.split(".").pop() || "bin";
    const objectKey = `private/${envName}/documents/${now}_${file.name}`;
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        ok: false,
        error: "R2 \u672A\u914D\u7F6E"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    await env.R2_BUCKET.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`
      },
      customMetadata: {
        ownerId: String(me.user_id),
        module: "documents"
      }
    });
    const tagsStr = tags;
    const nowISO = (/* @__PURE__ */ new Date()).toISOString();
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
        client_id,
        doc_year,
        doc_month,
        task_id,
        tags,
        uploaded_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      title,
      description || null,
      file.name,
      objectKey,
      file.size,
      file.type,
      category || null,
      scope,
      clientId ? parseInt(clientId) : null,
      docYear ? parseInt(docYear) : null,
      docMonth ? parseInt(docMonth) : null,
      taskId ? parseInt(taskId) : null,
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
        clientId: clientId ? parseInt(clientId) : null,
        docYear: docYear ? parseInt(docYear) : null,
        docMonth: docMonth ? parseInt(docMonth) : null,
        taskId: taskId ? parseInt(taskId) : null,
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [],
        uploadedBy: me?.user_id,
        createdAt: nowISO,
        updatedAt: nowISO
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u4E0A\u4F20\u6587\u6863\u5931\u8D25:", err);
    console.error("\u9519\u8BEF\u8BE6\u60C5:", err.message, err.stack);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u4E0A\u4F20\u6587\u6863\u5931\u8D25\uFF1A" + (err.message || String(err))
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(uploadDocument, "uploadDocument");
async function createDocument(request, env, me, corsHeaders) {
  try {
    const body = await request.json();
    const { title, description, file_name, file_url, file_size, file_type, category, scope, client_id, doc_year, doc_month, task_id, tags } = body;
    if (!title || !file_name || !file_url) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6807\u9898\u3001\u6587\u4EF6\u540D\u548C\u6587\u4EF6URL\u4E3A\u5FC5\u586B\u9879"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!scope || scope !== "service" && scope !== "task") {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u5FC5\u9808\u6307\u5B9A\u8CC7\u6E90\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const tagsStr = Array.isArray(tags) ? tags.join(",") : tags || "";
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        client_id,
        doc_year,
        doc_month,
        task_id,
        tags,
        uploaded_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      title,
      description || null,
      file_name,
      file_url,
      file_size || null,
      file_type || null,
      category || null,
      scope,
      client_id || null,
      doc_year || null,
      doc_month || null,
      task_id || null,
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
        clientId: client_id || null,
        docYear: doc_year || null,
        docMonth: doc_month || null,
        taskId: task_id || null,
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [],
        uploadedBy: me?.user_id,
        createdAt: now,
        updatedAt: now
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u521B\u5EFA\u6587\u6863\u8BB0\u5F55\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u521B\u5EFA\u6587\u6863\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(createDocument, "createDocument");
async function updateDocument(request, env, docId, me, corsHeaders) {
  try {
    const body = await request.json();
    const { title, description, category, scope, client_id, doc_year, doc_month, task_id, tags } = body;
    const existing = await env.DATABASE.prepare(
      "SELECT document_id FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0"
    ).bind(docId).first();
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u6863\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!title) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6807\u9898\u4E3A\u5FC5\u586B\u9879"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!scope || scope !== "service" && scope !== "task") {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u5FC5\u9808\u6307\u5B9A\u8CC7\u6E90\u9069\u7528\u5C64\u7D1A\uFF08service\u6216task\uFF09"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const tagsStr = Array.isArray(tags) ? tags.join(",") : tags || "";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env.DATABASE.prepare(`
      UPDATE InternalDocuments
      SET 
        title = ?,
        description = ?,
        category = ?,
        scope = ?,
        client_id = ?,
        doc_year = ?,
        doc_month = ?,
        task_id = ?,
        tags = ?,
        updated_at = ?
      WHERE document_id = ? AND is_deleted = 0
    `).bind(
      title,
      description || null,
      category || null,
      scope,
      client_id || null,
      doc_year || null,
      doc_month || null,
      task_id || null,
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
        clientId: client_id || null,
        docYear: doc_year || null,
        docMonth: doc_month || null,
        taskId: task_id || null,
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [],
        updatedAt: now
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u66F4\u65B0\u6587\u6863\u4FE1\u606F\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u66F4\u65B0\u6587\u6863\u4FE1\u606F\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(updateDocument, "updateDocument");
async function deleteDocument(env, docId, me, corsHeaders) {
  try {
    const existing = await env.DATABASE.prepare(
      "SELECT document_id, file_url FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0"
    ).bind(docId).first();
    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        error: "\u6587\u6863\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    await env.DATABASE.prepare(`
      UPDATE InternalDocuments
      SET is_deleted = 1, updated_at = ?
      WHERE document_id = ?
    `).bind((/* @__PURE__ */ new Date()).toISOString(), docId).run();
    return new Response(JSON.stringify({
      ok: true,
      message: "\u6587\u6863\u5DF2\u5220\u9664"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("\u5220\u9664\u6587\u6863\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: "\u5220\u9664\u6587\u6863\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(deleteDocument, "deleteDocument");

// src/api/client_services.js
function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
__name(parseId, "parseId");
function todayStr() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
__name(todayStr, "todayStr");
function isValidYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
__name(isValidYmd, "isValidYmd");
async function handleClientServices(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/client-services" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const clientId = String(body?.client_id || "").trim();
    const serviceId = parseInt(body?.service_id, 10);
    const status = String(body?.status || "active").trim();
    if (!clientId) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5BA2\u6236ID\u5FC5\u586B", meta: { requestId } }, corsHeaders);
    }
    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u670D\u52D9ID\u7121\u6548", meta: { requestId } }, corsHeaders);
    }
    try {
      const client = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0").bind(clientId).first();
      if (!client) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u5BA2\u6236\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const service = await env.DATABASE.prepare("SELECT 1 FROM Services WHERE service_id = ? AND is_active = 1").bind(serviceId).first();
      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u985E\u578B\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const existing = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_id = ? AND service_id = ? AND is_deleted = 0"
      ).bind(clientId, serviceId).first();
      if (existing) {
        return jsonResponse(200, {
          ok: true,
          code: "EXISTS",
          message: "\u5BA2\u6236\u670D\u52D9\u95DC\u4FC2\u5DF2\u5B58\u5728",
          data: { client_service_id: existing.client_service_id },
          meta: { requestId }
        }, corsHeaders);
      }
      const result = await env.DATABASE.prepare(`
        INSERT INTO ClientServices (client_id, service_id, status, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(clientId, serviceId, status).run();
      const clientServiceId = result.meta.last_row_id;
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u5DF2\u5EFA\u7ACB\u5BA2\u6236\u670D\u52D9\u95DC\u4FC2",
        data: { client_service_id: clientServiceId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/client-services" && method === "GET") {
    try {
      const p = url.searchParams;
      const status = (p.get("status") || "all").trim();
      const q = (p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "12", 10)));
      const offset = (page - 1) * perPage;
      const where = ["cs.is_deleted = 0"];
      const binds = [];
      if (["active", "suspended", "expired", "cancelled"].includes(status)) {
        where.push("cs.status = ?");
        binds.push(status);
      }
      if (q) {
        where.push("(c.company_name LIKE ?)");
        binds.push(`%${q}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ClientServices cs LEFT JOIN Clients c ON c.client_id = cs.client_id ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT cs.client_service_id, cs.client_id, cs.service_id, cs.status, cs.suspension_effective_date, 
                c.company_name, s.service_name
         FROM ClientServices cs 
         LEFT JOIN Clients c ON c.client_id = cs.client_id
         LEFT JOIN Services s ON s.service_id = cs.service_id
         ${whereSql}
         ORDER BY cs.client_service_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        client_service_id: r.client_service_id,
        client_id: r.client_id,
        client_name: r.company_name || r.client_id,
        service_id: r.service_id || null,
        service_name: r.service_name || null,
        status: r.status,
        suspension_effective_date: r.suspension_effective_date || null
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const suspendMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/suspend$/);
  const resumeMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/resume$/);
  const cancelMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/cancel$/);
  const historyMatch = path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/history$/);
  if (suspendMatch) {
    if (method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const id = parseId(suspendMatch[1]);
    const reason = String(body?.reason || "").trim();
    const notes = String(body?.notes || "").trim();
    const effective = String(body?.effective_date || "").trim();
    if (!id) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
    if (!isValidYmd(effective)) return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u65E5\u671F\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    if (!reason) return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u539F\u56E0\u5FC5\u586B", meta: { requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status, suspension_effective_date FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      if (svc.status !== "active") return jsonResponse(400, { ok: false, code: "INVALID_STATE", message: "\u76EE\u524D\u72C0\u614B\u4E0D\u5141\u8A31\u6B64\u64CD\u4F5C", meta: { requestId } }, corsHeaders);
      if (svc.suspension_effective_date && svc.suspension_effective_date > todayStr()) return jsonResponse(400, { ok: false, code: "ALREADY_SCHEDULED", message: "\u5DF2\u6709\u672A\u4F86\u6392\u7A0B\uFF0C\u4E0D\u53EF\u91CD\u8907\u6392\u7A0B", meta: { requestId } }, corsHeaders);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (effective <= todayStr()) {
        await env.DATABASE.prepare("UPDATE ClientServices SET status='suspended', suspended_at = ?, suspension_reason = ?, suspension_effective_date = NULL WHERE client_service_id = ?").bind(nowIso, reason, id).run();
        await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, 'active', 'suspended', ?, ?, ?)").bind(id, String(me.user_id), reason, notes).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u670D\u52D9\u5DF2\u66AB\u505C", data: { client_service_id: id, status: "suspended", suspended_at: nowIso } }, corsHeaders);
      }
      await env.DATABASE.prepare("UPDATE ClientServices SET suspension_effective_date = ?, suspension_reason = ? WHERE client_service_id = ?").bind(effective, reason, id).run();
      return jsonResponse(200, { ok: true, code: "OK", message: `\u5DF2\u6392\u7A0B\u65BC ${effective} \u66AB\u505C`, data: { client_service_id: id, status: "active", suspension_effective_date: effective } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (resumeMatch) {
    if (method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      body = {};
    }
    const id = parseId(resumeMatch[1]);
    const notes = String(body?.notes || "").trim();
    if (!id) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      if (svc.status !== "suspended") return jsonResponse(400, { ok: false, code: "INVALID_STATE", message: "\u76EE\u524D\u72C0\u614B\u4E0D\u5141\u8A31\u6B64\u64CD\u4F5C", meta: { requestId } }, corsHeaders);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare("UPDATE ClientServices SET status='active', resumed_at = ?, suspended_at = NULL, suspension_reason = NULL, suspension_effective_date = NULL WHERE client_service_id = ?").bind(nowIso, id).run();
      await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, 'suspended', 'active', ?, '', ?)").bind(id, String(me.user_id), notes).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u670D\u52D9\u5DF2\u6062\u5FA9", data: { client_service_id: id, status: "active", resumed_at: nowIso } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (cancelMatch) {
    if (method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const id = parseId(cancelMatch[1]);
    const reason = String(body?.reason || "").trim();
    const cancelTasks = Boolean(body?.cancel_pending_tasks);
    if (!id) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
    if (!reason) return jsonResponse(400, { ok: false, code: "VALIDATION_ERROR", message: "\u53D6\u6D88\u539F\u56E0\u5FC5\u586B", meta: { requestId } }, corsHeaders);
    try {
      const svc = await env.DATABASE.prepare("SELECT client_service_id, status FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0").bind(id).first();
      if (!svc) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      if (svc.status === "cancelled") return jsonResponse(400, { ok: false, code: "INVALID_STATE", message: "\u5DF2\u70BA\u53D6\u6D88\u72C0\u614B", meta: { requestId } }, corsHeaders);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare("UPDATE ClientServices SET status='cancelled', cancelled_at = ?, cancelled_by = ? WHERE client_service_id = ?").bind(nowIso, String(me.user_id), id).run();
      await env.DATABASE.prepare("INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, reason, notes) VALUES (?, ?, 'cancelled', ?, ?, '')").bind(id, svc.status, String(me.user_id), reason).run();
      let tasksCancelled = false;
      if (cancelTasks) {
        await env.DATABASE.prepare("UPDATE ActiveTasks SET status='cancelled' WHERE client_service_id = ? AND status NOT IN ('completed','cancelled')").bind(id).run();
        tasksCancelled = true;
      }
      return jsonResponse(200, { ok: true, code: "OK", message: "\u670D\u52D9\u5DF2\u53D6\u6D88", data: { client_service_id: id, status: "cancelled", tasks_cancelled: tasksCancelled } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (historyMatch) {
    if (method !== "GET") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    const id = parseId(historyMatch[1]);
    if (!id) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52D9\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
    try {
      const rows = await env.DATABASE.prepare(
        `SELECT h.change_id, h.old_status, h.new_status, h.changed_by, u.name AS changed_by_name, h.changed_at, h.reason, h.notes
         FROM ServiceChangeHistory h LEFT JOIN Users u ON u.user_id = h.changed_by
         WHERE h.client_service_id = ?
         ORDER BY h.changed_at DESC, h.change_id DESC`
      ).bind(id).all();
      const data = (rows?.results || []).map((r) => ({ change_id: r.change_id, old_status: r.old_status, new_status: r.new_status, changed_by: r.changed_by_name || String(r.changed_by), changed_at: r.changed_at, reason: r.reason || "", notes: r.notes || "" }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, count: data.length } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleClientServices, "handleClientServices");

// src/api/cms.js
async function handleCMS(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (!me?.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
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
      const where = ["is_deleted = 0"];
      const binds = [];
      if (status === "published") {
        where.push("is_published = 1");
      }
      if (status === "draft") {
        where.push("is_published = 0");
      }
      if (category) {
        where.push("category = ?");
        binds.push(category);
      }
      if (tag) {
        where.push("tags LIKE ?");
        binds.push(`%${tag}%`);
      }
      if (keyword) {
        where.push("(title LIKE ? OR summary LIKE ?)");
        binds.push(`%${keyword}%`, `%${keyword}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ExternalArticles ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT article_id, title, slug, category, tags, is_published, updated_at, view_count
         FROM ExternalArticles
         ${whereSql}
         ORDER BY updated_at DESC, article_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        id: r.article_id,
        title: r.title,
        slug: r.slug,
        category: r.category || "",
        tags: (() => {
          try {
            return JSON.parse(r.tags || "[]");
          } catch (_) {
            return [];
          }
        })(),
        isPublished: r.is_published === 1,
        updatedAt: r.updated_at,
        viewCount: Number(r.view_count || 0)
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/faq" && method === "GET") {
    try {
      const p = url.searchParams;
      const status = (p.get("status") || "all").trim();
      const category = (p.get("category") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0"];
      const binds = [];
      if (status === "published") where.push("is_published = 1");
      if (status === "draft") where.push("is_published = 0");
      if (category) {
        where.push("category = ?");
        binds.push(category);
      }
      if (keyword) {
        where.push("question LIKE ?");
        binds.push(`%${keyword}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ExternalFAQ ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT faq_id, question, category, sort_order, is_published, updated_at
         FROM ExternalFAQ
         ${whereSql}
         ORDER BY updated_at DESC, sort_order ASC, faq_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        id: r.faq_id,
        question: r.question,
        category: r.category || "",
        sortOrder: Number(r.sort_order || 0),
        isPublished: r.is_published === 1,
        updatedAt: r.updated_at
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/resources" && method === "GET") {
    try {
      const p = url.searchParams;
      const category = (p.get("category") || "").trim();
      const fileType = (p.get("file_type") || p.get("type") || "").trim();
      const keyword = (p.get("keyword") || p.get("q") || "").trim();
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted = 0"];
      const binds = [];
      if (category) {
        where.push("category = ?");
        binds.push(category);
      }
      if (fileType) {
        where.push("file_type = ?");
        binds.push(fileType);
      }
      if (keyword) {
        where.push("title LIKE ?");
        binds.push(`%${keyword}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM ResourceCenter ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT resource_id, title, category, file_type, file_size, download_count, updated_at
         FROM ResourceCenter
         ${whereSql}
         ORDER BY updated_at DESC, resource_id DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({
        id: r.resource_id,
        title: r.title,
        category: r.category || "",
        fileType: r.file_type || "",
        fileSize: Number(r.file_size || 0),
        downloadCount: Number(r.download_count || 0),
        updatedAt: r.updated_at
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/services" && method === "GET") {
    try {
      const rows = await env.DATABASE.prepare(
        `SELECT service_id, service_key, title, is_published, sort_order, updated_at
         FROM ExternalServices
         WHERE is_deleted = 0
         ORDER BY sort_order ASC, service_id ASC`
      ).all();
      const data = (rows?.results || []).map((r) => ({
        id: r.service_id,
        key: r.service_key,
        title: r.title,
        isPublished: r.is_published === 1,
        sortOrder: Number(r.sort_order || 0),
        updatedAt: r.updated_at
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, count: data.length } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleCMS, "handleCMS");

// src/api/settings.js
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["rule_comp_hours_expiry"]);
var ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "company_name",
  "contact_email",
  "timezone",
  "currency",
  "timesheet_min_unit",
  "soft_delete_enabled",
  "workday_start",
  "workday_end",
  "report_locale",
  "rule_comp_hours_expiry",
  "attendance_bonus_amount",
  "overhead_cost_per_hour",
  "target_profit_margin"
]);
function normalizeKey(key) {
  return String(key || "").trim();
}
__name(normalizeKey, "normalizeKey");
async function handleSettings(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/users" && method === "GET") {
    try {
      const rows = await env.DATABASE.prepare(
        "SELECT user_id, username, name, is_admin FROM Users WHERE is_deleted = 0 ORDER BY user_id ASC"
      ).all();
      const data = (rows?.results || []).map((r) => ({
        user_id: r.user_id,
        username: r.username,
        name: r.name || r.username,
        is_admin: Boolean(r.is_admin)
      }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (!me?.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
  if (path === "/internal/api/v1/admin/settings" && method === "GET") {
    try {
      const rows = await env.DATABASE.prepare(
        "SELECT setting_key AS key, setting_value AS value, is_dangerous AS isDangerous, description, updated_at AS updatedAt, updated_by AS updatedBy FROM Settings ORDER BY setting_key"
      ).all();
      const map = {};
      for (const r of rows?.results || []) map[r.key] = r.value;
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data: { items: rows?.results || [], map }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path.startsWith("/internal/api/v1/admin/settings/") && method === "PUT") {
    const key = normalizeKey(path.replace("/internal/api/v1/admin/settings/", ""));
    if (!ALLOWED_KEYS.has(key)) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u4E0D\u652F\u63F4\u7684\u8A2D\u5B9A\u9375", meta: { requestId } }, corsHeaders);
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const value = String(payload?.value ?? "");
    if (key === "contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "Email \u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    if (key === "timesheet_min_unit") {
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n !== 0.25 && n !== 0.5 && n !== 1) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5DE5\u6642\u6700\u5C0F\u55AE\u4F4D\u50C5\u5141\u8A31 0.25/0.5/1", meta: { requestId } }, corsHeaders);
      }
    }
    if (key === "soft_delete_enabled") {
      if (!(value === "0" || value === "1")) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8EDF\u522A\u9664\u503C\u50C5\u80FD\u70BA 0 \u6216 1", meta: { requestId } }, corsHeaders);
    }
    if (key === "workday_start" || key === "workday_end") {
      if (!/^\d{2}:\d{2}$/.test(value)) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u6642\u9593\u683C\u5F0F\u9700\u70BA HH:MM", meta: { requestId } }, corsHeaders);
    }
    if (key === "rule_comp_hours_expiry") {
      const okVals = /* @__PURE__ */ new Set(["current_month", "next_month", "3_months", "6_months"]);
      if (!okVals.has(value)) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u7121\u6548\u7684\u898F\u5247\u503C", meta: { requestId } }, corsHeaders);
      if (DANGEROUS_KEYS.has(key) && payload?.confirmed !== true) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5371\u96AA\u8A2D\u5B9A\u9700\u78BA\u8A8D", meta: { requestId, field: key } }, corsHeaders);
      }
    }
    if (key === "attendance_bonus_amount") {
      const n = parseInt(value, 10);
      if (!Number.isInteger(n) || n < 0) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u5168\u52E4\u734E\u91D1\u5FC5\u9808\u70BA\u975E\u8CA0\u6574\u6578", meta: { requestId } }, corsHeaders);
    }
    if (key === "overhead_cost_per_hour") {
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n < 0) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u7BA1\u7406\u6210\u672C\u5FC5\u9808\u70BA\u975E\u8CA0\u6578\u5B57", meta: { requestId } }, corsHeaders);
    }
    if (key === "target_profit_margin") {
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u76EE\u6A19\u6BDB\u5229\u7387\u5FC5\u9808\u5728 0-100 \u4E4B\u9593", meta: { requestId } }, corsHeaders);
    }
    try {
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        "INSERT INTO Settings(setting_key, setting_value, updated_at, updated_by) VALUES(?, ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
      ).bind(key, value, nowIso, String(me.user_id || me.userId || "1")).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0", data: { key, value }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u7121\u6B64\u7AEF\u9EDE", meta: { requestId } }, corsHeaders);
}
__name(handleSettings, "handleSettings");

// src/api/dashboard.js
init_kv_cache_helper();
function ymToday() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
__name(ymToday, "ymToday");
function todayYmd() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
__name(todayYmd, "todayYmd");
async function handleDashboard(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path !== "/internal/api/v1/dashboard" || method !== "GET") {
    return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
  }
  try {
    const searchParams = new URL(url).searchParams;
    const requestedYm = searchParams.get("ym");
    const ym = requestedYm && /^\d{4}-\d{2}$/.test(requestedYm) ? requestedYm : ymToday();
    const financeYm = searchParams.get("financeYm") && /^\d{4}-\d{2}$/.test(searchParams.get("financeYm")) ? searchParams.get("financeYm") : ym;
    const financeMode = searchParams.get("financeMode") || "month";
    const today = todayYmd();
    const cacheKey = `dashboard:userId=${me.user_id}&ym=${ym}&financeYm=${financeYm}&financeMode=${financeMode}&role=${me.is_admin ? "admin" : "employee"}`;
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached && kvCached.data) {
      console.log("[Dashboard] \u2713 KV\u7F13\u5B58\u547D\u4E2D");
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
        data: kvCached.data,
        meta: { requestId, month: ym, financeYm, financeMode, today, ...kvCached.meta, cache_source: "kv" }
      }, corsHeaders);
    }
    async function getEmployeeMetrics() {
      const res = { myHours: null, myTasks: { items: [], counts: { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 } }, myLeaves: null, recentActivities: [], notifications: [] };
      try {
        const h = await env.DATABASE.prepare(
          `SELECT 
              SUM(hours) AS total,
              SUM(CASE WHEN work_type = 'normal' THEN hours ELSE 0 END) AS normal,
              SUM(CASE WHEN work_type LIKE 'ot-%' THEN hours ELSE 0 END) AS overtime
           FROM Timesheets WHERE is_deleted = 0 AND user_id = ? AND substr(work_date,1,7) = ?`
        ).bind(String(me.user_id), ym).first();
        const total = Number(h?.total || 0), normal = Number(h?.normal || 0), overtime = Number(h?.overtime || 0);
        const target = 160;
        const completionRate = target ? Math.round(total / target * 1e3) / 10 : 0;
        res.myHours = { month: ym, total, normal, overtime, targetHours: target, completionRate };
      } catch (_) {
      }
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT task_id, task_name, due_date, status, related_sop_id, client_specific_sop_id,
                  status_note, blocker_reason, overdue_reason
           FROM ActiveTasks
           WHERE is_deleted = 0 AND assignee_user_id = ? AND status IN ('pending','in_progress')
           ORDER BY COALESCE(due_date, '9999-12-31') ASC LIMIT 10`
        ).bind(String(me.user_id)).all();
        const items = (rows?.results || []).map((r) => {
          const due = r.due_date || null;
          let urgency = "normal";
          let daysUntilDue = null;
          let daysOverdue = null;
          const now = /* @__PURE__ */ new Date();
          if (due) {
            const d = new Date(due);
            const delta = Math.floor((d.getTime() - now.getTime()) / 864e5);
            daysUntilDue = delta;
            if (delta < 0) {
              urgency = "overdue";
              daysOverdue = -delta;
            } else if (delta <= 3) urgency = "urgent";
          }
          return {
            id: r.task_id,
            name: r.task_name,
            dueDate: due,
            status: r.status,
            urgency,
            daysUntilDue,
            daysOverdue,
            hasSop: !!(r.related_sop_id || r.client_specific_sop_id),
            statusNote: r.status_note || null,
            blockerReason: r.blocker_reason || null,
            overdueReason: r.overdue_reason || null
          };
        });
        const counts = { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 };
        for (const it of items) {
          if (it.status === "pending") counts.pending++;
          if (it.status === "in_progress") counts.inProgress++;
          if (it.urgency === "overdue") counts.overdue++;
          if (typeof it.daysUntilDue === "number" && it.daysUntilDue >= 0 && it.daysUntilDue <= 3) counts.dueSoon++;
        }
        res.myTasks = { items, counts };
      } catch (_) {
      }
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, remain AS remaining, total, used FROM LeaveBalances WHERE user_id = ? AND leave_type != 'comp'`
        ).bind(String(me.user_id)).all();
        const bal = { annual: 0, sick: 0, compHours: 0 };
        for (const r of rows?.results || []) {
          const t = (r.type || "").toLowerCase();
          if (t === "annual") bal.annual = Number(r.remaining || 0);
          else if (t === "sick") bal.sick = Number(r.remaining || 0);
        }
        const compRow = await env.DATABASE.prepare(
          `SELECT SUM(hours_remaining) as total FROM CompensatoryLeaveGrants 
           WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
        ).bind(String(me.user_id)).first();
        bal.compHours = Number(compRow?.total || 0);
        const recentRows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, start_date, end_date, amount, status FROM LeaveRequests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 3`
        ).bind(String(me.user_id)).all();
        const recent = (recentRows?.results || []).map((r) => ({ type: r.type, startDate: r.start_date, days: Number(r.amount || 0), status: r.status }));
        res.myLeaves = { balances: bal, recent };
      } catch (_) {
      }
      return res;
    }
    __name(getEmployeeMetrics, "getEmployeeMetrics");
    async function getAdminMetrics(targetYm, finYm, finMode, params) {
      const res = { employeeHours: [], employeeTasks: [], financialStatus: null, revenueTrend: [], recentActivities: [], teamMembers: [] };
      try {
        const result = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  COALESCE(SUM(t.hours), 0) AS total,
                  COALESCE(SUM(CASE WHEN CAST(t.work_type AS INTEGER) = 1 THEN t.hours ELSE 0 END), 0) AS normal,
                  COALESCE(SUM(CASE WHEN CAST(t.work_type AS INTEGER) >= 2 THEN t.hours ELSE 0 END), 0) AS overtime
           FROM Users u
           LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username
           ORDER BY total DESC, u.name ASC`
        ).bind(targetYm).all();
        const rows = result?.results || [];
        res.employeeHours = rows.map((r) => ({
          userId: r.user_id,
          name: r.name || r.username || "\u672A\u547D\u540D",
          total: Number(r.total || 0),
          normal: Number(r.normal || 0),
          overtime: Number(r.overtime || 0)
        }));
      } catch (e) {
        console.error("[Dashboard] Employee hours query error:", e);
      }
      try {
        const currentYear = finYm.split("-")[0];
        const arRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS ar FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial')`
        ).first();
        const overdueRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS od FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial') AND due_date < ?`
        ).bind(today).first();
        const ar = Math.round(Number(arRow?.ar || 0));
        const overdue = Math.round(Number(overdueRow?.od || 0));
        let monthData = null;
        let ytdData = null;
        if (finMode === "month") {
          const monthPaidRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,7) = ?`
          ).bind(finYm).first();
          const monthRevRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,7) = ?`
          ).bind(finYm).first();
          let monthCost = 0;
          try {
            const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE pr.month = ?`).bind(finYm).first();
            monthCost = Math.round(Number(pr?.c || 0) / 100);
          } catch (_) {
          }
          const monthRevenue = Math.round(Number(monthRevRow?.revenue || 0));
          const monthPaid = Math.round(Number(monthPaidRow?.paid || 0));
          const monthProfit = monthRevenue - monthCost;
          const monthMargin = monthRevenue > 0 ? Math.round(monthProfit / monthRevenue * 1e3) / 10 : 0;
          const monthCollectionRate = monthRevenue > 0 ? Math.round(monthPaid / monthRevenue * 1e3) / 10 : 0;
          monthData = {
            period: finYm,
            revenue: monthRevenue,
            cost: monthCost,
            profit: monthProfit,
            margin: monthMargin,
            ar,
            paid: monthPaid,
            overdue,
            collectionRate: monthCollectionRate
          };
        } else {
          const ytdPaidRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
          ).bind(currentYear, today).first();
          const ytdRevRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
          ).bind(currentYear, today).first();
          let ytdCost = 0;
          try {
            const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE substr(pr.month,1,4) = ?`).bind(currentYear).first();
            ytdCost = Math.round(Number(pr?.c || 0) / 100);
          } catch (_) {
          }
          const ytdRevenue = Math.round(Number(ytdRevRow?.revenue || 0));
          const ytdPaid = Math.round(Number(ytdPaidRow?.paid || 0));
          const ytdProfit = ytdRevenue - ytdCost;
          const ytdMargin = ytdRevenue > 0 ? Math.round(ytdProfit / ytdRevenue * 1e3) / 10 : 0;
          const ytdCollectionRate = ytdRevenue > 0 ? Math.round(ytdPaid / ytdRevenue * 1e3) / 10 : 0;
          ytdData = {
            period: `${currentYear}\u5E74\u7D2F\u8A08`,
            revenue: ytdRevenue,
            cost: ytdCost,
            profit: ytdProfit,
            margin: ytdMargin,
            ar,
            paid: ytdPaid,
            overdue,
            collectionRate: ytdCollectionRate
          };
        }
        res.financialStatus = {
          month: monthData,
          ytd: ytdData
        };
      } catch (_) {
      }
      try {
        const summaryRows = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  COUNT(CASE WHEN t.status = 'completed' AND t.service_month = ? THEN 1 END) AS completed
           FROM Users u
           LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id AND t.is_deleted = 0
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username`
        ).bind(targetYm).all();
        const detailRows = await env.DATABASE.prepare(
          `SELECT u.user_id, 
                  t.service_month,
                  t.status,
                  CASE WHEN t.status NOT IN ('completed','cancelled') AND t.due_date < ? THEN 1 ELSE 0 END as is_overdue,
                  COUNT(*) as count
           FROM Users u
           LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id 
                  AND t.is_deleted = 0 
                  AND t.status NOT IN ('completed', 'cancelled')
           WHERE u.is_deleted = 0 AND t.task_id IS NOT NULL
           GROUP BY u.user_id, t.service_month, t.status, is_overdue`
        ).bind(today).all();
        const userTasksMap = {};
        (summaryRows?.results || []).forEach((r) => {
          userTasksMap[r.user_id] = {
            userId: r.user_id,
            name: r.name || r.username,
            completed: Number(r.completed || 0),
            inProgress: {},
            overdue: {}
          };
        });
        (detailRows?.results || []).forEach((r) => {
          const user = userTasksMap[r.user_id];
          if (!user) return;
          const month = r.service_month || "\u672A\u77E5";
          const count = Number(r.count || 0);
          if (r.is_overdue === 1) {
            user.overdue[month] = (user.overdue[month] || 0) + count;
          } else if (r.status === "in_progress") {
            user.inProgress[month] = (user.inProgress[month] || 0) + count;
          }
        });
        res.employeeTasks = Object.values(userTasksMap).sort((a, b) => {
          const aOverdue = Object.values(a.overdue).reduce((sum, n) => sum + n, 0);
          const bOverdue = Object.values(b.overdue).reduce((sum, n) => sum + n, 0);
          const aInProgress = Object.values(a.inProgress).reduce((sum, n) => sum + n, 0);
          const bInProgress = Object.values(b.inProgress).reduce((sum, n) => sum + n, 0);
          return bOverdue - aOverdue || bInProgress - aInProgress;
        });
      } catch (err) {
        console.error("[Dashboard] Employee tasks query error:", err);
      }
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT strftime('%Y-%m', receipt_date) AS ym, SUM(total_amount) AS revenue,
                  SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) AS paid
           FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled'
           GROUP BY ym ORDER BY ym DESC LIMIT 6`
        ).all();
        const list = (rows?.results || []).map((r) => ({ month: r.ym, revenue: Number(r.revenue || 0), paid: Number(r.paid || 0) }));
        res.revenueTrend = list.sort((a, b) => a.month.localeCompare(b.month));
      } catch (_) {
      }
      console.log("========================================");
      console.log("[\u4EEA\u8868\u677F] \u5F00\u59CB\u5904\u7406 Recent Activities");
      console.log("========================================");
      try {
        const days = parseInt(params.get("activity_days") || "30", 10);
        const filterUserId = params.get("activity_user_id");
        const filterType = params.get("activity_type");
        console.log("[\u4EEA\u8868\u677F] \u7B5B\u9009\u53C2\u6570 - days:", days, "filterUserId:", filterUserId, "filterType:", filterType);
        const userFilter = filterUserId ? `AND adj.requested_by = ${filterUserId}` : "";
        const userFilter2 = filterUserId ? `AND su.updated_by = ${filterUserId}` : "";
        const userFilter3 = filterUserId ? `AND l.user_id = ${filterUserId}` : "";
        const adjustments = await env.DATABASE.prepare(`
          SELECT 
            adj.adjustment_id,
            adj.requested_at as activity_time,
            adj.old_due_date,
            adj.new_due_date,
            adj.adjustment_reason as reason,
            adj.requested_by,
            u.name as user_name,
            t.task_name,
            t.task_id,
            t.status as current_status,
            t.due_date as current_due_date,
            t.assignee_user_id,
            assignee.name as assignee_name,
            c.company_name as client_name,
            s.service_name
          FROM TaskDueDateAdjustments adj
          JOIN Users u ON u.user_id = adj.requested_by
          JOIN ActiveTasks t ON t.task_id = adj.task_id
          LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
          LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
          LEFT JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          WHERE adj.requested_at >= datetime('now', '-${days} days')
            AND adj.old_due_date IS NOT NULL 
            AND adj.new_due_date IS NOT NULL
            AND adj.adjustment_type IS NOT NULL
            ${userFilter}
          ORDER BY adj.requested_at DESC
          LIMIT 30
        `).all();
        console.log("[\u4EEA\u8868\u677F] \u67E5\u8BE2\u72B6\u6001\u66F4\u65B0\uFF0C\u5929\u6570:", days);
        const statusUpdates = await env.DATABASE.prepare(`
          SELECT 
            su.update_id,
            su.updated_at as activity_time,
            su.old_status,
            su.new_status,
            su.progress_note,
            su.blocker_reason,
            su.overdue_reason,
            su.updated_by,
            u.name as user_name,
            t.task_name,
            t.task_id,
            t.status as current_status,
            t.due_date as current_due_date,
            t.assignee_user_id,
            assignee.name as assignee_name,
            c.company_name as client_name,
            s.service_name
          FROM TaskStatusUpdates su
          LEFT JOIN Users u ON u.user_id = su.updated_by
          LEFT JOIN ActiveTasks t ON t.task_id = su.task_id
          LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
          LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
          LEFT JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          WHERE su.updated_at >= datetime('now', '-${days} days')
            AND su.old_status IS NOT NULL
            AND su.new_status IS NOT NULL
            ${userFilter2}
          ORDER BY su.updated_at DESC
          LIMIT 30
        `).all();
        console.log("[\u4EEA\u8868\u677F] \u72B6\u6001\u66F4\u65B0\u67E5\u8BE2\u7ED3\u679C:", statusUpdates?.results?.length || 0, "\u6761");
        if (statusUpdates?.results?.length > 0) {
          console.log("[\u4EEA\u8868\u677F] \u7B2C\u4E00\u6761\u72B6\u6001\u66F4\u65B0:", JSON.stringify(statusUpdates.results[0], null, 2));
        }
        const leaveApplications = await env.DATABASE.prepare(`
          SELECT 
            l.leave_id,
            l.submitted_at as activity_time,
            l.leave_type,
            l.start_date,
            l.end_date,
            l.amount as leave_days,
            l.status as leave_status,
            l.reason,
            l.user_id,
            u.name as user_name
          FROM LeaveRequests l
          LEFT JOIN Users u ON u.user_id = l.user_id
          WHERE l.submitted_at >= datetime('now', '-${days} days')
            ${userFilter3}
          ORDER BY l.submitted_at DESC
          LIMIT 30
        `).all();
        let timesheetReminders = [];
        try {
          const checkDays = Math.min(days, 7);
          const today2 = /* @__PURE__ */ new Date();
          const dates = [];
          const holidaysResult = await env.DATABASE.prepare(`
            SELECT holiday_date 
            FROM Holidays 
            WHERE holiday_date >= date('now', '-${checkDays} days') 
              AND holiday_date <= date('now')
          `).all();
          const holidays = new Set((holidaysResult?.results || []).map((h) => h.holiday_date));
          for (let i = 1; i <= checkDays; i++) {
            const d = new Date(today2);
            d.setDate(d.getDate() - i);
            const dayOfWeek = d.getDay();
            const dateStr = d.toISOString().slice(0, 10);
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
              dates.push(dateStr);
            }
          }
          if (dates.length > 0) {
            const datesList = dates.map((d) => `'${d}'`).join(",");
            const userFilterForTimesheet = filterUserId ? `AND u.user_id = ${filterUserId}` : "";
            const missingTimesheets = await env.DATABASE.prepare(`
              SELECT 
                u.user_id,
                u.name as user_name,
                d.work_date
              FROM Users u
              JOIN (${dates.map((d) => `SELECT '${d}' as work_date`).join(" UNION ALL ")}) d
              LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.work_date = d.work_date AND t.is_deleted = 0
              WHERE u.is_deleted = 0 
                AND d.work_date >= u.start_date
                AND t.timesheet_id IS NULL
                ${userFilterForTimesheet}
              ORDER BY d.work_date DESC, u.name ASC
              LIMIT 30
            `).all();
            const groupedByUser = {};
            (missingTimesheets?.results || []).forEach((r) => {
              if (!groupedByUser[r.user_id]) {
                groupedByUser[r.user_id] = {
                  user_id: r.user_id,
                  user_name: r.user_name,
                  missing_dates: []
                };
              }
              groupedByUser[r.user_id].missing_dates.push(r.work_date);
            });
            timesheetReminders = Object.values(groupedByUser).map((item) => ({
              activity_type: "timesheet_reminder",
              user_id: item.user_id,
              user_name: item.user_name,
              missing_dates: item.missing_dates,
              missing_count: item.missing_dates.length,
              activity_time: today2.toISOString()
              // 使用当前时间作为活动时间
            }));
          }
        } catch (err) {
          console.error("[\u4EEA\u8868\u677F] \u83B7\u53D6\u5DE5\u65F6\u63D0\u9192\u5931\u8D25:", err);
        }
        console.log("[\u4EEA\u8868\u677F] \u5408\u5E76\u6D3B\u52A8\u524D:");
        console.log("  - adjustments.results:", adjustments?.results?.length || 0);
        console.log("  - statusUpdates.results:", statusUpdates?.results?.length || 0);
        console.log("  - leaveApplications.results:", leaveApplications?.results?.length || 0);
        console.log("  - timesheetReminders:", timesheetReminders?.length || 0);
        const allActivities = [
          ...(adjustments?.results || []).map((a) => ({ ...a, activity_type: "due_date_adjustment" })),
          ...(statusUpdates?.results || []).map((s) => ({ ...s, activity_type: "status_update" })),
          ...(leaveApplications?.results || []).map((l) => ({ ...l, activity_type: "leave_application" })),
          ...timesheetReminders
        ].sort((a, b) => (b.activity_time || "").localeCompare(a.activity_time || ""));
        console.log("[\u4EEA\u8868\u677F] \u5408\u5E76\u540E\u603B\u6D3B\u52A8\u6570:", allActivities.length);
        if (allActivities.length > 0) {
          console.log("[\u4EEA\u8868\u677F] \u7B2C\u4E00\u6761\u6D3B\u52A8\u793A\u4F8B:", allActivities[0]);
        }
        let filteredActivities = allActivities;
        if (filterType) {
          filteredActivities = allActivities.filter((act) => act.activity_type === filterType);
          console.log("[\u4EEA\u8868\u677F] \u7C7B\u578B\u7B5B\u9009\u540E\u6D3B\u52A8\u6570:", filteredActivities.length, "(\u7B5B\u9009\u7C7B\u578B:", filterType, ")");
        }
        res.recentActivities = filteredActivities.slice(0, 15).map((act) => {
          let time = "";
          if (act.activity_time) {
            let dateStr = act.activity_time;
            if (dateStr.includes(" ") && !dateStr.includes("T")) {
              dateStr = dateStr.replace(" ", "T") + "Z";
            }
            time = new Date(dateStr).toLocaleString("zh-TW", {
              timeZone: "Asia/Taipei",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            });
          }
          const statusMap = {
            "pending": "\u5F85\u958B\u59CB",
            "in_progress": "\u9032\u884C\u4E2D",
            "completed": "\u5DF2\u5B8C\u6210",
            "cancelled": "\u5DF2\u53D6\u6D88"
          };
          const currentStatus = statusMap[act.current_status] || act.current_status || "\u2014";
          const currentDueDate = act.current_due_date ? act.current_due_date.slice(5) : "\u2014";
          const assigneeName = act.assignee_name || "\u672A\u5206\u914D";
          const serviceName = act.service_name || "\u2014";
          if (act.activity_type === "due_date_adjustment") {
            const oldDate = act.old_due_date ? act.old_due_date.slice(5) : "";
            const newDate = act.new_due_date ? act.new_due_date.slice(5) : "";
            return {
              activity_type: "due_date_adjustment",
              text: `${act.user_name} \u8ABF\u6574\u4E86\u4EFB\u52D9\u671F\u9650`,
              taskName: act.task_name,
              clientName: act.client_name || "\u2014",
              serviceName,
              change: `${oldDate} \u2192 ${newDate}`,
              reason: act.reason || "",
              currentStatus,
              currentDueDate,
              assigneeName,
              time,
              link: `/internal/task-detail?id=${act.task_id}`
            };
          } else if (act.activity_type === "status_update") {
            const oldStatus = statusMap[act.old_status] || act.old_status;
            const newStatus = statusMap[act.new_status] || act.new_status;
            let note = "";
            if (act.blocker_reason) note = `\u{1F6AB} ${act.blocker_reason}`;
            else if (act.overdue_reason) note = `\u23F0 ${act.overdue_reason}`;
            else if (act.progress_note) note = `\u{1F4AC} ${act.progress_note}`;
            return {
              activity_type: "status_update",
              text: `${act.user_name} \u66F4\u65B0\u4E86\u4EFB\u52D9\u72C0\u614B`,
              taskName: act.task_name,
              clientName: act.client_name || "\u2014",
              serviceName,
              change: `${oldStatus} \u2192 ${newStatus}`,
              note,
              currentStatus,
              currentDueDate,
              assigneeName,
              time,
              link: `/internal/task-detail?id=${act.task_id}`
            };
          } else if (act.activity_type === "leave_application") {
            const leaveTypeMap = {
              "annual": "\u7279\u4F11",
              "sick": "\u75C5\u5047",
              "personal": "\u4E8B\u5047",
              "comp": "\u88DC\u4F11",
              "maternity": "\u7522\u5047",
              "paternity": "\u966A\u7522\u5047",
              "marriage": "\u5A5A\u5047",
              "bereavement": "\u55AA\u5047",
              "unpaid": "\u7121\u85AA\u5047"
            };
            const leaveType = leaveTypeMap[act.leave_type] || act.leave_type;
            const startDate = act.start_date ? act.start_date.slice(5) : "";
            const endDate = act.end_date ? act.end_date.slice(5) : "";
            const leaveDays = act.leave_days || 0;
            return {
              activity_type: "leave_application",
              text: `${act.user_name} \u7533\u8ACB${leaveType}`,
              leaveType,
              leaveDays,
              period: `${startDate} ~ ${endDate}`,
              reason: act.reason || "",
              userName: act.user_name,
              time,
              link: `/internal/leaves`
            };
          } else if (act.activity_type === "timesheet_reminder") {
            const missingDates = (act.missing_dates || []).map((d) => d.slice(5)).join(", ");
            return {
              activity_type: "timesheet_reminder",
              text: `${act.user_name} \u5C1A\u672A\u586B\u5BEB\u5DE5\u6642`,
              userName: act.user_name,
              missingCount: act.missing_count || 0,
              missingDates,
              time,
              link: `/internal/timesheets`
            };
          }
          return null;
        }).filter(Boolean);
      } catch (err) {
        console.error("[\u4EEA\u8868\u677F] \u83B7\u53D6\u6700\u8FD1\u52A8\u6001\u5931\u8D25:", err);
        console.error("[\u4EEA\u8868\u677F] \u9519\u8BEF\u5806\u6808:", err.stack);
        console.error("[\u4EEA\u8868\u677F] \u9519\u8BEF\u8BE6\u60C5:", JSON.stringify(err, null, 2));
        res.recentActivities = [];
      }
      try {
        const usersResult = await env.DATABASE.prepare(`
          SELECT user_id, name, email
          FROM Users
          WHERE is_deleted = 0
          ORDER BY name ASC
        `).all();
        res.teamMembers = (usersResult?.results || []).map((u) => ({
          userId: u.user_id,
          name: u.name,
          email: u.email
        }));
      } catch (err) {
        console.error("[\u4EEA\u8868\u677F] \u83B7\u53D6\u56E2\u961F\u6210\u5458\u5931\u8D25:", err);
        res.teamMembers = [];
      }
      console.log("[\u4EEA\u8868\u677F] \u6700\u7EC8\u8FD4\u56DE\u6570\u636E:");
      console.log("  - recentActivities.length:", res.recentActivities?.length || 0);
      console.log("  - teamMembers.length:", res.teamMembers?.length || 0);
      console.log("  - employeeHours.length:", res.employeeHours?.length || 0);
      console.log("  - employeeTasks.length:", res.employeeTasks?.length || 0);
      return res;
    }
    __name(getAdminMetrics, "getAdminMetrics");
    async function getReceiptsPendingTasks() {
      try {
        const receipts = await env.DATABASE.prepare(`
          SELECT 
            r.receipt_id,
            r.receipt_id as receipt_number,
            r.due_date as receipt_due_date,
            r.status as receipt_status,
            c.client_id,
            c.company_name,
            cs.client_service_id,
            s.service_name,
            COUNT(DISTINCT t.task_id) as total_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks
          FROM Receipts r
          JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
          JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          LEFT JOIN ActiveTasks t ON t.client_service_id = cs.client_service_id 
            AND t.service_month = r.service_month
            AND t.is_deleted = 0
          WHERE r.is_deleted = 0
            AND r.status IN ('pending', 'partial')
          GROUP BY r.receipt_id
          HAVING completed_tasks < total_tasks AND total_tasks > 0
          ORDER BY r.due_date ASC
          LIMIT 10
        `).all();
        return (receipts.results || []).map((r) => ({
          receipt_id: r.receipt_id,
          receipt_number: r.receipt_number,
          receipt_due_date: r.receipt_due_date,
          receipt_status: r.receipt_status,
          client_id: r.client_id,
          client_name: r.company_name,
          service_name: r.service_name || "",
          total_tasks: Number(r.total_tasks || 0),
          completed_tasks: Number(r.completed_tasks || 0),
          pending_tasks: Number(r.total_tasks || 0) - Number(r.completed_tasks || 0)
        }));
      } catch (err) {
        console.error("[Dashboard] getReceiptsPendingTasks \u5931\u8D25:", err);
        return [];
      }
    }
    __name(getReceiptsPendingTasks, "getReceiptsPendingTasks");
    const data = { role: me.is_admin ? "admin" : "employee" };
    if (me.is_admin) {
      data.admin = await getAdminMetrics(ym, financeYm, financeMode, searchParams);
      data.admin.receiptsPendingTasks = await getReceiptsPendingTasks();
    } else {
      data.employee = await getEmployeeMetrics();
      data.employee.receiptsPendingTasks = await getReceiptsPendingTasks();
    }
    await saveKVCache(env, cacheKey, "dashboard", data, {
      userId: String(me.user_id),
      ttl: 300
      // 5分钟
    }).catch((err) => console.error("[Dashboard] KV\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err));
    return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, month: ym, financeYm, financeMode, today } }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
    return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
  }
}
__name(handleDashboard, "handleDashboard");

// src/api/automation.js
function isValidSchedule(type, value) {
  if (!["daily", "weekly", "monthly", "cron"].includes(type)) return false;
  if (type === "daily") return /^\d{2}:\d{2}$/.test(value || "");
  if (type === "weekly") return /^([A-Z][a-z]{2})\s+\d{2}:\d{2}$/.test(value || "");
  if (type === "monthly") return /^(\d{1,2})\s+\d{2}:\d{2}$/.test(value || "");
  if (type === "cron") return typeof value === "string" && value.trim().length > 0;
  return false;
}
__name(isValidSchedule, "isValidSchedule");
function parseJsonSafe(s, def = null) {
  try {
    return JSON.parse(String(s || "null"));
  } catch (_) {
    return def;
  }
}
__name(parseJsonSafe, "parseJsonSafe");
async function handleAutomation(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  if (!me?.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, corsHeaders);
  const method = request.method.toUpperCase();
  if (path === "/internal/api/v1/admin/automation-rules" && method === "GET") {
    try {
      const p = url.searchParams;
      const q = (p.get("q") || "").trim();
      const enabled = p.get("enabled");
      const page = Math.max(1, parseInt(p.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "20", 10)));
      const offset = (page - 1) * perPage;
      const where = ["is_deleted=0"];
      const binds = [];
      if (q) {
        where.push("rule_name LIKE ?");
        binds.push(`%${q}%`);
      }
      if (enabled === "0" || enabled === "1") {
        where.push("is_enabled = ?");
        binds.push(parseInt(enabled, 10));
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM AutomationRules ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT rule_id, rule_name, schedule_type, schedule_value, is_enabled, last_run_at, created_at, updated_at
         FROM AutomationRules ${whereSql} ORDER BY updated_at DESC, rule_id DESC LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results || []).map((r) => ({ id: r.rule_id, name: r.rule_name, scheduleType: r.schedule_type, scheduleValue: r.schedule_value, isEnabled: r.is_enabled === 1, lastRunAt: r.last_run_at, createdAt: r.created_at, updatedAt: r.updated_at }));
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId, page, perPage, total: Number(totalRow?.total || 0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  if (path === "/internal/api/v1/admin/automation-rules" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const name = String(body?.rule_name || body?.name || "").trim();
    const scheduleType = String(body?.schedule_type || body?.scheduleType || "").trim();
    const scheduleValue = String(body?.schedule_value || body?.scheduleValue || "").trim();
    const condition = body?.condition_json ?? body?.condition ?? null;
    const action = body?.action_json ?? body?.action ?? null;
    const errors = [];
    if (!name) errors.push({ field: "rule_name", message: "\u5FC5\u586B" });
    if (!isValidSchedule(scheduleType, scheduleValue)) errors.push({ field: "schedule", message: "\u6392\u7A0B\u4E0D\u5408\u6CD5" });
    if (!action) errors.push({ field: "action", message: "\u5FC5\u586B" });
    if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    try {
      await env.DATABASE.prepare(
        `INSERT INTO AutomationRules (rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled) VALUES (?, ?, ?, ?, ?, 1)`
      ).bind(name, scheduleType, scheduleValue, JSON.stringify(condition ?? {}), JSON.stringify(action ?? {})).run();
      const idRow = await env.DATABASE.prepare(`SELECT last_insert_rowid() AS id`).first();
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data: { id: Number(idRow?.id || 0) }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const updateMatch = path.match(/^\/internal\/api\/v1\/admin\/automation-rules\/(\d+)$/);
  if (updateMatch) {
    if (!["PUT", "DELETE"].includes(method)) return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    const id = parseInt(updateMatch[1], 10);
    if (method === "DELETE") {
      try {
        await env.DATABASE.prepare(`UPDATE AutomationRules SET is_deleted = 1 WHERE rule_id = ?`).bind(id).run();
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u522A\u9664", data: { id }, meta: { requestId } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
      }
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const name = body?.rule_name !== void 0 ? String(body.rule_name).trim() : void 0;
    const scheduleType = body?.schedule_type !== void 0 ? String(body.schedule_type).trim() : void 0;
    const scheduleValue = body?.schedule_value !== void 0 ? String(body.schedule_value).trim() : void 0;
    const isEnabled = body?.is_enabled;
    const condition = body?.condition_json !== void 0 ? JSON.stringify(parseJsonSafe(body.condition_json, {})) : void 0;
    const action = body?.action_json !== void 0 ? JSON.stringify(parseJsonSafe(body.action_json, {})) : void 0;
    const sets = [];
    const binds = [];
    if (name !== void 0) {
      if (!name) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u540D\u7A31\u5FC5\u586B", meta: { requestId } }, corsHeaders);
      sets.push("rule_name = ?");
      binds.push(name);
    }
    if (scheduleType !== void 0 || scheduleValue !== void 0) {
      const t = scheduleType ?? (await env.DATABASE.prepare(`SELECT schedule_type FROM AutomationRules WHERE rule_id = ?`).bind(id).first())?.schedule_type;
      const v = scheduleValue ?? (await env.DATABASE.prepare(`SELECT schedule_value FROM AutomationRules WHERE rule_id = ?`).bind(id).first())?.schedule_value;
      if (!isValidSchedule(t, v)) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u6392\u7A0B\u4E0D\u5408\u6CD5", meta: { requestId } }, corsHeaders);
      if (scheduleType !== void 0) {
        sets.push("schedule_type = ?");
        binds.push(scheduleType);
      }
      if (scheduleValue !== void 0) {
        sets.push("schedule_value = ?");
        binds.push(scheduleValue);
      }
    }
    if (condition !== void 0) {
      sets.push("condition_json = ?");
      binds.push(condition);
    }
    if (action !== void 0) {
      sets.push("action_json = ?");
      binds.push(action);
    }
    if (isEnabled === 0 || isEnabled === 1 || isEnabled === true || isEnabled === false) {
      sets.push("is_enabled = ?");
      binds.push(isEnabled === 1 || isEnabled === true ? 1 : 0);
    }
    if (!sets.length) return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u7121\u53EF\u66F4\u65B0\u6B04\u4F4D", meta: { requestId } }, corsHeaders);
    sets.push("updated_at = datetime('now')");
    try {
      await env.DATABASE.prepare(`UPDATE AutomationRules SET ${sets.join(", ")} WHERE rule_id = ?`).bind(...binds, id).run();
      return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u66F4\u65B0", data: { id }, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  const testMatch = path.match(/^\/internal\/api\/v1\/admin\/automation-rules\/(\d+)\/test$/);
  if (testMatch) {
    if (method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
    const id = parseInt(testMatch[1], 10);
    try {
      const row = await env.DATABASE.prepare(`SELECT rule_id, rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled FROM AutomationRules WHERE rule_id = ? AND is_deleted = 0`).bind(id).first();
      if (!row) return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u898F\u5247\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      const condition = parseJsonSafe(row.condition_json, {});
      const action = parseJsonSafe(row.action_json, {});
      const summary = { ruleId: row.rule_id, ruleName: row.rule_name, willExecute: !!row.is_enabled, condition, action };
      return jsonResponse(200, { ok: true, code: "OK", message: "\u6E2C\u8A66\u6210\u529F", data: summary, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleAutomation, "handleAutomation");

// src/api/holidays.js
init_cache_helper();
init_kv_cache_helper();
async function handleHolidays(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "GET") {
    try {
      const params = url.searchParams;
      const startDate = (params.get("start_date") || "").trim();
      const endDate = (params.get("end_date") || "").trim();
      const cacheKey = generateCacheKey("holidays_all", { start: startDate, end: endDate });
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached && kvCached.data) {
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08KV\u7F13\u5B58\uFF09\u26A1",
          data: kvCached.data,
          meta: { requestId, ...kvCached.meta, cache_source: "kv" }
        }, corsHeaders);
      }
      const d1Cached = await getCache(env, cacheKey);
      if (d1Cached && d1Cached.data) {
        saveKVCache(env, cacheKey, "holidays_all", d1Cached.data, {
          scopeParams: { start: startDate, end: endDate },
          ttl: 3600
        }).catch((err) => console.error("[HOLIDAYS] KV\u540C\u6B65\u5931\u8D25:", err));
        return jsonResponse(200, {
          ok: true,
          code: "SUCCESS",
          message: "\u67E5\u8A62\u6210\u529F\uFF08D1\u7F13\u5B58\uFF09",
          data: d1Cached.data,
          meta: { requestId, ...d1Cached.meta, cache_source: "d1" }
        }, corsHeaders);
      }
      const where = [];
      const binds = [];
      if (startDate) {
        where.push("holiday_date >= ?");
        binds.push(startDate);
      }
      if (endDate) {
        where.push("holiday_date <= ?");
        binds.push(endDate);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await env.DATABASE.prepare(
        `SELECT holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday
				 FROM Holidays
				 ${whereSql}
				 ORDER BY holiday_date ASC`
      ).bind(...binds).all();
      const data = (rows?.results || []).map((r) => ({
        holiday_date: r.holiday_date,
        // 前端期望的欄位名稱
        date: r.holiday_date,
        // 向後兼容
        name: r.name || "",
        is_national_holiday: Boolean(r.is_national_holiday),
        is_weekly_restday: Boolean(r.is_weekly_restday),
        is_makeup_workday: Boolean(r.is_makeup_workday)
      }));
      try {
        await Promise.all([
          saveKVCache(env, cacheKey, "holidays_all", data, {
            scopeParams: { start: startDate, end: endDate },
            ttl: 3600
            // 1小时
          }),
          saveCache(env, cacheKey, "holidays_all", data, {
            scopeParams: { start: startDate, end: endDate }
          })
        ]);
        console.log("[HOLIDAYS] \u2713 \u5047\u65E5\u6570\u636E\u7F13\u5B58\u5DF2\u4FDD\u5B58\uFF08KV+D1\uFF09");
      } catch (err) {
        console.error("[HOLIDAYS] \u2717 \u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:", err);
      }
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
    }
  }
  return jsonResponse(405, {
    ok: false,
    code: "METHOD_NOT_ALLOWED",
    message: "\u65B9\u6CD5\u4E0D\u5141\u8A31",
    meta: { requestId }
  }, corsHeaders);
}
__name(handleHolidays, "handleHolidays");

// src/api/tags.js
async function handleTags(request, env, me, requestId, url) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "GET" && !url.pathname.match(/\/tags\/\d+$/)) {
    try {
      const rows = await env.DATABASE.prepare(
        "SELECT tag_id, tag_name, tag_color, created_at FROM CustomerTags ORDER BY tag_name ASC"
      ).all();
      const data = (rows?.results || []).map((r) => ({
        tag_id: r.tag_id,
        tag_name: r.tag_name,
        tag_color: r.tag_color || null,
        created_at: r.created_at
      }));
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  if (method === "GET" && url.pathname.match(/\/tags\/\d+$/)) {
    const tagId = parseInt(url.pathname.split("/").pop(), 10);
    try {
      const row = await env.DATABASE.prepare(
        "SELECT tag_id, tag_name, tag_color, created_at FROM CustomerTags WHERE tag_id = ?"
      ).bind(tagId).first();
      if (!row) {
        return jsonResponse(404, {
          ok: false,
          code: "NOT_FOUND",
          message: "\u6A19\u7C64\u4E0D\u5B58\u5728",
          meta: { requestId }
        }, corsHeaders);
      }
      const data = {
        tag_id: row.tag_id,
        tag_name: row.tag_name,
        tag_color: row.tag_color || null,
        created_at: row.created_at
      };
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "\u67E5\u8A62\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
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
    const tagName = String(body?.tag_name || "").trim();
    const tagColor = String(body?.tag_color || "").trim();
    if (!tagName || tagName.length < 1 || tagName.length > 50) {
      errors.push({ field: "tag_name", message: "\u6A19\u7C64\u540D\u7A31\u70BA\u5FC5\u586B\uFF081-50\u5B57\uFF09" });
    }
    if (tagColor && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
      errors.push({ field: "tag_color", message: "\u984F\u8272\u78BC\u683C\u5F0F\u932F\u8AA4\uFF08\u9700\u70BA #RRGGBB\uFF09" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_name = ? LIMIT 1").bind(tagName).first();
      if (existing) {
        return jsonResponse(409, { ok: false, code: "CONFLICT", message: "\u6A19\u7C64\u540D\u7A31\u5DF2\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env.DATABASE.prepare(
        "INSERT INTO CustomerTags (tag_name, tag_color, created_at) VALUES (?, ?, ?)"
      ).bind(tagName, tagColor || null, now).run();
      const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      const data = { tag_id: idRow?.id, tag_name: tagName, tag_color: tagColor || null, created_at: now };
      return jsonResponse(201, { ok: true, code: "CREATED", message: "\u5DF2\u5EFA\u7ACB", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "PUT" && url.pathname.match(/\/tags\/\d+$/)) {
    const tagId = parseInt(url.pathname.split("/").pop(), 10);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const tagName = body?.tag_name ? String(body.tag_name).trim() : null;
    const tagColor = body?.tag_color ? String(body.tag_color).trim() : null;
    if (tagName !== null && (tagName.length < 1 || tagName.length > 50)) {
      errors.push({ field: "tag_name", message: "\u6A19\u7C64\u540D\u7A31\u9577\u5EA6\u9700\u70BA 1-50\u5B57" });
    }
    if (tagColor !== null && tagColor !== "" && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
      errors.push({ field: "tag_color", message: "\u984F\u8272\u78BC\u683C\u5F0F\u932F\u8AA4\uFF08\u9700\u70BA #RRGGBB\uFF09" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1").bind(tagId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A19\u7C64\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      if (tagName !== null) {
        const dup = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_name = ? AND tag_id != ? LIMIT 1").bind(tagName, tagId).first();
        if (dup) {
          return jsonResponse(409, { ok: false, code: "CONFLICT", message: "\u6A19\u7C64\u540D\u7A31\u5DF2\u5B58\u5728", meta: { requestId } }, corsHeaders);
        }
      }
      const updates = [];
      const binds = [];
      if (tagName !== null) {
        updates.push("tag_name = ?");
        binds.push(tagName);
      }
      if (tagColor !== null) {
        updates.push("tag_color = ?");
        binds.push(tagColor === "" ? null : tagColor);
      }
      if (updates.length === 0) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u6C92\u6709\u53EF\u66F4\u65B0\u7684\u6B04\u4F4D", meta: { requestId } }, corsHeaders);
      }
      binds.push(tagId);
      await env.DATABASE.prepare(
        `UPDATE CustomerTags SET ${updates.join(", ")} WHERE tag_id = ?`
      ).bind(...binds).run();
      const data = { tag_id: tagId, tag_name: tagName, tag_color: tagColor };
      return jsonResponse(200, { ok: true, code: "SUCCESS", message: "\u5DF2\u66F4\u65B0", data, meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
      return jsonResponse(500, body2, corsHeaders);
    }
  }
  if (method === "DELETE" && url.pathname.match(/\/tags\/\d+$/)) {
    const tagId = parseInt(url.pathname.split("/").pop(), 10);
    try {
      const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1").bind(tagId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A19\u7C64\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const usage = await env.DATABASE.prepare("SELECT COUNT(1) as cnt FROM ClientTagAssignments WHERE tag_id = ?").bind(tagId).first();
      if (Number(usage?.cnt || 0) > 0) {
        return jsonResponse(409, {
          ok: false,
          code: "CONFLICT",
          message: `\u6B64\u6A19\u7C64\u6B63\u88AB ${usage.cnt} \u500B\u5BA2\u6236\u4F7F\u7528\uFF0C\u7121\u6CD5\u522A\u9664`,
          meta: { requestId }
        }, corsHeaders);
      }
      await env.DATABASE.prepare("DELETE FROM CustomerTags WHERE tag_id = ?").bind(tagId).run();
      return jsonResponse(200, { ok: true, code: "SUCCESS", message: "\u5DF2\u522A\u9664", meta: { requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
      const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
      if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
      return jsonResponse(500, body, corsHeaders);
    }
  }
  return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } }, corsHeaders);
}
__name(handleTags, "handleTags");

// src/api/billing.js
function parseId2(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
__name(parseId2, "parseId");
async function handleBilling(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  const matchGet = path.match(/^\/internal\/api\/v1\/billing\/service\/(\d+)$/);
  if (method === "GET" && matchGet) {
    const clientServiceId = parseId2(matchGet[1]);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u670D\u52A1ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    try {
      const service = await env.DATABASE.prepare(
        `SELECT cs.client_service_id, cs.client_id, c.assignee_user_id
         FROM ClientServices cs
         LEFT JOIN Clients c ON c.client_id = cs.client_id
         WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
      ).bind(clientServiceId).first();
      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52A1\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      if (!me.is_admin && service.assignee_user_id !== me.user_id) {
        return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u65E0\u6743\u9650\u8BBF\u95EE", meta: { requestId } }, corsHeaders);
      }
      const rows = await env.DATABASE.prepare(
        `SELECT schedule_id, billing_month, billing_amount, payment_due_days, notes, 
                billing_type, billing_date, description, created_at, updated_at
         FROM ServiceBillingSchedule
         WHERE client_service_id = ?
         ORDER BY billing_type ASC, billing_month ASC`
      ).bind(clientServiceId).all();
      const data = (rows?.results || []).map((r) => ({
        schedule_id: r.schedule_id,
        billing_month: r.billing_month,
        billing_amount: Number(r.billing_amount || 0),
        payment_due_days: Number(r.payment_due_days || 30),
        notes: r.notes || "",
        billing_type: r.billing_type || "monthly",
        billing_date: r.billing_date || null,
        description: r.description || null,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      const yearTotal = data.reduce((sum, item) => sum + item.billing_amount, 0);
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u67E5\u8BE2\u6210\u529F",
        data: {
          schedules: data,
          year_total: yearTotal
        },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && path === "/internal/api/v1/billing") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const clientServiceId = parseId2(body?.client_service_id);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u670D\u52A1ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const billingType = String(body?.billing_type || "monthly").trim();
    const billingMonth = parseInt(body?.billing_month, 10);
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();
    const billingDate = String(body?.billing_date || "").trim();
    const description = String(body?.description || "").trim();
    if (!["monthly", "one-time"].includes(billingType)) {
      errors.push({ field: "billing_type", message: "\u6536\u8D39\u7C7B\u578B\u5FC5\u987B\u4E3Amonthly\u6216one-time" });
    }
    if (billingType === "monthly") {
      if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
        errors.push({ field: "billing_month", message: "\u6708\u4EFD\u5FC5\u987B\u57281-12\u4E4B\u95F4" });
      }
    } else if (billingType === "one-time") {
      if (!billingDate) {
        errors.push({ field: "billing_date", message: "\u4E00\u6B21\u6027\u6536\u8D39\u5FC5\u987B\u63D0\u4F9B\u65E5\u671F" });
      }
      if (!description) {
        errors.push({ field: "description", message: "\u4E00\u6B21\u6027\u6536\u8D39\u5FC5\u987B\u63D0\u4F9B\u8BF4\u660E" });
      }
    }
    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "\u91D1\u989D\u5FC5\u987B\u4E3A\u975E\u8D1F\u6570" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "\u6536\u6B3E\u671F\u9650\u5FC5\u987B\u5927\u4E8E0" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const service = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0"
      ).bind(clientServiceId).first();
      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52A1\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      if (billingType === "monthly") {
        const existing = await env.DATABASE.prepare(
          "SELECT schedule_id FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ? AND billing_type = 'monthly'"
        ).bind(clientServiceId, billingMonth).first();
        if (existing) {
          return jsonResponse(422, {
            ok: false,
            code: "DUPLICATE",
            message: "\u8BE5\u6708\u4EFD\u5DF2\u8BBE\u5B9A\u6536\u8D39",
            errors: [{ field: "billing_month", message: "\u8BE5\u6708\u4EFD\u5DF2\u5B58\u5728" }],
            meta: { requestId }
          }, corsHeaders);
        }
      }
      const result = await env.DATABASE.prepare(
        `INSERT INTO ServiceBillingSchedule 
         (client_service_id, billing_type, billing_month, billing_amount, payment_due_days, notes, billing_date, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        clientServiceId,
        billingType,
        billingType === "monthly" ? billingMonth : 0,
        billingAmount,
        paymentDueDays,
        notes || null,
        billingDate || null,
        description || null
      ).run();
      const scheduleId = result?.meta?.last_row_id;
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u6536\u8D39\u660E\u7EC6\u5DF2\u65B0\u589E",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && matchGet) {
    const clientServiceId = parseId2(matchGet[1]);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u670D\u52A1ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const billingMonth = parseInt(body?.billing_month, 10);
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();
    if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
      errors.push({ field: "billing_month", message: "\u6708\u4EFD\u5FC5\u987B\u57281-12\u4E4B\u95F4" });
    }
    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "\u91D1\u989D\u5FC5\u987B\u4E3A\u975E\u8D1F\u6570" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "\u6536\u6B3E\u671F\u9650\u5FC5\u987B\u5927\u4E8E0" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const service = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0"
      ).bind(clientServiceId).first();
      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u670D\u52A1\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ?"
      ).bind(clientServiceId, billingMonth).first();
      if (existing) {
        return jsonResponse(422, {
          ok: false,
          code: "DUPLICATE",
          message: "\u8BE5\u6708\u4EFD\u5DF2\u8BBE\u5B9A\u6536\u8D39",
          errors: [{ field: "billing_month", message: "\u8BE5\u6708\u4EFD\u5DF2\u5B58\u5728" }],
          meta: { requestId }
        }, corsHeaders);
      }
      const result = await env.DATABASE.prepare(
        `INSERT INTO ServiceBillingSchedule (client_service_id, billing_type, billing_month, billing_amount, payment_due_days, notes)
         VALUES (?, 'monthly', ?, ?, ?, ?)`
      ).bind(clientServiceId, billingMonth, billingAmount, paymentDueDays, notes).run();
      const scheduleId = result?.meta?.last_row_id;
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u6536\u8D39\u660E\u7EC6\u5DF2\u65B0\u589E",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  const matchUpdate = path.match(/^\/internal\/api\/v1\/billing\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    const scheduleId = parseId2(matchUpdate[1]);
    if (!scheduleId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u660E\u7EC6ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();
    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "\u91D1\u989D\u5FC5\u987B\u4E3A\u975E\u8D1F\u6570" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "\u6536\u6B3E\u671F\u9650\u5FC5\u987B\u5927\u4E8E0" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u8D39\u660E\u7EC6\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        `UPDATE ServiceBillingSchedule 
         SET billing_amount = ?, payment_due_days = ?, notes = ?, updated_at = datetime('now')
         WHERE schedule_id = ?`
      ).bind(billingAmount, paymentDueDays, notes, scheduleId).run();
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6536\u8D39\u660E\u7EC6\u5DF2\u66F4\u65B0",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "DELETE" && matchUpdate) {
    const scheduleId = parseId2(matchUpdate[1]);
    if (!scheduleId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u660E\u7EC6ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6536\u8D39\u660E\u7EC6\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        "DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).run();
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6536\u8D39\u660E\u7EC6\u5DF2\u5220\u9664",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u8DEF\u7531\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleBilling, "handleBilling");

// src/api/task_templates.js
function parseId3(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
__name(parseId3, "parseId");
async function handleTaskTemplates(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "GET" && path === "/internal/api/v1/task-templates") {
    const serviceId = url.searchParams.get("service_id");
    const clientId = url.searchParams.get("client_id");
    try {
      let query = `
        SELECT tt.template_id, tt.template_name, tt.service_id, tt.client_id, tt.description, 
               tt.sop_id, tt.is_active, tt.created_at,
               tt.default_due_date_rule, tt.default_due_date_value, 
               tt.default_due_date_offset_days, tt.default_advance_days,
               s.service_name, s.service_code,
               c.company_name as client_name,
               (SELECT COUNT(*) FROM TaskTemplateStages WHERE template_id = tt.template_id) as stages_count
        FROM TaskTemplates tt
        LEFT JOIN Services s ON s.service_id = tt.service_id
        LEFT JOIN Clients c ON c.client_id = tt.client_id
        WHERE 1=1
      `;
      const params = [];
      if (serviceId) {
        query += ` AND tt.service_id = ?`;
        params.push(parseInt(serviceId, 10));
      }
      if (clientId) {
        if (clientId === "null") {
          query += ` AND tt.client_id IS NULL`;
        } else {
          query += ` AND tt.client_id = ?`;
          params.push(parseInt(clientId, 10));
        }
      }
      query += ` ORDER BY tt.template_name ASC`;
      const stmt = params.length > 0 ? env.DATABASE.prepare(query).bind(...params) : env.DATABASE.prepare(query);
      const rows = await stmt.all();
      const data = (rows?.results || []).map((r) => ({
        template_id: r.template_id,
        template_name: r.template_name || "",
        service_id: r.service_id || null,
        service_name: r.service_name || "",
        service_code: r.service_code || "",
        client_id: r.client_id || null,
        client_name: r.client_name || "",
        description: r.description || "",
        sop_id: r.sop_id || null,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        stages_count: r.stages_count || 0,
        default_due_date_rule: r.default_due_date_rule || null,
        default_due_date_value: r.default_due_date_value || null,
        default_due_date_offset_days: r.default_due_date_offset_days || 0,
        default_advance_days: r.default_advance_days || 7
      }));
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u67E5\u8BE2\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  const matchGet = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)$/);
  if (method === "GET" && matchGet) {
    const templateId = parseId3(matchGet[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u6A21\u677FID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    try {
      const template = await env.DATABASE.prepare(
        `SELECT tt.template_id, tt.template_name, tt.service_id, tt.description, 
                tt.sop_id, tt.is_active, tt.created_at,
                s.service_name, s.service_code
         FROM TaskTemplates tt
         LEFT JOIN Services s ON s.service_id = tt.service_id
         WHERE tt.template_id = ?`
      ).bind(templateId).first();
      if (!template) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A21\u677F\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const stagesRows = await env.DATABASE.prepare(
        `SELECT stage_id, stage_name, stage_order, description, estimated_hours
         FROM TaskTemplateStages
         WHERE template_id = ?
         ORDER BY stage_order ASC`
      ).bind(templateId).all();
      const stages = (stagesRows?.results || []).map((s) => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name || "",
        stage_order: s.stage_order,
        description: s.description || "",
        estimated_hours: Number(s.estimated_hours || 0)
      }));
      const data = {
        template_id: template.template_id,
        template_name: template.template_name || "",
        service_id: template.service_id || null,
        service_name: template.service_name || "",
        service_code: template.service_code || "",
        description: template.description || "",
        sop_id: template.sop_id || null,
        is_active: Boolean(template.is_active),
        created_at: template.created_at,
        stages
      };
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u67E5\u8BE2\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && path === "/internal/api/v1/task-templates") {
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u521B\u5EFA\u6A21\u677F", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const templateName = String(body?.template_name || "").trim();
    const serviceId = body?.service_id ? parseInt(body.service_id, 10) : null;
    const clientId = body?.client_id ? parseInt(body.client_id, 10) : null;
    const description = String(body?.description || "").trim();
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const stages = Array.isArray(body?.stages) ? body.stages : [];
    if (!templateName) {
      errors.push({ field: "template_name", message: "\u8BF7\u8F93\u5165\u6A21\u677F\u540D\u79F0" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const result = await env.DATABASE.prepare(
        `INSERT INTO TaskTemplates (template_name, service_id, client_id, description, sop_id, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).bind(templateName, serviceId, clientId, description, sopId).run();
      const templateId = result?.meta?.last_row_id;
      if (stages.length > 0) {
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const stageName = String(stage?.stage_name || "").trim();
          const stageDesc = String(stage?.description || "").trim();
          const estimatedHours = parseFloat(stage?.estimated_hours || 0);
          if (stageName) {
            await env.DATABASE.prepare(
              `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(templateId, stageName, i + 1, stageDesc, estimatedHours).run();
          }
        }
      }
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u6A21\u677F\u5DF2\u521B\u5EFA",
        data: { template_id: templateId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  const matchUpdate = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    const templateId = parseId3(matchUpdate[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u6A21\u677FID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u66F4\u65B0\u6A21\u677F", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const templateName = String(body?.template_name || "").trim();
    const serviceId = body?.service_id ? parseInt(body.service_id, 10) : null;
    const description = String(body?.description || "").trim();
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const isActive = body?.is_active !== false;
    const stages = Array.isArray(body?.stages) ? body.stages : null;
    if (!templateName) {
      errors.push({ field: "template_name", message: "\u8BF7\u8F93\u5165\u6A21\u677F\u540D\u79F0" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A21\u677F\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        `UPDATE TaskTemplates 
         SET template_name = ?, service_id = ?, description = ?, sop_id = ?, is_active = ?
         WHERE template_id = ?`
      ).bind(templateName, serviceId, description, sopId, isActive ? 1 : 0, templateId).run();
      if (stages !== null) {
        await env.DATABASE.prepare(
          "DELETE FROM TaskTemplateStages WHERE template_id = ?"
        ).bind(templateId).run();
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const stageName = String(stage?.stage_name || "").trim();
          const stageDesc = String(stage?.description || "").trim();
          const estimatedHours = parseFloat(stage?.estimated_hours || 0);
          if (stageName) {
            await env.DATABASE.prepare(
              `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(templateId, stageName, i + 1, stageDesc, estimatedHours).run();
          }
        }
      }
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6A21\u677F\u5DF2\u66F4\u65B0",
        data: { template_id: templateId },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "DELETE" && matchUpdate) {
    const templateId = parseId3(matchUpdate[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u6A21\u677FID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u5220\u9664\u6A21\u677F", meta: { requestId } }, corsHeaders);
    }
    try {
      const existing = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();
      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A21\u677F\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const inUse = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE task_template_id = ? AND is_deleted = 0 LIMIT 1"
      ).bind(templateId).first();
      if (inUse) {
        return jsonResponse(422, {
          ok: false,
          code: "IN_USE",
          message: "\u8BE5\u6A21\u677F\u6B63\u5728\u88AB\u4F7F\u7528\uFF0C\u65E0\u6CD5\u5220\u9664",
          meta: { requestId }
        }, corsHeaders);
      }
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplateStages WHERE template_id = ?"
      ).bind(templateId).run();
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).run();
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u6A21\u677F\u5DF2\u5220\u9664",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  const matchStages = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)\/stages$/);
  if (method === "GET" && matchStages) {
    const templateId = parseId3(matchStages[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u6A21\u677FID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    try {
      const stagesRows = await env.DATABASE.prepare(
        `SELECT stage_id, stage_name, stage_order, description, 
                estimated_hours, sop_id, attachment_id,
                due_date_rule, due_date_value, due_date_offset_days, advance_days
         FROM TaskTemplateStages
         WHERE template_id = ?
         ORDER BY stage_order ASC`
      ).bind(templateId).all();
      const stages = (stagesRows?.results || []).map((s) => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name || "",
        stage_order: s.stage_order,
        description: s.description || "",
        estimated_hours: Number(s.estimated_hours || 0),
        sop_id: s.sop_id || null,
        attachment_id: s.attachment_id || null,
        due_date_rule: s.due_date_rule || "end_of_month",
        due_date_value: s.due_date_value || null,
        due_date_offset_days: s.due_date_offset_days || 0,
        advance_days: s.advance_days || 7
      }));
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u67E5\u8BE2\u6210\u529F",
        data: stages,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  if (method === "POST" && matchStages) {
    const templateId = parseId3(matchStages[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "\u6A21\u677FID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u6DFB\u52A0\u9636\u6BB5", meta: { requestId } }, corsHeaders);
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
    const errors = [];
    const stageName = String(body?.stage_name || "").trim();
    const stageOrder = body?.stage_order ? parseInt(body.stage_order, 10) : null;
    const description = String(body?.description || "").trim();
    const estimatedHours = body?.estimated_hours ? parseFloat(body.estimated_hours) : null;
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const attachmentId = body?.attachment_id ? parseInt(body.attachment_id, 10) : null;
    if (!stageName) {
      errors.push({ field: "stage_name", message: "\u8BF7\u8F93\u5165\u4EFB\u52A1\u540D\u79F0" });
    }
    if (!stageOrder || stageOrder < 1) {
      errors.push({ field: "stage_order", message: "\u8BF7\u8F93\u5165\u6709\u6548\u7684\u987A\u5E8F" });
    }
    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F93\u5165\u6709\u8BEF", errors, meta: { requestId } }, corsHeaders);
    }
    try {
      const template = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();
      if (!template) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u6A21\u677F\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      const result = await env.DATABASE.prepare(
        `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours, sop_id, attachment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(templateId, stageName, stageOrder, description, estimatedHours, sopId, attachmentId).run();
      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "\u4EFB\u52A1\u5DF2\u6DFB\u52A0",
        data: { stage_id: result?.meta?.last_row_id },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  const matchDeleteStage = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)\/stages\/(\d+)$/);
  if (method === "DELETE" && matchDeleteStage) {
    const templateId = parseId3(matchDeleteStage[1]);
    const stageId = parseId3(matchDeleteStage[2]);
    if (!templateId || !stageId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "ID\u65E0\u6548", meta: { requestId } }, corsHeaders);
    }
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u5220\u9664\u9636\u6BB5", meta: { requestId } }, corsHeaders);
    }
    try {
      const stage = await env.DATABASE.prepare(
        "SELECT stage_id FROM TaskTemplateStages WHERE template_id = ? AND stage_id = ?"
      ).bind(templateId, stageId).first();
      if (!stage) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u4EFB\u52A1\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
      }
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplateStages WHERE template_id = ? AND stage_id = ?"
      ).bind(templateId, stageId).run();
      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "\u4EFB\u52A1\u5DF2\u5220\u9664",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u670D\u52A1\u5668\u9519\u8BEF", meta: { requestId } }, corsHeaders);
    }
  }
  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "\u8DEF\u7531\u4E0D\u5B58\u5728", meta: { requestId } }, corsHeaders);
}
__name(handleTaskTemplates, "handleTaskTemplates");

// src/api/services.js
function parseId4(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
__name(parseId4, "parseId");
async function handleServices(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (method === "GET" && path === "/internal/api/v1/services") {
    try {
      const rows = await env.DATABASE.prepare(`
        SELECT service_id, service_name, service_code, description, 
               is_active, sort_order, created_at, updated_at
        FROM Services
        WHERE is_active = 1
        ORDER BY sort_order ASC, service_id ASC
      `).all();
      const data = (rows?.results || []).map((r) => ({
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
        message: "\u67E5\u8BE2\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u670D\u52A1\u5668\u9519\u8BEF",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  if (method === "POST" && path === "/internal/api/v1/services") {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
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
        message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF",
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
        message: "\u670D\u52A1\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
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
        message: "\u521B\u5EFA\u6210\u529F",
        data: { service_id: result.meta.last_row_id },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u521B\u5EFA\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchUpdate = path.match(/^\/internal\/api\/v1\/services\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
        meta: { requestId }
      }, corsHeaders);
    }
    const serviceId = parseId4(matchUpdate[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684\u670D\u52A1ID",
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
        message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF",
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
        message: "\u670D\u52A1\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
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
        message: "\u66F4\u65B0\u6210\u529F",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u66F4\u65B0\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchDelete = path.match(/^\/internal\/api\/v1\/services\/(\d+)$/);
  if (method === "DELETE" && matchDelete) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
        meta: { requestId }
      }, corsHeaders);
    }
    const serviceId = parseId4(matchDelete[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684\u670D\u52A1ID",
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
        message: "\u5220\u9664\u6210\u529F",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u5220\u9664\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  if (method === "GET" && path === "/internal/api/v1/services/items") {
    try {
      const rows = await env.DATABASE.prepare(`
        SELECT si.item_id, si.service_id, si.item_name, si.item_code, si.description,
               si.is_active, si.sort_order, si.created_at, si.updated_at,
               s.service_name
        FROM ServiceItems si
        LEFT JOIN Services s ON s.service_id = si.service_id
        WHERE si.is_active = 1
        ORDER BY si.service_id ASC, si.sort_order ASC, si.item_id ASC
      `).all();
      const data = (rows?.results || []).map((r) => ({
        item_id: r.item_id,
        service_id: r.service_id,
        service_name: r.service_name || "",
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
        message: "\u67E5\u8BE2\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u670D\u52A1\u5668\u9519\u8BEF",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchGetItems = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items$/);
  if (method === "GET" && matchGetItems) {
    const serviceId = parseId4(matchGetItems[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684\u670D\u52A1ID",
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
      const data = (rows?.results || []).map((r) => ({
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
        message: "\u67E5\u8BE2\u6210\u529F",
        data,
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u670D\u52A1\u5668\u9519\u8BEF",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchCreateItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items$/);
  if (method === "POST" && matchCreateItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
        meta: { requestId }
      }, corsHeaders);
    }
    const serviceId = parseId4(matchCreateItem[1]);
    if (!serviceId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684\u670D\u52A1ID",
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
        message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF",
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
        message: "\u5B50\u9879\u76EE\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
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
        message: "\u521B\u5EFA\u6210\u529F",
        data: { item_id: result.meta.last_row_id },
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u521B\u5EFA\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchUpdateItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items\/(\d+)$/);
  if (method === "PUT" && matchUpdateItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
        meta: { requestId }
      }, corsHeaders);
    }
    const serviceId = parseId4(matchUpdateItem[1]);
    const itemId = parseId4(matchUpdateItem[2]);
    if (!serviceId || !itemId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684ID",
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
        message: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF",
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
        message: "\u5B50\u9879\u76EE\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
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
        message: "\u66F4\u65B0\u6210\u529F",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u66F4\u65B0\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  const matchDeleteItem = path.match(/^\/internal\/api\/v1\/services\/(\d+)\/items\/(\d+)$/);
  if (method === "DELETE" && matchDeleteItem) {
    if (!me?.is_admin) {
      return jsonResponse(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650",
        meta: { requestId }
      }, corsHeaders);
    }
    const serviceId = parseId4(matchDeleteItem[1]);
    const itemId = parseId4(matchDeleteItem[2]);
    if (!serviceId || !itemId) {
      return jsonResponse(400, {
        ok: false,
        code: "BAD_REQUEST",
        message: "\u65E0\u6548\u7684ID",
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
        message: "\u5220\u9664\u6210\u529F",
        meta: { requestId }
      }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "\u5220\u9664\u5931\u8D25",
        meta: { requestId }
      }, corsHeaders);
    }
  }
  return jsonResponse(404, {
    ok: false,
    code: "NOT_FOUND",
    message: "API\u8DEF\u5F84\u4E0D\u5B58\u5728",
    meta: { requestId }
  }, corsHeaders);
}
__name(handleServices, "handleServices");

// src/api/service_components.js
async function handleServiceComponents(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;
  const corsHeaders = getCorsHeadersForRequest(request, env);
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (method === "GET" && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await listServiceComponents(env, corsHeaders, clientServiceId);
  }
  if (method === "POST" && path.match(/^\/internal\/api\/v1\/client-services\/(\d+)\/components$/)) {
    const clientServiceId = parseInt(path.match(/\/client-services\/(\d+)\/components$/)[1]);
    return await createServiceComponent(request, env, corsHeaders, clientServiceId);
  }
  if (method === "PUT" && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await updateServiceComponent(request, env, corsHeaders, componentId);
  }
  if (method === "DELETE" && path.match(/^\/internal\/api\/v1\/service-components\/(\d+)$/)) {
    const componentId = parseInt(path.match(/\/service-components\/(\d+)$/)[1]);
    return await deleteServiceComponent(env, corsHeaders, componentId);
  }
  return null;
}
__name(handleServiceComponents, "handleServiceComponents");
async function listServiceComponents(env, corsHeaders, clientServiceId) {
  try {
    console.log("[listServiceComponents] \u5F00\u59CB\u67E5\u8BE2, clientServiceId:", clientServiceId);
    const components = await env.DATABASE.prepare(`
      SELECT 
        sc.*,
        s.service_name,
        si.item_name as service_item_name,
        tt.template_name
      FROM ServiceComponents sc
      LEFT JOIN Services s ON sc.service_id = s.service_id
      LEFT JOIN ServiceItems si ON sc.service_item_id = si.item_id
      LEFT JOIN TaskTemplates tt ON sc.task_template_id = tt.template_id
      WHERE sc.client_service_id = ? AND sc.is_active = 1
      ORDER BY sc.component_id
    `).bind(clientServiceId).all();
    console.log("[listServiceComponents] \u67E5\u8BE2\u5230\u7EC4\u4EF6\u6570\u91CF:", components.results?.length || 0);
    const componentsWithDetails = await Promise.all(
      (components.results || []).map(async (c, index) => {
        try {
          console.log(`[listServiceComponents] \u5904\u7406\u7EC4\u4EF6 ${index + 1}/${components.results.length}, component_id:`, c.component_id);
          if (!c.component_id && c.component_id !== 0) {
            console.error("[listServiceComponents] \u7EC4\u4EF6\u7F3A\u5C11component_id!", c);
            throw new Error("\u7EC4\u4EF6\u7F3A\u5C11component_id");
          }
          const componentSOPs = await env.DATABASE.prepare(`
            SELECT sop.sop_id, sop.title, sop.category, scs.sort_order
            FROM ServiceComponentSOPs scs
            JOIN SOPDocuments sop ON sop.sop_id = scs.sop_id
            WHERE scs.component_id = ? AND sop.is_deleted = 0
            ORDER BY scs.sort_order
          `).bind(c.component_id).all();
          console.log(`[listServiceComponents] \u7EC4\u4EF6 ${c.component_id} \u7684\u670D\u52A1SOP\u6570\u91CF:`, componentSOPs.results?.length || 0);
          const tasks = await env.DATABASE.prepare(`
            SELECT 
              config_id, component_id, task_order, task_name, 
              assignee_user_id, notes, due_rule, due_value, 
              estimated_hours, advance_days, created_at
            FROM ServiceComponentTasks
            WHERE component_id = ?
            ORDER BY task_order
          `).bind(c.component_id).all();
          console.log(`[listServiceComponents] \u7EC4\u4EF6 ${c.component_id} \u7684\u4EFB\u52A1\u6570\u91CF:`, tasks.results?.length || 0);
          const tasksWithSOPs = await Promise.all(
            (tasks.results || []).map(async (task) => {
              console.log(`[listServiceComponents] \u67E5\u8BE2\u4EFB\u52A1SOP, task\u5BF9\u8C61:`, JSON.stringify(task));
              if (!task.config_id && task.config_id !== 0) {
                console.error(`[listServiceComponents] \u8B66\u544A\uFF1A\u4EFB\u52A1\u7F3A\u5C11config_id\u5B57\u6BB5\uFF01task\u5BF9\u8C61:`, task);
                return {
                  ...task,
                  sops: []
                };
              }
              const taskSOPs = await env.DATABASE.prepare(`
                SELECT sop.sop_id, sop.title, sop.category, scts.sort_order
                FROM ServiceComponentTaskSOPs scts
                JOIN SOPDocuments sop ON sop.sop_id = scts.sop_id
                WHERE scts.task_config_id = ? AND sop.is_deleted = 0
                ORDER BY scts.sort_order
              `).bind(task.config_id).all();
              console.log(`[listServiceComponents] \u4EFB\u52A1 ${task.config_id} \u7684SOP\u6570\u91CF:`, taskSOPs.results?.length || 0);
              return {
                ...task,
                sops: taskSOPs.results || []
              };
            })
          );
          console.log(`[listServiceComponents] \u7EC4\u4EF6 ${c.component_id} \u5904\u7406\u5B8C\u6210`);
          return {
            ...c,
            component_sops: componentSOPs.results || [],
            tasks: tasksWithSOPs,
            delivery_months: c.delivery_months ? JSON.parse(c.delivery_months) : null
          };
        } catch (err) {
          console.error(`[listServiceComponents] \u5904\u7406\u7EC4\u4EF6 ${c.component_id} \u65F6\u51FA\u9519:`, err);
          throw err;
        }
      })
    );
    console.log("[listServiceComponents] \u6240\u6709\u7EC4\u4EF6\u5904\u7406\u5B8C\u6210\uFF0C\u51C6\u5907\u8FD4\u56DE");
    return jsonResponse(200, {
      ok: true,
      data: componentsWithDetails
    }, corsHeaders);
  } catch (err) {
    console.error("\u83B7\u53D6\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5931\u8D25:", err);
    console.error("\u9519\u8BEF\u5806\u6808:", err.stack);
    return jsonResponse(500, {
      ok: false,
      message: "\u83B7\u53D6\u5931\u8D25",
      error: String(err),
      debug: err.message || String(err)
    }, corsHeaders);
  }
}
__name(listServiceComponents, "listServiceComponents");
async function createServiceComponent(request, env, corsHeaders, clientServiceId) {
  try {
    const body = await request.json();
    const {
      service_id,
      service_item_id,
      component_name,
      delivery_frequency,
      delivery_months,
      task_template_id,
      auto_generate_task = true,
      advance_days = 7,
      due_date_rule,
      due_date_value,
      due_date_offset_days = 0,
      estimated_hours,
      notes,
      component_sop_ids = [],
      // 服务层级SOP（多选）
      tasks = []
    } = body;
    if (!component_name || !service_id) {
      return jsonResponse(400, {
        ok: false,
        message: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5",
        debug: { component_name, service_id, delivery_frequency }
      }, corsHeaders);
    }
    if (!tasks || tasks.length === 0) {
      return jsonResponse(400, {
        ok: false,
        message: "\u8ACB\u81F3\u5C11\u65B0\u589E\u4E00\u500B\u4EFB\u52D9"
      }, corsHeaders);
    }
    const result = await env.DATABASE.prepare(`
      INSERT INTO ServiceComponents (
        client_service_id, service_id, service_item_id, component_name,
        delivery_frequency, delivery_months,
        task_template_id, auto_generate_task, advance_days,
        due_date_rule, due_date_value, due_date_offset_days,
        estimated_hours, notes, sop_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clientServiceId,
      service_id,
      service_item_id || null,
      component_name || "\u4EFB\u52D9\u914D\u7F6E",
      delivery_frequency || "monthly",
      delivery_months ? JSON.stringify(delivery_months) : null,
      task_template_id || null,
      auto_generate_task ? 1 : 0,
      advance_days || 7,
      due_date_rule || null,
      due_date_value || null,
      due_date_offset_days || 0,
      estimated_hours || null,
      notes || null,
      null
      // sop_id保留为null，改用ServiceComponentSOPs表
    ).run();
    const componentId = result.meta.last_row_id;
    if (component_sop_ids && Array.isArray(component_sop_ids) && component_sop_ids.length > 0) {
      const validSopIds = component_sop_ids.filter((id) => id && !isNaN(id) && id > 0);
      for (let i = 0; i < validSopIds.length; i++) {
        await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentSOPs (component_id, sop_id, sort_order)
          VALUES (?, ?, ?)
        `).bind(componentId, validSopIds[i], i).run();
      }
    }
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskResult = await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentTasks (
            component_id, task_order, task_name, assignee_user_id, notes,
            due_rule, due_value, estimated_hours, advance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          componentId,
          i,
          task.task_name || "",
          task.assignee_user_id || null,
          task.notes || null,
          task.due_rule || "end_of_month",
          task.due_value || null,
          task.estimated_hours || null,
          task.advance_days || 7
        ).run();
        const taskConfigId = taskResult.meta.last_row_id;
        if (task.sop_ids && Array.isArray(task.sop_ids) && task.sop_ids.length > 0) {
          const validTaskSopIds = task.sop_ids.filter((id) => id && !isNaN(id) && id > 0);
          for (let j = 0; j < validTaskSopIds.length; j++) {
            await env.DATABASE.prepare(`
              INSERT INTO ServiceComponentTaskSOPs (task_config_id, sop_id, sort_order)
              VALUES (?, ?, ?)
            `).bind(taskConfigId, validTaskSopIds[j], j).run();
          }
        }
      }
    }
    return jsonResponse(201, {
      ok: true,
      message: "\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5DF2\u521B\u5EFA",
      data: { component_id: componentId }
    }, corsHeaders);
  } catch (err) {
    console.error("\u521B\u5EFA\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5931\u8D25:", err);
    console.error("\u9519\u8BEF\u8BE6\u60C5:", err.message);
    console.error("\u9519\u8BEF\u5806\u6808:", err.stack);
    return jsonResponse(500, {
      ok: false,
      message: "\u521B\u5EFA\u5931\u8D25\uFF1A" + err.message,
      debug: String(err)
    }, corsHeaders);
  }
}
__name(createServiceComponent, "createServiceComponent");
async function updateServiceComponent(request, env, corsHeaders, componentId) {
  try {
    const body = await request.json();
    const {
      component_name,
      delivery_frequency,
      delivery_months,
      task_template_id,
      auto_generate_task = true,
      advance_days = 7,
      due_date_rule,
      due_date_value,
      due_date_offset_days = 0,
      estimated_hours,
      notes,
      component_sop_ids = [],
      tasks = []
    } = body;
    if (!component_name || !delivery_frequency) {
      return jsonResponse(400, {
        ok: false,
        message: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5"
      }, corsHeaders);
    }
    await env.DATABASE.prepare(`
      UPDATE ServiceComponents SET
        component_name = ?,
        delivery_frequency = ?,
        delivery_months = ?,
        task_template_id = ?,
        auto_generate_task = ?,
        advance_days = ?,
        due_date_rule = ?,
        due_date_value = ?,
        due_date_offset_days = ?,
        estimated_hours = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE component_id = ?
    `).bind(
      component_name,
      delivery_frequency,
      delivery_months ? JSON.stringify(delivery_months) : null,
      task_template_id || null,
      auto_generate_task ? 1 : 0,
      advance_days,
      due_date_rule || null,
      due_date_value || null,
      due_date_offset_days,
      estimated_hours || null,
      notes || null,
      componentId
    ).run();
    await env.DATABASE.prepare(
      "DELETE FROM ServiceComponentSOPs WHERE component_id = ?"
    ).bind(componentId).run();
    if (component_sop_ids && Array.isArray(component_sop_ids) && component_sop_ids.length > 0) {
      const validSopIds = component_sop_ids.filter((id) => id && !isNaN(id) && id > 0);
      for (let i = 0; i < validSopIds.length; i++) {
        await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentSOPs (component_id, sop_id, sort_order)
          VALUES (?, ?, ?)
        `).bind(componentId, validSopIds[i], i).run();
      }
    }
    const oldTasks = await env.DATABASE.prepare(
      "SELECT config_id FROM ServiceComponentTasks WHERE component_id = ?"
    ).bind(componentId).all();
    for (const oldTask of oldTasks.results || []) {
      await env.DATABASE.prepare(
        "DELETE FROM ServiceComponentTaskSOPs WHERE task_config_id = ?"
      ).bind(oldTask.config_id).run();
    }
    await env.DATABASE.prepare(
      "DELETE FROM ServiceComponentTasks WHERE component_id = ?"
    ).bind(componentId).run();
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskResult = await env.DATABASE.prepare(`
          INSERT INTO ServiceComponentTasks (
            component_id, task_order, task_name, assignee_user_id, notes,
            due_rule, due_value, estimated_hours, advance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          componentId,
          i,
          task.task_name || "",
          task.assignee_user_id || null,
          task.notes || null,
          task.due_rule || "end_of_month",
          task.due_value || null,
          task.estimated_hours || null,
          task.advance_days || 7
        ).run();
        const taskConfigId = taskResult.meta.last_row_id;
        if (task.sop_ids && Array.isArray(task.sop_ids) && task.sop_ids.length > 0) {
          const validTaskSopIds = task.sop_ids.filter((id) => id && !isNaN(id) && id > 0);
          for (let j = 0; j < validTaskSopIds.length; j++) {
            await env.DATABASE.prepare(`
              INSERT INTO ServiceComponentTaskSOPs (task_config_id, sop_id, sort_order)
              VALUES (?, ?, ?)
            `).bind(taskConfigId, validTaskSopIds[j], j).run();
          }
        }
      }
    }
    return jsonResponse(200, {
      ok: true,
      message: "\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5DF2\u66F4\u65B0",
      data: { component_id: componentId }
    }, corsHeaders);
  } catch (err) {
    console.error("\u66F4\u65B0\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5931\u8D25:", err);
    return jsonResponse(500, { ok: false, message: "\u66F4\u65B0\u5931\u8D25", error: String(err) }, corsHeaders);
  }
}
__name(updateServiceComponent, "updateServiceComponent");
async function deleteServiceComponent(env, corsHeaders, componentId) {
  try {
    const tasks = await env.DATABASE.prepare(
      "SELECT COUNT(*) as count FROM ActiveTasks WHERE component_id = ? AND is_deleted = 0"
    ).bind(componentId).first();
    if (tasks && tasks.count > 0) {
      return jsonResponse(400, {
        ok: false,
        message: `\u65E0\u6CD5\u5220\u9664\uFF1A\u8FD8\u6709 ${tasks.count} \u4E2A\u5173\u8054\u7684\u4EFB\u52A1`
      }, corsHeaders);
    }
    await env.DATABASE.prepare(
      "UPDATE ServiceComponents SET is_active = 0 WHERE component_id = ?"
    ).bind(componentId).run();
    return jsonResponse(200, {
      ok: true,
      message: "\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5DF2\u5220\u9664"
    }, corsHeaders);
  } catch (err) {
    console.error("\u5220\u9664\u670D\u52A1\u7EC4\u6210\u90E8\u5206\u5931\u8D25:", err);
    return jsonResponse(500, { ok: false, message: "\u5220\u9664\u5931\u8D25" }, corsHeaders);
  }
}
__name(deleteServiceComponent, "deleteServiceComponent");

// src/api/task_generator.js
function calculateDueDate(component, targetYear, targetMonth) {
  const dueRule = component.due_date_rule;
  const dueValue = component.due_date_value;
  const offsetDays = component.due_date_offset_days || 0;
  let dueDate;
  switch (dueRule) {
    case "end_of_month":
      dueDate = new Date(targetYear, targetMonth + 1, 0);
      break;
    case "specific_day":
      dueDate = new Date(targetYear, targetMonth, dueValue || 1);
      break;
    case "next_month_day":
      dueDate = new Date(targetYear, targetMonth + 1, dueValue || 1);
      break;
    case "days_after_start":
      dueDate = new Date(targetYear, targetMonth, 1);
      dueDate.setDate(dueDate.getDate() + (dueValue || 30));
      break;
    default:
      dueDate = new Date(targetYear, targetMonth + 1, 0);
  }
  if (offsetDays) {
    dueDate.setDate(dueDate.getDate() + offsetDays);
  }
  return dueDate;
}
__name(calculateDueDate, "calculateDueDate");
function shouldGenerateInMonth(component, month) {
  const frequency = component.delivery_frequency;
  const deliveryMonths = component.delivery_months ? JSON.parse(component.delivery_months) : null;
  if (deliveryMonths && Array.isArray(deliveryMonths)) {
    return deliveryMonths.includes(month + 1);
  }
  switch (frequency) {
    case "monthly":
      return true;
    // 每月都生成
    case "bi-monthly":
      return (month + 1) % 2 === 1;
    // 奇数月
    case "quarterly":
      return [0, 3, 6, 9].includes(month);
    // 1,4,7,10月
    case "yearly":
      return month === 0;
    // 仅1月
    case "one-time":
      return false;
    // 一次性服务需要手动创建
    default:
      return false;
  }
}
__name(shouldGenerateInMonth, "shouldGenerateInMonth");
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
__name(formatDate, "formatDate");
function generateTaskName(component, client, targetYear, targetMonth) {
  const monthStr = `${targetYear}\u5E74${targetMonth + 1}\u6708`;
  const compName = component.component_name || component.service_name || "\u670D\u52A1";
  const clientName = client.company_name || "\u5BA2\u6237";
  return `${clientName} - ${monthStr}${compName}`;
}
__name(generateTaskName, "generateTaskName");
async function copyStagesFromTemplate(env, taskId, templateId) {
  if (!templateId) return;
  try {
    const stages = await env.DATABASE.prepare(`
      SELECT stage_name, stage_order, description, estimated_hours
      FROM TaskTemplateStages
      WHERE template_id = ?
      ORDER BY stage_order
    `).bind(templateId).all();
    for (const stage of stages.results || []) {
      await env.DATABASE.prepare(`
        INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status)
        VALUES (?, ?, ?, 'pending')
      `).bind(taskId, stage.stage_name, stage.stage_order).run();
    }
  } catch (err) {
    console.error("\u590D\u5236\u4EFB\u52A1\u9636\u6BB5\u5931\u8D25:", err);
  }
}
__name(copyStagesFromTemplate, "copyStagesFromTemplate");
async function copyServiceSOPsToTask(env, taskId, componentId) {
  if (!componentId) return;
  try {
    const componentSOPs = await env.DATABASE.prepare(`
      SELECT sop_id, sort_order
      FROM ServiceComponentSOPs
      WHERE component_id = ?
      ORDER BY sort_order
    `).bind(componentId).all();
    for (const sop of componentSOPs.results || []) {
      await env.DATABASE.prepare(`
        INSERT OR IGNORE INTO ActiveTaskSOPs (task_id, sop_id, sort_order)
        VALUES (?, ?, ?)
      `).bind(taskId, sop.sop_id, sop.sort_order).run();
    }
    if (componentSOPs.results && componentSOPs.results.length > 0) {
      console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5DF2\u590D\u5236 ${componentSOPs.results.length} \u4E2A\u670D\u52A1\u5C42\u7EA7 SOP \u5230\u4EFB\u52A1 ${taskId}`);
    }
  } catch (err) {
    console.error("\u590D\u5236\u670D\u52A1\u5C42\u7EA7 SOP \u5931\u8D25:", err);
  }
}
__name(copyServiceSOPsToTask, "copyServiceSOPsToTask");
async function copyTaskSOPsToActiveTask(env, taskId, taskConfigId) {
  if (!taskConfigId) return;
  try {
    const taskSOPs = await env.DATABASE.prepare(`
      SELECT sop_id, sort_order
      FROM ServiceComponentTaskSOPs
      WHERE task_config_id = ?
      ORDER BY sort_order
    `).bind(taskConfigId).all();
    const countRow = await env.DATABASE.prepare(`
      SELECT MAX(sort_order) as max_order
      FROM ActiveTaskSOPs
      WHERE task_id = ?
    `).bind(taskId).first();
    let nextSortOrder = (countRow?.max_order || -1) + 1;
    for (const sop of taskSOPs.results || []) {
      await env.DATABASE.prepare(`
        INSERT OR IGNORE INTO ActiveTaskSOPs (task_id, sop_id, sort_order)
        VALUES (?, ?, ?)
      `).bind(taskId, sop.sop_id, nextSortOrder++).run();
    }
    if (taskSOPs.results && taskSOPs.results.length > 0) {
      console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5DF2\u590D\u5236 ${taskSOPs.results.length} \u4E2A\u4EFB\u52A1\u5C42\u7EA7 SOP \u5230\u4EFB\u52A1 ${taskId}`);
    }
  } catch (err) {
    console.error("\u590D\u5236\u4EFB\u52A1\u5C42\u7EA7 SOP \u5931\u8D25:", err);
  }
}
__name(copyTaskSOPsToActiveTask, "copyTaskSOPsToActiveTask");
async function generateTasksForComponents(env, targetDate = null) {
  const now = targetDate ? new Date(targetDate) : /* @__PURE__ */ new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5F00\u59CB\u68C0\u67E5 ${currentYear}-${currentMonth + 1} \u7684\u4EFB\u52A1`);
  const result = {
    checked: 0,
    generated: 0,
    skipped: 0,
    errors: []
  };
  try {
    const components = await env.DATABASE.prepare(`
      SELECT 
        sc.*,
        cs.client_id,
        c.company_name,
        c.assignee_user_id,
        s.service_name
      FROM ServiceComponents sc
      JOIN ClientServices cs ON sc.client_service_id = cs.client_service_id
      JOIN Clients c ON cs.client_id = c.client_id
      LEFT JOIN Services s ON sc.service_id = s.service_id
      WHERE sc.is_active = 1 
        AND cs.is_deleted = 0
        AND c.is_deleted = 0
        AND sc.auto_generate_task = 1
        AND cs.status = 'active'
    `).all();
    console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u627E\u5230 ${components.results.length} \u4E2A\u670D\u52A1\u7EC4\u6210\u90E8\u5206`);
    for (const component of components.results || []) {
      result.checked++;
      if (!shouldGenerateInMonth(component, currentMonth)) {
        result.skipped++;
        continue;
      }
      const dueDate = calculateDueDate(component, currentYear, currentMonth);
      const dueDateStr = formatDate(dueDate);
      const advanceDays = component.advance_days || 7;
      const generateDate = new Date(dueDate);
      generateDate.setDate(generateDate.getDate() - advanceDays);
      if (now < generateDate) {
        result.skipped++;
        continue;
      }
      const existing = await env.DATABASE.prepare(`
        SELECT task_id FROM ActiveTasks
        WHERE component_id = ?
          AND due_date = ?
          AND is_deleted = 0
      `).bind(component.component_id, dueDateStr).first();
      if (existing) {
        console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u4EFB\u52A1\u5DF2\u5B58\u5728: ${component.component_name} - ${dueDateStr}`);
        result.skipped++;
        continue;
      }
      try {
        const taskConfigs = await env.DATABASE.prepare(`
          SELECT config_id, task_order, task_name, assignee_user_id, notes
          FROM ServiceComponentTasks
          WHERE component_id = ?
          ORDER BY task_order
        `).bind(component.component_id).all();
        const startDateStr = formatDate(now);
        const serviceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        if (!taskConfigs.results || taskConfigs.results.length === 0) {
          const taskName = generateTaskName(
            component,
            { company_name: component.company_name },
            currentYear,
            currentMonth
          );
          const insertResult = await env.DATABASE.prepare(`
            INSERT INTO ActiveTasks (
              client_service_id,
              component_id,
              template_id,
              task_name,
              start_date,
              due_date,
              original_due_date,
              service_month,
              status,
              assignee_user_id,
              notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
          `).bind(
            component.client_service_id,
            component.component_id,
            component.task_template_id || null,
            taskName,
            startDateStr,
            dueDateStr,
            dueDateStr,
            // 自动生成时，original_due_date 与 due_date 相同
            serviceMonth,
            component.assignee_user_id || null,
            `\u7531\u7CFB\u7D71\u65BC ${startDateStr} \u81EA\u52D5\u751F\u6210`
          ).run();
          const taskId = insertResult.meta.last_row_id;
          if (component.task_template_id) {
            await copyStagesFromTemplate(env, taskId, component.task_template_id);
          }
          await copyServiceSOPsToTask(env, taskId, component.component_id);
          console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5DF2\u751F\u6210\u4EFB\u52A1: ${taskName} (ID: ${taskId})`);
          result.generated++;
        } else {
          for (const taskConfig of taskConfigs.results) {
            const taskName = `${component.company_name} - ${taskConfig.task_name}`;
            const insertResult = await env.DATABASE.prepare(`
              INSERT INTO ActiveTasks (
                client_service_id,
                component_id,
                template_id,
                task_name,
                start_date,
                due_date,
                original_due_date,
                service_month,
                status,
                assignee_user_id,
                notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            `).bind(
              component.client_service_id,
              component.component_id,
              component.task_template_id || null,
              taskName,
              startDateStr,
              dueDateStr,
              dueDateStr,
              // 自动生成时，original_due_date 与 due_date 相同
              serviceMonth,
              taskConfig.assignee_user_id || component.assignee_user_id || null,
              taskConfig.notes || `\u7531\u7CFB\u7D71\u65BC ${startDateStr} \u81EA\u52D5\u751F\u6210`
            ).run();
            const taskId = insertResult.meta.last_row_id;
            await copyServiceSOPsToTask(env, taskId, component.component_id);
            await copyTaskSOPsToActiveTask(env, taskId, taskConfig.config_id);
            console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5DF2\u751F\u6210\u4EFB\u52A1: ${taskName} (ID: ${taskId})`);
            result.generated++;
          }
        }
      } catch (err) {
        console.error(`[\u4EFB\u52A1\u751F\u6210\u5668] \u751F\u6210\u4EFB\u52A1\u5931\u8D25:`, err);
        result.errors.push({
          component_id: component.component_id,
          component_name: component.component_name,
          error: String(err)
        });
      }
    }
  } catch (err) {
    console.error("[\u4EFB\u52A1\u751F\u6210\u5668] \u6267\u884C\u5931\u8D25:", err);
    throw err;
  }
  console.log(`[\u4EFB\u52A1\u751F\u6210\u5668] \u5B8C\u6210: \u68C0\u67E5 ${result.checked}, \u751F\u6210 ${result.generated}, \u8DF3\u8FC7 ${result.skipped}, \u9519\u8BEF ${result.errors.length}`);
  return result;
}
__name(generateTasksForComponents, "generateTasksForComponents");
async function handleManualGeneration(request, env) {
  try {
    const result = await generateTasksForComponents(env);
    return new Response(JSON.stringify({
      ok: true,
      message: "\u4EFB\u52A1\u751F\u6210\u5B8C\u6210",
      data: result
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("\u624B\u52A8\u4EFB\u52A1\u751F\u6210\u5931\u8D25:", err);
    return new Response(JSON.stringify({
      ok: false,
      message: "\u4EFB\u52A1\u751F\u6210\u5931\u8D25",
      error: String(err)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleManualGeneration, "handleManualGeneration");

// src/api/timesheet_stats.js
async function getMyStats(request, env, userId) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  let dateFilter = "";
  const binds = [userId];
  if (month) {
    const [year, monthNum] = month.split("-");
    dateFilter = ` AND strftime('%Y-%m', work_date) = ?`;
    binds.push(month);
  }
  try {
    const stats = await env.DATABASE.prepare(`
      SELECT 
        t.timesheet_id,
        t.work_date,
        t.client_id,
        t.task_id,
        t.service_id,
        t.service_item_id,
        t.hours,
        t.note,
        c.company_name,
        at.task_name,
        at.component_id,
        sc.component_name,
        sc.estimated_hours,
        cs.client_service_id,
        s1.service_name as task_service_name,
        s2.service_name as direct_service_name,
        si.item_name as service_item_name
      FROM Timesheets t
      LEFT JOIN Clients c ON t.client_id = c.client_id
      -- \u5982\u679C\u6709task_id\uFF0C\u5173\u8054\u4EFB\u52A1
      LEFT JOIN ActiveTasks at ON t.task_id = at.task_id
      LEFT JOIN ServiceComponents sc ON at.component_id = sc.component_id
      LEFT JOIN ClientServices cs ON at.client_service_id = cs.client_service_id
      LEFT JOIN Services s1 ON cs.service_id = s1.service_id
      -- \u5982\u679C\u6CA1\u6709task_id\uFF0C\u76F4\u63A5\u4F7F\u7528service_id
      LEFT JOIN Services s2 ON t.service_id = s2.service_id
      LEFT JOIN ServiceItems si ON t.service_item_id = si.item_id
      WHERE t.user_id = ? ${dateFilter}
        AND t.is_deleted = 0
      ORDER BY t.work_date DESC, t.timesheet_id DESC
    `).bind(...binds).all();
    const totalHours = stats.results.reduce((sum, row) => sum + (row.hours || 0), 0);
    const byClient = {};
    for (const row of stats.results) {
      const clientKey = row.client_id || "internal";
      const clientName = row.company_name || "\u5185\u90E8\u5DE5\u65F6";
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          client_id: row.client_id,
          client_name: clientName,
          total_hours: 0,
          services: {}
        };
      }
      byClient[clientKey].total_hours += row.hours || 0;
      const serviceName = row.direct_service_name || row.task_service_name || "\u5176\u4ED6";
      const itemName = row.service_item_name || "\u4E00\u822C\u5DE5\u4F5C";
      const serviceKey = `${serviceName}_${itemName}`;
      if (!byClient[clientKey].services[serviceKey]) {
        byClient[clientKey].services[serviceKey] = {
          service_name: serviceName,
          service_item_name: itemName,
          actual_hours: 0,
          estimated_hours: row.component_id ? row.estimated_hours : null,
          has_estimate: !!row.component_id
        };
      }
      byClient[clientKey].services[serviceKey].actual_hours += row.hours || 0;
    }
    const clientStats = Object.values(byClient).map((client) => ({
      ...client,
      services: Object.values(client.services).map((svc) => ({
        ...svc,
        over_time: svc.estimated_hours ? svc.actual_hours - svc.estimated_hours : null,
        status: !svc.estimated_hours ? "\u65E0\u9884\u4F30" : svc.actual_hours <= svc.estimated_hours ? "\u6B63\u5E38" : "\u8D85\u65F6"
      }))
    }));
    return jsonResponse({
      ok: true,
      data: {
        total_hours: totalHours,
        period: month || "\u6240\u6709\u65F6\u95F4",
        by_client: clientStats,
        details: stats.results
      }
    });
  } catch (err) {
    console.error("\u83B7\u53D6\u5DE5\u65F6\u7EDF\u8BA1\u5931\u8D25:", err);
    return errorResponse("\u83B7\u53D6\u7EDF\u8BA1\u5931\u8D25", 500);
  }
}
__name(getMyStats, "getMyStats");
async function getCostAnalysis(request, env) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const month = url.searchParams.get("month");
  if (!clientId) {
    return errorResponse("\u7F3A\u5C11client_id\u53C2\u6570", 400);
  }
  let dateFilter = "";
  const binds = [clientId];
  if (month) {
    dateFilter = ` AND strftime('%Y-%m', t.work_date) = ?`;
    binds.push(month);
  }
  try {
    const client = await env.DATABASE.prepare(`
      SELECT 
        c.*,
        cs.client_service_id,
        srv.service_name,
        SUM(sb.billing_amount) as monthly_revenue
      FROM Clients c
      LEFT JOIN ClientServices cs ON c.client_id = cs.client_id AND cs.is_deleted = 0
      LEFT JOIN Services srv ON cs.service_id = srv.service_id
      LEFT JOIN ServiceBillingSchedule sb ON cs.client_service_id = sb.client_service_id
      WHERE c.client_id = ?
        AND c.is_deleted = 0
      GROUP BY c.client_id
    `).bind(clientId).first();
    if (!client) {
      return errorResponse("\u5BA2\u6237\u4E0D\u5B58\u5728", 404);
    }
    const costData = await env.DATABASE.prepare(`
      SELECT 
        sc.component_id,
        sc.component_name,
        sc.estimated_hours,
        SUM(t.hours) as actual_hours,
        COUNT(DISTINCT t.user_id) as worker_count,
        GROUP_CONCAT(DISTINCT u.name) as workers,
        SUM(t.hours * COALESCE(u.hourly_cost, 200)) as total_cost
      FROM Timesheets t
      JOIN Users u ON t.user_id = u.user_id
      JOIN ActiveTasks at ON t.task_id = at.task_id
      JOIN ServiceComponents sc ON at.component_id = sc.component_id
      WHERE t.client_id = ? ${dateFilter}
        AND t.is_deleted = 0
        AND at.is_deleted = 0
      GROUP BY sc.component_id
    `).bind(...binds).all();
    const totalCost = costData.results.reduce((sum, row) => sum + (row.total_cost || 0), 0);
    const revenue = client.monthly_revenue || 0;
    const profit = revenue - totalCost;
    const profitRate = revenue > 0 ? (profit / revenue * 100).toFixed(1) : "0";
    return jsonResponse({
      ok: true,
      data: {
        client: {
          client_id: client.client_id,
          company_name: client.company_name,
          service_name: client.service_name
        },
        period: month || "\u6240\u6709\u65F6\u95F4",
        revenue,
        total_cost: totalCost,
        profit,
        profit_rate: profitRate + "%",
        components: costData.results.map((row) => ({
          component_id: row.component_id,
          component_name: row.component_name,
          estimated_hours: row.estimated_hours,
          actual_hours: row.actual_hours,
          over_time: row.actual_hours - (row.estimated_hours || 0),
          total_cost: row.total_cost,
          worker_count: row.worker_count,
          workers: row.workers ? row.workers.split(",") : []
        }))
      }
    });
  } catch (err) {
    console.error("\u83B7\u53D6\u6210\u672C\u5206\u6790\u5931\u8D25:", err);
    return errorResponse("\u83B7\u53D6\u5206\u6790\u5931\u8D25", 500);
  }
}
__name(getCostAnalysis, "getCostAnalysis");
async function handleTimesheetStats(request, env, path) {
  const user = await requireLogin(request, env);
  if (!user.ok) return user.response;
  const method = request.method;
  if (method !== "GET") {
    return errorResponse("\u65B9\u6CD5\u4E0D\u5141\u8BB8", 405);
  }
  if (path === "/internal/api/v1/timesheets/my-stats") {
    return await getMyStats(request, env, user.data.user_id);
  }
  if (path === "/internal/api/v1/admin/cost-analysis") {
    if (!user.data.is_admin) {
      return errorResponse("\u65E0\u6743\u8BBF\u95EE", 403);
    }
    return await getCostAnalysis(request, env);
  }
  return errorResponse("\u8DEF\u7531\u4E0D\u5B58\u5728", 404);
}
__name(handleTimesheetStats, "handleTimesheetStats");

// src/index.js
var index_default = {
  async fetch(request, env, ctx) {
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
    if (path === "/internal/api/v1/cache-test") {
      const { generateCacheKey: generateCacheKey3, getCache: getCache2, saveCache: saveCache2 } = await Promise.resolve().then(() => (init_cache_helper(), cache_helper_exports));
      const corsHeaders = getCorsHeadersForRequest(request, env);
      try {
        const testKey = "test_cache_key";
        const testData = { message: "Hello Cache!", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
        await saveCache2(env, testKey, "test", testData, {});
        const cached = await getCache2(env, testKey);
        return jsonResponse(200, {
          ok: true,
          message: "\u7F13\u5B58\u6D4B\u8BD5\u6210\u529F",
          saved: testData,
          retrieved: cached,
          test_passed: cached && cached.data && cached.data.message === testData.message
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, {
          ok: false,
          message: "\u7F13\u5B58\u6D4B\u8BD5\u5931\u8D25",
          error: String(err),
          stack: err.stack
        }, corsHeaders);
      }
    }
    if (path === "/internal/api/v1/cache-debug-clients") {
      const { generateCacheKey: generateCacheKey3, getCache: getCache2, saveCache: saveCache2 } = await Promise.resolve().then(() => (init_cache_helper(), cache_helper_exports));
      const corsHeaders = getCorsHeadersForRequest(request, env);
      try {
        const cacheKey = generateCacheKey3("clients_list", { page: 1, perPage: 50, q: "", tag_id: "" });
        const cached = await getCache2(env, cacheKey);
        if (!cached) {
          const testData = {
            list: [{ clientId: "test_001", companyName: "Test Company" }],
            meta: { page: 1, perPage: 50, total: 1 }
          };
          await saveCache2(env, cacheKey, "clients_list", testData, {
            scopeParams: { page: 1, perPage: 50, q: "", tag_id: "" }
          });
          const recached = await getCache2(env, cacheKey);
          return jsonResponse(200, {
            ok: true,
            message: "\u7F13\u5B58\u8C03\u8BD5\uFF1A\u5DF2\u521B\u5EFA\u6D4B\u8BD5\u6570\u636E",
            cacheKey,
            saved: testData,
            retrieved_after_save: recached
          }, corsHeaders);
        }
        return jsonResponse(200, {
          ok: true,
          message: "\u7F13\u5B58\u8C03\u8BD5\uFF1A\u7F13\u5B58\u5DF2\u5B58\u5728",
          cacheKey,
          cached
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, {
          ok: false,
          message: "\u7F13\u5B58\u8C03\u8BD5\u5931\u8D25",
          error: String(err),
          stack: err.stack
        }, corsHeaders);
      }
    }
    if (path === "/internal/api/v1/kv-warmup" && method === "POST") {
      const corsHeaders = getCorsHeadersForRequest(request, env);
      const { saveKVCache: saveKVCache2 } = await Promise.resolve().then(() => (init_kv_cache_helper(), kv_cache_helper_exports));
      try {
        const me = await getSessionUser(request, env);
        if (!me || !me.is_admin) {
          return jsonResponse(403, {
            ok: false,
            message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650"
          }, corsHeaders);
        }
        const warmupResults = [];
        const clientsRows = await env.DATABASE.prepare(
          `SELECT client_id, company_name, tax_registration_number, contact_person_1, 
				        phone, email, created_at, assignee_user_id
				 FROM Clients
				 WHERE is_deleted = 0
				 ORDER BY created_at DESC
				 LIMIT 100`
        ).all();
        const clientsData = {
          list: (clientsRows?.results || []).map((r) => ({
            clientId: r.client_id,
            companyName: r.company_name,
            taxId: r.tax_registration_number,
            contact_person_1: r.contact_person_1 || "",
            assigneeName: "",
            tags: [],
            phone: r.phone || "",
            email: r.email || "",
            createdAt: r.created_at,
            year_total: 0
          })),
          meta: { page: 1, perPage: 100, total: clientsRows?.results?.length || 0 }
        };
        const { generateCacheKey: generateCacheKey3 } = await Promise.resolve().then(() => (init_kv_cache_helper(), kv_cache_helper_exports));
        const clientsCacheKey = generateCacheKey3("clients_list", { page: 1, perPage: 100, q: "", tag_id: "" });
        await saveKVCache2(env, clientsCacheKey, "clients_list", clientsData, { ttl: 3600 });
        warmupResults.push({ type: "clients_list", key: clientsCacheKey, count: clientsData.list.length });
        const today = /* @__PURE__ */ new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
          const weekStart = new Date(monday);
          weekStart.setDate(monday.getDate() + weekOffset * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const startStr = weekStart.toISOString().substring(0, 10);
          const endStr = weekEnd.toISOString().substring(0, 10);
          const weekHolidaysRows = await env.DATABASE.prepare(
            `SELECT holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday
					 FROM Holidays
					 WHERE holiday_date BETWEEN ? AND ?
					 ORDER BY holiday_date ASC`
          ).bind(startStr, endStr).all();
          const weekHolidaysData = (weekHolidaysRows?.results || []).map((r) => ({
            holiday_date: r.holiday_date,
            date: r.holiday_date,
            name: r.name || "",
            is_national_holiday: Boolean(r.is_national_holiday),
            is_weekly_restday: Boolean(r.is_weekly_restday),
            is_makeup_workday: Boolean(r.is_makeup_workday)
          }));
          const weekHolidaysCacheKey = generateCacheKey3("holidays_all", { start: startStr, end: endStr });
          await saveKVCache2(env, weekHolidaysCacheKey, "holidays_all", weekHolidaysData, { ttl: 3600 });
          if (weekOffset === 0) {
            warmupResults.push({
              type: "holidays_all",
              key: weekHolidaysCacheKey,
              count: weekHolidaysData.length,
              week: `${startStr} to ${endStr}`
            });
          }
        }
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const leaveBalancesRows = await env.DATABASE.prepare(
          "SELECT leave_type, year, total, used, remain FROM LeaveBalances WHERE user_id = ? AND year = ? AND leave_type != 'comp'"
        ).bind(String(me.user_id), currentYear).all();
        const leaveBalancesData = (leaveBalancesRows?.results || []).map((r) => ({
          type: r.leave_type,
          year: Number(r.year),
          total: Number(r.total),
          used: Number(r.used),
          remain: Number(r.remain)
        }));
        const leaveBalancesCacheKey = generateCacheKey3("leaves_balances", { userId: String(me.user_id), year: currentYear });
        await saveKVCache2(env, leaveBalancesCacheKey, "leaves_balances", leaveBalancesData, { ttl: 3600 });
        warmupResults.push({ type: "leaves_balances", key: leaveBalancesCacheKey, count: leaveBalancesData.length });
        const currentMonth = (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
        const [year, monthNum] = currentMonth.split("-");
        const startDate = `${year}-${monthNum}-01`;
        const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, "0")}`;
        const endDate = `${nextMonth}-01`;
        const monthlyTimelogsRows = await env.DATABASE.prepare(
          `SELECT work_type, hours FROM Timesheets
				 WHERE user_id = ? AND work_date >= ? AND work_date < ? AND is_deleted = 0`
        ).bind(me.user_id, startDate, endDate).all();
        let totalHours = 0, overtimeHours = 0;
        (monthlyTimelogsRows?.results || []).forEach((log) => {
          const hours = parseFloat(log.hours) || 0;
          totalHours += hours;
          if (log.work_type && log.work_type > 1) {
            overtimeHours += hours;
          }
        });
        const monthlySummaryData = {
          month: currentMonth,
          total_hours: Math.round(totalHours * 10) / 10,
          overtime_hours: Math.round(overtimeHours * 10) / 10,
          weighted_hours: Math.round(totalHours * 10) / 10,
          leave_hours: 0
        };
        const monthlySummaryCacheKey = generateCacheKey3("monthly_summary", { userId: me.user_id, month: currentMonth });
        console.log("[KV Warmup] \u{1F525} \u9884\u70ED\u6708\u5EA6\u7EDF\u8BA1", { userId: me.user_id, month: currentMonth, cacheKey: monthlySummaryCacheKey, data: monthlySummaryData });
        await saveKVCache2(env, monthlySummaryCacheKey, "monthly_summary", monthlySummaryData, { ttl: 3600 });
        warmupResults.push({ type: "monthly_summary", key: monthlySummaryCacheKey, month: currentMonth });
        const allClientsRows = await env.DATABASE.prepare(
          `SELECT DISTINCT client_id FROM Clients WHERE is_deleted = 0 LIMIT 100`
        ).all();
        let servicesWarmedCount = 0;
        for (const clientRow of allClientsRows?.results || []) {
          const clientId = clientRow.client_id;
          const clientServicesRows = await env.DATABASE.prepare(
            `SELECT DISTINCT cs.service_id
					 FROM ClientServices cs
					 WHERE cs.client_id = ? AND cs.is_deleted = 0 AND cs.service_id IS NOT NULL`
          ).bind(clientId).all();
          let servicesData;
          if (clientServicesRows.results && clientServicesRows.results.length > 0) {
            const serviceIds = clientServicesRows.results.map((r) => r.service_id);
            const placeholders = serviceIds.map(() => "?").join(",");
            const servicesRows = await env.DATABASE.prepare(
              `SELECT service_id, service_name, service_code, description
						 FROM Services
						 WHERE service_id IN (${placeholders}) AND is_active = 1
						 ORDER BY sort_order ASC, service_id ASC`
            ).bind(...serviceIds).all();
            servicesData = (servicesRows?.results || []).map((s) => ({
              service_id: s.service_id,
              service_name: s.service_name,
              service_code: s.service_code,
              description: s.description || ""
            }));
          } else {
            const allServicesRows = await env.DATABASE.prepare(
              `SELECT service_id, service_name, service_code, description
						 FROM Services
						 WHERE is_active = 1
						 ORDER BY sort_order ASC, service_id ASC`
            ).all();
            servicesData = (allServicesRows?.results || []).map((s) => ({
              service_id: s.service_id,
              service_name: s.service_name,
              service_code: s.service_code,
              description: s.description || ""
            }));
          }
          const clientServicesCacheKey = generateCacheKey3("client_services", { clientId });
          await saveKVCache2(env, clientServicesCacheKey, "client_services", servicesData, { ttl: 3600 });
          servicesWarmedCount++;
        }
        warmupResults.push({
          type: "client_services",
          count: servicesWarmedCount,
          note: "\u6279\u91CF\u9884\u70ED\u6240\u6709\u5BA2\u6237\u670D\u52A1\u9879\u76EE"
        });
        return jsonResponse(200, {
          ok: true,
          message: "\u2705 KV\u7F13\u5B58\u9884\u70ED\u5B8C\u6210\uFF08\u9700\u898160\u79D2\u5168\u7403\u540C\u6B65\uFF09",
          warmup: warmupResults,
          note: "\u8BF7\u7B49\u5F8560\u79D2\u540E\u5237\u65B0\u9875\u9762\u6D4B\u8BD5\uFF0C\u6E32\u67D3\u901F\u5EA6\u5C06\u4ECE1766ms\u964D\u5230<50ms\uFF01"
        }, corsHeaders);
      } catch (err) {
        console.error("[KV Warmup] \u5931\u8D25:", err);
        return jsonResponse(500, {
          ok: false,
          message: "KV\u9884\u70ED\u5931\u8D25",
          error: String(err)
        }, corsHeaders);
      }
    }
    if (path === "/internal/api/v1/auth/login") {
      return handleLogin(request, env, requestId);
    }
    if (path === "/internal/api/v1/auth/me") {
      return handleAuthMe(request, env, requestId);
    }
    if (path === "/internal/api/v1/auth/logout") {
      return handleLogout(request, env, requestId);
    }
    if (path.startsWith("/internal/api/v1/admin/dev-")) {
      return handleDevSeeding(request, env, requestId, path);
    }
    if (path === "/internal/api/v1/clients" || path.startsWith("/internal/api/v1/clients/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleClients(request, env, me, requestId, url);
    }
    if (path === "/internal/api/v1/tags" || path.startsWith("/internal/api/v1/tags/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleTags(request, env, me, requestId, url);
    }
    if (path.startsWith("/internal/api/v1/billing/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleBilling(request, env, me, requestId, url, path);
    }
    if (path.startsWith("/internal/api/v1/task-templates")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleTaskTemplates(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/services" || path === "/internal/api/v1/services/items" || /^\/internal\/api\/v1\/services\/\d+(\/|$)/.test(path) || /^\/internal\/api\/v1\/services\/\d+\/items/.test(path)) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleServices(request, env, me, requestId, url, path);
    }
    if (path.includes("/client-services/") && path.includes("/components") || path.includes("/service-components/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      const result = await handleServiceComponents(request, env, path);
      if (result) return result;
    }
    if (path === "/internal/api/v1/tasks" || path.startsWith("/internal/api/v1/tasks/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleTasks(request, env, me, requestId, url);
    }
    if (path === "/internal/api/v1/timesheets" || path.startsWith("/internal/api/v1/timelogs")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleTimesheets(request, env, me, requestId, url);
    }
    if (path === "/internal/api/v1/timesheets/my-stats" || path === "/internal/api/v1/admin/cost-analysis") {
      const result = await handleTimesheetStats(request, env, path);
      if (result) return result;
    }
    if (path === "/internal/api/v1/receipts" || path.startsWith("/internal/api/v1/receipts/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleReceipts(request, env, me, requestId, url);
    }
    if (path === "/internal/api/v1/attachments" || path.startsWith("/internal/api/v1/attachments/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleAttachments(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/leaves" || path === "/internal/api/v1/leaves/balances" || path === "/internal/api/v1/leaves/life-events" || path === "/internal/api/v1/admin/cron/execute" || path === "/internal/api/v1/admin/cron/history") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleLeaves(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/holidays") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleHolidays(request, env, me, requestId, url);
    }
    if (path.startsWith("/internal/api/v1/admin/payroll")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handlePayroll(request, env, me, requestId, url, path);
    }
    if (path.startsWith("/internal/api/v1/admin/overhead") || path.startsWith("/internal/api/v1/admin/costs")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleOverhead(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/admin/tasks/generate-from-components" && method === "POST") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleManualGeneration(request, env);
    }
    if (path === "/internal/api/v1/admin/articles" || path === "/internal/api/v1/admin/faq" || path === "/internal/api/v1/admin/resources" || path === "/internal/api/v1/admin/services") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleCMS(request, env, me, requestId, url, path);
    }
    if (path.startsWith("/internal/api/v1/reports")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleReports(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/sop" || path.startsWith("/internal/api/v1/sop/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleSOP(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/faq" || path.startsWith("/internal/api/v1/faq/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      const result = await handleFAQRequest(request, env, null, path, me);
      if (result) return result;
    }
    if (path === "/internal/api/v1/documents" || path.startsWith("/internal/api/v1/documents/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      const result = await handleDocumentsRequest(request, env, null, path, me);
      if (result) return result;
    }
    if (path === "/internal/api/v1/dashboard") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleDashboard(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/admin/automation-rules" || /\/internal\/api\/v1\/admin\/automation-rules\//.test(path)) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleAutomation(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/users") {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleSettings(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/admin/settings" || path.startsWith("/internal/api/v1/admin/settings/")) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      if (!me.is_admin) return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "\u6C92\u6709\u6B0A\u9650", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleSettings(request, env, me, requestId, url, path);
    }
    if (path === "/internal/api/v1/client-services" || /\/internal\/api\/v1\/client-services\//.test(path)) {
      const me = await getSessionUser(request, env);
      if (!me) return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u672A\u767B\u5165", meta: { requestId } }, getCorsHeadersForRequest(request, env));
      return handleClientServices(request, env, me, requestId, url, path);
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
  },
  // Scheduled Handler（Cron Triggers）
  async scheduled(event, env, ctx) {
    const requestId = crypto.randomUUID();
    console.log(JSON.stringify({
      level: "info",
      requestId,
      event: "cron_triggered",
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      cron: event.cron
    }));
    try {
      const now = new Date(event.scheduledTime);
      const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
      const expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, "0")}`;
      const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const expiredGrants = await env.DATABASE.prepare(
        `SELECT g.grant_id, g.user_id, g.hours_remaining, g.original_rate, u.base_salary
				 FROM CompensatoryLeaveGrants g
				 LEFT JOIN Users u ON g.user_id = u.user_id
				 WHERE g.expiry_date = ? AND g.status = 'active' AND g.hours_remaining > 0`
      ).bind(expiryDate).all();
      let processedCount = 0;
      const grantIds = [];
      for (const grant of expiredGrants?.results || []) {
        const baseSalary = Number(grant.base_salary || 0);
        const hourlyRate = baseSalary / 240;
        const hours = Number(grant.hours_remaining || 0);
        const rate = Number(grant.original_rate || 1);
        const amountCents = Math.round(hours * hourlyRate * rate * 100);
        await env.DATABASE.prepare(
          `INSERT INTO CompensatoryOvertimePay 
					 (user_id, year_month, hours_expired, amount_cents, source_grant_ids)
					 VALUES (?, ?, ?, ?, ?)`
        ).bind(
          String(grant.user_id),
          currentMonth,
          hours,
          amountCents,
          JSON.stringify([grant.grant_id])
        ).run();
        await env.DATABASE.prepare(
          `UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
        ).bind(grant.grant_id).run();
        grantIds.push(grant.grant_id);
        processedCount++;
      }
      await env.DATABASE.prepare(
        `INSERT INTO CronJobExecutions 
				 (job_name, status, executed_at, details)
				 VALUES (?, 'success', datetime('now'), ?)`
      ).bind("comp_leave_expiry", JSON.stringify({
        expiryDate,
        processedCount,
        grantIds,
        currentMonth,
        triggeredBy: "cron"
      })).run();
      console.log(JSON.stringify({
        level: "info",
        requestId,
        event: "cron_completed",
        processedCount,
        expiryDate,
        currentMonth
      }));
    } catch (err) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        event: "cron_failed",
        error: String(err)
      }));
      try {
        await env.DATABASE.prepare(
          `INSERT INTO CronJobExecutions 
					 (job_name, status, executed_at, error_message)
					 VALUES (?, 'failed', datetime('now'), ?)`
        ).bind("comp_leave_expiry", String(err)).run();
      } catch (_) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          event: "failed_to_log_cron_error"
        }));
      }
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
