-- 服务组成任务配置表（存储手动配置的任务及其SOP）
-- 2025-11-01

-- 服务组成任务配置
CREATE TABLE IF NOT EXISTS ServiceComponentTasks (
  config_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  task_order INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  assignee_user_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_tasks_component ON ServiceComponentTasks(component_id);

-- 服务组成任务配置的SOP关联（任务层级的SOP）
CREATE TABLE IF NOT EXISTS ServiceComponentTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_config_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_config_id) REFERENCES ServiceComponentTasks(config_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(task_config_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_task_sops_task ON ServiceComponentTaskSOPs(task_config_id);
CREATE INDEX IF NOT EXISTS idx_service_component_task_sops_sop ON ServiceComponentTaskSOPs(sop_id);

