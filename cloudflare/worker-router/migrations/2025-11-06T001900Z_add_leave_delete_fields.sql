-- Add deleted_at and deleted_by fields to LeaveRequests for audit trail

ALTER TABLE LeaveRequests ADD COLUMN deleted_at TEXT;
ALTER TABLE LeaveRequests ADD COLUMN deleted_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_leaves_deleted ON LeaveRequests(is_deleted);

