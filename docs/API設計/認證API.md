# 認證 API 設計

**API 前綴：** `/api/v1/auth`  
**最後更新：** 2025年10月27日

---

## 端點列表

### 登入

```
POST /api/v1/auth/login
```

**權限：** 無需認證（公開端點）

**請求：**
```json
{
  "username": "yunzhen@firm.com",
  "password": "SecurePassword123"
}
```

**成功回應（200）：**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 2,
      "name": "紜蓁",
      "username": "yunzhen@firm.com",
      "is_admin": false,
      "gender": "female"
    },
    "permissions": {
      "dashboard": true,
      "timesheet": true,
      "tasks": true,
      "leave": true,
      "sop": false,
      "knowledge": false,
      "clients": false,
      "cms": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**錯誤回應：**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "帳號或密碼錯誤"
  }
}
```
**HTTP 狀態碼：** 401

---

### 後端實現邏輯

```typescript
// routes/auth.routes.ts

import argon2 from 'argon2';

app.post('/api/v1/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  
  // 1. 查詢使用者
  const user = await c.env.DB.prepare(
    'SELECT * FROM Users WHERE username = ?'
  ).bind(username).first();
  
  if (!user) {
    return c.json(errorResponse('INVALID_CREDENTIALS', '帳號或密碼錯誤'), 401);
  }
  
  // 2. 驗證密碼（使用 Argon2）
  const valid = await argon2.verify(user.hashed_password, password);
  
  if (!valid) {
    return c.json(errorResponse('INVALID_CREDENTIALS', '帳號或密碼錯誤'), 401);
  }
  
  // 3. 產生 JWT Token
  const token = await generateJWT({
    user_id: user.user_id,
    is_admin: user.is_admin
  }, c.env.JWT_SECRET);
  
  // 4. 設定 HttpOnly Cookie
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 86400  // 24小時
  });
  
  // 5. 獲取權限
  const permissions = await getPermissions(user.user_id, user.is_admin, c.env.DB);
  
  // 6. 返回使用者資料
  return c.json(successResponse({
    user: {
      user_id: user.user_id,
      name: user.name,
      username: user.username,
      is_admin: user.is_admin,
      gender: user.gender
    },
    permissions,
    token
  }));
});
```

---

### 登出

```
POST /api/v1/auth/logout
```

**權限：** 需登入

**回應：**
```json
{
  "success": true,
  "data": {
    "message": "已成功登出"
  }
}
```

**實現：**
```typescript
app.post('/api/v1/auth/logout', async (c) => {
  // 清除 Cookie
  deleteCookie(c, 'auth_token');
  
  return c.json(successResponse({ message: '已成功登出' }));
});
```

---

### 驗證當前會話

```
GET /api/v1/auth/me
```

**權限：** 需登入

**用途：** 前端頁面載入時驗證登入狀態

**回應：**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 2,
      "name": "紜蓁",
      "is_admin": false
    },
    "permissions": { ... }
  }
}
```

---

### 修改密碼

```
POST /api/v1/auth/change-password
```

**權限：** 需登入

**請求：**
```json
{
  "current_password": "OldPassword123",
  "new_password": "NewPassword456"
}
```

**驗證邏輯：**
```typescript
app.post('/api/v1/auth/change-password', authMiddleware, async (c) => {
  const { current_password, new_password } = await c.req.json();
  const userId = c.get('user').user_id;
  
  // 1. 獲取當前密碼
  const user = await c.env.DB.prepare(
    'SELECT hashed_password FROM Users WHERE user_id = ?'
  ).bind(userId).first();
  
  // 2. 驗證當前密碼
  const valid = await argon2.verify(user.hashed_password, current_password);
  
  if (!valid) {
    return c.json(errorResponse('INVALID_PASSWORD', '當前密碼錯誤'), 401);
  }
  
  // 3. 驗證新密碼強度（F002）
  if (new_password.length < 8) {
    return c.json(errorResponse('WEAK_PASSWORD', '密碼至少需要 8 個字元'), 422);
  }
  
  // 4. 雜湊新密碼
  const newHash = await argon2.hash(new_password);
  
  // 5. 更新資料庫
  await c.env.DB.prepare(
    'UPDATE Users SET hashed_password = ? WHERE user_id = ?'
  ).bind(newHash, userId).run();
  
  return c.json(successResponse({ message: '密碼已更新' }));
});
```

---

## 安全機制

### F001 - 密碼雜湊標準

**使用 Argon2id：**
```typescript
import argon2 from 'argon2';

// 雜湊密碼
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4
});

// 驗證密碼
const valid = await argon2.verify(hash, password);
```

---

### F007 - 登入失敗鎖定

**資料表修改：**
```sql
ALTER TABLE Users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE Users ADD COLUMN locked_until TEXT;
```

**邏輯：**
```typescript
// 登入失敗時
if (!valid) {
  await db.prepare(
    'UPDATE Users SET failed_login_attempts = failed_login_attempts + 1 WHERE user_id = ?'
  ).bind(user.user_id).run();
  
  // 如果失敗 5 次，鎖定 15 分鐘
  if (user.failed_login_attempts + 1 >= 5) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 15);
    
    await db.prepare(
      'UPDATE Users SET locked_until = ? WHERE user_id = ?'
    ).bind(lockUntil.toISOString(), user.user_id).run();
  }
}

// 登入成功時重置
await db.prepare(
  'UPDATE Users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?'
).bind(user.user_id).run();
```

---

### F008 - 雙因素驗證（可選）

**流程：**
```
1. POST /api/v1/auth/login
   ↓ (密碼正確，但啟用2FA)
   返回：{ "require_2fa": true, "temp_token": "..." }
   ↓
2. POST /api/v1/auth/verify-2fa
   Body: { "temp_token": "...", "otp": "123456" }
   ↓
   驗證 OTP 正確
   ↓
   返回完整登入資料 + 設定 Cookie
```

---

## JWT Token 設計

### Payload 結構

```typescript
interface JWTPayload {
  user_id: number;
  is_admin: boolean;
  iat: number;  // 發行時間
  exp: number;  // 過期時間
}
```

### 產生與驗證

```typescript
// utils/token.util.ts

import { sign, verify } from 'hono/jwt';

export async function generateJWT(payload: any, secret: string) {
  return await sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)  // 24小時
    },
    secret
  );
}

export async function verifyJWT(token: string, secret: string) {
  try {
    return await verify(token, secret);
  } catch {
    throw new Error('Invalid token');
  }
}
```

---

## 權限查詢邏輯

```typescript
// services/permission.service.ts

async function getPermissions(userId: number, isAdmin: boolean, db: D1Database) {
  // 管理員擁有所有權限
  if (isAdmin) {
    return {
      dashboard: true,
      timesheet: true,
      tasks: true,
      leave: true,
      sop: true,
      knowledge: true,
      clients: true,
      cms: true,
      settings: true
    };
  }
  
  // 員工從 SystemSettings 查詢
  const settings = await db.prepare(
    'SELECT key, value FROM SystemSettings WHERE key LIKE ?'
  ).bind('module_visibility_%').all();
  
  const permissions = {};
  for (const setting of settings.results) {
    const moduleName = setting.key.replace('module_visibility_', '');
    permissions[moduleName] = setting.value === 'true';
  }
  
  permissions.settings = false;  // 員工永遠不能存取設定
  
  return permissions;
}
```

---

**相關文檔：**
- [權限系統設計](../權限系統設計.md)
- [開發規範](../開發規範.md) - 密碼雜湊標準

