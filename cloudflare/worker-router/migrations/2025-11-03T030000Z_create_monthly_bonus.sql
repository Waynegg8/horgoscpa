-- 月度绩效奖金调整表
CREATE TABLE IF NOT EXISTS MonthlyBonusAdjustments (
  adjustment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  bonus_amount_cents INTEGER NOT NULL DEFAULT 0, -- 绩效奖金金额（分）
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_bonus_month ON MonthlyBonusAdjustments(month);
CREATE INDEX IF NOT EXISTS idx_monthly_bonus_user ON MonthlyBonusAdjustments(user_id);

