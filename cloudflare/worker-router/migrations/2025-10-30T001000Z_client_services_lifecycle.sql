-- ClientServices lifecycle columns

ALTER TABLE ClientServices ADD COLUMN suspended_at TEXT;
ALTER TABLE ClientServices ADD COLUMN resumed_at TEXT;
ALTER TABLE ClientServices ADD COLUMN suspension_reason TEXT;
ALTER TABLE ClientServices ADD COLUMN suspension_effective_date TEXT; -- YYYY-MM-DD
ALTER TABLE ClientServices ADD COLUMN auto_renew BOOLEAN DEFAULT 1;
ALTER TABLE ClientServices ADD COLUMN cancelled_at TEXT;
ALTER TABLE ClientServices ADD COLUMN cancelled_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_client_services_status ON ClientServices(status);
CREATE INDEX IF NOT EXISTS idx_client_services_suspend_effective ON ClientServices(suspension_effective_date);

-- ServiceChangeHistory table
CREATE TABLE IF NOT EXISTS ServiceChangeHistory (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  reason TEXT,
  notes TEXT,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_change_service ON ServiceChangeHistory(client_service_id);
CREATE INDEX IF NOT EXISTS idx_service_change_date ON ServiceChangeHistory(changed_at);


