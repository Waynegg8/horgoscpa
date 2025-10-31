-- 创建任务模板表
CREATE TABLE IF NOT EXISTS TaskTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,
  service_id INTEGER,
  description TEXT,
  sop_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);

CREATE INDEX IF NOT EXISTS idx_task_templates_service ON TaskTemplates(service_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON TaskTemplates(is_active);

-- 创建任务模板阶段表
CREATE TABLE IF NOT EXISTS TaskTemplateStages (
  stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  description TEXT,
  estimated_hours REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES TaskTemplates(template_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_stages_template ON TaskTemplateStages(template_id);
CREATE INDEX IF NOT EXISTS idx_template_stages_order ON TaskTemplateStages(template_id, stage_order);

