檔案： reports.html

## 第一部分：可標準化的 UI 組件審計

| 原始元素 | 建議的 antdv 組件 |
|---------|------------------|
| 標籤頁切換系統（手刻的 `<nav class="reports-tabs">` 和 `<button class="tab">`） | `<a-tabs>` 用於「月度報表」和「年度報表」切換 |
| 表格元素（多個手刻的 `<table class="report-table">`，包含收款、薪資、員工產值、客戶毛利等表格） | `<a-table>` 配置 columns 和 dataSource，支援展開行（expandable）功能 |
| 按鈕（`<button class="btn primary">`、`<button class="btn-link">`） | `<a-button type="primary">`、`<a-button type="link">` |
| 選擇器（年份和月份的 `<select>`） | `<a-select>` 用於年份和月份選擇 |
| 卡片容器（`<div class="card">` 包裹各個報表區塊） | `<a-card>` 用於包裹每個報表區塊，支援 title 屬性 |
| 彈窗系統（手刻的 modal，使用 `position:fixed` + `innerHTML` 動態插入） | `<a-modal>` 用於「客戶分布明細」、「薪資月度明細」、「員工產值趨勢」等彈窗 |
| 統計數字展示（手刻的 `<div class="stat-item">` 顯示應收金額、實收金額等） | `<a-statistic>` 用於展示統計數字，支援 title 和 value |
| 提示信息條（`<div id="permBar" class="info-bar">`） | `<a-alert type="warning">` 用於權限提示 |
| 加載狀態指示器（手刻的 `#annual-loading` span 元素） | `<a-spin>` 或 `<a-spin>` 包裹整個表格區域 |
| 折疊展開功能（客戶服務明細的展開/收起，使用 `onclick="toggleClientServices()"`） | `<a-table>` 的 `expandable` 配置，或使用 `<a-collapse>` 組件 |
| 服務類型明細展開（點擊客戶行展開服務類型明細表格） | `<a-table>` 的 `expandable.expandedRowRender` 功能 |
| 提示說明框（藍色背景的說明文字區塊，說明收入確認方式） | `<a-alert type="info">` 用於提示說明 |
| 狀態標籤（載入中、已載入、載入失敗的文字狀態） | `<a-tag>` 用於顯示狀態標籤 |
| 空狀態顯示（表格中的 "請選擇月份後載入資料"） | `<a-empty>` 用於空狀態展示 |

## 第二部分：頁面結構（子路由）拆分藍圖

### 父路由 (Parent) 外殼：
`Reports.vue` - 報表分析中心主頁面
- 包含頂部的 `<a-tabs>` 導航（月度報表 / 年度報表）
- 包含權限檢查邏輯（`checkPermission`）
- 使用 `<router-view>` 或條件渲染顯示對應的子報表組件

### 子路由 (Children) 拆分：

#### 1. `MonthlyReports.vue` - 月度報表頁面
包含以下四個獨立報表區塊（可進一步拆分為子組件）：
- `MonthlyRevenueReport.vue` - 月度收款報表
  - 統計卡片（應收金額、實收金額、收款率、逾期未收）
  - 客戶明細表格（支援按客戶分組展開服務明細）
- `MonthlyPayrollReport.vue` - 月度薪資報表
  - 統計卡片（總應發、總實發、人數、平均應發、平均實發）
  - 薪資明細表格
  - 薪資構成分析表格
- `MonthlyEmployeePerformance.vue` - 月度員工產值分析
  - 員工產值表格（標準工時、加權工時、產生收入、毛利等）
  - 客戶分布彈窗
- `MonthlyClientProfitability.vue` - 月度客戶毛利分析
  - 客戶毛利表格（總工時、加權工時、收入、毛利等）
  - 服務類型明細展開功能

#### 2. `AnnualReports.vue` - 年度報表頁面
包含以下四個獨立報表區塊（可進一步拆分為子組件）：
- `AnnualRevenueReport.vue` - 年度收款報表
  - 統計卡片
  - 月度收款趨勢表格
  - 按客戶年度彙總表格
  - 按服務類型年度彙總表格
- `AnnualPayrollReport.vue` - 年度薪資報表
  - 統計卡片
  - 月度薪資趨勢表格
  - 按員工年度彙總表格
  - 薪資月度明細彈窗
- `AnnualEmployeePerformance.vue` - 年度員工產值分析
  - 員工產值表格
  - 客戶分布彈窗
  - 月度產值趨勢彈窗
- `AnnualClientProfitability.vue` - 年度客戶毛利分析
  - 按客戶年度彙總表格
  - 按服務類型年度彙總表格
  - 服務類型明細展開功能

## 第三部分：資料與邏輯 (API) 抽離建議

### 建議：
創建 `src/api/reports.js` 檔案，將所有報表相關的 API 請求抽離到此檔案中。

### 應被抽離的函數：

#### 月度報表 API 函數：
1. `fetchMonthlyRevenue(year, month)` - 載入月度收款報表
   - 對應原代碼：`loadMonthlyRevenue(year, month)`
   - API 端點：`GET /reports/monthly/revenue?year=${year}&month=${month}`

2. `fetchMonthlyPayroll(year, month)` - 載入月度薪資報表
   - 對應原代碼：`loadMonthlyPayroll(year, month)`
   - API 端點：`GET /reports/monthly/payroll?year=${year}&month=${month}`

3. `fetchMonthlyEmployeePerformance(year, month)` - 載入月度員工產值報表
   - 對應原代碼：`loadMonthlyEmployeePerformance(year, month)`
   - API 端點：`GET /reports/monthly/employee-performance?year=${year}&month=${month}`

4. `fetchMonthlyClientProfitability(year, month)` - 載入月度客戶毛利報表
   - 對應原代碼：`loadMonthlyClientProfitability(year, month)`
   - API 端點：`GET /reports/monthly/client-profitability?year=${year}&month=${month}`

#### 年度報表 API 函數：
1. `fetchAnnualRevenue(year)` - 載入年度收款報表
   - 對應原代碼：`loadAnnualRevenue(year)`
   - API 端點：`GET /reports/annual/revenue?year=${year}`

2. `fetchAnnualPayroll(year)` - 載入年度薪資報表
   - 對應原代碼：`loadAnnualPayroll(year)`
   - API 端點：`GET /reports/annual/payroll?year=${year}`

3. `fetchAnnualEmployeePerformance(year)` - 載入年度員工產值報表
   - 對應原代碼：`loadAnnualEmployeePerformance(year)`
   - API 端點：`GET /reports/annual/employee-performance?year=${year}`

4. `fetchAnnualClientProfitability(year)` - 載入年度客戶毛利報表
   - 對應原代碼：`loadAnnualClientProfitability(year)`
   - API 端點：`GET /reports/annual/client-profitability?year=${year}`

#### 工具函數抽離：
1. `formatCurrency(val)` - 格式化金額
   - 應抽離到 `src/utils/formatters.js`

2. `formatPercent(val)` - 格式化百分比
   - 應抽離到 `src/utils/formatters.js`

3. `checkPermission()` - 權限檢查
   - 應抽離到 `src/api/auth.js` 或 `src/composables/useAuth.js`

#### 數據處理邏輯抽離：
1. 客戶服務分組邏輯（`loadMonthlyRevenue` 中的分組邏輯）
   - 應抽離到 `src/utils/reports.js` 作為 `groupClientServices(data)` 函數

2. 薪資構成分析計算邏輯（`loadMonthlyPayroll` 中的 items 陣列構建）
   - 應抽離到 `src/utils/reports.js` 作為 `calculatePayrollComposition(data)` 函數

## 第四部分：重構步驟總結

重構這個報表頁面的第一步，應該先建立一個基礎的 Vue 3 頁面框架，並將原本手刻的標籤頁切換功能，替換成 Ant Design Vue 的 `<a-tabs>` 組件。同時，要把頁面最上方的權限檢查提示條，改用 `<a-alert>` 組件來顯示。這樣可以先讓頁面的導航結構和提示信息變得更加標準化和美觀，為後續將各個報表區塊拆分成獨立組件打好基礎。

