# SOP 知識管理系統設計

**版本**: 1.0  
**最後更新**: 2025-10-26

---

## 📋 功能概述

SOP（標準作業程序）知識管理系統用於建立、管理和查詢公司的標準作業流程文件，支援版本控制和搜尋功能。

### 核心功能
- SOP 文件建立與編輯
- 分類管理（階層式）
- 版本歷史記錄
- 全文搜尋
- 文件審核發布

---

## 🗄️ 資料表結構

### sop_categories (SOP 分類)
```sql
CREATE TABLE sop_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,         -- 分類名稱
  parent_id INTEGER,                 -- 父分類 ID（階層式）
  sort_order INTEGER DEFAULT 0,      -- 排序順序
  description TEXT,                  -- 分類說明
  icon TEXT,                         -- 圖示（Material Icons 名稱）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES sop_categories(id) ON DELETE CASCADE
);
```

**分類範例**：
```
會計服務
├─ 記帳服務
├─ 營業稅申報
└─ 營所稅申報

工商登記
├─ 公司設立
├─ 變更登記
└─ 解散清算

內部管理
├─ 人事管理
└─ 行政流程
```

### sops (SOP 文件)
```sql
CREATE TABLE sops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,               -- 文件標題
  category_id INTEGER,               -- 所屬分類
  content TEXT NOT NULL,             -- 文件內容（Markdown）
  version INTEGER DEFAULT 1,         -- 目前版本號
  status TEXT DEFAULT 'draft',       -- draft, published, archived
  author_id INTEGER,                 -- 作者
  business_type TEXT,                -- 關聯業務類型
  tags TEXT,                         -- 標籤（JSON 陣列）
  views INTEGER DEFAULT 0,           -- 瀏覽次數
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

### sop_versions (SOP 版本歷史)
```sql
CREATE TABLE sop_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  version INTEGER NOT NULL,          -- 版本號
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER,
  change_description TEXT,           -- 變更說明
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  UNIQUE(sop_id, version)
);
```

---

## 🔄 業務流程

### SOP 建立流程
```
1. 建立新 SOP
   - 選擇分類
   - 輸入標題
   - 撰寫內容（Markdown）
   ↓
2. 儲存草稿
   - INSERT INTO sops
   - status = 'draft'
   - version = 1
   ↓
3. 審核與發布
   - 主管審核內容
   - UPDATE status = 'published'
   - published_at = NOW()
   ↓
4. 建立版本記錄
   - INSERT INTO sop_versions
   - 記錄第一版內容
```

### SOP 修訂流程
```
1. 編輯現有 SOP
   - 載入當前內容
   - 進行修改
   ↓
2. 儲存新版本
   - 先備份當前版本到 sop_versions
   - INSERT INTO sop_versions (舊版本)
   ↓
3. 更新主記錄
   - UPDATE sops
   - content = 新內容
   - version = version + 1
   - updated_at = NOW()
   ↓
4. 記錄變更說明
   - 在 sop_versions 記錄 change_description
```

### 版本回復流程
```
1. 選擇歷史版本
   - 從 sop_versions 選擇要回復的版本
   ↓
2. 備份當前版本
   - INSERT INTO sop_versions (當前版本)
   ↓
3. 回復內容
   - UPDATE sops
   - content = 歷史版本內容
   - version = version + 1
   - change_description = "回復至版本 X"
```

---

## 🔌 API 設計

### 取得 SOP 分類樹
```
GET /api/sop-categories

Response:
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "會計服務",
      "icon": "account_balance",
      "children": [
        {
          "id": 2,
          "name": "記帳服務",
          "sop_count": 5
        }
      ]
    }
  ]
}
```

### 取得 SOP 列表
```
GET /api/sops?category_id=2&status=published&search=發票

Response:
{
  "success": true,
  "sops": [
    {
      "id": 123,
      "title": "月度記帳流程",
      "category": "記帳服務",
      "version": 3,
      "author": "user1",
      "updated_at": "2025-10-20T10:00:00Z",
      "views": 45
    }
  ]
}
```

### 取得 SOP 詳情
```
GET /api/sops/{id}

Response:
{
  "success": true,
  "sop": {
    "id": 123,
    "title": "月度記帳流程",
    "content": "# 流程說明\n\n...",
    "version": 3,
    "category": "記帳服務",
    "author": "user1",
    "tags": ["記帳", "月結"],
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-10-20T10:00:00Z",
    "views": 45
  }
}
```

### 建立 SOP
```
POST /api/sops

Request:
{
  "title": "營業稅申報流程",
  "category_id": 3,
  "content": "# 申報流程\n\n1. 收集發票...",
  "business_type": "vat",
  "tags": ["營業稅", "申報"]
}

Response:
{
  "success": true,
  "sop_id": 124
}
```

### 更新 SOP
```
PUT /api/sops/{id}

Request:
{
  "title": "營業稅申報流程（更新）",
  "content": "# 更新後的內容...",
  "change_description": "新增線上申報步驟"
}

Response:
{
  "success": true,
  "version": 4,
  "message": "SOP 已更新至版本 4"
}
```

### 取得版本歷史
```
GET /api/sops/{id}/versions

Response:
{
  "success": true,
  "versions": [
    {
      "version": 3,
      "author": "user1",
      "change_description": "修正發票收集流程",
      "created_at": "2025-10-20T10:00:00Z"
    },
    {
      "version": 2,
      "author": "user2",
      "change_description": "新增審核步驟",
      "created_at": "2025-08-15T14:30:00Z"
    }
  ]
}
```

### 搜尋 SOP
```
GET /api/sops/search?q=發票&category_id=2

Response:
{
  "success": true,
  "results": [
    {
      "id": 123,
      "title": "月度記帳流程",
      "excerpt": "...收集進項發票和銷項發票...",
      "category": "記帳服務",
      "relevance": 0.95
    }
  ]
}
```

---

## 💻 前端設計

### 頁面：sop.html

#### 左側：分類樹
```
📁 會計服務
  📄 記帳服務 (5)
  📄 營業稅申報 (3)
  📄 營所稅申報 (2)
📁 工商登記
  📄 公司設立 (4)
  📄 變更登記 (6)
```

#### 中間：SOP 列表
```
搜尋框: [搜尋 SOP...]

月度記帳流程
記帳服務 | 版本 3 | 45 次瀏覽
更新於 2025-10-20

營業稅申報流程
營業稅申報 | 版本 2 | 32 次瀏覽
更新於 2025-10-15
```

#### 右側：SOP 內容
```
# 月度記帳流程

版本: 3 | 作者: user1 | 更新: 2025-10-20

## 流程說明

1. 收集憑證
2. 帳務處理
...

[編輯] [版本歷史] [列印]
```

### 頁面：knowledge.html（公開知識庫）

對外展示的知識庫，只顯示已發布的 SOP。

---

## 📊 統計功能

### SOP 使用統計
```sql
-- 最熱門 SOP
SELECT 
  id,
  title,
  category_id,
  views,
  updated_at
FROM sops
WHERE status = 'published'
ORDER BY views DESC
LIMIT 10;
```

### 分類統計
```sql
-- 各分類 SOP 數量
SELECT 
  c.name as category,
  COUNT(s.id) as sop_count,
  SUM(s.views) as total_views
FROM sop_categories c
LEFT JOIN sops s ON c.id = s.category_id
WHERE s.status = 'published'
GROUP BY c.id
ORDER BY sop_count DESC;
```

### 更新活躍度
```sql
-- 最近更新的 SOP
SELECT 
  id,
  title,
  version,
  updated_at
FROM sops
WHERE status = 'published'
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 🔍 搜尋功能

### 全文搜尋實現

#### 簡單搜尋（LIKE）
```sql
SELECT * FROM sops
WHERE status = 'published'
  AND (title LIKE '%關鍵字%' OR content LIKE '%關鍵字%')
ORDER BY updated_at DESC;
```

#### 進階搜尋（FTS - Full Text Search）
```sql
-- 建立 FTS 虛擬表
CREATE VIRTUAL TABLE sops_fts USING fts5(
  title, 
  content,
  content=sops,
  content_rowid=id
);

-- 觸發器保持同步
CREATE TRIGGER sops_fts_insert AFTER INSERT ON sops BEGIN
  INSERT INTO sops_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- 搜尋
SELECT * FROM sops
WHERE id IN (
  SELECT rowid FROM sops_fts 
  WHERE sops_fts MATCH '發票'
)
ORDER BY rank;
```

---

## 🎨 Markdown 編輯器

### 推薦工具
- SimpleMDE
- EasyMDE
- Toast UI Editor

### 支援功能
- 標題、粗體、斜體
- 列表（有序、無序）
- 程式碼區塊
- 表格
- 連結、圖片
- 即時預覽

### 範例整合
```javascript
const editor = new EasyMDE({
  element: document.getElementById('sop-content'),
  spellChecker: false,
  placeholder: '請輸入 SOP 內容...',
  toolbar: [
    'bold', 'italic', 'heading', '|',
    'unordered-list', 'ordered-list', '|',
    'link', 'image', '|',
    'preview', 'side-by-side', 'fullscreen'
  ]
});
```

---

## 🔧 實施細節

### 自動儲存草稿
```javascript
let autoSaveTimer;

function enableAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    const content = editor.value();
    await saveDraft(sopId, content);
  }, 30000); // 30秒自動儲存
}

editor.codemirror.on('change', enableAutoSave);
```

### 版本差異比較
```javascript
// 使用 diff 庫比較兩個版本
function showVersionDiff(version1, version2) {
  const diff = Diff.diffLines(version1.content, version2.content);
  
  return diff.map(part => {
    const color = part.added ? 'green' :
                  part.removed ? 'red' : 'grey';
    return `<span style="color: ${color}">${part.value}</span>`;
  }).join('');
}
```

---

## 🚀 未來擴展

### 計劃功能
- [ ] SOP 協作編輯
- [ ] 評論與討論功能
- [ ] SOP 稽核追蹤（誰看過、何時看）
- [ ] PDF 匯出
- [ ] SOP 有效期限與定期審核提醒
- [ ] 多語言 SOP
- [ ] SOP 關聯（相關文件推薦）
- [ ] 學習路徑（新人訓練 SOP 清單）

---

**相關文檔**：
- [系統架構設計.md](./系統架構設計.md) - 整體架構
- [API端點文檔.md](./API端點文檔.md) - 完整 API 參考

