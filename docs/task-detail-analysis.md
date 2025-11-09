# 頁面分析報告

檔案： task-detail.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 基本信息卡片（第52-142行，class="content-card"） | `<a-card>`，使用 `title` slot 顯示「基本信息」標題 |
| 表單字段容器（第54-96行，class="form-row-2col"） | `<a-row>` + `<a-col :span="12">`，使用 24 欄網格系統 |
| 任務名稱輸入框（第57行，readonly input） | `<a-input>`，使用 `readonly` 屬性，或使用 `<a-typography-text>` 純顯示 |
| 狀態選擇器（第61-65行，disabled select） | `<a-select>`，使用 `disabled` 屬性，狀態為唯讀時可改用 `<a-tag>` 顯示 |
| 客戶名稱輸入框（第72行，readonly input） | `<a-input>` 或 `<a-typography-text>` |
| 負責人下拉選單（第76-78行） | `<a-select>`，使用 `v-model` 綁定、`options` 配置，支援搜索 |
| 前置任務輸入框（第84行，readonly input） | `<a-input>` 或 `<a-typography-text>` |
| 手刻進度條（第90-93行，class="progress-bar"） | `<a-progress>`，使用 `:percent` 綁定百分比，`:format` 自定義顯示文字 |
| 到期日日期選擇器（第100行，readonly date input） | `<a-date-picker>`，使用 `disabled` 屬性，或使用 `<a-typography-text>` 純顯示 |
| 原始到期日輸入框（第108行） | `<a-date-picker>` 或 `<a-typography-text>` |
| 調整資訊徽章（第102-103行，手刻 badge） | `<a-badge>` 或 `<a-tag>`，使用 `color` 屬性 |
| 狀態說明文字區域（第115行，readonly textarea） | `<a-textarea>` 或 `<a-typography-paragraph>` |
| 阻礙原因區塊（第120-125行，條件顯示的紅色邊框區塊） | `<a-alert type="error">`，使用 `v-if` 條件渲染 |
| 逾期原因區塊（第127-132行） | `<a-alert type="warning">` |
| 操作按鈕組（第134-141行，兩個按鈕） | `<a-button>`，使用 `type="primary"` 和 `type="default"` |
| 關聯的 SOP 卡片（第145-153行） | `<a-card>`，使用 `title` slot 和 `extra` slot（放置「管理 SOP」按鈕） |
| SOP 列表容器（第150-152行，class="sop-list"） | `<a-list>` + `<a-list-item>`，使用 `:data-source` 綁定數據，每個項目顯示標題、分類、版本 |
| SOP 項目中的「查看」按鈕（第491行） | `<a-button type="link">` 或 `<a>` 標籤 |
| 任務文檔卡片（第156-180行） | `<a-card>`，使用 `title` slot 和 `extra` slot（放置「上傳文檔」按鈕） |
| 文檔表格（第162-178行，class="data-table"） | `<a-table>`，使用 `:columns` 定義列，`:data-source` 綁定數據，`:loading` 控制加載狀態 |
| 表格中的「載入中」文字（第175行） | 使用 `<a-table>` 的 `:loading` 屬性，或使用 `<a-spin>` 包裹表格 |
| 表格中的「尚無文檔」空狀態（第520行） | `<a-empty>`，使用 `description` 屬性自定義提示文字 |
| 管理 SOP 彈窗（第186-205行，手刻 modal） | `<a-modal>`，使用 `v-model:open` 控制顯示，`title` 屬性設置標題 |
| SOP 選擇列表（第195-197行，手刻 checkbox list） | `<a-checkbox-group>` + `<a-checkbox>`，使用 `v-model` 綁定選中的 SOP IDs |
| SOP 分類分組顯示（第920-939行，按分類分組） | 使用 `<a-divider>` 分隔分類，或使用 `<a-collapse>` 折疊面板 |
| 更新狀態彈窗（第208-300行，手刻 modal） | `<a-modal>`，使用 `width="600"`，`:footer="null"` 自定義底部按鈕 |
| 逾期警告區塊（第216-225行，紅色背景警告） | `<a-alert type="warning">`，使用 `show-icon` 顯示圖標 |
| 狀態選擇下拉選單（第229-233行） | `<a-select>`，使用 `v-model` 綁定，`options` 配置選項 |
| 進度說明文字區域（第239行） | `<a-textarea>`，使用 `:rows="3"`，`:placeholder` 設置提示文字 |
| 逾期原因文字區域（第244行，紅色邊框） | `<a-textarea>`，使用 `status="error"` 顯示錯誤狀態 |
| 阻礙原因文字區域（第250行） | `<a-textarea>` |
| 正式到期日區塊（第255-277行，灰色背景卡片） | `<a-card :bordered="true">`，使用 `size="small"` |
| 當前到期日顯示（第263行，只讀顯示） | `<a-typography-text>` 或 `<a-input>` 使用 `readonly` |
| 到期日日期選擇器（第268行） | `<a-date-picker>`，使用 `style="width: 100%"`，`v-model` 綁定 |
| 到期日變更原因區塊（第272-276行，條件顯示） | `<a-form-item>`，使用 `v-if` 條件渲染，`:rules` 設置必填驗證 |
| 預計完成日期選擇器（第282行） | `<a-date-picker>` |
| 預計日期變更原因區塊（第289-293行） | `<a-form-item>`，使用 `v-if` 條件渲染 |
| 彈窗底部按鈕組（第295-298行） | `<a-button>`，使用 `type="primary"` 和 `type="default"` |
| 文件上傳隱藏 input（第304行） | `<a-upload>`，使用 `:show-upload-list="false"`，`:before-upload` 處理上傳邏輯 |
| 上傳進度提示（第1011-1022行，手刻進度彈窗） | `<a-modal>` + `<a-progress>`，使用 `:percent` 綁定上傳進度，或使用 `<a-upload>` 的內建進度顯示 |
| 變更歷史彈窗（第880-893行，動態創建的 modal） | `<a-modal>`，使用 `width="650"`，內容使用 `<a-timeline>` 或 `<a-list>` 顯示歷史記錄 |
| 變更歷史中的到期日調整記錄（第835-852行） | `<a-timeline-item>`，使用 `color="blue"`，內容使用 `<a-descriptions>` 顯示詳細信息 |
| 變更歷史中的狀態更新記錄（第858-874行） | `<a-timeline-item>`，使用 `color="green"` |
| 狀態標籤（第810-814行，statusLabels 對象） | `<a-tag>`，使用 `color` 屬性（processing/success/error） |
| 調整類型標籤（第826-831行，typeLabels 對象） | `<a-tag>`，使用不同的 `color` 和圖標 |
| 天數變化標籤（第845-847行，手刻 badge） | `<a-tag>`，使用條件 `color`（red/green） |
| 「載入中」文字提示（第151行、第175行等） | `<a-spin>` 或 `<a-skeleton>`，使用 `:spinning="loading"` 控制 |
| 「返回任務列表」連結（第49行） | `<a-button type="link">` 或使用 Vue Router 的 `<router-link>` |
| 表單提示文字（第66行、第85行等，灰色小字） | `<a-typography-text type="secondary">`，使用 `:style="{ fontSize: '12px' }"` |
| 手刻表格操作按鈕（第532-533行，下載和刪除按鈕） | `<a-button type="link">`，使用 `danger` 屬性標記刪除按鈕 |
| 確認刪除對話框（第1126行，confirm） | `<a-popconfirm>`，使用 `title` 設置提示文字，`@confirm` 處理確認事件 |
| 成功/失敗提示（第751行、第757行等，alert） | `<a-message>` 或 `<a-notification>`，使用 `success`/`error` 類型 |
| 內聯樣式的大量使用（如第89-93行、第101-104行等） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和 CSS 類 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**TaskDetail 主頁面外殼**應包含：
- 頁面標題區域（返回按鈕、任務ID獲取與驗證，第319-326行）
- 路由參數處理（從 URL 獲取任務ID，第319-320行）
- 權限檢查與錯誤處理（401 重定向邏輯，多處出現）
- 頁面級加載狀態（使用 `<a-spin>` 包裹整個頁面內容）
- 錯誤邊界處理（404 任務不存在時的處理，第380-384行）
- 數據初始化邏輯（並行載入用戶列表、SOP列表、任務詳情、任務SOP、任務文檔，第328-334行）

### 子路由 (Children) 拆分：

1. **TaskBasicInfo 組件**（任務基本信息）
   - 位置：第52-142行
   - 功能區塊：
     - 任務名稱、狀態、客戶、負責人
     - 前置任務、進度條
     - 到期日、原始到期日、到期日調整資訊
     - 狀態說明、阻礙原因、逾期原因（條件顯示）
     - 操作按鈕（更新狀態說明、查看變更歷史）
   - 建議：獨立組件，使用 `<a-card>` + `<a-descriptions>` 或 `<a-form>` 展示
   - 路由：可作為主頁面的默認顯示內容，不需要子路由

2. **TaskSOPList 組件**（關聯的 SOP）
   - 位置：第145-153行
   - 功能區塊：
     - SOP 列表顯示
     - 「管理 SOP」按鈕
     - 管理 SOP 彈窗（第186-205行）
   - 建議：獨立組件，包含列表顯示和管理功能
   - 路由：可作為主頁面的一個區塊，不需要子路由
   - 子組件：`ManageSOPModal` 組件（管理 SOP 彈窗）

3. **TaskDocuments 組件**（任務文檔）
   - 位置：第156-180行
   - 功能區塊：
     - 文檔表格顯示
     - 「上傳文檔」按鈕
     - 文件上傳邏輯（第997-1089行）
     - 文件下載邏輯（第1092-1122行）
     - 文件刪除邏輯（第1125-1153行）
   - 建議：獨立組件，使用 `<a-table>` 顯示文檔列表，使用 `<a-upload>` 處理上傳
   - 路由：可作為主頁面的一個區塊，不需要子路由
   - 子組件：可考慮將上傳、下載、刪除邏輯抽離為 composable

4. **UpdateStatusModal 組件**（更新狀態彈窗）
   - 位置：第208-300行、第545-759行
   - 功能區塊：
     - 任務狀態選擇
     - 進度說明輸入
     - 逾期原因輸入（條件顯示）
     - 阻礙原因輸入
     - 正式到期日調整（條件顯示變更原因）
     - 預計完成日期（條件顯示變更原因）
     - 表單驗證邏輯（第655-666行）
     - 提交邏輯（第632-759行，包含到期日調整和狀態更新兩個 API 調用）
   - 建議：獨立組件，使用 `<a-modal>` + `<a-form>`，使用 `<a-form-item>` 進行表單驗證
   - 路由：作為彈窗組件，不需要路由

5. **AdjustmentHistoryModal 組件**（變更歷史彈窗）
   - 位置：第762-899行
   - 功能區塊：
     - 變更歷史列表顯示
     - 到期日調整記錄（第824-852行）
     - 狀態更新記錄（第853-875行）
     - 歷史記錄格式化（第783-807行）
   - 建議：獨立組件，使用 `<a-modal>` + `<a-timeline>` 或 `<a-list>` 顯示歷史記錄
   - 路由：作為彈窗組件，不需要路由

6. **TaskProgress 組件**（任務進度顯示）
   - 位置：第87-95行、第455-460行
   - 功能：顯示任務進度（已完成階段數/總階段數，進度百分比）
   - 建議：獨立組件，使用 `<a-progress>`，可在多處重用
   - 路由：作為子組件，不需要路由

7. **DueDateAdjustmentInfo 組件**（到期日調整資訊）
   - 位置：第101-104行、第433-442行
   - 功能：顯示到期日調整次數和最後調整日期
   - 建議：獨立組件，使用 `<a-badge>` 或 `<a-tag>` 顯示
   - 路由：作為子組件，不需要路由

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useTaskApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchTaskDetail(taskId)` 函數**
   - 位置：第371-453行的 `loadTaskDetail` 函數
   - 功能：獲取任務詳情
   - 參數：`taskId: string | number`
   - 返回：`Promise<TaskDetail>`
   - 錯誤處理：統一處理 401、404 錯誤
   - 建議使用 `useRequest` 或 `useQuery`（如果使用 Vue Query）進行請求管理

2. **`fetchUsers()` 函數**
   - 位置：第338-354行的 `loadUsers` 函數
   - 功能：獲取員工列表
   - 返回：`Promise<User[]>`
   - 建議：此函數可能已存在於 `useUserApi.js` 中，可重用

3. **`fetchAllSOPs(params?)` 函數**
   - 位置：第357-368行的 `loadAllSOPs` 函數
   - 功能：獲取所有 SOP 列表
   - 參數：`{ perPage?: number }`（可選）
   - 返回：`Promise<SOP[]>`
   - 建議：此函數可能已存在於 `useSOPApi.js` 中，可重用

4. **`fetchTaskSOPs(taskId)` 函數**
   - 位置：第463-500行的 `loadTaskSOPs` 函數
   - 功能：獲取任務關聯的 SOP 列表
   - 參數：`taskId: string | number`
   - 返回：`Promise<SOP[]>`
   - 建議：獨立函數，或作為 `fetchTaskDetail` 的擴展

5. **`fetchTaskDocuments(taskId)` 函數**
   - 位置：第503-542行的 `loadTaskDocuments` 函數
   - 功能：獲取任務文檔列表
   - 參數：`taskId: string | number`
   - 返回：`Promise<Document[]>`
   - 建議：此函數可能已存在於 `useDocumentApi.js` 中，可重用

6. **`updateTaskStatus(taskId, data)` 函數**
   - 位置：第716-721行的 API 調用
   - 功能：更新任務狀態
   - 參數：
     - `taskId: string | number`
     - `data: { status: string, progress_note?: string, overdue_reason?: string, blocker_reason?: string, expected_completion_date?: string }`
   - 返回：`Promise<void>`
   - 錯誤處理：統一處理錯誤，返回結構化錯誤信息

7. **`adjustTaskDueDate(taskId, data)` 函數**
   - 位置：第679-684行的 API 調用
   - 功能：調整任務到期日
   - 參數：
     - `taskId: string | number`
     - `data: { new_due_date: string, reason: string }`
   - 返回：`Promise<void>`
   - 錯誤處理：統一處理錯誤

8. **`fetchTaskAdjustmentHistory(taskId)` 函數**
   - 位置：第764-766行的 API 調用
   - 功能：獲取任務變更歷史
   - 參數：`taskId: string | number`
   - 返回：`Promise<AdjustmentHistory[]>`
   - 建議：獨立函數

9. **`updateTaskSOPs(taskId, sopIds)` 函數**
   - 位置：第967-972行的 API 調用
   - 功能：更新任務關聯的 SOP
   - 參數：
     - `taskId: string | number`
     - `sopIds: number[]`
   - 返回：`Promise<void>`
   - 建議：獨立函數

10. **`uploadTaskDocument(taskId, file)` 函數**
    - 位置：第1026-1071行的上傳邏輯
    - 功能：上傳任務文檔
    - 參數：
      - `taskId: string | number`
      - `file: File`
      - `onProgress?: (percent: number) => void`（可選，上傳進度回調）
    - 返回：`Promise<Document>`
    - 建議：此函數可能已存在於 `useDocumentApi.js` 中，可重用，但需要傳入 `related_entity_type` 和 `related_entity_id` 參數

11. **`downloadDocument(fileUrl)` 函數**
    - 位置：第1094-1096行的 API 調用
    - 功能：下載文檔
    - 參數：`fileUrl: string`
    - 返回：`Promise<Blob>`
    - 建議：此函數可能已存在於 `useDocumentApi.js` 中，可重用

12. **`deleteDocument(documentId)` 函數**
    - 位置：第1129-1132行的 API 調用
    - 功能：刪除文檔
    - 參數：`documentId: string | number`
    - 返回：`Promise<void>`
    - 建議：此函數可能已存在於 `useDocumentApi.js` 中，可重用

13. **格式化工具函數**（可選，抽離到 `src/utils/formatters.js`）
    - `formatDateTime(dateStr: string): string`（第1167-1177行）
    - `formatFileSize(bytes: number): string`（第1179-1183行）
    - `getCategoryText(category: string): string`（第1156-1165行）
    - `formatDate(dateStr: string): string`（第783-791行，在 `showAdjustmentHistory` 中定義）
    - `formatDateTimeForHistory(dt: string): string`（第794-807行，在 `showAdjustmentHistory` 中定義）

14. **狀態管理**（建議使用 Pinia）
    - 創建 `stores/task.js` store
    - 管理以下狀態：
      - `currentTaskId: string | number | null`：當前查看的任務ID
      - `currentTask: TaskDetail | null`：當前任務詳情
      - `taskSOPs: SOP[]`：任務關聯的 SOP 列表
      - `taskDocuments: Document[]`：任務文檔列表
      - `loading: boolean`：加載狀態
      - `error: string | null`：錯誤信息

15. **表單驗證邏輯**（可抽離到 composable 或 utils）
    - 創建 `src/composables/useTaskStatusForm.js`
    - 封裝狀態更新表單的驗證邏輯：
      - 逾期任務必須填寫逾期原因（第655-659行）
      - 到期日變更必須填寫變更原因（第662-666行）
    - 使用 Ant Design Vue 的 `<a-form>` 表單驗證規則

16. **錯誤處理統一化**
    - 在 API 服務層統一處理 401 錯誤（重定向到登錄頁）
    - 統一處理網絡錯誤、解析錯誤等
    - 使用 `<a-message>` 或 `<a-notification>` 顯示錯誤提示，取代 `alert`

17. **請求攔截器**（可選）
    - 創建 `src/utils/request.js`，封裝 `fetch` 或使用 `axios`
    - 統一處理請求頭、認證、錯誤處理等
    - 支援請求/響應攔截器

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與數據管理**

在開始重構 UI 之前，首先應該將所有的數據獲取和操作邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useTaskApi.js`）來處理所有與任務相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取任務詳情、獲取員工列表、獲取 SOP 列表、上傳文檔、更新狀態等）都移動到這個檔案中。同時，檢查是否已經存在類似的 API 服務檔案（例如 `useDocumentApi.js`、`useSOPApi.js`、`useUserApi.js`），如果存在，則重用這些檔案中的函數，避免重複編寫。

2. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（例如 401 未授權時重定向到登錄頁、404 任務不存在、網絡錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。使用統一的錯誤提示組件（例如 Ant Design Vue 的 `<a-message>`）取代原生的 `alert`。

3. **建立數據格式化工具**：將所有的數據格式化函數（例如格式化日期時間、格式化文件大小、獲取分類文字）從頁面中抽離出來，放在一個共用的工具檔案中（例如 `formatters.js`），這樣其他頁面也可以重用這些函數。

4. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理任務詳情頁面的狀態（例如當前任務ID、任務詳情、任務SOP列表、任務文檔列表、加載狀態、錯誤信息等），這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化。同時，可以使用 Vue Query 或類似的庫來管理服務器狀態的緩存和自動刷新。

5. **抽離表單驗證邏輯**：將狀態更新表單的驗證邏輯（例如逾期任務必須填寫逾期原因、到期日變更必須填寫變更原因）抽離到一個專門的 composable 中，使用 Ant Design Vue 的表單驗證規則來實現，這樣可以讓驗證邏輯更加清晰和可重用。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，數據獲取和業務邏輯已經與 UI 渲染邏輯分離，後續重構 UI 組件時也會更容易，因為只需要關注如何將數據渲染到 Ant Design Vue 組件中即可。

