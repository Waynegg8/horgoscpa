-- 为ServiceComponentTasks表添加任务配置字段

ALTER TABLE ServiceComponentTasks ADD COLUMN due_rule TEXT DEFAULT 'end_of_month';
ALTER TABLE ServiceComponentTasks ADD COLUMN due_value INTEGER;
ALTER TABLE ServiceComponentTasks ADD COLUMN estimated_hours REAL;
ALTER TABLE ServiceComponentTasks ADD COLUMN advance_days INTEGER DEFAULT 7;

