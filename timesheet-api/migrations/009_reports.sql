-- ================================================================
-- Migration 009: 報表系統
-- 創建日期: 2025-10-26
-- 說明: 報表快取、統計數據
-- 依賴: 001_core_tables.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS report_cache;

-- ----------------------------------------------------------------
-- 1. report_cache（報表快取）
-- ----------------------------------------------------------------

CREATE TABLE report_cache (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 快取鍵
    cache_key TEXT NOT NULL UNIQUE,
    
    -- 報表類型
    report_type TEXT NOT NULL CHECK(report_type IN ('annual_leave', 'work_analysis', 'pivot', 'client_summary', 'task_summary')),
    
    -- 快取數據（JSON）
    cache_data TEXT NOT NULL,
    
    -- 參數（用於驗證快取是否有效）
    parameters_json TEXT,
    
    -- 生成信息
    generated_by_user_id INTEGER,
    
    -- 過期時間
    expires_at DATETIME NOT NULL,
    
    -- 使用統計
    hit_count INTEGER DEFAULT 0,
    last_accessed_at DATETIME,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_report_cache_key ON report_cache(cache_key);
CREATE INDEX idx_report_cache_type ON report_cache(report_type);
CREATE INDEX idx_report_cache_expires ON report_cache(expires_at);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 009 completed. Report tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%report%' ORDER BY name;

-- ================================================================
-- End of Migration 009
-- ================================================================

