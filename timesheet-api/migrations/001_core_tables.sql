-- ================================================================
-- Migration 001: 核心資料表
-- 創建日期: 2025-10-26
-- 說明: 用戶、員工、客戶、Session 等核心表
--       這是整個系統的基礎架構
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS client_interactions;
DROP TABLE IF EXISTS clients;

-- ----------------------------------------------------------------
-- 1. employees（員工表）
-- ----------------------------------------------------------------

CREATE TABLE employees (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    name TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    phone TEXT,
    hire_date DATE,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')),
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_is_active ON employees(is_active);

-- ----------------------------------------------------------------
-- 2. users（用戶表）
-- ----------------------------------------------------------------

CREATE TABLE users (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
    
    -- 關聯員工
    employee_id INTEGER UNIQUE,
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_employee ON users(employee_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ----------------------------------------------------------------
-- 3. sessions（會話表）
-- ----------------------------------------------------------------

CREATE TABLE sessions (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Session 信息
    session_token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    
    -- 額外信息
    ip_address TEXT,
    user_agent TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ----------------------------------------------------------------
-- 4. clients（客戶表）
-- ----------------------------------------------------------------

CREATE TABLE clients (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    name TEXT NOT NULL UNIQUE,
    tax_id TEXT UNIQUE,
    
    -- 聯絡信息
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    
    -- 業務信息
    industry TEXT,
    company_type TEXT,
    founded_date DATE,
    region TEXT CHECK(region IN ('台中', '台北', '其他')),
    
    -- 狀態
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'potential')),
    
    -- 備註
    notes TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_tax_id ON clients(tax_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_region ON clients(region);

-- ----------------------------------------------------------------
-- 5. client_interactions（客戶互動記錄）
-- ----------------------------------------------------------------

CREATE TABLE client_interactions (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯客戶
    client_id INTEGER NOT NULL,
    
    -- 互動信息
    interaction_type TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    interaction_date DATETIME,
    participants TEXT,
    
    -- 後續追蹤
    follow_up_required BOOLEAN DEFAULT 0,
    follow_up_date DATE,
    
    -- 創建者
    created_by_user_id INTEGER,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_client_interactions_client ON client_interactions(client_id);
CREATE INDEX idx_client_interactions_date ON client_interactions(interaction_date);
CREATE INDEX idx_client_interactions_type ON client_interactions(interaction_type);

-- ================================================================
-- 驗證：檢查所有表是否創建成功
-- ================================================================

SELECT 'Migration 001 completed. Tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- ================================================================
-- End of Migration 001
-- ================================================================

