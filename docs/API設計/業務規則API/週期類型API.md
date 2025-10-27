# 週期類型 API

**API 前綴：** `/api/v1/settings/frequency-types`  
**最後更新：** 2025年10月27日

---

## 概述

定義服務的週期類型選項（每月、雙月、每季等），供「客戶服務設定」使用。管理員可根據業務需求自行新增週期類型。

**主要功能：**
- 週期類型的 CRUD 操作
- 停用機制（不可刪除已使用的類型）
- 批量排序功能
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/frequency-types` | 獲取週期類型列表 | 管理員 |
| GET | `/frequency-types/:id` | 獲取特定週期類型 | 管理員 |
| POST | `/frequency-types` | 新增週期類型 | 管理員 |
| PUT | `/frequency-types/:id` | 編輯週期類型 | 管理員 |
| DELETE | `/frequency-types/:id` | 刪除週期類型 | 管理員 |
| PUT | `/frequency-types/:id/deactivate` | 停用週期類型 | 管理員 |
| PUT | `/frequency-types/reorder` | 批量排序 | 管理員 |
| GET | `/frequency-types/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取週期類型列表

```
GET /api/v1/settings/frequency-types
```

**權限：** 管理員

**查詢參數：**
- `is_active` (可選, boolean): 篩選啟用狀態

**請求範例：**
```
GET /api/v1/settings/frequency-types?is_active=true
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "frequency_id": 1,
      "name": "每月",
      "description": "每個月執行一次",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "frequency_id": 2,
      "name": "雙月",
      "description": "每兩個月執行一次",
      "sort_order": 2,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**說明：** 結果按 `sort_order` 升序排序

---

### 2. 新增週期類型

```
POST /api/v1/settings/frequency-types
```

**權限：** 管理員

**請求 Body：**
```json
{
  "name": "每週",
  "description": "每週執行一次",
  "sort_order": 7
}
```

**驗證規則：**
- `name`: 
  - 必填
  - 字串，1-20 字元
  - 不可重複（唯一）
- `description`: 
  - 可選
  - 字串，最多 100 字元
- `sort_order`: 
  - 可選
  - 整數，預設 0
  - 用於控制顯示順序

**回應範例（201）：**
```json
{
  "success": true,
  "message": "週期類型新增成功",
  "data": {
    "frequency_id": 7,
    "name": "每週",
    "sort_order": 7,
    "is_active": true,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "週期類型名稱已存在",
  "code": "FREQUENCY_TYPE_NAME_EXISTS"
}
```

---

### 3. 編輯週期類型

```
PUT /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "週期類型已更新",
  "data": {
    "frequency_id": 1,
    "name": "每月",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 刪除週期類型

```
DELETE /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "週期類型已刪除"
}
```

**錯誤回應（409 - 已被使用）：**
```json
{
  "error": "Conflict",
  "message": "此週期類型已被 10 個客戶服務使用，無法刪除",
  "code": "FREQUENCY_IN_USE",
  "details": {
    "related_services_count": 10,
    "suggestion": "建議使用「停用」功能"
  }
}
```

**HTTP 狀態碼：** 409 Conflict

---

### 5. 停用週期類型

```
PUT /api/v1/settings/frequency-types/:id/deactivate
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已停用週期類型「雙月」",
  "data": {
    "frequency_id": 2,
    "is_active": false
  }
}
```

**說明：**
- 停用後，新的客戶服務設定不顯示此選項
- 已使用的客戶服務仍保留此設定

---

### 6. 批量排序

```
PUT /api/v1/settings/frequency-types/reorder
```

**權限：** 管理員

**請求 Body：**
```json
{
  "orders": [
    {
      "frequency_id": 1,
      "sort_order": 2
    },
    {
      "frequency_id": 2,
      "sort_order": 1
    },
    {
      "frequency_id": 3,
      "sort_order": 3
    }
  ]
}
```

**驗證規則：**
- `orders`: 
  - 必填
  - 陣列，至少包含 1 個項目
- `frequency_id`: 
  - 必填
  - 整數，必須存在
- `sort_order`: 
  - 必填
  - 整數

**回應範例（200）：**
```json
{
  "success": true,
  "message": "排序已更新",
  "data": {
    "updated_count": 3
  }
}
```

**說明：** 用於拖曳排序功能，一次更新多個項目的順序

---

### 7. 查詢使用情況

```
GET /api/v1/settings/frequency-types/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "frequency_id": 2,
    "name": "雙月",
    "in_use": true,
    "usage_count": 10,
    "can_delete": false,
    "details": {
      "client_services_count": 10,
      "clients": [
        {
          "client_id": "12345678",
          "company_name": "測試公司A",
          "service_name": "記帳服務"
        },
        {
          "client_id": "87654321",
          "company_name": "測試公司B",
          "service_name": "記帳服務"
        }
      ]
    }
  }
}
```

**未被使用的情況：**
```json
{
  "success": true,
  "data": {
    "frequency_id": 7,
    "name": "每週",
    "in_use": false,
    "usage_count": 0,
    "can_delete": true,
    "details": {
      "client_services_count": 0
    }
  }
}
```

---

## 資料模型

### ServiceFrequencyType

```typescript
interface ServiceFrequencyType {
  frequency_id: number;     // 週期類型 ID，主鍵
  name: string;             // 週期名稱，唯一
  description: string;      // 說明
  sort_order: number;       // 排序順序
  is_active: boolean;       // 是否啟用
  created_at: string;       // 建立時間
  updated_at: string;       // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `FREQUENCY_TYPE_NOT_FOUND` | 404 | 找不到指定的週期類型 |
| `FREQUENCY_TYPE_NAME_EXISTS` | 409 | 週期類型名稱已存在 |
| `FREQUENCY_IN_USE` | 409 | 週期類型已被客戶服務使用 |
| `INVALID_SORT_ORDER` | 400 | 排序值無效 |

---

## 使用範例

### 新增並設定排序

```javascript
// 1. 新增週期類型
const response = await fetch('/api/v1/settings/frequency-types', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '每週',
    description: '每週執行一次',
    sort_order: 7
  })
});

const result = await response.json();
console.log(`新增成功，ID: ${result.data.frequency_id}`);
```

### 拖曳排序

```javascript
// 前端拖曳後，批量更新排序
const newOrders = [
  { frequency_id: 2, sort_order: 1 },  // 雙月移到第一
  { frequency_id: 1, sort_order: 2 },  // 每月移到第二
  { frequency_id: 3, sort_order: 3 }   // 每季保持第三
];

await fetch('/api/v1/settings/frequency-types/reorder', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ orders: newOrders })
});
```

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#26-週期類型管理)
- [資料庫設計 - ServiceFrequencyTypes](../../資料庫設計.md)
- [客戶 API](../客戶API.md) - 客戶服務設定使用週期類型

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/frequency-types`  
**最後更新：** 2025年10月27日

---

## 概述

定義服務的週期類型選項（每月、雙月、每季等），供「客戶服務設定」使用。管理員可根據業務需求自行新增週期類型。

**主要功能：**
- 週期類型的 CRUD 操作
- 停用機制（不可刪除已使用的類型）
- 批量排序功能
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/frequency-types` | 獲取週期類型列表 | 管理員 |
| GET | `/frequency-types/:id` | 獲取特定週期類型 | 管理員 |
| POST | `/frequency-types` | 新增週期類型 | 管理員 |
| PUT | `/frequency-types/:id` | 編輯週期類型 | 管理員 |
| DELETE | `/frequency-types/:id` | 刪除週期類型 | 管理員 |
| PUT | `/frequency-types/:id/deactivate` | 停用週期類型 | 管理員 |
| PUT | `/frequency-types/reorder` | 批量排序 | 管理員 |
| GET | `/frequency-types/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取週期類型列表

```
GET /api/v1/settings/frequency-types
```

**權限：** 管理員

**查詢參數：**
- `is_active` (可選, boolean): 篩選啟用狀態

**請求範例：**
```
GET /api/v1/settings/frequency-types?is_active=true
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "frequency_id": 1,
      "name": "每月",
      "description": "每個月執行一次",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "frequency_id": 2,
      "name": "雙月",
      "description": "每兩個月執行一次",
      "sort_order": 2,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**說明：** 結果按 `sort_order` 升序排序

---

### 2. 新增週期類型

```
POST /api/v1/settings/frequency-types
```

**權限：** 管理員

**請求 Body：**
```json
{
  "name": "每週",
  "description": "每週執行一次",
  "sort_order": 7
}
```

**驗證規則：**
- `name`: 
  - 必填
  - 字串，1-20 字元
  - 不可重複（唯一）
- `description`: 
  - 可選
  - 字串，最多 100 字元
- `sort_order`: 
  - 可選
  - 整數，預設 0
  - 用於控制顯示順序

**回應範例（201）：**
```json
{
  "success": true,
  "message": "週期類型新增成功",
  "data": {
    "frequency_id": 7,
    "name": "每週",
    "sort_order": 7,
    "is_active": true,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "週期類型名稱已存在",
  "code": "FREQUENCY_TYPE_NAME_EXISTS"
}
```

---

### 3. 編輯週期類型

```
PUT /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "週期類型已更新",
  "data": {
    "frequency_id": 1,
    "name": "每月",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 刪除週期類型

```
DELETE /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "週期類型已刪除"
}
```

**錯誤回應（409 - 已被使用）：**
```json
{
  "error": "Conflict",
  "message": "此週期類型已被 10 個客戶服務使用，無法刪除",
  "code": "FREQUENCY_IN_USE",
  "details": {
    "related_services_count": 10,
    "suggestion": "建議使用「停用」功能"
  }
}
```

**HTTP 狀態碼：** 409 Conflict

---

### 5. 停用週期類型

```
PUT /api/v1/settings/frequency-types/:id/deactivate
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已停用週期類型「雙月」",
  "data": {
    "frequency_id": 2,
    "is_active": false
  }
}
```

**說明：**
- 停用後，新的客戶服務設定不顯示此選項
- 已使用的客戶服務仍保留此設定

---

### 6. 批量排序

```
PUT /api/v1/settings/frequency-types/reorder
```

**權限：** 管理員

**請求 Body：**
```json
{
  "orders": [
    {
      "frequency_id": 1,
      "sort_order": 2
    },
    {
      "frequency_id": 2,
      "sort_order": 1
    },
    {
      "frequency_id": 3,
      "sort_order": 3
    }
  ]
}
```

**驗證規則：**
- `orders`: 
  - 必填
  - 陣列，至少包含 1 個項目
- `frequency_id`: 
  - 必填
  - 整數，必須存在
- `sort_order`: 
  - 必填
  - 整數

**回應範例（200）：**
```json
{
  "success": true,
  "message": "排序已更新",
  "data": {
    "updated_count": 3
  }
}
```

**說明：** 用於拖曳排序功能，一次更新多個項目的順序

---

### 7. 查詢使用情況

```
GET /api/v1/settings/frequency-types/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 週期類型 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "frequency_id": 2,
    "name": "雙月",
    "in_use": true,
    "usage_count": 10,
    "can_delete": false,
    "details": {
      "client_services_count": 10,
      "clients": [
        {
          "client_id": "12345678",
          "company_name": "測試公司A",
          "service_name": "記帳服務"
        },
        {
          "client_id": "87654321",
          "company_name": "測試公司B",
          "service_name": "記帳服務"
        }
      ]
    }
  }
}
```

**未被使用的情況：**
```json
{
  "success": true,
  "data": {
    "frequency_id": 7,
    "name": "每週",
    "in_use": false,
    "usage_count": 0,
    "can_delete": true,
    "details": {
      "client_services_count": 0
    }
  }
}
```

---

## 資料模型

### ServiceFrequencyType

```typescript
interface ServiceFrequencyType {
  frequency_id: number;     // 週期類型 ID，主鍵
  name: string;             // 週期名稱，唯一
  description: string;      // 說明
  sort_order: number;       // 排序順序
  is_active: boolean;       // 是否啟用
  created_at: string;       // 建立時間
  updated_at: string;       // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `FREQUENCY_TYPE_NOT_FOUND` | 404 | 找不到指定的週期類型 |
| `FREQUENCY_TYPE_NAME_EXISTS` | 409 | 週期類型名稱已存在 |
| `FREQUENCY_IN_USE` | 409 | 週期類型已被客戶服務使用 |
| `INVALID_SORT_ORDER` | 400 | 排序值無效 |

---

## 使用範例

### 新增並設定排序

```javascript
// 1. 新增週期類型
const response = await fetch('/api/v1/settings/frequency-types', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '每週',
    description: '每週執行一次',
    sort_order: 7
  })
});

const result = await response.json();
console.log(`新增成功，ID: ${result.data.frequency_id}`);
```

### 拖曳排序

```javascript
// 前端拖曳後，批量更新排序
const newOrders = [
  { frequency_id: 2, sort_order: 1 },  // 雙月移到第一
  { frequency_id: 1, sort_order: 2 },  // 每月移到第二
  { frequency_id: 3, sort_order: 3 }   // 每季保持第三
];

await fetch('/api/v1/settings/frequency-types/reorder', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ orders: newOrders })
});
```

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#26-週期類型管理)
- [資料庫設計 - ServiceFrequencyTypes](../../資料庫設計.md)
- [客戶 API](../客戶API.md) - 客戶服務設定使用週期類型

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



