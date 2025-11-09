# 統一的 API 層結構 (src/api/)

## API 檔案結構

```
src/api/
├── auth.js                 # 認證相關 API
├── clients.js              # 客戶相關 API
├── tasks.js                # 任務相關 API
├── dashboard.js            # 儀表板相關 API
├── timesheets.js           # 工時相關 API
├── receipts.js             # 收據相關 API
├── payroll.js              # 薪資相關 API
├── leaves.js               # 假期相關 API
├── costs.js                # 成本相關 API
├── trips.js                # 外出登記相關 API
├── knowledge.js            # 知識庫相關 API
├── settings.js             # 系統設定相關 API
├── billing.js              # 收費計劃相關 API
├── service-components.js   # 服務組成部分相關 API
├── users.js                # 用戶相關 API
├── sop.js                  # SOP 相關 API
├── tags.js                 # 標籤相關 API
├── services.js             # 服務相關 API
├── task-templates.js       # 任務模板相關 API
├── holidays.js             # 假日相關 API
└── request.js              # API 請求封裝（axios 或 fetch）
```

## API 函數列表

### 1. auth.js - 認證相關 API

```javascript
// 登入
login(username, password) // POST /auth/login

// 檢查 Session / 獲取當前用戶（主要函數）
checkSession() // GET /auth/me
// 別名，方便使用
fetchCurrentUser() // 等同於 checkSession()
getCurrentUser() // 等同於 checkSession()

// 登出
logout() // POST /auth/logout

// 修改密碼
changePassword(data) // POST /auth/change-password

// 獲取重定向目標（工具函數）
getRedirectTarget()

// 權限檢查輔助函數
checkAdminPermission() // 內部調用 checkSession()，檢查是否為管理員
```

**注意**: 
- `checkSession()` 是獲取當前用戶的**主要函數**，所有其他檔案都應該從 `auth.js` 導入此函數
- `fetchCurrentUser()` 和 `getCurrentUser()` 是 `checkSession()` 的別名，提供給需要不同命名風格的檔案使用
- 其他檔案（如 `timesheets.js`, `trips.js`, `payroll.js`, `settings.js`）不應該定義自己的獲取當前用戶函數，應該從 `auth.js` 導入

### 2. clients.js - 客戶相關 API

```javascript
// 客戶列表
fetchClients(params) // { page, perPage, q, tag_id, no_cache }

// 客戶詳情
fetchClientDetail(clientId) // GET /internal/api/v1/clients/${clientId}

// 創建客戶
createClient(payload) // POST /internal/api/v1/clients

// 更新客戶
updateClient(clientId, data) // PUT /internal/api/v1/clients/${clientId}

// 刪除客戶
deleteClient(clientId) // DELETE /internal/api/v1/clients/${clientId}

// 客戶服務
fetchClientServices(clientId) // GET /internal/api/v1/clients/${clientId} (服務列表包含在客戶詳情中)
createClientService(clientId, data) // POST /internal/api/v1/clients/${clientId}/services
updateClientService(clientId, serviceId, data) // PUT /internal/api/v1/clients/${clientId}/services/${serviceId}
deleteClientService(clientId, serviceId) // DELETE /internal/api/v1/clients/${clientId}/services/${serviceId}

// 客戶標籤
updateClientTags(clientId, tagIds) // PUT /internal/api/v1/clients/${clientId}/tags

// 批量操作
batchAssignClients(payload) // { client_ids, assignee_user_id }
previewMigrateClients(params)
migrateClients(params)

// 工具函數
getNextPersonalClientId() // GET /internal/api/v1/clients/next-personal-id

// 注意：客戶詳情頁面還需要使用以下 API，但這些 API 位於其他檔案中：
// - fetchBillingSchedules(serviceId) → 參見 billing.js
// - createBillingSchedule(data) → 參見 billing.js
// - updateBillingSchedule(scheduleId, data) → 參見 billing.js
// - deleteBillingSchedule(scheduleId) → 參見 billing.js
// - batchDeleteBillingSchedules(scheduleIds) → 參見 billing.js
// - fetchServiceComponents(serviceId) → 參見 service-components.js
// - createServiceComponent(serviceId, data) → 參見 service-components.js
// - updateServiceComponent(componentId, data) → 參見 service-components.js
// - deleteServiceComponent(componentId) → 參見 service-components.js
// - fetchAllTags() → 參見 tags.js
// - createTag(data) → 參見 tags.js
// - fetchAllServices() → 參見 services.js
// - fetchAllUsers() → 參見 users.js
// - fetchAllSOPs() → 參見 sop.js
// - fetchTaskTemplateStages(templateId) → 參見 task-templates.js
// - fetchServiceItems() → 參見 services.js
// - fetchTaskTemplates() → 參見 task-templates.js
```

### 3. tasks.js - 任務相關 API

```javascript
// 任務列表
fetchTasks(params) // { perPage, service_year, service_month, ... }

// 任務詳情
fetchTaskDetail(taskId)

// 創建任務
createTask(payload)

// 更新任務
updateTask(taskId, data)
updateTaskStatus(taskId, data)
updateTaskAssignee(taskId, assigneeUserId)
adjustTaskDueDate(taskId, data)

// 刪除任務
deleteTask(taskId)

// 任務 SOP
fetchTaskSOPs(taskId)
updateTaskSOPs(taskId, sopIds)

// 任務文檔
fetchTaskDocuments(taskId)
uploadTaskDocument(taskId, file, onProgress)
deleteDocument(documentId)

// 任務變更歷史
fetchTaskAdjustmentHistory(taskId)

// 任務總覽
fetchTaskOverview(params) // { months, statuses, sources, search }

// 批量操作
batchUpdateTaskStatus(taskIds, status)
batchAdjustTaskDueDate(taskIds, newDate, reason)
batchUpdateTaskAssignee(taskIds, assigneeId)

// 任務依賴
updateTaskDueDate(taskId, dueDate)
```

### 4. dashboard.js - 儀表板相關 API

```javascript
// 儀表板數據
fetchDashboardData(params) // { ym, financeYm, financeMode, activity_days, activity_user_id, activity_type }

// 注意：獲取當前用戶應該從 auth.js 導入
// import { checkSession } from '@/api/auth'
```

### 5. timesheets.js - 工時相關 API

```javascript
// 客戶和服務
fetchClients(params)
fetchClientServices(clientId)
fetchServiceItems(clientId, serviceId)

// 假日和請假
fetchHolidays(params) // { start_date, end_date }
fetchLeaves(params) // { dateFrom, dateTo, status, perPage }

// 工時記錄
fetchTimesheets(params) // { start_date, end_date }
saveTimesheets(payload) // { updates, creates, deletes }
deleteTimesheet(timesheetId)

// 統計
fetchMonthlySummary(params) // { month }

// 預取
prefetchTimesheets(params) // { weekCount }

// 注意：獲取當前用戶應該從 auth.js 導入
// import { checkSession } from '@/api/auth'
// 不要在此檔案中定義 fetchCurrentUser()
```

### 6. receipts.js - 收據相關 API

```javascript
// 收據列表
fetchAllReceipts(params) // { perPage, ... }

// 收據詳情
fetchReceiptDetail(receiptId)

// 創建收據
createReceipt(payload)

// 更新收據
updateReceipt(receiptId, payload)

// 刪除/作廢收據
cancelReceipt(receiptId)

// 收款記錄
createPayment(receiptId, payload)

// 收據提醒
fetchReceiptReminders()
postponeReminder(data)

// 公司資料
loadCompanyInfo(setNumber) // 1 或 2
```

### 7. payroll.js - 薪資相關 API

```javascript
// 薪資計算
loadPayrollPreview(month)
calculateEmployeePayroll(userId, month)

// 薪資項目類型
loadSalaryItemTypes()
createSalaryItemType(payload)
updateSalaryItemType(itemTypeId, payload)
toggleSalaryItemTypeStatus(itemTypeId, isActive)

// 員工薪資
loadAllUsers()
loadUserSalary(userId)
updateUserSalary(userId, payload)

// 績效獎金
loadYearlyBonus(year)
updateYearlyBonus(year, adjustments)

// 年終獎金
loadYearEndBonus(year)
updateYearEndBonus(year, bonuses)

// 系統設定
loadPayrollSettings()
updatePayrollSettings(settings)

// 打卡記錄
uploadPunchRecord(formData)
loadPunchRecords()
downloadPunchRecord(recordId)
previewPunchRecord(recordId)
deletePunchRecord(recordId)
```

### 8. leaves.js - 假期相關 API

```javascript
// 假期餘額
getLeavesBalances(year, userId?)

// 假期列表
getLeavesList(params) // { page, perPage, type, user_id }

// 假期操作
createLeave(payload)
updateLeave(leaveId, payload)
deleteLeave(leaveId)

// 重新計算餘額
recalculateLeaveBalances(userId)

// 生活事件
getLifeEvents(userId?)
createLifeEvent(payload)
deleteLifeEvent(eventId)
```

### 9. costs.js - 成本相關 API

```javascript
// 成本項目類型
fetchCostTypes()
createCostType(data)
updateCostType(id, data)
deleteCostType(id)

// 月度管理費用
fetchOverheadCosts(year, month)
createOverheadCost(data)
updateOverheadCost(id, data)
deleteOverheadCost(id)
generateOverheadCosts(year, month, templateIds)
previewOverheadCostsGeneration(year, month)

// 自動生成模板
fetchOverheadTemplate(costTypeId)
updateOverheadTemplate(costTypeId, data)

// 員工成本
fetchEmployeeCosts(year, month)

// 客戶任務成本
fetchClientCostsSummary(year, month)
fetchTaskCosts(year, month)

// 服務項目
fetchServiceItems()

// 權限
checkAdminPermission()
```

### 10. trips.js - 外出登記相關 API

```javascript
// 用戶列表（管理員用）
getUsers() // GET /users
// 客戶列表
getClients() // GET /clients?per_page=1000

// 外出登記
getTrips(params) // { month, client_id, user_id, bypassCache }
getTripsSummary(params) // { month, user_id, bypassCache }
createTrip(data)
updateTrip(tripId, data)
deleteTrip(tripId)

// 注意：
// - 獲取當前用戶應該從 auth.js 導入: import { checkSession } from '@/api/auth'
// - 不要在此檔案中定義 getCurrentUser()
```

### 11. knowledge.js - 知識庫相關 API

```javascript
// SOP
getSOPList(params)
getSOP(id)
createSOP(data)
updateSOP(id, data)
deleteSOP(id)

// FAQ
getFAQList(params)
getFAQ(id)
createFAQ(data)
updateFAQ(id, data)
deleteFAQ(id)

// 文檔/資源
getDocumentList(params)
getDocument(id)
uploadDocument(formData, onProgress)
downloadDocument(id)
deleteDocument(id)

// 附件
getAttachmentList(params)
uploadAttachment(formData, onProgress)
deleteAttachment(id)

// 標籤
getTags()
saveTags(tags)

// 共用數據
getServiceTypes()
getClients()
```

### 12. settings.js - 系統設定相關 API

```javascript
// 服務項目
getServices()
getServiceById(serviceId)
createService(data)
updateService(serviceId, data)
deleteService(serviceId)
getServiceSOPs()

// 任務模板
getTaskTemplates()
getTaskTemplateById(templateId)
createTaskTemplate(data)
updateTaskTemplate(templateId, data)
deleteTaskTemplate(templateId)
getTemplateStages(templateId)
createTemplateStage(templateId, data)
updateTemplateStage(templateId, stageId, data)
deleteTemplateStage(templateId, stageId)

// 用戶
getUsers()
getUserById(userId)
createUser(data)
updateUser(userId, data)
deleteUser(userId)
resetUserPassword(userId, newPassword)
updateMyProfile(data) // 更新當前用戶資料（需要先從 auth.js 獲取當前用戶）

// 注意：
// - 獲取當前用戶應該從 auth.js 導入: import { checkSession } from '@/api/auth'
// - getMyProfile() 已移除，統一使用 auth.js 中的 checkSession()
// - changePassword() 應該從 auth.js 導入: import { changePassword } from '@/api/auth'

// 公司資訊
getCompanySettings(setNumber)
saveCompanySettings(setNumber, settings)

// 自動化規則
getAutoGenerateComponents()
getComponentTasks(componentId)
previewNextMonthTasks(targetMonth)

// 國定假日
getHolidays()
createHoliday(data)
updateHoliday(date, data)
deleteHoliday(date)
batchCreateHolidays(holidays)

// 通用
getSOPs(scope) // 'service' | 'task'
getClients()
getDocuments(category)
getSettings(category)
batchUpdateSettings(category, settings)
```

### 13. billing.js - 收費計劃相關 API

```javascript
// 收費計劃
fetchBillingSchedules(serviceId)
createBillingSchedule(data)
updateBillingSchedule(scheduleId, data)
deleteBillingSchedule(scheduleId)
batchDeleteBillingSchedules(scheduleIds)
```

### 14. service-components.js - 服務組成部分相關 API

```javascript
// 服務組成部分
fetchServiceComponents(serviceId)
createServiceComponent(serviceId, data)
updateServiceComponent(componentId, data)
deleteServiceComponent(componentId)
```

### 15. users.js - 用戶相關 API

```javascript
// 用戶列表
fetchUsers()
fetchAllUsers()

// 用戶詳情
fetchUserDetail(userId) // GET /users/:userId

// 注意：
// - 獲取當前用戶應該從 auth.js 導入: import { checkSession } from '@/api/auth'
// - 此檔案只處理其他用戶的數據，不處理當前登入用戶
```

### 16. sop.js - SOP 相關 API

```javascript
// SOP 列表
fetchAllSOPs(params) // { perPage, category, scope }
```

### 17. tags.js - 標籤相關 API

```javascript
// 標籤列表
fetchTags()
fetchAllTags()

// 標籤操作
createTag(data)
updateTag(tagId, data)
deleteTag(tagId)
```

### 18. services.js - 服務相關 API

```javascript
// 服務列表
fetchServices()
fetchAllServices()

// 服務項目
fetchServiceItems()

// 客戶服務
fetchClientServices(clientId)
```

### 19. task-templates.js - 任務模板相關 API

```javascript
// 任務模板
fetchTaskTemplates()
fetchTaskTemplateStages(templateId)
```

### 20. holidays.js - 假日相關 API

```javascript
// 假日列表
fetchHolidays(params) // { start_date, end_date }
```

## API 請求封裝 (request.js)

### 使用 axios 封裝

```javascript
import axios from 'axios'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 創建 axios 實例
const request = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  withCredentials: true
})

// 請求攔截器
request.interceptors.request.use(
  (config) => {
    // 可以在這裡添加 token 等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 響應攔截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 統一錯誤處理
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      router.push('/login')
    } else if (error.response?.status === 403) {
      message.error('沒有權限')
    } else {
      message.error(error.response?.data?.message || '請求失敗')
    }
    return Promise.reject(error)
  }
)

// API 基礎路徑判斷
function getApiBase() {
  const onProdHost = window.location.hostname.endsWith('horgoscpa.com')
  return onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1'
}

export default request
```

## API 使用範例

### 在 Composables 中使用

```javascript
// src/composables/useClientApi.js
import request from '@/api/request'

export function useClientApi() {
  const fetchClients = async (params = {}) => {
    const response = await request.get('/clients', { params })
    return response.data
  }
  
  const createClient = async (payload) => {
    const response = await request.post('/clients', payload)
    return response.data
  }
  
  return {
    fetchClients,
    createClient
  }
}
```

## 注意事項

1. **統一錯誤處理**: 所有 API 請求都應該通過 `request.js` 封裝，統一處理錯誤
2. **401 重定向**: 當收到 401 錯誤時，自動登出並重定向到登入頁
3. **API 基礎路徑**: 根據環境自動判斷 API 基礎路徑
4. **請求超時**: 設置合理的請求超時時間
5. **Credentials**: 使用 `withCredentials: true` 支持 cookie

