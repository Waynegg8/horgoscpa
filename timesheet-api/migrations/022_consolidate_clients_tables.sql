-- Migration 022: 整合 clients 和 clients_extended 表
-- 目的：統一客戶資料管理，避免數據分散
-- 日期：2025-10-26
-- 狀態：選用（如果已有clients_extended數據則執行）

-- 步驟 1: 檢查 clients_extended 表是否存在且有數據
-- SELECT COUNT(*) FROM clients_extended;

-- 步驟 2: 更新 clients 表，將 clients_extended 的數據合併進去
UPDATE clients
SET 
  tax_id = COALESCE((SELECT tax_id FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.tax_id),
  contact_person = COALESCE((SELECT contact_person_1 FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.contact_person),
  phone = COALESCE((SELECT phone FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.phone),
  email = COALESCE((SELECT email FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.email),
  address = COALESCE((SELECT address FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.address),
  status = COALESCE((SELECT status FROM clients_extended WHERE client_name = clients.name LIMIT 1), clients.status)
WHERE EXISTS (SELECT 1 FROM clients_extended WHERE client_name = clients.name);

-- 步驟 3: 為 clients 表添加缺少的欄位（如果尚未添加）
-- 注意：這些欄位應該已經在 Migration 017 中添加

-- 步驟 4: 標記 clients_extended 為廢棄（但不刪除，保留作為備份）
-- 創建視圖以向後兼容舊的 API 調用
CREATE VIEW IF NOT EXISTS clients_extended_v AS
SELECT 
  id,
  name as client_name,
  tax_id,
  contact_person as contact_person_1,
  '' as contact_person_2,
  phone,
  email,
  address,
  0 as monthly_fee,  -- 此欄位已移到 client_services 表
  status,
  industry,
  company_type,
  notes,
  -- 服務項目標記（從 client_services 表計算）
  (SELECT COUNT(*) > 0 FROM client_services WHERE client_id = clients.id AND service_type = 'accounting') as service_accounting,
  (SELECT COUNT(*) > 0 FROM client_services WHERE client_id = clients.id AND service_type = 'vat') as service_tax_return,
  (SELECT COUNT(*) > 0 FROM client_services WHERE client_id = clients.id AND service_type = 'income_tax') as service_income_tax,
  0 as service_registration,
  0 as service_withholding,
  0 as service_prepayment,
  0 as service_payroll,
  0 as service_annual_report,
  (SELECT COUNT(*) > 0 FROM client_services WHERE client_id = clients.id AND service_type = 'audit') as service_audit,
  '' as region,
  created_at,
  updated_at
FROM clients;

-- 步驟 5: 完成提示
SELECT '✅ clients 和 clients_extended 表已整合' AS message;
SELECT '📋 clients_extended 表可在確認無問題後刪除' AS note;
SELECT '✅ 創建了 clients_extended_v 視圖以向後兼容' AS compatibility;

-- 回滾說明（DOWN）：
-- 如需回滾此 migration，執行以下 SQL：
-- DROP VIEW IF EXISTS clients_extended_v;
-- 然後從備份還原 clients 表

