### API 設計規範（統一格式 / Cloudflare Pages Functions/Workers）

本規範定義 API 版本、資料包裝（Envelope）、錯誤格式、分頁/排序/篩選、認證與安全、時序與冪等，以及範例端點。

### 基本約定
- Base Path：`/api/v1`
- `Content-Type: application/json; charset=utf-8`
- 一律回傳 JSON（包含錯誤）
- 時間一律使用 ISO 8601 UTC（結尾 `Z`）
- 需要登入的端點使用 `HttpOnly; Secure; SameSite=Lax` 的 `session` Cookie；API 用戶端可選擇 `Authorization: Bearer <token>`

### 回應 Envelope
- 成功：
```json
{
  "ok": true,
  "code": "OK",
  "message": "成功",
  "data": { },
  "meta": { "requestId": "req_...", "tookMs": 12 }
}
```
- 失敗：
```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "輸入有誤",
  "errors": [{ "field": "email", "message": "必填" }],
  "meta": { "requestId": "req_..." }
}
```

### 狀態碼對應
- 200/201：成功/已建立（POST/PUT）
- 204：成功但無內容（DELETE）
- 400：請求格式錯誤（含 JSON 解析錯誤）
- 401：未認證（缺少或無效會話/Token）
- 403：無權限（角色/資源不符）
- 404：資源不存在
- 409：資源衝突（例如重複 email）
- 422：驗證錯誤（欄位級）
- 429：請求過多（Rate Limit）
- 500：伺服器錯誤

### 分頁 / 排序 / 篩選
- 查詢參數：
  - `page`（預設 `1`）、`perPage`（預設 `20`，上限 `100`）
  - `sort`：多欄位逗號分隔，方向以 `:asc|desc` 表示，例如：`sort=createdAt:desc,name:asc`
  - `filter[*]`：鍵值對，例如：`filter[status]=active`、`filter[q]=keyword`
- 回應 `meta`：
```json
{
  "page": 1,
  "perPage": 20,
  "total": 135,
  "hasNext": true
}
```

### 通用標頭
- `X-Request-Id`：請求追蹤用（若來自前端可生成傳入）
- `Idempotency-Key`：建立/重試安全（POST/PUT）
- `Cache-Control`：可對 GET 加入快取提示（後端仍以權限為準）

### 認證與安全
- 會話 Cookie：`session=...; HttpOnly; Secure; SameSite=Lax; Path=/;`，有效期與輪替策略見《安全與登入規範》
- CSRF：使用 SameSite=Lax 並於跨站情境或高風險操作搭配 CSRF Token
- CORS：限制來源，必要時以 allowlist 控制
- 輸入驗證：所有輸入必做型別/長度/格式/範圍檢查
- 速率限制：針對敏感端點（登入、註冊、上傳）實施

### 時間與小數
- 時間：ISO 8601 UTC（例如 `2025-10-30T08:00:00.000Z`）
- 金額類欄位：後端以整數存最小貨幣單位（如分），前端才格式化

### 版本管理
- URL 版本化（`/api/v1`）；發生破壞性變更時遞升主版號（v2）

### 範例端點
- 列出客戶：`GET /api/v1/clients?page=1&perPage=20&sort=createdAt:desc`
```json
{
  "ok": true,
  "code": "OK",
  "message": "成功",
  "data": [
    { "id": "01JB...", "name": "Acme", "status": "active", "createdAt": "2025-10-30T08:00:00.000Z" }
  ],
  "meta": { "requestId": "req_...", "page": 1, "perPage": 20, "total": 1, "hasNext": false }
}
```
- 登入：`POST /api/v1/auth/login`
```json
{
  "email": "user@example.com",
  "password": "••••••••"
}
```
回應：設定 `Set-Cookie: session=...` 並回傳使用者摘要。

- 取得 R2 上傳簽名：`POST /api/v1/files/presign-upload`
```json
{
  "module": "attachments",
  "entityId": "client_01JB...",
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "size": 102400
}
```
回應：
```json
{
  "ok": true,
  "code": "OK",
  "message": "成功",
  "data": {
    "uploadUrl": "https://...",
    "objectKey": "private/prod/attachments/client_01JB.../f_01...pdf"
  },
  "meta": { "requestId": "req_..." }
}
```

### 冪等與併發
- 對建立類請求提供 `Idempotency-Key`，後端以 Key + 路徑 + 主體做去重。
- 資源更新使用樂觀鎖欄位（如 `updatedAt` 或 `version`）。

### 錯誤碼建議
- `OK`、`VALIDATION_ERROR`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`RATE_LIMITED`、`INTERNAL_ERROR`


