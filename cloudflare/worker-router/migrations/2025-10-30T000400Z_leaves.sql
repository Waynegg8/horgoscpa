-- Leave requests and balances

CREATE TABLE IF NOT EXISTS LeaveRequests (
  leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,           -- annual/sick/personal/comp/... gender-limited in rules
  start_date TEXT NOT NULL,           -- YYYY-MM-DD
  end_date TEXT NOT NULL,             -- YYYY-MM-DD
  unit TEXT NOT NULL DEFAULT 'day',   -- day|half|hour
  amount REAL NOT NULL,               -- days or hours depending on unit
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by INTEGER,
  is_deleted BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_leaves_user ON LeaveRequests(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON LeaveRequests(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON LeaveRequests(start_date, end_date);

CREATE TABLE IF NOT EXISTS LeaveBalances (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  total REAL NOT NULL,
  used REAL NOT NULL DEFAULT 0,
  remain REAL NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, leave_type, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_bal_user_year ON LeaveBalances(user_id, year);


