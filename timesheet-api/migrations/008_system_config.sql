-- ================================================================
-- Migration 008: 系統配置
-- 創建日期: 2025-10-26
-- 說明: 系統參數、提醒、工作量統計
-- 依賴: 001_core_tables.sql, 002_task_system.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS system_parameters;
DROP TABLE IF EXISTS task_reminders;
DROP TABLE IF EXISTS user_workload_stats;

-- ----------------------------------------------------------------
-- 1. system_parameters（系統參數）
-- ----------------------------------------------------------------

CREATE TABLE system_parameters (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 參數信息
    param_category TEXT NOT NULL,
    param_key TEXT NOT NULL,
    param_value TEXT,
    
    -- 類型
    value_type TEXT DEFAULT 'string' CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
    
    -- 說明
    description TEXT,
    
    -- 是否可編輯
    is_editable BOOLEAN DEFAULT 1,
    
    -- 修改者
    last_modified_by_user_id INTEGER,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (last_modified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 唯一約束
    UNIQUE(param_category, param_key)
);

-- 索引
CREATE INDEX idx_system_parameters_category ON system_parameters(param_category);
CREATE INDEX idx_system_parameters_key ON system_parameters(param_key);

-- ----------------------------------------------------------------
-- 2. task_reminders（任務提醒）
-- ----------------------------------------------------------------

CREATE TABLE task_reminders (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    
    -- 提醒信息
    reminder_type TEXT NOT NULL CHECK(reminder_type IN ('due_soon', 'overdue', 'assigned', 'completed', 'custom')),
    message TEXT,
    
    -- 提醒時間
    remind_at DATETIME NOT NULL,
    
    -- 狀態
    is_read BOOLEAN DEFAULT 0,
    is_sent BOOLEAN DEFAULT 0,
    
    -- 閱讀時間
    read_at DATETIME,
    sent_at DATETIME,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_user ON task_reminders(user_id);
CREATE INDEX idx_task_reminders_is_read ON task_reminders(is_read);
CREATE INDEX idx_task_reminders_remind_at ON task_reminders(remind_at);

-- ----------------------------------------------------------------
-- 3. user_workload_stats（工作量統計）
-- ----------------------------------------------------------------

CREATE TABLE user_workload_stats (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯用戶
    user_id INTEGER NOT NULL,
    
    -- 統計期間
    period TEXT NOT NULL,  -- 'YYYY-MM' 格式
    
    -- 任務統計
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    
    -- 工時統計
    total_hours DECIMAL(6, 2) DEFAULT 0,
    actual_hours DECIMAL(6, 2) DEFAULT 0,
    
    -- 難度統計
    avg_difficulty DECIMAL(3, 2) DEFAULT 0,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 唯一約束
    UNIQUE(user_id, period)
);

-- 索引
CREATE INDEX idx_user_workload_stats_user ON user_workload_stats(user_id);
CREATE INDEX idx_user_workload_stats_period ON user_workload_stats(period);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 008 completed. System config tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND (
    name LIKE '%parameter%' OR 
    name LIKE '%reminder%' OR 
    name LIKE '%workload%'
) ORDER BY name;

-- ================================================================
-- End of Migration 008
-- ================================================================

