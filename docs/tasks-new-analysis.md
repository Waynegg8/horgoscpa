檔案： tasks-new.html

## 第一部分：可標準化的 UI 組件審計

| 原始元素 | 建議的 antdv 組件 | 備註 |
|---------|------------------|------|
| 表單容器 `<form id="taskForm">` | `<a-form>` | 使用 Ant Design Vue 的表單組件，支持驗證和布局 |
| 文字輸入框 `<input type="text">` | `<a-input>` | 標準文字輸入框 |
| 月份選擇器 `<input type="month">` | `<a-date-picker mode="month" />` | 使用日期選擇器的月份模式 |
| 日期選擇器 `<input type="date">` | `<a-date-picker />` | 標準日期選擇器 |
| 下拉選單 `<select>` | `<a-select>` | 支持搜索、遠程搜索等功能 |
| 文字區域 `<textarea>` | `<a-textarea>` | 多行文字輸入 |
| 主要按鈕 `<button type="submit" class="btn btn-primary">` | `<a-button type="primary">` | 主要操作按鈕 |
| 次要按鈕 `<button class="btn btn-secondary">` | `<a-button>` | 次要操作按鈕 |
| 圖標按鈕（上移、下移、刪除） | `<a-button type="text" :icon="h(UpOutlined)" />` | 使用 Ant Design Vue 的圖標按鈕 |
| 添加任務按鈕（虛線邊框） | `<a-button type="dashed">` | 使用 dashed 類型的按鈕 |
| SOP 選擇按鈕 | `<a-button>` | 標準按鈕，可配合圖標使用 |
| 任務卡片容器 `.task-card` | `<a-card>` 或 `<a-card :bordered="true">` | 使用卡片組件包裹任務信息 |
| 表單分區標題 `.form-section-title` | `<a-divider orientation="left">` 或自定義標題區域 | 使用分隔線或自定義標題樣式 |
| 字段提示文字 `.field-hint` | `<a-form-item :help="hintText">` | 使用表單項的 help 屬性 |
| 警告提示框 `.alert-warning` | `<a-alert type="warning" />` | 使用警告類型的提示組件 |
| SOP 選擇彈窗 `#sopModal` | `<a-modal>` | 使用模態框組件，支持標題、底部操作等 |
| SOP 搜尋輸入框 | `<a-input-search />` | 使用搜索輸入框組件 |
| SOP 列表項（可選中的標籤） | `<a-checkbox-group>` + `<a-checkbox>` | 使用複選框組件 |
| 已選 SOP 標籤顯示 `.serviceSopTags` | `<a-tag :closable="true">` | 使用可關閉的標籤組件 |
| 表單操作區 `.form-actions` | `<a-space>` 包裹按鈕組 | 使用空間組件排列按鈕 |
| 頁面標題區域 | `<a-page-header>` | 使用頁面頭部組件，包含返回按鈕和標題 |
| 表單行布局 `.form-row-2col` | `<a-row :gutter="16">` + `<a-col :span="12">` | 使用柵格系統進行布局 |
| 表單字段容器 `.form-field` | `<a-form-item>` | 使用表單項組件，包含標籤、輸入框、驗證信息 |
| 必填標記 `<span class="required-mark">*</span>` | `<a-form-item>` 的 `required` 屬性 | 使用表單項的必填屬性 |
| 載入狀態 | `<a-spin>` | 在 API 請求時顯示載入狀態 |
| 空狀態提示（無 SOP 時） | `<a-empty />` | 使用空狀態組件 |

## 第二部分：頁面結構（子路由）拆分藍圖

### 父路由 (Parent) 外殼：
- **路由路徑**：`/internal/tasks/new`
- **頁面外殼內容**：
  - 頁面標題區域（返回按鈕 + "新增任務"標題）
  - 表單容器外殼
  - 表單操作按鈕區（取消、提交）

### 子路由 (Children) 拆分：
此頁面為單一表單頁面，不需要拆分為多個子路由，但建議拆分成以下 Vue 組件：

1. **TaskFormBasicInfo.vue**（基本資訊區塊）
   - 客戶選擇下拉選單
   - 服務類型選擇下拉選單
   - 相關的字段提示和驗證邏輯

2. **TaskFormServiceMonth.vue**（服務月份區塊）
   - 服務月份選擇器
   - 字段提示

3. **TaskFormServiceSOP.vue**（服務層級 SOP 區塊）
   - SOP 選擇按鈕
   - 已選 SOP 標籤顯示
   - SOP 選擇邏輯

4. **TaskList.vue**（任務列表區塊）
   - 任務卡片列表
   - 添加任務按鈕
   - 任務排序（上移、下移）
   - 任務刪除功能

5. **TaskCard.vue**（單個任務卡片組件）
   - 任務類型選擇
   - 負責人選擇
   - 到期日選擇
   - 備註輸入
   - 任務層級 SOP 選擇
   - 任務操作按鈕（上移、下移、刪除）

6. **SOPS selectorModal.vue**（SOP 選擇彈窗組件）
   - SOP 搜尋功能
   - SOP 列表顯示（複選框）
   - 確定、取消按鈕
   - 支持服務層級和任務層級兩種模式

### 組件層級結構：
```
TasksNewPage.vue (主頁面)
├── TaskFormBasicInfo.vue
├── TaskFormServiceMonth.vue
├── TaskFormServiceSOP.vue
├── TaskList.vue
│   └── TaskCard.vue (可重複)
│       └── SOPS selectorModal.vue (共用)
└── SOPS selectorModal.vue (共用)
```

## 第三部分：資料與邏輯 (API) 抽離建議

### 建議創建 `useTaskApi.js` 檔案，包含以下函數：

1. **loadClients()**
   - 當前位置：第 406-424 行
   - 抽離為：`async function fetchClients(params = {})`
   - 參數：`{ perPage: 100 }`
   - 返回：客戶列表數據

2. **loadServices()**
   - 當前位置：第 426-438 行
   - 抽離為：`async function fetchServices()`
   - 返回：服務類型列表

3. **loadServiceItems()**
   - 當前位置：第 440-453 行
   - 抽離為：`async function fetchServiceItems()`
   - 返回：服務子項目（任務類型）列表

4. **loadClientService()**
   - 當前位置：第 455-512 行
   - 抽離為：`async function fetchClientServices(clientId)`
   - 參數：`clientId`
   - 返回：客戶服務關係列表
   - 備註：此函數包含業務邏輯（查找或創建 client_service），建議拆分為：
     - `fetchClientServices(clientId)` - 獲取客戶服務列表
     - `createClientService(data)` - 創建客戶服務關係
     - `findOrCreateClientService(clientId, serviceId)` - 業務邏輯函數

5. **loadUsers()**
   - 當前位置：第 514-526 行
   - 抽離為：`async function fetchUsers()`
   - 返回：用戶列表

6. **loadSOPs()**
   - 當前位置：第 528-553 行
   - 抽離為：`async function fetchSOPs(params = {})`
   - 參數：`{ perPage: 200, category: null, scope: null }`
   - 返回：SOP 列表

7. **submitTasks()**
   - 當前位置：第 929-1087 行
   - 抽離為多個函數：
     - `async function createClientService(data)` - 創建客戶服務關係
     - `async function createTask(data)` - 創建單個任務
     - `async function associateTaskSOPs(taskId, sopIds)` - 關聯任務 SOP
     - `async function createTasksBatch(tasksData)` - 批量創建任務（業務邏輯函數）

### 建議創建 `useTaskForm.js` Composable，包含以下邏輯：

1. **表單狀態管理**
   - `clientId`, `serviceId`, `serviceMonth` 等表單字段
   - `tasks` 任務列表數組
   - `serviceLevelSOPIds` 服務層級 SOP IDs
   - `selectedSOPs` 任務層級 SOP IDs 映射

2. **表單驗證邏輯**
   - 客戶和服務類型必填驗證
   - 服務月份必填驗證
   - 任務列表非空驗證
   - 每個任務的必填字段驗證

3. **任務列表操作**
   - `addTask()` - 添加任務
   - `removeTask(taskId)` - 刪除任務
   - `moveTaskUp(taskId)` - 上移任務
   - `moveTaskDown(taskId)` - 下移任務
   - `updateTaskNumbers()` - 更新任務編號

4. **SOP 選擇邏輯**
   - `openSOPSelector(taskId, mode)` - 打開 SOP 選擇器
   - `confirmSOPSelection()` - 確認 SOP 選擇
   - `removeServiceSOP(sopId)` - 移除服務層級 SOP

5. **數據載入邏輯**
   - 使用 `onMounted` 初始化數據
   - 響應式更新任務類型選項（當服務類型改變時）

### API 檔案結構建議：

```javascript
// useTaskApi.js
export async function fetchClients(params) { ... }
export async function fetchServices() { ... }
export async function fetchServiceItems() { ... }
export async function fetchClientServices(clientId) { ... }
export async function createClientService(data) { ... }
export async function findOrCreateClientService(clientId, serviceId) { ... }
export async function fetchUsers() { ... }
export async function fetchSOPs(params) { ... }
export async function createTask(data) { ... }
export async function associateTaskSOPs(taskId, sopIds) { ... }
export async function createTasksBatch(tasksData) { ... }
```

```javascript
// useTaskForm.js
export function useTaskForm() {
  // 表單狀態
  const formState = reactive({ ... })
  
  // 表單驗證
  const validateForm = () => { ... }
  
  // 任務列表操作
  const addTask = () => { ... }
  const removeTask = (taskId) => { ... }
  // ... 其他函數
  
  return {
    formState,
    validateForm,
    addTask,
    removeTask,
    // ... 其他返回值
  }
}
```

## 第四部分：重構步驟總結

### 第一步：建立基礎結構和 API 層
1. 創建 `useTaskApi.js` 檔案，將所有 API 請求函數從原始 HTML 檔案中抽離出來
2. 創建 `useTaskForm.js` Composable，將表單狀態管理和業務邏輯抽離出來
3. 測試 API 函數是否能正常運作（可以先用簡單的測試頁面驗證）

### 第二步：替換基礎 UI 組件
1. 將表單容器替換為 `<a-form>`
2. 將所有輸入框替換為對應的 Ant Design Vue 組件（`<a-input>`, `<a-select>`, `<a-date-picker>` 等）
3. 將按鈕替換為 `<a-button>`
4. 將任務卡片替換為 `<a-card>`
5. 將 SOP 選擇彈窗替換為 `<a-modal>`
6. 將表單布局改為使用 `<a-row>` 和 `<a-col>`

### 第三步：拆分組件
1. 創建 `TaskFormBasicInfo.vue` 組件，包含基本資訊表單字段
2. 創建 `TaskFormServiceMonth.vue` 組件，包含服務月份選擇
3. 創建 `TaskFormServiceSOP.vue` 組件，包含服務層級 SOP 選擇
4. 創建 `TaskCard.vue` 組件，包含單個任務的表單字段
5. 創建 `TaskList.vue` 組件，包含任務列表和添加任務功能
6. 創建 `SOPS selectorModal.vue` 組件，包含 SOP 選擇彈窗

### 第四步：整合和優化
1. 在主頁面中整合所有子組件
2. 使用 `useTaskForm` Composable 管理表單狀態
3. 使用 `useTaskApi` 進行 API 調用
4. 添加表單驗證邏輯
5. 添加載入狀態和錯誤處理
6. 優化用戶體驗（例如：添加確認對話框、成功提示等）

### 第五步：測試和修復
1. 測試所有功能是否正常運作
2. 修復可能的 bug
3. 優化性能和用戶體驗
4. 確保與原有功能保持一致
