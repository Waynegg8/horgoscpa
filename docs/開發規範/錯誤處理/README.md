# 錯誤處理規範

**最後更新：** 2025年10月27日

---

## 1. AppError 錯誤類別

```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## 2. 標準錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 | 範例 |
|----------|-------------|------|------|
| `VALIDATION_ERROR` | 400 | 請求參數驗證失敗 | 欄位格式不正確 |
| `UNAUTHORIZED` | 401 | 未登入或 Token 無效 | 請先登入 |
| `PERMISSION_DENIED` | 403 | 沒有權限執行此操作 | 無權限刪除客戶 |
| `NOT_FOUND` | 404 | 資源不存在 | 客戶不存在 |
| `CLIENT_EXISTS` | 409 | 資源已存在（衝突） | 客戶編號已存在 |
| `DATABASE_ERROR` | 500 | 資料庫操作失敗 | 查詢失敗 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 | 未預期的錯誤 |

---

## 3. 使用範例

### 3.1 Repository 層

```typescript
async findById(id: string): Promise<Client | null> {
  try {
    const result = await this.db
      .prepare('SELECT * FROM Clients WHERE client_id = ?')
      .bind(id)
      .first();
    
    return result as Client | null;
  } catch (error) {
    throw new AppError(
      'DATABASE_ERROR',
      '查詢客戶失敗',
      500,
      { clientId: id, originalError: error }
    );
  }
}
```

### 3.2 Service 層

```typescript
async getClient(clientId: string): Promise<Client> {
  const client = await this.clientRepo.findById(clientId);
  
  if (!client) {
    throw new AppError('NOT_FOUND', '客戶不存在', 404);
  }
  
  return client;
}

async createClient(data: CreateClientRequest): Promise<Client> {
  if (data.company_name.length < 2) {
    throw new AppError('VALIDATION_ERROR', '公司名稱至少需要2個字元', 400);
  }

  const existing = await this.clientRepo.findById(data.client_id);
  if (existing) {
    throw new AppError('CLIENT_EXISTS', '客戶已存在', 409);
  }

  return this.clientRepo.create(data);
}
```

### 3.3 全局錯誤處理

```typescript
// index.ts
app.onError((err, c) => {
  console.error('Error:', err);
  
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    }, err.statusCode);
  }
  
  if (err instanceof z.ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '請求參數驗證失敗',
        details: err.errors
      }
    }, 400);
  }
  
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '伺服器內部錯誤'
    }
  }, 500);
});
```

---

## 4. 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "客戶不存在",
    "details": {
      "clientId": "12345678"
    }
  }
}
```

---

## 5. 檢查清單

- [ ] 使用 AppError 類別
- [ ] 錯誤代碼標準化
- [ ] HTTP 狀態碼正確
- [ ] 全局錯誤處理設置
- [ ] 不洩露敏感資訊

---

**最後更新：** 2025年10月27日

