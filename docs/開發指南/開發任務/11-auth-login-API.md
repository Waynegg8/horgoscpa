### 任務 11：POST /auth/login 登入 API（會話建立）

對應索引：`docs/開發指南/開發須知/開發清單-任務索引.md`

【目標】
- 實作登入 API，正確驗證帳密、建立 D1 會話、回應 Envelope，設定 `HttpOnly; Secure; SameSite=Lax` Cookie。

【範圍】
- 後端 API 與 D1 `sessions` 表；密碼雜湊驗證；不含前端頁面。

【需閱讀】
- `docs/開發指南/開發須知/API-設計規範.md`
- `docs/開發指南/開發須知/資料庫-D1-規範.md`
- `docs/開發指南/開發須知/安全與登入-規範.md`
- 後端：`docs/開發指南/後端/系統基礎-後端規格.md`

【驗收標準（AC）】
- 正確狀態碼：成功 200，錯誤 401/422；回應符合 Envelope。
- 設定 `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`。
- 會話寫入 D1 並含到期時間。

【影響面】
- D1 `users`/`sessions`；安全策略（速率限制、錯誤訊息泛化）。

【設計概要】
- 密碼優先 Argon2id，不可用時 PBKDF2-SHA256（迭代 ≥ 310k）。
- 會話 TTL 預設 30 天，登入後輪替 Session ID。

【任務分解】
1) 建立/確認 `users`、`sessions` 結構（遷移可重入）
2) 實作登入 API 與 Envelope 回應
3) 設定 Cookie 與 TTL、記錄 audit log

【自我測試】
- 正確帳密設定 Cookie、錯誤帳密回 401；D1 成功寫入/到期欄位正確。

【部署計畫】
- 綁定：`DATABASE`（D1）
- 變數：`SESSION_COOKIE_NAME=session`、`SESSION_TTL_SECONDS=2592000`


