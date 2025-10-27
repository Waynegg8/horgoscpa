# ResourceCenter 資料表

**用途：** 儲存資源中心的檔案與連結  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                         -- 資源標題
  description TEXT,                            -- 資源描述
  resource_type TEXT NOT NULL,                 -- 資源類型（file/link）
  file_url TEXT,                               -- 檔案 URL（若為 file）
  external_url TEXT,                           -- 外部連結（若為 link）
  file_size INTEGER,                           -- 檔案大小（bytes）
  file_extension TEXT,                         -- 檔案副檔名
  category TEXT,                               -- 分類
  tags TEXT,                                   -- 標籤（JSON 陣列）
  download_count INTEGER DEFAULT 0,            -- 下載/點擊次數
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
CREATE INDEX idx_resource_type ON ResourceCenter(resource_type);
CREATE INDEX idx_resource_category ON ResourceCenter(category);
CREATE INDEX idx_resource_deleted ON ResourceCenter(is_deleted);
CREATE INDEX idx_resource_created ON ResourceCenter(created_at);
```

---

## 範例資料

```sql
-- 檔案資源
INSERT INTO ResourceCenter (
  title, description, resource_type, file_url, 
  file_extension, category, created_by
) VALUES (
  '公司設立登記申請書範本',
  '經濟部公司設立登記申請書標準格式',
  'file',
  '/uploads/company-registration-form.pdf',
  'pdf',
  '表單範本',
  1
);

-- 連結資源
INSERT INTO ResourceCenter (
  title, description, resource_type, external_url,
  category, created_by
) VALUES (
  '財政部稅務入口網',
  '財政部官方稅務資訊網站',
  'link',
  'https://www.etax.nat.gov.tw',
  '官方網站',
  1
);
```

---

## 相關文檔

- [功能模塊 - 資源中心管理](../../功能模塊/22-資源中心管理.md)

