-- 更新周缓存表：添加版本控制和失效标记
-- 注意：字段可能已存在

-- 先删除旧索引
DROP INDEX IF EXISTS idx_weekly_cache_updated;

-- 更新现有索引（字段可能已存在）
DROP INDEX IF EXISTS idx_weekly_cache_user_week;
CREATE INDEX IF NOT EXISTS idx_weekly_cache_user_week 
ON WeeklyTimesheetCache(user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_weekly_cache_invalidated 
ON WeeklyTimesheetCache(last_updated_at);

