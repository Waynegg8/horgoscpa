# SystemSettings (系統參數)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SystemSettings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

儲存系統級別的配置參數

---

## 範例資料（權限控制）

```sql
INSERT INTO SystemSettings (key, value) VALUES 
  ('module_visibility_dashboard', 'true'),
  ('module_visibility_timesheet', 'true'),
  ('module_visibility_tasks', 'true'),
  ('module_visibility_sop', 'false'),
  ('module_visibility_clients', 'false'),
  ('module_visibility_cms', 'false');
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [權限系統設計](../../權限系統設計.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE SystemSettings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

儲存系統級別的配置參數

---

## 範例資料（權限控制）

```sql
INSERT INTO SystemSettings (key, value) VALUES 
  ('module_visibility_dashboard', 'true'),
  ('module_visibility_timesheet', 'true'),
  ('module_visibility_tasks', 'true'),
  ('module_visibility_sop', 'false'),
  ('module_visibility_clients', 'false'),
  ('module_visibility_cms', 'false');
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [權限系統設計](../../權限系統設計.md)

---

**最後更新：** 2025年10月27日



