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
GET    /api/v1/clients             查詢客戶列表
POST   /api/v1/clients             新增客戶（管理員）
GET    /api/v1/clients/:id         查詢客戶詳情
PUT    /api/v1/clients/:id         更新客戶（管理員）
DELETE /api/v1/clients/:id         刪除客戶（管理員）
GET    /api/v1/clients/tags        獲取所有標籤
POST   /api/v1/clients/tags        新增標籤（管理員）
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
POST /api/v1/leave/applications    新增假期申請
GET  /api/v1/leave/applications    查詢假期記錄
GET  /api/v1/leave/balance         查詢假期餘額
POST /api/v1/leave/life-events     登記生活事件
GET  /api/v1/leave/life-events     查詢生活事件
```

---

## 📋 任務管理
```
GET    /api/v1/task-templates      查詢任務模板（管理員）
POST   /api/v1/task-templates      新增任務模板（管理員）
GET    /api/v1/tasks               查詢任務列表
GET    /api/v1/tasks/:id           查詢任務詳情
POST   /api/v1/tasks/:id/stages/:stageId/start     開始階段
POST   /api/v1/tasks/:id/stages/:stageId/complete  完成階段
```

---

## 🔧 系統設定（管理員專屬）

### 業務規則
```
# 國定假日
GET    /api/v1/admin/holidays
POST   /api/v1/admin/holidays
PUT    /api/v1/admin/holidays/:id
DELETE /api/v1/admin/holidays/:id

# 假別類型
GET    /api/v1/admin/leave-types
POST   /api/v1/admin/leave-types
PUT    /api/v1/admin/leave-types/:id

# 加班費率
GET    /api/v1/admin/overtime-rates
POST   /api/v1/admin/overtime-rates
PUT    /api/v1/admin/overtime-rates/:id

# 特休規則
GET    /api/v1/admin/annual-leave-rules
POST   /api/v1/admin/annual-leave-rules
PUT    /api/v1/admin/annual-leave-rules/:id
DELETE /api/v1/admin/annual-leave-rules/:id

# 週期類型
GET    /api/v1/admin/frequency-types
POST   /api/v1/admin/frequency-types
PUT    /api/v1/admin/frequency-types/:id
```

### 服務項目
```
GET    /api/v1/admin/services
POST   /api/v1/admin/services
PUT    /api/v1/admin/services/:id
DELETE /api/v1/admin/services/:id
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

## 📊 報表
```
GET /api/v1/reports/dashboard      儀表板數據
GET /api/v1/reports/timelog-summary 工時統計
GET /api/v1/reports/leave-summary   假期統計
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

**總計：約 64 個 API 端點**

**詳細 API 規格請見各開發指南中的完整規格文檔。**

