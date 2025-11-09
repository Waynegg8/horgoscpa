# 頁面分析報告

檔案： leaves.html

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 | 說明 |
|---------|------------------|------|
| 假期記錄表格 (`<table class="leaves-table">`) | `<a-table>` | 使用 a-table 的 columns、dataSource、pagination 配置 |
| 生活事件記錄表格 (`<table class="leaves-table">`) | `<a-table>` | 同樣使用 a-table，可配置操作列（編輯/刪除按鈕） |
| 申請假期對話框 (`<div class="modal-overlay">`) | `<a-modal>` | 使用 a-modal 的 v-model:open、title、footer 配置 |
| 登記生活事件對話框 (`<div class="modal-overlay">`) | `<a-modal>` | 同樣使用 a-modal |
| 假別下拉選單 (`<select id="leave_type">`) | `<a-select>` | 使用 a-select 的 options、v-model 配置 |
| 年份篩選下拉選單 (`<select id="year-filter">`) | `<a-select>` | 使用 a-select |
| 月份篩選下拉選單 (`<select id="month-filter">`) | `<a-select>` | 使用 a-select |
| 假別篩選下拉選單 (`<select id="leave-type-filter">`) | `<a-select>` | 使用 a-select |
| 員工選擇下拉選單 (`<select id="user-select">`) | `<a-select>` | 使用 a-select，可配置 allowClear |
| 事件類型下拉選單 (`<select id="event_type">`) | `<a-select>` | 使用 a-select |
| 開始時間下拉選單 (`<select id="start_time">`) | `<a-time-picker>` 或 `<a-select>` | 建議使用 a-time-picker 更符合時間選擇場景 |
| 結束時間下拉選單 (`<select id="end_time">`) | `<a-time-picker>` 或 `<a-select>` | 建議使用 a-time-picker |
| 請假日期輸入 (`<input type="date">`) | `<a-date-picker>` | 使用 a-date-picker 的 v-model、format 配置 |
| 事件日期輸入 (`<input type="date">`) | `<a-date-picker>` | 使用 a-date-picker |
| 備註文字區 (`<textarea>`) | `<a-textarea>` | 使用 a-textarea 的 maxlength、show-count 配置 |
| 申請假期按鈕 (`<button id="btn-apply">`) | `<a-button type="primary">` | 使用 a-button |
| 登記生活事件按鈕 (`<button id="btn-event">`) | `<a-button>` | 使用 a-button |
| 取消按鈕 (`<button class="btn-secondary">`) | `<a-button>` | 使用 a-button |
| 送出申請按鈕 (`<button class="clients-btn">`) | `<a-button type="primary">` | 使用 a-button，可配置 loading 狀態 |
| 編輯按鈕 (`<button class="btn-edit">`) | `<a-button>` | 使用 a-button，可配置 size="small" |
| 刪除按鈕 (`<button class="btn-delete">`) | `<a-button type="primary" danger>` | 使用 a-button 的 danger 屬性 |
| 餘額總覽卡片 (`<div class="balance-card">`) | `<a-card>` 或自定義組件 | 使用 a-card 的 grid 布局，或創建 BalanceCard 組件 |
| 表單容器 (`<form class="form-grid">`) | `<a-form>` + `<a-row>` + `<a-col>` | 使用 a-form 的 layout、rules 配置，a-row/a-col 實現網格布局 |
| 表單字段標籤和輸入 (`<div class="field">`) | `<a-form-item>` | 使用 a-form-item 的 label、name、rules 配置 |
| 錯誤訊息顯示 (`<div class="field__error">`) | `<a-form-item>` 的 validateStatus | 使用 a-form-item 的 hasFeedback、help 屬性 |
| 提示文字 (`<div class="field__hint">`) | `<a-form-item>` 的 extra | 使用 a-form-item 的 extra 屬性 |
| 工具欄容器 (`<div class="leaves-toolbar">`) | `<a-space>` 或 `<a-row>` + `<a-col>` | 使用 a-space 的 wrap 屬性實現響應式布局 |
| 確認對話框 (`confirm()`) | `<a-modal>` 的 confirm 方法 | 使用 Modal.confirm() 或 a-popconfirm |
| 成功/錯誤提示 (`alert()`) | `<a-message>` | 使用 message.success() 或 message.error() |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊。

### 父路由 (Parent) 外殼：

**路由路徑：** `/internal/leaves` 或 `/leaves`

**外殼內容：**
- 頂部工具欄（篩選器 + 操作按鈕）
  - 員工選擇器（僅管理員可見）
  - 年份篩選器
  - 月份篩選器
  - 假別篩選器
  - 申請假期按鈕
  - 登記生活事件按鈕
- 主內容區域（使用 `<router-view>` 或組件切換）
- 共享狀態管理（當前選中的年份、月份、假別、員工 ID）

### 子路由 (Children) 拆分：

**方案 A：單頁多組件（推薦）**

由於此頁面的三個區塊（餘額總覽、假期記錄、生活事件記錄）邏輯關聯緊密，建議使用**組件拆分**而非路由拆分：

1. **BalanceOverview.vue** - 餘額總覽組件
   - 顯示各種假別的剩餘額度
   - 接收年份和用戶 ID 作為 props
   - 處理補休的特殊顯示邏輯（當月有效，次月轉加班費）

2. **LeaveRecords.vue** - 假期記錄列表組件
   - 顯示假期申請記錄表格
   - 支持編輯和刪除操作
   - 接收篩選條件（年份、月份、假別、用戶 ID）作為 props
   - 發出事件：edit-leave、delete-leave

3. **LifeEventRecords.vue** - 生活事件記錄列表組件
   - 顯示已登記的生活事件
   - 支持刪除操作
   - 接收用戶 ID 作為 props
   - 發出事件：delete-event

4. **ApplyLeaveModal.vue** - 申請假期表單組件（彈窗）
   - 表單字段：假別、請假日期、開始時間、結束時間
   - 自動計算請假時數（扣除午休）
   - 根據性別和生活事件餘額動態顯示可選假別
   - 支持編輯模式（預填充現有數據）

5. **RegisterEventModal.vue** - 登記生活事件表單組件（彈窗）
   - 表單字段：事件類型、事件日期、備註
   - 根據性別過濾事件類型選項

**方案 B：多路由拆分（可選）**

如果未來功能擴展，可考慮拆分為：

- `/leaves` - 主頁（顯示餘額總覽 + 假期記錄）
- `/leaves/events` - 生活事件管理頁（獨立頁面）

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

創建 `src/api/leavesApi.js` 或 `src/composables/useLeavesApi.js`，將所有 API 請求抽離：

#### 應該被抽離的函數：

1. **getLeavesBalances(year, userId?)**
   - 對應：`GET /leaves/balances?year={year}&user_id={userId}`
   - 用途：獲取假期餘額
   - 返回：Promise<Balance[]>

2. **getLeavesList(params)**
   - 對應：`GET /leaves?page=1&perPage=1000&type={type}&user_id={userId}`
   - 用途：獲取假期記錄列表
   - 參數：{ page, perPage, type, user_id }
   - 返回：Promise<Leave[]>

3. **createLeave(payload)**
   - 對應：`POST /leaves`
   - 用途：創建假期申請
   - 參數：{ leave_type, start_date, start_time, end_time, amount }
   - 返回：Promise<Leave>

4. **updateLeave(leaveId, payload)**
   - 對應：`PUT /leaves/{leaveId}`
   - 用途：更新假期申請
   - 參數：leaveId, payload（同 createLeave）
   - 返回：Promise<Leave>

5. **deleteLeave(leaveId)**
   - 對應：`DELETE /leaves/{leaveId}`
   - 用途：刪除假期申請
   - 返回：Promise<void>

6. **getLifeEvents(userId?)**
   - 對應：`GET /leaves/life-events?user_id={userId}`
   - 用途：獲取生活事件列表
   - 返回：Promise<LifeEvent[]>

7. **createLifeEvent(payload)**
   - 對應：`POST /leaves/life-events`
   - 用途：登記生活事件
   - 參數：{ event_type, event_date, notes }
   - 返回：Promise<LifeEvent>

8. **deleteLifeEvent(eventId)**
   - 對應：`DELETE /leaves/life-events/{eventId}`
   - 用途：刪除生活事件
   - 返回：Promise<void>

9. **getUsers()**（如果尚未抽離）
   - 對應：`GET /users`
   - 用途：獲取員工列表（管理員用）
   - 返回：Promise<User[]>

#### 建議的檔案結構：

```
src/
  api/
    leavesApi.js          # 所有假期相關的 API 請求函數
  composables/
    useLeaves.js          # 假期管理的組合式函數（包含狀態、加載邏輯）
    useLifeEvents.js      # 生活事件管理的組合式函數
    useLeaveFilters.js    # 篩選器狀態管理
  utils/
    leaveCalculator.js    # 請假時數計算邏輯（calculateHours）
    leaveTypeFilter.js    # 假別過濾邏輯（根據性別、生活事件）
```

#### 額外建議：

- 使用 **axios** 或 **fetch wrapper** 統一處理錯誤（401 重定向、錯誤訊息顯示）
- 使用 **Pinia** 管理全局狀態（當前用戶信息、管理員權限、性別等）
- 將時間選項生成邏輯（`populateTimeOptions`）抽離到 `utils/timeOptions.js`
- 將假別、狀態、事件類型的翻譯映射（`zhType`, `zhStatus`, `zhEventType`）抽離到 `constants/leaveTypes.js`

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

### 第一步：建立基礎架構和 API 層

**具體行動：**

1. **創建 API 服務檔案**
   - 在 `src/api/` 目錄下創建 `leavesApi.js`
   - 將所有 `fetch` 請求抽離為獨立的函數
   - 統一錯誤處理邏輯（401 重定向、錯誤提示）

2. **創建常量檔案**
   - 在 `src/constants/` 目錄下創建 `leaveTypes.js`
   - 將假別翻譯（`zhType`）、狀態翻譯（`zhStatus`）、事件類型翻譯（`zhEventType`）定義為常量

3. **創建工具函數檔案**
   - 在 `src/utils/` 目錄下創建 `leaveCalculator.js`
   - 將請假時數計算邏輯（`calculateHours`）抽離為純函數
   - 創建 `timeOptions.js`，將時間選項生成邏輯抽離

4. **設置 Pinia Store（可選，但建議）**
   - 創建 `src/stores/user.js` 管理當前用戶信息（性別、管理員權限）
   - 創建 `src/stores/leaves.js` 管理假期相關的全局狀態（如果需要）

**完成標準：**
- 所有 API 請求都有對應的函數封裝
- 錯誤處理統一且可靠
- 常量和工具函數可以被其他組件復用
- 代碼可以通過單元測試

**預期時間：** 2-3 小時

**下一步：** 創建 Vue 組件並逐步遷移 UI 和邏輯
