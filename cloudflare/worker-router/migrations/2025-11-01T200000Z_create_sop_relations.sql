-- 创建SOP关联表（支持多对多）
-- 2025-11-01

-- 1. 任务模板阶段与SOP的多对多关系
CREATE TABLE IF NOT EXISTS TaskTemplateStageSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (stage_id) REFERENCES TaskTemplateStages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(stage_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_template_stage_sops_stage ON TaskTemplateStageSOPs(stage_id);
CREATE INDEX IF NOT EXISTS idx_template_stage_sops_sop ON TaskTemplateStageSOPs(sop_id);

-- 2. 服务组成部分与SOP的多对多关系
CREATE TABLE IF NOT EXISTS ServiceComponentSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(component_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_sops_component ON ServiceComponentSOPs(component_id);
CREATE INDEX IF NOT EXISTS idx_service_component_sops_sop ON ServiceComponentSOPs(sop_id);

-- 3. 活动任务与SOP的多对多关系（运行时）
CREATE TABLE IF NOT EXISTS ActiveTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(task_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_active_task_sops_task ON ActiveTaskSOPs(task_id);
CREATE INDEX IF NOT EXISTS idx_active_task_sops_sop ON ActiveTaskSOPs(sop_id);

-- 4. InternalFAQ与任务/服务的关系（也支持多对多）
CREATE TABLE IF NOT EXISTS TaskTemplateStageFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (stage_id) REFERENCES TaskTemplateStages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(stage_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_template_stage_faqs_stage ON TaskTemplateStageFAQs(stage_id);
CREATE INDEX IF NOT EXISTS idx_template_stage_faqs_faq ON TaskTemplateStageFAQs(faq_id);

CREATE TABLE IF NOT EXISTS ServiceComponentFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(component_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_faqs_component ON ServiceComponentFAQs(component_id);
CREATE INDEX IF NOT EXISTS idx_service_component_faqs_faq ON ServiceComponentFAQs(faq_id);

CREATE TABLE IF NOT EXISTS ActiveTaskFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(task_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_active_task_faqs_task ON ActiveTaskFAQs(task_id);
CREATE INDEX IF NOT EXISTS idx_active_task_faqs_faq ON ActiveTaskFAQs(faq_id);

-- 注意：保留原有的单一SOP字段（sop_id）作为向后兼容，但优先使用关联表


