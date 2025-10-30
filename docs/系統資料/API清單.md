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

**⚠️ 小型事務所彈性設計：** 員工有較多權限以提升工作效率

```
GET    /api/v1/clients             查詢客戶列表（所有人）
POST   /api/v1/clients             新增客戶（所有人）⭐
GET    /api/v1/clients/:id         查詢客戶詳情（所有人）
PUT    /api/v1/clients/:id         更新客戶（所有人）⭐
DELETE /api/v1/clients/:id         刪除客戶（所有人）⭐
GET    /api/v1/clients/tags        獲取所有標籤（所有人）
POST   /api/v1/clients/tags        新增標籤（所有人）⭐
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
GET    /api/v1/compensatory-leave  查詢補休餘額
POST   /api/v1/compensatory-leave/use 使用補休
POST   /api/v1/compensatory-leave/convert-to-pay 轉換為加班費
GET    /api/v1/compensatory-leave/usage-history 查詢補休使用歷史
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

**⚠️ 小型事務所彈性設計：** 員工可協助建立任務模板和設定客戶服務

```
GET    /api/v1/task-templates                      查詢任務模板（所有人）
POST   /api/v1/task-templates                      新增任務模板（所有人）⭐
GET    /api/v1/tasks                               查詢任務列表
GET    /api/v1/tasks/:id                           查詢任務詳情
POST   /api/v1/tasks/:id/stages/:stageId/start     開始階段
POST   /api/v1/tasks/:id/stages/:stageId/complete  完成階段
GET    /api/v1/clients/:id/available-templates     查詢可用模板（通用+專屬）⭐
POST   /api/v1/client-services                     設定客戶服務（所有人）⭐
PUT    /api/v1/client-services/:id                 更新客戶服務（所有人）⭐
POST   /api/v1/client-services/:id/suspend         暫停服務（所有人）⭐
POST   /api/v1/client-services/:id/resume          恢復服務（所有人）⭐
POST   /api/v1/client-services/:id/cancel          取消服務（僅管理員）
GET    /api/v1/client-services/:id/history         查詢服務變更歷史（所有人）⭐
```

---

## 🔧 系統設定（管理員專屬）

### 業務規則

**⚠️ 小型事務所彈性設計：** 員工可協助維護業務規則數據

```
# 國定假日
GET    /api/v1/holidays                      所有人
POST   /api/v1/holidays                      所有人⭐
PUT    /api/v1/holidays/:id                  所有人⭐
DELETE /api/v1/holidays/:id                  所有人⭐
POST   /api/v1/holidays/import               僅管理員（批量導入）

# 假別類型
GET    /api/v1/leave-types                   所有人
POST   /api/v1/leave-types                   所有人⭐
PUT    /api/v1/leave-types/:id               所有人⭐

# 加班費率（唯讀，勞基法規定）
GET    /api/v1/overtime-rates                所有人（僅查看）

# 特休規則（唯讀，勞基法規定）
GET    /api/v1/annual-leave-rules            所有人（僅查看）

# 週期類型
GET    /api/v1/frequency-types               所有人
POST   /api/v1/frequency-types               所有人⭐
PUT    /api/v1/frequency-types/:id           所有人⭐
```

### 服務項目

**⚠️ 小型事務所彈性設計：** 員工可協助維護服務項目

```
GET    /api/v1/services                      所有人
POST   /api/v1/services                      所有人⭐
PUT    /api/v1/services/:id                  所有人⭐
DELETE /api/v1/services/:id                  所有人⭐
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

## 📊 儀表板
```
GET /api/v1/dashboard                    獲取儀表板數據（根據角色返回不同內容）
GET /api/v1/dashboard/settings           獲取用戶儀表板設定
PUT /api/v1/dashboard/settings           更新用戶儀表板佈局
GET /api/v1/dashboard/widgets            獲取可用小工具列表
```

---

## 📖 知識管理

**⚠️ 小型事務所彈性設計：** 員工可協助建立和編輯SOP與知識庫

```
GET  /api/v1/sop                  查詢SOP列表（所有人）
POST /api/v1/sop                  新增SOP（所有人）⭐
GET  /api/v1/sop/:id              查詢SOP詳情（所有人）
PUT  /api/v1/sop/:id              更新SOP（所有人）⭐
DELETE /api/v1/sop/:id            刪除SOP（僅管理員）
POST /api/v1/sop/:id/link-client  關聯客戶SOP（所有人）⭐
GET  /api/v1/knowledge            查詢知識庫（所有人）
POST /api/v1/knowledge            新增文章（所有人）⭐
GET  /api/v1/knowledge/:id        查詢文章詳情（所有人）
PUT  /api/v1/knowledge/:id        更新文章（所有人）⭐
DELETE /api/v1/knowledge/:id      刪除文章（僅管理員）
```

---

## 🌐 外部內容管理（管理員專屬）
```
# Blog 文章
GET    /api/v1/admin/articles              查詢文章列表
POST   /api/v1/admin/articles              新增文章
GET    /api/v1/admin/articles/:id          查詢文章詳情
PUT    /api/v1/admin/articles/:id          更新文章
DELETE /api/v1/admin/articles/:id          刪除文章
POST   /api/v1/admin/articles/:id/publish  發布文章
POST   /api/v1/admin/articles/:id/unpublish 取消發布
GET    /api/v1/public/articles             查詢已發布文章（公開）
GET    /api/v1/public/articles/:slug       查詢單篇文章（公開）

# FAQ 管理
GET    /api/v1/admin/faq                   查詢FAQ列表
POST   /api/v1/admin/faq                   新增FAQ
PUT    /api/v1/admin/faq/:id               更新FAQ
DELETE /api/v1/admin/faq/:id               刪除FAQ
PUT    /api/v1/admin/faq/reorder           調整排序
GET    /api/v1/public/faq                  查詢已發布FAQ（公開）

# 資源中心
GET    /api/v1/admin/resources             查詢資源列表
POST   /api/v1/admin/resources/upload      上傳資源
GET    /api/v1/admin/resources/:id         查詢資源詳情
PUT    /api/v1/admin/resources/:id         更新資源資訊
DELETE /api/v1/admin/resources/:id         刪除資源
GET    /api/v1/public/resources            查詢已發布資源（公開）
GET    /api/v1/public/resources/:id/download 下載資源（公開）

# 圖片資源
GET    /api/v1/admin/images                查詢圖片列表
POST   /api/v1/admin/images/upload         上傳圖片
DELETE /api/v1/admin/images/:id            刪除圖片
GET    /api/v1/admin/images/categories     查詢分類
GET    /api/v1/public/images/:id           獲取圖片URL（公開）
```

---

## 💰 薪資管理（管理員專屬）
```
GET    /api/v1/salary/item-types           查詢薪資項目類型
POST   /api/v1/salary/item-types           新增薪資項目類型
PUT    /api/v1/salary/item-types/:id       更新薪資項目類型
DELETE /api/v1/salary/item-types/:id       刪除薪資項目類型
GET    /api/v1/salary/employee-items       查詢員工薪資項目
POST   /api/v1/salary/employee-items       新增員工薪資項目
PUT    /api/v1/salary/employee-items/:id   更新員工薪資項目（含月度調整）
DELETE /api/v1/salary/employee-items/:id   刪除員工薪資項目
GET    /api/v1/salary/payroll              查詢月度薪資表
POST   /api/v1/salary/payroll/calculate    計算月度薪資
POST   /api/v1/salary/overtime-records     記錄加班記錄
GET    /api/v1/salary/overtime-records     查詢加班記錄
GET    /api/v1/salary/year-end-bonus       查詢年終獎金記錄
```

---

## 📊 管理成本（管理員專屬）
```
GET    /api/v1/overhead/cost-types           查詢成本項目類型
POST   /api/v1/overhead/cost-types           新增成本項目類型
PUT    /api/v1/overhead/cost-types/:id       更新成本項目類型
DELETE /api/v1/overhead/cost-types/:id       刪除成本項目類型
GET    /api/v1/overhead/monthly-costs        查詢月度成本
POST   /api/v1/overhead/monthly-costs        記錄月度成本
```

---

## 💵 收據收款
```
GET    /api/v1/receipts                      查詢收據列表
POST   /api/v1/receipts                      開立收據
GET    /api/v1/receipts/:id                  查詢收據詳情
PUT    /api/v1/receipts/:id                  更新收據
DELETE /api/v1/receipts/:id                  作廢收據
GET    /api/v1/receipts/check-number         檢查收據號碼是否可用 ⭐
GET    /api/v1/receipts/:id/pdf              生成收據PDF
GET    /api/v1/receipts/:id/preview          預覽收據（HTML）
GET    /api/v1/receipts/:id/payments         查詢收據的收款記錄
POST   /api/v1/receipts/:id/payments         記錄收款
DELETE /api/v1/payments/:id                  刪除收款記錄
GET    /api/v1/receipts/stats                收據統計
GET    /api/v1/receipts/ar-aging             應收帳款帳齡分析
GET    /api/v1/reports/revenue               營收報表
```

---

## 📎 附件系統
```
POST   /api/v1/attachments/upload            上傳附件
GET    /api/v1/attachments                   查詢附件列表
GET    /api/v1/attachments/:id/download      下載附件
DELETE /api/v1/attachments/:id               刪除附件
```

---

## 📈 報表分析
```
GET /api/v1/reports/client-cost-analysis     客戶成本分析
GET /api/v1/reports/employee-hours-analysis  員工工時分析
GET /api/v1/reports/salary-summary           薪資報表
GET /api/v1/reports/receivables-summary      收款報表
GET /api/v1/reports/revenue-trend            營收趨勢
GET /api/v1/reports/cost-breakdown           成本結構分析
```

---

**總計：約 171 個 API 端點**

---

## 📚 API 定義位置

| API 類別 | API 數量 | 定義位置 |
|---------|---------|---------|
| 認證、員工管理、個人資料、系統設定 | 13個 | [系統基礎-完整規格](../開發指南/系統基礎-完整規格.md) |
| 客戶管理 | 9個 | [客戶管理-完整規格](../開發指南/客戶管理-完整規格.md) |
| 工時管理、補休管理 | 9個 | [工時管理-完整規格](../開發指南/工時管理-完整規格.md) |
| 假期管理、生活事件、Cron | 8個 | [假期管理-完整規格](../開發指南/假期管理-完整規格.md) |
| 任務管理、客戶服務、服務生命週期 | 13個 | [任務管理-完整規格](../開發指南/任務管理-完整規格.md) |
| 業務規則（6種）| 12個 | [業務規則-完整規格](../開發指南/業務規則-完整規格.md) |
| 儀表板、小工具 | 4個 | [儀表板-完整規格](../開發指南/儀表板-完整規格.md) |
| SOP、知識庫 | 11個 | [知識管理-完整規格](../開發指南/知識管理-完整規格.md) |
| 外部文章、FAQ、資源、圖片 | 27個 | [外部內容管理-完整規格](../開發指南/外部內容管理-完整規格.md) |
| 薪資管理 | 11個 | [薪資管理-完整規格](../開發指南/薪資管理-完整規格.md) |
| 管理成本 | 6個 | [管理成本-完整規格](../開發指南/管理成本-完整規格.md) |
| 收據收款、應收帳款 | 13個 | [收據收款-完整規格](../開發指南/收據收款-完整規格.md) |
| 附件系統 | 4個 | [附件系統-完整規格](../開發指南/附件系統-完整規格.md) |
| 報表分析 | 6個 | [報表分析-完整規格](../開發指南/報表分析-完整規格.md) |
| 服務生命週期管理 | 4個 | [服務生命週期管理](../開發指南/服務生命週期管理.md) |

**所有 API 的詳細規格（請求/響應/驗證/邏輯）都在對應的開發指南中。**

