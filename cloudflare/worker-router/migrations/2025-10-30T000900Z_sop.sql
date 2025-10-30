-- SOPDocuments（知識庫 SOP 文件）

CREATE TABLE IF NOT EXISTS SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,                         -- JSON 陣列字串，如 ["月結","報稅"]
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_published ON SOPDocuments(is_published);
CREATE INDEX IF NOT EXISTS idx_sop_category ON SOPDocuments(category);
CREATE INDEX IF NOT EXISTS idx_sop_creator ON SOPDocuments(created_by);


