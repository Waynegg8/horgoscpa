# KnowledgeBase (內部知識庫)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE KnowledgeBase (
  doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT,
  last_edited_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (last_edited_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `doc_id` | INTEGER PK | 文件 ID |
| `title` | TEXT | 標題 |
| `category` | TEXT | 分類（'FAQ', '教學', '政策'） |
| `content` | TEXT | 內容（HTML/Markdown） |
| `last_edited_by` | INTEGER FK | 最後編輯者 |

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [通用知識庫](../../功能模塊/20-通用知識庫.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE KnowledgeBase (
  doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT,
  last_edited_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (last_edited_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `doc_id` | INTEGER PK | 文件 ID |
| `title` | TEXT | 標題 |
| `category` | TEXT | 分類（'FAQ', '教學', '政策'） |
| `content` | TEXT | 內容（HTML/Markdown） |
| `last_edited_by` | INTEGER FK | 最後編輯者 |

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [通用知識庫](../../功能模塊/20-通用知識庫.md)

---

**最後更新：** 2025年10月27日



