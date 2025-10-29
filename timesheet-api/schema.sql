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
-- 模組 2: 業務規則管理
-- =====================================================

-- -----------------------------------------------------
-- Table: Holidays (國定假日)
-- 描述: 存儲國定假日和補班日資訊
-- -----------------------------------------------------
CREATE TABLE Holidays (
  holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_date TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_national_holiday BOOLEAN DEFAULT 1,     -- ⭐ 是否為國定假日（1=是，0=補班日）
  is_makeup_workday BOOLEAN DEFAULT 0,       -- ⭐ 是否為補班日（原本假日調整為上班）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_holidays_date ON Holidays(holiday_date) WHERE is_deleted = 0;
CREATE INDEX idx_holidays_makeup ON Holidays(is_makeup_workday);
CREATE INDEX idx_holidays_deleted ON Holidays(is_deleted);

-- -----------------------------------------------------
-- Table: LeaveTypes (假別類型)
-- 描述: 定義各種假別（特休、病假、事假等）
-- -----------------------------------------------------
CREATE TABLE LeaveTypes (
  leave_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_name TEXT UNIQUE NOT NULL,
  annual_quota REAL,                    -- 年度額度（NULL表示無限制或依規則計算）
  deduct_leave BOOLEAN DEFAULT 1,       -- 是否扣假（0=不扣假，如：公假）
  is_paid BOOLEAN DEFAULT 1,            -- 是否支薪（0=不支薪，如：事假）
  gender_specific TEXT,                 -- 性別限制：'M', 'F', NULL（無限制）
  is_enabled BOOLEAN DEFAULT 1,         -- 是否啟用
  sort_order INTEGER DEFAULT 0,         -- 排序順序
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (gender_specific IN ('M', 'F', NULL))
);

-- 索引
CREATE UNIQUE INDEX idx_leave_types_name ON LeaveTypes(type_name) WHERE is_deleted = 0;
CREATE INDEX idx_leave_types_enabled ON LeaveTypes(is_enabled);
CREATE INDEX idx_leave_types_deleted ON LeaveTypes(is_deleted);

-- 預設假別類型
INSERT INTO LeaveTypes (type_name, annual_quota, deduct_leave, is_paid, gender_specific, sort_order) VALUES
('特休', NULL, 1, 1, NULL, 1),              -- 依年資計算
('病假', 30, 1, 1, NULL, 2),                -- 年度30天
('事假', 14, 1, 0, NULL, 3),                -- 年度14天（不支薪）
('婚假', 8, 1, 1, NULL, 4),                 -- 8天（登記後1年內有效）
('喪假', NULL, 1, 1, NULL, 5),              -- 依親等關係
('產假', 56, 1, 1, 'F', 6),                 -- 8週（女性）
('陪產假', 7, 1, 1, 'M', 7),                -- 7天（男性）
('家庭照顧假', 7, 1, 0, NULL, 8),           -- 年度7天（不支薪）
('公假', NULL, 0, 1, NULL, 9);              -- 不扣假

-- -----------------------------------------------------
-- Table: AnnualLeaveRules (特休規則)
-- 描述: 依年資計算特休天數的規則（勞基法規定）
-- -----------------------------------------------------
CREATE TABLE AnnualLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_months INTEGER NOT NULL,          -- 最少月數
  max_months INTEGER,                   -- 最多月數（NULL表示無上限）
  days INTEGER NOT NULL,                -- 特休天數
  description TEXT
);

-- 法定預設值（勞基法規定）
INSERT INTO AnnualLeaveRules (min_months, max_months, days, description) VALUES
(6, 11, 3, '6個月以上未滿1年'),
(12, 23, 7, '1年以上未滿2年'),
(24, 35, 10, '2年以上未滿3年'),
(36, 59, 14, '3年以上未滿5年'),
(60, 119, 15, '5年以上未滿10年'),
(120, NULL, 15, '10年以上（每滿1年+1天，最高30天）');

-- 索引
CREATE INDEX idx_annual_leave_months ON AnnualLeaveRules(min_months, max_months);

-- -----------------------------------------------------
-- Table: OtherLeaveRules (其他假期規則)
-- 描述: 婚假、喪假等生活事件假期的規則
-- -----------------------------------------------------
CREATE TABLE OtherLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  leave_type_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,             -- 事件類型（結婚、父母喪、祖父母喪等）
  days REAL NOT NULL,                   -- 天數
  validity_days INTEGER DEFAULT 365,    -- 有效期（天）
  description TEXT,
  
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id)
);

-- 預設規則（勞基法規定）
INSERT INTO OtherLeaveRules (leave_type_id, event_type, days, validity_days, description) VALUES
-- 婚假（假別 ID=4）
(4, '本人結婚', 8, 365, '登記日起1年內'),

-- 喪假（假別 ID=5）
(5, '父母喪', 8, 365, '事由發生日起1年內'),
(5, '配偶喪', 8, 365, '事由發生日起1年內'),
(5, '養父母喪', 8, 365, '事由發生日起1年內'),
(5, '繼父母喪', 8, 365, '事由發生日起1年內'),
(5, '子女喪', 8, 365, '事由發生日起1年內'),
(5, '祖父母喪', 6, 365, '事由發生日起1年內'),
(5, '配偶之父母喪', 6, 365, '事由發生日起1年內'),
(5, '配偶之祖父母喪', 3, 365, '事由發生日起1年內'),
(5, '兄弟姊妹喪', 3, 365, '事由發生日起1年內');

-- 索引
CREATE INDEX idx_other_leave_rules_type ON OtherLeaveRules(leave_type_id);

-- -----------------------------------------------------
-- Table: OvertimeRates (加班費率)
-- 描述: 不同工作類型的費率倍數（勞基法規定）
-- -----------------------------------------------------
CREATE TABLE OvertimeRates (
  rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_type_id INTEGER NOT NULL,
  work_type_name TEXT NOT NULL,         -- 工作類型名稱（方便查詢）
  rate_multiplier REAL NOT NULL,        -- 費率倍數
  effective_date TEXT NOT NULL,         -- 生效日期
  is_current BOOLEAN DEFAULT 1,         -- 是否為當前費率
  description TEXT,
  
  FOREIGN KEY (work_type_id) REFERENCES WorkTypes(work_type_id)
);

-- 法定預設值（勞基法規定）
INSERT INTO OvertimeRates (work_type_id, work_type_name, rate_multiplier, effective_date, is_current, description) VALUES
(1, '正常工時', 1.00, '2024-01-01', 1, '正常上班時間'),
(2, '平日加班', 1.34, '2024-01-01', 1, '平日延長工時'),
(3, '休息日加班（前2小時）', 1.34, '2024-01-01', 1, '休息日前2小時'),
(4, '休息日加班（第3小時起）', 1.67, '2024-01-01', 1, '休息日第3小時起'),
(5, '國定假日加班', 2.00, '2024-01-01', 1, '國定假日或例假日');

-- 索引
CREATE INDEX idx_overtime_rates_type ON OvertimeRates(work_type_id);
CREATE INDEX idx_overtime_rates_current ON OvertimeRates(is_current);

-- -----------------------------------------------------
-- Table: ServiceFrequencyTypes (週期類型)
-- 描述: 服務執行週期類型（每月、每季等）
-- -----------------------------------------------------
CREATE TABLE ServiceFrequencyTypes (
  frequency_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  days_interval INTEGER,                -- 天數間隔（如：30天）
  months_interval INTEGER,              -- 月份間隔（如：1個月）
  is_recurring BOOLEAN DEFAULT 1,       -- 是否重複執行（0=單次）
  is_enabled BOOLEAN DEFAULT 1,         -- 是否啟用
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_frequency_name ON ServiceFrequencyTypes(name) WHERE is_deleted = 0;
CREATE INDEX idx_frequency_enabled ON ServiceFrequencyTypes(is_enabled);

-- 預設週期類型
INSERT INTO ServiceFrequencyTypes (name, days_interval, months_interval, is_recurring, sort_order) VALUES
('單次', NULL, NULL, 0, 1),
('每月', NULL, 1, 1, 2),
('雙月', NULL, 2, 1, 3),
('每季', NULL, 3, 1, 4),
('半年', NULL, 6, 1, 5),
('每年', NULL, 12, 1, 6);

-- -----------------------------------------------------
-- Table: Services (服務項目)
-- 描述: 定義事務所提供的服務類型（最多兩層結構）
-- -----------------------------------------------------
CREATE TABLE Services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_service_id INTEGER,            -- 父服務（NULL表示頂層）
  service_name TEXT NOT NULL,
  description TEXT,
  default_price REAL,                   -- 預設價格（可選）
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (parent_service_id) REFERENCES Services(service_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_services_parent ON Services(parent_service_id);
CREATE INDEX idx_services_deleted ON Services(is_deleted);

-- 預設服務項目（兩層結構示例）
INSERT INTO Services (parent_service_id, service_name, description, sort_order) VALUES
-- 第一層：主服務類別
(NULL, '記帳及稅務申報', '基礎記帳和稅務申報服務', 1),
(NULL, '工商登記', '公司設立、變更、註銷等', 2),
(NULL, '稅務規劃', '稅務諮詢和規劃服務', 3),
(NULL, '審計服務', '財務報表審計', 4);

-- 第二層：子服務（parent_service_id 指向第一層）
INSERT INTO Services (parent_service_id, service_name, description, sort_order) VALUES
-- 記帳及稅務申報的子服務
(1, '每月記帳', '每月會計帳務處理', 1),
(1, '營業稅申報', '雙月營業稅申報', 2),
(1, '營利事業所得稅申報', '年度營所稅申報', 3),

-- 工商登記的子服務
(2, '公司設立登記', '新公司設立申請', 1),
(2, '公司變更登記', '登記事項變更', 2),
(2, '公司解散登記', '公司結束營業', 3);

-- -----------------------------------------------------
-- Table: WorkTypes (工作類型)
-- 描述: 定義工作類型（正常工時、加班等）- 與 OvertimeRates 關聯
-- -----------------------------------------------------
CREATE TABLE WorkTypes (
  work_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_name TEXT UNIQUE NOT NULL,
  description TEXT,
  requires_client BOOLEAN DEFAULT 1,    -- 是否需要指定客戶
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);

-- 預設工作類型
INSERT INTO WorkTypes (work_type_id, type_name, description, requires_client, sort_order) VALUES
(1, '正常工時', '正常上班時間', 1, 1),
(2, '平日加班', '平日延長工時', 1, 2),
(3, '休息日加班（前2小時）', '休息日前2小時', 1, 3),
(4, '休息日加班（第3小時起）', '休息日第3小時起', 1, 4),
(5, '國定假日加班', '國定假日或例假日', 1, 5),
(6, '內部訓練', '內部教育訓練', 0, 6),
(7, '行政事務', '內部行政工作', 0, 7);

-- 索引
CREATE INDEX idx_work_types_enabled ON WorkTypes(is_enabled);
CREATE INDEX idx_work_types_deleted ON WorkTypes(is_deleted);

-- =====================================================
-- 模組 3: 客戶管理
-- =====================================================

-- -----------------------------------------------------
-- Table: Clients (客戶)
-- 描述: 存儲客戶公司資料
-- -----------------------------------------------------
CREATE TABLE Clients (
  client_id TEXT PRIMARY KEY,           -- 統一編號（8位數字）
  company_name TEXT NOT NULL,
  tax_registration_number TEXT,         -- 稅籍編號
  business_status TEXT DEFAULT '營業中',
  assignee_user_id INTEGER NOT NULL,    -- 負責員工
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,                  -- 聯絡人姓名
  contact_title TEXT,                   -- 聯絡人職稱
  client_notes TEXT,                    -- 客戶備註（業務相關）
  payment_notes TEXT,                   -- 收款備註（財務相關）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (business_status IN ('營業中', '暫停營業', '已結束營業'))
);

-- 索引
CREATE INDEX idx_clients_assignee ON Clients(assignee_user_id);
CREATE INDEX idx_clients_company_name ON Clients(company_name);
CREATE INDEX idx_clients_status ON Clients(business_status);
CREATE INDEX idx_clients_deleted ON Clients(is_deleted);

-- -----------------------------------------------------
-- Table: CustomerTags (客戶標籤)
-- 描述: 定義客戶標籤（VIP、長期合作等）
-- -----------------------------------------------------
CREATE TABLE CustomerTags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT UNIQUE NOT NULL,
  tag_color TEXT DEFAULT '#3B82F6',     -- 標籤顏色（HEX 格式）
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_customer_tags_name ON CustomerTags(tag_name) WHERE is_deleted = 0;
CREATE INDEX idx_customer_tags_deleted ON CustomerTags(is_deleted);

-- 預設標籤
INSERT INTO CustomerTags (tag_name, tag_color, description, sort_order) VALUES
('VIP', '#EF4444', '重要客戶', 1),
('長期合作', '#10B981', '長期合作客戶', 2),
('新客戶', '#3B82F6', '新開發客戶', 3),
('高價值', '#F59E0B', '高收費客戶', 4),
('需關注', '#8B5CF6', '需要特別關注', 5);

-- -----------------------------------------------------
-- Table: ClientTagAssignments (客戶標籤關聯)
-- 描述: 客戶與標籤的多對多關聯
-- -----------------------------------------------------
CREATE TABLE ClientTagAssignments (
  assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  assigned_by INTEGER,                  -- 誰指派的標籤
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES CustomerTags(tag_id),
  FOREIGN KEY (assigned_by) REFERENCES Users(user_id),
  UNIQUE(client_id, tag_id)
);

-- 索引
CREATE INDEX idx_client_tag_client ON ClientTagAssignments(client_id);
CREATE INDEX idx_client_tag_tag ON ClientTagAssignments(tag_id);

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

