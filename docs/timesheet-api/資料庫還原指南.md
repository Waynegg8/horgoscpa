# 資料庫復原完整指南

## 復原情境與步驟

### 情境 1：從最新備份復原（推薦）

**適用情況**：誤刪資料、需要回到最近的穩定狀態

```bash
cd timesheet-api

# 步驟 1：確認最新備份存在
ls -la backups/daily-backup.sql

# 步驟 2：先備份當前狀態（以防萬一）
npx wrangler d1 export timesheet-db --remote --output=backups/before-restore-$(date +%Y%m%d-%H%M%S).sql

# 步驟 3：清空資料庫（重建結構）
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 步驟 4：匯入備份
npx wrangler d1 execute timesheet-db --remote --file=backups/daily-backup.sql

# 步驟 5：驗證資料
npx wrangler d1 execute timesheet-db --remote --command="SELECT COUNT(*) as employee_count FROM employees; SELECT COUNT(*) as user_count FROM users;"
```

**預期結果**：
- 員工、使用者、客戶等資料都已恢復
- 工時記錄完整
- 假期規則正確

---

### 情境 2：從特定日期備份復原

**適用情況**：需要回到某個特定時間點

```bash
cd timesheet-api

# 步驟 1：查看可用備份
ls -la backups/backup-*.sql

# 顯示範例：
# backup-20251020-190848.sql
# backup-20251021-190848.sql
# backup-20251022-190848.sql
# backup-20251025-190848.sql

# 步驟 2：選擇要復原的備份檔案
BACKUP_FILE="backups/backup-20251022-190848.sql"

# 步驟 3：先備份當前狀態
npx wrangler d1 export timesheet-db --remote --output=backups/before-restore-$(date +%Y%m%d-%H%M%S).sql

# 步驟 4：重建結構
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 步驟 5：匯入選定的備份
npx wrangler d1 execute timesheet-db --remote --file=$BACKUP_FILE

# 步驟 6：驗證
npx wrangler d1 execute timesheet-db --remote --command="SELECT name, hire_date, gender FROM employees;"
```

---

### 情境 3：從 Git 歷史中的備份復原

**適用情況**：最近的備份檔也有問題，需要回到更早的版本

```bash
cd timesheet-api

# 步驟 1：查看 git 歷史中的備份版本
git log --all --oneline --date=short -- backups/daily-backup.sql | head -20

# 顯示範例：
# a1b2c3d 2025-10-25 chore: daily database backup
# d4e5f6g 2025-10-24 chore: daily database backup
# h7i8j9k 2025-10-23 chore: daily database backup

# 步驟 2：選擇要復原的 commit hash（例如 10/23 的備份）
COMMIT_HASH="h7i8j9k"

# 步驟 3：從 git 歷史中提取備份檔
git show $COMMIT_HASH:timesheet-api/backups/daily-backup.sql > temp-restore.sql

# 步驟 4：先備份當前狀態
npx wrangler d1 export timesheet-db --remote --output=backups/before-restore-$(date +%Y%m%d-%H%M%S).sql

# 步驟 5：重建結構
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 步驟 6：匯入歷史備份
npx wrangler d1 execute timesheet-db --remote --file=temp-restore.sql

# 步驟 7：清理臨時檔
rm temp-restore.sql

# 步驟 8：驗證
npx wrangler d1 execute timesheet-db --remote --command="SELECT COUNT(*) FROM timesheets;"
```

---

### 情境 4：僅復原特定資料表

**適用情況**：只有某個表格需要復原，其他保持不變

```bash
cd timesheet-api

# 步驟 1：從備份中提取特定表格的資料
# 例如：只復原 employees 表

# 手動編輯備份檔，或使用 grep 提取
grep -A 1000 "INSERT INTO employees" backups/daily-backup.sql | grep -B 1 -m 1 "^$" > temp-employees.sql

# 或直接寫 SQL
cat > temp-restore-employees.sql << 'EOF'
-- 清空並復原 employees 表
DELETE FROM employees;
-- 從這裡複製備份檔中的 INSERT INTO employees 語句
INSERT INTO employees (name, hire_date, email, gender) VALUES ('莊凱閔', '2020-05-04', 'test@test.com', NULL);
INSERT INTO employees (name, hire_date, email, gender) VALUES ('張紜蓁', '2019-04-15', 'test@test.com', NULL);
-- ... 其他員工
EOF

# 步驟 2：執行部分復原
npx wrangler d1 execute timesheet-db --remote --file=temp-restore-employees.sql

# 步驟 3：驗證
npx wrangler d1 execute timesheet-db --remote --command="SELECT * FROM employees;"

# 步驟 4：清理
rm temp-restore-employees.sql
```

---

## 完整復原流程（生產環境）

### 復原前檢查

```bash
# 1. 確認要復原的備份檔案
ls -la timesheet-api/backups/

# 2. 查看備份檔案內容（前幾行）
head -50 timesheet-api/backups/daily-backup.sql

# 3. 確認備份完整性（檢查是否有 COMMIT 或完整的 INSERT）
tail -20 timesheet-api/backups/daily-backup.sql

# 4. 記錄當前資料庫狀態
npx wrangler d1 execute timesheet-db --remote --command="
SELECT 
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM timesheets) as timesheets,
  (SELECT COUNT(*) FROM clients) as clients;
"
```

### 執行復原

```bash
cd timesheet-api

# 步驟 1：【重要】先做完整備份
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
npx wrangler d1 export timesheet-db --remote --output=backups/emergency-backup-$TIMESTAMP.sql

echo "緊急備份已儲存至: backups/emergency-backup-$TIMESTAMP.sql"

# 步驟 2：停止所有寫入操作（建議）
# - 通知團隊暫停使用工時系統
# - 或在 Cloudflare Workers 設定中暫時停用

# 步驟 3：重建資料庫結構（清空所有資料）
echo "⚠️ 即將清空資料庫..."
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 步驟 4：匯入備份資料
echo "開始復原資料..."
npx wrangler d1 execute timesheet-db --remote --file=backups/daily-backup.sql

# 步驟 5：驗證復原結果
echo "驗證復原結果..."
npx wrangler d1 execute timesheet-db --remote --command="
SELECT 
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM timesheets) as timesheets,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM holidays) as holidays;
"
```

### 復原後驗證

```bash
# 1. 檢查關鍵資料表
npx wrangler d1 execute timesheet-db --remote --command="SELECT name, gender FROM employees;"
npx wrangler d1 execute timesheet-db --remote --command="SELECT username, role FROM users WHERE is_active=1;"

# 2. 檢查最近的工時記錄
npx wrangler d1 execute timesheet-db --remote --command="
SELECT employee_name, work_date, hours_normal 
FROM timesheets 
ORDER BY work_date DESC 
LIMIT 10;
"

# 3. 檢查假期規則
npx wrangler d1 execute timesheet-db --remote --command="
SELECT leave_type, leave_days, grant_type 
FROM other_leave_rules;
"

# 4. 測試登入（前端）
# - 前往 https://你的網址/login.html
# - 使用測試帳號登入
# - 確認可以看到工時表
```

---

## Windows PowerShell 版本

### 從最新備份復原

```powershell
cd timesheet-api

# 步驟 1：緊急備份當前狀態
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
npx wrangler d1 export timesheet-db --remote --output="backups/emergency-backup-$timestamp.sql"

# 步驟 2：重建結構
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 步驟 3：匯入備份
npx wrangler d1 execute timesheet-db --remote --file=backups/daily-backup.sql

# 步驟 4：驗證
npx wrangler d1 execute timesheet-db --remote --command="SELECT COUNT(*) as total FROM employees;"
```

### 從特定日期復原

```powershell
cd timesheet-api

# 步驟 1：查看可用備份
Get-ChildItem backups/backup-*.sql | Sort-Object LastWriteTime -Descending

# 步驟 2：選擇備份檔案
$backupFile = "backups/backup-20251022-190848.sql"

# 步驟 3：緊急備份
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
npx wrangler d1 export timesheet-db --remote --output="backups/emergency-backup-$timestamp.sql"

# 步驟 4：執行復原
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql
npx wrangler d1 execute timesheet-db --remote --file=$backupFile
```

---

## 常見問題

### Q1: 復原會影響線上服務嗎？

**A**: 會短暫中斷（約 10-30 秒）。建議：
1. 選擇低峰時段（凌晨）
2. 提前通知團隊
3. 或先復原到測試環境驗證

### Q2: 如何復原到測試環境？

**A**: 建立另一個 D1 資料庫用於測試：

```bash
# 1. 建立測試資料庫
npx wrangler d1 create timesheet-db-test

# 2. 更新 wrangler.jsonc，加入測試環境
# "d1_databases": [
#   { "binding": "DB", "database_name": "timesheet-db-test", "database_id": "測試DB的ID" }
# ]

# 3. 匯入備份至測試 DB
npx wrangler d1 execute timesheet-db-test --remote --file=migrations/001_complete_schema.sql
npx wrangler d1 execute timesheet-db-test --remote --file=backups/daily-backup.sql

# 4. 本機測試
npx wrangler dev
```

### Q3: 復原失敗怎麼辦？

**A**: 使用緊急備份：

```bash
# 如果復原過程失敗，用剛才的緊急備份恢復
npx wrangler d1 execute timesheet-db --remote --file=backups/emergency-backup-TIMESTAMP.sql
```

### Q4: 只想復原某個員工的資料？

**A**: 

```bash
# 1. 從備份中提取該員工的資料
# 手動編輯或用工具提取相關 INSERT 語句

# 2. 建立臨時 SQL
cat > temp-restore-one-employee.sql << 'EOF'
-- 先刪除該員工的所有資料
DELETE FROM timesheets WHERE employee_name = '張紜蓁';
DELETE FROM client_assignments WHERE employee_name = '張紜蓁';

-- 從備份中複製該員工的 INSERT 語句
INSERT INTO timesheets (...) VALUES (...);
-- ... 其他相關資料
EOF

# 3. 執行
npx wrangler d1 execute timesheet-db --remote --file=temp-restore-one-employee.sql
```

### Q5: 如何驗證復原成功？

**驗證清單**：

```bash
# 1. 檢查資料表數量
npx wrangler d1 execute timesheet-db --remote --command="
SELECT 
  'employees' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'timesheets', COUNT(*) FROM timesheets
UNION ALL
SELECT 'holidays', COUNT(*) FROM holidays;
"

# 2. 檢查最新資料
npx wrangler d1 execute timesheet-db --remote --command="
SELECT employee_name, work_date, hours_normal 
FROM timesheets 
ORDER BY work_date DESC 
LIMIT 5;
"

# 3. 檢查關鍵設定
npx wrangler d1 execute timesheet-db --remote --command="
SELECT * FROM annual_leave_rules ORDER BY seniority_years;
"

# 4. 測試登入（前端）
# 前往 login.html 並嘗試登入
# 帳號: admin, 密碼: admin123
```

---

## 自動化復原腳本（Windows PowerShell）

建立快速復原腳本 `restore-from-daily.ps1`：

```powershell
# restore-from-daily.ps1
param(
    [string]$BackupFile = "backups/daily-backup.sql"
)

Write-Host "=== 資料庫復原腳本 ===" -ForegroundColor Cyan
Write-Host "備份檔案: $BackupFile" -ForegroundColor Yellow

# 確認
$confirm = Read-Host "確定要復原嗎？這會覆蓋當前資料庫 (Y/N)"
if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "已取消" -ForegroundColor Red
    exit
}

# 緊急備份
Write-Host "步驟 1/4: 建立緊急備份..." -ForegroundColor Green
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
npx wrangler d1 export timesheet-db --remote --output="backups/emergency-backup-$timestamp.sql"

# 重建結構
Write-Host "步驟 2/4: 重建資料庫結構..." -ForegroundColor Green
npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql

# 匯入備份
Write-Host "步驟 3/4: 匯入備份資料..." -ForegroundColor Green
npx wrangler d1 execute timesheet-db --remote --file=$BackupFile

# 驗證
Write-Host "步驟 4/4: 驗證復原結果..." -ForegroundColor Green
npx wrangler d1 execute timesheet-db --remote --command="SELECT 'employees' as tbl, COUNT(*) as cnt FROM employees UNION ALL SELECT 'users', COUNT(*) FROM users;"

Write-Host "=== 復原完成 ===" -ForegroundColor Cyan
Write-Host "緊急備份已儲存至: backups/emergency-backup-$timestamp.sql" -ForegroundColor Yellow
```

**使用方式**：

```powershell
# 從最新備份復原
.\restore-from-daily.ps1

# 從特定備份復原
.\restore-from-daily.ps1 -BackupFile "backups/backup-20251022-190848.sql"
```

---

## 進階：部分資料復原

### 只復原規則（不動工時資料）

```bash
cd timesheet-api

# 建立僅含規則的 SQL
cat > temp-restore-rules.sql << 'EOF'
-- 清空規則表
DELETE FROM annual_leave_rules;
DELETE FROM other_leave_rules;
DELETE FROM overtime_rates;
DELETE FROM system_parameters;

-- 從完整備份中複製以下段落：
-- (手動複製備份檔中的對應 INSERT 語句)
EOF

# 執行
npx wrangler d1 execute timesheet-db --remote --file=temp-restore-rules.sql
```

### 只復原工時資料（不動設定）

```bash
# 清空工時資料
npx wrangler d1 execute timesheet-db --remote --command="DELETE FROM timesheets;"

# 從備份中提取工時資料
grep "INSERT INTO timesheets" backups/daily-backup.sql > temp-timesheets.sql

# 匯入
npx wrangler d1 execute timesheet-db --remote --file=temp-timesheets.sql
```

---

## 災難復原計劃

### 如果所有備份都遺失

1. **從 Git 歷史重建**：
   ```bash
   # 回到最後一次有效的 commit
   git checkout LAST_GOOD_COMMIT -- timesheet-api/backups/daily-backup.sql
   # 復原資料庫
   cd timesheet-api
   npx wrangler d1 execute timesheet-db --remote --file=backups/daily-backup.sql
   ```

2. **從 migrations 重建基礎**：
   ```bash
   # 重建空白資料庫
   npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql
   npx wrangler d1 execute timesheet-db --remote --file=migrations/002_seed_data.sql
   # 手動重新輸入工時資料（或從 Excel 匯入）
   ```

3. **聯絡 Cloudflare 支援**：
   - 開啟 Support Ticket
   - 詢問是否有 point-in-time recovery 選項

---

## 復原驗證檢查清單

復原後務必檢查：

- [ ] 員工數量正確
- [ ] 使用者可登入（測試 admin 與員工帳號）
- [ ] 客戶列表完整
- [ ] 客戶指派關係正確
- [ ] 假期規則完整（特休、事假、病假等）
- [ ] 國定假日資料正確
- [ ] 工時記錄完整（檢查最近一週）
- [ ] 前端系統功能正常
  - [ ] 工時表可載入
  - [ ] 報表可生成
  - [ ] 設定頁可編輯

---

## 預防措施

### 1. 多重備份策略

- ✅ GitHub 每日自動備份
- ✅ 本機定期下載備份（每週）
- 🔜 第三方備份（Google Drive / Dropbox）

### 2. 測試復原流程

**建議每月執行一次測試復原**：

```bash
# 在測試環境執行完整復原流程
# 確保備份可用、流程熟悉
```

### 3. 監控備份狀態

- 檢查 GitHub Actions 是否每天成功執行
- 確認 backups/ 目錄有最新檔案
- 驗證備份檔案大小合理（不為 0KB）

---

## 緊急聯絡

- 技術負責人：[姓名/Email]
- Cloudflare Account Owner：[姓名/Email]
- GitHub Repository Admin：[姓名/Email]

---

**記住：復原前永遠先做緊急備份！**


