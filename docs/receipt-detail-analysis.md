# 頁面分析報告

檔案： receipt-detail.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 返回連結（第356-361行） | `<a-button type="link">` 配合 `<LeftOutlined />` 圖標，使用 `router-link` 或 `@click` 處理導航 |
| 操作按鈕組（第363-367行） | `<a-space>` 包裹多個 `<a-button>`，新增收款使用 `type="primary"`，編輯使用 `type="default"`，作廢使用 `type="danger"` |
| 狀態徽章（第48-59行，第526-544行） | `<a-tag>`，使用 `color` 屬性設置不同狀態顏色（success/warning/error/default），根據狀態動態設置 |
| 收據基本信息卡片（第23-30行，第547-596行） | `<a-card>` 或 `<a-descriptions>`，使用 `title` 設置標題，`bordered` 屬性顯示邊框，使用 `<a-descriptions-item>` 顯示各項信息 |
| 信息網格布局（第61-65行，第552-589行） | `<a-row>` + `<a-col>` 或使用 `<a-descriptions>` 的 `:column` 屬性實現響應式布局 |
| 金額高亮顯示（第88-93行，第571行） | `<a-typography-title>` 設置 `:level` 或直接使用文字樣式，配合 `:style` 設置字體大小和顏色 |
| 收據明細表格（第155-190行，第378-390行） | `<a-table>`，使用 `:columns` 定義列，`:data-source` 綁定數據，`:pagination="false"` 禁用分頁 |
| 收款記錄表格（第395-408行） | `<a-table>`，使用 `:columns` 定義列，`:data-source` 綁定數據，`:pagination="false"` 禁用分頁 |
| 空狀態顯示（第331-336行，第629行） | `<a-empty>`，使用 `description` 屬性設置提示文字 |
| 新增收款彈窗（第238-256行，第412-456行） | `<a-modal>`，使用 `v-model:open` 控制顯示，`:title` 設置標題，使用 `<a-form>` 包裹表單內容 |
| 新增收款表單（第418-449行） | `<a-form>` + `<a-form-item>`，使用 `:model` 綁定表單數據，`:rules` 定義驗證規則，使用 `<a-date-picker>` 選擇日期，`<a-input-number>` 輸入金額，`<a-select>` 選擇收款方式，`<a-textarea>` 輸入備註 |
| 收款日期輸入（第420行） | `<a-date-picker>`，設置 `format="YYYY-MM-DD"`，`value-format="YYYY-MM-DD"`，使用 `v-model` 綁定 |
| 收款金額輸入（第425行） | `<a-input-number>`，設置 `:min="0"`，`:precision="2"`，使用 `v-model` 綁定，`:formatter` 格式化顯示 |
| 收款方式選擇（第433-438行） | `<a-select>`，使用 `:options` 綁定選項列表，`v-model` 綁定選中值 |
| 參考號碼輸入（第443行） | `<a-input>`，使用 `v-model` 綁定，`placeholder` 設置提示文字 |
| 備註文本域（第448行） | `<a-textarea>`，設置 `:rows="3"`，使用 `v-model` 綁定 |
| 未收金額提示（第427-428行） | `<a-typography-text type="secondary">` 或使用 `<a-form-item>` 的 `extra` slot |
| 表單錯誤提示（第320-329行，第416行） | `<a-alert type="error">`，使用 `v-if` 控制顯示，`:message` 綁定錯誤訊息 |
| 彈窗操作按鈕（第451-454行） | `<a-button>`，使用 Modal 的 `footer` slot，取消使用 `type="default"`，確認使用 `type="primary"` |
| 編輯收據彈窗（第459-480行） | `<a-modal>`，使用 `v-model:open` 控制顯示，`:title` 設置標題 |
| 編輯收據表單（第465-473行） | `<a-form>` + `<a-form-item>`，使用 `<a-date-picker>` 選擇到期日，`<a-textarea>` 輸入備註 |
| 到期日輸入（第467行） | `<a-date-picker>`，設置 `format="YYYY-MM-DD"`，`value-format="YYYY-MM-DD"` |
| 確認作廢對話框（第807行） | `<a-popconfirm>`，使用 `title` 設置提示文字，`ok-text` 和 `cancel-text` 設置按鈕文字，`@confirm` 處理確認操作，或使用 `<a-modal>` 的確認模式 |
| 加載狀態提示（使用 `alert`，第516行、第737行、第793行） | `<a-message>` 顯示成功提示，`<a-notification>` 顯示詳細通知，使用 `<a-spin>` 包裹內容顯示加載狀態 |
| 內聯樣式的大量使用（第355-367行、第590-595行等） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和主題定制，使用 `<a-space>`、`<a-row>` + `<a-col>` 處理布局 |
| 響應式布局處理（第104-132行） | 使用 Ant Design Vue 的 Grid 系統（`<a-row>` + `<a-col>`）的響應式屬性（`:xs`、`:sm`、`:md`、`:lg`、`:xl`）實現響應式布局 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**收據詳情頁面外殼**應包含：
- 頁面標題區域（返回按鈕、操作按鈕組，第354-368行）
- 收據基本信息卡片區域（第371-373行）
- 收據明細表格區域（第376-390行）
- 收款記錄表格區域（第393-408行）
- 路由參數處理（收據ID從URL獲取，第488-495行）
- 權限檢查（如果需要）
- 頁面級別的錯誤處理
- 數據初始化邏輯（第499-519行）

### 子路由 (Children) 拆分：

1. **ReceiptHeader 組件**（收據基本信息卡片）
   - 位置：第371-373行，動態渲染在第547-596行
   - 功能區塊：
     - 收據編號和狀態徽章
     - 客戶名稱、開立日期、到期日、收據類型
     - 總金額、已收金額、未收金額
     - 建立人信息
     - 備註信息
   - 建議：獨立組件，接收 `receiptData` 作為 props，通過 `@update` 事件通知父組件數據更新
   - 建議路由：作為父路由的主要內容組件，不需要獨立路由

2. **ReceiptItemsTable 組件**（收據明細表格）
   - 位置：第376-390行，動態渲染在第599-613行
   - 功能區塊：
     - 收據明細列表顯示
     - 服務項目、數量、單價、小計、備註
   - 建議：獨立組件，接收 `items` 數據作為 props，使用 `<a-table>` 實現
   - 建議路由：作為頁面內容組件，不需要獨立路由

3. **ReceiptPaymentsTable 組件**（收款記錄表格）
   - 位置：第393-408行，動態渲染在第616-630行
   - 功能區塊：
     - 收款記錄列表顯示
     - 收款日期、收款金額、收款方式、參考號碼、記錄人、備註
   - 建議：獨立組件，接收 `payments` 數據作為 props，使用 `<a-table>` 實現，支持空狀態顯示
   - 建議路由：作為頁面內容組件，不需要獨立路由

4. **AddPaymentModal 組件**（新增收款彈窗）
   - 位置：第412-456行，邏輯處理在第662-746行
   - 功能區塊：
     - 收款日期選擇
     - 收款金額輸入（帶未收金額提示）
     - 收款方式選擇
     - 參考號碼輸入
     - 備註輸入
     - 表單驗證
     - 提交收款記錄
   - 建議：獨立組件，使用 `v-model:open` 控制顯示，通過 `@submit` 事件通知父組件，接收 `outstandingAmount` 作為 props 用於驗證
   - 建議路由：作為彈窗組件，不需要獨立路由

5. **EditReceiptModal 組件**（編輯收據彈窗）
   - 位置：第459-480行，邏輯處理在第748-802行
   - 功能區塊：
     - 到期日選擇
     - 備註輸入
     - 表單驗證
     - 提交更新
   - 建議：獨立組件，使用 `v-model:open` 控制顯示，通過 `@submit` 事件通知父組件，接收 `receiptData` 作為 props 用於初始化表單
   - 建議路由：作為彈窗組件，不需要獨立路由

6. **ReceiptDetailPage 組件**（主頁面組件）
   - 整合上述所有組件
   - 管理頁面狀態（收據詳情數據、加載狀態、錯誤信息等）
   - 處理 API 調用和數據加載
   - 處理新增收款、編輯收據、作廢收據的業務邏輯
   - 建議路由：`/internal/receipts/:id` 或 `/receipts/:id`

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useReceiptApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchReceiptDetail(receiptId)` 函數**
   - 位置：第500-519行的 `loadReceiptDetail` 函數
   - 功能：獲取收據詳情
   - 參數：`receiptId: string`
   - 返回：`Promise<ReceiptDetail>`
   - API 端點：`GET /internal/api/v1/receipts/${receiptId}`
   - 建議：使用 `useRequest` 或 `useQuery` 進行請求管理和緩存

2. **`createPayment(receiptId, payload)` 函數**
   - 位置：第719-746行的新增收款邏輯
   - 功能：新增收款記錄
   - 參數：
     - `receiptId: string`
     - `payload: { payment_date: string, payment_amount: number, payment_method: string, reference_number?: string, notes?: string }`
   - 返回：`Promise<Payment>`
   - API 端點：`POST /internal/api/v1/receipts/${receiptId}/payments`
   - 建議：使用 `useMutation` 處理新增操作，成功後自動刷新收據詳情

3. **`updateReceipt(receiptId, payload)` 函數**
   - 位置：第781-802行的編輯收據邏輯
   - 功能：更新收據信息
   - 參數：
     - `receiptId: string`
     - `payload: { due_date?: string, notes?: string }`
   - 返回：`Promise<void>`
   - API 端點：`PATCH /internal/api/v1/receipts/${receiptId}`
   - 建議：使用 `useMutation` 處理更新操作，成功後自動刷新收據詳情

4. **`cancelReceipt(receiptId)` 函數**
   - 位置：第810-825行的作廢收據邏輯
   - 功能：作廢收據
   - 參數：`receiptId: string`
   - 返回：`Promise<void>`
   - API 端點：`DELETE /internal/api/v1/receipts/${receiptId}`
   - 建議：使用 `useMutation` 處理作廢操作，成功後跳轉到收據列表頁面

5. **數據格式化函數**（可選，抽離到 `src/utils/formatters.js`）
   - `formatReceiptStatus(status, dueDate)`：格式化收據狀態顯示（第522-544行）
   - `formatReceiptType(type)`：格式化收據類型顯示（第643-650行）
   - `formatPaymentMethod(method)`：格式化收款方式顯示（第652-660行）
   - `formatCurrency(amount)`：格式化金額顯示（使用 `toLocaleString()`）

6. **狀態管理**（建議使用 Pinia）
   - 創建 `stores/receipt.js` store
   - 管理以下狀態：
     - `currentReceipt`: 當前收據詳情數據
     - `loading`: 加載狀態
     - `error`: 錯誤信息

7. **權限檢查**（可抽離到 composable）
   - 創建 `src/composables/useAuth.js`（如果尚未存在）
   - 處理 401 未授權重定向（第503行、第732行、第788行、第815行）

8. **統一錯誤處理**
   - 在 API 服務層統一處理錯誤情況（401未授權、404不存在、網絡錯誤等）
   - 返回統一的錯誤格式
   - 使用 `useMessage` 或 `useNotification` 顯示錯誤提示

9. **請求攔截器**
   - 使用 axios 或 fetch 攔截器統一處理請求頭（如認證token）、請求參數、響應數據轉換等
   - 統一處理 401 未授權重定向邏輯

10. **類型定義**（如果使用 TypeScript）
    - 創建 `src/types/receipt.ts` 類型定義檔案
    - 定義所有相關的數據類型：
      - `ReceiptDetail`
      - `ReceiptItem`
      - `Payment`
      - `ReceiptStatus`
      - `ReceiptType`
      - `PaymentMethod`

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與數據管理**

在開始重構 UI 之前，首先應該將所有的數據獲取和操作邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useReceiptApi.js`）來處理所有與收據相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取收據詳情、新增收款記錄、編輯收據、作廢收據）都移動到這個檔案中，並組織成清晰易懂的函數。每個函數應該有明確的參數和返回值，並且包含適當的錯誤處理。

2. **統一錯誤處理**：在 API 服務層統一處理各種錯誤情況（例如 401 未授權、404 不存在、網絡錯誤、業務邏輯錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。當出現錯誤時，應該以統一的方式向用戶展示錯誤信息（例如使用消息提示或通知組件），並且對於未授權的情況，應該自動重定向到登錄頁面。

3. **建立數據格式化工具**：將所有的數據格式化函數（例如格式化收據狀態顯示、格式化收據類型顯示、格式化收款方式顯示、格式化金額顯示）從頁面中抽離出來，放在一個共用的工具檔案中，這樣其他頁面也可以重用這些函數。這樣可以確保整個應用中相同類型的數據都以相同的方式顯示。

4. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理收據詳情頁面的狀態（例如當前收據詳情數據、加載狀態、錯誤信息等）。這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化，也方便實現數據的緩存和更新。當用戶執行操作（例如新增收款）後，可以自動更新 store 中的數據，從而觸發相關組件的重新渲染。

5. **處理權限邏輯**：將權限檢查邏輯（例如檢查用戶是否有權限執行某些操作）和未授權重定向邏輯抽離到一個共用的 composable 中，這樣可以在多個頁面中重用。這樣可以確保整個應用中的權限檢查邏輯都是一致的。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰和模組化，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯完全分離了。同時，這樣的重構也有助於提高代碼的可測試性和可維護性，因為 API 請求邏輯已經統一管理，後續如果 API 接口發生變化，只需要在一個地方修改即可。

