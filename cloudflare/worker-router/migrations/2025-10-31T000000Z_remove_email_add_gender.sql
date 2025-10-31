-- Remove email field (make it optional by removing NOT NULL constraint)
-- Gender already exists in the original schema
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- 1. Create new table without email requirement
CREATE TABLE Users_new (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,  -- Nullable
  gender TEXT,  -- Already exists, nullable
  birth_date TEXT,
  start_date TEXT,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT 0,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  login_attempts INTEGER DEFAULT 0,
  last_failed_login TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER
);

-- 2. Copy data from old table (excluding email column)
INSERT INTO Users_new (
  user_id, username, password_hash, name, gender, birth_date, start_date, phone, address,
  is_admin, emergency_contact_name, emergency_contact_phone, 
  login_attempts, last_failed_login, last_login,
  created_at, updated_at, is_deleted, deleted_at, deleted_by
)
SELECT 
  user_id, username, password_hash, name, gender, birth_date, start_date, phone, address,
  is_admin, emergency_contact_name, emergency_contact_phone,
  login_attempts, last_failed_login, last_login,
  created_at, updated_at, is_deleted, deleted_at, deleted_by
FROM Users;

-- 3. Drop old table
DROP TABLE Users;

-- 4. Rename new table
ALTER TABLE Users_new RENAME TO Users;

-- 5. Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON Users(is_admin);

