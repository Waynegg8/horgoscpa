# ActiveTaskStages 資料表

**用途：** 儲存任務實例的階段進度  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,                    -- 所屬任務
  stage_template_id INTEGER,                   -- 來源階段模板
  stage_name TEXT NOT NULL,                    -- 階段名稱
  stage_order INTEGER NOT NULL,                -- 階段順序
  estimated_days INTEGER NOT NULL,             -- 預計天數
  actual_start_date TEXT,                      -- 實際開始日期
  expected_due_date TEXT,                      -- 預計完成日期
  actual_completion_date TEXT,                 -- 實際完成日期
  status TEXT DEFAULT 'pending',               -- pending/in_progress/completed
  depends_on INTEGER,                          -- 依賴階段ID
  notes TEXT,                                  -- 備註
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id),
  FOREIGN KEY (stage_template_id) REFERENCES TaskStageTemplates(stage_template_id),
  FOREIGN KEY (depends_on) REFERENCES ActiveTaskStages(active_stage_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_active_stages_task ON ActiveTaskStages(task_id);
CREATE INDEX idx_active_stages_status ON ActiveTaskStages(task_id, status);
CREATE INDEX idx_active_stages_order ON ActiveTaskStages(task_id, stage_order);
```

---

## 相關文檔

- [功能模塊 - 階段進度更新](../../功能模塊/17-階段進度更新.md)
- [ActiveTasks 資料表](./ActiveTasks.md)
- [TaskStageTemplates 資料表](./TaskStageTemplates.md)


