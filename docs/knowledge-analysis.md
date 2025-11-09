# 頁面分析報告

## 檔案：knowledge.html

---

## 第一部分：可標準化的 UI 組件審計

| 原始元素 | 建議的 antdv 組件 | 說明 |
|---------|------------------|------|
| Tab 切換按鈕組 (`<div class="tabs">`) | `<a-tabs>` | 四個標籤：SOP、FAQ、資源中心、附件 |
| 搜尋輸入框 (`<input type="search" id="q">`) | `<a-input-search>` | 帶搜尋圖標和清除功能 |
| 服務類型下拉選單 (`<select id="category">`) | `<a-select>` | 動態載入服務類型選項 |
| 層級下拉選單 (`<select id="scope">`) | `<a-select>` | 服務/任務層級選擇 |
| 客戶下拉選單 (`<select id="client">`) | `<a-select>` | 客戶選擇器，支援搜索 |
| 年度/月份下拉選單 (`<select id="year/month">`) | `<a-select>` | 時間篩選器 |
| 標籤下拉選單 (`<select id="tags">`) | `<a-select mode="multiple">` | 多選標籤篩選 |
| 「管理標籤」按鈕 | `<a-button>` | 次要按鈕樣式 |
| 「新增」按鈕 | `<a-button type="primary">` | 主要操作按鈕 |
| 「編輯」/「刪除」按鈕 | `<a-button>` / `<a-button danger>` | 工具欄操作按鈕 |
| SOP 列表卡片 (`<div class="doc-card">`) | `<a-list>` + `<a-list-item>` | 左側列表展示 |
| FAQ 列表卡片 | `<a-list>` + `<a-list-item>` | 左側列表展示 |
| 資源列表卡片 | `<a-list>` + `<a-list-item>` | 左側列表展示 |
| 附件網格卡片 (`<div id="attachmentsList">`) | `<a-row>` + `<a-col>` + `<a-card>` | 網格佈局展示附件 |
| SOP 編輯抽屜 (`<div id="sopEditDrawer" class="drawer">`) | `<a-drawer>` | 右側滑出式編輯面板 |
| FAQ 編輯抽屜 (`<div id="faqEditDrawer" class="drawer">`) | `<a-drawer>` | 右側滑出式編輯面板 |
| 文檔上傳抽屜 (`<div id="uploadDocModal" class="drawer">`) | `<a-drawer>` | 文檔上傳面板 |
| 附件上傳抽屜 (`<div id="attachmentUploadDrawer">`) | `<a-drawer>` | 附件上傳面板 |
| 標籤管理彈窗 (`<div id="tagManagerModal">`) | `<a-modal>` | 標籤增刪改管理 |
| SOP 表單 (`<form id="sopFormDrawer">`) | `<a-form>` + `<a-form-item>` | 表單驗證和佈局 |
| FAQ 表單 (`<form id="faqFormDrawer">`) | `<a-form>` + `<a-form-item>` | 表單驗證和佈局 |
| 文檔上傳表單 (`<form id="resourceFormModal">`) | `<a-form>` + `<a-form-item>` | 表單驗證和佈局 |
| 文件上傳區域 (`<div class="file-upload-area">`) | `<a-upload>` | 拖拽上傳、進度顯示 |
| 標籤按鈕組 (`<div id="sop-tags-checkboxes">`) | `<a-checkbox-group>` | 標籤多選功能 |
| 分頁控制器 (`<div class="pagination">`) | `<a-pagination>` | 分頁導航 |
| 確認刪除對話框 (`confirm()`) | `<a-popconfirm>` | 刪除確認提示 |
| 載入中狀態 (`載入中…`) | `<a-spin>` | 載入動畫 |
| 空狀態展示 (`renderEmpty()`) | `<a-empty>` | 空數據提示 |
| 成功/錯誤提示 (`alert()`) | `<a-message>` / `<a-notification>` | 操作結果提示 |
| 進度條 (`<div id="resourceUploadProgressBar">`) | `<a-progress>` | 上傳進度顯示 |
| 標籤徽章 (`<span class="badge">`) | `<a-tag>` | 分類標籤顯示 |
| 左側面板收合按鈕 (`<div class="toggle-panel-btn">`) | `<a-button type="text" icon="">` | 面板收合控制 |
| 富文本編輯器容器 (`<div id="sop-editor-drawer">`) | 自定義組件包裝 Quill | 保持 Quill 功能，統一樣式 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

### 父路由 (Parent) 外殼：
**路由路徑：** `/knowledge` 或 `/internal/knowledge`

**外殼內容：**
- 頂部導航欄（共用）
- Tab 切換導航（SOP / FAQ / 資源中心 / 附件）
- 通用篩選器區域（搜尋、服務類型、層級、客戶、時間、標籤）
- 工具欄（新增、編輯、刪除按鈕）
- 路由出口 `<router-view>`（用於渲染子路由內容）

**共用狀態管理：**
- 當前激活的 Tab
- 篩選條件（搜尋關鍵字、服務類型、層級等）
- 服務類型列表
- 客戶列表
- 標籤庫

### 子路由 (Children) 拆分：

1. **子路由：** `/knowledge/sop`
   - **組件名稱：** `KnowledgeSOP.vue`
   - **功能：** SOP 流程文檔管理
   - **包含：** 左側 SOP 列表、右側預覽/編輯區域、SOP 編輯抽屜

2. **子路由：** `/knowledge/faq`
   - **組件名稱：** `KnowledgeFAQ.vue`
   - **功能：** FAQ 常見問答管理
   - **包含：** 左側 FAQ 列表、右側預覽/編輯區域、FAQ 編輯抽屜

3. **子路由：** `/knowledge/resources`
   - **組件名稱：** `KnowledgeResources.vue`
   - **功能：** 資源中心（文檔管理）
   - **包含：** 左側文檔列表、右側預覽區域、文檔上傳抽屜、文檔預覽（PDF/圖片）

4. **子路由：** `/knowledge/attachments`
   - **組件名稱：** `KnowledgeAttachments.vue`
   - **功能：** 附件管理
   - **包含：** 附件網格列表、附件上傳抽屜、附件篩選（客戶、類型）

### 共用組件拆分：

1. **標籤管理器組件：** `TagManager.vue`
   - 標籤的增刪改功能
   - 可被多個子路由複用

2. **富文本編輯器組件：** `RichTextEditor.vue`
   - 封裝 Quill 編輯器
   - 支援表格、圖片上傳等功能
   - 可被 SOP 和 FAQ 編輯表單使用

3. **文件上傳組件：** `FileUpload.vue`
   - 封裝文件上傳邏輯
   - 支援拖拽、進度顯示
   - 可被資源中心和附件上傳使用

4. **文檔預覽組件：** `DocumentPreview.vue`
   - PDF/圖片預覽
   - 下載功能
   - 可被資源中心使用

---

## 第三部分：資料與邏輯 (API) 抽離建議

### 建議：創建 `src/api/knowledge.js` 檔案

**應該被抽離的 API 函數：**

1. **SOP 相關 API：**
   ```javascript
   // 獲取 SOP 列表
   export const getSOPList = (params) => {}
   
   // 獲取單個 SOP
   export const getSOP = (id) => {}
   
   // 創建 SOP
   export const createSOP = (data) => {}
   
   // 更新 SOP
   export const updateSOP = (id, data) => {}
   
   // 刪除 SOP
   export const deleteSOP = (id) => {}
   ```

2. **FAQ 相關 API：**
   ```javascript
   // 獲取 FAQ 列表
   export const getFAQList = (params) => {}
   
   // 獲取單個 FAQ
   export const getFAQ = (id) => {}
   
   // 創建 FAQ
   export const createFAQ = (data) => {}
   
   // 更新 FAQ
   export const updateFAQ = (id, data) => {}
   
   // 刪除 FAQ
   export const deleteFAQ = (id) => {}
   ```

3. **文檔/資源相關 API：**
   ```javascript
   // 獲取文檔列表
   export const getDocumentList = (params) => {}
   
   // 獲取單個文檔
   export const getDocument = (id) => {}
   
   // 上傳文檔
   export const uploadDocument = (formData, onProgress) => {}
   
   // 下載文檔
   export const downloadDocument = (id) => {}
   
   // 刪除文檔
   export const deleteDocument = (id) => {}
   ```

4. **附件相關 API：**
   ```javascript
   // 獲取附件列表
   export const getAttachmentList = (params) => {}
   
   // 上傳附件
   export const uploadAttachment = (formData, onProgress) => {}
   
   // 刪除附件
   export const deleteAttachment = (id) => {}
   ```

5. **標籤相關 API：**
   ```javascript
   // 獲取標籤列表（從 localStorage 或 API）
   export const getTags = () => {}
   
   // 保存標籤（到 localStorage 或 API）
   export const saveTags = (tags) => {}
   ```

6. **共用數據 API：**
   ```javascript
   // 獲取服務類型列表
   export const getServiceTypes = () => {}
   
   // 獲取客戶列表
   export const getClients = () => {}
   ```

### 建議：創建 `src/composables/useKnowledge.js` 組合式函數

**應該被抽離的業務邏輯：**

1. **useSOP()** - SOP 管理邏輯
   - 列表載入、搜尋、篩選
   - 編輯、刪除、預覽

2. **useFAQ()** - FAQ 管理邏輯
   - 列表載入、搜尋、篩選
   - 編輯、刪除、預覽

3. **useResources()** - 資源管理邏輯
   - 列表載入、搜尋、篩選
   - 上傳、刪除、預覽

4. **useAttachments()** - 附件管理邏輯
   - 列表載入、搜尋、篩選
   - 上傳、刪除

5. **useTags()** - 標籤管理邏輯
   - 標籤列表、增刪改
   - 標籤選擇器

6. **useKnowledgeFilters()** - 篩選器邏輯
   - 篩選條件管理
   - 篩選條件持久化

---

## 第四部分：重構步驟總結

### 第一步：建立基礎結構和路由

**具體操作：**

1. **創建 Vue 3 專案結構**
   - 在專案中建立 `src/views/knowledge/` 目錄
   - 建立父組件 `Knowledge.vue` 作為外殼
   - 建立四個子組件：`KnowledgeSOP.vue`、`KnowledgeFAQ.vue`、`KnowledgeResources.vue`、`KnowledgeAttachments.vue`

2. **配置路由**
   - 設定父路由 `/knowledge`，使用 `Knowledge.vue`
   - 設定四個子路由，分別對應四個 Tab
   - 使用嵌套路由結構，子路由渲染在父組件的 `<router-view>` 中

3. **遷移 Tab 切換邏輯**
   - 將原本的 Tab 按鈕點擊事件改為路由跳轉
   - 使用 `<a-tabs>` 組件，綁定當前路由路徑
   - 確保切換 Tab 時正確導航到對應子路由

4. **遷移共用篩選器**
   - 將篩選器區域提取到父組件 `Knowledge.vue`
   - 使用 Vue 的 `provide/inject` 或 Pinia 狀態管理，讓子組件共享篩選條件
   - 將篩選器的 HTML 結構改為 Ant Design Vue 組件

**完成標準：**
- 可以在四個 Tab 之間正常切換
- 篩選器區域顯示在頂部，所有子路由共用
- 路由切換時 URL 正確更新
- 刷新頁面時能保持當前 Tab 狀態

**預期時間：** 2-3 小時

**下一步：** 完成第一步後，繼續遷移第一個子路由（SOP）的完整功能，包括列表展示、預覽、編輯、刪除等。

