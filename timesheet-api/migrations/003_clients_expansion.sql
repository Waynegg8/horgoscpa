-- ================================================================
-- 客戶關係管理擴展 Migration
-- 檔案: 003_clients_expansion.sql
-- 日期: 2025-10-25
-- 描述: 擴展客戶管理系統，加入客戶詳細資料、服務排程、互動記錄
-- ================================================================

-- ============================================================
-- 1. 客戶詳細資料表
-- ============================================================
CREATE TABLE IF NOT EXISTS clients_extended (
  client_name TEXT PRIMARY KEY NOT NULL,
  tax_id TEXT UNIQUE,                    -- 統一編號
  contact_person_1 TEXT,
  contact_person_2 TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  monthly_fee INTEGER DEFAULT 0,
  
  -- 服務項目標記
  service_accounting BOOLEAN DEFAULT 0,
  service_tax_return BOOLEAN DEFAULT 0,
  service_income_tax BOOLEAN DEFAULT 0,
  service_registration BOOLEAN DEFAULT 0,
  service_withholding BOOLEAN DEFAULT 0,
  service_prepayment BOOLEAN DEFAULT 0,
  service_payroll BOOLEAN DEFAULT 0,
  service_annual_report BOOLEAN DEFAULT 0,
  service_audit BOOLEAN DEFAULT 0,
  
  notes TEXT,
  region TEXT CHECK(region IN ('台中', '台北', '其他')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'potential')),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 2. 服務排程表
-- ============================================================
CREATE TABLE IF NOT EXISTS service_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tax_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  frequency TEXT DEFAULT '每月',
  monthly_fee INTEGER DEFAULT 0,
  
  -- 12個月排程
  month_1 BOOLEAN DEFAULT 0,
  month_2 BOOLEAN DEFAULT 0,
  month_3 BOOLEAN DEFAULT 0,
  month_4 BOOLEAN DEFAULT 0,
  month_5 BOOLEAN DEFAULT 0,
  month_6 BOOLEAN DEFAULT 0,
  month_7 BOOLEAN DEFAULT 0,
  month_8 BOOLEAN DEFAULT 0,
  month_9 BOOLEAN DEFAULT 0,
  month_10 BOOLEAN DEFAULT 0,
  month_11 BOOLEAN DEFAULT 0,
  month_12 BOOLEAN DEFAULT 0,
  
  service_details TEXT,
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 3. 客戶互動記錄
-- ============================================================
CREATE TABLE IF NOT EXISTS client_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  interaction_type TEXT,  -- 'meeting', 'phone', 'email', 'service'
  interaction_date DATE NOT NULL,
  subject TEXT,
  content TEXT,
  handled_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON DELETE CASCADE,
  FOREIGN KEY (handled_by) REFERENCES employees(name)
);

-- ============================================================
-- 4. 索引優化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_extended_tax_id 
  ON clients_extended(tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_extended_region 
  ON clients_extended(region);
CREATE INDEX IF NOT EXISTS idx_clients_extended_status 
  ON clients_extended(status);
  
CREATE INDEX IF NOT EXISTS idx_service_schedule_client 
  ON service_schedule(client_name);
CREATE INDEX IF NOT EXISTS idx_service_schedule_tax_id 
  ON service_schedule(tax_id);
  
CREATE INDEX IF NOT EXISTS idx_client_interactions_client 
  ON client_interactions(client_name);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date 
  ON client_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_client_interactions_handled_by 
  ON client_interactions(handled_by);

-- ============================================================
-- Migration 完成
-- ============================================================

