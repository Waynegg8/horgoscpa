-- 创建服务收费明细表
CREATE TABLE IF NOT EXISTS ServiceBillingSchedule (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  billing_month INTEGER NOT NULL CHECK(billing_month BETWEEN 1 AND 12),
  billing_amount REAL NOT NULL CHECK(billing_amount >= 0),
  payment_due_days INTEGER DEFAULT 30 CHECK(payment_due_days > 0),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  UNIQUE(client_service_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_service ON ServiceBillingSchedule(client_service_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_month ON ServiceBillingSchedule(billing_month);

