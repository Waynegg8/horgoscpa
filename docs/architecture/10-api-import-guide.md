# API 導入指南

## 獲取當前用戶的統一使用方式

### ✅ 正確方式

**在所有需要獲取當前用戶的檔案中，都應該從 `auth.js` 導入：**

```javascript
// 方式 1: 使用主要函數名
import { checkSession } from '@/api/auth'

// 方式 2: 使用別名（如果需要）
import { fetchCurrentUser } from '@/api/auth'
import { getCurrentUser } from '@/api/auth'
```

### ❌ 錯誤方式

**不要在以下檔案中定義自己的獲取當前用戶函數：**
- ❌ `timesheets.js` - 不要定義 `fetchCurrentUser()`
- ❌ `trips.js` - 不要定義 `getCurrentUser()`
- ❌ `payroll.js` - 不要定義 `checkAuth()`（用於獲取當前用戶）
- ❌ `settings.js` - 不要定義 `getMyProfile()`（用於獲取當前用戶）
- ❌ `dashboard.js` - 不要定義 `fetchCurrentUser()`
- ❌ 任何其他檔案

## 各檔案的正確導入方式

### 1. timesheets.js

```javascript
// ✅ 正確
import { checkSession } from '@/api/auth'
import request from '@/api/request'

export function useTimesheetApi() {
  // 獲取當前用戶
  const fetchCurrentUser = async () => {
    return await checkSession() // 從 auth.js 導入
  }
  
  // 其他 API 函數...
}
```

### 2. trips.js

```javascript
// ✅ 正確
import { checkSession } from '@/api/auth'
// 或使用別名
import { getCurrentUser } from '@/api/auth'
import request from '@/api/request'

export function useTripsApi() {
  // 獲取當前用戶
  const getCurrentUserInfo = async () => {
    return await checkSession() // 從 auth.js 導入
  }
  
  // 其他 API 函數...
}
```

### 3. payroll.js

```javascript
// ✅ 正確
import { checkSession, checkAdminPermission } from '@/api/auth'
import request from '@/api/request'

export function usePayrollApi() {
  // 權限檢查（內部調用 checkSession）
  const checkAuth = async () => {
    return await checkAdminPermission() // 從 auth.js 導入
  }
  
  // 或直接使用
  const ensureAdmin = async () => {
    const user = await checkSession()
    if (!user || !user.isAdmin) {
      throw new Error('沒有權限')
    }
    return user
  }
  
  // 其他 API 函數...
}
```

### 4. settings.js

```javascript
// ✅ 正確
import { checkSession } from '@/api/auth'
import request from '@/api/request'

export function useSettingsApi() {
  // 獲取當前用戶資料
  const getMyProfile = async () => {
    return await checkSession() // 從 auth.js 導入
  }
  
  // 其他 API 函數...
}
```

### 5. dashboard.js

```javascript
// ✅ 正確
import { checkSession } from '@/api/auth'
import request from '@/api/request'

export function useDashboardApi() {
  // 獲取當前用戶
  const fetchCurrentUser = async () => {
    return await checkSession() // 從 auth.js 導入
  }
  
  // 其他 API 函數...
}
```

## auth.js 的完整實現

```javascript
// src/api/auth.js
import request from './request'

/**
 * 檢查 Session / 獲取當前用戶（主要函數）
 * @returns {Promise<{ok: boolean, data: User}>}
 */
export async function checkSession() {
  try {
    const response = await request.get('/auth/me')
    return {
      ok: true,
      data: response.data
    }
  } catch (error) {
    if (error.response?.status === 401) {
      return {
        ok: false,
        data: null
      }
    }
    throw error
  }
}

// 別名，方便使用
export const fetchCurrentUser = checkSession
export const getCurrentUser = checkSession

/**
 * 登入
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ok: boolean, data?: User, message?: string}>}
 */
export async function login(username, password) {
  try {
    const response = await request.post('/auth/login', { username, password })
    return {
      ok: true,
      data: response.data
    }
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || '登入失敗'
    }
  }
}

/**
 * 登出
 * @returns {Promise<void>}
 */
export async function logout() {
  await request.post('/auth/logout')
}

/**
 * 修改密碼
 * @param {object} data
 * @param {string} data.current_password
 * @param {string} data.new_password
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
export async function changePassword(data) {
  try {
    await request.post('/auth/change-password', data)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || '修改密碼失敗'
    }
  }
}

/**
 * 檢查管理員權限
 * @returns {Promise<User>}
 * @throws {Error} 如果不是管理員
 */
export async function checkAdminPermission() {
  const result = await checkSession()
  if (!result.ok || !result.data) {
    throw new Error('未登入')
  }
  if (!result.data.isAdmin) {
    throw new Error('沒有權限')
  }
  return result.data
}

/**
 * 獲取重定向目標（工具函數）
 * @returns {string | null}
 */
export function getRedirectTarget() {
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  
  if (!redirect) return null
  
  // 驗證重定向路徑的安全性
  if (redirect.startsWith('/') || redirect.startsWith(window.location.origin)) {
    return redirect
  }
  
  return null
}
```

## 統一的好處

1. **單一數據源**: 所有獲取當前用戶的請求都通過同一個函數，確保數據一致性
2. **統一錯誤處理**: 所有獲取當前用戶的錯誤都在 `auth.js` 中統一處理
3. **避免重複請求**: 可以在 `auth.js` 中實現緩存機制，避免重複請求
4. **易於維護**: 如果 API 端點或數據結構改變，只需要在一個地方修改
5. **類型安全**: 如果使用 TypeScript，可以統一類型定義

## 遷移步驟

1. **確認 auth.js 中有 checkSession() 函數**
2. **從其他檔案中移除重複的函數定義**
3. **在其他檔案中添加導入語句**
4. **更新函數調用，改為使用導入的函數**
5. **測試所有功能，確保沒有破壞現有功能**

## 注意事項

1. **API 端點統一**: 確保所有獲取當前用戶的請求都使用同一個 API 端點（通常是 `GET /auth/me`）
2. **返回數據結構統一**: 確保所有獲取當前用戶的函數返回相同的數據結構
3. **錯誤處理統一**: 確保所有獲取當前用戶的錯誤都按照相同的方式處理
4. **緩存策略**: 考慮在 `auth.js` 中實現緩存機制，避免重複請求

