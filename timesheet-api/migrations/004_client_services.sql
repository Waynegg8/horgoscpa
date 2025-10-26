-- ================================================================
-- Migration 004: 客戶服務系統
-- 創建日期: 2025-10-26
-- 說明: 客戶服務配置、任務生成記錄
-- 依賴: 001_core_tables.sql, 002_task_system.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS task_generation_log;
DROP TABLE IF EXISTS task_execution_log;
DROP TABLE IF EXISTS client_services;
DROP TABLE IF EXISTS client_service_schedules;  -- 舊表名

-- ----------------------------------------------------------------
-- 1. client_services（客戶服務配置）
-- ----------------------------------------------------------------

CREATE TABLE client_services (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯客戶
    client_id INTEGER NOT NULL,
    
    -- 服務類型
    service_type TEXT NOT NULL CHECK(service_type IN ('accounting', 'vat', 'income_tax', 'withholding', 'prepayment', 'dividend', 'nhi', 'shareholder_tax', 'audit', 'company_setup')),
    frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'bimonthly', 'quarterly', 'biannual', 'annual')),
    
    -- 費用與工時
    fee DECIMAL(10, 2) DEFAULT 0,
    estimated_hours DECIMAL(5, 2) DEFAULT 0,
    
    -- 人員分配（標準化命名）
    assigned_user_id INTEGER,
    backup_user_id INTEGER,
    
    -- 排程設定
    start_month INTEGER CHECK(start_month BETWEEN 1 AND 12),
    execution_day INTEGER CHECK(execution_day BETWEEN 1 AND 31),
    advance_days INTEGER DEFAULT 7,
    due_days INTEGER DEFAULT 15,
    
    -- 難度評估
    difficulty_level INTEGER CHECK(difficulty_level BETWEEN 1 AND 5),
    invoice_count INTEGER DEFAULT 0,
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    
    -- 備註
    notes TEXT,
    special_requirements TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_generated_at DATETIME,
    
    -- 外鍵
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (backup_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_client_services_client ON client_services(client_id);
CREATE INDEX idx_client_services_assigned_user ON client_services(assigned_user_id);
CREATE INDEX idx_client_services_service_type ON client_services(service_type);
CREATE INDEX idx_client_services_frequency ON client_services(frequency);
CREATE INDEX idx_client_services_is_active ON client_services(is_active);

-- ----------------------------------------------------------------
-- 2. task_generation_log（任務生成記錄）
-- ----------------------------------------------------------------

CREATE TABLE task_generation_log (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯
    client_service_id INTEGER NOT NULL,
    generated_task_id INTEGER,
    
    -- 生成信息
    execution_period TEXT NOT NULL,  -- '2025-10', '2025-Q1', '2025'
    generation_method TEXT DEFAULT 'auto' CHECK(generation_method IN ('auto', 'manual')),
    
    -- 生成者（如果是手動生成）
    generated_by_user_id INTEGER,
    
    -- 時間戳
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 唯一約束：防止重複生成
    UNIQUE(client_service_id, execution_period)
);

-- 索引
CREATE INDEX idx_task_generation_log_client_service ON task_generation_log(client_service_id);
CREATE INDEX idx_task_generation_log_task ON task_generation_log(generated_task_id);
CREATE INDEX idx_task_generation_log_period ON task_generation_log(execution_period);

-- ----------------------------------------------------------------
-- 3. task_execution_log（任務執行記錄）
-- ----------------------------------------------------------------

CREATE TABLE task_execution_log (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯
    task_id INTEGER NOT NULL,
    multi_stage_task_id INTEGER,
    client_service_id INTEGER,
    
    -- 執行信息
    execution_period TEXT,
    status TEXT DEFAULT 'pending',
    
    -- 執行者和審核者
    executor_user_id INTEGER,
    approver_user_id INTEGER,
    
    -- 時間
    started_at DATETIME,
    completed_at DATETIME,
    approved_at DATETIME,
    
    -- 工時和費用
    actual_hours DECIMAL(5, 2),
    billed_amount DECIMAL(10, 2),
    
    -- 備註和附件
    notes TEXT,
    attachments_data TEXT,  -- JSON 格式
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (multi_stage_task_id) REFERENCES multi_stage_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE SET NULL,
    FOREIGN KEY (executor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_task_execution_log_task ON task_execution_log(task_id);
CREATE INDEX idx_task_execution_log_client_service ON task_execution_log(client_service_id);
CREATE INDEX idx_task_execution_log_period ON task_execution_log(execution_period);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 004 completed. Client services tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%client_service%' OR name LIKE '%generation%' ORDER BY name;

-- ================================================================
-- End of Migration 004
-- ================================================================

