# 加班費率 API

**API 前綴：** `/api/v1/settings/overtime-rates`  
**最後更新：** 2025年10月27日

---

## 概述

設定不同工作日類型和時段的加班費率，**完全符合台灣勞基法規定**，用於自動計算加權工時和加班費。

**主要功能：**
- 加班費率的 CRUD 操作
- 軟刪除（標記為歷史費率）機制
- 按工作日類型篩選
- 恢復法定預設值
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/overtime-rates` | 獲取加班費率列表 | 管理員 |
| GET | `/overtime-rates/:id` | 獲取特定費率 | 管理員 |
| POST | `/overtime-rates` | 新增加班費率 | 管理員 |
| PUT | `/overtime-rates/:id` | 編輯加班費率 | 管理員 |
| DELETE | `/overtime-rates/:id` | 標記為歷史費率 | 管理員 |
| POST | `/overtime-rates/reset-defaults` | 恢復法定預設值 | 管理員 |
| GET | `/overtime-rates/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取加班費率列表

```
GET /api/v1/settings/overtime-rates
```

**權限：** 管理員

**查詢參數：**
- `work_day_type` (可選, string): 篩選工作日類型
  - `weekday` - 平日延長工時
  - `rest_day` - 休息日
  - `national_holiday` - 國定假日
  - `holiday` - 例假日

**請求範例：**
```
GET /api/v1/settings/overtime-rates?work_day_type=weekday
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rate_id": 1,
      "work_day_type": "weekday",
      "hour_from": 1,
      "hour_to": 2,
      "rate": 1.34,
      "description": "平日第1-2小時（第9-10H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rate_id": 2,
      "work_day_type": "weekday",
      "hour_from": 3,
      "hour_to": 4,
      "rate": 1.67,
      "description": "平日第3-4小時（第11-12H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增加班費率

```
POST /api/v1/settings/overtime-rates
```

**權限：** 管理員

**請求 Body：**
```json
{
  "work_day_type": "weekday",
  "hour_from": 1,
  "hour_to": 2,
  "rate": 1.34,
  "description": "平日延長工時第1-2小時",
  "requires_compensatory_leave": false
}
```

**驗證規則：**
- `work_day_type`: 
  - 必填
  - 字串，只能是 `weekday`/`rest_day`/`national_holiday`/`holiday`
- `hour_from`: 
  - 必填
  - 整數，1-12
- `hour_to`: 
  - 必填
  - 整數，1-12
  - 必須 >= hour_from
- `rate`: 
  - 必填
  - 數字，> 0
  - 建議精確到小數點後兩位
- `description`: 
  - 必填
  - 字串，1-100 字元
- `requires_compensatory_leave`: 
  - 必填
  - 布林值
  - 例假日加班必須為 `true`

**回應範例（201）：**
```json
{
  "success": true,
  "message": "加班費率新增成功",
  "data": {
    "rate_id": 10,
    "work_day_type": "weekday",
    "hour_from": 1,
    "hour_to": 2,
    "rate": 1.34,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

---

### 3. 編輯加班費率

```
PUT /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "加班費率已更新",
  "data": {
    "rate_id": 1,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 標記為歷史費率

```
DELETE /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已標記為歷史費率",
  "data": {
    "rate_id": 1,
    "is_historical": true,
    "related_records_count": 100
  }
}
```

**說明：**
- 標記為歷史後，歷史工時記錄仍保留正確的計算結果
- 新的加班記錄不再使用此費率

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/overtime-rates/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定預設費率（共 14 條規則）",
  "data": {
    "created_count": 14,
    "replaced_count": 0,
    "rates": {
      "weekday": 2,
      "rest_day": 3,
      "national_holiday": 3,
      "holiday": 2
    }
  }
}
```

**說明：**
恢復以下台灣勞基法規定的加班費率：
- 平日延長工時：2 條（1.34倍、1.67倍）
- 休息日：3 條（1.34倍、1.67倍、2.67倍）
- 國定假日：3 條（2.0倍、1.34倍、1.67倍）
- 例假日：2 條（2.0倍、2.0倍+補休）

---

### 6. 查詢使用情況

```
GET /api/v1/settings/overtime-rates/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "rate_id": 1,
    "in_use": true,
    "usage_count": 100,
    "can_delete": false,
    "details": {
      "timelogs_count": 100,
      "comp_leave_transactions_count": 50,
      "recent_usage": [
        {
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 2
        }
      ]
    }
  }
}
```

---

## 資料模型

### OvertimeRate

```typescript
interface OvertimeRate {
  rate_id: number;                        // 費率 ID，主鍵
  work_day_type: 'weekday' | 'rest_day' | 'national_holiday' | 'holiday';
  hour_from: number;                      // 第幾小時開始（1-12）
  hour_to: number;                        // 第幾小時結束（1-12）
  rate: number;                           // 費率倍數
  description: string;                    // 說明
  requires_compensatory_leave: boolean;   // 是否需要補休
  created_at: string;                     // 建立時間
  updated_at: string;                     // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `OVERTIME_RATE_NOT_FOUND` | 404 | 找不到指定的費率 |
| `OVERTIME_RATE_IN_USE` | 409 | 費率已被使用 |
| `INVALID_WORK_DAY_TYPE` | 400 | 無效的工作日類型 |
| `INVALID_HOUR_RANGE` | 400 | 時數範圍錯誤 |
| `INVALID_RATE_VALUE` | 400 | 費率必須 > 0 |

---

## 台灣勞基法加班費規定參考

| 日期類型 | 時數範圍 | 費率 | 備註 |
|---------|---------|------|------|
| 平日 | 第1-2小時 | 1.34倍 | 加給1/3 |
| 平日 | 第3-4小時 | 1.67倍 | 加給2/3 |
| 休息日 | 第1-2小時 | 1.34倍 | |
| 休息日 | 第3-8小時 | 1.67倍 | |
| 休息日 | 第9-12小時 | 2.67倍 | 加給1又2/3 |
| 國定假日 | 1-8小時 | 2.00倍 | 另加發1日工資 |
| 國定假日 | 第9-10小時 | 1.34倍 | |
| 國定假日 | 第11-12小時 | 1.67倍 | |
| 例假日 | 1-8小時 | 2.00倍 | 需補休一天 |
| 例假日 | 第9-12小時 | 2.00倍 | 需補休一天 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#23-加班費率設定)
- [資料庫設計 - OvertimeRates](../../資料庫設計.md)
- [工時 API](../工時API.md) - 使用費率計算加權工時

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/overtime-rates`  
**最後更新：** 2025年10月27日

---

## 概述

設定不同工作日類型和時段的加班費率，**完全符合台灣勞基法規定**，用於自動計算加權工時和加班費。

**主要功能：**
- 加班費率的 CRUD 操作
- 軟刪除（標記為歷史費率）機制
- 按工作日類型篩選
- 恢復法定預設值
- 查詢使用情況

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/overtime-rates` | 獲取加班費率列表 | 管理員 |
| GET | `/overtime-rates/:id` | 獲取特定費率 | 管理員 |
| POST | `/overtime-rates` | 新增加班費率 | 管理員 |
| PUT | `/overtime-rates/:id` | 編輯加班費率 | 管理員 |
| DELETE | `/overtime-rates/:id` | 標記為歷史費率 | 管理員 |
| POST | `/overtime-rates/reset-defaults` | 恢復法定預設值 | 管理員 |
| GET | `/overtime-rates/:id/usage` | 查詢使用情況 | 管理員 |

---

## 詳細規格

### 1. 獲取加班費率列表

```
GET /api/v1/settings/overtime-rates
```

**權限：** 管理員

**查詢參數：**
- `work_day_type` (可選, string): 篩選工作日類型
  - `weekday` - 平日延長工時
  - `rest_day` - 休息日
  - `national_holiday` - 國定假日
  - `holiday` - 例假日

**請求範例：**
```
GET /api/v1/settings/overtime-rates?work_day_type=weekday
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rate_id": 1,
      "work_day_type": "weekday",
      "hour_from": 1,
      "hour_to": 2,
      "rate": 1.34,
      "description": "平日第1-2小時（第9-10H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rate_id": 2,
      "work_day_type": "weekday",
      "hour_from": 3,
      "hour_to": 4,
      "rate": 1.67,
      "description": "平日第3-4小時（第11-12H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增加班費率

```
POST /api/v1/settings/overtime-rates
```

**權限：** 管理員

**請求 Body：**
```json
{
  "work_day_type": "weekday",
  "hour_from": 1,
  "hour_to": 2,
  "rate": 1.34,
  "description": "平日延長工時第1-2小時",
  "requires_compensatory_leave": false
}
```

**驗證規則：**
- `work_day_type`: 
  - 必填
  - 字串，只能是 `weekday`/`rest_day`/`national_holiday`/`holiday`
- `hour_from`: 
  - 必填
  - 整數，1-12
- `hour_to`: 
  - 必填
  - 整數，1-12
  - 必須 >= hour_from
- `rate`: 
  - 必填
  - 數字，> 0
  - 建議精確到小數點後兩位
- `description`: 
  - 必填
  - 字串，1-100 字元
- `requires_compensatory_leave`: 
  - 必填
  - 布林值
  - 例假日加班必須為 `true`

**回應範例（201）：**
```json
{
  "success": true,
  "message": "加班費率新增成功",
  "data": {
    "rate_id": 10,
    "work_day_type": "weekday",
    "hour_from": 1,
    "hour_to": 2,
    "rate": 1.34,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

---

### 3. 編輯加班費率

```
PUT /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "加班費率已更新",
  "data": {
    "rate_id": 1,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 標記為歷史費率

```
DELETE /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已標記為歷史費率",
  "data": {
    "rate_id": 1,
    "is_historical": true,
    "related_records_count": 100
  }
}
```

**說明：**
- 標記為歷史後，歷史工時記錄仍保留正確的計算結果
- 新的加班記錄不再使用此費率

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/overtime-rates/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定預設費率（共 14 條規則）",
  "data": {
    "created_count": 14,
    "replaced_count": 0,
    "rates": {
      "weekday": 2,
      "rest_day": 3,
      "national_holiday": 3,
      "holiday": 2
    }
  }
}
```

**說明：**
恢復以下台灣勞基法規定的加班費率：
- 平日延長工時：2 條（1.34倍、1.67倍）
- 休息日：3 條（1.34倍、1.67倍、2.67倍）
- 國定假日：3 條（2.0倍、1.34倍、1.67倍）
- 例假日：2 條（2.0倍、2.0倍+補休）

---

### 6. 查詢使用情況

```
GET /api/v1/settings/overtime-rates/:id/usage
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 費率 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "rate_id": 1,
    "in_use": true,
    "usage_count": 100,
    "can_delete": false,
    "details": {
      "timelogs_count": 100,
      "comp_leave_transactions_count": 50,
      "recent_usage": [
        {
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 2
        }
      ]
    }
  }
}
```

---

## 資料模型

### OvertimeRate

```typescript
interface OvertimeRate {
  rate_id: number;                        // 費率 ID，主鍵
  work_day_type: 'weekday' | 'rest_day' | 'national_holiday' | 'holiday';
  hour_from: number;                      // 第幾小時開始（1-12）
  hour_to: number;                        // 第幾小時結束（1-12）
  rate: number;                           // 費率倍數
  description: string;                    // 說明
  requires_compensatory_leave: boolean;   // 是否需要補休
  created_at: string;                     // 建立時間
  updated_at: string;                     // 更新時間
}
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `OVERTIME_RATE_NOT_FOUND` | 404 | 找不到指定的費率 |
| `OVERTIME_RATE_IN_USE` | 409 | 費率已被使用 |
| `INVALID_WORK_DAY_TYPE` | 400 | 無效的工作日類型 |
| `INVALID_HOUR_RANGE` | 400 | 時數範圍錯誤 |
| `INVALID_RATE_VALUE` | 400 | 費率必須 > 0 |

---

## 台灣勞基法加班費規定參考

| 日期類型 | 時數範圍 | 費率 | 備註 |
|---------|---------|------|------|
| 平日 | 第1-2小時 | 1.34倍 | 加給1/3 |
| 平日 | 第3-4小時 | 1.67倍 | 加給2/3 |
| 休息日 | 第1-2小時 | 1.34倍 | |
| 休息日 | 第3-8小時 | 1.67倍 | |
| 休息日 | 第9-12小時 | 2.67倍 | 加給1又2/3 |
| 國定假日 | 1-8小時 | 2.00倍 | 另加發1日工資 |
| 國定假日 | 第9-10小時 | 1.34倍 | |
| 國定假日 | 第11-12小時 | 1.67倍 | |
| 例假日 | 1-8小時 | 2.00倍 | 需補休一天 |
| 例假日 | 第9-12小時 | 2.00倍 | 需補休一天 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#23-加班費率設定)
- [資料庫設計 - OvertimeRates](../../資料庫設計.md)
- [工時 API](../工時API.md) - 使用費率計算加權工時

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



