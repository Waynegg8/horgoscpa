-- ================================================
-- 完整 Schema + 初始資料整合版
-- 包含所有表格結構、規則與初始資料
-- ================================================

-- 員工表（含性別欄位）
CREATE TABLE IF NOT EXISTS employees (
  name TEXT PRIMARY KEY NOT NULL,
  hire_date TEXT NOT NULL,
  email TEXT,
  gender TEXT
);

-- 客戶表
CREATE TABLE IF NOT EXISTS clients (
  name TEXT PRIMARY KEY NOT NULL
);

-- 客戶指派表
CREATE TABLE IF NOT EXISTS client_assignments (
  employee_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  PRIMARY KEY (employee_name, client_name),
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (client_name) REFERENCES clients(name) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 業務類型表
CREATE TABLE IF NOT EXISTS business_types (
  type_name TEXT PRIMARY KEY NOT NULL
);

-- 假別類型表
CREATE TABLE IF NOT EXISTS leave_types (
  type_name TEXT PRIMARY KEY NOT NULL
);

-- 工時表（核心）
CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  client_name TEXT,
  work_date TEXT NOT NULL,
  day_of_week TEXT,
  work_year INTEGER,
  work_month INTEGER,
  hours_normal REAL DEFAULT 0,
  hours_ot_weekday_134 REAL DEFAULT 0,
  hours_ot_weekday_167 REAL DEFAULT 0,
  hours_ot_rest_134 REAL DEFAULT 0,
  hours_ot_rest_167 REAL DEFAULT 0,
  hours_ot_rest_267 REAL DEFAULT 0,
  hours_ot_offday_100 REAL DEFAULT 0,
  hours_ot_offday_200 REAL DEFAULT 0,
  hours_ot_holiday_100 REAL DEFAULT 0,
  hours_ot_holiday_134 REAL DEFAULT 0,
  hours_ot_holiday_167 REAL DEFAULT 0,
  leave_type TEXT,
  leave_hours REAL DEFAULT 0,
  business_type TEXT,
  weighted_hours REAL DEFAULT 0,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON UPDATE CASCADE,
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (business_type) REFERENCES business_types(type_name) ON UPDATE CASCADE,
  FOREIGN KEY (leave_type) REFERENCES leave_types(type_name) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON timesheets (employee_name, work_year, work_month);

-- 加班費率表
CREATE TABLE IF NOT EXISTS overtime_rates (
  rate_type TEXT NOT NULL,
  hour_start REAL NOT NULL,
  hour_end REAL NOT NULL,
  rate_multiplier REAL NOT NULL
);

-- 特休年資規則表
CREATE TABLE IF NOT EXISTS annual_leave_rules (
  seniority_years REAL PRIMARY KEY NOT NULL,
  leave_days REAL NOT NULL
);

-- 特休結轉表
CREATE TABLE IF NOT EXISTS annual_leave_carryover (
  employee_name TEXT PRIMARY KEY NOT NULL,
  carryover_days REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE
);

-- 其他假期規則表
CREATE TABLE IF NOT EXISTS other_leave_rules (
  leave_type TEXT PRIMARY KEY NOT NULL,
  leave_days REAL NOT NULL,
  grant_type TEXT NOT NULL
);

-- 假期事件表
CREATE TABLE IF NOT EXISTS leave_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  FOREIGN KEY (event_type) REFERENCES other_leave_rules(leave_type) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_events_employee_type ON leave_events (employee_name, event_type);

-- 系統參數表
CREATE TABLE IF NOT EXISTS system_parameters (
  param_name TEXT PRIMARY KEY NOT NULL,
  param_value REAL NOT NULL
);

-- 國定假日表
CREATE TABLE IF NOT EXISTS holidays (
  holiday_date TEXT PRIMARY KEY NOT NULL,
  holiday_name TEXT NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(employee_name);

-- 會話表
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ================================================
-- 初始資料（僅在表格為空時插入）
-- ================================================

-- 插入預設管理員（密碼: admin123）
INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', NULL, 1);



