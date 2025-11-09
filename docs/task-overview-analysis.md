# 頁面分析報告

檔案： task-overview.html

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|------------------|
| 月份標籤按鈕（month-tag） | `<a-radio-group>` + `<a-radio-button>` 或 `<a-select mode="multiple">` |
| 自定義月份輸入框（input[type="month"]） | `<a-date-picker mode="month" mode="multiple">` |
| 搜索輸入框（taskOverviewSearch） | `<a-input search>` |
| 狀態篩選複選框（status-filter） | `<a-checkbox-group>` + `<a-checkbox>` |
| 來源篩選複選框（source-filter） | `<a-checkbox-group>` + `<a-checkbox>` |
| 篩選卡片容器（.card） | `<a-card>` |
| 統計摘要卡片（taskOverviewStats） | `<a-row>` + `<a-col>` + `<a-statistic>` |
| 客戶分組容器（.client-group） | `<a-collapse>` + `<a-collapse-panel>` |
| 服務分組容器（.service-group） | `<a-collapse>` + `<a-collapse-panel>`（嵌套） |
| 任務卡片（.task-card） | `<a-card>` 或自定義組件使用 `<a-space>`、`<a-tag>` 布局 |
| 狀態下拉按鈕（.status-button + .status-menu） | `<a-dropdown>` + `<a-menu>` |
| 狀態圖標標籤 | `<a-tag>` + `color` 屬性 |
| 批量操作複選框 | `<a-checkbox>` |
| 批量操作欄（batchActionsBar） | `<a-alert>` 或 `<a-space>` 包裹的操作欄 |
| 任務操作按鈕組（.task-actions） | `<a-space>` + `<a-button>` |
| 載入中狀態（loading-spinner） | `<a-spin>` |
| 空狀態顯示（無數據提示） | `<a-empty>` |
| 批量操作對話框（overlay + dialog） | `<a-modal>` |
| 狀態選擇下拉框（batchStatusSelect） | `<a-select>` |
| 日期輸入框（batchDueDateInput） | `<a-date-picker>` |
| 負責人選擇下拉框（batchAssigneeSelect） | `<a-select>` |
| 調整原因文本域（batchDueDateReason） | `<a-textarea>` |
| 確認/取消按鈕組 | `<a-space>` + `<a-button type="primary">` 和 `<a-button>` |
| 逾期提示標籤 | `<a-tag color="red">` |
| 自動生成/手動建立標籤 | `<a-tag color="blue">` / `<a-tag color="green">` |
| 統計數字顯示 | `<a-statistic>` |
| 折疊圖標（collapse-icon） | `<a-collapse>` 內建圖標 |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊。

### 父路由 (Parent) 外殼

**路由路徑**：`/internal/task-overview`

**外殼內容**：
- 頁面標題區（「📊 任務總覽」標題 + 最後更新時間 + 立即刷新按鈕）
- 篩選器組件容器（TaskOverviewFilters）
- 統計摘要組件容器（TaskOverviewStats）
- 任務列表組件容器（TaskOverviewList）
- 全局狀態管理（選中的月份、篩選條件、批量選擇的任務）

### 子路由 (Children) 拆分

**建議拆分的組件（非路由，而是 Vue 組件）**：

1. **TaskOverviewFilters.vue**（篩選器組件）
   - 月份選擇器（本月、上月、自定義月份）
   - 搜索框（客戶名稱）
   - 狀態篩選（待處理、進行中、已完成、已取消）
   - 來源篩選（自動生成、手動建立）
   - 快速篩選按鈕（本月、上月、最近3個月、本月+上月、清除）
   - 操作按鈕（套用篩選、全部展開、全部折疊、只展開逾期）
   - 批量操作模式開關

2. **TaskOverviewStats.vue**（統計摘要組件）
   - 總任務數、未完成數、已完成數、逾期數
   - 自動生成數、手動建立數
   - 選中月份顯示

3. **TaskOverviewList.vue**（任務列表主組件）
   - 客戶分組容器
   - 服務分組容器
   - 任務卡片列表
   - 空狀態顯示

4. **ClientGroup.vue**（客戶分組組件）
   - 客戶標題欄（公司名稱、統編、任務統計）
   - 逾期提示標籤
   - 折疊/展開控制
   - 客戶級別批量選擇複選框

5. **ServiceGroup.vue**（服務分組組件）
   - 服務標題欄（服務名稱、月份、任務統計）
   - 折疊/展開控制
   - 服務級別批量選擇複選框

6. **TaskCard.vue**（任務卡片組件）
   - 任務標題、狀態標籤
   - 任務元數據（負責人、到期日、進度、任務ID）
   - 任務備註
   - 任務操作按鈕（查看詳情、調整到期日、記錄逾期原因）
   - 任務級別批量選擇複選框
   - 狀態下拉菜單

7. **BatchActionsBar.vue**（批量操作欄組件）
   - 已選擇任務數量顯示
   - 批量變更狀態按鈕
   - 批量調整到期日按鈕
   - 批量分配負責人按鈕
   - 清除選擇按鈕

8. **BatchStatusModal.vue**（批量狀態修改對話框）
   - 狀態選擇下拉框
   - 確認/取消按鈕

9. **BatchDueDateModal.vue**（批量到期日調整對話框）
   - 日期選擇器
   - 調整原因文本域
   - 確認/取消按鈕

10. **BatchAssigneeModal.vue**（批量負責人分配對話框）
    - 負責人選擇下拉框
    - 確認/取消按鈕

11. **TaskStatusDropdown.vue**（任務狀態下拉組件）
    - 狀態顯示按鈕
    - 狀態選擇菜單
    - 狀態變更處理

12. **AdjustDueDateModal.vue**（單任務到期日調整對話框）
    - 日期輸入
    - 調整原因輸入
    - 確認/取消按鈕

13. **RecordOverdueReasonModal.vue**（記錄逾期原因對話框）
    - 原因輸入文本域
    - 確認/取消按鈕

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議

**創建 `src/composables/useTaskOverviewApi.js`**，抽離以下 API 函數：

1. **`fetchTaskOverview(params)`**
   - 對應：`loadTaskOverview()` 中的 `/internal/api/v1/tasks/overview` 請求
   - 參數：`{ months, statuses, sources, search }`
   - 返回：任務列表數據

2. **`updateTaskStatus(taskId, status, completedDate)`**
   - 對應：`changeTaskStatus()` 中的 `PATCH /internal/api/v1/tasks/${taskId}` 請求
   - 參數：任務ID、新狀態、完成日期（可選）
   - 返回：更新結果

3. **`adjustTaskDueDate(taskId, newDate, reason)`**
   - 對應：`adjustDueDate()` 中的 `PATCH /internal/api/v1/tasks/${taskId}` 請求
   - 參數：任務ID、新到期日、調整原因
   - 返回：更新結果

4. **`recordOverdueReason(taskId, reason)`**
   - 對應：`recordOverdueReason()` 中的 `PATCH /internal/api/v1/tasks/${taskId}` 請求
   - 參數：任務ID、逾期原因
   - 返回：更新結果

5. **`batchUpdateTaskStatus(taskIds, status)`**
   - 對應：`batchChangeStatus()` 中的 `POST /internal/api/v1/tasks/${taskId}/update-status` 請求
   - 參數：任務ID數組、新狀態
   - 返回：批量更新結果

6. **`batchAdjustTaskDueDate(taskIds, newDate, reason)`**
   - 對應：`batchChangeDueDate()` 中的 `POST /internal/api/v1/tasks/${taskId}/adjust-due-date` 請求
   - 參數：任務ID數組、新到期日、調整原因
   - 返回：批量更新結果

7. **`batchUpdateTaskAssignee(taskIds, assigneeId)`**
   - 對應：`batchChangeAssignee()` 中的 `PATCH /internal/api/v1/tasks/${taskId}` 請求
   - 參數：任務ID數組、負責人ID（可為null）
   - 返回：批量更新結果

8. **`fetchUsers()`**
   - 對應：`batchChangeAssignee()` 中的 `/internal/api/v1/users` 請求
   - 返回：用戶列表數據

**創建 `src/composables/useTaskOverviewFilters.js`**，抽離篩選邏輯：

1. **篩選狀態管理**
   - `selectedMonths`（選中的月份）
   - `selectedStatuses`（選中的狀態）
   - `selectedSources`（選中的來源）
   - `searchText`（搜索關鍵詞）

2. **篩選持久化**
   - `saveFilters()`（保存篩選條件到 localStorage）
   - `restoreFilters()`（從 localStorage 恢復篩選條件）

3. **快速篩選函數**
   - `selectQuickMonths(type)`（快速選擇月份）
   - `quickSelectStatus(type)`（快速選擇狀態）

**創建 `src/composables/useTaskOverviewBatch.js`**，抽離批量操作邏輯：

1. **批量選擇狀態管理**
   - `batchSelectedTasks`（選中的任務ID數組）
   - `isBatchModeEnabled`（批量模式開關）

2. **批量選擇函數**
   - `toggleTaskBatch(taskId)`（切換單個任務選擇）
   - `toggleServiceBatch(clientId, serviceName, serviceMonth)`（切換服務級別選擇）
   - `toggleClientBatch(clientId)`（切換客戶級別選擇）
   - `clearBatchSelection()`（清除所有選擇）
   - `updateBatchCount()`（更新批量選擇數量）

**創建 `src/utils/taskOverviewHelpers.js`**，抽離工具函數：

1. **`calculateOverdueDays(dueDate)`**
   - 計算逾期天數

2. **`groupTasksByClient(tasks)`**
   - 按客戶分組任務

3. **`groupTasksByService(tasks)`**
   - 按服務分組任務

4. **`formatTaskStats(tasks)`**
   - 計算任務統計數據（總數、未完成、已完成、逾期等）

## 第四部分：重構步驟總結

### 第一步：建立基礎結構和 API 層

1. **創建 Vue 3 專案結構**（如果尚未建立）
   - 設置 Vue 3 + Ant Design Vue
   - 配置路由（Vue Router）
   - 設置 API 請求封裝（axios 或 fetch wrapper）

2. **抽離 API 函數**
   - 創建 `src/composables/useTaskOverviewApi.js`
   - 將所有 fetch 請求遷移到該文件
   - 統一錯誤處理和響應格式化

3. **創建篩選邏輯 Composables**
   - 創建 `src/composables/useTaskOverviewFilters.js`
   - 實現篩選狀態管理和持久化
   - 實現快速篩選函數

4. **創建批量操作 Composables**
   - 創建 `src/composables/useTaskOverviewBatch.js`
   - 實現批量選擇狀態管理
   - 實現批量選擇函數

5. **創建工具函數**
   - 創建 `src/utils/taskOverviewHelpers.js`
   - 實現數據處理和計算函數

### 第二步：構建基礎組件

1. **創建篩選器組件**
   - 實現 `TaskOverviewFilters.vue`
   - 使用 Ant Design Vue 組件替換原生 HTML 元素
   - 連接篩選邏輯 Composables

2. **創建統計摘要組件**
   - 實現 `TaskOverviewStats.vue`
   - 使用 `<a-statistic>` 顯示統計數據

3. **創建任務卡片組件**
   - 實現 `TaskCard.vue`
   - 使用 `<a-card>`、`<a-tag>`、`<a-dropdown>` 等組件
   - 實現狀態修改、到期日調整等功能

### 第三步：構建列表組件

1. **創建客戶分組組件**
   - 實現 `ClientGroup.vue`
   - 使用 `<a-collapse>` 實現折疊功能

2. **創建服務分組組件**
   - 實現 `ServiceGroup.vue`
   - 嵌套在客戶分組內

3. **創建任務列表組件**
   - 實現 `TaskOverviewList.vue`
   - 整合客戶分組和服務分組組件
   - 實現空狀態顯示

### 第四步：實現批量操作功能

1. **創建批量操作欄組件**
   - 實現 `BatchActionsBar.vue`
   - 連接批量操作邏輯 Composables

2. **創建批量操作對話框組件**
   - 實現 `BatchStatusModal.vue`
   - 實現 `BatchDueDateModal.vue`
   - 實現 `BatchAssigneeModal.vue`
   - 使用 `<a-modal>` 組件

### 第五步：整合主頁面

1. **創建任務總覽主頁面**
   - 實現 `TaskOverview.vue`
   - 整合所有子組件
   - 實現頁面級狀態管理
   - 連接所有 Composables 和 API

2. **配置路由**
   - 在路由配置中添加任務總覽頁面路由

3. **測試和優化**
   - 測試所有功能
   - 優化性能和用戶體驗
   - 修復 bug

### 重構優先級建議

**高優先級**：
- API 層抽離（第一步）
- 基礎組件構建（第二步）
- 主頁面整合（第五步）

**中優先級**：
- 列表組件構建（第三步）
- 批量操作功能（第四步）

**低優先級**：
- 性能優化
- 動畫效果
- 細節體驗優化

