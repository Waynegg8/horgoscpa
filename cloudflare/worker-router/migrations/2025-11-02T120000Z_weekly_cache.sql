-- ⚡ 周工时缓存表：预聚合数据，极速加载
-- 目标：将周数据加载从 500ms 降低到 50ms

CREATE TABLE IF NOT EXISTS WeeklyTimesheetCache (
  cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  week_start_date TEXT NOT NULL, -- YYYY-MM-DD 格式，周一日期
  
  -- 预聚合的数据（JSON格式）
  rows_data TEXT NOT NULL, -- 工时记录行数据（JSON数组）
  holidays_data TEXT, -- 假日数据（JSON对象）
  leaves_data TEXT, -- 请假数据（JSON对象）
  summary_data TEXT, -- 统计数据（JSON对象）
  
  -- 元数据
  rows_count INTEGER DEFAULT 0, -- 记录行数
  total_hours REAL DEFAULT 0, -- 总工时
  last_updated_at TEXT NOT NULL, -- 最后更新时间
  created_at TEXT NOT NULL,
  
  UNIQUE(user_id, week_start_date)
);

-- 索引：快速查询缓存
CREATE INDEX IF NOT EXISTS idx_weekly_cache_user_week 
ON WeeklyTimesheetCache(user_id, week_start_date);

-- 索引：清理过期缓存
CREATE INDEX IF NOT EXISTS idx_weekly_cache_updated 
ON WeeklyTimesheetCache(last_updated_at);

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

