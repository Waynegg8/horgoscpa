-- 创建内部常见问答表
-- 2025-11-01

CREATE TABLE IF NOT EXISTS InternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,  -- 与SOP共用分类：accounting, tax, business, internal
  tags TEXT,      -- JSON 数组字串，如 ["月结","报税"]
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_internal_faq_category ON InternalFAQ(category);
CREATE INDEX IF NOT EXISTS idx_internal_faq_deleted ON InternalFAQ(is_deleted);
CREATE INDEX IF NOT EXISTS idx_internal_faq_created_by ON InternalFAQ(created_by);

