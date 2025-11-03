-- 薪资系统设定表
CREATE TABLE IF NOT EXISTS PayrollSettings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL, -- 'number', 'text', 'boolean'
  category TEXT NOT NULL, -- 'meal', 'transport', 'leave', 'general'
  display_name TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

-- 插入默认设定
INSERT INTO PayrollSettings (setting_key, setting_value, setting_type, category, display_name, description) VALUES
-- 误餐费设定
('meal_allowance_per_time', '100', 'number', 'meal', '误餐费单价（元/次）', '平日加班满1.5小时发放'),
('meal_allowance_min_overtime_hours', '1.5', 'number', 'meal', '误餐费最低加班时数', '达到此时数才发放误餐费'),

-- 交通补贴设定
('transport_rate_per_km', '5', 'number', 'transport', '交通补贴单价（元/公里）', '外出交通按公里数计算'),

-- 请假扣款设定
('sick_leave_deduction_rate', '1.0', 'number', 'leave', '病假扣款比例', '1.0 = 全额扣除，0.5 = 扣除50%'),
('personal_leave_deduction_rate', '1.0', 'number', 'leave', '事假扣款比例', '1.0 = 全额扣除'),
('leave_daily_salary_divisor', '30', 'number', 'leave', '日薪计算除数', '底薪除以此数字得到日薪'),

-- 加班费设定
('overtime_1_5x_multiplier', '1.5', 'number', 'general', '平日加班费倍率', '平日延长工时加班费倍率'),
('overtime_2x_multiplier', '2.0', 'number', 'general', '休息日加班费倍率', '休息日工作加班费倍率'),
('overtime_3x_multiplier', '3.0', 'number', 'general', '国定假日加班费倍率', '国定假日工作加班费倍率'),

-- 时薪计算设定
('hourly_rate_divisor', '240', 'number', 'general', '时薪计算除数', '(底薪+经常性给与)除以此数字得到时薪');

CREATE INDEX IF NOT EXISTS idx_payroll_settings_category ON PayrollSettings(category);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_key ON PayrollSettings(setting_key);

