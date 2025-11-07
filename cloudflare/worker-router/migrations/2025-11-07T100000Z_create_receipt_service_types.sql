-- 收据-服务类型关联表
-- 支持一张收据包含多个服务类型（如套餐）

CREATE TABLE IF NOT EXISTS ReceiptServiceTypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_service_types_receipt 
ON ReceiptServiceTypes(receipt_id);

CREATE INDEX IF NOT EXISTS idx_receipt_service_types_service 
ON ReceiptServiceTypes(service_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_service_types_unique 
ON ReceiptServiceTypes(receipt_id, service_id);

