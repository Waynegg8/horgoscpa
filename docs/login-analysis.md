# 頁面分析報告

檔案： login.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 登入表單容器（`<form class="login__form">`，第27行） | `<a-form>`，使用 `:model`、`:rules`、`@submit` 處理表單驗證和提交 |
| 帳號輸入框（`<input id="username">`，第30行） | `<a-input>` 配合 `<a-form-item>`，使用 `v-model` 綁定、`pattern` 規則、`autocomplete="username"` |
| 密碼輸入框（`<input id="password">`，第35行） | `<a-input-password>` 配合 `<a-form-item>`，使用 `v-model` 綁定、`autocomplete="current-password"` |
| 提示文字（`<small class="login__hint-text">`，第31行） | `<a-form-item>` 的 `help` 屬性，或使用 `<a-typography-text type="secondary">` |
| 提交按鈕（`<button class="login__submit">`，第37行） | `<a-button type="primary" html-type="submit" :loading="loading">`，使用 `loading` 屬性顯示載入狀態 |
| 錯誤訊息顯示（`<p id="login-error" class="login__error">`，第38行） | `<a-alert type="error">` 或 `<a-form-item>` 的 `validate-status="error"` 和 `help` 屬性 |
| 底部提示文字（`<p class="login__hint">`，第39行） | `<a-typography-text type="secondary">` 或 `<a-alert type="info" :show-icon="false">` |
| 已登入提示卡片（`checkExistingSession` 函數中創建的動態元素，第313-349行） | `<a-card>` + `<a-alert type="success">`，使用 `@click` 處理點擊事件 |
| 狀態指示器（`createStatusIndicator` 函數，第230-260行） | `<a-badge>` 或 `<a-tag>`，或使用 `<a-alert>` 配合自定義樣式，顯示在右下角固定位置 |
| 背景圖案容器（`<div class="login__background">`，第18-20行） | 保持自定義樣式，或使用 `<a-layout>` 的 `style` 屬性設置背景 |
| 登入卡片容器（`<section class="login__card">`，第21行） | `<a-card>`，使用 `:bordered="false"`、自定義 `class` 和樣式 |
| Logo 和標題區域（`<div class="login__header">`，第22-26行） | 保持現有結構，使用 `<a-typography-title>` 和 `<a-typography-text>` 統一文字樣式 |
| 表單欄位容器（`<div class="login__field">`，第28-32行、第33-36行） | `<a-form-item>`，使用 `label`、`name`、`rules` 屬性，自動處理驗證和錯誤顯示 |
| 內聯樣式的使用（如第129-130行、第314-328行等動態設置的樣式） | 移除所有內聯樣式，改用 Ant Design Vue 的組件屬性和 CSS 類別，或使用 Vue 的 `:class` 綁定 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**Login 頁面外殼**應包含：
- 頁面背景和整體布局（第17-20行的背景圖案）
- 路由守衛邏輯（檢查是否已登入，已登入則重定向到 dashboard）
- 頁面初始化邏輯（預加載靜態資源、DNS 預連接、檢查緩存等，第500-506行）
- 統一的錯誤處理和加載狀態管理
- 預渲染系統的初始化（第204-210行、第213-227行）

### 子路由 (Children) 拆分：

**注意：登入頁面是一個單一功能的頁面，通常不需要拆分為子路由。但可以將功能拆分為可重用的 Vue 組件：**

1. **LoginForm 組件**（登入表單）
   - 位置：第27-40行的表單結構，第72-177行的表單提交邏輯
   - 功能區塊：
     - 帳號輸入框（包含格式驗證和輸入限制）
     - 密碼輸入框
     - 提交按鈕（包含載入狀態）
     - 錯誤訊息顯示
     - 表單驗證邏輯
   - 建議：獨立組件，可重用於其他需要登入功能的場景

2. **SessionCheck 組件**（檢查現有 Session）
   - 位置：`checkExistingSession` 函數（第296-356行）
   - 功能：檢查用戶是否已有有效 session，如有則顯示提示卡片
   - 建議：獨立組件，可在登入頁面掛載時自動檢查

3. **PreloadIndicator 組件**（預加載狀態指示器）
   - 位置：`createStatusIndicator` 和 `updateStatusIndicator` 函數（第230-290行）
   - 功能：顯示數據預加載的狀態（載入中、已完成等）
   - 建議：獨立組件，可在登入成功後顯示，用於提示用戶系統正在預加載數據

4. **PageOptimization 組件或 Composable**（頁面優化邏輯）
   - 位置：`pageLoadOptimization` 函數內的所有優化邏輯（第195-506行）
   - 功能區塊：
     - 檢查緩存數據（`checkCachedData`，第359-380行）
     - 預加載靜態資源（`preloadStaticResources`，第383-434行）
     - DNS 預連接（`setupDNSPrefetch`，第437-451行）
     - 預熱 API 連接（`warmupAPIConnection`，第454-467行）
     - 清理 localStorage（`prepareLocalStorage`，第470-498行）
   - 建議：抽離為 `usePageOptimization.js` composable，可在多個頁面重用

5. **LoginHeader 組件**（登入頁面標題區域）
   - 位置：第22-26行
   - 功能：顯示 Logo、公司名稱、副標題
   - 建議：獨立組件，便於維護和樣式統一

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useAuthApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`login(username, password)` 函數**
   - 位置：第98-103行的登入 API 調用
   - 功能：發送登入請求
   - 參數：
     - `username`: 用戶帳號
     - `password`: 用戶密碼
   - 返回：`Promise<{ ok: boolean, data?: User, message?: string, code?: string }>`
   - 錯誤處理：統一處理 `UNAUTHORIZED`、`ACCOUNT_LOCKED`、`429` 等錯誤碼
   - 建議使用 `useRequest` 或 axios 封裝，統一處理錯誤和加載狀態

2. **`checkSession()` 函數**
   - 位置：第301-304行、第460-464行的 `/auth/me` API 調用
   - 功能：檢查當前用戶是否有有效的 session
   - 返回：`Promise<{ ok: boolean, data?: User } | null>`
   - 建議：靜默處理 401 錯誤，不拋出異常

3. **`getRedirectTarget()` 函數**（工具函數）
   - 位置：第62-70行
   - 功能：從 URL 參數中獲取重定向目標，並驗證安全性
   - 參數：無（從 `location.href` 讀取）
   - 返回：`string | null`（安全的重定向路徑，或 null）
   - 建議：抽離到 `src/utils/url.js` 或保留在 `useAuthApi.js` 中

4. **`getApiBase()` 函數**（工具函數）
   - 位置：第90-91行（多次使用）
   - 功能：根據當前 hostname 判斷 API 基礎路徑
   - 返回：`string`（API 基礎路徑）
   - 建議：抽離到 `src/config/api.js` 或 `src/utils/api.js`，統一管理 API 配置

5. **預加載邏輯**（可選，抽離到 `src/composables/usePreload.js`）
   - `preloadCritical()`：預加載核心數據（P0/P1）
   - `preloadAll(options)`：預加載所有數據（P2/P3）
   - `prerenderAllPages(useCache)`：預渲染所有頁面
   - 位置：第126-167行、第204-227行
   - 建議：這些邏輯依賴於 `window.DataCache` 和 `window.Prerender`，需要先確認這些全局對象在 Vue 應用中的使用方式

6. **表單驗證規則**（抽離到 `src/utils/validation.js` 或直接在組件中定義）
   - 帳號格式驗證：`pattern: /^[a-zA-Z0-9_]+$/`
   - 帳號必填驗證
   - 密碼必填驗證
   - 位置：第78-89行的客戶端驗證邏輯
   - 建議：使用 Ant Design Vue 的 `a-form` 的 `rules` 屬性進行表單驗證

7. **輸入限制邏輯**（可抽離為 composable）
   - 帳號輸入限制（僅允許英文字母、數字和底線）
   - 位置：第180-189行
   - 建議：抽離為 `useInputRestriction.js` composable，或直接在組件中使用 `@input` 事件處理

8. **狀態管理**（建議使用 Pinia）
   - 創建 `stores/auth.js` store
   - 管理以下狀態：
     - `user`: 當前用戶信息
     - `isAuthenticated`: 是否已登入
     - `loading`: 登入載入狀態
     - `error`: 錯誤信息
   - 提供以下 actions：
     - `login(username, password)`: 執行登入
     - `logout()`: 執行登出
     - `checkSession()`: 檢查 session
     - `clearError()`: 清除錯誤信息

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立認證 API 服務層與配置管理**

在開始重構 UI 之前，首先應該將所有的數據請求邏輯從頁面中分離出來，並建立統一的配置管理。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useAuthApi.js`）來處理所有與認證相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如登入請求、檢查 session）都移動到這個檔案中，並且統一處理錯誤情況（例如帳號密碼錯誤、帳號鎖定、網絡錯誤等）。

2. **統一 API 配置管理**：將 API 基礎路徑的判斷邏輯（目前根據 hostname 判斷是生產環境還是開發環境）抽離到一個配置檔案中，這樣後續如果需要更改 API 地址，只需要在一個地方修改。

3. **建立認證狀態管理**：使用 Pinia 建立一個專門的 store 來管理用戶的登入狀態（例如當前用戶信息、是否已登入、登入載入狀態等），這樣可以讓登入狀態在多個組件之間共享，並且更容易追蹤狀態變化。

4. **抽離工具函數**：將一些通用的工具函數（例如獲取重定向目標、格式化錯誤訊息）從頁面中抽離出來，放在共用的工具檔案中，這樣其他頁面也可以重用這些函數。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯分離了。同時，統一的錯誤處理和狀態管理也會讓整個應用的用戶體驗更加一致。

