-- Add deleted_at and deleted_by fields to LeaveRequests for audit trail
-- 跳过：字段已存在（可能在之前的迁移中已添加）

-- 仅创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_leaves_deleted ON LeaveRequests(is_deleted);

