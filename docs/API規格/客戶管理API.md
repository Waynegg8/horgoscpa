# 客戶管理 API

**模塊：** 客戶管理  
**權限：** 管理員、會計師  
**基礎路徑：** `/api/v1/clients`

---

## 📋 目錄
- [1. 新增客戶](#1-新增客戶)
- [2. 查詢客戶列表](#2-查詢客戶列表)
- [3. 查詢客戶詳情](#3-查詢客戶詳情)
- [4. 更新客戶](#4-更新客戶)
- [5. 刪除客戶](#5-刪除客戶)
- [6. 標籤管理](#6-標籤管理)
- [共用規範](#共用規範)

---

## 1. 新增客戶

**端點：** `POST /api/v1/clients`  
**權限：** 管理員、會計師

### 請求 Body
```json
{
  "client_id": "86753078",
  "company_name": "冠群資訊股份有限公司",
  "assignee_user_id": 1,
  "phone": "04-1234-5678",
  "email": "contact@example.com",
  "tag_ids": [1, 2]
}
```

### 必填欄位
- `client_id` ✅（8位數字）
- `company_name` ✅
- `assignee_user_id` ✅

### 成功回應
**HTTP 狀態碼：** 201
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
見 [共用錯誤碼](#共用錯誤碼)

---

## 2. 查詢客戶列表

**端點：** `GET /api/v1/clients`  
**權限：** 所有員工

### 查詢參數
| 參數 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `company_name` | string | ❌ | 公司名稱（模糊搜尋）|
| `client_id` | string | ❌ | 統一編號（模糊搜尋）|
| `assignee_user_id` | integer | ❌ | 負責員工 ID |
| `tag_ids` | string | ❌ | 標籤 ID（逗號分隔）|
| `limit` | integer | ❌ | 每頁筆數（預設：50）|
| `offset` | integer | ❌ | 偏移量（預設：0）|

### 請求範例
```bash
GET /api/v1/clients?company_name=冠群&limit=20
```

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": [
    {
      "client_id": "86753078",
      "company_name": "冠群資訊股份有限公司",
      "assignee_name": "紜蓁",
      "phone": "04-1234-5678",
      "tags": ["VIP客戶", "長期合作"]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

### 權限說明
- **所有員工** 皆可查詢
- **非管理員** 只能看到自己負責的客戶（後端自動過濾）

---

## 3. 查詢客戶詳情

**端點：** `GET /api/v1/clients/:client_id`  
**權限：** 所有員工

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "client_id": "86753078",
    "company_name": "冠群資訊股份有限公司",
    "business_status": "營業中",
    "assignee_user_id": 1,
    "assignee_name": "紜蓁",
    "tags": [
      { "tag_id": 1, "tag_name": "VIP客戶" },
      { "tag_id": 2, "tag_name": "長期合作" }
    ],
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## 4. 更新客戶

**端點：** `PUT /api/v1/clients/:client_id`  
**權限：** 管理員、會計師

### 請求 Body
```json
{
  "company_name": "冠群資訊股份有限公司（已更名）",
  "phone": "04-9999-8888",
  "tag_ids": [1, 3]
}
```

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "message": "客戶更新成功"
  }
}
```

---

## 5. 刪除客戶

**端點：** `DELETE /api/v1/clients/:client_id`  
**權限：** 僅管理員

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "message": "客戶刪除成功"
  }
}
```

### 業務邏輯
- 軟刪除（`is_deleted = 1`）
- 不刪除實際資料
- 刪除後不影響歷史工時記錄

---

## 6. 標籤管理

### 6.1 新增標籤
**端點：** `POST /api/v1/clients/tags`

### 6.2 獲取所有標籤
**端點：** `GET /api/v1/clients/tags`

### 6.3 關聯標籤到客戶
**端點：** `POST /api/v1/clients/:client_id/tags`

---

## 共用規範

### 統一響應格式

#### 成功響應
```json
{
  "success": true,
  "data": { ... }
}
```

#### 錯誤響應
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}
```

### 共用錯誤碼

| HTTP | 錯誤碼 | 說明 | 觸發場景 |
|------|--------|------|---------|
| 400 | `INVALID_REQUEST` | 請求格式錯誤 | Body 不是 JSON |
| 401 | `UNAUTHORIZED` | 未登入 | Token 過期或無效 |
| 403 | `FORBIDDEN` | 無權限 | 非管理員嘗試刪除客戶 |
| 404 | `CLIENT_NOT_FOUND` | 客戶不存在 | client_id 不存在 |
| 409 | `DUPLICATE_CLIENT_ID` | 統一編號已存在 | 新增重複客戶 |
| 422 | `VALIDATION_ERROR` | 驗證錯誤 | 欄位格式錯誤 |
| 500 | `INTERNAL_ERROR` | 伺服器錯誤 | 資料庫錯誤 |

### 驗證規則

| 欄位 | 規則 |
|-----|------|
| `client_id` | 8位數字，唯一 |
| `company_name` | 1-100 字元，必填 |
| `email` | 符合 email 格式 |
| `phone` | 台灣電話格式 |

### 分頁規範
- `limit`：預設 50，最大 100
- `offset`：從 0 開始
- 響應包含 `pagination` 物件

---

## 業務邏輯

### CRUD 流程圖
```
新增客戶：
1. 驗證必填欄位
2. 檢查統一編號唯一性
3. 插入 Clients 表
4. 若有 tag_ids，插入 ClientTagAssignments
5. 返回成功訊息

查詢列表：
1. 驗證權限
2. 非管理員過濾：只顯示自己負責的客戶
3. 應用搜尋條件
4. 應用分頁
5. 返回結果

更新客戶：
1. 驗證客戶存在
2. 驗證權限
3. 更新 Clients 表
4. 若有 tag_ids，更新 ClientTagAssignments
5. 返回成功訊息

刪除客戶：
1. 驗證客戶存在
2. 驗證權限（僅管理員）
3. 軟刪除（is_deleted = 1）
4. 返回成功訊息
```

---

## 範例代碼

### 新增客戶
```typescript
app.post('/api/v1/clients', 
  authMiddleware, 
  checkPermission('client_management'), 
  async (c) => {
    const input = await c.req.json();
    const userId = c.get('user').user_id;
    
    // 驗證唯一性
    const existing = await c.env.DB.prepare(
      'SELECT client_id FROM Clients WHERE client_id = ?'
    ).bind(input.client_id).first();
    
    if (existing) {
      return c.json(
        errorResponse('DUPLICATE_CLIENT_ID', '統一編號已存在'), 
        409
      );
    }
    
    // 插入資料
    await c.env.DB.prepare(`
      INSERT INTO Clients (client_id, company_name, assignee_user_id)
      VALUES (?, ?, ?)
    `).bind(input.client_id, input.company_name, input.assignee_user_id).run();
    
    return c.json(successResponse({
      client_id: input.client_id,
      message: '客戶新增成功'
    }), 201);
  }
);
```

### 查詢列表（含權限過濾）
```typescript
app.get('/api/v1/clients', authMiddleware, async (c) => {
  const userId = c.get('user').user_id;
  const isAdmin = c.get('user').is_admin;
  const { company_name, limit = 50, offset = 0 } = c.req.query();
  
  let sql = `
    SELECT c.*, u.name as assignee_name
    FROM Clients c
    LEFT JOIN Users u ON c.assignee_user_id = u.user_id
    WHERE c.is_deleted = 0
  `;
  
  const params = [];
  
  // 非管理員只能看自己負責的
  if (!isAdmin) {
    sql += ' AND c.assignee_user_id = ?';
    params.push(userId);
  }
  
  if (company_name) {
    sql += ' AND c.company_name LIKE ?';
    params.push(`%${company_name}%`);
  }
  
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  const clients = await c.env.DB.prepare(sql).bind(...params).all();
  
  return c.json(successResponse(clients.results, { 
    total, 
    limit, 
    offset 
  }));
});
```

---

**文檔版本：** 2.0（合併版）  
**最後更新：** 2025年10月27日

---

## 📝 這個文檔合併了以下 8 個文檔：

✅ 原本的獨立文檔：
1. 新增客戶.md
2. 查詢客戶列表.md
3. 查詢客戶詳情.md
4. 更新客戶.md
5. 刪除客戶.md
6. 標籤管理.md
7. 標籤關聯.md
8. _概覽.md

✅ 合併後的優勢：
- 所有客戶相關 API 在同一個文檔
- 減少重複的錯誤碼和響應格式說明
- 更容易理解完整的業務流程
- 總行數：約 350 行（原本 8 個文檔共約 900 行）

