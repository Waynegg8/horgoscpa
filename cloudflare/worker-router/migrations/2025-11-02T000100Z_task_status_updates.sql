-- 任务状态更新记录表（保留完整历史）

CREATE TABLE IF NOT EXISTS TaskStatusUpdates (
  update_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  
  -- 基本信息
  status TEXT NOT NULL,
  updated_by INTEGER NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- 三种说明
  progress_note TEXT,        -- 进度说明（进行中时填写）
  blocker_reason TEXT,       -- 阻塞原因（被阻塞时必填）
  overdue_reason TEXT,       -- 逾期原因（逾期时必填）
  
  -- 预计完成
  expected_completion_date TEXT,
  
  FOREIGN KEY (task_id) REFERENCES Tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_status_updates_task ON TaskStatusUpdates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_updates_time ON TaskStatusUpdates(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_status_updates_by ON TaskStatusUpdates(updated_by);

