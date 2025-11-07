-- 添加用户个人资料字段（到职日、性别）
-- 这些字段用于计算假期额度和判断性别专属假期

-- 添加到职日字段
ALTER TABLE Users ADD COLUMN hire_date TEXT;

-- 添加性别字段
ALTER TABLE Users ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female', NULL));

-- 为Settings表添加分类字段
ALTER TABLE Settings ADD COLUMN setting_category TEXT DEFAULT 'general';

-- 创建分类索引
CREATE INDEX IF NOT EXISTS idx_settings_category ON Settings(setting_category);

-- 更新现有设置为系统分类
UPDATE Settings SET setting_category = 'system' WHERE setting_key IN (
  'company_name', 'contact_email', 'timezone', 'currency', 
  'timesheet_min_unit', 'soft_delete_enabled', 'workday_start', 
  'workday_end', 'report_locale', 'rule_comp_hours_expiry',
  'attendance_bonus_amount', 'overhead_cost_per_hour', 'target_profit_margin'
);

