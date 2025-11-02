-- 为ServiceComponentTasks表添加任务配置字段
-- 2025-11-02

-- 添加期限规则字段
ALTER TABLE ServiceComponentTasks ADD COLUMN due_rule TEXT DEFAULT 'end_of_month';

-- 添加期限值字段
ALTER TABLE ServiceComponentTasks ADD COLUMN due_value INTEGER;

-- 添加预估工时字段
ALTER TABLE ServiceComponentTasks ADD COLUMN estimated_hours REAL;

-- 添加提前天数字段
ALTER TABLE ServiceComponentTasks ADD COLUMN advance_days INTEGER DEFAULT 7;

