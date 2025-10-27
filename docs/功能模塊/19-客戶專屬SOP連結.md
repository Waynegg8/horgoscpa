# 19 - 客戶專屬 SOP 連結

**所屬模塊：** SOP 知識庫  
**頁面路徑：** `/clients/:clientId/services` (整合在客戶服務設定中)  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 功能概述

為特定客戶的特定服務連結客製化 SOP，處理特殊作業流程。

---

## UI 設計

```
客戶服務 - 仟鑽企業 - 記帳服務
───────────────────────────────
關聯 SOP：
[記帳服務標準SOP ▼]

客製化備註：
[此客戶需額外核對運費發票    ]

[儲存]
```

---

## 任務頁面快速存取

**顯示位置：** 任務詳情頁面底部

```
關聯資源
───────
📘 相關SOP：[查看仟鑽企業-記帳服務SOP]
   ⚠️ 此客戶需額外核對運費發票
```

---

## 資料表

```sql
CREATE TABLE ClientSOPLinks (
  link_id INTEGER PRIMARY KEY,
  client_id TEXT,
  client_service_id INTEGER,
  sop_id INTEGER,
  custom_notes TEXT
);
```

---

## API

```
GET  /api/v1/clients/:clientId/sop-links
POST /api/v1/clients/:clientId/sop-links
```

---

**相關：** [SOP文件管理](./18-SOP文件管理.md), [階段進度更新](./17-階段進度更新.md)

