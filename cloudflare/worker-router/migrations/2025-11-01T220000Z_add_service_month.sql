-- 添加任务服务归属月份字段
-- 用于按月筛选和管理任务，表示该任务是为哪个月的服务而执行的

-- 1. 添加字段
ALTER TABLE ActiveTasks ADD COLUMN service_month TEXT;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_active_tasks_service_month 
  ON ActiveTasks(service_month);

-- 3. 为现有任务回填 service_month
-- 从任务名称中提取"YYYY年M月"格式
UPDATE ActiveTasks 
SET service_month = (
  CASE
    -- 匹配 "2025年1月" 格式
    WHEN task_name LIKE '%年_月%' OR task_name LIKE '%年__月%' THEN
      substr(
        task_name, 
        instr(task_name, '年') - 4, 
        instr(task_name, '月') - instr(task_name, '年') + 5
      )
    ELSE NULL
  END
)
WHERE service_month IS NULL AND is_deleted = 0;

-- 4. 对于无法解析的任务，使用创建时间的月份
UPDATE ActiveTasks 
SET service_month = strftime('%Y-%m', created_at)
WHERE service_month IS NULL AND is_deleted = 0;

-- 5. 标准化格式：将"2025年1月"转换为"2025-01"
UPDATE ActiveTasks
SET service_month = (
  substr(service_month, 1, 4) || '-' || 
  CASE 
    WHEN length(substr(service_month, 6, instr(substr(service_month, 6), '月') - 1)) = 1 
    THEN '0' || substr(service_month, 6, 1)
    ELSE substr(service_month, 6, 2)
  END
)
WHERE service_month LIKE '%年%月%' AND is_deleted = 0;

-- 6. 验证：确保所有活动任务都有 service_month
-- （预期结果：应该是0行）
-- SELECT COUNT(*) FROM ActiveTasks WHERE service_month IS NULL AND is_deleted = 0;

