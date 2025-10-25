-- ============================================================
-- 週期性任務管理系統（每月固定任務）
-- 用於記帳、營業稅、營所稅等定期執行的任務
-- ============================================================

-- 1. 客戶服務配置表（從CSV導入的固定服務項目）
CREATE TABLE IF NOT EXISTS client_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_tax_id TEXT,  -- 統一編號
  
  -- 服務項目及頻率
  service_name TEXT NOT NULL,  -- 例：「記帳」、「營業稅」、「營所稅」等
  service_category TEXT NOT NULL,  -- 「記帳」、「工商」、「財簽」、「稅簽」、「其他」
  frequency TEXT NOT NULL DEFAULT '每月',  -- 「每月」、「每季」、「每年」、「不定期」
  
  -- 費用與工時
  fee REAL DEFAULT 0,  -- 收費
  estimated_hours REAL DEFAULT 0,  -- 預計工時
  
  -- 每月執行配置（JSON格式）
  -- {"1": true, "2": true, ...} 表示1月要執行、2月要執行等
  monthly_schedule TEXT DEFAULT '{}',
  
  -- 收款配置
  billing_timing TEXT,  -- 例：「每月」、「季末」、「年底」
  billing_notes TEXT,  -- 收款備註
  
  -- 服務備註
  service_notes TEXT,
  
  -- 狀態
  is_active BOOLEAN DEFAULT 1,
  
  -- 負責人
  assigned_to TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES employees(name)
);

-- 2. 週期性任務模板（可重複使用的任務模板）
CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,  -- 例：「月度記帳」、「營業稅申報」
  category TEXT NOT NULL,  -- 「記帳」、「工商」、「財簽」、「稅簽」、「其他」
  description TEXT,
  
  -- 預設檢核清單（JSON格式）
  default_checklist TEXT,  -- [{"text": "...", "required": true}, ...]
  
  -- 預設工時
  default_hours REAL DEFAULT 0,
  
  -- 預設期限（相對於月份，例如：每月5日前）
  default_due_day INTEGER,  -- 1-31 或特殊值：0=月底, -1=下月初
  
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 自動生成的週期性任務實例
CREATE TABLE IF NOT EXISTS recurring_task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,  -- 關聯到客戶服務配置
  template_id INTEGER,  -- 可選：關聯到任務模板
  
  -- 任務基本信息
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 「記帳」、「工商」、「財簽」、「稅簽」、「其他」
  description TEXT,
  
  -- 週期信息
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,  -- 1-12
  quarter INTEGER,  -- 1-4（如果是季度任務）
  
  -- 狀態
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'skipped')),
  
  -- 時間
  due_date DATE,
  started_at DATETIME,
  completed_at DATETIME,
  
  -- 負責人
  assigned_to TEXT,
  completed_by TEXT,
  
  -- 檢核清單（JSON格式，可動態修改）
  checklist_data TEXT,  -- {"items": [{"text": "...", "completed": false}, ...]}
  
  -- 實際工時
  actual_hours REAL DEFAULT 0,
  
  -- 備註
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES recurring_task_templates(id),
  FOREIGN KEY (assigned_to) REFERENCES employees(name),
  FOREIGN KEY (completed_by) REFERENCES users(username)
);

-- 4. 週期性任務生成記錄（追蹤自動生成）
CREATE TABLE IF NOT EXISTS recurring_task_generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  tasks_generated INTEGER DEFAULT 0,
  generated_by TEXT,  -- 'system' 或 username
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- 5. 任務提醒設置
CREATE TABLE IF NOT EXISTS task_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_instance_id INTEGER NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_type TEXT DEFAULT 'email',  -- 'email', 'system', 'both'
  is_sent BOOLEAN DEFAULT 0,
  sent_at DATETIME,
  notes TEXT,
  
  FOREIGN KEY (task_instance_id) REFERENCES recurring_task_instances(id) ON DELETE CASCADE
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_services_client 
  ON client_services(client_name);
  
CREATE INDEX IF NOT EXISTS idx_client_services_category 
  ON client_services(service_category);
  
CREATE INDEX IF NOT EXISTS idx_client_services_assigned 
  ON client_services(assigned_to);

CREATE INDEX IF NOT EXISTS idx_recurring_instances_client_service 
  ON recurring_task_instances(client_service_id);
  
CREATE INDEX IF NOT EXISTS idx_recurring_instances_year_month 
  ON recurring_task_instances(year, month);
  
CREATE INDEX IF NOT EXISTS idx_recurring_instances_status 
  ON recurring_task_instances(status);
  
CREATE INDEX IF NOT EXISTS idx_recurring_instances_assigned 
  ON recurring_task_instances(assigned_to);
  
CREATE INDEX IF NOT EXISTS idx_recurring_instances_due_date 
  ON recurring_task_instances(due_date);

CREATE INDEX IF NOT EXISTS idx_task_reminders_date 
  ON task_reminders(reminder_date);

-- ============================================================
-- 預設週期性任務模板
-- ============================================================

INSERT INTO recurring_task_templates (name, category, description, default_hours, default_due_day, default_checklist) VALUES
-- 記帳類
('月度記帳', '記帳', '每月定期記帳作業', 4, 5, 
 '[{"text":"收集憑證","required":true},{"text":"輸入傳票","required":true},{"text":"核對金流","required":true},{"text":"產生報表","required":true},{"text":"送交客戶","required":true}]'),
 
('記帳 - 核金流', '記帳', '核對金流與帳務', 2, 3,
 '[{"text":"取得銀行對帳單","required":true},{"text":"核對收入","required":true},{"text":"核對支出","required":true},{"text":"處理未達帳項","required":true}]'),

-- 稅簽類
('營業稅申報', '稅簽', '每二個月營業稅申報', 2, 15,
 '[{"text":"整理進項憑證","required":true},{"text":"整理銷項憑證","required":true},{"text":"計算應納稅額","required":true},{"text":"線上申報","required":true},{"text":"繳納稅款","required":true}]'),
 
('營所稅申報', '稅簽', '每年營所稅結算申報', 8, 31,
 '[{"text":"年度帳務結算","required":true},{"text":"編製財務報表","required":true},{"text":"計算課稅所得","required":true},{"text":"填寫申報書","required":true},{"text":"線上申報","required":true}]'),
 
('扣繳申報', '稅簽', '每月扣繳申報', 1, 10,
 '[{"text":"彙整扣繳資料","required":true},{"text":"計算扣繳稅額","required":true},{"text":"填寫扣繳憑單","required":true},{"text":"線上申報","required":true}]'),
 
('暫繳稅款', '稅簽', '營所稅暫繳', 2, 30,
 '[{"text":"計算暫繳稅額","required":true},{"text":"填寫暫繳申報書","required":true},{"text":"繳納稅款","required":true}]'),
 
('二代健保補充保費', '稅簽', '二代健保補充保費申報', 1, 15,
 '[{"text":"計算補充保費","required":true},{"text":"填寫繳款書","required":true},{"text":"繳納費用","required":true}]'),

-- 財簽類
('財務簽證', '財簽', '年度財務簽證作業', 40, -1,
 '[{"text":"年度帳務調整","required":true},{"text":"編製工作底稿","required":true},{"text":"財務報表編製","required":true},{"text":"會計師查核","required":true},{"text":"簽證報告完成","required":true}]'),
 
('營所稅查核簽證', '財簽', '營所稅查核簽證報告', 30, -1,
 '[{"text":"帳務調整","required":true},{"text":"稅務調整","required":true},{"text":"編製查核報告","required":true},{"text":"會計師簽證","required":true}]'),

-- 工商類
('工商變更登記', '工商', '公司登記事項變更', 8, 15,
 '[{"text":"確認變更項目","required":true},{"text":"準備變更文件","required":true},{"text":"填寫申請書","required":true},{"text":"送件申請","required":true},{"text":"領取證明","required":true}]'),
 
('年度股東會', '工商', '召開年度股東會', 4, 0,
 '[{"text":"發送開會通知","required":true},{"text":"準備會議資料","required":true},{"text":"召開股東會","required":true},{"text":"製作會議記錄","required":true}]'),

-- 其他
('盈餘分配申報', '其他', '盈餘分配扣繳申報', 3, 15,
 '[{"text":"計算盈餘分配","required":true},{"text":"計算扣繳稅額","required":true},{"text":"填寫申報書","required":true},{"text":"申報並繳款","required":true}]'),
 
('股東平台更新', '其他', '更新股東平台資料', 1, 5,
 '[{"text":"整理財務資料","required":true},{"text":"上傳至平台","required":true},{"text":"通知股東","required":true}]');

-- ============================================================
-- Migration 完成
-- ============================================================

