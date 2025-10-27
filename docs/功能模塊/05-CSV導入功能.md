# 05 - CSV 導入功能

**所屬模塊：** 系統設定（僅管理員）  
**頁面路徑：** `/settings/import`  
**最後更新：** 2025年10月27日

---

## 功能概述

批量導入客戶資料。

---

## UI 設計

```
客戶資料導入
─────────────────────────────────────
1. 下載 CSV 模板
   [下載模板]

2. 填寫客戶資料

3. 上傳 CSV 檔案
   [選擇檔案] clients.csv  [上傳]

匯入結果：
✅ 成功匯入 50 筆資料
⚠️ 2 筆資料格式錯誤（已跳過）
```

---

## CSV 模板格式

```csv
client_id,company_name,contact_person_1,phone,email,assignee_user_id
12345678,仟鑽企業,王先生,02-1234-5678,contact@example.com,2
```

---

## API

```
GET  /api/v1/clients/csv-template
POST /api/v1/clients/import-csv (multipart/form-data)
```

---

**相關：** [客戶API](../API設計/客戶API.md)

