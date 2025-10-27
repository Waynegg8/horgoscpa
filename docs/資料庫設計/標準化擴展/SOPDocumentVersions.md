# SOPDocumentVersions (SOP 版本控制)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SOPDocumentVersions (
  version_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT,
  edited_by INTEGER,
  edited_at TEXT DEFAULT (datetime('now')),
  change_summary TEXT,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (edited_by) REFERENCES Users(user_id)
);
```

---

## 用途

每次編輯 SOP 時自動保存歷史版本

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [SOP 文件管理](../../功能模塊/18-SOP文件管理.md)
- [SOPDocuments](../知識庫/SOPDocuments.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SOPDocumentVersions (
  version_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT,
  edited_by INTEGER,
  edited_at TEXT DEFAULT (datetime('now')),
  change_summary TEXT,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id),
  FOREIGN KEY (edited_by) REFERENCES Users(user_id)
);
```

---

## 用途

每次編輯 SOP 時自動保存歷史版本

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [SOP 文件管理](../../功能模塊/18-SOP文件管理.md)
- [SOPDocuments](../知識庫/SOPDocuments.md)

---

**最後更新：** 2025年10月27日



