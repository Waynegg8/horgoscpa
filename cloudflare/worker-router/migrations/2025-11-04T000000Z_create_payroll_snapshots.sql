-- 創建薪資月結版本表
-- 用於記錄每次產製月結的完整數據和變更記錄

CREATE TABLE IF NOT EXISTS PayrollSnapshots (
  snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,                    -- 薪資月份 (YYYY-MM)
  version INTEGER NOT NULL DEFAULT 1,     -- 版本號（同一月份可有多個版本）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER NOT NULL,            -- 產製人員 user_id
  snapshot_data TEXT NOT NULL,            -- JSON格式：完整的薪資計算結果
  changes_summary TEXT,                   -- JSON格式：相比上一版本的變更摘要
  notes TEXT,                             -- 備註說明
  FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 建立索引以加快查詢
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_month ON PayrollSnapshots(month);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_month_version ON PayrollSnapshots(month, version);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_created_at ON PayrollSnapshots(created_at);

-- 插入測試數據的註解
-- 實際數據將由系統產製月結時自動生成

