-- 修复缺失的列（如果已存在会被忽略）
-- 使用 wrangler d1 execute 执行

-- 1. 为Services表添加service_sop_id（如果还不存在）
-- 注意：SQLite不支持IF NOT EXISTS，如果列已存在会报错，但不影响其他操作

-- 检查并添加service_sop_id
ALTER TABLE Services ADD COLUMN service_sop_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_services_sop ON Services(service_sop_id);

-- 2. 为SOPDocuments添加scope
ALTER TABLE SOPDocuments ADD COLUMN scope TEXT;
CREATE INDEX IF NOT EXISTS idx_sop_scope ON SOPDocuments(scope);

-- 3. 设置默认值
UPDATE SOPDocuments SET scope = 'task' WHERE scope IS NULL;

