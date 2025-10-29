-- =====================================================
-- 會計師事務所內部管理系統 - 資料庫 Schema (模組 10-14)
-- Database: Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2025-10-29
-- =====================================================

-- =====================================================
-- 模組 10: 薪資管理
-- =====================================================

-- -----------------------------------------------------
-- 擴充 Users 表（薪資基本資訊）
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L35-L42
-- -----------------------------------------------------
ALTER TABLE Users ADD COLUMN base_salary REAL NOT NULL DEFAULT 0;  -- 底薪（月薪）
ALTER TABLE Users ADD COLUMN join_date TEXT;  -- 到職日期（用於計算年資、特休）
ALTER TABLE Users ADD COLUMN comp_hours_current_month REAL DEFAULT 0;  -- 本月補休時數

-- -----------------------------------------------------
-- Table: SalaryItemTypes（薪資項目類型）
-- 描述: 靈活的薪資項目配置系統，支持津貼、獎金、扣款
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L49-L106
-- -----------------------------------------------------
CREATE TABLE SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,  -- 項目代碼（如：ATTENDANCE_BONUS）
  item_name TEXT NOT NULL,  -- 項目名稱（如：全勤獎金）
  category TEXT NOT NULL,  -- 類別：'allowance'（津貼）, 'bonus'（獎金）, 'deduction'（扣款）
  is_taxable BOOLEAN DEFAULT 1,  -- 是否計入課稅
  is_fixed BOOLEAN DEFAULT 1,  -- 金額是否固定（1=每月同金額，0=金額會變動）
  is_regular_payment BOOLEAN DEFAULT 1,  -- ⭐ 是否為經常性給與（1=每月發放計入時薪，0=偶爾發放如年終）
  affects_labor_insurance BOOLEAN DEFAULT 1,  -- 是否影響勞健保
  affects_attendance BOOLEAN DEFAULT 0,  -- 是否影響全勤判定
  calculation_formula TEXT,  -- 計算公式（變動項目用）
  display_order INTEGER DEFAULT 0,  -- 顯示順序
  is_active BOOLEAN DEFAULT 1,  -- 是否啟用
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('allowance', 'bonus', 'deduction'))
);

CREATE INDEX idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX idx_salary_item_types_order ON SalaryItemTypes(display_order);
CREATE INDEX idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 預設薪資項目
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_taxable, is_fixed, is_regular_payment) VALUES
('ATTENDANCE_BONUS', '全勤獎金', 'bonus', 1, 1, 1),        -- 固定金額，計入時薪
('TRANSPORT', '交通津貼', 'allowance', 0, 1, 1),           -- 固定金額，計入時薪
('MEAL', '伙食津貼', 'allowance', 0, 1, 1),                -- 固定金額，計入時薪
('POSITION', '職務加給', 'allowance', 1, 1, 1),            -- 固定金額，計入時薪
('PHONE', '電話津貼', 'allowance', 0, 1, 1),               -- 固定金額，計入時薪
('PARKING', '停車津貼', 'allowance', 0, 1, 1),             -- 固定金額，計入時薪
('PERFORMANCE', '績效獎金', 'bonus', 1, 0, 1),             -- ⭐ 金額浮動，但計入時薪（影響成本分析）
('YEAR_END', '年終獎金', 'bonus', 1, 0, 0);                -- 金額浮動，不計入時薪（年底一次）

-- -----------------------------------------------------
-- Table: EmployeeSalaryItems（員工薪資項目）
-- 描述: 員工個人的薪資項目配置，支持月度獨立調整
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L126-L185
-- -----------------------------------------------------
CREATE TABLE EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  effective_date TEXT NOT NULL,  -- 生效日期（YYYY-MM-01）
  expiry_date TEXT,  -- 失效日期（YYYY-MM-末日，null=永久有效）
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id)
);

CREATE INDEX idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);
CREATE INDEX idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);  -- ⭐ 月份查詢專用

-- -----------------------------------------------------
-- Table: MonthlyPayroll（月度薪資表）
-- 描述: 每月薪資計算結果，含加班費分類和全勤判定
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L188-L232
-- -----------------------------------------------------
CREATE TABLE MonthlyPayroll (
  payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- 薪資組成（動態從 EmployeeSalaryItems 計算）
  base_salary REAL NOT NULL,  -- 底薪
  total_allowances REAL DEFAULT 0,  -- 津貼合計
  total_bonuses REAL DEFAULT 0,  -- 獎金合計
  
  -- 加班費（依勞基法計算）
  overtime_weekday_2h REAL DEFAULT 0,  -- 平日加班前2小時費用（1.34倍）
  overtime_weekday_beyond REAL DEFAULT 0,  -- 平日加班第3小時起（1.67倍）
  overtime_restday_2h REAL DEFAULT 0,  -- 休息日前2小時（1.34倍）
  overtime_restday_beyond REAL DEFAULT 0,  -- 休息日第3小時起（1.67倍）
  overtime_holiday REAL DEFAULT 0,  -- 國定假日/例假日（2.0倍）
  
  -- 扣款項目
  total_deductions REAL DEFAULT 0,  -- 總扣款
  
  -- 統計資訊
  total_work_hours REAL DEFAULT 0,  -- 總工時
  total_overtime_hours REAL DEFAULT 0,  -- 加班時數
  total_weighted_hours REAL DEFAULT 0,  -- 加權工時總計
  has_full_attendance BOOLEAN DEFAULT 1,  -- 是否全勤
  
  -- 總薪資
  gross_salary REAL NOT NULL,  -- 應發薪資（含所有加項）
  net_salary REAL NOT NULL,  -- 實發薪資
  
  -- 備註
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  UNIQUE(user_id, year, month)  -- 每人每月只有一筆薪資記錄
);

CREATE INDEX idx_payroll_user ON MonthlyPayroll(user_id);
CREATE INDEX idx_payroll_date ON MonthlyPayroll(year, month);

-- -----------------------------------------------------
-- Table: OvertimeRecords（加班記錄明細）
-- 描述: 加班費計算明細，記錄時薪基準和倍率
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L234-L256
-- -----------------------------------------------------
CREATE TABLE OvertimeRecords (
  overtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  overtime_type TEXT NOT NULL,  -- 'weekday_2h', 'weekday_beyond', 'restday_2h', 'restday_beyond', 'holiday'
  hours REAL NOT NULL,
  rate_multiplier REAL NOT NULL,  -- 費率倍數（1.34, 1.67, 2.0）
  hourly_base REAL NOT NULL,  -- 時薪基準（base_salary / 240）
  overtime_pay REAL NOT NULL,  -- 加班費金額
  is_compensatory_leave BOOLEAN DEFAULT 0,  -- 是否選擇補休（1=補休, 0=加班費）
  payroll_id INTEGER,  -- 關聯到薪資記錄
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (payroll_id) REFERENCES MonthlyPayroll(payroll_id)
);

CREATE INDEX idx_overtime_user_date ON OvertimeRecords(user_id, work_date);
CREATE INDEX idx_overtime_payroll ON OvertimeRecords(payroll_id);

-- -----------------------------------------------------
-- Table: YearEndBonus（年終獎金）
-- 描述: 年終獎金獨立管理，支持歸屬年度與發放年度分離
-- 規格來源：docs/開發指南/薪資管理-完整規格.md L258-L306
-- -----------------------------------------------------
CREATE TABLE YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  attribution_year INTEGER NOT NULL,     -- 歸屬年度（如：2025）
  amount REAL NOT NULL,                  -- 年終獎金金額
  payment_year INTEGER,                  -- 實際發放年度（如：2026）
  payment_month INTEGER,                 -- 實際發放月份（如：1）
  payment_date TEXT,                     -- 實際發放日期（如：2026-01-15）
  decision_date TEXT,                    -- 決定日期（如：2025-12-31）
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(user_id, attribution_year)  -- 每人每年度只有一筆年終
);

CREATE INDEX idx_yearend_user ON YearEndBonus(user_id);
CREATE INDEX idx_yearend_attribution ON YearEndBonus(attribution_year);
CREATE INDEX idx_yearend_payment ON YearEndBonus(payment_year, payment_month);

-- =====================================================
-- 模組 11: 管理成本
-- =====================================================

-- -----------------------------------------------------
-- Table: OverheadCostTypes（管理成本項目類型）
-- 描述: 靈活的管理成本項目配置，支持三種分攤方式
-- 規格來源：docs/開發指南/管理成本-完整規格.md L29-L63
-- -----------------------------------------------------
CREATE TABLE OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,  -- 成本代碼（如：RENT）
  cost_name TEXT NOT NULL,  -- 成本名稱（如：辦公室租金）
  category TEXT NOT NULL,  -- 類別：'fixed'（固定成本）, 'variable'（變動成本）
  allocation_method TEXT NOT NULL,  -- 分攤方式：'per_employee'（按人頭）, 'per_hour'（按工時）, 'per_revenue'（按營收）
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);

CREATE INDEX idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX idx_overhead_cost_types_category ON OverheadCostTypes(category);

-- 預設管理成本項目
INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description) VALUES
('RENT', '辦公室租金', 'fixed', 'per_employee', '每月辦公室租金'),
('UTILITIES', '水電瓦斯', 'fixed', 'per_employee', '水費、電費、瓦斯費'),
('INTERNET', '網路通訊', 'fixed', 'per_employee', '網路、電話費用'),
('EQUIPMENT', '設備折舊', 'fixed', 'per_employee', '電腦、辦公設備折舊'),
('SOFTWARE', '軟體授權', 'fixed', 'per_employee', '各種軟體訂閱費用'),
('INSURANCE', '保險費用', 'fixed', 'per_employee', '公司保險費'),
('MAINTENANCE', '維護費用', 'variable', 'per_hour', '辦公室維護、清潔'),
('MARKETING', '行銷費用', 'variable', 'per_revenue', '廣告、行銷活動');

-- -----------------------------------------------------
-- Table: MonthlyOverheadCosts（月度管理成本）
-- 描述: 每月管理成本記錄
-- 規格來源：docs/開發指南/管理成本-完整規格.md L65-L96
-- -----------------------------------------------------
CREATE TABLE MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,  -- 金額
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)  -- 每種成本每月只有一筆
);

CREATE INDEX idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);

-- =====================================================
-- 模組 12: 收據收款
-- =====================================================

-- -----------------------------------------------------
-- Table: Receipts（收據表）
-- 描述: 收據管理，支持自動/手動號碼生成，含作廢欄位
-- 規格來源：docs/開發指南/發票收款-完整規格.md L37-L78
-- -----------------------------------------------------
CREATE TABLE Receipts (
  receipt_id TEXT PRIMARY KEY,  -- 收據號碼（格式：YYYYMM-NNN，如：202510-001）
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,  -- 開立日期
  due_date TEXT,  -- 到期日
  total_amount REAL NOT NULL,  -- 總金額（無稅額）
  status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid, cancelled
  is_auto_generated BOOLEAN DEFAULT 1,  -- 是否自動生成編號（0=手動輸入）
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,                      -- ⭐ 作廢時間
  deleted_by INTEGER,                   -- ⭐ 作廢人員
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id),
  CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled'))
);

CREATE INDEX idx_receipts_client ON Receipts(client_id);
CREATE INDEX idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX idx_receipts_status ON Receipts(status);
CREATE INDEX idx_receipts_status_due ON Receipts(status, due_date);  -- ⭐ 應收帳款查詢專用
CREATE INDEX idx_receipts_client_status ON Receipts(client_id, status);  -- ⭐ 客戶收款查詢專用

-- -----------------------------------------------------
-- Table: ReceiptItems（收據項目）
-- 描述: 收據明細項目
-- 規格來源：docs/開發指南/發票收款-完整規格.md L80-L97
-- -----------------------------------------------------
CREATE TABLE ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER,  -- 關聯到 Services
  description TEXT NOT NULL,  -- 項目說明
  quantity REAL DEFAULT 1,  -- 數量
  unit_price REAL NOT NULL,  -- 單價
  amount REAL NOT NULL,  -- 金額（quantity × unit_price）
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- -----------------------------------------------------
-- Table: ReceiptSequence（收據流水號管理）
-- 描述: 管理每月收據流水號，支持併發安全生成
-- 規格來源：docs/開發指南/發票收款-完整規格.md L99-L116
-- -----------------------------------------------------
CREATE TABLE ReceiptSequence (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT UNIQUE NOT NULL,  -- 年月（YYYYMM）
  last_sequence INTEGER NOT NULL DEFAULT 0,  -- 最後使用的流水號
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_receipt_sequence_ym ON ReceiptSequence(year_month);

-- -----------------------------------------------------
-- Table: Payments（收款記錄）
-- 描述: 收款記錄，支持部分收款
-- 規格來源：docs/開發指南/發票收款-完整規格.md L118-L138
-- -----------------------------------------------------
CREATE TABLE Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,  -- 收款日期
  amount REAL NOT NULL,  -- 收款金額
  payment_method TEXT,  -- 現金、轉帳、支票
  reference_number TEXT,  -- 參考號碼（如：支票號碼、帳號後5碼）
  notes TEXT,
  received_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id),
  FOREIGN KEY (received_by) REFERENCES Users(user_id)
);

CREATE INDEX idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX idx_payments_date ON Payments(payment_date);

-- =====================================================
-- 模組 13: 附件系統
-- =====================================================

-- -----------------------------------------------------
-- Table: Attachments（附件）
-- 描述: 統一的附件管理系統，整合 Cloudflare R2
-- 規格來源：docs/開發指南/附件系統-完整規格.md L35-L54
-- -----------------------------------------------------
CREATE TABLE Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'client', 'receipt', 'sop', 'task'
  entity_id TEXT NOT NULL,  -- 關聯的實體ID
  file_name TEXT NOT NULL,  -- 原始檔名
  file_path TEXT NOT NULL,  -- Cloudflare R2 路徑
  file_size INTEGER,  -- 檔案大小（bytes）
  mime_type TEXT,  -- 檔案類型
  uploaded_by INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id),
  CHECK (entity_type IN ('client', 'receipt', 'sop', 'task'))
);

CREATE INDEX idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded ON Attachments(uploaded_at);

-- =====================================================
-- 模組 14: 報表分析
-- 描述: 此模組無額外資料表，使用現有表的查詢與聚合
-- =====================================================

