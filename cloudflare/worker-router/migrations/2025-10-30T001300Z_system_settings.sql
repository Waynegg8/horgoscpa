-- System Settings table
CREATE TABLE IF NOT EXISTS Settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_dangerous INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON Settings(setting_key);

-- Seed a few common keys if not exists
INSERT OR IGNORE INTO Settings (setting_key, setting_value, description, is_dangerous)
VALUES
  ('company_name', '', '公司名稱', 0),
  ('contact_email', '', '聯絡信箱', 0),
  ('timezone', 'Asia/Taipei', '系統時區', 0),
  ('currency', 'TWD', '系統幣別', 0),
  ('timesheet_min_unit', '0.5', '工時填寫最小單位（小時）', 0),
  ('soft_delete_enabled', '1', '啟用軟刪除（1/0）', 0),
  ('workday_start', '08:30', '工作日開始時間', 0),
  ('workday_end', '17:30', '工作日結束時間', 0),
  ('report_locale', 'zh-TW', '報表語系', 0),
  ('rule_comp_hours_expiry', 'current_month', '補休有效期規則', 1);


