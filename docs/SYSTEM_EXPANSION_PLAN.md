# 🚀 霍爾果斯 CPA 系統擴展完整實施計畫

**版本**: 1.0  
**創建日期**: 2025-10-25  
**最後更新**: 2025-10-25  
**預計完成時間**: 4-6 週

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [系統架構分析](#系統架構分析)
3. [實施階段規劃](#實施階段規劃)
4. [進度追蹤](#進度追蹤)
5. [如何接續工作](#如何接續工作)
6. [風險管理](#風險管理)

---

## 🎯 專案概述

### 目標

將現有的工時管理系統擴展為**完整的會計事務所管理系統**，包含：

1. ✅ **客戶關係管理 (CRM)** - 擴展現有客戶管理
2. ✅ **服務排程管理** - 月度服務排程追蹤
3. ✅ **SOP 文件管理** - 標準作業程序管理
4. ✅ **專案進度追蹤** - 任務與專案管理
5. ✅ **內容管理系統 (CMS)** - 文章與資源發布
6. ✅ **檔案管理系統** - 媒體與文件庫

### 技術棧

- **前端**: 靜態 HTML/CSS/JS
- **後端**: Cloudflare Workers (已有)
- **資料庫**: D1 SQLite (已有)
- **檔案儲存**: Cloudflare R2
- **部署**: Cloudflare Pages (已有)

### 預計成本

**$0 / 月** (全部使用 Cloudflare 免費額度)

---

## 🏗️ 系統架構分析

### 現有系統盤點 ✅

#### 已實作功能
```
✓ 使用者認證系統 (JWT Session)
✓ 權限管理 (admin/employee)
✓ 員工管理 CRUD
✓ 客戶管理 CRUD
✓ 客戶指派管理
✓ 業務類型管理 (可動態新增) ✅
✓ 工時管理完整功能
✓ 假期管理系統
✓ 設定頁面 (settings.html)
✓ 報表頁面 (reports.html)
```

#### 現有資料庫結構
```
employees (員工)
clients (客戶)
client_assignments (客戶指派)
business_types (業務類型) ✅ 可動態管理
leave_types (假別類型)
timesheets (工時表)
users (使用者)
sessions (會話)
holidays (國定假日)
leave_events (假期事件)
annual_leave_rules (特休規則)
other_leave_rules (其他假期規則)
overtime_rates (加班費率)
system_parameters (系統參數)
```

#### 現有 API 端點
```
認證: /api/login, /api/logout, /api/verify
員工: /api/employees, /api/admin/employees/*
客戶: /api/clients, /api/clients/*
指派: /api/assignments, /api/assignments/*
業務類型: /api/business-types, /api/business-types/* ✅
工時: /api/timesheet-data, /api/save-timesheet
假期: /api/leave-types, /api/leave-events/*
假日: /api/holidays, /api/holidays/*
使用者: /api/admin/users, /api/admin/users/*
```

---

## 📊 實施階段規劃

### 🔷 階段 0: 準備工作 (1 天)

**目標**: 設置開發環境並備份現有系統

#### 任務清單
- [ ] 0.1 備份當前資料庫
  ```bash
  cd timesheet-api
  npx wrangler d1 export timesheet-db --remote --output=backups/pre-expansion-backup.sql
  ```

- [ ] 0.2 創建開發分支
  ```bash
  git checkout -b feature/system-expansion
  ```

- [ ] 0.3 文檔準備
  - [x] 創建實施計畫文檔 (本檔案)
  - [ ] 創建進度追蹤文檔
  - [ ] 創建 API 設計文檔

- [ ] 0.4 環境檢查
  - [ ] 確認 Cloudflare 帳號權限
  - [ ] 確認 D1 資料庫存取
  - [ ] 確認 R2 Bucket 可用

**完成標準**: 
- ✅ 備份檔案存在且可用
- ✅ 所有文檔創建完成
- ✅ 開發環境正常運作

**預計時間**: 2-4 小時

---

### 🔷 階段 1: 客戶關係管理擴展 (3-5 天)

**目標**: 擴展現有客戶管理，加入完整的客戶資料與服務排程

#### 1.1 資料庫擴展

**檔案**: `timesheet-api/migrations/003_clients_expansion.sql`

```sql
-- 客戶詳細資料表
CREATE TABLE IF NOT EXISTS clients_extended (
  client_name TEXT PRIMARY KEY NOT NULL,
  tax_id TEXT UNIQUE,                    -- 統一編號
  contact_person_1 TEXT,
  contact_person_2 TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  monthly_fee INTEGER DEFAULT 0,
  
  -- 服務項目標記
  service_accounting BOOLEAN DEFAULT 0,
  service_tax_return BOOLEAN DEFAULT 0,
  service_income_tax BOOLEAN DEFAULT 0,
  service_registration BOOLEAN DEFAULT 0,
  service_withholding BOOLEAN DEFAULT 0,
  service_prepayment BOOLEAN DEFAULT 0,
  service_payroll BOOLEAN DEFAULT 0,
  service_annual_report BOOLEAN DEFAULT 0,
  service_audit BOOLEAN DEFAULT 0,
  
  notes TEXT,
  region TEXT CHECK(region IN ('台中', '台北', '其他')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'potential')),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 服務排程表
CREATE TABLE IF NOT EXISTS service_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tax_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  frequency TEXT DEFAULT '每月',
  monthly_fee INTEGER DEFAULT 0,
  
  -- 12個月排程
  month_1 BOOLEAN DEFAULT 0,
  month_2 BOOLEAN DEFAULT 0,
  month_3 BOOLEAN DEFAULT 0,
  month_4 BOOLEAN DEFAULT 0,
  month_5 BOOLEAN DEFAULT 0,
  month_6 BOOLEAN DEFAULT 0,
  month_7 BOOLEAN DEFAULT 0,
  month_8 BOOLEAN DEFAULT 0,
  month_9 BOOLEAN DEFAULT 0,
  month_10 BOOLEAN DEFAULT 0,
  month_11 BOOLEAN DEFAULT 0,
  month_12 BOOLEAN DEFAULT 0,
  
  service_details TEXT,
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 客戶互動記錄
CREATE TABLE IF NOT EXISTS client_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  interaction_type TEXT,  -- 'meeting', 'phone', 'email', 'service'
  interaction_date DATE NOT NULL,
  subject TEXT,
  content TEXT,
  handled_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON DELETE CASCADE,
  FOREIGN KEY (handled_by) REFERENCES employees(name)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_clients_extended_tax_id 
  ON clients_extended(tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_extended_region 
  ON clients_extended(region);
CREATE INDEX IF NOT EXISTS idx_service_schedule_client 
  ON service_schedule(client_name);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client 
  ON client_interactions(client_name);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date 
  ON client_interactions(interaction_date);
```

**任務清單**:
- [ ] 1.1.1 創建 migration 檔案
- [ ] 1.1.2 本地測試 migration
- [ ] 1.1.3 執行 migration 到遠端
  ```bash
  npx wrangler d1 execute timesheet-db --remote --file=migrations/003_clients_expansion.sql
  ```
- [ ] 1.1.4 驗證資料表已創建

**預計時間**: 2 小時

---

#### 1.2 後端 API 開發

**檔案**: `timesheet-api/src/index.js`

**新增 API 端點**:

```javascript
// 客戶詳細資料
GET    /api/clients/extended              // 獲取所有客戶詳細資料
GET    /api/clients/:name/extended        // 獲取單一客戶詳細資料
PUT    /api/clients/:name/extended        // 更新客戶詳細資料
POST   /api/clients/:name/extended        // 創建客戶詳細資料

// 服務排程
GET    /api/service-schedule              // 獲取所有服務排程
GET    /api/service-schedule?client=XXX   // 獲取特定客戶排程
POST   /api/service-schedule              // 創建服務排程
PUT    /api/service-schedule/:id          // 更新服務排程
DELETE /api/service-schedule/:id          // 刪除服務排程

// 客戶互動記錄
GET    /api/client-interactions           // 獲取所有互動記錄
GET    /api/client-interactions?client=XX // 獲取特定客戶互動
POST   /api/client-interactions           // 創建互動記錄
PUT    /api/client-interactions/:id       // 更新互動記錄
DELETE /api/client-interactions/:id       // 刪除互動記錄

// CSV 匯入
POST   /api/import/clients                // 匯入客戶資料
```

**任務清單**:
- [ ] 1.2.1 實作 clients_extended CRUD handlers
- [ ] 1.2.2 實作 service_schedule CRUD handlers
- [ ] 1.2.3 實作 client_interactions CRUD handlers
- [ ] 1.2.4 實作 CSV 匯入功能
- [ ] 1.2.5 添加權限檢查
- [ ] 1.2.6 撰寫 API 測試

**預計時間**: 1 天

---

#### 1.3 前端介面開發

**檔案**: `settings.html`, `assets/js/settings.js`

**新增標籤頁**: 「客戶詳細資料」

**功能需求**:
1. 客戶列表（可搜尋、篩選）
2. 客戶詳細資料編輯表單
3. 服務項目勾選（checkbox）
4. 服務排程視覺化（12個月表格）
5. 客戶互動記錄時間軸
6. CSV 匯入功能

**任務清單**:
- [ ] 1.3.1 在 settings.html 新增「客戶詳細資料」標籤
- [ ] 1.3.2 實作客戶列表介面
- [ ] 1.3.3 實作客戶詳細資料表單
- [ ] 1.3.4 實作服務排程編輯器
- [ ] 1.3.5 實作互動記錄功能
- [ ] 1.3.6 實作 CSV 匯入界面
- [ ] 1.3.7 連接後端 API
- [ ] 1.3.8 測試所有功能

**預計時間**: 2 天

---

#### 1.4 資料遷移

**目標**: 將 CSV 資料匯入資料庫

**檔案**: `scripts/import_clients.py`

**任務清單**:
- [ ] 1.4.1 解析 CSV 檔案（活頁簿1.csv, 活頁簿2.csv）
- [ ] 1.4.2 生成 SQL INSERT 語句
- [ ] 1.4.3 執行資料匯入
- [ ] 1.4.4 驗證資料正確性

**預計時間**: 4 小時

---

**階段 1 完成標準**:
- ✅ 所有資料表已創建
- ✅ 所有 API 端點正常運作
- ✅ 前端介面可用且美觀
- ✅ CSV 資料已成功匯入
- ✅ 可以新增/編輯/刪除客戶詳細資料
- ✅ 服務排程可視覺化編輯

**總預計時間**: 3-5 天

---

### 🔷 階段 2: SOP 文件管理系統 (3-4 天)

**目標**: 建立標準作業程序管理系統

#### 2.1 資料庫設計

**檔案**: `timesheet-api/migrations/004_sop_system.sql`

```sql
-- SOP 分類
CREATE TABLE IF NOT EXISTS sop_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES sop_categories(id) ON DELETE CASCADE
);

-- SOP 文檔
CREATE TABLE IF NOT EXISTS sops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category_id INTEGER,
  content TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES sop_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(username),
  FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- SOP 版本歷史
CREATE TABLE IF NOT EXISTS sop_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(username)
);

-- SOP 標籤
CREATE TABLE IF NOT EXISTS sop_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(category_id);
CREATE INDEX IF NOT EXISTS idx_sops_status ON sops(status);
CREATE INDEX IF NOT EXISTS idx_sop_versions_sop ON sop_versions(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_tags_sop ON sop_tags(sop_id);
```

**任務清單**:
- [ ] 2.1.1 創建 SOP 資料表
- [ ] 2.1.2 創建初始分類資料
- [ ] 2.1.3 執行 migration

**預計時間**: 3 小時

---

#### 2.2 後端 API

**新增端點**:
```javascript
// SOP 分類
GET    /api/sop/categories
POST   /api/sop/categories
PUT    /api/sop/categories/:id
DELETE /api/sop/categories/:id

// SOP 文檔
GET    /api/sops
GET    /api/sops/:id
POST   /api/sops
PUT    /api/sops/:id
DELETE /api/sops/:id

// SOP 版本
GET    /api/sops/:id/versions
POST   /api/sops/:id/versions

// SOP 搜尋
GET    /api/sops/search?q=XXX
```

**任務清單**:
- [ ] 2.2.1 實作 SOP CRUD handlers
- [ ] 2.2.2 實作版本控制功能
- [ ] 2.2.3 實作搜尋功能
- [ ] 2.2.4 添加權限控制

**預計時間**: 1 天

---

#### 2.3 前端介面

**新增頁面**: `sop.html`

**功能需求**:
1. SOP 分類樹狀結構
2. Markdown 編輯器
3. 版本歷史查看
4. 搜尋功能
5. 標籤管理

**任務清單**:
- [ ] 2.3.1 創建 SOP 頁面基本結構
- [ ] 2.3.2 整合 Markdown 編輯器
- [ ] 2.3.3 實作分類管理
- [ ] 2.3.4 實作版本控制界面
- [ ] 2.3.5 實作搜尋功能
- [ ] 2.3.6 樣式優化

**預計時間**: 2 天

---

**階段 2 完成標準**:
- ✅ SOP 資料表已創建
- ✅ 可以創建分類
- ✅ 可以新增/編輯 SOP
- ✅ 版本控制正常運作
- ✅ 搜尋功能可用

**總預計時間**: 3-4 天

---

### 🔷 階段 3: 專案與任務管理 (4-5 天)

**目標**: 建立工作進度追蹤系統

#### 3.1 資料庫設計

**檔案**: `timesheet-api/migrations/005_project_management.sql`

```sql
-- 專案
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'planning' 
    CHECK(status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' 
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  
  progress INTEGER DEFAULT 0,  -- 0-100
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(username),
  FOREIGN KEY (assigned_to) REFERENCES employees(name)
);

-- 任務
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' 
    CHECK(status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  
  assigned_to TEXT,
  estimated_hours REAL DEFAULT 0,
  actual_hours REAL DEFAULT 0,
  
  due_date DATE,
  completed_date DATE,
  
  sort_order INTEGER DEFAULT 0,
  parent_task_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES employees(name),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 任務檢核清單
CREATE TABLE IF NOT EXISTS task_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 任務更新記錄
CREATE TABLE IF NOT EXISTS task_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  update_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(username)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
```

**任務清單**:
- [ ] 3.1.1 創建專案管理資料表
- [ ] 3.1.2 執行 migration
- [ ] 3.1.3 驗證資料表

**預計時間**: 3 小時

---

#### 3.2 後端 API

**新增端點**:
```javascript
// 專案
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

// 任務
GET    /api/projects/:projectId/tasks
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id

// 任務檢核清單
GET    /api/tasks/:taskId/checklist
POST   /api/tasks/:taskId/checklist
PUT    /api/checklist/:id
DELETE /api/checklist/:id

// 任務更新
GET    /api/tasks/:taskId/updates
POST   /api/tasks/:taskId/updates

// 工時整合
POST   /api/tasks/:taskId/link-timesheet  // 連結工時記錄到任務
```

**任務清單**:
- [ ] 3.2.1 實作專案 CRUD
- [ ] 3.2.2 實作任務 CRUD
- [ ] 3.2.3 實作檢核清單功能
- [ ] 3.2.4 實作任務更新功能
- [ ] 3.2.5 整合工時系統

**預計時間**: 1.5 天

---

#### 3.3 前端介面

**新增頁面**: `projects.html`

**功能需求**:
1. 專案看板（Kanban）
2. 甘特圖（Gantt Chart）
3. 任務列表
4. 進度追蹤
5. 與工時系統整合

**任務清單**:
- [ ] 3.3.1 創建專案頁面
- [ ] 3.3.2 實作看板視圖
- [ ] 3.3.3 實作任務編輯器
- [ ] 3.3.4 實作進度視覺化
- [ ] 3.3.5 整合工時功能
- [ ] 3.3.6 樣式優化

**預計時間**: 2.5 天

---

**階段 3 完成標準**:
- ✅ 可以創建專案
- ✅ 可以新增任務並指派
- ✅ 任務狀態可更新
- ✅ 進度可視覺化
- ✅ 與工時系統整合

**總預計時間**: 4-5 天

---

### 🔷 階段 4: 內容管理系統 (5-7 天)

**目標**: 建立文章與資源發布系統

#### 4.1 資料庫設計

**檔案**: `timesheet-api/migrations/006_cms.sql`

```sql
-- 文章
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  cover_image TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- 狀態
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at DATETIME,
  scheduled_at DATETIME,
  
  -- 統計
  views_count INTEGER DEFAULT 0,
  reading_minutes INTEGER,
  
  -- 作者
  author_id TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (author_id) REFERENCES users(username)
);

-- 文章標籤
CREATE TABLE IF NOT EXISTS post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- 資源
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT,  -- 'guide', 'template', 'checklist', 'calculator'
  category TEXT,
  content TEXT,
  summary TEXT,
  
  -- 檔案
  download_url TEXT,
  file_size TEXT,
  file_format TEXT,
  
  -- 計算機
  calculator_urls TEXT,
  
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft', 'published', 'archived')),
  
  views_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(username)
);

-- 媒體庫
CREATE TABLE IF NOT EXISTS media_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,  -- 'image', 'document', 'video'
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  
  uploaded_by TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uploaded_by) REFERENCES users(username)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(file_type);
```

**任務清單**:
- [ ] 4.1.1 創建 CMS 資料表
- [ ] 4.1.2 執行 migration

**預計時間**: 3 小時

---

#### 4.2 檔案上傳系統

**設置 Cloudflare R2**:

**任務清單**:
- [ ] 4.2.1 在 Cloudflare 創建 R2 Bucket
  - Bucket 名稱: `horgoscpa-media`
- [ ] 4.2.2 更新 `wrangler.jsonc`
  ```json
  {
    "r2_buckets": [
      {
        "binding": "MEDIA_BUCKET",
        "bucket_name": "horgoscpa-media"
      }
    ]
  }
  ```
- [ ] 4.2.3 實作上傳 API handler
- [ ] 4.2.4 實作檔案管理 API
- [ ] 4.2.5 設置 CDN

**預計時間**: 1 天

---

#### 4.3 後端 API

**新增端點**:
```javascript
// 文章
GET    /api/posts
GET    /api/posts/:slug
POST   /api/posts
PUT    /api/posts/:id
DELETE /api/posts/:id

// 資源
GET    /api/resources
GET    /api/resources/:slug
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id

// 媒體
GET    /api/media
POST   /api/upload
DELETE /api/media/:id

// 前端顯示
GET    /api/public/posts
GET    /api/public/posts/:slug
GET    /api/public/resources
```

**任務清單**:
- [ ] 4.3.1 實作文章 CRUD
- [ ] 4.3.2 實作資源 CRUD
- [ ] 4.3.3 實作媒體上傳
- [ ] 4.3.4 實作公開 API（無需認證）

**預計時間**: 1.5 天

---

#### 4.4 管理介面

**新增頁面**: `content-editor.html`

**功能需求**:
1. Markdown 編輯器（SimpleMDE）
2. 即時預覽
3. 圖片拖曳上傳
4. 媒體庫管理
5. SEO 設定

**任務清單**:
- [ ] 4.4.1 創建內容編輯器頁面
- [ ] 4.4.2 整合 Markdown 編輯器
- [ ] 4.4.3 實作圖片上傳
- [ ] 4.4.4 實作媒體庫
- [ ] 4.4.5 實作 SEO 設定表單
- [ ] 4.4.6 實作預覽功能

**預計時間**: 2 天

---

#### 4.5 前端顯示

**修改現有頁面**: `blog.html`, `resources.html`

**任務清單**:
- [ ] 4.5.1 修改 blog.js 使用新 API
- [ ] 4.5.2 修改 resources.js 使用新 API
- [ ] 4.5.3 實作 Markdown 渲染
- [ ] 4.5.4 更新樣式

**預計時間**: 1 天

---

**階段 4 完成標準**:
- ✅ R2 檔案上傳正常
- ✅ 可以新增/編輯文章
- ✅ Markdown 編輯器可用
- ✅ 圖片上傳正常
- ✅ 前端顯示正確
- ✅ SEO 設定生效

**總預計時間**: 5-7 天

---

### 🔷 階段 5: 整合與優化 (3-4 天)

**目標**: 整合所有功能並優化使用體驗

#### 5.1 功能整合

**任務清單**:
- [ ] 5.1.1 專案與客戶關聯
- [ ] 5.1.2 任務與工時關聯
- [ ] 5.1.3 SOP 與業務類型關聯
- [ ] 5.1.4 統一導航選單
- [ ] 5.1.5 全域搜尋功能

**預計時間**: 1.5 天

---

#### 5.2 使用者體驗優化

**任務清單**:
- [ ] 5.2.1 統一樣式設計
- [ ] 5.2.2 響應式設計優化
- [ ] 5.2.3 載入動畫
- [ ] 5.2.4 錯誤處理優化
- [ ] 5.2.5 提示訊息優化

**預計時間**: 1 天

---

#### 5.3 效能優化

**任務清單**:
- [ ] 5.3.1 API 快取策略
- [ ] 5.3.2 圖片壓縮與 CDN
- [ ] 5.3.3 資料庫查詢優化
- [ ] 5.3.4 前端資源壓縮

**預計時間**: 0.5 天

---

**階段 5 完成標準**:
- ✅ 所有功能可正常互動
- ✅ 介面一致且美觀
- ✅ 響應速度快
- ✅ 無明顯 bug

**總預計時間**: 3-4 天

---

### 🔷 階段 6: 測試與部署 (2-3 天)

**目標**: 全面測試並部署到生產環境

#### 6.1 功能測試

**測試清單**:
- [ ] 6.1.1 使用者認證測試
- [ ] 6.1.2 客戶管理功能測試
- [ ] 6.1.3 SOP 系統測試
- [ ] 6.1.4 專案管理測試
- [ ] 6.1.5 內容管理測試
- [ ] 6.1.6 工時系統測試（回歸測試）
- [ ] 6.1.7 權限控制測試

**預計時間**: 1 天

---

#### 6.2 部署

**任務清單**:
- [ ] 6.2.1 生產環境資料庫備份
- [ ] 6.2.2 執行所有 migrations
- [ ] 6.2.3 部署 Worker
- [ ] 6.2.4 更新前端
- [ ] 6.2.5 驗證部署成功

**預計時間**: 0.5 天

---

#### 6.3 文檔完善

**任務清單**:
- [ ] 6.3.1 更新 API 文檔
- [ ] 6.3.2 撰寫使用手冊
- [ ] 6.3.3 更新 README
- [ ] 6.3.4 創建影片教學（可選）

**預計時間**: 1 天

---

**階段 6 完成標準**:
- ✅ 所有測試通過
- ✅ 生產環境運行正常
- ✅ 文檔完整

**總預計時間**: 2-3 天

---

## 📊 進度追蹤

### 當前進度

**最後更新**: 2025-10-25

| 階段 | 狀態 | 完成度 | 備註 |
|------|------|--------|------|
| 階段 0: 準備工作 | 🟡 進行中 | 50% | 已創建計畫文檔 |
| 階段 1: 客戶管理擴展 | ⚪ 未開始 | 0% | - |
| 階段 2: SOP 系統 | ⚪ 未開始 | 0% | - |
| 階段 3: 專案管理 | ⚪ 未開始 | 0% | - |
| 階段 4: CMS | ⚪ 未開始 | 0% | - |
| 階段 5: 整合優化 | ⚪ 未開始 | 0% | - |
| 階段 6: 測試部署 | ⚪ 未開始 | 0% | - |

**圖例**: 
- ⚪ 未開始
- 🟡 進行中
- 🟢 已完成
- 🔴 遇到問題

### 檢查清單總覽

**已完成任務**: 1 / 150+  
**整體進度**: 1%

---

## 🔄 如何接續工作

### 情境 1: 對話超過上限需要繼續

**您需要對我說的話**：

```
我要繼續系統擴展專案。

當前狀態：
- 正在進行的階段：[階段編號]
- 最後完成的任務：[任務編號]
- 遇到的問題：[如果有]

請查看 docs/SYSTEM_EXPANSION_PLAN.md 和 
docs/SYSTEM_EXPANSION_PROGRESS.md 
繼續下一步工作。
```

### 情境 2: 暫停後想繼續

**您需要對我說的話**：

```
我想繼續系統擴展工作。
上次進行到階段 [X]，請幫我檢查進度並繼續。
```

### 情境 3: 想跳過某個階段

**您需要對我說的話**：

```
我想跳過階段 [X]，直接進行階段 [Y]。
請幫我準備所需的檔案和說明。
```

### 情境 4: 遇到問題需要協助

**您需要對我說的話**：

```
我在執行 [任務編號] 時遇到問題：
[問題描述]

請幫我解決。
```

---

## 📁 重要檔案位置

### 文檔
```
docs/SYSTEM_EXPANSION_PLAN.md          # 本檔案（實施計畫）
docs/SYSTEM_EXPANSION_PROGRESS.md      # 進度追蹤（待創建）
docs/SYSTEM_EXPANSION_API.md           # API 設計（待創建）
docs/timesheet-api/README.md           # API 說明
```

### 資料庫
```
timesheet-api/migrations/
  001_complete_schema.sql               # 現有結構
  002_seed_data.sql                     # 初始資料
  003_clients_expansion.sql             # 客戶管理擴展（待創建）
  004_sop_system.sql                    # SOP 系統（待創建）
  005_project_management.sql            # 專案管理（待創建）
  006_cms.sql                           # CMS（待創建）
```

### 後端
```
timesheet-api/src/
  index.js                              # 主要 API（需擴展）
  auth.js                               # 認證（已完成）
  clients.js                            # 客戶管理（待創建）
  sop.js                                # SOP 管理（待創建）
  projects.js                           # 專案管理（待創建）
  cms.js                                # CMS（待創建）
  upload.js                             # 檔案上傳（待創建）
```

### 前端
```
settings.html                           # 設定頁面（需擴展）
sop.html                                # SOP 頁面（待創建）
projects.html                           # 專案頁面（待創建）
content-editor.html                     # 內容編輯器（待創建）

assets/js/
  settings.js                           # 設定邏輯（需擴展）
  sop.js                                # SOP 邏輯（待創建）
  projects.js                           # 專案邏輯（待創建）
  content-editor.js                     # 編輯器邏輯（待創建）
```

---

## ⚠️ 風險管理

### 已識別風險

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 資料遷移失敗 | 高 | 中 | 完整備份、分步驟測試 |
| API 效能問題 | 中 | 低 | 索引優化、快取策略 |
| 前端相容性 | 低 | 中 | 跨瀏覽器測試 |
| Cloudflare 額度超限 | 中 | 低 | 監控使用量 |
| 原有功能影響 | 高 | 低 | 回歸測試 |

### 回滾計畫

如果需要回滾：

```bash
# 1. 恢復資料庫
cd timesheet-api
npx wrangler d1 execute timesheet-db --remote --file=backups/pre-expansion-backup.sql

# 2. 回滾代碼
git checkout main

# 3. 重新部署
npx wrangler deploy
```

---

## 📞 支援與協助

### 需要幫助時

1. **查看文檔**: `docs/` 資料夾中的所有文檔
2. **查看進度**: `docs/SYSTEM_EXPANSION_PROGRESS.md`
3. **提出問題**: 參考「如何接續工作」章節

### 常見問題

**Q: 如果執行某個 migration 失敗怎麼辦？**
A: 檢查錯誤訊息，可能需要修改 SQL 語法。可以先在本地測試。

**Q: 如何確認當前進度？**
A: 查看 `docs/SYSTEM_EXPANSION_PROGRESS.md`（下一步會創建）

**Q: 可以調整實施順序嗎？**
A: 可以！但注意依賴關係（例如 CMS 需要先完成檔案上傳）

---

## 🎯 成功指標

### 完成後的系統應該能夠：

- ✅ 管理完整的客戶資料（包含 CSV 匯入的資料）
- ✅ 追蹤服務排程（12 個月視覺化）
- ✅ 管理 SOP 文件（版本控制）
- ✅ 追蹤專案與任務進度
- ✅ 發布文章與資源
- ✅ 上傳與管理檔案
- ✅ 與現有工時系統整合
- ✅ 所有功能有權限控制
- ✅ 響應式設計（手機可用）
- ✅ 完整的文檔

---

## 📅 時間表總覽

| 階段 | 預計時間 | 依賴 |
|------|----------|------|
| 準備工作 | 0.5 天 | 無 |
| 客戶管理 | 3-5 天 | 準備工作 |
| SOP 系統 | 3-4 天 | 準備工作 |
| 專案管理 | 4-5 天 | 準備工作、客戶管理 |
| CMS | 5-7 天 | 準備工作 |
| 整合優化 | 3-4 天 | 所有階段 |
| 測試部署 | 2-3 天 | 整合優化 |

**總計**: 20-28 天 (4-6 週)

---

## 📝 變更記錄

| 日期 | 版本 | 變更內容 |
|------|------|----------|
| 2025-10-25 | 1.0 | 初版創建 |

---

**文檔結束**

**下一步**: 創建進度追蹤文檔 (`docs/SYSTEM_EXPANSION_PROGRESS.md`)

