-- ⚡ 通用数据缓存表：基于数据变动的智能缓存
-- 策略：缓存永久有效，直到数据变动时主动清除

CREATE TABLE IF NOT EXISTS UniversalDataCache (
  cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE, -- 缓存键，格式：cache_type:identifier
  cache_type TEXT NOT NULL, -- 缓存类型：clients_list, holidays_range, leaves_month, monthly_summary
  
  -- 缓存数据（JSON格式）
  cached_data TEXT NOT NULL,
  
  -- 数据版本控制
  data_version INTEGER DEFAULT 1, -- 数据版本号，变动时递增
  invalidated INTEGER DEFAULT 0, -- 是否已失效（0=有效，1=失效）
  
  -- 元数据
  user_id INTEGER, -- 用户相关缓存才需要（如 monthly_summary）
  scope_params TEXT, -- 缓存范围参数（如日期范围、筛选条件等）JSON格式
  data_size INTEGER DEFAULT 0, -- 数据大小（字节）
  hit_count INTEGER DEFAULT 0, -- 命中次数
  
  -- 时间戳
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,
  last_updated_at TEXT NOT NULL
);

-- 索引：快速查询缓存键
CREATE INDEX IF NOT EXISTS idx_cache_key 
ON UniversalDataCache(cache_key) WHERE invalidated = 0;

-- 索引：按类型查询（只查询有效缓存）
CREATE INDEX IF NOT EXISTS idx_cache_type_valid 
ON UniversalDataCache(cache_type, invalidated);

-- 索引：按用户查询
CREATE INDEX IF NOT EXISTS idx_cache_user 
ON UniversalDataCache(user_id) WHERE user_id IS NOT NULL AND invalidated = 0;

-- 视图：缓存统计
CREATE VIEW IF NOT EXISTS CacheStats AS
SELECT 
  cache_type,
  COUNT(*) as total_entries,
  SUM(CASE WHEN invalidated = 0 THEN 1 ELSE 0 END) as valid_entries,
  SUM(CASE WHEN invalidated = 1 THEN 1 ELSE 0 END) as invalidated_entries,
  SUM(data_size) as total_size_bytes,
  SUM(hit_count) as total_hits,
  AVG(data_version) as avg_version,
  MAX(last_accessed_at) as last_access
FROM UniversalDataCache
GROUP BY cache_type;

-- ==================== 缓存失效规则表 ====================
-- 定义：当某个表的数据变动时，哪些缓存需要失效

CREATE TABLE IF NOT EXISTS CacheInvalidationRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_table TEXT NOT NULL, -- 源表名（如 Timesheets, Clients）
  source_operation TEXT NOT NULL, -- 操作类型（INSERT, UPDATE, DELETE）
  target_cache_type TEXT NOT NULL, -- 需要失效的缓存类型
  scope_filter TEXT, -- 失效范围过滤器（JSON格式，如 {"user_id": "affected_user"}）
  description TEXT
);

-- 插入默认规则
INSERT INTO CacheInvalidationRules (source_table, source_operation, target_cache_type, scope_filter, description) VALUES
-- 工时表变动
('Timesheets', 'INSERT', 'weekly_timesheet', '{"user_id": "affected"}', '新增工时时失效该用户的周缓存'),
('Timesheets', 'UPDATE', 'weekly_timesheet', '{"user_id": "affected"}', '更新工时时失效该用户的周缓存'),
('Timesheets', 'DELETE', 'weekly_timesheet', '{"user_id": "affected"}', '删除工时时失效该用户的周缓存'),
('Timesheets', 'INSERT', 'monthly_summary', '{"user_id": "affected"}', '新增工时时失效月度统计'),
('Timesheets', 'UPDATE', 'monthly_summary', '{"user_id": "affected"}', '更新工时时失效月度统计'),
('Timesheets', 'DELETE', 'monthly_summary', '{"user_id": "affected"}', '删除工时时失效月度统计'),

-- 客户表变动
('Clients', 'INSERT', 'clients_list', NULL, '新增客户时失效客户列表缓存'),
('Clients', 'UPDATE', 'clients_list', NULL, '更新客户时失效客户列表缓存'),
('Clients', 'DELETE', 'clients_list', NULL, '删除客户时失效客户列表缓存'),

-- 假日表变动
('Holidays', 'INSERT', 'holidays_range', NULL, '新增假日时失效假日缓存'),
('Holidays', 'UPDATE', 'holidays_range', NULL, '更新假日时失效假日缓存'),
('Holidays', 'DELETE', 'holidays_range', NULL, '删除假日时失效假日缓存'),

-- 请假表变动
('LeaveRequests', 'INSERT', 'leaves_month', '{"user_id": "affected"}', '新增请假时失效请假缓存'),
('LeaveRequests', 'UPDATE', 'leaves_month', '{"user_id": "affected"}', '更新请假时失效请假缓存'),
('LeaveRequests', 'DELETE', 'leaves_month', '{"user_id": "affected"}', '删除请假时失效请假缓存');

CREATE INDEX IF NOT EXISTS idx_invalidation_rules 
ON CacheInvalidationRules(source_table, source_operation);

