### 開發須知總覽（Cloudflare Pages + Workers / D1 / R2）

本專案為純 HTML 前端，採 Cloudflare Pages 發佈，後端以 Pages Functions/Workers 提供 API，資料庫使用 D1（SQLite），檔案存儲使用 R2。所有文件一律採用繁體中文 UTF-8，禁止使用第三方 CMS，並明確規範共用 CSS 與介面行為，不採用 Tailwind、Vue 等框架。

— 本文件為總覽與索引，請先讀完此頁，再依需要查閱下列細則 —

### 架構與設計原則
- **平台**: Cloudflare Pages（前端），Pages Functions/Workers（API）
- **資料庫**: Cloudflare D1（SQLite，相容 SQL）
- **物件存儲**: Cloudflare R2（附件、媒體）
- **前端**: 純 HTML + 共用 CSS + 少量原生 JS；允許使用原生 Web Components（非必要不強制）
- **CMS**: 內部自建（以 `content/` 與 `assets/data/*.json` 為主），不使用第三方服務
- **語言與編碼**: 繁體中文、UTF-8
- **一致性**: 命名、資料格式、API 結構、錯誤處理、RWD、色彩與字體統一

### 目錄
- 前端共用規範 → `前端-共用規範.md`
- API 設計規範（統一格式） → `API-設計規範.md`
- 資料庫（D1）規範 → `資料庫-D1-規範.md`
- 存儲（R2）規範 → `存儲-R2-規範.md`
- 部署與環境 → `部署-與-環境.md`
- AI 開發須知（流程與禁忌） → `AI-開發須知.md`
- 開發計畫清單（模板） → `開發計畫清單.md`
- 開發清單（任務索引） → `開發清單-任務索引.md`
- 安全與登入規範 → `安全與登入-規範.md`

### 最小閱讀策略（避免上下文遺忘）
- 第一次任務：只讀本頁 README（掌握架構、命名、流程與索引）
- 開始實作前，依任務類型「只讀必要文件」：
  - 前端實作：`前端-共用規範.md` ＋ 對應模組的前端規格（`docs/開發指南/前端/*`）
  - API/後端：`API-設計規範.md` ＋ 對應模組的後端規格（`docs/開發指南/後端/*`）
  - 資料庫：`資料庫-D1-規範.md`（必要時查對應模組欄位/索引）
  - 檔案存儲：`存儲-R2-規範.md`
  - 部署與遷移：`部署-與-環境.md`
  - 安全/登入：`安全與登入-規範.md`
- 原則：每次只載入與「當前步驟」相關文件；若任務範圍擴大，再補讀相應文件。

### 專案資料夾與命名
- **前端資產**: `assets/css/*.css`, `assets/js/**`, `assets/images/**`, `assets/fonts/**`
- **共用樣式**: `assets/css/common.css` 作為變數與基礎樣式來源；其他頁面/模組樣式依檔名清楚對應
- **模板**: `templates/`（例如 `templates/post.html` 與可選的 `templates/partials/*`）
- **內容**: `content/**` 與 `assets/data/*.json`（內建 CMS 的資料來源）
- **命名**: 採小寫-kebab-case 檔名；CSS class 採 BEM（`block__element--modifier`）

### 變更流程（小步提交、可回滾）
1) 一次只改一個明確範圍（單檔/單功能）
2) 每次提交前須完成自我測試與一致性驗證
3) 變更涉及規範或資料結構時，需同步更新對應文件
4) 部署採自動化，部署後可一鍵回滾

### API 與資料格式（節錄）
- Base Path: `/api/v1`
- JSON Envelope：`ok` | `code` | `message` | `data` | `meta`
- 時間格式：ISO 8601（UTC，結尾 `Z`）
- 分頁、排序、篩選、錯誤碼與驗證格式請見 `API-設計規範.md`

### 提交訊息格式（Commit Message）
- `type(scope): summary`（例如：`feat(api): add clients list pagination`）
- 常見類型：`feat|fix|docs|refactor|perf|test|chore`
- 內文包含：變更動機、影響範圍、風險/回滾、測試要點

### 參考文件
- Cloudflare Pages / Functions / Workers / Wrangler（部署與本機開發）
- Cloudflare D1（SQLite 與遷移）
- Cloudflare R2（物件存儲與權限）


