# ExternalArticles 資料表

**用途：** 儲存外部文章連結與摘要  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE ExternalArticles (
  external_article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                         -- 文章標題
  url TEXT NOT NULL,                           -- 外部連結
  source TEXT,                                 -- 來源（財政部/國稅局等）
  summary TEXT,                                -- 摘要說明
  category TEXT,                               -- 分類
  tags TEXT,                                   -- 標籤（JSON 陣列）
  published_date TEXT,                         -- 原文發布日期
  click_count INTEGER DEFAULT 0,               -- 點擊次數
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_external_category ON ExternalArticles(category);
CREATE INDEX idx_external_source ON ExternalArticles(source);
CREATE INDEX idx_external_deleted ON ExternalArticles(is_deleted);
CREATE INDEX idx_external_published ON ExternalArticles(published_date);
```

---

## 範例資料

```sql
INSERT INTO ExternalArticles (
  title, url, source, summary, category, tags, 
  published_date, created_by
) VALUES (
  '113年度綜合所得稅新制說明',
  'https://www.ntbt.gov.tw/example',
  '財政部',
  '113年度綜所稅新增扣除額項目及額度調整說明',
  '稅務法規',
  '["所得稅", "新制", "扣除額"]',
  '2024-01-15',
  1
);
```

---

## 相關文檔

- [功能模塊 - 外部文章管理](../../功能模塊/21-外部文章管理.md)

