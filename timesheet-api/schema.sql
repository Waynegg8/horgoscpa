/* ---------------------------------- */
/* 核心資料表：工時紀錄資料庫 (tbl_TimeLog) */
/* ---------------------------------- */
DROP TABLE IF EXISTS timesheets;
CREATE TABLE timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  client_name TEXT, 
  work_date TEXT NOT NULL,     -- 格式: 'YYYY-MM-DD'
  day_of_week TEXT,            -- 星期
  work_year INTEGER,
  work_month INTEGER,
  
  -- 工時 (對應 VBA 欄位 7-17)
  hours_normal REAL DEFAULT 0,
  hours_ot_weekday_134 REAL DEFAULT 0, -- 平日加班(1.34)
  hours_ot_weekday_167 REAL DEFAULT 0, -- 平日加班(1.67)
  hours_ot_rest_134 REAL DEFAULT 0,    -- 休息日加班(1.34)
  hours_ot_rest_167 REAL DEFAULT 0,    -- 休息日加班(1.67)
  hours_ot_rest_267 REAL DEFAULT 0,    -- 休息日加班(2.67)
  hours_ot_offday_100 REAL DEFAULT 0,  -- 本月例假日加班
  hours_ot_offday_200 REAL DEFAULT 0,  -- 本月例假日加班(2)
  hours_ot_holiday_100 REAL DEFAULT 0, -- 本月國定假日加班
  hours_ot_holiday_134 REAL DEFAULT 0, -- 本月國定假日加班(1.34)
  hours_ot_holiday_167 REAL DEFAULT 0, -- 本月國定假日加班(1.67)
  
  -- 請假 (對應 VBA 欄位 18-19)
  leave_type TEXT,
  leave_hours REAL DEFAULT 0,
  
  -- 其他 (對應 VBA 欄位 20-21)
  business_type TEXT,
  weighted_hours REAL DEFAULT 0,
  
  -- 建立索引以加快查詢速度
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON UPDATE CASCADE,
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (business_type) REFERENCES business_types(type_name) ON UPDATE CASCADE,
  FOREIGN KEY (leave_type) REFERENCES leave_types(type_name) ON UPDATE CASCADE
);

-- 建立索引來優化查詢
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON timesheets (employee_name, work_year, work_month);


/* ---------------------------------- */
/* 輔助資料表：員工資料庫 (tbl_Employees) */
/* ---------------------------------- */
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
  name TEXT PRIMARY KEY NOT NULL, -- 員工姓名
  hire_date TEXT NOT NULL,        -- 到職日期 (格式: 'YYYY-MM-DD')
  email TEXT,
  gender TEXT                     -- 性別：'male' | 'female' | NULL
);


/* ---------------------------------- */
/* 輔助資料表：客戶資料庫 (來自您的 客戶資料庫.csv) */
/* ---------------------------------- */
DROP TABLE IF EXISTS clients;
CREATE TABLE clients (
  name TEXT PRIMARY KEY NOT NULL -- 客戶名稱
  -- 如果您的客戶資料庫還有其他欄位，我們可以未來再補上
);


/* ---------------------------------- */
/* 輔助資料表：客戶指派 (tbl_ClientAssignments) */
/* ---------------------------------- */
DROP TABLE IF EXISTS client_assignments;
CREATE TABLE client_assignments (
  employee_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  PRIMARY KEY (employee_name, client_name),
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  FOREIGN KEY (client_name) REFERENCES clients(name) ON DELETE CASCADE
);


/* ---------------------------------- */
/* 輔助資料表：業務類型 (tbl_BusinessTypes) */
/* ---------------------------------- */
DROP TABLE IF EXISTS business_types;
CREATE TABLE business_types (
  type_name TEXT PRIMARY KEY NOT NULL -- 業務類型
);


/* ---------------------------------- */
/* 輔助資料表：假別類型 (tbl_LeaveTypes) */
/* ---------------------------------- */
DROP TABLE IF EXISTS leave_types;
CREATE TABLE leave_types (
  type_name TEXT PRIMARY KEY NOT NULL -- 假別類型
);