# ============================================================
# 資料庫遷移執行腳本
# 用於執行 D1 資料庫遷移
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "霍爾果斯 - 資料庫遷移工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查是否安裝 Wrangler
Write-Host "檢查 Wrangler CLI..." -ForegroundColor Yellow
$wranglerVersion = npx wrangler --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Wrangler CLI 未安裝" -ForegroundColor Red
    Write-Host "請執行: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Wrangler 版本: $wranglerVersion" -ForegroundColor Green
Write-Host ""

# 顯示可用的遷移檔案
Write-Host "可用的遷移檔案:" -ForegroundColor Yellow
Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

# 選擇環境
Write-Host "請選擇執行環境:" -ForegroundColor Yellow
Write-Host "  1) 生產環境 (production)" -ForegroundColor Cyan
Write-Host "  2) 開發環境 (preview)" -ForegroundColor Cyan
Write-Host "  3) 本地環境 (local)" -ForegroundColor Cyan
Write-Host ""

$env = Read-Host "請輸入選項 (1-3)"

$dbEnv = switch ($env) {
    "1" { 
        Write-Host "⚠️ 警告：您正在對生產環境執行遷移！" -ForegroundColor Red
        $confirm = Read-Host "確定要繼續嗎？(yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "已取消" -ForegroundColor Yellow
            exit 0
        }
        "--remote"
    }
    "2" { 
        Write-Host "使用開發環境 (preview)" -ForegroundColor Green
        "--remote --env preview"
    }
    "3" { 
        Write-Host "使用本地環境 (local)" -ForegroundColor Green
        "--local"
    }
    default {
        Write-Host "無效的選項" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 選擇要執行的遷移
Write-Host "請選擇要執行的遷移:" -ForegroundColor Yellow
Write-Host "  0) 執行所有遷移" -ForegroundColor Cyan
Write-Host "  11) 011_recurring_tasks.sql - 週期性任務系統" -ForegroundColor Cyan
Write-Host "  custom) 輸入自訂遷移檔名" -ForegroundColor Cyan
Write-Host ""

$migration = Read-Host "請輸入選項"

$migrationFiles = @()

switch ($migration) {
    "0" {
        # 執行所有遷移
        $migrationFiles = Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name | Select-Object -ExpandProperty Name
        Write-Host "將執行所有 $($migrationFiles.Count) 個遷移檔案" -ForegroundColor Yellow
    }
    "11" {
        $migrationFiles = @("011_recurring_tasks.sql")
        Write-Host "將執行週期性任務遷移" -ForegroundColor Yellow
    }
    "custom" {
        $customFile = Read-Host "請輸入遷移檔案名稱 (例: 011_recurring_tasks.sql)"
        if (Test-Path "migrations/$customFile") {
            $migrationFiles = @($customFile)
        } else {
            Write-Host "❌ 找不到檔案: migrations/$customFile" -ForegroundColor Red
            exit 1
        }
    }
    default {
        Write-Host "無效的選項" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "開始執行遷移..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($file in $migrationFiles) {
    Write-Host "執行: $file" -ForegroundColor Yellow
    
    $command = "npx wrangler d1 execute timesheet-db $dbEnv --file=migrations/$file"
    Write-Host "  命令: $command" -ForegroundColor Gray
    
    try {
        Invoke-Expression $command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 成功" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ❌ 失敗 (錯誤代碼: $LASTEXITCODE)" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "  ❌ 執行錯誤: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "遷移執行完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "成功: $successCount | 失敗: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

# 驗證遷移結果
if ($failCount -eq 0) {
    Write-Host "✓ 所有遷移執行成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "建議接下來的步驟:" -ForegroundColor Yellow
    Write-Host "  1. 測試週期性任務功能: 開啟 recurring-tasks.html" -ForegroundColor Gray
    Write-Host "  2. 測試媒體庫功能: 開啟 content-editor.html" -ForegroundColor Gray
    Write-Host "  3. 部署更新: npm run deploy-prod" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠️ 部分遷移執行失敗，請檢查錯誤訊息" -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "按 Enter 鍵結束..."

