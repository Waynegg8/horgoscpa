-- ⚡ 周工时缓存表：基于数据变动的智能缓存
-- 策略：缓存永久有效，直到该周工时数据变动时自动失效

CREATE TABLE IF NOT EXISTS WeeklyTimesheetCache (
  cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  week_start_date TEXT NOT NULL, -- YYYY-MM-DD 格式，周一日期
  
  -- 预聚合的数据（JSON格式）
  rows_data TEXT NOT NULL, -- 工时记录行数据（JSON数组）
  holidays_data TEXT, -- 假日数据（JSON对象）
  leaves_data TEXT, -- 请假数据（JSON对象）
  summary_data TEXT, -- 统计数据（JSON对象）
  
  -- 数据版本控制
  data_version INTEGER DEFAULT 1, -- 数据版本号，每次保存时递增
  invalidated INTEGER DEFAULT 0, -- 是否已失效（0=有效，1=失效）
  
  -- 元数据
  rows_count INTEGER DEFAULT 0, -- 记录行数
  total_hours REAL DEFAULT 0, -- 总工时
  hit_count INTEGER DEFAULT 0, -- 缓存命中次数
  
  -- 时间戳
  created_at TEXT NOT NULL,
  last_updated_at TEXT NOT NULL, -- 最后更新时间
  last_accessed_at TEXT, -- 最后访问时间
  
  UNIQUE(user_id, week_start_date)
);

-- 索引：快速查询有效缓存
CREATE INDEX IF NOT EXISTS idx_weekly_cache_user_week 
ON WeeklyTimesheetCache(user_id, week_start_date) WHERE invalidated = 0;

-- 索引：按失效状态查询
CREATE INDEX IF NOT EXISTS idx_weekly_cache_invalidated 
ON WeeklyTimesheetCache(invalidated, last_updated_at);

-- 为管理员创建视图（可以查看所有用户的缓存）
CREATE VIEW IF NOT EXISTS WeeklyCacheStats AS
SELECT 
  user_id,
  COUNT(*) as cached_weeks,
  SUM(rows_count) as total_rows,
  SUM(total_hours) as total_hours,
  MAX(last_updated_at) as latest_update
FROM WeeklyTimesheetCache
GROUP BY user_id;

