-- 为Receipts表添加服务期间字段，支持跨月服务
-- service_start_month: 服务开始月份 (YYYY-MM)
-- service_end_month: 服务结束月份 (YYYY-MM)
-- 如果是单月服务，两者相同；如果是多月服务（如季度），则为期间范围

ALTER TABLE Receipts ADD COLUMN service_start_month TEXT;
ALTER TABLE Receipts ADD COLUMN service_end_month TEXT;

-- 为现有数据填充默认值：使用现有的service_month
UPDATE Receipts 
SET service_start_month = service_month,
    service_end_month = service_month
WHERE service_month IS NOT NULL;

-- 为没有service_month的旧数据填充（使用receipt_date的年月）
UPDATE Receipts 
SET service_start_month = substr(receipt_date, 1, 7),
    service_end_month = substr(receipt_date, 1, 7),
    service_month = substr(receipt_date, 1, 7)
WHERE service_month IS NULL;

