# API 命名規範

**最後更新：** 2025年10月27日

---

## 1. 端點路徑命名

### 規則：小寫 + 破折號（kebab-case）+ 複數名詞

```
✅ 正確：
GET  /api/v1/clients
GET  /api/v1/time-logs
GET  /api/v1/active-tasks
POST /api/v1/client-services
GET  /api/v1/leave-types

❌ 錯誤：
GET  /api/v1/Clients          -- 不使用大寫
GET  /api/v1/timeLogs         -- 不使用 camelCase
GET  /api/v1/time_logs        -- 不使用 snake_case
GET  /api/v1/client           -- 不使用單數（除非單例資源）
```

### 資源命名

```
✅ 使用複數名詞：
/api/v1/users
/api/v1/clients
/api/v1/tasks

❌ 不使用動詞：
/api/v1/getUsers          -- 用 HTTP 方法表示動作
/api/v1/createClient      -- 用 POST 方法
/api/v1/deleteTask        -- 用 DELETE 方法
```

---

## 2. 子資源命名

### 規則：/{resource}/:id/{sub-resource}

```
✅ 正確：
GET    /api/v1/clients/:id/services
POST   /api/v1/clients/:id/tags
GET    /api/v1/tasks/:id/stages
DELETE /api/v1/clients/:id/tags/:tagId

❌ 錯誤：
GET  /api/v1/clientServices/:clientId   -- 應使用子資源格式
POST /api/v1/addTagToClient             -- 不使用動詞
```

---

## 3. 特殊操作命名

### 規則：POST /{resource}/:id/{action}

**非 CRUD 操作可使用動詞：**

```
✅ 正確：
POST /api/v1/clients/:id/activate
POST /api/v1/clients/:id/archive
POST /api/v1/tasks/:id/complete
POST /api/v1/permissions/sync
POST /api/v1/password/reset

❌ 錯誤：
GET  /api/v1/clients/:id/activate    -- 改變狀態應用 POST
POST /api/v1/clients/activate/:id    -- 順序錯誤
```

---

## 4. 查詢參數命名

### 規則：snake_case

```
✅ 正確：
?page=1
?limit=50
?sort=created_at
?order=desc
?start_date=2025-01-01
?end_date=2025-12-31
?user_id=123
?status=active
?search=關鍵字

❌ 錯誤：
?Page=1              -- 不使用大寫
?pageLimit=50        -- 不使用 camelCase
?StartDate=2025-01-01 -- 不使用 PascalCase
```

### 標準查詢參數

| 參數 | 用途 | 範例 |
|------|------|------|
| `page` | 頁碼 | `?page=2` |
| `limit` | 每頁筆數 | `?limit=20` |
| `sort` | 排序欄位 | `?sort=created_at` |
| `order` | 排序方向 | `?order=desc` |
| `search` | 全文搜尋 | `?search=keyword` |
| `filter` | 篩選 | `?status=active` |
| `start_date` | 開始日期 | `?start_date=2025-01-01` |
| `end_date` | 結束日期 | `?end_date=2025-12-31` |

---

## 5. 請求 Body 欄位命名

### 規則：snake_case（與資料庫欄位一致）

```json
✅ 正確：
{
  "client_id": "12345678",
  "company_name": "ABC Corp",
  "contact_person": "王小明",
  "is_active": true,
  "created_at": "2025-10-27T10:00:00Z"
}

❌ 錯誤：
{
  "clientId": "12345678",      // 不使用 camelCase
  "CompanyName": "ABC Corp",   // 不使用 PascalCase
  "Contact-Person": "王小明"   // 不使用 kebab-case
}
```

---

## 6. 回應欄位命名

### 規則：snake_case

```json
✅ 正確：
{
  "success": true,
  "data": {
    "user_id": 1,
    "user_name": "John",
    "is_admin": false,
    "created_at": "2025-10-27T10:00:00Z"
  },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  }
}

❌ 錯誤：
{
  "Success": true,              // 不使用 PascalCase
  "Data": {
    "userId": 1,                // 不使用 camelCase
    "UserName": "John"          // 不使用 PascalCase
  }
}
```

---

## 7. 錯誤代碼命名

### 規則：UPPER_SNAKE_CASE

```
✅ 正確：
VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
CLIENT_EXISTS
PERMISSION_DENIED
DATABASE_ERROR

❌ 錯誤：
validationError        -- 不使用 camelCase
ValidationError        -- 不使用 PascalCase
validation-error       -- 不使用 kebab-case
```

**錯誤回應範例：**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求參數驗證失敗",
    "details": {
      "field": "email",
      "issue": "格式不正確"
    }
  }
}
```

---

## 8. 版本號命名

### 規則：/api/v{number}

```
✅ 正確：
/api/v1/clients
/api/v2/clients
/api/v1.1/clients      -- 可選：次版本號

❌ 錯誤：
/api/version1/clients  -- 不使用 version 單字
/api/1.0/clients       -- 不省略 v
/v1/api/clients        -- 版本號應在 api 後
```

---

## 9. HTTP Header 命名

### 規則：Kebab-Case（每個單字首字母大寫）

```
✅ 正確：
Authorization: Bearer token
Content-Type: application/json
X-Request-ID: abc123
X-User-ID: 123

❌ 錯誤：
authorization: Bearer token    -- Header 應首字母大寫
AUTHORIZATION: Bearer token    -- 不全部大寫
x_request_id: abc123          -- 不使用 snake_case
```

### 自訂 Header 使用 X- 前綴

```
✅ 正確：
X-Request-ID
X-User-ID
X-Correlation-ID
X-RateLimit-Remaining

❌ 錯誤：
Request-ID             -- 自訂 Header 應加 X-
UserID                 -- 應使用破折號分隔
```

---

## 10. 完整 API 範例

### 客戶管理 API

```
# 基本 CRUD
GET    /api/v1/clients                    # 列表
GET    /api/v1/clients/:id                # 單一
POST   /api/v1/clients                    # 創建
PUT    /api/v1/clients/:id                # 更新
DELETE /api/v1/clients/:id                # 刪除

# 子資源
GET    /api/v1/clients/:id/services       # 客戶的服務
POST   /api/v1/clients/:id/services       # 新增服務
DELETE /api/v1/clients/:id/services/:sid  # 移除服務

# 特殊操作
POST   /api/v1/clients/:id/activate       # 啟用
POST   /api/v1/clients/:id/archive        # 封存

# 查詢參數
GET    /api/v1/clients?page=1&limit=20&sort=created_at&order=desc&status=active&search=科技
```

### 請求範例

```http
POST /api/v1/clients HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json
X-Request-ID: req_abc123

{
  "client_id": "12345678",
  "company_name": "仟鑽企業有限公司",
  "contact_person": "王小明",
  "phone": "02-1234-5678",
  "email": "contact@example.com",
  "status": "active"
}
```

### 回應範例

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: req_abc123
X-RateLimit-Remaining: 95

{
  "success": true,
  "data": {
    "client_id": "12345678",
    "company_name": "仟鑽企業有限公司",
    "contact_person": "王小明",
    "phone": "02-1234-5678",
    "email": "contact@example.com",
    "status": "active",
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T10:00:00Z"
  }
}
```

---

## 相關文檔

- [API 標準規範](../../API設計/00-API標準規範.md)
- [程式碼命名](./程式碼命名.md)
- [資料庫命名](./資料庫命名.md)

---

**最後更新：** 2025年10月27日


