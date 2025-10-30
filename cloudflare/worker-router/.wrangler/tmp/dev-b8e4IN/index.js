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
    if (path === "/internal/api/v1/auth/login") {
      if (method !== "POST") {
        return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "\u65B9\u6CD5\u4E0D\u5141\u8A31", meta: { requestId } });
      }
      let payload;
      try {
        payload = await request.json();
      } catch (_) {
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } });
      }
      const username = (payload?.username || "").trim().toLowerCase();
      const password = payload?.password || "";
      const errors = [];
      if (!username) errors.push({ field: "username", message: "\u5FC5\u586B" });
      if (!password) errors.push({ field: "password", message: "\u5FC5\u586B" });
      if (errors.length > 0) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "\u8F38\u5165\u6709\u8AA4", errors, meta: { requestId } });
      }
      if (!env.DATABASE) {
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u8CC7\u6599\u5EAB\u672A\u7D81\u5B9A", meta: { requestId } });
      }
      try {
        const userRow = await env.DATABASE.prepare(
          "SELECT user_id, username, password_hash, name, email, is_admin, login_attempts, last_failed_login, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
        ).bind(username).first();
        const unauthorized = /* @__PURE__ */ __name(() => jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4", meta: { requestId } }), "unauthorized");
        if (!userRow || userRow.is_deleted === 1) {
          return unauthorized();
        }
        const attempts = Number(userRow.login_attempts || 0);
        if (attempts >= 5 && userRow.last_failed_login) {
          const lastFailedAt = Date.parse(userRow.last_failed_login);
          if (!Number.isNaN(lastFailedAt)) {
            const fifteenMinAgo = Date.now() - 15 * 60 * 1e3;
            if (lastFailedAt > fifteenMinAgo) {
              return jsonResponse(401, { ok: false, code: "ACCOUNT_LOCKED", message: "\u5617\u8A66\u904E\u591A\uFF0C\u7A0D\u5F8C\u518D\u8A66", meta: { requestId } });
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
        return jsonResponse(200, { ok: true, code: "OK", message: "\u6210\u529F", data, meta: { requestId } }, { "Set-Cookie": cookie });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
        return jsonResponse(500, body);
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
        return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4", meta: { requestId } });
      }
      const username = (body?.username || "").trim().toLowerCase();
      const name = (body?.name || "\u6E2C\u8A66\u7528\u6236").trim();
      const password = body?.password || "changeme";
      let email = (body?.email || "").trim();
      if (!username || !password) {
        return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "username/password \u5FC5\u586B", meta: { requestId } });
      }
      if (!env.DATABASE) {
        return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "\u8CC7\u6599\u5EAB\u672A\u7D81\u5B9A", meta: { requestId } });
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
        return jsonResponse(200, { ok: true, code: "OK", message: "\u5DF2\u5EFA\u7ACB/\u66F4\u65B0\u6E2C\u8A66\u7528\u6236", data: { username, email }, meta: { requestId } });
      } catch (err) {
        console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
        const body2 = { ok: false, code: "INTERNAL_ERROR", message: "\u4F3A\u670D\u5668\u932F\u8AA4", meta: { requestId } };
        if (env.APP_ENV && env.APP_ENV !== "prod") body2.error = String(err);
        return jsonResponse(500, body2);
      }
    }
    if (path.startsWith("/internal/api/")) {
      return proxy(env.INTERNAL_API_HOST, path.replace("/internal", ""));
    }
    if (path === "/login" || path.startsWith("/login/")) {
      return proxy(env.INTERNAL_BASE_HOST, "/login");
    }
    if (path.startsWith("/internal/")) {
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

// .wrangler/tmp/bundle-tyxhaK/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-tyxhaK/middleware-loader.entry.ts
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
