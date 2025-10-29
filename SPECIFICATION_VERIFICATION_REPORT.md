# 規格一致性驗證報告
**執行日期：** 2025-10-29  
**驗證範圍：** 模組 9, 10, 11

---

## 驗證方法

1. ✅ 逐項對照規格文檔
2. ✅ 檢查資料表結構
3. ✅ 檢查 API 端點
4. ✅ 檢查業務邏輯
5. ✅ 檢查 Repository/Service/Route 實現

---

## 模組 9：外部內容管理

### 📋 規格來源
- **文檔：** `docs/開發指南/外部內容管理-完整規格.md`
- **資料表數：** 4 個
- **API 數：** 27 個（管理員 19 + 公開 8）

### 驗證項目

#### 1. 資料表結構驗證

**ExternalArticles (L11-L37)**
- [ ] 檢查 `schema.sql` 是否包含完整表定義
- [ ] 驗證所有欄位：article_id, title, slug, summary, content, featured_image, category, tags, is_published, published_at, view_count, seo_*, created_by, created_at, updated_at, is_deleted
- [ ] 驗證索引：idx_external_slug (UNIQUE), idx_external_category, idx_external_published
- [ ] 驗證外鍵：created_by REFERENCES Users(user_id)

**ExternalFAQ (L41-L57)**
- [ ] 檢查所有欄位
- [ ] 驗證索引：idx_faq_category, idx_faq_published, idx_faq_order

**ResourceCenter (L61-L82)**
- [ ] 檢查所有欄位
- [ ] 驗證索引和外鍵

**ExternalImages (L86-L103)**
- [ ] 檢查所有欄位
- [ ] 驗證索引

#### 2. Repository 層驗證

**ExternalArticlesRepository**
- [ ] findAll() - 支持 category, is_published 過濾
- [ ] findById()
- [ ] findBySlug() - 唯一性檢查
- [ ] create()
- [ ] update()
- [ ] publish() - 設置 is_published=1, published_at
- [ ] unpublish() - 設置 is_published=0
- [ ] incrementViewCount()
- [ ] delete() - 軟刪除

**ExternalFAQRepository**
- [ ] findAll() - 支持 category, 按 sort_order 排序
- [ ] findById()
- [ ] create()
- [ ] update()
- [ ] updateSortOrder() - 批量更新
- [ ] delete()

**ResourceCenterRepository**
- [ ] findAll() - 支持 category, file_type 過濾
- [ ] findById()
- [ ] create()
- [ ] update()
- [ ] incrementDownloadCount()
- [ ] delete()

**ExternalImagesRepository**
- [ ] findAll() - 支持 category 過濾
- [ ] findById()
- [ ] create()
- [ ] delete()
- [ ] getCategories() - DISTINCT category

#### 3. Service 層驗證

**ExternalContentService**

**Blog 文章管理 (L401-L456)**
- [ ] createArticle() - 驗證 title, slug 必填 (L403-L405)
- [ ] createArticle() - 檢查 slug 唯一性 (L407-L411)
- [ ] createArticle() - 設置 is_published=false, view_count=0 (L414-L419)
- [ ] publishArticle() - 設置 is_published=true, published_at (L422-L433)
- [ ] unpublishArticle()
- [ ] getArticleBySlug() - 自動增加 view_count (L541-L544)
- [ ] validateSlug() - 只包含小寫字母、數字、連字號 (L635-L638)

**FAQ 管理**
- [ ] createFAQ() - 驗證 question, answer 必填
- [ ] updateFAQ()
- [ ] reorderFAQs() - 批量更新 sort_order
- [ ] deleteFAQ()

**資源中心管理 (L435-L477)**
- [ ] uploadResource() - 驗證文件大小（最大 10MB）(L436-L439, L640-L643)
- [ ] uploadResource() - 上傳到 R2 (L442-L443, L612-L624)
- [ ] uploadResource() - 生成文件名：`resources/${Date.now()}-${file.name}`
- [ ] downloadResource() - 增加 download_count (L554-L557)
- [ ] downloadResource() - 從 R2 獲取文件 (L560)
- [ ] updateResource()
- [ ] deleteResource()

**圖片管理 (L479-L508)**
- [ ] uploadImage() - 驗證圖片格式 (L481-L483)
- [ ] uploadImage() - 驗證大小（最大 5MB）(L485-L488, L641)
- [ ] uploadImage() - 上傳到 R2 images/ 目錄 (L490-L492, L606)
- [ ] uploadImage() - 獲取圖片尺寸 width, height (L494-L495)
- [ ] deleteImage()

#### 4. API 路由驗證

**Blog 文章管理 API (L111-L122)**
- [ ] GET /api/v1/admin/articles (L111)
- [ ] POST /api/v1/admin/articles (L112)
- [ ] GET /api/v1/admin/articles/:id (L113)
- [ ] PUT /api/v1/admin/articles/:id (L114)
- [ ] DELETE /api/v1/admin/articles/:id (L115)
- [ ] POST /api/v1/admin/articles/:id/publish (L116)
- [ ] POST /api/v1/admin/articles/:id/unpublish (L117)
- [ ] GET /api/v1/public/articles (L120) - 只返回 is_published=true
- [ ] GET /api/v1/public/articles/:slug (L121) - 自動增加 view_count

**FAQ 管理 API (L126-L134)**
- [ ] GET /api/v1/admin/faq (L126)
- [ ] POST /api/v1/admin/faq (L127)
- [ ] PUT /api/v1/admin/faq/:id (L128)
- [ ] DELETE /api/v1/admin/faq/:id (L129)
- [ ] PUT /api/v1/admin/faq/reorder (L130)
- [ ] GET /api/v1/public/faq (L133) - 按 sort_order ASC 排序

**資源中心管理 API (L138-L147)**
- [ ] GET /api/v1/admin/resources (L138)
- [ ] POST /api/v1/admin/resources/upload (L139) - multipart/form-data
- [ ] GET /api/v1/admin/resources/:id (L140)
- [ ] PUT /api/v1/admin/resources/:id (L141)
- [ ] DELETE /api/v1/admin/resources/:id (L142)
- [ ] GET /api/v1/public/resources (L145)
- [ ] GET /api/v1/public/resources/:id/download (L146)

**圖片管理 API (L151-L158)**
- [ ] GET /api/v1/admin/images (L151)
- [ ] POST /api/v1/admin/images/upload (L152) - multipart/form-data
- [ ] DELETE /api/v1/admin/images/:id (L153)
- [ ] GET /api/v1/admin/images/categories (L154)
- [ ] GET /api/v1/public/images/:id (L157)

#### 5. R2 整合驗證 (L586-L628)

- [ ] R2 Bucket 配置在 wrangler.toml
- [ ] CDN_BASE_URL 環境變數設置
- [ ] uploadToR2() 函數實現
- [ ] 文件命名規則：articles/, resources/, images/ 目錄

---

## 模組 10：薪資管理

### 📋 規格來源
- **文檔：** `docs/開發指南/薪資管理-完整規格.md`
- **資料表數：** 6 個（Users 擴充 + 5 個新表）
- **API 數：** 16 個

### 驗證項目

#### 1. 資料表結構驗證

**Users 表擴充**
- [ ] base_salary REAL
- [ ] join_date TEXT
- [ ] comp_hours_current_month REAL DEFAULT 0

**SalaryItemTypes**
- [ ] is_regular_payment BOOLEAN - 區分經常性給與

**EmployeeSalaryItems**
- [ ] 完整欄位驗證

**MonthlyPayroll**
- [ ] 計算欄位：hourly_base, overtime_pay, full_attendance_bonus 等

**OvertimeRecords**
- [ ] 加班記錄欄位

**YearEndBonus**
- [ ] attribution_year, payment_year 區分

#### 2. Service 層驗證

**SalaryService - 時薪計算邏輯**
- [ ] calculateHourlyBase() - 只計算經常性給與
- [ ] calculateOvertimePay() - 加班費計算
- [ ] checkFullAttendance() - 補休不影響全勤
- [ ] calculateMonthlyPayroll() - 完整月薪計算
- [ ] calculateFullHourlyCostRate() - 含管理成本

#### 3. API 路由驗證（16個）

**薪資項目類型 (4個)**
- [ ] GET /api/v1/admin/salary-item-types
- [ ] POST /api/v1/admin/salary-item-types
- [ ] PUT /api/v1/admin/salary-item-types/:id
- [ ] DELETE /api/v1/admin/salary-item-types/:id

**年終獎金管理 (5個)**
- [ ] GET /api/v1/admin/year-end-bonus
- [ ] GET /api/v1/admin/year-end-bonus/summary
- [ ] POST /api/v1/admin/year-end-bonus
- [ ] PUT /api/v1/admin/year-end-bonus/:id
- [ ] DELETE /api/v1/admin/year-end-bonus/:id

**員工薪資設定 (3個)**
- [ ] GET /api/v1/admin/employees/:userId/salary
- [ ] POST /api/v1/admin/employees/:userId/salary
- [ ] PUT /api/v1/admin/employees/:userId/salary

**薪資計算查詢 (4個)**
- [ ] POST /api/v1/admin/payroll/calculate
- [ ] GET /api/v1/admin/payroll
- [ ] GET /api/v1/admin/payroll/:id
- [ ] GET /api/v1/admin/employees/:userId/hourly-cost-rate

---

## 模組 11：管理成本

### 📋 規格來源
- **文檔：** `docs/開發指南/管理成本-完整規格.md`
- **資料表數：** 2 個
- **API 數：** 10 個

### 驗證項目

#### 1. 資料表結構驗證

**OverheadCostTypes (L29-L63)**
- [ ] cost_code TEXT UNIQUE NOT NULL
- [ ] allocation_method CHECK (per_employee, per_hour, per_revenue)
- [ ] category CHECK (fixed, variable)
- [ ] 索引驗證

**MonthlyOverheadCosts (L65-L96)**
- [ ] UNIQUE(cost_type_id, year, month) - 每月每類型一筆
- [ ] 外鍵驗證

#### 2. Service 層驗證

**OverheadCostService - 三種分攤計算**
- [ ] calculatePerEmployeeOverhead() - 按人頭分攤 (L102-L124)
- [ ] calculatePerHourOverhead() - 按工時分攤 (L126-L148)
- [ ] calculatePerRevenueOverhead() - 按營收分攤 (L150-L175)
- [ ] calculateFullHourlyCostRate() - 整合薪資+管理成本 (L177-L276)

#### 3. API 路由驗證（10個）

**成本項目類型 (4個)**
- [ ] GET /api/v1/admin/overhead-types (L286)
- [ ] POST /api/v1/admin/overhead-types (L287)
- [ ] PUT /api/v1/admin/overhead-types/:id (L288)
- [ ] DELETE /api/v1/admin/overhead-types/:id (L289)

**月度成本記錄 (4個)**
- [ ] GET /api/v1/admin/overhead-costs (L319)
- [ ] POST /api/v1/admin/overhead-costs (L320)
- [ ] PUT /api/v1/admin/overhead-costs/:id (L321)
- [ ] DELETE /api/v1/admin/overhead-costs/:id (L322)

**成本分析 (2個)**
- [ ] GET /api/v1/admin/overhead-analysis (L353)
- [ ] GET /api/v1/admin/overhead-summary (L354)

---

## 驗證結果

### 待檢查項目統計
- **模組 9：** ___ / ___ 項通過
- **模組 10：** ___ / ___ 項通過
- **模組 11：** ___ / ___ 項通過

### 發現的問題

（執行驗證後填寫）

---

## 下一步行動

1. [ ] 修正發現的所有不一致問題
2. [ ] 更新 MASTER_PLAN.md 標記
3. [ ] 繼續模組 12-14 實作（嚴格遵守流程）

