-- 创建服务组成部分表
-- 2025-11-01

CREATE TABLE IF NOT EXISTS ServiceComponents (
  component_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  service_id INTEGER,
  service_item_id INTEGER,
  component_name TEXT NOT NULL,
  delivery_frequency TEXT DEFAULT 'monthly',
  delivery_months TEXT,
  task_template_id INTEGER,
  auto_generate_task BOOLEAN DEFAULT 1,
  advance_days INTEGER DEFAULT 7,
  due_date_rule TEXT,
  due_date_value INTEGER,
  due_date_offset_days INTEGER DEFAULT 0,
  estimated_hours REAL,
  sop_id INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (service_item_id) REFERENCES ServiceItems(item_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(template_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_components_client_service ON ServiceComponents(client_service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_service ON ServiceComponents(service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_item ON ServiceComponents(service_item_id);
CREATE INDEX IF NOT EXISTS idx_service_components_template ON ServiceComponents(task_template_id);
CREATE INDEX IF NOT EXISTS idx_service_components_active ON ServiceComponents(is_active);

