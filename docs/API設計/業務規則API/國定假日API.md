# 國定假日 API

**API 前綴：** `/api/v1/settings/holidays`  
**最後更新：** 2025年10月27日

---

## 概述

管理國定假日與補班日，用於判定加班類型和工時計算。支援新增、編輯、刪除、批量導入和匯出功能。

**主要功能：**
- 國定假日與補班日的 CRUD 操作
- 按年份和類型篩選
- 批量導入 CSV
- 匯出 CSV
- 查詢使用情況（防止刪除被使用的資料）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/holidays` | 獲取國定假日列表 | 管理員 |
| GET | `/holidays/:date` | 獲取特定國定假日 | 管理員 |
| POST | `/holidays` | 新增國定假日 | 管理員 |
| PUT | `/holidays/:date` | 編輯國定假日 | 管理員 |
| DELETE | `/holidays/:date` | 刪除國定假日 | 管理員 |
| POST | `/holidays/batch` | 批量導入 | 管理員 |
| GET | `/holidays/export` | 匯出 CSV | 管理員 |
| GET | `/holidays/:date/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取國定假日列表

```
GET /api/v1/settings/holidays
```

**權限：** 管理員

**查詢參數：**
- `year` (可選, string): 篩選年份，格式 `YYYY`，例如 `2025`
- `type` (可選, string): 篩選類型，`holiday` 或 `workday`

**請求範例：**
```
GET /api/v1/settings/holidays?year=2025&type=holiday
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "holiday_date": "2025-01-01",
      "name": "中華民國開國紀念日",
      "type": "holiday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 獲取特定國定假日

```
GET /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 國定假日日期，格式 `YYYY-MM-DD`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "name": "中華民國開國紀念日",
    "type": "holiday",
    "created_at": "2024-12-01T00:00:00Z",
    "updated_at": "2024-12-01T00:00:00Z"
  }
}
```

**錯誤回應（404）：**
```json
{
  "error": "Not Found",
  "message": "找不到指定的國定假日",
  "code": "HOLIDAY_NOT_FOUND"
}
```

---

### 3. 新增國定假日

```
POST /api/v1/settings/holidays
```

**權限：** 管理員

**請求 Body：**
```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**驗證規則：**
- `holiday_date`: 
  - 必填
  - 字串，格式 `YYYY-MM-DD`
  - 必須是有效日期
  - 不可重複（與現有資料衝突）
- `name`: 
  - 必填
  - 字串，1-50 字元
  - 不可為空白
- `type`: 
  - 必填
  - 字串，只能是 `holiday` 或 `workday`

**回應範例（201）：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday",
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（400）：**
```json
{
  "error": "Bad Request",
  "message": "請求參數格式錯誤",
  "code": "INVALID_PARAMETERS",
  "details": {
    "holiday_date": "日期格式必須為 YYYY-MM-DD",
    "name": "名稱不可為空"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "此日期的國定假日已存在",
  "code": "HOLIDAY_ALREADY_EXISTS"
}
```

---

### 4. 編輯國定假日

```
PUT /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 原始日期，格式 `YYYY-MM-DD`

**請求 Body：**
```json
{
  "name": "中華民國國慶日",
  "type": "holiday"
}
```

**驗證規則：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "國定假日已更新",
  "data": {
    "holiday_date": "2025-10-10",
    "name": "中華民國國慶日",
    "type": "holiday",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 5. 刪除國定假日

```
DELETE /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 日期，格式 `YYYY-MM-DD`

**回應範例（200）：**
```json
{
  "success": true,
  "message": "國定假日已刪除"
}
```

**錯誤回應（409 - 資源被使用）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "details": {
    "related_count": 5,
    "timelogs_count": 5
  }
}
```

---

### 6. 批量導入國定假日

```
POST /api/v1/settings/holidays/batch
```

**權限：** 管理員

**請求 Body：**
```json
{
  "holidays": [
    {
      "holiday_date": "2025-01-27",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-28",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday"
    }
  ],
  "replace_existing": false
}
```

**參數說明：**
- `holidays`: 國定假日陣列，每個項目格式同新增 API
- `replace_existing`: 
  - `true` = 覆蓋重複的資料
  - `false` = 跳過重複的資料（預設）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 1 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 1,
    "failed_count": 0,
    "total": 3,
    "details": {
      "created": [
        "2025-01-27",
        "2025-01-28"
      ],
      "skipped": [
        "2025-01-18"
      ],
      "failed": []
    }
  }
}
```

**錯誤回應（部分失敗）：**
```json
{
  "success": false,
  "message": "已新增 1 筆，跳過 1 筆，失敗 1 筆",
  "data": {
    "created_count": 1,
    "skipped_count": 1,
    "failed_count": 1,
    "total": 3,
    "details": {
      "created": ["2025-01-27"],
      "skipped": ["2025-01-18"],
      "failed": [
        {
          "item": { "holiday_date": "2025-13-01", "name": "無效日期", "type": "holiday" },
          "error": "日期格式錯誤"
        }
      ]
    }
  }
}
```

---

### 7. 匯出國定假日

```
GET /api/v1/settings/holidays/export
```

**權限：** 管理員

**查詢參數：**
- `year` (可選, string): 匯出指定年份，格式 `YYYY`
- `type` (可選, string): 匯出指定類型，`holiday` 或 `workday`
- `format` (可選, string): 匯出格式，目前只支援 `csv`（預設）

**請求範例：**
```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**回應 Headers：**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="holidays_2025.csv"
```

**回應 Body（CSV）：**
```csv
holiday_date,name,type
2025-01-01,中華民國開國紀念日,holiday
2025-01-18,補班日,workday
2025-01-27,春節,holiday
2025-01-28,春節,holiday
```

---

### 8. 查詢使用情況

```
GET /api/v1/settings/holidays/:date/usage
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 日期，格式 `YYYY-MM-DD`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "in_use": true,
    "usage_count": 5,
    "can_delete": false,
    "details": {
      "timelogs_count": 5,
      "recent_usage": [
        {
          "user_id": 123,
          "user_name": "王小明",
          "work_date": "2025-01-01",
          "hours": 8
        },
        {
          "user_id": 456,
          "user_name": "李小華",
          "work_date": "2025-01-01",
          "hours": 10
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
    "holiday_date": "2025-12-25",
    "in_use": false,
    "usage_count": 0,
    "can_delete": true,
    "details": {
      "timelogs_count": 0
    }
  }
}
```

---

## 資料模型

### Holiday

```typescript
interface Holiday {
  holiday_date: string;      // 日期，格式 YYYY-MM-DD，主鍵
  name: string;              // 假日名稱，1-50字元
  type: 'holiday' | 'workday'; // 類型：國定假日 or 補班日
  created_at: string;        // 建立時間，ISO 8601
  updated_at: string;        // 更新時間，ISO 8601
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `HOLIDAY_NOT_FOUND` | 404 | 找不到指定的國定假日 |
| `HOLIDAY_ALREADY_EXISTS` | 409 | 日期已存在 |
| `HOLIDAY_IN_USE` | 409 | 國定假日已被工時記錄使用 |
| `INVALID_PARAMETERS` | 400 | 請求參數格式錯誤 |
| `INVALID_DATE_FORMAT` | 400 | 日期格式錯誤 |
| `INVALID_HOLIDAY_TYPE` | 400 | 假日類型無效 |

---

## 使用範例

### 新增 2026 年國定假日

```javascript
// 1. 批量導入
const response = await fetch('/api/v1/settings/holidays/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    holidays: [
      { holiday_date: '2026-01-01', name: '中華民國開國紀念日', type: 'holiday' },
      { holiday_date: '2026-02-16', name: '春節', type: 'holiday' },
      // ... 更多假日
    ],
    replace_existing: false
  })
});

const result = await response.json();
console.log(`成功新增 ${result.data.created_count} 筆國定假日`);
```

### 檢查是否可刪除

```javascript
// 1. 先查詢使用情況
const checkResponse = await fetch('/api/v1/settings/holidays/2025-01-01/usage', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const checkResult = await checkResponse.json();

if (checkResult.data.can_delete) {
  // 2. 可以刪除
  await fetch('/api/v1/settings/holidays/2025-01-01', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('刪除成功');
} else {
  console.log(`無法刪除，已被 ${checkResult.data.usage_count} 筆記錄使用`);
}
```

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#21-國定假日管理)
- [資料庫設計 - Holidays](../../資料庫設計.md#7-假期與業務規則資料表)
- [工時 API](../工時API.md) - 使用國定假日判定加班類型

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/holidays`  
**最後更新：** 2025年10月27日

---

## 概述

管理國定假日與補班日，用於判定加班類型和工時計算。支援新增、編輯、刪除、批量導入和匯出功能。

**主要功能：**
- 國定假日與補班日的 CRUD 操作
- 按年份和類型篩選
- 批量導入 CSV
- 匯出 CSV
- 查詢使用情況（防止刪除被使用的資料）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/holidays` | 獲取國定假日列表 | 管理員 |
| GET | `/holidays/:date` | 獲取特定國定假日 | 管理員 |
| POST | `/holidays` | 新增國定假日 | 管理員 |
| PUT | `/holidays/:date` | 編輯國定假日 | 管理員 |
| DELETE | `/holidays/:date` | 刪除國定假日 | 管理員 |
| POST | `/holidays/batch` | 批量導入 | 管理員 |
| GET | `/holidays/export` | 匯出 CSV | 管理員 |
| GET | `/holidays/:date/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取國定假日列表

```
GET /api/v1/settings/holidays
```

**權限：** 管理員

**查詢參數：**
- `year` (可選, string): 篩選年份，格式 `YYYY`，例如 `2025`
- `type` (可選, string): 篩選類型，`holiday` 或 `workday`

**請求範例：**
```
GET /api/v1/settings/holidays?year=2025&type=holiday
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "holiday_date": "2025-01-01",
      "name": "中華民國開國紀念日",
      "type": "holiday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 獲取特定國定假日

```
GET /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 國定假日日期，格式 `YYYY-MM-DD`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "name": "中華民國開國紀念日",
    "type": "holiday",
    "created_at": "2024-12-01T00:00:00Z",
    "updated_at": "2024-12-01T00:00:00Z"
  }
}
```

**錯誤回應（404）：**
```json
{
  "error": "Not Found",
  "message": "找不到指定的國定假日",
  "code": "HOLIDAY_NOT_FOUND"
}
```

---

### 3. 新增國定假日

```
POST /api/v1/settings/holidays
```

**權限：** 管理員

**請求 Body：**
```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**驗證規則：**
- `holiday_date`: 
  - 必填
  - 字串，格式 `YYYY-MM-DD`
  - 必須是有效日期
  - 不可重複（與現有資料衝突）
- `name`: 
  - 必填
  - 字串，1-50 字元
  - 不可為空白
- `type`: 
  - 必填
  - 字串，只能是 `holiday` 或 `workday`

**回應範例（201）：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday",
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（400）：**
```json
{
  "error": "Bad Request",
  "message": "請求參數格式錯誤",
  "code": "INVALID_PARAMETERS",
  "details": {
    "holiday_date": "日期格式必須為 YYYY-MM-DD",
    "name": "名稱不可為空"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "此日期的國定假日已存在",
  "code": "HOLIDAY_ALREADY_EXISTS"
}
```

---

### 4. 編輯國定假日

```
PUT /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 原始日期，格式 `YYYY-MM-DD`

**請求 Body：**
```json
{
  "name": "中華民國國慶日",
  "type": "holiday"
}
```

**驗證規則：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "國定假日已更新",
  "data": {
    "holiday_date": "2025-10-10",
    "name": "中華民國國慶日",
    "type": "holiday",
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 5. 刪除國定假日

```
DELETE /api/v1/settings/holidays/:date
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 日期，格式 `YYYY-MM-DD`

**回應範例（200）：**
```json
{
  "success": true,
  "message": "國定假日已刪除"
}
```

**錯誤回應（409 - 資源被使用）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "details": {
    "related_count": 5,
    "timelogs_count": 5
  }
}
```

---

### 6. 批量導入國定假日

```
POST /api/v1/settings/holidays/batch
```

**權限：** 管理員

**請求 Body：**
```json
{
  "holidays": [
    {
      "holiday_date": "2025-01-27",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-28",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday"
    }
  ],
  "replace_existing": false
}
```

**參數說明：**
- `holidays`: 國定假日陣列，每個項目格式同新增 API
- `replace_existing`: 
  - `true` = 覆蓋重複的資料
  - `false` = 跳過重複的資料（預設）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 1 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 1,
    "failed_count": 0,
    "total": 3,
    "details": {
      "created": [
        "2025-01-27",
        "2025-01-28"
      ],
      "skipped": [
        "2025-01-18"
      ],
      "failed": []
    }
  }
}
```

**錯誤回應（部分失敗）：**
```json
{
  "success": false,
  "message": "已新增 1 筆，跳過 1 筆，失敗 1 筆",
  "data": {
    "created_count": 1,
    "skipped_count": 1,
    "failed_count": 1,
    "total": 3,
    "details": {
      "created": ["2025-01-27"],
      "skipped": ["2025-01-18"],
      "failed": [
        {
          "item": { "holiday_date": "2025-13-01", "name": "無效日期", "type": "holiday" },
          "error": "日期格式錯誤"
        }
      ]
    }
  }
}
```

---

### 7. 匯出國定假日

```
GET /api/v1/settings/holidays/export
```

**權限：** 管理員

**查詢參數：**
- `year` (可選, string): 匯出指定年份，格式 `YYYY`
- `type` (可選, string): 匯出指定類型，`holiday` 或 `workday`
- `format` (可選, string): 匯出格式，目前只支援 `csv`（預設）

**請求範例：**
```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**回應 Headers：**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="holidays_2025.csv"
```

**回應 Body（CSV）：**
```csv
holiday_date,name,type
2025-01-01,中華民國開國紀念日,holiday
2025-01-18,補班日,workday
2025-01-27,春節,holiday
2025-01-28,春節,holiday
```

---

### 8. 查詢使用情況

```
GET /api/v1/settings/holidays/:date/usage
```

**權限：** 管理員

**路徑參數：**
- `date` (必填, string): 日期，格式 `YYYY-MM-DD`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "in_use": true,
    "usage_count": 5,
    "can_delete": false,
    "details": {
      "timelogs_count": 5,
      "recent_usage": [
        {
          "user_id": 123,
          "user_name": "王小明",
          "work_date": "2025-01-01",
          "hours": 8
        },
        {
          "user_id": 456,
          "user_name": "李小華",
          "work_date": "2025-01-01",
          "hours": 10
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
    "holiday_date": "2025-12-25",
    "in_use": false,
    "usage_count": 0,
    "can_delete": true,
    "details": {
      "timelogs_count": 0
    }
  }
}
```

---

## 資料模型

### Holiday

```typescript
interface Holiday {
  holiday_date: string;      // 日期，格式 YYYY-MM-DD，主鍵
  name: string;              // 假日名稱，1-50字元
  type: 'holiday' | 'workday'; // 類型：國定假日 or 補班日
  created_at: string;        // 建立時間，ISO 8601
  updated_at: string;        // 更新時間，ISO 8601
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `HOLIDAY_NOT_FOUND` | 404 | 找不到指定的國定假日 |
| `HOLIDAY_ALREADY_EXISTS` | 409 | 日期已存在 |
| `HOLIDAY_IN_USE` | 409 | 國定假日已被工時記錄使用 |
| `INVALID_PARAMETERS` | 400 | 請求參數格式錯誤 |
| `INVALID_DATE_FORMAT` | 400 | 日期格式錯誤 |
| `INVALID_HOLIDAY_TYPE` | 400 | 假日類型無效 |

---

## 使用範例

### 新增 2026 年國定假日

```javascript
// 1. 批量導入
const response = await fetch('/api/v1/settings/holidays/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    holidays: [
      { holiday_date: '2026-01-01', name: '中華民國開國紀念日', type: 'holiday' },
      { holiday_date: '2026-02-16', name: '春節', type: 'holiday' },
      // ... 更多假日
    ],
    replace_existing: false
  })
});

const result = await response.json();
console.log(`成功新增 ${result.data.created_count} 筆國定假日`);
```

### 檢查是否可刪除

```javascript
// 1. 先查詢使用情況
const checkResponse = await fetch('/api/v1/settings/holidays/2025-01-01/usage', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const checkResult = await checkResponse.json();

if (checkResult.data.can_delete) {
  // 2. 可以刪除
  await fetch('/api/v1/settings/holidays/2025-01-01', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('刪除成功');
} else {
  console.log(`無法刪除，已被 ${checkResult.data.usage_count} 筆記錄使用`);
}
```

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#21-國定假日管理)
- [資料庫設計 - Holidays](../../資料庫設計.md#7-假期與業務規則資料表)
- [工時 API](../工時API.md) - 使用國定假日判定加班類型

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



