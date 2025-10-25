-- ================================================
-- 新增使用者管理和會話管理功能
-- ================================================

-- 使用者表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
  employee_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE SET NULL
);

-- 會話表 (用於管理登入狀態)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(employee_name);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 插入預設管理員帳號 (密碼: admin123)
-- 注意: 實際部署時應該修改密碼
INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NULL, 1);

-- 為現有員工創建帳號 (預設密碼: employee123)
INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhuang', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', '莊凱閔', 1);

INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhang', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', '張紜蓁', 1);

INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('lu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', '呂柏澄', 1);

-- 清理過期會話的定期任務 (需要定期執行)
-- DELETE FROM sessions WHERE expires_at < datetime('now');

