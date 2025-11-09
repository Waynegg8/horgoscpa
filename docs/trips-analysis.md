# 頁面分析報告

檔案： trips.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 月份選擇器（monthFilter，第25-30行，type="month"） | `<a-date-picker>` 使用 `picker="month"` 模式，配合 `v-model:value` 綁定 |
| 新增按鈕（btnNewTrip，第31-36行，包含 SVG 圖標） | `<a-button type="primary">` 配合 `<PlusOutlined />` 圖標組件 |
| 統計摘要欄（summaryBar，第41-61行，包含三個統計項） | `<a-row :gutter="16">` + `<a-col :span="8">` + `<a-card>` + `<a-statistic>`，使用 `title`、`value`、`suffix` 屬性 |
| 員工篩選下拉選單（userFilter，第68-70行，select 元素） | `<a-select>` 使用 `v-model` 綁定、`:options` 配置選項，配合 `v-if` 控制管理員可見性 |
| 客戶篩選下拉選單（clientFilter，第74-76行，select 元素） | `<a-select>` 使用 `v-model` 綁定、`:options` 配置選項 |
| 重置篩選按鈕（btnResetFilters，第79行） | `<a-button>` 使用 `type="default"` 或無 type 屬性 |
| 外出登記表格（trips-table，第86-105行，手刻 table 元素） | `<a-table>` 使用 `:columns`、`:data-source`、`:pagination` 配置，`:loading` 控制加載狀態 |
| 表格加載狀態（spinner，第101行） | `<a-table>` 的 `:loading` 屬性，或使用 `<a-spin>` 包裹表格 |
| 表格空狀態（empty-state，第424行） | `<a-table>` 的 `:empty` 插槽，或使用 `<a-empty>` 組件 |
| 分頁組件（pagination，第108-114行，手刻分頁按鈕） | `<a-pagination>` 使用 `v-model:current`、`:total`、`:page-size` 屬性，`:show-total` 顯示總數 |
| 新增/編輯模態框（tripModal，第119-173行，手刻 modal） | `<a-modal>` 使用 `v-model:open` 控制顯示、`:title` 設置標題、`:footer` 自定義底部按鈕 |
| 表單容器（tripForm，第124行，form 元素） | `<a-form>` 使用 `:model`、`:rules` 配置驗證規則，`:label-col`、`:wrapper-col` 設置布局 |
| 外出日期輸入（tripDate，第129行，type="date"） | `<a-form-item>` + `<a-date-picker>` 使用 `v-model:value` 綁定，`:format` 設置日期格式 |
| 目的地輸入（destination，第134行，type="text"） | `<a-form-item>` + `<a-input>` 使用 `v-model:value` 綁定，`:placeholder` 設置提示 |
| 距離輸入（distanceKm，第139行，type="number"） | `<a-form-item>` + `<a-input-number>` 使用 `v-model:value` 綁定，`:step="0.1"`、`:min="0.1"` 設置步進和最小值 |
| 補貼計算提示（hint，第140行） | `<a-form-item>` 的 `:help` 屬性，或使用 `<a-typography-text type="secondary">` |
| 交通補貼預覽（subsidyPreview，第144-147行） | `<a-alert type="info">` 或 `<a-card>` + `<a-statistic>`，使用 `:value` 顯示金額 |
| 客戶選擇下拉（clientId，第151-153行，select 元素） | `<a-form-item>` + `<a-select>` 使用 `v-model:value` 綁定、`:options` 配置選項 |
| 外出目的輸入（purpose，第158行，textarea） | `<a-form-item>` + `<a-textarea>` 使用 `v-model:value` 綁定，`:rows` 設置行數 |
| 備註輸入（notes，第163行，textarea） | `<a-form-item>` + `<a-textarea>` 使用 `v-model:value` 綁定，`:rows` 設置行數 |
| 取消按鈕（btnCancelTrip，第168行） | `<a-button>` 使用 `type="default"` |
| 儲存按鈕（btnSaveTrip，第169行） | `<a-button type="primary" html-type="submit">` 在表單中使用 |
| 表格操作按鈕（編輯/刪除，第452-457行，btn-icon） | `<a-space>` 包裹，使用 `<a-button type="link" :icon="h(EditOutlined)">` 和 `<a-button type="link" danger :icon="h(DeleteOutlined)">` |
| 距離徽章（distance-badge，第447行） | `<a-tag>` 或 `<a-badge>`，使用 `color` 屬性區分樣式 |
| 補貼金額顯示（subsidy-amount，第448行） | `<a-typography-text>` 使用 `:strong` 屬性突出顯示 |
| 成功訊息提示（showSuccess，第664行，alert） | `<a-message.success>` 或 `<a-notification.success>`，使用 `message.success()` API |
| 錯誤訊息提示（showError，第669行，alert） | `<a-message.error>` 或 `<a-notification.error>`，使用 `message.error()` API |
| 刪除確認對話框（deleteTrip，第639行，confirm） | `<a-popconfirm>` 包裹刪除按鈕，或使用 `Modal.confirm()` 方法 |
| 表單必填標記（required，第128、133、138行，span 元素） | `<a-form-item>` 的 `required` 屬性自動顯示紅色星號 |
| 表單網格布局（form-grid，第126行） | `<a-row :gutter="16">` + `<a-col :span="12">` 實現響應式網格布局 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**外出登記管理頁面外殼**應包含：
- 頁面標題區域（第22-38行：標題「外出登記」、月份篩選器、新增按鈕）
- 權限檢查邏輯（第226-242行：檢查用戶身份、管理員顯示員工篩選器）
- 路由守衛（根據用戶登入狀態決定是否顯示頁面）
- 通用布局（導航欄、頁腳，由 bootstrap.js 處理）

### 子路由 (Children) 拆分：

1. **TripsList 組件**（外出登記列表）
   - 位置：第84-115行（表格和分頁）
   - 功能區塊：
     - 外出登記數據表格
     - 分頁控制
     - 加載狀態顯示
     - 空狀態顯示
   - 建議：獨立組件，可重用於其他需要顯示外出記錄的頁面

2. **TripsSummary 組件**（統計摘要）
   - 位置：第41-61行
   - 功能：顯示本月外出次數、總距離、交通補貼總額
   - 數據來源：`/trips/summary` API
   - 建議：獨立組件，可考慮作為卡片組件在多處重用

3. **TripsFilters 組件**（篩選器）
   - 位置：第64-82行
   - 功能區塊：
     - 月份篩選（已在頁面標題區域）
     - 員工篩選（僅管理員可見）
     - 客戶篩選
     - 重置篩選按鈕
   - 建議：獨立組件，可重用於其他需要類似篩選功能的頁面

4. **TripFormModal 組件**（新增/編輯外出登記表單）
   - 位置：第119-173行
   - 功能區塊：
     - 外出日期選擇
     - 目的地輸入
     - 距離輸入（帶補貼計算預覽）
     - 客戶選擇
     - 外出目的輸入
     - 備註輸入
     - 表單驗證
     - 提交處理
   - 建議：獨立組件，使用 `v-model` 控制顯示/隱藏，通過 `props` 傳入編輯數據

5. **SubsidyCalculator 組件**（交通補貼計算器）
   - 位置：第474-479行（calculateSubsidy 函數）、第535-544行（updateSubsidyPreview 函數）
   - 功能：根據距離計算交通補貼（每 5 公里 60 元，向上取整）
   - 建議：獨立 composable 函數（useSubsidyCalculator），可在多處重用

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

創建 `src/api/trips.js` 文件，將所有與外出登記相關的 API 請求抽離：

1. **getCurrentUser()** - 獲取當前用戶信息
   - 位置：第226-232行
   - API：`GET /auth/me`
   - 返回：用戶對象（包含 isAdmin 屬性）

2. **getUsers()** - 獲取用戶列表（管理員用）
   - 位置：第263-280行
   - API：`GET /users`
   - 返回：用戶數組

3. **getClients()** - 獲取客戶列表
   - 位置：第283-299行
   - API：`GET /clients?per_page=1000`
   - 返回：客戶數組

4. **getTrips(params)** - 獲取外出登記列表
   - 位置：第302-375行
   - API：`GET /trips?month=xxx&client_id=xxx&user_id=xxx`
   - 參數：`{ month, client_id, user_id, bypassCache }`
   - 返回：外出登記數組

5. **getTripsSummary(params)** - 獲取外出登記統計摘要
   - 位置：第378-413行
   - API：`GET /trips/summary?month=xxx&user_id=xxx`
   - 參數：`{ month, user_id, bypassCache }`
   - 返回：`{ trip_count, total_distance_km, total_subsidy_twd }`

6. **createTrip(data)** - 創建外出登記
   - 位置：第587-635行（POST 分支）
   - API：`POST /trips`
   - 參數：`{ trip_date, destination, distance_km, client_id, purpose, notes }`
   - 返回：創建的外出登記對象

7. **updateTrip(tripId, data)** - 更新外出登記
   - 位置：第587-635行（PATCH 分支）
   - API：`PATCH /trips/:tripId`
   - 參數：`{ trip_date, destination, distance_km, client_id, purpose, notes }`
   - 返回：更新的外出登記對象

8. **deleteTrip(tripId)** - 刪除外出登記
   - 位置：第638-661行
   - API：`DELETE /trips/:tripId`
   - 返回：刪除結果

### 額外建議：

- 創建 `src/composables/useTrips.js` composable，封裝外出登記的狀態管理邏輯：
  - `trips` - 外出登記列表狀態
  - `summary` - 統計摘要狀態
  - `loading` - 加載狀態
  - `filters` - 篩選條件狀態
  - `pagination` - 分頁狀態
  - `refreshTrips()` - 刷新列表方法
  - `refreshSummary()` - 刷新統計方法

- 創建 `src/utils/subsidyCalculator.js` 工具函數：
  - `calculateSubsidy(distanceKm)` - 計算交通補貼

- 統一錯誤處理：所有 API 請求應使用統一的錯誤處理機制，避免重複的 try-catch 代碼

- 統一加載狀態管理：使用 Vue 的響應式狀態管理加載狀態，避免手動操作 DOM

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立基礎結構與 API 層**

在開始重構這個外出登記頁面時，第一步應該先建立 Vue 3 專案的基礎結構，並將所有與後端 API 互動的邏輯從 HTML 檔案中抽離出來。

具體來說，需要：

1. **創建 API 服務檔案**：將目前散落在 `<script>` 標籤中的所有 `fetch` 請求（例如獲取用戶資訊、載入外出登記列表、創建/更新/刪除外出登記等）整理成獨立的 API 函數，放在 `src/api/trips.js` 檔案中。這樣做的好處是，未來如果需要修改 API 端點或請求方式，只需要在一個地方修改，不會影響到其他地方的程式碼。

2. **創建工具函數**：將交通補貼計算邏輯（根據距離計算補貼金額）抽離成獨立的工具函數，放在 `src/utils/subsidyCalculator.js` 中，方便重複使用和測試。

3. **設置 Vue 3 專案基礎**：確保專案已經安裝並配置好 Vue 3、Ant Design Vue、Vue Router 等必要的套件，並建立基本的專案結構（例如 `src/components`、`src/views`、`src/api` 等目錄）。

4. **創建頁面外殼組件**：建立一個基本的 Vue 頁面組件（例如 `TripsPage.vue`），暫時只包含頁面標題和基本的布局結構，後續再逐步將 HTML 中的各個功能區塊遷移到對應的 Vue 組件中。

完成這一步後，後續的重構工作（例如將 HTML 表格替換為 Ant Design Vue 的表格組件、將手刻的表單替換為 Ant Design Vue 的表單組件等）就會更加順暢，因為所有的數據獲取邏輯已經被整理好，組件只需要調用這些 API 函數即可。

