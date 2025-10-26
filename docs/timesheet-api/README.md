# Timesheet API 文檔

**版本**: 2.0  
**最後更新**: 2025-10-26

---

## 📚 文檔列表

### [資料庫還原指南.md](./資料庫還原指南.md)
**資料庫備份與還原操作手冊**
- 備份資料庫步驟
- 還原資料庫步驟
- 常見問題排除
- 資料庫遷移注意事項

**適用對象**: 運維人員、開發人員

---

## 🔗 相關文檔

主要技術文檔請參考：
- [../API端點文檔.md](../API端點文檔.md) - 完整 API 參考
- [../客戶服務自動化系統設計.md](../客戶服務自動化系統設計.md) - 系統架構設計
- [../開發指南.md](../開發指南.md) - 開發規範

---

## 📂 專案結構

```
timesheet-api/
├── src/
│   ├── index.js          # 主入口文件
│   ├── auth.js           # 認證模組
│   ├── automated-tasks.js # 自動任務生成
│   ├── clients.js        # 客戶管理
│   ├── multi-stage-tasks.js # 多階段任務
│   └── ...
├── migrations/           # 資料庫遷移腳本
├── scripts/             # 工具腳本
├── test/                # 測試文件
├── wrangler.jsonc       # Cloudflare Workers 配置
└── package.json         # 專案依賴
```

---

## 🚀 本地開發

```bash
# 進入專案目錄
cd timesheet-api

# 安裝依賴
npm install

# 啟動本地開發服務器
npx wrangler dev --local --persist-to .wrangler/state

# 執行測試
npm test
```

---

## 📦 部署

```bash
# 部署到生產環境
npx wrangler deploy

# 部署到預覽環境
npx wrangler deploy --env preview
```

---

## 🗄️ 資料庫操作

### 執行遷移

```bash
# 本地環境
npx wrangler d1 execute timesheet-db --local --file=migrations/XXX.sql

# 生產環境
npx wrangler d1 execute timesheet-db --remote --file=migrations/XXX.sql
```

### 查詢資料

```bash
# 本地環境
npx wrangler d1 execute timesheet-db --local --command="SELECT * FROM users;"

# 生產環境
npx wrangler d1 execute timesheet-db --remote --command="SELECT * FROM users;"
```

詳細的資料庫還原指南請參閱 [資料庫還原指南.md](./資料庫還原指南.md)

---

## 🆘 需要幫助？

- **API 使用**: 參考 [../API端點文檔.md](../API端點文檔.md)
- **資料庫問題**: 查看 [資料庫還原指南.md](./資料庫還原指南.md)
- **開發問題**: 查閱 [../開發指南.md](../開發指南.md)

---

[返回主文檔目錄](../README.md)
