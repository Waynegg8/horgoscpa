-- 添加一次性收费支持
-- 2025-11-01

-- 1. 添加收费类型字段
ALTER TABLE ServiceBillingSchedule ADD COLUMN billing_type TEXT DEFAULT 'monthly' CHECK(billing_type IN ('monthly', 'one-time'));

-- 2. 添加一次性收费日期字段
ALTER TABLE ServiceBillingSchedule ADD COLUMN billing_date TEXT;

-- 3. 添加描述字段（用于一次性收费的说明，如"設立費"、"顧問費"等）
ALTER TABLE ServiceBillingSchedule ADD COLUMN description TEXT;

-- 注意：SQLite 不支持直接修改约束，所以我们需要在应用层处理以下逻辑：
-- - billing_type = 'monthly' 时，billing_month 必须在 1-12 之间
-- - billing_type = 'one-time' 时，billing_month 可以为 0 或 NULL，billing_date 必填
-- - UNIQUE 约束：monthly 类型按 (client_service_id, billing_month)，one-time 类型按 (client_service_id, description, billing_date)

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_date ON ServiceBillingSchedule(billing_date);

