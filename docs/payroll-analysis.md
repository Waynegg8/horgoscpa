# 頁面分析報告

檔案： `payroll.html`

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 行號範圍 | 建議的 antdv 組件 | 備註 |
|---------|---------|------------------|------|
| TAB 導航欄 | 46-54 | `<a-tabs>` | 替換手刻的 `.payroll-tabs` 和 `.tab` 按鈕 |
| 月份選擇輸入框 | 43 | `<a-date-picker mode="month">` | 替換 `<input type="month">` |
| 刷新數據按鈕 | 62-64 | `<a-button>` | 替換 `<button class="btn btn-sm">` |
| 薪資計算表格 | 66-94 | `<a-table>` | 替換手刻的 `<table class="table">`，支援展開詳情行 |
| 展開/收合明細按鈕 | 1436 | `<a-button type="text">` 或使用 `<a-table>` 的 `expandable` 屬性 | 替換手刻的展開按鈕 |
| 打印薪資條按鈕 | 1453 | `<a-button type="primary">` | 替換 `<button class="btn btn-sm">` |
| 搜尋輸入框（薪資項目） | 102 | `<a-input-search>` | 替換 `<input type="search">` |
| 新增項目按鈕 | 103 | `<a-button type="primary">` | 替換 `<button class="btn primary">` |
| 薪資項目列表表格 | 105-118 | `<a-table>` | 替換手刻的 `<table class="table">` |
| 項目狀態標籤 | 1917 | `<a-tag>` | 替換手刻的狀態文字顯示 |
| 編輯/停用按鈕 | 1919-1923 | `<a-button>` 組合 | 替換手刻的按鈕組 |
| 新增/編輯薪資項目對話框 | 123-200 | `<a-modal>` | 替換 `<dialog>` 元素 |
| 項目名稱輸入框 | 137 | `<a-input>` | 替換 `<input type="text">` |
| 類別下拉選單 | 146 | `<a-select>` + `<a-select-option>` | 替換 `<select>` |
| 績效獎金複選框 | 166 | `<a-checkbox>` | 替換 `<input type="checkbox">` |
| 說明文字框 | 181 | `<a-textarea>` | 替換 `<textarea>` |
| 顯示順序數字輸入框 | 188 | `<a-input-number>` | 替換 `<input type="number">` |
| 錯誤訊息顯示區 | 193 | `<a-alert type="error">` | 替換手刻的錯誤訊息 div |
| 取消/儲存按鈕組 | 196-197 | `<a-button>` 組合 | 替換手刻的按鈕組 |
| 員工搜尋輸入框 | 207 | `<a-input-search>` | 替換 `<input type="search">` |
| 員工列表 | 209-211 | `<a-list>` 或 `<a-menu>` | 替換手刻的 `<ul class="list">` |
| 員工薪資表單容器 | 216-237 | `<a-form>` + `<a-form-item>` | 替換手刻的 `.form` 和 `.row` |
| 底薪數字輸入框 | 219 | `<a-input-number>` | 替換 `<input type="number">` |
| 備註文字框 | 223 | `<a-textarea>` | 替換 `<textarea>` |
| 薪資項目列表區域 | 230-232 | `<a-list>` 或自定義組件 | 替換手刻的項目列表容器 |
| 新增項目按鈕（員工薪資） | 228 | `<a-button>` | 替換 `<button class="btn btn-sm">` |
| 年份選擇下拉選單（績效獎金） | 251 | `<a-select>` | 替換 `<select>` |
| 績效獎金調整表格 | 261-285 | `<a-table>` | 替換手刻的 `<table>`，支援可編輯單元格 |
| 月份輸入框（績效表格） | 2445-2455 | `<a-input-number>` | 替換手刻的 `<input type="text">` |
| 統計摘要區域 | 255 | `<a-statistic>` 或 `<a-descriptions>` | 替換手刻的 `.stats` div |
| 儲存按鈕（績效獎金） | 258 | `<a-button type="primary">` | 替換 `<button class="btn primary">` |
| 年度輸入框（年終獎金） | 298 | `<a-input-number>` | 替換 `<input type="number">` |
| 年終獎金統計區域 | 300-302 | `<a-statistic>` 或 `<a-descriptions>` | 替換手刻的 `.stats` div |
| 年終獎金表格 | 305-318 | `<a-table>` | 替換手刻的 `<table>` |
| 年終金額輸入框 | 2637 | `<a-input-number>` | 替換 `<input type="number">` |
| 發放月份選擇器 | 2644 | `<a-date-picker mode="month">` | 替換 `<input type="month">` |
| 備註輸入框（年終） | 2650 | `<a-input>` | 替換 `<input type="text">` |
| 系統設定標題區域 | 325-330 | `<a-page-header>` 或 `<a-typography-title>` | 替換手刻的標題區域 |
| 誤餐費設定卡片 | 334-350 | `<a-card>` | 替換手刻的設定區域 div |
| 誤餐費單價輸入框 | 339 | `<a-input-number>` | 替換 `<input type="number">` |
| 最低加班時數輸入框 | 345 | `<a-input-number>` | 替換 `<input type="number">` |
| 交通補貼設定卡片 | 353-372 | `<a-card>` | 替換手刻的設定區域 div |
| 區間公里數輸入框 | 358 | `<a-input-number>` | 替換 `<input type="number">` |
| 區間金額輸入框 | 364 | `<a-input-number>` | 替換 `<input type="number">` |
| 請假扣款設定卡片 | 375-397 | `<a-card>` | 替換手刻的設定區域 div |
| 扣款比例輸入框 | 380, 386 | `<a-input-number>` | 替換 `<input type="number">`，使用 `step="0.1"` |
| 日薪計算除數輸入框 | 392 | `<a-input-number>` | 替換 `<input type="number">` |
| 時薪計算設定卡片 | 400-413 | `<a-card>` | 替換手刻的設定區域 div |
| 時薪計算除數輸入框 | 405 | `<a-input-number>` | 替換 `<input type="number">` |
| 重要提示區域 | 415-419 | `<a-alert type="warning">` | 替換手刻的提示 div |
| 打卡記錄上傳標題 | 431-432 | `<a-typography-title>` | 替換手刻的標題 |
| 檔案上傳區域 | 436-444 | `<a-upload>` | 替換手刻的上傳區域和檔案選擇按鈕 |
| 上傳表單容器 | 447-473 | `<a-form>` + `<a-form-item>` | 替換手刻的表單結構 |
| 所屬月份選擇器 | 453 | `<a-date-picker mode="month">` | 替換 `<input type="month">` |
| 備註輸入框（上傳） | 457 | `<a-input>` | 替換 `<input type="text">` |
| 上傳/取消按鈕組 | 460-465 | `<a-button>` 組合 | 替換手刻的按鈕組 |
| 上傳進度條 | 468-471 | `<a-progress>` | 替換手刻的進度條 div |
| 員工選擇器（管理員） | 476-483 | `<a-select>` | 替換 `<select>` |
| 已上傳記錄表格 | 494-505 | `<a-table>` | 替換手刻的 `<table>` |
| 刷新按鈕（打卡記錄） | 489 | `<a-button>` | 替換 `<button class="btn">` |
| 下載/刪除按鈕 | 2973, 2976 | `<a-button>` 組合 | 替換手刻的按鈕組 |
| 檔案預覽區域 | 514-520 | `<a-image>` 或 `<a-typography-paragraph>` | 替換手刻的預覽區域 |
| 權限提示條 | 40 | `<a-alert type="error">` | 替換手刻的 `#infoBar` |
| 薪資詳情展開區域 | 708-1368 | `<a-collapse>` 或 `<a-table>` 的 `expandable` | 替換手刻的 `<details>` 和複雜的 HTML 生成 |
| 加班費計算規則表格 | 730-795 | `<a-table>` | 替換手刻的規則說明表格 |
| 打印視窗 | 1484-1832 | `<a-modal>` + 打印組件 | 替換 `window.open` 和手刻的打印頁面 |
| 空狀態顯示 | 92, 116, 210, 240, 283, 316, 503 | `<a-empty>` | 替換手刻的 "尚無資料" 文字 |
| 載入中狀態 | 92, 116, 283, 316, 1863 | `<a-spin>` | 替換手刻的 "載入中…" 文字 |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：
- **路由路徑**：`/internal/payroll`
- **組件名稱**：`PayrollLayout.vue`
- **外殼包含**：
  - 頁面標題：「薪資管理」
  - 月份選擇器（全局工具欄，僅在「薪資計算」TAB 顯示）
  - Tab 切換導航（`<a-tabs>`）
  - 權限檢查和提示（`<a-alert>`）
  - 路由出口（`<router-view>`）

### 子路由 (Children) 拆分：

| 子路由路徑 | 組件名稱 | 功能描述 | 對應原始區塊 | 管理員專用 |
|-----------|---------|---------|-------------|-----------|
| `/internal/payroll/calc` | `PayrollCalc.vue` | 薪資計算預覽 | 59-96 行的 `#panel-calc` | ✅ |
| `/internal/payroll/items` | `PayrollItems.vue` | 薪資項目設定 | 99-120 行的 `#panel-items` | ✅ |
| `/internal/payroll/emp` | `PayrollEmp.vue` | 員工薪資設定 | 203-244 行的 `#panel-emp` | ✅ |
| `/internal/payroll/bonus` | `PayrollBonus.vue` | 績效獎金調整 | 247-291 行的 `#panel-bonus` | ✅ |
| `/internal/payroll/yearend` | `PayrollYearend.vue` | 年終獎金管理 | 294-320 行的 `#panel-yearend` | ✅ |
| `/internal/payroll/settings` | `PayrollSettings.vue` | 系統設定 | 323-421 行的 `#panel-settings` | ✅ |
| `/internal/payroll/punch` | `PayrollPunch.vue` | 打卡記錄上傳 | 424-524 行的 `#panel-punch` | ❌ |

### 建議的 Tab 結構：
使用 `<a-tabs>` 將七個主要功能區塊拆分為 Tab 頁：
1. **薪資計算** Tab：顯示所有員工的薪資計算預覽，支援展開詳情、打印薪資條
2. **薪資項目設定** Tab：管理薪資項目類型（加給、津貼、獎金、扣款等）
3. **員工薪資設定** Tab：設定每個員工的底薪和薪資項目
4. **績效獎金調整** Tab：調整全年各月份的績效獎金
5. **年終獎金** Tab：管理年終獎金的發放
6. **系統設定** Tab：設定誤餐費、交通補貼、請假扣款、時薪計算等參數
7. **打卡記錄上傳** Tab：上傳和預覽打卡記錄（所有用戶可用）

### 獨立組件拆分：

| 組件名稱 | 功能描述 | 對應原始區塊 |
|---------|---------|-------------|
| `SalaryItemModal.vue` | 新增/編輯薪資項目對話框 | 123-200 行 |
| `PayrollDetailRow.vue` | 薪資計算詳情展開行 | 708-1368 行的 `generateDetailRow` 函數 |
| `OvertimeRulesPanel.vue` | 加班費計算規則說明面板 | 713-818 行 |
| `PayslipPrint.vue` | 薪資條打印組件 | 1478-1833 行的 `printPayslip` 函數 |
| `EmployeeSalaryForm.vue` | 員工薪資表單組件 | 216-237 行 |
| `SalaryItemList.vue` | 員工薪資項目列表組件 | 2173-2244 行的 `renderUserSalaryItems` 函數 |
| `PerformanceBonusTable.vue` | 績效獎金調整表格組件 | 247-291 行 |
| `YearEndBonusTable.vue` | 年終獎金表格組件 | 305-318 行 |
| `PayrollSettingsForm.vue` | 系統設定表單組件 | 323-421 行 |
| `PunchRecordUpload.vue` | 打卡記錄上傳組件 | 436-473 行 |
| `PunchRecordList.vue` | 打卡記錄列表組件 | 494-507 行 |
| `PunchRecordPreview.vue` | 打卡記錄預覽組件 | 514-520 行和 2989-3055 行 |

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：創建 `usePayrollApi.js` Composables

將所有 API 請求抽離到 `src/composables/usePayrollApi.js` 檔案中，建議結構如下：

```javascript
// usePayrollApi.js 應該包含以下函數：

// 1. 權限檢查 API
- checkAuth() // GET /internal/api/v1/auth/me

// 2. 薪資計算相關 API
- loadPayrollPreview(month) // GET /internal/api/v1/admin/payroll/preview?month={month}
- calculateEmployeePayroll(userId, month) // GET /internal/api/v1/admin/payroll/calculate/{userId}?month={month}

// 3. 薪資項目類型相關 API
- loadSalaryItemTypes() // GET /internal/api/v1/admin/salary-item-types
- createSalaryItemType(payload) // POST /internal/api/v1/admin/salary-item-types
- updateSalaryItemType(itemTypeId, payload) // PUT /internal/api/v1/admin/salary-item-types/{itemTypeId}
- toggleSalaryItemTypeStatus(itemTypeId, isActive) // PUT /internal/api/v1/admin/salary-item-types/{itemTypeId}

// 4. 員工薪資相關 API
- loadAllUsers() // GET /internal/api/v1/admin/users
- loadUserSalary(userId) // GET /internal/api/v1/admin/users/{userId}/salary
- updateUserSalary(userId, payload) // PUT /internal/api/v1/admin/users/{userId}/salary

// 5. 績效獎金相關 API
- loadYearlyBonus(year) // GET /internal/api/v1/admin/bonus/year/{year}
- updateYearlyBonus(year, adjustments) // PUT /internal/api/v1/admin/bonus/year/{year}

// 6. 年終獎金相關 API
- loadYearEndBonus(year) // GET /internal/api/v1/admin/yearend/{year}
- updateYearEndBonus(year, bonuses) // PUT /internal/api/v1/admin/yearend/{year}

// 7. 系統設定相關 API
- loadPayrollSettings() // GET /internal/api/v1/admin/payroll-settings
- updatePayrollSettings(settings) // PUT /internal/api/v1/admin/payroll-settings

// 8. 打卡記錄相關 API
- uploadPunchRecord(formData) // POST /internal/api/v1/punch-records/upload
- loadPunchRecords() // GET /internal/api/v1/punch-records
- downloadPunchRecord(recordId) // GET /internal/api/v1/punch-records/{recordId}/download
- previewPunchRecord(recordId) // GET /internal/api/v1/punch-records/{recordId}/preview
- deletePunchRecord(recordId) // DELETE /internal/api/v1/punch-records/{recordId}
```

### 應該被抽離的函數列表：

| 原始函數名稱 | 行號範圍 | 建議的 Composables 函數 | 備註 |
|------------|---------|----------------------|------|
| `ensureAdmin()` | 642-698 | `useAuthApi().checkAuth()` | 權限檢查 |
| `loadPreview()` | 1845-1885 | `usePayrollApi().loadPayrollPreview()` | 載入薪資預覽 |
| `printPayslip()` | 1478-1833 | `usePayrollApi().calculateEmployeePayroll()` | 計算單個員工薪資（用於打印） |
| `loadItems()` | 1930-1944 | `usePayrollApi().loadSalaryItemTypes()` | 載入薪資項目類型 |
| `saveItem()` | 1999-2052 | `usePayrollApi().createSalaryItemType()` 或 `updateSalaryItemType()` | 新增/更新薪資項目 |
| `toggleItemStatus()` | 2054-2075 | `usePayrollApi().toggleSalaryItemTypeStatus()` | 啟用/停用薪資項目 |
| `loadUsers()` | 2088-2100 | `usePayrollApi().loadAllUsers()` | 載入所有員工 |
| `loadUserSalary()` | 2140-2152 | `usePayrollApi().loadUserSalary()` | 載入員工薪資設定 |
| `saveUserSalary()` | 2303-2370 | `usePayrollApi().updateUserSalary()` | 更新員工薪資設定 |
| `loadYearlyBonus()` | 2408-2422 | `usePayrollApi().loadYearlyBonus()` | 載入全年績效獎金 |
| `saveYearlyBonus()` | 2485-2544 | `usePayrollApi().updateYearlyBonus()` | 更新全年績效獎金 |
| `loadYearEndBonus()` | 2605-2620 | `usePayrollApi().loadYearEndBonus()` | 載入年終獎金 |
| `saveYearEndBonus()` | 2676-2726 | `usePayrollApi().updateYearEndBonus()` | 更新年終獎金 |
| `loadSystemSettings()` | 2738-2749 | `usePayrollApi().loadPayrollSettings()` | 載入系統設定 |
| `saveSystemSettings()` | 2763-2797 | `usePayrollApi().updatePayrollSettings()` | 更新系統設定 |
| `loadPunchRecords()` | 2923-2943 | `usePayrollApi().loadPunchRecords()` | 載入打卡記錄 |
| `previewPunchRecord()` | 2989-3055 | `usePayrollApi().previewPunchRecord()` | 預覽打卡記錄 |
| `downloadPunchRecord()` | 3058-3062 | `usePayrollApi().downloadPunchRecord()` | 下載打卡記錄 |
| `deletePunchRecord()` | 3065-3082 | `usePayrollApi().deletePunchRecord()` | 刪除打卡記錄 |
| 上傳邏輯（`btnUploadFile` 事件處理） | 2860-2920 | `usePayrollApi().uploadPunchRecord()` | 上傳打卡記錄 |

### 狀態管理建議：

創建 `src/stores/usePayrollStore.js` Pinia Store，管理以下狀態：
- `payrollPreview`: 薪資計算預覽數據（按月份快取）
- `salaryItemTypes`: 薪資項目類型列表
- `employees`: 員工列表
- `selectedEmployee`: 當前選中的員工（用於員工薪資設定）
- `yearlyBonus`: 全年績效獎金數據（按年度快取）
- `yearEndBonus`: 年終獎金數據（按年度快取）
- `payrollSettings`: 系統設定數據
- `punchRecords`: 打卡記錄列表
- `selectedPunchRecord`: 當前選中的打卡記錄（用於預覽）
- `loading`: 各功能的加載狀態
- `cache`: 快取管理（月份、年度等）

### 表單驗證建議：

使用 `ant-design-vue` 的 `<a-form>` 內建驗證規則，或整合 `async-validator`，將以下驗證邏輯抽離：
- 薪資項目名稱必填驗證
- 薪資項目類別必選驗證
- 員工底薪數字範圍驗證（>= 0）
- 績效獎金金額驗證（>= 0）
- 年終獎金金額驗證（>= 0）
- 系統設定數值範圍驗證（誤餐費單價、扣款比例 0-1 等）
- 打卡記錄檔案大小驗證（<= 10MB）
- 打卡記錄檔案類型驗證（PDF、Excel、圖片、ZIP）

### 工具函數抽離建議：

創建 `src/utils/payrollUtils.js`，包含以下工具函數：
- `centsToTwd(cents)`: 將分（cents）轉換為台幣顯示格式
- `formatMonth(month)`: 格式化月份為民國年月格式
- `generateItemCode()`: 自動生成薪資項目代碼
- `getCategoryLabel(category)`: 獲取薪資項目類別標籤
- `calculateHourlyRate(baseSalaryCents, divisor)`: 計算時薪
- `formatPayrollDetail(data)`: 格式化薪資詳情數據（用於顯示）

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

### 第一步：建立頁面框架和 Tab 導航結構

**要做的事：**
1. 創建一個新的 Vue 3 頁面組件，作為「薪資管理」頁面的容器（`PayrollLayout.vue`）
2. 在這個頁面中，使用 `<a-tabs>` 組件建立七個 Tab 頁籤：
   - 第一個 Tab：薪資計算
   - 第二個 Tab：薪資項目設定
   - 第三個 Tab：員工薪資設定
   - 第四個 Tab：績效獎金調整
   - 第五個 Tab：年終獎金
   - 第六個 Tab：系統設定
   - 第七個 Tab：打卡記錄上傳
3. 在頁面最上方添加月份選擇器（僅在「薪資計算」Tab 顯示）
4. 添加權限檢查邏輯，根據用戶角色（管理員/普通員工）顯示或隱藏對應的 Tab
5. 先讓這七個 Tab 可以正常切換，但內容暫時為空或顯示「待開發」文字
6. 設定路由結構，將七個 Tab 對應到七個子路由

**為什麼這樣做：**
- 先建立頁面結構，讓開發團隊看清楚頁面會如何組織
- 將複雜的功能拆分成七個獨立的 Tab，之後可以分別開發，不會互相干擾
- 先不動原本的 HTML 檔案，等新頁面框架建立好後，再逐步把功能搬過去
- 透過路由拆分，可以實現按需載入，提升頁面載入速度
- 權限檢查邏輯提前建立，確保後續開發時權限控制正確

**預期結果：**
- 可以看到一個有七個 Tab 的頁面
- 點擊不同的 Tab 可以切換頁面內容（通過路由切換）
- 頁面最上方有月份選擇器（僅在薪資計算 Tab 顯示）
- 根據用戶角色，管理員可以看到所有 Tab，普通員工只能看到「打卡記錄上傳」Tab
- 每個 Tab 的內容區域暫時是空的，準備之後填入功能
- 路由結構清晰，每個 Tab 對應一個獨立的路由和組件

