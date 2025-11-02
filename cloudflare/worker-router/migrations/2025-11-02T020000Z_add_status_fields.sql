-- 添加 old_status 和 new_status 字段到 TaskStatusUpdates 表
ALTER TABLE TaskStatusUpdates ADD COLUMN old_status TEXT;
ALTER TABLE TaskStatusUpdates ADD COLUMN new_status TEXT;

-- 迁移现有数据：将 status 字段的值复制到 new_status
UPDATE TaskStatusUpdates SET new_status = status WHERE new_status IS NULL;

