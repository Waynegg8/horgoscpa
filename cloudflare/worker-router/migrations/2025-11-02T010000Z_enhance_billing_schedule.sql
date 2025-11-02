-- 增强收费明细表，支持一次性收费
-- 2025-11-02

-- 注意：以下字段已存在于数据库中：
-- - billing_type (已存在)
-- - billing_date (已存在)
-- - description (已存在)

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);

-- 更新UNIQUE约束说明：
-- 原有的 UNIQUE(client_service_id, billing_month) 仍然有效
-- 对于 one-time 类型，billing_month 可以为 NULL 或 0
-- 对于 monthly 类型，billing_month 必须在 1-12 之间

