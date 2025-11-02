-- 任务到期日调整记录表

CREATE TABLE IF NOT EXISTS TaskDueDateAdjustments (
  adjustment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  
  -- 调整信息
  old_due_date TEXT NOT NULL,
  new_due_date TEXT NOT NULL,
  days_changed INTEGER NOT NULL, -- 负数=提前，正数=延后
  
  -- 原因与类型
  adjustment_reason TEXT, -- 调整原因（创建时修改预设期限需要填写）
  adjustment_type TEXT NOT NULL, -- initial_create/manual_adjust/system_auto/overdue_adjust
  
  -- 申请人
  requested_by INTEGER NOT NULL,
  requested_at TEXT DEFAULT (datetime('now')),
  
  -- 系统判定标记
  is_overdue_adjustment BOOLEAN DEFAULT 0, -- 是否在逾期后调整
  is_initial_creation BOOLEAN DEFAULT 0,   -- 是否是初始创建时的调整
  is_system_auto BOOLEAN DEFAULT 0,        -- 是否是系统自动调整
  
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_adjustments_task ON TaskDueDateAdjustments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_time ON TaskDueDateAdjustments(requested_at);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_type ON TaskDueDateAdjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_by ON TaskDueDateAdjustments(requested_by);

