-- 创建服务组成部分表（Service Components）
-- 用于配置客户服务包含的具体服务内容及其提供计划

CREATE TABLE IF NOT EXISTS ServiceComponents (
  component_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  service_item_id INTEGER,
  component_name TEXT NOT NULL,
  
  -- 提供周期配置
  delivery_frequency TEXT NOT NULL CHECK(delivery_frequency IN ('monthly', 'bi-monthly', 'quarterly', 'yearly', 'one-time')),
  delivery_months TEXT,  -- JSON数组: [1,2,3,...,12] 表示哪些月份提供
  
  -- 任务生成配置
  task_template_id INTEGER,
  auto_generate_task BOOLEAN DEFAULT 1,
  advance_days INTEGER DEFAULT 7 CHECK(advance_days >= 0),  -- 提前几天生成任务
  
  -- 期限配置
  due_date_rule TEXT CHECK(due_date_rule IN ('end_of_month', 'specific_day', 'next_month_day', 'days_after_start')),
  due_date_value INTEGER CHECK(due_date_value IS NULL OR (due_date_value >= 1 AND due_date_value <= 31)),
  due_date_offset_days INTEGER DEFAULT 0,  -- 微调天数 (+/- N天)
  
  -- 成本估算
  estimated_hours REAL CHECK(estimated_hours IS NULL OR estimated_hours >= 0),
  cost_ratio REAL CHECK(cost_ratio IS NULL OR (cost_ratio >= 0 AND cost_ratio <= 1)),  -- 成本占比（可选）
  
  -- 备注
  notes TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_active BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (service_item_id) REFERENCES ServiceItems(item_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(template_id)
);

CREATE INDEX IF NOT EXISTS idx_service_components_client_service ON ServiceComponents(client_service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_service ON ServiceComponents(service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_template ON ServiceComponents(task_template_id);
CREATE INDEX IF NOT EXISTS idx_service_components_active ON ServiceComponents(is_active);

-- 添加component_id到ActiveTasks表
ALTER TABLE ActiveTasks ADD COLUMN component_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_active_tasks_component ON ActiveTasks(component_id);

-- 创建服务组成历史记录表（可选，用于追踪配置变更）
CREATE TABLE IF NOT EXISTS ServiceComponentHistory (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  changed_field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_component_history_component ON ServiceComponentHistory(component_id);
CREATE INDEX IF NOT EXISTS idx_component_history_date ON ServiceComponentHistory(changed_at);

