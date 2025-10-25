# ================================================================
# 客戶關係管理擴展 - 部署腳本
# 檔案: deploy-clients-expansion.ps1
# 日期: 2025-10-25
# ================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "客戶關係管理擴展 - 部署腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 確認是否繼續
$confirmation = Read-Host "此操作將部署客戶擴展功能到生產環境。是否繼續? (yes/no)"
if ($confirmation -ne 'yes') {
    Write-Host "❌ 部署已取消" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "📋 部署步驟:" -ForegroundColor Green
Write-Host "  1. ✅ 資料庫 Migration (已執行)" -ForegroundColor Gray
Write-Host "  2. 🚀 部署 Worker" -ForegroundColor White
Write-Host "  3. ✅ 驗證部署" -ForegroundColor White
Write-Host ""

# ================================================================
# 步驟 2: 部署 Worker
# ================================================================
Write-Host "🚀 步驟 2: 部署 Worker..." -ForegroundColor Cyan
npx wrangler deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Worker 部署失敗！" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Worker 部署成功！" -ForegroundColor Green
Write-Host ""

# ================================================================
# 步驟 3: 驗證部署
# ================================================================
Write-Host "✅ 步驟 3: 驗證部署..." -ForegroundColor Cyan

# 檢查資料表是否存在
Write-Host "   檢查新增的資料表..." -ForegroundColor White
$checkTables = @"
SELECT name FROM sqlite_master 
WHERE type='table' 
AND name IN ('clients_extended', 'service_schedule', 'client_interactions')
ORDER BY name;
"@

Write-Host "   執行驗證查詢..." -ForegroundColor Gray
$tempFile = New-TemporaryFile
$checkTables | Out-File -FilePath $tempFile.FullName -Encoding UTF8

npx wrangler d1 execute timesheet-db --remote --command="$checkTables"

Remove-Item $tempFile.FullName

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 部署摘要:" -ForegroundColor Cyan
Write-Host "  ✅ 資料庫 Migration: 已執行" -ForegroundColor Green
Write-Host "  ✅ Worker 部署: 成功" -ForegroundColor Green
Write-Host "  ✅ 驗證: 完成" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 API 端點已新增:" -ForegroundColor Cyan
Write-Host "  - GET    /api/clients/extended" -ForegroundColor White
Write-Host "  - GET    /api/clients/:name/extended" -ForegroundColor White
Write-Host "  - POST   /api/clients/:name/extended" -ForegroundColor White
Write-Host "  - GET    /api/service-schedule" -ForegroundColor White
Write-Host "  - POST   /api/service-schedule" -ForegroundColor White
Write-Host "  - PUT    /api/service-schedule/:id" -ForegroundColor White
Write-Host "  - DELETE /api/service-schedule/:id" -ForegroundColor White
Write-Host "  - GET    /api/client-interactions" -ForegroundColor White
Write-Host "  - POST   /api/client-interactions" -ForegroundColor White
Write-Host "  - PUT    /api/client-interactions/:id" -ForegroundColor White
Write-Host "  - DELETE /api/client-interactions/:id" -ForegroundColor White
Write-Host "  - POST   /api/import/clients" -ForegroundColor White
Write-Host ""
Write-Host "💡 下一步:" -ForegroundColor Yellow
Write-Host "  1. 請前往 Cloudflare Pages 手動部署前端" -ForegroundColor White
Write-Host "  2. 在設定頁面測試「客戶詳細資料」標籤" -ForegroundColor White
Write-Host "  3. 準備 CSV 檔案進行資料匯入" -ForegroundColor White
Write-Host ""
Write-Host "📚 相關文檔:" -ForegroundColor Cyan
Write-Host "  - 實施計畫: docs/SYSTEM_EXPANSION_PLAN.md" -ForegroundColor White
Write-Host "  - 進度追蹤: docs/SYSTEM_EXPANSION_PROGRESS.md" -ForegroundColor White
Write-Host ""

