/**
 * 後端常量定義
 * 集中管理所有常量，確保前後端一致
 */

// 用戶角色
export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

// 任務狀態
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// 任務類型
export const TASK_TYPE = {
  TASK: 'task',
  PROJECT: 'project',
  RECURRING: 'recurring'
};

// 任務分類
export const TASK_CATEGORY = {
  RECURRING: 'recurring',
  BUSINESS: 'business',
  FINANCE: 'finance',
  CLIENT_SERVICE: 'client_service',
  GENERAL: 'general'
};

// 任務優先級
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// 服務類型
export const SERVICE_TYPE = {
  ACCOUNTING: 'accounting',
  VAT: 'vat',
  INCOME_TAX: 'income_tax',
  WITHHOLDING: 'withholding',
  PREPAYMENT: 'prepayment',
  DIVIDEND: 'dividend',
  NHI: 'nhi',
  SHAREHOLDER_TAX: 'shareholder_tax',
  AUDIT: 'audit',
  COMPANY_SETUP: 'company_setup'
};

// 服務頻率
export const SERVICE_FREQUENCY = {
  MONTHLY: 'monthly',
  BIMONTHLY: 'bimonthly',
  QUARTERLY: 'quarterly',
  BIANNUAL: 'biannual',
  ANNUAL: 'annual'
};

// 客戶狀態
export const CLIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  POTENTIAL: 'potential'
};

// 區域
export const REGIONS = {
  TAICHUNG: '台中',
  TAIPEI: '台北',
  OTHER: '其他'
};

// 範本類型
export const TEMPLATE_TYPE = {
  GENERAL: 'general',
  SERVICE_CHECKLIST: 'service_checklist'
};

// 文檔類型
export const DOCUMENT_TYPE = {
  SOP: 'sop',
  DOCUMENT: 'document',
  FAQ: 'faq'
};

// 提醒類型
export const REMINDER_TYPE = {
  DUE_SOON: 'due_soon',
  OVERDUE: 'overdue',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  CUSTOM: 'custom'
};

// HTTP 狀態碼
export const HTTP_STATUS = {
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

// 錯誤代碼
export const ERROR_CODES = {
  // 認證錯誤
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // 驗證錯誤
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_TYPE: 'INVALID_TYPE',
  
  // 業務錯誤
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // 系統錯誤
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// 資料庫表名（集中定義，避免字符串硬編碼）
export const TABLES = {
  USERS: 'users',
  EMPLOYEES: 'employees',
  SESSIONS: 'sessions',
  CLIENTS: 'clients',
  CLIENT_SERVICES: 'client_services',
  CLIENT_INTERACTIONS: 'client_interactions',
  TASKS: 'tasks',
  MULTI_STAGE_TASKS: 'multi_stage_tasks',
  TASK_STAGES: 'task_stages',
  TASK_TEMPLATES: 'task_templates',
  TASK_TEMPLATE_STAGES: 'task_template_stages',
  TASK_GENERATION_LOG: 'task_generation_log',
  TASK_EXECUTION_LOG: 'task_execution_log',
  TIMESHEETS: 'timesheets',
  LEAVE_TYPES: 'leave_types',
  LEAVE_EVENTS: 'leave_events',
  ANNUAL_LEAVE_RULES: 'annual_leave_rules',
  ANNUAL_LEAVE_CARRYOVER: 'annual_leave_carryover',
  OVERTIME_RATES: 'overtime_rates',
  HOLIDAYS: 'holidays',
  BUSINESS_TYPES: 'business_types',
  SOPS: 'sops',
  SOP_CATEGORIES: 'sop_categories',
  SOP_VERSIONS: 'sop_versions',
  POSTS: 'posts',
  MEDIA_LIBRARY: 'media_library',
  FAQS: 'faqs',
  FAQ_CATEGORIES: 'faq_categories',
  SYSTEM_PARAMETERS: 'system_parameters',
  TASK_REMINDERS: 'task_reminders',
  USER_WORKLOAD_STATS: 'user_workload_stats',
  REPORT_CACHE: 'report_cache'
};

// 標準欄位名（集中定義，避免拼寫錯誤）
export const FIELDS = {
  // 通用欄位
  ID: 'id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  DELETED_AT: 'deleted_at',
  
  // 用戶相關
  USER_ID: 'user_id',
  EMPLOYEE_ID: 'employee_id',
  ASSIGNED_USER_ID: 'assigned_user_id',
  CREATED_BY_USER_ID: 'created_by_user_id',
  APPROVED_BY_USER_ID: 'approved_by_user_id',
  COMPLETED_BY_USER_ID: 'completed_by_user_id',
  MODIFIED_BY_USER_ID: 'modified_by_user_id',
  
  // 其他關聯
  CLIENT_ID: 'client_id',
  TASK_ID: 'task_id',
  TEMPLATE_ID: 'template_id',
  CATEGORY_ID: 'category_id',
  
  // 狀態欄位
  IS_ACTIVE: 'is_active',
  IS_DELETED: 'is_deleted',
  IS_APPROVED: 'is_approved',
  IS_DEFAULT: 'is_default',
  IS_LOCKED: 'is_locked'
};

// 凍結所有常量
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

export default {
  USER_ROLES,
  TASK_STATUS,
  TASK_TYPE,
  TASK_CATEGORY,
  TASK_PRIORITY,
  SERVICE_TYPE,
  SERVICE_FREQUENCY,
  CLIENT_STATUS,
  REGIONS,
  TEMPLATE_TYPE,
  DOCUMENT_TYPE,
  REMINDER_TYPE,
  HTTP_STATUS,
  ERROR_CODES,
  TABLES,
  FIELDS
};

