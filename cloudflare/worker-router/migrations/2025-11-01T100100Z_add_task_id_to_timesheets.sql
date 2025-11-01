-- 为Timesheets表添加task_id字段
-- 用于关联工时到具体任务，进而关联到服务组成部分

ALTER TABLE Timesheets ADD COLUMN task_id INTEGER;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_timesheets_task ON Timesheets(task_id);

-- 创建联合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_timesheets_user_task ON Timesheets(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client_task ON Timesheets(client_id, task_id);

