-- 添加 service_month 到 Receipts 表用于关联任务

ALTER TABLE Receipts ADD COLUMN service_month TEXT;
-- 服务月份（格式：YYYY-MM，用于关联 ActiveTasks）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receipts_service_month ON Receipts(service_month);

-- 从现有数据填充 service_month（基于 receipt_date 和 billing_month）
-- 如果 billing_month 存在，使用 receipt_date 的年份 + billing_month
-- 否则使用 receipt_date 的年月
UPDATE Receipts 
SET service_month = CASE 
  WHEN billing_month IS NOT NULL AND billing_month BETWEEN 1 AND 12 
    THEN substr(receipt_date, 1, 4) || '-' || printf('%02d', billing_month)
  ELSE substr(receipt_date, 1, 7)
END
WHERE service_month IS NULL;

