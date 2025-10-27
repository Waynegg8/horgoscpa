var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");

// src/config/constants.js
var USER_ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee"
};
var TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};
var TASK_TYPE = {
  TASK: "task",
  PROJECT: "project",
  RECURRING: "recurring"
};
var TASK_CATEGORY = {
  RECURRING: "recurring",
  BUSINESS: "business",
  FINANCE: "finance",
  CLIENT_SERVICE: "client_service",
  GENERAL: "general"
};
var TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};
var SERVICE_TYPE = {
  ACCOUNTING: "accounting",
  VAT: "vat",
  INCOME_TAX: "income_tax",
  WITHHOLDING: "withholding",
  PREPAYMENT: "prepayment",
  DIVIDEND: "dividend",
  NHI: "nhi",
  SHAREHOLDER_TAX: "shareholder_tax",
  AUDIT: "audit",
  COMPANY_SETUP: "company_setup"
};
var SERVICE_FREQUENCY = {
  MONTHLY: "monthly",
  BIMONTHLY: "bimonthly",
  QUARTERLY: "quarterly",
  BIANNUAL: "biannual",
  ANNUAL: "annual"
};
var CLIENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  POTENTIAL: "potential"
};
var REGIONS = {
  TAICHUNG: "\u53F0\u4E2D",
  TAIPEI: "\u53F0\u5317",
  OTHER: "\u5176\u4ED6"
};
var TEMPLATE_TYPE = {
  GENERAL: "general",
  SERVICE_CHECKLIST: "service_checklist"
};
var DOCUMENT_TYPE = {
  SOP: "sop",
  DOCUMENT: "document",
  FAQ: "faq"
};
var REMINDER_TYPE = {
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  ASSIGNED: "assigned",
  COMPLETED: "completed",
  CUSTOM: "custom"
};
var HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};
var ERROR_CODES = {
  // 認證錯誤
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  // 驗證錯誤
  VALIDATION_ERROR: "VALIDATION_ERROR",
  REQUIRED_FIELD: "REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_TYPE: "INVALID_TYPE",
  // 業務錯誤
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  // 系統錯誤
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR"
};
var TABLES = {
  USERS: "users",
  EMPLOYEES: "employees",
  SESSIONS: "sessions",
  CLIENTS: "clients",
  CLIENT_SERVICES: "client_services",
  CLIENT_INTERACTIONS: "client_interactions",
  TASKS: "tasks",
  MULTI_STAGE_TASKS: "multi_stage_tasks",
  TASK_STAGES: "task_stages",
  TASK_TEMPLATES: "task_templates",
  TASK_TEMPLATE_STAGES: "task_template_stages",
  TASK_GENERATION_LOG: "task_generation_log",
  TASK_EXECUTION_LOG: "task_execution_log",
  TIMESHEETS: "timesheets",
  LEAVE_TYPES: "leave_types",
  LEAVE_EVENTS: "leave_events",
  ANNUAL_LEAVE_RULES: "annual_leave_rules",
  ANNUAL_LEAVE_CARRYOVER: "annual_leave_carryover",
  OVERTIME_RATES: "overtime_rates",
  HOLIDAYS: "holidays",
  BUSINESS_TYPES: "business_types",
  SOPS: "sops",
  SOP_CATEGORIES: "sop_categories",
  SOP_VERSIONS: "sop_versions",
  POSTS: "posts",
  MEDIA_LIBRARY: "media_library",
  FAQS: "faqs",
  FAQ_CATEGORIES: "faq_categories",
  SYSTEM_PARAMETERS: "system_parameters",
  TASK_REMINDERS: "task_reminders",
  USER_WORKLOAD_STATS: "user_workload_stats",
  REPORT_CACHE: "report_cache"
};
var FIELDS = {
  // 通用欄位
  ID: "id",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
  DELETED_AT: "deleted_at",
  // 用戶相關
  USER_ID: "user_id",
  EMPLOYEE_ID: "employee_id",
  ASSIGNED_USER_ID: "assigned_user_id",
  CREATED_BY_USER_ID: "created_by_user_id",
  APPROVED_BY_USER_ID: "approved_by_user_id",
  COMPLETED_BY_USER_ID: "completed_by_user_id",
  MODIFIED_BY_USER_ID: "modified_by_user_id",
  // 其他關聯
  CLIENT_ID: "client_id",
  TASK_ID: "task_id",
  TEMPLATE_ID: "template_id",
  CATEGORY_ID: "category_id",
  // 狀態欄位
  IS_ACTIVE: "is_active",
  IS_DELETED: "is_deleted",
  IS_APPROVED: "is_approved",
  IS_DEFAULT: "is_default",
  IS_LOCKED: "is_locked"
};
Object.freeze(USER_ROLES);
Object.freeze(TASK_STATUS);
Object.freeze(TASK_TYPE);
Object.freeze(TASK_CATEGORY);
Object.freeze(TASK_PRIORITY);
Object.freeze(SERVICE_TYPE);
Object.freeze(SERVICE_FREQUENCY);
Object.freeze(CLIENT_STATUS);
Object.freeze(REGIONS);
Object.freeze(TEMPLATE_TYPE);
Object.freeze(DOCUMENT_TYPE);
Object.freeze(REMINDER_TYPE);
Object.freeze(HTTP_STATUS);
Object.freeze(ERROR_CODES);
Object.freeze(TABLES);
Object.freeze(FIELDS);

// src/routes/router.js
var Router = class {
  static {
    __name(this, "Router");
  }
  constructor() {
    this.routes = {
      GET: /* @__PURE__ */ new Map(),
      POST: /* @__PURE__ */ new Map(),
      PUT: /* @__PURE__ */ new Map(),
      DELETE: /* @__PURE__ */ new Map(),
      PATCH: /* @__PURE__ */ new Map(),
      OPTIONS: /* @__PURE__ */ new Map()
    };
  }
  /**
   * 註冊 GET 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  get(path, handler) {
    this.routes.GET.set(path, handler);
    return this;
  }
  /**
   * 註冊 POST 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  post(path, handler) {
    this.routes.POST.set(path, handler);
    return this;
  }
  /**
   * 註冊 PUT 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  put(path, handler) {
    this.routes.PUT.set(path, handler);
    return this;
  }
  /**
   * 註冊 DELETE 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  delete(path, handler) {
    this.routes.DELETE.set(path, handler);
    return this;
  }
  /**
   * 註冊 PATCH 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  patch(path, handler) {
    this.routes.PATCH.set(path, handler);
    return this;
  }
  /**
   * 註冊 OPTIONS 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  options(path, handler) {
    this.routes.OPTIONS.set(path, handler);
    return this;
  }
  /**
   * 處理請求
   * @param {Request} request - HTTP 請求
   * @param {Object} env - 環境變數
   * @returns {Promise<Response>}
   */
  async handle(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    const handler = this.routes[method]?.get(pathname);
    if (handler) {
      return handler(env, request);
    }
    const paramHandler = this._findParameterizedRoute(method, pathname);
    if (paramHandler) {
      const { handler: handler2, params } = paramHandler;
      request.params = params;
      return handler2(env, request);
    }
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `\u8DEF\u7531\u4E0D\u5B58\u5728: ${method} ${pathname}`
      }
    }, HTTP_STATUS.NOT_FOUND);
  }
  /**
   * 查找參數化路由
   * @private
   */
  _findParameterizedRoute(method, pathname) {
    const routes = this.routes[method];
    if (!routes) return null;
    for (const [pattern, handler] of routes.entries()) {
      if (!pattern.includes(":")) continue;
      const params = this._matchRoute(pattern, pathname);
      if (params) {
        return { handler, params };
      }
    }
    return null;
  }
  /**
   * 匹配路由並提取參數
   * @private
   */
  _matchRoute(pattern, pathname) {
    const patternParts = pattern.split("/");
    const pathnameParts = pathname.split("/");
    if (patternParts.length !== pathnameParts.length) {
      return null;
    }
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathnamePart = pathnameParts[i];
      if (patternPart.startsWith(":")) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathnamePart;
      } else if (patternPart !== pathnamePart) {
        return null;
      }
    }
    return params;
  }
  /**
   * 批量註冊路由
   * @param {Array} routes - 路由配置數組
   */
  registerRoutes(routes) {
    routes.forEach(({ method, path, handler }) => {
      this[method.toLowerCase()](path, handler);
    });
    return this;
  }
  /**
   * 列出所有已註冊的路由
   */
  listRoutes() {
    const routes = [];
    for (const [method, routeMap] of Object.entries(this.routes)) {
      for (const path of routeMap.keys()) {
        routes.push({ method, path });
      }
    }
    return routes.sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return 0;
    });
  }
};

// src/auth.js
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
__name(verifyPassword, "verifyPassword");
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(generateSessionToken, "generateSessionToken");
function getSessionToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}
__name(getSessionToken, "getSessionToken");
async function verifySession(db, sessionToken) {
  if (!sessionToken) {
    return null;
  }
  const result = await db.prepare(`
    SELECT 
      u.id, 
      u.username, 
      u.role, 
      u.is_active,
      u.employee_id,
      e.name as employee_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
  `).bind(sessionToken).first();
  return result;
}
__name(verifySession, "verifySession");
async function createSession(db, userId) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
  await db.prepare(`
    INSERT INTO sessions (session_token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionToken, userId, expiresAt.toISOString()).run();
  return sessionToken;
}
__name(createSession, "createSession");
async function deleteSession(db, sessionToken) {
  await db.prepare(`
    DELETE FROM sessions WHERE session_token = ?
  `).bind(sessionToken).run();
}
__name(deleteSession, "deleteSession");
async function requireAuth(db, request) {
  const sessionToken = getSessionToken(request);
  const user = await verifySession(db, sessionToken);
  if (!user) {
    return { authorized: false, user: null, error: "\u672A\u6388\u6B0A\uFF0C\u8ACB\u5148\u767B\u5165" };
  }
  return { authorized: true, user, error: null };
}
__name(requireAuth, "requireAuth");
async function requireAdmin(db, request) {
  const auth = await requireAuth(db, request);
  if (!auth.authorized) {
    return auth;
  }
  if (auth.user.role !== "admin") {
    return { authorized: false, user: auth.user, error: "\u9700\u8981\u7BA1\u7406\u54E1\u6B0A\u9650" };
  }
  return auth;
}
__name(requireAdmin, "requireAdmin");
async function handleLogin(db, request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return jsonResponse({ error: "\u8ACB\u63D0\u4F9B\u4F7F\u7528\u8005\u540D\u7A31\u548C\u5BC6\u78BC" }, 400);
    }
    const user = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.password_hash, 
        u.role, 
        u.is_active,
        u.employee_id,
        e.name as employee_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.username = ? AND u.is_active = 1
    `).bind(username).first();
    if (!user) {
      return jsonResponse({ error: "\u4F7F\u7528\u8005\u540D\u7A31\u6216\u5BC6\u78BC\u932F\u8AA4" }, 401);
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: "\u4F7F\u7528\u8005\u540D\u7A31\u6216\u5BC6\u78BC\u932F\u8AA4" }, 401);
    }
    const sessionToken = await createSession(db, user.id);
    return jsonResponse({
      success: true,
      session_token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name || user.username
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
__name(handleLogin, "handleLogin");
async function handleLogout(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    if (sessionToken) {
      await deleteSession(db, sessionToken);
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
__name(handleLogout, "handleLogout");
async function handleVerifySession(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    const user = await verifySession(db, sessionToken);
    if (!user) {
      return jsonResponse({ error: "\u7528\u6236\u4E0D\u5B58\u5728" }, 401);
    }
    return jsonResponse({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
__name(handleVerifySession, "handleVerifySession");
async function handleChangePassword(db, request) {
  try {
    const auth = await requireAuth(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 401);
    }
    const body = await request.json();
    const oldPassword = body.old_password || body.currentPassword;
    const newPassword = body.new_password || body.newPassword;
    if (!oldPassword || !newPassword) {
      return jsonResponse({ error: "\u8ACB\u63D0\u4F9B\u76EE\u524D\u5BC6\u78BC\u548C\u65B0\u5BC6\u78BC" }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ error: "\u65B0\u5BC6\u78BC\u81F3\u5C11\u9700\u89816\u500B\u5B57\u5143" }, 400);
    }
    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(auth.user.id).first();
    if (!user) {
      return jsonResponse({ error: "\u4F7F\u7528\u8005\u4E0D\u5B58\u5728" }, 404);
    }
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: "\u820A\u5BC6\u78BC\u932F\u8AA4" }, 401);
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, auth.user.id).run();
    return jsonResponse({ success: true, message: "\u5BC6\u78BC\u5DF2\u6210\u529F\u66F4\u65B0" });
  } catch (err) {
    return jsonResponse({ error: err.message || "\u5BC6\u78BC\u66F4\u65B0\u5931\u6557" }, 500);
  }
}
__name(handleChangePassword, "handleChangePassword");
async function handleAdminResetPassword(db, request, username) {
  try {
    const auth = await requireAdmin(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 403);
    }
    const body = await request.json();
    const newPassword = body.new_password || body.newPassword;
    if (!newPassword) {
      return jsonResponse({ error: "\u8ACB\u63D0\u4F9B\u65B0\u5BC6\u78BC" }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ error: "\u65B0\u5BC6\u78BC\u81F3\u5C11\u9700\u89816\u500B\u5B57\u5143" }, 400);
    }
    const user = await db.prepare(`
      SELECT id FROM users WHERE username = ?
    `).bind(username).first();
    if (!user) {
      return jsonResponse({ error: "\u4F7F\u7528\u8005\u4E0D\u5B58\u5728" }, 404);
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?
    `).bind(newHash, username).run();
    return jsonResponse({ success: true, message: `\u5DF2\u91CD\u8A2D ${username} \u7684\u5BC6\u78BC` });
  } catch (err) {
    return jsonResponse({ error: err.message || "\u5BC6\u78BC\u91CD\u8A2D\u5931\u6557" }, 500);
  }
}
__name(handleAdminResetPassword, "handleAdminResetPassword");

// src/middleware/auth.middleware.js
function withAuth(handler) {
  return async (env, request) => {
    const auth = await verifySession(env.DB, request);
    if (!auth || !auth.user) {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "\u672A\u6388\u6B0A\uFF0C\u8ACB\u5148\u767B\u5165"
        }
      }, HTTP_STATUS.UNAUTHORIZED);
    }
    request.auth = auth;
    request.user = auth.user;
    return handler(env, request);
  };
}
__name(withAuth, "withAuth");
function withAdmin(handler) {
  return withAuth(async (env, request) => {
    if (request.user.role !== "admin") {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "\u6B0A\u9650\u4E0D\u8DB3\uFF0C\u9700\u8981\u7BA1\u7406\u54E1\u6B0A\u9650"
        }
      }, HTTP_STATUS.FORBIDDEN);
    }
    return handler(env, request);
  });
}
__name(withAdmin, "withAdmin");

// src/middleware/error.middleware.js
function withErrorHandler(handler) {
  return async (env, request) => {
    try {
      return await handler(env, request);
    } catch (error) {
      return handleError(error, request);
    }
  };
}
__name(withErrorHandler, "withErrorHandler");
function handleError(error, request) {
  console.error("[Error]", {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error instanceof ValidationError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        details: error.errors
      }
    }, HTTP_STATUS.BAD_REQUEST);
  }
  if (error instanceof AuthenticationError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: error.message
      }
    }, HTTP_STATUS.UNAUTHORIZED);
  }
  if (error instanceof ForbiddenError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: error.message
      }
    }, HTTP_STATUS.FORBIDDEN);
  }
  if (error instanceof NotFoundError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: error.message
      }
    }, HTTP_STATUS.NOT_FOUND);
  }
  if (error instanceof ConflictError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.CONFLICT,
        message: error.message
      }
    }, HTTP_STATUS.CONFLICT);
  }
  if (error instanceof BusinessError) {
    return jsonResponse({
      success: false,
      error: {
        code: error.code || ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      }
    }, HTTP_STATUS.BAD_REQUEST);
  }
  return jsonResponse({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "\u670D\u52D9\u5668\u5167\u90E8\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66"
    }
  }, HTTP_STATUS.INTERNAL_ERROR);
}
__name(handleError, "handleError");
var ValidationError = class extends Error {
  static {
    __name(this, "ValidationError");
  }
  constructor(message, errors = {}) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
};
var AuthenticationError = class extends Error {
  static {
    __name(this, "AuthenticationError");
  }
  constructor(message = "\u8A8D\u8B49\u5931\u6557") {
    super(message);
    this.name = "AuthenticationError";
  }
};
var ForbiddenError = class extends Error {
  static {
    __name(this, "ForbiddenError");
  }
  constructor(message = "\u6B0A\u9650\u4E0D\u8DB3") {
    super(message);
    this.name = "ForbiddenError";
  }
};
var NotFoundError = class extends Error {
  static {
    __name(this, "NotFoundError");
  }
  constructor(message = "\u8CC7\u6E90\u4E0D\u5B58\u5728") {
    super(message);
    this.name = "NotFoundError";
  }
};
var ConflictError = class extends Error {
  static {
    __name(this, "ConflictError");
  }
  constructor(message = "\u8CC7\u6E90\u885D\u7A81") {
    super(message);
    this.name = "ConflictError";
  }
};
var BusinessError = class extends Error {
  static {
    __name(this, "BusinessError");
  }
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
  }
};

// src/routes/auth.routes.js
function adaptAuthHandler(handler) {
  return async (env, request) => {
    return handler(env.DB, request);
  };
}
__name(adaptAuthHandler, "adaptAuthHandler");
function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose, "compose");
function registerAuthRoutes(router) {
  const authHandler = compose(withErrorHandler, withAuth);
  const adminHandler = compose(withErrorHandler, withAdmin);
  router.post("/api/auth/login", withErrorHandler(adaptAuthHandler(handleLogin)));
  router.post("/api/login", withErrorHandler(adaptAuthHandler(handleLogin)));
  router.post("/api/auth/logout", authHandler(adaptAuthHandler(handleLogout)));
  router.post("/api/logout", authHandler(adaptAuthHandler(handleLogout)));
  router.get("/api/auth/verify", authHandler(adaptAuthHandler(handleVerifySession)));
  router.get("/api/verify", authHandler(adaptAuthHandler(handleVerifySession)));
  router.get("/api/auth/me", authHandler(adaptAuthHandler(handleVerifySession)));
  router.post("/api/auth/change-password", authHandler(adaptAuthHandler(handleChangePassword)));
  router.post("/api/change-password", authHandler(adaptAuthHandler(handleChangePassword)));
  router.post("/api/auth/admin/reset-password", adminHandler(adaptAuthHandler(handleAdminResetPassword)));
}
__name(registerAuthRoutes, "registerAuthRoutes");

// src/repositories/BaseRepository.js
var BaseRepository = class {
  static {
    __name(this, "BaseRepository");
  }
  /**
   * 構造函數
   * @param {Object} db - D1 Database 實例
   * @param {string} tableName - 表名
   */
  constructor(db, tableName) {
    if (!db) {
      throw new Error("Database instance is required");
    }
    if (!tableName) {
      throw new Error("Table name is required");
    }
    this.db = db;
    this.tableName = tableName;
  }
  /**
   * 查詢所有記錄
   * @param {Object} filters - 過濾條件
   * @param {Object} options - 查詢選項（排序、分頁等）
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}, options = {}) {
    const { orderBy = "created_at", order = "DESC", limit, offset } = options;
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== void 0 && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` ORDER BY ${orderBy} ${order}`;
    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
      if (offset) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }
  /**
   * 根據 ID 查詢單個記錄
   * @param {number} id - 記錄 ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).bind(id).first();
    return result;
  }
  /**
   * 根據條件查詢單個記錄
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Object|null>}
   */
  async findOne(filters = {}) {
    const conditions = [];
    const params = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== void 0 && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (conditions.length === 0) {
      throw new Error("At least one filter condition is required");
    }
    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(" AND ")} LIMIT 1`;
    const result = await this.db.prepare(query).bind(...params).first();
    return result;
  }
  /**
   * 創建記錄
   * @param {Object} data - 記錄數據
   * @returns {Promise<number>} 新記錄的 ID
   */
  async create(data) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Data is required for create operation");
    }
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => "?").join(", ");
    const query = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders})
    `;
    const result = await this.db.prepare(query).bind(...values).run();
    if (!result.success) {
      throw new Error("Failed to create record");
    }
    return result.meta.last_row_id;
  }
  /**
   * 更新記錄
   * @param {number} id - 記錄 ID
   * @param {Object} data - 更新數據
   * @returns {Promise<Object>} 更新後的記錄
   */
  async update(id, data) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Data is required for update operation");
    }
    data.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    const sets = Object.keys(data).map((key) => `${key} = ?`).join(", ");
    const values = [...Object.values(data), id];
    const query = `
      UPDATE ${this.tableName}
      SET ${sets}
      WHERE id = ?
    `;
    const result = await this.db.prepare(query).bind(...values).run();
    if (!result.success) {
      throw new Error("Failed to update record");
    }
    return this.findById(id);
  }
  /**
   * 刪除記錄（硬刪除）
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.prepare(query).bind(id).run();
    return result.success;
  }
  /**
   * 軟刪除（推薦使用）
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async softDelete(id) {
    return this.update(id, {
      is_deleted: true,
      deleted_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * 統計記錄數量
   * @param {Object} filters - 過濾條件
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    const conditions = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== void 0 && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    const result = await this.db.prepare(query).bind(...params).first();
    return result?.count || 0;
  }
  /**
   * 檢查記錄是否存在
   * @param {number} id - 記錄 ID
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const result = await this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`).bind(id).first();
    return !!result;
  }
  /**
   * 批量創建
   * @param {Array<Object>} records - 記錄數組
   * @returns {Promise<Array<number>>} 新記錄的 ID 數組
   */
  async batchCreate(records) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Records array is required");
    }
    const ids = [];
    for (const record of records) {
      const id = await this.create(record);
      ids.push(id);
    }
    return ids;
  }
  /**
   * 執行原始 SQL 查詢
   * @param {string} query - SQL 查詢語句
   * @param {Array} params - 參數
   * @returns {Promise<Object>}
   */
  async raw(query, params = []) {
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }
  /**
   * 執行原始 SQL（單條記錄）
   * @param {string} query - SQL 查詢語句
   * @param {Array} params - 參數
   * @returns {Promise<Object|null>}
   */
  async rawFirst(query, params = []) {
    const result = await this.db.prepare(query).bind(...params).first();
    return result;
  }
  /**
   * 驗證必填欄位
   * @protected
   */
  _validateRequired(data, requiredFields) {
    for (const field of requiredFields) {
      if (data[field] === void 0 || data[field] === null || data[field] === "") {
        throw new Error(`\u6B04\u4F4D ${field} \u70BA\u5FC5\u586B`);
      }
    }
  }
  /**
   * 驗證欄位類型
   * @protected
   */
  _validateTypes(data, typeMap) {
    for (const [field, expectedType] of Object.entries(typeMap)) {
      if (data[field] !== void 0) {
        const actualType = typeof data[field];
        if (actualType !== expectedType) {
          throw new Error(`\u6B04\u4F4D ${field} \u985E\u578B\u932F\u8AA4\uFF0C\u671F\u671B ${expectedType}\uFF0C\u5BE6\u969B ${actualType}`);
        }
      }
    }
  }
};

// src/repositories/ClientRepository.js
var ClientRepository = class extends BaseRepository {
  static {
    __name(this, "ClientRepository");
  }
  constructor(db) {
    super(db, TABLES.CLIENTS);
  }
  /**
   * 查詢客戶（帶服務）
   * @param {number} id - 客戶 ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithServices(id) {
    const client = await this.findById(id);
    if (!client) return null;
    const services = await this.db.prepare(`
        SELECT * FROM ${TABLES.CLIENT_SERVICES}
        WHERE ${FIELDS.CLIENT_ID} = ?
        ORDER BY ${FIELDS.CREATED_AT} DESC
      `).bind(id).all();
    return {
      ...client,
      services: services.results || []
    };
  }
  /**
   * 根據統一編號查詢
   * @param {string} taxId - 統一編號
   * @returns {Promise<Object|null>}
   */
  async findByTaxId(taxId) {
    return this.findOne({ tax_id: taxId });
  }
  /**
   * 根據名稱查詢
   * @param {string} name - 客戶名稱
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return this.findOne({ name });
  }
  /**
   * 檢查名稱是否已存在
   * @param {string} name - 客戶名稱
   * @param {number} excludeId - 排除的 ID（用於更新時檢查）
   * @returns {Promise<boolean>}
   */
  async nameExists(name, excludeId = null) {
    let query = `SELECT ${FIELDS.ID} FROM ${this.tableName} WHERE name = ?`;
    const params = [name];
    if (excludeId) {
      query += ` AND ${FIELDS.ID} != ?`;
      params.push(excludeId);
    }
    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }
  /**
   * 檢查統一編號是否已存在
   * @param {string} taxId - 統一編號
   * @param {number} excludeId - 排除的 ID
   * @returns {Promise<boolean>}
   */
  async taxIdExists(taxId, excludeId = null) {
    let query = `SELECT ${FIELDS.ID} FROM ${this.tableName} WHERE tax_id = ?`;
    const params = [taxId];
    if (excludeId) {
      query += ` AND ${FIELDS.ID} != ?`;
      params.push(excludeId);
    }
    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }
  /**
   * 獲取客戶統計
   * @param {number} clientId - 客戶 ID
   * @returns {Promise<Object>}
   */
  async getStats(clientId) {
    const taskStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM ${TABLES.TASKS}
      WHERE ${FIELDS.CLIENT_ID} = ?
    `).bind(clientId).first();
    const serviceStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_services,
        SUM(CASE WHEN ${FIELDS.IS_ACTIVE} = 1 THEN 1 ELSE 0 END) as active_services
      FROM ${TABLES.CLIENT_SERVICES}
      WHERE ${FIELDS.CLIENT_ID} = ?
    `).bind(clientId).first();
    return {
      tasks: taskStats || { total_tasks: 0, completed_tasks: 0, in_progress_tasks: 0 },
      services: serviceStats || { total_services: 0, active_services: 0 }
    };
  }
};

// src/utils/validation.util.js
var VALIDATION_RULES = {
  // 用戶名
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: "\u7528\u6236\u540D\u5FC5\u9808\u662F 3-50 \u500B\u5B57\u7B26\uFF0C\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6578\u5B57\u548C\u4E0B\u5283\u7DDA"
  },
  // 密碼
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    message: "\u5BC6\u78BC\u5FC5\u9808\u81F3\u5C11 8 \u500B\u5B57\u7B26\uFF0C\u5305\u542B\u5927\u5C0F\u5BEB\u5B57\u6BCD\u548C\u6578\u5B57"
  },
  // Email
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u96FB\u5B50\u90F5\u4EF6\u5730\u5740"
  },
  // 台灣電話
  phone: {
    pattern: /^09\d{8}$|^(0\d{1,3})\d{6,8}$/,
    message: "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u53F0\u7063\u96FB\u8A71\u865F\u78BC"
  },
  // 統一編號
  taxId: {
    pattern: /^\d{8}$/,
    validator: validateTaiwanTaxId,
    message: "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u7D71\u4E00\u7DE8\u865F"
  }
};
function validateTaiwanTaxId(taxId) {
  if (!/^\d{8}$/.test(taxId)) {
    return false;
  }
  const logic = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const n = parseInt(taxId[i]) * logic[i];
    sum += Math.floor(n / 10) + n % 10;
  }
  return sum % 10 === 0 || taxId[6] === "7" && (sum + 1) % 10 === 0;
}
__name(validateTaiwanTaxId, "validateTaiwanTaxId");
var Validator = class {
  static {
    __name(this, "Validator");
  }
  constructor(data) {
    this.data = data;
    this.errors = {};
  }
  /**
   * 驗證必填欄位
   */
  required(field, message = null) {
    if (!this.data[field] || this.data[field] === "") {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u70BA\u5FC5\u586B`;
    }
    return this;
  }
  /**
   * 驗證字符串長度
   */
  length(field, min, max, message = null) {
    const value = this.data[field];
    if (value && (value.length < min || value.length > max)) {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u9577\u5EA6\u5FC5\u9808\u5728 ${min}-${max} \u4E4B\u9593`;
    }
    return this;
  }
  /**
   * 驗證正則表達式
   */
  pattern(field, pattern, message = null) {
    const value = this.data[field];
    if (value && !pattern.test(value)) {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u683C\u5F0F\u4E0D\u6B63\u78BA`;
    }
    return this;
  }
  /**
   * 驗證數字範圍
   */
  range(field, min, max, message = null) {
    const value = this.data[field];
    if (value !== void 0 && (value < min || value > max)) {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u5FC5\u9808\u5728 ${min}-${max} \u4E4B\u9593`;
    }
    return this;
  }
  /**
   * 驗證枚舉值
   */
  enum(field, allowedValues, message = null) {
    const value = this.data[field];
    if (value && !allowedValues.includes(value)) {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u5FC5\u9808\u662F\u4EE5\u4E0B\u503C\u4E4B\u4E00\uFF1A${allowedValues.join(", ")}`;
    }
    return this;
  }
  /**
   * 自定義驗證
   */
  custom(field, validator, message) {
    const value = this.data[field];
    if (value && !validator(value)) {
      this.errors[field] = message || `\u6B04\u4F4D ${field} \u9A57\u8B49\u5931\u6557`;
    }
    return this;
  }
  /**
   * 驗證 Email
   */
  email(field, message = null) {
    return this.pattern(field, VALIDATION_RULES.email.pattern, message || VALIDATION_RULES.email.message);
  }
  /**
   * 驗證台灣電話
   */
  taiwanPhone(field, message = null) {
    return this.pattern(field, VALIDATION_RULES.phone.pattern, message || VALIDATION_RULES.phone.message);
  }
  /**
   * 驗證統一編號
   */
  taiwanTaxId(field, message = null) {
    return this.custom(field, validateTaiwanTaxId, message || VALIDATION_RULES.taxId.message);
  }
  /**
   * 檢查是否有錯誤
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
  /**
   * 獲取錯誤
   */
  getErrors() {
    return this.errors;
  }
  /**
   * 抛出驗證錯誤
   */
  throwIfFailed() {
    if (this.hasErrors()) {
      throw new ValidationError("\u6578\u64DA\u9A57\u8B49\u5931\u6557", this.errors);
    }
  }
  /**
   * 獲取驗證結果
   */
  getResult() {
    return {
      valid: !this.hasErrors(),
      errors: this.errors,
      data: this.data
    };
  }
};
function validate(data) {
  return new Validator(data);
}
__name(validate, "validate");

// src/services/ClientService.js
var ClientService = class {
  static {
    __name(this, "ClientService");
  }
  constructor(db) {
    this.repository = new ClientRepository(db);
  }
  /**
   * 獲取客戶列表
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>}
   */
  async getList(options = {}) {
    const { page = 1, pageSize = 20, status, region, search } = options;
    const filters = {};
    if (status) filters.status = status;
    if (region) filters.region = region;
    let allClients = await this.repository.findAll(filters);
    if (search) {
      const searchLower = search.toLowerCase();
      allClients = allClients.filter(
        (client) => client.name.toLowerCase().includes(searchLower) || client.tax_id && client.tax_id.includes(searchLower)
      );
    }
    const total = allClients.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const clients = allClients.slice(start, end);
    return {
      data: clients,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
  /**
   * 獲取客戶詳情（帶服務）
   * @param {number} id - 客戶 ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const client = await this.repository.findByIdWithServices(id);
    if (!client) {
      throw new NotFoundError("\u5BA2\u6236\u4E0D\u5B58\u5728");
    }
    const stats = await this.repository.getStats(id);
    client.stats = stats;
    return client;
  }
  /**
   * 創建客戶
   * @param {Object} data - 客戶數據
   * @param {Object} context - 上下文（當前用戶等）
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    this._validateClientData(data);
    if (await this.repository.nameExists(data.name)) {
      throw new ConflictError(`\u5BA2\u6236\u540D\u7A31\u300C${data.name}\u300D\u5DF2\u5B58\u5728`);
    }
    if (data.tax_id && await this.repository.taxIdExists(data.tax_id)) {
      throw new ConflictError(`\u7D71\u4E00\u7DE8\u865F\u300C${data.tax_id}\u300D\u5DF2\u5B58\u5728`);
    }
    if (!data.status) {
      data.status = CLIENT_STATUS.ACTIVE;
    }
    const id = await this.repository.create(data);
    console.log(`[ClientService] Client created: ${id} by user ${context?.user?.id}`);
    return this.repository.findById(id);
  }
  /**
   * 更新客戶
   * @param {number} id - 客戶 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u5BA2\u6236\u4E0D\u5B58\u5728");
    }
    if (data.name) {
      validate(data).required("name").throwIfFailed();
      if (await this.repository.nameExists(data.name, id)) {
        throw new ConflictError(`\u5BA2\u6236\u540D\u7A31\u300C${data.name}\u300D\u5DF2\u5B58\u5728`);
      }
    }
    if (data.tax_id && await this.repository.taxIdExists(data.tax_id, id)) {
      throw new ConflictError(`\u7D71\u4E00\u7DE8\u865F\u300C${data.tax_id}\u300D\u5DF2\u5B58\u5728`);
    }
    const updated = await this.repository.update(id, data);
    console.log(`[ClientService] Client updated: ${id} by user ${context?.user?.id}`);
    return updated;
  }
  /**
   * 刪除客戶（軟刪除）
   * @param {number} id - 客戶 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u5BA2\u6236\u4E0D\u5B58\u5728");
    }
    const activeServices = await this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM client_services 
      WHERE client_id = ? AND is_active = 1
    `).bind(id).first();
    if (activeServices.count > 0) {
      throw new ConflictError("\u5BA2\u6236\u6709\u555F\u7528\u7684\u670D\u52D9\uFF0C\u7121\u6CD5\u522A\u9664\u3002\u8ACB\u5148\u505C\u7528\u6240\u6709\u670D\u52D9\u3002");
    }
    await this.repository.softDelete(id);
    console.log(`[ClientService] Client deleted: ${id} by user ${context?.user?.id}`);
    return true;
  }
  /**
   * 驗證客戶數據
   * @private
   */
  _validateClientData(data) {
    const validator = validate(data).required("name", "\u5BA2\u6236\u540D\u7A31\u70BA\u5FC5\u586B");
    if (data.tax_id) {
      validator.taiwanTaxId("tax_id");
    }
    if (data.phone) {
      validator.taiwanPhone("phone");
    }
    if (data.email) {
      validator.email("email");
    }
    if (data.status) {
      validator.enum("status", Object.values(CLIENT_STATUS));
    }
    validator.throwIfFailed();
  }
};

// src/utils/response.util.js
function success(data, meta = null, status = HTTP_STATUS.OK) {
  const response = {
    success: true,
    data
  };
  if (meta) {
    response.meta = meta;
  }
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(success, "success");
function created(data, message = "\u5275\u5EFA\u6210\u529F") {
  return success(data, { message }, HTTP_STATUS.CREATED);
}
__name(created, "created");
function noContent() {
  return new Response(null, {
    status: HTTP_STATUS.NO_CONTENT,
    headers: corsHeaders
  });
}
__name(noContent, "noContent");
function paginated(data, total, page, pageSize) {
  return success(data, {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}
__name(paginated, "paginated");
function list(data) {
  return success(data, {
    total: data.length
  });
}
__name(list, "list");

// src/handlers/clients.handler.js
async function getClientList(env, request) {
  const url = new URL(request.url);
  const options = {
    page: parseInt(url.searchParams.get("page")) || 1,
    pageSize: parseInt(url.searchParams.get("pageSize")) || 20,
    status: url.searchParams.get("status"),
    region: url.searchParams.get("region"),
    search: url.searchParams.get("search")
  };
  const service = new ClientService(env.DB);
  const result = await service.getList(options);
  return paginated(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.pageSize
  );
}
__name(getClientList, "getClientList");
async function getClientDetail(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientService(env.DB);
  const client = await service.getDetail(id);
  return success(client);
}
__name(getClientDetail, "getClientDetail");
async function createClient(env, request) {
  const data = await request.json();
  const user = request.user;
  const service = new ClientService(env.DB);
  const client = await service.create(data, { user });
  return created(client, "\u5BA2\u6236\u5275\u5EFA\u6210\u529F");
}
__name(createClient, "createClient");
async function updateClient(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;
  const service = new ClientService(env.DB);
  const client = await service.update(id, data, { user });
  return success(client);
}
__name(updateClient, "updateClient");
async function deleteClient(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new ClientService(env.DB);
  await service.delete(id, { user });
  return noContent();
}
__name(deleteClient, "deleteClient");
async function getClientServices(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  let query = `
    SELECT 
      cs.*,
      c.name as client_name
    FROM client_services cs
    JOIN clients c ON cs.client_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (clientId) {
    query += ` AND cs.client_id = ?`;
    params.push(clientId);
  }
  query += ` ORDER BY c.name, cs.service_type`;
  const result = await env.DB.prepare(query).bind(...params).all();
  return success({ data: result.results || [] });
}
__name(getClientServices, "getClientServices");
async function getClientInteractions(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  let query = `
    SELECT 
      ci.*,
      c.name as client_name
    FROM client_interactions ci
    JOIN clients c ON ci.client_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (clientId) {
    query += ` AND ci.client_id = ?`;
    params.push(clientId);
  }
  query += ` ORDER BY ci.interaction_date DESC`;
  const result = await env.DB.prepare(query).bind(...params).all();
  return success({ data: result.results || [] });
}
__name(getClientInteractions, "getClientInteractions");

// src/routes/clients.routes.js
function compose2(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose2, "compose");
function registerClientRoutes(router) {
  const authHandler = compose2(withErrorHandler, withAuth);
  const adminHandler = compose2(withErrorHandler, withAdmin);
  router.get("/api/clients", authHandler(getClientList));
  router.get("/api/clients/:id", authHandler(getClientDetail));
  router.post("/api/clients", adminHandler(createClient));
  router.put("/api/clients/:id", adminHandler(updateClient));
  router.delete("/api/clients/:id", adminHandler(deleteClient));
  router.get("/api/client-services", authHandler(getClientServices));
  router.get("/api/client-interactions", authHandler(getClientInteractions));
}
__name(registerClientRoutes, "registerClientRoutes");

// src/repositories/TaskRepository.js
var TaskRepository = class extends BaseRepository {
  static {
    __name(this, "TaskRepository");
  }
  constructor(db) {
    super(db, TABLES.TASKS);
  }
  /**
   * 查詢任務（帶創建者和分配者信息）
   * @param {number} id - 任務 ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithUsers(id) {
    const query = `
      SELECT 
        t.*,
        u_assigned.username as assigned_user_name,
        u_created.username as created_by_user_name,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.USERS} u_assigned ON t.${FIELDS.ASSIGNED_USER_ID} = u_assigned.id
      LEFT JOIN ${TABLES.USERS} u_created ON t.${FIELDS.CREATED_BY_USER_ID} = u_created.id
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.${FIELDS.ID} = ?
    `;
    return this.rawFirst(query, [id]);
  }
  /**
   * 查詢任務列表（帶關聯信息）
   * @param {Object} filters - 過濾條件
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>}
   */
  async findAllWithUsers(filters = {}, options = {}) {
    let query = `
      SELECT 
        t.*,
        u_assigned.username as assigned_user_name,
        u_created.username as created_by_user_name,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.USERS} u_assigned ON t.${FIELDS.ASSIGNED_USER_ID} = u_assigned.id
      LEFT JOIN ${TABLES.USERS} u_created ON t.${FIELDS.CREATED_BY_USER_ID} = u_created.id
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
    `;
    const conditions = [];
    const params = [];
    if (filters.status) {
      conditions.push(`t.status = ?`);
      params.push(filters.status);
    }
    if (filters.task_type) {
      conditions.push(`t.task_type = ?`);
      params.push(filters.task_type);
    }
    if (filters.category) {
      conditions.push(`t.category = ?`);
      params.push(filters.category);
    }
    if (filters.assigned_user_id) {
      conditions.push(`t.${FIELDS.ASSIGNED_USER_ID} = ?`);
      params.push(filters.assigned_user_id);
    }
    if (filters.client_id) {
      conditions.push(`t.${FIELDS.CLIENT_ID} = ?`);
      params.push(filters.client_id);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    const { orderBy = FIELDS.CREATED_AT, order = "DESC" } = options;
    query += ` ORDER BY t.${orderBy} ${order}`;
    return this.raw(query, params);
  }
  /**
   * 查詢用戶的任務統計
   * @param {number} userId - 用戶 ID
   * @returns {Promise<Object>}
   */
  async getUserTaskStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM ${TABLES.TASKS}
      WHERE ${FIELDS.ASSIGNED_USER_ID} = ?
    `;
    return this.rawFirst(query, [userId]);
  }
  /**
   * 查詢即將到期的任務
   * @param {number} days - 幾天內到期
   * @returns {Promise<Array>}
   */
  async findDueSoon(days = 3) {
    const query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.status NOT IN ('completed', 'cancelled')
        AND t.due_date IS NOT NULL
        AND t.due_date <= datetime('now', '+${days} days')
        AND t.due_date >= datetime('now')
      ORDER BY t.due_date ASC
    `;
    return this.raw(query);
  }
  /**
   * 查詢逾期的任務
   * @returns {Promise<Array>}
   */
  async findOverdue() {
    const query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.status NOT IN ('completed', 'cancelled')
        AND t.due_date IS NOT NULL
        AND t.due_date < datetime('now')
      ORDER BY t.due_date ASC
    `;
    return this.raw(query);
  }
};

// src/services/TaskService.js
var TaskService = class {
  static {
    __name(this, "TaskService");
  }
  constructor(db) {
    this.repository = new TaskRepository(db);
  }
  /**
   * 獲取任務列表
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>}
   */
  async getList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      status,
      task_type,
      category,
      assigned_user_id,
      client_id,
      search
    } = options;
    const filters = {};
    if (status) filters.status = status;
    if (task_type) filters.task_type = task_type;
    if (category) filters.category = category;
    if (assigned_user_id) filters.assigned_user_id = assigned_user_id;
    if (client_id) filters.client_id = client_id;
    let allTasks = await this.repository.findAllWithUsers(filters);
    if (search) {
      const searchLower = search.toLowerCase();
      allTasks = allTasks.filter(
        (task) => task.title.toLowerCase().includes(searchLower) || task.description && task.description.toLowerCase().includes(searchLower)
      );
    }
    const total = allTasks.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const tasks = allTasks.slice(start, end);
    return {
      data: tasks,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
  /**
   * 獲取任務詳情
   * @param {number} id - 任務 ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const task = await this.repository.findByIdWithUsers(id);
    if (!task) {
      throw new NotFoundError("\u4EFB\u52D9\u4E0D\u5B58\u5728");
    }
    return task;
  }
  /**
   * 創建任務
   * @param {Object} data - 任務數據
   * @param {Object} context - 上下文（當前用戶等）
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    this._validateTaskData(data);
    if (!data.status) {
      data.status = TASK_STATUS.PENDING;
    }
    if (!data.task_type) {
      data.task_type = TASK_TYPE.TASK;
    }
    if (!data.priority) {
      data.priority = "medium";
    }
    if (context?.user?.id) {
      data.created_by_user_id = context.user.id;
    }
    const id = await this.repository.create(data);
    console.log(`[TaskService] Task created: ${id} by user ${context?.user?.id}`);
    return this.repository.findByIdWithUsers(id);
  }
  /**
   * 更新任務
   * @param {number} id - 任務 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u4EFB\u52D9\u4E0D\u5B58\u5728");
    }
    if (data.title) {
      validate(data).required("title", "\u4EFB\u52D9\u6A19\u984C\u70BA\u5FC5\u586B").throwIfFailed();
    }
    if (data.status) {
      validate(data).enum("status", Object.values(TASK_STATUS)).throwIfFailed();
    }
    if (data.status === TASK_STATUS.COMPLETED && !data.completed_date) {
      data.completed_date = (/* @__PURE__ */ new Date()).toISOString();
    }
    const updated = await this.repository.update(id, data);
    console.log(`[TaskService] Task updated: ${id} by user ${context?.user?.id}`);
    return this.repository.findByIdWithUsers(id);
  }
  /**
   * 刪除任務
   * @param {number} id - 任務 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u4EFB\u52D9\u4E0D\u5B58\u5728");
    }
    await this.repository.softDelete(id);
    console.log(`[TaskService] Task deleted: ${id} by user ${context?.user?.id}`);
    return true;
  }
  /**
   * 獲取用戶任務統計
   * @param {number} userId - 用戶 ID
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    return this.repository.getUserTaskStats(userId);
  }
  /**
   * 獲取即將到期的任務
   * @param {number} days - 天數
   * @returns {Promise<Array>}
   */
  async getDueSoonTasks(days = 3) {
    return this.repository.findDueSoon(days);
  }
  /**
   * 獲取逾期任務
   * @returns {Promise<Array>}
   */
  async getOverdueTasks() {
    return this.repository.findOverdue();
  }
  /**
   * 驗證任務數據
   * @private
   */
  _validateTaskData(data) {
    const validator = validate(data).required("title", "\u4EFB\u52D9\u6A19\u984C\u70BA\u5FC5\u586B");
    if (data.status) {
      validator.enum("status", Object.values(TASK_STATUS));
    }
    if (data.task_type) {
      validator.enum("task_type", Object.values(TASK_TYPE));
    }
    if (data.category) {
      validator.enum("category", Object.values(TASK_CATEGORY));
    }
    validator.throwIfFailed();
  }
};

// src/handlers/tasks.handler.js
async function getTaskList(env, request) {
  const url = new URL(request.url);
  const options = {
    page: parseInt(url.searchParams.get("page")) || 1,
    pageSize: parseInt(url.searchParams.get("pageSize")) || 20,
    status: url.searchParams.get("status"),
    task_type: url.searchParams.get("task_type"),
    category: url.searchParams.get("category"),
    assigned_user_id: url.searchParams.get("assigned_user_id") ? parseInt(url.searchParams.get("assigned_user_id")) : null,
    client_id: url.searchParams.get("client_id") ? parseInt(url.searchParams.get("client_id")) : null,
    search: url.searchParams.get("search")
  };
  const service = new TaskService(env.DB);
  const result = await service.getList(options);
  return paginated(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.pageSize
  );
}
__name(getTaskList, "getTaskList");
async function getTaskDetail(env, request) {
  const id = parseInt(request.params.id);
  const service = new TaskService(env.DB);
  const task = await service.getDetail(id);
  return success(task);
}
__name(getTaskDetail, "getTaskDetail");
async function createTask(env, request) {
  const data = await request.json();
  const user = request.user;
  const service = new TaskService(env.DB);
  const task = await service.create(data, { user });
  return created(task, "\u4EFB\u52D9\u5275\u5EFA\u6210\u529F");
}
__name(createTask, "createTask");
async function updateTask(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;
  const service = new TaskService(env.DB);
  const task = await service.update(id, data, { user });
  return success(task);
}
__name(updateTask, "updateTask");
async function deleteTask(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new TaskService(env.DB);
  await service.delete(id, { user });
  return noContent();
}
__name(deleteTask, "deleteTask");
async function getUserTaskStats(env, request) {
  const userId = parseInt(request.params.userId);
  const service = new TaskService(env.DB);
  const stats = await service.getUserStats(userId);
  return success(stats);
}
__name(getUserTaskStats, "getUserTaskStats");
async function getDueSoonTasks(env, request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days")) || 3;
  const service = new TaskService(env.DB);
  const tasks = await service.getDueSoonTasks(days);
  return success(tasks);
}
__name(getDueSoonTasks, "getDueSoonTasks");
async function getOverdueTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getOverdueTasks();
  return success(tasks);
}
__name(getOverdueTasks, "getOverdueTasks");
async function getMultiStageTasks(env, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const assignedUserId = url.searchParams.get("assigned_user_id");
  const options = {
    task_type: "task",
    // 暂时返回普通任务
    status,
    assigned_user_id: assignedUserId ? parseInt(assignedUserId) : null
  };
  const service = new TaskService(env.DB);
  const result = await service.getList(options);
  return success({ tasks: result.data, meta: result.meta });
}
__name(getMultiStageTasks, "getMultiStageTasks");
async function getRecurringTasks(env, request) {
  const url = new URL(request.url);
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");
  const options = {
    task_type: "recurring",
    category: "recurring"
  };
  const service = new TaskService(env.DB);
  const result = await service.getList(options);
  return success(result.data);
}
__name(getRecurringTasks, "getRecurringTasks");

// src/routes/tasks.routes.js
function compose3(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose3, "compose");
function registerTaskRoutes(router) {
  const authHandler = compose3(withErrorHandler, withAuth);
  const adminHandler = compose3(withErrorHandler, withAdmin);
  router.get("/api/tasks", authHandler(getTaskList));
  router.get("/api/tasks/multi-stage", authHandler(getMultiStageTasks));
  router.get("/api/tasks/recurring", authHandler(getRecurringTasks));
  router.get("/api/tasks/due-soon", authHandler(getDueSoonTasks));
  router.get("/api/tasks/overdue", authHandler(getOverdueTasks));
  router.get("/api/tasks/stats/user/:userId", authHandler(getUserTaskStats));
  router.get("/api/tasks/:id", authHandler(getTaskDetail));
  router.post("/api/tasks", authHandler(createTask));
  router.put("/api/tasks/:id", authHandler(updateTask));
  router.delete("/api/tasks/:id", adminHandler(deleteTask));
}
__name(registerTaskRoutes, "registerTaskRoutes");

// src/repositories/EmployeeRepository.js
var EmployeeRepository = class extends BaseRepository {
  static {
    __name(this, "EmployeeRepository");
  }
  constructor(db) {
    super(db, TABLES.EMPLOYEES);
  }
  /**
   * 根據名稱查詢員工
   * @param {string} name - 員工姓名
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return this.findOne({ name });
  }
  /**
   * 檢查名稱是否已存在
   * @param {string} name - 員工姓名
   * @param {number} excludeId - 排除的 ID
   * @returns {Promise<boolean>}
   */
  async nameExists(name, excludeId = null) {
    let query = `SELECT ${FIELDS.ID} FROM ${this.tableName} WHERE name = ?`;
    const params = [name];
    if (excludeId) {
      query += ` AND ${FIELDS.ID} != ?`;
      params.push(excludeId);
    }
    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }
  /**
   * 獲取啟用的員工
   * @returns {Promise<Array>}
   */
  async findActive() {
    return this.findAll({ is_active: 1 }, { orderBy: "name", order: "ASC" });
  }
  /**
   * 獲取員工及其關聯的用戶信息
   * @param {number} id - 員工 ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithUser(id) {
    const query = `
      SELECT 
        e.*,
        u.id as user_id,
        u.username,
        u.role
      FROM ${TABLES.EMPLOYEES} e
      LEFT JOIN ${TABLES.USERS} u ON e.id = u.employee_id
      WHERE e.${FIELDS.ID} = ?
    `;
    return this.rawFirst(query, [id]);
  }
};

// src/services/EmployeeService.js
var EmployeeService = class {
  static {
    __name(this, "EmployeeService");
  }
  constructor(db) {
    this.repository = new EmployeeRepository(db);
  }
  /**
   * 獲取員工列表
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>}
   */
  async getList(options = {}) {
    const { activeOnly = false } = options;
    if (activeOnly) {
      return this.repository.findActive();
    }
    return this.repository.findAll({}, { orderBy: "name", order: "ASC" });
  }
  /**
   * 獲取員工詳情
   * @param {number} id - 員工 ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const employee = await this.repository.findByIdWithUser(id);
    if (!employee) {
      throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
    }
    return employee;
  }
  /**
   * 創建員工
   * @param {Object} data - 員工數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    this._validateEmployeeData(data);
    if (await this.repository.nameExists(data.name)) {
      throw new ConflictError(`\u54E1\u5DE5\u59D3\u540D\u300C${data.name}\u300D\u5DF2\u5B58\u5728`);
    }
    if (data.is_active === void 0) {
      data.is_active = true;
    }
    const id = await this.repository.create(data);
    console.log(`[EmployeeService] Employee created: ${id} by user ${context?.user?.id}`);
    return this.repository.findById(id);
  }
  /**
   * 更新員工
   * @param {number} id - 員工 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
    }
    if (data.name && await this.repository.nameExists(data.name, id)) {
      throw new ConflictError(`\u54E1\u5DE5\u59D3\u540D\u300C${data.name}\u300D\u5DF2\u5B58\u5728`);
    }
    const updated = await this.repository.update(id, data);
    console.log(`[EmployeeService] Employee updated: ${id} by user ${context?.user?.id}`);
    return updated;
  }
  /**
   * 刪除員工（軟刪除）
   * @param {number} id - 員工 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
    }
    await this.repository.update(id, { is_active: false });
    console.log(`[EmployeeService] Employee deactivated: ${id} by user ${context?.user?.id}`);
    return true;
  }
  /**
   * 驗證員工數據
   * @private
   */
  _validateEmployeeData(data) {
    const validator = validate(data).required("name", "\u54E1\u5DE5\u59D3\u540D\u70BA\u5FC5\u586B");
    if (data.email) {
      validator.email("email");
    }
    validator.throwIfFailed();
  }
};

// src/handlers/employees.handler.js
async function getEmployeeList(env, request) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const service = new EmployeeService(env.DB);
  const employees = await service.getList({ activeOnly });
  return list(employees);
}
__name(getEmployeeList, "getEmployeeList");
async function getEmployeeDetail(env, request) {
  const id = parseInt(request.params.id);
  const service = new EmployeeService(env.DB);
  const employee = await service.getDetail(id);
  return success(employee);
}
__name(getEmployeeDetail, "getEmployeeDetail");
async function createEmployee(env, request) {
  const data = await request.json();
  const user = request.user;
  const service = new EmployeeService(env.DB);
  const employee = await service.create(data, { user });
  return created(employee, "\u54E1\u5DE5\u5275\u5EFA\u6210\u529F");
}
__name(createEmployee, "createEmployee");
async function updateEmployee(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;
  const service = new EmployeeService(env.DB);
  const employee = await service.update(id, data, { user });
  return success(employee);
}
__name(updateEmployee, "updateEmployee");
async function deleteEmployee(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new EmployeeService(env.DB);
  await service.delete(id, { user });
  return noContent();
}
__name(deleteEmployee, "deleteEmployee");

// src/routes/employees.routes.js
function compose4(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose4, "compose");
function registerEmployeeRoutes(router) {
  const authHandler = compose4(withErrorHandler, withAuth);
  const adminHandler = compose4(withErrorHandler, withAdmin);
  router.get("/api/employees", authHandler(getEmployeeList));
  router.get("/api/employees/:id", authHandler(getEmployeeDetail));
  router.post("/api/employees", adminHandler(createEmployee));
  router.put("/api/employees/:id", adminHandler(updateEmployee));
  router.delete("/api/employees/:id", adminHandler(deleteEmployee));
}
__name(registerEmployeeRoutes, "registerEmployeeRoutes");

// src/repositories/ReportRepository.js
var ReportRepository = class {
  static {
    __name(this, "ReportRepository");
  }
  constructor(db) {
    this.db = db;
  }
  /**
   * 獲取年假報表數據
   * @param {string} employeeName - 員工姓名
   * @param {number} year - 年度
   * @returns {Promise<Object>}
   */
  async getAnnualLeaveReport(employeeName, year) {
    const employee = await this.db.prepare(`
      SELECT id, name, hire_date FROM ${TABLES.EMPLOYEES}
      WHERE name = ?
    `).bind(employeeName).first();
    if (!employee) {
      return null;
    }
    const leaveEvents = await this.db.prepare(`
      SELECT 
        le.*,
        lt.type_name,
        lt.is_paid
      FROM ${TABLES.LEAVE_EVENTS} le
      JOIN ${TABLES.LEAVE_TYPES} lt ON le.leave_type_id = lt.id
      WHERE le.employee_id = ? 
        AND strftime('%Y', le.date) = ?
        AND le.status = 'approved'
      ORDER BY le.date
    `).bind(employee.id, year.toString()).all();
    return {
      employee,
      leave_events: leaveEvents.results || [],
      year
    };
  }
  /**
   * 獲取工時分析報表
   * @param {Object} params - 查詢參數
   * @returns {Promise<Object>}
   */
  async getWorkAnalysisReport(params) {
    const { employee, year, month } = params;
    let query = `
      SELECT 
        t.date,
        t.regular_hours,
        t.overtime_hours,
        t.work_type,
        t.business_type,
        c.name as client_name
      FROM ${TABLES.TIMESHEETS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      LEFT JOIN ${TABLES.EMPLOYEES} e ON t.employee_id = e.id
      WHERE 1=1
    `;
    const bindings = [];
    if (employee) {
      query += ` AND e.name = ?`;
      bindings.push(employee);
    }
    if (year) {
      query += ` AND strftime('%Y', t.date) = ?`;
      bindings.push(year.toString());
    }
    if (month) {
      query += ` AND strftime('%m', t.date) = ?`;
      bindings.push(month.toString().padStart(2, "0"));
    }
    query += ` ORDER BY t.date DESC`;
    const result = await this.db.prepare(query).bind(...bindings).all();
    return {
      timesheets: result.results || [],
      params
    };
  }
  /**
   * 保存報表快取
   * @param {string} cacheKey - 快取鍵
   * @param {string} reportType - 報表類型
   * @param {Object} data - 報表數據
   * @param {number} expiryHours - 過期時間（小時）
   */
  async saveCache(cacheKey, reportType, data, expiryHours = 24) {
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1e3);
    await this.db.prepare(`
      INSERT OR REPLACE INTO ${TABLES.REPORT_CACHE} 
        (cache_key, report_type, cache_data, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      cacheKey,
      reportType,
      JSON.stringify(data),
      expiresAt.toISOString()
    ).run();
  }
  /**
   * 獲取報表快取
   * @param {string} cacheKey - 快取鍵
   * @returns {Promise<Object|null>}
   */
  async getCache(cacheKey) {
    const cache = await this.db.prepare(`
      SELECT cache_data, expires_at
      FROM ${TABLES.REPORT_CACHE}
      WHERE cache_key = ? AND expires_at > datetime('now')
    `).bind(cacheKey).first();
    if (!cache) {
      return null;
    }
    try {
      return JSON.parse(cache.cache_data);
    } catch (e) {
      console.error("Failed to parse cache data:", e);
      return null;
    }
  }
  /**
   * 清除過期快取
   */
  async clearExpiredCache() {
    await this.db.prepare(`
      DELETE FROM ${TABLES.REPORT_CACHE}
      WHERE expires_at < datetime('now')
    `).run();
  }
};

// src/services/ReportService.js
var ReportService = class {
  static {
    __name(this, "ReportService");
  }
  constructor(db) {
    this.repository = new ReportRepository(db);
  }
  /**
   * 獲取年假報表
   * @param {string} employeeName - 員工姓名
   * @param {number} year - 年度
   * @param {boolean} useCache - 是否使用快取
   * @returns {Promise<Object>}
   */
  async getAnnualLeaveReport(employeeName, year, useCache = true) {
    const cacheKey = `annual_leave_${employeeName}_${year}`;
    if (useCache) {
      const cached = await this.repository.getCache(cacheKey);
      if (cached) {
        return { ...cached, from_cache: true };
      }
    }
    const report = await this.repository.getAnnualLeaveReport(employeeName, year);
    if (!report) {
      throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
    }
    const leaveStats = this._calculateLeaveStats(report.leave_events);
    const result = {
      employee: report.employee,
      year: report.year,
      leave_stats: leaveStats,
      leave_events: report.leave_events,
      from_cache: false
    };
    await this.repository.saveCache(cacheKey, "annual_leave", result, 24);
    return result;
  }
  /**
   * 獲取工時分析報表
   * @param {Object} params - 查詢參數
   * @param {boolean} useCache - 是否使用快取
   * @returns {Promise<Object>}
   */
  async getWorkAnalysisReport(params, useCache = true) {
    const { employee, year, month } = params;
    const cacheKey = `work_analysis_${employee || "all"}_${year}_${month || "all"}`;
    if (useCache) {
      const cached = await this.repository.getCache(cacheKey);
      if (cached) {
        return { ...cached, from_cache: true };
      }
    }
    const report = await this.repository.getWorkAnalysisReport(params);
    const stats = this._calculateWorkStats(report.timesheets);
    const result = {
      timesheets: report.timesheets,
      stats,
      params: report.params,
      from_cache: false
    };
    await this.repository.saveCache(cacheKey, "work_analysis", result, 24);
    return result;
  }
  /**
   * 清除報表快取
   * @param {string} reportType - 報表類型（可選）
   */
  async clearCache(reportType = null) {
    await this.repository.clearExpiredCache();
    return { success: true, message: "\u5FEB\u53D6\u5DF2\u6E05\u9664" };
  }
  /**
   * 計算請假統計
   * @private
   */
  _calculateLeaveStats(leaveEvents) {
    const stats = {};
    leaveEvents.forEach((event) => {
      const type = event.type_name;
      if (!stats[type]) {
        stats[type] = 0;
      }
      stats[type] += event.hours;
    });
    return stats;
  }
  /**
   * 計算工時統計
   * @private
   */
  _calculateWorkStats(timesheets) {
    let totalRegular = 0;
    let totalOvertime = 0;
    const byClient = {};
    const byType = {};
    timesheets.forEach((ts) => {
      totalRegular += ts.regular_hours || 0;
      totalOvertime += ts.overtime_hours || 0;
      if (ts.client_name) {
        if (!byClient[ts.client_name]) {
          byClient[ts.client_name] = 0;
        }
        byClient[ts.client_name] += (ts.regular_hours || 0) + (ts.overtime_hours || 0);
      }
      if (ts.business_type) {
        if (!byType[ts.business_type]) {
          byType[ts.business_type] = 0;
        }
        byType[ts.business_type] += (ts.regular_hours || 0) + (ts.overtime_hours || 0);
      }
    });
    return {
      total_regular: totalRegular,
      total_overtime: totalOvertime,
      total_hours: totalRegular + totalOvertime,
      by_client: byClient,
      by_type: byType
    };
  }
};

// src/handlers/reports.handler.js
async function getAnnualLeaveReport(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get("employee");
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  const useCache = url.searchParams.get("cache") !== "false";
  if (!employee) {
    return success({ error: "\u9700\u8981\u63D0\u4F9B\u54E1\u5DE5\u59D3\u540D" }, null, 400);
  }
  const service = new ReportService(env.DB);
  const report = await service.getAnnualLeaveReport(employee, year, useCache);
  return success(report);
}
__name(getAnnualLeaveReport, "getAnnualLeaveReport");
async function getWorkAnalysisReport(env, request) {
  const url = new URL(request.url);
  const params = {
    employee: url.searchParams.get("employee"),
    year: url.searchParams.get("year") ? parseInt(url.searchParams.get("year")) : null,
    month: url.searchParams.get("month") ? parseInt(url.searchParams.get("month")) : null
  };
  const useCache = url.searchParams.get("cache") !== "false";
  const service = new ReportService(env.DB);
  const report = await service.getWorkAnalysisReport(params, useCache);
  return success(report);
}
__name(getWorkAnalysisReport, "getWorkAnalysisReport");
async function clearReportCache(env, request) {
  const service = new ReportService(env.DB);
  const result = await service.clearCache();
  return success(result);
}
__name(clearReportCache, "clearReportCache");

// src/routes/reports.routes.js
function compose5(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose5, "compose");
function registerReportRoutes(router) {
  const authHandler = compose5(withErrorHandler, withAuth);
  const adminHandler = compose5(withErrorHandler, withAdmin);
  router.get("/api/reports/annual-leave", authHandler(getAnnualLeaveReport));
  router.get("/api/reports/work-analysis", authHandler(getWorkAnalysisReport));
  router.post("/api/reports/clear-cache", adminHandler(clearReportCache));
}
__name(registerReportRoutes, "registerReportRoutes");

// src/repositories/TimesheetRepository.js
var TimesheetRepository = class extends BaseRepository {
  static {
    __name(this, "TimesheetRepository");
  }
  constructor(db) {
    super(db, TABLES.TIMESHEETS);
  }
  /**
   * 獲取員工的工時記錄
   * @param {string} employeeName - 員工姓名
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Array>}
   */
  async findByEmployee(employeeName, filters = {}) {
    const { year, month } = filters;
    let query = `
      SELECT 
        t.*,
        e.name as employee_name,
        c.name as client_name
      FROM ${TABLES.TIMESHEETS} t
      JOIN ${TABLES.EMPLOYEES} e ON t.employee_id = e.id
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      WHERE e.name = ?
    `;
    const params = [employeeName];
    if (year) {
      query += ` AND strftime('%Y', t.date) = ?`;
      params.push(year.toString());
    }
    if (month) {
      query += ` AND strftime('%m', t.date) = ?`;
      params.push(month.toString().padStart(2, "0"));
    }
    query += ` ORDER BY t.date DESC`;
    return this.raw(query, params);
  }
  /**
   * 查詢特定日期的工時記錄
   * @param {number} employeeId - 員工 ID
   * @param {string} date - 日期
   * @returns {Promise<Array>}
   */
  async findByDate(employeeId, date) {
    return this.findAll({
      employee_id: employeeId,
      date
    });
  }
};

// src/services/TimesheetService.js
var TimesheetService = class {
  static {
    __name(this, "TimesheetService");
  }
  constructor(db) {
    this.repository = new TimesheetRepository(db);
    this.employeeRepository = new EmployeeRepository(db);
  }
  /**
   * 獲取工時數據
   * @param {string} employeeName - 員工姓名
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Object>}
   */
  async getTimesheetData(employeeName, filters = {}) {
    const employee = await this.employeeRepository.findByName(employeeName);
    if (!employee) {
      throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
    }
    const timesheets = await this.repository.findByEmployee(employeeName, filters);
    const workEntries = timesheets.filter((t) => t.regular_hours > 0 || t.overtime_hours > 0);
    const leaveEntries = [];
    return {
      employee,
      workEntries,
      leaveEntries,
      filters
    };
  }
  /**
   * 創建工時記錄
   * @param {Object} data - 工時數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    this._validateTimesheetData(data);
    if (data.employee_name) {
      const employee = await this.employeeRepository.findByName(data.employee_name);
      if (!employee) {
        throw new NotFoundError("\u54E1\u5DE5\u4E0D\u5B58\u5728");
      }
      data.employee_id = employee.id;
      delete data.employee_name;
    }
    const id = await this.repository.create(data);
    console.log(`[TimesheetService] Timesheet created: ${id}`);
    return this.repository.findById(id);
  }
  /**
   * 更新工時記錄
   * @param {number} id - 工時 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u5DE5\u6642\u8A18\u9304\u4E0D\u5B58\u5728");
    }
    const updated = await this.repository.update(id, data);
    console.log(`[TimesheetService] Timesheet updated: ${id}`);
    return updated;
  }
  /**
   * 驗證工時數據
   * @private
   */
  _validateTimesheetData(data) {
    const validator = validate(data).required("employee_id", "\u54E1\u5DE5\u70BA\u5FC5\u586B").required("date", "\u65E5\u671F\u70BA\u5FC5\u586B");
    validator.throwIfFailed();
  }
};

// src/handlers/timesheets.handler.js
async function getTimesheetData(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get("employee");
  const year = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")) : null;
  const month = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")) : null;
  if (!employee) {
    return success({ error: "\u9700\u8981\u63D0\u4F9B\u54E1\u5DE5\u59D3\u540D" }, null, 400);
  }
  const service = new TimesheetService(env.DB);
  const data = await service.getTimesheetData(employee, { year, month });
  return success(data);
}
__name(getTimesheetData, "getTimesheetData");
async function createTimesheet(env, request) {
  const data = await request.json();
  const user = request.user;
  const service = new TimesheetService(env.DB);
  const timesheet = await service.create(data, { user });
  return created(timesheet, "\u5DE5\u6642\u8A18\u9304\u5275\u5EFA\u6210\u529F");
}
__name(createTimesheet, "createTimesheet");
async function updateTimesheet(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;
  const service = new TimesheetService(env.DB);
  const timesheet = await service.update(id, data, { user });
  return success(timesheet);
}
__name(updateTimesheet, "updateTimesheet");
async function getLeaveQuota(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get("employee");
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  if (!employee) {
    return success({ error: "\u9700\u8981\u63D0\u4F9B\u54E1\u5DE5\u59D3\u540D" }, null, 400);
  }
  const quota = [
    { type: "\u7279\u4F11", quota_hours: 56, used_hours: 0, remaining_hours: 56 },
    { type: "\u75C5\u5047", quota_hours: 240, used_hours: 0, remaining_hours: 240 },
    { type: "\u4E8B\u5047", quota_hours: 112, used_hours: 0, remaining_hours: 112 }
  ];
  return success({ quota, employee, year });
}
__name(getLeaveQuota, "getLeaveQuota");

// src/routes/timesheets.routes.js
function compose6(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose6, "compose");
function registerTimesheetRoutes(router) {
  const authHandler = compose6(withErrorHandler, withAuth);
  router.get("/api/timesheet-data", authHandler(getTimesheetData));
  router.get("/api/leave-quota", authHandler(getLeaveQuota));
  router.post("/api/timesheets", authHandler(createTimesheet));
  router.put("/api/timesheets/:id", authHandler(updateTimesheet));
}
__name(registerTimesheetRoutes, "registerTimesheetRoutes");

// src/repositories/ReminderRepository.js
var ReminderRepository = class extends BaseRepository {
  static {
    __name(this, "ReminderRepository");
  }
  constructor(db) {
    super(db, TABLES.TASK_REMINDERS);
  }
  /**
   * 獲取用戶的提醒
   * @param {number} userId - 用戶 ID
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Array>}
   */
  async findByUser(userId, filters = {}) {
    const { is_read } = filters;
    let query = `
      SELECT 
        r.*,
        t.title as task_title
      FROM ${TABLES.TASK_REMINDERS} r
      LEFT JOIN ${TABLES.TASKS} t ON r.task_id = t.id
      WHERE r.user_id = ?
    `;
    const params = [userId];
    if (is_read !== void 0) {
      query += ` AND r.is_read = ?`;
      params.push(is_read ? 1 : 0);
    }
    query += ` ORDER BY r.remind_at DESC`;
    return this.raw(query, params);
  }
  /**
   * 標記為已讀
   * @param {number} id - 提醒 ID
   * @returns {Promise<Object>}
   */
  async markAsRead(id) {
    return this.update(id, {
      is_read: true,
      read_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * 標記用戶所有提醒為已讀
   * @param {number} userId - 用戶 ID
   * @returns {Promise<number>} 更新的數量
   */
  async markAllAsRead(userId) {
    const query = `
      UPDATE ${TABLES.TASK_REMINDERS}
      SET is_read = 1, read_at = ?
      WHERE user_id = ? AND is_read = 0
    `;
    const result = await this.db.prepare(query).bind((/* @__PURE__ */ new Date()).toISOString(), userId).run();
    return result.meta?.changes || 0;
  }
};

// src/services/ReminderService.js
var ReminderService = class {
  static {
    __name(this, "ReminderService");
  }
  constructor(db) {
    this.repository = new ReminderRepository(db);
  }
  /**
   * 獲取用戶提醒列表
   * @param {number} userId - 用戶 ID
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Array>}
   */
  async getUserReminders(userId, filters = {}) {
    return this.repository.findByUser(userId, filters);
  }
  /**
   * 標記提醒為已讀
   * @param {number} id - 提醒 ID
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async markAsRead(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u63D0\u9192\u4E0D\u5B58\u5728");
    }
    if (context?.user?.role !== "admin" && existing.user_id !== context?.user?.id) {
      throw new Error("\u7121\u6B0A\u9650\u64CD\u4F5C\u6B64\u63D0\u9192");
    }
    return this.repository.markAsRead(id);
  }
  /**
   * 標記所有提醒為已讀
   * @param {number} userId - 用戶 ID
   * @returns {Promise<number>}
   */
  async markAllAsRead(userId) {
    return this.repository.markAllAsRead(userId);
  }
  /**
   * 刪除提醒
   * @param {number} id - 提醒 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u63D0\u9192\u4E0D\u5B58\u5728");
    }
    if (context?.user?.role !== "admin" && existing.user_id !== context?.user?.id) {
      throw new Error("\u7121\u6B0A\u9650\u64CD\u4F5C\u6B64\u63D0\u9192");
    }
    return this.repository.delete(id);
  }
};

// src/handlers/reminders.handler.js
async function getReminders(env, request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id") ? parseInt(url.searchParams.get("user_id")) : request.user.id;
  const isRead = url.searchParams.get("is_read");
  const filters = {};
  if (isRead !== null && isRead !== void 0) {
    filters.is_read = isRead === "1" || isRead === "true";
  }
  const service = new ReminderService(env.DB);
  const reminders = await service.getUserReminders(userId, filters);
  return success({ reminders });
}
__name(getReminders, "getReminders");
async function markReminderAsRead(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new ReminderService(env.DB);
  await service.markAsRead(id, { user });
  return noContent();
}
__name(markReminderAsRead, "markReminderAsRead");
async function markAllRemindersAsRead(env, request) {
  const userId = request.user.id;
  const service = new ReminderService(env.DB);
  const count = await service.markAllAsRead(userId);
  return success({ count, message: `\u5DF2\u6A19\u8A18 ${count} \u500B\u63D0\u9192\u70BA\u5DF2\u8B80` });
}
__name(markAllRemindersAsRead, "markAllRemindersAsRead");
async function deleteReminder(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new ReminderService(env.DB);
  await service.delete(id, { user });
  return noContent();
}
__name(deleteReminder, "deleteReminder");

// src/routes/reminders.routes.js
function compose7(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose7, "compose");
function registerReminderRoutes(router) {
  const authHandler = compose7(withErrorHandler, withAuth);
  router.get("/api/reminders", authHandler(getReminders));
  router.put("/api/reminders/:id/read", authHandler(markReminderAsRead));
  router.post("/api/reminders/mark-all-read", authHandler(markAllRemindersAsRead));
  router.delete("/api/reminders/:id", authHandler(deleteReminder));
}
__name(registerReminderRoutes, "registerReminderRoutes");

// src/repositories/SopRepository.js
var SopRepository = class extends BaseRepository {
  static {
    __name(this, "SopRepository");
  }
  constructor(db) {
    super(db, TABLES.SOPS);
  }
  /**
   * 查詢 SOPs（帶分類信息）
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Array>}
   */
  async findAllWithCategory(filters = {}) {
    let query = `
      SELECT 
        s.*,
        c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.category_id) {
      query += ` AND s.category_id = ?`;
      params.push(filters.category_id);
    }
    if (filters.status) {
      query += ` AND s.status = ?`;
      params.push(filters.status);
    }
    if (filters.document_type) {
      query += ` AND s.document_type = ?`;
      params.push(filters.document_type);
    }
    query += ` ORDER BY s.${FIELDS.UPDATED_AT} DESC`;
    return this.raw(query, params);
  }
  /**
   * 搜尋 SOPs
   * @param {string} keyword - 搜尋關鍵字
   * @returns {Promise<Array>}
   */
  async search(keyword) {
    const query = `
      SELECT 
        s.*,
        c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE s.status = 'published'
        AND (s.title LIKE ? OR s.content LIKE ?)
      ORDER BY s.${FIELDS.UPDATED_AT} DESC
    `;
    const searchPattern = `%${keyword}%`;
    return this.raw(query, [searchPattern, searchPattern]);
  }
};

// src/services/SopService.js
var SopService = class {
  static {
    __name(this, "SopService");
  }
  constructor(db) {
    this.repository = new SopRepository(db);
    this.categoryRepository = new BaseRepository(db, TABLES.SOP_CATEGORIES);
  }
  /**
   * 獲取分類列表
   * @returns {Promise<Array>}
   */
  async getCategories() {
    return this.categoryRepository.findAll({}, { orderBy: "sort_order", order: "ASC" });
  }
  /**
   * 獲取 SOP 列表
   * @param {Object} filters - 過濾條件
   * @returns {Promise<Array>}
   */
  async getList(filters = {}) {
    return this.repository.findAllWithCategory(filters);
  }
  /**
   * 獲取 SOP 詳情
   * @param {number} id - SOP ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const sop = await this.repository.findById(id);
    if (!sop) {
      throw new NotFoundError("\u6587\u6A94\u4E0D\u5B58\u5728");
    }
    return sop;
  }
  /**
   * 搜尋 SOPs
   * @param {string} keyword - 關鍵字
   * @returns {Promise<Array>}
   */
  async search(keyword) {
    if (!keyword || keyword.trim() === "") {
      return [];
    }
    return this.repository.search(keyword.trim());
  }
  /**
   * 創建 SOP
   * @param {Object} data - SOP 數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    this._validateSopData(data);
    if (context?.user?.id) {
      data.created_by_user_id = context.user.id;
    }
    if (!data.status) {
      data.status = "draft";
    }
    const id = await this.repository.create(data);
    console.log(`[SopService] SOP created: ${id}`);
    return this.repository.findById(id);
  }
  /**
   * 更新 SOP
   * @param {number} id - SOP ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u6587\u6A94\u4E0D\u5B58\u5728");
    }
    const updated = await this.repository.update(id, data);
    console.log(`[SopService] SOP updated: ${id}`);
    return updated;
  }
  /**
   * 刪除 SOP
   * @param {number} id - SOP ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("\u6587\u6A94\u4E0D\u5B58\u5728");
    }
    await this.repository.delete(id);
    console.log(`[SopService] SOP deleted: ${id}`);
    return true;
  }
  /**
   * 驗證 SOP 數據
   * @private
   */
  _validateSopData(data) {
    validate(data).required("title", "\u6A19\u984C\u70BA\u5FC5\u586B").throwIfFailed();
  }
};

// src/handlers/sops.handler.js
async function getSopCategories(env, request) {
  const service = new SopService(env.DB);
  const categories = await service.getCategories();
  return list(categories);
}
__name(getSopCategories, "getSopCategories");
async function getSops(env, request) {
  const url = new URL(request.url);
  const filters = {
    category_id: url.searchParams.get("category_id") ? parseInt(url.searchParams.get("category_id")) : null,
    status: url.searchParams.get("status"),
    document_type: url.searchParams.get("document_type")
  };
  Object.keys(filters).forEach((key) => {
    if (filters[key] === null || filters[key] === void 0) {
      delete filters[key];
    }
  });
  const service = new SopService(env.DB);
  const sops = await service.getList(filters);
  return success(sops);
}
__name(getSops, "getSops");
async function getSop(env, request) {
  const id = parseInt(request.params.id);
  const service = new SopService(env.DB);
  const sop = await service.getDetail(id);
  return success(sop);
}
__name(getSop, "getSop");
async function searchSops(env, request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") || url.searchParams.get("keyword");
  const service = new SopService(env.DB);
  const results = await service.search(keyword);
  return success(results);
}
__name(searchSops, "searchSops");
async function createSop(env, request) {
  const data = await request.json();
  const user = request.user;
  const service = new SopService(env.DB);
  const sop = await service.create(data, { user });
  return created(sop, "SOP \u5275\u5EFA\u6210\u529F");
}
__name(createSop, "createSop");
async function updateSop(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const user = request.user;
  const service = new SopService(env.DB);
  const sop = await service.update(id, data, { user });
  return success(sop);
}
__name(updateSop, "updateSop");
async function deleteSop(env, request) {
  const id = parseInt(request.params.id);
  const user = request.user;
  const service = new SopService(env.DB);
  await service.delete(id, { user });
  return noContent();
}
__name(deleteSop, "deleteSop");

// src/routes/sops.routes.js
function compose8(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose8, "compose");
function registerSopRoutes(router) {
  const authHandler = compose8(withErrorHandler, withAuth);
  const adminHandler = compose8(withErrorHandler, withAdmin);
  router.get("/api/sop-categories", authHandler(getSopCategories));
  router.get("/api/sops/search", authHandler(searchSops));
  router.get("/api/sops", authHandler(getSops));
  router.get("/api/sops/:id", authHandler(getSop));
  router.post("/api/sops", adminHandler(createSop));
  router.put("/api/sops/:id", adminHandler(updateSop));
  router.delete("/api/sops/:id", adminHandler(deleteSop));
}
__name(registerSopRoutes, "registerSopRoutes");

// src/services/SystemConfigService.js
var SystemConfigService = class {
  static {
    __name(this, "SystemConfigService");
  }
  constructor(db) {
    this.repository = new BaseRepository(db, TABLES.SYSTEM_PARAMETERS);
  }
  /**
   * 獲取所有配置
   * @returns {Promise<Array>}
   */
  async getAllConfig() {
    return this.repository.findAll({}, { orderBy: "param_category", order: "ASC" });
  }
  /**
   * 獲取特定分類的配置
   * @param {string} category - 分類
   * @returns {Promise<Array>}
   */
  async getByCategory(category) {
    return this.repository.findAll({ param_category: category });
  }
  /**
   * 獲取單個配置值
   * @param {string} category - 分類
   * @param {string} key - 鍵
   * @returns {Promise<string|null>}
   */
  async getValue(category, key) {
    const config = await this.repository.findOne({
      param_category: category,
      param_key: key
    });
    return config?.param_value || null;
  }
  /**
   * 更新配置
   * @param {string} category - 分類
   * @param {string} key - 鍵
   * @param {string} value - 值
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async updateValue(category, key, value, context) {
    const existing = await this.repository.findOne({
      param_category: category,
      param_key: key
    });
    if (!existing) {
      return this.repository.create({
        param_category: category,
        param_key: key,
        param_value: value,
        last_modified_by_user_id: context?.user?.id
      });
    }
    if (existing.is_editable === false || existing.is_editable === 0) {
      throw new Error("\u6B64\u914D\u7F6E\u4E0D\u53EF\u7DE8\u8F2F");
    }
    return this.repository.update(existing.id, {
      param_value: value,
      last_modified_by_user_id: context?.user?.id
    });
  }
};

// src/handlers/config.handler.js
async function getAllConfig(env, request) {
  const service = new SystemConfigService(env.DB);
  const config = await service.getAllConfig();
  return list(config);
}
__name(getAllConfig, "getAllConfig");
async function getCategoryConfig(env, request) {
  const category = request.params.category;
  const service = new SystemConfigService(env.DB);
  const config = await service.getByCategory(category);
  return list(config);
}
__name(getCategoryConfig, "getCategoryConfig");
async function updateConfig(env, request) {
  const { category, key } = request.params;
  const { value } = await request.json();
  const user = request.user;
  const service = new SystemConfigService(env.DB);
  await service.updateValue(category, key, value, { user });
  return success({ message: "\u914D\u7F6E\u66F4\u65B0\u6210\u529F" });
}
__name(updateConfig, "updateConfig");

// src/routes/config.routes.js
function compose9(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose9, "compose");
function registerConfigRoutes(router) {
  const authHandler = compose9(withErrorHandler, withAuth);
  const adminHandler = compose9(withErrorHandler, withAdmin);
  router.get("/api/system/config", authHandler(getAllConfig));
  router.get("/api/system/config/:category", authHandler(getCategoryConfig));
  router.put("/api/system/config/:category/:key", adminHandler(updateConfig));
}
__name(registerConfigRoutes, "registerConfigRoutes");

// src/handlers/system.handler.js
async function getBusinessTypes(env, request) {
  const result = await env.DB.prepare(`
    SELECT * FROM ${TABLES.BUSINESS_TYPES}
    WHERE is_active = 1
    ORDER BY type_name
  `).all();
  return list(result.results || []);
}
__name(getBusinessTypes, "getBusinessTypes");
async function getLeaveTypes(env, request) {
  const result = await env.DB.prepare(`
    SELECT * FROM ${TABLES.LEAVE_TYPES}
    WHERE is_active = 1
    ORDER BY type_name
  `).all();
  return list(result.results || []);
}
__name(getLeaveTypes, "getLeaveTypes");
async function getHolidays(env, request) {
  const url = new URL(request.url);
  const year = url.searchParams.get("year") || (/* @__PURE__ */ new Date()).getFullYear();
  const result = await env.DB.prepare(`
    SELECT * FROM ${TABLES.HOLIDAYS}
    WHERE strftime('%Y', holiday_date) = ?
    ORDER BY holiday_date
  `).bind(year.toString()).all();
  return list(result.results || []);
}
__name(getHolidays, "getHolidays");
async function getWorkTypes(env, request) {
  const workTypes = [
    { id: 1, name: "\u6B63\u5E38\u5DE5\u6642", rate: 1 },
    { id: 2, name: "\u5E73\u65E5\u52A0\u73ED(1.34)", rate: 1.34 },
    { id: 3, name: "\u5E73\u65E5\u52A0\u73ED(1.67)", rate: 1.67 },
    { id: 4, name: "\u4F11\u606F\u65E5\u52A0\u73ED(1.34)", rate: 1.34 },
    { id: 5, name: "\u4F11\u606F\u65E5\u52A0\u73ED(1.67)", rate: 1.67 },
    { id: 6, name: "\u4F11\u606F\u65E5\u52A0\u73ED(2.67)", rate: 2.67 },
    { id: 7, name: "\u570B\u5B9A\u5047\u65E5\u52A0\u73ED", rate: 2 }
  ];
  return list(workTypes);
}
__name(getWorkTypes, "getWorkTypes");

// src/routes/system.routes.js
function compose10(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}
__name(compose10, "compose");
function registerSystemRoutes(router) {
  const authHandler = compose10(withErrorHandler, withAuth);
  router.get("/api/business-types", authHandler(getBusinessTypes));
  router.get("/api/leave-types", authHandler(getLeaveTypes));
  router.get("/api/holidays", authHandler(getHolidays));
  router.get("/api/work-types", authHandler(getWorkTypes));
}
__name(registerSystemRoutes, "registerSystemRoutes");

// src/index.js
function handleOptions(request) {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(handleOptions, "handleOptions");
function createRouter() {
  const router = new Router();
  router.get("/api/version", async (env, request) => {
    return new Response(JSON.stringify({
      version: "3.0",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "refactored",
      modules: ["auth", "clients", "tasks"]
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  });
  router.post("/api/test-login", async (env, request) => {
    const { username, password } = await request.json();
    return new Response(JSON.stringify({
      success: true,
      test: "ok",
      received: { username, password }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  });
  registerAuthRoutes(router);
  registerClientRoutes(router);
  registerTaskRoutes(router);
  registerEmployeeRoutes(router);
  registerReportRoutes(router);
  registerTimesheetRoutes(router);
  registerReminderRoutes(router);
  registerSopRoutes(router);
  registerConfigRoutes(router);
  registerSystemRoutes(router);
  return router;
}
__name(createRouter, "createRouter");
var index_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }
    try {
      const router = createRouter();
      return await router.handle(request, env);
    } catch (error) {
      console.error("[Global Error]", error);
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "\u670D\u52D9\u5668\u5167\u90E8\u932F\u8AA4"
        }
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
