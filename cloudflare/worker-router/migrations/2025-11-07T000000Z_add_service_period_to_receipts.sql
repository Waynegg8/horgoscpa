-- 为Receipts表添加服务期间字段，支持跨月服务
-- 跳过：字段已存在（已在之前执行）

-- 仅确保数据已填充（如果有未填充的）
UPDATE Receipts 
SET service_start_month = COALESCE(service_start_month, service_month, substr(receipt_date, 1, 7)),
    service_end_month = COALESCE(service_end_month, service_month, substr(receipt_date, 1, 7))
WHERE service_start_month IS NULL OR service_end_month IS NULL;

