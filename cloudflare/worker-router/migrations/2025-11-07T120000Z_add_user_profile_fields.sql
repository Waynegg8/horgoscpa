-- 为Settings表添加分类字段
-- 注意：Users表中已经包含了gender和start_date字段，无需重复添加

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

