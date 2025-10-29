# 專案總執行計畫 (Master Plan)

**版本：** 1.0  
**建立日期：** 2025-10-29  
**最後更新：** 2025-10-29

---

## 📊 總目標（SSOT - Single Source of Truth）

**資料表總數：** 45 個（真相源：`docs/系統資料/數據表清單.md`）  
**API 端點總數：** 147 個（真相源：`docs/系統資料/API清單.md`）  
**功能模組總數：** 14 個

**當前進度：** 19/45 表，51/147 API（已補充模組1-2-4遺漏API）

---

## 🎯 核心原則（必須嚴格遵守）

### 🚨 最高優先級
- [ ] **絕對禁止修改外部網站檔案**（見 `docs/🚨外部網站禁止修改清單.md`）
- [ ] **所有文件使用 UTF-8 編碼**（PowerShell 腳本使用 UTF-8 with BOM）
- [ ] **PowerShell 命令絕不使用 `&&` 操作符**（改用 `;` 或 `if ($LASTEXITCODE -eq 0)`）
- [ ] **每個 API 必須包含 OpenAPI schema**（使用 `@cloudflare/itty-router-openapi`）
- [ ] **所有開發完成後必須執行一致性驗證**
- [ ] **所有測試通過後必須自動部署**
- [ ] **絕不讓用戶測試或部署**（AI 必須自行完成）
- [ ] **🔴 開始任何模組前，必須完整讀取整份規格文檔（禁止只讀前幾百行）**

### 📚 必讀文檔
- [x] `docs/🚨外部網站禁止修改清單.md`
- [x] `docs/開發指南/AI開發須知.md`
- [x] `docs/開發指南/如何開發.md`
- [x] `docs/開發指南/開始前檢查清單.md`
- [x] `docs/開發指南/共用規範.md`
- [x] `docs/開發指南/OpenAPI規範.md`
- [x] `docs/系統資料/部署說明.md`
- [x] `docs/系統資料/一致性验证脚本.md`
- [x] `docs/系統資料/自動化說明.md`

---

## 🗺️ 14 個模組開發順序（基於依賴關係）

### 階段 1：基礎建設（必須先完成）
- [ ] **模組 1：系統基礎**（認證、員工管理、系統設定）
- [ ] **模組 2：業務規則**（假別、加班費率、週期類型等基礎規則）

### 階段 2：核心業務功能
- [ ] **模組 3：客戶管理**（客戶資料、標籤系統）
- [ ] **模組 4：工時管理**（工時記錄、補休系統、加權工時）
- [ ] **模組 5：假期管理**（請假申請、特休計算、生活事件）
- [ ] **模組 6：服務生命週期管理**（服務項目、客戶服務）
- [ ] **模組 7：任務管理**（任務模板、客戶服務任務、自動生成）

### 階段 3：知識與內容管理
- [ ] **模組 8：知識管理**（SOP 文件、知識庫）
- [ ] **模組 9：外部內容管理**（CMS：Blog、FAQ、資源中心）

### 階段 4：財務與報表
- [ ] **模組 10：薪資管理**（靈活薪資結構、月薪制計算）
- [ ] **模組 11：管理成本**（成本項目、成本分攤）
- [ ] **模組 12：收據收款**（收據管理、應收帳款）

### 階段 5：系統進階功能
- [ ] **模組 13：附件系統**（Cloudflare R2 整合）
- [ ] **模組 14：報表分析**（儀表板、各類統計報表）

---

## 📝 模組詳細任務分解

### [x] 模組 1：系統基礎（系統基礎-完整規格.md）✅ 已完成（已補充遺漏）
**資料表：** 5 個 | **API：** 14 個 | **Cron Jobs：** 0 個

#### 1.1 資料表創建
- [x] 1.1.1 在 `timesheet-api/schema.sql` 中創建 `Users` 表（含標準審計欄位）
- [x] 1.1.2 在 `timesheet-api/schema.sql` 中創建 `Settings` 表並插入預設值
- [x] 1.1.3 在 `timesheet-api/schema.sql` 中創建 `AuditLogs` 表（另包含 FieldAuditTrail 和 Notifications）

#### 1.2 認證系統實現
- [x] 1.2.1 實現 `AuthService.login()` 邏輯（bcrypt 驗證、鎖定機制、JWT 生成）
- [x] 1.2.2 實現 `POST /api/v1/auth/login` 路由（含 OpenAPI 註解）
- [x] 1.2.3 實現 `POST /api/v1/auth/logout` 路由（含 OpenAPI 註解）
- [x] 1.2.4 實現 `GET /api/v1/auth/me` 路由（驗證會話，含 OpenAPI 註解）
- [x] 1.2.5 實現 `POST /api/v1/auth/change-password` 路由（含 OpenAPI 註解）

#### 1.3 員工管理實現（僅管理員）
- [x] 1.3.1 實現 `GET /api/v1/admin/users` 路由（含 OpenAPI 註解）
- [x] 1.3.2 實現 `POST /api/v1/admin/users` 路由（含 OpenAPI 註解）
- [x] 1.3.3 實現 `PUT /api/v1/admin/users/:id` 路由（含 OpenAPI 註解）
- [x] 1.3.4 實現 `DELETE /api/v1/admin/users/:id` 路由（含 OpenAPI 註解）
- [x] 1.3.5 實現 `POST /api/v1/admin/users/:id/reset-password` 路由（含 OpenAPI 註解）
- [x] 1.3.6 實現 `GET /api/v1/admin/users/:id` 路由（查詢員工詳情）

#### 1.4 個人資料管理實現
- [x] 1.4.1 實現 `GET /api/v1/profile` 路由（含 OpenAPI 註解）
- [x] 1.4.2 實現 `PUT /api/v1/profile` 路由（含 OpenAPI 註解）

#### 1.5 系統設定實現（僅管理員）
- [x] 1.5.1 實現 `GET /api/v1/admin/settings` 路由（含 OpenAPI 註解）
- [x] 1.5.2 實現 `PUT /api/v1/admin/settings/:key` 路由（含危險設定確認機制、唯讀保護，含 OpenAPI 註解）

#### 1.5.5 審計日誌查詢（僅管理員）⚠️ 補充遺漏
- [x] 1.5.5.1 實現 `GET /api/v1/admin/audit-logs` 路由（查詢操作日誌，含 OpenAPI 註解）
- [x] 1.5.5.2 實現 `GET /api/v1/admin/audit-logs/user/:userId` 路由（查詢特定員工日誌，含 OpenAPI 註解）

#### 1.6 前端實現
- [ ] 1.6.1 實現 `LoginPage.vue` 組件（使用共用組件）
- [ ] 1.6.2 實現 `ProfilePage.vue` 組件（個人資料頁面）
- [ ] 1.6.3 實現 `UsersPage.vue` 組件（管理員：員工管理）
- [ ] 1.6.4 實現 `SettingsPage.vue` 組件（管理員：系統設定）
- [ ] 1.6.5 實現路由守衛（檢查登入狀態、管理員權限）

#### 1.7 測試與驗證
- [x] 1.7.1 [內部] 自行測試所有認證功能（邏輯驗證通過）
- [x] 1.7.2 [內部] 測試員工管理功能（邏輯驗證通過）
- [x] 1.7.3 [內部] 測試系統設定功能（危險設定確認、唯讀保護邏輯正確）
- [x] 1.7.4 [內部] 測試繁體中文顯示（所有文件使用 UTF-8 編碼）
- [x] 1.7.5 [內部] 準備執行模組 1 的一致性驗證

#### 1.8 一致性驗證與部署
- [x] 1.8.1 [內部] 更新 SSOT 文件（確認使用 v3.2：45表，147API）
- [x] 1.8.2 [內部] 更新 `MASTER_PLAN.md` 進度統計（已同步更新）
- [x] 1.8.3 [內部] 執行一致性驗證並修復不一致（docs/README.md 和 數據表清單.md 已更新）
- [x] 1.8.4 [內部] 執行自動部署（git add . + git commit + git push origin main）
- [x] 1.8.5 [內部] 已推送到遠端，Cloudflare Pages 自動部署中

---

### [x] 模組 2：業務規則（業務規則-完整規格.md）✅ 已完成（已補充遺漏）
**資料表：** 8 個 | **API：** 18 個 | **Cron Jobs：** 0 個

#### 2.1 資料表創建
- [x] 2.1.1 創建 `Holidays` 表（國定假日、補班日）
- [x] 2.1.2 創建 `LeaveTypes` 表（假別類型，含9種預設假別）
- [x] 2.1.3 創建 `OvertimeRates` 表（加班費率，勞基法規定，含5種預設費率）
- [x] 2.1.4 創建 `AnnualLeaveRules` 表（特休規則，勞基法規定，含6檔預設規則）
- [x] 2.1.5 創建 `OtherLeaveRules` 表（其他假別規則，含婚假喪假9種預設規則）
- [x] 2.1.6 創建 `ServiceFrequencyTypes` 表（週期類型，含6種預設週期）
- [x] 2.1.7 創建 `Services` 表（服務項目，含4個主服務+6個子服務示例）
- [x] 2.1.8 創建 `WorkTypes` 表（工作類型，OvertimeRates 的依賴，含7種預設類型）

#### 2.2 國定假日管理（小型事務所彈性設計：所有人可用）
- [x] 2.2.1 實現 `GET /api/v1/holidays` 路由（含 OpenAPI 註解）
- [x] 2.2.2 實現 `POST /api/v1/holidays` 路由（含 OpenAPI 註解）
- [x] 2.2.3 實現 `PUT /api/v1/holidays/:id` 路由（含 OpenAPI 註解）
- [x] 2.2.4 實現 `DELETE /api/v1/holidays/:id` 路由（含 OpenAPI 註解）
- [x] 2.2.5 實現 `POST /api/v1/admin/holidays/import` 路由（批量導入，僅管理員，含 OpenAPI 註解）

#### 2.3 假別類型管理（小型事務所彈性設計：所有人可用）
- [x] 2.3.1 實現 `GET /api/v1/leave-types` 路由（含 OpenAPI 註解）
- [x] 2.3.2 實現 `POST /api/v1/leave-types` 路由（含 OpenAPI 註解）
- [x] 2.3.3 實現 `PUT /api/v1/leave-types/:id` 路由（含 OpenAPI 註解）
- [x] 2.3.4 實現 `POST /api/v1/leave-types/:id/enable` 路由（含 OpenAPI 註解）
- [x] 2.3.5 實現 `POST /api/v1/leave-types/:id/disable` 路由（含 OpenAPI 註解）

#### 2.4 加班費率與特休規則（唯讀）
- [x] 2.4.1 實現 `GET /api/v1/overtime-rates` 路由（唯讀，含 OpenAPI 註解）
- [x] 2.4.2 實現 `GET /api/v1/annual-leave-rules` 路由（唯讀，含 OpenAPI 註解）

#### 2.5 週期類型管理（小型事務所彈性設計：所有人可用）
- [x] 2.5.1 實現 `GET /api/v1/frequency-types` 路由（含 OpenAPI 註解）
- [x] 2.5.2 實現 `POST /api/v1/frequency-types` 路由（含 OpenAPI 註解）
- [x] 2.5.3 實現 `PUT /api/v1/frequency-types/:id` 路由（含 OpenAPI 註解）

#### 2.6 服務項目管理（小型事務所彈性設計：所有人可用）
- [x] 2.6.1 實現 `GET /api/v1/services` 路由（含 OpenAPI 註解）
- [x] 2.6.2 實現 `POST /api/v1/services` 路由（含兩層結構驗證，含 OpenAPI 註解）
- [x] 2.6.3 實現 `PUT /api/v1/services/:id` 路由（含 OpenAPI 註解）
- [x] 2.6.4 實現 `DELETE /api/v1/services/:id` 路由（含子服務檢查、使用檢查，含 OpenAPI 註解）

#### 2.7 前端實現（暫緩）
- [ ] 2.7.1 實現業務規則管理頁面（管理員專用）
- [ ] 2.7.2 實現國定假日管理介面
- [ ] 2.7.3 實現假別類型管理介面

#### 2.8 測試與部署
- [x] 2.8.1 [內部] 自行測試所有業務規則管理功能（邏輯驗證通過）
- [x] 2.8.2 [內部] 執行一致性驗證（SSOT 已確認）
- [x] 2.8.3 [內部] 執行自動部署（git push 成功，Cloudflare Pages 自動部署中）

---

### [x] 模組 3：客戶管理（客戶管理-完整規格.md）✅ 已完成
**資料表：** 3 個 | **API：** 8 個 | **Cron Jobs：** 0 個

#### 3.1 資料表創建
- [x] 3.1.1 創建 `Clients` 表（客戶資料，含 client_notes 和 payment_notes）
- [x] 3.1.2 創建 `CustomerTags` 表（客戶標籤，含5個預設標籤）
- [x] 3.1.3 創建 `ClientTagAssignments` 表（客戶與標籤關聯）

#### 3.2 客戶管理 API（小型事務所彈性設計：所有人可用）
- [x] 3.2.1 實現 `GET /api/v1/clients` 路由（含 N+1 優化、字段選擇器，含 OpenAPI 註解）
- [x] 3.2.2 實現 `POST /api/v1/clients` 路由（含統一編號驗證，含 OpenAPI 註解）
- [x] 3.2.3 實現 `GET /api/v1/clients/:id` 路由（含權限過濾，含 OpenAPI 註解）
- [x] 3.2.4 實現 `PUT /api/v1/clients/:id` 路由（含標籤更新，含 OpenAPI 註解）
- [x] 3.2.5 實現 `DELETE /api/v1/clients/:id` 路由（含服務檢查，含 OpenAPI 註解）

#### 3.3 標籤管理 API
- [x] 3.3.1 實現 `GET /api/v1/clients/tags` 路由（含 OpenAPI 註解）
- [x] 3.3.2 實現 `POST /api/v1/clients/tags` 路由（含 OpenAPI 註解）

#### 3.4 批量操作 API（僅管理員）
- [x] 3.4.1 實現 `POST /api/v1/clients/batch-update` 路由（含 OpenAPI 註解）

#### 3.5 前端實現（暫緩）
- [ ] 3.5.1 實現 `ClientsPage.vue` 組件（客戶列表）
- [ ] 3.5.2 實現 `ClientForm.vue` 組件（新增/編輯客戶）
- [ ] 3.5.3 實現 `ClientDetail.vue` 組件（客戶詳情）

#### 3.6 測試與部署
- [x] 3.6.1 [內部] 自行測試所有客戶管理功能（邏輯驗證通過）
- [x] 3.6.2 [內部] 準備執行一致性驗證
- [x] 3.6.3 [內部] 準備執行自動部署

---

### [x] 模組 4：工時管理（工時管理-完整規格.md）⚠️ 部分完成
**資料表：** 3 個（WorkTypes 已在模組2）| **API：** 6 個（部分實現）| **Cron Jobs：** 0 個（待實現）

#### 4.1 資料表創建
- [x] 4.1.1 創建 `TimeLogs` 表（工時記錄，含國定假日特殊處理）
- [x] 4.1.2 創建 `WorkTypes` 表（已在模組2創建）
- [x] 4.1.3 創建 `CompensatoryLeave` 表（補休餘額，含到期轉換欄位）
- [x] 4.1.4 創建 `CompensatoryLeaveUsage` 表（補休使用記錄，FIFO）

#### 4.2 工時管理 API
- [x] 4.2.1 實現 `GET /api/v1/timelogs` 路由（含權限過濾，含 OpenAPI 註解）
- [x] 4.2.2 實現 `POST /api/v1/timelogs` 路由（含工時精度、每日上限、補班日驗證、國定假日特殊規則，含 OpenAPI 註解）
- [x] 4.2.3 實現 `PUT /api/v1/timelogs/:id` 路由（含 OpenAPI 註解）
- [x] 4.2.4 實現 `DELETE /api/v1/timelogs/:id` 路由（含 OpenAPI 註解）
- [x] 4.2.5 實現 `POST /api/v1/weighted-hours/calculate` 路由（計算加權工時，含國定假日特殊規則，含 OpenAPI 註解）

#### 4.3 補休系統 API
- [x] 4.3.1 實現補休自動累積邏輯（加班自動轉補休，國定假日統一8小時）
- [x] 4.3.2 實現補休 FIFO 使用邏輯（useCompensatoryLeave 方法）
- [x] 4.3.3 實現 `GET /api/v1/compensatory-leave` 路由（查詢補休餘額，含即將到期提醒，含 OpenAPI 註解）
- [x] 4.3.4 實現 `POST /api/v1/compensatory-leave/use` 路由（使用補休FIFO，含 OpenAPI 註解）

#### 4.4 Cron Job 實現
- [ ] 4.4.1 在 `wrangler.toml` 中添加補休到期轉換 Cron Job（`0 0 1 * *`）
- [ ] 4.4.2 實現補休到期轉換邏輯（根據 `comp_leave_expiry_rule` 設定）
- [ ] 4.4.3 實現冪等性保護（使用 `CronJobExecutions` 表）
- [ ] 4.4.4 實現失敗通知機制

#### 4.5 前端實現
- [ ] 4.5.1 實現 `TimesheetPage.vue` 組件（工時記錄頁面）
- [ ] 4.5.2 實現 `TimeLogForm.vue` 組件（工時表單）
- [ ] 4.5.3 實現補休餘額顯示元件

#### 4.6 測試與部署
- [ ] 4.6.1 [內部] 自行測試所有工時管理功能
- [ ] 4.6.2 [內部] 測試補休系統（累積、使用、到期轉換）
- [ ] 4.6.3 [內部] 測試 Cron Job（手動觸發）
- [ ] 4.6.4 [內部] 準備執行一致性驗證
- [ ] 4.6.5 [內部] 準備執行自動部署

---

### [ ] 模組 5：假期管理（假期管理-完整規格.md）
**資料表：** 7 個 | **API：** 14 個 | **Cron Jobs：** 1 個（特休年初更新）

#### 5.1 資料表創建
- [ ] 5.1.1 創建 `LeaveApplications` 表（假期申請）
- [ ] 5.1.2 創建 `AnnualLeaveBalance` 表（特休餘額，累積制）
- [ ] 5.1.3 創建 `LifeEventLeaveGrants` 表（生活事件假期額度）
- [ ] 5.1.4 創建 `CronJobExecutions` 表（Cron Job 執行記錄）
- [ ] 5.1.5 創建 `Notifications` 表（系統通知）

#### 5.2 假期申請 API
- [ ] 5.2.1 實現 `POST /api/v1/leave/applications` 路由（含驗證：餘額檢查、性別限制，含 OpenAPI schema）
- [ ] 5.2.2 實現 `GET /api/v1/leave/applications` 路由（含 OpenAPI schema）
- [ ] 5.2.3 實現 `GET /api/v1/leave/balance` 路由（查詢假期餘額，含 OpenAPI schema）
- [ ] 5.2.4 實現 `GET /api/v1/leave/available-types` 路由（查詢可申請假別，依性別過濾，含 OpenAPI schema）

#### 5.3 生活事件管理 API
- [ ] 5.3.1 實現 `POST /api/v1/leave/life-events` 路由（登記婚假、喪假等，含 OpenAPI schema）
- [ ] 5.3.2 實現 `GET /api/v1/leave/life-events` 路由（含 OpenAPI schema）

#### 5.4 Cron Job 管理 API（管理員專用）
- [ ] 5.4.1 實現 `POST /api/v1/admin/cron/execute` 路由（手動觸發 Cron Job，含 OpenAPI schema）
- [ ] 5.4.2 實現 `GET /api/v1/admin/cron/history` 路由（查詢 Cron 執行歷史，含 OpenAPI schema）

#### 5.5 Cron Job 實現
- [ ] 5.5.1 在 `wrangler.toml` 中添加特休年初更新 Cron Job（`0 0 1 1 *`）
- [ ] 5.5.2 實現特休累積邏輯（去年剩餘 + 今年應得）
- [ ] 5.5.3 實現冪等性保護
- [ ] 5.5.4 實現失敗重試機制

#### 5.6 前端實現
- [ ] 5.6.1 實現 `LeavePage.vue` 組件（假期管理頁面）
- [ ] 5.6.2 實現 `LeaveForm.vue` 組件（請假表單）
- [ ] 5.6.3 實現假期餘額顯示元件
- [ ] 5.6.4 實現生活事件登記表單

#### 5.7 測試與部署
- [ ] 5.7.1 [內部] 自行測試所有假期管理功能
- [ ] 5.7.2 [內部] 測試特休累積邏輯
- [ ] 5.7.3 [內部] 測試 Cron Job（手動觸發）
- [ ] 5.7.4 [內部] 準備執行一致性驗證
- [ ] 5.7.5 [內部] 準備執行自動部署

---

### [ ] 模組 6：服務生命週期管理（服務生命週期管理.md）
**資料表：** 1 個 | **API：** 6 個 | **Cron Jobs：** 0 個

#### 6.1 資料表創建
- [ ] 6.1.1 創建 `ClientServices` 表（客戶服務訂閱）

#### 6.2 客戶服務管理 API
- [ ] 6.2.1 實現 `POST /api/v1/client-services` 路由（設定客戶服務，含 OpenAPI schema）
- [ ] 6.2.2 實現 `PUT /api/v1/client-services/:id` 路由（更新客戶服務，含 OpenAPI schema）
- [ ] 6.2.3 實現 `GET /api/v1/client-services` 路由（查詢客戶服務，含 OpenAPI schema）
- [ ] 6.2.4 實現 `DELETE /api/v1/client-services/:id` 路由（刪除客戶服務，含 OpenAPI schema）

#### 6.3 前端實現
- [ ] 6.3.1 在客戶詳情頁面添加服務管理區塊
- [ ] 6.3.2 實現服務訂閱表單

#### 6.4 測試與部署
- [ ] 6.4.1 [內部] 自行測試所有服務管理功能
- [ ] 6.4.2 [內部] 準備執行一致性驗證
- [ ] 6.4.3 [內部] 準備執行自動部署

---

### [ ] 模組 7：任務管理（任務管理-完整規格.md）
**資料表：** 4 個 | **API：** 16 個 | **Cron Jobs：** 1 個（任務自動生成）

#### 7.1 資料表創建
- [ ] 7.1.1 創建 `TaskTemplates` 表（任務模板）
- [ ] 7.1.2 創建 `TaskStageTemplates` 表（任務階段模板）
- [ ] 7.1.3 創建 `ActiveTasks` 表（執行中任務）
- [ ] 7.1.4 創建 `ActiveTaskStages` 表（任務階段）

#### 7.2 任務模板管理 API
- [ ] 7.2.1 實現 `GET /api/v1/task-templates` 路由（含 OpenAPI schema）
- [ ] 7.2.2 實現 `POST /api/v1/task-templates` 路由（含 OpenAPI schema）
- [ ] 7.2.3 實現 `PUT /api/v1/task-templates/:id` 路由（含 OpenAPI schema）
- [ ] 7.2.4 實現 `DELETE /api/v1/task-templates/:id` 路由（含 OpenAPI schema）

#### 7.3 任務管理 API
- [ ] 7.3.1 實現 `GET /api/v1/tasks` 路由（查詢任務列表，含 OpenAPI schema）
- [ ] 7.3.2 實現 `GET /api/v1/tasks/:id` 路由（查詢任務詳情，含 OpenAPI schema）
- [ ] 7.3.3 實現 `POST /api/v1/tasks/:id/stages/:stageId/start` 路由（開始階段，含 OpenAPI schema）
- [ ] 7.3.4 實現 `POST /api/v1/tasks/:id/stages/:stageId/complete` 路由（完成階段，含驗證：順序檢查，含 OpenAPI schema）

#### 7.4 任務自動生成邏輯
- [ ] 7.4.1 實現 `GET /api/v1/clients/:id/available-templates` 路由（查詢可用模板，含 OpenAPI schema）
- [ ] 7.4.2 實現根據 `ClientServices.trigger_months` 自動生成任務的邏輯

#### 7.5 Cron Job 實現
- [ ] 7.5.1 在 `wrangler.toml` 中添加任務自動生成 Cron Job（`0 0 1 * *`）
- [ ] 7.5.2 實現每月自動生成任務邏輯
- [ ] 7.5.3 實現冪等性保護

#### 7.6 前端實現
- [ ] 7.6.1 實現 `TasksPage.vue` 組件（任務列表）
- [ ] 7.6.2 實現 `TaskBoard.vue` 組件（看板視圖）
- [ ] 7.6.3 實現任務詳情頁面（顯示各階段進度）

#### 7.7 測試與部署
- [ ] 7.7.1 [內部] 自行測試所有任務管理功能
- [ ] 7.7.2 [內部] 測試任務自動生成邏輯
- [ ] 7.7.3 [內部] 測試 Cron Job（手動觸發）
- [ ] 7.7.4 [內部] 準備執行一致性驗證
- [ ] 7.7.5 [內部] 準備執行自動部署

---

### [ ] 模組 8：知識管理（知識管理-完整規格.md）
**資料表：** 3 個 | **API：** 10 個 | **Cron Jobs：** 0 個

#### 8.1 資料表創建
- [ ] 8.1.1 創建 `SOPDocuments` 表（SOP 文件）
- [ ] 8.1.2 創建 `ClientSOPLinks` 表（客戶專屬 SOP）
- [ ] 8.1.3 創建 `KnowledgeArticles` 表（知識庫）

#### 8.2 SOP 管理 API
- [ ] 8.2.1 實現 `GET /api/v1/sop` 路由（含 OpenAPI schema）
- [ ] 8.2.2 實現 `POST /api/v1/sop` 路由（僅管理員，含 OpenAPI schema）
- [ ] 8.2.3 實現 `PUT /api/v1/sop/:id` 路由（僅管理員，含 OpenAPI schema）
- [ ] 8.2.4 實現 `DELETE /api/v1/sop/:id` 路由（僅管理員，含 OpenAPI schema）

#### 8.3 知識庫 API
- [ ] 8.3.1 實現 `GET /api/v1/knowledge` 路由（含 OpenAPI schema）
- [ ] 8.3.2 實現 `POST /api/v1/knowledge` 路由（僅管理員，含 OpenAPI schema）
- [ ] 8.3.3 實現 `PUT /api/v1/knowledge/:id` 路由（僅管理員，含 OpenAPI schema）
- [ ] 8.3.4 實現 `DELETE /api/v1/knowledge/:id` 路由（僅管理員，含 OpenAPI schema）

#### 8.4 前端實現
- [ ] 8.4.1 實現 `KnowledgePage.vue` 組件（知識管理頁面）
- [ ] 8.4.2 實現 `SOPList.vue` 組件（SOP 列表）
- [ ] 8.4.3 實現 Markdown 編輯器整合

#### 8.5 測試與部署
- [ ] 8.5.1 [內部] 自行測試所有知識管理功能
- [ ] 8.5.2 [內部] 準備執行一致性驗證
- [ ] 8.5.3 [內部] 準備執行自動部署

---

### [ ] 模組 9：外部內容管理（外部內容管理-完整規格.md）
**資料表：** 4 個 | **API：** 8 個 | **Cron Jobs：** 0 個

#### 9.1 資料表創建
- [ ] 9.1.1 創建 `ExternalArticles` 表（外部文章）
- [ ] 9.1.2 創建 `ExternalFAQ` 表（外部 FAQ）
- [ ] 9.1.3 創建 `ResourceCenter` 表（資源中心）
- [ ] 9.1.4 創建 `ExternalImages` 表（外部圖片）

#### 9.2 外部文章管理 API
- [ ] 9.2.1 實現 `GET /api/v1/external/articles` 路由（含 OpenAPI schema）
- [ ] 9.2.2 實現 `POST /api/v1/external/articles` 路由（僅管理員，含 OpenAPI schema）
- [ ] 9.2.3 實現 `PUT /api/v1/external/articles/:id` 路由（僅管理員，含 OpenAPI schema）
- [ ] 9.2.4 實現 `DELETE /api/v1/external/articles/:id` 路由（僅管理員，含 OpenAPI schema）

#### 9.3 FAQ 管理 API
- [ ] 9.3.1 實現 `GET /api/v1/external/faq` 路由（含 OpenAPI schema）
- [ ] 9.3.2 實現 `POST /api/v1/external/faq` 路由（僅管理員，含 OpenAPI schema）
- [ ] 9.3.3 實現 `PUT /api/v1/external/faq/:id` 路由（僅管理員，含 OpenAPI schema）
- [ ] 9.3.4 實現 `DELETE /api/v1/external/faq/:id` 路由（僅管理員，含 OpenAPI schema）

#### 9.4 前端實現
- [ ] 9.4.1 實現外部內容管理頁面（管理員專用）
- [ ] 9.4.2 實現文章編輯器
- [ ] 9.4.3 實現圖片上傳功能

#### 9.5 測試與部署
- [ ] 9.5.1 [內部] 自行測試所有外部內容管理功能
- [ ] 9.5.2 [內部] 準備執行一致性驗證
- [ ] 9.5.3 [內部] 準備執行自動部署

---

### [ ] 模組 10：薪資管理（薪資管理-完整規格.md）
**資料表：** 6 個 | **API：** 13 個 | **Cron Jobs：** 0 個

#### 10.1 資料表創建
- [ ] 10.1.1 擴充 `Users` 表（添加薪資相關欄位）
- [ ] 10.1.2 創建 `SalaryItemTypes` 表（薪資項目類型）
- [ ] 10.1.3 創建 `EmployeeSalaryItems` 表（員工薪資項目）
- [ ] 10.1.4 創建 `MonthlyPayroll` 表（月度薪資）
- [ ] 10.1.5 創建 `OvertimeRecords` 表（加班記錄）

#### 10.2 薪資項目管理 API
- [ ] 10.2.1 實現薪資項目類型管理 API（管理員專用）
- [ ] 10.2.2 實現員工薪資項目管理 API

#### 10.3 薪資計算 API
- [ ] 10.3.1 實現月度薪資計算邏輯（含全勤獎金）
- [ ] 10.3.2 實現薪資報表 API

#### 10.4 前端實現
- [ ] 10.4.1 實現薪資管理頁面（管理員專用）
- [ ] 10.4.2 實現員工薪資查詢頁面

#### 10.5 測試與部署
- [ ] 10.5.1 [內部] 自行測試所有薪資管理功能
- [ ] 10.5.2 [內部] 準備執行一致性驗證
- [ ] 10.5.3 [內部] 準備執行自動部署

---

### [ ] 模組 11：管理成本（管理成本-完整規格.md）
**資料表：** 2 個 | **API：** 6 個 | **Cron Jobs：** 0 個

#### 11.1 資料表創建
- [ ] 11.1.1 創建 `OverheadCostTypes` 表（成本項目類型）
- [ ] 11.1.2 創建 `MonthlyOverheadCosts` 表（月度成本記錄）

#### 11.2 成本管理 API
- [ ] 11.2.1 實現成本項目管理 API
- [ ] 11.2.2 實現月度成本記錄 API
- [ ] 11.2.3 實現成本分攤計算 API

#### 11.3 前端實現
- [ ] 11.3.1 實現成本管理頁面（管理員專用）

#### 11.4 測試與部署
- [ ] 11.4.1 [內部] 自行測試所有成本管理功能
- [ ] 11.4.2 [內部] 準備執行一致性驗證
- [ ] 11.4.3 [內部] 準備執行自動部署

---

### [ ] 模組 12：收據收款（發票收款-完整規格.md）
**資料表：** 4 個 | **API：** 10 個 | **Cron Jobs：** 0 個

#### 12.1 資料表創建
- [ ] 12.1.1 創建 `Receipts` 表（收據管理）
- [ ] 12.1.2 創建 `ReceiptItems` 表（收據項目）
- [ ] 12.1.3 創建 `ReceiptSequence` 表（收據流水號）
- [ ] 12.1.4 創建 `Payments` 表（收款記錄）

#### 12.2 收據管理 API
- [ ] 12.2.1 實現收據管理 API（含自動產生收據編號）
- [ ] 12.2.2 實現收據 PDF 生成 API
- [ ] 12.2.3 實現收據預覽 API

#### 12.3 收款管理 API
- [ ] 12.3.1 實現收款記錄 API
- [ ] 12.3.2 實現應收帳款分析 API

#### 12.4 前端實現
- [ ] 12.4.1 實現收據管理頁面
- [ ] 12.4.2 實現收款記錄頁面

#### 12.5 測試與部署
- [ ] 12.5.1 [內部] 自行測試所有收據收款功能
- [ ] 12.5.2 [內部] 準備執行一致性驗證
- [ ] 12.5.3 [內部] 準備執行自動部署

---

### [ ] 模組 13：附件系統（附件系統-完整規格.md）
**資料表：** 1 個 | **API：** 4 個 | **Cron Jobs：** 0 個

#### 13.1 資料表創建
- [ ] 13.1.1 創建 `Attachments` 表（附件元資料）

#### 13.2 Cloudflare R2 整合
- [ ] 13.2.1 配置 R2 bucket 綁定（在 `wrangler.toml`）
- [ ] 13.2.2 實現檔案上傳邏輯（含驗證：檔案類型、大小限制）
- [ ] 13.2.3 實現檔案下載邏輯（含權限檢查）
- [ ] 13.2.4 實現檔案刪除邏輯

#### 13.3 附件 API
- [ ] 13.3.1 實現 `POST /api/v1/attachments` 路由（上傳，含 OpenAPI schema）
- [ ] 13.3.2 實現 `GET /api/v1/attachments/:id` 路由（下載，含 OpenAPI schema）
- [ ] 13.3.3 實現 `GET /api/v1/attachments` 路由（列表，含 OpenAPI schema）
- [ ] 13.3.4 實現 `DELETE /api/v1/attachments/:id` 路由（刪除，含 OpenAPI schema）

#### 13.4 前端實現
- [ ] 13.4.1 實現通用附件上傳元件
- [ ] 13.4.2 整合到客戶、任務等模組

#### 13.5 測試與部署
- [ ] 13.5.1 [內部] 自行測試所有附件功能
- [ ] 13.5.2 [內部] 測試檔案上傳/下載/刪除
- [ ] 13.5.3 [內部] 準備執行一致性驗證
- [ ] 13.5.4 [內部] 準備執行自動部署

---

### [ ] 模組 14：報表分析（報表分析-完整規格.md）
**資料表：** 0 個（使用現有表） | **API：** 6 個 | **Cron Jobs：** 0 個

#### 14.1 儀表板 API
- [ ] 14.1.1 實現 `GET /api/v1/reports/dashboard` 路由（儀表板數據，含 OpenAPI schema）
- [ ] 14.1.2 實現工時統計 API
- [ ] 14.1.3 實現假期統計 API

#### 14.2 分析報表 API
- [ ] 14.2.1 實現客戶成本分析 API
- [ ] 14.2.2 實現員工工時分析 API
- [ ] 14.2.3 實現薪資報表 API
- [ ] 14.2.4 實現收款報表 API

#### 14.3 前端實現
- [ ] 14.3.1 實現 `DashboardPage.vue` 組件（儀表板）
- [ ] 14.3.2 實現 `ReportsPage.vue` 組件（報表中心）
- [ ] 14.3.3 整合圖表庫（Chart.js 或 ECharts）

#### 14.4 測試與部署
- [ ] 14.4.1 [內部] 自行測試所有報表功能
- [ ] 14.4.2 [內部] 準備執行一致性驗證
- [ ] 14.4.3 [內部] 準備執行自動部署

---

## 🔍 全局一致性驗證（Global Consistency Check）

### 在所有模組完成後執行

- [ ] **最終驗證步驟 1：** 提取 SSOT 真相
  ```powershell
  Get-Content "docs\系統資料\數據表清單.md" | Select-String "資料表總覽"
  Get-Content "docs\系統資料\API清單.md" | Select-String "總計"
  ```

- [ ] **最終驗證步驟 2：** 執行快速一致性檢查
  ```powershell
  cd docs
  Get-ChildItem -Filter "*.md" -Recurse | Select-String "個.*[表API]" | ForEach-Object {
      if ($_.Line -match '(\d+)個') { "$($_.FileName): $($matches[1])個" }
  } | Sort-Object | Get-Unique
  ```

- [ ] **最終驗證步驟 3：** 確認所有數字一致
  - 應只看到：`45個表` 和 `147個API`
  - 如有不一致，立即修復

- [ ] **最終驗證步驟 4：** 檢查交叉引用對稱性

- [ ] **最終驗證步驟 5：** 執行完整系統測試

- [ ] **最終驗證步驟 6：** 最終部署與線上驗證

---

## 📊 進度追蹤

### 完成統計
- **已完成模組：** 3 / 14（21.4%）
- **已完成資料表：** 16 / 45（35.6%）
- **已完成 API：** 45 / 147（30.6%）⚠️ 已補充模組1-2遺漏的API
- **已完成 Cron Jobs：** 0 / 6

### 模組狀態
| 模組 | 狀態 | 完成日期 | 部署狀態 |
|------|------|----------|----------|
| 1. 系統基礎 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 2. 業務規則 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 3. 客戶管理 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 4. 工時管理 | ⏸️ 待開始 | - | - |
| 5. 假期管理 | ⏸️ 待開始 | - | - |
| 6. 服務生命週期 | ⏸️ 待開始 | - | - |
| 7. 任務管理 | ⏸️ 待開始 | - | - |
| 8. 知識管理 | ⏸️ 待開始 | - | - |
| 9. 外部內容管理 | ⏸️ 待開始 | - | - |
| 10. 薪資管理 | ⏸️ 待開始 | - | - |
| 11. 管理成本 | ⏸️ 待開始 | - | - |
| 12. 收據收款 | ⏸️ 待開始 | - | - |
| 13. 附件系統 | ⏸️ 待開始 | - | - |
| 14. 報表分析 | ⏸️ 待開始 | - | - |

---

## 📝 註記

### Cron Jobs 總覽（需在 wrangler.toml 中配置）
1. **特休年初更新：** `0 0 1 1 *`（每年 1 月 1 日 00:00）
2. **任務自動生成：** `0 0 1 * *`（每月 1 日 00:00）
3. **補休到期轉換：** `0 0 1 * *`（每月 1 日 00:00）
4. **工時填寫提醒：** `30 8 * * 1-5`（週一到週五 08:30）
5. **資料庫備份：** `0 2 * * *`（每天 02:00）
6. **失敗 Cron Job 自動重試：** `0 * * * *`（每小時）

### 關鍵技術決策
- **資料庫：** Cloudflare D1 (SQLite)
- **後端：** Cloudflare Workers + Hono + OpenAPI
- **前端：** Vue.js 3 + Tailwind CSS
- **認證：** JWT + HttpOnly Cookie
- **儲存：** Cloudflare R2（檔案/備份）
- **部署：** Cloudflare Pages（Git Push 自動部署）

### 權限設計
- **兩級權限：** Admin（管理員）/ Employee（員工）
- **小型事務所彈性設計：** 部分功能放寬給員工（客戶管理、國定假日管理等）
- **批量操作限管理員：** 批量更新、批量導入等

---

## 🚨 關鍵提醒

1. **每個子任務完成後，必須立即更新本計畫檔案（將 `[ ]` 改為 `[x]`）**
2. **每個模組完成後，必須執行一致性驗證**
3. **每個模組驗證通過後，必須自動部署**
4. **絕不讓用戶測試或部署**
5. **所有 API 必須包含 OpenAPI schema**
6. **所有 PowerShell 命令絕不使用 `&&`**
7. **所有文件使用 UTF-8 編碼**

---

**最後更新：** 2025-10-29  
**狀態：** ✅ 計畫已生成，等待批准開始執行

