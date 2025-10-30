### 任務 02：Cloudflare API Token 與 wrangler 登入（免技術版步驟）

【目標】
- 讓部署指令可無痛執行：設定 API Token、完成 wrangler 登入/授權。

【需閱讀】
- `docs/開發指南/開發須知/部署-與-環境.md`

【步驟（Cloudflare 介面）】
1) 登入 Cloudflare（使用你的帳號：Hergscpa@gmail.com）
2) 右上角頭像 → My Profile → API Tokens → Create Token
3) 建立自訂 Token（Custom Token），勾選以下權限（最小權限）：
   - Account → Cloudflare Pages → Edit
   - Account → Workers Scripts → Edit
   - Account → Workers KV Storage → Edit（如需 KV）
   - Account → R2 Storage → Edit（如需 R2 上傳）
4) 賦予作用範圍（Accounts → 選擇你的帳戶）
5) Create Token 並複製 Token（只會顯示一次）

【步驟（本機/CI 設定）】
- 推薦方式 A：瀏覽器授權（可視化）
  1) 安裝 wrangler：`npm i -g wrangler`
  2) 執行：`wrangler login`（會開啟瀏覽器授權）

- 方式 B：使用 API Token（非互動）
  1) `wrangler config --api-token <你的TOKEN>`
  2) 驗證：`wrangler whoami` 應顯示你的帳號資訊

【驗收標準（AC）】
- `wrangler whoami` 成功顯示帳號與 Account ID
- （若 Pages 專案已建立）`wrangler pages project list` 能列出專案

【備註】
- 請勿把 Token 寫入版本庫。CI 平台請存放於 Secrets（例如 `CF_API_TOKEN`）。
- 未使用 KV/R2 可先不賦權，待功能需用時再加。


