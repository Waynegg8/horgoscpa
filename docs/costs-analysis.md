# 成本管理頁面分析報告

檔案： `costs.html`

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 | 備註 |
|---------|------------------|------|
| 標籤頁切換 (`<nav class="costs-tabs">`) | `<a-tabs>` | 三個標籤：成本項目設定、員工成本分析、客戶任務成本 |
| 成本項目設定表格 (`<table class="table">`) | `<a-table>` | 包含操作列（編輯、自動生成、刪除） |
| 月度管理費用記錄表格 | `<a-table>` | 包含操作列（編輯、刪除） |
| 員工成本分析表格 | `<a-table>` | 11 欄位，包含統計總計 |
| 客戶成本彙總表格 | `<a-table>` | 可展開顯示員工明細，需使用 `expandable` |
| 任務成本明細表格 | `<a-table>` | 8 欄位任務列表 |
| 自定義模態框 (`openModal` 函數) | `<a-modal>` | 用於新增/編輯成本項目、記錄、模板設定 |
| 表單輸入欄位 (`buildField` 函數) | `<a-form>` + `<a-form-item>` + `<a-input>` | 統一表單驗證與佈局 |
| 下拉選單 (`<select>`) | `<a-select>` | 月份選擇、類別選擇、分攤方式選擇 |
| 月份輸入 (`<input type="month">`) | `<a-date-picker mode="month">` | 更美觀的月份選擇器 |
| 按鈕 (`<button class="btn">`) | `<a-button>` | 主要/次要按鈕樣式 |
| 刪除按鈕 (紅色文字連結) | `<a-button type="text" danger>` | 危險操作按鈕 |
| 資訊提示框 (`<div class="info-box">`) | `<a-alert>` | 計算說明與提示訊息 |
| 統計卡片 (`<div class="stats-cards">`) | `<a-statistic>` | 本月總管理費用、固定/變動費用 |
| 總結欄位 (`<div class="summary-row">`) | `<a-row>` + `<a-col>` + `<a-statistic>` | 總成本、總收入、總利潤、平均利潤率 |
| 權限提示條 (`<div id="infoBar">`) | `<a-alert type="warning">` | 無權限存取提示 |
| 確認對話框 (`confirm()`) | `<a-popconfirm>` | 刪除確認操作 |
| 載入中狀態 (`載入中…`) | `<a-spin>` + `<a-skeleton>` | 表格載入狀態 |
| 空狀態 (`尚無資料`) | `<a-empty>` | 無資料時的佔位符 |
| 勾選框列表 (`<input type="checkbox">`) | `<a-checkbox-group>` | 自動生成預覽中的項目選擇 |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊。

### 父路由 (Parent) 外殼：
- **路由路徑**：`/costs` 或 `/internal/costs`
- **外殼內容**：
  - 頂部標籤頁導航 (`<a-tabs>`)
  - 權限驗證邏輯
  - 共用狀態管理（當前選中的標籤、月份選擇器狀態）
  - 路由出口 (`<router-view>`)

### 子路由 (Children) 拆分：

1. **成本項目設定** (`/costs/items`)
   - 成本項目類型列表表格
   - 新增/編輯成本項目模態框
   - 自動生成模板設定模態框
   - 月度管理費用記錄表格
   - 新增/編輯月度記錄模態框
   - 本月自動生成功能

2. **員工成本分析** (`/costs/employee`)
   - 月份選擇器
   - 員工成本分析表格
   - 統計總計欄
   - 計算說明提示框

3. **客戶任務成本** (`/costs/client`)
   - 月份選擇器
   - 視圖切換（按客戶彙總 / 按任務明細）
   - 客戶成本彙總表格（可展開員工明細）
   - 任務成本明細表格
   - 統計總結欄（總成本、總收入、總利潤、平均利潤率）

### 建議的組件拆分：

- `CostsLayout.vue` - 父路由外殼，包含標籤頁導航
- `CostItemsPanel.vue` - 成本項目設定面板
- `CostItemsTable.vue` - 成本項目列表表格
- `CostItemsModal.vue` - 成本項目新增/編輯模態框
- `CostRecordsTable.vue` - 月度管理費用記錄表格
- `CostRecordsModal.vue` - 月度記錄新增/編輯模態框
- `CostTemplateModal.vue` - 自動生成模板設定模態框
- `EmployeeCostsPanel.vue` - 員工成本分析面板
- `EmployeeCostsTable.vue` - 員工成本分析表格
- `ClientCostsPanel.vue` - 客戶任務成本面板
- `ClientCostsSummaryTable.vue` - 客戶成本彙總表格（可展開）
- `TaskCostsTable.vue` - 任務成本明細表格
- `CostsSummaryRow.vue` - 統計總結欄組件

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：
建立 `src/composables/useCostsApi.js` 檔案，抽離所有 API 請求邏輯：

#### 應該被抽離的函數：

1. **成本項目類型相關**：
   - `loadItems()` → `fetchCostTypes()`
   - `openEditItemModal()` 中的 PUT 請求 → `updateCostType(id, data)`
   - `openAddTypeModal()` 中的 POST 請求 → `createCostType(data)`
   - 刪除操作 → `deleteCostType(id)`

2. **月度管理費用記錄相關**：
   - `loadRecords()` → `fetchOverheadCosts(year, month)`
   - `openEditRecordModal()` 中的 PUT 請求 → `updateOverheadCost(id, data)`
   - `openAddRecordModal()` 中的 POST 請求 → `createOverheadCost(data)`
   - 刪除操作 → `deleteOverheadCost(id)`
   - `generateCurrentMonth()` → `generateOverheadCosts(year, month, templateIds)`
   - 預覽功能 → `previewOverheadCostsGeneration(year, month)`

3. **自動生成模板相關**：
   - `openEditTemplateModal()` 中的 GET 請求 → `fetchOverheadTemplate(costTypeId)`
   - 模板更新 → `updateOverheadTemplate(costTypeId, data)`

4. **員工成本相關**：
   - `loadEmployeeCosts()` → `fetchEmployeeCosts(year, month)`

5. **客戶任務成本相關**：
   - `loadClientSummary()` → `fetchClientCostsSummary(year, month)`
   - `loadTaskDetails()` → `fetchTaskCosts(year, month)`
   - `fetchClientSummaryData()` → 合併到 `fetchClientCostsSummary()`

6. **服務項目相關**：
   - `ensureServiceItemMap()` → `fetchServiceItems()`

7. **權限驗證**：
   - `ensureAdmin()` → `checkAdminPermission()`

#### API 檔案結構建議：

```javascript
// src/composables/useCostsApi.js
export function useCostsApi() {
  // 成本項目類型
  const fetchCostTypes = async () => { ... }
  const createCostType = async (data) => { ... }
  const updateCostType = async (id, data) => { ... }
  const deleteCostType = async (id) => { ... }
  
  // 月度管理費用
  const fetchOverheadCosts = async (year, month) => { ... }
  const createOverheadCost = async (data) => { ... }
  const updateOverheadCost = async (id, data) => { ... }
  const deleteOverheadCost = async (id) => { ... }
  const generateOverheadCosts = async (year, month, templateIds) => { ... }
  const previewOverheadCostsGeneration = async (year, month) => { ... }
  
  // 自動生成模板
  const fetchOverheadTemplate = async (costTypeId) => { ... }
  const updateOverheadTemplate = async (costTypeId, data) => { ... }
  
  // 員工成本
  const fetchEmployeeCosts = async (year, month) => { ... }
  
  // 客戶任務成本
  const fetchClientCostsSummary = async (year, month) => { ... }
  const fetchTaskCosts = async (year, month) => { ... }
  
  // 服務項目
  const fetchServiceItems = async () => { ... }
  
  // 權限
  const checkAdminPermission = async () => { ... }
  
  return {
    // 導出所有函數
  }
}
```

#### 狀態管理建議：
- 使用 `useState` 或 Pinia store 管理：
  - 當前選中的標籤頁
  - 當前選中的月份（三個標籤頁各自獨立）
  - 成本項目列表
  - 月度記錄列表
  - 員工成本數據
  - 客戶成本數據
  - 服務項目映射表
  - 客戶摘要緩存
  - 載入狀態
  - 錯誤狀態

## 第四部分：重構步驟總結

### 第一步：建立基礎架構
1. 建立 Vue 3 專案結構（如果尚未建立）
2. 安裝並配置 Ant Design Vue
3. 建立路由結構：
   - 父路由：`/costs` (CostsLayout.vue)
   - 子路由：`/costs/items`, `/costs/employee`, `/costs/client`
4. 建立 API 抽離檔案：`src/composables/useCostsApi.js`
5. 建立狀態管理（Pinia store 或 composable）：`src/stores/costsStore.js`

### 第二步：重構成本項目設定標籤頁
1. 建立 `CostItemsPanel.vue` 組件
2. 將成本項目列表表格替換為 `<a-table>`
3. 將模態框替換為 `<a-modal>` + `<a-form>`
4. 抽離 API 調用到 `useCostsApi.js`
5. 實現表單驗證與錯誤處理

### 第三步：重構員工成本分析標籤頁
1. 建立 `EmployeeCostsPanel.vue` 組件
2. 將表格替換為 `<a-table>`
3. 將統計欄替換為 `<a-statistic>`
4. 將資訊提示框替換為 `<a-alert>`
5. 實現載入狀態與空狀態

### 第四步：重構客戶任務成本標籤頁
1. 建立 `ClientCostsPanel.vue` 組件
2. 實現視圖切換功能（按客戶彙總 / 按任務明細）
3. 將客戶成本表格替換為 `<a-table>`，使用 `expandable` 實現員工明細展開
4. 將任務成本表格替換為 `<a-table>`
5. 將統計總結欄替換為 `<a-row>` + `<a-col>` + `<a-statistic>`

### 第五步：優化與測試
1. 統一錯誤處理機制
2. 實現載入狀態管理
3. 實現緩存機制（客戶摘要緩存、服務項目映射）
4. 優化性能（懶加載、虛擬滾動等）
5. 添加單元測試與整合測試

### 技術要點：
- 使用 `<a-tabs>` 實現標籤頁導航，並與 Vue Router 整合
- 使用 `<a-table>` 的 `expandable` 屬性實現可展開的客戶明細
- 使用 `<a-form>` 實現表單驗證與統一佈局
- 使用 `<a-modal>` 實現模態框，並使用 `v-model:open` 控制顯示/隱藏
- 使用 `<a-date-picker mode="month">` 實現月份選擇
- 使用 `<a-spin>` 和 `<a-skeleton>` 實現載入狀態
- 使用 `<a-empty>` 實現空狀態
- 使用 `<a-popconfirm>` 實現刪除確認
- 使用 Composables 抽離業務邏輯
- 使用 Pinia 或 Composables 管理狀態

