# 頁面分析報告

檔案： settings.html

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 | 備註 |
|---------|-----------------|------|
| 標籤導航欄（`.settings-nav` + `.nav-tab`） | `<a-tabs>` | 6個標籤頁：服務項目、任務模板、用戶、公司資訊、自動化規則、國定假日 |
| 服務項目表格（`#servicesTable`） | `<a-table>` | 顯示服務ID、名稱、SOP、操作列 |
| 服務項目新增/編輯表單（`#addServiceForm`） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-select>` | 包含服務名稱輸入、SOP下拉選單 |
| 服務項目操作按鈕 | `<a-button type="primary">` / `<a-button type="primary" danger>` | 編輯、刪除按鈕 |
| 任務模板表格（`#templatesTable`） | `<a-table>` | 顯示模板名稱、服務類型、綁定客戶、任務階段數、操作 |
| 任務模板新增/編輯表單（`#addTemplateForm`） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-select>` + `<a-textarea>` | 包含模板名稱、服務項目、客戶、說明 |
| 任務階段配置表單（`#task-form-${templateId}`） | `<a-form>` + `<a-form-item>` + `<a-input-number>` + `<a-checkbox-group>` + `<a-select>` | 任務名稱、排序、SOP多選、資源文檔 |
| 任務階段列表展示 | `<a-collapse>` 或 `<a-list>` | 可展開的任務階段列表 |
| 用戶表格（`#usersTable`） | `<a-table>` | 顯示用戶ID、姓名、帳號、角色、狀態、操作 |
| 用戶新增/編輯表單（`#userForm`） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-select>` + `<a-input-password>` | 包含姓名、帳號、密碼、角色 |
| 員工個人資料表單（`#employeeProfileSection`） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-date-picker>` + `<a-select>` | 包含姓名、帳號、到職日、性別、Email |
| 修改密碼表單 | `<a-form>` + `<a-form-item>` + `<a-input-password>` | 目前密碼、新密碼、確認密碼 |
| 公司資訊表單（`#tab-company`） | `<a-form>` + `<a-form-item>` + `<a-input>` + `<a-tabs>` | 公司資料切換標籤（公司資料1、公司資料2） |
| 自動化規則表格（`#autoTasksTable`） | `<a-table>` | 顯示客戶名稱、服務名稱、組成部分、任務、生成規則、負責人 |
| 自動化規則搜尋框（`#autoSearchClient`） | `<a-input-search>` | 搜尋客戶名稱 |
| 自動化規則預覽按鈕 | `<a-button type="primary">` | 預覽下月任務 |
| 任務預覽模態框（`#taskPreviewModal`） | `<a-modal>` | 顯示任務預覽內容 |
| 國定假日表格（`#holidaysTable`） | `<a-table>` | 顯示日期、假日名稱、操作 |
| 國定假日新增/編輯表單（`#holidayForm`） | `<a-form>` + `<a-form-item>` + `<a-date-picker>` + `<a-input>` | 包含日期、假日名稱 |
| 批量上傳表單（`#batchUploadForm`） | `<a-form>` + `<a-form-item>` + `<a-radio-group>` + `<a-upload>` + `<a-textarea>` | CSV上傳或文字貼上 |
| 服務分組標題行（`.service-group-header`） | `<a-collapse>` + `<a-collapse-panel>` | 按服務類型分組的模板列表 |
| 載入中狀態（`.loading`） | `<a-spin>` | 表格載入中狀態 |
| 成功/錯誤提示 | `<a-message>` / `<a-notification>` | 替換 `alert()` 和 `confirm()` |
| 確認對話框 | `<a-modal>` + `Modal.confirm()` | 替換 `confirm()` |
| 狀態標籤（`.status-badge`） | `<a-tag>` | 用戶狀態標籤 |
| 搜尋欄（`.search-bar`） | `<a-space>` + `<a-input-search>` | 搜尋和操作按鈕區域 |
| 卡片容器（`.card`） | `<a-card>` | 內容卡片容器 |
| 表單操作按鈕組（`.action-btns`） | `<a-space>` | 儲存、取消按鈕組 |
| SOP 多選複選框列表 | `<a-checkbox-group>` + `<a-checkbox>` | 任務SOP多選功能 |
| SOP 已選標籤顯示 | `<a-tag>` + `closable` | 顯示已選SOP標籤 |
| SOP 搜尋輸入框 | `<a-input-search>` | 搜尋SOP功能 |
| 資源文檔下拉選單 | `<a-select>` | 選擇資源文檔 |
| 公司資料切換標籤 | `<a-tabs>` | 公司資料1、公司資料2切換 |
| 上傳方式單選按鈕 | `<a-radio-group>` + `<a-radio>` | CSV檔案或文字貼上 |
| 檔案上傳組件 | `<a-upload>` | CSV檔案上傳 |
| 範例下載按鈕 | `<a-button type="link">` | 下載CSV範例 |

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**路由路徑：** `/settings`

**外殼組件：** `SettingsLayout.vue`

**包含內容：**
- 統一的標籤導航欄（使用 `<a-tabs>`）
- 路由出口（`<router-view>`）
- 權限檢查邏輯（`#permBar`）
- 共用的導航邏輯和標籤緩存系統

### 子路由 (Children) 拆分：

| 子路由路徑 | 組件名稱 | 功能描述 | 對應的原始區塊 |
|-----------|---------|---------|--------------|
| `/settings/services` | `ServicesSettings.vue` | 服務項目管理 | `#tab-services` |
| `/settings/templates` | `TemplatesSettings.vue` | 任務模板管理 | `#tab-templates` |
| `/settings/users` | `UsersSettings.vue` | 用戶管理（管理員）或個人資料（員工） | `#tab-users` |
| `/settings/company` | `CompanySettings.vue` | 公司資訊設定 | `#tab-company` |
| `/settings/automation` | `AutomationSettings.vue` | 自動化規則概覽 | `#tab-automation` |
| `/settings/holidays` | `HolidaysSettings.vue` | 國定假日管理 | `#tab-holidays` |

**路由配置建議：**
```javascript
{
  path: '/settings',
  component: SettingsLayout,
  children: [
    { path: 'services', component: ServicesSettings },
    { path: 'templates', component: TemplatesSettings },
    { path: 'users', component: UsersSettings },
    { path: 'company', component: CompanySettings },
    { path: 'automation', component: AutomationSettings },
    { path: 'holidays', component: HolidaysSettings },
    { path: '', redirect: '/settings/services' }
  ]
}
```

**進一步拆分的子組件建議：**

1. **ServicesSettings.vue** 可拆分：
   - `ServiceForm.vue` - 服務新增/編輯表單
   - `ServicesTable.vue` - 服務列表表格

2. **TemplatesSettings.vue** 可拆分：
   - `TemplateForm.vue` - 模板新增/編輯表單
   - `TemplatesTable.vue` - 模板列表表格
   - `TemplateTaskConfig.vue` - 任務階段配置組件
   - `TaskStageForm.vue` - 任務階段表單
   - `TaskStageList.vue` - 任務階段列表

3. **UsersSettings.vue** 可拆分：
   - `UserList.vue` - 用戶列表（管理員）
   - `UserForm.vue` - 用戶新增/編輯表單
   - `EmployeeProfile.vue` - 員工個人資料（員工）
   - `PasswordChange.vue` - 修改密碼組件

4. **CompanySettings.vue** 可拆分：
   - `CompanyInfoForm.vue` - 公司資訊表單
   - `CompanyInfoTabs.vue` - 公司資料切換標籤

5. **AutomationSettings.vue** 可拆分：
   - `AutomationTasksTable.vue` - 自動化任務表格
   - `TaskPreviewModal.vue` - 任務預覽模態框
   - `ComponentTasksView.vue` - 組成部分任務配置視圖

6. **HolidaysSettings.vue** 可拆分：
   - `HolidayForm.vue` - 假日新增/編輯表單
   - `HolidaysTable.vue` - 假日列表表格
   - `BatchUploadForm.vue` - 批量上傳表單

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 API 檔案：** `src/api/useSettingsApi.js`

**應該被抽離的 API 函數：**

1. **服務項目相關 API：**
   - `getServices()` - 獲取服務列表
   - `getServiceById(serviceId)` - 獲取單個服務
   - `createService(data)` - 創建服務
   - `updateService(serviceId, data)` - 更新服務
   - `deleteService(serviceId)` - 刪除服務
   - `getServiceSOPs()` - 獲取服務層級SOP列表

2. **任務模板相關 API：**
   - `getTaskTemplates()` - 獲取任務模板列表
   - `getTaskTemplateById(templateId)` - 獲取單個模板
   - `createTaskTemplate(data)` - 創建任務模板
   - `updateTaskTemplate(templateId, data)` - 更新任務模板
   - `deleteTaskTemplate(templateId)` - 刪除任務模板
   - `getTemplateStages(templateId)` - 獲取模板任務階段
   - `createTemplateStage(templateId, data)` - 創建任務階段
   - `updateTemplateStage(templateId, stageId, data)` - 更新任務階段
   - `deleteTemplateStage(templateId, stageId)` - 刪除任務階段

3. **用戶相關 API：**
   - `getUsers()` - 獲取用戶列表
   - `getUserById(userId)` - 獲取單個用戶
   - `createUser(data)` - 創建用戶
   - `updateUser(userId, data)` - 更新用戶
   - `deleteUser(userId)` - 刪除用戶
   - `resetUserPassword(userId, newPassword)` - 重置用戶密碼
   - `getMyProfile()` - 獲取當前用戶資料
   - `updateMyProfile(data)` - 更新當前用戶資料
   - `changePassword(data)` - 修改密碼

4. **公司資訊相關 API：**
   - `getCompanySettings(setNumber)` - 獲取公司設定
   - `saveCompanySettings(setNumber, settings)` - 保存公司設定

5. **自動化規則相關 API：**
   - `getAutoGenerateComponents()` - 獲取自動生成任務的服務組成部分
   - `getComponentTasks(componentId)` - 獲取組成部分的任務配置
   - `previewNextMonthTasks(targetMonth)` - 預覽下月任務

6. **國定假日相關 API：**
   - `getHolidays()` - 獲取假日列表
   - `createHoliday(data)` - 創建假日
   - `updateHoliday(date, data)` - 更新假日
   - `deleteHoliday(date)` - 刪除假日
   - `batchCreateHolidays(holidays)` - 批量創建假日

7. **通用 API：**
   - `getSOPs(scope)` - 獲取SOP列表（scope: 'service' | 'task'）
   - `getClients()` - 獲取客戶列表
   - `getDocuments(category)` - 獲取文檔列表
   - `getSettings(category)` - 獲取設定
   - `batchUpdateSettings(category, settings)` - 批量更新設定

**API 檔案結構建議：**
```javascript
// src/api/useSettingsApi.js
import { ref } from 'vue'
import { message } from 'ant-design-vue'

export function useSettingsApi() {
  const loading = ref(false)
  
  // 服務項目相關
  const getServices = async () => { ... }
  const createService = async (data) => { ... }
  // ... 其他函數
  
  return {
    loading,
    // 服務項目
    getServices,
    createService,
    // ... 其他導出
  }
}
```

**在組件中使用：**
```javascript
// Settings.vue
import { useSettingsApi } from '@/api/useSettingsApi'

const { getServices, createService, loading } = useSettingsApi()
```

**狀態管理建議：**

考慮使用 Pinia 管理以下狀態：
- `useSettingsStore` - 設定相關狀態
- `useServicesStore` - 服務項目狀態
- `useTemplatesStore` - 任務模板狀態
- `useUsersStore` - 用戶狀態
- `useHolidaysStore` - 假日狀態

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

### 第一步：建立基礎路由結構和佈局組件

**具體步驟：**

1. **創建設定頁面的外殼組件（SettingsLayout.vue）**
   - 將原本的標籤導航欄（`.settings-nav`）轉換為 Ant Design Vue 的 `<a-tabs>` 組件
   - 設置路由導航邏輯，讓點擊標籤時切換到對應的子路由
   - 保留權限檢查邏輯（顯示「您沒有權限」的提示）
   - 實現標籤緩存系統（使用 Vue 的 `<keep-alive>` 或 Pinia 狀態管理）

2. **創建六個子路由組件的基本框架**
   - 為每個標籤頁創建對應的 Vue 組件檔案（ServicesSettings.vue、TemplatesSettings.vue 等）
   - 每個組件暫時只包含一個簡單的標題和「載入中」提示
   - 在路由配置中註冊這些子路由

3. **驗證路由切換功能**
   - 確保點擊不同的標籤能夠正確切換到對應的路由
   - 確保瀏覽器的前進/後退按鈕能夠正常工作
   - 確保直接訪問子路由（如 `/settings/services`）能夠正確顯示對應內容

4. **遷移共用的樣式和腳本邏輯**
   - 將共用的 CSS 樣式遷移到 SettingsLayout.vue 或全局樣式檔案
   - 將共用的 JavaScript 邏輯（如權限檢查、標籤緩存）遷移到組合式函數（composables）

**完成第一步後的預期結果：**

- 用戶點擊設定頁面的不同標籤時，URL 會相應變化（如 `/settings/services`、`/settings/templates`）
- 頁面內容會根據當前路由顯示對應的組件（雖然組件內容還很簡單）
- 導航體驗與原本的標籤切換類似，但使用了 Vue Router 的標準路由機制
- 為後續將每個標籤頁的具體功能遷移到對應組件做好準備

**為什麼這是第一步：**

因為這個頁面最大的特徵就是「多標籤頁結構」，先建立路由框架能夠：
- 將龐大的單一 HTML 檔案拆分成多個可管理的組件
- 為後續的逐步遷移提供清晰的結構
- 讓每個標籤頁的開發可以並行進行，不會互相影響
- 提供更好的用戶體驗（可以直接分享特定標籤頁的連結）

