-- 增强Receipts表（添加类型和关联字段）

ALTER TABLE Receipts ADD COLUMN receipt_type TEXT DEFAULT 'normal';
-- normal: 正常收据（任务完成后）
-- advance: 预收款
-- deposit: 订金
-- final: 尾款

ALTER TABLE Receipts ADD COLUMN related_task_id INTEGER;
-- 关联任务ID（可空，预收时没有任务）

ALTER TABLE Receipts ADD COLUMN client_service_id INTEGER;
-- 关联客户服务（用于自动带入金额）

ALTER TABLE Receipts ADD COLUMN billing_month INTEGER CHECK(billing_month IS NULL OR (billing_month BETWEEN 1 AND 12));
-- 对应哪个月份的收费（1-12，用于匹配收费明细）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receipts_type ON Receipts(receipt_type);
CREATE INDEX IF NOT EXISTS idx_receipts_task ON Receipts(related_task_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service ON Receipts(client_service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_month ON Receipts(billing_month);

