# GitHub Actions 自動備份設定指南

## 目的

每天自動備份 Cloudflare D1 資料庫到 GitHub repository，確保資料安全。

## 設定步驟

### 1. 取得 Cloudflare API Token

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 右上角「My Profile」→「API Tokens」
3. 點擊「Create Token」
4. 選擇「Create Custom Token」
5. 設定權限：
   - **Account** > **D1** > **Edit**
   - **Account** > **Workers Scripts** > **Read**（選用）
6. 設定 Account Resources：選擇你的帳號
7. 點擊「Continue to summary」→「Create Token」
8. **複製 Token**（只會顯示一次！）

### 2. 取得 Cloudflare Account ID

1. 在 Cloudflare Dashboard 右側欄
2. 找到「Account ID」
3. 點擊複製

### 3. 設定 GitHub Secrets

1. 前往你的 GitHub Repository
2. 點擊「Settings」→「Secrets and variables」→「Actions」
3. 點擊「New repository secret」
4. 新增以下兩個 secrets：

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 貼上步驟 1 複製的 API Token
   
   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: 貼上步驟 2 複製的 Account ID

5. 點擊「Add secret」儲存

### 4. 驗證設定

1. 前往 GitHub Repository
2. 點擊「Actions」標籤
3. 選擇「Daily Database Backup」
4. 點擊「Run workflow」→「Run workflow」（手動觸發測試）
5. 等待執行完成（約 1-2 分鐘）
6. 檢查是否有新的 commit「chore: daily database backup」
7. 確認 `timesheet-api/backups/daily-backup.sql` 已更新

## 備份策略

### 自動備份

- **頻率**：每天 UTC 18:00（台北時間 02:00 AM）
- **檔案**：
  - `timesheet-api/backups/daily-backup.sql`（每日覆寫，提交至 git）
  - `timesheet-api/backups/backup-YYYYMMDD-HHMMSS.sql`（時間戳記版本，保留 30 天）

### Git 版本控制

- ✅ `daily-backup.sql`：每日覆寫並提交，追蹤資料庫變更歷史
- ✅ 最近 30 天的時間戳記備份：自動清理舊檔
- ❌ 超過 30 天的備份：自動刪除（避免 repo 肥大）

### 手動備份

需要立即備份時：

```bash
# 本機執行
cd timesheet-api
npx wrangler d1 export timesheet-db --remote --output=backups/manual-backup-$(date +%Y%m%d).sql

# 提交至 git
git add backups/
git commit -m "chore: manual database backup"
git push
```

或在 GitHub 手動觸發 workflow：
- Actions → Daily Database Backup → Run workflow

## 還原資料庫

### 從最新備份還原

```bash
cd timesheet-api

# 1. 重建結構
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 2. 匯入備份
npx wrangler d1 execute timesheet-db --remote --file=backups/daily-backup.sql
```

### 從歷史備份還原

```bash
# 查看可用備份
ls timesheet-api/backups/backup-*.sql

# 選擇特定日期還原
npx wrangler d1 execute timesheet-db --remote --file=backups/backup-20251025-190848.sql
```

### 從 Git 歷史還原

```bash
# 查看某個日期的備份版本
git log --all --pretty=format:"%h %ad %s" --date=short -- timesheet-api/backups/daily-backup.sql

# 檢出特定版本
git show COMMIT_HASH:timesheet-api/backups/daily-backup.sql > temp-restore.sql

# 匯入
npx wrangler d1 execute timesheet-db --remote --file=temp-restore.sql
```

## 監控與告警

### 檢查備份狀態

1. GitHub Repository → Actions
2. 查看「Daily Database Backup」workflow 執行狀態
3. 如果失敗會在 Actions 頁面顯示紅色 ❌

### Email 通知（選用）

在 workflow 加入通知步驟：

```yaml
- name: Notify on Failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: ⚠️ Database Backup Failed
    to: admin@horgoscpa.com
    from: GitHub Actions
    body: Daily database backup failed. Check GitHub Actions logs.
```

## 常見問題

### Q: 備份會不會讓 repository 太大？

A: 有自動清理機制，只保留 30 天內的備份。`daily-backup.sql` 每日覆寫，git 歷史可追溯。

### Q: 備份過程會影響資料庫運作嗎？

A: Cloudflare D1 export 是非阻塞式，不影響線上服務。

### Q: 如何停用自動備份？

A: 
1. 前往 `.github/workflows/daily-db-backup.yml`
2. 刪除或註解掉 `schedule` 區塊
3. Commit 並 push

### Q: Cloudflare API Token 權限太大有安全疑慮？

A: 建議：
1. 使用「Custom Token」而非「Global API Key」
2. 僅給予 D1 Edit 權限
3. 定期輪換 Token（每 90 天）
4. 設定 Token IP 白名單（GitHub Actions IP 範圍）

## 首次設定檢查清單

- [ ] 取得 Cloudflare API Token
- [ ] 取得 Cloudflare Account ID
- [ ] 在 GitHub 設定 Secrets
- [ ] 手動觸發一次 workflow 測試
- [ ] 確認 commit 自動提交
- [ ] 檢查 backups/ 目錄有新檔案
- [ ] 驗證可成功還原

---

設定完成後，每天都會自動備份，無需人工介入！


