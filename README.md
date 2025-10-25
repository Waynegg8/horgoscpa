# 霍爾果斯會計師事務所網站

專業財稅顧問服務網站，提供創業諮詢、稅務與會計資源。

## 專案結構

```
horgoscpa/
├── index.html              # 首頁
├── blog.html               # 專欄文章列表
├── resources.html          # 資源中心（指南/範本/檢核表）
├── services.html           # 服務總覽
├── team.html               # 專業團隊
├── faq.html                # 常見問題
├── contact.html            # 聯絡資訊
├── booking.html            # 預約諮詢
├── timesheet.html          # 工時管理系統（內部）
├── login.html              # 登入（內部）
├── settings.html           # 設定（內部）
├── reports.html            # 報表（內部）
│
├── content/                # Markdown 來源（文章與資源）
│   ├── posts/              # 專欄文章 Markdown
│   └── resources/          # 資源中心 Markdown
│
├── templates/              # HTML 模板
│   └── post.html           # 文章頁面模板
│
├── assets/
│   ├── css/                # 樣式表
│   ├── js/                 # 前端腳本
│   ├── images/             # 圖片資源
│   ├── fonts/              # 字型
│   └── data/               # JSON 資料
│       ├── posts.json      # 文章清單
│       └── resources.json  # 資源清單
│
├── scripts/                # 內容產線腳本
│   └── content_pipeline.py # Markdown → JSON/HTML
│
├── services/               # 服務子頁
│   ├── tax.html
│   ├── accounting.html
│   ├── consulting.html
│   └── audit.html
│
├── docs/                   # 📚 文檔中心（所有說明文檔）
│   ├── README.md           # 文檔索引
│   ├── API_ENDPOINTS.md
│   ├── SEO_DEPLOYMENT_GUIDE.md
│   ├── GITHUB_ACTIONS_SETUP.md
│   └── timesheet-api/      # Timesheet API 相關文檔
│       ├── README.md
│       └── RESTORE_DATABASE_GUIDE.md
│
├── timesheet-api/          # Cloudflare Worker API
│   ├── src/
│   │   ├── index.js        # 主程式
│   │   └── auth.js         # 認證模組
│   ├── migrations/         # 資料庫遷移
│   │   └── 001_complete_schema.sql
│   ├── import_*.sql        # 初始資料
│   ├── restore-database.ps1 # 資料庫復原腳本
│   └── wrangler.jsonc      # Worker 設定
│
├── _redirects              # 301 導向規則
├── sitemap.xml             # 站點地圖
├── sitemap_index.xml       # 站點地圖索引
└── robots.txt              # 搜尋引擎規則
```

## 內容管理

### 新增文章

1. 在 `content/posts/` 建立 Markdown 檔案（格式：`slug.md`）
2. 加上 YAML front-matter：

```yaml
---
title: 文章標題
slug: article-slug
category: 創業入門
tags: [創業, 稅務, 會計]
summary: 文章摘要
cover_image: /assets/images/covers/article.jpg
published_at: 2025-10-25T10:00:00+08:00
reading_minutes: 5
---
```

3. 撰寫 Markdown 內容
4. 執行產線：`python scripts/content_pipeline.py`
5. 產線會自動生成：
   - `assets/data/posts.json`
   - `blog/{slug}.html`
   - 更新 `sitemap.xml`

### 新增資源

1. 在 `content/resources/` 建立 Markdown 檔案
2. 加上 front-matter：

```yaml
---
title: 資源標題
slug: resource-slug
type: guide
category: 創業工具
tags: [範本, 檢核表]
summary: 資源說明
download_url: /downloads/template.pdf
file_size: 2.5MB
calculator_urls: [https://calculator.example.com]
updated_at: 2025-10-25T10:00:00+08:00
---
```

3. 執行產線：`python scripts/content_pipeline.py`

## 內容分類（創業主題）

- 創業入門
- 公司設立
- 股權與合約
- 營運與HR
- 稅務與帳務
- 募資與補助
- 法規與風險

## 工時管理系統（內部）

### 本機開發

```bash
cd timesheet-api
npm install
npx wrangler dev
```

### 部署

```bash
cd timesheet-api
npx wrangler deploy
```

### 資料庫管理

```bash
# 初始化資料庫
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 匯入初始資料
npx wrangler d1 execute timesheet-db --remote --file=import_employees.sql
npx wrangler d1 execute timesheet-db --remote --file=import_clients_FINAL.sql
npx wrangler d1 execute timesheet-db --remote --file=import_assignments.sql
npx wrangler d1 execute timesheet-db --remote --file=import_business_types.sql
npx wrangler d1 execute timesheet-db --remote --file=import_leave_types.sql
npx wrangler d1 execute timesheet-db --remote --file=import_holidays.sql
npx wrangler d1 execute timesheet-db --remote --file=import_overtime_rates.sql
npx wrangler d1 execute timesheet-db --remote --file=import_annual_leave_rules.sql
npx wrangler d1 execute timesheet-db --remote --file=import_other_leave_rules.sql
npx wrangler d1 execute timesheet-db --remote --file=import_system_parameters.sql
```

## 📚 文檔中心

所有專案說明文檔已整合至 **[docs/](./docs/)** 資料夾：

- **[docs/README.md](./docs/README.md)** - 文檔索引與快速導航
- **[docs/timesheet-api/README.md](./docs/timesheet-api/README.md)** - Timesheet API 完整說明
- **[docs/timesheet-api/RESTORE_DATABASE_GUIDE.md](./docs/timesheet-api/RESTORE_DATABASE_GUIDE.md)** - 資料庫復原指南

**📝 文檔規範：** 所有新增的說明文檔請統一放置在 `docs/` 資料夾中。

## 部署與 SEO

- 301 導向規則：`_redirects`（Cloudflare Pages 格式）
- 站點地圖：`sitemap.xml`、`sitemap_index.xml`
- Search Console：手動提交站圖
- 詳細說明：參考 [docs/SEO_DEPLOYMENT_GUIDE.md](./docs/SEO_DEPLOYMENT_GUIDE.md)

## 技術架構

- 前端：純靜態 HTML/CSS/JS
- 後端：Cloudflare Workers + D1 Database
- 內容產線：Python (Markdown → JSON/HTML)
- 部署：Cloudflare Pages（前端） + Workers（API）

## License

© 2025 霍爾果斯會計師事務所
