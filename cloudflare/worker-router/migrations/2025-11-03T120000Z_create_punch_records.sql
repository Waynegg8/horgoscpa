-- 打卡記錄上傳表
CREATE TABLE IF NOT EXISTS PunchRecords (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM 格式
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL, -- R2存儲的key
  file_size_bytes INTEGER NOT NULL,
  file_type TEXT, -- MIME type
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, deleted
  uploaded_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_punch_records_user ON PunchRecords(user_id);
CREATE INDEX IF NOT EXISTS idx_punch_records_month ON PunchRecords(month);
CREATE INDEX IF NOT EXISTS idx_punch_records_status ON PunchRecords(status);

