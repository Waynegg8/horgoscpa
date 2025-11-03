-- 为ReceiptItems表添加代办费、规费、杂费字段
-- 2025-11-03

ALTER TABLE ReceiptItems ADD COLUMN service_fee REAL DEFAULT 0 CHECK(service_fee >= 0);
ALTER TABLE ReceiptItems ADD COLUMN government_fee REAL DEFAULT 0 CHECK(government_fee >= 0);
ALTER TABLE ReceiptItems ADD COLUMN miscellaneous_fee REAL DEFAULT 0 CHECK(miscellaneous_fee >= 0);

-- 更新现有数据：将unit_price * quantity的值设为service_fee
UPDATE ReceiptItems 
SET service_fee = unit_price * quantity,
    government_fee = 0,
    miscellaneous_fee = 0
WHERE service_fee = 0;

