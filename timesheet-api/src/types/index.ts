/**
 * 類型定義
 * 會計師事務所內部管理系統
 */

import { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

// =====================================================
// 環境變數類型
// =====================================================
export interface Env {
  DB: D1Database;
  R2_EXTERNAL_CONTENT: R2Bucket;  // 模組9：外部內容（Blog/FAQ/Resources/Images）
  R2_ATTACHMENTS: R2Bucket;        // 模組13：附件系統
  R2_BACKUPS: R2Bucket;
  CACHE_KV: KVNamespace;           // 模組14：報表快取
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'production';
  CDN_BASE_URL: string;            // R2 公開 CDN URL
  MAX_FILE_SIZE: string;           // 檔案大小限制
  COOKIE_DOMAIN: string;
  COOKIE_SECURE: string;
  CORS_ORIGIN: string;
}

// =====================================================
// JWT Payload
// =====================================================
export interface JWTPayload {
  user_id: number;
  username: string;
  is_admin: boolean;
  iat?: number;
  exp?: number;
}

// =====================================================
// 使用者類型
// =====================================================
export interface User {
  user_id: number;
  username: string;
  password_hash: string;
  name: string;
  email: string;
  is_admin: boolean;
  gender: 'M' | 'F';
  birth_date?: string;
  start_date: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  login_attempts: number;
  last_failed_login?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: number;
}

// =====================================================
// API 響應類型
// =====================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

// =====================================================
// 通用錯誤碼
// =====================================================
export enum ErrorCode {
  // 通用錯誤 (100-199)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // 認證錯誤 (200-219)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  
  // 系統錯誤 (500+)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SQL_INJECTION_DETECTED = 'SQL_INJECTION_DETECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
}

// =====================================================
// 自訂錯誤類
// =====================================================
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode | string,
    message: string,
    public field?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(422, ErrorCode.VALIDATION_ERROR, message, field);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未登入或 Token 無效') {
    super(401, ErrorCode.UNAUTHORIZED, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '權限不足') {
    super(403, ErrorCode.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '資源不存在') {
    super(404, ErrorCode.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(409, ErrorCode.CONFLICT, message, field);
    this.name = 'ConflictError';
  }
}

// =====================================================
// 審計日誌類型
// =====================================================
export interface AuditLog {
  log_id?: number;
  user_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  table_name: string;
  record_id?: string;
  changes?: string; // JSON
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// =====================================================
// 系統設定類型
// =====================================================
export interface Setting {
  setting_key: string;
  setting_value: string;
  description?: string;
  is_dangerous: boolean;
  is_readonly: boolean;
  updated_at: string;
  updated_by?: number;
}

// =====================================================
// 通知類型
// =====================================================
export interface Notification {
  notification_id?: number;
  user_id: number;
  type: 'missing_timesheet' | 'task_overdue' | 'leave_pending' | 'payment_overdue' | 'cron_failed' | 'cron_retry_success' | 'cron_retry_exhausted';
  message: string;
  related_date?: string;
  related_user_id?: number;
  action_url?: string;
  auto_dismiss: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at?: string;
  is_deleted: boolean;
  dismissed_at?: string;
}

// =====================================================
// 請求上下文（擴展 Hono Context）
// =====================================================
export interface RequestContext {
  user?: User;
  token?: string;
}

