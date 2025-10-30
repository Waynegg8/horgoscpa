### 任務 04：Connect to Git 直連同一個 repo（Cloudflare Pages）

對應索引：`docs/開發指南/開發須知/開發清單-任務索引.md`

【目標】
- 直接讓 Cloudflare Pages 連結你同一個 Git repo：push 到 main → production；其他分支/PR → preview。無需自建 CI。

【需閱讀】
- `docs/開發指南/開發須知/部署-與-環境.md`

【前置】
- 目前專案已在 `horgoscpa-internal` Pages 上線（upload 型式亦可）。此任務將把它改成「連結 Git」。

【步驟（Dashboard 點選）】
1) 登入 Cloudflare → Pages → Create project（或在既有 `horgoscpa-internal` 專案中點「Set up builds / Connect to Git」）
2) 選擇 Git provider 與 repo（同外部網站的同一個 repo）
3) Build 設定：
   - Framework preset：None
   - Build command：留空
   - Build output directory：.`
   - Production branch：main（其餘分支預設成 preview）
4) 確認並建立。首次建置完成後會產生 production 與 preview 網址（延續原專案網址）。

【驗收標準（AC）】
- push 到 `main` 自動觸發 production 部署成功
- 非 `main` 分支或 PR 自動產生 preview 連結
- 既有 Worker 路徑路由（/login、/internal/*）仍正常工作

【回滾】
- Pages → Deployments → 選取上一成功版本 → Rollback

【備註】
- 若 Cloudflare 不允許直接把既有 upload 型專案切換為 Git：
  - 作法 A：在 Pages 新建一個名為 `horgoscpa-internal` 的 Git 專案（若名稱被佔用，先將舊專案 rename 再復名）
  - 作法 B：保留舊專案，另建 `horgoscpa-internal-git`，更新 Worker 變數 `INTERNAL_BASE_HOST` 指向新專案
- 若你之前有 `.github/workflows/deploy-internal-pages.yml`，建議移除或停用，避免重複部署。


