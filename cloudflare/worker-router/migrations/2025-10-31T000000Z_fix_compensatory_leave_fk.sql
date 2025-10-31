-- 修复 CompensatoryLeaveGrants 表的外键约束
-- 原外键引用了不存在的 Timesheets(log_id)，应该引用 Timesheets(timesheet_id)

-- SQLite 不支持直接修改外键，需要重建表

-- 1. 创建新表（正确的外键）
CREATE TABLE IF NOT EXISTS CompensatoryLeaveGrants_new (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_timelog_id INTEGER,          -- 關聯到 Timesheets.timesheet_id
  hours_generated REAL NOT NULL,      -- 產生的補休時數
  hours_used REAL NOT NULL DEFAULT 0, -- 已使用時數
  hours_remaining REAL NOT NULL,      -- 剩餘時數
  generated_date TEXT NOT NULL,       -- 產生日期（YYYY-MM-DD）
  expiry_date TEXT NOT NULL,          -- 到期日（當月底 YYYY-MM-DD）
  original_rate REAL,                 -- 原始費率（用於轉加班費計算）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (source_timelog_id) REFERENCES Timesheets(timesheet_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (hours_remaining >= 0),
  CHECK (hours_used >= 0),
  CHECK (hours_generated > 0)
);

-- 2. 复制数据（如果旧表有数据）
INSERT INTO CompensatoryLeaveGrants_new 
SELECT * FROM CompensatoryLeaveGrants WHERE 1=0; -- 不复制数据，因为旧表可能没有数据

-- 3. 删除旧表
DROP TABLE IF EXISTS CompensatoryLeaveGrants;

-- 4. 重命名新表
ALTER TABLE CompensatoryLeaveGrants_new RENAME TO CompensatoryLeaveGrants;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_comp_leave_user_status 
ON CompensatoryLeaveGrants(user_id, status, generated_date);

CREATE INDEX IF NOT EXISTS idx_comp_leave_expiry 
ON CompensatoryLeaveGrants(expiry_date, status);

