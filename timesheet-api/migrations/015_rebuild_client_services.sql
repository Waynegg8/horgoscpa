-- 重建 client_services 表以符合新设计
-- 备份旧表并创建新表

-- 0. 删除依赖的视图
DROP VIEW IF EXISTS v_client_services_overview;

-- 1. 重命名现有表作为备份
ALTER TABLE client_services RENAME TO client_services_old;

-- 2. 创建新的 client_services 表
CREATE TABLE client_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  
  -- 服务类型
  service_type TEXT NOT NULL CHECK (service_type IN (
    'accounting',
    'vat',
    'income_tax',
    'withholding',
    'prepayment',
    'dividend',
    'nhi',
    'shareholder_tax',
    'audit',
    'company_setup'
  )),
  
  -- 服务频率
  frequency TEXT NOT NULL CHECK (frequency IN (
    'monthly',
    'bimonthly',
    'quarterly',
    'biannual',
    'annual'
  )),
  
  -- 费用与工时
  fee DECIMAL(10,2) DEFAULT 0,
  estimated_hours DECIMAL(5,2) DEFAULT 0,
  
  -- 负责人与分配
  assigned_to INTEGER,
  backup_assignee INTEGER,
  
  -- 执行时间设定
  start_month INTEGER CHECK (start_month BETWEEN 1 AND 12),
  execution_day INTEGER CHECK (execution_day BETWEEN 1 AND 31),
  advance_days INTEGER DEFAULT 7,
  due_days INTEGER DEFAULT 15,
  
  -- 客户特定信息
  invoice_count INTEGER DEFAULT 0,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  
  -- 状态与备注
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  special_requirements TEXT,
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_generated_at DATETIME,
  
  -- 外键约束（暂时不强制，因为 clients 表结构不同）
  -- FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (backup_assignee) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. 创建索引
CREATE INDEX idx_client_services_client_new ON client_services(client_id);
CREATE INDEX idx_client_services_assigned_new ON client_services(assigned_to);
CREATE INDEX idx_client_services_type_new ON client_services(service_type);
CREATE INDEX idx_client_services_active_new ON client_services(is_active);
CREATE INDEX idx_client_services_frequency_new ON client_services(frequency);

-- 4. 更新 updated_at 触发器
DROP TRIGGER IF EXISTS update_client_services_timestamp;
CREATE TRIGGER update_client_services_timestamp 
AFTER UPDATE ON client_services
BEGIN
  UPDATE client_services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 5. 验证
SELECT 'New client_services table created' AS status;

