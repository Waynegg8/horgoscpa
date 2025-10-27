# 假別類型 API

**API 前綴：** `/api/v1/settings/leave-types`  
**最後更新：** 2025年10月27日

---

## 概述

管理權益型假別（病假、事假、生理假、補休等），這些假別有固定年度額度，員工可直接在工時表請假使用。

**主要功能：**
- 假別類型的 CRUD 操作
- 軟刪除（停用/啟用）機制
- 性別限制設定
- 年度額度和薪資比例設定
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/leave-types` | 獲取假別類型列表 | 管理員 |
| GET | `/leave-types/:id` | 獲取特定假別類型 | 管理員 |
| POST | `/leave-types` | 新增假別類型 | 管理員 |
| PUT | `/leave-types/:id` | 編輯假別類型 | 管理員 |
| DELETE | `/leave-types/:id` | 停用假別類型 | 管理員 |
| PUT | `/leave-types/:id/activate` | 啟用假別類型 | 管理員 |
| GET | `/leave-types/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取假別類型列表

```
GET /api/v1/settings/leave-types
```

**權限：** 管理員

**查詢參數：**
- `is_active` (可選, boolean): 篩選啟用狀態，`true` 或 `false`

**請求範例：**
```
GET /api/v1/settings/leave-types?is_active=true
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": 1,
      "name": "病假",
      "is_gender_specific": false,
      "annual_quota_days": 30,
      "pay_rate": 0.5,
      "description": "1年內未住院30天，超過部分不支薪",
      "legal_source": "勞工請假規則",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 2,
      "name": "生理假",
      "is_gender_specific": true,
      "annual_quota_days": 12,
      "pay_rate": 0.5,
      "description": "每月1天，全年3天不併入病假",
      "legal_source": "性別工作平等法",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 6,
      "name": "補休",
      "is_gender_specific": false,
      "annual_quota_days": null,
      "pay_rate": 1.0,
      "description": "加班換補休，每月清零",
      "legal_source": "勞基法第32條之1",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增假別類型

```
POST /api/v1/settings/leave-types
```

**權限：** 管理員

**請求 Body：**
```json
{
  "name": "補休",
  "is_gender_specific": false,
  "annual_quota_days": null,
  "pay_rate": 1.0,
  "description": "加班換補休，每月清零",
  "legal_source": "勞基法第32條之1"
}
```

**驗證規則：**
- `name`: 
  - 必填
  - 字串，1-20 字元
  - 不可重複（唯一）
- `is_gender_specific`: 
  - 必填
  - 布林值
- `annual_quota_days`: 
  - 可選
  - 整數，>= 0
  - `null` 表示無限制
- `pay_rate`: 
  - 必填
  - 數字，0.0-1.0
  - 0 = 不支薪，0.5 = 半薪，1.0 = 全薪
- `description`: 
  - 可選
  - 字串，最多 200 字元
- `legal_source`: 
  - 可選
  - 字串，最多 100 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "假別類型新增成功",
  "data": {
    "leave_type_id": 6,
    "name": "補休",
    "is_active": true,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "假別類型名稱已存在",
  "code": "LEAVE_TYPE_NAME_EXISTS"
}
```

---

### 3. 編輯假別類型

```
PUT /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假別類型已更新",
  "data": {
    "leave_type_id": 1,
    "name": "病假",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 停用假別類型（軟刪除）

```
DELETE /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已停用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": false,
    "related_records_count": 50
  }
}
```

**說明：**
- 停用後，歷史請假記錄仍保留
- 新的請假不再顯示此假別選項
- 可隨時重新啟用

---

### 5. 啟用假別類型

```
PUT /api/v1/settings/leave-types/:id/activate
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已啟用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": true
  }
}
```

---

### 6. 查詢使用情況

```
GET /api/v1/settings/leave-types/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "leave_type_id": 1,
    "name": "病假",
    "in_use": true,
    "usage_count": 50,
    "can_delete": false,
    "details": {
      "timelogs_count": 50,
      "recent_usage": [
        {
          "user_id": 123,
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 8
        },
        {
          "user_id": 456,
          "user_name": "李小華",
          "work_date": "2025-10-25",
          "hours": 4
        }
      ]
    }
  }
}
```

---

## 資料模型

### LeaveType

```typescript
interface LeaveType {
  leave_type_id: number;         // 假別類型 ID，主鍵
  name: string;                  // 假別名稱，唯一
  is_gender_specific: boolean;   // 是否有性別限制
  annual_quota_days: number | null; // 年度額度（天），null=無限制
  pay_rate: number;              // 薪資比例（0-1）
  description: string;           // 說明
  legal_source: string;          // 法源依據
  is_active: boolean;            // 是否啟用
  created_at: string;            // 建立時間
  updated_at: string;            // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `LEAVE_TYPE_NOT_FOUND` | 404 | 找不到指定的假別類型 |
| `LEAVE_TYPE_NAME_EXISTS` | 409 | 假別名稱已存在 |
| `LEAVE_TYPE_IN_USE` | 409 | 假別類型已被使用（停用時提示） |
| `INVALID_PAY_RATE` | 400 | 薪資比例必須在 0-1 之間 |
| `INVALID_ANNUAL_QUOTA` | 400 | 年度額度必須 >= 0 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#22-假別類型管理)
- [資料庫設計 - LeaveTypes](../../資料庫設計.md)
- [工時 API](../工時API.md) - 使用假別類型記錄請假

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/leave-types`  
**最後更新：** 2025年10月27日

---

## 概述

管理權益型假別（病假、事假、生理假、補休等），這些假別有固定年度額度，員工可直接在工時表請假使用。

**主要功能：**
- 假別類型的 CRUD 操作
- 軟刪除（停用/啟用）機制
- 性別限制設定
- 年度額度和薪資比例設定
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/leave-types` | 獲取假別類型列表 | 管理員 |
| GET | `/leave-types/:id` | 獲取特定假別類型 | 管理員 |
| POST | `/leave-types` | 新增假別類型 | 管理員 |
| PUT | `/leave-types/:id` | 編輯假別類型 | 管理員 |
| DELETE | `/leave-types/:id` | 停用假別類型 | 管理員 |
| PUT | `/leave-types/:id/activate` | 啟用假別類型 | 管理員 |
| GET | `/leave-types/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取假別類型列表

```
GET /api/v1/settings/leave-types
```

**權限：** 管理員

**查詢參數：**
- `is_active` (可選, boolean): 篩選啟用狀態，`true` 或 `false`

**請求範例：**
```
GET /api/v1/settings/leave-types?is_active=true
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": 1,
      "name": "病假",
      "is_gender_specific": false,
      "annual_quota_days": 30,
      "pay_rate": 0.5,
      "description": "1年內未住院30天，超過部分不支薪",
      "legal_source": "勞工請假規則",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 2,
      "name": "生理假",
      "is_gender_specific": true,
      "annual_quota_days": 12,
      "pay_rate": 0.5,
      "description": "每月1天，全年3天不併入病假",
      "legal_source": "性別工作平等法",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 6,
      "name": "補休",
      "is_gender_specific": false,
      "annual_quota_days": null,
      "pay_rate": 1.0,
      "description": "加班換補休，每月清零",
      "legal_source": "勞基法第32條之1",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增假別類型

```
POST /api/v1/settings/leave-types
```

**權限：** 管理員

**請求 Body：**
```json
{
  "name": "補休",
  "is_gender_specific": false,
  "annual_quota_days": null,
  "pay_rate": 1.0,
  "description": "加班換補休，每月清零",
  "legal_source": "勞基法第32條之1"
}
```

**驗證規則：**
- `name`: 
  - 必填
  - 字串，1-20 字元
  - 不可重複（唯一）
- `is_gender_specific`: 
  - 必填
  - 布林值
- `annual_quota_days`: 
  - 可選
  - 整數，>= 0
  - `null` 表示無限制
- `pay_rate`: 
  - 必填
  - 數字，0.0-1.0
  - 0 = 不支薪，0.5 = 半薪，1.0 = 全薪
- `description`: 
  - 可選
  - 字串，最多 200 字元
- `legal_source`: 
  - 可選
  - 字串，最多 100 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "假別類型新增成功",
  "data": {
    "leave_type_id": 6,
    "name": "補休",
    "is_active": true,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "假別類型名稱已存在",
  "code": "LEAVE_TYPE_NAME_EXISTS"
}
```

---

### 3. 編輯假別類型

```
PUT /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假別類型已更新",
  "data": {
    "leave_type_id": 1,
    "name": "病假",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 停用假別類型（軟刪除）

```
DELETE /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已停用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": false,
    "related_records_count": 50
  }
}
```

**說明：**
- 停用後，歷史請假記錄仍保留
- 新的請假不再顯示此假別選項
- 可隨時重新啟用

---

### 5. 啟用假別類型

```
PUT /api/v1/settings/leave-types/:id/activate
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已啟用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": true
  }
}
```

---

### 6. 查詢使用情況

```
GET /api/v1/settings/leave-types/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 假別類型 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "leave_type_id": 1,
    "name": "病假",
    "in_use": true,
    "usage_count": 50,
    "can_delete": false,
    "details": {
      "timelogs_count": 50,
      "recent_usage": [
        {
          "user_id": 123,
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 8
        },
        {
          "user_id": 456,
          "user_name": "李小華",
          "work_date": "2025-10-25",
          "hours": 4
        }
      ]
    }
  }
}
```

---

## 資料模型

### LeaveType

```typescript
interface LeaveType {
  leave_type_id: number;         // 假別類型 ID，主鍵
  name: string;                  // 假別名稱，唯一
  is_gender_specific: boolean;   // 是否有性別限制
  annual_quota_days: number | null; // 年度額度（天），null=無限制
  pay_rate: number;              // 薪資比例（0-1）
  description: string;           // 說明
  legal_source: string;          // 法源依據
  is_active: boolean;            // 是否啟用
  created_at: string;            // 建立時間
  updated_at: string;            // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `LEAVE_TYPE_NOT_FOUND` | 404 | 找不到指定的假別類型 |
| `LEAVE_TYPE_NAME_EXISTS` | 409 | 假別名稱已存在 |
| `LEAVE_TYPE_IN_USE` | 409 | 假別類型已被使用（停用時提示） |
| `INVALID_PAY_RATE` | 400 | 薪資比例必須在 0-1 之間 |
| `INVALID_ANNUAL_QUOTA` | 400 | 年度額度必須 >= 0 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#22-假別類型管理)
- [資料庫設計 - LeaveTypes](../../資料庫設計.md)
- [工時 API](../工時API.md) - 使用假別類型記錄請假

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



