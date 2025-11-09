# 頁面分析報告

檔案： client-detail.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 客戶基本信息表單（第55-133行） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-select>` + `<a-textarea>`，使用 `rules` 進行驗證 |
| 客戶編號顯示（第59-62行） | `<a-input>` 設置 `disabled` 屬性，或使用 `<a-descriptions>` 顯示只讀信息 |
| 公司名稱輸入框（第66行） | `<a-input>`，使用 `v-model` 綁定，`required` 屬性 |
| 統一編號輸入框（第73行） | `<a-input>`，設置 `maxlength="8"`，配合 `a-form-item` 的 `rules` 驗證 |
| 聯絡人輸入框（第82、86行） | `<a-input>` |
| 負責人員下拉選單（第92-94行） | `<a-select>`，使用 `options` 配置，`v-model` 綁定 |
| 聯絡電話輸入框（第99行） | `<a-input>`，可設置 `type="tel"` |
| Email 輸入框（第106行） | `<a-input>`，設置 `type="email"` |
| 標籤顯示區域（第111-113行） | `<a-tag>` 組件列表，使用 `color` 屬性設置標籤顏色 |
| 客戶備註文本域（第120行） | `<a-textarea>`，設置 `rows` 屬性 |
| 收款備註文本域（第126行） | `<a-textarea>` |
| 表單操作按鈕（第130-131行） | `<a-button>`，使用 `type="primary"` 和 `type="default"` |
| 客戶服務表格（第143-159行） | `<a-table>`，使用 `:columns` 和 `:data-source`，`@action` 處理操作 |
| 服務狀態徽章（第560-572行） | `<a-tag>`，使用 `color` 屬性（success/warning/error/default） |
| 服務操作按鈕（第580-583行） | `<a-button>`，使用 `type="link"` 或 `<a-space>` 包裹多個按鈕 |
| 收費設定表格（第177-194行） | `<a-table>`，使用 `:row-selection` 實現批量選擇，`:columns` 定義列 |
| 收費服務篩選下拉（第167行） | `<a-select>`，使用 `v-model` 綁定篩選值 |
| 批量操作按鈕組（第170-173行） | `<a-space>` 包裹多個 `<a-button>` |
| 收費表格複選框（第180行） | `<a-table>` 的 `:row-selection` 配置 |
| 新增收費彈窗（第202-332行） | `<a-modal>`，使用 `v-model:visible` 控制顯示，`title` slot 設置標題 |
| 收費類型選擇（第220-235行） | `<a-radio-group>` + `<a-radio-button>`，使用 `v-model` 綁定 |
| 按月收費表單（第239-286行） | `<a-form>` + `<a-form-item>`，使用 `<a-input-number>` 設置金額 |
| 月份選擇複選框組（第271-284行） | `<a-checkbox-group>` + `<a-checkbox>`，或使用 `<a-select>` 的 `mode="multiple"` |
| 一次性收費表單（第289-325行） | `<a-form>` + `<a-form-item>`，使用 `<a-date-picker>` 選擇日期 |
| 彈窗操作按鈕（第327-329行） | `<a-button>`，使用 `slot="footer"` 放置在 Modal 底部 |
| 標籤管理彈窗（第335-391行） | `<a-modal>` |
| 已選標籤顯示區域（第344-346行） | `<a-tag>` 組件列表 |
| 所有標籤列表（第381-383行） | `<a-space>` 包裹多個 `<a-button>` 或 `<a-tag>`，點擊切換選擇狀態 |
| 新增標籤表單（第356-379行） | `<a-form>` + `<a-form-item>`，使用 `<a-input>` 和 `<a-select>`（顏色選擇） |
| 服務組成部分配置區域（第1762-1905行） | `<a-collapse>` 或 `<a-card>`，可展開/收起的區域 |
| 任務配置表單（第1768-1840行） | `<a-form>` + `<a-form-item>`，使用 `<a-select>`、`<a-input-number>` 等 |
| 任務列表顯示（第1861-1888行） | `<a-list>` + `<a-list-item>`，或使用 `<a-card>` 列表 |
| 任務狀態徽章（第1866-1874行） | `<a-tag>`，使用不同 `color` 表示狀態 |
| 載入中提示（第155、191、589行） | `<a-spin>`，使用 `spinning` 屬性控制顯示 |
| 空狀態顯示（第556行、第684行） | `<a-empty>`，使用 `description` 自定義提示文字 |
| 錯誤提示文字（第67、74、95、100、107行） | `<a-form-item>` 的 `help` slot 或 `<a-alert type="error">` |
| 返回連結（第50行） | `<a-button type="link">` 或 `<a>` 標籤，配合 `<LeftOutlined />` 圖標 |
| 卡片容器（第53、137、163行） | `<a-card>`，使用 `title` slot 設置標題 |
| 表格操作列按鈕（第732-733行、第1177-1178行） | `<a-button type="link">`，使用 `<a-space>` 包裹 |
| 批量刪除按鈕狀態（第172行、第888-890行） | `<a-button>` 的 `disabled` 屬性，根據選中數量動態設置 |
| 月份範圍選擇（第256行） | `<a-select>`，選項為「全年」和「自選月份」 |
| 全選/全不選按鈕（第267-268行、第170-171行） | `<a-button>`，使用 `@click` 處理邏輯 |
| SOP 選擇列表（第1830-1832行、第2165-2203行） | `<a-checkbox-group>` + `<a-checkbox>`，或使用 `<a-select mode="multiple">` |
| SOP 搜索框（第1823-1827行、第2158-2162行） | `<a-input>`，使用 `@input` 或 `v-model` 配合過濾邏輯 |
| 已選擇 SOP 標籤（第1818-1820行、第2153-2155行） | `<a-tag>` 列表，可設置 `closable` 屬性 |
| 任務負責人選擇（第2142-2147行） | `<a-select>`，使用 `options` 配置員工列表 |
| 預估工時輸入（第2206-2210行） | `<a-input-number>`，設置 `min="0"`、`step="0.5"` |
| 提前生成天數輸入（第2213-2217行） | `<a-input-number>`，設置 `min="0"` |
| 期限規則選擇（第2220-2227行） | `<a-select>`，選項為不同的期限規則 |
| 日期/天數輸入（第2231-2234行） | `<a-input-number>`，設置 `min="1"`、`max="31"` |
| 批量設置負責人區域（第1794-1807行） | `<a-space>` 包裹 `<a-select>` 和 `<a-button>` |
| 任務配置區域標題（第1785-1788行） | `<a-typography-title>` 或 `<a-card>` 的 `title` slot |
| 內聯編輯表格行（第1015-1033行、第1571-1591行） | `<a-table>` 的 `editable` 功能，或使用 `<a-form>` 在彈窗中編輯 |
| 確認刪除對話框（第1060-1063行、第1545-1546行） | `<a-popconfirm>`，使用 `title` 設置提示文字，`@confirm` 處理確認 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**客戶詳情頁面外殼**應包含：
- 頁面標題區域（客戶編號、返回按鈕，第50行）
- 客戶基本信息卡片（第53-134行）
- 標籤管理功能（全局）
- 路由參數處理（客戶ID從URL獲取，第418-425行）
- 權限檢查（如果需要）
- 頁面級別的錯誤處理
- 數據初始化邏輯（第417-446行）

### 子路由 (Children) 拆分：

1. **ClientBasicInfo 組件**（客戶基本信息）
   - 位置：第53-134行的表單區域
   - 功能區塊：
     - 客戶編號（只讀）
     - 公司名稱、統一編號
     - 聯絡人信息
     - 負責人員
     - 聯絡方式（電話、Email）
     - 標籤管理
     - 備註信息
   - 建議路由：作為父路由的默認視圖，或使用 `/clients/:id/info` 子路由
   - 獨立功能：表單驗證、保存、取消

2. **ClientServices 組件**（客戶服務列表）
   - 位置：第137-160行
   - 功能區塊：
     - 服務列表表格
     - 新增服務功能
     - 編輯服務功能
     - 刪除服務功能
     - 服務狀態管理
   - 建議路由：`/clients/:id/services` 子路由，或使用 `<a-tabs>` 作為標籤頁
   - 獨立功能：服務CRUD操作、服務狀態切換

3. **ClientBilling 組件**（收費設定）
   - 位置：第163-196行
   - 功能區塊：
     - 收費列表表格
     - 服務篩選
     - 批量操作（全選、批量刪除）
     - 新增收費（按月/一次性）
     - 編輯收費
     - 刪除收費
   - 建議路由：`/clients/:id/billing` 子路由，或使用 `<a-tabs>` 作為標籤頁
   - 獨立功能：收費CRUD操作、批量操作、收費類型切換

4. **ServiceComponents 組件**（服務組成部分配置）
   - 位置：第1714-1905行的服務配置區域
   - 功能區塊：
     - 服務組成部分列表
     - 任務配置
     - SOP 關聯
     - 任務模板選擇
     - 批量設置負責人
   - 建議路由：作為服務詳情的子組件，路由為 `/clients/:id/services/:serviceId/components`
   - 獨立功能：組件CRUD操作、任務配置、SOP管理

5. **BillingModal 組件**（新增/編輯收費彈窗）
   - 位置：第202-332行
   - 功能區塊：
     - 收費類型選擇（按月/一次性）
     - 按月收費表單
     - 一次性收費表單
     - 表單驗證
   - 建議：獨立組件，可在多處重用，使用 `<a-modal>` 實現
   - 獨立功能：收費類型切換、表單驗證、批量月份選擇

6. **TagsModal 組件**（標籤管理彈窗）
   - 位置：第335-391行
   - 功能區塊：
     - 已選標籤顯示
     - 所有標籤列表
     - 新增標籤表單
     - 標籤選擇切換
   - 建議：獨立組件，可在多處重用，使用 `<a-modal>` 實現
   - 獨立功能：標籤CRUD操作、標籤選擇管理

7. **ServiceComponentForm 組件**（服務組成部分配置表單）
   - 位置：第1768-1840行
   - 功能區塊：
     - 任務配置區域
     - 任務列表編輯
     - SOP 選擇（服務層級）
     - 批量設置負責人
     - 任務模板載入
   - 建議：獨立組件，可在新增和編輯時重用
   - 獨立功能：任務配置、SOP管理、模板載入

8. **TaskConfigList 組件**（任務配置列表）
   - 位置：第1809-1811行、第2107-2253行
   - 功能區塊：
     - 任務列表顯示
     - 任務編輯
     - 任務刪除
     - 任務SOP關聯
   - 建議：獨立組件，可在服務組成部分配置中重用
   - 獨立功能：任務CRUD操作、任務SOP管理

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useClientApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchClientDetail(clientId)` 函數**
   - 位置：第449-493行的 `loadClientDetail` 函數
   - 功能：獲取客戶詳情
   - 參數：`clientId: number | string`
   - 返回：`Promise<ClientDetail>`
   - API 端點：`GET /internal/api/v1/clients/${clientId}`

2. **`updateClient(clientId, data)` 函數**
   - 位置：第2963-3031行的 `saveClient` 函數
   - 功能：更新客戶信息
   - 參數：`clientId: number | string`, `data: ClientUpdatePayload`
   - 返回：`Promise<ClientDetail>`
   - API 端點：`PUT /internal/api/v1/clients/${clientId}`

3. **`fetchClientServices(clientId)` 函數**
   - 位置：第487行（客戶詳情中包含服務列表）
   - 功能：獲取客戶服務列表
   - 參數：`clientId: number | string`
   - 返回：`Promise<ClientService[]>`
   - API 端點：`GET /internal/api/v1/clients/${clientId}`（服務列表包含在客戶詳情中）

4. **`createClientService(clientId, data)` 函數**
   - 位置：第1389-1449行的 `saveNewService` 函數
   - 功能：新增客戶服務
   - 參數：`clientId: number | string`, `data: ClientServiceCreatePayload`
   - 返回：`Promise<ClientService>`
   - API 端點：`POST /internal/api/v1/clients/${clientId}/services`

5. **`updateClientService(clientId, serviceId, data)` 函數**
   - 位置：第1505-1537行的 `saveEditService` 函數
   - 功能：更新客戶服務
   - 參數：`clientId: number | string`, `serviceId: number`, `data: ClientServiceUpdatePayload`
   - 返回：`Promise<ClientService>`
   - API 端點：`PUT /internal/api/v1/clients/${clientId}/services/${serviceId}`

6. **`deleteClientService(clientId, serviceId)` 函數**
   - 位置：第1545-1567行的 `deleteService` 函數
   - 功能：刪除客戶服務
   - 參數：`clientId: number | string`, `serviceId: number`
   - 返回：`Promise<void>`
   - API 端點：`DELETE /internal/api/v1/clients/${clientId}/services/${serviceId}`

7. **`fetchBillingSchedules(serviceId)` 函數**
   - 位置：第604-669行的 `loadAllBilling` 函數
   - 功能：獲取服務的收費計劃列表
   - 參數：`serviceId: number`
   - 返回：`Promise<BillingSchedule[]>`
   - API 端點：`GET /internal/api/v1/billing/service/${serviceId}`

8. **`createBillingSchedule(data)` 函數**
   - 位置：第915-968行的 `saveMonthlyBilling` 和第971-1012行的 `saveOneTimeBilling` 函數
   - 功能：創建收費計劃
   - 參數：`data: BillingScheduleCreatePayload`
   - 返回：`Promise<BillingSchedule>`
   - API 端點：`POST /internal/api/v1/billing`

9. **`updateBillingSchedule(scheduleId, data)` 函數**
   - 位置：第1036-1053行的 `saveEditedBilling` 函數
   - 功能：更新收費計劃
   - 參數：`scheduleId: number`, `data: BillingScheduleUpdatePayload`
   - 返回：`Promise<BillingSchedule>`
   - API 端點：`PUT /internal/api/v1/billing/${scheduleId}`

10. **`deleteBillingSchedule(scheduleId)` 函數**
    - 位置：第1060-1087行的 `deleteBillingRow` 函數
    - 功能：刪除收費計劃
    - 參數：`scheduleId: number`
    - 返回：`Promise<void>`
    - API 端點：`DELETE /internal/api/v1/billing/${scheduleId}`

11. **`batchDeleteBillingSchedules(scheduleIds)` 函數**
    - 位置：第892-907行的 `batchDeleteBilling` 函數
    - 功能：批量刪除收費計劃
    - 參數：`scheduleIds: number[]`
    - 返回：`Promise<{ ok: number, fail: number }>`
    - API 端點：多個 `DELETE /internal/api/v1/billing/${scheduleId}` 請求

12. **`fetchServiceComponents(serviceId)` 函數**
    - 位置：第1726-1911行的 `loadComponentsInline` 函數
    - 功能：獲取服務組成部分列表
    - 參數：`serviceId: number`
    - 返回：`Promise<ServiceComponent[]>`
    - API 端點：`GET /internal/api/v1/client-services/${serviceId}/components`

13. **`createServiceComponent(serviceId, data)` 函數**
    - 位置：第2651-2749行的 `saveNewComponent` 函數
    - 功能：創建服務組成部分
    - 參數：`serviceId: number`, `data: ServiceComponentCreatePayload`
    - 返回：`Promise<ServiceComponent>`
    - API 端點：`POST /internal/api/v1/client-services/${serviceId}/components`

14. **`updateServiceComponent(componentId, data)` 函數**
    - 位置：第2708-2715行（編輯模式）
    - 功能：更新服務組成部分
    - 參數：`componentId: number`, `data: ServiceComponentUpdatePayload`
    - 返回：`Promise<ServiceComponent>`
    - API 端點：`PUT /internal/api/v1/service-components/${componentId}`

15. **`deleteServiceComponent(componentId)` 函數**
    - 位置：第2752-2774行的 `deleteComponent` 函數
    - 功能：刪除服務組成部分
    - 參數：`componentId: number`
    - 返回：`Promise<void>`
    - API 端點：`DELETE /internal/api/v1/service-components/${componentId}`

16. **`fetchAllTags()` 函數**
    - 位置：第3057-3067行的 `loadAllTags` 函數
    - 功能：獲取所有標籤
    - 參數：無
    - 返回：`Promise<Tag[]>`
    - API 端點：`GET /internal/api/v1/tags`

17. **`createTag(data)` 函數**
    - 位置：第3130-3170行的 `saveNewTag` 函數
    - 功能：創建新標籤
    - 參數：`data: TagCreatePayload`
    - 返回：`Promise<Tag>`
    - API 端點：`POST /internal/api/v1/tags`

18. **`updateClientTags(clientId, tagIds)` 函數**
    - 位置：第3227-3253行的 `saveTags` 函數
    - 功能：更新客戶標籤
    - 參數：`clientId: number | string`, `tagIds: number[]`
    - 返回：`Promise<void>`
    - API 端點：`PUT /internal/api/v1/clients/${clientId}/tags`

19. **`fetchAllServices()` 函數**
    - 位置：第1288-1305行的 `loadServices` 函數
    - 功能：獲取所有服務類型
    - 參數：無
    - 返回：`Promise<Service[]>`
    - API 端點：`GET /internal/api/v1/services`

20. **`fetchAllUsers()` 函數**
    - 位置：第1339-1351行的 `loadAllUsers` 函數
    - 功能：獲取所有員工列表
    - 參數：無
    - 返回：`Promise<User[]>`
    - API 端點：`GET /internal/api/v1/users`

21. **`fetchAllSOPs()` 函數**
    - 位置：第1354-1371行的 `loadAllSOPs` 函數
    - 功能：獲取所有SOP列表
    - 參數：無
    - 返回：`Promise<SOP[]>`
    - API 端點：`GET /internal/api/v1/sop`

22. **`fetchTaskTemplateStages(templateId)` 函數**
    - 位置：第2042-2104行的 `loadTemplateStages` 函數
    - 功能：獲取任務模板階段列表
    - 參數：`templateId: number`
    - 返回：`Promise<TaskTemplateStage[]>`
    - API 端點：`GET /internal/api/v1/task-templates/${templateId}/stages`

23. **`fetchServiceItems()` 函數**
    - 位置：第1308-1320行的 `loadServiceItems` 函數
    - 功能：獲取所有服務項
    - 參數：無
    - 返回：`Promise<ServiceItem[]>`
    - API 端點：`GET /internal/api/v1/services/items`

24. **`fetchTaskTemplates()` 函數**
    - 位置：第1323-1336行的 `loadTemplates` 函數
    - 功能：獲取所有任務模板
    - 參數：無
    - 返回：`Promise<TaskTemplate[]>`
    - API 端點：`GET /internal/api/v1/task-templates`

**額外建議：**

1. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（401未授權、網絡錯誤、業務錯誤等），返回統一的錯誤格式。

2. **請求攔截器**：使用 axios 或 fetch 攔截器統一處理請求頭（如認證token）、請求參數、響應數據轉換等。

3. **類型定義**：創建 TypeScript 類型定義檔案（`src/types/client.ts`），定義所有相關的數據類型：
   - `ClientDetail`
   - `ClientService`
   - `BillingSchedule`
   - `ServiceComponent`
   - `Tag`
   - `TaskTemplate`
   - 等

4. **狀態管理**（建議使用 Pinia）：
   - 創建 `stores/client.js` store
   - 管理以下狀態：
     - `currentClient`: 當前客戶詳情
     - `clientServices`: 客戶服務列表
     - `billingSchedules`: 收費計劃列表
     - `serviceComponents`: 服務組成部分列表
     - `allTags`: 所有標籤列表
     - `allServices`: 所有服務類型列表
     - `allUsers`: 所有員工列表
     - `allSOPs`: 所有SOP列表
     - `loading`: 加載狀態
     - `error`: 錯誤信息

5. **數據緩存**：考慮使用 Vue Query 或類似的數據獲取庫來管理數據緩存、自動重新獲取、樂觀更新等。

6. **表單驗證邏輯抽離**：將表單驗證規則抽離到獨立的配置文件或 composable 中，例如 `useClientFormValidation.js`。

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與數據類型定義**

在開始重構 UI 之前，首先應該將所有的數據獲取和數據操作邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useClientApi.js`）來處理所有與客戶相關的數據請求。將目前混雜在頁面 JavaScript 中的大量 `fetch` 調用（例如獲取客戶詳情、獲取服務列表、獲取收費計劃、獲取標籤等）都移動到這個檔案中，並組織成清晰易懂的函數。

2. **定義數據類型**：為所有涉及的數據結構（客戶信息、服務、收費計劃、標籤等）創建明確的類型定義。這樣可以讓代碼更加清晰，也方便後續的開發和維護。

3. **統一錯誤處理**：在 API 服務層統一處理各種錯誤情況（例如網絡錯誤、權限錯誤、業務邏輯錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。當出現錯誤時，應該以統一的方式向用戶展示錯誤信息。

4. **建立狀態管理**：使用 Pinia 建立一個專門的 store 來管理客戶詳情頁面的所有狀態（例如當前客戶信息、服務列表、收費計劃等）。這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化，也方便實現數據的緩存和更新。

5. **抽離工具函數**：將頁面中用於數據格式化和處理的工具函數（例如日期格式化、金額格式化等）抽離到獨立的工具檔案中，這樣其他頁面也可以重用這些函數。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰和模組化，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯完全分離了。同時，這樣的重構也有助於提高代碼的可測試性和可維護性。

