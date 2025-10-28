# API 共用規範

**所有 API 的統一標準** | 響應格式、錯誤處理、認證

---

## 📋 目錄
- [統一響應格式](#統一響應格式)
- [統一錯誤處理](#統一錯誤處理)
- [認證與權限](#認證與權限)
- [分頁規範](#分頁規範)
- [日期時間格式](#日期時間格式)
- [HTTP 狀態碼](#http-狀態碼)
- [請求驗證](#請求驗證)

---

## 統一響應格式

### 成功響應
**所有成功的 API 響應必須遵循此格式：**

```json
{
  "success": true,
  "data": { ... }
}
```

**欄位說明：**
- `success`: 固定為 `true`
- `data`: 實際的響應數據（object 或 array）

### 成功響應範例

#### 單一資源
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "紜蓁",
    "email": "user@example.com"
  }
}
```

#### 資源列表
```json
{
  "success": true,
  "data": [
    { "user_id": 1, "name": "紜蓁" },
    { "user_id": 2, "name": "曉明" }
  ]
}
```

#### 帶分頁的列表
```json
{
  "success": true,
  "data": [
    { "client_id": "12345678", "company_name": "測試公司" }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### 操作成功訊息
```json
{
  "success": true,
  "data": {
    "message": "客戶新增成功",
    "client_id": "12345678"
  }
}
```

---

## 統一錯誤處理

### 錯誤響應格式
**所有錯誤響應必須遵循此格式：**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}
```

**欄位說明：**
- `success`: 固定為 `false`
- `error.code`: 錯誤碼（大寫英文 + 底線）
- `error.message`: 人類可讀的錯誤訊息（繁體中文）

### 錯誤響應範例

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

## 統一錯誤碼表

### 通用錯誤碼（適用所有 API）

| HTTP | 錯誤碼 | 訊息 | 說明 |
|------|--------|------|------|
| 400 | `INVALID_REQUEST` | 請求格式錯誤 | Body 不是有效 JSON |
| 400 | `MISSING_REQUIRED_FIELD` | 缺少必填欄位 | 未提供必填欄位 |
| 401 | `UNAUTHORIZED` | 請先登入 | Token 過期或無效 |
| 403 | `FORBIDDEN` | 您沒有權限執行此操作 | 權限不足 |
| 404 | `RESOURCE_NOT_FOUND` | 資源不存在 | 找不到指定資源 |
| 409 | `RESOURCE_CONFLICT` | 資源衝突 | 唯一性約束衝突 |
| 422 | `VALIDATION_ERROR` | 驗證錯誤 | 欄位格式錯誤 |
| 500 | `INTERNAL_ERROR` | 伺服器內部錯誤 | 系統錯誤 |
| 500 | `DATABASE_ERROR` | 資料庫錯誤 | SQL 執行失敗 |

### 特定業務錯誤碼
各模塊可定義自己的錯誤碼，但必須：
- 使用 `模塊前綴_具體錯誤` 格式
- 在模塊 API 文檔中明確說明

**範例：**
```
CLIENT_NOT_FOUND          - 客戶不存在
DUPLICATE_CLIENT_ID       - 統一編號已存在
TASK_NOT_FOUND           - 任務不存在
INSUFFICIENT_LEAVE_BALANCE - 假期餘額不足
```

---

## 認證與權限

### 認證方式
**使用 JWT + HttpOnly Cookie：**

1. 登入成功後，後端設置 HttpOnly Cookie
2. 前端自動在每個請求中攜帶 Cookie
3. 後端驗證 Cookie 中的 JWT Token

**設置 Cookie 範例：**
```javascript
c.cookie('auth_token', jwtToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  maxAge: 86400 // 24 小時
});
```

### 權限檢查
**所有需要認證的 API 必須：**

1. 使用 `authMiddleware` 驗證登入狀態
2. 使用 `checkPermission()` 驗證模塊權限（若需要）

**範例：**
```javascript
// 需要登入
app.get('/api/v1/dashboard', authMiddleware, async (c) => {
  // ...
});

// 需要登入 + 特定權限
app.post('/api/v1/clients', 
  authMiddleware, 
  checkPermission('client_management'), 
  async (c) => {
    // ...
  }
);

// 需要登入 + 管理員
app.post('/api/v1/users', 
  authMiddleware, 
  requireAdmin, 
  async (c) => {
    // ...
  }
);
```

### 權限檢查邏輯
```javascript
// 從 Context 中獲取用戶資訊
const user = c.get('user');
const userId = user.user_id;
const isAdmin = user.is_admin;

// 管理員檢查
if (!isAdmin) {
  return c.json(
    errorResponse('FORBIDDEN', '您沒有權限執行此操作'), 
    403
  );
}

// 模塊權限檢查
const hasPermission = await checkModulePermission(userId, 'client_management');
if (!hasPermission) {
  return c.json(
    errorResponse('INSUFFICIENT_PERMISSIONS', '模塊權限未開啟'), 
    403
  );
}
```

---

## 分頁規範

### 查詢參數
**所有列表 API 必須支持以下分頁參數：**

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|-----|------|------|--------|------|
| `limit` | integer | ❌ | 50 | 每頁筆數（最大 100）|
| `offset` | integer | ❌ | 0 | 偏移量（從 0 開始）|

### 響應格式
**帶分頁的響應必須包含 `pagination` 物件：**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**欄位說明：**
- `total`: 總筆數
- `limit`: 每頁筆數
- `offset`: 當前偏移量
- `has_more`: 是否還有更多數據

### 實現範例
```javascript
app.get('/api/v1/clients', authMiddleware, async (c) => {
  const { limit = 50, offset = 0 } = c.req.query();
  
  // 限制 limit 最大值
  const safeLimit = Math.min(parseInt(limit), 100);
  const safeOffset = parseInt(offset) || 0;
  
  // 查詢總數
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM Clients WHERE is_deleted = 0'
  ).first();
  
  // 查詢數據
  const clients = await c.env.DB.prepare(
    'SELECT * FROM Clients WHERE is_deleted = 0 LIMIT ? OFFSET ?'
  ).bind(safeLimit, safeOffset).all();
  
  return c.json({
    success: true,
    data: clients.results,
    pagination: {
      total: countResult.total,
      limit: safeLimit,
      offset: safeOffset,
      has_more: (safeOffset + safeLimit) < countResult.total
    }
  });
});
```

---

## 日期時間格式

### 標準格式
**所有日期時間必須使用 ISO 8601 格式：**

| 類型 | 格式 | 範例 | 說明 |
|-----|------|------|------|
| 日期時間 | `YYYY-MM-DDTHH:mm:ssZ` | `2025-10-27T14:30:00Z` | UTC 時間 |
| 日期 | `YYYY-MM-DD` | `2025-10-27` | 僅日期 |
| 時間 | `HH:mm:ss` | `14:30:00` | 僅時間 |

### 資料庫儲存
```sql
-- 使用 DATETIME 類型
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- 使用 DATE 類型（僅日期）
log_date DATE NOT NULL
```

### 時區處理
- **資料庫**：統一存儲 UTC 時間
- **API 響應**：返回 UTC 時間（ISO 8601 格式）
- **前端顯示**：轉換為本地時區

**前端轉換範例：**
```javascript
// API 返回 UTC 時間
const utcTime = "2025-10-27T14:30:00Z";

// 轉換為本地時間顯示
const localTime = new Date(utcTime).toLocaleString('zh-TW');
// 輸出: "2025/10/27 下午10:30:00"（假設 UTC+8）
```

---

## HTTP 狀態碼

### 標準狀態碼使用

| 狀態碼 | 名稱 | 使用場景 |
|--------|------|---------|
| 200 | OK | 查詢、更新、刪除成功 |
| 201 | Created | 新增資源成功 |
| 400 | Bad Request | 請求格式錯誤、業務邏輯錯誤 |
| 401 | Unauthorized | 未登入、Token 無效 |
| 403 | Forbidden | 已登入但無權限 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突（如唯一性約束）|
| 422 | Unprocessable Entity | 驗證錯誤 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

### 選擇狀態碼的原則

```
是否成功？
├─ 是 → 200 或 201
│   ├─ 新增資源 → 201
│   └─ 其他操作 → 200
│
└─ 否 → 4xx 或 5xx
    ├─ 客戶端錯誤 → 4xx
    │   ├─ 未登入 → 401
    │   ├─ 無權限 → 403
    │   ├─ 資源不存在 → 404
    │   ├─ 資源衝突 → 409
    │   └─ 驗證錯誤 → 422
    │
    └─ 伺服器錯誤 → 5xx
        └─ 系統錯誤 → 500
```

---

## 請求驗證

### 必填欄位驗證
```javascript
function validateRequired(data, requiredFields) {
  for (const field of requiredFields) {
    if (!data[field]) {
      return {
        valid: false,
        error: `${field} 為必填欄位`
      };
    }
  }
  return { valid: true };
}

// 使用範例
const validation = validateRequired(input, ['client_id', 'company_name']);
if (!validation.valid) {
  return c.json(
    errorResponse('MISSING_REQUIRED_FIELD', validation.error), 
    422
  );
}
```

### 格式驗證
```javascript
// Email 驗證
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 台灣統一編號驗證（8 位數字）
function isValidClientId(clientId) {
  return /^\d{8}$/.test(clientId);
}

// 台灣電話號碼驗證
function isValidPhone(phone) {
  return /^0\d{1,2}-?\d{7,8}$/.test(phone);
}

// 使用範例
if (input.email && !isValidEmail(input.email)) {
  return c.json(
    errorResponse('INVALID_EMAIL_FORMAT', 'Email 格式錯誤'), 
    422
  );
}
```

### 數值範圍驗證
```javascript
// 工時驗證（0-24 小時）
if (input.hours < 0 || input.hours > 24) {
  return c.json(
    errorResponse('HOURS_EXCEED_LIMIT', '工時必須在 0-24 之間'), 
    422
  );
}

// 分頁參數驗證
const limit = Math.min(Math.max(parseInt(input.limit) || 50, 1), 100);
const offset = Math.max(parseInt(input.offset) || 0, 0);
```

---

## 統一工具函式

### 成功響應函式
```javascript
function successResponse(data, extra = {}) {
  return {
    success: true,
    data,
    ...extra
  };
}

// 使用範例
return c.json(successResponse({ user_id: 1, name: '紜蓁' }));
return c.json(successResponse(clients, { pagination }), 200);
return c.json(successResponse({ message: '新增成功' }), 201);
```

### 錯誤響應函式
```javascript
function errorResponse(code, message) {
  return {
    success: false,
    error: { code, message }
  };
}

// 使用範例
return c.json(errorResponse('UNAUTHORIZED', '請先登入'), 401);
return c.json(errorResponse('CLIENT_NOT_FOUND', '客戶不存在'), 404);
```

### 分頁工具函式
```javascript
function buildPagination(total, limit, offset) {
  return {
    total,
    limit,
    offset,
    has_more: (offset + limit) < total
  };
}

// 使用範例
const pagination = buildPagination(150, 50, 0);
return c.json(successResponse(data, { pagination }));
```

---

## 範例：完整的 API 實現

```javascript
import { Hono } from 'hono';

const app = new Hono();

// 工具函式
function successResponse(data, extra = {}) {
  return { success: true, data, ...extra };
}

function errorResponse(code, message) {
  return { success: false, error: { code, message } };
}

// 中介軟體
const authMiddleware = async (c, next) => {
  const token = c.req.cookie('auth_token');
  if (!token) {
    return c.json(errorResponse('UNAUTHORIZED', '請先登入'), 401);
  }
  // 驗證 Token
  const user = await verifyToken(token);
  if (!user) {
    return c.json(errorResponse('UNAUTHORIZED', '請先登入'), 401);
  }
  c.set('user', user);
  await next();
};

// API 端點
app.get('/api/v1/clients/:id', authMiddleware, async (c) => {
  const clientId = c.req.param('id');
  const user = c.get('user');
  
  // 查詢客戶
  const client = await c.env.DB.prepare(
    'SELECT * FROM Clients WHERE client_id = ? AND is_deleted = 0'
  ).bind(clientId).first();
  
  // 檢查是否存在
  if (!client) {
    return c.json(
      errorResponse('CLIENT_NOT_FOUND', '客戶不存在'), 
      404
    );
  }
  
  // 權限檢查（非管理員只能看自己負責的客戶）
  if (!user.is_admin && client.assignee_user_id !== user.user_id) {
    return c.json(
      errorResponse('FORBIDDEN', '您沒有權限查看此客戶'), 
      403
    );
  }
  
  // 返回成功
  return c.json(successResponse(client), 200);
});

export default app;
```

---

## 📝 檢查清單

### API 實現檢查清單
在實現任何 API 前，請確認：

- [ ] 使用統一的成功響應格式 `{ success: true, data: ... }`
- [ ] 使用統一的錯誤響應格式 `{ success: false, error: { code, message } }`
- [ ] 正確使用 HTTP 狀態碼（200, 201, 400, 401, 403, 404, 409, 422, 500）
- [ ] 實現認證中介軟體（需要登入的 API）
- [ ] 實現權限檢查（需要特定權限的 API）
- [ ] 支持分頁參數（列表 API）
- [ ] 返回分頁資訊（列表 API）
- [ ] 使用 ISO 8601 日期時間格式
- [ ] 驗證必填欄位
- [ ] 驗證欄位格式
- [ ] 處理所有可能的錯誤情況
- [ ] 返回清晰的中文錯誤訊息

---

## 🔗 相關文檔

- **[API 速查表](../快速參考/API速查表.md)** - 所有 API 端點一覽
- **[錯誤碼速查表](../快速參考/錯誤碼速查表.md)** - 所有錯誤碼說明
- **[認證 API](./認證API.md)** - 登入、登出、驗證
- **[後端開發規範](../開發規範/後端開發規範.md)** - 後端編碼標準

---

**最後更新：** 2025年10月27日  
**適用範圍：** 所有 API 端點

