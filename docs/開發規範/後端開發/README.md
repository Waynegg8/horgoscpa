# 後端開發規範

**最後更新：** 2025年10月27日  
**適用範圍：** Cloudflare Workers API 後端開發

---

## 📋 文檔索引

本目錄包含所有後端開發相關的規範文檔，涵蓋專案架構、分層架構、API 設計、資料庫操作等各個方面。

### 1. 核心架構（必讀）

- **[專案架構](./專案架構.md)**
  - 目錄結構
  - 檔案組織
  - 模塊劃分

- **[分層架構](./分層架構.md)**
  - Repository 層（資料存取）
  - Service 層（業務邏輯）
  - Route 層（API 路由）
  - 層與層之間的互動

### 2. API 開發

- **[API 路由規範](./API路由規範.md)**
  - 路由定義
  - 中間件使用
  - 請求處理
  - 回應格式

- **[認證與授權](./認證與授權.md)**
  - 認證中間件
  - 權限檢查
  - Session 管理
  - 密碼處理

### 3. 資料存取

- **[資料庫操作](./資料庫操作.md)**
  - D1 Database 使用
  - SQL 查詢規範
  - 交易處理
  - 資料驗證

### 4. 部署與測試

- **[環境配置](./環境配置.md)**
  - wrangler.toml 配置
  - 環境變數
  - 多環境管理

- **[測試規範](./測試規範.md)**
  - 單元測試
  - 整合測試
  - E2E 測試

- **[部署規範](./部署規範.md)**
  - 部署流程
  - 版本管理
  - 錯誤追蹤

---

## 🎯 快速參考

### 分層架構

```
Route (路由層)
  ↓ 調用
Service (業務邏輯層)
  ↓ 調用
Repository (資料存取層)
  ↓ 操作
Database (資料庫)
```

### 標準 API 回應

```typescript
// 成功回應
{
  "success": true,
  "data": { ... }
}

// 錯誤回應
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}

// 分頁回應
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

### 常用命名規範

| 類型 | 命名規範 | 範例 |
|------|----------|------|
| Repository 類別 | `{Resource}Repository` | `ClientRepository` |
| Service 類別 | `{Resource}Service` | `ClientService` |
| 路由檔案 | `{resource}.routes.ts` | `clients.routes.ts` |
| 中間件 | `{purpose}.ts` | `auth.ts`, `permission.ts` |
| 類型定義 | `{resource}.ts` | `client.ts`, `api.ts` |

---

## ✅ 開發檢查清單

### Repository 層
- [ ] 只包含資料庫操作，無業務邏輯
- [ ] 使用 TypeScript 類型定義
- [ ] 錯誤處理使用 AppError
- [ ] 審計欄位正確更新

### Service 層
- [ ] 包含業務邏輯驗證
- [ ] 調用 Repository 進行資料操作
- [ ] 不直接操作資料庫
- [ ] 錯誤處理完整

### Route 層
- [ ] 使用中間件處理認證/授權
- [ ] 請求驗證完整
- [ ] 統一的回應格式
- [ ] 錯誤處理一致

### 資料庫操作
- [ ] 使用參數化查詢（防止 SQL 注入）
- [ ] 軟刪除而非硬刪除
- [ ] 審計欄位完整
- [ ] 索引使用正確

### 認證與授權
- [ ] 密碼使用 bcrypt 加密
- [ ] Session 存儲在 KV
- [ ] 權限檢查在 API 層
- [ ] Token 過期處理

---

## 🔗 相關文檔

- [前端開發規範](../前端開發/)
- [錯誤處理規範](../錯誤處理/)
- [命名規範](../命名規範/)
- [API 標準規範](../../API設計/)
- [資料庫設計](../../資料庫設計/)

---

**最後更新：** 2025年10月27日

