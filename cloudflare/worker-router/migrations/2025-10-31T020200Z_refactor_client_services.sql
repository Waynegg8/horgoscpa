-- 修改ClientServices表结构（不破坏外键约束）

-- 直接添加新字段
ALTER TABLE ClientServices ADD COLUMN service_cycle TEXT DEFAULT 'monthly';
ALTER TABLE ClientServices ADD COLUMN task_template_id INTEGER;
ALTER TABLE ClientServices ADD COLUMN auto_generate_tasks BOOLEAN DEFAULT 1;

-- 创建新索引
CREATE INDEX IF NOT EXISTS idx_client_services_cycle ON ClientServices(service_cycle);
CREATE INDEX IF NOT EXISTS idx_client_services_template ON ClientServices(task_template_id);

