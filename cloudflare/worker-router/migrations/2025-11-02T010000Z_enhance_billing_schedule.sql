-- 增强收费明细表，支持一次性收费
-- 2025-11-02

-- 添加新字段以支持一次性收费和按月收费的区分
ALTER TABLE ServiceBillingSchedule ADD COLUMN billing_type TEXT DEFAULT 'monthly' CHECK(billing_type IN ('monthly', 'one-time'));
ALTER TABLE ServiceBillingSchedule ADD COLUMN billing_date TEXT;
ALTER TABLE ServiceBillingSchedule ADD COLUMN description TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);

-- 更新UNIQUE约束说明：
-- 原有的 UNIQUE(client_service_id, billing_month) 仍然有效
-- 对于 one-time 类型，billing_month 可以为 NULL 或 0
-- 对于 monthly 类型，billing_month 必须在 1-12 之间

