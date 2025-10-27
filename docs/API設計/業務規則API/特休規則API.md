# 特休規則 API

**API 前綴：** `/api/v1/settings/annual-leave-rules`  
**最後更新：** 2025年10月27日

---

## 概述

設定員工年資對應的特休天數，依照台灣勞基法規定。系統根據員工到職日精確計算年資（到月份），規則變更時自動重新計算所有員工的特休額度。

**主要功能：**
- 特休規則的 CRUD 操作
- 規則變更立即重算員工特休額度
- 恢復法定預設值（26 條規則，涵蓋到 25 年年資）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/annual-leave-rules` | 獲取特休規則列表 | 管理員 |
| GET | `/annual-leave-rules/:id` | 獲取特定規則 | 管理員 |
| POST | `/annual-leave-rules` | 新增特休規則 | 管理員 |
| PUT | `/annual-leave-rules/:id` | 編輯特休規則 | 管理員 |
| DELETE | `/annual-leave-rules/:id` | 刪除特休規則 | 管理員 |
| POST | `/annual-leave-rules/reset-defaults` | 恢復法定預設值 | 管理員 |

---

## 詳細規格

### 1. 獲取特休規則列表

```
GET /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "min_seniority_months": 6,
      "max_seniority_months": 11,
      "grant_days": 3,
      "description": "6個月以上未滿1年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "min_seniority_months": 12,
      "max_seniority_months": 23,
      "grant_days": 7,
      "description": "1年以上未滿2年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增特休規則

```
POST /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**請求 Body：**
```json
{
  "min_seniority_months": 60,
  "max_seniority_months": 71,
  "grant_days": 16,
  "description": "5年以上未滿6年"
}
```

**驗證規則：**
- `min_seniority_months`: 
  - 必填
  - 整數，>= 0
- `max_seniority_months`: 
  - 必填
  - 整數，>= min_seniority_months
- `grant_days`: 
  - 必填
  - 整數，> 0
- `description`: 
  - 可選
  - 字串，最多 100 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "特休規則新增成功",
  "data": {
    "rule_id": 20,
    "min_seniority_months": 60,
    "max_seniority_months": 71,
    "grant_days": 16,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

---

### 3. 編輯特休規則（立即重算）

```
PUT /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "特休規則已更新，已重新計算 3 位員工的特休額度",
  "data": {
    "rule_id": 5,
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "seniority_months": 67,
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 456,
        "name": "李小華",
        "seniority_months": 68,
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 789,
        "name": "張小美",
        "seniority_months": 70,
        "old_days": 15,
        "new_days": 16
      }
    ],
    "affected_count": 3,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

**說明：** 
- 規則更新後，系統自動計算所有符合此年資範圍的員工
- 立即更新他們的特休額度
- 返回受影響的員工清單

---

### 4. 刪除特休規則

```
DELETE /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "特休規則已刪除"
}
```

**警告：** 刪除規則可能導致某些年資範圍的員工無法計算特休，請謹慎操作

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/annual-leave-rules/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定特休規則（共 26 條規則）",
  "data": {
    "created_count": 26,
    "replaced_count": 0,
    "affected_employees_count": 15,
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "new_annual_leave_days": 15
      }
    ]
  }
}
```

**說明：** 
- 建立完整的 26 條特休規則（6個月到 25 年以上）
- 自動重新計算所有員工的特休額度

---

## 資料模型

### AnnualLeaveRule

```typescript
interface AnnualLeaveRule {
  rule_id: number;              // 規則 ID，主鍵
  min_seniority_months: number; // 最低年資（月）
  max_seniority_months: number; // 最高年資（月）
  grant_days: number;           // 給假天數
  description: string;          // 說明
  created_at: string;           // 建立時間
  updated_at: string;           // 更新時間
}
```

### AffectedEmployee

```typescript
interface AffectedEmployee {
  user_id: number;
  name: string;
  seniority_months: number;     // 當前年資（月）
  old_days: number;             // 舊的特休天數
  new_days: number;             // 新的特休天數
}
```

---

## 台灣勞基法特休規定參考

| 年資範圍（月） | 給假天數 |
|--------------|---------|
| 6-11個月 | 3天 |
| 12-23個月 | 7天 |
| 24-35個月 | 10天 |
| 36-59個月 | 14天 |
| 60-119個月 | 15天 |
| 120個月起 | 16-30天（每年+1，上限30） |

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `ANNUAL_LEAVE_RULE_NOT_FOUND` | 404 | 找不到指定的規則 |
| `INVALID_SENIORITY_RANGE` | 400 | 年資範圍設定錯誤 |
| `INVALID_GRANT_DAYS` | 400 | 給假天數必須 > 0 |
| `OVERLAPPING_RULES` | 409 | 年資範圍與現有規則重疊 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#24-特休規則設定)
- [資料庫設計 - AnnualLeaveRules](../../資料庫設計.md)
- [假期 API](../假期API.md) - 計算和查詢特休餘額

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/annual-leave-rules`  
**最後更新：** 2025年10月27日

---

## 概述

設定員工年資對應的特休天數，依照台灣勞基法規定。系統根據員工到職日精確計算年資（到月份），規則變更時自動重新計算所有員工的特休額度。

**主要功能：**
- 特休規則的 CRUD 操作
- 規則變更立即重算員工特休額度
- 恢復法定預設值（26 條規則，涵蓋到 25 年年資）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/annual-leave-rules` | 獲取特休規則列表 | 管理員 |
| GET | `/annual-leave-rules/:id` | 獲取特定規則 | 管理員 |
| POST | `/annual-leave-rules` | 新增特休規則 | 管理員 |
| PUT | `/annual-leave-rules/:id` | 編輯特休規則 | 管理員 |
| DELETE | `/annual-leave-rules/:id` | 刪除特休規則 | 管理員 |
| POST | `/annual-leave-rules/reset-defaults` | 恢復法定預設值 | 管理員 |

---

## 詳細規格

### 1. 獲取特休規則列表

```
GET /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "min_seniority_months": 6,
      "max_seniority_months": 11,
      "grant_days": 3,
      "description": "6個月以上未滿1年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "min_seniority_months": 12,
      "max_seniority_months": 23,
      "grant_days": 7,
      "description": "1年以上未滿2年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增特休規則

```
POST /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**請求 Body：**
```json
{
  "min_seniority_months": 60,
  "max_seniority_months": 71,
  "grant_days": 16,
  "description": "5年以上未滿6年"
}
```

**驗證規則：**
- `min_seniority_months`: 
  - 必填
  - 整數，>= 0
- `max_seniority_months`: 
  - 必填
  - 整數，>= min_seniority_months
- `grant_days`: 
  - 必填
  - 整數，> 0
- `description`: 
  - 可選
  - 字串，最多 100 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "特休規則新增成功",
  "data": {
    "rule_id": 20,
    "min_seniority_months": 60,
    "max_seniority_months": 71,
    "grant_days": 16,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

---

### 3. 編輯特休規則（立即重算）

```
PUT /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "特休規則已更新，已重新計算 3 位員工的特休額度",
  "data": {
    "rule_id": 5,
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "seniority_months": 67,
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 456,
        "name": "李小華",
        "seniority_months": 68,
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 789,
        "name": "張小美",
        "seniority_months": 70,
        "old_days": 15,
        "new_days": 16
      }
    ],
    "affected_count": 3,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

**說明：** 
- 規則更新後，系統自動計算所有符合此年資範圍的員工
- 立即更新他們的特休額度
- 返回受影響的員工清單

---

### 4. 刪除特休規則

```
DELETE /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "特休規則已刪除"
}
```

**警告：** 刪除規則可能導致某些年資範圍的員工無法計算特休，請謹慎操作

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/annual-leave-rules/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定特休規則（共 26 條規則）",
  "data": {
    "created_count": 26,
    "replaced_count": 0,
    "affected_employees_count": 15,
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "new_annual_leave_days": 15
      }
    ]
  }
}
```

**說明：** 
- 建立完整的 26 條特休規則（6個月到 25 年以上）
- 自動重新計算所有員工的特休額度

---

## 資料模型

### AnnualLeaveRule

```typescript
interface AnnualLeaveRule {
  rule_id: number;              // 規則 ID，主鍵
  min_seniority_months: number; // 最低年資（月）
  max_seniority_months: number; // 最高年資（月）
  grant_days: number;           // 給假天數
  description: string;          // 說明
  created_at: string;           // 建立時間
  updated_at: string;           // 更新時間
}
```

### AffectedEmployee

```typescript
interface AffectedEmployee {
  user_id: number;
  name: string;
  seniority_months: number;     // 當前年資（月）
  old_days: number;             // 舊的特休天數
  new_days: number;             // 新的特休天數
}
```

---

## 台灣勞基法特休規定參考

| 年資範圍（月） | 給假天數 |
|--------------|---------|
| 6-11個月 | 3天 |
| 12-23個月 | 7天 |
| 24-35個月 | 10天 |
| 36-59個月 | 14天 |
| 60-119個月 | 15天 |
| 120個月起 | 16-30天（每年+1，上限30） |

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `ANNUAL_LEAVE_RULE_NOT_FOUND` | 404 | 找不到指定的規則 |
| `INVALID_SENIORITY_RANGE` | 400 | 年資範圍設定錯誤 |
| `INVALID_GRANT_DAYS` | 400 | 給假天數必須 > 0 |
| `OVERLAPPING_RULES` | 409 | 年資範圍與現有規則重疊 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#24-特休規則設定)
- [資料庫設計 - AnnualLeaveRules](../../資料庫設計.md)
- [假期 API](../假期API.md) - 計算和查詢特休餘額

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



