# TaskStageTemplates (任務階段模板)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE TaskStageTemplates (
  stage_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  estimated_days INTEGER NOT NULL,
  description TEXT,
  depends_on INTEGER,
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `stage_template_id` | INTEGER PK | 階段模板 ID |
| `task_template_id` | INTEGER FK | 任務模板 ID |
| `stage_name` | TEXT | 階段名稱（例如：'資料收集', '營業稅申報'） |
| `stage_order` | INTEGER | 階段順序（1, 2, 3...） |
| `estimated_days` | INTEGER | 預計所需天數 |
| `description` | TEXT | 階段說明 |
| `depends_on` | INTEGER | 依賴的階段 ID |

---

## 範例資料

```sql
-- 記帳標準流程的階段
INSERT INTO TaskStageTemplates (task_template_id, stage_name, stage_order, estimated_days) VALUES 
  (1, '資料收集與核對', 1, 3),
  (1, '營業稅過帳', 2, 2),
  (1, '提列折舊', 3, 1),
  (1, '財務報表產出', 4, 2);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [任務模板管理](../../功能模塊/14-任務模板管理.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE TaskStageTemplates (
  stage_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  estimated_days INTEGER NOT NULL,
  description TEXT,
  depends_on INTEGER,
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `stage_template_id` | INTEGER PK | 階段模板 ID |
| `task_template_id` | INTEGER FK | 任務模板 ID |
| `stage_name` | TEXT | 階段名稱（例如：'資料收集', '營業稅申報'） |
| `stage_order` | INTEGER | 階段順序（1, 2, 3...） |
| `estimated_days` | INTEGER | 預計所需天數 |
| `description` | TEXT | 階段說明 |
| `depends_on` | INTEGER | 依賴的階段 ID |

---

## 範例資料

```sql
-- 記帳標準流程的階段
INSERT INTO TaskStageTemplates (task_template_id, stage_name, stage_order, estimated_days) VALUES 
  (1, '資料收集與核對', 1, 3),
  (1, '營業稅過帳', 2, 2),
  (1, '提列折舊', 3, 1),
  (1, '財務報表產出', 4, 2);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [任務模板管理](../../功能模塊/14-任務模板管理.md)

---

**最後更新：** 2025年10月27日



