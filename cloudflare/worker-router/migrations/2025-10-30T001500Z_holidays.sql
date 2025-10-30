-- Holidays（假日與日期屬性）

CREATE TABLE IF NOT EXISTS Holidays (
  holiday_date TEXT PRIMARY KEY,         -- YYYY-MM-DD
  name TEXT,                             -- 假日名稱（例：國慶日、春節）
  is_national_holiday BOOLEAN DEFAULT 0, -- 是否為國定假日
  is_weekly_restday BOOLEAN DEFAULT 0,   -- 是否為例假日（通常週日）
  is_makeup_workday BOOLEAN DEFAULT 0,   -- 是否為補班日
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON Holidays(holiday_date);

-- 插入 2025-2026 年台灣國定假日（範例資料）
-- 2025年
INSERT OR IGNORE INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday) VALUES
  ('2025-01-01', '元旦', 1, 0, 0),
  ('2025-01-27', '農曆除夕補假', 1, 0, 0),
  ('2025-01-28', '農曆除夕', 1, 0, 0),
  ('2025-01-29', '春節初一', 1, 0, 0),
  ('2025-01-30', '春節初二', 1, 0, 0),
  ('2025-01-31', '春節初三', 1, 0, 0),
  ('2025-02-28', '和平紀念日', 1, 0, 0),
  ('2025-04-03', '兒童節補假', 1, 0, 0),
  ('2025-04-04', '兒童節、清明節', 1, 0, 0),
  ('2025-05-01', '勞動節', 1, 0, 0),
  ('2025-05-31', '端午節', 1, 0, 0),
  ('2025-09-06', '中秋節補假', 1, 0, 0),
  ('2025-10-10', '國慶日', 1, 0, 0),
  
  -- 2026年（部分，可後續補充）
  ('2026-01-01', '元旦', 1, 0, 0),
  ('2026-02-16', '農曆除夕補假', 1, 0, 0),
  ('2026-02-17', '春節初一', 1, 0, 0),
  ('2026-02-18', '春節初二', 1, 0, 0),
  ('2026-02-19', '春節初三', 1, 0, 0),
  ('2026-02-28', '和平紀念日', 1, 0, 0),
  ('2026-04-03', '兒童節補假', 1, 0, 0),
  ('2026-04-04', '兒童節、清明節', 1, 0, 0),
  ('2026-05-01', '勞動節', 1, 0, 0),
  ('2026-10-10', '國慶日', 1, 0, 0);

-- 註：例假日（週日）和補班日需由系統根據日期計算或手動維護
-- 可透過管理介面或定期更新腳本維護

