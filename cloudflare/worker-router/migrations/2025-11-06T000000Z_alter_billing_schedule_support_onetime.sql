-- 強化 ServiceBillingSchedule：完整支援一次性收費
-- 變更點：
-- 1) 新結構：加入 billing_type/billing_date/description，放寬 billing_month 檢核
-- 2) 移除舊 UNIQUE(client_service_id, billing_month) 限制，改為「部分唯一索引」
--    - 月費：客戶+月份唯一（僅限 billing_type='monthly'）
--    - 一次性：客戶+日期+說明 唯一（僅限 billing_type='one-time'）
-- 3) 兼容舊資料：保留既有 schedule_id 與時間戳
-- 注意：Cloudflare D1 會自動處理事務，不需要 BEGIN/COMMIT

-- 建立新表（避免直接 ALTER 造成限制無法移除）
CREATE TABLE IF NOT EXISTS ServiceBillingSchedule_new (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_type IN ('monthly','one-time')),
  billing_month INTEGER NOT NULL DEFAULT 0 CHECK(billing_month BETWEEN 0 AND 12),
  billing_amount REAL NOT NULL CHECK(billing_amount >= 0),
  payment_due_days INTEGER DEFAULT 30 CHECK(payment_due_days > 0),
  billing_date TEXT,           -- YYYY-MM-DD，僅對 once 使用
  description TEXT,            -- 一次性收費項目名稱
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE
);

-- 將舊資料搬移到新表，並合理填補新欄位
INSERT INTO ServiceBillingSchedule_new (
  schedule_id, client_service_id, billing_type, billing_month,
  billing_amount, payment_due_days, billing_date, description,
  notes, created_at, updated_at
) 
SELECT 
  schedule_id,
  client_service_id,
  COALESCE(billing_type, 'monthly') AS billing_type,
  CASE 
    WHEN COALESCE(billing_type,'monthly')='monthly' THEN COALESCE(billing_month, 0)
    ELSE COALESCE(billing_month, 0)
  END AS billing_month,
  billing_amount,
  payment_due_days,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN billing_date ELSE NULL END AS billing_date,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN description ELSE NULL END AS description,
  notes, created_at, updated_at
FROM ServiceBillingSchedule;

-- 替換舊表
DROP TABLE ServiceBillingSchedule;
ALTER TABLE ServiceBillingSchedule_new RENAME TO ServiceBillingSchedule;

-- 唯一性規則（使用 Partial Index 達成條件唯一）
-- 月費：同客戶同月份只允許一筆
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_monthly
ON ServiceBillingSchedule(client_service_id, billing_month)
WHERE billing_type = 'monthly';

-- 一次性：同客戶+同日期+同說明 只允許一筆（避免重複）
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_onetime
ON ServiceBillingSchedule(client_service_id, billing_date, description)
WHERE billing_type = 'one-time';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_service ON ServiceBillingSchedule(client_service_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_month ON ServiceBillingSchedule(billing_month);

