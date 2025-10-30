### 任務 04：連結 Git 並自動部署（Cloudflare Pages + GitHub Actions）

【目標】
- 以 Git 觸發自動部署：push 到 main → production；其他分支/PR → preview。無需手動操作。

【需閱讀】
- `docs/開發指南/開發須知/部署-與-環境.md`

【已內建】
- CI 腳本：`.github/workflows/deploy-internal-pages.yml`
- 使用 `wrangler pages deploy` 部署至 `horgoscpa-internal`

【步驟（一次性）】
1) 建立 Git 倉庫（GitHub 推薦）
   - 在 GitHub 建立空白 repo（例如 `horgoscpa-internal`）
   - 本機（此專案根目錄）執行：
     - `git init`
     - `git add . && git commit -m "chore: init"`
     - `git branch -M main`
     - `git remote add origin <你的 GitHub repo URL>`
     - `git push -u origin main`
2) 設定 GitHub Secrets（Repo → Settings → Secrets → Actions）
   - `CF_API_TOKEN`：Cloudflare API Token（需權限：Pages:Edit）
3)（可選）Repository Variables（Repo → Settings → Variables → Actions）
   - 若未修改，`CLOUDFLARE_ACCOUNT_ID` 已於 workflow 內設定為 `4ad0a8042beb2d218bd6edf39aee0fea`

【驗收標準（AC）】
- push 到 `main` 自動部署 production，成功訊息含 `*.pages.dev` 連結
- 對其他分支或 PR，自動部署 preview（分支名將用於 `--branch`）

【回滾】
- 使用 Cloudflare Pages 的 deployments 選擇上一成功版本回滾

【備註】
- 若之後更名專案，更新 workflow 中的 `PROJECT_NAME`
- 不使用 Cloudflare 的「Connect to Git」也沒關係，CI 會自動部署，效果相同


