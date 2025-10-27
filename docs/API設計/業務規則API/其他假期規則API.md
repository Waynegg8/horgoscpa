# 其他假期規則 API

**API 前綴：** `/api/v1/settings/other-leave-rules`  
**最後更新：** 2025年10月27日

---

## 概述

管理事件型假別（婚假、喪假、產假等），這些假別需要透過「生活事件登記」申請，系統根據事件類型和子類別自動計算給假天數。

**主要功能：**
- 支援複雜的子類別規則（喪假依親屬關係、流產假依懷孕週數）
- 事件型假期規則的 CRUD 操作
- 按假別類別篩選
- 恢復法定預設值

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/other-leave-rules` | 獲取假期規則列表 | 管理員 |
| GET | `/other-leave-rules/:id` | 獲取特定規則 | 管理員 |
| POST | `/other-leave-rules` | 新增假期規則 | 管理員 |
| PUT | `/other-leave-rules/:id` | 編輯假期規則 | 管理員 |
| DELETE | `/other-leave-rules/:id` | 刪除假期規則 | 管理員 |
| POST | `/other-leave-rules/reset-defaults` | 恢復法定預設值 | 管理員 |

---

## 詳細規格

### 1. 獲取假期規則列表

```
GET /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**查詢參數：**
- `leave_category` (可選, string): 篩選假別類別，如 `喪假`、`產假`

**請求範例：**
```
GET /api/v1/settings/other-leave-rules?leave_category=喪假
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "leave_category": "婚假",
      "leave_subcategory": null,
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "勞工結婚",
      "legal_source": "勞工請假規則",
      "notes": "應於結婚登記日前後3個月內休畢",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "leave_category": "喪假",
      "leave_subcategory": "父母、配偶",
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "父母或配偶喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 3,
      "leave_category": "喪假",
      "leave_subcategory": "祖父母、子女",
      "grant_days": 6,
      "pay_rate": 1.0,
      "description": "祖父母或子女喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增假期規則

```
POST /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**請求 Body：**
```json
{
  "leave_category": "喪假",
  "leave_subcategory": "兄弟姊妹",
  "grant_days": 3,
  "pay_rate": 1.0,
  "description": "兄弟姊妹喪亡",
  "legal_source": "勞工請假規則",
  "notes": null
}
```

**驗證規則：**
- `leave_category`: 
  - 必填
  - 字串，1-20 字元
- `leave_subcategory`: 
  - 可選
  - 字串，最多 50 字元
  - 與 leave_category 的組合必須唯一
- `grant_days`: 
  - 必填
  - 整數，> 0
- `pay_rate`: 
  - 必填
  - 數字，0.0-1.0
- `description`: 
  - 可選
  - 字串，最多 200 字元
- `legal_source`: 
  - 可選
  - 字串，最多 100 字元
- `notes`: 
  - 可選
  - 字串，最多 500 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "假期規則新增成功",
  "data": {
    "rule_id": 15,
    "leave_category": "喪假",
    "leave_subcategory": "兄弟姊妹",
    "grant_days": 3,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "此假別規則已存在",
  "code": "LEAVE_RULE_ALREADY_EXISTS",
  "details": {
    "existing_rule_id": 3,
    "leave_category": "喪假",
    "leave_subcategory": "兄弟姊妹"
  }
}
```

---

### 3. 編輯假期規則

```
PUT /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假期規則已更新",
  "data": {
    "rule_id": 2,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 刪除假期規則

```
DELETE /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假期規則已刪除"
}
```

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/other-leave-rules/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定假期規則（共 10 條規則）",
  "data": {
    "created_count": 10,
    "replaced_count": 0,
    "rules_summary": {
      "婚假": 1,
      "喪假": 3,
      "產假": 1,
      "流產假": 2,
      "產檢假": 1,
      "陪產假": 1
    }
  }
}
```

**說明：** 建立以下法定假期規則：
- 婚假：1 條
- 喪假：3 條（依親屬關係：8天、6天、3天）
- 產假：1 條
- 流產假：2 條（依懷孕週數：28天、7天）
- 產檢假：1 條
- 陪產假：1 條

---

## 資料模型

### OtherLeaveRule

```typescript
interface OtherLeaveRule {
  rule_id: number;           // 規則 ID，主鍵
  leave_category: string;    // 假別類別
  leave_subcategory: string | null; // 子類別
  grant_days: number;        // 給假天數
  pay_rate: number;          // 薪資比例（0-1）
  description: string;       // 說明
  legal_source: string;      // 法源依據
  notes: string;             // 備註
  created_at: string;        // 建立時間
  updated_at: string;        // 更新時間
}
```

---

## 與生活事件登記的整合

當員工在「生活事件登記」申請時：

```
1. 前端請求：GET /api/v1/settings/other-leave-rules?leave_category=喪假
   → 獲取所有喪假的子類別選項

2. 員工選擇：喪假 - 父母、配偶
   → 前端顯示：「將給予 8 天喪假」

3. 確認登記：POST /api/v1/leave/events
   → 系統自動增加 8 天喪假額度
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `LEAVE_RULE_NOT_FOUND` | 404 | 找不到指定的假期規則 |
| `LEAVE_RULE_ALREADY_EXISTS` | 409 | 規則已存在（相同類別+子類別） |
| `INVALID_GRANT_DAYS` | 400 | 給假天數必須 > 0 |
| `INVALID_PAY_RATE` | 400 | 薪資比例必須在 0-1 之間 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#25-其他假期規則)
- [資料庫設計 - OtherLeaveRules](../../資料庫設計.md)
- [假期 API](../假期API.md) - 生活事件登記使用此規則計算給假

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/other-leave-rules`  
**最後更新：** 2025年10月27日

---

## 概述

管理事件型假別（婚假、喪假、產假等），這些假別需要透過「生活事件登記」申請，系統根據事件類型和子類別自動計算給假天數。

**主要功能：**
- 支援複雜的子類別規則（喪假依親屬關係、流產假依懷孕週數）
- 事件型假期規則的 CRUD 操作
- 按假別類別篩選
- 恢復法定預設值

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/other-leave-rules` | 獲取假期規則列表 | 管理員 |
| GET | `/other-leave-rules/:id` | 獲取特定規則 | 管理員 |
| POST | `/other-leave-rules` | 新增假期規則 | 管理員 |
| PUT | `/other-leave-rules/:id` | 編輯假期規則 | 管理員 |
| DELETE | `/other-leave-rules/:id` | 刪除假期規則 | 管理員 |
| POST | `/other-leave-rules/reset-defaults` | 恢復法定預設值 | 管理員 |

---

## 詳細規格

### 1. 獲取假期規則列表

```
GET /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**查詢參數：**
- `leave_category` (可選, string): 篩選假別類別，如 `喪假`、`產假`

**請求範例：**
```
GET /api/v1/settings/other-leave-rules?leave_category=喪假
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "leave_category": "婚假",
      "leave_subcategory": null,
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "勞工結婚",
      "legal_source": "勞工請假規則",
      "notes": "應於結婚登記日前後3個月內休畢",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "leave_category": "喪假",
      "leave_subcategory": "父母、配偶",
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "父母或配偶喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 3,
      "leave_category": "喪假",
      "leave_subcategory": "祖父母、子女",
      "grant_days": 6,
      "pay_rate": 1.0,
      "description": "祖父母或子女喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 新增假期規則

```
POST /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**請求 Body：**
```json
{
  "leave_category": "喪假",
  "leave_subcategory": "兄弟姊妹",
  "grant_days": 3,
  "pay_rate": 1.0,
  "description": "兄弟姊妹喪亡",
  "legal_source": "勞工請假規則",
  "notes": null
}
```

**驗證規則：**
- `leave_category`: 
  - 必填
  - 字串，1-20 字元
- `leave_subcategory`: 
  - 可選
  - 字串，最多 50 字元
  - 與 leave_category 的組合必須唯一
- `grant_days`: 
  - 必填
  - 整數，> 0
- `pay_rate`: 
  - 必填
  - 數字，0.0-1.0
- `description`: 
  - 可選
  - 字串，最多 200 字元
- `legal_source`: 
  - 可選
  - 字串，最多 100 字元
- `notes`: 
  - 可選
  - 字串，最多 500 字元

**回應範例（201）：**
```json
{
  "success": true,
  "message": "假期規則新增成功",
  "data": {
    "rule_id": 15,
    "leave_category": "喪假",
    "leave_subcategory": "兄弟姊妹",
    "grant_days": 3,
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**錯誤回應（409）：**
```json
{
  "error": "Conflict",
  "message": "此假別規則已存在",
  "code": "LEAVE_RULE_ALREADY_EXISTS",
  "details": {
    "existing_rule_id": 3,
    "leave_category": "喪假",
    "leave_subcategory": "兄弟姊妹"
  }
}
```

---

### 3. 編輯假期規則

```
PUT /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**請求 Body：**（同新增，所有欄位可選）

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假期規則已更新",
  "data": {
    "rule_id": 2,
    "updated_at": "2025-10-27T10:30:00Z"
  }
}
```

---

### 4. 刪除假期規則

```
DELETE /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**路徑參數：**
- `id` (必填, integer): 規則 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "假期規則已刪除"
}
```

---

### 5. 恢復法定預設值

```
POST /api/v1/settings/other-leave-rules/reset-defaults
```

**權限：** 管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復法定假期規則（共 10 條規則）",
  "data": {
    "created_count": 10,
    "replaced_count": 0,
    "rules_summary": {
      "婚假": 1,
      "喪假": 3,
      "產假": 1,
      "流產假": 2,
      "產檢假": 1,
      "陪產假": 1
    }
  }
}
```

**說明：** 建立以下法定假期規則：
- 婚假：1 條
- 喪假：3 條（依親屬關係：8天、6天、3天）
- 產假：1 條
- 流產假：2 條（依懷孕週數：28天、7天）
- 產檢假：1 條
- 陪產假：1 條

---

## 資料模型

### OtherLeaveRule

```typescript
interface OtherLeaveRule {
  rule_id: number;           // 規則 ID，主鍵
  leave_category: string;    // 假別類別
  leave_subcategory: string | null; // 子類別
  grant_days: number;        // 給假天數
  pay_rate: number;          // 薪資比例（0-1）
  description: string;       // 說明
  legal_source: string;      // 法源依據
  notes: string;             // 備註
  created_at: string;        // 建立時間
  updated_at: string;        // 更新時間
}
```

---

## 與生活事件登記的整合

當員工在「生活事件登記」申請時：

```
1. 前端請求：GET /api/v1/settings/other-leave-rules?leave_category=喪假
   → 獲取所有喪假的子類別選項

2. 員工選擇：喪假 - 父母、配偶
   → 前端顯示：「將給予 8 天喪假」

3. 確認登記：POST /api/v1/leave/events
   → 系統自動增加 8 天喪假額度
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `LEAVE_RULE_NOT_FOUND` | 404 | 找不到指定的假期規則 |
| `LEAVE_RULE_ALREADY_EXISTS` | 409 | 規則已存在（相同類別+子類別） |
| `INVALID_GRANT_DAYS` | 400 | 給假天數必須 > 0 |
| `INVALID_PAY_RATE` | 400 | 薪資比例必須在 0-1 之間 |

---

## 相關文檔

- [API 標準規範](../00-API標準規範.md)
- [業務規則管理功能模塊](../../功能模塊/02-業務規則管理.md#25-其他假期規則)
- [資料庫設計 - OtherLeaveRules](../../資料庫設計.md)
- [假期 API](../假期API.md) - 生活事件登記使用此規則計算給假

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



