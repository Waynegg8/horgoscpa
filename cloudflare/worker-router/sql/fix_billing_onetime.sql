-- One-time billing structural upgrade without explicit transaction (for D1 execute)
DROP TABLE IF EXISTS ServiceBillingSchedule_new;

CREATE TABLE IF NOT EXISTS ServiceBillingSchedule_new (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_type IN ('monthly','one-time')),
  billing_month INTEGER NOT NULL DEFAULT 0 CHECK(billing_month BETWEEN 0 AND 12),
  billing_amount REAL NOT NULL CHECK(billing_amount >= 0),
  payment_due_days INTEGER DEFAULT 30 CHECK(payment_due_days > 0),
  billing_date TEXT,
  description TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE
);

INSERT INTO ServiceBillingSchedule_new (
  schedule_id, client_service_id, billing_type, billing_month, billing_amount, payment_due_days, billing_date, description, notes, created_at, updated_at
)
SELECT 
  schedule_id,
  client_service_id,
  COALESCE(billing_type,'monthly') AS billing_type,
  COALESCE(billing_month,0) AS billing_month,
  billing_amount,
  payment_due_days,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN billing_date ELSE NULL END AS billing_date,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN description ELSE NULL END AS description,
  notes, created_at, updated_at
FROM ServiceBillingSchedule;

DROP TABLE ServiceBillingSchedule;
ALTER TABLE ServiceBillingSchedule_new RENAME TO ServiceBillingSchedule;

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_monthly
ON ServiceBillingSchedule(client_service_id, billing_month)
WHERE billing_type = 'monthly';

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_onetime
ON ServiceBillingSchedule(client_service_id, billing_date, description)
WHERE billing_type = 'one-time';

CREATE INDEX IF NOT EXISTS idx_billing_schedule_service ON ServiceBillingSchedule(client_service_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_month ON ServiceBillingSchedule(billing_month);

