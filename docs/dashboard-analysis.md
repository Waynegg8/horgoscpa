# 頁面分析報告

檔案： dashboard.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 通知欄（noticeList，第37行，第92-103行） | `<a-alert>` 或 `<a-notification>`，使用 `type` 屬性（info/warning/error） |
| 統計卡片（statCard 函數，第105-107行） | `<a-card>` + `<a-statistic>`，使用 `value`、`title`、`suffix` 屬性 |
| 列表卡片容器（listCard 函數，第109-111行） | `<a-card>`，使用 `title` slot 和內容區 |
| 手刻下拉選單（select 元素，第123-138行、第163-165行、第174-176行） | `<a-select>`，使用 `v-model` 綁定、`options` 配置 |
| 手刻按鈕（button 元素，第177行） | `<a-button>`，使用 `type`、`ghost` 屬性，支援切換狀態 |
| 徽章標籤（badge 元素，第219行、第357-365行） | `<a-tag>` 或 `<a-badge>`，使用 `color` 屬性（red/blue/green） |
| 加載指示器（showLoadingIndicator 函數，第692-746行） | `<a-spin>`，使用 `spinning` 屬性控制顯示，可配合 `<a-spin>` 包裹內容 |
| 空狀態顯示（「尚無資料」、「目前沒有待辦任務」等，第110行、第238行等） | `<a-empty>`，使用 `description` 屬性自定義提示文字 |
| 兩列網格布局（第272-277行：display:grid;grid-template-columns:2fr 3fr） | `<a-row>` + `<a-col :span="8">` + `<a-col :span="16">`，使用 Ant Design 的 24 欄網格系統 |
| 財務狀況網格卡片（第395-432行：4x2 網格） | `<a-row :gutter="12">` + `<a-col :span="12">` + `<a-card>`，每個指標使用 `<a-statistic>` |
| 任務列表項（task-row，第232-237行、第369-372行） | `<a-list>` + `<a-list-item>`，使用 `:data-source` 綁定數據 |
| 員工行項目（emp-row，第306-315行） | `<a-list>` + `<a-list-item>`，或使用 `<a-descriptions>` 顯示鍵值對 |
| 活動動態列表項（第447-510行） | `<a-timeline>` 或 `<a-list>`，根據活動類型使用不同的 `<a-list-item>` 模板 |
| 日期顯示（第35行、第860行） | 格式化字串顯示，可考慮使用 `<a-typography-text>` 統一文字樣式 |
| 月份選擇器（generateMonthOptions 函數，第145-157行） | `<a-date-picker>` 的月份模式（`mode="month"`）或 `<a-select>` 配合選項生成 |
| 權限提示欄（permBar，第39行、第682-684行） | `<a-alert type="error">` 或 `<a-result status="403">` |
| 骨架屏（renderSkeleton 函數，第688-690行） | `<a-skeleton>`，使用 `active` 屬性顯示動畫效果 |
| 內聯樣式的大量使用（如第120-142行、第233-237行等） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和主題定制 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**Dashboard 主頁面外殼**應包含：
- 頁面標題區域（歡迎訊息、用戶名稱、當前日期，第30-40行）
- 通知欄區域（第37行、第92-103行的 `showNotices` 功能）
- 權限檢查與錯誤提示（第39行、第672-686行的 `ensureUser` 功能）
- 自動刷新邏輯（第854-857行的 `startAutoRefresh` 功能）
- 預渲染支持（第755-768行）
- 路由守衛（根據用戶角色決定顯示員工或管理員視圖）

### 子路由 (Children) 拆分：

1. **EmployeeDashboard 組件**（員工視圖）
   - 位置：`renderEmployeeDashboard` 函數（第211-262行）
   - 功能區塊：
     - 本月總工時統計卡片
     - 我的任務列表（待辦/進行中）
     - 收據已開但任務未完成提醒
   - 建議路由：`/dashboard/employee` 或作為條件渲染組件

2. **AdminDashboard 組件**（管理員視圖）
   - 位置：`renderAdminDashboard` 函數（第264-670行）
   - 功能區塊：
     - 左側欄：最近動態
     - 右側欄：各員工任務狀態、各員工工時、收據提醒、財務狀況
   - 建議路由：`/dashboard/admin` 或作為條件渲染組件

3. **RecentActivities 組件**（最近動態）
   - 位置：第438-518行、第527-561行
   - 功能：顯示任務調整、狀態更新、假期申請、工時提醒
   - 篩選功能：類型篩選、員工篩選、天數篩選
   - 建議：獨立組件，可在多處重用

4. **EmployeeTasks 組件**（各員工任務狀態）
   - 位置：第327-383行、第571-596行
   - 功能：顯示每個員工的任務統計（逾期、進行中、已完成）
   - 月份篩選：支援選擇月份查看已完成任務
   - 建議：獨立組件，可點擊跳轉到任務列表頁面

5. **EmployeeHours 組件**（各員工工時）
   - 位置：第295-325行、第598-623行
   - 功能：顯示每個員工的工時統計（總工時、正常工時、加班工時）
   - 月份篩選：支援選擇月份查看
   - 建議：獨立組件

6. **FinancialStatus 組件**（財務狀況）
   - 位置：第385-433行、第638-669行
   - 功能：顯示營收、成本、毛利、毛利率、應收、收款、逾期、收款率
   - 模式切換：月度模式 / 本年累計模式
   - 月份選擇：月度模式時可選擇月份
   - 建議：獨立組件，可考慮進一步拆分為「帳面數據」和「現金流數據」兩個子組件

7. **ReceiptsPending 組件**（收據已開但任務未完成提醒）
   - 位置：第244-254行（員工視圖）、第435-436行、第625-636行（管理員視圖）
   - 功能：顯示收據已開但任務未完成的項目
   - 建議：獨立組件，可在員工和管理員視圖中重用

8. **MyTasks 組件**（我的任務 - 員工視圖專用）
   - 位置：第216-238行
   - 功能：顯示當前用戶的任務列表，包含緊急程度、到期日、狀態信息
   - 建議：獨立組件，可重用於其他頁面

9. **MyHours 組件**（我的工時 - 員工視圖專用）
   - 位置：第214-215行
   - 功能：顯示當前用戶的工時統計
   - 建議：獨立組件

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useDashboardApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchDashboardData(params)` 函數**
   - 位置：第770-852行的 `refresh` 函數中的 API 調用部分（第805-817行）
   - 功能：獲取儀表板數據
   - 參數：
     - `ym`：年月（格式：YYYY-MM）
     - `financeYm`：財務查看的年月
     - `financeMode`：財務模式（'month' 或 'ytd'）
     - `activity_days`：最近動態天數
     - `activity_user_id`：最近動態篩選的員工ID
     - `activity_type`：最近動態篩選的類型
   - 返回：`Promise<{ role: string, admin?: AdminDashboardData, employee?: EmployeeDashboardData }>`
   - 建議使用 `useRequest` 或 `useQuery`（如果使用 Vue Query）進行請求管理

2. **`fetchCurrentUser()` 函數**
   - 位置：第672-686行的 `ensureUser` 函數
   - 功能：獲取當前用戶信息
   - 返回：`Promise<User>`
   - 建議：此函數可能已存在於 `useAuthApi.js` 中，可重用

3. **格式化工具函數**（可選，抽離到 `src/utils/formatters.js`）
   - `formatLocalDate(d: Date): string`（第67-69行）
   - `formatYm(ym: string): string`（第71-76行）
   - `fmtNum(n: number): string`（第183-191行）
   - `fmtTwd(n: number): string`（第194-202行）
   - `fmtPct(n: number): string`（第205-209行）
   - `getCurrentYm(): string`（第87-90行）
   - `addMonth(ym: string, delta: number): string`（第78-85行）

4. **數據轉換邏輯**（可選，抽離到 `src/composables/useDashboardData.js`）
   - 將 API 返回的原始數據轉換為組件所需的格式
   - 例如：任務數據的格式化、活動數據的分組等

5. **狀態管理**（建議使用 Pinia）
   - 創建 `stores/dashboard.js` store
   - 管理以下狀態：
     - `currentYm`：當前查看的年月
     - `financeMode`：財務模式
     - `financeYm`：財務查看的年月
     - `activityDays`：最近動態天數
     - `activityUserId`：最近動態篩選的員工ID
     - `activityType`：最近動態篩選的類型
     - `dashboardData`：儀表板數據緩存
     - `loading`：加載狀態
     - `error`：錯誤信息

6. **自動刷新邏輯**（可抽離到 composable）
   - 創建 `src/composables/useAutoRefresh.js`
   - 封裝自動刷新邏輯（第854-857行）
   - 支援自定義刷新間隔
   - 支援頁面焦點時自動刷新

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立基礎架構與 API 層**

在開始重構 UI 之前，首先應該將所有的數據獲取邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useDashboardApi.js`）來處理所有與儀表板相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取用戶信息、獲取儀表板數據）都移動到這個檔案中。

2. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（例如 401 未授權、網絡錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。

3. **建立數據格式化工具**：將所有的數據格式化函數（例如格式化日期、格式化金額、格式化百分比）從頁面中抽離出來，放在一個共用的工具檔案中，這樣其他頁面也可以重用這些函數。

4. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理儀表板的狀態（例如當前查看的月份、篩選條件等），這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯分離了。

