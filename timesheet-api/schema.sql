-- =====================================================
-- 會計師事務所內部管理系統 - 資料庫 Schema
-- Database: Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2025-10-29
-- =====================================================

-- =====================================================
-- 模組 1: 系統基礎
-- =====================================================

-- -----------------------------------------------------
-- Table: Users (員工/用戶)
-- 描述: 存儲員工帳號、姓名、角色等基本資訊
-- -----------------------------------------------------
CREATE TABLE Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,                 -- 必填
  is_admin BOOLEAN DEFAULT 0,          -- ⭐ 核心：0=員工, 1=管理員
  gender TEXT NOT NULL,                -- 'M', 'F'（必填，影響假期選項）
  birth_date TEXT,
  start_date TEXT NOT NULL,            -- 到職日期（必填，用於計算年資和特休）
  phone TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- 登入控制
  login_attempts INTEGER DEFAULT 0,
  last_failed_login TEXT,
  last_login TEXT,
  
  -- 審計欄位（標準）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_is_admin ON Users(is_admin);
CREATE INDEX idx_users_deleted ON Users(is_deleted);

-- -----------------------------------------------------
-- Table: Settings (系統設定)
-- 描述: 存儲系統參數，支援危險設定警告機制
-- -----------------------------------------------------
CREATE TABLE Settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_dangerous BOOLEAN DEFAULT 0,      -- ⭐ 是否為危險設定（需警告）
  is_readonly BOOLEAN DEFAULT 0,       -- 是否唯讀（勞基法規定，不可修改）
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  
  FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_settings_key ON Settings(setting_key);

-- 預設系統參數
INSERT INTO Settings (setting_key, setting_value, description, is_dangerous, is_readonly) VALUES
-- 危險設定（可修改，但需確認）
('comp_leave_expiry_rule', 'current_month', '補休有效期規則（current_month/next_month/3_months/6_months）', 1, 0),

-- 勞基法規定（唯讀，不可修改）
('daily_work_hours_limit', '12', '每日工時上限（勞基法規定）', 1, 1),
('hourly_wage_base', '240', '月薪制換算時數（勞基法規定）', 1, 1),

-- 一般設定
('company_name', '霍爾果斯會計師事務所', '公司名稱', 0, 0),
('contact_email', 'contact@horgoscpa.com', '聯絡信箱', 0, 0),
('fiscal_year_start_month', '1', '會計年度起始月份（1-12）', 0, 0),
('default_work_hours_per_day', '8', '預設每日工作時數', 0, 0);

-- -----------------------------------------------------
-- Table: AuditLogs (審計日誌)
-- 描述: 記錄所有重要操作（登入、CRUD 等）
-- -----------------------------------------------------
CREATE TABLE AuditLogs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,                -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  table_name TEXT NOT NULL,
  record_id TEXT,
  changes TEXT,                        -- JSON 格式（記錄變更前後的值）
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'))
);

-- 索引
CREATE INDEX idx_audit_logs_user ON AuditLogs(user_id);
CREATE INDEX idx_audit_logs_table ON AuditLogs(table_name);
CREATE INDEX idx_audit_logs_action ON AuditLogs(action);
CREATE INDEX idx_audit_logs_date ON AuditLogs(created_at);

-- -----------------------------------------------------
-- Table: FieldAuditTrail (字段級審計)
-- 描述: 記錄每個欄位的變更歷史（用於敏感資料追蹤）
-- -----------------------------------------------------
CREATE TABLE FieldAuditTrail (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_field_audit_table_record ON FieldAuditTrail(table_name, record_id);
CREATE INDEX idx_field_audit_field ON FieldAuditTrail(field_name);
CREATE INDEX idx_field_audit_user ON FieldAuditTrail(changed_by);
CREATE INDEX idx_field_audit_date ON FieldAuditTrail(changed_at);

-- -----------------------------------------------------
-- Table: Notifications (系統通知)
-- 描述: 儀表板提醒功能（工時缺填、任務逾期等）
-- 設計哲學: 專注於「需要處理的事項」，自動消失機制
-- -----------------------------------------------------
CREATE TABLE Notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,             -- 通知對象（員工或管理員）
  type TEXT NOT NULL,                   -- 通知類型
  message TEXT NOT NULL,                -- 通知訊息
  related_date TEXT,                    -- 關聯日期（如：缺填的日期）
  related_user_id INTEGER,              -- 關聯用戶（管理員看員工缺填時用）
  action_url TEXT,                      -- 操作連結（如：/timesheets/new?date=2025-11-26）
  auto_dismiss BOOLEAN DEFAULT 1,       -- 是否自動消失（1=問題解決後自動移除，0=需手動關閉）
  priority TEXT DEFAULT 'normal',       -- 優先級：low, normal, high
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,         -- 是否已移除（0=顯示在列表，1=已移除）
  dismissed_at TEXT,                    -- 移除時間（自動或手動）
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (related_user_id) REFERENCES Users(user_id),
  CHECK (type IN ('missing_timesheet', 'task_overdue', 'leave_pending', 'payment_overdue', 'cron_failed', 'cron_retry_success', 'cron_retry_exhausted')),
  CHECK (priority IN ('low', 'normal', 'high'))
);

-- 索引
CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_type ON Notifications(type);
CREATE INDEX idx_notifications_deleted ON Notifications(is_deleted);
CREATE INDEX idx_notifications_date ON Notifications(related_date);
CREATE INDEX idx_notifications_priority ON Notifications(priority);

-- 唯一約束：同一用戶同類型同日期只有一筆未移除通知
CREATE UNIQUE INDEX idx_notifications_unique ON Notifications(user_id, type, related_date, related_user_id) 
  WHERE is_deleted = 0;

-- =====================================================
-- 註記
-- =====================================================
-- 1. 所有表都包含標準審計欄位：created_at, updated_at, is_deleted, deleted_at, deleted_by
-- 2. 使用軟刪除（is_deleted = 1），不實際刪除資料
-- 3. Settings 表的危險設定需要前端確認才能修改
-- 4. Notifications 表支援自動消失機制（問題解決後自動移除）
-- 5. 所有時間欄位使用 SQLite 的 datetime('now') 函數
-- 6. 參數化查詢防止 SQL 注入（在應用層實現）
-- =====================================================

