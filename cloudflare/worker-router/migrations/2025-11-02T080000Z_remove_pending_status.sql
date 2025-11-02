-- 移除 pending 状态，统一使用 in_progress
-- 理由：待开始和进行中没有实质区别，简化状态管理

-- 1. 更新 ActiveTasks 表中所有 pending 状态为 in_progress
UPDATE ActiveTasks 
SET status = 'in_progress' 
WHERE status = 'pending';

-- 2. 更新 ActiveTaskStages 表中所有 pending 状态为 in_progress
UPDATE ActiveTaskStages 
SET status = 'in_progress' 
WHERE status = 'pending';

-- 注意：由于 SQLite 不支持 ALTER COLUMN DEFAULT，
-- 新的默认值将在应用层和后续迁移中处理

