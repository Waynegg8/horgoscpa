# API 重複性檢查報告

## 檢查對象
- **功能**: 獲取當前登入用戶
- **相關函數**: `fetchCurrentUser`, `checkSession`, `getCurrentUser`, `checkAuth`, `getMyProfile`

## 檢查結果

### ❌ 發現重複：共 5 處重複

| # | 函數名 | 所在檔案 | API 端點 | 狀態 |
|---|--------|---------|---------|------|
| 1 | `checkSession() / fetchCurrentUser()` | `auth.js` | `GET /auth/me` | ✅ **正確位置** |
| 2 | `fetchCurrentUser()` | `timesheets.js` | `GET /auth/me` | ❌ **重複** |
| 3 | `getCurrentUser()` | `trips.js` | `GET /auth/me` | ❌ **重複** |
| 4 | `checkAuth()` | `payroll.js` | `GET /auth/me` | ❌ **重複** |
| 5 | `getMyProfile()` | `settings.js` | `GET /users/me` 或 `GET /auth/me` | ❌ **重複** |
| 6 | `fetchCurrentUser()` | `dashboard.js` (分析報告建議) | `GET /auth/me` | ❌ **重複** |
| 7 | `fetchCurrentUser()` | `profile-analysis.md` (分析報告建議) | `GET /auth/me` | ❌ **重複** |

## 問題分析

### 1. timesheets.js 中的重複
- **位置**: `docs/timesheets-analysis.md` 第 110 行
- **建議**: `fetchCurrentUser()` 函數
- **問題**: 此函數應該從 `auth.js` 導入，不應該在 `timesheets.js` 中定義
- **API 端點**: `GET /auth/me`

### 2. trips.js 中的重複
- **位置**: `docs/trips-analysis.md` 第 112 行
- **建議**: `getCurrentUser()` 函數
- **問題**: 此函數應該從 `auth.js` 導入，不應該在 `trips.js` 中定義
- **API 端點**: `GET /auth/me`

### 3. payroll.js 中的重複
- **位置**: `docs/payroll-analysis.md` 第 145 行
- **建議**: `checkAuth()` 函數
- **問題**: 此函數實際上也是獲取當前用戶（用於權限檢查），應該從 `auth.js` 導入
- **API 端點**: `GET /auth/me`

### 4. settings.js 中的重複
- **位置**: `docs/settings-analysis.md` 第 161 行
- **建議**: `getMyProfile()` 函數
- **問題**: 此函數獲取當前用戶資料，應該統一使用 `auth.js` 中的 `checkSession()`
- **API 端點**: `GET /users/me` 或 `GET /auth/me`（需要確認實際端點）

### 5. dashboard.js 中的重複
- **位置**: `docs/dashboard-analysis.md` 第 128 行
- **建議**: `fetchCurrentUser()` 函數
- **問題**: 分析報告中建議，但應該從 `auth.js` 導入

### 6. profile-analysis.md 中的重複
- **位置**: `docs/profile-analysis.md` 第 83 行
- **建議**: `fetchCurrentUser()` 函數
- **問題**: 分析報告中建議，但應該從 `auth.js` 導入

## 修正方案

### 統一函數定義

**在 `auth.js` 中定義**:
```javascript
// auth.js
export function checkSession() {
  // 檢查 Session / 獲取當前用戶
  // API 端點: GET /auth/me
}

// 別名，方便使用
export const fetchCurrentUser = checkSession
export const getCurrentUser = checkSession
```

### 移除重複定義

**從以下檔案中移除**:
1. ❌ `timesheets.js` - 移除 `fetchCurrentUser()`，改為從 `auth.js` 導入
2. ❌ `trips.js` - 移除 `getCurrentUser()`，改為從 `auth.js` 導入
3. ❌ `payroll.js` - 移除 `checkAuth()`，改為從 `auth.js` 導入 `checkSession()`
4. ❌ `settings.js` - 移除 `getMyProfile()`，改為從 `auth.js` 導入 `checkSession()`

### 更新導入方式

**在其他檔案中使用時**:
```javascript
// timesheets.js
import { checkSession } from '@/api/auth'

// trips.js
import { checkSession } from '@/api/auth'
// 或使用別名
import { getCurrentUser } from '@/api/auth'

// payroll.js
import { checkSession } from '@/api/auth'
// checkAuth 改為 checkSession

// settings.js
import { checkSession } from '@/api/auth'
// getMyProfile 改為 checkSession
```

## 驗收標準

✅ **驗收標準**: 獲取當前用戶的功能只應該出現在 `src/api/auth.js` 中一次

### 修正後的狀態

| # | 函數名 | 所在檔案 | 狀態 |
|---|--------|---------|------|
| 1 | `checkSession()` | `auth.js` | ✅ **唯一定義** |
| 2 | `fetchCurrentUser()` | `auth.js` (別名) | ✅ **別名導出** |
| 3 | `getCurrentUser()` | `auth.js` (別名) | ✅ **別名導出** |
| 4 | `timesheets.js` | 從 `auth.js` 導入 | ✅ **已修正** |
| 5 | `trips.js` | 從 `auth.js` 導入 | ✅ **已修正** |
| 6 | `payroll.js` | 從 `auth.js` 導入 | ✅ **已修正** |
| 7 | `settings.js` | 從 `auth.js` 導入 | ✅ **已修正** |

## 關於 `getMyProfile()` 的說明

`getMyProfile()` 函數可能有兩種情況：

1. **如果 API 端點是 `GET /auth/me`**: 
   - 應該統一使用 `checkSession()`，移除 `getMyProfile()`

2. **如果 API 端點是 `GET /users/me` 且返回的數據結構不同**:
   - 可以保留 `getMyProfile()`，但應該在 `auth.js` 中定義
   - 或者在 `users.js` 中定義，但內部調用 `checkSession()` 獲取用戶 ID，然後調用 `fetchUserDetail(userId)`

**建議**: 統一使用 `checkSession()`，因為它已經返回當前用戶的完整信息。

## 關於 `checkAuth()` 的說明

`checkAuth()` 函數在 `payroll.js` 中用於權限檢查，實際上也是獲取當前用戶來判斷是否為管理員。

**建議**: 統一使用 `checkSession()`，因為：
1. 它已經返回用戶信息（包含 `isAdmin` 屬性）
2. 避免重複的 API 請求
3. 保持一致性

如果需要權限檢查，可以在 `auth.js` 中提供一個輔助函數：
```javascript
// auth.js
export async function checkAdminPermission() {
  const user = await checkSession()
  if (!user || !user.isAdmin) {
    throw new Error('沒有權限')
  }
  return user
}
```

## 下一步行動

1. ✅ 更新 `04-api-structure.md`，移除重複的函數定義
2. ✅ 在 `auth.js` 中明確定義 `checkSession()` 為主要函數
3. ✅ 在其他檔案中添加導入說明
4. ✅ 更新相關的分析報告說明

