-- 增强ActiveTasks表（添加服务关联和收据生成标记）

ALTER TABLE ActiveTasks ADD COLUMN can_generate_receipt BOOLEAN DEFAULT 0;
-- 是否可以生成收据（最后阶段完成后设为1）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_can_generate_receipt ON ActiveTasks(can_generate_receipt);
CREATE INDEX IF NOT EXISTS idx_tasks_client_service ON ActiveTasks(client_service_id);

