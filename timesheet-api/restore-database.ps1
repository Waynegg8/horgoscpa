# 資料庫復原腳本 (Database Restore Script)
# 使用方式 (Usage): 
#   - 互動式選擇備份: .\restore-database.ps1
#   - 指定特定備份: .\restore-database.ps1 -BackupFile "backups/db-backup-20251025-190848.sql"

param(
    [string]$BackupFile = ""
)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      資料庫復原腳本 (Database Restore)     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 如果沒有指定備份檔案，顯示選單讓用戶選擇
if ([string]::IsNullOrEmpty($BackupFile)) {
    Write-Host "📂 搜尋可用的備份檔案..." -ForegroundColor Cyan
    Write-Host ""
    
    # 取得所有備份檔案並按日期排序（最新的在前）
    $backupFiles = Get-ChildItem backups/*.sql | Sort-Object LastWriteTime -Descending
    
    if ($backupFiles.Count -eq 0) {
        Write-Host "❌ 錯誤: 找不到任何備份檔案" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
    
    Write-Host "可用的備份檔案:" -ForegroundColor Yellow
    Write-Host ""
    
    # 顯示備份檔案選單
    for ($i = 0; $i -lt $backupFiles.Count; $i++) {
        $file = $backupFiles[$i]
        $number = $i + 1
        $date = Get-Date $file.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss'
        $size = [math]::Round($file.Length / 1KB, 2)
        
        Write-Host "  [$number] $($file.Name)" -ForegroundColor White
        Write-Host "      📅 日期: $date" -ForegroundColor Gray
        Write-Host "      📊 大小: $size KB" -ForegroundColor Gray
        Write-Host ""
    }
    
    # 讓用戶選擇
    Write-Host "請選擇要復原的備份檔案 (輸入編號 1-$($backupFiles.Count)，或輸入 Q 取消):" -ForegroundColor Yellow
    $selection = Read-Host "您的選擇"
    
    if ($selection -eq 'Q' -or $selection -eq 'q') {
        Write-Host ""
        Write-Host "✋ 已取消復原操作" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
    
    # 驗證輸入
    try {
        $selectedIndex = [int]$selection - 1
        if ($selectedIndex -lt 0 -or $selectedIndex -ge $backupFiles.Count) {
            Write-Host ""
            Write-Host "❌ 錯誤: 無效的選擇" -ForegroundColor Red
            Write-Host ""
            exit 1
        }
        $BackupFile = $backupFiles[$selectedIndex].FullName
    } catch {
        Write-Host ""
        Write-Host "❌ 錯誤: 無效的輸入" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
}

# 檢查備份檔案是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ 錯誤: 找不到備份檔案: $BackupFile" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📁 選定的備份檔案: $(Split-Path $BackupFile -Leaf)" -ForegroundColor Yellow
$fileInfo = Get-Item $BackupFile
Write-Host "📅 備份日期: $(Get-Date $fileInfo.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "📊 檔案大小: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 確認操作
Write-Host "⚠️  警告: 此操作將會覆蓋當前資料庫的所有資料！" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "確定要繼續嗎？ (輸入 Y 繼續，其他按鍵取消)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host ""
    Write-Host "✋ 已取消復原操作" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "開始復原程序..." -ForegroundColor Green
Write-Host ""

try {
    # 步驟 1: 建立緊急備份
    Write-Host "[1/4] 📦 建立緊急備份..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $emergencyBackup = "backups/emergency-backup-$timestamp.sql"
    
    npx wrangler d1 export timesheet-db --remote --output=$emergencyBackup
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 緊急備份已儲存至: $emergencyBackup" -ForegroundColor Green
    } else {
        throw "緊急備份失敗"
    }
    Write-Host ""

    # 步驟 2: 重建資料庫結構
    Write-Host "[2/4] 🔨 重建資料庫結構..." -ForegroundColor Cyan
    npx wrangler d1 execute timesheet-db --remote --file=migrations/001_complete_schema.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 資料庫結構已重建" -ForegroundColor Green
    } else {
        throw "重建資料庫結構失敗"
    }
    Write-Host ""

    # 步驟 3: 匯入備份資料
    Write-Host "[3/4] 📥 匯入備份資料..." -ForegroundColor Cyan
    npx wrangler d1 execute timesheet-db --remote --file=$BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 備份資料已匯入" -ForegroundColor Green
    } else {
        throw "匯入備份資料失敗"
    }
    Write-Host ""

    # 步驟 4: 驗證復原結果
    Write-Host "[4/4] 🔍 驗證復原結果..." -ForegroundColor Cyan
    npx wrangler d1 execute timesheet-db --remote --command="SELECT 'employees' as table_name, COUNT(*) as count FROM employees UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'clients', COUNT(*) FROM clients UNION ALL SELECT 'timesheets', COUNT(*) FROM timesheets UNION ALL SELECT 'holidays', COUNT(*) FROM holidays;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 資料驗證完成" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️ 資料驗證遇到問題，但復原可能已完成" -ForegroundColor Yellow
    }
    Write-Host ""

    # 成功訊息
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "      ✅ 資料庫復原完成！              " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 復原摘要:" -ForegroundColor Cyan
    Write-Host "  • 來源備份: $BackupFile" -ForegroundColor Gray
    Write-Host "  • 緊急備份: $emergencyBackup" -ForegroundColor Gray
    Write-Host "  • 完成時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 下一步:" -ForegroundColor Yellow
    Write-Host "  1. 前往 https://你的網址/login.html 測試登入" -ForegroundColor Gray
    Write-Host "  2. 確認工時表資料正確" -ForegroundColor Gray
    Write-Host "  3. 檢查員工與客戶資料" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "      ❌ 復原失敗                       " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "錯誤訊息: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 如需回復到復原前狀態，請執行:" -ForegroundColor Yellow
    Write-Host "   npx wrangler d1 execute timesheet-db --remote --file=$emergencyBackup" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

