# 18 - SOP 文件管理

**所屬模塊：** SOP 知識庫  
**頁面路徑：** `/sop`  
**權限：** 取決於 `module_visibility_sop`  
**最後更新：** 2025年10月27日

---

## 功能概述

建立、編輯、刪除 SOP 文件（標準作業流程）。

---

## UI 設計

```
SOP 知識庫
───────────────────────
[+ 新增SOP]  🔍搜尋...

┌─ 記帳服務SOP ────────┐
│ 最後更新：2025-10-15  │
│ 版本：v3              │
│ 關聯服務：記帳服務    │
│ [查看] [編輯] [版本]  │
└───────────────────────┘
```

---

## SOP 編輯器

- WYSIWYG（Tiptap 或 Quill）
- 支援表格、圖片上傳、連結
- 圖片儲存至 R2

---

## 資料表

```sql
CREATE TABLE SOPDocuments (
  sop_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  service_template_id INTEGER,
  content TEXT,
  version INTEGER,
  created_at TEXT,
  updated_at TEXT
);
```

---

## API

```
GET    /api/v1/sop
POST   /api/v1/sop
PUT    /api/v1/sop/:sopId
DELETE /api/v1/sop/:sopId
POST   /api/v1/sop/upload-image
```

---

## SOP 版本控制

**功能：** 每次編輯 SOP 時自動保存歷史版本，可查看和回復

**資料表：**
```sql
CREATE TABLE SOPDocumentVersions (
  version_id INTEGER PRIMARY KEY,
  sop_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT,
  edited_by INTEGER,
  edited_at TEXT DEFAULT (datetime('now')),
  change_summary TEXT
);
```

**自動保存邏輯：**
```typescript
// services/sop.service.ts
async function saveSOP(sopId: number, newContent: string, userId: number) {
  const current = await getSOP(sopId);
  
  // 1. 保存當前版本為歷史
  await db.prepare(`
    INSERT INTO SOPDocumentVersions 
      (sop_id, version, content, edited_by)
    VALUES (?, ?, ?, ?)
  `).bind(sopId, current.version, current.content, userId).run();
  
  // 2. 更新主文件
  await db.prepare(`
    UPDATE SOPDocuments 
    SET content = ?, version = ?, last_edited_by = ?, updated_at = datetime('now')
    WHERE sop_id = ?
  `).bind(newContent, current.version + 1, userId, sopId).run();
}
```

**UI 設計：**
```
SOP：記帳服務流程  [版本歷史 ▼]

┌─ 版本歷史 ────────────────────────────────┐
│                                           │
│ | 版本 | 編輯者 | 時間       | 摘要       | 操作     |
│ |------|--------|------------|------------|----------|
│ | v4   | 管理員 | 2025-10-27 | 當前版本   | -        |
│ | v3   | 紜蓁   | 2025-10-15 | 修改步驟2  | [查看][回復]|
│ | v2   | 凱閔   | 2025-10-01 | 新增圖片   | [查看][回復]|
│ | v1   | 管理員 | 2025-09-01 | 初始版本   | [查看][回復]|
│                                           │
└───────────────────────────────────────────┘

點擊「查看 v3」→ 唯讀模式顯示該版本內容
點擊「回復 v3」→ 彈出確認對話框 →
  ⚠️ 確定要回復到 v3 嗎？當前 v4 會被保存為 v5
  [確定] [取消]
```

**API：**
```
GET  /api/v1/sop/:sopId/versions           # 獲取版本列表
GET  /api/v1/sop/:sopId/versions/:versionId  # 查看特定版本
POST /api/v1/sop/:sopId/restore/:versionId   # 回復到特定版本
```

---

**相關：** [客戶專屬SOP連結](./19-客戶專屬SOP連結.md), [資料庫設計](../資料庫設計.md)

