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
function adapt(handler) {
  return async (env, request) => handler(env.DB, request);
}
__name(adapt, "adapt");
function registerAuthRoutes(router) {
  router.post("/api/login", withErrorHandler(adapt(handleLogin)));
  router.post("/api/logout", withErrorHandler(withAuth(adapt(handleLogout))));
  router.get("/api/verify", withErrorHandler(withAuth(adapt(handleVerifySession))));
  router.post("/api/change-password", withErrorHandler(withAuth(adapt(handleChangePassword))));
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

// src/repositories/EmployeeRepository.js
var EmployeeRepository = class extends BaseRepository {
  static {
    __name(this, "EmployeeRepository");
  }
  constructor(db) {
    super(db, TABLES.EMPLOYEES);
  }
  async findByName(name) {
    return this.findOne({ name });
  }
  async findActive() {
    return this.findAll({ is_active: 1 }, { orderBy: "name", order: "ASC" });
  }
};

// src/services/EmployeeService.js
var EmployeeService = class {
  static {
    __name(this, "EmployeeService");
  }
  constructor(db) {
    this.repo = new EmployeeRepository(db);
  }
  async getAll() {
    return this.repo.findActive();
  }
  async getById(id) {
    return this.repo.findById(id);
  }
  async create(data) {
    return this.repo.create(data);
  }
  async update(id, data) {
    return this.repo.update(id, data);
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
function list(data) {
  return success(data, {
    total: data.length
  });
}
__name(list, "list");

// src/handlers/employees.handler.js
async function getEmployees(env, request) {
  const service = new EmployeeService(env.DB);
  const employees = await service.getAll();
  return list(employees);
}
__name(getEmployees, "getEmployees");

// src/routes/employees.routes.js
function registerEmployeeRoutes(router) {
  router.get("/api/employees", withErrorHandler(withAuth(getEmployees)));
}
__name(registerEmployeeRoutes, "registerEmployeeRoutes");

// src/repositories/ClientRepository.js
var ClientRepository = class extends BaseRepository {
  static {
    __name(this, "ClientRepository");
  }
  constructor(db) {
    super(db, TABLES.CLIENTS);
  }
  async findWithServices(id) {
    const client = await this.findById(id);
    if (!client) return null;
    const services = await this.db.prepare(`
      SELECT * FROM ${TABLES.CLIENT_SERVICES}
      WHERE client_id = ?
      ORDER BY service_type
    `).bind(id).all();
    return {
      ...client,
      services: services.results || []
    };
  }
};

// src/services/ClientService.js
var ClientService = class {
  static {
    __name(this, "ClientService");
  }
  constructor(db) {
    this.repo = new ClientRepository(db);
  }
  async getAll() {
    return this.repo.findAll({}, { orderBy: "name", order: "ASC" });
  }
  async getById(id) {
    return this.repo.findWithServices(id);
  }
  async create(data) {
    return this.repo.create(data);
  }
  async update(id, data) {
    return this.repo.update(id, data);
  }
  async delete(id) {
    return this.repo.delete(id);
  }
};

// src/repositories/ClientServiceRepository.js
var ClientServiceRepository = class extends BaseRepository {
  static {
    __name(this, "ClientServiceRepository");
  }
  constructor(db) {
    super(db, TABLES.CLIENT_SERVICES);
  }
  async findByClient(clientId) {
    return this.findAll({ client_id: clientId });
  }
  async findAllWithClient() {
    const query = `
      SELECT 
        cs.*,
        c.name as client_name
      FROM ${TABLES.CLIENT_SERVICES} cs
      JOIN ${TABLES.CLIENTS} c ON cs.client_id = c.id
      ORDER BY c.name, cs.service_type
    `;
    return this.raw(query);
  }
};

// src/handlers/clients.handler.js
async function getClients(env, request) {
  const service = new ClientService(env.DB);
  const clients = await service.getAll();
  return list(clients);
}
__name(getClients, "getClients");
async function getClient(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientService(env.DB);
  const client = await service.getById(id);
  return success(client);
}
__name(getClient, "getClient");
async function createClient(env, request) {
  const data = await request.json();
  const service = new ClientService(env.DB);
  const client = await service.create(data);
  return created(client);
}
__name(createClient, "createClient");
async function updateClient(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new ClientService(env.DB);
  const client = await service.update(id, data);
  return success(client);
}
__name(updateClient, "updateClient");
async function deleteClient(env, request) {
  const id = parseInt(request.params.id);
  const service = new ClientService(env.DB);
  await service.delete(id);
  return noContent();
}
__name(deleteClient, "deleteClient");
async function getClientServices(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const repo = new ClientServiceRepository(env.DB);
  const services = clientId ? await repo.findByClient(parseInt(clientId)) : await repo.findAllWithClient();
  return success(services);
}
__name(getClientServices, "getClientServices");
async function getClientInteractions(env, request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const repo = new BaseRepository(env.DB, TABLES.CLIENT_INTERACTIONS);
  const filters = clientId ? { client_id: parseInt(clientId) } : {};
  const interactions = await repo.findAll(filters, { orderBy: "interaction_date", order: "DESC" });
  return success(interactions);
}
__name(getClientInteractions, "getClientInteractions");

// src/routes/clients.routes.js
function registerClientRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  const admin = /* @__PURE__ */ __name((h) => withErrorHandler(withAdmin(h)), "admin");
  router.get("/api/clients", auth(getClients));
  router.get("/api/clients/:id", auth(getClient));
  router.post("/api/clients", admin(createClient));
  router.put("/api/clients/:id", admin(updateClient));
  router.delete("/api/clients/:id", admin(deleteClient));
  router.get("/api/client-services", auth(getClientServices));
  router.get("/api/client-interactions", auth(getClientInteractions));
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
  async findAllWithRelations(filters = {}) {
    let query = `
      SELECT 
        t.*,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.status) {
      query += ` AND t.status = ?`;
      params.push(filters.status);
    }
    if (filters.assigned_user_id) {
      query += ` AND t.assigned_user_id = ?`;
      params.push(filters.assigned_user_id);
    }
    if (filters.category) {
      query += ` AND t.category = ?`;
      params.push(filters.category);
    }
    query += ` ORDER BY t.created_at DESC`;
    return this.raw(query, params);
  }
};

// src/services/TaskService.js
var TaskService = class {
  static {
    __name(this, "TaskService");
  }
  constructor(db) {
    this.repo = new TaskRepository(db);
  }
  async getAll(filters = {}) {
    return this.repo.findAllWithRelations(filters);
  }
  async getById(id) {
    return this.repo.findById(id);
  }
  async create(data) {
    if (!data.status) data.status = "pending";
    if (!data.priority) data.priority = "medium";
    return this.repo.create(data);
  }
  async update(id, data) {
    return this.repo.update(id, data);
  }
  async delete(id) {
    return this.repo.delete(id);
  }
};

// src/handlers/tasks.handler.js
async function getTasks(env, request) {
  const url = new URL(request.url);
  const filters = {
    status: url.searchParams.get("status"),
    assigned_user_id: url.searchParams.get("assigned_user_id") ? parseInt(url.searchParams.get("assigned_user_id")) : null,
    category: url.searchParams.get("category")
  };
  Object.keys(filters).forEach((key) => {
    if (filters[key] === null || filters[key] === void 0) delete filters[key];
  });
  const service = new TaskService(env.DB);
  const tasks = await service.getAll(filters);
  return success({ tasks });
}
__name(getTasks, "getTasks");
async function getMultiStageTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getAll({ category: "client_service" });
  return success({ tasks });
}
__name(getMultiStageTasks, "getMultiStageTasks");
async function getRecurringTasks(env, request) {
  const service = new TaskService(env.DB);
  const tasks = await service.getAll({ category: "recurring" });
  return list(tasks);
}
__name(getRecurringTasks, "getRecurringTasks");
async function createTask(env, request) {
  const data = await request.json();
  const service = new TaskService(env.DB);
  const task = await service.create(data);
  return created(task);
}
__name(createTask, "createTask");
async function updateTask(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new TaskService(env.DB);
  const task = await service.update(id, data);
  return success(task);
}
__name(updateTask, "updateTask");

// src/routes/tasks.routes.js
function registerTaskRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  router.get("/api/tasks", auth(getTasks));
  router.get("/api/tasks/multi-stage", auth(getMultiStageTasks));
  router.get("/api/tasks/recurring", auth(getRecurringTasks));
  router.post("/api/tasks", auth(createTask));
  router.put("/api/tasks/multi-stage/:id", auth(updateTask));
}
__name(registerTaskRoutes, "registerTaskRoutes");

// src/repositories/TimesheetRepository.js
var TimesheetRepository = class extends BaseRepository {
  static {
    __name(this, "TimesheetRepository");
  }
  constructor(db) {
    super(db, TABLES.TIMESHEETS);
  }
  async findByEmployeeAndPeriod(employeeId, year, month = null) {
    let query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TIMESHEETS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      WHERE t.employee_id = ?
        AND strftime('%Y', t.date) = ?
    `;
    const params = [employeeId, year.toString()];
    if (month) {
      query += ` AND strftime('%m', t.date) = ?`;
      params.push(month.toString().padStart(2, "0"));
    }
    query += ` ORDER BY t.date DESC`;
    return this.raw(query, params);
  }
};

// src/services/TimesheetService.js
var TimesheetService = class {
  static {
    __name(this, "TimesheetService");
  }
  constructor(db) {
    this.repo = new TimesheetRepository(db);
    this.empRepo = new EmployeeRepository(db);
  }
  async getByEmployee(employeeName, year, month = null) {
    const employee = await this.empRepo.findByName(employeeName);
    if (!employee) return { workEntries: [], leaveEntries: [] };
    const timesheets = await this.repo.findByEmployeeAndPeriod(employee.id, year, month);
    return {
      workEntries: timesheets.filter((t) => t.regular_hours > 0 || t.overtime_hours > 0),
      leaveEntries: []
    };
  }
  async create(data) {
    return this.repo.create(data);
  }
};

// src/repositories/SystemRepository.js
var SystemRepository = class {
  static {
    __name(this, "SystemRepository");
  }
  constructor(db) {
    this.db = db;
  }
  async getBusinessTypes() {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.BUSINESS_TYPES} WHERE is_active = 1 ORDER BY type_name
    `).all();
    return result.results || [];
  }
  async getLeaveTypes() {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.LEAVE_TYPES} WHERE is_active = 1 ORDER BY type_name
    `).all();
    return result.results || [];
  }
  async getHolidays(year) {
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLES.HOLIDAYS}
      WHERE strftime('%Y', holiday_date) = ?
      ORDER BY holiday_date
    `).bind(year.toString()).all();
    return result.results || [];
  }
  async getSystemParameter(category, key) {
    const result = await this.db.prepare(`
      SELECT param_value FROM ${TABLES.SYSTEM_PARAMETERS}
      WHERE param_category = ? AND param_key = ?
    `).bind(category, key).first();
    return result?.param_value || null;
  }
};

// src/services/SystemService.js
var SystemService = class {
  static {
    __name(this, "SystemService");
  }
  constructor(db) {
    this.repo = new SystemRepository(db);
  }
  async getBusinessTypes() {
    return this.repo.getBusinessTypes();
  }
  async getLeaveTypes() {
    return this.repo.getLeaveTypes();
  }
  async getHolidays(year) {
    return this.repo.getHolidays(year);
  }
  async getWorkTypes() {
    return [
      { id: 1, name: "\u6B63\u5E38\u5DE5\u6642", rate: 1 },
      { id: 2, name: "\u5E73\u65E5\u52A0\u73ED(1.34)", rate: 1.34 },
      { id: 3, name: "\u5E73\u65E5\u52A0\u73ED(1.67)", rate: 1.67 },
      { id: 4, name: "\u4F11\u606F\u65E5\u52A0\u73ED(1.34)", rate: 1.34 },
      { id: 5, name: "\u4F11\u606F\u65E5\u52A0\u73ED(1.67)", rate: 1.67 },
      { id: 6, name: "\u4F11\u606F\u65E5\u52A0\u73ED(2.67)", rate: 2.67 },
      { id: 7, name: "\u570B\u5B9A\u5047\u65E5\u52A0\u73ED", rate: 2 }
    ];
  }
  async getLeaveQuota(employeeName, year) {
    return {
      quota: [
        { type: "\u7279\u4F11", quota_hours: 56, used_hours: 0, remaining_hours: 56 },
        { type: "\u75C5\u5047", quota_hours: 240, used_hours: 0, remaining_hours: 240 }
      ],
      employee: employeeName,
      year
    };
  }
};

// src/handlers/timesheets.handler.js
async function getTimesheetData(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get("employee");
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  const month = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")) : null;
  const service = new TimesheetService(env.DB);
  const data = await service.getByEmployee(employee, year, month);
  return success(data);
}
__name(getTimesheetData, "getTimesheetData");
async function getLeaveQuota(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get("employee");
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  const service = new SystemService(env.DB);
  const quota = await service.getLeaveQuota(employee, year);
  return success(quota);
}
__name(getLeaveQuota, "getLeaveQuota");

// src/routes/timesheets.routes.js
function registerTimesheetRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  router.get("/api/timesheet-data", auth(getTimesheetData));
  router.get("/api/leave-quota", auth(getLeaveQuota));
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
  async findByUser(userId, isRead = null) {
    const filters = { user_id: userId };
    if (isRead !== null) {
      filters.is_read = isRead ? 1 : 0;
    }
    return this.findAll(filters, { orderBy: "remind_at", order: "DESC" });
  }
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
    this.repo = new ReminderRepository(db);
  }
  async getByUser(userId, isRead = null) {
    const reminders = await this.repo.findByUser(userId, isRead);
    return { reminders };
  }
  async markAsRead(id) {
    return this.repo.update(id, { is_read: 1, read_at: (/* @__PURE__ */ new Date()).toISOString() });
  }
  async markAllAsRead(userId) {
    return this.repo.markAllAsRead(userId);
  }
};

// src/handlers/reminders.handler.js
async function getReminders(env, request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id") ? parseInt(url.searchParams.get("user_id")) : request.user.id;
  const isRead = url.searchParams.get("is_read");
  const service = new ReminderService(env.DB);
  const result = await service.getByUser(userId, isRead === "0" ? false : null);
  return success(result);
}
__name(getReminders, "getReminders");
async function markReminderRead(env, request) {
  const id = parseInt(request.params.id);
  const service = new ReminderService(env.DB);
  await service.markAsRead(id);
  return noContent();
}
__name(markReminderRead, "markReminderRead");
async function markAllRead(env, request) {
  const userId = request.user.id;
  const service = new ReminderService(env.DB);
  const count = await service.markAllAsRead(userId);
  return success({ count });
}
__name(markAllRead, "markAllRead");

// src/routes/reminders.routes.js
function registerReminderRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  router.get("/api/reminders", auth(getReminders));
  router.put("/api/reminders/:id/read", auth(markReminderRead));
  router.put("/api/reminders/mark-all-read", auth(markAllRead));
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
  async findAllWithCategory() {
    const query = `
      SELECT s.*, c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE s.status = 'published'
      ORDER BY s.updated_at DESC
    `;
    return this.raw(query);
  }
  async search(keyword) {
    const query = `
      SELECT s.*, c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE s.status = 'published'
        AND (s.title LIKE ? OR s.content LIKE ?)
      ORDER BY s.updated_at DESC
    `;
    const pattern = `%${keyword}%`;
    return this.raw(query, [pattern, pattern]);
  }
};

// src/services/SopService.js
var SopService = class {
  static {
    __name(this, "SopService");
  }
  constructor(db) {
    this.repo = new SopRepository(db);
    this.categoryRepo = new BaseRepository(db, TABLES.SOP_CATEGORIES);
  }
  async getCategories() {
    return this.categoryRepo.findAll({}, { orderBy: "sort_order", order: "ASC" });
  }
  async getAll() {
    return this.repo.findAllWithCategory();
  }
  async search(keyword) {
    return this.repo.search(keyword);
  }
  async getById(id) {
    return this.repo.findById(id);
  }
  async create(data) {
    if (!data.status) data.status = "draft";
    return this.repo.create(data);
  }
  async update(id, data) {
    return this.repo.update(id, data);
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
  const service = new SopService(env.DB);
  const sops = await service.getAll();
  return success(sops);
}
__name(getSops, "getSops");
async function searchSops(env, request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") || url.searchParams.get("keyword");
  const service = new SopService(env.DB);
  const results = await service.search(keyword || "");
  return success(results);
}
__name(searchSops, "searchSops");
async function getSop(env, request) {
  const id = parseInt(request.params.id);
  const service = new SopService(env.DB);
  const sop = await service.getById(id);
  return success(sop);
}
__name(getSop, "getSop");
async function createSop(env, request) {
  const data = await request.json();
  const service = new SopService(env.DB);
  const sop = await service.create(data);
  return created(sop);
}
__name(createSop, "createSop");
async function updateSop(env, request) {
  const id = parseInt(request.params.id);
  const data = await request.json();
  const service = new SopService(env.DB);
  const sop = await service.update(id, data);
  return success(sop);
}
__name(updateSop, "updateSop");

// src/routes/sops.routes.js
function registerSopRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  const admin = /* @__PURE__ */ __name((h) => withErrorHandler(withAdmin(h)), "admin");
  router.get("/api/sop-categories", auth(getSopCategories));
  router.get("/api/sops", auth(getSops));
  router.get("/api/sops/search", auth(searchSops));
  router.get("/api/sops/:id", auth(getSop));
  router.post("/api/sops", admin(createSop));
  router.put("/api/sops/:id", admin(updateSop));
}
__name(registerSopRoutes, "registerSopRoutes");

// src/handlers/system.handler.js
async function getBusinessTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getBusinessTypes();
  return list(types);
}
__name(getBusinessTypes, "getBusinessTypes");
async function getLeaveTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getLeaveTypes();
  return list(types);
}
__name(getLeaveTypes, "getLeaveTypes");
async function getHolidays(env, request) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  const service = new SystemService(env.DB);
  const holidays = await service.getHolidays(year);
  return list(holidays);
}
__name(getHolidays, "getHolidays");
async function getWorkTypes(env, request) {
  const service = new SystemService(env.DB);
  const types = await service.getWorkTypes();
  return list(types);
}
__name(getWorkTypes, "getWorkTypes");

// src/routes/system.routes.js
function registerSystemRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  router.get("/api/business-types", auth(getBusinessTypes));
  router.get("/api/leave-types", auth(getLeaveTypes));
  router.get("/api/holidays", auth(getHolidays));
  router.get("/api/work-types", auth(getWorkTypes));
}
__name(registerSystemRoutes, "registerSystemRoutes");

// src/handlers/reports.handler.js
async function getAnnualLeaveReport(env, request) {
  const url = new URL(request.url);
  const employeeName = url.searchParams.get("employee");
  const year = parseInt(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getFullYear();
  const empRepo = new EmployeeRepository(env.DB);
  const employee = await empRepo.findByName(employeeName);
  if (!employee) {
    return success({ leave_stats: {}, employee: employeeName, year });
  }
  const leaveRepo = new BaseRepository(env.DB, TABLES.LEAVE_EVENTS);
  const leaveEvents = await leaveRepo.raw(`
    SELECT le.*, lt.type_name
    FROM ${TABLES.LEAVE_EVENTS} le
    JOIN ${TABLES.LEAVE_TYPES} lt ON le.leave_type_id = lt.id
    WHERE le.employee_id = ? AND strftime('%Y', le.date) = ?
  `, [employee.id, year.toString()]);
  const leaveStats = {};
  leaveEvents.forEach((e) => {
    leaveStats[e.type_name] = (leaveStats[e.type_name] || 0) + e.hours;
  });
  return success({ leave_stats: leaveStats, employee: employeeName, year });
}
__name(getAnnualLeaveReport, "getAnnualLeaveReport");
async function getWorkAnalysisReport(env, request) {
  return success({ timesheets: [], stats: {} });
}
__name(getWorkAnalysisReport, "getWorkAnalysisReport");
async function clearCache(env, request) {
  return success({ message: "\u5FEB\u53D6\u5DF2\u6E05\u9664" });
}
__name(clearCache, "clearCache");

// src/routes/reports.routes.js
function registerReportRoutes(router) {
  const auth = /* @__PURE__ */ __name((h) => withErrorHandler(withAuth(h)), "auth");
  router.get("/api/reports/annual-leave", auth(getAnnualLeaveReport));
  router.get("/api/reports/work-analysis", auth(getWorkAnalysisReport));
  router.post("/api/reports/clear-cache", auth(clearCache));
}
__name(registerReportRoutes, "registerReportRoutes");

// src/index.js
function handleOptions() {
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
  registerAuthRoutes(router);
  registerEmployeeRoutes(router);
  registerClientRoutes(router);
  registerTaskRoutes(router);
  registerTimesheetRoutes(router);
  registerReminderRoutes(router);
  registerSopRoutes(router);
  registerSystemRoutes(router);
  registerReportRoutes(router);
  return router;
}
__name(createRouter, "createRouter");
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleOptions();
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
          message: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF"
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

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-1xFnd6/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-1xFnd6/middleware-loader.entry.ts
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
