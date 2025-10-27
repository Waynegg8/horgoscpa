# TaskTemplates (任務模板)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE TaskTemplates (
  task_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service_template_id INTEGER,
  description TEXT,
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `task_template_id` | INTEGER PK | 任務模板 ID |
| `name` | TEXT | 模板名稱（例如：'記帳標準流程', '公司設立流程'） |
| `service_template_id` | INTEGER FK | 關聯的服務模板 |
| `description` | TEXT | 模板說明 |

---

## 範例資料

```sql
INSERT INTO TaskTemplates (name, description) VALUES 
  ('記帳標準流程（雙月）', '雙月記帳服務的標準作業流程'),
  ('公司設立流程', '新公司設立的完整流程');
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
CREATE TABLE TaskTemplates (
  task_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service_template_id INTEGER,
  description TEXT,
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `task_template_id` | INTEGER PK | 任務模板 ID |
| `name` | TEXT | 模板名稱（例如：'記帳標準流程', '公司設立流程'） |
| `service_template_id` | INTEGER FK | 關聯的服務模板 |
| `description` | TEXT | 模板說明 |

---

## 範例資料

```sql
INSERT INTO TaskTemplates (name, description) VALUES 
  ('記帳標準流程（雙月）', '雙月記帳服務的標準作業流程'),
  ('公司設立流程', '新公司設立的完整流程');
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [任務模板管理](../../功能模塊/14-任務模板管理.md)

---

**最後更新：** 2025年10月27日



