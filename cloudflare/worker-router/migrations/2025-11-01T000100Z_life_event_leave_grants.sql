-- Life Event Leave Grants (生活事件假期授予表)
-- 用於記錄婚假、喪假、產假、陪產假等生活事件產生的假期額度

CREATE TABLE IF NOT EXISTS LifeEventLeaveGrants (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,           -- marriage|funeral|maternity|paternity|other
  event_date TEXT NOT NULL,           -- 事件發生日期 (YYYY-MM-DD)
  leave_type TEXT NOT NULL,           -- 對應的假別類型
  days_granted REAL NOT NULL,         -- 授予的天數
  days_used REAL NOT NULL DEFAULT 0,  -- 已使用天數
  days_remaining REAL NOT NULL,       -- 剩餘天數
  valid_from TEXT NOT NULL,           -- 有效起始日 (YYYY-MM-DD)
  valid_until TEXT NOT NULL,          -- 有效截止日 (YYYY-MM-DD)
  notes TEXT,                         -- 備註（關係、說明等）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  created_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (days_remaining >= 0),
  CHECK (days_used >= 0),
  CHECK (days_granted > 0)
);

CREATE INDEX IF NOT EXISTS idx_life_event_user_status 
ON LifeEventLeaveGrants(user_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_life_event_type 
ON LifeEventLeaveGrants(event_type, event_date);

