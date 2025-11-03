-- 将年终奖金的发放日期改为发放月份
-- 从 payment_date (YYYY-MM-DD) 改为 payment_month (YYYY-MM)

-- SQLite不支持直接ALTER COLUMN，需要重建表
-- 1. 创建临时表（新结构）
CREATE TABLE IF NOT EXISTS YearEndBonus_new (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_month TEXT, -- 发放月份 YYYY-MM（例如 2025-01）
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, year)
);

-- 2. 迁移现有数据，将 payment_date 转换为 payment_month (取前7位)
INSERT INTO YearEndBonus_new (bonus_id, user_id, year, amount_cents, payment_month, notes, created_by, created_at, updated_at)
SELECT 
  bonus_id, 
  user_id, 
  year, 
  amount_cents, 
  CASE 
    WHEN payment_date IS NOT NULL AND length(payment_date) >= 7 
    THEN substr(payment_date, 1, 7)  -- 取前7位 YYYY-MM
    ELSE NULL 
  END AS payment_month,
  notes, 
  created_by, 
  created_at, 
  updated_at
FROM YearEndBonus;

-- 3. 删除旧表
DROP TABLE YearEndBonus;

-- 4. 重命名新表
ALTER TABLE YearEndBonus_new RENAME TO YearEndBonus;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_year ON YearEndBonus(year);
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_user ON YearEndBonus(user_id);

