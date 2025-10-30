### 任務 03：Worker 路徑路由，代理內部系統（www/login → 內部登入）

【目標】
- 在不改動外部首頁的前提下，讓 `www.horgoscpa.com/login` 與 `/internal/*` 指向內部系統；其餘路徑仍由外部站提供。

【需閱讀】
- `docs/開發指南/開發須知/部署-與-環境.md`

【事前準備】
- 內部系統已有 Pages 預覽（例如 `internal.pages.dev`）
- 外部網站已有既有 Pages 或主站（例如 `www-site.pages.dev`）

【步驟】
1) 在 Cloudflare 建立一支 Worker（Workers & Pages → Create → Worker）
2) 設定環境變數（Worker → Settings → Variables）：
   - `EXTERNAL_BASE_HOST` = 外部站 pages.dev 主機名（例：`www-site.pages.dev`）
   - `INTERNAL_BASE_HOST` = 內部站 pages.dev 主機名（例：`internal.pages.dev`）
   - `INTERNAL_API_HOST` = 內部 API 主機名（可與 INTERNAL_BASE_HOST 相同）
3) 設定 Routes（Worker → Triggers → Routes）：
   - Pattern：`www.horgoscpa.com/*`（只綁在 www，不要使用萬用域名）
4) 將以下邏輯部署為 Worker 程式：
```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    // 內部 API 路徑（反向代理至內部）
    if (p.startsWith('/internal/api/')) {
      url.hostname = env.INTERNAL_API_HOST;
      url.pathname = p.replace('/internal', '');
      return fetch(new Request(url.toString(), request));
    }

    // 登入頁（反向代理到內部登入頁）
    if (p === '/login') {
      url.hostname = env.INTERNAL_BASE_HOST;
      url.pathname = '/login';
      return fetch(new Request(url.toString(), request));
    }

    // 其他內部頁面（/internal/*）
    if (p.startsWith('/internal/')) {
      url.hostname = env.INTERNAL_BASE_HOST;
      url.pathname = p.replace('/internal', '');
      return fetch(new Request(url.toString(), request));
    }

    // 其餘全部交回外部站
    url.hostname = env.EXTERNAL_BASE_HOST;
    return fetch(new Request(url.toString(), request));
  }
}
```
5) 認證 Cookie 設定（內部登入 API 回應）：
   - `Set-Cookie: session=...; Path=/internal; HttpOnly; Secure; SameSite=Lax`
   - 確保 Cookie 僅作用於 `/internal`，不干擾外部站其它路徑

【驗收標準（AC）】
- 造訪 `https://www.horgoscpa.com/login` 顯示內部登入頁
- 造訪 `https://www.horgoscpa.com/internal/...` 顯示內部系統頁面
- 造訪首頁 `/` 與外部內容不受影響

【回滾】
- 停用或移除該 Worker 路由即可立即恢復原行為


