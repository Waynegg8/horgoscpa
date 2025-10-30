-- 客戶管理基礎結構（列表 API 依賴）

-- Clients
CREATE TABLE IF NOT EXISTS Clients (
  client_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  tax_registration_number TEXT,
  business_status TEXT DEFAULT '營業中',
  assignee_user_id INTEGER NOT NULL,
  phone TEXT,
  email TEXT,
  client_notes TEXT,
  payment_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_clients_assignee ON Clients(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON Clients(company_name);

-- CustomerTags
CREATE TABLE IF NOT EXISTS CustomerTags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT UNIQUE NOT NULL,
  tag_color TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ClientTagAssignments
CREATE TABLE IF NOT EXISTS ClientTagAssignments (
  assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES CustomerTags(tag_id),
  UNIQUE(client_id, tag_id)
);


