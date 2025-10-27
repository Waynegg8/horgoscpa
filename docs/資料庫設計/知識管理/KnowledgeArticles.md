# KnowledgeArticles 資料表

**用途：** 儲存內部知識庫文章  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE KnowledgeArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                         -- 文章標題
  content TEXT NOT NULL,                       -- 文章內容（Markdown）
  category TEXT,                               -- 分類
  tags TEXT,                                   -- 標籤（JSON 陣列）
  is_pinned BOOLEAN DEFAULT 0,                 -- 是否置頂
  view_count INTEGER DEFAULT 0,                -- 瀏覽次數
  created_by INTEGER NOT NULL,
  updated_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (updated_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_knowledge_category ON KnowledgeArticles(category);
CREATE INDEX idx_knowledge_pinned ON KnowledgeArticles(is_pinned);
CREATE INDEX idx_knowledge_deleted ON KnowledgeArticles(is_deleted);
CREATE INDEX idx_knowledge_created ON KnowledgeArticles(created_at);
```

---

## 範例資料

```sql
INSERT INTO KnowledgeArticles (
  title, content, category, tags, is_pinned, created_by
) VALUES (
  '營業稅申報常見問題',
  '# 營業稅申報常見問題\n\n## Q1: 零稅率與免稅的差異...',
  '稅務知識',
  '["營業稅", "申報", "FAQ"]',
  1,
  1
);
```

---

## 相關文檔

- [功能模塊 - 通用知識庫](../../功能模塊/20-通用知識庫.md)

