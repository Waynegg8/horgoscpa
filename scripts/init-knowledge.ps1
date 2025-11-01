# 初始化知識庫 - PowerShell腳本
# 使用方法: .\scripts\init-knowledge.ps1

$API_BASE = "https://www.horgoscpa.com/internal/api/v1"

Write-Host "🚀 開始初始化知識庫..." -ForegroundColor Green
Write-Host ""

# 提示輸入登入資訊
$email = Read-Host "請輸入管理員Email"
$password = Read-Host "請輸入密碼" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host ""
Write-Host "🔐 正在登入..." -ForegroundColor Cyan

# 登入
$loginBody = @{
    email = $email
    password = $passwordText
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$API_BASE/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $loginBody `
    -SessionVariable session

if ($loginResponse.StatusCode -ne 200) {
    Write-Host "❌ 登入失敗" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 登入成功" -ForegroundColor Green
Write-Host ""

# 創建SOP函數
function Create-SOP {
    param(
        [string]$Title,
        [string]$Category,
        [string]$FilePath,
        [array]$Tags
    )
    
    Write-Host "📝 創建SOP: $Title" -ForegroundColor Cyan
    
    $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
    
    $body = @{
        title = $Title
        category = $Category
        content = $content
        tags = $Tags
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE/sop" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body $body `
            -WebSession $session
        
        Write-Host "✅ SOP創建成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ SOP創建失敗: $_" -ForegroundColor Red
    }
}

# 創建FAQ函數
function Create-FAQ {
    param(
        [string]$Question,
        [string]$Category,
        [string]$Answer,
        [array]$Tags
    )
    
    Write-Host "❓ 創建FAQ: $Question" -ForegroundColor Cyan
    
    $body = @{
        question = $Question
        category = $Category
        answer = $Answer
        tags = $Tags
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE/faq" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body $body `
            -WebSession $session
        
        Write-Host "✅ FAQ創建成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ FAQ創建失敗: $_" -ForegroundColor Red
    }
}

Write-Host "📚 開始初始化SOP..." -ForegroundColor Yellow
Write-Host ""

# 創建SOP 1: 記帳流程
Create-SOP -Title "記帳流程標準作業程序" `
    -Category "accounting" `
    -FilePath "templates\sop\記帳流程SOP.md" `
    -Tags @("記帳", "作業流程", "月結")

# 創建SOP 2: 營業稅申報
Create-SOP -Title "營業稅申報標準作業程序" `
    -Category "tax" `
    -FilePath "templates\sop\營業稅申報SOP.md" `
    -Tags @("稅務", "申報", "營業稅")

# 創建SOP 3: 客戶資料建檔
Create-SOP -Title "客戶資料建檔標準作業程序" `
    -Category "internal" `
    -FilePath "templates\sop\客戶資料建檔SOP.md" `
    -Tags @("客戶管理", "建檔", "流程")

Write-Host ""
Write-Host "❓ 開始初始化FAQ..." -ForegroundColor Yellow
Write-Host ""

# 創建FAQ範例
Create-FAQ -Question "如何申請特別休假？" `
    -Category "hr" `
    -Answer "<p>特別休假申請流程：</p><ol><li>填寫請假單</li><li>主管簽核</li><li>人事部門核准</li><li>系統登記</li></ol><p>注意事項：請假應提前3日申請，緊急情況請電話告知。</p>" `
    -Tags @("請假", "特休", "人事")

Create-FAQ -Question "營業稅申報期限是什麼時候？" `
    -Category "tax" `
    -Answer "<p><strong>雙月制營業人：</strong>奇數月1-15日申報</p><p><strong>每月申報：</strong>次月15日前申報</p><p>建議提前準備資料，避免逾期受罰。</p>" `
    -Tags @("營業稅", "申報", "期限")

Create-FAQ -Question "如何查詢客戶的財務報表？" `
    -Category "accounting" `
    -Answer "<p>查詢步驟：</p><ol><li>登入系統</li><li>進入「客戶管理」</li><li>選擇客戶</li><li>點選「財務報表」標籤</li><li>選擇年月查看</li></ol>" `
    -Tags @("客戶", "報表", "查詢")

Write-Host ""
Write-Host "✅ 知識庫初始化完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 請前往 https://www.horgoscpa.com/internal/knowledge 查看結果" -ForegroundColor Cyan
Write-Host ""

