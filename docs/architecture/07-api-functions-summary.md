# API 函數總覽

## 完整的 API 函數列表

本文檔列出了所有 API 檔案中的函數，方便查找和對照。

### auth.js - 認證相關 (6 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `login` | `username, password` | `Promise<{ok, data, message}>` | 用戶登入 |
| `checkSession` | - | `Promise<{ok, data}>` | **檢查 Session / 獲取當前用戶（主要函數）** |
| `fetchCurrentUser` | - | `Promise<{ok, data}>` | 獲取當前用戶（checkSession 的別名） |
| `getCurrentUser` | - | `Promise<{ok, data}>` | 獲取當前用戶（checkSession 的別名） |
| `checkAdminPermission` | - | `Promise<User>` | 檢查管理員權限（內部調用 checkSession） |
| `logout` | - | `Promise<void>` | 用戶登出 |
| `changePassword` | `data` | `Promise<{ok, message}>` | 修改密碼 |
| `getRedirectTarget` | - | `string \| null` | 獲取重定向目標（工具函數） |

**重要**: `checkSession()` 是獲取當前用戶的**唯一定義**，所有其他檔案都應該從 `auth.js` 導入此函數。

### clients.js - 客戶相關 (14 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchClients` | `params` | `Promise<{data, meta}>` | 獲取客戶列表 |
| `fetchClientDetail` | `clientId` | `Promise<ClientDetail>` | 獲取客戶詳情 |
| `createClient` | `payload` | `Promise<Client>` | 創建客戶 |
| `updateClient` | `clientId, data` | `Promise<Client>` | 更新客戶 |
| `deleteClient` | `clientId` | `Promise<void>` | 刪除客戶 |
| `fetchClientServices` | `clientId` | `Promise<ClientService[]>` | 獲取客戶服務列表 |
| `createClientService` | `clientId, data` | `Promise<ClientService>` | 創建客戶服務 |
| `updateClientService` | `clientId, serviceId, data` | `Promise<ClientService>` | 更新客戶服務 |
| `deleteClientService` | `clientId, serviceId` | `Promise<void>` | 刪除客戶服務 |
| `updateClientTags` | `clientId, tagIds` | `Promise<void>` | 更新客戶標籤 |
| `batchAssignClients` | `payload` | `Promise<{updated_count}>` | 批量分配客戶 |
| `previewMigrateClients` | `params` | `Promise<{match_count, sample}>` | 預覽移轉客戶 |
| `migrateClients` | `params` | `Promise<{updated_count}>` | 移轉客戶 |
| `getNextPersonalClientId` | - | `Promise<string>` | 獲取下一個個人客戶編號 |

### tasks.js - 任務相關 (18 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchTasks` | `params` | `Promise<Task[]>` | 獲取任務列表 |
| `fetchTaskDetail` | `taskId` | `Promise<TaskDetail>` | 獲取任務詳情 |
| `createTask` | `payload` | `Promise<Task>` | 創建任務 |
| `updateTask` | `taskId, data` | `Promise<Task>` | 更新任務 |
| `updateTaskStatus` | `taskId, data` | `Promise<void>` | 更新任務狀態 |
| `updateTaskAssignee` | `taskId, assigneeUserId` | `Promise<void>` | 更新任務負責人 |
| `adjustTaskDueDate` | `taskId, data` | `Promise<void>` | 調整任務到期日 |
| `deleteTask` | `taskId` | `Promise<void>` | 刪除任務 |
| `fetchTaskSOPs` | `taskId` | `Promise<SOP[]>` | 獲取任務 SOP 列表 |
| `updateTaskSOPs` | `taskId, sopIds` | `Promise<void>` | 更新任務 SOP |
| `fetchTaskDocuments` | `taskId` | `Promise<Document[]>` | 獲取任務文檔列表 |
| `uploadTaskDocument` | `taskId, file, onProgress` | `Promise<Document>` | 上傳任務文檔 |
| `deleteDocument` | `documentId` | `Promise<void>` | 刪除文檔 |
| `fetchTaskAdjustmentHistory` | `taskId` | `Promise<AdjustmentHistory[]>` | 獲取任務變更歷史 |
| `fetchTaskOverview` | `params` | `Promise<TaskOverview>` | 獲取任務總覽 |
| `batchUpdateTaskStatus` | `taskIds, status` | `Promise<void>` | 批量更新任務狀態 |
| `batchAdjustTaskDueDate` | `taskIds, newDate, reason` | `Promise<void>` | 批量調整任務到期日 |
| `batchUpdateTaskAssignee` | `taskIds, assigneeId` | `Promise<void>` | 批量更新任務負責人 |

### dashboard.js - 儀表板相關 (1 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchDashboardData` | `params` | `Promise<DashboardData>` | 獲取儀表板數據 |

### timesheets.js - 工時相關 (9 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchClients` | `params` | `Promise<Client[]>` | 獲取客戶列表 |
| `fetchClientServices` | `clientId` | `Promise<Service[]>` | 獲取客戶服務列表 |
| `fetchServiceItems` | `clientId, serviceId` | `Promise<ServiceItem[]>` | 獲取服務項目列表 |
| `fetchHolidays` | `params` | `Promise<Holiday[]>` | 獲取假日列表 |
| `fetchLeaves` | `params` | `Promise<Leave[]>` | 獲取請假記錄列表 |
| `fetchTimesheets` | `params` | `Promise<TimesheetLog[]>` | 獲取工時記錄列表 |
| `saveTimesheets` | `payload` | `Promise<{updated, created, deleted}>` | 批量保存工時記錄 |
| `deleteTimesheet` | `timesheetId` | `Promise<void>` | 刪除工時記錄 |
| `fetchMonthlySummary` | `params` | `Promise<MonthlySummary>` | 獲取月度統計 |
| `prefetchTimesheets` | `params` | `Promise<void>` | 預取工時數據 |

### receipts.js - 收據相關 (8 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchAllReceipts` | `params` | `Promise<Receipt[]>` | 獲取收據列表 |
| `fetchReceiptDetail` | `receiptId` | `Promise<ReceiptDetail>` | 獲取收據詳情 |
| `createReceipt` | `payload` | `Promise<Receipt>` | 創建收據 |
| `updateReceipt` | `receiptId, payload` | `Promise<Receipt>` | 更新收據 |
| `cancelReceipt` | `receiptId` | `Promise<void>` | 作廢收據 |
| `createPayment` | `receiptId, payload` | `Promise<Payment>` | 新增收款記錄 |
| `fetchReceiptReminders` | - | `Promise<Reminder[]>` | 獲取收據提醒列表 |
| `postponeReminder` | `data` | `Promise<void>` | 暫緩開票提醒 |
| `loadCompanyInfo` | `setNumber` | `Promise<CompanyInfo>` | 載入公司資料 |

### payroll.js - 薪資相關 (18 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `loadPayrollPreview` | `month` | `Promise<PayrollPreview>` | 載入薪資預覽 |
| `calculateEmployeePayroll` | `userId, month` | `Promise<PayrollDetail>` | 計算員工薪資 |
| `loadSalaryItemTypes` | - | `Promise<SalaryItemType[]>` | 載入薪資項目類型 |
| `createSalaryItemType` | `payload` | `Promise<SalaryItemType>` | 創建薪資項目類型 |
| `updateSalaryItemType` | `itemTypeId, payload` | `Promise<SalaryItemType>` | 更新薪資項目類型 |
| `toggleSalaryItemTypeStatus` | `itemTypeId, isActive` | `Promise<void>` | 啟用/停用薪資項目 |
| `loadAllUsers` | - | `Promise<User[]>` | 載入所有員工 |
| `loadUserSalary` | `userId` | `Promise<UserSalary>` | 載入員工薪資設定 |
| `updateUserSalary` | `userId, payload` | `Promise<UserSalary>` | 更新員工薪資設定 |
| `loadYearlyBonus` | `year` | `Promise<YearlyBonus>` | 載入全年績效獎金 |
| `updateYearlyBonus` | `year, adjustments` | `Promise<void>` | 更新全年績效獎金 |
| `loadYearEndBonus` | `year` | `Promise<YearEndBonus>` | 載入年終獎金 |
| `updateYearEndBonus` | `year, bonuses` | `Promise<void>` | 更新年終獎金 |
| `loadPayrollSettings` | - | `Promise<PayrollSettings>` | 載入系統設定 |
| `updatePayrollSettings` | `settings` | `Promise<void>` | 更新系統設定 |
| `uploadPunchRecord` | `formData` | `Promise<PunchRecord>` | 上傳打卡記錄 |
| `loadPunchRecords` | - | `Promise<PunchRecord[]>` | 載入打卡記錄列表 |
| `downloadPunchRecord` | `recordId` | `Promise<Blob>` | 下載打卡記錄 |
| `previewPunchRecord` | `recordId` | `Promise<PreviewData>` | 預覽打卡記錄 |
| `deletePunchRecord` | `recordId` | `Promise<void>` | 刪除打卡記錄 |

**注意**: `checkAuth()` 已移除，應該從 `auth.js` 導入 `checkSession()` 或 `checkAdminPermission()`

### leaves.js - 假期相關 (8 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `getLeavesBalances` | `year, userId?` | `Promise<Balance[]>` | 獲取假期餘額 |
| `getLeavesList` | `params` | `Promise<Leave[]>` | 獲取假期列表 |
| `createLeave` | `payload` | `Promise<Leave>` | 創建假期申請 |
| `updateLeave` | `leaveId, payload` | `Promise<Leave>` | 更新假期申請 |
| `deleteLeave` | `leaveId` | `Promise<void>` | 刪除假期申請 |
| `recalculateLeaveBalances` | `userId` | `Promise<void>` | 重新計算假期餘額 |
| `getLifeEvents` | `userId?` | `Promise<LifeEvent[]>` | 獲取生活事件列表 |
| `createLifeEvent` | `payload` | `Promise<LifeEvent>` | 登記生活事件 |
| `deleteLifeEvent` | `eventId` | `Promise<void>` | 刪除生活事件 |

### costs.js - 成本相關 (13 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchCostTypes` | - | `Promise<CostType[]>` | 獲取成本項目類型 |
| `createCostType` | `data` | `Promise<CostType>` | 創建成本項目類型 |
| `updateCostType` | `id, data` | `Promise<CostType>` | 更新成本項目類型 |
| `deleteCostType` | `id` | `Promise<void>` | 刪除成本項目類型 |
| `fetchOverheadCosts` | `year, month` | `Promise<OverheadCost[]>` | 獲取月度管理費用 |
| `createOverheadCost` | `data` | `Promise<OverheadCost>` | 創建月度記錄 |
| `updateOverheadCost` | `id, data` | `Promise<OverheadCost>` | 更新月度記錄 |
| `deleteOverheadCost` | `id` | `Promise<void>` | 刪除月度記錄 |
| `generateOverheadCosts` | `year, month, templateIds` | `Promise<void>` | 生成月度記錄 |
| `previewOverheadCostsGeneration` | `year, month` | `Promise<PreviewData>` | 預覽生成結果 |
| `fetchOverheadTemplate` | `costTypeId` | `Promise<OverheadTemplate>` | 獲取自動生成模板 |
| `updateOverheadTemplate` | `costTypeId, data` | `Promise<void>` | 更新自動生成模板 |
| `fetchEmployeeCosts` | `year, month` | `Promise<EmployeeCost[]>` | 獲取員工成本 |
| `fetchClientCostsSummary` | `year, month` | `Promise<ClientCostSummary[]>` | 獲取客戶成本彙總 |
| `fetchTaskCosts` | `year, month` | `Promise<TaskCost[]>` | 獲取任務成本 |
| `fetchServiceItems` | - | `Promise<ServiceItem[]>` | 獲取服務項目 |
| `checkAdminPermission` | - | `Promise<void>` | 檢查管理員權限 |

### trips.js - 外出登記相關 (6 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `getUsers` | - | `Promise<User[]>` | 獲取用戶列表（管理員用） |
| `getClients` | - | `Promise<Client[]>` | 獲取客戶列表 |
| `getTrips` | `params` | `Promise<Trip[]>` | 獲取外出登記列表 |
| `getTripsSummary` | `params` | `Promise<TripsSummary>` | 獲取外出登記統計 |
| `createTrip` | `data` | `Promise<Trip>` | 創建外出登記 |
| `updateTrip` | `tripId, data` | `Promise<Trip>` | 更新外出登記 |
| `deleteTrip` | `tripId` | `Promise<void>` | 刪除外出登記 |

**注意**: `getCurrentUser()` 已移除，應該從 `auth.js` 導入 `checkSession()`

### knowledge.js - 知識庫相關 (18 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `getSOPList` | `params` | `Promise<SOP[]>` | 獲取 SOP 列表 |
| `getSOP` | `id` | `Promise<SOP>` | 獲取單個 SOP |
| `createSOP` | `data` | `Promise<SOP>` | 創建 SOP |
| `updateSOP` | `id, data` | `Promise<SOP>` | 更新 SOP |
| `deleteSOP` | `id` | `Promise<void>` | 刪除 SOP |
| `getFAQList` | `params` | `Promise<FAQ[]>` | 獲取 FAQ 列表 |
| `getFAQ` | `id` | `Promise<FAQ>` | 獲取單個 FAQ |
| `createFAQ` | `data` | `Promise<FAQ>` | 創建 FAQ |
| `updateFAQ` | `id, data` | `Promise<FAQ>` | 更新 FAQ |
| `deleteFAQ` | `id` | `Promise<void>` | 刪除 FAQ |
| `getDocumentList` | `params` | `Promise<Document[]>` | 獲取文檔列表 |
| `getDocument` | `id` | `Promise<Document>` | 獲取單個文檔 |
| `uploadDocument` | `formData, onProgress` | `Promise<Document>` | 上傳文檔 |
| `downloadDocument` | `id` | `Promise<Blob>` | 下載文檔 |
| `deleteDocument` | `id` | `Promise<void>` | 刪除文檔 |
| `getAttachmentList` | `params` | `Promise<Attachment[]>` | 獲取附件列表 |
| `uploadAttachment` | `formData, onProgress` | `Promise<Attachment>` | 上傳附件 |
| `deleteAttachment` | `id` | `Promise<void>` | 刪除附件 |
| `getTags` | - | `Promise<Tag[]>` | 獲取標籤列表 |
| `saveTags` | `tags` | `Promise<void>` | 保存標籤 |
| `getServiceTypes` | - | `Promise<ServiceType[]>` | 獲取服務類型列表 |
| `getClients` | - | `Promise<Client[]>` | 獲取客戶列表 |

### settings.js - 系統設定相關 (27 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `getServices` | - | `Promise<Service[]>` | 獲取服務列表 |
| `getServiceById` | `serviceId` | `Promise<Service>` | 獲取單個服務 |
| `createService` | `data` | `Promise<Service>` | 創建服務 |
| `updateService` | `serviceId, data` | `Promise<Service>` | 更新服務 |
| `deleteService` | `serviceId` | `Promise<void>` | 刪除服務 |
| `getServiceSOPs` | - | `Promise<SOP[]>` | 獲取服務層級 SOP |
| `getTaskTemplates` | - | `Promise<TaskTemplate[]>` | 獲取任務模板列表 |
| `getTaskTemplateById` | `templateId` | `Promise<TaskTemplate>` | 獲取單個模板 |
| `createTaskTemplate` | `data` | `Promise<TaskTemplate>` | 創建任務模板 |
| `updateTaskTemplate` | `templateId, data` | `Promise<TaskTemplate>` | 更新任務模板 |
| `deleteTaskTemplate` | `templateId` | `Promise<void>` | 刪除任務模板 |
| `getTemplateStages` | `templateId` | `Promise<TaskTemplateStage[]>` | 獲取模板任務階段 |
| `createTemplateStage` | `templateId, data` | `Promise<TaskTemplateStage>` | 創建任務階段 |
| `updateTemplateStage` | `templateId, stageId, data` | `Promise<TaskTemplateStage>` | 更新任務階段 |
| `deleteTemplateStage` | `templateId, stageId` | `Promise<void>` | 刪除任務階段 |
| `getUsers` | - | `Promise<User[]>` | 獲取用戶列表 |
| `getUserById` | `userId` | `Promise<User>` | 獲取單個用戶 |
| `createUser` | `data` | `Promise<User>` | 創建用戶 |
| `updateUser` | `userId, data` | `Promise<User>` | 更新用戶 |
| `deleteUser` | `userId` | `Promise<void>` | 刪除用戶 |
| `resetUserPassword` | `userId, newPassword` | `Promise<void>` | 重置用戶密碼 |
| `updateMyProfile` | `data` | `Promise<User>` | 更新當前用戶資料 |
| `getCompanySettings` | `setNumber` | `Promise<CompanySettings>` | 獲取公司設定 |
| `saveCompanySettings` | `setNumber, settings` | `Promise<void>` | 保存公司設定 |
| `getAutoGenerateComponents` | - | `Promise<Component[]>` | 獲取自動生成任務的服務組成部分 |
| `getComponentTasks` | `componentId` | `Promise<Task[]>` | 獲取組成部分的任務配置 |
| `previewNextMonthTasks` | `targetMonth` | `Promise<TaskPreview[]>` | 預覽下月任務 |
| `getHolidays` | - | `Promise<Holiday[]>` | 獲取假日列表 |
| `createHoliday` | `data` | `Promise<Holiday>` | 創建假日 |
| `updateHoliday` | `date, data` | `Promise<Holiday>` | 更新假日 |
| `deleteHoliday` | `date` | `Promise<void>` | 刪除假日 |
| `batchCreateHolidays` | `holidays` | `Promise<void>` | 批量創建假日 |
| `getSOPs` | `scope` | `Promise<SOP[]>` | 獲取 SOP 列表 |
| `getClients` | - | `Promise<Client[]>` | 獲取客戶列表 |
| `getDocuments` | `category` | `Promise<Document[]>` | 獲取文檔列表 |
| `getSettings` | `category` | `Promise<Settings>` | 獲取設定 |
| `batchUpdateSettings` | `category, settings` | `Promise<void>` | 批量更新設定 |

**注意**: 
- `getMyProfile()` 已移除，應該從 `auth.js` 導入 `checkSession()`
- `changePassword()` 應該從 `auth.js` 導入

### billing.js - 收費計劃相關 (5 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchBillingSchedules` | `serviceId` | `Promise<BillingSchedule[]>` | 獲取收費計劃列表 |
| `createBillingSchedule` | `data` | `Promise<BillingSchedule>` | 創建收費計劃 |
| `updateBillingSchedule` | `scheduleId, data` | `Promise<BillingSchedule>` | 更新收費計劃 |
| `deleteBillingSchedule` | `scheduleId` | `Promise<void>` | 刪除收費計劃 |
| `batchDeleteBillingSchedules` | `scheduleIds` | `Promise<{ok, fail}>` | 批量刪除收費計劃 |

### service-components.js - 服務組成部分相關 (4 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchServiceComponents` | `serviceId` | `Promise<ServiceComponent[]>` | 獲取服務組成部分列表 |
| `createServiceComponent` | `serviceId, data` | `Promise<ServiceComponent>` | 創建服務組成部分 |
| `updateServiceComponent` | `componentId, data` | `Promise<ServiceComponent>` | 更新服務組成部分 |
| `deleteServiceComponent` | `componentId` | `Promise<void>` | 刪除服務組成部分 |

### users.js - 用戶相關 (3 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchUsers` | - | `Promise<User[]>` | 獲取用戶列表 |
| `fetchAllUsers` | - | `Promise<User[]>` | 獲取所有用戶列表 |
| `fetchUserDetail` | `userId` | `Promise<User>` | 獲取用戶詳情 |

### sop.js - SOP 相關 (1 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchAllSOPs` | `params` | `Promise<SOP[]>` | 獲取所有 SOP 列表 |

### tags.js - 標籤相關 (4 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchTags` | - | `Promise<Tag[]>` | 獲取標籤列表 |
| `fetchAllTags` | - | `Promise<Tag[]>` | 獲取所有標籤列表 |
| `createTag` | `data` | `Promise<Tag>` | 創建標籤 |
| `updateTag` | `tagId, data` | `Promise<Tag>` | 更新標籤 |
| `deleteTag` | `tagId` | `Promise<void>` | 刪除標籤 |

### services.js - 服務相關 (4 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchServices` | - | `Promise<Service[]>` | 獲取服務列表 |
| `fetchAllServices` | - | `Promise<Service[]>` | 獲取所有服務列表 |
| `fetchServiceItems` | - | `Promise<ServiceItem[]>` | 獲取服務項目列表 |
| `fetchClientServices` | `clientId` | `Promise<ClientService[]>` | 獲取客戶服務列表 |

### task-templates.js - 任務模板相關 (2 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchTaskTemplates` | - | `Promise<TaskTemplate[]>` | 獲取任務模板列表 |
| `fetchTaskTemplateStages` | `templateId` | `Promise<TaskTemplateStage[]>` | 獲取任務模板階段列表 |

### holidays.js - 假日相關 (1 個函數)

| 函數名 | 參數 | 返回 | 說明 |
|--------|------|------|------|
| `fetchHolidays` | `params` | `Promise<Holiday[]>` | 獲取假日列表 |

## 統計

- **總 API 檔案數**: 20 個
- **總函數數**: 約 145+ 個（已移除重複的獲取當前用戶函數）
- **最多函數的檔案**: settings.js (28+ 個函數)
- **最少函數的檔案**: holidays.js, sop.js (1 個函數)

## 重要說明

### 獲取當前用戶的統一使用方式

**所有獲取當前用戶的函數都應該從 `auth.js` 導入：**

```javascript
import { checkSession } from '@/api/auth'
// 或使用別名
import { fetchCurrentUser } from '@/api/auth'
import { getCurrentUser } from '@/api/auth'
```

**不要在其他檔案中定義自己的獲取當前用戶函數。**

詳細說明請參見 `10-api-import-guide.md`。

## 注意事項

1. **函數命名規範**: 統一使用動詞開頭（fetch, create, update, delete, get, load）
2. **參數規範**: 使用對象參數傳遞多個參數，提高可讀性
3. **返回規範**: 統一返回 Promise，成功時返回數據，失敗時拋出錯誤
4. **錯誤處理**: 所有錯誤統一在 `request.js` 中處理

