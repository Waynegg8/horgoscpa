-- Attachments (檔案附件)

CREATE TABLE IF NOT EXISTS Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,              -- client | receipt | sop | task
  entity_id TEXT NOT NULL,
  object_key TEXT NOT NULL,               -- R2 物件鍵（未來上傳/下載用）
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploader_user_id INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  CHECK (entity_type IN ('client','receipt','sop','task')),
  FOREIGN KEY (uploader_user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON Attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_attachments_filename ON Attachments(filename);


