-- 年终奖金表
CREATE TABLE IF NOT EXISTS YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL, -- 年度（例如 2025）
  amount_cents INTEGER NOT NULL DEFAULT 0, -- 年终奖金金额（分）
  payment_date TEXT, -- 发放日期 YYYY-MM-DD
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_yearend_bonus_year ON YearEndBonus(year);
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_user ON YearEndBonus(user_id);

