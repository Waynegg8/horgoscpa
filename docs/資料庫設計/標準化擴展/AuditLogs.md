# AuditLogs (審計日誌)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE AuditLogs (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,        -- 'CREATE', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_value TEXT,              -- JSON 格式
  new_value TEXT,              -- JSON 格式
  timestamp TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

## 用途

自動記錄所有重要操作（新增客戶、修改任務、刪除資料等）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE AuditLogs (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,        -- 'CREATE', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_value TEXT,              -- JSON 格式
  new_value TEXT,              -- JSON 格式
  timestamp TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

## 用途

自動記錄所有重要操作（新增客戶、修改任務、刪除資料等）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)

---

**最後更新：** 2025年10月27日



