# 快速部署腳本
Write-Host "部署Worker..." -ForegroundColor Cyan
npx wrangler deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "部署成功！" -ForegroundColor Green
} else {
    Write-Host "部署失敗" -ForegroundColor Red
    exit 1
}

