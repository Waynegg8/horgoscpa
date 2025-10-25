-- ================================================
-- 報表效能優化：快取表
-- 用途：儲存預計算的報表資料，避免重複計算
-- ================================================

-- 報表快取表
CREATE TABLE IF NOT EXISTS report_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,              -- 報表類型：'annual_leave', 'work_analysis', 'pivot'
  cache_key TEXT UNIQUE NOT NULL,         -- 快取鍵：例如 'annual_leave_張紜蓁_2025'
  data TEXT NOT NULL,                     -- JSON 格式的快取資料
  last_timesheet_id INTEGER DEFAULT 0,    -- 最後一筆相關 timesheet 的 ID
  expires_at DATETIME,                    -- 過期時間（可選）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_report_cache_key 
  ON report_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_report_cache_type 
  ON report_cache(report_type);

CREATE INDEX IF NOT EXISTS idx_report_cache_expires 
  ON report_cache(expires_at);

-- 報表統計表（可選：追蹤報表生成統計）
CREATE TABLE IF NOT EXISTS report_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  execution_time_ms INTEGER,              -- 執行時間（毫秒）
  cache_hit BOOLEAN DEFAULT 0,            -- 是否命中快取
  employee_name TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_stats_type 
  ON report_stats(report_type);

CREATE INDEX IF NOT EXISTS idx_report_stats_date 
  ON report_stats(generated_at);

