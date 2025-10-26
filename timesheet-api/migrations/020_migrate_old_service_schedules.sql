-- Migration 020: 遷移舊版客戶服務排程資料
-- 目的：將 client_service_schedules 資料遷移到 client_services，然後刪除舊表
-- 日期：2025-10-26

-- 注意：此 migration 假設 client_service_schedules 表存在且有資料
-- 如果該表不存在，SQL 會報錯但不影響系統運行

-- 步驟 1: 檢查並遷移資料（如果舊表存在）
INSERT OR IGNORE INTO client_services (
  client_id,
  service_type,
  frequency,
  fee,
  estimated_hours,
  assigned_to,
  notes,
  is_active,
  created_at,
  updated_at
)
SELECT 
  (SELECT id FROM clients WHERE name = css.client_name LIMIT 1) as client_id,
  CASE 
    WHEN css.service_name LIKE '%記帳%' THEN 'accounting'
    WHEN css.service_name LIKE '%營業稅%' THEN 'vat'
    WHEN css.service_name LIKE '%營所稅%' THEN 'income_tax'
    WHEN css.service_name LIKE '%扣繳%' THEN 'withholding'
    WHEN css.service_name LIKE '%暫繳%' THEN 'prepayment'
    WHEN css.service_name LIKE '%盈餘%' THEN 'dividend'
    WHEN css.service_name LIKE '%健保%' THEN 'nhi'
    WHEN css.service_name LIKE '%簽證%' THEN 'audit'
    WHEN css.service_name LIKE '%設立%' THEN 'company_setup'
    ELSE 'other'
  END as service_type,
  CASE 
    WHEN css.frequency = '每月' THEN 'monthly'
    WHEN css.frequency = '雙月' THEN 'bimonthly'
    WHEN css.frequency = '季' THEN 'quarterly'
    WHEN css.frequency = '半年' THEN 'biannual'
    WHEN css.frequency = '年度' THEN 'annual'
    ELSE 'monthly'
  END as frequency,
  css.fee,
  css.estimated_hours,
  (SELECT id FROM users WHERE employee_name = css.assigned_to LIMIT 1) as assigned_to,
  COALESCE(css.service_notes, '') || ' | ' || COALESCE(css.billing_notes, '') as notes,
  css.is_active,
  css.created_at,
  css.updated_at
FROM client_service_schedules css
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='client_service_schedules');

-- 步驟 2: 刪除舊表（如果存在）
DROP TABLE IF EXISTS client_service_schedules;

-- 步驟 3: 同時清理其他可能不再需要的專案相關表
-- 這些表在設計中已經被整合到 tasks 系統

-- 檢查是否有專案資料需要保留
-- 如果 projects 表有重要資料，可以先備份
-- 以下註解掉，讓管理員手動決定是否刪除

-- DROP TABLE IF EXISTS project_checklist;
-- DROP TABLE IF EXISTS project_tasks;
-- DROP TABLE IF EXISTS projects;

-- 注意：以上專案相關表的刪除需要管理員確認
-- 因為可能有歷史資料需要保留或轉換

-- 完成提示
SELECT '✅ 舊版 client_service_schedules 資料已遷移並清理' AS message;
SELECT '⚠️ 專案相關表 (projects, project_tasks, project_checklist) 需手動確認是否刪除' AS warning;

