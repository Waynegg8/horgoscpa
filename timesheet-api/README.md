# 會計師事務所內部管理系統 API

基於 Cloudflare Workers + D1 + Hono 構建的內部管理系統後端 API。

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置 Cloudflare

#### 2.1 創建 D1 資料庫

```bash
wrangler d1 create horgoscpa
```

複製返回的 `database_id`，填入 `wrangler.jsonc` 的 `d1_databases[0].database_id`。

#### 2.2 創建 R2 Buckets

```bash
wrangler r2 bucket create horgoscpa-attachments
wrangler r2 bucket create horgoscpa-backups
```

#### 2.3 設定 Secrets

```bash
# 設定 JWT 密鑰（生產環境）
wrangler secret put JWT_SECRET

# 輸入一個強密碼，例如：your-super-secret-jwt-key-here
```

#### 2.4 執行資料庫 Migration

**本地開發環境：**
```bash
npm run db:migrate:local
```

**生產環境：**
```bash
npm run db:migrate
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

API 將在 `http://localhost:8787` 運行。

### 4. 部署到生產環境

```bash
npm run deploy
```

## 📚 API 文檔

### 認證端點

#### POST /api/v1/auth/login
登入系統

**請求：**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "username": "admin",
      "name": "管理員",
      "email": "admin@example.com",
      "is_admin": true
    },
    "token": "eyJhbGc..."
  }
}
```

#### POST /api/v1/auth/logout
登出系統（需認證）

#### GET /api/v1/auth/me
驗證當前會話（需認證）

#### POST /api/v1/auth/change-password
修改密碼（需認證）

**請求：**
```json
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

## 🔧 技術棧

- **運行環境：** Cloudflare Workers
- **Web 框架：** Hono
- **資料庫：** Cloudflare D1 (SQLite)
- **儲存：** Cloudflare R2
- **認證：** JWT + HttpOnly Cookie
- **密碼雜湊：** bcrypt
- **語言：** TypeScript

## 📂 專案結構

```
timesheet-api/
├── src/
│   ├── index.ts              # 主入口
│   ├── types/                # TypeScript 類型定義
│   ├── middleware/           # 中間件（認證、錯誤處理、CORS 等）
│   ├── utils/                # 工具函數（加密、驗證、響應格式等）
│   ├── repositories/         # Repository 層（資料訪問）
│   ├── services/             # Service 層（業務邏輯）
│   └── routes/               # Route 層（API 端點）
├── schema.sql                # 資料庫 Schema
├── wrangler.jsonc            # Cloudflare Workers 配置
├── package.json
└── tsconfig.json
```

## 🔒 安全性

- ✅ 使用參數化查詢防止 SQL 注入
- ✅ 密碼使用 bcrypt 雜湊
- ✅ JWT Token 存於 HttpOnly Cookie
- ✅ 帳號鎖定機制（連續失敗 5 次，鎖定 15 分鐘）
- ✅ CORS 配置
- ✅ 審計日誌記錄所有重要操作

## 📝 開發規範

### 編碼規範
- 所有檔案使用 **UTF-8 編碼**（繁體中文）
- TypeScript strict mode
- 使用 ESLint + Prettier

### 命名規範
- 資料表：PascalCase（如：`Users`）
- 欄位：snake_case（如：`user_id`）
- TypeScript：camelCase（變數、函數）、PascalCase（類別、介面）

### Git Commit 規範
- `feat: 新增功能`
- `fix: 修復錯誤`
- `docs: 文檔更新`
- `refactor: 程式碼重構`
- `test: 測試相關`

## 🧪 測試

```bash
npm run test
```

## 📊 監控與日誌

- Cloudflare Workers 提供內建的監控和日誌
- 審計日誌存於 `AuditLogs` 表
- 所有 HTTP 請求都會記錄到 console

## 🔄 Cron Jobs

系統配置了以下定時任務：

- `0 0 1 1 *` - 每年1月1日：特休年初更新
- `0 0 1 * *` - 每月1日：任務自動生成 + 補休到期轉換
- `30 8 * * 1-5` - 週一到週五 08:30：工時填寫提醒
- `0 2 * * *` - 每天 02:00：資料庫備份
- `0 * * * *` - 每小時：失敗任務重試

## 📖 相關文檔

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Hono 文檔](https://hono.dev/)

## 📞 支援

如有問題，請參考 `docs/` 目錄下的完整技術規格文檔。

---

**版本：** 1.0.0  
**最後更新：** 2025-10-29

