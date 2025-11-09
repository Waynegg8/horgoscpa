# Vue 3 + Ant Design Vue + Pinia + Vue Router 基礎設施架構文檔

## 概述

本文檔提供了統一的 Vue 3 項目基礎設施架構，綜合了所有頁面分析報告中的 API、工具函數和狀態管理建議，消除了重複並建立了統一的結構。

## 文檔結構

1. **[package.json](./01-package.json.md)** - 項目依賴配置
2. **[main.js](./02-main.js.md)** - 項目入口文件
3. **[router](./03-router.md)** - 路由配置
4. **[api-structure](./04-api-structure.md)** - API 層結構和函數列表
5. **[utils](./05-utils.md)** - 工具函數庫
6. **[stores](./06-stores.md)** - 狀態管理結構

## 核心原則

### 1. 統一性
- 所有 API 請求通過統一的 `request.js` 封裝
- 所有錯誤處理統一在 API 層處理
- 所有狀態管理使用 Pinia，遵循相同的模式

### 2. 可重用性
- API 函數可以在多個組件中重用
- 工具函數可以在整個項目中重用
- Store 可以在多個組件中共享狀態

### 3. 可維護性
- 清晰的檔案結構
- 統一的命名規範
- 完整的錯誤處理

### 4. 可擴展性
- 易於添加新的 API 端點
- 易於添加新的工具函數
- 易於添加新的 Store

## 項目結構

```
src/
├── api/                   # API 層
│   ├── auth.js
│   ├── clients.js
│   ├── tasks.js
│   ├── ...
│   └── request.js         # API 請求封裝
├── stores/                # 狀態管理
│   ├── auth.js
│   ├── clients.js
│   ├── tasks.js
│   └── ...
├── utils/                 # 工具函數
│   ├── formatters.js
│   ├── date.js
│   ├── validation.js
│   └── ...
├── views/                 # 頁面組件
│   ├── Login.vue
│   ├── Dashboard.vue
│   ├── clients/
│   ├── tasks/
│   └── ...
├── components/            # 共用組件
├── router/                # 路由配置
│   └── index.js
├── assets/                # 靜態資源
└── main.js                # 項目入口
```

## 使用指南

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置 API

編輯 `src/api/request.js` 配置 API 基礎路徑和攔截器。

### 3. 使用 Store

```javascript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
await authStore.login(username, password)
```

### 4. 使用 API

```javascript
import { useClientApi } from '@/api/clients'

const clientApi = useClientApi()
const clients = await clientApi.fetchClients()
```

### 5. 使用工具函數

```javascript
import { formatCurrency, formatDate } from '@/utils/formatters'

const amount = formatCurrency(1000)
const date = formatDate('2024-01-01')
```

## API 層說明

### 消除重複的 API

經過綜合分析，以下 API 函數在多個報告中重複出現，已統一合併：

1. **fetchCurrentUser / checkSession**: 統一為 `auth.js` 中的 `checkSession()`
2. **fetchUsers / fetchAllUsers**: 統一為 `users.js` 中的 `fetchUsers()` 和 `fetchAllUsers()`
3. **fetchClients**: 統一為 `clients.js` 中的 `fetchClients()`
4. **fetchAllSOPs**: 統一為 `sop.js` 中的 `fetchAllSOPs()`
5. **fetchAllTags / fetchTags**: 統一為 `tags.js` 中的 `fetchTags()` 和 `fetchAllTags()`
6. **fetchServices / fetchAllServices**: 統一為 `services.js` 中的 `fetchServices()` 和 `fetchAllServices()`
7. **fetchServiceItems**: 統一為 `services.js` 中的 `fetchServiceItems()`
8. **fetchTaskTemplates**: 統一為 `task-templates.js` 中的 `fetchTaskTemplates()`
9. **fetchHolidays**: 統一為 `holidays.js` 中的 `fetchHolidays()`

### API 檔案組織原則

1. **按業務領域劃分**: 每個業務領域對應一個 API 檔案
2. **避免循環依賴**: API 檔案之間不應該相互依賴
3. **統一錯誤處理**: 所有 API 請求都通過 `request.js` 統一處理錯誤

## 工具函數說明

### 消除重複的工具函數

經過綜合分析，以下工具函數在多個報告中重複出現，已統一合併：

1. **formatCurrency / fmtTwd**: 統一為 `formatters.js` 中的 `formatCurrency()`
2. **formatDate / formatDateTime**: 統一為 `formatters.js` 和 `date.js` 中的格式化函數
3. **formatNumber / fmtNum**: 統一為 `formatters.js` 中的 `formatNumber()`
4. **formatPercentage / fmtPct**: 統一為 `formatters.js` 中的 `formatPercentage()`
5. **getCurrentYm / getCurrentMonth**: 統一為 `date.js` 中的 `getCurrentYm()`
6. **addMonth**: 統一為 `date.js` 中的 `addMonth()`

### 工具函數組織原則

1. **按功能劃分**: 相關的工具函數放在同一個檔案中
2. **純函數**: 工具函數應該是純函數，不應該有副作用
3. **可測試**: 工具函數應該易於測試

## 狀態管理說明

### Store 組織原則

1. **按業務領域劃分**: 每個業務領域對應一個 Store
2. **統一的狀態結構**: 所有 Store 都應該有 `loading`、`error` 狀態
3. **統一的 Action 模式**: 所有異步操作都應該在 Actions 中處理

### Store 使用原則

1. **在組件中使用**: 使用 `useStore()` 在組件中訪問 Store
2. **在 Composables 中使用**: 可以在 Composables 中使用 Store
3. **避免直接修改 State**: 應該通過 Actions 修改 State

## 路由說明

### 路由結構

1. **認證路由**: `/login` - 不需要認證
2. **受保護路由**: 所有其他路由都需要認證
3. **管理員路由**: 某些路由需要管理員權限
4. **嵌套路由**: 客戶詳情、薪資管理等使用嵌套路由

### 路由守衛

1. **認證檢查**: 檢查用戶是否已登入
2. **權限檢查**: 檢查用戶是否有權限訪問路由
3. **自動重定向**: 已登入用戶訪問登入頁時重定向到首頁

## 下一步

1. **實現 API 層**: 根據文檔實現所有 API 函數
2. **實現工具函數**: 根據文檔實現所有工具函數
3. **實現 Store**: 根據文檔實現所有 Store
4. **實現路由**: 根據文檔配置所有路由
5. **實現組件**: 根據分析報告實現各個頁面組件

## 注意事項

1. **向後兼容**: 在重構過程中，確保現有功能不受影響
2. **錯誤處理**: 統一處理所有錯誤情況
3. **性能優化**: 注意 API 請求的緩存和優化
4. **類型安全**: 如果使用 TypeScript，應該定義所有類型

## 參考資料

- [Vue 3 文檔](https://vuejs.org/)
- [Vue Router 文檔](https://router.vuejs.org/)
- [Pinia 文檔](https://pinia.vuejs.org/)
- [Ant Design Vue 文檔](https://antdv.com/)

