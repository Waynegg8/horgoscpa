# 認證 API

**模塊：** 認證系統  
**權限：** 公開 / 需登入  
**基礎路徑：** `/api/v1/auth`

---

## 📋 目錄
- [1. 登入](#1-登入)
- [2. 登出](#2-登出)
- [3. 驗證當前會話](#3-驗證當前會話)
- [4. 修改密碼](#4-修改密碼)
- [認證機制](#認證機制)
- [安全機制](#安全機制)

---

## 1. 登入

**端點：** `POST /api/v1/auth/login`  
**權限：** 公開

### 請求 Body
```json
{
  "username": "admin",
  "password": "Password123!"
}
```

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "username": "admin",
      "name": "紜蓁",
      "is_admin": true
    },
    "message": "登入成功"
  }
}
```

**同時設置 HttpOnly Cookie：**
```
Set-Cookie: auth_token=<JWT>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

### 錯誤回應

#### 帳密錯誤
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "帳號或密碼錯誤"
  }
}
```

#### 帳號鎖定
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "帳號已被鎖定，請15分鐘後再試"
  }
}
```

---

## 2. 登出

**端點：** `POST /api/v1/auth/logout`  
**權限：** 需登入

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

**同時清除 Cookie：**
```
Set-Cookie: auth_token=; Max-Age=0
```

---

## 3. 驗證當前會話

**端點：** `GET /api/v1/auth/me`  
**權限：** 需登入

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "admin",
    "name": "紜蓁",
    "is_admin": true,
    "email": "admin@example.com"
  }
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "請先登入"
  }
}
```

---

## 4. 修改密碼

**端點：** `POST /api/v1/auth/change-password`  
**權限：** 需登入

### 請求 Body
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "confirm_password": "NewPassword456!"
}
```

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "message": "密碼修改成功"
  }
}
```

### 錯誤回應

#### 原密碼錯誤
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENT_PASSWORD",
    "message": "原密碼錯誤"
  }
}
```

#### 密碼不匹配
```json
{
  "success": false,
  "error": {
    "code": "PASSWORD_MISMATCH",
    "message": "兩次輸入的密碼不一致"
  }
}
```

#### 密碼強度不足
```json
{
  "success": false,
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "密碼必須包含大小寫字母、數字，至少8個字元"
  }
}
```

---

## 認證機制

### JWT Token
- **類型：** HttpOnly Cookie
- **有效期限：** 24小時
- **自動續期：** 否（需重新登入）

### Cookie 設定
```javascript
{
  httpOnly: true,      // 防止 XSS 攻擊
  secure: true,        // 僅 HTTPS 傳輸
  sameSite: 'Strict',  // 防止 CSRF 攻擊
  maxAge: 86400        // 24小時（秒）
}
```

### JWT Payload 結構
```typescript
interface JWTPayload {
  user_id: number;     // 使用者ID
  username: string;    // 使用者名稱
  is_admin: boolean;   // 是否為管理員
  iat: number;         // 發行時間（Unix timestamp）
  exp: number;         // 過期時間（Unix timestamp）
}
```

### Token 驗證流程
```
1. 從 Cookie 中讀取 auth_token
2. 驗證 Token 簽名
3. 檢查 Token 是否過期
4. 從 Payload 中提取用戶資訊
5. 查詢資料庫確認用戶仍然有效
6. 將用戶資訊注入到 Context
```

---

## 安全機制

### 密碼雜湊
- **演算法：** Argon2id
- **參數：**
  - memoryCost: 65536 (64 MB)
  - timeCost: 3
  - parallelism: 4
- **鹽值：** 自動生成（16 bytes）

**實現範例：**
```javascript
import { hash, verify } from '@node-rs/argon2';

// 雜湊密碼
const hashedPassword = await hash(password, {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4
});

// 驗證密碼
const isValid = await verify(hashedPassword, password);
```

### 登入失敗鎖定
- **觸發條件：** 連續失敗 5 次
- **鎖定時間：** 15 分鐘
- **計數器重置：** 登入成功後

**實現邏輯：**
```javascript
// 檢查是否鎖定
if (user.login_attempts >= 5) {
  const lockUntil = new Date(user.last_failed_login);
  lockUntil.setMinutes(lockUntil.getMinutes() + 15);
  
  if (new Date() < lockUntil) {
    throw new ForbiddenError('帳號已被鎖定，請15分鐘後再試');
  }
  
  // 鎖定時間已過，重置計數器
  user.login_attempts = 0;
}

// 登入失敗
if (!isPasswordValid) {
  await db.prepare(`
    UPDATE Users 
    SET login_attempts = login_attempts + 1,
        last_failed_login = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run();
  
  throw new UnauthorizedError('帳號或密碼錯誤');
}

// 登入成功，重置計數器
await db.prepare(`
  UPDATE Users 
  SET login_attempts = 0,
      last_login = CURRENT_TIMESTAMP
  WHERE user_id = ?
`).bind(userId).run();
```

### 密碼強度規則
- **最小長度：** 8 個字元
- **必須包含：**
  - 至少一個大寫字母
  - 至少一個小寫字母
  - 至少一個數字
- **可選：** 特殊符號

**驗證函式：**
```javascript
function isStrongPassword(password) {
  if (password.length < 8) {
    return false;
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber;
}
```

---

## 錯誤碼總覽

| 錯誤碼 | HTTP | 說明 | 觸發場景 |
|--------|------|------|---------|
| `UNAUTHORIZED` | 401 | 未登入或Token過期 | Token 無效 |
| `INVALID_CREDENTIALS` | 401 | 帳號或密碼錯誤 | 登入失敗 |
| `ACCOUNT_LOCKED` | 403 | 帳號已被鎖定 | 連續失敗5次 |
| `WEAK_PASSWORD` | 422 | 密碼強度不足 | 密碼不符合規則 |
| `PASSWORD_MISMATCH` | 422 | 密碼不一致 | 確認密碼不匹配 |
| `INVALID_CURRENT_PASSWORD` | 401 | 原密碼錯誤 | 修改密碼時 |

---

## 業務邏輯

### 登入流程
```
1. 接收 username 和 password
2. 查詢用戶是否存在
3. 檢查帳號是否鎖定
4. 驗證密碼
5. 更新登入時間和重置失敗計數
6. 生成 JWT Token
7. 設置 HttpOnly Cookie
8. 返回用戶資訊
```

### 登出流程
```
1. 驗證當前登入狀態
2. 清除 HttpOnly Cookie
3. （可選）將 Token 加入黑名單
4. 返回成功訊息
```

### 修改密碼流程
```
1. 驗證當前登入狀態
2. 驗證原密碼
3. 驗證新密碼強度
4. 檢查新舊密碼不相同
5. 檢查兩次輸入的新密碼一致
6. 雜湊新密碼
7. 更新資料庫
8. 返回成功訊息
```

---

## 範例代碼

### 登入實現
```javascript
app.post('/api/v1/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  
  // 查詢用戶
  const user = await c.env.DB.prepare(
    'SELECT * FROM Users WHERE username = ? AND is_deleted = 0'
  ).bind(username).first();
  
  if (!user) {
    return c.json(
      errorResponse('INVALID_CREDENTIALS', '帳號或密碼錯誤'),
      401
    );
  }
  
  // 檢查鎖定
  if (user.login_attempts >= 5) {
    const lockUntil = new Date(user.last_failed_login);
    lockUntil.setMinutes(lockUntil.getMinutes() + 15);
    
    if (new Date() < lockUntil) {
      return c.json(
        errorResponse('ACCOUNT_LOCKED', '帳號已被鎖定，請15分鐘後再試'),
        403
      );
    }
  }
  
  // 驗證密碼
  const isValid = await verify(user.password_hash, password);
  if (!isValid) {
    // 增加失敗計數
    await c.env.DB.prepare(`
      UPDATE Users 
      SET login_attempts = login_attempts + 1,
          last_failed_login = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(user.user_id).run();
    
    return c.json(
      errorResponse('INVALID_CREDENTIALS', '帳號或密碼錯誤'),
      401
    );
  }
  
  // 重置失敗計數
  await c.env.DB.prepare(`
    UPDATE Users 
    SET login_attempts = 0,
        last_login = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(user.user_id).run();
  
  // 生成 Token
  const token = await createJWT({
    user_id: user.user_id,
    username: user.username,
    is_admin: user.is_admin
  }, c.env.JWT_SECRET);
  
  // 設置 Cookie
  c.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 86400
  });
  
  return c.json(successResponse({
    user: {
      user_id: user.user_id,
      username: user.username,
      name: user.name,
      is_admin: user.is_admin
    },
    message: '登入成功'
  }));
});
```

### 認證 Middleware
```javascript
const authMiddleware = async (c, next) => {
  const token = c.req.cookie('auth_token');
  
  if (!token) {
    return c.json(
      errorResponse('UNAUTHORIZED', '請先登入'),
      401
    );
  }
  
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    
    // 查詢用戶是否仍然有效
    const user = await c.env.DB.prepare(
      'SELECT * FROM Users WHERE user_id = ? AND is_deleted = 0'
    ).bind(payload.user_id).first();
    
    if (!user) {
      return c.json(
        errorResponse('UNAUTHORIZED', '請先登入'),
        401
      );
    }
    
    // 注入用戶資訊到 Context
    c.set('user', {
      user_id: user.user_id,
      username: user.username,
      name: user.name,
      is_admin: user.is_admin
    });
    
    await next();
  } catch (error) {
    return c.json(
      errorResponse('UNAUTHORIZED', '請先登入'),
      401
    );
  }
};
```

---

## 🔗 相關文檔

- **[API 共用規範](./API共用規範.md)** - 統一響應格式
- **[錯誤碼速查表](../快速參考/錯誤碼速查表.md)** - 所有錯誤碼
- **[Users 資料表](../資料庫設計/核心業務表.md#users)** - 用戶資料結構

---

**最後更新：** 2025年10月27日  
**API 端點數：** 4 個

---

## 📝 這個文檔合併了以下 5 個文檔：
1. _概覽.md
2. 登入.md
3. 登出.md
4. 驗證當前會話.md
5. 修改密碼.md

