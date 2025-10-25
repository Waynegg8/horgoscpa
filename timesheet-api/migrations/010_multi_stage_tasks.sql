-- ============================================================
-- 多階段任務管理系統
-- 用於工商登記、稅務規劃等複雜多階段工作流程
-- ============================================================

-- 1. 任務模板（定義多階段工作流程）
CREATE TABLE IF NOT EXISTS task_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,  -- 例：「公司工商登記」
  description TEXT,
  category TEXT,  -- 例：「工商登記」、「稅務規劃」
  total_stages INTEGER DEFAULT 1,  -- 總階段數
  estimated_days INTEGER DEFAULT 0,  -- 預估天數
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 任務模板階段（定義每個階段的具體內容）
CREATE TABLE IF NOT EXISTS task_template_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,  -- 階段編號（1, 2, 3...）
  stage_name TEXT NOT NULL,  -- 例：「名稱預查」、「設立登記」
  description TEXT,  -- 階段說明
  estimated_days INTEGER DEFAULT 1,  -- 此階段預估天數
  required_documents TEXT,  -- 所需文件（JSON格式）
  checklist_items TEXT,  -- 檢核項目（JSON格式）
  notes TEXT,  -- 備註
  sort_order INTEGER DEFAULT 0,
  
  FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE
);

-- 3. 客戶任務實例（實際執行的任務）
CREATE TABLE IF NOT EXISTS client_multi_stage_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  template_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,  -- 任務名稱（可自訂）
  status TEXT DEFAULT 'not_started' 
    CHECK(status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  
  current_stage INTEGER DEFAULT 1,  -- 當前階段
  total_stages INTEGER NOT NULL,  -- 總階段數（從模板複製）
  
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  
  assigned_to TEXT,  -- 負責人
  created_by TEXT NOT NULL,
  
  notes TEXT,  -- 備註
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (template_id) REFERENCES task_templates(id),
  FOREIGN KEY (assigned_to) REFERENCES employees(name),
  FOREIGN KEY (created_by) REFERENCES users(username)
);

-- 4. 任務階段進度（實際執行的階段狀態）
CREATE TABLE IF NOT EXISTS client_task_stage_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped')),
  
  started_at DATETIME,
  completed_at DATETIME,
  
  -- 動態檢核清單（JSON格式，可勾選完成）
  checklist_data TEXT,  -- {"items": [{"text": "...", "completed": false}, ...]}
  
  -- 實際執行資料
  actual_documents TEXT,  -- 實際提交的文件
  completion_notes TEXT,  -- 完成備註
  completed_by TEXT,  -- 完成人
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES client_multi_stage_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES users(username)
);

-- 5. 任務歷史記錄
CREATE TABLE IF NOT EXISTS multi_stage_task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  action TEXT NOT NULL,  -- 'stage_completed', 'status_changed', 'assigned', etc.
  stage_number INTEGER,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES client_multi_stage_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(username)
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_task_templates_category 
  ON task_templates(category);
  
CREATE INDEX IF NOT EXISTS idx_template_stages_template 
  ON task_template_stages(template_id, stage_number);
  
CREATE INDEX IF NOT EXISTS idx_client_tasks_client 
  ON client_multi_stage_tasks(client_name);
  
CREATE INDEX IF NOT EXISTS idx_client_tasks_status 
  ON client_multi_stage_tasks(status);
  
CREATE INDEX IF NOT EXISTS idx_client_tasks_assigned 
  ON client_multi_stage_tasks(assigned_to);
  
CREATE INDEX IF NOT EXISTS idx_stage_progress_task 
  ON client_task_stage_progress(task_id, stage_number);

-- ============================================================
-- 預設任務模板
-- ============================================================

-- 工商登記完整流程
INSERT INTO task_templates (name, description, category, total_stages, estimated_days) VALUES
('公司設立登記（完整流程）', '從名稱預查到設立完成的完整工商登記流程', '工商登記', 6, 30);

INSERT INTO task_template_stages (template_id, stage_number, stage_name, description, estimated_days, required_documents, checklist_items) VALUES
(1, 1, '名稱預查', '向經濟部申請公司名稱預查', 3, 
 '["負責人身分證影本", "公司名稱5個候選"]',
 '["確認產業類別", "準備3-5個公司名稱", "檢查名稱是否重複", "送件申請"]'),

(1, 2, '地址確認', '確認公司登記地址並取得使用同意書', 5,
 '["房屋所有權狀影本", "房東身分證影本", "租賃契約", "使用同意書"]',
 '["確認地址可登記", "與房東協調", "簽訂租賃契約", "取得使用同意書", "準備地籍資料"]'),

(1, 3, '章程擬定', '擬定公司章程並完成股東簽名', 2,
 '["股東名冊", "股東身分證影本"]',
 '["確定資本額", "確定股份分配", "擬定公司章程", "股東會議記錄", "全體股東簽名"]'),

(1, 4, '銀行驗資', '至銀行開立籌備帳戶並存入資本額', 3,
 '["公司章程", "股東身分證正本", "名稱預查核准函"]',
 '["選定銀行", "開立籌備帳戶", "存入資本額", "取得存款餘額證明"]'),

(1, 5, '設立登記', '向經濟部申請公司設立登記', 10,
 '["公司設立登記申請書", "章程", "股東同意書", "董事願任同意書", "銀行存款餘額證明", "房屋使用同意書"]',
 '["準備完整文件", "填寫申請書", "送件申請", "繳納規費", "等待核准"]'),

(1, 6, '完成登記', '取得公司登記證明並刻製印鑑', 5,
 '["公司登記核准函"]',
 '["領取登記證明", "刻製公司印鑑", "申請統一發票", "辦理勞健保", "銀行開戶"]');

-- 公司變更登記
INSERT INTO task_templates (name, description, category, total_stages, estimated_days) VALUES
('公司變更登記', '公司登記事項變更申請', '工商登記', 3, 15);

INSERT INTO task_template_stages (template_id, stage_number, stage_name, description, estimated_days, required_documents, checklist_items) VALUES
(2, 1, '準備變更文件', '準備變更登記所需文件', 5,
 '["股東會議事錄或董事會議事錄", "變更事項證明文件", "公司章程修正對照表"]',
 '["確認變更項目", "召開股東會/董事會", "準備會議記錄", "修改公司章程"]'),

(2, 2, '申請變更登記', '向主管機關申請變更登記', 7,
 '["公司變更登記申請書", "股東會議事錄", "修正後章程", "其他相關文件"]',
 '["填寫變更申請書", "備齊所有文件", "送件申請", "繳納規費"]'),

(2, 3, '完成變更', '領取變更後登記證明', 3,
 '["變更登記核准函"]',
 '["領取變更登記表", "更新公司資料", "通知相關單位"]');

-- 公司解散登記
INSERT INTO task_templates (name, description, category, total_stages, estimated_days) VALUES
('公司解散登記', '公司結束營業辦理解散登記', '工商登記', 4, 60);

INSERT INTO task_template_stages (template_id, stage_number, stage_name, description, estimated_days, required_documents, checklist_items) VALUES
(3, 1, '決議解散', '股東會決議解散公司', 7,
 '["股東會議事錄", "解散申請書"]',
 '["召開股東會", "決議解散事項", "選任清算人", "製作會議記錄"]'),

(3, 2, '解散登記', '向主管機關申請解散登記', 10,
 '["解散登記申請書", "股東會議事錄", "清算人同意書"]',
 '["填寫解散申請書", "準備相關文件", "送件申請", "公告解散"]'),

(3, 3, '清算作業', '進行公司清算作業', 30,
 '["資產負債表", "財產目錄", "債權人名冊"]',
 '["編製財務報表", "處理債權債務", "公告債權", "分配剩餘財產"]'),

(3, 4, '清算完結登記', '辦理清算完結登記', 13,
 '["清算完結申請書", "清算報表", "股東會承認決議"]',
 '["製作清算報告", "股東會承認", "申請清算完結", "註銷公司"]');

