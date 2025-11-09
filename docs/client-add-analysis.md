# 頁面分析報告

檔案： `client-add.html`

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 行號範圍 | 建議的 antdv 組件 | 備註 |
|---------|---------|------------------|------|
| 客戶基本信息表單容器 | 70-163 | `<a-form>` + `<a-form-item>` | 替換 `<form>` 和手刻的 form-field |
| 公司名稱輸入框 | 76 | `<a-input>` | 替換 `<input type="text">` |
| 客戶編號輸入框 | 81 | `<a-input>` | 替換 `<input type="text">`，可加上 `maxlength="8"` |
| 統一編號輸入框 | 92 | `<a-input>` | 替換 `<input type="text">` |
| 產生個人客戶編號按鈕 | 100 | `<a-button>` | 替換 `<button type="button">` |
| 聯絡人輸入框 | 111, 115 | `<a-input>` | 替換 `<input type="text">` |
| 負責人員下拉選單 | 121 | `<a-select>` + `<a-select-option>` | 替換 `<select>` |
| 聯絡電話輸入框 | 128 | `<a-input>` | 替換 `<input type="text">` |
| Email 輸入框 | 135 | `<a-input type="email">` | 替換 `<input type="email">` |
| 標籤顯示區域 | 140-144 | `<a-tag>` 組合 | 替換手刻的標籤顯示 |
| 管理標籤按鈕 | 143 | `<a-button>` | 替換 `<button type="button">` |
| 客戶備註文字框 | 149 | `<a-textarea>` | 替換 `<textarea>` |
| 收款備註文字框 | 155 | `<a-textarea>` | 替換 `<textarea>` |
| 取消/新增客戶按鈕 | 159-160 | `<a-button>` | 替換 `<button>`，使用 `type="default"` 和 `type="primary"` |
| 客戶服務表格 | 172-189 | `<a-table>` | 替換手刻的 `<table class="services-table">` |
| 新增服務按鈕 | 169 | `<a-button type="primary">` | 替換 `<button>` |
| 服務狀態標籤 | 697 | `<a-tag>` | 替換手刻的 status-badge |
| 收費設定表格 | 206-224 | `<a-table>` | 替換手刻的 `<table class="billing-table">` |
| 收費服務篩選下拉選單 | 196 | `<a-select>` | 替換 `<select>` |
| 全選/全不選按鈕 | 199-200 | `<a-button>` | 替換 `<button>` |
| 批量刪除按鈕 | 201 | `<a-button type="primary" danger>` | 替換 `<button>`，加上 `disabled` 狀態 |
| 新增收費按鈕 | 202 | `<a-button type="primary">` | 替換 `<button>` |
| 收費表格複選框 | 209 | `<a-checkbox>` | 替換 `<input type="checkbox">` |
| 新增/編輯收費彈窗 | 231-361 | `<a-modal>` | 替換手刻的 `#billingModal` div |
| 收費類型單選按鈕組 | 249-264 | `<a-radio-group>` + `<a-radio-button>` | 替換手刻的 radio 輸入 |
| 按月收費表單 | 268-315 | `<a-form>` + `<a-form-item>` | 替換手刻的表單結構 |
| 每月金額輸入框 | 275 | `<a-input-number>` | 替換 `<input type="number">` |
| 付款期限輸入框 | 280 | `<a-input-number>` | 替換 `<input type="number">` |
| 月份範圍下拉選單 | 285 | `<a-select>` | 替換 `<select>` |
| 月份複選框組 | 292-314 | `<a-checkbox-group>` | 替換手刻的月份複選框 |
| 一次性收費表單 | 318-354 | `<a-form>` + `<a-form-item>` | 替換手刻的表單結構 |
| 項目名稱輸入框 | 325 | `<a-input>` | 替換 `<input type="text">` |
| 收費金額輸入框 | 331 | `<a-input-number>` | 替換 `<input type="number">` |
| 收費日期選擇器 | 339 | `<a-date-picker>` | 替換 `<input type="date">` |
| 標籤管理彈窗 | 364-420 | `<a-modal>` | 替換手刻的 `#tagsModal` div |
| 已選標籤顯示 | 373 | `<a-tag>` 組合 | 替換手刻的標籤顯示 |
| 所有標籤列表 | 410 | `<a-tag>` + 點擊事件 | 替換手刻的標籤按鈕 |
| 新增標籤表單 | 385-408 | `<a-form>` + `<a-form-item>` | 替換手刻的表單結構 |
| 標籤顏色選擇器 | 392 | `<a-select>` 或顏色選擇器組件 | 替換 `<select>` |
| 進度提示覆蓋層 | 48-64 | `<a-spin>` + `<a-progress>` | 替換手刻的進度覆蓋層 |
| 進度條 | 58 | `<a-progress>` | 替換手刻的進度條 |
| 錯誤提示文字 | 77, 82, 93 等 | `<a-form-item>` 的 `help` 屬性 | 替換 `.error-text` span |
| 服務組成部分配置區域 | 1755-1952 | `<a-collapse>` 或 `<a-card>` | 替換展開/收起的詳情區域 |
| 任務配置區域 | 1823-1853 | `<a-card>` | 替換手刻的配置區域 |
| 批量設置負責人下拉選單 | 1838 | `<a-select>` | 替換 `<select>` |
| 套用到所有任務按鈕 | 1842 | `<a-button>` | 替換 `<button>` |
| 任務列表 | 1850 | `<a-list>` 或自定義組件 | 替換手刻的任務列表 |
| SOP 搜索框 | 1865 | `<a-input>` 帶搜索圖標 | 替換 `<input type="text">` |
| SOP 列表 | 1871 | `<a-checkbox-group>` 或 `<a-tree-select>` | 替換手刻的 SOP 列表 |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：
- **路由路徑**：`/internal/clients/add`
- **組件名稱**：`ClientAddLayout.vue`
- **外殼包含**：
  - 頁面標題：「新增客戶」
  - 返回客戶列表按鈕
  - 進度提示覆蓋層（全局）
  - 頁面容器（`<a-layout-content>`）
  - Tab 切換導航（`<a-tabs>`）

### 子路由 (Children) 拆分：

| 子路由路徑 | 組件名稱 | 功能描述 | 對應原始區塊 |
|-----------|---------|---------|-------------|
| `/internal/clients/add/basic` | `ClientAddBasic.vue` | 客戶基本信息表單 | 70-163 行的表單 |
| `/internal/clients/add/services` | `ClientAddServices.vue` | 客戶服務管理 | 166-189 行的服務列表 |
| `/internal/clients/add/billing` | `ClientAddBilling.vue` | 收費設定 | 192-225 行的收費表格 |

### 建議的 Tab 結構：
使用 `<a-tabs>` 將三個主要功能區塊拆分為 Tab 頁：
1. **基本信息** Tab：包含客戶基本信息表單
2. **客戶服務** Tab：包含服務列表、服務配置、任務組件配置
3. **收費設定** Tab：包含收費列表、批量操作、收費編輯

### 獨立組件拆分：

| 組件名稱 | 功能描述 | 對應原始區塊 |
|---------|---------|-------------|
| `BillingModal.vue` | 新增/編輯收費彈窗 | 231-361 行 |
| `TagsModal.vue` | 標籤管理彈窗 | 364-420 行 |
| `ServiceComponentsConfig.vue` | 服務組成部分配置 | 1755-1952 行 |
| `TaskConfigForm.vue` | 任務配置表單 | 1823-1853 行 |
| `SOPSelector.vue` | SOP 選擇器組件 | 1864-1874 行（可複用） |
| `ProgressOverlay.vue` | 進度提示覆蓋層 | 48-64 行 |

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：創建 `useClientApi.js` Composables

將所有 API 請求抽離到 `src/composables/useClientApi.js` 檔案中，建議結構如下：

```javascript
// useClientApi.js 應該包含以下函數：

// 1. 客戶相關 API
- createClient(payload) // POST /internal/api/v1/clients
- getNextPersonalClientId() // GET /internal/api/v1/clients/next-personal-id
- validateClientId(clientId) // 客戶編號驗證邏輯

// 2. 服務相關 API
- loadServices() // GET /internal/api/v1/services
- loadServiceItems() // GET /internal/api/v1/services/items
- createClientService(clientId, payload) // POST /internal/api/v1/clients/{id}/services

// 3. 收費相關 API
- createBilling(payload) // POST /internal/api/v1/billing
- loadBillingByService(serviceId) // GET /internal/api/v1/billing/service/{id}
- updateBilling(scheduleId, payload) // PUT /internal/api/v1/billing/{id}
- deleteBilling(scheduleId) // DELETE /internal/api/v1/billing/{id}

// 4. 服務組件相關 API
- createServiceComponent(clientServiceId, payload) // POST /internal/api/v1/client-services/{id}/components
- loadServiceComponents(clientServiceId) // GET /internal/api/v1/client-services/{id}/components
- updateServiceComponent(componentId, payload) // PUT /internal/api/v1/service-components/{id}
- deleteServiceComponent(componentId) // DELETE /internal/api/v1/service-components/{id}

// 5. 任務模板相關 API
- loadTaskTemplates() // GET /internal/api/v1/task-templates
- loadTemplateStages(templateId) // GET /internal/api/v1/task-templates/{id}/stages

// 6. SOP 相關 API
- loadAllSOPs() // GET /internal/api/v1/sop

// 7. 標籤相關 API
- loadAllTags() // GET /internal/api/v1/tags
- createTag(payload) // POST /internal/api/v1/tags
- updateClientTags(clientId, tagIds) // PUT /internal/api/v1/clients/{id}/tags

// 8. 用戶相關 API
- loadAllUsers() // GET /internal/api/v1/users
```

### 應該被抽離的函數列表：

| 原始函數名稱 | 行號範圍 | 建議的 Composables 函數 | 備註 |
|------------|---------|----------------------|------|
| `loadServices()` | 1409-1421 | `useServiceApi().loadServices()` | 載入服務列表 |
| `loadServiceItems()` | 1424-1436 | `useServiceApi().loadServiceItems()` | 載入服務項目 |
| `loadTemplates()` | 1439-1452 | `useTaskTemplateApi().loadTemplates()` | 載入任務模板 |
| `loadAllUsers()` | 1455-1467 | `useUserApi().loadAllUsers()` | 載入用戶列表 |
| `loadAllSOPs()` | 1470-1487 | `useSOPApi().loadAllSOPs()` | 載入 SOP 列表 |
| `loadAllTags()` | 4033-4043 | `useTagApi().loadAllTags()` | 載入標籤列表 |
| `saveClient()` | 3690-4007 | `useClientApi().createClient()` | 創建客戶（複雜邏輯需要拆分） |
| `generatePersonalClientId()` | 505-567 | `useClientApi().getNextPersonalClientId()` | 生成個人客戶編號 |
| `saveBillingFromModal()` | 908-985 | `useBillingApi().createBilling()` | 創建收費 |
| `saveNewService()` | 1513-1536 | `useClientServiceApi().createService()` | 創建服務 |
| `saveNewComponent()` | 2669-2733 | `useServiceComponentApi().createComponent()` | 創建服務組件 |

### 狀態管理建議：

創建 `src/stores/useClientAddStore.js` Pinia Store，管理以下狀態：
- `tempServices`: 暫存的服務列表
- `currentStep`: 當前步驟（基本信息/服務/收費）
- `formData`: 客戶基本信息表單數據
- `selectedTags`: 選中的標籤
- `loading`: 加載狀態
- `progress`: 進度狀態

### 表單驗證建議：

使用 `ant-design-vue` 的 `<a-form>` 內建驗證規則，或整合 `async-validator`，將以下驗證邏輯抽離：
- 客戶編號驗證（8位數字）
- 統一編號驗證（台灣統編驗證規則）
- 公司名稱必填驗證
- Email 格式驗證

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

### 第一步：建立頁面框架和基礎組件

**要做的事：**
1. 創建一個新的 Vue 3 頁面組件，作為「新增客戶」頁面的容器
2. 在這個頁面中，先不要處理任何複雜的邏輯，只建立三個 Tab 頁籤：
   - 第一個 Tab：基本信息
   - 第二個 Tab：客戶服務
   - 第三個 Tab：收費設定
3. 將原本頁面最上方的「返回客戶列表」按鈕和頁面標題，放到這個新頁面的最上方
4. 先讓這三個 Tab 可以正常切換，但內容暫時為空或顯示「待開發」文字

**為什麼這樣做：**
- 先建立頁面結構，讓開發團隊看清楚頁面會如何組織
- 將複雜的功能拆分成三個獨立的 Tab，之後可以分別開發，不會互相干擾
- 先不動原本的 HTML 檔案，等新頁面框架建立好後，再逐步把功能搬過去

**預期結果：**
- 可以看到一個有三個 Tab 的頁面
- 點擊不同的 Tab 可以切換頁面內容
- 頁面最上方有返回按鈕和標題
- 每個 Tab 的內容區域暫時是空的，準備之後填入功能

