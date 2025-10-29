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
-- 模組 4: 工時管理
-- =====================================================

-- -----------------------------------------------------
-- Table: TimeLogs (工時記錄)
-- 描述: 記錄每天的工作時間和請假記錄
-- -----------------------------------------------------
CREATE TABLE TimeLogs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,              -- YYYY-MM-DD
  client_id TEXT,                       -- 客戶（工作時）
  service_id INTEGER,                   -- 服務項目
  work_type_id INTEGER NOT NULL,        -- 工作類型
  hours REAL NOT NULL,                  -- 實際工時
  weighted_hours REAL,                  -- 加權工時（自動計算）
  leave_type_id INTEGER,                -- 假別（請假時）
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (work_type_id) REFERENCES WorkTypes(work_type_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  
  -- 驗證約束
  CHECK (hours > 0 AND hours <= 24),
  CHECK (hours % 0.5 = 0)  -- 工時必須是 0.5 的倍數
);

-- 索引（優化查詢性能）
CREATE INDEX idx_timelogs_user_date ON TimeLogs(user_id, work_date);
CREATE INDEX idx_timelogs_client ON TimeLogs(client_id);
CREATE INDEX idx_timelogs_client_date ON TimeLogs(client_id, work_date);  -- 客戶成本分析專用
CREATE INDEX idx_timelogs_date ON TimeLogs(work_date);                    -- 日期範圍查詢專用
CREATE INDEX idx_timelogs_deleted ON TimeLogs(is_deleted);

-- -----------------------------------------------------
-- Table: CompensatoryLeave (補休餘額)
-- 描述: 員工的補休時數（累積制、FIFO 使用、到期轉換）
-- -----------------------------------------------------
CREATE TABLE CompensatoryLeave (
  compe_leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  hours_earned REAL NOT NULL,           -- 累積的補休時數
  hours_remaining REAL NOT NULL,        -- 剩餘補休時數
  earned_date TEXT NOT NULL,            -- 累積日期（用於 FIFO）
  expiry_date TEXT NOT NULL,            -- 到期日（根據系統設定）
  source_timelog_id INTEGER,            -- 來源工時記錄
  source_work_type TEXT,                -- 來源工作類型（記錄加班類型）
  original_rate REAL,                   -- 原始費率（用於到期轉換）
  status TEXT DEFAULT 'active',         -- active, expired, used, converted
  converted_to_payment BOOLEAN DEFAULT 0,  -- 是否已轉加班費
  conversion_date TEXT,                 -- 轉換日期
  conversion_rate REAL,                 -- 轉換時的費率
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (source_timelog_id) REFERENCES TimeLogs(log_id),
  CHECK (status IN ('active', 'expired', 'used', 'converted')),
  CHECK (hours_remaining >= 0),
  CHECK (hours_remaining <= hours_earned)
);

-- 索引
CREATE INDEX idx_compe_leave_user ON CompensatoryLeave(user_id);
CREATE INDEX idx_compe_leave_status ON CompensatoryLeave(status);
CREATE INDEX idx_compe_leave_expiry ON CompensatoryLeave(expiry_date);
CREATE INDEX idx_compe_leave_earned_date ON CompensatoryLeave(earned_date);  -- FIFO 排序用
CREATE INDEX idx_compe_leave_user_status ON CompensatoryLeave(user_id, status);

-- -----------------------------------------------------
-- Table: CompensatoryLeaveUsage (補休使用記錄)
-- 描述: 記錄補休使用歷史（FIFO 先進先出）
-- -----------------------------------------------------
CREATE TABLE CompensatoryLeaveUsage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  compe_leave_id INTEGER NOT NULL,
  leave_application_id INTEGER,         -- 關聯請假申請
  timelog_id INTEGER,                   -- 關聯工時記錄（請假）
  hours_used REAL NOT NULL,
  used_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (compe_leave_id) REFERENCES CompensatoryLeave(compe_leave_id),
  FOREIGN KEY (leave_application_id) REFERENCES LeaveApplications(leave_id),
  FOREIGN KEY (timelog_id) REFERENCES TimeLogs(log_id),
  CHECK (hours_used > 0)
);

-- 索引
CREATE INDEX idx_compe_usage_leave ON CompensatoryLeaveUsage(compe_leave_id);
CREATE INDEX idx_compe_usage_date ON CompensatoryLeaveUsage(used_date);
CREATE INDEX idx_compe_usage_user_date ON CompensatoryLeaveUsage(compe_leave_id, used_date);

-- -----------------------------------------------------
-- Table: CronJobExecutions (Cron Job 執行記錄)
-- 描述: 記錄定時任務執行狀態（冪等性保護、失敗追蹤）
-- -----------------------------------------------------
CREATE TABLE CronJobExecutions (
  execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,
  execution_date TEXT NOT NULL,          -- 執行日期（用於冪等性檢查）
  status TEXT NOT NULL,                  -- success, failed
  affected_records INTEGER DEFAULT 0,    -- 影響的記錄數
  error_message TEXT,
  details TEXT,                          -- JSON 格式（詳細資訊）
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (status IN ('success', 'failed')),
  UNIQUE(job_name, execution_date, status)  -- 同一任務同一天只能有一個成功記錄
);

-- 索引
CREATE INDEX idx_cron_job_name ON CronJobExecutions(job_name);
CREATE INDEX idx_cron_status ON CronJobExecutions(status);
CREATE INDEX idx_cron_date ON CronJobExecutions(execution_date);

-- =====================================================
-- 模組 5: 假期管理
-- =====================================================

-- -----------------------------------------------------
-- Table: LeaveApplications (假期申請)
-- 描述: 記錄員工的請假申請
-- -----------------------------------------------------
CREATE TABLE LeaveApplications (
  application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days REAL NOT NULL,
  hours REAL,
  reason TEXT,
  event_type TEXT,                      -- 如果是生活事件產生的
  counts_as_sick_leave BOOLEAN DEFAULT 0,  -- ⭐ 生理假專用：是否併入病假（第4日起）
  applied_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_leave_apps_user ON LeaveApplications(user_id);
CREATE INDEX idx_leave_apps_date ON LeaveApplications(start_date, end_date);
CREATE INDEX idx_leave_apps_user_date ON LeaveApplications(user_id, start_date, end_date);
CREATE INDEX idx_leave_apps_type_year ON LeaveApplications(leave_type_id, start_date);
CREATE INDEX idx_leave_apps_deleted ON LeaveApplications(is_deleted);

-- -----------------------------------------------------
-- Table: AnnualLeaveBalance (特休餘額)
-- 描述: 員工特休餘額（累積制：去年剩餘+今年新增）
-- -----------------------------------------------------
CREATE TABLE AnnualLeaveBalance (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,                -- 年度
  entitled_days REAL NOT NULL,          -- 當年度新增特休
  carried_over_days REAL DEFAULT 0,     -- 去年遞延特休（累積）
  used_days REAL DEFAULT 0,             -- 已使用天數
  remaining_days REAL NOT NULL,         -- 剩餘天數
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  UNIQUE(user_id, year)
);

-- 索引
CREATE INDEX idx_annual_leave_balance_user ON AnnualLeaveBalance(user_id);
CREATE INDEX idx_annual_leave_balance_year ON AnnualLeaveBalance(year);

-- -----------------------------------------------------
-- Table: LifeEventLeaveGrants (生活事件假期額度)
-- 描述: 追蹤生活事件產生的假期餘額和有效期（如：婚假8天，1年內分次使用）
-- -----------------------------------------------------
CREATE TABLE LifeEventLeaveGrants (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type_id INTEGER NOT NULL,       -- 假別（婚假、喪假等）
  event_type TEXT NOT NULL,             -- 事件類型（'結婚'、'父母過世'等）
  event_date TEXT NOT NULL,             -- 事件發生日期
  total_days REAL NOT NULL,             -- 總額度（如：8天）
  used_days REAL DEFAULT 0,             -- 已使用天數
  remaining_days REAL NOT NULL,         -- 剩餘天數
  valid_from TEXT NOT NULL,             -- 有效期起始日
  valid_until TEXT NOT NULL,            -- 有效期結束日
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_life_event_grants_user ON LifeEventLeaveGrants(user_id);
CREATE INDEX idx_life_event_grants_valid ON LifeEventLeaveGrants(valid_until);
CREATE INDEX idx_life_event_grants_type ON LifeEventLeaveGrants(leave_type_id);
CREATE INDEX idx_life_event_grants_deleted ON LifeEventLeaveGrants(is_deleted);

-- =====================================================
-- 模組 8：知識管理（3個表）
-- =====================================================

-- -----------------------------------------------------
-- Table: SOPDocuments (SOP 文件)
-- 描述: 標準作業程序文件（含版本控制、發布狀態）
-- -----------------------------------------------------
CREATE TABLE SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,               -- HTML 內容
  category TEXT,
  tags TEXT,                           -- JSON 陣列
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_sop_category ON SOPDocuments(category);
CREATE INDEX idx_sop_published ON SOPDocuments(is_published);
CREATE INDEX idx_sop_creator ON SOPDocuments(created_by);
CREATE INDEX idx_sop_deleted ON SOPDocuments(is_deleted);

-- -----------------------------------------------------
-- Table: ClientSOPLinks (客戶專屬 SOP 關聯)
-- 描述: 客戶與 SOP 的多對多關聯
-- -----------------------------------------------------
CREATE TABLE ClientSOPLinks (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  sop_id INTEGER NOT NULL,
  assigned_by INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (assigned_by) REFERENCES Users(user_id),
  UNIQUE(client_id, sop_id)                -- ⭐ 防止重複關聯
);

-- 索引
CREATE INDEX idx_client_sop_client ON ClientSOPLinks(client_id);
CREATE INDEX idx_client_sop_sop ON ClientSOPLinks(sop_id);

-- -----------------------------------------------------
-- Table: KnowledgeArticles (知識庫文章)
-- 描述: 內部知識庫文章（含瀏覽次數、分類、標籤）
-- -----------------------------------------------------
CREATE TABLE KnowledgeArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,                           -- JSON 陣列
  is_published BOOLEAN DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_knowledge_category ON KnowledgeArticles(category);
CREATE INDEX idx_knowledge_published ON KnowledgeArticles(is_published);
CREATE INDEX idx_knowledge_creator ON KnowledgeArticles(created_by);
CREATE INDEX idx_knowledge_deleted ON KnowledgeArticles(is_deleted);

-- =====================================================
-- 模組 6: 服務生命週期管理
-- =====================================================

-- -----------------------------------------------------
-- Table: ClientServices (客戶服務配置)
-- 描述: 記錄客戶訂閱的服務（自動生成任務的依據）
-- -----------------------------------------------------
CREATE TABLE ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  frequency_id INTEGER NOT NULL,        -- 週期類型
  template_id INTEGER,                  -- 預設任務模板（通用）
  custom_template_id INTEGER,           -- 客戶專屬模板（優先使用）
  trigger_months TEXT,                  -- 觸發月份（如：'1,4,7,10'表示每季）
  start_date TEXT NOT NULL,
  end_date TEXT,
  price REAL,                           -- 服務價格
  billing_cycle TEXT DEFAULT 'monthly', -- 計費週期
  notes TEXT,
  
  -- ⭐ 服務狀態管理（模組6新增）
  status TEXT DEFAULT 'active',         -- 'active', 'suspended', 'expired', 'cancelled'
  suspended_at TEXT,
  resumed_at TEXT,
  suspension_reason TEXT,
  cancelled_at TEXT,
  cancelled_by INTEGER,
  auto_renew BOOLEAN DEFAULT 1,         -- 是否自動續約
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (frequency_id) REFERENCES ServiceFrequencyTypes(frequency_id),
  FOREIGN KEY (template_id) REFERENCES TaskTemplates(template_id),
  FOREIGN KEY (custom_template_id) REFERENCES TaskTemplates(template_id),
  FOREIGN KEY (cancelled_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('active', 'suspended', 'expired', 'cancelled'))
);

-- 索引
CREATE INDEX idx_client_services_client ON ClientServices(client_id);
CREATE INDEX idx_client_services_service ON ClientServices(service_id);
CREATE INDEX idx_client_services_status ON ClientServices(status);
CREATE INDEX idx_client_services_deleted ON ClientServices(is_deleted);

-- -----------------------------------------------------
-- Table: ServiceChangeHistory (服務變更歷史)
-- 描述: 記錄服務狀態變更的歷史（暫停、恢復、取消等）
-- -----------------------------------------------------
CREATE TABLE ServiceChangeHistory (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  reason TEXT,
  notes TEXT,
  
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_service_change_service ON ServiceChangeHistory(client_service_id);
CREATE INDEX idx_service_change_date ON ServiceChangeHistory(changed_at);
CREATE INDEX idx_service_change_user ON ServiceChangeHistory(changed_by);

-- =====================================================
-- 模組 7: 任務管理
-- =====================================================

-- -----------------------------------------------------
-- Table: TaskTemplates (任務模板)
-- 描述: 定義可重複使用的任務流程（通用或客戶專屬）
-- -----------------------------------------------------
CREATE TABLE TaskTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,
  service_id INTEGER,
  description TEXT,
  estimated_days INTEGER,
  related_sop_id INTEGER,               -- 關聯的 SOP 文件
  is_client_specific BOOLEAN DEFAULT 0, -- 是否為客戶專屬模板
  specific_client_id TEXT,              -- 專屬客戶ID（若為客戶專屬）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (related_sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (specific_client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX idx_task_templates_service ON TaskTemplates(service_id);
CREATE INDEX idx_task_templates_client ON TaskTemplates(specific_client_id);
CREATE INDEX idx_task_templates_deleted ON TaskTemplates(is_deleted);

-- -----------------------------------------------------
-- Table: TaskStageTemplates (任務階段模板)
-- 描述: 定義任務模板中的各個階段
-- -----------------------------------------------------
CREATE TABLE TaskStageTemplates (
  stage_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  estimated_days INTEGER,
  description TEXT,
  
  FOREIGN KEY (template_id) REFERENCES TaskTemplates(template_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_stage_templates_template ON TaskStageTemplates(template_id);
CREATE INDEX idx_stage_templates_order ON TaskStageTemplates(template_id, stage_order);

-- -----------------------------------------------------
-- Table: ActiveTasks (執行中任務)
-- 描述: 當前正在執行的任務（自動或手動生成）
-- -----------------------------------------------------
CREATE TABLE ActiveTasks (
  task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  start_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT 'pending',        -- pending, in_progress, completed, cancelled, suspended
  assignee_user_id INTEGER,
  related_sop_id INTEGER,               -- 關聯的通用 SOP 文件
  client_specific_sop_id INTEGER,       -- 客戶專屬 SOP 文件
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (template_id) REFERENCES TaskTemplates(template_id),
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id),
  FOREIGN KEY (related_sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (client_specific_sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'suspended'))
);

-- 索引（優化查詢性能）
CREATE INDEX idx_active_tasks_service ON ActiveTasks(client_service_id);
CREATE INDEX idx_active_tasks_assignee ON ActiveTasks(assignee_user_id);
CREATE INDEX idx_active_tasks_status ON ActiveTasks(status);
CREATE INDEX idx_active_tasks_due_date ON ActiveTasks(due_date);
CREATE INDEX idx_active_tasks_assignee_status ON ActiveTasks(assignee_user_id, status, due_date);  -- ⭐ 儀表板查詢專用
CREATE INDEX idx_active_tasks_due_status ON ActiveTasks(due_date, status);  -- ⭐ 逾期任務檢測專用
CREATE INDEX idx_active_tasks_deleted ON ActiveTasks(is_deleted);

-- -----------------------------------------------------
-- Table: ActiveTaskStages (任務階段進度)
-- 描述: 任務的各個階段執行狀態
-- -----------------------------------------------------
CREATE TABLE ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  stage_template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',        -- pending, in_progress, completed
  started_at TEXT,
  completed_at TEXT,
  assignee_user_id INTEGER,
  notes TEXT,
  
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (stage_template_id) REFERENCES TaskStageTemplates(stage_template_id),
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id),
  CHECK (status IN ('pending', 'in_progress', 'completed'))
);

-- 索引
CREATE INDEX idx_active_stages_task ON ActiveTaskStages(task_id);
CREATE INDEX idx_active_stages_order ON ActiveTaskStages(task_id, stage_order);
CREATE INDEX idx_active_stages_status ON ActiveTaskStages(status);

-- =====================================================
-- 模組 8: 知識管理
-- 規格來源: docs/開發指南/知識管理-完整規格.md
-- =====================================================

-- -----------------------------------------------------
-- Table: SOPDocuments (SOP 文件)
-- 描述: 標準作業流程文件，含版本控制、發布狀態
-- 規格來源: L10-L30
-- -----------------------------------------------------
CREATE TABLE SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,            -- L12
  title TEXT NOT NULL,                                 -- L13
  content TEXT NOT NULL,                               -- L14: HTML 內容
  category TEXT,                                       -- L15
  tags TEXT,                                           -- L16: JSON 陣列
  version INTEGER DEFAULT 1,                           -- L17
  is_published BOOLEAN DEFAULT 0,                      -- L18
  created_by INTEGER NOT NULL,                         -- L19
  created_at TEXT DEFAULT (datetime('now')),           -- L20
  updated_at TEXT DEFAULT (datetime('now')),           -- L21
  is_deleted BOOLEAN DEFAULT 0,                        -- L22
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)   -- L24
);

-- 索引
CREATE INDEX idx_sop_category ON SOPDocuments(category);         -- L27
CREATE INDEX idx_sop_published ON SOPDocuments(is_published);    -- L28
CREATE INDEX idx_sop_creator ON SOPDocuments(created_by);        -- L29

-- -----------------------------------------------------
-- Table: ClientSOPLinks (客戶專屬 SOP)
-- 描述: 客戶與 SOP 的關聯表，支持一對多關係
-- 規格來源: L32-L50
-- -----------------------------------------------------
CREATE TABLE ClientSOPLinks (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT,           -- L35
  client_id TEXT NOT NULL,                             -- L36
  sop_id INTEGER NOT NULL,                             -- L37
  assigned_by INTEGER NOT NULL,                        -- L38
  assigned_at TEXT DEFAULT (datetime('now')),          -- L39
  notes TEXT,                                          -- L40
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),      -- L42
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id),       -- L43
  FOREIGN KEY (assigned_by) REFERENCES Users(user_id),        -- L44
  UNIQUE(client_id, sop_id)                                   -- L45: 防止重複關聯
);

-- 索引
CREATE INDEX idx_client_sop_client ON ClientSOPLinks(client_id);   -- L48
CREATE INDEX idx_client_sop_sop ON ClientSOPLinks(sop_id);         -- L49

-- -----------------------------------------------------
-- Table: KnowledgeArticles (知識庫文章)
-- 描述: 內部知識庫，含瀏覽次數統計
-- 規格來源: L52-L72
-- -----------------------------------------------------
CREATE TABLE KnowledgeArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,        -- L55
  title TEXT NOT NULL,                                 -- L56
  content TEXT NOT NULL,                               -- L57
  category TEXT,                                       -- L58
  tags TEXT,                                           -- L59: JSON 陣列
  is_published BOOLEAN DEFAULT 0,                      -- L60
  view_count INTEGER DEFAULT 0,                        -- L61
  created_by INTEGER NOT NULL,                         -- L62
  created_at TEXT DEFAULT (datetime('now')),           -- L63
  updated_at TEXT DEFAULT (datetime('now')),           -- L64
  is_deleted BOOLEAN DEFAULT 0,                        -- L65
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)   -- L67
);

-- 索引
CREATE INDEX idx_knowledge_category ON KnowledgeArticles(category);      -- L70
CREATE INDEX idx_knowledge_published ON KnowledgeArticles(is_published); -- L71

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

-- =====================================================
-- ??撣思????折蝞∠?蝟餌絞 - 鞈?摨?Schema (璅∠? 10-14)
-- Database: Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2025-10-29
-- =====================================================

-- =====================================================
-- 璅∠? 10: ?芾?蝞∠?
-- =====================================================

-- -----------------------------------------------------
-- ?游? Users 銵剁??芾??箸鞈?嚗?
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L35-L42
-- -----------------------------------------------------
ALTER TABLE Users ADD COLUMN base_salary REAL NOT NULL DEFAULT 0;  -- 摨嚗??迎?
ALTER TABLE Users ADD COLUMN join_date TEXT;  -- ?啗?交?嚗?潸?蝞僑鞈隡?
ALTER TABLE Users ADD COLUMN comp_hours_current_month REAL DEFAULT 0;  -- ?祆?鋆??

-- -----------------------------------------------------
-- Table: SalaryItemTypes嚗鞈??桅???
-- ?膩: ?暑?鞈??桅?蝵桃頂蝯梧??舀?瘣亥票???甈?
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L49-L106
-- -----------------------------------------------------
CREATE TABLE SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,  -- ?隞?Ⅳ嚗?嚗TTENDANCE_BONUS嚗?
  item_name TEXT NOT NULL,  -- ??迂嚗?嚗?斤???
  category TEXT NOT NULL,  -- 憿嚗?allowance'嚗揖鞎潘?, 'bonus'嚗???, 'deduction'嚗甈橘?
  is_taxable BOOLEAN DEFAULT 1,  -- ?臬閮隤脩?
  is_fixed BOOLEAN DEFAULT 1,  -- ???臬?箏?嚗?=瘥???憿?0=??????
  is_regular_payment BOOLEAN DEFAULT 1,  -- 潃??臬?箇?撣豢抒策??1=瘥??潭閮?嚗?=?嗥?潭憒僑蝯?
  affects_labor_insurance BOOLEAN DEFAULT 1,  -- ?臬敶梢?靽?
  affects_attendance BOOLEAN DEFAULT 0,  -- ?臬敶梢?典?文?
  calculation_formula TEXT,  -- 閮??砍?嚗????桃嚗?
  display_order INTEGER DEFAULT 0,  -- 憿舐內??
  is_active BOOLEAN DEFAULT 1,  -- ?臬?
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('allowance', 'bonus', 'deduction'))
);

CREATE INDEX idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX idx_salary_item_types_order ON SalaryItemTypes(display_order);
CREATE INDEX idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- ?身?芾??
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_taxable, is_fixed, is_regular_payment) VALUES
('ATTENDANCE_BONUS', '?典??', 'bonus', 1, 1, 1),        -- ?箏???嚗??交???
('TRANSPORT', '鈭日揖鞎?, 'allowance', 0, 1, 1),           -- ?箏???嚗??交???
('MEAL', '隡?瘣亥票', 'allowance', 0, 1, 1),                -- ?箏???嚗??交???
('POSITION', '?瑕??策', 'allowance', 1, 1, 1),            -- ?箏???嚗??交???
('PHONE', '?餉店瘣亥票', 'allowance', 0, 1, 1),               -- ?箏???嚗??交???
('PARKING', '??瘣亥票', 'allowance', 0, 1, 1),             -- ?箏???嚗??交???
('PERFORMANCE', '蝮暹???', 'bonus', 1, 0, 1),             -- 潃???瘚桀?嚗?閮?嚗蔣?踵??砍???
('YEAR_END', '撟渡???', 'bonus', 1, 0, 0);                -- ??瘚桀?嚗?閮?嚗僑摨?甈∴?

-- -----------------------------------------------------
-- Table: EmployeeSalaryItems嚗撌亥鞈??殷?
-- ?膩: ?∪極?犖?鞈??桅?蝵殷??舀??漲?函?隤踵
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L126-L185
-- -----------------------------------------------------
CREATE TABLE EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,  -- ??
  effective_date TEXT NOT NULL,  -- ???交?嚗YYY-MM-01嚗?
  expiry_date TEXT,  -- 憭望??交?嚗YYY-MM-?急嚗ull=瘞訾???嚗?
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id)
);

CREATE INDEX idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);
CREATE INDEX idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);  -- 潃??遢?亥岷撠

-- -----------------------------------------------------
-- Table: MonthlyPayroll嚗?摨西鞈”嚗?
-- ?膩: 瘥??芾?閮?蝯?嚗?鞎餃?憿??典?文?
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L188-L232
-- -----------------------------------------------------
CREATE TABLE MonthlyPayroll (
  payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- ?芾?蝯?嚗??? EmployeeSalaryItems 閮?嚗?
  base_salary REAL NOT NULL,  -- 摨
  total_allowances REAL DEFAULT 0,  -- 瘣亥票??
  total_bonuses REAL DEFAULT 0,  -- ????
  
  -- ?鞎鳴?靘??箸?閮?嚗?
  overtime_weekday_2h REAL DEFAULT 0,  -- 撟單???撠?鞎餌嚗?.34??
  overtime_weekday_beyond REAL DEFAULT 0,  -- 撟單?蝚?撠?韏瘀?1.67??
  overtime_restday_2h REAL DEFAULT 0,  -- 隡?亙?2撠?嚗?.34??
  overtime_restday_beyond REAL DEFAULT 0,  -- 隡?亦洵3撠?韏瘀?1.67??
  overtime_holiday REAL DEFAULT 0,  -- ???/靘??伐?2.0??
  
  -- ??狡?
  total_deductions REAL DEFAULT 0,  -- 蝮賣甈?
  
  -- 蝯梯?鞈?
  total_work_hours REAL DEFAULT 0,  -- 蝮賢極??
  total_overtime_hours REAL DEFAULT 0,  -- ??
  total_weighted_hours REAL DEFAULT 0,  -- ??撌交?蝮質?
  has_full_attendance BOOLEAN DEFAULT 1,  -- ?臬?典
  
  -- 蝮質鞈?
  gross_salary REAL NOT NULL,  -- ??芾?嚗?????
  net_salary REAL NOT NULL,  -- 撖衣?芾?
  
  -- ?酉
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  UNIQUE(user_id, year, month)  -- 瘥犖瘥??芣?銝蝑鞈???
);

CREATE INDEX idx_payroll_user ON MonthlyPayroll(user_id);
CREATE INDEX idx_payroll_date ON MonthlyPayroll(year, month);

-- -----------------------------------------------------
-- Table: OvertimeRecords嚗??剛???蝝堆?
-- ?膩: ?鞎餉?蝞?蝝堆?閮???箸???
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L234-L256
-- -----------------------------------------------------
CREATE TABLE OvertimeRecords (
  overtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  overtime_type TEXT NOT NULL,  -- 'weekday_2h', 'weekday_beyond', 'restday_2h', 'restday_beyond', 'holiday'
  hours REAL NOT NULL,
  rate_multiplier REAL NOT NULL,  -- 鞎餌??嚗?.34, 1.67, 2.0嚗?
  hourly_base REAL NOT NULL,  -- ??箸?嚗ase_salary / 240嚗?
  overtime_pay REAL NOT NULL,  -- ?鞎駁?憿?
  is_compensatory_leave BOOLEAN DEFAULT 0,  -- ?臬?豢?鋆?嚗?=鋆?, 0=?鞎鳴?
  payroll_id INTEGER,  -- ??啗鞈???
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (payroll_id) REFERENCES MonthlyPayroll(payroll_id)
);

CREATE INDEX idx_overtime_user_date ON OvertimeRecords(user_id, work_date);
CREATE INDEX idx_overtime_payroll ON OvertimeRecords(payroll_id);

-- -----------------------------------------------------
-- Table: YearEndBonus嚗僑蝯???
-- ?膩: 撟渡????函?蝞∠?嚗?飛撅砍僑摨西??潭撟游漲?
-- 閬靘?嚗ocs/???/?芾?蝞∠?-摰閬.md L258-L306
-- -----------------------------------------------------
CREATE TABLE YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  attribution_year INTEGER NOT NULL,     -- 甇詨惇撟游漲嚗?嚗?025嚗?
  amount REAL NOT NULL,                  -- 撟渡?????
  payment_year INTEGER,                  -- 撖阡??潭撟游漲嚗?嚗?026嚗?
  payment_month INTEGER,                 -- 撖阡??潭?遢嚗?嚗?嚗?
  payment_date TEXT,                     -- 撖阡??潭?交?嚗?嚗?026-01-15嚗?
  decision_date TEXT,                    -- 瘙箏??交?嚗?嚗?025-12-31嚗?
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(user_id, attribution_year)  -- 瘥犖瘥僑摨血??蝑僑蝯?
);

CREATE INDEX idx_yearend_user ON YearEndBonus(user_id);
CREATE INDEX idx_yearend_attribution ON YearEndBonus(attribution_year);
CREATE INDEX idx_yearend_payment ON YearEndBonus(payment_year, payment_month);

-- =====================================================
-- 璅∠? 11: 蝞∠??
-- =====================================================

-- -----------------------------------------------------
-- Table: OverheadCostTypes嚗恣???祇??桅???
-- ?膩: ?暑?恣???祇??桅?蝵殷??舀?銝車??孵?
-- 閬靘?嚗ocs/???/蝞∠??-摰閬.md L29-L63
-- -----------------------------------------------------
CREATE TABLE OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,  -- ?隞?Ⅳ嚗?嚗ENT嚗?
  cost_name TEXT NOT NULL,  -- ??迂嚗?嚗齒?砍恕蝘?嚗?
  category TEXT NOT NULL,  -- 憿嚗?fixed'嚗摰??穿?, 'variable'嚗????穿?
  allocation_method TEXT NOT NULL,  -- ??孵?嚗?per_employee'嚗?鈭粹嚗? 'per_hour'嚗?撌交?嚗? 'per_revenue'嚗??嚗?
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);

CREATE INDEX idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX idx_overhead_cost_types_category ON OverheadCostTypes(category);

-- ?身蝞∠???
INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description) VALUES
('RENT', '颲血摰斤???, 'fixed', 'per_employee', '瘥?颲血摰斤???),
('UTILITIES', '瘞湧?行', 'fixed', 'per_employee', '瘞渲祥?鞎颯?航祥'),
('INTERNET', '蝬脰楝??', 'fixed', 'per_employee', '蝬脰楝?閰梯祥??),
('EQUIPMENT', '閮剖???', 'fixed', 'per_employee', '?餉?齒?祈身????),
('SOFTWARE', '頠???', 'fixed', 'per_employee', '?車頠?閮鞎餌'),
('INSURANCE', '靽鞎餌', 'fixed', 'per_employee', '?砍靽鞎?),
('MAINTENANCE', '蝬剛風鞎餌', 'variable', 'per_hour', '颲血摰斤雁霅瑯?瞏?),
('MARKETING', '銵鞎餌', 'variable', 'per_revenue', '撱?????瑟暑??);

-- -----------------------------------------------------
-- Table: MonthlyOverheadCosts嚗?摨衣恣???穿?
-- ?膩: 瘥?蝞∠??閮?
-- 閬靘?嚗ocs/???/蝞∠??-摰閬.md L65-L96
-- -----------------------------------------------------
CREATE TABLE MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,  -- ??
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)  -- 瘥車?瘥??芣?銝蝑?
);

CREATE INDEX idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);

-- =====================================================
-- 璅∠? 12: ?嗆??嗆狡
-- =====================================================

-- -----------------------------------------------------
-- Table: Receipts嚗?”嚗?
-- ?膩: ?嗆?蝞∠?嚗??????Ⅳ??嚗雿誥甈?
-- 閬靘?嚗ocs/???/?潛巨?嗆狡-摰閬.md L37-L78
-- -----------------------------------------------------
CREATE TABLE Receipts (
  receipt_id TEXT PRIMARY KEY,  -- ?嗆??Ⅳ嚗撘?YYYYMM-NNN嚗?嚗?02510-001嚗?
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,  -- ???交?
  due_date TEXT,  -- ?唳???
  total_amount REAL NOT NULL,  -- 蝮賡?憿??∠?憿?
  status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid, cancelled
  is_auto_generated BOOLEAN DEFAULT 1,  -- ?臬?芸???蝺刻?嚗?=??頛詨嚗?
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,                      -- 潃?雿誥??
  deleted_by INTEGER,                   -- 潃?雿誥鈭箏
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled'))
);

CREATE INDEX idx_receipts_client ON Receipts(client_id);
CREATE INDEX idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX idx_receipts_status ON Receipts(status);
CREATE INDEX idx_receipts_status_due ON Receipts(status, due_date);  -- 潃??撣單狡?亥岷撠
CREATE INDEX idx_receipts_client_status ON Receipts(client_id, status);  -- 潃?摰Ｘ?嗆狡?亥岷撠

-- -----------------------------------------------------
-- Table: ReceiptItems嚗???殷?
-- ?膩: ?嗆??敦?
-- 閬靘?嚗ocs/???/?潛巨?嗆狡-摰閬.md L80-L97
-- -----------------------------------------------------
CREATE TABLE ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER,  -- ???Services
  description TEXT NOT NULL,  -- ?隤芣?
  quantity REAL DEFAULT 1,  -- ?賊?
  unit_price REAL NOT NULL,  -- ?桀
  amount REAL NOT NULL,  -- ??嚗uantity ? unit_price嚗?
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- -----------------------------------------------------
-- Table: ReceiptSequence嚗??瘞渲?蝞∠?嚗?
-- ?膩: 蝞∠?瘥??嗆?瘚偌???舀?雿萇摰??
-- 閬靘?嚗ocs/???/?潛巨?嗆狡-摰閬.md L99-L116
-- -----------------------------------------------------
CREATE TABLE ReceiptSequence (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT UNIQUE NOT NULL,  -- 撟湔?嚗YYYMM嚗?
  last_sequence INTEGER NOT NULL DEFAULT 0,  -- ?敺蝙?函?瘚偌??
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_receipt_sequence_ym ON ReceiptSequence(year_month);

-- -----------------------------------------------------
-- Table: Payments嚗甈曇???
-- ?膩: ?嗆狡閮?嚗??甈?
-- 閬靘?嚗ocs/???/?潛巨?嗆狡-摰閬.md L118-L138
-- -----------------------------------------------------
CREATE TABLE Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,  -- ?嗆狡?交?
  amount REAL NOT NULL,  -- ?嗆狡??
  payment_method TEXT,  -- ?暸???撣喋蟡?
  reference_number TEXT,  -- ??蝣潘?憒??舐巨?Ⅳ?董??5蝣潘?
  notes TEXT,
  received_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id),
  FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

CREATE INDEX idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX idx_payments_date ON Payments(payment_date);

-- =====================================================
-- 璅∠? 13: ?辣蝟餌絞
-- =====================================================

-- -----------------------------------------------------
-- Table: Attachments嚗?隞塚?
-- ?膩: 蝯曹???隞嗥恣?頂蝯梧??游? Cloudflare R2
-- 閬靘?嚗ocs/???/?辣蝟餌絞-摰閬.md L35-L54
-- -----------------------------------------------------
CREATE TABLE Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'client', 'receipt', 'sop', 'task'
  entity_id TEXT NOT NULL,  -- ??祕擃D
  file_name TEXT NOT NULL,  -- ??瑼?
  file_path TEXT NOT NULL,  -- Cloudflare R2 頝臬?
  file_size INTEGER,  -- 瑼?憭批?嚗ytes嚗?
  mime_type TEXT,  -- 瑼?憿?
  uploaded_by INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id),
  CHECK (entity_type IN ('client', 'receipt', 'sop', 'task'))
);

CREATE INDEX idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded ON Attachments(uploaded_at);

-- =====================================================
-- 璅∠? 14: ?梯”??
-- ?膩: 甇斗芋蝯憿?鞈?銵剁?雿輻?暹?銵函??亥岷????
-- =====================================================

- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   �t "?   9 :   �a��8�? ybFc^� "? 
 
 - -   ��2�u�X�M�? :   d o c s / ? _�*�? ��? / �a��8�? ybFc^� "? - pd���笕2�u�. m d 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 - -   T a b l e :   E x t e r n a l A r t i c l e s   ( �a��8�? ��? / B l o g ) 
 
 - -   ? 4䩁:   ? Gy? l�)�? ? ? B l o g   ? ��? �V����  S E O   ? ��? u�? 
 
 - -   ��2�u�X�M�? :   L 1 1 - L 3 7 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 C R E A T E   T A B L E   E x t e r n a l A r t i c l e s   ( 
 
     a r t i c l e _ i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,                       - -   L 1 2 
 
     t i t l e   T E X T   N O T   N U L L ,                                                                         - -   L 1 3 
 
     s l u g   T E X T   U N I Q U E   N O T   N U L L ,                                                             - -   L 1 4 :   U R L   �tV�? Z�? 
 
     s u m m a r y   T E X T ,                                                                                       - -   L 1 5 
 
     c o n t e n t   T E X T   N O T   N U L L ,                                                                     - -   L 1 6 :   H T M L   ? ybFc
 
     f e a t u r e d _ i m a g e   T E X T ,                                                                         - -   L 1 7 :   �d?��? ? U R L 
 
     c a t e g o r y   T E X T ,                                                                                     - -   L 1 8 
 
     t a g s   T E X T ,                                                                                             - -   L 1 9 :   J S O N   ? ? ? 
 
     i s _ p u b l i s h e d   B O O L E A N   D E F A U L T   0 ,                                                   - -   L 2 0 
 
     p u b l i s h e d _ a t   T E X T ,                                                                             - -   L 2 1 
 
     v i e w _ c o u n t   I N T E G E R   D E F A U L T   0 ,                                                       - -   L 2 2 
 
     
 
     - -   S E O   ? ��? u�? 
 
     s e o _ t i t l e   T E X T ,                                                                                   - -   L 2 3 
 
     s e o _ d e s c r i p t i o n   T E X T ,                                                                       - -   L 2 4 
 
     s e o _ k e y w o r d s   T E X T ,                                                                             - -   L 2 5 
 
     
 
     - -   �d�b? u�? 
 
     c r e a t e d _ b y   I N T E G E R   N O T   N U L L ,                                                         - -   L 2 6 
 
     c r e a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 2 7 
 
     u p d a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 2 8 
 
     i s _ d e l e t e d   B O O L E A N   D E F A U L T   0 ,                                                       - -   L 2 9 
 
     
 
     F O R E I G N   K E Y   ( c r e a t e d _ b y )   R E F E R E N C E S   U s e r s ( u s e r _ i d )             - -   L 3 1 
 
 ) ; 
 
 
 
 - -   ]�7�? 
 
 C R E A T E   U N I Q U E   I N D E X   i d x _ e x t e r n a l _ s l u g   O N   E x t e r n a l A r t i c l e s ( s l u g ) ;                       - -   L 3 4 
 
 C R E A T E   I N D E X   i d x _ e x t e r n a l _ c a t e g o r y   O N   E x t e r n a l A r t i c l e s ( c a t e g o r y ) ;                     - -   L 3 5 
 
 C R E A T E   I N D E X   i d x _ e x t e r n a l _ p u b l i s h e d   O N   E x t e r n a l A r t i c l e s ( i s _ p u b l i s h e d ) ;           - -   L 3 6 
 
 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 - -   T a b l e :   E x t e r n a l F A Q   ( �a��8�d��? ? 5�? ) 
 
 - -   ? 4䩁:   ? Gy? l�)�? ? ? F A Q   ? ?��? ybFc
 
 - -   ��2�u�X�M�? :   L 4 1 - L 5 7 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 C R E A T E   T A B L E   E x t e r n a l F A Q   ( 
 
     f a q _ i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,                               - -   L 4 2 
 
     q u e s t i o n   T E X T   N O T   N U L L ,                                                                   - -   L 4 3 
 
     a n s w e r   T E X T   N O T   N U L L ,                                                                       - -   L 4 4 
 
     c a t e g o r y   T E X T ,                                                                                     - -   L 4 5 
 
     s o r t _ o r d e r   I N T E G E R   D E F A U L T   0 ,                                                       - -   L 4 6 
 
     i s _ p u b l i s h e d   B O O L E A N   D E F A U L T   0 ,                                                   - -   L 4 7 
 
     v i e w _ c o u n t   I N T E G E R   D E F A U L T   0 ,                                                       - -   L 4 8 
 
     
 
     - -   �d�b? u�? 
 
     c r e a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 4 9 
 
     u p d a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 5 0 
 
     i s _ d e l e t e d   B O O L E A N   D E F A U L T   0                                                         - -   L 5 1 
 
 ) ; 
 
 
 
 - -   ]�7�? 
 
 C R E A T E   I N D E X   i d x _ f a q _ c a t e g o r y   O N   E x t e r n a l F A Q ( c a t e g o r y ) ;                                         - -   L 5 4 
 
 C R E A T E   I N D E X   i d x _ f a q _ p u b l i s h e d   O N   E x t e r n a l F A Q ( i s _ p u b l i s h e d ) ;                               - -   L 5 5 
 
 C R E A T E   I N D E X   i d x _ f a q _ o r d e r   O N   E x t e r n a l F A Q ( s o r t _ o r d e r ) ;                                           - -   L 5 6 
 
 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 - -   T a b l e :   R e s o u r c e C e n t e r   ( ����? ��VR? ) 
 
 - -   ? 4䩁:   ? �? �%�? ����? ? �򣏗V�D F ,   E x c e l ,   W o r d ,   Z I P �V? 
 
 - -   ��2�u�X�M�? :   L 6 1 - L 8 2 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 C R E A T E   T A B L E   R e s o u r c e C e n t e r   ( 
 
     r e s o u r c e _ i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,                     - -   L 6 2 
 
     t i t l e   T E X T   N O T   N U L L ,                                                                         - -   L 6 3 
 
     d e s c r i p t i o n   T E X T ,                                                                               - -   L 6 4 
 
     f i l e _ u r l   T E X T   N O T   N U L L ,                                                                   - -   L 6 5 :   R 2   ? #�? ��? 
 
     f i l e _ t y p e   T E X T ,                                                                                   - -   L 6 6 :   P D F ,   E x c e l ,   W o r d ,   Z I P 
 
     f i l e _ s i z e   I N T E G E R ,                                                                             - -   L 6 7 :   b y t e s 
 
     c a t e g o r y   T E X T ,                                                                                     - -   L 6 8 
 
     i s _ p u b l i s h e d   B O O L E A N   D E F A U L T   0 ,                                                   - -   L 6 9 
 
     d o w n l o a d _ c o u n t   I N T E G E R   D E F A U L T   0 ,                                               - -   L 7 0 
 
     
 
     - -   �d�b? u�? 
 
     c r e a t e d _ b y   I N T E G E R   N O T   N U L L ,                                                         - -   L 7 1 
 
     c r e a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 7 2 
 
     u p d a t e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                             - -   L 7 3 
 
     i s _ d e l e t e d   B O O L E A N   D E F A U L T   0 ,                                                       - -   L 7 4 
 
     
 
     F O R E I G N   K E Y   ( c r e a t e d _ b y )   R E F E R E N C E S   U s e r s ( u s e r _ i d )             - -   L 7 6 
 
 ) ; 
 
 
 
 - -   ]�7�? 
 
 C R E A T E   I N D E X   i d x _ r e s o u r c e s _ c a t e g o r y   O N   R e s o u r c e C e n t e r ( c a t e g o r y ) ;                       - -   L 7 9 
 
 C R E A T E   I N D E X   i d x _ r e s o u r c e s _ p u b l i s h e d   O N   R e s o u r c e C e n t e r ( i s _ p u b l i s h e d ) ;             - -   L 8 0 
 
 C R E A T E   I N D E X   i d x _ r e s o u r c e s _ t y p e   O N   R e s o u r c e C e n t e r ( f i l e _ t y p e ) ;                             - -   L 8 1 
 
 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 - -   T a b l e :   E x t e r n a l I m a g e s   ( �a��8�? ~�? ����? ) 
 
 - -   ? 4䩁:   ? ~�? ^� "? �V���? ? B l o g   ? ��? ? >�? �v��? ? 9�? �V? 
 
 - -   ��2�u�X�M�? :   L 8 6 - L 1 0 3 
 
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
 
 C R E A T E   T A B L E   E x t e r n a l I m a g e s   ( 
 
     i m a g e _ i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,                           - -   L 8 7 
 
     t i t l e   T E X T ,                                                                                           - -   L 8 8 
 
     i m a g e _ u r l   T E X T   N O T   N U L L ,                                                                 - -   L 8 9 :   R 2   ? #�? ��? 
 
     a l t _ t e x t   T E X T ,                                                                                     - -   L 9 0 :   ? ~�? ? B���? ��? 
 
     c a t e g o r y   T E X T ,                                                                                     - -   L 9 1 
 
     f i l e _ s i z e   I N T E G E R ,                                                                             - -   L 9 2 :   b y t e s 
 
     w i d t h   I N T E G E R ,                                                                                     - -   L 9 3 :   ? ~�? �d
x2o
 
     h e i g h t   I N T E G E R ,                                                                                   - -   L 9 4 :   ? ~�? �d��2o
 
     
 
     - -   �d�b? u�? 
 
     u p l o a d e d _ b y   I N T E G E R   N O T   N U L L ,                                                       - -   L 9 5 
 
     u p l o a d e d _ a t   T E X T   D E F A U L T   ( d a t e t i m e ( ' n o w ' ) ) ,                           - -   L 9 6 
 
     i s _ d e l e t e d   B O O L E A N   D E F A U L T   0 ,                                                       - -   L 9 7 
 
     
 
     F O R E I G N   K E Y   ( u p l o a d e d _ b y )   R E F E R E N C E S   U s e r s ( u s e r _ i d )           - -   L 9 9 
 
 ) ; 
 
 
 
 - -   ]�7�? 
 
 C R E A T E   I N D E X   i d x _ i m a g e s _ c a t e g o r y   O N   E x t e r n a l I m a g e s ( c a t e g o r y ) ;                             - -   L 1 0 2 
 
 
 
 
-- =====================================================
-- 模組 9: 外部內容管理
-- 規格來源: docs/開發指南/外部內容管理-完整規格.md
-- =====================================================

-- -----------------------------------------------------
-- Table: ExternalArticles (外部文章/Blog)
-- 描述: 公開網站的 Blog 文章，含 SEO 優化欄位
-- 規格來源: L11-L37
-- -----------------------------------------------------
CREATE TABLE ExternalArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,           -- L12
  title TEXT NOT NULL,                                    -- L13
  slug TEXT UNIQUE NOT NULL,                              -- L14: URL 標識符
  summary TEXT,                                           -- L15
  content TEXT NOT NULL,                                  -- L16: HTML 內容
  featured_image TEXT,                                    -- L17: 封面圖 URL
  category TEXT,                                          -- L18
  tags TEXT,                                              -- L19: JSON 陣列
  is_published BOOLEAN DEFAULT 0,                         -- L20
  published_at TEXT,                                      -- L21
  view_count INTEGER DEFAULT 0,                           -- L22
  
  -- SEO 優化欄位
  seo_title TEXT,                                         -- L23
  seo_description TEXT,                                   -- L24
  seo_keywords TEXT,                                      -- L25
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L26
  created_at TEXT DEFAULT (datetime('now')),              -- L27
  updated_at TEXT DEFAULT (datetime('now')),              -- L28
  is_deleted BOOLEAN DEFAULT 0,                           -- L29
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L31
);

-- 索引
CREATE UNIQUE INDEX idx_external_slug ON ExternalArticles(slug);           -- L34
CREATE INDEX idx_external_category ON ExternalArticles(category);          -- L35
CREATE INDEX idx_external_published ON ExternalArticles(is_published);     -- L36

-- -----------------------------------------------------
-- Table: ExternalFAQ (外部常見問題)
-- 描述: 公開網站的 FAQ 頁面內容
-- 規格來源: L41-L57
-- -----------------------------------------------------
CREATE TABLE ExternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,               -- L42
  question TEXT NOT NULL,                                 -- L43
  answer TEXT NOT NULL,                                   -- L44
  category TEXT,                                          -- L45
  sort_order INTEGER DEFAULT 0,                           -- L46
  is_published BOOLEAN DEFAULT 0,                         -- L47
  view_count INTEGER DEFAULT 0,                           -- L48
  
  -- 審計欄位
  created_at TEXT DEFAULT (datetime('now')),              -- L49
  updated_at TEXT DEFAULT (datetime('now')),              -- L50
  is_deleted BOOLEAN DEFAULT 0                            -- L51
);

-- 索引
CREATE INDEX idx_faq_category ON ExternalFAQ(category);                    -- L54
CREATE INDEX idx_faq_published ON ExternalFAQ(is_published);               -- L55
CREATE INDEX idx_faq_order ON ExternalFAQ(sort_order);                     -- L56

-- -----------------------------------------------------
-- Table: ResourceCenter (資源中心)
-- 描述: 可下載的資源文件（PDF, Excel, Word, ZIP）
-- 規格來源: L61-L82
-- -----------------------------------------------------
CREATE TABLE ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,          -- L62
  title TEXT NOT NULL,                                    -- L63
  description TEXT,                                       -- L64
  file_url TEXT NOT NULL,                                 -- L65: R2 儲存路徑
  file_type TEXT,                                         -- L66: PDF, Excel, Word, ZIP
  file_size INTEGER,                                      -- L67: bytes
  category TEXT,                                          -- L68
  is_published BOOLEAN DEFAULT 0,                         -- L69
  download_count INTEGER DEFAULT 0,                       -- L70
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L71
  created_at TEXT DEFAULT (datetime('now')),              -- L72
  updated_at TEXT DEFAULT (datetime('now')),              -- L73
  is_deleted BOOLEAN DEFAULT 0,                           -- L74
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L76
);

-- 索引
CREATE INDEX idx_resources_category ON ResourceCenter(category);           -- L79
CREATE INDEX idx_resources_published ON ResourceCenter(is_published);      -- L80
CREATE INDEX idx_resources_type ON ResourceCenter(file_type);              -- L81

-- -----------------------------------------------------
-- Table: ExternalImages (外部圖片資源)
-- 描述: 圖片管理（用於 Blog 文章、資源封面等）
-- 規格來源: L86-L103
-- -----------------------------------------------------
CREATE TABLE ExternalImages (
  image_id INTEGER PRIMARY KEY AUTOINCREMENT,             -- L87
  title TEXT,                                             -- L88
  image_url TEXT NOT NULL,                                -- L89: R2 儲存路徑
  alt_text TEXT,                                          -- L90: 圖片替代文字
  category TEXT,                                          -- L91
  file_size INTEGER,                                      -- L92: bytes
  width INTEGER,                                          -- L93: 圖片寬度
  height INTEGER,                                         -- L94: 圖片高度
  
  -- 審計欄位
  uploaded_by INTEGER NOT NULL,                           -- L95
  uploaded_at TEXT DEFAULT (datetime('now')),             -- L96
  is_deleted BOOLEAN DEFAULT 0,                           -- L97
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)     -- L99
);

-- 索引
CREATE INDEX idx_images_category ON ExternalImages(category);              -- L102



-- =====================================================
-- 模組 9: 外部內容管理
-- 規格來源: docs/開發指南/外部內容管理-完整規格.md
-- =====================================================

-- -----------------------------------------------------
-- Table: ExternalArticles (外部文章/Blog)
-- 描述: 公開網站的 Blog 文章，含 SEO 優化欄位
-- 規格來源: L11-L37
-- -----------------------------------------------------
CREATE TABLE ExternalArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,           -- L12
  title TEXT NOT NULL,                                    -- L13
  slug TEXT UNIQUE NOT NULL,                              -- L14: URL 標識符
  summary TEXT,                                           -- L15
  content TEXT NOT NULL,                                  -- L16: HTML 內容
  featured_image TEXT,                                    -- L17: 封面圖 URL
  category TEXT,                                          -- L18
  tags TEXT,                                              -- L19: JSON 陣列
  is_published BOOLEAN DEFAULT 0,                         -- L20
  published_at TEXT,                                      -- L21
  view_count INTEGER DEFAULT 0,                           -- L22
  
  -- SEO 優化欄位
  seo_title TEXT,                                         -- L23
  seo_description TEXT,                                   -- L24
  seo_keywords TEXT,                                      -- L25
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L26
  created_at TEXT DEFAULT (datetime('now')),              -- L27
  updated_at TEXT DEFAULT (datetime('now')),              -- L28
  is_deleted BOOLEAN DEFAULT 0,                           -- L29
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L31
);

-- 索引
CREATE UNIQUE INDEX idx_external_slug ON ExternalArticles(slug);           -- L34
CREATE INDEX idx_external_category ON ExternalArticles(category);          -- L35
CREATE INDEX idx_external_published ON ExternalArticles(is_published);     -- L36

-- -----------------------------------------------------
-- Table: ExternalFAQ (外部常見問題)
-- 描述: 公開網站的 FAQ 頁面內容
-- 規格來源: L41-L57
-- -----------------------------------------------------
CREATE TABLE ExternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,               -- L42
  question TEXT NOT NULL,                                 -- L43
  answer TEXT NOT NULL,                                   -- L44
  category TEXT,                                          -- L45
  sort_order INTEGER DEFAULT 0,                           -- L46
  is_published BOOLEAN DEFAULT 0,                         -- L47
  view_count INTEGER DEFAULT 0,                           -- L48
  
  -- 審計欄位
  created_at TEXT DEFAULT (datetime('now')),              -- L49
  updated_at TEXT DEFAULT (datetime('now')),              -- L50
  is_deleted BOOLEAN DEFAULT 0                            -- L51
);

-- 索引
CREATE INDEX idx_faq_category ON ExternalFAQ(category);                    -- L54
CREATE INDEX idx_faq_published ON ExternalFAQ(is_published);               -- L55
CREATE INDEX idx_faq_order ON ExternalFAQ(sort_order);                     -- L56

-- -----------------------------------------------------
-- Table: ResourceCenter (資源中心)
-- 描述: 可下載的資源文件（PDF, Excel, Word, ZIP）
-- 規格來源: L61-L82
-- -----------------------------------------------------
CREATE TABLE ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,          -- L62
  title TEXT NOT NULL,                                    -- L63
  description TEXT,                                       -- L64
  file_url TEXT NOT NULL,                                 -- L65: R2 儲存路徑
  file_type TEXT,                                         -- L66: PDF, Excel, Word, ZIP
  file_size INTEGER,                                      -- L67: bytes
  category TEXT,                                          -- L68
  is_published BOOLEAN DEFAULT 0,                         -- L69
  download_count INTEGER DEFAULT 0,                       -- L70
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L71
  created_at TEXT DEFAULT (datetime('now')),              -- L72
  updated_at TEXT DEFAULT (datetime('now')),              -- L73
  is_deleted BOOLEAN DEFAULT 0,                           -- L74
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L76
);

-- 索引
CREATE INDEX idx_resources_category ON ResourceCenter(category);           -- L79
CREATE INDEX idx_resources_published ON ResourceCenter(is_published);      -- L80
CREATE INDEX idx_resources_type ON ResourceCenter(file_type);              -- L81

-- -----------------------------------------------------
-- Table: ExternalImages (外部圖片資源)
-- 描述: 圖片管理（用於 Blog 文章、資源封面等）
-- 規格來源: L86-L103
-- -----------------------------------------------------
CREATE TABLE ExternalImages (
  image_id INTEGER PRIMARY KEY AUTOINCREMENT,             -- L87
  title TEXT,                                             -- L88
  image_url TEXT NOT NULL,                                -- L89: R2 儲存路徑
  alt_text TEXT,                                          -- L90: 圖片替代文字
  category TEXT,                                          -- L91
  file_size INTEGER,                                      -- L92: bytes
  width INTEGER,                                          -- L93: 圖片寬度
  height INTEGER,                                         -- L94: 圖片高度
  
  -- 審計欄位
  uploaded_by INTEGER NOT NULL,                           -- L95
  uploaded_at TEXT DEFAULT (datetime('now')),             -- L96
  is_deleted BOOLEAN DEFAULT 0,                           -- L97
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)     -- L99
);

-- 索引
CREATE INDEX idx_images_category ON ExternalImages(category);              -- L102


-- =====================================================
-- 會計師事務所內部管理系統 - 資料庫 Schema (模組 10-14)
-- Database: Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2025-10-29
-- =====================================================

-- =====================================================
-- 模組 10: 薪資管理
-- =====================================================

-- -----------------------------------------------------
-- 擴充 Users 表（薪資基本資訊）
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L35-L42
-- -----------------------------------------------------
ALTER TABLE Users ADD COLUMN base_salary REAL NOT NULL DEFAULT 0;  -- 底薪（月薪）
ALTER TABLE Users ADD COLUMN join_date TEXT;  -- 到職日期（用於計算年資、特休）
ALTER TABLE Users ADD COLUMN comp_hours_current_month REAL DEFAULT 0;  -- 本月補休時數

-- -----------------------------------------------------
-- Table: SalaryItemTypes（薪資項目類型）
-- 描述: 靈活的薪資項目配置系統，支持津貼、獎金、扣款
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L49-L106
-- -----------------------------------------------------
CREATE TABLE SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,  -- 項目代碼（如：ATTENDANCE_BONUS）
  item_name TEXT NOT NULL,  -- 項目名稱（如：全勤獎金）
  category TEXT NOT NULL,  -- 類別：'allowance'（津貼）, 'bonus'（獎金）, 'deduction'（扣款）
  is_taxable BOOLEAN DEFAULT 1,  -- 是否計入課稅
  is_fixed BOOLEAN DEFAULT 1,  -- 金額是否固定（1=每月同金額，0=金額會變動）
  is_regular_payment BOOLEAN DEFAULT 1,  -- ⭐ 是否為經常性給與（1=每月發放計入時薪，0=偶爾發放如年終）
  affects_labor_insurance BOOLEAN DEFAULT 1,  -- 是否影響勞健保
  affects_attendance BOOLEAN DEFAULT 0,  -- 是否影響全勤判定
  calculation_formula TEXT,  -- 計算公式（變動項目用）
  display_order INTEGER DEFAULT 0,  -- 顯示順序
  is_active BOOLEAN DEFAULT 1,  -- 是否啟用
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('allowance', 'bonus', 'deduction'))
);

CREATE INDEX idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX idx_salary_item_types_order ON SalaryItemTypes(display_order);
CREATE INDEX idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 預設薪資項目
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_taxable, is_fixed, is_regular_payment) VALUES
('ATTENDANCE_BONUS', '全勤獎金', 'bonus', 1, 1, 1),        -- 固定金額，計入時薪
('TRANSPORT', '交通津貼', 'allowance', 0, 1, 1),           -- 固定金額，計入時薪
('MEAL', '伙食津貼', 'allowance', 0, 1, 1),                -- 固定金額，計入時薪
('POSITION', '職務加給', 'allowance', 1, 1, 1),            -- 固定金額，計入時薪
('PHONE', '電話津貼', 'allowance', 0, 1, 1),               -- 固定金額，計入時薪
('PARKING', '停車津貼', 'allowance', 0, 1, 1),             -- 固定金額，計入時薪
('PERFORMANCE', '績效獎金', 'bonus', 1, 0, 1),             -- ⭐ 金額浮動，但計入時薪（影響成本分析）
('YEAR_END', '年終獎金', 'bonus', 1, 0, 0);                -- 金額浮動，不計入時薪（年底一次）

-- -----------------------------------------------------
-- Table: EmployeeSalaryItems（員工薪資項目）
-- 描述: 員工個人的薪資項目配置，支持月度獨立調整
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L126-L185
-- -----------------------------------------------------
CREATE TABLE EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  effective_date TEXT NOT NULL,  -- 生效日期（YYYY-MM-01）
  expiry_date TEXT,  -- 失效日期（YYYY-MM-末日，null=永久有效）
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id)
);

CREATE INDEX idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);
CREATE INDEX idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);  -- ⭐ 月份查詢專用

-- -----------------------------------------------------
-- Table: MonthlyPayroll（月度薪資表）
-- 描述: 每月薪資計算結果，含加班費分類和全勤判定
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L188-L232
-- -----------------------------------------------------
CREATE TABLE MonthlyPayroll (
  payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- 薪資組成（動態從 EmployeeSalaryItems 計算）
  base_salary REAL NOT NULL,  -- 底薪
  total_allowances REAL DEFAULT 0,  -- 津貼合計
  total_bonuses REAL DEFAULT 0,  -- 獎金合計
  
  -- 加班費（依勞基法計算）
  overtime_weekday_2h REAL DEFAULT 0,  -- 平日加班前2小時費用（1.34倍）
  overtime_weekday_beyond REAL DEFAULT 0,  -- 平日加班第3小時起（1.67倍）
  overtime_restday_2h REAL DEFAULT 0,  -- 休息日前2小時（1.34倍）
  overtime_restday_beyond REAL DEFAULT 0,  -- 休息日第3小時起（1.67倍）
  overtime_holiday REAL DEFAULT 0,  -- 國定假日/例假日（2.0倍）
  
  -- 扣款項目
  total_deductions REAL DEFAULT 0,  -- 總扣款
  
  -- 統計資訊
  total_work_hours REAL DEFAULT 0,  -- 總工時
  total_overtime_hours REAL DEFAULT 0,  -- 加班時數
  total_weighted_hours REAL DEFAULT 0,  -- 加權工時總計
  has_full_attendance BOOLEAN DEFAULT 1,  -- 是否全勤
  
  -- 總薪資
  gross_salary REAL NOT NULL,  -- 應發薪資（含所有加項）
  net_salary REAL NOT NULL,  -- 實發薪資
  
  -- 備註
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  UNIQUE(user_id, year, month)  -- 每人每月只有一筆薪資記錄
);

CREATE INDEX idx_payroll_user ON MonthlyPayroll(user_id);
CREATE INDEX idx_payroll_date ON MonthlyPayroll(year, month);

-- -----------------------------------------------------
-- Table: OvertimeRecords（加班記錄明細）
-- 描述: 加班費計算明細，記錄時薪基準和倍率
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L234-L256
-- -----------------------------------------------------
CREATE TABLE OvertimeRecords (
  overtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  overtime_type TEXT NOT NULL,  -- 'weekday_2h', 'weekday_beyond', 'restday_2h', 'restday_beyond', 'holiday'
  hours REAL NOT NULL,
  rate_multiplier REAL NOT NULL,  -- 費率倍數（1.34, 1.67, 2.0）
  hourly_base REAL NOT NULL,  -- 時薪基準（base_salary / 240）
  overtime_pay REAL NOT NULL,  -- 加班費金額
  is_compensatory_leave BOOLEAN DEFAULT 0,  -- 是否選擇補休（1=補休, 0=加班費）
  payroll_id INTEGER,  -- 關聯到薪資記錄
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (payroll_id) REFERENCES MonthlyPayroll(payroll_id)
);

CREATE INDEX idx_overtime_user_date ON OvertimeRecords(user_id, work_date);
CREATE INDEX idx_overtime_payroll ON OvertimeRecords(payroll_id);

-- -----------------------------------------------------
-- Table: YearEndBonus（年終獎金）
-- 描述: 年終獎金獨立管理，支持歸屬年度與發放年度分離
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L258-L306
-- -----------------------------------------------------
CREATE TABLE YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  attribution_year INTEGER NOT NULL,     -- 歸屬年度（如：2025）
  amount REAL NOT NULL,                  -- 年終獎金金額
  payment_year INTEGER,                  -- 實際發放年度（如：2026）
  payment_month INTEGER,                 -- 實際發放月份（如：1）
  payment_date TEXT,                     -- 實際發放日期（如：2026-01-15）
  decision_date TEXT,                    -- 決定日期（如：2025-12-31）
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(user_id, attribution_year)  -- 每人每年度只有一筆年終
);

CREATE INDEX idx_yearend_user ON YearEndBonus(user_id);
CREATE INDEX idx_yearend_attribution ON YearEndBonus(attribution_year);
CREATE INDEX idx_yearend_payment ON YearEndBonus(payment_year, payment_month);

-- =====================================================
-- 模組 11: 管理成本
-- =====================================================

-- -----------------------------------------------------
-- Table: OverheadCostTypes（管理成本項目類型）
-- 描述: 靈活的管理成本項目配置，支持三種分攤方式
-- 規格來源：docs/開發指南/管理成本-完整規格.md L29-L63
-- -----------------------------------------------------
CREATE TABLE OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,  -- 成本代碼（如：RENT）
  cost_name TEXT NOT NULL,  -- 成本名稱（如：辦公室租金）
  category TEXT NOT NULL,  -- 類別：'fixed'（固定成本）, 'variable'（變動成本）
  allocation_method TEXT NOT NULL,  -- 分攤方式：'per_employee'（按人頭）, 'per_hour'（按工時）, 'per_revenue'（按營收）
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);

CREATE INDEX idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX idx_overhead_cost_types_category ON OverheadCostTypes(category);

-- 預設管理成本項目
INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description) VALUES
('RENT', '辦公室租金', 'fixed', 'per_employee', '每月辦公室租金'),
('UTILITIES', '水電瓦斯', 'fixed', 'per_employee', '水費、電費、瓦斯費'),
('INTERNET', '網路通訊', 'fixed', 'per_employee', '網路、電話費用'),
('EQUIPMENT', '設備折舊', 'fixed', 'per_employee', '電腦、辦公設備折舊'),
('SOFTWARE', '軟體授權', 'fixed', 'per_employee', '各種軟體訂閱費用'),
('INSURANCE', '保險費用', 'fixed', 'per_employee', '公司保險費'),
('MAINTENANCE', '維護費用', 'variable', 'per_hour', '辦公室維護、清潔'),
('MARKETING', '行銷費用', 'variable', 'per_revenue', '廣告、行銷活動');

-- -----------------------------------------------------
-- Table: MonthlyOverheadCosts（月度管理成本）
-- 描述: 每月管理成本記錄
-- 規格來源：docs/開發指南/管理成本-完整規格.md L65-L96
-- -----------------------------------------------------
CREATE TABLE MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)  -- 每種成本每月只有一筆
);

CREATE INDEX idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);

-- =====================================================
-- 模組 12: 收據收款
-- =====================================================

-- -----------------------------------------------------
-- Table: Receipts（收據表）
-- 描述: 收據管理，支持自動/手動號碼生成，含作廢欄位
-- 規格來源：docs/開發指南/發票收款-完整規格.md L37-L78
-- -----------------------------------------------------
CREATE TABLE Receipts (
  receipt_id TEXT PRIMARY KEY,  -- 收據號碼（格式：YYYYMM-NNN，如：202510-001）
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,  -- 開立日期
  due_date TEXT,  -- 到期日
  total_amount REAL NOT NULL,  -- 總金額（無稅額）
  status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid, cancelled
  is_auto_generated BOOLEAN DEFAULT 1,  -- 是否自動生成編號（0=手動輸入）
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,                      -- ⭐ 作廢時間
  deleted_by INTEGER,                   -- ⭐ 作廢人員
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled'))
);

CREATE INDEX idx_receipts_client ON Receipts(client_id);
CREATE INDEX idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX idx_receipts_status ON Receipts(status);
CREATE INDEX idx_receipts_status_due ON Receipts(status, due_date);  -- ⭐ 應收帳款查詢專用
CREATE INDEX idx_receipts_client_status ON Receipts(client_id, status);  -- ⭐ 客戶收款查詢專用

-- -----------------------------------------------------
-- Table: ReceiptItems（收據項目）
-- 描述: 收據明細項目
-- 規格來源：docs/開發指南/發票收款-完整規格.md L80-L97
-- -----------------------------------------------------
CREATE TABLE ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER,  -- 關聯到 Services
  description TEXT NOT NULL,  -- 項目說明
  quantity REAL DEFAULT 1,  -- 數量
  unit_price REAL NOT NULL,  -- 單價
  amount REAL NOT NULL,  -- 金額（quantity × unit_price）
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- -----------------------------------------------------
-- Table: ReceiptSequence（收據流水號管理）
-- 描述: 管理每月收據流水號，支持併發安全生成
-- 規格來源：docs/開發指南/發票收款-完整規格.md L99-L116
-- -----------------------------------------------------
CREATE TABLE ReceiptSequence (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT UNIQUE NOT NULL,  -- 年月（YYYYMM）
  last_sequence INTEGER NOT NULL DEFAULT 0,  -- 最後使用的流水號
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_receipt_sequence_ym ON ReceiptSequence(year_month);

-- -----------------------------------------------------
-- Table: Payments（收款記錄）
-- 描述: 收款記錄，支持部分收款
-- 規格來源：docs/開發指南/發票收款-完整規格.md L118-L138
-- -----------------------------------------------------
CREATE TABLE Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,  -- 收款日期
  amount REAL NOT NULL,  -- 收款金額
  payment_method TEXT,  -- 現金、轉帳、支票
  reference_number TEXT,  -- 參考號碼（如：支票號碼、帳號後5碼）
  notes TEXT,
  received_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id),
  FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

CREATE INDEX idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX idx_payments_date ON Payments(payment_date);

-- =====================================================
-- 模組 13: 附件系統
-- =====================================================

-- -----------------------------------------------------
-- Table: Attachments（附件）
-- 描述: 統一的附件管理系統，整合 Cloudflare R2
-- 規格來源：docs/開發指南/附件系統-完整規格.md L35-L54
-- -----------------------------------------------------
CREATE TABLE Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'client', 'receipt', 'sop', 'task'
  entity_id TEXT NOT NULL,  -- 關聯的實體ID
  file_name TEXT NOT NULL,  -- 原始檔名
  file_path TEXT NOT NULL,  -- Cloudflare R2 路徑
  file_size INTEGER,  -- 檔案大小（bytes）
  mime_type TEXT,  -- 檔案類型
  uploaded_by INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id),
  CHECK (entity_type IN ('client', 'receipt', 'sop', 'task'))
);

CREATE INDEX idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded ON Attachments(uploaded_at);

-- =====================================================
-- 模組 14: 報表分析
-- 描述: 此模組無額外資料表，使用現有表的查詢與聚合
-- =====================================================

-- =====================================================
-- 會計師事務所內部管理系統 - 資料庫 Schema (模組 10-14)
-- Database: Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2025-10-29
-- =====================================================

-- =====================================================
-- 模組 10: 薪資管理
-- =====================================================

-- -----------------------------------------------------
-- 擴充 Users 表（薪資基本資訊）
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L35-L42
-- -----------------------------------------------------
ALTER TABLE Users ADD COLUMN base_salary REAL NOT NULL DEFAULT 0;  -- 底薪（月薪）
ALTER TABLE Users ADD COLUMN join_date TEXT;  -- 到職日期（用於計算年資、特休）
ALTER TABLE Users ADD COLUMN comp_hours_current_month REAL DEFAULT 0;  -- 本月補休時數

-- -----------------------------------------------------
-- Table: SalaryItemTypes（薪資項目類型）
-- 描述: 靈活的薪資項目配置系統，支持津貼、獎金、扣款
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L49-L106
-- -----------------------------------------------------
CREATE TABLE SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,  -- 項目代碼（如：ATTENDANCE_BONUS）
  item_name TEXT NOT NULL,  -- 項目名稱（如：全勤獎金）
  category TEXT NOT NULL,  -- 類別：'allowance'（津貼）, 'bonus'（獎金）, 'deduction'（扣款）
  is_taxable BOOLEAN DEFAULT 1,  -- 是否計入課稅
  is_fixed BOOLEAN DEFAULT 1,  -- 金額是否固定（1=每月同金額，0=金額會變動）
  is_regular_payment BOOLEAN DEFAULT 1,  -- ⭐ 是否為經常性給與（1=每月發放計入時薪，0=偶爾發放如年終）
  affects_labor_insurance BOOLEAN DEFAULT 1,  -- 是否影響勞健保
  affects_attendance BOOLEAN DEFAULT 0,  -- 是否影響全勤判定
  calculation_formula TEXT,  -- 計算公式（變動項目用）
  display_order INTEGER DEFAULT 0,  -- 顯示順序
  is_active BOOLEAN DEFAULT 1,  -- 是否啟用
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('allowance', 'bonus', 'deduction'))
);

CREATE INDEX idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX idx_salary_item_types_order ON SalaryItemTypes(display_order);
CREATE INDEX idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 預設薪資項目
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_taxable, is_fixed, is_regular_payment) VALUES
('ATTENDANCE_BONUS', '全勤獎金', 'bonus', 1, 1, 1),        -- 固定金額，計入時薪
('TRANSPORT', '交通津貼', 'allowance', 0, 1, 1),           -- 固定金額，計入時薪
('MEAL', '伙食津貼', 'allowance', 0, 1, 1),                -- 固定金額，計入時薪
('POSITION', '職務加給', 'allowance', 1, 1, 1),            -- 固定金額，計入時薪
('PHONE', '電話津貼', 'allowance', 0, 1, 1),               -- 固定金額，計入時薪
('PARKING', '停車津貼', 'allowance', 0, 1, 1),             -- 固定金額，計入時薪
('PERFORMANCE', '績效獎金', 'bonus', 1, 0, 1),             -- ⭐ 金額浮動，但計入時薪（影響成本分析）
('YEAR_END', '年終獎金', 'bonus', 1, 0, 0);                -- 金額浮動，不計入時薪（年底一次）

-- -----------------------------------------------------
-- Table: EmployeeSalaryItems（員工薪資項目）
-- 描述: 員工個人的薪資項目配置，支持月度獨立調整
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L126-L185
-- -----------------------------------------------------
CREATE TABLE EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  effective_date TEXT NOT NULL,  -- 生效日期（YYYY-MM-01）
  expiry_date TEXT,  -- 失效日期（YYYY-MM-末日，null=永久有效）
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id)
);

CREATE INDEX idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);
CREATE INDEX idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);  -- ⭐ 月份查詢專用

-- -----------------------------------------------------
-- Table: MonthlyPayroll（月度薪資表）
-- 描述: 每月薪資計算結果，含加班費分類和全勤判定
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L188-L232
-- -----------------------------------------------------
CREATE TABLE MonthlyPayroll (
  payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- 薪資組成（動態從 EmployeeSalaryItems 計算）
  base_salary REAL NOT NULL,  -- 底薪
  total_allowances REAL DEFAULT 0,  -- 津貼合計
  total_bonuses REAL DEFAULT 0,  -- 獎金合計
  
  -- 加班費（依勞基法計算）
  overtime_weekday_2h REAL DEFAULT 0,  -- 平日加班前2小時費用（1.34倍）
  overtime_weekday_beyond REAL DEFAULT 0,  -- 平日加班第3小時起（1.67倍）
  overtime_restday_2h REAL DEFAULT 0,  -- 休息日前2小時（1.34倍）
  overtime_restday_beyond REAL DEFAULT 0,  -- 休息日第3小時起（1.67倍）
  overtime_holiday REAL DEFAULT 0,  -- 國定假日/例假日（2.0倍）
  
  -- 扣款項目
  total_deductions REAL DEFAULT 0,  -- 總扣款
  
  -- 統計資訊
  total_work_hours REAL DEFAULT 0,  -- 總工時
  total_overtime_hours REAL DEFAULT 0,  -- 加班時數
  total_weighted_hours REAL DEFAULT 0,  -- 加權工時總計
  has_full_attendance BOOLEAN DEFAULT 1,  -- 是否全勤
  
  -- 總薪資
  gross_salary REAL NOT NULL,  -- 應發薪資（含所有加項）
  net_salary REAL NOT NULL,  -- 實發薪資
  
  -- 備註
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  UNIQUE(user_id, year, month)  -- 每人每月只有一筆薪資記錄
);

CREATE INDEX idx_payroll_user ON MonthlyPayroll(user_id);
CREATE INDEX idx_payroll_date ON MonthlyPayroll(year, month);

-- -----------------------------------------------------
-- Table: OvertimeRecords（加班記錄明細）
-- 描述: 加班費計算明細，記錄時薪基準和倍率
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L234-L256
-- -----------------------------------------------------
CREATE TABLE OvertimeRecords (
  overtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  overtime_type TEXT NOT NULL,  -- 'weekday_2h', 'weekday_beyond', 'restday_2h', 'restday_beyond', 'holiday'
  hours REAL NOT NULL,
  rate_multiplier REAL NOT NULL,  -- 費率倍數（1.34, 1.67, 2.0）
  hourly_base REAL NOT NULL,  -- 時薪基準（base_salary / 240）
  overtime_pay REAL NOT NULL,  -- 加班費金額
  is_compensatory_leave BOOLEAN DEFAULT 0,  -- 是否選擇補休（1=補休, 0=加班費）
  payroll_id INTEGER,  -- 關聯到薪資記錄
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (payroll_id) REFERENCES MonthlyPayroll(payroll_id)
);

CREATE INDEX idx_overtime_user_date ON OvertimeRecords(user_id, work_date);
CREATE INDEX idx_overtime_payroll ON OvertimeRecords(payroll_id);

-- -----------------------------------------------------
-- Table: YearEndBonus（年終獎金）
-- 描述: 年終獎金獨立管理，支持歸屬年度與發放年度分離
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L258-L306
-- -----------------------------------------------------
CREATE TABLE YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  attribution_year INTEGER NOT NULL,     -- 歸屬年度（如：2025）
  amount REAL NOT NULL,                  -- 年終獎金金額
  payment_year INTEGER,                  -- 實際發放年度（如：2026）
  payment_month INTEGER,                 -- 實際發放月份（如：1）
  payment_date TEXT,                     -- 實際發放日期（如：2026-01-15）
  decision_date TEXT,                    -- 決定日期（如：2025-12-31）
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(user_id, attribution_year)  -- 每人每年度只有一筆年終
);

CREATE INDEX idx_yearend_user ON YearEndBonus(user_id);
CREATE INDEX idx_yearend_attribution ON YearEndBonus(attribution_year);
CREATE INDEX idx_yearend_payment ON YearEndBonus(payment_year, payment_month);

-- =====================================================
-- 模組 11: 管理成本
-- =====================================================

-- -----------------------------------------------------
-- Table: OverheadCostTypes（管理成本項目類型）
-- 描述: 靈活的管理成本項目配置，支持三種分攤方式
-- 規格來源：docs/開發指南/管理成本-完整規格.md L29-L63
-- -----------------------------------------------------
CREATE TABLE OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,  -- 成本代碼（如：RENT）
  cost_name TEXT NOT NULL,  -- 成本名稱（如：辦公室租金）
  category TEXT NOT NULL,  -- 類別：'fixed'（固定成本）, 'variable'（變動成本）
  allocation_method TEXT NOT NULL,  -- 分攤方式：'per_employee'（按人頭）, 'per_hour'（按工時）, 'per_revenue'（按營收）
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);

CREATE INDEX idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX idx_overhead_cost_types_category ON OverheadCostTypes(category);

-- 預設管理成本項目
INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description) VALUES
('RENT', '辦公室租金', 'fixed', 'per_employee', '每月辦公室租金'),
('UTILITIES', '水電瓦斯', 'fixed', 'per_employee', '水費、電費、瓦斯費'),
('INTERNET', '網路通訊', 'fixed', 'per_employee', '網路、電話費用'),
('EQUIPMENT', '設備折舊', 'fixed', 'per_employee', '電腦、辦公設備折舊'),
('SOFTWARE', '軟體授權', 'fixed', 'per_employee', '各種軟體訂閱費用'),
('INSURANCE', '保險費用', 'fixed', 'per_employee', '公司保險費'),
('MAINTENANCE', '維護費用', 'variable', 'per_hour', '辦公室維護、清潔'),
('MARKETING', '行銷費用', 'variable', 'per_revenue', '廣告、行銷活動');

-- -----------------------------------------------------
-- Table: MonthlyOverheadCosts（月度管理成本）
-- 描述: 每月管理成本記錄
-- 規格來源：docs/開發指南/管理成本-完整規格.md L65-L96
-- -----------------------------------------------------
CREATE TABLE MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)  -- 每種成本每月只有一筆
);

CREATE INDEX idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);

-- =====================================================
-- 模組 12: 收據收款
-- =====================================================

-- -----------------------------------------------------
-- Table: Receipts（收據表）
-- 描述: 收據管理，支持自動/手動號碼生成，含作廢欄位
-- 規格來源：docs/開發指南/發票收款-完整規格.md L37-L78
-- -----------------------------------------------------
CREATE TABLE Receipts (
  receipt_id TEXT PRIMARY KEY,  -- 收據號碼（格式：YYYYMM-NNN，如：202510-001）
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,  -- 開立日期
  due_date TEXT,  -- 到期日
  total_amount REAL NOT NULL,  -- 總金額（無稅額）
  status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid, cancelled
  is_auto_generated BOOLEAN DEFAULT 1,  -- 是否自動生成編號（0=手動輸入）
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,                      -- ⭐ 作廢時間
  deleted_by INTEGER,                   -- ⭐ 作廢人員
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled'))
);

CREATE INDEX idx_receipts_client ON Receipts(client_id);
CREATE INDEX idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX idx_receipts_status ON Receipts(status);
CREATE INDEX idx_receipts_status_due ON Receipts(status, due_date);  -- ⭐ 應收帳款查詢專用
CREATE INDEX idx_receipts_client_status ON Receipts(client_id, status);  -- ⭐ 客戶收款查詢專用

-- -----------------------------------------------------
-- Table: ReceiptItems（收據項目）
-- 描述: 收據明細項目
-- 規格來源：docs/開發指南/發票收款-完整規格.md L80-L97
-- -----------------------------------------------------
CREATE TABLE ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER,  -- 關聯到 Services
  description TEXT NOT NULL,  -- 項目說明
  quantity REAL DEFAULT 1,  -- 數量
  unit_price REAL NOT NULL,  -- 單價
  amount REAL NOT NULL,  -- 金額（quantity × unit_price）
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- -----------------------------------------------------
-- Table: ReceiptSequence（收據流水號管理）
-- 描述: 管理每月收據流水號，支持併發安全生成
-- 規格來源：docs/開發指南/發票收款-完整規格.md L99-L116
-- -----------------------------------------------------
CREATE TABLE ReceiptSequence (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT UNIQUE NOT NULL,  -- 年月（YYYYMM）
  last_sequence INTEGER NOT NULL DEFAULT 0,  -- 最後使用的流水號
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_receipt_sequence_ym ON ReceiptSequence(year_month);

-- -----------------------------------------------------
-- Table: Payments（收款記錄）
-- 描述: 收款記錄，支持部分收款
-- 規格來源：docs/開發指南/發票收款-完整規格.md L118-L138
-- -----------------------------------------------------
CREATE TABLE Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,  -- 收款日期
  amount REAL NOT NULL,  -- 收款金額
  payment_method TEXT,  -- 現金、轉帳、支票
  reference_number TEXT,  -- 參考號碼（如：支票號碼、帳號後5碼）
  notes TEXT,
  received_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id),
  FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

CREATE INDEX idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX idx_payments_date ON Payments(payment_date);

-- =====================================================
-- 模組 13: 附件系統
-- =====================================================

-- -----------------------------------------------------
-- Table: Attachments（附件）
-- 描述: 統一的附件管理系統，整合 Cloudflare R2
-- 規格來源：docs/開發指南/附件系統-完整規格.md L35-L54
-- -----------------------------------------------------
CREATE TABLE Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'client', 'receipt', 'sop', 'task'
  entity_id TEXT NOT NULL,  -- 關聯的實體ID
  file_name TEXT NOT NULL,  -- 原始檔名
  file_path TEXT NOT NULL,  -- Cloudflare R2 路徑
  file_size INTEGER,  -- 檔案大小（bytes）
  mime_type TEXT,  -- 檔案類型
  uploaded_by INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id),
  CHECK (entity_type IN ('client', 'receipt', 'sop', 'task'))
);

CREATE INDEX idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded ON Attachments(uploaded_at);

-- =====================================================
-- 模組 14: 報表分析
-- 描述: 此模組無額外資料表，使用現有表的查詢與聚合
-- =====================================================

