### 任務 00：初始化 Cloudflare Pages/Workers 預覽部署

【目標】
- 建立可用的預覽部署（Preview），合併到 main 自動發佈 Production，完成健康檢查。

【範圍】
- Pages 站點與 Functions/Workers 基本結構；Wrangler 綁定（D1/R2 先留空或模擬）。
- 不含任何業務功能。

【需閱讀】
- `docs/開發指南/開發須知/部署-與-環境.md`

【驗收標準（AC）】
- PR 產生預覽網址可正常開啟 `index.html`。
- 合併至 main 觸發正式部署成功，可一鍵回滾。
- 部署日誌無重大錯誤（4xx/5xx）。

【影響面】
- 部署設定、環境變數/Secret、Git 分支流程。

【設計概要】
- 採 Pages 部署前端，Functions/Workers 提供 API；使用預設路由 `/api/v1/*`。
 - 若需在 `www` 下以路徑導入內部系統（如 `/login`, `/internal/*`），請完成「任務 03」之 Worker 路徑路由設定。

【任務分解】
1) 設定 Pages 專案與預覽部署
2) 設定 CI 流程（PR → Preview、main → Production）
3) 健康檢查頁與檢測腳本

【自我測試】
- 預覽與正式網址皆可開啟首頁；狀態 200。

【部署計畫】
- 需變數：`APP_ENV`（dev/staging/prod）
- 回滾：使用 Cloudflare Deployments 回滾上一成功版本


