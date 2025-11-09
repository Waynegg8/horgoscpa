# 頁面分析報告

檔案： clients.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 搜索輸入框（`<input id="q" type="search">`，第47行） | `<a-input-search>`，使用 `v-model` 綁定搜索關鍵字，`placeholder` 屬性，`@search` 事件處理搜索 |
| 標籤篩選下拉選單（`<select id="tag-filter">`，第49-51行） | `<a-select>`，使用 `v-model` 綁定選中值，`:options` 綁定標籤列表，`allow-clear` 支持清空選擇 |
| 新增客戶按鈕（`<button>`，第59行） | `<a-button type="primary">`，使用 `@click` 處理跳轉 |
| 批量操作按鈕組（`<div id="batch-actions">`，第54-57行） | `<a-space>` 包裹多個 `<a-button>`，批量分配按鈕使用 `type="default"`，取消選擇使用 `type="default"` |
| 快速移轉按鈕（`<button id="btn-quick-migrate">`，第58行） | `<a-button type="default">` |
| 錯誤提示區域（`<p id="clients-error">`，第63行） | `<a-alert type="error">`，使用 `v-if` 控制顯示，`:message` 綁定錯誤訊息 |
| 空狀態顯示（`<div id="empty">`，第65-68行） | `<a-empty>`，使用 `description` 自定義提示文字，`:image` 可選自定義圖標 |
| 客戶列表表格（`<table class="clients-table">`，第70-91行） | `<a-table>`，使用 `:columns` 定義列，`:data-source` 綁定數據，`:pagination` 配置分頁，`:row-selection` 支持多選 |
| 表格中的複選框（`<input type="checkbox">`，第73行、第307行） | 使用 `<a-table>` 的 `:row-selection` 屬性，自動處理全選和單選 |
| 表格操作按鈕（查看、刪除按鈕，第320-321行） | 在 `<a-table>` 的 `columns` 中定義操作列，使用 `<a-button type="link">` 或 `<a-space>` 包裹多個按鈕，使用 `<a-popconfirm>` 包裹刪除按鈕確認 |
| 分頁控制器（`<div class="clients-pagination">`，第93-96行） | `<a-pagination>`，使用 `v-model:current` 綁定當前頁，`:total` 綁定總數，`:page-size` 綁定每頁數量，`@change` 處理頁碼變化 |
| 批量分配負責人彈窗（`<div class="modal-overlay">`，第101-127行） | `<a-modal>`，使用 `v-model:open` 控制顯示，`:title` 設置標題，使用 `<a-form>` 包裹表單內容 |
| 批量分配表單（`<form id="batchAssignForm">`，第108-124行） | `<a-form>`，使用 `:model` 綁定表單數據，`:rules` 定義驗證規則，`<a-form-item>` 包裹表單項，使用 `<a-select>` 選擇負責人 |
| 已選擇客戶列表顯示（`<div id="batch-clients-list">`，第111行） | `<a-list>` + `<a-list-item>`，或使用 `<a-descriptions>` 顯示客戶信息 |
| 快速移轉負責人彈窗（`<div class="modal-overlay">`，第130-172行） | `<a-modal>`，使用 `v-model:open` 控制顯示 |
| 快速移轉表單中的下拉選單（`<select id="migrate_from">`、`<select id="migrate_to">`，第140行、第149行） | `<a-select>`，使用 `v-model` 綁定選中值，`:options` 綁定員工列表 |
| 快速移轉表單中的複選框（`<input type="checkbox" id="migrate_include_unassigned">`，第143行） | `<a-checkbox>`，使用 `v-model` 綁定選中狀態 |
| 快速移轉表單中的標籤多選（`<div id="migrate_tags">`，第154行） | `<a-checkbox-group>`，使用 `v-model` 綁定選中的標籤ID數組 |
| 快速移轉表單中的關鍵字輸入（`<input type="text" id="migrate_q">`，第158行） | `<a-input>`，使用 `v-model` 綁定輸入值 |
| 預覽結果顯示（`<div id="migrate_preview_list">`，第163行） | `<a-list>` + `<a-list-item>`，或使用 `<a-alert>` 顯示預覽結果 |
| 標籤顯示（`<span class="chip">`，第285-286行） | `<a-tag>`，使用 `:color` 綁定標籤顏色，`v-for` 循環渲染標籤 |
| 服務數量徽章（`<span class="service-count">`，第290-292行） | `<a-badge>` 或 `<a-tag color="blue">` |
| 金額顯示（全年收費總額，第296-298行） | `<a-typography-text>` 或直接使用格式化後的文字，可使用 `:class` 綁定樣式類 |
| 表單驗證錯誤提示（`<div class="field__error">`，第118行、第150行） | `<a-form-item>` 的 `:help` 屬性或 `<a-form-item>` 自動顯示驗證錯誤 |
| 加載狀態（目前使用 `alert` 和 `console.log`，第616行） | `<a-message>` 或 `<a-notification>` 顯示成功/錯誤提示，使用 `<a-spin>` 顯示加載狀態 |
| 確認對話框（`confirm()`，第424行、第685行） | `<a-modal>` 的確認模式，或使用 `<a-popconfirm>` 包裹刪除按鈕 |
| 內聯樣式的大量使用（如第44-60行、第111行、第154行等） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和主題定制，使用 `<a-space>`、`<a-row>` + `<a-col>` 處理布局 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**客戶管理列表頁面外殼**應包含：
- 頁面標題區域（可選，顯示「客戶管理」標題）
- 搜索與篩選區域（第44-61行）：搜索框、標籤篩選、批量操作按鈕、新增客戶按鈕
- 錯誤提示區域（第63行）
- 客戶列表表格區域（第69-96行）
- 路由守衛（檢查用戶權限，決定是否顯示批量操作功能）

### 子路由 (Children) 拆分：

1. **ClientListTable 組件**（客戶列表表格）
   - 位置：第69-96行
   - 功能區塊：
     - 客戶列表表格顯示
     - 表格多選功能
     - 分頁功能
     - 空狀態顯示
   - 建議：獨立組件，接收 `clients` 數據和 `loading` 狀態作為 props，通過 `@selection-change` 事件通知父組件選中的客戶
   - 建議路由：作為主頁面的主要內容組件，不需要獨立路由

2. **BatchAssignModal 組件**（批量分配負責人彈窗）
   - 位置：第101-127行
   - 功能區塊：
     - 顯示已選擇的客戶列表
     - 選擇新的負責人
     - 表單驗證
     - 提交批量分配請求
   - 建議：獨立組件，使用 `v-model:open` 控制顯示，通過 `@submit` 事件通知父組件
   - 建議路由：作為彈窗組件，不需要獨立路由

3. **QuickMigrateModal 組件**（快速移轉負責人彈窗）
   - 位置：第130-172行
   - 功能區塊：
     - 選擇目前負責人
     - 選擇新負責人
     - 標籤篩選（多選）
     - 關鍵字篩選
     - 預覽符合名單
     - 執行移轉
   - 建議：獨立組件，使用 `v-model:open` 控制顯示，通過 `@submit` 事件通知父組件
   - 建議路由：作為彈窗組件，不需要獨立路由

4. **ClientSearchBar 組件**（搜索與篩選欄）
   - 位置：第44-61行
   - 功能區塊：
     - 搜索輸入框
     - 標籤篩選下拉
     - 批量操作按鈕組
     - 快速移轉按鈕
     - 新增客戶按鈕
   - 建議：獨立組件，通過 `@search`、`@tag-filter-change` 事件通知父組件篩選條件變化，通過 `@batch-assign`、`@quick-migrate` 事件觸發彈窗顯示
   - 建議路由：作為頁面頭部組件，不需要獨立路由

5. **ClientListPage 組件**（主頁面組件）
   - 整合上述所有組件
   - 管理頁面狀態（搜索關鍵字、標籤篩選、當前頁碼、選中的客戶ID列表等）
   - 處理 API 調用和數據加載
   - 處理批量操作和快速移轉的業務邏輯
   - 建議路由：`/internal/clients` 或 `/clients`

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useClientApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchEmployees()` 函數**
   - 位置：第190-204行的 `loadEmployees` 函數
   - 功能：獲取員工列表
   - 返回：`Promise<Array<Employee>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

2. **`fetchTags()` 函數**
   - 位置：第208-222行的 `loadTags` 函數
   - 功能：獲取標籤列表
   - 返回：`Promise<Array<Tag>>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

3. **`fetchClients(params)` 函數**
   - 位置：第330-365行的 `load` 函數
   - 功能：獲取客戶列表
   - 參數：
     - `page`：當前頁碼（預設：1）
     - `perPage`：每頁數量（預設：50）
     - `q`：搜索關鍵字（可選）
     - `tag_id`：標籤ID篩選（可選）
     - `no_cache`：禁用緩存標誌（預設：'1'）
   - 返回：`Promise<{ data: Array<Client>, meta: { total: number } }>`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理，支持分頁和篩選參數變化時自動重新請求

4. **`deleteClient(clientId)` 函數**
   - 位置：第423-455行的 `deleteClient` 函數
   - 功能：刪除客戶
   - 參數：`clientId`（客戶ID）
   - 返回：`Promise<void>`
   - 建議：使用 `useMutation` 處理刪除操作，成功後自動刷新客戶列表

5. **`batchAssignClients(payload)` 函數**
   - 位置：第556-632行的批量分配表單提交邏輯
   - 功能：批量分配客戶負責人
   - 參數：
     - `client_ids`：客戶ID數組
     - `assignee_user_id`：負責人用戶ID
   - 返回：`Promise<{ updated_count: number }>`
   - 建議：使用 `useMutation` 處理批量分配操作，支持 `dry_run` 模式用於預覽

6. **`previewMigrateClients(params)` 函數**
   - 位置：第656-676行的預覽邏輯
   - 功能：預覽符合移轉條件的客戶
   - 參數：
     - `from_assignee_user_id`：目前負責人ID（可選）
     - `include_unassigned`：是否包含未分配客戶
     - `tag_ids`：標籤ID數組（可選）
     - `q`：關鍵字（可選）
     - `assignee_user_id`：新負責人ID（用於預覽，實際值為 -1）
     - `dry_run`：預覽模式標誌（true）
   - 返回：`Promise<{ match_count: number, sample: Array<Client> }>`
   - 建議：使用 `useRequest` 處理預覽請求

7. **`migrateClients(params)` 函數**
   - 位置：第677-694行的移轉邏輯
   - 功能：執行客戶負責人移轉
   - 參數：
     - `from_assignee_user_id`：目前負責人ID（可選）
     - `include_unassigned`：是否包含未分配客戶
     - `tag_ids`：標籤ID數組（可選）
     - `q`：關鍵字（可選）
     - `assignee_user_id`：新負責人ID
   - 返回：`Promise<{ updated_count: number }>`
   - 建議：使用 `useMutation` 處理移轉操作

8. **數據格式化函數**（可選，抽離到 `src/utils/formatters.js`）
   - `formatClientTags(tags)`：格式化客戶標籤顯示（第270-287行）
   - `formatDate(dateString)`：格式化日期顯示（第304行）
   - `formatCurrency(amount)`：格式化金額顯示（第296-298行）

9. **狀態管理**（建議使用 Pinia）
   - 創建 `stores/clients.js` store
   - 管理以下狀態：
     - `clients`：客戶列表數據
     - `loading`：加載狀態
     - `error`：錯誤信息
     - `pagination`：分頁信息（當前頁、每頁數量、總數）
     - `filters`：篩選條件（搜索關鍵字、標籤ID）
     - `selectedClientIds`：選中的客戶ID數組
     - `employees`：員工列表緩存
     - `tags`：標籤列表緩存

10. **權限檢查**（可抽離到 composable）
    - 創建 `src/composables/useAuth.js`（如果尚未存在）
    - 檢查用戶是否有權限執行批量操作
    - 處理 401 未授權重定向（第433-435行、第584-586行）

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與數據管理**

在開始重構 UI 之前，首先應該將所有的數據獲取和操作邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useClientApi.js`）來處理所有與客戶相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取員工列表、獲取標籤列表、獲取客戶列表、刪除客戶、批量分配、快速移轉）都移動到這個檔案中。

2. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（例如 401 未授權、403 權限不足、網絡錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。特別是要處理未授權時的重定向邏輯（目前在第433-435行、第584-586行）。

3. **建立數據格式化工具**：將所有的數據格式化函數（例如格式化標籤顯示、格式化日期、格式化金額）從頁面中抽離出來，放在一個共用的工具檔案中，這樣其他頁面也可以重用這些函數。

4. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理客戶列表的狀態（例如當前頁碼、每頁數量、搜索關鍵字、標籤篩選、選中的客戶ID列表等），這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化。同時也可以緩存員工列表和標籤列表，避免重複請求。

5. **處理權限邏輯**：將權限檢查邏輯（例如檢查用戶是否有權限執行批量操作）抽離到一個共用的 composable 中，這樣可以在多個頁面中重用。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯分離了。同時，由於 API 請求邏輯已經統一管理，後續如果 API 接口發生變化，只需要在一個地方修改即可。

