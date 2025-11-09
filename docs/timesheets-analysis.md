# 頁面分析報告

檔案： timesheets.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 週導航按鈕組（`<button class="btn-secondary">`、`<button class="btn-primary">`，第66-78行） | `<a-space>` 包裹多個 `<a-button>`，使用 `type="primary"`、`type="default"` 屬性 |
| 本週按鈕（`<button class="btn-primary" id="btnThisWeek">`，第72行） | `<a-button type="primary">` |
| 上一週/下一週按鈕（第66-78行） | `<a-button type="default">`，使用 `<template #icon>` 插槽添加 SVG 圖標 |
| 新增列按鈕（`<button class="btn-success" id="btnAddRow">`，第86-91行） | `<a-button type="primary">` 或使用 `type="dashed"`，使用 `@click` 處理新增邏輯 |
| 儲存所有變更按鈕（`<button class="btn-primary" id="btnSaveAll">`，第92-98行） | `<a-button type="primary">`，使用 `<a-badge>` 顯示待儲存數量 |
| 待儲存數量標籤（`<span id="pendingCount" class="pending-count hidden">(0)</span>`，第97行） | `<a-badge :count="pendingCount" :offset="[10, 0]">` 或使用 `<a-tag>` 顯示 |
| 週標題顯示（`<h2 class="week-title" id="weekTitle">`，第82行） | `<a-typography-title :level="2">` 或使用 `<a-typography-text>` |
| 工時表格（`<table class="timesheet-table">`，第105-168行） | `<a-table>`，使用 `:columns` 定義列（包含固定列），`:data-source` 綁定數據，`:scroll` 配置橫向滾動，`:pagination="false"` 禁用分頁 |
| 表格固定列（`<th class="sticky-col">`、`<td class="sticky-col">`，第108-111行、第145行、第157行） | `<a-table>` 的 `fixed="left"` 屬性配置固定列 |
| 表格日期標題（`<th class="col-date">`，第112-118行） | `<a-table>` 的 `columns` 配置中的 `title` 使用自定義渲染函數，包含日期標籤 |
| 表格輸入框（`<input type="text" class="hours-input">`，在 timesheets.js 第963行創建） | `<a-input-number>`，使用 `v-model` 綁定，`:min="0"`、`:max="12"`、`:step="0.5"`、`:precision="1"`，`:controls="false"` 隱藏控制按鈕 |
| 表格下拉選單（客戶、服務項目、服務子項目、工時類型，在 timesheets.js 第815-948行創建） | `<a-select>`，使用 `v-model` 綁定，`:options` 綁定選項列表，`:loading` 顯示載入狀態，`:placeholder` 設置提示文字 |
| 表格操作按鈕（刪除按鈕，在 timesheets.js 第987-994行創建） | 在 `<a-table>` 的 `columns` 中定義操作列，使用 `<a-button type="link" danger>` 或 `<a-popconfirm>` 包裹刪除按鈕確認 |
| 請假記錄行（`<tr class="leave-records-row">`，第144-154行） | 使用 `<a-table>` 的 `:summary` 屬性或自定義表尾，或使用 `<a-descriptions>` 顯示 |
| 工時完整性行（`<tr class="completeness-row">`，第156-166行） | 使用 `<a-table>` 的 `:summary` 屬性或自定義表尾 |
| 統計卡片容器（`<div class="summary-container">`，第173-227行） | `<a-row :gutter="16">` + `<a-col :span="6">` 包裹每個統計卡片 |
| 統計卡片（`<div class="summary-card">`，第178-197行、第205-224行） | `<a-card>` 或使用 `<a-statistic>`，使用 `:value`、`:title`、`:suffix` 屬性 |
| 統計標題（`<h3 class="summary-title">`，第176行、第203行） | `<a-typography-title :level="3">` 或使用 `<a-divider>` 分割 |
| 統計數值顯示（`<div class="summary-value">`，第180行、第185行等） | `<a-statistic>` 的 `:value` 屬性，自動格式化數字 |
| 統計單位顯示（`<div class="summary-unit">`，第181行、第186行等） | `<a-statistic>` 的 `:suffix` 屬性 |
| Toast 通知容器（`<div class="toast-container" id="toastContainer">`，第232行） | 使用 `<a-message>` 或 `<a-notification>`，無需容器元素，直接調用 API |
| 載入狀態顯示（目前使用 `weekTitle.textContent = '載入中...'`，第82行） | 使用 `<a-spin>` 包裹內容區域，使用 `:spinning="loading"` 控制顯示 |
| 空狀態顯示（當沒有工時記錄時） | `<a-empty>`，使用 `description` 自定義提示文字 |
| 錯誤提示（目前使用 `showToast` 函數） | `<a-message.error>` 或 `<a-notification.error>` 顯示錯誤訊息 |
| 成功提示（目前使用 `showToast` 函數） | `<a-message.success>` 或 `<a-notification.success>` 顯示成功訊息 |
| 警告提示（目前使用 `showToast` 函數） | `<a-message.warning>` 或 `<a-notification.warning>` 顯示警告訊息 |
| 日期選擇器（週導航，間接通過按鈕切換週） | 可考慮添加 `<a-date-picker>` 的週模式（`mode="week"`）或使用 `<a-range-picker>` 選擇週範圍 |
| 內聯樣式的大量使用（如第145行、第157行的 `style` 屬性） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和主題定制，使用 `<a-space>`、`<a-row>` + `<a-col>` 處理布局 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**工時管理主頁面外殼**應包含：
- 週導航區域（第64-100行）：上一週、本週、下一週按鈕，週標題顯示，新增列按鈕，儲存所有變更按鈕
- 權限檢查與錯誤提示（在 timesheets.js 中處理）
- 預渲染支持（第42-56行、第125-141行、第241-322行）
- 路由守衛（根據用戶角色決定是否顯示管理員功能）
- 自動刷新邏輯（如果需要）

### 子路由 (Children) 拆分：

1. **TimesheetTable 組件**（工時表格）
   - 位置：第102-170行
   - 功能區塊：
     - 工時記錄表格顯示
     - 表格固定列（客戶、服務項目、服務子項目、工時類型）
     - 表格日期列（週一到週日）
     - 表格輸入框（工時輸入）
     - 表格下拉選單（客戶、服務項目、服務子項目、工時類型選擇）
     - 表格操作列（刪除按鈕）
     - 請假記錄行（表尾）
     - 工時完整性行（表尾）
   - 建議：獨立組件，接收 `timesheetData`、`weekDays`、`holidays`、`leaves` 等數據作為 props，通過 `@update`、`@delete`、`@add-row` 事件通知父組件
   - 建議路由：作為主頁面的主要內容組件，不需要獨立路由

2. **TimesheetSummary 組件**（工時統計區塊）
   - 位置：第172-227行
   - 功能區塊：
     - 本週統計（總工時、加班工時、加權工時、請假時數）
     - 本月統計（總工時、加班工時、加權工時、請假時數）
   - 建議：獨立組件，接收 `weeklySummary`、`monthlySummary` 數據作為 props
   - 建議路由：作為頁面底部組件，不需要獨立路由

3. **WeekNavigation 組件**（週導航）
   - 位置：第64-100行
   - 功能區塊：
     - 上一週按鈕
     - 本週按鈕
     - 下一週按鈕
     - 週標題顯示
     - 新增列按鈕
     - 儲存所有變更按鈕（含待儲存數量）
   - 建議：獨立組件，通過 `@prev-week`、`@next-week`、`@this-week`、`@add-row`、`@save-all` 事件通知父組件，接收 `currentWeek`、`pendingCount` 作為 props
   - 建議路由：作為頁面頭部組件，不需要獨立路由

4. **TimesheetPage 組件**（主頁面組件）
   - 整合上述所有組件
   - 管理頁面狀態（當前週、工時數據、待儲存變更、統計數據等）
   - 處理 API 調用和數據加載
   - 處理工時輸入、驗證、儲存的業務邏輯
   - 建議路由：`/internal/timesheets` 或 `/timesheets`

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useTimesheetApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchCurrentUser()` 函數**
   - 位置：timesheets.js 第311-323行的 `loadCurrentUser` 函數
   - 功能：獲取當前用戶信息
   - 返回：`Promise<{ data: User, isAdmin: boolean }>`
   - 建議：此函數可能已存在於 `useAuthApi.js` 中，可重用

2. **`fetchClients(params)` 函數**
   - 位置：timesheets.js 第325-334行的 `loadClients` 函數
   - 功能：獲取客戶列表
   - 參數：
     - `perPage`：每頁數量（預設：100）
   - 返回：`Promise<Array<Client>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

3. **`fetchClientServices(clientId)` 函數**
   - 位置：timesheets.js 第336-361行的 `loadClientServices` 函數
   - 功能：獲取客戶的服務項目列表
   - 參數：`clientId`（客戶ID）
   - 返回：`Promise<Array<Service>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存，支援客戶ID變化時自動重新請求

4. **`fetchServiceItems(clientId, serviceId)` 函數**
   - 位置：timesheets.js 第363-382行的 `loadServiceItems` 函數
   - 功能：獲取服務項目的子項目列表
   - 參數：
     - `clientId`：客戶ID
     - `serviceId`：服務項目ID
   - 返回：`Promise<Array<ServiceItem>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存，支援客戶ID和服務ID變化時自動重新請求

5. **`fetchHolidays(params)` 函數**
   - 位置：timesheets.js 第384-407行的 `loadHolidays` 函數
   - 功能：獲取假日列表
   - 參數：
     - `start_date`：開始日期（格式：YYYY-MM-DD）
     - `end_date`：結束日期（格式：YYYY-MM-DD）
   - 返回：`Promise<Array<Holiday>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

6. **`fetchLeaves(params)` 函數**
   - 位置：timesheets.js 第407-453行的 `loadLeaves` 函數
   - 功能：獲取請假記錄列表
   - 參數：
     - `dateFrom`：開始日期（格式：YYYY-MM-DD）
     - `dateTo`：結束日期（格式：YYYY-MM-DD）
     - `status`：狀態（預設：'approved'）
     - `perPage`：每頁數量（預設：100）
   - 返回：`Promise<Array<Leave>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

7. **`fetchTimesheets(params)` 函數**
   - 位置：timesheets.js 第455-560行的 `loadTimesheets` 函數
   - 功能：獲取工時記錄列表
   - 參數：
     - `start_date`：開始日期（格式：YYYY-MM-DD）
     - `end_date`：結束日期（格式：YYYY-MM-DD）
   - 返回：`Promise<{ data: Array<TimesheetLog>, meta: { cached: boolean, last_updated: string } }>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理，支援日期範圍變化時自動重新請求，處理本地緩存邏輯

8. **`fetchMonthlySummary(params)` 函數**
   - 位置：timesheets.js 第562-587行的 `loadMonthlySummary` 函數
   - 功能：獲取月度統計數據
   - 參數：
     - `month`：月份（格式：YYYY-MM）
   - 返回：`Promise<{ totalHours: number, overtimeHours: number, weightedHours: number, leaveHours: number }>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

9. **`saveTimesheets(payload)` 函數**
   - 位置：timesheets.js 第1549-1623行的批量儲存邏輯
   - 功能：批量儲存工時記錄
   - 參數：
     - `updates`：更新記錄數組（包含 `timesheet_id`、`hours` 等）
     - `creates`：新建記錄數組（包含 `client_id`、`service_id`、`work_date`、`hours` 等）
     - `deletes`：刪除記錄ID數組
   - 返回：`Promise<{ updated_count: number, created_count: number, deleted_count: number }>`
   - 建議：使用 `useMutation` 處理批量儲存操作

10. **`deleteTimesheet(timesheetId)` 函數**
    - 位置：timesheets.js 中的刪除邏輯
    - 功能：刪除單個工時記錄
    - 參數：`timesheetId`（工時記錄ID）
    - 返回：`Promise<void>`
    - 建議：使用 `useMutation` 處理刪除操作，成功後自動刷新工時列表

11. **`prefetchTimesheets(params)` 函數**
    - 位置：timesheets.js 第2087-2131行的 `prefetchPreviousWeeks` 函數
    - 功能：預取前幾週的工時數據
    - 參數：
      - `weekCount`：預取週數（預設：4）
    - 返回：`Promise<void>`
    - 建議：使用 `useRequest` 進行預取，不阻塞主流程

12. **數據格式化函數**（可選，抽離到 `src/utils/formatters.js`）
    - `formatDate(date: Date): string`（timesheets.js 第220-225行）
    - `formatDateDisplay(date: Date): string`（timesheets.js 第227-231行）
    - `formatWeekRange(monday: Date): string`（timesheets.js 第233-245行）
    - `getMonday(date: Date): Date`（timesheets.js 第213-218行）

13. **日期類型判定函數**（可選，抽離到 `src/utils/dateUtils.js`）
    - `getDateType(dateStr: string, holidays: Map): string`（timesheets.js 第249-272行）
    - `buildWeekDays(currentWeekStart: Date, holidays: Map): Array<WeekDay>`（timesheets.js 第274-289行）

14. **工時類型定義**（可選，抽離到 `src/constants/workTypes.js`）
    - `workTypes` 常量（timesheets.js 第104-209行的 `initWorkTypes` 函數）
    - `isWorkTypeAllowed(workType, dateType)` 函數
    - `getAllowedWorkTypesForDate(dateType)` 函數

15. **狀態管理**（建議使用 Pinia）
    - 創建 `stores/timesheets.js` store
    - 管理以下狀態：
      - `currentWeekStart`：當前週的週一日期
      - `currentUser`：當前登入用戶
      - `isAdmin`：是否為管理員
      - `clients`：客戶列表緩存
      - `clientServices`：客戶服務項目緩存（Map<client_id, Array<service>>）
      - `serviceItems`：服務子項目緩存（Map<`${client_id}_${service_id}`, Array<item>>）
      - `holidays`：假日列表緩存（Map<iso, Holiday>）
      - `leaves`：請假記錄緩存（Map<iso, Leave>）
      - `timesheets`：工時記錄數據
      - `pendingChanges`：待儲存變更（Map<`${rowIdx}_${dayIdx}`, Change>）
      - `weeklySummary`：本週統計數據
      - `monthlySummary`：本月統計數據
      - `loading`：加載狀態
      - `error`：錯誤信息

16. **權限檢查**（可抽離到 composable）
    - 創建 `src/composables/useAuth.js`（如果尚未存在）
    - 檢查用戶是否有權限查看/編輯工時記錄
    - 處理 401 未授權重定向

17. **工時驗證邏輯**（可抽離到 composable）
    - 創建 `src/composables/useTimesheetValidation.js`
    - 封裝工時輸入驗證邏輯（timesheets.js 第1152-1450行的 `handleHoursInput` 函數）
    - 包含：
      - 工時類型與日期相容性驗證
      - 加班前置條件驗證
      - 正常工時與請假衝突驗證
      - 時數限制驗證
      - 前置要求驗證
      - 每日總工時上限驗證

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與數據管理**

在開始重構 UI 之前，首先應該將所有的數據獲取和操作邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useTimesheetApi.js`）來處理所有與工時管理相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取用戶信息、獲取客戶列表、獲取服務項目、獲取工時記錄、獲取假日列表、獲取請假記錄、獲取月度統計、批量儲存工時記錄）都移動到這個檔案中。

2. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（例如 401 未授權、網絡錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。特別是要處理未授權時的重定向邏輯。

3. **建立數據格式化工具**：將所有的數據格式化函數（例如格式化日期、格式化週範圍）從頁面中抽離出來，放在一個共用的工具檔案中，這樣其他頁面也可以重用這些函數。

4. **建立日期工具函數**：將日期相關的工具函數（例如獲取週一日期、判定日期類型、建立週日期模型）從頁面中抽離出來，放在一個共用的工具檔案中。

5. **建立工時類型常量**：將工時類型定義（例如一般、平日OT前2h、休息日前2h等）從頁面中抽離出來，放在一個共用的常量檔案中，這樣可以在多個地方重用。

6. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理工時管理的狀態（例如當前週、工時數據、待儲存變更、統計數據、客戶列表緩存、服務項目緩存等），這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化。同時也可以緩存客戶列表、服務項目等數據，避免重複請求。

7. **建立工時驗證邏輯**：將工時輸入驗證邏輯（例如工時類型與日期相容性驗證、加班前置條件驗證、正常工時與請假衝突驗證、時數限制驗證等）抽離到一個共用的 composable 中，這樣可以在多個組件中重用，並且更容易維護和測試。

8. **處理權限邏輯**：將權限檢查邏輯（例如檢查用戶是否有權限查看/編輯工時記錄）抽離到一個共用的 composable 中，這樣可以在多個頁面中重用。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯分離了。同時，由於 API 請求邏輯已經統一管理，後續如果 API 接口發生變化，只需要在一個地方修改即可。此外，由於狀態管理已經統一，多個組件之間共享狀態也會變得更加容易。

