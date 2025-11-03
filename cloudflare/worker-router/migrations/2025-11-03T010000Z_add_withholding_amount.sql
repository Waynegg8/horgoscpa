-- 为Receipts表添加扣缴金额字段
-- 2025-11-03

ALTER TABLE Receipts ADD COLUMN withholding_amount REAL DEFAULT 0 CHECK(withholding_amount >= 0);

-- 更新现有收据的扣缴金额为0
UPDATE Receipts SET withholding_amount = 0 WHERE withholding_amount IS NULL;

