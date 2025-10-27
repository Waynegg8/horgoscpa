# ActiveTaskStages (執行中任務階段)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  active_task_id INTEGER NOT NULL,
  stage_template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  estimated_days INTEGER NOT NULL,
  start_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT '未開始',
  notes TEXT,
  FOREIGN KEY (active_task_id) REFERENCES ActiveTasks(active_task_id),
  FOREIGN KEY (stage_template_id) REFERENCES TaskStageTemplates(stage_template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `active_stage_id` | INTEGER PK | 執行中階段 ID |
| `active_task_id` | INTEGER FK | 執行中任務 ID |
| `stage_template_id` | INTEGER FK | 階段模板 ID |
| `stage_name` | TEXT | 階段名稱 |
| `stage_order` | INTEGER | 階段順序 |
| `estimated_days` | INTEGER | 預計天數 |
| `start_date` | TEXT | 實際開始日期 |
| `due_date` | TEXT | 該階段到期日（start_date + estimated_days） |
| `completed_date` | TEXT | 完成日期 |
| `status` | TEXT | 狀態（'未開始', '進行中', '已完成', '逾期'） |
| `notes` | TEXT | 備註 |

---

## 索引

```sql
CREATE INDEX idx_stages_task ON ActiveTaskStages(active_task_id);
CREATE INDEX idx_stages_status ON ActiveTaskStages(status);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [階段進度更新](../../功能模塊/17-階段進度更新.md)
- [自動化流程 - 逾期檢測器](../../自動化流程/02-逾期檢測器.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  active_task_id INTEGER NOT NULL,
  stage_template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  estimated_days INTEGER NOT NULL,
  start_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT '未開始',
  notes TEXT,
  FOREIGN KEY (active_task_id) REFERENCES ActiveTasks(active_task_id),
  FOREIGN KEY (stage_template_id) REFERENCES TaskStageTemplates(stage_template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `active_stage_id` | INTEGER PK | 執行中階段 ID |
| `active_task_id` | INTEGER FK | 執行中任務 ID |
| `stage_template_id` | INTEGER FK | 階段模板 ID |
| `stage_name` | TEXT | 階段名稱 |
| `stage_order` | INTEGER | 階段順序 |
| `estimated_days` | INTEGER | 預計天數 |
| `start_date` | TEXT | 實際開始日期 |
| `due_date` | TEXT | 該階段到期日（start_date + estimated_days） |
| `completed_date` | TEXT | 完成日期 |
| `status` | TEXT | 狀態（'未開始', '進行中', '已完成', '逾期'） |
| `notes` | TEXT | 備註 |

---

## 索引

```sql
CREATE INDEX idx_stages_task ON ActiveTaskStages(active_task_id);
CREATE INDEX idx_stages_status ON ActiveTaskStages(status);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [階段進度更新](../../功能模塊/17-階段進度更新.md)
- [自動化流程 - 逾期檢測器](../../自動化流程/02-逾期檢測器.md)

---

**最後更新：** 2025年10月27日



