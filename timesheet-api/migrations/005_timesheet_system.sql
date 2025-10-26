-- ================================================================
-- Migration 005: 工時管理系統
-- 創建日期: 2025-10-26
-- 說明: 工時記錄、請假、年假、加班等
-- 依賴: 001_core_tables.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS leave_events;
DROP TABLE IF EXISTS annual_leave_carryover;
DROP TABLE IF EXISTS annual_leave_rules;
DROP TABLE IF EXISTS other_leave_rules;
DROP TABLE IF EXISTS overtime_rates;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS business_types;

-- ----------------------------------------------------------------
-- 1. timesheets（工時記錄）
-- ----------------------------------------------------------------

CREATE TABLE timesheets (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯
    employee_id INTEGER NOT NULL,
    client_id INTEGER,
    
    -- 日期
    date DATE NOT NULL,
    
    -- 工時
    regular_hours REAL DEFAULT 0,
    overtime_hours REAL DEFAULT 0,
    
    -- 工時類型
    work_type TEXT,
    business_type TEXT,
    
    -- 狀態
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')),
    
    -- 審核
    approved_by_user_id INTEGER,
    approved_at DATETIME,
    
    -- 備註
    notes TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 唯一約束：一個員工一天對一個客戶只能有一筆記錄
    UNIQUE(employee_id, date, client_id, work_type, business_type)
);

-- 索引
CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_timesheets_client ON timesheets(client_id);
CREATE INDEX idx_timesheets_date ON timesheets(date);
CREATE INDEX idx_timesheets_status ON timesheets(status);

-- ----------------------------------------------------------------
-- 2. leave_types（請假類型）
-- ----------------------------------------------------------------

CREATE TABLE leave_types (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 類型信息
    type_name TEXT NOT NULL UNIQUE,
    type_code TEXT NOT NULL UNIQUE,
    
    -- 是否計入年假
    is_paid BOOLEAN DEFAULT 1,
    requires_approval BOOLEAN DEFAULT 1,
    
    -- 配額（天數）
    annual_quota REAL DEFAULT 0,
    
    -- 說明
    description TEXT,
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_leave_types_code ON leave_types(type_code);
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);

-- ----------------------------------------------------------------
-- 3. leave_events（請假記錄）
-- ----------------------------------------------------------------

CREATE TABLE leave_events (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    
    -- 日期和時數
    date DATE NOT NULL,
    hours REAL NOT NULL,
    
    -- 原因
    reason TEXT,
    
    -- 審核
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    approved_by_user_id INTEGER,
    approved_at DATETIME,
    rejection_reason TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_leave_events_employee ON leave_events(employee_id);
CREATE INDEX idx_leave_events_date ON leave_events(date);
CREATE INDEX idx_leave_events_type ON leave_events(leave_type_id);
CREATE INDEX idx_leave_events_status ON leave_events(status);

-- ----------------------------------------------------------------
-- 4. annual_leave_rules（年假規則）
-- ----------------------------------------------------------------

CREATE TABLE annual_leave_rules (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 年資範圍
    min_years REAL NOT NULL,
    max_years REAL,
    
    -- 年假天數
    days REAL NOT NULL,
    
    -- 說明
    description TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_annual_leave_rules_years ON annual_leave_rules(min_years, max_years);

-- ----------------------------------------------------------------
-- 5. annual_leave_carryover（年假結轉）
-- ----------------------------------------------------------------

CREATE TABLE annual_leave_carryover (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯員工
    employee_id INTEGER NOT NULL,
    
    -- 年度
    year INTEGER NOT NULL,
    
    -- 年假統計
    entitled_days REAL DEFAULT 0,      -- 應得天數
    used_days REAL DEFAULT 0,          -- 已用天數
    remaining_days REAL DEFAULT 0,     -- 剩餘天數
    carryover_days REAL DEFAULT 0,     -- 結轉天數
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    
    -- 唯一約束：一個員工一年只能有一筆記錄
    UNIQUE(employee_id, year)
);

-- 索引
CREATE INDEX idx_annual_leave_carryover_employee ON annual_leave_carryover(employee_id);
CREATE INDEX idx_annual_leave_carryover_year ON annual_leave_carryover(year);

-- ----------------------------------------------------------------
-- 6. overtime_rates（加班費率）
-- ----------------------------------------------------------------

CREATE TABLE overtime_rates (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 費率信息
    work_type TEXT NOT NULL UNIQUE,
    rate REAL NOT NULL,
    
    -- 說明
    description TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- 7. holidays（國定假日）
-- ----------------------------------------------------------------

CREATE TABLE holidays (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 假日信息
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name TEXT NOT NULL,
    
    -- 類型
    holiday_type TEXT CHECK(holiday_type IN ('national', 'company')),
    
    -- 說明
    description TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_holidays_date ON holidays(holiday_date);
CREATE INDEX idx_holidays_type ON holidays(holiday_type);

-- ----------------------------------------------------------------
-- 8. business_types（業務類型）
-- ----------------------------------------------------------------

CREATE TABLE business_types (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 業務類型
    type_name TEXT NOT NULL UNIQUE,
    type_code TEXT NOT NULL UNIQUE,
    
    -- 說明
    description TEXT,
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_business_types_code ON business_types(type_code);
CREATE INDEX idx_business_types_is_active ON business_types(is_active);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 005 completed. Timesheet system tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND (
    name LIKE '%timesheet%' OR 
    name LIKE '%leave%' OR 
    name LIKE '%holiday%' OR 
    name LIKE '%overtime%'
) ORDER BY name;

-- ================================================================
-- End of Migration 005
-- ================================================================

