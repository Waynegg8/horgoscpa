-- Migration 013 补充: 创建缺失的客户服务相关表
-- 日期: 2025-10-26

-- ============================================================================
-- 1. 服务检查清单模板表
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_checklist_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- 检查清单内容（JSON格式）
  checklist_data TEXT NOT NULL,
  
  -- 状态
  is_active BOOLEAN DEFAULT 1,
  is_default BOOLEAN DEFAULT 0,
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 预设检查清单模板
INSERT OR IGNORE INTO service_checklist_templates (service_type, template_name, is_default, checklist_data) VALUES

-- 营业税申报检查清单
('vat', '标准营业税申报流程', 1, '[
  {
    "order": 1,
    "name": "资料收集",
    "checklist_items": ["收集进项发票", "收集销项发票", "整理其他凭证"],
    "estimated_hours": 2.0,
    "requires_approval": false
  },
  {
    "order": 2,
    "name": "资料审核",
    "checklist_items": ["营业人基本资料地址是否正确", "负责人姓名、统编、地址", "核对统一编号", "核对金额正确性", "检查发票完整性"],
    "estimated_hours": 1.5,
    "requires_approval": true
  },
  {
    "order": 3,
    "name": "计算税额",
    "checklist_items": ["税后净利", "法定盈余提存", "盈余分配", "应付所得税", "营业税是否正常"],
    "estimated_hours": 1.0,
    "requires_approval": false
  },
  {
    "order": 4,
    "name": "填写申报书",
    "checklist_items": ["营业收入总额", "与去年同期差异", "扣抵或原料税额"],
    "estimated_hours": 1.0,
    "requires_approval": false
  },
  {
    "order": 5,
    "name": "主管审核",
    "checklist_items": ["会计师审核", "核对计算无误", "确认可申报"],
    "estimated_hours": 0.5,
    "requires_approval": true
  },
  {
    "order": 6,
    "name": "线上申报",
    "checklist_items": ["401进项", "营业税表头", "扣缴与档案", "盈余申报", "确认申报成功"],
    "estimated_hours": 0.5,
    "requires_approval": false
  },
  {
    "order": 7,
    "name": "缴纳税款",
    "checklist_items": ["确认应纳税额", "缴纳或申请退税", "留存缴款证明"],
    "estimated_hours": 0.5,
    "requires_approval": false
  },
  {
    "order": 8,
    "name": "归档整理",
    "checklist_items": ["整理申报资料", "扫描重要文件", "更新客户档案"],
    "estimated_hours": 0.5,
    "requires_approval": false
  }
]'),

-- 记帐服务检查清单
('accounting', '月度记帐标准流程', 1, '[
  {
    "order": 1,
    "name": "凭证整理",
    "checklist_items": ["收集本月所有凭证", "发票分类整理", "银行对帐单核对"],
    "estimated_hours": 2.0,
    "requires_approval": false
  },
  {
    "order": 2,
    "name": "帐务处理",
    "checklist_items": ["输入传票", "科目分类", "金额核对"],
    "estimated_hours": 3.0,
    "requires_approval": false
  },
  {
    "order": 3,
    "name": "报表产出",
    "checklist_items": ["资产负债表", "损益表", "现金流量表"],
    "estimated_hours": 1.0,
    "requires_approval": false
  },
  {
    "order": 4,
    "name": "审核确认",
    "checklist_items": ["会计师审核", "异常项目检查", "客户确认"],
    "estimated_hours": 1.0,
    "requires_approval": true
  }
]'),

-- 营所税申报检查清单
('income_tax', '营利事业所得税申报流程', 1, '[
  {
    "order": 1,
    "name": "年度帐务整理",
    "checklist_items": ["全年度帐务检查", "调整分录", "结帐处理"],
    "estimated_hours": 4.0,
    "requires_approval": false
  },
  {
    "order": 2,
    "name": "税务调整",
    "checklist_items": ["税法规定调整", "费用限额计算", "亏损扣除"],
    "estimated_hours": 3.0,
    "requires_approval": true
  },
  {
    "order": 3,
    "name": "申报书填写",
    "checklist_items": ["营利事业所得税申报书", "财务报表", "相关附件"],
    "estimated_hours": 2.0,
    "requires_approval": false
  },
  {
    "order": 4,
    "name": "会计师审核",
    "checklist_items": ["会计师签核", "确认可申报"],
    "estimated_hours": 1.0,
    "requires_approval": true
  },
  {
    "order": 5,
    "name": "线上申报",
    "checklist_items": ["上传申报资料", "确认申报成功", "列印申报证明"],
    "estimated_hours": 0.5,
    "requires_approval": false
  }
]');

-- 索引
CREATE INDEX IF NOT EXISTS idx_checklist_templates_type ON service_checklist_templates(service_type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_active ON service_checklist_templates(is_active);

-- ============================================================================
-- 2. 任务执行记录表
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_execution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  multi_stage_task_id INTEGER,
  client_service_id INTEGER,
  
  -- 执行信息
  execution_period TEXT,
  status TEXT CHECK (status IN (
    'pending',
    'in_progress',
    'waiting_approval',
    'completed',
    'failed',
    'cancelled'
  )) DEFAULT 'pending',
  
  -- 人员信息
  executor_id INTEGER,
  approver_id INTEGER,
  
  -- 时间记录
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  approved_at DATETIME,
  
  -- 工时与费用
  actual_hours DECIMAL(5,2),
  billed_amount DECIMAL(10,2),
  
  -- 备注与附件
  notes TEXT,
  attachments TEXT,
  
  -- 外键
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (multi_stage_task_id) REFERENCES multi_stage_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE SET NULL,
  FOREIGN KEY (executor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_task_execution_task ON task_execution_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_service ON task_execution_log(client_service_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_period ON task_execution_log(execution_period);
CREATE INDEX IF NOT EXISTS idx_task_execution_status ON task_execution_log(status);

-- ============================================================================
-- 3. 任务生成记录表（防止重复生成）
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  execution_period TEXT NOT NULL,
  generated_task_id INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  generation_method TEXT,
  
  FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  
  UNIQUE(client_service_id, execution_period)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_task_generation_service ON task_generation_log(client_service_id);
CREATE INDEX IF NOT EXISTS idx_task_generation_period ON task_generation_log(execution_period);

-- ============================================================================
-- 4. 触发器 - 自动更新 updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_checklist_templates_timestamp;
CREATE TRIGGER update_checklist_templates_timestamp 
AFTER UPDATE ON service_checklist_templates
BEGIN
  UPDATE service_checklist_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- 5. 视图 - 方便查询
-- ============================================================================

-- 客户服务概览
DROP VIEW IF EXISTS v_client_services_overview;
CREATE VIEW v_client_services_overview AS
SELECT 
  cs.id,
  cs.client_id,
  c.name AS client_name,
  c.tax_id,
  cs.service_type,
  cs.frequency,
  cs.fee,
  u.full_name AS assigned_to_name,
  cs.is_active,
  cs.last_generated_at,
  COUNT(tel.id) AS execution_count,
  SUM(CASE WHEN tel.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
FROM client_services cs
LEFT JOIN clients c ON cs.client_id = c.id
LEFT JOIN users u ON cs.assigned_to = u.id
LEFT JOIN task_execution_log tel ON cs.id = tel.client_service_id
GROUP BY cs.id;

-- 检查表是否创建成功
SELECT 
  'service_checklist_templates' AS table_name, 
  COUNT(*) AS row_count 
FROM service_checklist_templates
UNION ALL
SELECT 
  'task_execution_log', 
  COUNT(*) 
FROM task_execution_log
UNION ALL
SELECT 
  'task_generation_log', 
  COUNT(*) 
FROM task_generation_log;

