-- ActiveTasks 表增加字段：支持依赖关系、期限调整、状态说明

-- 依赖关系
ALTER TABLE ActiveTasks ADD COLUMN prerequisite_task_id INTEGER;
-- 前置任务ID（任务依赖）

-- 工作量评估
ALTER TABLE ActiveTasks ADD COLUMN estimated_work_days INTEGER DEFAULT 3;
-- 预估工作天数（用于自动调整到期日）

ALTER TABLE ActiveTasks ADD COLUMN original_due_date TEXT;
-- 原始到期日（保留历史记录）

-- 期限调整
ALTER TABLE ActiveTasks ADD COLUMN due_date_adjusted BOOLEAN DEFAULT 0;
-- 到期日是否被调整过

ALTER TABLE ActiveTasks ADD COLUMN adjustment_reason TEXT;
-- 调整原因

ALTER TABLE ActiveTasks ADD COLUMN adjustment_count INTEGER DEFAULT 0;
-- 调整次数统计

ALTER TABLE ActiveTasks ADD COLUMN last_adjustment_date TEXT;
-- 最后调整日期

ALTER TABLE ActiveTasks ADD COLUMN can_start_date TEXT;
-- 实际可以开始的日期（前置任务完成日期）

-- 状态说明
ALTER TABLE ActiveTasks ADD COLUMN status_note TEXT;
-- 状态说明/进度说明

ALTER TABLE ActiveTasks ADD COLUMN blocker_reason TEXT;
-- 阻塞原因（如果任务被阻塞）

ALTER TABLE ActiveTasks ADD COLUMN overdue_reason TEXT;
-- 逾期原因（如果任务逾期）

ALTER TABLE ActiveTasks ADD COLUMN last_status_update TEXT;
-- 最后更新状态说明的时间

ALTER TABLE ActiveTasks ADD COLUMN expected_completion_date TEXT;
-- 预计完成日期

ALTER TABLE ActiveTasks ADD COLUMN is_overdue BOOLEAN DEFAULT 0;
-- 是否逾期（快速查询）

ALTER TABLE ActiveTasks ADD COLUMN completed_at TEXT;
-- 完成时间（用于计算前置任务完成时间）

ALTER TABLE ActiveTasks ADD COLUMN component_id INTEGER;
-- 关联到服务组成

-- 注意：service_month 已在 2025-11-01T220000Z_add_service_month.sql 中添加

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_active_tasks_prerequisite ON ActiveTasks(prerequisite_task_id);
CREATE INDEX IF NOT EXISTS idx_active_tasks_overdue ON ActiveTasks(is_overdue);
CREATE INDEX IF NOT EXISTS idx_active_tasks_completed_at ON ActiveTasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_active_tasks_adjustment_date ON ActiveTasks(last_adjustment_date);
CREATE INDEX IF NOT EXISTS idx_active_tasks_component ON ActiveTasks(component_id);
-- 注意：idx_active_tasks_service_month 已在 2025-11-01T220000Z_add_service_month.sql 中创建

