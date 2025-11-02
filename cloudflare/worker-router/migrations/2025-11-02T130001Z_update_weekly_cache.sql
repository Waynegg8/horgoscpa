-- 更新周缓存表：添加版本控制和失效标记

-- 先删除旧索引
DROP INDEX IF EXISTS idx_weekly_cache_updated;

-- 添加新字段
ALTER TABLE WeeklyTimesheetCache ADD COLUMN data_version INTEGER DEFAULT 1;
ALTER TABLE WeeklyTimesheetCache ADD COLUMN invalidated INTEGER DEFAULT 0;
ALTER TABLE WeeklyTimesheetCache ADD COLUMN hit_count INTEGER DEFAULT 0;
ALTER TABLE WeeklyTimesheetCache ADD COLUMN last_accessed_at TEXT;

-- 更新现有索引
DROP INDEX IF EXISTS idx_weekly_cache_user_week;
CREATE INDEX IF NOT EXISTS idx_weekly_cache_user_week 
ON WeeklyTimesheetCache(user_id, week_start_date) WHERE invalidated = 0;

CREATE INDEX IF NOT EXISTS idx_weekly_cache_invalidated 
ON WeeklyTimesheetCache(invalidated, last_updated_at);

