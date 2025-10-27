# SOPDocuments (SOP 文件)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  service_template_id INTEGER,
  content TEXT,
  last_edited_by INTEGER,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id),
  FOREIGN KEY (last_edited_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `sop_id` | INTEGER PK | SOP 文件 ID |
| `title` | TEXT | SOP 標題（例如：'記帳服務標準作業流程'） |
| `service_template_id` | INTEGER FK | 關聯的服務模板（可選） |
| `content` | TEXT | SOP 內容（HTML/Markdown） |
| `last_edited_by` | INTEGER FK | 最後編輯者 |
| `version` | INTEGER | 版本號 |
| `created_at` | TEXT | 建立時間 |
| `updated_at` | TEXT | 更新時間 |

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [SOP 文件管理](../../功能模塊/18-SOP文件管理.md)
- [SOP版本控制](./SOPDocumentVersions.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  service_template_id INTEGER,
  content TEXT,
  last_edited_by INTEGER,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id),
  FOREIGN KEY (last_edited_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `sop_id` | INTEGER PK | SOP 文件 ID |
| `title` | TEXT | SOP 標題（例如：'記帳服務標準作業流程'） |
| `service_template_id` | INTEGER FK | 關聯的服務模板（可選） |
| `content` | TEXT | SOP 內容（HTML/Markdown） |
| `last_edited_by` | INTEGER FK | 最後編輯者 |
| `version` | INTEGER | 版本號 |
| `created_at` | TEXT | 建立時間 |
| `updated_at` | TEXT | 更新時間 |

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [SOP 文件管理](../../功能模塊/18-SOP文件管理.md)
- [SOP版本控制](./SOPDocumentVersions.md)

---

**最後更新：** 2025年10月27日



