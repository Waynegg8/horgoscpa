# PublicResources (外部資源中心)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE PublicResources (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  r2_object_key TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

管理外部網站提供下載的資源檔案（PDF, DOCX等）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [資源中心管理](../../功能模塊/22-資源中心管理.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE PublicResources (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  r2_object_key TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

管理外部網站提供下載的資源檔案（PDF, DOCX等）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [資源中心管理](../../功能模塊/22-資源中心管理.md)

---

**最後更新：** 2025年10月27日



