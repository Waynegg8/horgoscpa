檔案： tasks.html

## 第一部分：可標準化的 UI 組件審計

| 原始元素 | 建議的 antdv 組件 |
|---------|------------------|
| 搜索輸入框（`<input type="search" id="q">`） | `<a-input-search>` 帶 `v-model` 和 `@search` 事件 |
| 年份下拉選擇器（`<select id="f_year">`） | `<a-select>` 帶 `v-model` 和動態 `a-select-option` |
| 月份下拉選擇器（`<select id="f_month">`） | `<a-select>` 帶 `v-model` 和 `a-select-option` |
| 負責人下拉選擇器（`<select id="f_assignee">`） | `<a-select>` 帶 `v-model` 和動態選項 |
| 標籤下拉選擇器（`<select id="f_tags">`） | `<a-select>` 帶 `v-model` 和動態選項 |
| 狀態下拉選擇器（`<select id="f_status">`） | `<a-select>` 帶 `v-model` 和固定選項 |
| 到期狀態下拉選擇器（`<select id="f_due">`） | `<a-select>` 帶 `v-model` 和固定選項 |
| 隱藏已完成複選框（`<input type="checkbox" id="f_hide_completed">`） | `<a-checkbox>` 帶 `v-model` |
| 批量分配按鈕（`<button id="btn-batch-assign">`） | `<a-button type="default">` 帶 `v-if` 控制顯示 |
| 新增任務按鈕（`<button id="btn-new-task">`） | `<a-button type="primary">` |
| 批量分配彈窗（手刻的 `modal-overlay` 和 `modal`） | `<a-modal>` 帶 `v-model:open` 和表單內容 |
| 批量分配負責人下拉（`<select id="batch_assignee">`） | `<a-select>` 帶 `v-model` |
| 批量分配確認/取消按鈕 | `<a-modal>` 的 `@ok` 和 `@cancel` 事件處理 |
| 客戶分組容器（`.client-group`） | `<a-collapse>` 的 `<a-collapse-panel>` |
| 服務分組容器（`.service-group`） | `<a-collapse>` 的嵌套 `<a-collapse-panel>` |
| 任務行（`.task-row`） | `<a-list>` 的 `<a-list-item>` 或 `<a-table>` 的 `<a-table-column>` |
| 任務選擇複選框（`<input type="checkbox">`） | `<a-checkbox>` 帶 `v-model` 綁定到數組 |
| 任務狀態標籤（手刻的 `<span>` 帶樣式） | `<a-tag>` 帶 `color` 屬性（processing/success/error） |
| 查看詳情連結 | `<a>` 或 `<router-link>` |
| 快速新增任務彈窗（手刻的 `#quick-add-modal`） | `<a-modal>` 帶表單內容 |
| 任務類型下拉（`<select id="quick-task-name">`） | `<a-select>` 帶 `v-model` 和動態選項 |
| 快速新增負責人下拉（`<select id="quick-assignee">`） | `<a-select>` 帶 `v-model` |
| 前置任務下拉（`<select id="quick-prerequisite">`） | `<a-select>` 帶 `v-model` 和 `@change` 事件 |
| 到期日輸入（`<input type="date" id="quick-due-date">`） | `<a-date-picker>` 帶 `v-model` 和 `@change` 事件 |
| 後續任務衝突提示區域（手刻的警告框） | `<a-alert type="warning">` 帶動態內容 |
| 自動延後複選框（`<input type="checkbox" id="quick-adjust-subsequent">`） | `<a-checkbox>` 帶 `v-model` |
| 延後天數輸入（`<input type="number" id="quick-delay-days">`） | `<a-input-number>` 帶 `v-model` 和 `min/max` |
| SOP 選擇按鈕 | `<a-button type="default">` |
| SOP 已選擇標籤列表（手刻的 `<span>`） | `<a-tag>` 陣列，帶 `closable` 屬性 |
| 備註文本域（`<textarea id="quick-notes">`） | `<a-textarea>` 帶 `v-model` |
| SOP 選擇彈窗（手刻的 `#quick-sop-modal`） | `<a-modal>` 帶列表內容 |
| SOP 列表項（手刻的 `<div>` 帶點擊事件） | `<a-list>` 的 `<a-list-item>` 或 `<a-checkbox-group>` |
| 空狀態提示（「此客戶目前沒有任務」） | `<a-empty>` 帶自定義描述 |
| 無符合條件提示（「沒有符合條件的任務」） | `<a-empty>` 帶描述 |
| 錯誤提示（`<p id="tasks-error">`） | `<a-alert type="error">` 帶 `v-if` 控制顯示 |
| 進度顯示（「進度：X/Y」） | `<a-progress>` 或手刻的文本顯示 |

## 第二部分：頁面結構（子路由）拆分藍圖

### 父路由 (Parent) 外殼：
**路由路徑：** `/internal/tasks`

**外殼內容：**
- 頂部篩選工具欄（搜索、年份、月份、負責人、標籤、狀態、到期狀態、隱藏已完成複選框、批量分配按鈕、新增任務按鈕）
- 錯誤提示區域
- 任務列表容器（使用 `<router-view>` 或動態組件切換不同視圖）
- 所有共享的彈窗組件（批量分配、快速新增、SOP 選擇）

### 子路由 (Children) 拆分：

1. **任務列表視圖（默認）**
   - **路由：** `/internal/tasks` 或 `/internal/tasks/list`
   - **組件：** `TaskListView.vue`
   - **功能：** 按客戶和服務分組的任務列表，支援展開/折疊、選擇、批量操作

2. **任務看板視圖（可選）**
   - **路由：** `/internal/tasks/board`
   - **組件：** `TaskBoardView.vue`
   - **功能：** 看板式任務管理（待辦/進行中/已完成）

3. **任務日曆視圖（可選）**
   - **路由：** `/internal/tasks/calendar`
   - **組件：** `TaskCalendarView.vue`
   - **功能：** 按日期顯示任務的日曆視圖

**共享組件（Composables/Components）：**
- `BatchAssignModal.vue` - 批量分配彈窗
- `QuickAddTaskModal.vue` - 快速新增任務彈窗
- `SOPSelectorModal.vue` - SOP 選擇彈窗
- `TaskFilterBar.vue` - 篩選工具欄組件
- `TaskGroupList.vue` - 任務分組列表組件（客戶/服務分組邏輯）

## 第三部分：資料與邏輯 (API) 抽離建議

### 建議創建 `composables/useTaskApi.js`：

**應抽離的 API 函數：**

1. **`fetchEmployees()`**
   - 原位置：`loadEmployees()` 函數（第 204-227 行）
   - 返回：員工列表
   - 用途：填充負責人下拉選項

2. **`fetchAllClients(params)`**
   - 原位置：`loadAllClients()` 函數（第 230-241 行）
   - 參數：`{ perPage }`
   - 返回：客戶列表
   - 用途：用於任務分組

3. **`fetchAllTags()`**
   - 原位置：`loadAllTags()` 函數（第 244-257 行）
   - 返回：標籤列表
   - 用途：填充標籤下拉選項

4. **`fetchTasks(params)`**
   - 原位置：`loadAllTasks()` 函數（第 260-284 行）
   - 參數：`{ perPage, service_year, service_month }`
   - 返回：任務列表
   - 用途：載入任務數據

5. **`updateTaskAssignee(taskId, assigneeUserId)`**
   - 原位置：批量分配邏輯（第 584-590 行）
   - 方法：`PUT /tasks/:taskId`
   - 用途：更新任務負責人

6. **`createTask(payload)`**
   - 原位置：`submitQuickTask()` 函數（第 827-832 行）
   - 方法：`POST /tasks`
   - 參數：`{ client_service_id, task_name, assignee_user_id, due_date, prerequisite_task_id, service_month, notes, sop_ids }`
   - 用途：創建新任務

7. **`updateTaskDueDate(taskId, dueDate)`**
   - 原位置：後續任務調整邏輯（第 847-852 行）
   - 方法：`PATCH /tasks/:taskId`
   - 用途：更新任務到期日

8. **`fetchAllSOPs(params)`**
   - 原位置：`loadAllSOPs()` 函數（第 882-897 行）
   - 參數：`{ perPage }`
   - 返回：SOP 列表
   - 用途：SOP 選擇器

9. **`fetchAllServices()`**
   - 原位置：`loadAllServices()` 函數（第 900-910 行）
   - 返回：服務列表
   - 用途：服務相關邏輯

10. **`fetchAllServiceItems()`**
    - 原位置：`loadAllServiceItems()` 函數（第 913-923 行）
    - 返回：服務項目（任務類型）列表
    - 用途：快速新增任務的任務類型選項

**建議的 composable 結構：**

```javascript
// composables/useTaskApi.js
export function useTaskApi() {
  const apiBase = computed(() => {
    const onProdHost = window.location.hostname.endsWith('horgoscpa.com');
    return onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';
  });

  const fetchEmployees = async () => { /* ... */ };
  const fetchAllClients = async (params) => { /* ... */ };
  const fetchAllTags = async () => { /* ... */ };
  const fetchTasks = async (params) => { /* ... */ };
  const updateTaskAssignee = async (taskId, assigneeUserId) => { /* ... */ };
  const createTask = async (payload) => { /* ... */ };
  const updateTaskDueDate = async (taskId, dueDate) => { /* ... */ };
  const fetchAllSOPs = async (params) => { /* ... */ };
  const fetchAllServices = async () => { /* ... */ };
  const fetchAllServiceItems = async () => { /* ... */ };

  return {
    fetchEmployees,
    fetchAllClients,
    fetchAllTags,
    fetchTasks,
    updateTaskAssignee,
    createTask,
    updateTaskDueDate,
    fetchAllSOPs,
    fetchAllServices,
    fetchAllServiceItems
  };
}
```

**業務邏輯抽離建議：**

1. **`composables/useTaskFilter.js`**
   - 抽離：`filterTasks()` 函數（第 287-326 行）
   - 功能：任務篩選邏輯（搜索、負責人、狀態、到期狀態）

2. **`composables/useTaskGrouping.js`**
   - 抽離：`groupByClientAndService()` 函數（第 329-410 行）
   - 功能：按客戶和服務分組任務的邏輯

3. **`composables/useTaskDependency.js`**
   - 抽離：任務依賴關係檢測邏輯（第 637-646 行、第 717-791 行）
   - 功能：檢測前置任務的後續任務、到期日衝突檢測

## 第四部分：重構步驟總結

**第一步：建立基礎架構**

1. 創建 Vue 3 組件文件 `TaskListView.vue`，作為任務列表頁面的主組件
2. 將頁面中的篩選工具欄（搜索框、下拉選擇器、複選框、按鈕）替換為 Ant Design Vue 組件，使用 `v-model` 進行雙向綁定
3. 創建 `composables/useTaskApi.js` 文件，將所有 `fetch` 請求抽離為可復用的函數
4. 使用 Vue 3 的 `ref` 和 `reactive` 管理狀態（`allTasks`、`allClients`、`employeesList` 等）
5. 將手刻的客戶/服務分組列表替換為 `<a-collapse>` 組件，實現展開/折疊功能
6. 將任務行渲染邏輯改為使用 `<a-list>` 或 `<a-table>` 組件
7. 將所有手刻的彈窗（批量分配、快速新增、SOP 選擇）替換為 `<a-modal>` 組件
8. 將表單元素（下拉、日期選擇、文本域）替換為對應的 Ant Design Vue 表單組件
9. 使用 `<a-tag>` 替換手刻的狀態標籤
10. 使用 `<a-empty>` 替換空狀態提示
11. 使用 `<a-alert>` 替換錯誤提示
12. 將任務篩選和分組邏輯抽離到獨立的 composable 函數中
13. 實現響應式更新：當篩選條件改變時，自動重新載入和渲染任務列表

