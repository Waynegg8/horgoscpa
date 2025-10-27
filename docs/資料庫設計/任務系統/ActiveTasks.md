# ActiveTasks 資料表

**用途：** 儲存任務實例（從模板建立的實際任務）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE ActiveTasks (
  task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,                     -- 客戶統編
  task_template_id INTEGER,                    -- 來源模板
  task_name TEXT NOT NULL,                     -- 任務名稱
  estimated_days INTEGER,                      -- 預計總天數
  actual_start_date TEXT,                      -- 實際開始日期
  expected_due_date TEXT,                      -- 預計到期日
  actual_completion_date TEXT,                 -- 實際完成日期
  status TEXT DEFAULT 'pending',               -- pending/in_progress/completed/overdue
  progress INTEGER DEFAULT 0,                  -- 進度百分比（0-100）
  assigned_to INTEGER,                         -- 負責人
  notes TEXT,                                  -- 備註
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id),
  FOREIGN KEY (assigned_to) REFERENCES Users(user_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_active_tasks_client ON ActiveTasks(client_id) WHERE is_deleted = 0;
CREATE INDEX idx_active_tasks_assigned ON ActiveTasks(assigned_to) WHERE is_deleted = 0;
CREATE INDEX idx_active_tasks_status ON ActiveTasks(status) WHERE is_deleted = 0;
CREATE INDEX idx_active_tasks_due_date ON ActiveTasks(expected_due_date) WHERE is_deleted = 0;
```

---

## 相關文檔

- [功能模塊 - 任務進度追蹤](../../功能模塊/16-任務進度追蹤.md)
- [TaskTemplates 資料表](./TaskTemplates.md)
- [ActiveTaskStages 資料表](./ActiveTaskStages.md)





