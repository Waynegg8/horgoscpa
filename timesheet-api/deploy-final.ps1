# ============================================================
# 最終部署腳本 - 部署所有新功能
# ============================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "最終部署到 Cloudflare Workers" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

try {
    # 1. 部署 Worker 代碼
    Write-Host "`n[步驟 1/2] 部署 Worker 代碼..." -ForegroundColor Yellow
    npx wrangler deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Worker 代碼已成功部署" -ForegroundColor Green
    } else {
        throw "Worker 部署失敗"
    }

    # 2. 提醒用戶
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "✓ 部署完成！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "`n已部署的新功能：" -ForegroundColor White
    Write-Host "  ✓ 週期性任務管理系統" -ForegroundColor White
    Write-Host "  ✓ 多階段任務追蹤系統" -ForegroundColor White
    Write-Host "  ✓ 專案5大類別支持（記帳、工商、財簽、稅簽、其他）" -ForegroundColor White
    Write-Host "  ✓ 客戶服務配置管理" -ForegroundColor White
    Write-Host "  ✓ 每月固定任務設置" -ForegroundColor White
    Write-Host "  ✓ 統一導航欄樣式" -ForegroundColor White
    
    Write-Host "`n新增頁面：" -ForegroundColor Yellow
    Write-Host "  • recurring-tasks.html - 週期性任務管理" -ForegroundColor White
    Write-Host "  • multi-stage-tasks.html - 多階段任務追蹤" -ForegroundColor White
    
    Write-Host "`n資料導入：" -ForegroundColor Yellow
    Write-Host "  1. 已解析活頁簿1.csv和活頁簿2.csv（Big5編碼）" -ForegroundColor White
    Write-Host "  2. 共227項服務配置已準備就緒" -ForegroundColor White
    Write-Host "  3. 使用 scripts/import_to_remote.py 導入數據" -ForegroundColor White
    
    Write-Host "`nAPI 端點：" -ForegroundColor Yellow
    Write-Host "  • /api/services/clients - 客戶服務配置" -ForegroundColor White
    Write-Host "  • /api/tasks/recurring - 週期性任務" -ForegroundColor White
    Write-Host "  • /api/tasks/multi-stage - 多階段任務" -ForegroundColor White
    Write-Host "  • /api/recurring-templates - 週期性任務模板" -ForegroundColor White
    Write-Host "  • /api/multi-stage-templates - 多階段任務模板" -ForegroundColor White

} catch {
    Write-Host "`n部署失敗：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

