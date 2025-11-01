-- 收据明细表（支持多项服务）
CREATE TABLE IF NOT EXISTS ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  subtotal REAL NOT NULL CHECK(subtotal >= 0),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- 收款记录表
CREATE TABLE IF NOT EXISTS Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  payment_amount REAL NOT NULL CHECK(payment_amount > 0),
  payment_method TEXT DEFAULT 'transfer', -- cash/transfer/check/other
  reference_number TEXT,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON Payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON Payments(is_deleted);

-- 为Receipts表添加已收款金额字段（用于快速查询）
ALTER TABLE Receipts ADD COLUMN paid_amount REAL DEFAULT 0 CHECK(paid_amount >= 0);

-- 更新现有收据的paid_amount（全部为0）
UPDATE Receipts SET paid_amount = 0 WHERE paid_amount IS NULL;

