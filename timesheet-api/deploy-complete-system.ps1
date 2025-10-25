# ============================================================
# 完整系統部署腳本
# 部署所有新功能和改進
# ============================================================

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "霍爾果斯 CPA 系統完整部署" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# 1. 備份資料庫
Write-Host "[1/5] 備份當前資料庫..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "backups/complete-deploy-$timestamp.sql"
Write-Host "備份檔案: $backupFile" -ForegroundColor Gray

npx wrangler d1 export timesheet-db --remote --output=$backupFile
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 資料庫備份完成" -ForegroundColor Green
} else {
    Write-Host "✗ 資料庫備份失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. 執行多階段任務管理migration
Write-Host "[2/5] 執行資料庫遷移..." -ForegroundColor Yellow
Write-Host "  → 010_multi_stage_tasks.sql (多階段任務管理)" -ForegroundColor Gray

npx wrangler d1 execute timesheet-db --remote --file=migrations/010_multi_stage_tasks.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migration 執行完成" -ForegroundColor Green
} else {
    Write-Host "✗ Migration 執行失敗" -ForegroundColor Red
    Write-Host ""
    Write-Host "如需回滾，執行:" -ForegroundColor Yellow
    Write-Host "  npx wrangler d1 execute timesheet-db --remote --file=$backupFile" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 3. 驗證資料表
Write-Host "[3/5] 驗證資料表..." -ForegroundColor Yellow
$tables = @(
    "task_templates",
    "task_template_stages",
    "client_multi_stage_tasks",
    "client_task_stage_progress",
    "multi_stage_task_history"
)

foreach ($table in $tables) {
    $query = "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';"
    $result = npx wrangler d1 execute timesheet-db --remote --command="$query" 2>&1
    if ($result -match $table) {
        Write-Host "  ✓ $table" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $table" -ForegroundColor Red
    }
}

Write-Host ""

# 4. 部署 Worker
Write-Host "[4/5] 部署 Cloudflare Worker..." -ForegroundColor Yellow
npx wrangler deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Worker 部署完成" -ForegroundColor Green
} else {
    Write-Host "✗ Worker 部署失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 5. 總結
Write-Host "[5/5] 部署總結" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ 資料庫已備份: $backupFile" -ForegroundColor Green
Write-Host "✓ 多階段任務管理系統已部署" -ForegroundColor Green
Write-Host "✓ Worker 已更新" -ForegroundColor Green
Write-Host ""

Write-Host "新功能:" -ForegroundColor Cyan
Write-Host "  • 服務排程12個月可視化編輯" -ForegroundColor White
Write-Host "  • 客戶互動記錄管理" -ForegroundColor White
Write-Host "  • 完整的內容管理編輯器（Markdown）" -ForegroundColor White
Write-Host "  • 多階段任務管理（工商登記等）" -ForegroundColor White
Write-Host "  • CSV批量匯入準備就緒" -ForegroundColor White
Write-Host ""

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "後續步驟（選擇性）:" -ForegroundColor Yellow
Write-Host "1. 匯入CSV數據（如需要）:" -ForegroundColor Gray
Write-Host "   npx wrangler d1 execute timesheet-db --remote --file=migrations/009_import_csv_data.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 測試新功能:" -ForegroundColor Gray
Write-Host "   - 訪問 settings.html （客戶詳細資料）" -ForegroundColor Gray
Write-Host "   - 訪問 content-editor.html （內容管理）" -ForegroundColor Gray
Write-Host "   - 訪問 projects.html （專案管理）" -ForegroundColor Gray
Write-Host ""

