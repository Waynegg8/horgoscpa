-- 任務管理（最小可用：清單 API 所需）

-- ClientServices（最小欄位集合，供 JOIN 客戶）
CREATE TABLE IF NOT EXISTS ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  service_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_client_services_client ON ClientServices(client_id);

-- ActiveTasks（任務主表）
CREATE TABLE IF NOT EXISTS ActiveTasks (
  task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  template_id INTEGER,
  task_name TEXT NOT NULL,
  start_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  assignee_user_id INTEGER,
  related_sop_id INTEGER,
  client_specific_sop_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_active_tasks_assignee ON ActiveTasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_active_tasks_status ON ActiveTasks(status);
CREATE INDEX IF NOT EXISTS idx_active_tasks_due_date ON ActiveTasks(due_date);

-- ActiveTaskStages（任務階段）
CREATE TABLE IF NOT EXISTS ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_active_stages_task ON ActiveTaskStages(task_id);
CREATE INDEX IF NOT EXISTS idx_active_stages_order ON ActiveTaskStages(task_id, stage_order);


