-- 为 ClientServices 表添加收费相关字段

-- 添加服务收费字段
ALTER TABLE ClientServices ADD COLUMN monthly_fee REAL DEFAULT 0; -- 月度收费金额
ALTER TABLE ClientServices ADD COLUMN billing_frequency TEXT DEFAULT 'monthly'; -- 计费频率: monthly, quarterly, yearly, one-time
ALTER TABLE ClientServices ADD COLUMN billing_months_per_year INTEGER DEFAULT 12; -- 每年收费月数（如14个月）
ALTER TABLE ClientServices ADD COLUMN start_date TEXT; -- 服务开始日期 YYYY-MM-DD
ALTER TABLE ClientServices ADD COLUMN end_date TEXT; -- 服务结束日期 YYYY-MM-DD (NULL 表示持续)
ALTER TABLE ClientServices ADD COLUMN billing_day INTEGER DEFAULT 1; -- 每月扣款日期（1-31）
ALTER TABLE ClientServices ADD COLUMN service_notes TEXT; -- 服务备注

-- 添加索引提升查询效率
CREATE INDEX IF NOT EXISTS idx_client_services_billing ON ClientServices(billing_frequency);
CREATE INDEX IF NOT EXISTS idx_client_services_dates ON ClientServices(start_date, end_date);

