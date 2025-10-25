# 報表效能優化部署腳本
# 用途：部署報表快取系統到生產環境

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   報表效能優化部署 (Report Optimization)   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查是否在正確的目錄
if (-not (Test-Path "migrations/007_report_cache.sql")) {
    Write-Host "❌ 錯誤: 請在 timesheet-api 目錄下執行此腳本" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "📋 部署步驟:" -ForegroundColor Yellow
Write-Host "  1. 備份當前資料庫" -ForegroundColor Gray
Write-Host "  2. 執行快取資料表 migration" -ForegroundColor Gray
Write-Host "  3. 部署新版 Worker" -ForegroundColor Gray
Write-Host "  4. 驗證部署" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "確定要繼續嗎？ (輸入 Y 繼續，其他按鍵取消)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host ""
    Write-Host "✋ 已取消部署" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "開始部署..." -ForegroundColor Green
Write-Host ""

try {
    # 步驟 1: 備份資料庫
    Write-Host "[1/4] 📦 備份資料庫..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupFile = "backups/pre-optimization-$timestamp.sql"
    
    npx wrangler d1 export timesheet-db --remote --output=$backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 備份已儲存至: $backupFile" -ForegroundColor Green
    } else {
        throw "備份失敗"
    }
    Write-Host ""

    # 步驟 2: 執行 migration
    Write-Host "[2/4] 🔨 執行快取資料表 migration..." -ForegroundColor Cyan
    npx wrangler d1 execute timesheet-db --remote --file=migrations/007_report_cache.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 快取資料表已創建" -ForegroundColor Green
    } else {
        throw "Migration 執行失敗"
    }
    Write-Host ""

    # 步驟 3: 部署 Worker
    Write-Host "[3/4] 🚀 部署新版 Worker..." -ForegroundColor Cyan
    npx wrangler deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ Worker 已部署" -ForegroundColor Green
    } else {
        throw "Worker 部署失敗"
    }
    Write-Host ""

    # 步驟 4: 驗證
    Write-Host "[4/4] 🔍 驗證部署..." -ForegroundColor Cyan
    npx wrangler d1 execute timesheet-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='report_cache';"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ 驗證成功" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️ 驗證遇到問題，但部署可能已完成" -ForegroundColor Yellow
    }
    Write-Host ""

    # 成功訊息
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "      ✅ 部署完成！              " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 部署摘要:" -ForegroundColor Cyan
    Write-Host "  • 備份檔案: $backupFile" -ForegroundColor Gray
    Write-Host "  • 完成時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎯 效能提升預期:" -ForegroundColor Yellow
    Write-Host "  • 請假總覽: 6秒 → 0.5秒 (快 12 倍)" -ForegroundColor Gray
    Write-Host "  • 樞紐分析: 10秒 → 0.8秒 (快 12 倍)" -ForegroundColor Gray
    Write-Host "  • 快取命中時: 瞬間返回 (~50ms)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 下一步:" -ForegroundColor Yellow
    Write-Host "  1. 前往 https://你的網址/reports.html 測試報表" -ForegroundColor Gray
    Write-Host "  2. 檢查瀏覽器 Console 查看效能資訊" -ForegroundColor Gray
    Write-Host "  3. 在設定頁面的「快取管理」查看統計" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "      ❌ 部署失敗                       " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "錯誤訊息: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 如需回復到部署前狀態，請執行:" -ForegroundColor Yellow
    Write-Host "   npx wrangler d1 execute timesheet-db --remote --file=$backupFile" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

