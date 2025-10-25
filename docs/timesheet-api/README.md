# Timesheet API - Cloudflare Worker

工時管理系統後端 API，使用 Cloudflare Workers + D1 Database。

## 專案結構

```
timesheet-api/
├── src/
│   ├── index.js           # 主程式（含所有 API endpoints）
│   └── auth.js            # 認證模組
├── migrations/
│   ├── 001_complete_schema.sql  # 完整資料庫結構
│   └── 002_seed_data.sql        # 初始資料（員工、客戶、規則）
├── backups/               # 資料庫備份（不提交至 git）
│   └── db-backup-*.sql    # 定期備份檔案
├── wrangler.jsonc         # Worker 設定
└── package.json           # Node 依賴

```

## 快速開始

### 本機開發

```bash
# 安裝依賴
npm install

# 本機執行（使用本機 D1）
npx wrangler dev

# 本機存取
# http://localhost:8787
```

### 初次部署

```bash
# 1. 建立 D1 資料庫（如尚未建立）
npx wrangler d1 create timesheet-db

# 2. 複製 database_id 到 wrangler.jsonc

# 3. 執行 migrations（建立結構）
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 4. 匯入初始資料
npx wrangler d1 execute timesheet-db --remote --file=migrations/002_seed_data.sql

# 5. 部署 Worker
npx wrangler deploy
```

## 資料庫管理

### 匯出備份（重要！）

```bash
# 匯出完整資料庫到 backups/
npx wrangler d1 export timesheet-db --remote --output=backups/backup-$(date +%Y%m%d).sql

# Windows PowerShell
npx wrangler d1 export timesheet-db --remote --output=backups/backup-$(Get-Date -Format 'yyyyMMdd').sql
```

**建議定期備份頻率：**
- 開發階段：每週一次
- 正式環境：每日備份（可設定 GitHub Actions 自動化）

### 查詢資料

```bash
# 直接查詢
npx wrangler d1 execute timesheet-db --remote --command="SELECT * FROM employees;"

# 執行 SQL 檔案
npx wrangler d1 execute timesheet-db --remote --file=query.sql
```

### 更新規則

如果需要更新假期規則、加班費率等：

```bash
# 方式一：直接執行 SQL 指令
npx wrangler d1 execute timesheet-db --remote --command="UPDATE annual_leave_rules SET leave_days=16 WHERE seniority_years=11;"

# 方式二：建立新的 migration 檔案並執行
# 例如：migrations/003_update_rules.sql
npx wrangler d1 execute timesheet-db --remote --file=migrations/003_update_rules.sql
```

### 重置資料庫（危險！）

```bash
# 清空並重建（會刪除所有資料）
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql
npx wrangler d1 execute timesheet-db --remote --file=migrations/002_seed_data.sql
```

## API Endpoints

### 認證
- `POST /api/login` - 登入
- `POST /api/logout` - 登出
- `GET /api/auth/me` - 取得當前使用者
- `POST /api/auth/change-password` - 修改密碼

### 資料查詢（需認證）
- `GET /api/employees` - 員工列表
- `GET /api/clients?employee={name}` - 客戶列表
- `GET /api/business-types` - 業務類型
- `GET /api/leave-types` - 假別類型
- `GET /api/holidays?year={year}` - 國定假日
- `GET /api/leave-quota?employee={name}&year={year}` - 假別配額
- `GET /api/timesheet-data?employee={name}&year={year}&month={month}` - 工時資料

### 工時管理（需認證）
- `POST /api/save-timesheet` - 儲存工時

### 管理功能（需管理員權限）
- `GET /api/admin/users` - 使用者列表
- `POST /api/admin/users` - 新增使用者
- `PUT /api/admin/users/{id}` - 更新使用者
- `DELETE /api/admin/users/{id}` - 刪除使用者
- `GET /api/admin/employees` - 員工管理
- `POST /api/admin/employees` - 新增員工
- `PUT /api/admin/employees/{name}` - 更新員工
- `DELETE /api/admin/employees/{name}` - 刪除員工

完整 API 文件請參考根目錄的 `API_ENDPOINTS.md`

## 資料庫備份策略

### Git 版本控制

- ✅ **migrations/**：結構與規則變更，提交至 git
- ✅ **backups/ 最新檔**：每次重大變更後的備份，提交至 git
- ❌ **backups/ 舊檔**：本機保留，不提交（.gitignore 已設定）

### 自動化備份（建議）

可設定 GitHub Actions 每日自動備份：

```yaml
# .github/workflows/backup-d1.yml
name: Backup D1 Database
on:
  schedule:
    - cron: '0 2 * * *'  # 每日 2:00 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g wrangler
      - run: npx wrangler d1 export timesheet-db --remote --output=timesheet-api/backups/daily-backup.sql
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      - run: git add timesheet-api/backups/daily-backup.sql
      - run: git commit -m "chore: daily DB backup" || true
      - run: git push || true
```

## 常見問題

### Q: 如何回復到某個備份？

```bash
# 1. 確認備份檔案
ls timesheet-api/backups/

# 2. 重置資料庫
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 3. 匯入備份
npx wrangler d1 execute timesheet-db --remote --file=timesheet-api/backups/db-backup-YYYYMMDD.sql
```

### Q: 本機測試如何不影響正式資料庫？

使用 `--local` 而非 `--remote`：

```bash
# 本機開發資料庫
npx wrangler d1 execute timesheet-db --local --file=migrations/001_complete_schema.sql
npx wrangler d1 execute timesheet-db --local --file=migrations/002_seed_data.sql
npx wrangler dev
```

### Q: 如何新增員工或更新性別？

**方式一：透過前端設定頁**
- 登入工時系統 → 設定 → 員工管理 → 新增/編輯

**方式二：直接執行 SQL**

```bash
# 新增員工
npx wrangler d1 execute timesheet-db --remote --command="INSERT INTO employees (name, hire_date, gender) VALUES ('新員工', '2025-01-01', 'female');"

# 更新性別
npx wrangler d1 execute timesheet-db --remote --command="UPDATE employees SET gender='female' WHERE name='張紜蓁';"
```

## 環境變數

無需額外環境變數，資料庫綁定已在 `wrangler.jsonc` 設定。

## 部署

```bash
# 部署至正式環境
npx wrangler deploy

# 查看日誌
npx wrangler tail

# 查看已部署版本
npx wrangler deployments list
```

## 開發工具

- **Wrangler CLI**：Cloudflare Worker 本機開發與部署
- **D1 Dashboard**：https://dash.cloudflare.com/ → D1
- **Vitest**：單元測試（如需使用，見 `test/` 目錄）

## 安全注意事項

1. **密碼雜湊**：使用 SHA-256（可考慮升級至 bcrypt/argon2）
2. **Session 管理**：7 天過期，定期清理
3. **權限控制**：Admin/Employee 二級權限
4. **CORS**：目前允許所有來源，正式環境應限縮

---

最後更新：2025-10-25



