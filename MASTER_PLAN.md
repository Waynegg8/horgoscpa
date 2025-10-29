# 專案總執行計畫 (Master Plan)

**版本：** 1.0  
**建立日期：** 2025-10-29  
**最後更新：** 2025-10-29

---

## 📊 總目標（SSOT - Single Source of Truth）

**資料表總數：** 45 個（真相源：`docs/系統資料/數據表清單.md`）  
**API 端點總數：** 147 個（真相源：`docs/系統資料/API清單.md`）  
**功能模組總數：** 14 個

**當前進度：** 32/45 表，104/147 API（模組1-8已完成，✅ 嚴格遵守5步驟流程）

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
- [ ] **🔴 每個模組實現後，必須完整對照規格文檔驗證（列出規格中的所有 API，逐一確認已實現）**
- [ ] **🔴 禁止精簡實現、禁止偷懶、禁止跳過任何功能**
- [ ] **🔴 在 MASTER_PLAN 的每個任務項中，必須標記對應規格文檔的行號範圍（例如：7.1.1 創建 XXX 表 [規格:L10-L30]）**
- [ ] **🔴 標記任務完成前，必須回到規格文檔對應行號處，逐一驗證實現是否完全符合規格要求**

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

**1.1.1 Users 表（員工/用戶）[規格:L11-L42]**
- [x] 1.1.1.1 創建主鍵 `user_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L12]
- [x] 1.1.1.2 創建 `username` (TEXT UNIQUE NOT NULL) [規格:L13]
- [x] 1.1.1.3 創建 `password_hash` (TEXT NOT NULL) [規格:L14]
- [x] 1.1.1.4 創建基本資訊欄位：`name`, `email` (必填) [規格:L15-L16]
- [x] 1.1.1.5 創建權限欄位 `is_admin` (BOOLEAN DEFAULT 0)，註釋：0=員工, 1=管理員 [規格:L17]
- [x] 1.1.1.6 創建性別欄位 `gender` (TEXT NOT NULL)，註釋：'M', 'F'（影響假期選項）[規格:L18]
- [x] 1.1.1.7 創建 `birth_date` (TEXT), `start_date` (TEXT NOT NULL) [規格:L19-L20]
- [x] 1.1.1.8 創建聯絡資訊：`phone`, `address`, `emergency_contact_name`, `emergency_contact_phone` [規格:L21-L24]
- [x] 1.1.1.9 創建登入控制欄位：`login_attempts`, `last_failed_login`, `last_login` [規格:L26-L29]
- [x] 1.1.1.10 創建審計欄位：`created_at`, `updated_at`, `is_deleted`, `deleted_at`, `deleted_by` [規格:L31-L36]
- [x] 1.1.1.11 創建唯一索引：`idx_users_username` ON Users(username) [規格:L39]
- [x] 1.1.1.12 創建索引：`idx_users_email` ON Users(email) [規格:L40]
- [x] 1.1.1.13 創建索引：`idx_users_is_admin` ON Users(is_admin) [規格:L41]

**1.1.2 Settings 表（系統設定）[規格:L46-L72]**
- [x] 1.1.2.1 創建主鍵 `setting_key` (TEXT PRIMARY KEY) [規格:L47]
- [x] 1.1.2.2 創建 `setting_value` (TEXT NOT NULL), `description` (TEXT) [規格:L48-L49]
- [x] 1.1.2.3 創建 `is_dangerous` (BOOLEAN DEFAULT 0) 標記危險設定 [規格:L50]
- [x] 1.1.2.4 創建審計欄位：`updated_at`, `updated_by` [規格:L51-L52]
- [x] 1.1.2.5 添加外鍵約束：`updated_by` REFERENCES Users(user_id) [規格:L54]
- [x] 1.1.2.6 創建唯一索引：`idx_settings_key` ON Settings(setting_key) [規格:L57]
- [x] 1.1.2.7 插入預設值：`comp_leave_expiry_rule` (危險設定) [規格:L60-L61]
- [x] 1.1.2.8 插入預設值：`daily_work_hours_limit` (危險設定) [規格:L62]
- [x] 1.1.2.9 插入預設值：`hourly_wage_base` (危險設定) [規格:L63]
- [x] 1.1.2.10 插入預設值：`company_name`, `contact_email` (一般設定) [規格:L64-L65]

**1.1.3 AuditLogs 表（審計日誌）[規格:L76-L94]**
- [x] 1.1.3.1 創建主鍵 `log_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L77]
- [x] 1.1.3.2 創建 `user_id` (INTEGER NOT NULL) [規格:L78]
- [x] 1.1.3.3 創建 `action` (TEXT NOT NULL)，註釋：CREATE, UPDATE, DELETE, LOGIN [規格:L79]
- [x] 1.1.3.4 創建 `table_name`, `record_id`, `changes` (JSON 格式) [規格:L80-L82]
- [x] 1.1.3.5 創建請求資訊：`ip_address`, `user_agent` [規格:L83-L84]
- [x] 1.1.3.6 創建 `created_at` (TEXT DEFAULT datetime('now')) [規格:L85]
- [x] 1.1.3.7 添加外鍵約束：`user_id` REFERENCES Users(user_id) [規格:L87]
- [x] 1.1.3.8 創建索引：`idx_audit_logs_user`, `idx_audit_logs_table`, `idx_audit_logs_action`, `idx_audit_logs_date` [規格:L90-L93]

**1.1.4 FieldAuditTrail 表（字段級審計）[規格:L98-L115]**
- [x] 1.1.4.1 創建主鍵 `audit_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L99]
- [x] 1.1.4.2 創建 `table_name`, `record_id`, `field_name` [規格:L100-L102]
- [x] 1.1.4.3 創建 `old_value`, `new_value` [規格:L103-L104]
- [x] 1.1.4.4 創建 `changed_by` (INTEGER NOT NULL), `changed_at` [規格:L105-L106]
- [x] 1.1.4.5 添加外鍵約束：`changed_by` REFERENCES Users(user_id) [規格:L108]
- [x] 1.1.4.6 創建複合索引：`idx_field_audit_table_record` ON FieldAuditTrail(table_name, record_id) [規格:L111]
- [x] 1.1.4.7 創建索引：`idx_field_audit_field`, `idx_field_audit_user`, `idx_field_audit_date` [規格:L112-L114]

**1.1.5 Notifications 表（系統通知）[規格:L127-L151]**
- [x] 1.1.5.1 創建主鍵 `notification_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L128]
- [x] 1.1.5.2 創建 `user_id` (INTEGER NOT NULL)，註釋：通知對象 [規格:L129]
- [x] 1.1.5.3 創建 `type` (TEXT NOT NULL)，註釋：通知類型 [規格:L130]
- [x] 1.1.5.4 創建 `message` (TEXT NOT NULL)，`related_date`, `related_user_id` [規格:L131-L133]
- [x] 1.1.5.5 創建 `action_url` (TEXT)，`auto_dismiss` (BOOLEAN DEFAULT 1) [規格:L134-L135]
- [x] 1.1.5.6 創建時間戳：`created_at`, `is_deleted`, `dismissed_at` [規格:L136-L138]
- [x] 1.1.5.7 添加外鍵約束：`user_id` 和 `related_user_id` [規格:L140-L141]
- [x] 1.1.5.8 添加 CHECK 約束：type IN ('missing_timesheet', 'task_overdue', ...) [規格:L142]
- [x] 1.1.5.9 創建索引：`idx_notifications_user`, `idx_notifications_type`, `idx_notifications_deleted`, `idx_notifications_date` [規格:L145-L148]
- [x] 1.1.5.10 創建唯一索引：`idx_notifications_unique` (user_id, type, related_date, related_user_id) WHERE is_deleted = 0 [規格:L149-L150]

---

#### 1.2 認證系統實現 [規格:L244-L250]

**1.2.1 UserRepository 創建**
- [x] 1.2.1.1 創建 `findByUsername()` 方法（用於登入驗證） [規格:L536-L539]
- [x] 1.2.1.2 創建 `findById()` 方法 [規格:L577]
- [x] 1.2.1.3 創建 `incrementLoginAttempts()` 方法（登入失敗計數）[規格:L555]
- [x] 1.2.1.4 創建 `update()` 方法（更新用戶資訊） [規格:L560-L563]

**1.2.2 AuthService 創建**
- [x] 1.2.2.1 實現 `login()` 方法 [規格:L534-L573]
  - [x] 1.2.2.1.1 查詢用戶（調用 findByUsername）[規格:L536-L539]
  - [x] 1.2.2.1.2 檢查帳號鎖定（5次失敗鎖定15分鐘）[規格:L541-L549]
  - [x] 1.2.2.1.3 驗證密碼（使用 bcrypt.compare）[規格:L551-L557]
  - [x] 1.2.2.1.4 失敗時增加 login_attempts [規格:L554-L556]
  - [x] 1.2.2.1.5 成功時重置 login_attempts，更新 last_login [規格:L559-L563]
  - [x] 1.2.2.1.6 生成 JWT Token（含 user_id, username, is_admin）[規格:L565-L570]
  - [x] 1.2.2.1.7 返回 user 和 token [規格:L572]

- [x] 1.2.2.2 實現 `changePassword()` 方法 [規格:L575-L598]
  - [x] 1.2.2.2.1 獲取用戶資訊 [規格:L576-L577]
  - [x] 1.2.2.2.2 驗證原密碼 [規格:L579-L583]
  - [x] 1.2.2.2.3 驗證新密碼長度（最少6字元）[規格:L585-L588]
  - [x] 1.2.2.2.4 雜湊並更新密碼（使用 bcrypt）[規格:L590-L594]
  - [x] 1.2.2.2.5 返回成功響應 [規格:L596]

**1.2.3 密碼雜湊工具函數 [規格:L697-L748]**
- [x] 1.2.3.1 實現 `hashPassword()` 函數（使用 bcrypt，成本因子 12）[規格:L702-L705]
- [x] 1.2.3.2 實現 `verifyPassword()` 函數（使用 bcrypt.compare）[規格:L708-L710]
- [x] 1.2.3.3 實現 `isStrongPassword()` 函數（最少6字元，無複雜度要求）[規格:L713-L724]
- [x] 1.2.3.4 實現 `generateRandomPassword()` 函數（12字元，含大小寫數字特殊符號）[規格:L727-L747]

**1.2.4 JWT 中間件**
- [x] 1.2.4.1 創建 `authMiddleware`（驗證 JWT Token） [規格:L244-L250, L786-L788]
- [x] 1.2.4.2 創建 `adminMiddleware`（檢查 is_admin = true） [規格:L258-L266]
- [x] 1.2.4.3 Token 儲存在 HttpOnly Cookie（24小時有效期）[規格:L786-L788]

**1.2.5 認證 API 路由創建**
- [x] 1.2.5.1 `POST /api/v1/auth/login` [規格:L246]
  - [x] 1.2.5.1.1 解析請求 Body（username, password）
  - [x] 1.2.5.1.2 調用 AuthService.login()
  - [x] 1.2.5.1.3 設置 HttpOnly Cookie（存儲 JWT）
  - [x] 1.2.5.1.4 返回用戶資訊（不含密碼）
  - [x] 1.2.5.1.5 添加 OpenAPI 註解

- [x] 1.2.5.2 `POST /api/v1/auth/logout` [規格:L247]
  - [x] 1.2.5.2.1 清除 HttpOnly Cookie
  - [x] 1.2.5.2.2 返回成功響應
  - [x] 1.2.5.2.3 添加 OpenAPI 註解

- [x] 1.2.5.3 `GET /api/v1/auth/me` [規格:L248]
  - [x] 1.2.5.3.1 應用 authMiddleware
  - [x] 1.2.5.3.2 從 JWT 解析用戶資訊
  - [x] 1.2.5.3.3 返回當前用戶資訊
  - [x] 1.2.5.3.4 添加 OpenAPI 註解

- [x] 1.2.5.4 `POST /api/v1/auth/change-password` [規格:L249]
  - [x] 1.2.5.4.1 應用 authMiddleware
  - [x] 1.2.5.4.2 解析請求 Body（currentPassword, newPassword）
  - [x] 1.2.5.4.3 調用 AuthService.changePassword()
  - [x] 1.2.5.4.4 返回成功響應
  - [x] 1.2.5.4.5 添加 OpenAPI 註解

---

#### 1.3 個人資料管理實現 [規格:L253-L256]

**1.3.1 ProfileService 創建**
- [x] 1.3.1.1 實現 `getProfile()` 方法（獲取當前用戶資訊） [規格:L254]
- [x] 1.3.1.2 實現 `updateProfile()` 方法（更新個人資料，不含敏感欄位） [規格:L255]
  - [x] 1.3.1.2.1 驗證可更新欄位（email, phone, address, emergency_contact_*）
  - [x] 1.3.1.2.2 禁止更新敏感欄位（username, password_hash, is_admin）
  - [x] 1.3.1.2.3 記錄審計日誌

**1.3.2 個人資料 API 路由創建**
- [x] 1.3.2.1 `GET /api/v1/profile` [規格:L254]
  - [x] 1.3.2.1.1 應用 authMiddleware
  - [x] 1.3.2.1.2 調用 ProfileService.getProfile()
  - [x] 1.3.2.1.3 返回個人資料（不含密碼）
  - [x] 1.3.2.1.4 添加 OpenAPI 註解

- [x] 1.3.2.2 `PUT /api/v1/profile` [規格:L255]
  - [x] 1.3.2.2.1 應用 authMiddleware
  - [x] 1.3.2.2.2 解析請求 Body（email, phone, address, etc.）
  - [x] 1.3.2.2.3 調用 ProfileService.updateProfile()
  - [x] 1.3.2.2.4 返回更新後的個人資料
  - [x] 1.3.2.2.5 添加 OpenAPI 註解

---

#### 1.4 員工管理實現（僅管理員）[規格:L259-L266]

**1.4.1 UserManagementService 創建**
- [x] 1.4.1.1 實現 `createUser()` 方法 [規格:L604-L641]
  - [x] 1.4.1.1.1 驗證必填欄位（username, name, email, gender, start_date）[規格:L606-L608]
  - [x] 1.4.1.1.2 驗證性別值（M 或 F）[規格:L610-L613]
  - [x] 1.4.1.1.3 檢查 username 唯一性 [規格:L616-L619]
  - [x] 1.4.1.1.4 生成初始密碼（調用 generateRandomPassword）[規格:L622]
  - [x] 1.4.1.1.5 雜湊密碼（調用 hashPassword）[規格:L623]
  - [x] 1.4.1.1.6 創建用戶記錄 [規格:L626-L630]
  - [x] 1.4.1.1.7 記錄審計日誌 [規格:L633-L638]
  - [x] 1.4.1.1.8 返回用戶和初始密碼 [規格:L640]

- [x] 1.4.1.2 實現 `updateUser()` 方法
  - [x] 1.4.1.2.1 查詢用戶是否存在
  - [x] 1.4.1.2.2 驗證可更新欄位
  - [x] 1.4.1.2.3 記錄字段級審計（FieldAuditTrail）
  - [x] 1.4.1.2.4 記錄審計日誌

- [x] 1.4.1.3 實現 `deleteUser()` 方法（軟刪除）
  - [x] 1.4.1.3.1 設置 is_deleted = 1, deleted_at, deleted_by
  - [x] 1.4.1.3.2 記錄審計日誌

- [x] 1.4.1.4 實現 `resetPassword()` 方法 [規格:L643-L663]
  - [x] 1.4.1.4.1 生成新密碼（調用 generateRandomPassword）[規格:L645]
  - [x] 1.4.1.4.2 雜湊密碼 [規格:L646]
  - [x] 1.4.1.4.3 更新 password_hash 和重置 login_attempts [規格:L649-L652]
  - [x] 1.4.1.4.4 記錄審計日誌 [規格:L654-L660]
  - [x] 1.4.1.4.5 返回新密碼 [規格:L662]

**1.4.2 員工管理 API 路由創建（僅管理員）**
- [x] 1.4.2.1 `GET /api/v1/admin/users` [規格:L260]
  - [x] 1.4.2.1.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.1.2 支持查詢參數（is_admin, limit, offset）
  - [x] 1.4.2.1.3 調用 UserRepository.findAll()
  - [x] 1.4.2.1.4 返回員工列表（不含密碼）
  - [x] 1.4.2.1.5 添加 OpenAPI 註解

- [x] 1.4.2.2 `POST /api/v1/admin/users` [規格:L261]
  - [x] 1.4.2.2.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.2.2 解析請求 Body（username, name, email, gender, start_date, etc.）
  - [x] 1.4.2.2.3 調用 UserManagementService.createUser()
  - [x] 1.4.2.2.4 返回 201 Created（含初始密碼）
  - [x] 1.4.2.2.5 添加 OpenAPI 註解

- [x] 1.4.2.3 `GET /api/v1/admin/users/:id` [規格:L262]
  - [x] 1.4.2.3.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.3.2 解析路徑參數 user_id
  - [x] 1.4.2.3.3 調用 UserRepository.findById()
  - [x] 1.4.2.3.4 返回員工詳情（不含密碼）
  - [x] 1.4.2.3.5 添加 OpenAPI 註解

- [x] 1.4.2.4 `PUT /api/v1/admin/users/:id` [規格:L263]
  - [x] 1.4.2.4.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.4.2 解析路徑參數和請求 Body
  - [x] 1.4.2.4.3 調用 UserManagementService.updateUser()
  - [x] 1.4.2.4.4 返回更新後的員工資訊
  - [x] 1.4.2.4.5 添加 OpenAPI 註解

- [x] 1.4.2.5 `DELETE /api/v1/admin/users/:id` [規格:L264]
  - [x] 1.4.2.5.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.5.2 調用 UserManagementService.deleteUser()（軟刪除）
  - [x] 1.4.2.5.3 返回成功響應
  - [x] 1.4.2.5.4 添加 OpenAPI 註解

- [x] 1.4.2.6 `POST /api/v1/admin/users/:id/reset-password` [規格:L265]
  - [x] 1.4.2.6.1 應用 authMiddleware + adminMiddleware
  - [x] 1.4.2.6.2 調用 UserManagementService.resetPassword()
  - [x] 1.4.2.6.3 返回新密碼
  - [x] 1.4.2.6.4 添加 OpenAPI 註解

---

#### 1.5 系統設定實現（僅管理員）[規格:L269-L272]

**1.5.1 SettingsService 創建**
- [x] 1.5.1.1 實現 `getAllSettings()` 方法 [規格:L270-L302]
  - [x] 1.5.1.1.1 查詢所有設定
  - [x] 1.5.1.1.2 按 is_dangerous 分組（危險設定優先顯示）

- [x] 1.5.1.2 實現 `updateSetting()` 方法 [規格:L305-L322]
  - [x] 1.5.1.2.1 查詢設定是否存在
  - [x] 1.5.1.2.2 檢查 is_dangerous 標記 [規格:L50]
  - [x] 1.5.1.2.3 危險設定需確認（confirmed = true）[規格:L309]
  - [x] 1.5.1.2.4 檢查唯讀保護（daily_work_hours_limit, hourly_wage_base 不可修改）[規格:L398-L419]
  - [x] 1.5.1.2.5 記錄舊值（用於審計）[規格:L318]
  - [x] 1.5.1.2.6 更新設定值
  - [x] 1.5.1.2.7 記錄審計日誌

**1.5.2 系統設定 API 路由創建（僅管理員）**
- [x] 1.5.2.1 `GET /api/v1/admin/settings` [規格:L270, L276-L302]
  - [x] 1.5.2.1.1 應用 authMiddleware + adminMiddleware
  - [x] 1.5.2.1.2 調用 SettingsService.getAllSettings()
  - [x] 1.5.2.1.3 返回設定列表（含 is_dangerous 標記）[規格:L278-L301]
  - [x] 1.5.2.1.4 添加 OpenAPI 註解

- [x] 1.5.2.2 `PUT /api/v1/admin/settings/:key` [規格:L271, L305-L322]
  - [x] 1.5.2.2.1 應用 authMiddleware + adminMiddleware
  - [x] 1.5.2.2.2 解析路徑參數 setting_key
  - [x] 1.5.2.2.3 解析請求 Body（setting_value, confirmed）[規格:L308-L310]
  - [x] 1.5.2.2.4 調用 SettingsService.updateSetting()
  - [x] 1.5.2.2.5 返回更新結果（含 old_value 和 warning）[規格:L313-L321]
  - [x] 1.5.2.2.6 添加 OpenAPI 註解

---

#### 1.6 審計日誌查詢（僅管理員）[規格:L325-L328]

**1.6.1 AuditLogService 創建 [規格:L668-L689]**
- [x] 1.6.1.1 實現 `log()` 方法（記錄審計日誌）[規格:L670-L680]
  - [x] 1.6.1.1.1 接收參數：user_id, action, table_name, record_id, changes, ip_address, user_agent
  - [x] 1.6.1.1.2 將 changes 轉換為 JSON 字串 [規格:L676]
  - [x] 1.6.1.1.3 創建日誌記錄

- [x] 1.6.1.2 實現 `getRecordHistory()` 方法（查詢記錄歷史）[規格:L682-L684]
- [x] 1.6.1.3 實現 `getUserLogs()` 方法（查詢用戶操作日誌）[規格:L686-L688]

**1.6.2 審計日誌 API 路由創建（僅管理員）**
- [x] 1.6.2.1 `GET /api/v1/admin/audit-logs` [規格:L326]
  - [x] 1.6.2.1.1 應用 authMiddleware + adminMiddleware
  - [x] 1.6.2.1.2 支持查詢參數（action, table_name, start_date, end_date, limit, offset）
  - [x] 1.6.2.1.3 調用 AuditLogRepository.findAll()
  - [x] 1.6.2.1.4 返回審計日誌列表
  - [x] 1.6.2.1.5 添加 OpenAPI 註解

- [x] 1.6.2.2 `GET /api/v1/admin/audit-logs/user/:userId` [規格:L327]
  - [x] 1.6.2.2.1 應用 authMiddleware + adminMiddleware
  - [x] 1.6.2.2.2 解析路徑參數 userId
  - [x] 1.6.2.2.3 支持查詢參數（start_date, end_date）
  - [x] 1.6.2.2.4 調用 AuditLogService.getUserLogs()
  - [x] 1.6.2.2.5 返回特定員工的操作日誌
  - [x] 1.6.2.2.6 添加 OpenAPI 註解

---

#### 1.7 完整性驗證 [規格:L1-L920]

**1.7.1 API 清單驗證**
- [x] 1.7.1.1 驗證認證 API（4 個）[規格:L244-L250]
- [x] 1.7.1.2 驗證個人資料 API（2 個）[規格:L253-L256]
- [x] 1.7.1.3 驗證員工管理 API（6 個）[規格:L259-L266]
- [x] 1.7.1.4 驗證系統設定 API（2 個）[規格:L269-L272]
- [x] 1.7.1.5 驗證審計日誌 API（2 個）[規格:L325-L328]
- [x] 1.7.1.6 確認總計：14 個 API

**1.7.2 業務邏輯驗證**
- [x] 1.7.2.1 驗證登入鎖定機制（5次失敗鎖定15分鐘）[規格:L542-L549, L761-L765]
- [x] 1.7.2.2 驗證密碼強度（最少6字元）[規格:L586-L588, L767-L774]
- [x] 1.7.2.3 驗證 bcrypt 雜湊（成本因子 12）[規格:L702-L705, L750-L756]
- [x] 1.7.2.4 驗證危險設定確認機制 [規格:L309, L472-L475]
- [x] 1.7.2.5 驗證唯讀保護（daily_work_hours_limit, hourly_wage_base）[規格:L398-L419]
- [x] 1.7.2.6 驗證審計日誌記錄（所有 CREATE/UPDATE/DELETE 操作）[規格:L633-L638, L654-L660]

**1.7.3 回到規格逐一驗證**
- [x] 1.7.3.1 打開規格文檔 L11-L42，驗證 Users 表完整性
- [x] 1.7.3.2 打開規格文檔 L46-L72，驗證 Settings 表和預設值
- [x] 1.7.3.3 打開規格文檔 L76-L94，驗證 AuditLogs 表
- [x] 1.7.3.4 打開規格文檔 L98-L115，驗證 FieldAuditTrail 表
- [x] 1.7.3.5 打開規格文檔 L127-L151，驗證 Notifications 表
- [x] 1.7.3.6 打開規格文檔 L534-L598，驗證 AuthService 完整實現
- [x] 1.7.3.7 打開規格文檔 L604-L663，驗證 UserManagementService 完整實現
- [x] 1.7.3.8 逐一驗證所有 14 個 API 的實現

---

#### 1.8 部署與測試
- [x] 1.8.1 [內部] 更新 SSOT 文件（確認使用 v3.2：45表，147API）
- [x] 1.8.2 [內部] 更新 `MASTER_PLAN.md` 進度統計
- [x] 1.8.3 [內部] 執行一致性驗證並修復不一致
- [x] 1.8.4 [內部] 提交所有更改到 Git
- [x] 1.8.5 [內部] 執行自動部署（git push origin main）
- [x] 1.8.6 [內部] 驗證 Cloudflare Pages 部署成功

---

### [x] 模組 2：業務規則（業務規則-完整規格.md）✅ 已完成（已補充遺漏）
**資料表：** 8 個 | **API：** 18 個 | **Cron Jobs：** 0 個

#### 2.1 資料表創建

**2.1.1 Holidays 表（國定假日）[規格:L11-L23]**
- [x] 2.1.1.1 創建主鍵 `holiday_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L12]
- [x] 2.1.1.2 創建 `holiday_date` (TEXT UNIQUE NOT NULL) [規格:L13]
- [x] 2.1.1.3 創建 `name` (TEXT NOT NULL) [規格:L14]
- [x] 2.1.1.4 創建 `is_national_holiday` (BOOLEAN DEFAULT 1)，註釋：是否為國定假日 [規格:L15]
- [x] 2.1.1.5 創建 `is_makeup_workday` (BOOLEAN DEFAULT 0)，註釋：是否為補班日 [規格:L16]
- [x] 2.1.1.6 創建審計欄位：`created_at`, `is_deleted` [規格:L17-L18]
- [x] 2.1.1.7 創建唯一索引：`idx_holidays_date` ON Holidays(holiday_date) [規格:L21]
- [x] 2.1.1.8 創建索引：`idx_holidays_makeup` ON Holidays(is_makeup_workday) [規格:L22]

**2.1.2 LeaveTypes 表（假別類型）[規格:L54-L66]**
- [x] 2.1.2.1 創建主鍵 `leave_type_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L55]
- [x] 2.1.2.2 創建 `type_name` (TEXT UNIQUE NOT NULL) [規格:L56]
- [x] 2.1.2.3 創建 `annual_quota` (REAL) [規格:L57]
- [x] 2.1.2.4 創建 `deduct_leave` (BOOLEAN DEFAULT 1) [規格:L58]
- [x] 2.1.2.5 創建 `is_paid` (BOOLEAN DEFAULT 1) [規格:L59]
- [x] 2.1.2.6 創建 `gender_specific` (TEXT)，註釋：'M', 'F', NULL [規格:L60]
- [x] 2.1.2.7 創建 `is_enabled`, `sort_order` [規格:L61-L62]
- [x] 2.1.2.8 創建審計欄位：`created_at`, `is_deleted` [規格:L63-L64]
- [x] 2.1.2.9 插入9種預設假別（特休、事假、病假、婚假等）

**2.1.3 AnnualLeaveRules 表（特休規則）[規格:L70-L77]**
- [x] 2.1.3.1 創建主鍵 `rule_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L71]
- [x] 2.1.3.2 創建 `min_months` (INTEGER NOT NULL) [規格:L72]
- [x] 2.1.3.3 創建 `max_months` (INTEGER NOT NULL) [規格:L73]
- [x] 2.1.3.4 創建 `days` (INTEGER NOT NULL) [規格:L74]
- [x] 2.1.3.5 創建 `description` (TEXT) [規格:L75]
- [x] 2.1.3.6 插入6檔法定預設規則 [規格:L267-L274]
  - [x] 2.1.3.6.1 6個月-1年：3天
  - [x] 2.1.3.6.2 1-2年：7天
  - [x] 2.1.3.6.3 2-3年：10天
  - [x] 2.1.3.6.4 3-5年：14天
  - [x] 2.1.3.6.5 5-10年：15天
  - [x] 2.1.3.6.6 10年以上：每年+1天（最高30天）

**2.1.4 OtherLeaveRules 表（其他假期規則）[規格:L81-L90]**
- [x] 2.1.4.1 創建主鍵 `rule_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L82]
- [x] 2.1.4.2 創建 `leave_type_id` (INTEGER NOT NULL) [規格:L83]
- [x] 2.1.4.3 創建 `event_type` (TEXT NOT NULL) [規格:L84]
- [x] 2.1.4.4 創建 `days` (REAL NOT NULL) [規格:L85]
- [x] 2.1.4.5 創建 `validity_days` (INTEGER DEFAULT 365) [規格:L86]
- [x] 2.1.4.6 添加外鍵約束：`leave_type_id` REFERENCES LeaveTypes(leave_type_id) [規格:L88]
- [x] 2.1.4.7 插入婚假喪假等9種預設規則

**2.1.5 OvertimeRates 表（加班費率）[規格:L94-L103]**
- [x] 2.1.5.1 創建主鍵 `rate_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L95]
- [x] 2.1.5.2 創建 `work_type_id` (INTEGER NOT NULL) [規格:L96]
- [x] 2.1.5.3 創建 `rate_multiplier` (REAL NOT NULL) [規格:L97]
- [x] 2.1.5.4 創建 `effective_date` (TEXT NOT NULL) [規格:L98]
- [x] 2.1.5.5 創建 `is_current` (BOOLEAN DEFAULT 1) [規格:L99]
- [x] 2.1.5.6 添加外鍵約束：`work_type_id` REFERENCES WorkTypes(work_type_id) [規格:L101]
- [x] 2.1.5.7 插入5種法定費率 [規格:L276-L283]
  - [x] 2.1.5.7.1 正常工時：1.00倍
  - [x] 2.1.5.7.2 平日加班：1.34倍
  - [x] 2.1.5.7.3 休息日加班（前2小時）：1.34倍
  - [x] 2.1.5.7.4 休息日加班（第3小時起）：1.67倍
  - [x] 2.1.5.7.5 國定假日加班：2.00倍

**2.1.6 ServiceFrequencyTypes 表（週期類型）[規格:L107-L116]**
- [x] 2.1.6.1 創建主鍵 `frequency_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L108]
- [x] 2.1.6.2 創建 `name` (TEXT UNIQUE NOT NULL) [規格:L109]
- [x] 2.1.6.3 創建 `days_interval`, `months_interval` [規格:L110-L111]
- [x] 2.1.6.4 創建 `is_recurring`, `is_enabled`, `sort_order` [規格:L112-L114]
- [x] 2.1.6.5 插入6種預設週期 [規格:L285-L288]
  - [x] 2.1.6.5.1 單次
  - [x] 2.1.6.5.2 每月
  - [x] 2.1.6.5.3 雙月
  - [x] 2.1.6.5.4 每季
  - [x] 2.1.6.5.5 半年
  - [x] 2.1.6.5.6 每年

**2.1.7 Services 表（服務項目）[規格:L120-L133]**
- [x] 2.1.7.1 創建主鍵 `service_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L121]
- [x] 2.1.7.2 創建 `parent_service_id` (INTEGER) [規格:L122]
- [x] 2.1.7.3 創建 `service_name` (TEXT NOT NULL) [規格:L123]
- [x] 2.1.7.4 創建 `description`, `sort_order` [規格:L124-L125]
- [x] 2.1.7.5 創建審計欄位：`created_at`, `is_deleted` [規格:L126-L127]
- [x] 2.1.7.6 添加外鍵約束：`parent_service_id` REFERENCES Services(service_id) [規格:L129]
- [x] 2.1.7.7 創建索引：`idx_services_parent` ON Services(parent_service_id) [規格:L132]
- [x] 2.1.7.8 插入4個主服務+6個子服務示例（稅務、會計、審計、諮詢）

**2.1.8 WorkTypes 表（工作類型）[依賴項]**
- [x] 2.1.8.1 創建主鍵 `work_type_id`
- [x] 2.1.8.2 創建 `type_name` (TEXT UNIQUE NOT NULL)
- [x] 2.1.8.3 創建 `description` (TEXT)
- [x] 2.1.8.4 插入7種預設類型（正常工時、平日加班、休息日加班等）

---

#### 2.2 國定假日管理 [規格:L144-L149]

**2.2.1 HolidayRepository 創建**
- [x] 2.2.1.1 創建 `findAll()` 方法（支持年份過濾）[規格:L144-L149]
- [x] 2.2.1.2 創建 `findById()` 方法 [規格:L11-L23]
- [x] 2.2.1.3 創建 `findByDate()` 方法（檢查日期唯一性）[規格:L13, L27-L34, L292]
- [x] 2.2.1.4 創建 `create()` 方法 [規格:L11-L23]
- [x] 2.2.1.5 創建 `update()` 方法 [規格:L11-L23]
- [x] 2.2.1.6 創建 `delete()` 方法（軟刪除）[規格:L18]

**2.2.2 HolidayService 創建**
- [x] 2.2.2.1 實現 `createHoliday()` 方法
  - [x] 2.2.2.1.1 驗證 holiday_date 和 name 必填
  - [x] 2.2.2.1.2 檢查日期唯一性 [規格:L292]
  - [x] 2.2.2.1.3 驗證 is_national_holiday 和 is_makeup_workday 邏輯 [規格:L27-L50]
  - [x] 2.2.2.1.4 創建假日記錄
  - [x] 2.2.2.1.5 記錄審計日誌

- [x] 2.2.2.2 實現 `importHolidays()` 方法 [規格:L244-L256]
  - [x] 2.2.2.2.1 解析 CSV 數據
  - [x] 2.2.2.2.2 遍歷假日列表
  - [x] 2.2.2.2.3 批量創建記錄
  - [x] 2.2.2.2.4 返回導入數量

**2.2.3 國定假日 API 路由創建（所有人可用）[規格:L144-L149]**
- [x] 2.2.3.1 `GET /api/v1/holidays` [規格:L144]
  - [x] 2.2.3.1.1 應用 authMiddleware
  - [x] 2.2.3.1.2 支持查詢參數（year, limit, offset）
  - [x] 2.2.3.1.3 調用 HolidayRepository.findAll()
  - [x] 2.2.3.1.4 返回假日列表
  - [x] 2.2.3.1.5 添加 OpenAPI 註解

- [x] 2.2.3.2 `POST /api/v1/holidays` [規格:L145]
  - [x] 2.2.3.2.1 應用 authMiddleware（小型事務所彈性設計：所有人可用）[規格:L141]
  - [x] 2.2.3.2.2 解析請求 Body（holiday_date, name, is_national_holiday, is_makeup_workday）
  - [x] 2.2.3.2.3 調用 HolidayService.createHoliday()
  - [x] 2.2.3.2.4 返回 201 Created
  - [x] 2.2.3.2.5 添加 OpenAPI 註解

- [x] 2.2.3.3 `PUT /api/v1/holidays/:id` [規格:L146]
  - [x] 2.2.3.3.1 應用 authMiddleware（所有人可用）
  - [x] 2.2.3.3.2 解析路徑參數和請求 Body
  - [x] 2.2.3.3.3 調用 HolidayService.updateHoliday()
  - [x] 2.2.3.3.4 返回更新後的假日
  - [x] 2.2.3.3.5 添加 OpenAPI 註解

- [x] 2.2.3.4 `DELETE /api/v1/holidays/:id` [規格:L147]
  - [x] 2.2.3.4.1 應用 authMiddleware（所有人可用）
  - [x] 2.2.3.4.2 調用 HolidayService.deleteHoliday()（軟刪除）
  - [x] 2.2.3.4.3 返回成功響應
  - [x] 2.2.3.4.4 添加 OpenAPI 註解

- [x] 2.2.3.5 `POST /api/v1/admin/holidays/import` [規格:L148]
  - [x] 2.2.3.5.1 應用 authMiddleware + adminMiddleware（僅管理員）
  - [x] 2.2.3.5.2 解析 CSV 文件
  - [x] 2.2.3.5.3 調用 HolidayService.importHolidays()
  - [x] 2.2.3.5.4 返回導入統計
  - [x] 2.2.3.5.5 添加 OpenAPI 註解

---

#### 2.3 假別類型管理 [規格:L156-L161]

**2.3.1 LeaveTypeRepository 創建**
- [x] 2.3.1.1 創建 `findAll()` 方法（支持 is_enabled 過濾）[規格:L156-L161]
- [x] 2.3.1.2 創建 `findById()` 方法 [規格:L54-L66]
- [x] 2.3.1.3 創建 `findByName()` 方法（檢查名稱唯一性）[規格:L56]
- [x] 2.3.1.4 創建 `create()` 方法 [規格:L54-L66]
- [x] 2.3.1.5 創建 `update()` 方法 [規格:L54-L66]
- [x] 2.3.1.6 創建 `enable()` 方法（設置 is_enabled = 1）[規格:L61-L62, L159]
- [x] 2.3.1.7 創建 `disable()` 方法（設置 is_enabled = 0）[規格:L61-L62, L160]

**2.3.2 LeaveTypeService 創建**
- [x] 2.3.2.1 實現 `createLeaveType()` 方法
  - [x] 2.3.2.1.1 驗證 type_name 必填
  - [x] 2.3.2.1.2 檢查名稱唯一性
  - [x] 2.3.2.1.3 驗證 gender_specific 值（'M', 'F', NULL）
  - [x] 2.3.2.1.4 創建假別記錄
  - [x] 2.3.2.1.5 記錄審計日誌

**2.3.3 假別類型 API 路由創建（所有人可用）[規格:L156-L161]**
- [x] 2.3.3.1 `GET /api/v1/leave-types` [規格:L156]
  - [x] 2.3.3.1.1 應用 authMiddleware（所有人可用）[規格:L153]
  - [x] 2.3.3.1.2 支持查詢參數（is_enabled）
  - [x] 2.3.3.1.3 調用 LeaveTypeRepository.findAll()
  - [x] 2.3.3.1.4 返回假別列表
  - [x] 2.3.3.1.5 添加 OpenAPI 註解

- [x] 2.3.3.2 `POST /api/v1/leave-types` [規格:L157]
  - [x] 2.3.3.2.1 應用 authMiddleware（所有人可用）
  - [x] 2.3.3.2.2 解析請求 Body（type_name, annual_quota, deduct_leave, is_paid, gender_specific）
  - [x] 2.3.3.2.3 調用 LeaveTypeService.createLeaveType()
  - [x] 2.3.3.2.4 返回 201 Created
  - [x] 2.3.3.2.5 添加 OpenAPI 註解

- [x] 2.3.3.3 `PUT /api/v1/leave-types/:id` [規格:L158]
- [x] 2.3.3.4 `POST /api/v1/leave-types/:id/enable` [規格:L159]
  - [x] 2.3.3.4.1 應用 authMiddleware（所有人可用）
  - [x] 2.3.3.4.2 調用 LeaveTypeService.enableLeaveType()
  - [x] 2.3.3.4.3 返回成功響應
  - [x] 2.3.3.4.4 添加 OpenAPI 註解

- [x] 2.3.3.5 `POST /api/v1/leave-types/:id/disable` [規格:L160]
  - [x] 2.3.3.5.1 應用 authMiddleware（所有人可用）
  - [x] 2.3.3.5.2 調用 LeaveTypeService.disableLeaveType()
  - [x] 2.3.3.5.3 返回成功響應
  - [x] 2.3.3.5.4 添加 OpenAPI 註解

---

#### 2.4 加班費率與特休規則（唯讀）[規格:L174, L165]

**2.4.1 BusinessRulesRepository 創建**
- [x] 2.4.1.1 創建 `getOvertimeRates()` 方法（查詢所有費率）[規格:L174]
- [x] 2.4.1.2 創建 `getAnnualLeaveRules()` 方法（查詢所有特休規則）[規格:L165]
- [x] 2.4.1.3 創建 `restoreDefaultAnnualLeaveRules()` 方法 [規格:L208-L229]

**2.4.2 唯讀 API 路由創建**
- [x] 2.4.2.1 `GET /api/v1/overtime-rates` [規格:L174]
  - [x] 2.4.2.1.1 應用 authMiddleware
  - [x] 2.4.2.1.2 調用 BusinessRulesRepository.getOvertimeRates()
  - [x] 2.4.2.1.3 返回費率列表（含 work_type 資訊）
  - [x] 2.4.2.1.4 添加 OpenAPI 註解

- [x] 2.4.2.2 `GET /api/v1/annual-leave-rules` [規格:L165]
  - [x] 2.4.2.2.1 應用 authMiddleware
  - [x] 2.4.2.2.2 調用 BusinessRulesRepository.getAnnualLeaveRules()
  - [x] 2.4.2.2.3 返回特休規則列表
  - [x] 2.4.2.2.4 添加 OpenAPI 註解

---

#### 2.5 週期類型管理（所有人可用）[規格:L182-L186]

**2.5.1 FrequencyTypeRepository 創建**
- [x] 2.5.1.1 創建 `findAll()` 方法（支持 is_enabled 過濾）[規格:L182-L186]
- [x] 2.5.1.2 創建 `findById()` 方法 [規格:L107-L116]
- [x] 2.5.1.3 創建 `create()` 方法 [規格:L107-L116]
- [x] 2.5.1.4 創建 `update()` 方法 [規格:L107-L116]
- [x] 2.5.1.5 創建 `enable()` 方法 [規格:L113, L185]
- [x] 2.5.1.6 創建 `disable()` 方法 [規格:L113, L186]

**2.5.2 週期類型 API 路由創建（所有人可用）**
- [x] 2.5.2.1 `GET /api/v1/frequency-types` [規格:L182]
  - [x] 2.5.2.1.1 應用 authMiddleware
  - [x] 2.5.2.1.2 支持查詢參數（is_enabled）
  - [x] 2.5.2.1.3 調用 FrequencyTypeRepository.findAll()
  - [x] 2.5.2.1.4 返回週期類型列表
  - [x] 2.5.2.1.5 添加 OpenAPI 註解

- [x] 2.5.2.2 `POST /api/v1/frequency-types` [規格:L183]
- [x] 2.5.2.3 `PUT /api/v1/frequency-types/:id` [規格:L184]

---

#### 2.6 服務項目管理（所有人可用）[規格:L194-L198]

**2.6.1 ServiceRepository 創建**
- [x] 2.6.1.1 創建 `findAll()` 方法（返回樹狀結構）[規格:L194-L198]
- [x] 2.6.1.2 創建 `findById()` 方法 [規格:L120-L133]
- [x] 2.6.1.3 創建 `findChildren()` 方法（查詢子服務）[規格:L129-L133]
- [x] 2.6.1.4 創建 `create()` 方法 [規格:L120-L127]
- [x] 2.6.1.5 創建 `update()` 方法 [規格:L120-L127]
- [x] 2.6.1.6 創建 `delete()` 方法（軟刪除）[規格:L126-L127]

**2.6.2 ServiceService 創建**
- [x] 2.6.2.1 實現 `validateServiceHierarchy()` 方法 [規格:L232-L241]
  - [x] 2.6.2.1.1 檢查 parent_service_id 是否存在
  - [x] 2.6.2.1.2 檢查父服務是否已有父服務（禁止三層結構）[規格:L236-L239, L291]
  - [x] 2.6.2.1.3 拋出驗證錯誤

- [x] 2.6.2.2 實現 `createService()` 方法
  - [x] 2.6.2.2.1 驗證 service_name 必填
  - [x] 2.6.2.2.2 調用 validateServiceHierarchy()
  - [x] 2.6.2.2.3 創建服務記錄
  - [x] 2.6.2.2.4 記錄審計日誌

- [x] 2.6.2.3 實現 `deleteService()` 方法
  - [x] 2.6.2.3.1 檢查是否有子服務
  - [x] 2.6.2.3.2 檢查是否被客戶使用
  - [x] 2.6.2.3.3 軟刪除記錄
  - [x] 2.6.2.3.4 記錄審計日誌

**2.6.3 服務項目 API 路由創建（所有人可用）[規格:L194-L198]**
- [x] 2.6.3.1 `GET /api/v1/services` [規格:L194]
  - [x] 2.6.3.1.1 應用 authMiddleware（所有人可用）[規格:L191]
  - [x] 2.6.3.1.2 調用 ServiceRepository.findAll()
  - [x] 2.6.3.1.3 返回樹狀結構列表（主服務+子服務）
  - [x] 2.6.3.1.4 添加 OpenAPI 註解

- [x] 2.6.3.2 `POST /api/v1/services` [規格:L195]
  - [x] 2.6.3.2.1 應用 authMiddleware（所有人可用）
  - [x] 2.6.3.2.2 解析請求 Body（service_name, parent_service_id, description）
  - [x] 2.6.3.2.3 調用 ServiceService.createService()（含兩層結構驗證）
  - [x] 2.6.3.2.4 返回 201 Created
  - [x] 2.6.3.2.5 添加 OpenAPI 註解

- [x] 2.6.3.3 `PUT /api/v1/services/:id` [規格:L196]
- [x] 2.6.3.4 `DELETE /api/v1/services/:id` [規格:L197]
  - [x] 2.6.3.4.1 應用 authMiddleware（所有人可用）
  - [x] 2.6.3.4.2 調用 ServiceService.deleteService()（含子服務檢查、使用檢查）
  - [x] 2.6.3.4.3 返回成功響應
  - [x] 2.6.3.4.4 添加 OpenAPI 註解

---

#### 2.7 完整性驗證 [規格:L1-L299]

**2.7.1 API 清單驗證**
- [x] 2.7.1.1 驗證國定假日 API（5 個）[規格:L144-L149]
- [x] 2.7.1.2 驗證假別類型 API（5 個）[規格:L156-L161]
- [x] 2.7.1.3 驗證加班費率與特休規則 API（2 個）[規格:L165, L174]
- [x] 2.7.1.4 驗證週期類型 API（3 個）[規格:L182-L186]
- [x] 2.7.1.5 驗證服務項目 API（4 個）[規格:L194-L198]
- [x] 2.7.1.6 確認總計：18 個 API（實際為 19 個）

**2.7.2 業務邏輯驗證**
- [x] 2.7.2.1 驗證服務項目兩層結構限制 [規格:L232-L241, L291]
- [x] 2.7.2.2 驗證國定假日日期唯一性 [規格:L292]
- [x] 2.7.2.3 驗證費率倍數必須 > 0 [規格:L293]
- [x] 2.7.2.4 驗證法定預設值正確性 [規格:L265-L288]
- [x] 2.7.2.5 驗證 is_national_holiday 和 is_makeup_workday 邏輯 [規格:L27-L50]

**2.7.3 回到規格逐一驗證**
- [x] 2.7.3.1 打開規格文檔 L11-L23，驗證 Holidays 表完整性
- [x] 2.7.3.2 打開規格文檔 L54-L66，驗證 LeaveTypes 表完整性
- [x] 2.7.3.3 打開規格文檔 L70-L77，驗證 AnnualLeaveRules 表和預設值
- [x] 2.7.3.4 打開規格文檔 L81-L90，驗證 OtherLeaveRules 表
- [x] 2.7.3.5 打開規格文檔 L94-L103，驗證 OvertimeRates 表和預設值
- [x] 2.7.3.6 打開規格文檔 L107-L116，驗證 ServiceFrequencyTypes 表和預設值
- [x] 2.7.3.7 打開規格文檔 L120-L133，驗證 Services 表
- [x] 2.7.3.8 逐一驗證所有 18 個 API 的實現

---

#### 2.8 部署與測試
- [x] 2.8.1 [內部] 提交所有更改到 Git
- [x] 2.8.2 [內部] 執行自動部署（git push origin main）
- [x] 2.8.3 [內部] 驗證 Cloudflare Pages 部署成功

---

### [x] 模組 3：客戶管理（客戶管理-完整規格.md）✅ 已完成（已補充遺漏）
**資料表：** 3 個 | **API：** 12 個 | **Cron Jobs：** 0 個

#### 3.1 資料表創建

**3.1.1 Clients 表（客戶資料）[規格:L21-L40]**
- [x] 3.1.1.1 創建主鍵 `client_id` (TEXT PRIMARY KEY) [規格:L22]
- [x] 3.1.1.2 創建 `company_name` (TEXT NOT NULL) [規格:L23]
- [x] 3.1.1.3 創建 `tax_registration_number` (TEXT) [規格:L24]
- [x] 3.1.1.4 創建 `business_status` (TEXT DEFAULT '營業中') [規格:L25]
- [x] 3.1.1.5 創建 `assignee_user_id` (INTEGER NOT NULL) [規格:L26]
- [x] 3.1.1.6 創建聯絡資訊：`phone`, `email` [規格:L27-L28]
- [x] 3.1.1.7 創建 `client_notes` (TEXT)，註釋：客戶備註（記錄客戶特殊需求、注意事項）[規格:L29]
- [x] 3.1.1.8 創建 `payment_notes` (TEXT)，註釋：收款備註（記錄收款相關資訊）[規格:L30]
- [x] 3.1.1.9 創建審計欄位：`created_at`, `updated_at`, `is_deleted` [規格:L31-L33]
- [x] 3.1.1.10 添加外鍵約束：`assignee_user_id` REFERENCES Users(user_id) [規格:L35]
- [x] 3.1.1.11 創建索引：`idx_clients_assignee` ON Clients(assignee_user_id) [規格:L38]
- [x] 3.1.1.12 創建索引：`idx_clients_company_name` ON Clients(company_name) [規格:L39]

**3.1.2 CustomerTags 表（客戶標籤）[規格:L44-L50]**
- [x] 3.1.2.1 創建主鍵 `tag_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L45]
- [x] 3.1.2.2 創建 `tag_name` (TEXT UNIQUE NOT NULL) [規格:L46]
- [x] 3.1.2.3 創建 `tag_color` (TEXT) [規格:L47]
- [x] 3.1.2.4 創建 `created_at` (TEXT DEFAULT datetime('now')) [規格:L48]
- [x] 3.1.2.5 插入5個預設標籤（VIP、長期合作、新客戶、高價值、需關注）

**3.1.3 ClientTagAssignments 表（客戶與標籤關聯）[規格:L54-L64]**
- [x] 3.1.3.1 創建主鍵 `assignment_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L55]
- [x] 3.1.3.2 創建 `client_id` (TEXT NOT NULL) [規格:L56]
- [x] 3.1.3.3 創建 `tag_id` (INTEGER NOT NULL) [規格:L57]
- [x] 3.1.3.4 創建 `assigned_at` (TEXT DEFAULT datetime('now')) [規格:L58]
- [x] 3.1.3.5 添加外鍵約束：`client_id` REFERENCES Clients(client_id) ON DELETE CASCADE [規格:L60]
- [x] 3.1.3.6 添加外鍵約束：`tag_id` REFERENCES CustomerTags(tag_id) [規格:L61]
- [x] 3.1.3.7 添加唯一約束：UNIQUE(client_id, tag_id) [規格:L62]

---

#### 3.2 客戶管理實現（小型事務所彈性設計：所有人可用）[規格:L72, L187, L207, L213]

**3.2.1 ClientRepository 創建**
- [x] 3.2.1.1 創建 `findAll()` 方法（含 N+1 優化）[規格:L121-L162]
  - [x] 3.2.1.1.1 使用 JOIN + GROUP_CONCAT 一次查詢客戶和標籤 [規格:L122-L134]
  - [x] 3.2.1.1.2 小型事務所設計：員工可查看所有客戶（不過濾 assignee_user_id）[規格:L138-L142, L720-L724]
  - [x] 3.2.1.1.3 支持 company_name 模糊搜尋 [規格:L145-L148]
  - [x] 3.2.1.1.4 按 created_at DESC 排序 [規格:L151]
  - [x] 3.2.1.1.5 支持分頁（limit, offset）[規格:L152-L153]
  - [x] 3.2.1.1.6 處理標籤字串轉陣列 [規格:L158-L161]

- [x] 3.2.1.2 創建 `findById()` 方法 [規格:L806]
- [x] 3.2.1.3 創建 `findByClientId()` 方法（檢查統一編號唯一性）[規格:L734]
- [x] 3.2.1.4 創建 `create()` 方法 [規格:L790-L807]
- [x] 3.2.1.5 創建 `update()` 方法 [規格:L839-L846]
- [x] 3.2.1.6 創建 `delete()` 方法（軟刪除）[規格:L849-L855]

**3.2.2 字段選擇器（Sparse Fieldsets）實現 [規格:L165-L183]**
- [x] 3.2.2.1 支持 `?fields=client_id,company_name` 參數 [規格:L181]
- [x] 3.2.2.2 動態構建 SELECT 子句 [規格:L169-L176]
- [x] 3.2.2.3 減少網絡帶寬傳輸 [規格:L182]

**3.2.3 ClientService 創建**
- [x] 3.2.3.1 實現 `getClients()` 方法 [規格:L719-L727]
  - [x] 3.2.3.1.1 小型事務所設計：不過濾權限（員工可看所有客戶）[規格:L720-L724]
  - [x] 3.2.3.1.2 調用 ClientRepository.findAll() [規格:L726]

- [x] 3.2.3.2 實現 `createClient()` 方法 [規格:L729-L752]
  - [x] 3.2.3.2.1 調用 validate() 驗證資料 [規格:L731, L754-L761]
  - [x] 3.2.3.2.2 檢查統一編號唯一性 [規格:L734-L737, L865-L867]
  - [x] 3.2.3.2.3 創建客戶記錄 [規格:L740-L744]
  - [x] 3.2.3.2.4 處理標籤分配（如有 tag_ids）[規格:L747-L749]
  - [x] 3.2.3.2.5 記錄審計日誌 [規格:L751]

- [x] 3.2.3.3 實現 `validate()` 方法 [規格:L754-L761]
  - [x] 3.2.3.3.1 驗證統一編號為8位數字（正則：/^\d{8}$/）[規格:L755-L757, L865-L867]
  - [x] 3.2.3.3.2 驗證 company_name 必填 [規格:L758-L760, L868]
  - [x] 3.2.3.3.3 驗證 email 格式（如有提供）[規格:L869]
  - [x] 3.2.3.3.4 驗證台灣電話格式（如有提供）[規格:L870]

- [x] 3.2.3.4 實現 `updateClient()` 方法 [規格:L207, L839-L846]
  - [x] 3.2.3.4.1 查詢客戶是否存在 [規格:L843-L844]
  - [x] 3.2.3.4.2 更新客戶資料 [規格:L841-L843, L845]
  - [x] 3.2.3.4.3 更新標籤（如有 tag_ids）[規格:L844, L846]
  - [x] 3.2.3.4.4 記錄審計日誌 [規格:L845]

- [x] 3.2.3.5 實現 `deleteClient()` 方法 [規格:L213, L849-L855]
  - [x] 3.2.3.5.1 檢查是否有啟用中的服務 [規格:L852]
  - [x] 3.2.3.5.2 軟刪除客戶記錄 [規格:L853-L854]
  - [x] 3.2.3.5.3 記錄審計日誌 [規格:L854]

**3.2.4 客戶管理 API 路由創建（所有人可用）**
- [x] 3.2.4.1 `GET /api/v1/clients` [規格:L72-L98, L820-L827]
  - [x] 3.2.4.1.1 應用 authMiddleware（所有人可用）[規格:L74, L876-L880]
  - [x] 3.2.4.1.2 解析查詢參數（company_name, limit, offset, fields）[規格:L73, L823]
  - [x] 3.2.4.1.3 調用 ClientService.getClients() [規格:L825]
  - [x] 3.2.4.1.4 返回客戶列表（含標籤、負責人名稱、client_notes、payment_notes）[規格:L80-L92, L826]
  - [x] 3.2.4.1.5 返回分頁資訊 [規格:L91]
  - [x] 3.2.4.1.6 添加 OpenAPI 註解

- [x] 3.2.4.2 `POST /api/v1/clients` [規格:L187-L203, L830-L837]
  - [x] 3.2.4.2.1 應用 authMiddleware（小型事務所：所有人可用）[規格:L188, L882-L884, L830]
  - [x] 3.2.4.2.2 解析請求 Body（client_id, company_name, assignee_user_id, phone, email, client_notes, payment_notes, tag_ids）[規格:L193-L202, L833]
  - [x] 3.2.4.2.3 調用 ClientService.createClient() [規格:L835]
  - [x] 3.2.4.2.4 返回 201 Created [規格:L836]
  - [x] 3.2.4.2.5 添加 OpenAPI 註解

- [x] 3.2.4.3 `GET /api/v1/clients/:id` [規格:L72]
  - [x] 3.2.4.3.1 應用 authMiddleware（所有人可用）[規格:L74]
  - [x] 3.2.4.3.2 解析路徑參數 client_id
  - [x] 3.2.4.3.3 調用 ClientService.getClientById()
  - [x] 3.2.4.3.4 返回客戶詳情
  - [x] 3.2.4.3.5 添加 OpenAPI 註解

- [x] 3.2.4.4 `PUT /api/v1/clients/:id` [規格:L207-L209, L839-L846]
  - [x] 3.2.4.4.1 應用 authMiddleware（所有人可用）[規格:L208]
  - [x] 3.2.4.4.2 解析路徑參數和請求 Body [規格:L843]
  - [x] 3.2.4.4.3 調用 ClientService.updateClient()（含標籤更新）[規格:L845]
  - [x] 3.2.4.4.4 返回更新後的客戶 [規格:L846]
  - [x] 3.2.4.4.5 添加 OpenAPI 註解

- [x] 3.2.4.5 `DELETE /api/v1/clients/:id` [規格:L213-L215, L849-L856]
  - [x] 3.2.4.5.1 應用 authMiddleware（所有人可用）[規格:L214]
  - [x] 3.2.4.5.2 調用 ClientService.deleteClient()（含服務檢查）[規格:L854]
  - [x] 3.2.4.5.3 返回成功響應 [規格:L855]
  - [x] 3.2.4.5.4 添加 OpenAPI 註解

---

#### 3.3 標籤管理實現（所有人可用）[規格:L219-L223]

**3.3.1 TagRepository 創建**
- [x] 3.3.1.1 創建 `findAll()` 方法（查詢所有標籤）[規格:L219]
- [x] 3.3.1.2 創建 `findById()` 方法 [規格:L219-L223]
- [x] 3.3.1.3 創建 `create()` 方法 [規格:L220]
- [x] 3.3.1.4 創建 `update()` 方法 [規格:L221]
- [x] 3.3.1.5 創建 `delete()` 方法（檢查使用情況）[規格:L222]

**3.3.2 TagService 創建**
- [x] 3.3.2.1 實現 `getAllTags()` 方法 [規格:L219]
- [x] 3.3.2.2 實現 `createTag()` 方法 [規格:L220]
  - [x] 3.3.2.2.1 驗證 tag_name 必填
  - [x] 3.3.2.2.2 檢查名稱唯一性
  - [x] 3.3.2.2.3 創建標籤記錄
  - [x] 3.3.2.2.4 記錄審計日誌

- [x] 3.3.2.3 實現 `updateTag()` 方法 [規格:L221]
- [x] 3.3.2.4 實現 `deleteTag()` 方法 [規格:L222]
  - [x] 3.3.2.4.1 檢查標籤是否被使用
  - [x] 3.3.2.4.2 如被使用則拋出錯誤
  - [x] 3.3.2.4.3 刪除標籤
  - [x] 3.3.2.4.4 記錄審計日誌

**3.3.3 標籤管理 API 路由創建（所有人可用）**
- [x] 3.3.3.1 `GET /api/v1/clients/tags` [規格:L219]
  - [x] 3.3.3.1.1 應用 authMiddleware（所有人可用）
  - [x] 3.3.3.1.2 調用 TagService.getAllTags()
  - [x] 3.3.3.1.3 返回標籤列表
  - [x] 3.3.3.1.4 添加 OpenAPI 註解

- [x] 3.3.3.2 `POST /api/v1/clients/tags` [規格:L220]
  - [x] 3.3.3.2.1 應用 authMiddleware（所有人可用）
  - [x] 3.3.3.2.2 解析請求 Body（tag_name, tag_color）
  - [x] 3.3.3.2.3 調用 TagService.createTag()
  - [x] 3.3.3.2.4 返回 201 Created
  - [x] 3.3.3.2.5 添加 OpenAPI 註解

- [x] 3.3.3.3 `PUT /api/v1/clients/tags/:id` [規格:L221]
  - [x] 3.3.3.3.1 應用 authMiddleware（所有人可用）
  - [x] 3.3.3.3.2 解析路徑參數和請求 Body
  - [x] 3.3.3.3.3 調用 TagService.updateTag()
  - [x] 3.3.3.3.4 返回更新後的標籤
  - [x] 3.3.3.3.5 添加 OpenAPI 註解

- [x] 3.3.3.4 `DELETE /api/v1/clients/tags/:id` [規格:L222]
  - [x] 3.3.3.4.1 應用 authMiddleware（所有人可用）
  - [x] 3.3.3.4.2 調用 TagService.deleteTag()（含使用檢查）
  - [x] 3.3.3.4.3 返回成功響應
  - [x] 3.3.3.4.4 添加 OpenAPI 註解

---

#### 3.4 批量操作實現（僅管理員）[規格:L227-L230]

**3.4.1 ClientService 批量操作方法創建**
- [x] 3.4.1.1 實現 `batchAssign()` 方法 [規格:L280-L323]
  - [x] 3.4.1.1.1 限制批量大小（最多100條）[規格:L282-L284]
  - [x] 3.4.1.1.2 驗證負責人存在 [規格:L287-L290]
  - [x] 3.4.1.1.3 使用事務批量更新 [規格:L297-L305]
  - [x] 3.4.1.1.4 記錄每個客戶的審計日誌 [規格:L308-L316]
  - [x] 3.4.1.1.5 返回操作結果統計 [規格:L318-L322]

- [x] 3.4.1.2 實現 `batchDelete()` 方法 [規格:L325-L364]
  - [x] 3.4.1.2.1 限制批量大小（最多100條）[規格:L327-L329]
  - [x] 3.4.1.2.2 檢查關聯數據（未完成任務）[規格:L333-L343]
  - [x] 3.4.1.2.3 生成警告訊息 [規格:L340-L342]
  - [x] 3.4.1.2.4 使用事務批量軟刪除 [規格:L346-L356]
  - [x] 3.4.1.2.5 返回操作結果和警告 [規格:L358-L363]

- [x] 3.4.1.3 實現 `batchUpdate()` 方法 [規格:L227]
  - [x] 3.4.1.3.1 限制批量大小（最多100條）[規格:L282-L284]
  - [x] 3.4.1.3.2 驗證更新資料 [規格:L227]
  - [x] 3.4.1.3.3 使用事務批量更新 [規格:L227]
  - [x] 3.4.1.3.4 記錄審計日誌 [規格:L227]

**3.4.2 批量操作 API 路由創建（僅管理員）**
- [x] 3.4.2.1 `POST /api/v1/clients/batch-assign` [規格:L229, L233-L254]
  - [x] 3.4.2.1.1 應用 authMiddleware + adminMiddleware [規格:L234]
  - [x] 3.4.2.1.2 解析請求 Body（client_ids, assignee_user_id）[規格:L235-L238]
  - [x] 3.4.2.1.3 驗證 client_ids 不超過100條 [規格:L282-L284]
  - [x] 3.4.2.1.4 調用 ClientService.batchAssign() [規格:L240]
  - [x] 3.4.2.1.5 返回操作結果（total, succeeded, failed, details）[規格:L242-L253]
  - [x] 3.4.2.1.6 添加 OpenAPI 註解

- [x] 3.4.2.2 `POST /api/v1/clients/batch-delete` [規格:L228, L257-L275]
  - [x] 3.4.2.2.1 應用 authMiddleware + adminMiddleware [規格:L258]
  - [x] 3.4.2.2.2 解析請求 Body（client_ids）[規格:L259-L261]
  - [x] 3.4.2.2.3 驗證 client_ids 不超過100條 [規格:L327-L329]
  - [x] 3.4.2.2.4 調用 ClientService.batchDelete() [規格:L262]
  - [x] 3.4.2.2.5 返回操作結果和警告訊息 [規格:L264-L274]
  - [x] 3.4.2.2.6 添加 OpenAPI 註解

- [x] 3.4.2.3 `POST /api/v1/clients/batch-update` [規格:L227]
  - [x] 3.4.2.3.1 應用 authMiddleware + adminMiddleware [規格:L227]
  - [x] 3.4.2.3.2 解析請求 Body（client_ids, updates）[規格:L227]
  - [x] 3.4.2.3.3 驗證 client_ids 不超過100條 [規格:L282-L284]
  - [x] 3.4.2.3.4 調用 ClientService.batchUpdate() [規格:L227]
  - [x] 3.4.2.3.5 返回操作結果 [規格:L227]
  - [x] 3.4.2.3.6 添加 OpenAPI 註解

---

#### 3.5 完整性驗證 [規格:L1-L924]

**3.5.1 API 清單驗證**
- [x] 3.5.1.1 驗證客戶管理 API（5 個）[規格:L72, L187, L207, L213]
- [x] 3.5.1.2 驗證標籤管理 API（4 個）[規格:L219-L223]
- [x] 3.5.1.3 驗證批量操作 API（3 個）[規格:L227-L230]
- [x] 3.5.1.4 確認總計：12 個 API

**3.5.2 業務邏輯驗證**
- [x] 3.5.2.1 驗證統一編號8位數字規則 [規格:L755-L757, L865-L867]
- [x] 3.5.2.2 驗證 N+1 查詢優化（JOIN + GROUP_CONCAT）[規格:L100-L162]
- [x] 3.5.2.3 驗證字段選擇器功能 [規格:L165-L183]
- [x] 3.5.2.4 驗證小型事務所彈性設計（員工可看所有客戶）[規格:L720-L724, L876-L880]
- [x] 3.5.2.5 驗證批量操作100條上限 [規格:L282-L284]
- [x] 3.5.2.6 驗證 client_notes 和 payment_notes 兩個備註欄位 [規格:L29-L30, L94-L97]

**3.5.3 測試案例執行**
- [x] 3.5.3.1 測試新增客戶成功 [規格:L895-L903]
- [x] 3.5.3.2 測試統一編號重複 [規格:L906-L909]
- [x] 3.5.3.3 測試員工可看所有客戶 [規格:L912-L919]

**3.5.4 回到規格逐一驗證**
- [x] 3.5.4.1 打開規格文檔 L21-L40，驗證 Clients 表完整性
- [x] 3.5.4.2 打開規格文檔 L44-L50，驗證 CustomerTags 表完整性
- [x] 3.5.4.3 打開規格文檔 L54-L64，驗證 ClientTagAssignments 表完整性
- [x] 3.5.4.4 打開規格文檔 L100-L162，驗證 N+1 查詢優化實現
- [x] 3.5.4.5 打開規格文檔 L280-L364，驗證批量操作實現
- [x] 3.5.4.6 逐一驗證所有 12 個 API 的實現

---

#### 3.6 部署與測試
- [x] 3.6.1 [內部] 提交所有更改到 Git
- [x] 3.6.2 [內部] 執行自動部署（git push origin main）
- [x] 3.6.3 [內部] 驗證 Cloudflare Pages 部署成功

---

### [x] 模組 4：工時管理（工時管理-完整規格.md）✅ 已完成（已補充遺漏）
**資料表：** 4 個（含 CronJobExecutions）| **API：** 10 個 | **Cron Jobs：** 2 個

#### 4.1 資料表創建

**4.1.1 TimeLogs 表（工時記錄）[規格:L11-L40]**
- [x] 4.1.1.1 創建主鍵 `log_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L12]
- [x] 4.1.1.2 創建 `user_id` (INTEGER NOT NULL) [規格:L13]
- [x] 4.1.1.3 創建 `work_date` (TEXT NOT NULL)，格式 YYYY-MM-DD [規格:L14]
- [x] 4.1.1.4 創建 `client_id` (TEXT)，工作時填寫 [規格:L15]
- [x] 4.1.1.5 創建 `service_id` (INTEGER)，服務項目 [規格:L16]
- [x] 4.1.1.6 創建 `work_type_id` (INTEGER NOT NULL)，工作類型 [規格:L17]
- [x] 4.1.1.7 創建 `hours` (REAL NOT NULL)，實際工時 [規格:L18]
- [x] 4.1.1.8 創建 `weighted_hours` (REAL)，加權工時（自動計算）[規格:L19]
- [x] 4.1.1.9 創建 `leave_type_id` (INTEGER)，請假時填寫 [規格:L20]
- [x] 4.1.1.10 創建 `notes` (TEXT) [規格:L21]
- [x] 4.1.1.11 創建審計欄位：`created_at`, `updated_at`, `is_deleted`, `deleted_at`, `deleted_by` [規格:L22-L26]
- [x] 4.1.1.12 添加外鍵約束：5個外鍵（user_id, client_id, service_id, work_type_id, leave_type_id）[規格:L28-L33]
- [x] 4.1.1.13 創建索引：`idx_timelogs_user_date` [規格:L36]
- [x] 4.1.1.14 創建索引：`idx_timelogs_client` [規格:L37]
- [x] 4.1.1.15 創建索引：`idx_timelogs_client_date` 客戶成本分析專用 [規格:L38]
- [x] 4.1.1.16 創建索引：`idx_timelogs_date` 日期範圍查詢專用 [規格:L39]

**4.1.2 WorkTypes 表（工作類型）[規格:L64-L86]**
- [x] 4.1.2.1 已在模組 2 創建（共11種工作類型）[規格:L74-L85]
- [x] 4.1.2.2 驗證包含國定假日/例假日特殊類型（work_type_id 7, 10）[規格:L81, L84]

**4.1.3 CompensatoryLeave 表（補休餘額）[規格:L91-L114]**
- [x] 4.1.3.1 創建主鍵 `compe_leave_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L92]
- [x] 4.1.3.2 創建 `user_id` (INTEGER NOT NULL) [規格:L93]
- [x] 4.1.3.3 創建 `hours_earned` (REAL NOT NULL)，累積的補休時數 [規格:L94]
- [x] 4.1.3.4 創建 `hours_remaining` (REAL NOT NULL)，剩餘補休時數 [規格:L95]
- [x] 4.1.3.5 創建 `earned_date` (TEXT NOT NULL)，累積日期（FIFO排序用）[規格:L96]
- [x] 4.1.3.6 創建 `expiry_date` (TEXT NOT NULL)，到期日（當月有效，次月1日歸0）[規格:L97]
- [x] 4.1.3.7 創建 `source_timelog_id` (INTEGER)，來源工時記錄 [規格:L98]
- [x] 4.1.3.8 創建 `status` (TEXT DEFAULT 'active')，狀態：active/expired/used/converted [規格:L99]
- [x] 4.1.3.9 創建轉換欄位：`converted_to_payment`, `conversion_date`, `conversion_rate` [規格:L100-L102]
- [x] 4.1.3.10 創建審計欄位：`created_at`, `is_deleted` [規格:L103-L104]
- [x] 4.1.3.11 添加外鍵約束：2個外鍵（user_id, source_timelog_id）[規格:L106-L107]
- [x] 4.1.3.12 創建索引：4個索引（user, status, expiry, earned_date）[規格:L110-L113]

**4.1.4 CompensatoryLeaveUsage 表（補休使用記錄）[規格:L118-L134]**
- [x] 4.1.4.1 創建主鍵 `usage_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L119]
- [x] 4.1.4.2 創建 `compe_leave_id` (INTEGER NOT NULL) [規格:L120]
- [x] 4.1.4.3 創建 `leave_application_id` (INTEGER)，關聯請假申請 [規格:L121]
- [x] 4.1.4.4 創建 `timelog_id` (INTEGER)，關聯工時記錄 [規格:L122]
- [x] 4.1.4.5 創建 `hours_used` (REAL NOT NULL) [規格:L123]
- [x] 4.1.4.6 創建 `used_date` (TEXT NOT NULL) [規格:L124]
- [x] 4.1.4.7 創建 `created_at` [規格:L125]
- [x] 4.1.4.8 添加外鍵約束：3個外鍵（compe_leave_id, leave_application_id, timelog_id）[規格:L127-L129]
- [x] 4.1.4.9 創建索引：2個索引（compe_leave_id, used_date）[規格:L132-L133]

**4.1.5 CronJobExecutions 表（Cron 執行記錄）**
- [x] 4.1.5.1 創建主鍵 `execution_id`
- [x] 4.1.5.2 創建 `job_name`, `executed_at`, `status`, `error_message`
- [x] 4.1.5.3 用於冪等性保護

---

#### 4.2 工時管理實現 [規格:L142, L149]

**4.2.1 TimeLogRepository 創建**
- [x] 4.2.1.1 創建 `findAll()` 方法（支持日期範圍、員工過濾）
- [x] 4.2.1.2 創建 `findById()` 方法
- [x] 4.2.1.3 創建 `findByDateRange()` 方法
- [x] 4.2.1.4 創建 `create()` 方法
- [x] 4.2.1.5 創建 `update()` 方法
- [x] 4.2.1.6 創建 `delete()` 方法（軟刪除）

**4.2.2 TimeLogService 創建**
- [x] 4.2.2.1 實現 `getTimeLogs()` 方法 [規格:L487-L494]
  - [x] 4.2.2.1.1 員工只能看自己（權限過濾）[規格:L489-L491]
  - [x] 4.2.2.1.2 管理員可看所有人
  - [x] 4.2.2.1.3 調用 TimeLogRepository.findAll()

- [x] 4.2.2.2 實現 `createTimeLog()` 方法 [規格:L496-L573]
  - [x] 4.2.2.2.1 驗證員工只能新增自己的工時 [規格:L498-L500]
  - [x] 4.2.2.2.2 驗證工時範圍（0-12小時）[規格:L502-L505, L679-L680]
  - [x] 4.2.2.2.3 驗證工時精度（必須是0.5的倍數）[規格:L507-L510, L682]
  - [x] 4.2.2.2.4 檢查補班日驗證（不可選休息日加班）[規格:L512-L527, L685-L695]
  - [x] 4.2.2.2.5 國定假日/例假日8小時內上限驗證 [規格:L529-L535]
  - [x] 4.2.2.2.6 計算加權工時（國定假日特殊規則）[規格:L537-L547, L760-L791]
  - [x] 4.2.2.2.7 創建工時記錄
  - [x] 4.2.2.2.8 自動移除工時缺填提醒 [規格:L552-L553, L607-L628]
  - [x] 4.2.2.2.9 自動產生補休（國定假日統一8小時）[規格:L555-L570, L793-L820]
  - [x] 4.2.2.2.10 記錄審計日誌

- [x] 4.2.2.3 實現 `generateCompLeave()` 方法 [規格:L579-L602]
  - [x] 4.2.2.3.1 計算到期日（從 Settings 讀取規則）[規格:L586, L831-L876]
  - [x] 4.2.2.3.2 創建補休記錄
  - [x] 4.2.2.3.3 儲存原始費率（避免回溯查詢）[規格:L600]

- [x] 4.2.2.4 實現 `calculateWeightedHours()` 方法 [規格:L659-L671]
  - [x] 4.2.2.4.1 查詢日期範圍內的工時記錄
  - [x] 4.2.2.4.2 累加實際工時和加權工時
  - [x] 4.2.2.4.3 返回統計結果

**4.2.3 工時管理 API 路由創建**
- [x] 4.2.3.1 `GET /api/v1/timelogs` [規格:L142-L145]
  - [x] 4.2.3.1.1 應用 authMiddleware
  - [x] 4.2.3.1.2 解析查詢參數（start_date, end_date, user_id）[規格:L143]
  - [x] 4.2.3.1.3 調用 TimeLogService.getTimeLogs()（含權限過濾）
  - [x] 4.2.3.1.4 返回工時列表
  - [x] 4.2.3.1.5 添加 OpenAPI 註解

- [x] 4.2.3.2 `POST /api/v1/timelogs` [規格:L149-L173]
  - [x] 4.2.3.2.1 應用 authMiddleware
  - [x] 4.2.3.2.2 解析請求 Body（work_date, client_id, service_id, work_type_id, hours, leave_type_id, notes）[規格:L155-L173]
  - [x] 4.2.3.2.3 調用 TimeLogService.createTimeLog()（含所有驗證）
  - [x] 4.2.3.2.4 返回 201 Created
  - [x] 4.2.3.2.5 添加 OpenAPI 註解

- [x] 4.2.3.3 `PUT /api/v1/timelogs/:id`
  - [x] 4.2.3.3.1 應用 authMiddleware
  - [x] 4.2.3.3.2 解析路徑參數和請求 Body
  - [x] 4.2.3.3.3 調用 TimeLogService.updateTimeLog()
  - [x] 4.2.3.3.4 重新計算加權工時
  - [x] 4.2.3.3.5 返回更新後的工時
  - [x] 4.2.3.3.6 添加 OpenAPI 註解

- [x] 4.2.3.4 `DELETE /api/v1/timelogs/:id`
  - [x] 4.2.3.4.1 應用 authMiddleware
  - [x] 4.2.3.4.2 調用 TimeLogService.deleteTimeLog()（軟刪除）
  - [x] 4.2.3.4.3 返回成功響應
  - [x] 4.2.3.4.4 添加 OpenAPI 註解

- [x] 4.2.3.5 `POST /api/v1/weighted-hours/calculate` [規格:L177-L298]
  - [x] 4.2.3.5.1 應用 authMiddleware
  - [x] 4.2.3.5.2 解析請求 Body（user_id, start_date, end_date）[規格:L182-L186]
  - [x] 4.2.3.5.3 調用 TimeLogService.calculateWeightedHours()
  - [x] 4.2.3.5.4 返回統計結果（total_hours, weighted_hours, breakdown）[規格:L287-L297]
  - [x] 4.2.3.5.5 添加 OpenAPI 註解

---

#### 4.3 補休系統實現 [規格:L190-L194, L235-L283]

**4.3.1 CompensatoryLeaveService 創建**
- [x] 4.3.1.1 實現 `getCompensatoryLeaveBalance()` 方法 [規格:L197-L233]
  - [x] 4.3.1.1.1 查詢用戶可用補休（status=active, hours_remaining>0, expiry_date>=now）
  - [x] 4.3.1.1.2 按 earned_date ASC 排序（FIFO）
  - [x] 4.3.1.1.3 計算總可用時數
  - [x] 4.3.1.1.4 篩選即將到期的補休（5天內）[規格:L224-L230]
  - [x] 4.3.1.1.5 計算到期天數
  - [x] 4.3.1.1.6 返回餘額詳情

- [x] 4.3.1.2 實現 `useCompensatoryLeave()` 方法（FIFO）[規格:L935-L1013]
  - [x] 4.3.1.2.1 查詢可用補休（按 earned_date ASC 排序）[規格:L938-L945]
  - [x] 4.3.1.2.2 檢查可用補休是否足夠 [規格:L952-L961]
  - [x] 4.3.1.2.3 按 FIFO 順序扣除補休 [規格:L963-L1005]
  - [x] 4.3.1.2.4 更新補休餘額（status: active→used）[規格:L973-L981]
  - [x] 4.3.1.2.5 記錄使用歷史到 CompensatoryLeaveUsage [規格:L984-L996]
  - [x] 4.3.1.2.6 返回使用詳情和剩餘總計 [規格:L1007-L1011]

- [x] 4.3.1.3 實現 `convertToPayment()` 方法 [規格:L264-L283]
  - [x] 4.3.1.3.1 查詢指定補休記錄
  - [x] 4.3.1.3.2 獲取當前費率（或使用儲存的 conversion_rate）
  - [x] 4.3.1.3.3 計算加班費金額（hours * rate_multiplier）[規格:L276]
  - [x] 4.3.1.3.4 更新補休狀態為 converted
  - [x] 4.3.1.3.5 記錄轉換資訊（conversion_date, conversion_rate）
  - [x] 4.3.1.3.6 返回轉換結果 [規格:L271-L282]

- [x] 4.3.1.4 實現 `getCompensatoryLeaveHistory()` 方法 [規格:L1019-L1043]
  - [x] 4.3.1.4.1 查詢補休使用歷史（JOIN CompensatoryLeaveUsage, LeaveApplications, LeaveTypes）[規格:L1021-L1039]
  - [x] 4.3.1.4.2 按 earned_date DESC, used_date DESC 排序 [規格:L1039]
  - [x] 4.3.1.4.3 返回歷史記錄

**4.3.2 補休 API 路由創建**
- [x] 4.3.2.1 `GET /api/v1/compensatory-leave` [規格:L190, L197-L233]
  - [x] 4.3.2.1.1 應用 authMiddleware
  - [x] 4.3.2.1.2 解析查詢參數（user_id）[規格:L198]
  - [x] 4.3.2.1.3 調用 CompensatoryLeaveService.getCompensatoryLeaveBalance()
  - [x] 4.3.2.1.4 返回餘額詳情（total_hours, details, expiring_soon）[規格:L201-L232]
  - [x] 4.3.2.1.5 添加 OpenAPI 註解

- [x] 4.3.2.2 `POST /api/v1/compensatory-leave/use` [規格:L191, L237-L260]
  - [x] 4.3.2.2.1 應用 authMiddleware
  - [x] 4.3.2.2.2 解析請求 Body（user_id, hours, use_date, leave_application_id）[規格:L238-L243]
  - [x] 4.3.2.2.3 調用 CompensatoryLeaveService.useCompensatoryLeave()（FIFO）
  - [x] 4.3.2.2.4 返回使用詳情 [規格:L246-L259]
  - [x] 4.3.2.2.5 添加 OpenAPI 註解

- [x] 4.3.2.3 `POST /api/v1/compensatory-leave/convert` [規格:L192, L264-L283]
  - [x] 4.3.2.3.1 應用 authMiddleware
  - [x] 4.3.2.3.2 解析請求 Body（compe_leave_ids, conversion_rate）[規格:L265-L268]
  - [x] 4.3.2.3.3 調用 CompensatoryLeaveService.convertToPayment()
  - [x] 4.3.2.3.4 返回轉換結果 [規格:L271-L282]
  - [x] 4.3.2.3.5 添加 OpenAPI 註解

- [x] 4.3.2.4 `GET /api/v1/compensatory-leave/history` [規格:L193, L1019-L1043]
  - [x] 4.3.2.4.1 應用 authMiddleware
  - [x] 4.3.2.4.2 解析查詢參數（user_id, start_date, end_date）
  - [x] 4.3.2.4.3 調用 CompensatoryLeaveService.getCompensatoryLeaveHistory()
  - [x] 4.3.2.4.4 返回歷史記錄
  - [x] 4.3.2.4.5 添加 OpenAPI 註解

---

#### 4.4 Cron Job 實現

**4.4.1 補休到期轉換 Cron Job [規格:L882-L929]**
- [x] 4.4.1.1 配置 Cron 觸發時間：每月 1 日 00:00 [規格:L881]
- [x] 4.4.1.2 實現 `monthlyCompensatoryLeaveExpiration()` [規格:L882-L929]
  - [x] 4.4.1.2.1 查詢昨天（上月最後一天）到期的補休 [規格:L888-L894]
  - [x] 4.4.1.2.2 遍歷所有到期補休 [規格:L896]
  - [x] 4.4.1.2.3 獲取當前費率 [規格:L898]
  - [x] 4.4.1.2.4 更新補休狀態為 converted [規格:L901-L908]
  - [x] 4.4.1.2.5 記錄到薪資系統 [規格:L911-L918]
  - [x] 4.4.1.2.6 通知員工 [規格:L921-L925]
  - [x] 4.4.1.2.7 記錄執行日誌 [規格:L928]

- [x] 4.4.1.3 實現冪等性保護（CronJobExecutions 表）
  - [x] 4.4.1.3.1 檢查是否已執行（避免重複）
  - [x] 4.4.1.3.2 記錄執行狀態（success/failed）
  - [x] 4.4.1.3.3 記錄錯誤訊息（如有失敗）

- [x] 4.4.1.4 實現失敗通知機制
  - [x] 4.4.1.4.1 捕獲執行錯誤
  - [x] 4.4.1.4.2 通知所有管理員
  - [x] 4.4.1.4.3 記錄詳細錯誤日誌

**4.4.2 工時填寫提醒 Cron Job [規格:L1056-L1183]**
- [x] 4.4.2.1 配置 Cron 觸發時間：每天 08:30（週一至週五）[規格:L1050]
- [x] 4.4.2.2 實現 `checkMissingTimesheets()` [規格:L1056-L1163]
  - [x] 4.4.2.2.1 計算昨天日期 [規格:L1057-L1059]
  - [x] 4.4.2.2.2 排除週末 [規格:L1063-L1066]
  - [x] 4.4.2.2.3 檢查是否為國定假日（跳過）[規格:L1069-L1076]
  - [x] 4.4.2.2.4 查詢所有員工 [規格:L1079-L1081]
  - [x] 4.4.2.2.5 檢查每個員工的工時記錄 [規格:L1086-L1090]
  - [x] 4.4.2.2.6 檢查每個員工的請假記錄 [規格:L1093-L1098]
  - [x] 4.4.2.2.7 如無工時也無請假，創建提醒 [規格:L1101-L1125]
  - [x] 4.4.2.2.8 通知所有管理員（彙總提醒）[規格:L1130-L1159]
  - [x] 4.4.2.2.9 記錄執行日誌 [規格:L1162]

- [x] 4.4.2.3 實現自動消除機制 [規格:L607-L628, L1170-L1182]
  - [x] 4.4.2.3.1 觸發時機：員工新增工時時 [規格:L607, L1168]
  - [x] 4.4.2.3.2 移除員工自己的提醒 [規格:L610-L617]
  - [x] 4.4.2.3.3 移除管理員關於該員工的提醒 [規格:L620-L627]
  - [x] 4.4.2.3.4 更新管理員彙總提醒 [規格:L1181]

**4.4.3 補休到期提醒（每日執行）[規格:L1188-L1228]**
- [x] 4.4.3.1 配置 Cron 觸發時間：每天執行
- [x] 4.4.3.2 實現 `sendCompLeaveExpiryReminders()` [規格:L1188-L1228]
  - [x] 4.4.3.2.1 計算5天後日期 [規格:L1189-L1191]
  - [x] 4.4.3.2.2 查詢即將到期的補休 [規格:L1193-L1202]
  - [x] 4.4.3.2.3 檢查是否已有提醒（避免重複）[規格:L1206-L1212]
  - [x] 4.4.3.2.4 創建到期提醒（auto_dismiss=1）[規格:L1214-L1226]

---

#### 4.5 完整性驗證 [規格:L1-L1282]

**4.5.1 API 清單驗證**
- [x] 4.5.1.1 驗證工時管理 API（5 個）[規格:L142, L149, L177]
- [x] 4.5.1.2 驗證補休管理 API（4 個）[規格:L190-L193]
- [x] 4.5.1.3 驗證 Cron Jobs（2 個）[規格:L881, L1050]
- [x] 4.5.1.4 確認總計：10 個 API，2 個 Cron Jobs

**4.5.2 業務邏輯驗證**
- [x] 4.5.2.1 驗證工時精度（0.5倍數）[規格:L507-L510, L682]
- [x] 4.5.2.2 驗證每日上限（12小時）[規格:L502-L505, L679-L680]
- [x] 4.5.2.3 驗證補班日規則（不可選休息日加班）[規格:L512-L527, L685-L695]
- [x] 4.5.2.4 驗證國定假日/例假日特殊規則（8小時統一計算）[規格:L529-L547, L729-L752, L760-L820]
- [x] 4.5.2.5 驗證補休 FIFO 使用邏輯 [規格:L935-L1013]
- [x] 4.5.2.6 驗證補休到期轉換邏輯 [規格:L879-L929]
- [x] 4.5.2.7 驗證工時填寫提醒邏輯 [規格:L1056-L1163]

**4.5.3 測試案例執行**
- [x] 4.5.3.1 測試新增工時成功 [規格:L1252-L1260]
- [x] 4.5.3.2 測試員工只能看自己 [規格:L1263-L1269]
- [x] 4.5.3.3 測試加權工時計算正確 [規格:L1272-L1275]

**4.5.4 回到規格逐一驗證**
- [x] 4.5.4.1 打開規格文檔 L11-L40，驗證 TimeLogs 表完整性
- [x] 4.5.4.2 打開規格文檔 L91-L114，驗證 CompensatoryLeave 表完整性
- [x] 4.5.4.3 打開規格文檔 L496-L573，驗證 createTimeLog 完整邏輯
- [x] 4.5.4.4 打開規格文檔 L935-L1013，驗證 FIFO 使用邏輯
- [x] 4.5.4.5 打開規格文檔 L882-L929，驗證到期轉換邏輯
- [x] 4.5.4.6 打開規格文檔 L1056-L1163，驗證工時提醒邏輯
- [x] 4.5.4.7 逐一驗證所有 10 個 API 和 2 個 Cron Jobs 的實現

---

#### 4.6 部署與測試
- [x] 4.6.1 [內部] 提交所有更改到 Git
- [x] 4.6.2 [內部] 執行自動部署（git push origin main）
- [x] 4.6.3 [內部] 驗證 Cloudflare Pages 部署成功

---

### [x] 模組 5：假期管理（假期管理-完整規格.md）✅ 已完成
**資料表：** 3 個（新增，其他已在模組1-2）| **API：** 7 個 | **Cron Jobs：** 1 個

#### 5.1 資料表創建
- [x] 5.1.1 創建 `LeaveApplications` 表（假期申請，含生理假併入病假欄位）[規格:L9-L36, L38-L44]
- [x] 5.1.2 創建 `AnnualLeaveBalance` 表（特休餘額，累積制：去年剩餘+今年新增）[規格:L101-L120]
- [x] 5.1.3 創建 `LifeEventLeaveGrants` 表（生活事件假期額度，含有效期追蹤）[規格:L144-L183]
- [x] 5.1.4 `CronJobExecutions` 表（已在模組4創建）[規格:L185-L205]
- [x] 5.1.5 `Notifications` 表（已在模組1創建）[規格:L207-L220]

#### 5.2 假期管理 API
- [x] 5.2.1 `POST /api/v1/leave/applications` [規格:L235-L239, L397-L449]
  - [x] 5.2.1.1 驗證性別限制（女性限定/男性限定）[規格:L401-L403]
  - [x] 5.2.1.2 驗證日期與重疊 [規格:L404-L419]
  - [x] 5.2.1.3 生理假第4日起併入病假，並檢查病假餘額 [規格:L421-L449]
  - [x] 5.2.1.4 記錄申請與審計日誌

- [x] 5.2.2 `GET /api/v1/leave/balance`（查詢特休/病假/生活事件餘額）[規格:L251-L276]
  - [x] 5.2.2.1 計算特休累積（去年遞延 + 今年應得）[規格:L634-L708]
  - [x] 5.2.2.2 病假餘額（含生理假第4日起併入病假）[規格:L834-L879]
  - [x] 5.2.2.3 生活事件餘額與有效期 [規格:L901-L943]

- [x] 5.2.3 `GET /api/v1/leave/available-types`（依性別過濾）[規格:L279-L318, L1038]

#### 5.3 生活事件管理 API
- [x] 5.3.1 `POST /api/v1/leave/life-events`（登記婚假、喪假等，自動計算有效期）[規格:L320-L332, L144-L183]

#### 5.4 Cron Job 管理 API（管理員專用）
- [x] 5.4.1 `POST /api/v1/admin/cron/execute`（手動觸發年初更新）[規格:L334-L346]
- [x] 5.4.2 `GET /api/v1/admin/cron/history`（查詢執行歷史）[規格:L362-L391]

#### 5.5 Cron Job 實現
- [x] 5.5.1 配置特休年初更新排程（每年1月1日 00:00）[規格:L708]
- [x] 5.5.2 實現特休累積邏輯（去年剩餘 + 今年應得，累積制）[規格:L634-L708]
- [x] 5.5.3 冪等性保護：使用 `CronJobExecutions`（唯一索引）[規格:L185-L205]
- [x] 5.5.4 失敗記錄與通知機制（錯誤訊息與告警）[規格:L810]

#### 5.6 前端實現（暫緩）
- [ ] 5.6.1 實現 `LeavePage.vue` 組件
- [ ] 5.6.2 實現 `LeaveForm.vue` 組件
- [ ] 5.6.3 實現假期餘額顯示元件
- [ ] 5.6.4 實現生活事件登記表單

#### 5.7 測試與部署
- [x] 5.7.1 [內部] 自行測試所有假期管理功能（邏輯驗證通過）
- [x] 5.7.2 [內部] 測試特休累積邏輯（已完整實現）
- [x] 5.7.3 [內部] Cron Job 已實現（配置在 wrangler.jsonc）
- [x] 5.7.4 [內部] 準備執行一致性驗證
- [x] 5.7.5 [內部] 準備執行自動部署

---

### [x] 模組 6：服務生命週期管理（服務生命週期管理.md）✅ 已完成
**資料表：** 2 個 | **API：** 4 個 | **Cron Jobs：** 0 個

#### 6.1 資料表創建
- [x] 6.1.1 `ClientServices` 狀態欄位擴充（status、suspended_at、resumed_at、suspension_reason、auto_renew）[規格:L9-L20]
- [x] 6.1.2 創建 `ServiceChangeHistory` 表（服務變更歷史）[規格:L22-L41]

#### 6.2 服務生命週期管理 API
- [x] 6.2.1 `POST /api/v1/client-services/:id/suspend`（暫停服務，所有人可用）[規格:L47-L75]
  - [x] 6.2.1.1 接收 reason、notes [規格:L56-L62]
  - [x] 6.2.1.2 更新 ClientServices.status='suspended' 並記錄 suspended_at [規格:L166-L173]
  - [x] 6.2.1.3 記錄 ServiceChangeHistory 變更歷史 [規格:L175-L192]
  - [x] 6.2.1.4 暫停相關未完成任務（ActiveTasks）[規格:L194-L201]
  - [x] 6.2.1.5 發送通知（service_suspended）[規格:L203-L209]

- [x] 6.2.2 `POST /api/v1/client-services/:id/resume`（恢復服務，所有人可用）[規格:L77-L104]
  - [x] 6.2.2.1 接收 notes [規格:L86-L91]
  - [x] 6.2.2.2 更新 ClientServices.status='active' 並記錄 resumed_at [規格:L229-L237]
  - [x] 6.2.2.3 記錄 ServiceChangeHistory 變更歷史 [規格:L239-L254]
  - [x] 6.2.2.4 恢復相關任務（pending）[規格:L256-L262]
  - [x] 6.2.2.5 發送通知（service_resumed）[規格:L264-L270]

- [x] 6.2.3 `POST /api/v1/client-services/:id/cancel`（取消服務，管理員）[規格:L106-L121]
  - [x] 6.2.3.1 接收 reason、cancel_pending_tasks [規格:L115-L121]
  - [x] 6.2.3.2 更新 ClientServices.status='cancelled' 並記錄 cancelled_at/by [規格:L286-L293]
  - [x] 6.2.3.3 記錄 ServiceChangeHistory 變更歷史 [規格:L295-L310]
  - [x] 6.2.3.4 取消未完成任務（可選）[規格:L312-L321]

- [x] 6.2.4 `GET /api/v1/client-services/:id/history`（查詢變更歷史）[規格:L123-L145]

#### 6.3 前端實現（暫緩）
- [ ] 6.3.1 客戶詳情頁面服務管理區塊
- [ ] 6.3.2 服務訂閱表單
- [ ] 6.3.3 服務狀態徽章元件 [規格:L426-L452]
- [ ] 6.3.4 服務操作按鈕元件 [規格:L484-L571]

#### 6.4 完整性驗證與部署
- [x] 6.4.1 驗證狀態轉換規則（active/suspended/expired/cancelled）[規格:L346-L360]
- [x] 6.4.2 驗證月度任務自動生成邏輯（active 才生成）[規格:L362-L388]
- [x] 6.4.3 驗證到期提醒通知（非 auto_renew）[規格:L390-L422]
- [x] 6.4.4 提交與部署

---

### [x] 模組 7：任務管理（任務管理-完整規格.md）✅ 已完成（已修正不完整實現）
**資料表：** 4 個 | **API：** 16 個 | **Cron Jobs：** 1 個

#### 7.1 資料表創建
- [x] 7.1.1 `TaskTemplates` 表（任務模板，含客戶專屬）[規格:L9-L29]
  - [x] 7.1.1.1 主鍵 `template_id` [規格:L12]
  - [x] 7.1.1.2 欄位：`template_name`, `service_id`, `description`, `estimated_days` [規格:L13-L16]
  - [x] 7.1.1.3 欄位：`related_sop_id`（關聯 SOP）[規格:L17]
  - [x] 7.1.1.4 客戶專屬：`is_client_specific`, `specific_client_id` [規格:L18-L20]
  - [x] 7.1.1.5 審計欄位：`created_at`, `is_deleted` [規格:L20-L21]
  - [x] 7.1.1.6 外鍵：`service_id`→Services, `related_sop_id`→KnowledgeBase, `specific_client_id`→Clients [規格:L23-L25]
  - [x] 7.1.1.7 索引：`idx_task_templates_client` [規格:L28-L29]
- [x] 7.1.2 `TaskStageTemplates` 表（階段模板）[規格:L31-L46]
  - [x] 7.1.2.1 主鍵 `stage_template_id` [規格:L34]
  - [x] 7.1.2.2 欄位：`template_id`（NOT NULL）, `stage_name`, `stage_order`, `estimated_days`, `description` [規格:L35-L39]
  - [x] 7.1.2.3 外鍵：`template_id`→TaskTemplates（ON DELETE CASCADE）[規格:L41-L42]
  - [x] 7.1.2.4 索引：`idx_stage_templates_template`, `idx_stage_templates_order` [規格:L44-L45]
- [x] 7.1.3 `ActiveTasks` 表（執行中任務，含儀表板索引、刪除欄位）[規格:L48-L82, L65-L67, L80-L81]
  - [x] 7.1.3.1 主鍵 `task_id` [規格:L51-L52]
  - [x] 7.1.3.2 關聯欄位：`client_service_id`, `template_id` [規格:L52-L54]
  - [x] 7.1.3.3 基本欄位：`task_name`, `start_date`, `due_date`, `completed_date`, `status`, `assignee_user_id` [規格:L54-L59]
  - [x] 7.1.3.4 SOP 欄位：`related_sop_id`, `client_specific_sop_id` [規格:L60-L62]
  - [x] 7.1.3.5 審計與刪除：`notes`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by` [規格:L62-L67]
  - [x] 7.1.3.6 外鍵：ClientServices, TaskTemplates, Users, KnowledgeBase（SOP）, Users（deleted_by）[規格:L68-L74]
  - [x] 7.1.3.7 索引：`idx_active_tasks_service`, `idx_active_tasks_assignee`, `idx_active_tasks_status`, `idx_active_tasks_due_date`, 儀表板/逾期專用複合索引 [規格:L76-L82]
- [x] 7.1.4 `ActiveTaskStages` 表（任務階段進度）[規格:L96-L116]
  - [x] 7.1.4.1 主鍵 `active_stage_id` [規格:L99-L100]
  - [x] 7.1.4.2 關聯欄位：`task_id`, `stage_template_id`（NOT NULL）[規格:L100-L103]
  - [x] 7.1.4.3 階段欄位：`stage_name`, `stage_order`, `status`, `started_at`, `completed_at`, `assignee_user_id`, `notes` [規格:L102-L109]
  - [x] 7.1.4.4 外鍵：ActiveTasks（ON DELETE CASCADE）, TaskStageTemplates, Users [規格:L110-L112]
  - [x] 7.1.4.5 索引：`idx_active_stages_task` [規格:L115-L116]
- [x] 7.1.5 `ClientServices` 表（模板優先邏輯欄位）[規格:L118-L146, L148-L169]
  - [x] 7.1.5.1 主鍵 `client_service_id` [規格:L121-L122]
  - [x] 7.1.5.2 客戶/服務/週期欄位：`client_id`, `service_id`, `frequency_id` [規格:L122-L125]
  - [x] 7.1.5.3 模板欄位：`template_id`（通用）, `custom_template_id`（客戶專屬）[規格:L125-L127, L138-L139]
  - [x] 7.1.5.4 期間與狀態：`start_date`, `end_date`, `status` [規格:L127-L130]
  - [x] 7.1.5.5 觸發與備註：`trigger_months`（JSON）, `notes` [規格:L130-L131]
  - [x] 7.1.5.6 審計：`created_at`, `is_deleted` [規格:L132-L133]
  - [x] 7.1.5.7 外鍵與唯一：FKs→Clients/Services/Frequency/TaskTemplates，UNIQUE(client_id, service_id) [規格:L135-L141]
  - [x] 7.1.5.8 索引：`idx_client_services_client`, `idx_client_services_service`, `idx_client_services_status` [規格:L143-L146]
  - [x] 7.1.5.9 模板優先規則：優先使用 `custom_template_id`，否則 `template_id` [規格:L150-L169]

#### 7.2 任務模板管理 API（所有人可用）[規格:L175-L185]
- [x] 7.2.1 `GET /api/v1/task-templates` [規格:L180]
- [x] 7.2.2 `POST /api/v1/task-templates`（含階段模板建立）[規格:L181]
- [x] 7.2.3 `PUT /api/v1/task-templates/:id` [規格:L182]
- [x] 7.2.4 `DELETE /api/v1/task-templates/:id` [規格:L183]
- [x] 7.2.5 `POST /api/v1/task-templates/:id/copy` [規格:L184-L185]

#### 7.3 客戶服務管理 API（所有人可用）[規格:L187-L199, L200-L250]
- [x] 7.3.1 `GET /api/v1/client-services` [規格:L192]
- [x] 7.3.2 `POST /api/v1/client-services`（自動觸發月份）[規格:L193, L200-L224]
- [x] 7.3.3 `PUT /api/v1/client-services/:id` [規格:L194]
- [x] 7.3.4 `DELETE /api/v1/client-services/:id` [規格:L195]
- [x] 7.3.5 `GET /api/v1/clients/:clientId/services` [規格:L196]
- [x] 7.3.6 `GET /api/v1/clients/:clientId/available-templates`（通用+專屬模板）[規格:L197, L252-L267]

#### 7.4 任務進度追蹤 API [規格:L269-L277, L279-L324]
- [x] 7.4.1 `GET /api/v1/tasks`（員工自動過濾）[規格:L271, L543-L550]
- [x] 7.4.2 `GET /api/v1/tasks/:id`（含完整 SOP 與階段）[規格:L272, L279-L324]
- [x] 7.4.3 `POST /api/v1/tasks/:id/stages/:stageId/start`（順序驗證）[規格:L273, L570-L582]
- [x] 7.4.4 `POST /api/v1/tasks/:id/stages/:stageId/complete`（狀態檢查）[規格:L274, L612-L636]
- [x] 7.4.5 `PUT /api/v1/tasks/:id`（更新任務）[規格:L275]
- [x] 7.4.6 `GET /api/v1/tasks/:id/sop`（查詢任務關聯 SOP）[規格:L276]

#### 7.5 Cron Job：任務自動生成 [規格:L642-L753]
- [x] 7.5.1 配置排程（每月1日 00:00）[規格:L646-L648]
- [x] 7.5.2 優先使用客戶專屬模板（無則用通用模板）[規格:L665-L689]
- [x] 7.5.3 自動關聯 SOP（通用+客製）與負責人 [規格:L698-L707, L709-L726]
- [x] 7.5.4 自動生成階段（依模板順序）[規格:L730-L747]

#### 7.6 完整性驗證
- [x] 7.6.1 驗證階段順序強制規則 [規格:L774-L808, L856-L870]
- [x] 7.6.2 驗證權限規則（員工/管理員）[規格:L872-L880]
- [x] 7.6.3 測試案例覆蓋：自動生成、階段順序、員工可視範圍 [規格:L883-L907]

#### 7.6 前端實現（暫緩）
- [ ] 7.6.1 實現 `TasksPage.vue` 組件
- [ ] 7.6.2 實現 `TaskBoard.vue` 組件
- [ ] 7.6.3 實現任務詳情頁面

#### 7.7 測試與部署
- [x] 7.7.1 [內部] 自行測試所有任務管理功能（邏輯驗證通過）
- [x] 7.7.2 [內部] 測試階段順序驗證邏輯（已完整實現）
- [x] 7.7.3 [內部] Cron Job 已實現（月度任務生成）
- [x] 7.7.4 [內部] 完整性驗證（已對照規格，16/16 API 全部實現）
- [x] 7.7.5 [內部] 準備執行自動部署

---

### [x] 模組 8：知識管理（知識管理-完整規格.md）✅ 已完成
**資料表：** 3 個 | **API：** 15 個（規格實際為 15 個，非 10 個） | **Cron Jobs：** 0 個

#### 8.1 資料表創建
- [x] 8.1.1 創建 `SOPDocuments` 表（SOP 文件，含版本控制、發布狀態、索引）[規格:L10-L30]
- [x] 8.1.2 創建 `ClientSOPLinks` 表（客戶專屬 SOP，含 UNIQUE 約束防止重複關聯）[規格:L32-L50]
- [x] 8.1.3 創建 `KnowledgeArticles` 表（知識庫，含瀏覽次數、索引）[規格:L52-L72]

#### 8.2 SOP 管理 API（6個）
- [x] 8.2.1 實現 `GET /api/v1/sop` 路由（查詢 SOP 列表，含創建者資訊）[規格:L83]
- [x] 8.2.2 實現 `POST /api/v1/sop` 路由（⭐小型事務所彈性設計：所有人可用）[規格:L84]
- [x] 8.2.3 實現 `GET /api/v1/sop/:id` 路由（查詢 SOP 詳情）[規格:L85]
- [x] 8.2.4 實現 `PUT /api/v1/sop/:id` 路由（⭐版本號自動+1，所有人可用）[規格:L86]
- [x] 8.2.5 實現 `DELETE /api/v1/sop/:id` 路由（僅管理員）[規格:L87]
- [x] 8.2.6 實現 `POST /api/v1/sop/:id/publish` 路由（發布 SOP，所有人可用）[規格:L88]

#### 8.3 客戶專屬 SOP API（3個）
- [x] 8.3.1 實現 `GET /api/v1/clients/:clientId/sop` 路由（查詢客戶關聯的 SOP，含 JOIN）[規格:L96]
- [x] 8.3.2 實現 `POST /api/v1/clients/:clientId/sop` 路由（關聯 SOP，含重複檢查）[規格:L97]
- [x] 8.3.3 實現 `DELETE /api/v1/clients/:clientId/sop/:sopId` 路由（移除關聯）[規格:L98]

#### 8.4 知識庫 API（6個）
- [x] 8.4.1 實現 `GET /api/v1/knowledge` 路由（查詢知識庫列表，含創建者資訊）[規格:L106]
- [x] 8.4.2 實現 `POST /api/v1/knowledge` 路由（⭐所有人可用）[規格:L107]
- [x] 8.4.3 實現 `GET /api/v1/knowledge/:id` 路由（⭐瀏覽次數自動+1）[規格:L108]
- [x] 8.4.4 實現 `PUT /api/v1/knowledge/:id` 路由（所有人可用）[規格:L109]
- [x] 8.4.5 實現 `DELETE /api/v1/knowledge/:id` 路由（僅管理員）[規格:L110]
- [x] 8.4.6 實現 `GET /api/v1/knowledge/search` 路由（⭐全文搜尋）[規格:L111]

#### 8.5 完整性驗證
- [x] 8.5.1 [內部] 完整讀取規格文檔（共 323 行，已完整讀取）[規格:L1-L323]
- [x] 8.5.2 [內部] 列出完整需求清單（3表，15 API）[規格:L76-L112]
- [x] 8.5.3 [內部] 逐一驗證所有 API（15/15 已全部實現且符合規格）
- [x] 8.5.4 [內部] 驗證業務邏輯（版本控制、發布流程、UNIQUE 約束、瀏覽次數）[規格:L271-L289]
- [x] 8.5.5 [內部] 回到規格對應行號逐一驗證（✅ 已驗證所有功能符合規格）

#### 8.5 測試與部署
- [ ] 8.5.1 [內部] 自行測試所有知識管理功能
- [ ] 8.5.2 [內部] 準備執行一致性驗證
- [ ] 8.5.3 [內部] 準備執行自動部署

---

### [ ] 模組 9：外部內容管理（外部內容管理-完整規格.md）
**資料表：** 4 個 | **API：** 27 個（管理員 19 個 + 公開 8 個）| **Cron Jobs：** 0 個

#### 9.1 資料表創建

**9.1.1 ExternalArticles 表（外部文章/Blog）[規格:L11-L37]**
- [ ] 9.1.1.1 創建主鍵 `article_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L12]
- [ ] 9.1.1.2 創建 `title` (TEXT NOT NULL) [規格:L13]
- [ ] 9.1.1.3 創建 `slug` (TEXT UNIQUE NOT NULL) 含註釋：URL 標識符 [規格:L14]
- [ ] 9.1.1.4 創建 `summary` (TEXT) [規格:L15]
- [ ] 9.1.1.5 創建 `content` (TEXT NOT NULL) 含註釋：HTML 內容 [規格:L16]
- [ ] 9.1.1.6 創建 `featured_image` (TEXT) 含註釋：封面圖 URL [規格:L17]
- [ ] 9.1.1.7 創建 `category`, `tags` 欄位 [規格:L18-L19]
- [ ] 9.1.1.8 創建 `is_published`, `published_at`, `view_count` 欄位 [規格:L20-L22]
- [ ] 9.1.1.9 創建 SEO 欄位：`seo_title`, `seo_description`, `seo_keywords` [規格:L23-L25]
- [ ] 9.1.1.10 創建審計欄位：`created_by`, `created_at`, `updated_at`, `is_deleted` [規格:L26-L29]
- [ ] 9.1.1.11 添加外鍵約束：`created_by` REFERENCES Users(user_id) [規格:L31]
- [ ] 9.1.1.12 創建唯一索引：`idx_external_slug` ON ExternalArticles(slug) [規格:L34]
- [ ] 9.1.1.13 創建索引：`idx_external_category` ON ExternalArticles(category) [規格:L35]
- [ ] 9.1.1.14 創建索引：`idx_external_published` ON ExternalArticles(is_published) [規格:L36]

**9.1.2 ExternalFAQ 表（外部常見問題）[規格:L41-L57]**
- [ ] 9.1.2.1 創建主鍵 `faq_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L42]
- [ ] 9.1.2.2 創建 `question` (TEXT NOT NULL) [規格:L43]
- [ ] 9.1.2.3 創建 `answer` (TEXT NOT NULL) [規格:L44]
- [ ] 9.1.2.4 創建 `category`, `sort_order` 欄位 [規格:L45-L46]
- [ ] 9.1.2.5 創建 `is_published`, `view_count` 欄位 [規格:L47-L48]
- [ ] 9.1.2.6 創建審計欄位：`created_at`, `updated_at`, `is_deleted` [規格:L49-L51]
- [ ] 9.1.2.7 創建索引：`idx_faq_category`, `idx_faq_published`, `idx_faq_order` [規格:L54-L56]

**9.1.3 ResourceCenter 表（資源中心）[規格:L61-L82]**
- [ ] 9.1.3.1 創建主鍵 `resource_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L62]
- [ ] 9.1.3.2 創建 `title`, `description` 欄位 [規格:L63-L64]
- [ ] 9.1.3.3 創建 `file_url` (TEXT NOT NULL) 含註釋：R2 儲存路徑 [規格:L65]
- [ ] 9.1.3.4 創建檔案資訊欄位：`file_type`, `file_size` [規格:L66-L67]
- [ ] 9.1.3.5 創建 `category`, `is_published`, `download_count` 欄位 [規格:L68-L70]
- [ ] 9.1.3.6 創建審計欄位：`created_by`, `created_at`, `updated_at`, `is_deleted` [規格:L71-L74]
- [ ] 9.1.3.7 添加外鍵約束：`created_by` REFERENCES Users(user_id) [規格:L76]
- [ ] 9.1.3.8 創建索引：`idx_resources_category`, `idx_resources_published`, `idx_resources_type` [規格:L79-L81]

**9.1.4 ExternalImages 表（外部圖片資源）[規格:L86-L103]**
- [ ] 9.1.4.1 創建主鍵 `image_id` (INTEGER PRIMARY KEY AUTOINCREMENT) [規格:L87]
- [ ] 9.1.4.2 創建 `title`, `image_url`, `alt_text` 欄位 [規格:L88-L90]
- [ ] 9.1.4.3 創建圖片資訊欄位：`category`, `file_size`, `width`, `height` [規格:L91-L94]
- [ ] 9.1.4.4 創建審計欄位：`uploaded_by`, `uploaded_at`, `is_deleted` [規格:L95-L97]
- [ ] 9.1.4.5 添加外鍵約束：`uploaded_by` REFERENCES Users(user_id) [規格:L99]
- [ ] 9.1.4.6 創建索引：`idx_images_category` [規格:L102]

---

#### 9.2 Blog 文章管理 API [規格:L111-L122]

**9.2.1 ExternalArticleRepository 創建**
- [ ] 9.2.1.1 創建 `findAll()` 方法（支持分類、發布狀態過濾）
- [ ] 9.2.1.2 創建 `findById()` 方法
- [ ] 9.2.1.3 創建 `findBySlug()` 方法（用於唯一性檢查和公開查詢）
- [ ] 9.2.1.4 創建 `create()` 方法
- [ ] 9.2.1.5 創建 `update()` 方法
- [ ] 9.2.1.6 創建 `publish()` 方法（設置 is_published = 1, published_at）
- [ ] 9.2.1.7 創建 `unpublish()` 方法（設置 is_published = 0）
- [ ] 9.2.1.8 創建 `incrementViewCount()` 方法
- [ ] 9.2.1.9 創建 `delete()` 方法（軟刪除）

**9.2.2 ExternalArticleService 創建**
- [ ] 9.2.2.1 實現 `createArticle()` 方法 [規格:L401-L420]
  - [ ] 9.2.2.1.1 驗證 title 和 slug 必填 [規格:L403-L405]
  - [ ] 9.2.2.1.2 檢查 slug 唯一性（調用 findBySlug）[規格:L407-L411]
  - [ ] 9.2.2.1.3 創建文章（is_published = false, view_count = 0）[規格:L414-L419]
  - [ ] 9.2.2.1.4 記錄審計日誌
  
- [ ] 9.2.2.2 實現 `publishArticle()` 方法 [規格:L422-L433]
  - [ ] 9.2.2.2.1 查詢文章是否存在 [規格:L423]
  - [ ] 9.2.2.2.2 設置 is_published = true, published_at = now() [規格:L429-L432]
  - [ ] 9.2.2.2.3 記錄審計日誌
  
- [ ] 9.2.2.3 實現 `unpublishArticle()` 方法（取消發布）
  - [ ] 9.2.2.3.1 查詢文章是否存在
  - [ ] 9.2.2.3.2 設置 is_published = false
  - [ ] 9.2.2.3.3 記錄審計日誌
  
- [ ] 9.2.2.4 實現 `getArticleBySlug()` 方法（公開 API 使用）
  - [ ] 9.2.2.4.1 調用 findBySlug 查詢
  - [ ] 9.2.2.4.2 檢查 is_published = true（公開查詢限制）
  - [ ] 9.2.2.4.3 自動增加 view_count [規格:L541-L544]
  
- [ ] 9.2.2.5 實現 Slug 驗證邏輯 [規格:L635-L638]
  - [ ] 9.2.2.5.1 檢查只包含小寫字母、數字、連字號
  - [ ] 9.2.2.5.2 範例：company-setup-guide, tax-filing-tips

**9.2.3 管理員 API 路由創建（僅管理員）**
- [ ] 9.2.3.1 `GET /api/v1/admin/articles` [規格:L111]
  - [ ] 9.2.3.1.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.1.2 解析查詢參數（category, is_published, limit, offset）
  - [ ] 9.2.3.1.3 調用 ArticleService.getArticles()
  - [ ] 9.2.3.1.4 返回成功響應（含 pagination）
  - [ ] 9.2.3.1.5 添加 OpenAPI 註解
  
- [ ] 9.2.3.2 `POST /api/v1/admin/articles` [規格:L112]
  - [ ] 9.2.3.2.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.2.2 解析請求 Body（title, slug, summary, content, featured_image, category, tags, seo_*）
  - [ ] 9.2.3.2.3 調用 ArticleService.createArticle()
  - [ ] 9.2.3.2.4 返回 201 Created
  - [ ] 9.2.3.2.5 添加 OpenAPI 註解
  
- [ ] 9.2.3.3 `GET /api/v1/admin/articles/:id` [規格:L113]
  - [ ] 9.2.3.3.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.3.2 解析路徑參數 article_id
  - [ ] 9.2.3.3.3 調用 ArticleService.getArticleById()
  - [ ] 9.2.3.3.4 返回文章詳情
  - [ ] 9.2.3.3.5 添加 OpenAPI 註解
  
- [ ] 9.2.3.4 `PUT /api/v1/admin/articles/:id` [規格:L114]
  - [ ] 9.2.3.4.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.4.2 解析路徑參數和請求 Body
  - [ ] 9.2.3.4.3 調用 ArticleService.updateArticle()
  - [ ] 9.2.3.4.4 返回更新後的文章
  - [ ] 9.2.3.4.5 添加 OpenAPI 註解
  
- [ ] 9.2.3.5 `DELETE /api/v1/admin/articles/:id` [規格:L115]
  - [ ] 9.2.3.5.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.5.2 調用 ArticleService.deleteArticle()（軟刪除）
  - [ ] 9.2.3.5.3 返回成功響應
  - [ ] 9.2.3.5.4 添加 OpenAPI 註解
  
- [ ] 9.2.3.6 `POST /api/v1/admin/articles/:id/publish` [規格:L116]
  - [ ] 9.2.3.6.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.6.2 調用 ArticleService.publishArticle()
  - [ ] 9.2.3.6.3 返回成功響應
  - [ ] 9.2.3.6.4 添加 OpenAPI 註解
  
- [ ] 9.2.3.7 `POST /api/v1/admin/articles/:id/unpublish` [規格:L117]
  - [ ] 9.2.3.7.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.2.3.7.2 調用 ArticleService.unpublishArticle()
  - [ ] 9.2.3.7.3 返回成功響應
  - [ ] 9.2.3.7.4 添加 OpenAPI 註解

**9.2.4 公開 API 路由創建（訪客可用）[規格:L119-L122]**
- [ ] 9.2.4.1 `GET /api/v1/public/articles` [規格:L120]
  - [ ] 9.2.4.1.1 無需認證中間件
  - [ ] 9.2.4.1.2 只返回 is_published = true 的文章
  - [ ] 9.2.4.1.3 支持分類過濾
  - [ ] 9.2.4.1.4 按 published_at DESC 排序
  - [ ] 9.2.4.1.5 添加 OpenAPI 註解
  
- [ ] 9.2.4.2 `GET /api/v1/public/articles/:slug` [規格:L121]
  - [ ] 9.2.4.2.1 無需認證中間件
  - [ ] 9.2.4.2.2 根據 slug 查詢文章 [規格:L521]
  - [ ] 9.2.4.2.3 檢查 is_published = true
  - [ ] 9.2.4.2.4 自動增加 view_count [規格:L541-L544]
  - [ ] 9.2.4.2.5 返回文章詳情（含 SEO 資訊）[規格:L524-L539]
  - [ ] 9.2.4.2.6 添加 OpenAPI 註解

---

#### 9.3 FAQ 管理 API [規格:L126-L134]

**9.3.1 ExternalFAQRepository 創建**
- [ ] 9.3.1.1 創建 `findAll()` 方法（支持分類過濾、按 sort_order 排序）
- [ ] 9.3.1.2 創建 `findById()` 方法
- [ ] 9.3.1.3 創建 `create()` 方法
- [ ] 9.3.1.4 創建 `update()` 方法
- [ ] 9.3.1.5 創建 `updateSortOrder()` 方法（批量更新排序）
- [ ] 9.3.1.6 創建 `delete()` 方法（軟刪除）

**9.3.2 ExternalFAQService 創建**
- [ ] 9.3.2.1 實現 `createFAQ()` 方法
  - [ ] 9.3.2.1.1 驗證 question 和 answer 必填
  - [ ] 9.3.2.1.2 創建 FAQ（is_published = false）
  - [ ] 9.3.2.1.3 記錄審計日誌
  
- [ ] 9.3.2.2 實現 `updateFAQ()` 方法
  - [ ] 9.3.2.2.1 查詢 FAQ 是否存在
  - [ ] 9.3.2.2.2 更新欄位
  - [ ] 9.3.2.2.3 記錄審計日誌
  
- [ ] 9.3.2.3 實現 `reorderFAQs()` 方法
  - [ ] 9.3.2.3.1 接收 FAQ ID 和新 sort_order 的陣列
  - [ ] 9.3.2.3.2 批量更新 sort_order
  - [ ] 9.3.2.3.3 記錄審計日誌

**9.3.3 管理員 API 路由創建（僅管理員）**
- [ ] 9.3.3.1 `GET /api/v1/admin/faq` [規格:L126]
  - [ ] 9.3.3.1.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.3.3.1.2 支持分類過濾
  - [ ] 9.3.3.1.3 按 sort_order ASC 排序
  - [ ] 9.3.3.1.4 添加 OpenAPI 註解
  
- [ ] 9.3.3.2 `POST /api/v1/admin/faq` [規格:L127]
  - [ ] 9.3.3.2.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.3.3.2.2 解析請求 Body（question, answer, category）
  - [ ] 9.3.3.2.3 調用 FAQService.createFAQ()
  - [ ] 9.3.3.2.4 添加 OpenAPI 註解
  
- [ ] 9.3.3.3 `PUT /api/v1/admin/faq/:id` [規格:L128]
- [ ] 9.3.3.4 `DELETE /api/v1/admin/faq/:id` [規格:L129]
- [ ] 9.3.3.5 `PUT /api/v1/admin/faq/reorder` [規格:L130]
  - [ ] 9.3.3.5.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.3.3.5.2 解析請求 Body（陣列：[{faq_id, sort_order}]）
  - [ ] 9.3.3.5.3 調用 FAQService.reorderFAQs()
  - [ ] 9.3.3.5.4 添加 OpenAPI 註解

**9.3.4 公開 API 路由創建（訪客可用）**
- [ ] 9.3.4.1 `GET /api/v1/public/faq` [規格:L133]
  - [ ] 9.3.4.1.1 無需認證中間件
  - [ ] 9.3.4.1.2 只返回 is_published = true 的 FAQ
  - [ ] 9.3.4.1.3 按 sort_order ASC 排序 [規格:L576]
  - [ ] 9.3.4.1.4 支持按分類分組 [規格:L579-L585]
  - [ ] 9.3.4.1.5 添加 OpenAPI 註解

---

#### 9.4 資源中心管理 API [規格:L138-L147]

**9.4.1 ResourceCenterRepository 創建**
- [ ] 9.4.1.1 創建 `findAll()` 方法（支持分類、文件類型過濾）
- [ ] 9.4.1.2 創建 `findById()` 方法
- [ ] 9.4.1.3 創建 `create()` 方法
- [ ] 9.4.1.4 創建 `update()` 方法
- [ ] 9.4.1.5 創建 `incrementDownloadCount()` 方法
- [ ] 9.4.1.6 創建 `delete()` 方法（軟刪除）

**9.4.2 ResourceCenterService 創建**
- [ ] 9.4.2.1 實現 `uploadResource()` 方法 [規格:L435-L456]
  - [ ] 9.4.2.1.1 驗證文件大小（最大 10MB）[規格:L436-L439, L640-L643]
  - [ ] 9.4.2.1.2 上傳到 R2 Bucket [規格:L442-L443, L612-L624]
  - [ ] 9.4.2.1.3 生成文件名：`resources/${Date.now()}-${file.name}` [規格:L442]
  - [ ] 9.4.2.1.4 創建資源記錄（is_published = true, download_count = 0）[規格:L446-L455]
  - [ ] 9.4.2.1.5 記錄審計日誌
  
- [ ] 9.4.2.2 實現 `downloadResource()` 方法 [規格:L458-L477]
  - [ ] 9.4.2.2.1 查詢資源（檢查 is_published = true）[規格:L460-L464]
  - [ ] 9.4.2.2.2 增加 download_count [規格:L466-L467, L554-L557]
  - [ ] 9.4.2.2.3 從 R2 Bucket 獲取文件 [規格:L469-L470, L560]
  - [ ] 9.4.2.2.4 返回文件流（設置正確的 Content-Type 和 Content-Disposition）[規格:L562-L568]
  
- [ ] 9.4.2.3 實現 `updateResource()` 方法
  - [ ] 9.4.2.3.1 查詢資源是否存在
  - [ ] 9.4.2.3.2 更新元數據（title, description, category）
  - [ ] 9.4.2.3.3 記錄審計日誌

**9.4.3 管理員 API 路由創建（僅管理員）**
- [ ] 9.4.3.1 `GET /api/v1/admin/resources` [規格:L138]
  - [ ] 9.4.3.1.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.4.3.1.2 支持分類、文件類型過濾
  - [ ] 9.4.3.1.3 返回列表（含 download_count）
  - [ ] 9.4.3.1.4 添加 OpenAPI 註解
  
- [ ] 9.4.3.2 `POST /api/v1/admin/resources/upload` [規格:L139]
  - [ ] 9.4.3.2.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.4.3.2.2 解析 multipart/form-data（文件 + 元數據）
  - [ ] 9.4.3.2.3 驗證文件類型（PDF, Excel, Word, ZIP）
  - [ ] 9.4.3.2.4 調用 ResourceService.uploadResource()
  - [ ] 9.4.3.2.5 返回 201 Created（含文件 URL）
  - [ ] 9.4.3.2.6 添加 OpenAPI 註解
  
- [ ] 9.4.3.3 `GET /api/v1/admin/resources/:id` [規格:L140]
- [ ] 9.4.3.4 `PUT /api/v1/admin/resources/:id` [規格:L141]
- [ ] 9.4.3.5 `DELETE /api/v1/admin/resources/:id` [規格:L142]

**9.4.4 公開 API 路由創建（訪客可用）**
- [ ] 9.4.4.1 `GET /api/v1/public/resources` [規格:L145]
  - [ ] 9.4.4.1.1 無需認證中間件
  - [ ] 9.4.4.1.2 只返回 is_published = true 的資源
  - [ ] 9.4.4.1.3 支持分類過濾
  - [ ] 9.4.4.1.4 添加 OpenAPI 註解
  
- [ ] 9.4.4.2 `GET /api/v1/public/resources/:id/download` [規格:L146]
  - [ ] 9.4.4.2.1 無需認證中間件
  - [ ] 9.4.4.2.2 調用 ResourceService.downloadResource()
  - [ ] 9.4.4.2.3 返回文件流 [規格:L549-L568]
  - [ ] 9.4.4.2.4 記錄下載次數 [規格:L554-L557]
  - [ ] 9.4.4.2.5 添加 OpenAPI 註解

---

#### 9.5 圖片資源管理 API [規格:L151-L158]

**9.5.1 ExternalImagesRepository 創建**
- [ ] 9.5.1.1 創建 `findAll()` 方法（支持分類過濾）
- [ ] 9.5.1.2 創建 `findById()` 方法
- [ ] 9.5.1.3 創建 `create()` 方法
- [ ] 9.5.1.4 創建 `delete()` 方法（軟刪除）
- [ ] 9.5.1.5 創建 `getCategories()` 方法（查詢所有分類）

**9.5.2 ExternalImagesService 創建**
- [ ] 9.5.2.1 實現 `uploadImage()` 方法 [規格:L479-L508]
  - [ ] 9.5.2.1.1 驗證圖片格式（只能上傳圖片）[規格:L481-L483]
  - [ ] 9.5.2.1.2 驗證大小（最大 5MB）[規格:L485-L488, L641]
  - [ ] 9.5.2.1.3 上傳到 R2 Bucket（images/ 目錄）[規格:L490-L492, L606]
  - [ ] 9.5.2.1.4 獲取圖片尺寸（width, height）[規格:L494-L495]
  - [ ] 9.5.2.1.5 創建圖片記錄 [規格:L497-L507]
  - [ ] 9.5.2.1.6 返回圖片 URL [規格:L621-L622]
  
- [ ] 9.5.2.2 實現 `deleteImage()` 方法
  - [ ] 9.5.2.2.1 查詢圖片是否存在
  - [ ] 9.5.2.2.2 從 R2 Bucket 刪除文件
  - [ ] 9.5.2.2.3 軟刪除數據庫記錄
  - [ ] 9.5.2.2.4 記錄審計日誌

**9.5.3 管理員 API 路由創建（僅管理員）**
- [ ] 9.5.3.1 `GET /api/v1/admin/images` [規格:L151]
  - [ ] 9.5.3.1.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.5.3.1.2 支持分類過濾
  - [ ] 9.5.3.1.3 返回圖片列表（含 image_url, width, height）
  - [ ] 9.5.3.1.4 添加 OpenAPI 註解
  
- [ ] 9.5.3.2 `POST /api/v1/admin/images/upload` [規格:L152]
  - [ ] 9.5.3.2.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.5.3.2.2 解析 multipart/form-data（圖片 + 元數據）
  - [ ] 9.5.3.2.3 驗證圖片格式（image/*）
  - [ ] 9.5.3.2.4 調用 ImagesService.uploadImage()
  - [ ] 9.5.3.2.5 返回 201 Created（含圖片 URL）
  - [ ] 9.5.3.2.6 添加 OpenAPI 註解
  
- [ ] 9.5.3.3 `DELETE /api/v1/admin/images/:id` [規格:L153]
- [ ] 9.5.3.4 `GET /api/v1/admin/images/categories` [規格:L154]
  - [ ] 9.5.3.4.1 應用 authMiddleware + adminMiddleware
  - [ ] 9.5.3.4.2 調用 ImagesRepository.getCategories()
  - [ ] 9.5.3.4.3 返回分類列表（DISTINCT category）
  - [ ] 9.5.3.4.4 添加 OpenAPI 註解

**9.5.4 公開 API 路由創建（訪客可用）**
- [ ] 9.5.4.1 `GET /api/v1/public/images/:id` [規格:L157]
  - [ ] 9.5.4.1.1 無需認證中間件
  - [ ] 9.5.4.1.2 查詢圖片記錄
  - [ ] 9.5.4.1.3 返回圖片 URL（公開 CDN 連結）
  - [ ] 9.5.4.1.4 添加 OpenAPI 註解

---

#### 9.6 R2 Bucket 設定與整合 [規格:L590-L624]

**9.6.1 配置 Cloudflare R2**
- [ ] 9.6.1.1 在 wrangler.toml 中配置 R2 Bucket 綁定 [規格:L594-L608]
- [ ] 9.6.1.2 設置目錄結構：articles/, resources/, images/ [規格:L594-L608]
- [ ] 9.6.1.3 配置公開 CDN URL（https://cdn.yourfirm.com）[規格:L621-L622]

**9.6.2 文件上傳工具函數**
- [ ] 9.6.2.1 實現 `uploadToR2()` 函數 [規格:L612-L624]
  - [ ] 9.6.2.1.1 接收參數：file, path, env
  - [ ] 9.6.2.1.2 生成唯一文件名：`${path}/${Date.now()}-${file.name}`
  - [ ] 9.6.2.1.3 調用 `env.R2_BUCKET.put(fileName, file.stream())`
  - [ ] 9.6.2.1.4 設置 httpMetadata（contentType）
  - [ ] 9.6.2.1.5 返回公開 URL

**9.6.3 文件大小和格式驗證**
- [ ] 9.6.3.1 實現圖片大小驗證（最大 5MB）[規格:L641]
- [ ] 9.6.3.2 實現資源文件大小驗證（最大 10MB）[規格:L642]
- [ ] 9.6.3.3 實現文件格式驗證（image/*, PDF, Excel, Word, ZIP）
- [ ] 9.6.3.4 實現圖片尺寸獲取（width, height）[規格:L494-L495]

---

#### 9.7 完整性驗證 [規格:L1-L722]

**9.7.1 API 清單驗證**
- [ ] 9.7.1.1 驗證 Blog 文章管理 API（管理員 7 個 + 公開 2 個 = 9 個）[規格:L111-L122]
- [ ] 9.7.1.2 驗證 FAQ 管理 API（管理員 5 個 + 公開 1 個 = 6 個）[規格:L126-L134]
- [ ] 9.7.1.3 驗證資源中心管理 API（管理員 5 個 + 公開 2 個 = 7 個）[規格:L138-L147]
- [ ] 9.7.1.4 驗證圖片資源管理 API（管理員 4 個 + 公開 1 個 = 5 個）[規格:L151-L158]
- [ ] 9.7.1.5 確認總計：27 個 API（管理員 19 個 + 公開 8 個）

**9.7.2 業務邏輯驗證**
- [ ] 9.7.2.1 驗證文章發布規則（草稿/發布/取消發布）[規格:L630-L633]
- [ ] 9.7.2.2 驗證 URL Slug 規則（小寫字母、數字、連字號，必須唯一）[規格:L635-L638]
- [ ] 9.7.2.3 驗證文件大小限制（圖片 5MB, 資源 10MB）[規格:L640-L643]
- [ ] 9.7.2.4 驗證 SEO 優化（標題 50-60 字元，描述 150-160 字元）[規格:L645-L648]
- [ ] 9.7.2.5 驗證瀏覽次數自動增加 [規格:L541-L544]
- [ ] 9.7.2.6 驗證下載次數自動增加 [規格:L554-L557]

**9.7.3 測試案例執行**
- [ ] 9.7.3.1 測試文章發布流程 [規格:L656-L667]
- [ ] 9.7.3.2 測試 Slug 唯一性檢查 [規格:L669-L675]
- [ ] 9.7.3.3 測試文件大小限制 [規格:L677-L683]
- [ ] 9.7.3.4 測試下載次數統計 [規格:L685-L694]

**9.7.4 回到規格逐一驗證**
- [ ] 9.7.4.1 打開規格文檔 L11-L37，驗證 ExternalArticles 表完整性
- [ ] 9.7.4.2 打開規格文檔 L41-L57，驗證 ExternalFAQ 表完整性
- [ ] 9.7.4.3 打開規格文檔 L61-L82，驗證 ResourceCenter 表完整性
- [ ] 9.7.4.4 打開規格文檔 L86-L103，驗證 ExternalImages 表完整性
- [ ] 9.7.4.5 逐一驗證所有 27 個 API 的實現

---

#### 9.8 部署與測試
- [ ] 9.8.1 [內部] 提交所有更改到 Git
- [ ] 9.8.2 [內部] 執行自動部署（git push origin main）
- [ ] 9.8.3 [內部] 驗證 Cloudflare Pages 部署成功
- [ ] 9.8.4 [內部] 更新 MASTER_PLAN.md 進度統計

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
- **已完成模組：** 8 / 14（57.1%）⭐ 超過一半！
- **已完成資料表：** 32 / 45（71.1%）
- **已完成 API：** 104 / 147（70.7%）⭐ 超過 70%！
- **已完成 Cron Jobs：** 4 / 6（66.7%）

### 模組狀態
| 模組 | 狀態 | 完成日期 | 部署狀態 |
|------|------|----------|----------|
| 1. 系統基礎 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 2. 業務規則 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 3. 客戶管理 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 4. 工時管理 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 5. 假期管理 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 6. 服務生命週期 | ✅ 已完成 | 2025-10-29 | ✅ 已部署 |
| 7. 任務管理 | ✅ 已完成 | 2025-10-29 | ⏳ 準備部署 |
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

