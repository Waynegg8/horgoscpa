-- Cron Job Executions (排程執行記錄)
-- 用於追蹤自動化任務的執行歷史與狀態

CREATE TABLE IF NOT EXISTS CronJobExecutions (
  execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,              -- 任務名稱（如 comp_leave_expiry, annual_leave_update）
  status TEXT NOT NULL,                -- success|failed|running
  executed_at TEXT NOT NULL,           -- 執行時間（UTC ISO8601）
  details TEXT,                        -- JSON 格式詳細資訊（成功時記錄影響筆數等）
  error_message TEXT,                  -- 錯誤訊息（失敗時）
  CHECK (status IN ('success', 'failed', 'running'))
);

-- 索引：按任務名稱查詢執行歷史
CREATE INDEX IF NOT EXISTS idx_cron_executions_job_name 
ON CronJobExecutions(job_name, executed_at DESC);

-- 索引：按執行時間查詢
CREATE INDEX IF NOT EXISTS idx_cron_executions_executed_at 
ON CronJobExecutions(executed_at DESC);

