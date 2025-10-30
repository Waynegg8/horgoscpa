-- Receipts minimal schema for list API

CREATE TABLE IF NOT EXISTS Receipts (
  receipt_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,
  due_date TEXT,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'unpaid',
  is_auto_generated BOOLEAN DEFAULT 1,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_receipts_client ON Receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON Receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_status_due ON Receipts(status, due_date);
CREATE INDEX IF NOT EXISTS idx_receipts_client_status ON Receipts(client_id, status);


