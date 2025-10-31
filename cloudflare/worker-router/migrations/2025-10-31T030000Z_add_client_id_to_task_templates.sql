-- 为TaskTemplates表添加client_id字段，支持客户专属模板

ALTER TABLE TaskTemplates ADD COLUMN client_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_templates_client ON TaskTemplates(client_id);

-- 添加外键约束（如果数据库支持）
-- FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL

