# API 清單

**系統所有 API 端點一覽**

---

## 🔐 認證
```
POST /api/v1/auth/login           登入
POST /api/v1/auth/logout          登出
GET  /api/v1/auth/me              驗證會話
POST /api/v1/auth/change-password 修改密碼
```

---

## 🏢 客戶管理
```
GET    /api/v1/clients             查詢客戶列表（所有人）
POST   /api/v1/clients             新增客戶（所有人，小型事務所彈性設計）⭐
GET    /api/v1/clients/:id         查詢客戶詳情（所有人）
PUT    /api/v1/clients/:id         更新客戶（所有人，小型事務所彈性設計）⭐
DELETE /api/v1/clients/:id         刪除客戶（所有人，小型事務所彈性設計）⭐
GET    /api/v1/clients/tags        獲取所有標籤（所有人）
POST   /api/v1/clients/tags        新增標籤（所有人，小型事務所彈性設計）⭐
POST   /api/v1/clients/batch-update  批量更新（僅管理員）
```

---

## ⏱️ 工時管理
```
GET    /api/v1/timelogs            查詢工時記錄
POST   /api/v1/timelogs            新增工時
PUT    /api/v1/timelogs/:id        更新工時
DELETE /api/v1/timelogs/:id        刪除工時
POST   /api/v1/weighted-hours/calc 計算加權工時
```

---

## 🏖️ 假期管理
```
POST /api/v1/leave/applications        新增假期申請
GET  /api/v1/leave/applications        查詢假期記錄
GET  /api/v1/leave/balance             查詢假期餘額
GET  /api/v1/leave/available-types     查詢可申請假別（依性別過濾）⭐
POST /api/v1/leave/life-events         登記生活事件
GET  /api/v1/leave/life-events         查詢生活事件
POST /api/v1/admin/cron/execute        手動觸發Cron Job（管理員）⭐
GET  /api/v1/admin/cron/history        查詢Cron執行歷史（管理員）⭐
```

---

## 📋 任務管理
```
GET    /api/v1/task-templates                      查詢任務模板（所有人）
POST   /api/v1/task-templates                      新增任務模板（所有人）
GET    /api/v1/tasks                               查詢任務列表
GET    /api/v1/tasks/:id                           查詢任務詳情
POST   /api/v1/tasks/:id/stages/:stageId/start     開始階段
POST   /api/v1/tasks/:id/stages/:stageId/complete  完成階段
GET    /api/v1/clients/:id/available-templates     查詢可用模板（通用+專屬）⭐
POST   /api/v1/client-services                     設定客戶服務
PUT    /api/v1/client-services/:id                 更新客戶服務
```

---

## 🔧 系統設定（管理員專屬）

### 業務規則
```
# 國定假日
GET    /api/v1/holidays                      所有人（小型事務所彈性設計）⭐
POST   /api/v1/holidays                      所有人（小型事務所彈性設計）⭐
PUT    /api/v1/holidays/:id                  所有人（小型事務所彈性設計）⭐
DELETE /api/v1/holidays/:id                  所有人（小型事務所彈性設計）⭐
POST   /api/v1/holidays/import               僅管理員（批量導入）

# 假別類型
GET    /api/v1/leave-types                   所有人（小型事務所彈性設計）⭐
POST   /api/v1/leave-types                   所有人（小型事務所彈性設計）⭐
PUT    /api/v1/leave-types/:id               所有人（小型事務所彈性設計）⭐

# 加班費率（唯讀，勞基法規定）
GET    /api/v1/overtime-rates                所有人（僅查看）

# 特休規則（唯讀，勞基法規定）
GET    /api/v1/annual-leave-rules            所有人（僅查看）

# 週期類型
GET    /api/v1/frequency-types               所有人
POST   /api/v1/frequency-types               所有人（小型事務所彈性設計）⭐
PUT    /api/v1/frequency-types/:id           所有人（小型事務所彈性設計）⭐
```

### 服務項目
```
GET    /api/v1/services                      所有人
POST   /api/v1/services                      所有人（小型事務所彈性設計）⭐
PUT    /api/v1/services/:id                  所有人（小型事務所彈性設計）⭐
DELETE /api/v1/services/:id                  所有人（小型事務所彈性設計）⭐
```

### 員工管理
```
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/reset-password
```

---

## 📊 報表與列印
```
GET /api/v1/reports/dashboard          儀表板數據
GET /api/v1/reports/timelog-summary    工時統計
GET /api/v1/reports/leave-summary      假期統計
GET /api/v1/receipts/:id/pdf           生成收據PDF ⭐
GET /api/v1/receipts/:id/preview       預覽收據（HTML）⭐
```

---

## 📖 知識管理
```
GET  /api/v1/sop                  查詢SOP列表
POST /api/v1/sop                  新增SOP（管理員）
PUT  /api/v1/sop/:id              更新SOP（管理員）
GET  /api/v1/knowledge            查詢知識庫
POST /api/v1/knowledge            新增文章（管理員）
```

---

**總計：約 147 個 API 端點**

---

## 📚 API 定義位置

| API 類別 | 定義位置 |
|---------|---------|
| 認證、員工管理、個人資料 | [系統基礎-完整規格](../開發指南/系統基礎-完整規格.md) |
| 客戶管理 | [客戶管理-完整規格](../開發指南/客戶管理-完整規格.md) |
| 工時管理、加權工時 | [工時管理-完整規格](../開發指南/工時管理-完整規格.md) |
| 假期管理、生活事件 | [假期管理-完整規格](../開發指南/假期管理-完整規格.md) |
| 任務管理、客戶服務 | [任務管理-完整規格](../開發指南/任務管理-完整規格.md) |
| 業務規則（6種）| [業務規則-完整規格](../開發指南/業務規則-完整規格.md) |
| SOP、知識庫 | [知識管理-完整規格](../開發指南/知識管理-完整規格.md) |
| 外部文章、FAQ、資源 | [外部內容管理-完整規格](../開發指南/外部內容管理-完整規格.md) |

**所有 API 的詳細規格（請求/響應/驗證/邏輯）都在對應的開發指南中。**

