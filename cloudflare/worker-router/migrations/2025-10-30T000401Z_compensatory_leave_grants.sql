-- Compensatory Leave Grants (補休追蹤表)
-- 用於追蹤每筆補休的產生、使用與到期

CREATE TABLE IF NOT EXISTS CompensatoryLeaveGrants (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_timelog_id INTEGER,          -- 來源工時記錄 ID（關聯到 Timesheets）
  hours_generated REAL NOT NULL,      -- 產生的補休時數
  hours_used REAL NOT NULL DEFAULT 0, -- 已使用時數
  hours_remaining REAL NOT NULL,      -- 剩餘時數
  generated_date TEXT NOT NULL,       -- 產生日期（YYYY-MM-DD）
  expiry_date TEXT NOT NULL,          -- 到期日（當月底 YYYY-MM-DD）
  original_rate REAL,                 -- 原始費率（用於轉加班費計算）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (source_timelog_id) REFERENCES Timesheets(log_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (hours_remaining >= 0),
  CHECK (hours_used >= 0),
  CHECK (hours_generated > 0)
);

-- 索引：查詢用戶的有效補休
CREATE INDEX IF NOT EXISTS idx_comp_leave_user_status 
ON CompensatoryLeaveGrants(user_id, status, generated_date);

-- 索引：到期轉加班費 Cron Job 使用
CREATE INDEX IF NOT EXISTS idx_comp_leave_expiry 
ON CompensatoryLeaveGrants(expiry_date, status);

-- 補休到期轉加班費記錄表
CREATE TABLE IF NOT EXISTS CompensatoryOvertimePay (
  pay_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,           -- 記入的薪資月份（YYYY-MM）
  hours_expired REAL NOT NULL,        -- 到期的補休時數
  amount_cents INTEGER NOT NULL,      -- 轉換的加班費（分）
  source_grant_ids TEXT,              -- 來源 grant_id 列表（JSON array）
  processed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_overtime_pay_user_month 
ON CompensatoryOvertimePay(user_id, year_month);







