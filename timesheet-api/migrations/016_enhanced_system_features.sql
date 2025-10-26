-- ============================================
-- Migration 016: Enhanced System Features
-- 創建日期: 2025-10-26
-- 用途: 添加用戶提醒、工作量統計、系統參數擴展等功能
-- ============================================

-- ============================================
-- 1. 用戶提醒系統
-- ============================================

CREATE TABLE IF NOT EXISTS user_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL,       -- annual_leave_expiry, task_due, timesheet_reminder, overtime_alert
  message TEXT NOT NULL,             -- 提醒訊息
  related_id INTEGER,                -- 相關任務或記錄 ID
  is_read BOOLEAN DEFAULT 0,
  priority TEXT DEFAULT 'normal',    -- low, normal, high
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,               -- 提醒過期時間
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_reminders_user ON user_reminders(user_id);
CREATE INDEX idx_user_reminders_type ON user_reminders(reminder_type);
CREATE INDEX idx_user_reminders_read ON user_reminders(is_read);

-- ============================================
-- 2. 工作量統計表
-- ============================================

CREATE TABLE IF NOT EXISTS user_workload_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  period TEXT NOT NULL,              -- 'YYYY-MM'
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  total_hours DECIMAL(6,2) DEFAULT 0,
  actual_hours DECIMAL(6,2) DEFAULT 0,
  avg_difficulty DECIMAL(3,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, period)
);

CREATE INDEX idx_workload_period ON user_workload_stats(period);
CREATE INDEX idx_workload_user ON user_workload_stats(user_id);

-- ============================================
-- 3. 擴展 system_parameters 表
-- ============================================

-- 檢查並添加新欄位
-- SQLite 不支持 IF NOT EXISTS for columns，需要用別的方式處理

-- 添加新欄位（如果不存在則添加）
ALTER TABLE system_parameters ADD COLUMN editor_type TEXT DEFAULT 'text';
ALTER TABLE system_parameters ADD COLUMN validation_rule TEXT;
ALTER TABLE system_parameters ADD COLUMN help_text TEXT;
ALTER TABLE system_parameters ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE system_parameters ADD COLUMN is_visible BOOLEAN DEFAULT 1;

-- 為現有參數設定預設值
UPDATE system_parameters 
SET editor_type = 'number' 
WHERE param_type = 'number' AND editor_type IS NULL;

UPDATE system_parameters 
SET editor_type = 'boolean' 
WHERE param_type = 'boolean' AND editor_type IS NULL;

-- ============================================
-- 4. 擴展 multi_stage_tasks 表
-- ============================================

ALTER TABLE multi_stage_tasks ADD COLUMN template_type TEXT;            -- 'global' 或 'custom'
ALTER TABLE multi_stage_tasks ADD COLUMN template_id INTEGER;
ALTER TABLE multi_stage_tasks ADD COLUMN template_version INTEGER;
ALTER TABLE multi_stage_tasks ADD COLUMN client_service_id INTEGER REFERENCES client_services(id);

-- ============================================
-- 5. 插入預設系統參數
-- ============================================

INSERT OR IGNORE INTO system_parameters (param_key, param_value, param_type, editor_type, description, category, help_text, display_order, is_visible)
VALUES
  -- 工時規則
  ('work_hours_per_day', '8', 'number', 'number', '每日標準工時', 'timesheet', '員工每日應工作時數', 1, 1),
  ('work_days_per_week', '5', 'number', 'number', '每週工作天數', 'timesheet', '標準工作週天數', 2, 1),
  ('overtime_rate_weekday', '1.34', 'number', 'number', '平日加班費率', 'timesheet', '勞基法規定平日延長工時費率', 3, 1),
  ('overtime_rate_weekend', '1.67', 'number', 'number', '休息日加班費率', 'timesheet', '勞基法規定休息日加班費率', 4, 1),
  ('overtime_rate_holiday', '2.00', 'number', 'number', '國定假日加班費率', 'timesheet', '勞基法規定國定假日加班費率', 5, 1),
  
  -- 年假規則
  ('annual_leave_enabled', 'true', 'boolean', 'boolean', '啟用年假管理', 'leave', '是否啟用年假自動計算', 10, 1),
  ('annual_leave_carryover_enabled', 'true', 'boolean', 'boolean', '允許年假結轉', 'leave', '是否允許未休年假結轉至次年', 11, 1),
  ('annual_leave_carryover_max_days', '5', 'number', 'number', '最多結轉天數', 'leave', '可結轉至次年的最大天數', 12, 1),
  ('annual_leave_expiry_month', '12', 'number', 'select', '結轉期限月份', 'leave', '結轉年假的使用期限（次年月份）', 13, 1),
  
  -- 自動化設定
  ('automation_enabled', 'true', 'boolean', 'boolean', '啟用任務自動生成', 'automation', '是否啟用客戶服務任務自動生成', 20, 1),
  ('automation_execution_time', '00:00', 'string', 'time', '自動生成執行時間', 'automation', 'GitHub Actions 執行時間（台北時間）', 21, 1),
  ('automation_default_advance_days', '7', 'number', 'number', '預設提前生成天數', 'automation', '任務提前生成的天數', 22, 1),
  ('automation_default_due_days', '15', 'number', 'number', '預設任務期限天數', 'automation', '任務的預設完成期限', 23, 1),
  
  -- 一般設定
  ('company_name', '霍爾果斯會計師事務所', 'string', 'text', '公司名稱', 'general', '顯示在系統各處的公司名稱', 30, 1),
  ('timezone', 'Asia/Taipei', 'string', 'select', '時區', 'general', '系統使用的時區', 31, 1);

-- ============================================
-- 6. 創建系統提醒生成函數的預設記錄
-- ============================================

-- 為所有活躍用戶創建年假到期提醒（範例）
INSERT OR IGNORE INTO user_reminders (user_id, reminder_type, message, priority, expires_at)
SELECT 
  u.id,
  'annual_leave_expiry',
  '您的年假即將到期，請盡快安排休假',
  'high',
  datetime('now', '+30 days')
FROM users u
WHERE u.role IN ('employee', 'accountant', 'admin')
  AND u.id NOT IN (SELECT user_id FROM user_reminders WHERE reminder_type = 'annual_leave_expiry');

-- ============================================
-- Migration 完成
-- ============================================

-- 記錄 migration
INSERT OR IGNORE INTO schema_migrations (version, description, executed_at)
VALUES (16, 'Enhanced System Features: Reminders, Workload Stats, System Parameters', CURRENT_TIMESTAMP);

