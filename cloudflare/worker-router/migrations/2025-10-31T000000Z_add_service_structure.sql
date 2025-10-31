-- 服務項目結構擴充
-- 新增服務項目和服務子項目表，並更新 Timesheets 表支援兩層結構

-- 1. 創建服務項目主表
CREATE TABLE IF NOT EXISTS Services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  service_code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_active ON Services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_code ON Services(service_code);

-- 2. 創建服務子項目表
CREATE TABLE IF NOT EXISTS ServiceItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_items_service ON ServiceItems(service_id);
CREATE INDEX IF NOT EXISTS idx_service_items_active ON ServiceItems(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_items_code ON ServiceItems(service_id, item_code);

-- 3. 更新 Timesheets 表（添加新欄位）
-- 注意：SQLite 的 ALTER TABLE 不支援直接修改欄位，需要重建表
-- 但為了保持向後相容性，我們先添加新欄位，保留舊的 service_name 欄位

ALTER TABLE Timesheets ADD COLUMN service_id INTEGER;
ALTER TABLE Timesheets ADD COLUMN service_item_id INTEGER;

-- 添加外鍵索引（SQLite 在 ALTER TABLE 後無法添加 FOREIGN KEY，僅添加索引）
CREATE INDEX IF NOT EXISTS idx_timesheets_service ON Timesheets(service_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_service_item ON Timesheets(service_item_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client_service ON Timesheets(client_id, service_id, service_item_id);

-- 4. 插入預設服務項目
INSERT INTO Services (service_id, service_name, service_code, description, sort_order) VALUES
  (1, '記帳服務', 'ACCOUNTING', '提供日常帳務處理、憑證整理、帳簿登載等服務', 1),
  (2, '稅務申報', 'TAX_FILING', '提供各類稅務申報服務，包含營所稅、營業稅、綜所稅等', 2),
  (3, '顧問諮詢', 'CONSULTING', '提供稅務諮詢、財務規劃、內控顧問等專業服務', 3),
  (4, '工商登記', 'BUSINESS_REG', '提供公司設立、變更、解散等工商登記服務', 4),
  (5, '審計服務', 'AUDIT', '提供財務簽證、稅務查核等審計服務', 5);

-- 5. 插入預設服務子項目

-- 記帳服務子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (1, '收集憑證', 'ACC_COLLECT', '收集整理客戶提供的各類原始憑證', 1),
  (1, '輸入帳務', 'ACC_INPUT', '將憑證資料輸入會計系統', 2),
  (1, '月結對帳', 'ACC_RECONCILE', '執行月底結帳與帳務對帳作業', 3),
  (1, '報表產製', 'ACC_REPORT', '產製財務報表與管理報表', 4);

-- 稅務申報子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (2, '營所稅申報', 'TAX_BUSINESS', '營利事業所得稅結算申報', 1),
  (2, '營業稅申報', 'TAX_VAT', '營業稅申報（401、403表）', 2),
  (2, '個人綜所稅', 'TAX_PERSONAL', '個人綜合所得稅申報', 3),
  (2, '扣繳申報', 'TAX_WITHHOLD', '各類所得扣繳申報', 4);

-- 顧問諮詢子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (3, '稅務諮詢', 'CONS_TAX', '提供稅務相關問題諮詢', 1),
  (3, '財務規劃', 'CONS_FIN', '協助客戶進行財務規劃', 2),
  (3, '內控顧問', 'CONS_CONTROL', '提供內部控制制度建立與改善建議', 3),
  (3, '公司設立', 'CONS_SETUP', '協助公司設立規劃與諮詢', 4);

-- 工商登記子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (4, '公司設立登記', 'REG_SETUP', '辦理公司設立登記', 1),
  (4, '公司變更登記', 'REG_CHANGE', '辦理公司各項變更登記', 2),
  (4, '公司解散登記', 'REG_DISSOLVE', '辦理公司解散與清算登記', 3),
  (4, '商業登記', 'REG_BUSINESS', '辦理商業登記相關事項', 4);

-- 審計服務子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (5, '財務簽證', 'AUDIT_FIN', '財務報表查核簽證', 1),
  (5, '稅務查核', 'AUDIT_TAX', '稅務查核簽證', 2),
  (5, '專案審計', 'AUDIT_PROJECT', '特定項目專案審計', 3),
  (5, '內部稽核', 'AUDIT_INTERNAL', '內部稽核作業', 4);

-- 6. 更新 ClientServices 表的 service_id 關聯
-- 為現有的 ClientServices 記錄設定預設的 service_id（如果為 NULL）
UPDATE ClientServices SET service_id = 1 WHERE service_id IS NULL AND is_deleted = 0;



