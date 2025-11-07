-- 开票提醒表
-- 当服务任务完成时自动创建提醒
-- 支持暂缓开票（等其他服务完成）

CREATE TABLE IF NOT EXISTS BillingReminders (
  reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  service_month TEXT NOT NULL, -- YYYY-MM，服务月份
  suggested_amount REAL, -- 建议金额（从收费设定获取）
  status TEXT DEFAULT 'pending', -- pending/postponed/completed/cancelled
  postpone_reason TEXT, -- 暂缓原因
  postpone_until_services TEXT, -- 等待哪些服务完成（JSON array of service_ids）
  reminder_type TEXT DEFAULT 'task_completed', -- task_completed/scheduled
  created_by INTEGER, -- 谁触发的提醒（任务完成者）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT, -- 完成时间（开立收据时）
  completed_receipt_id TEXT, -- 关联的收据ID
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (completed_receipt_id) REFERENCES Receipts(receipt_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_client 
ON BillingReminders(client_id);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_status 
ON BillingReminders(status);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_service_month 
ON BillingReminders(service_month);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_pending 
ON BillingReminders(status, created_at) WHERE status = 'pending';

