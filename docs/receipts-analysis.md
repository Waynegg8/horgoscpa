# 收據收款頁面分析報告

檔案： receipts.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 | 說明 |
|---------|------------------|------|
| 搜尋輸入框 (`<input id="q" type="search">`) | `<a-input-search>` | 第 168 行，支援搜尋功能的輸入框 |
| 日期選擇器 (`<input id="dateFrom" type="date">`) | `<a-date-picker>` | 第 171、175 行，可考慮使用 `<a-range-picker>` 統一處理日期範圍 |
| 狀態下拉選單 (`<select id="status">`) | `<a-select>` | 第 177 行，狀態篩選下拉選單 |
| 新增收據按鈕 (`<button id="btn-new">`) | `<a-button type="primary">` | 第 183 行，主要操作按鈕 |
| 開收據提醒橫幅 (`<div class="reminder-banner">`) | `<a-alert type="success">` 或 `<a-notification>` | 第 187 行，綠色提醒橫幅，建議用 Alert 組件 |
| 收據列表表格 (`<table>`) | `<a-table>` | 第 193-209 行，包含排序、篩選、分頁等功能 |
| 狀態標籤（Badge） | `<a-tag>` 或 `<a-badge>` | 第 685-702 行，各種狀態的彩色標籤 |
| 新增收據 Modal (`<div id="modalOverlay">`) | `<a-modal>` | 第 217 行，完整的 Modal 彈窗 |
| 表單容器 | `<a-form>` + `<a-form-item>` | 第 240-396 行，表單結構 |
| 收據類型下拉選單 (`<select id="receiptType">`) | `<a-select>` | 第 245 行 |
| 客戶選擇下拉選單 (`<select id="clientSelect">`) | `<a-select>` 或 `<a-select show-search>` | 第 253 行，建議加入搜尋功能 |
| 計費月份下拉選單 (`<select id="billingMonth">`) | `<a-select>` | 第 262 行 |
| 日期輸入 (`<input type="date">`) | `<a-date-picker>` | 第 281、286 行 |
| 月份輸入 (`<input type="month">`) | `<a-date-picker mode="month">` | 第 300、304 行，服務期間選擇 |
| 服務類型複選框 (`<input type="checkbox">`) | `<a-checkbox-group>` + `<a-checkbox>` | 第 326 行，動態生成的複選框組 |
| 明細項目輸入框 | `<a-input>` + `<a-input-number>` | 第 830、839、845、851 行，表單輸入欄位 |
| 總金額輸入 (`<input type="number">`) | `<a-input-number>` | 第 373 行 |
| 扣繳金額輸入 (`<input type="number">`) | `<a-input-number>` | 第 379 行 |
| 備註文字域 (`<textarea>`) | `<a-textarea>` | 第 385 行 |
| 表單錯誤提示 (`<div id="formError">`) | `<a-alert type="error">` | 第 241 行 |
| 空狀態提示 | `<a-empty>` | 第 674 行，「沒有符合條件的收據」 |
| 操作按鈕組 | `<a-space>` 或 `<a-button-group>` | 第 735-741 行，查看/列印按鈕組 |
| 說明提示框 | `<a-alert>` 或 `<a-typography-paragraph>` | 第 225、291、320、345、388 行，各種說明區域 |
| 公司資料選擇 Modal | `<a-modal>` | 第 1168 行，動態創建的公司選擇彈窗 |
| 明細項目刪除按鈕 | `<a-button type="link" danger>` | 第 825 行 |
| 新增明細項目按鈕 | `<a-button type="dashed">` | 第 366 行 |
| 取消/建立按鈕 | `<a-button>` | 第 398-399 行 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**路由路徑：** `/internal/receipts` 或 `/receipts`

**外殼應包含：**
- 頁面標題（「收據收款｜列表」）
- 搜尋篩選工具列（搜尋框、日期範圍、狀態篩選）
- 開收據提醒橫幅（條件顯示）
- 收據列表表格（主要內容區）
- 新增收據按鈕（觸發 Modal）

### 子路由 (Children) 拆分：

1. **收據詳情頁** (`/receipts/:id` 或 `/receipt-detail?id=xxx`)
   - 當前通過 `<a href="/internal/receipt-detail?id=...">` 跳轉
   - 應改為 Vue Router 路由
   - 包含：收據基本信息、收款記錄、操作按鈕（列印請款單、列印收據）

2. **新增/編輯收據表單組件** (`ReceiptFormModal.vue`)
   - 當前為 Modal 內的表單（第 217-402 行）
   - 應抽離為獨立組件
   - 包含：收據類型選擇、客戶選擇、服務期間、服務類型、明細項目、金額等

3. **收據提醒橫幅組件** (`ReceiptReminderBanner.vue`)
   - 當前為動態渲染的提醒橫幅（第 187、438-484 行）
   - 應抽離為獨立組件
   - 包含：提醒列表、快速開收據、暫緩功能

4. **收據明細項目組件** (`ReceiptItemForm.vue`)
   - 當前為動態生成的明細項目表單（第 815-869 行）
   - 應抽離為可複用組件
   - 包含：項目名稱、代辦費、規費、雜費、備註

5. **列印功能組件/服務** (`ReceiptPrintService.vue` 或 `useReceiptPrint.ts`)
   - 當前為全局函數 `printInvoice` 和 `printReceipt`（第 1207-1758 行）
   - 應抽離為 Composables 或服務類
   - 包含：請款單列印、收據列印、公司資料選擇

6. **公司資料選擇組件** (`CompanySelectorModal.vue`)
   - 當前為動態創建的公司選擇 Modal（第 1156-1205 行）
   - 應抽離為獨立組件
   - 包含：公司資料 1/2 選擇、載入狀態

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建檔案：** `src/composables/useReceiptApi.ts` 或 `src/api/receiptApi.ts`

**應抽離的 API 函數：**

1. **`loadReceiptReminders()`** (第 439-484 行)
   - 端點：`GET /receipts/reminders`
   - 功能：載入應開收據提醒列表
   - 返回：提醒數據陣列

2. **`loadClients()`** (第 549-570 行)
   - 端點：`GET /clients?perPage=1000`
   - 功能：載入客戶列表（用於下拉選單）
   - 返回：客戶數據陣列

3. **`loadServiceTypes()`** (第 573-586 行)
   - 端點：`GET /services/types`
   - 功能：載入所有服務類型
   - 返回：服務類型數據陣列

4. **`loadAllReceipts(params?)`** (第 758-785 行)
   - 端點：`GET /receipts?perPage=1000`
   - 功能：載入所有收據列表
   - 參數：可選的查詢參數（分頁、篩選等）
   - 返回：收據數據陣列

5. **`createReceipt(payload)`** (第 977-1085 行，部分邏輯)
   - 端點：`POST /receipts`
   - 功能：創建新收據
   - 參數：收據表單數據對象
   - 返回：創建結果

6. **`postponeReminder(data)`** (第 506-546 行)
   - 端點：`POST /receipts/reminders/postpone`
   - 功能：暫緩開票提醒
   - 參數：`{ client_service_id, service_month, postpone_reason }`
   - 返回：操作結果

7. **`getReceiptById(receiptId)`** (第 1335、1571 行，用於列印)
   - 端點：`GET /receipts/:receiptId`
   - 功能：獲取單個收據詳情
   - 返回：收據詳情數據

8. **`loadCompanyInfo(setNumber)`** (第 1126-1154 行)
   - 端點：`GET /settings?category=company{setNumber}`
   - 功能：載入公司資料
   - 參數：公司資料編號（1 或 2）
   - 返回：公司資料對象

**額外建議：**

- 使用 `axios` 或 `fetch` 封裝統一的 API 客戶端
- 統一處理 401 重定向邏輯（當前分散在多處）
- 使用 TypeScript 定義 API 請求和響應的類型
- 考慮使用 Vue Query 或 SWR 進行數據緩存和狀態管理
- 將列印相關的業務邏輯（民國紀年轉換、數字轉中文等）抽離為工具函數

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

### 第一步：建立基礎架構和 API 層

**具體步驟：**

1. **創建 Vue 3 專案結構**
   - 建立 `ReceiptsList.vue` 作為主頁面組件
   - 建立 `src/composables/useReceiptApi.ts` 用於 API 調用
   - 建立 `src/types/receipt.ts` 定義 TypeScript 類型

2. **抽離 API 函數**
   - 將所有 `fetch` 調用移到 `useReceiptApi.ts`
   - 統一處理錯誤和 401 重定向
   - 使用 TypeScript 定義請求和響應類型

3. **建立基礎路由**
   - 設置 `/receipts` 路由指向 `ReceiptsList.vue`
   - 設置 `/receipts/:id` 路由指向收據詳情頁（如果存在）

4. **替換最簡單的 UI 組件**
   - 先替換按鈕：將 `<button>` 改為 `<a-button>`
   - 再替換輸入框：將 `<input>` 改為 `<a-input>` 或 `<a-input-search>`
   - 最後替換下拉選單：將 `<select>` 改為 `<a-select>`

5. **建立表單組件框架**
   - 創建 `ReceiptFormModal.vue` 組件骨架
   - 使用 `<a-modal>` 和 `<a-form>` 建立基本結構
   - 暫時保留原有邏輯，後續逐步遷移

**優先級建議：**
- 高優先級：API 抽離、基礎路由、表格組件替換
- 中優先級：表單組件拆分、提醒橫幅組件化
- 低優先級：列印功能重構、樣式優化

**注意事項：**
- 保持原有功能不變，逐步遷移
- 先建立可運行的最小版本，再逐步完善
- 測試每個步驟，確保功能正常
- 考慮向後兼容，避免影響現有用戶

