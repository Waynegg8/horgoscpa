# PublicContent (外部網站 CMS)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE PublicContent (
  content_id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

管理外部網站的文章、FAQ等公開內容

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [外部文章管理](../../功能模塊/21-外部文章管理.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE PublicContent (
  content_id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 用途

管理外部網站的文章、FAQ等公開內容

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [外部文章管理](../../功能模塊/21-外部文章管理.md)

---

**最後更新：** 2025年10月27日



