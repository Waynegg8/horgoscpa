-- Timesheets（工時記錄）

CREATE TABLE IF NOT EXISTS Timesheets (
  timesheet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,              -- YYYY-MM-DD
  client_id TEXT,                       -- 可為空（非客戶工時）
  service_name TEXT,                    -- 服務名稱文字（簡化）
  work_type TEXT NOT NULL,              -- normal | ot-weekday | ot-rest | holiday | etc.
  hours REAL NOT NULL,                  -- 0.5 的倍數
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON Timesheets(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON Timesheets(client_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_type ON Timesheets(work_type);


