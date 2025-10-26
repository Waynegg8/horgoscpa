-- Migration 017: 擴展 clients 資料表結構
-- 目的：將簡化的 clients 表擴展為完整的客戶資訊管理表
-- 日期：2025-10-26

-- 步驟 1: 創建新的 clients_new 表（完整結構）
CREATE TABLE IF NOT EXISTS clients_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tax_id TEXT UNIQUE,                    -- 統一編號
  name TEXT NOT NULL,                    -- 公司名稱
  contact_person TEXT,                   -- 聯絡人
  phone TEXT,                            -- 電話
  email TEXT,                            -- Email
  address TEXT,                          -- 地址
  status TEXT DEFAULT 'active',          -- 狀態: active, inactive, suspended, potential
  industry TEXT,                         -- 產業類別
  company_type TEXT,                     -- 公司類型: 有限公司、股份有限公司等
  founded_date DATE,                     -- 成立日期
  notes TEXT,                            -- 備註
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 步驟 2: 遷移現有資料
INSERT INTO clients_new (name, status, created_at)
SELECT 
  name,
  'active' as status,
  CURRENT_TIMESTAMP as created_at
FROM clients;

-- 步驟 3: 刪除舊表
DROP TABLE clients;

-- 步驟 4: 重命名新表
ALTER TABLE clients_new RENAME TO clients;

-- 步驟 5: 創建索引以優化查詢
CREATE INDEX idx_clients_tax_id ON clients(tax_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_name ON clients(name);

-- 步驟 6: 更新相關外鍵約束（如果有的話）
-- 注意：由於 SQLite 的限制，外鍵約束需要在應用層處理

-- 完成提示
SELECT '✅ clients 資料表已成功擴展，包含完整客戶資訊欄位' AS message;

