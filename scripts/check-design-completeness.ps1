# Design Completeness Check Script
# Checks if all 23 modules have complete 4-layer documentation

Write-Host "Checking Design Completeness..." -ForegroundColor Cyan
Write-Host ""

$modules = @(
    @{id=1; name="员工权限设定"; folder="員工權限"},
    @{id=2; name="业务规则管理"; folder="業務規則"},
    @{id=3; name="服务项目管理"; folder="服務項目"},
    @{id=4; name="员工帐号管理"; folder="員工管理"},
    @{id=5; name="CSV导入功能"; folder="CSV導入"},
    @{id=6; name="仪表板"; folder="儀表板"},
    @{id=7; name="个人资料设定"; folder="個人資料"},
    @{id=8; name="工时表填写"; folder="工時管理"},
    @{id=9; name="加权工时计算"; folder="加權工時"},
    @{id=10; name="报表中心"; folder="報表中心"},
    @{id=11; name="假期登记"; folder="假期管理"},
    @{id=12; name="生活事件登记"; folder="生活事件"},
    @{id=13; name="假期余额查询"; folder="假期餘額"},
    @{id=14; name="任务模板管理"; folder="任務模板"},
    @{id=15; name="客户服务设定"; folder="客戶服務"},
    @{id=16; name="任务进度追踪"; folder="任務追蹤"},
    @{id=17; name="阶段进度更新"; folder="階段進度"},
    @{id=18; name="SOP文件管理"; folder="SOP管理"},
    @{id=19; name="客户专属SOP连结"; folder="客戶SOP"},
    @{id=20; name="通用知识库"; folder="知識庫"},
    @{id=21; name="外部文章管理"; folder="外部文章"},
    @{id=22; name="资源中心管理"; folder="資源中心"},
    @{id=23; name="客户管理"; folder="客戶管理"}
)

$totalModules = $modules.Count
$completeModules = 0
$incompleteModules = @()

foreach ($module in $modules) {
    $id = $module.id.ToString().PadLeft(2, '0')
    $name = $module.name
    $folder = $module.folder
    
    Write-Host "[$id] $name" -NoNewline
    
    # Check 4 layers
    $layer1 = Test-Path "docs/功能模塊/$id-*.md"
    $layer2TechExists = Test-Path "docs/技術規格/$folder"
    $layer2ApiExists = Test-Path "docs/API規格/$folder"
    $layer3 = Test-Path "docs/資料庫設計"
    
    # Count files in each layer
    $techFiles = 0
    $apiFiles = 0
    
    if ($layer2TechExists) {
        $techFiles = (Get-ChildItem "docs/技術規格/$folder" -Filter "*.md" -ErrorAction SilentlyContinue).Count
    }
    
    if ($layer2ApiExists) {
        $apiFiles = (Get-ChildItem "docs/API規格/$folder" -Filter "*.md" -ErrorAction SilentlyContinue).Count
    }
    
    # Determine completeness
    $isComplete = $layer1 -and ($techFiles -ge 2) -and ($apiFiles -ge 1)
    
    if ($isComplete) {
        Write-Host " [COMPLETE]" -ForegroundColor Green
        Write-Host "  - Functional: YES" -ForegroundColor Gray
        Write-Host "  - Technical: $techFiles files" -ForegroundColor Gray
        Write-Host "  - API: $apiFiles files" -ForegroundColor Gray
        $completeModules++
    } else {
        Write-Host " [INCOMPLETE]" -ForegroundColor Red
        if (-not $layer1) { Write-Host "  - Functional: MISSING" -ForegroundColor Red }
        if ($techFiles -lt 2) { Write-Host "  - Technical: $techFiles files (need 2+)" -ForegroundColor Yellow }
        if ($apiFiles -lt 1) { Write-Host "  - API: MISSING" -ForegroundColor Red }
        
        $incompleteModules += @{
            id = $id
            name = $name
            folder = $folder
            missing = @()
        }
        
        if (-not $layer1) { $incompleteModules[-1].missing += "功能模塊文檔" }
        if ($techFiles -lt 2) { $incompleteModules[-1].missing += "技術規格文檔" }
        if ($apiFiles -lt 1) { $incompleteModules[-1].missing += "API規格文檔" }
    }
    Write-Host ""
}

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Design Completeness Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Complete: $completeModules / $totalModules modules" -ForegroundColor Green
Write-Host "Progress: $([math]::Round($completeModules * 100 / $totalModules, 1))%" -ForegroundColor Cyan
Write-Host ""

if ($incompleteModules.Count -gt 0) {
    Write-Host "Incomplete Modules ($($incompleteModules.Count)):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($item in $incompleteModules) {
        Write-Host "[$($item.id)] $($item.name)" -ForegroundColor Yellow
        foreach ($miss in $item.missing) {
            Write-Host "  - Missing: $miss" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "=================================" -ForegroundColor Red
    Write-Host "ACTION REQUIRED" -ForegroundColor Red
    Write-Host "=================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "AI must complete these modules before saying 'all designs complete'" -ForegroundColor Red
    exit 1
} else {
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "ALL DESIGNS COMPLETE!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    exit 0
}

