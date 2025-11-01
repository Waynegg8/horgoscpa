-- 为任务模板添加默认期限规则字段

ALTER TABLE TaskTemplates ADD COLUMN default_due_date_rule TEXT CHECK(default_due_date_rule IN ('end_of_month', 'specific_day', 'next_month_day', 'days_after_start'));
ALTER TABLE TaskTemplates ADD COLUMN default_due_date_value INTEGER CHECK(default_due_date_value IS NULL OR (default_due_date_value >= 1 AND default_due_date_value <= 31));
ALTER TABLE TaskTemplates ADD COLUMN default_due_date_offset_days INTEGER DEFAULT 0;
ALTER TABLE TaskTemplates ADD COLUMN default_advance_days INTEGER DEFAULT 7 CHECK(default_advance_days >= 0);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_templates_due_rule ON TaskTemplates(default_due_date_rule);

