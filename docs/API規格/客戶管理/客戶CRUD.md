# 客戶 CRUD API

**版本：** v1  
**Base URL：** `/api/v1/clients`  
**最後更新：** 2025年10月27日

---

## 查詢列表

**端點：** `GET /clients`  
**權限：** 所有員工

### 查詢參數

| 參數 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `company_name` | string | ❌ | 公司名稱（模糊搜尋）|
| `client_id` | string | ❌ | 統一編號（模糊搜尋）|
| `tax_registration_number` | string | ❌ | 稅籍編號（模糊搜尋）|
| `assignee_user_id` | integer | ❌ | 負責員工 ID |
| `business_status` | string | ❌ | 營業狀況 |
| `organization_type` | string | ❌ | 組織種類 |
| `tag_ids` | string | ❌ | 標籤 ID（逗號分隔）|
| `limit` | integer | ❌ | 每頁筆數（預設：50）|
| `offset` | integer | ❌ | 偏移量（預設：0）|

### 請求範例

```bash
GET /api/v1/clients?company_name=冠群&business_status=營業中&limit=20
```

### 回應範例

```json
{
  "success": true,
  "data": [
    {
      "client_id": "86753078",
      "tax_registration_number": "12345678",
      "company_name": "冠群資訊股份有限公司",
      "business_status": "營業中",
      "organization_type": "股份有限公司",
      "assignee_user_id": 1,
      "assignee_name": "紜蓁",
      "phone": "04-1234-5678",
      "tags": ["VIP客戶", "長期合作"],
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 查詢詳情

**端點：** `GET /clients/:client_id`  
**權限：** 所有員工（非管理員只能查看自己負責的）

### 路徑參數

| 參數 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 客戶統一編號 |

### 請求範例

```bash
GET /api/v1/clients/86753078
```

### 回應範例

```json
{
  "success": true,
  "data": {
    "client_id": "86753078",
    "tax_registration_number": "12345678",
    "company_name": "冠群資訊股份有限公司",
    "business_status": "營業中",
    "organization_type": "股份有限公司",
    "capital_amount": 10000000,
    "establishment_date": "0840417",
    "responsible_person": "簡安秀",
    "tax_registration_address": "臺中市西區民生里建國路21號",
    "registered_business_items": [
      {
        "name": "電腦及電腦周邊設備零售",
        "code": "483111"
      }
    ],
    "payment_collection_timing": "每月5日",
    "payment_collection_remarks": "匯款後請提供匯款證明",
    "assignee_user_id": 1,
    "assignee_name": "紜蓁",
    "contact_person_1": "李小姐",
    "phone": "04-1234-5678",
    "email": "contact@example.com",
    "invoice_count": 50,
    "remarks": "重要客戶",
    "tags": [
      {
        "tag_id": 1,
        "tag_name": "VIP客戶",
        "tag_color": "#FF5733"
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

---

## 新增客戶

**端點：** `POST /clients`  
**權限：** 管理員、會計師

### 請求 Body

```json
{
  "client_id": "86753078",
  "tax_registration_number": "12345678",
  "company_name": "冠群資訊股份有限公司",
  "business_status": "營業中",
  "organization_type": "股份有限公司",
  "capital_amount": 10000000,
  "establishment_date": "0840417",
  "responsible_person": "簡安秀",
  "tax_registration_address": "臺中市西區民生里建國路21號",
  "registered_business_items": [
    {
      "name": "電腦及電腦周邊設備零售",
      "code": "483111"
    }
  ],
  "payment_collection_timing": "每月5日",
  "payment_collection_remarks": "匯款後請提供匯款證明",
  "assignee_user_id": 1,
  "contact_person_1": "李小姐",
  "phone": "04-1234-5678",
  "email": "contact@example.com",
  "invoice_count": 50,
  "remarks": "重要客戶",
  "tag_ids": [1, 2]
}
```

### 必填欄位
- `client_id` ✅
- `company_name` ✅
- `assignee_user_id` ✅

### 回應範例

```json
{
  "success": true,
  "data": {
    "client_id": "86753078",
    "message": "客戶新增成功"
  }
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CLIENT_ID",
    "message": "統一編號已存在"
  }
}
```

---

## 更新客戶

**端點：** `PUT /clients/:client_id`  
**權限：** 管理員、會計師（只能更新自己負責的）

### 路徑參數

| 參數 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 客戶統一編號 |

### 請求 Body

```json
{
  "company_name": "冠群資訊股份有限公司",
  "phone": "04-9876-5432",
  "payment_collection_timing": "每月10日",
  "tag_ids": [1, 3]
}
```

**說明：**
- 只需傳送要更新的欄位
- `client_id` 不可更新
- `tag_ids` 會替換所有標籤

### 回應範例

```json
{
  "success": true,
  "data": {
    "message": "客戶更新成功"
  }
}
```

---

## 刪除客戶

**端點：** `DELETE /clients/:client_id`  
**權限：** 僅管理員

### 路徑參數

| 參數 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 客戶統一編號 |

### 請求範例

```bash
DELETE /api/v1/clients/86753078
```

### 回應範例

```json
{
  "success": true,
  "data": {
    "message": "客戶刪除成功"
  }
}
```

**說明：**
- 使用軟刪除（`is_deleted = 1`）
- 相關的標籤關聯會自動移除
- 不會刪除相關的任務、工時記錄

---

**相關文檔：**
- [API 概覽](./_ 概覽.md)
- [標籤管理 API](./標籤管理.md)
- [標籤關聯 API](./標籤關聯.md)


