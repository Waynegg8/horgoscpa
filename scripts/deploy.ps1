# 自動部署腳本
# 用法: .\scripts\deploy.ps1

param(
    [string]$Message = ""
)

# 設定編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  自動部署到 Cloudflare Pages" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. 檢查 Git 狀態
Write-Host "1️⃣ 檢查修改的文件..." -ForegroundColor Blue
git status

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Git 狀態檢查失敗！" -ForegroundColor Red
    exit 1
}

# 2. 添加所有修改
Write-Host "`n2️⃣ 添加文件到 Git..." -ForegroundColor Blue
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ 添加文件失敗！" -ForegroundColor Red
    exit 1
}

# 3. 提交
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "`n請輸入提交訊息（繁體中文）"
}

Write-Host "`n3️⃣ 提交代碼..." -ForegroundColor Blue
Write-Host "   訊息: $Message" -ForegroundColor Gray
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️ 沒有需要提交的變更，或提交失敗。" -ForegroundColor Yellow
    
    # 檢查是否真的沒有變更
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "沒有需要部署的變更。" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "提交失敗！請檢查錯誤訊息。" -ForegroundColor Red
        exit 1
    }
}

# 4. 推送到遠端
Write-Host "`n4️⃣ 推送到遠端倉庫..." -ForegroundColor Blue
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  ✅ 部署成功！" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "代碼已成功推送到 GitHub！" -ForegroundColor Green
    Write-Host "Cloudflare Pages 正在自動建置和部署..." -ForegroundColor Cyan
    Write-Host "`n預計需要 1-3 分鐘完成部署。" -ForegroundColor Yellow
    Write-Host "`n請訪問以下網址驗證：" -ForegroundColor Cyan
    Write-Host "https://horgoscpa.pages.dev" -ForegroundColor White
    
    Write-Host "`n或到 Cloudflare Dashboard 查看建置狀態：" -ForegroundColor Cyan
    Write-Host "https://dash.cloudflare.com/" -ForegroundColor White
    
} else {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  ❌ 部署失敗！" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "推送到遠端倉庫失敗！" -ForegroundColor Red
    Write-Host "請檢查以下項目：" -ForegroundColor Yellow
    Write-Host "  1. 網路連接是否正常" -ForegroundColor Gray
    Write-Host "  2. Git 遠端設定是否正確" -ForegroundColor Gray
    Write-Host "  3. 是否有權限推送到倉庫" -ForegroundColor Gray
    
    Write-Host "`n檢查遠端設定：" -ForegroundColor Cyan
    git remote -v
    
    exit 1
}

