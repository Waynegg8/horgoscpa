-- 初始化公司資料 1（霍爾果斯會計師事務所）
INSERT OR REPLACE INTO Settings (setting_key, setting_value, description, updated_at, updated_by)
VALUES
  ('company1_name', '霍爾果斯會計師事務所', '公司資料1-公司名稱', datetime('now'), '1'),
  ('company1_name_en', 'HorgosCPA', '公司資料1-英文名稱', datetime('now'), '1'),
  ('company1_tax_id', '92254178', '公司資料1-統一編號', datetime('now'), '1'),
  ('company1_address', '臺中市西區建國路21號', '公司資料1-地址1', datetime('now'), '1'),
  ('company1_address_line2', '3樓之1', '公司資料1-地址2', datetime('now'), '1'),
  ('company1_phone', '04-22205606', '公司資料1-電話', datetime('now'), '1'),
  ('company1_bank', '永豐銀行台中分行', '公司資料1-銀行', datetime('now'), '1'),
  ('company1_bank_code', '807', '公司資料1-銀行代號', datetime('now'), '1'),
  ('company1_account_number', '003-018-0019011-7', '公司資料1-帳號', datetime('now'), '1');

