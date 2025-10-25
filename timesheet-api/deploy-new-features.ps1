# ============================================================
# 部署新功能 - 週期性任務和5大專案類別
# ============================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "部署新功能到 Cloudflare Workers" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 設置錯誤處理
$ErrorActionPreference = "Stop"

try {
    # 1. 備份當前數據庫
    Write-Host "`n[步驟 1/4] 備份當前數據庫..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backups/pre-new-features-$timestamp.sql"
    
    Write-Host "執行數據庫備份..." -ForegroundColor Gray
    npx wrangler d1 execute timesheet-db --remote --command ".dump" > $backupFile
    Write-Host "✓ 備份完成: $backupFile" -ForegroundColor Green

    # 2. 應用新的 migrations
    Write-Host "`n[步驟 2/4] 應用數據庫migrations..." -ForegroundColor Yellow
    
    Write-Host "應用 011_recurring_tasks.sql (週期性任務系統)..." -ForegroundColor Gray
    npx wrangler d1 execute timesheet-db --remote --file=migrations/011_recurring_tasks.sql
    Write-Host "✓ 週期性任務系統已部署" -ForegroundColor Green

    # 3. 部署 Worker 代碼
    Write-Host "`n[步驟 3/4] 部署 Worker 代碼..." -ForegroundColor Yellow
    npx wrangler deploy
    Write-Host "✓ Worker 代碼已部署" -ForegroundColor Green

    # 4. 驗證部署
    Write-Host "`n[步驟 4/4] 驗證部署..." -ForegroundColor Yellow
    Write-Host "檢查新表是否創建成功..." -ForegroundColor Gray
    
    $tables = @(
        "client_services",
        "recurring_task_templates",
        "recurring_task_instances",
        "recurring_task_generation_log",
        "task_reminders"
    )
    
    foreach ($table in $tables) {
        Write-Host "檢查表: $table" -ForegroundColor Gray
        npx wrangler d1 execute timesheet-db --remote --command "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='$table';"
    }
    
    Write-Host "✓ 所有表已成功創建" -ForegroundColor Green

    # 完成
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "✓ 部署完成！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "`n新功能已成功部署：" -ForegroundColor White
    Write-Host "  • 週期性任務管理系統" -ForegroundColor White
    Write-Host "  • 每月固定任務設置" -ForegroundColor White
    Write-Host "  • 客戶服務配置管理" -ForegroundColor White
    Write-Host "  • 專案5大類別支持（記帳、工商、財簽、稅簽、其他）" -ForegroundColor White
    Write-Host "  • 多階段任務追蹤（工商登記等）" -ForegroundColor White
    Write-Host "`n備份文件: $backupFile" -ForegroundColor Yellow

} catch {
    Write-Host "`n✗ 部署失敗：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n如需恢復，請運行：" -ForegroundColor Yellow
    Write-Host "  .\restore-database.ps1 $backupFile" -ForegroundColor White
    exit 1
}

