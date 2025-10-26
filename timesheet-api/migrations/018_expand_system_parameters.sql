-- Migration 018: 擴展 system_parameters 資料表
-- 目的：添加網頁化配置管理所需的欄位
-- 日期：2025-10-26

-- 步驟 1: 創建新的 system_parameters_new 表（擴展結構）
CREATE TABLE IF NOT EXISTS system_parameters_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  param_key TEXT NOT NULL UNIQUE,        -- 參數鍵值
  param_value TEXT,                      -- 參數值
  param_type TEXT,                       -- string, number, boolean, json
  editor_type TEXT DEFAULT 'text',       -- 編輯器類型：text, number, boolean, select, textarea, time, date, email
  description TEXT,                      -- 參數說明
  category TEXT,                         -- 參數分類：timesheet, annual_leave, automation, general
  validation_rule TEXT,                  -- 驗證規則 JSON：{"min": 1, "max": 24, "required": true}
  help_text TEXT,                        -- 幫助提示文字
  display_order INTEGER DEFAULT 0,       -- 顯示順序
  is_editable BOOLEAN DEFAULT 1,         -- 是否可編輯
  is_visible BOOLEAN DEFAULT 1,          -- 是否在設定頁面顯示
  updated_by TEXT,                       -- 最後更新者
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 步驟 2: 遷移現有資料（如果舊表存在）
INSERT INTO system_parameters_new (
  param_key, param_value, param_type, description, category, 
  is_editable, updated_by, updated_at
)
SELECT 
  param_key, param_value, param_type, description, category,
  is_editable, updated_by, updated_at
FROM system_parameters;

-- 步驟 3: 刪除舊表
DROP TABLE system_parameters;

-- 步驟 4: 重命名新表
ALTER TABLE system_parameters_new RENAME TO system_parameters;

-- 步驟 5: 創建索引
CREATE INDEX idx_system_params_category ON system_parameters(category);
CREATE INDEX idx_system_params_visible ON system_parameters(is_visible);

-- 步驟 6: 更新現有參數，添加新欄位資訊
UPDATE system_parameters 
SET 
  editor_type = 'number',
  validation_rule = '{"min": 1, "max": 24, "step": 0.5}',
  help_text = '員工每日應工作的標準時數',
  display_order = 1,
  is_visible = 1
WHERE param_key = 'work_hours_per_day';

UPDATE system_parameters 
SET 
  editor_type = 'boolean',
  help_text = '是否啟用年假管理功能',
  display_order = 10,
  is_visible = 1
WHERE param_key = 'annual_leave_enabled';

UPDATE system_parameters 
SET 
  editor_type = 'boolean',
  help_text = '是否允許年假結轉至次年',
  display_order = 11,
  is_visible = 1
WHERE param_key = 'annual_leave_carryover_enabled';

UPDATE system_parameters 
SET 
  editor_type = 'number',
  validation_rule = '{"min": 0, "max": 30}',
  help_text = '最多可結轉的年假天數',
  display_order = 12,
  is_visible = 1
WHERE param_key = 'max_carryover_days';

-- 步驟 7: 插入預設的系統參數（如果不存在）
INSERT OR IGNORE INTO system_parameters (
  param_key, param_value, param_type, editor_type, description, category,
  validation_rule, help_text, display_order, is_visible
) VALUES
-- 工時規則
('work_hours_per_day', '8', 'number', 'number', '每日標準工時', 'timesheet',
 '{"min": 1, "max": 24, "step": 0.5}', '員工每日應工作的標準時數（小時）', 1, 1),
 
('work_days_per_week', '5', 'number', 'number', '每週工作天數', 'timesheet',
 '{"min": 1, "max": 7}', '每週工作天數', 2, 1),
 
('overtime_rate_weekday', '1.34', 'number', 'number', '平日加班費率', 'timesheet',
 '{"min": 1, "max": 3, "step": 0.01}', '平日延長工時倍率（勞基法規定）', 3, 1),
 
('overtime_rate_weekend', '1.67', 'number', 'number', '休息日加班費率', 'timesheet',
 '{"min": 1, "max": 3, "step": 0.01}', '休息日加班倍率', 4, 1),
 
('overtime_rate_holiday', '2.00', 'number', 'number', '國定假日加班費率', 'timesheet',
 '{"min": 1, "max": 3, "step": 0.01}', '國定假日加班倍率', 5, 1),

-- 年假規則
('annual_leave_enabled', 'true', 'boolean', 'boolean', '啟用年假管理', 'annual_leave',
 null, '是否啟用年假管理功能', 10, 1),
 
('annual_leave_carryover_enabled', 'true', 'boolean', 'boolean', '允許年假結轉', 'annual_leave',
 null, '是否允許年假結轉至次年', 11, 1),
 
('max_carryover_days', '5', 'number', 'number', '最多結轉天數', 'annual_leave',
 '{"min": 0, "max": 30}', '年假最多可結轉的天數', 12, 1),
 
('annual_leave_expiry_date', '12-31', 'string', 'text', '年假到期日', 'annual_leave',
 null, '年假到期日期（MM-DD格式）', 13, 1),

-- 自動化設定
('auto_task_generation_enabled', 'true', 'boolean', 'boolean', '啟用任務自動生成', 'automation',
 null, '是否啟用客戶服務任務自動生成', 20, 1),
 
('task_generation_time', '00:00', 'string', 'time', '任務生成時間', 'automation',
 null, '每日自動生成任務的時間（台北時間）', 21, 1),
 
('default_advance_days', '7', 'number', 'number', '預設提前天數', 'automation',
 '{"min": 1, "max": 30}', '任務提前生成的天數', 22, 1),
 
('default_due_days', '15', 'number', 'number', '預設任務期限', 'automation',
 '{"min": 1, "max": 90}', '任務預設期限天數', 23, 1),
 
('holiday_handling', 'advance', 'string', 'select', '遇假日處理方式', 'automation',
 '{"options": ["advance", "postpone", "skip"]}', '任務遇假日的處理方式：提前/延後/跳過', 24, 1),

-- 一般設定
('company_name', '霍爾果斯會計師事務所', 'string', 'text', '公司名稱', 'general',
 null, '公司完整名稱', 30, 1),
 
('system_timezone', 'Asia/Taipei', 'string', 'text', '系統時區', 'general',
 null, '系統使用的時區', 31, 1);

-- 完成提示
SELECT '✅ system_parameters 資料表已成功擴展，支援網頁化配置管理' AS message;

