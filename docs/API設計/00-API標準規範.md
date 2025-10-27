# API 標準規範

**適用範圍：** 所有 API 端點  
**最後更新：** 2025年10月27日

---

## 1. URL 設計規範

### 1.1 路徑結構

```
/api/{version}/{resource}/{id?}/{action?}
```

**範例：**
```
/api/v1/clients                    # 獲取客戶列表
/api/v1/clients/12345678           # 獲取特定客戶
/api/v1/clients/12345678/services  # 獲取客戶的服務
/api/v1/settings/holidays/export   # 匯出國定假日
```

### 1.2 命名規範

- 使用**小寫字母**和**連字符**（kebab-case）
- 使用**複數名詞**表示資源集合
- 避免動詞，使用 HTTP 方法表達動作

**正確：**
```
GET  /api/v1/leave-types
POST /api/v1/overtime-rates
```

**錯誤：**
```
GET  /api/v1/getLeaveTypes
POST /api/v1/createOvertimeRate
```

### 1.3 查詢參數

使用查詢參數進行篩選、排序、分頁：

```
GET /api/v1/holidays?year=2025&type=holiday&sort=date&order=asc
GET /api/v1/timelogs?user_id=123&start_date=2025-10-01&end_date=2025-10-31
GET /api/v1/clients?page=1&limit=20&status=active
```

**通用查詢參數：**
- `page`: 頁碼（從 1 開始）
- `limit`: 每頁筆數（預設 20）
- `sort`: 排序欄位
- `order`: 排序方向（`asc` 或 `desc`）

---

## 2. HTTP 方法規範

### 2.1 標準用法

| 方法 | 用途 | 冪等性 | 請求Body | 回應Body |
|------|------|--------|----------|----------|
| GET | 獲取資源 | ✓ | ✗ | ✓ |
| POST | 建立資源 | ✗ | ✓ | ✓ |
| PUT | 完整更新資源 | ✓ | ✓ | ✓ |
| PATCH | 部分更新資源 | ✗ | ✓ | ✓ |
| DELETE | 刪除資源 | ✓ | ✗ | ✓ |

### 2.2 使用範例

```
GET    /api/v1/holidays           # 獲取列表
GET    /api/v1/holidays/2025-01-01 # 獲取單筆
POST   /api/v1/holidays           # 新增
PUT    /api/v1/holidays/2025-01-01 # 完整更新
PATCH  /api/v1/holidays/2025-01-01 # 部分更新
DELETE /api/v1/holidays/2025-01-01 # 刪除
```

---

## 3. 請求格式規範

### 3.1 Content-Type

- 使用 `application/json` 作為主要格式
- 檔案上傳使用 `multipart/form-data`

### 3.2 請求 Headers

**必要 Headers：**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**可選 Headers：**
```
Accept-Language: zh-TW
X-Request-ID: uuid
```

### 3.3 請求 Body

使用 JSON 格式：

```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**命名規範：**
- 使用 `snake_case`（底線分隔）
- 布林值使用 `true`/`false`
- 日期使用 ISO 8601 格式（`YYYY-MM-DD`）
- 時間使用 ISO 8601 格式（`YYYY-MM-DDTHH:mm:ssZ`）

---

## 4. 回應格式規範

### 4.1 成功回應

**標準格式：**
```json
{
  "success": true,
  "message": "操作成功訊息（可選）",
  "data": { ... }
}
```

**範例：**

**單筆資料：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday"
  }
}
```

**列表資料：**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "項目1" },
    { "id": 2, "name": "項目2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

**操作結果：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27"
  }
}
```

### 4.2 錯誤回應

**標準格式：**
```json
{
  "error": "錯誤類型",
  "message": "使用者友善的錯誤訊息",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**範例：**

**400 Bad Request（參數錯誤）：**
```json
{
  "error": "Bad Request",
  "message": "請求參數格式錯誤",
  "code": "INVALID_PARAMETERS",
  "details": {
    "holiday_date": "日期格式必須為 YYYY-MM-DD",
    "type": "類型必須為 holiday 或 workday"
  }
}
```

**401 Unauthorized（未登入）：**
```json
{
  "error": "Unauthorized",
  "message": "請先登入",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden（無權限）：**
```json
{
  "error": "Forbidden",
  "message": "您沒有存取此功能的權限",
  "code": "MODULE_PERMISSION_DENIED"
}
```

**404 Not Found（資源不存在）：**
```json
{
  "error": "Not Found",
  "message": "找不到指定的國定假日",
  "code": "HOLIDAY_NOT_FOUND"
}
```

**409 Conflict（資源衝突）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "details": {
    "related_count": 5
  }
}
```

**422 Unprocessable Entity（驗證失敗）：**
```json
{
  "error": "Validation Error",
  "message": "資料驗證失敗",
  "code": "VALIDATION_FAILED",
  "details": {
    "name": "名稱不可為空",
    "grant_days": "天數必須大於 0"
  }
}
```

**500 Internal Server Error（伺服器錯誤）：**
```json
{
  "error": "Internal Server Error",
  "message": "伺服器發生錯誤，請稍後再試",
  "code": "SERVER_ERROR",
  "request_id": "uuid"
}
```

---

## 5. HTTP 狀態碼規範

### 5.1 成功狀態碼（2xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 200 OK | 請求成功 | GET, PUT, PATCH 成功 |
| 201 Created | 資源建立成功 | POST 成功 |
| 204 No Content | 請求成功但無內容 | DELETE 成功 |

### 5.2 客戶端錯誤（4xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 400 Bad Request | 請求格式錯誤 | 參數格式錯誤、缺少必填欄位 |
| 401 Unauthorized | 未授權 | 未登入、Token 過期或無效 |
| 403 Forbidden | 禁止存取 | 沒有權限執行此操作 |
| 404 Not Found | 資源不存在 | 找不到指定的資源 |
| 409 Conflict | 資源衝突 | 刪除被使用的資料、重複的資料 |
| 422 Unprocessable Entity | 無法處理的實體 | 驗證失敗、業務邏輯錯誤 |
| 429 Too Many Requests | 請求過於頻繁 | 超過速率限制 |

### 5.3 伺服器錯誤（5xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 500 Internal Server Error | 伺服器錯誤 | 未預期的錯誤 |
| 503 Service Unavailable | 服務不可用 | 維護中、過載 |

---

## 6. 驗證規範

### 6.1 輸入驗證

**必須驗證的項目：**
- 資料類型（字串、數字、布林、日期）
- 必填欄位
- 長度限制
- 格式限制（Email、URL、日期格式）
- 範圍限制（最小值、最大值）
- 列舉值（只能是特定值之一）

**範例：**
```typescript
// 國定假日新增驗證
{
  holiday_date: {
    required: true,
    type: 'string',
    format: 'YYYY-MM-DD',
    validate: (value) => isValidDate(value)
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50
  },
  type: {
    required: true,
    type: 'string',
    enum: ['holiday', 'workday']
  }
}
```

### 6.2 業務邏輯驗證

**常見驗證：**
- 唯一性檢查（避免重複資料）
- 關聯性檢查（外鍵是否存在）
- 權限檢查（是否有權操作）
- 狀態檢查（資源是否可操作）

---

## 7. 分頁規範

### 7.1 查詢參數

```
GET /api/v1/holidays?page=1&limit=20
```

**參數：**
- `page`: 頁碼（從 1 開始，預設 1）
- `limit`: 每頁筆數（預設 20，最大 100）

### 7.2 回應格式

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 8. 篩選與排序規範

### 8.1 篩選

使用查詢參數進行篩選：

```
GET /api/v1/holidays?year=2025&type=holiday
GET /api/v1/leave-types?is_active=true
GET /api/v1/timelogs?user_id=123&work_date_from=2025-10-01&work_date_to=2025-10-31
```

**命名規範：**
- 精確匹配：`field=value`
- 範圍查詢：`field_from=value&field_to=value`
- 模糊查詢：`field_like=value`（謹慎使用）

### 8.2 排序

```
GET /api/v1/holidays?sort=holiday_date&order=desc
GET /api/v1/clients?sort=company_name&order=asc
```

**參數：**
- `sort`: 排序欄位（預設為主鍵或建立時間）
- `order`: 排序方向（`asc` 或 `desc`，預設 `asc`）

---

## 9. 批量操作規範

### 9.1 批量新增

```
POST /api/v1/holidays/batch
```

**請求：**
```json
{
  "items": [
    { "holiday_date": "2025-01-27", "name": "春節", "type": "holiday" },
    { "holiday_date": "2025-01-28", "name": "春節", "type": "holiday" }
  ],
  "options": {
    "replace_existing": false
  }
}
```

**回應：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 0 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 0,
    "failed_count": 0,
    "total": 2
  }
}
```

### 9.2 批量更新

```
PUT /api/v1/settings/frequency-types/reorder
```

**請求：**
```json
{
  "items": [
    { "id": 1, "sort_order": 2 },
    { "id": 2, "sort_order": 1 }
  ]
}
```

---

## 10. 檔案處理規範

### 10.1 檔案上傳

```
POST /api/v1/resources/upload
Content-Type: multipart/form-data
```

**請求：**
```
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf

[binary data]
------WebKitFormBoundary--
```

**回應：**
```json
{
  "success": true,
  "data": {
    "file_id": "uuid",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_url": "https://cdn.example.com/files/uuid.pdf"
  }
}
```

### 10.2 檔案下載

```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**回應 Headers：**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="holidays_2025.csv"
```

---

## 11. 版本控制規範

### 11.1 URL 版本

```
/api/v1/...  # 當前版本
/api/v2/...  # 未來版本
```

### 11.2 版本變更原則

**主要版本變更（v1 → v2）：**
- 移除端點
- 變更回應格式
- 不相容的參數變更

**次要版本變更（保持 v1）：**
- 新增端點
- 新增可選參數
- 新增回應欄位

---

## 12. 安全性規範

### 12.1 認證

所有 API（除登入外）必須包含 JWT Token：

```
Authorization: Bearer {JWT_TOKEN}
```

### 12.2 權限檢查

```typescript
// 檢查模塊權限
async function checkModulePermission(user, moduleName) {
  if (user.is_admin) return true;
  
  const hasPermission = await getPermission(user.id, moduleName);
  if (!hasPermission) {
    throw new ForbiddenError('沒有權限存取此功能');
  }
}
```

### 12.3 輸入消毒

- 防止 SQL Injection（使用參數化查詢）
- 防止 XSS（過濾 HTML 標籤）
- 防止 CSRF（使用 Token 驗證）

---

## 13. 效能規範

### 13.1 回應時間

- 簡單查詢：< 200ms
- 複雜查詢：< 1s
- 批量操作：< 5s

### 13.2 快取策略

```
Cache-Control: max-age=3600, public
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

### 13.3 分頁限制

- 預設每頁：20 筆
- 最大每頁：100 筆

---

## 14. 文檔規範

每個 API 文檔必須包含：

1. **概述** - 功能說明
2. **端點列表** - 快速參考表
3. **詳細規格** - 每個端點的完整說明
   - HTTP 方法和路徑
   - 權限要求
   - 查詢參數
   - 請求 Body
   - 驗證規則
   - 回應範例
   - 錯誤處理
4. **資料模型** - 資料結構定義
5. **錯誤代碼** - 特定錯誤代碼列表
6. **相關文檔** - 連結到相關模塊

---

## 15. 測試規範

每個 API 必須有：

1. **單元測試** - 驗證邏輯正確性
2. **整合測試** - 驗證與資料庫互動
3. **E2E 測試** - 驗證完整流程
4. **錯誤情境測試** - 驗證錯誤處理

---

## 相關文檔

- [API 設計總覽](./README.md)
- [資料庫設計](../資料庫設計.md)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**適用範圍：** 所有 API 端點  
**最後更新：** 2025年10月27日

---

## 1. URL 設計規範

### 1.1 路徑結構

```
/api/{version}/{resource}/{id?}/{action?}
```

**範例：**
```
/api/v1/clients                    # 獲取客戶列表
/api/v1/clients/12345678           # 獲取特定客戶
/api/v1/clients/12345678/services  # 獲取客戶的服務
/api/v1/settings/holidays/export   # 匯出國定假日
```

### 1.2 命名規範

- 使用**小寫字母**和**連字符**（kebab-case）
- 使用**複數名詞**表示資源集合
- 避免動詞，使用 HTTP 方法表達動作

**正確：**
```
GET  /api/v1/leave-types
POST /api/v1/overtime-rates
```

**錯誤：**
```
GET  /api/v1/getLeaveTypes
POST /api/v1/createOvertimeRate
```

### 1.3 查詢參數

使用查詢參數進行篩選、排序、分頁：

```
GET /api/v1/holidays?year=2025&type=holiday&sort=date&order=asc
GET /api/v1/timelogs?user_id=123&start_date=2025-10-01&end_date=2025-10-31
GET /api/v1/clients?page=1&limit=20&status=active
```

**通用查詢參數：**
- `page`: 頁碼（從 1 開始）
- `limit`: 每頁筆數（預設 20）
- `sort`: 排序欄位
- `order`: 排序方向（`asc` 或 `desc`）

---

## 2. HTTP 方法規範

### 2.1 標準用法

| 方法 | 用途 | 冪等性 | 請求Body | 回應Body |
|------|------|--------|----------|----------|
| GET | 獲取資源 | ✓ | ✗ | ✓ |
| POST | 建立資源 | ✗ | ✓ | ✓ |
| PUT | 完整更新資源 | ✓ | ✓ | ✓ |
| PATCH | 部分更新資源 | ✗ | ✓ | ✓ |
| DELETE | 刪除資源 | ✓ | ✗ | ✓ |

### 2.2 使用範例

```
GET    /api/v1/holidays           # 獲取列表
GET    /api/v1/holidays/2025-01-01 # 獲取單筆
POST   /api/v1/holidays           # 新增
PUT    /api/v1/holidays/2025-01-01 # 完整更新
PATCH  /api/v1/holidays/2025-01-01 # 部分更新
DELETE /api/v1/holidays/2025-01-01 # 刪除
```

---

## 3. 請求格式規範

### 3.1 Content-Type

- 使用 `application/json` 作為主要格式
- 檔案上傳使用 `multipart/form-data`

### 3.2 請求 Headers

**必要 Headers：**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**可選 Headers：**
```
Accept-Language: zh-TW
X-Request-ID: uuid
```

### 3.3 請求 Body

使用 JSON 格式：

```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**命名規範：**
- 使用 `snake_case`（底線分隔）
- 布林值使用 `true`/`false`
- 日期使用 ISO 8601 格式（`YYYY-MM-DD`）
- 時間使用 ISO 8601 格式（`YYYY-MM-DDTHH:mm:ssZ`）

---

## 4. 回應格式規範

### 4.1 成功回應

**標準格式：**
```json
{
  "success": true,
  "message": "操作成功訊息（可選）",
  "data": { ... }
}
```

**範例：**

**單筆資料：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday"
  }
}
```

**列表資料：**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "項目1" },
    { "id": 2, "name": "項目2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

**操作結果：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27"
  }
}
```

### 4.2 錯誤回應

**標準格式：**
```json
{
  "error": "錯誤類型",
  "message": "使用者友善的錯誤訊息",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**範例：**

**400 Bad Request（參數錯誤）：**
```json
{
  "error": "Bad Request",
  "message": "請求參數格式錯誤",
  "code": "INVALID_PARAMETERS",
  "details": {
    "holiday_date": "日期格式必須為 YYYY-MM-DD",
    "type": "類型必須為 holiday 或 workday"
  }
}
```

**401 Unauthorized（未登入）：**
```json
{
  "error": "Unauthorized",
  "message": "請先登入",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden（無權限）：**
```json
{
  "error": "Forbidden",
  "message": "您沒有存取此功能的權限",
  "code": "MODULE_PERMISSION_DENIED"
}
```

**404 Not Found（資源不存在）：**
```json
{
  "error": "Not Found",
  "message": "找不到指定的國定假日",
  "code": "HOLIDAY_NOT_FOUND"
}
```

**409 Conflict（資源衝突）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "details": {
    "related_count": 5
  }
}
```

**422 Unprocessable Entity（驗證失敗）：**
```json
{
  "error": "Validation Error",
  "message": "資料驗證失敗",
  "code": "VALIDATION_FAILED",
  "details": {
    "name": "名稱不可為空",
    "grant_days": "天數必須大於 0"
  }
}
```

**500 Internal Server Error（伺服器錯誤）：**
```json
{
  "error": "Internal Server Error",
  "message": "伺服器發生錯誤，請稍後再試",
  "code": "SERVER_ERROR",
  "request_id": "uuid"
}
```

---

## 5. HTTP 狀態碼規範

### 5.1 成功狀態碼（2xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 200 OK | 請求成功 | GET, PUT, PATCH 成功 |
| 201 Created | 資源建立成功 | POST 成功 |
| 204 No Content | 請求成功但無內容 | DELETE 成功 |

### 5.2 客戶端錯誤（4xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 400 Bad Request | 請求格式錯誤 | 參數格式錯誤、缺少必填欄位 |
| 401 Unauthorized | 未授權 | 未登入、Token 過期或無效 |
| 403 Forbidden | 禁止存取 | 沒有權限執行此操作 |
| 404 Not Found | 資源不存在 | 找不到指定的資源 |
| 409 Conflict | 資源衝突 | 刪除被使用的資料、重複的資料 |
| 422 Unprocessable Entity | 無法處理的實體 | 驗證失敗、業務邏輯錯誤 |
| 429 Too Many Requests | 請求過於頻繁 | 超過速率限制 |

### 5.3 伺服器錯誤（5xx）

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 500 Internal Server Error | 伺服器錯誤 | 未預期的錯誤 |
| 503 Service Unavailable | 服務不可用 | 維護中、過載 |

---

## 6. 驗證規範

### 6.1 輸入驗證

**必須驗證的項目：**
- 資料類型（字串、數字、布林、日期）
- 必填欄位
- 長度限制
- 格式限制（Email、URL、日期格式）
- 範圍限制（最小值、最大值）
- 列舉值（只能是特定值之一）

**範例：**
```typescript
// 國定假日新增驗證
{
  holiday_date: {
    required: true,
    type: 'string',
    format: 'YYYY-MM-DD',
    validate: (value) => isValidDate(value)
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50
  },
  type: {
    required: true,
    type: 'string',
    enum: ['holiday', 'workday']
  }
}
```

### 6.2 業務邏輯驗證

**常見驗證：**
- 唯一性檢查（避免重複資料）
- 關聯性檢查（外鍵是否存在）
- 權限檢查（是否有權操作）
- 狀態檢查（資源是否可操作）

---

## 7. 分頁規範

### 7.1 查詢參數

```
GET /api/v1/holidays?page=1&limit=20
```

**參數：**
- `page`: 頁碼（從 1 開始，預設 1）
- `limit`: 每頁筆數（預設 20，最大 100）

### 7.2 回應格式

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 8. 篩選與排序規範

### 8.1 篩選

使用查詢參數進行篩選：

```
GET /api/v1/holidays?year=2025&type=holiday
GET /api/v1/leave-types?is_active=true
GET /api/v1/timelogs?user_id=123&work_date_from=2025-10-01&work_date_to=2025-10-31
```

**命名規範：**
- 精確匹配：`field=value`
- 範圍查詢：`field_from=value&field_to=value`
- 模糊查詢：`field_like=value`（謹慎使用）

### 8.2 排序

```
GET /api/v1/holidays?sort=holiday_date&order=desc
GET /api/v1/clients?sort=company_name&order=asc
```

**參數：**
- `sort`: 排序欄位（預設為主鍵或建立時間）
- `order`: 排序方向（`asc` 或 `desc`，預設 `asc`）

---

## 9. 批量操作規範

### 9.1 批量新增

```
POST /api/v1/holidays/batch
```

**請求：**
```json
{
  "items": [
    { "holiday_date": "2025-01-27", "name": "春節", "type": "holiday" },
    { "holiday_date": "2025-01-28", "name": "春節", "type": "holiday" }
  ],
  "options": {
    "replace_existing": false
  }
}
```

**回應：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 0 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 0,
    "failed_count": 0,
    "total": 2
  }
}
```

### 9.2 批量更新

```
PUT /api/v1/settings/frequency-types/reorder
```

**請求：**
```json
{
  "items": [
    { "id": 1, "sort_order": 2 },
    { "id": 2, "sort_order": 1 }
  ]
}
```

---

## 10. 檔案處理規範

### 10.1 檔案上傳

```
POST /api/v1/resources/upload
Content-Type: multipart/form-data
```

**請求：**
```
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf

[binary data]
------WebKitFormBoundary--
```

**回應：**
```json
{
  "success": true,
  "data": {
    "file_id": "uuid",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_url": "https://cdn.example.com/files/uuid.pdf"
  }
}
```

### 10.2 檔案下載

```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**回應 Headers：**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="holidays_2025.csv"
```

---

## 11. 版本控制規範

### 11.1 URL 版本

```
/api/v1/...  # 當前版本
/api/v2/...  # 未來版本
```

### 11.2 版本變更原則

**主要版本變更（v1 → v2）：**
- 移除端點
- 變更回應格式
- 不相容的參數變更

**次要版本變更（保持 v1）：**
- 新增端點
- 新增可選參數
- 新增回應欄位

---

## 12. 安全性規範

### 12.1 認證

所有 API（除登入外）必須包含 JWT Token：

```
Authorization: Bearer {JWT_TOKEN}
```

### 12.2 權限檢查

```typescript
// 檢查模塊權限
async function checkModulePermission(user, moduleName) {
  if (user.is_admin) return true;
  
  const hasPermission = await getPermission(user.id, moduleName);
  if (!hasPermission) {
    throw new ForbiddenError('沒有權限存取此功能');
  }
}
```

### 12.3 輸入消毒

- 防止 SQL Injection（使用參數化查詢）
- 防止 XSS（過濾 HTML 標籤）
- 防止 CSRF（使用 Token 驗證）

---

## 13. 效能規範

### 13.1 回應時間

- 簡單查詢：< 200ms
- 複雜查詢：< 1s
- 批量操作：< 5s

### 13.2 快取策略

```
Cache-Control: max-age=3600, public
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

### 13.3 分頁限制

- 預設每頁：20 筆
- 最大每頁：100 筆

---

## 14. 文檔規範

每個 API 文檔必須包含：

1. **概述** - 功能說明
2. **端點列表** - 快速參考表
3. **詳細規格** - 每個端點的完整說明
   - HTTP 方法和路徑
   - 權限要求
   - 查詢參數
   - 請求 Body
   - 驗證規則
   - 回應範例
   - 錯誤處理
4. **資料模型** - 資料結構定義
5. **錯誤代碼** - 特定錯誤代碼列表
6. **相關文檔** - 連結到相關模塊

---

## 15. 測試規範

每個 API 必須有：

1. **單元測試** - 驗證邏輯正確性
2. **整合測試** - 驗證與資料庫互動
3. **E2E 測試** - 驗證完整流程
4. **錯誤情境測試** - 驗證錯誤處理

---

## 相關文檔

- [API 設計總覽](./README.md)
- [資料庫設計](../資料庫設計.md)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



