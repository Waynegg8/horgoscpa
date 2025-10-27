# Design Quality Analysis Script
# Analyzes design completeness, consistency, and quality

Write-Host "=== Design Quality Analysis ===" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# 1. Core Architecture Documents
Write-Host "1. Core Architecture" -ForegroundColor Yellow

$requiredCoreFiles = @(
    "docs/架構設計/安全設計.md",
    "docs/架構設計/效能優化.md",
    "docs/架構設計/資料流向範例.md",
    "docs/架構設計/權限系統設計.md"
)

foreach ($file in $requiredCoreFiles) {
    if (Test-Path $file) {
        $lines = (Get-Content $file -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
        if ($lines -gt 50) {
            Write-Host "  OK: $(Split-Path $file -Leaf) ($lines lines)" -ForegroundColor Green
        } else {
            Write-Host "  WARN: $(Split-Path $file -Leaf) (only $lines lines)" -ForegroundColor Yellow
            $warnings += "Architecture doc too short: $file"
        }
    } else {
        Write-Host "  MISSING: $(Split-Path $file -Leaf)" -ForegroundColor Red
        $issues += "Missing architecture doc: $file"
    }
}

Write-Host ""

# 2. 4-Layer Pyramid Check for Each Module
Write-Host "2. 4-Layer Pyramid Completeness" -ForegroundColor Yellow

$modules = 1..23
$incomplete = @()

foreach ($i in $modules) {
    $id = $i.ToString().PadLeft(2, '0')
    
    # Layer 1: Functional Module
    $funcFile = Get-ChildItem "docs/功能模塊" -Filter "$id-*.md" -ErrorAction SilentlyContinue
    $hasFunc = $funcFile -ne $null
    
    # Layer 2: Technical Specs (should have 2+ files)
    $techCount = 0
    $possibleTechDirs = @(
        "員工權限", "業務規則", "服務項目", "員工管理", "CSV導入",
        "儀表板", "個人資料", "工時管理", "加權工時", "報表中心",
        "假期管理", "生活事件", "假期餘額", "任務模板", "客戶服務",
        "任務追蹤", "階段進度", "SOP管理", "客戶SOP", "知識庫",
        "外部文章", "資源中心", "客戶管理"
    )
    
    foreach ($dir in $possibleTechDirs) {
        if (Test-Path "docs/技術規格/$dir") {
            $techCount = (Get-ChildItem "docs/技術規格/$dir" -Filter "*.md" -ErrorAction SilentlyContinue).Count
            if ($techCount -gt 0) { break }
        }
    }
    
    # Layer 3: API Specs (should have 1+ files)
    $apiCount = 0
    $possibleApiDirs = @(
        "員工權限", "業務規則", "服務項目", "員工管理", "CSV導入",
        "儀表板", "個人資料", "工時管理", "加權工時", "報表中心",
        "假期管理", "生活事件", "任務管理", "客戶服務",
        "SOP管理", "客戶SOP", "知識庫", "外部文章", "資源中心",
        "客戶管理", "認證"
    )
    
    foreach ($dir in $possibleApiDirs) {
        if (Test-Path "docs/API規格/$dir") {
            $apiCount = (Get-ChildItem "docs/API規格/$dir" -Filter "*.md" -Recurse -ErrorAction SilentlyContinue).Count
            if ($apiCount -gt 0) { break }
        }
    }
    
    $status = "OK"
    $color = "Green"
    
    if (-not $hasFunc) {
        $status = "MISSING FUNC"
        $color = "Red"
        $incomplete += "Module $id: Missing functional document"
    } elseif ($techCount -lt 2) {
        $status = "INCOMPLETE TECH ($techCount files)"
        $color = "Yellow"
        $warnings += "Module $id: Insufficient technical specs ($techCount < 2)"
    } elseif ($apiCount -lt 1) {
        $status = "MISSING API"
        $color = "Yellow"
        $warnings += "Module $id: Missing API specs"
    }
    
    Write-Host "  Module $id`: $status" -ForegroundColor $color
}

Write-Host ""

# 3. Cross-Reference Integrity
Write-Host "3. Cross-Reference Integrity" -ForegroundColor Yellow

$brokenRefs = 0
$funcFiles = Get-ChildItem "docs/功能模塊" -Filter "*.md" | Where-Object { $_.Name -match '^\d+-' }

foreach ($file in $funcFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    # Check for broken links to technical specs
    if ($content -match '\[.*?\]\(\.\./\.\.\/技術規格\/([^)]+)\)') {
        $refPath = "docs/技術規格/$($matches[1])"
        if (-not (Test-Path $refPath)) {
            $brokenRefs++
            Write-Host "  BROKEN: $($file.Name) -> $refPath" -ForegroundColor Red
        }
    }
    
    # Check for broken links to API specs
    if ($content -match '\[.*?\]\(\.\./\.\.\/API規格\/([^)]+)\)') {
        $refPath = "docs/API規格/$($matches[1])"
        if (-not (Test-Path $refPath)) {
            $brokenRefs++
            Write-Host "  BROKEN: $($file.Name) -> $refPath" -ForegroundColor Red
        }
    }
}

if ($brokenRefs -eq 0) {
    Write-Host "  OK: No broken references found" -ForegroundColor Green
} else {
    Write-Host "  WARN: $brokenRefs broken references" -ForegroundColor Yellow
    $warnings += "$brokenRefs broken cross-references found"
}

Write-Host ""

# 4. Naming Consistency
Write-Host "4. Naming Consistency" -ForegroundColor Yellow

# Check database table naming (should be PascalCase)
$dbFiles = Get-ChildItem "docs/資料庫設計" -Filter "*.md" -Recurse -ErrorAction SilentlyContinue
$badTableNames = 0

foreach ($file in $dbFiles) {
    $tableName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($tableName -match '^[a-z]' -or $tableName -match '_') {
        $badTableNames++
        Write-Host "  WARN: Table name not PascalCase: $tableName" -ForegroundColor Yellow
    }
}

if ($badTableNames -eq 0) {
    Write-Host "  OK: All table names follow PascalCase convention" -ForegroundColor Green
} else {
    Write-Host "  WARN: $badTableNames table names not following convention" -ForegroundColor Yellow
    $warnings += "$badTableNames table names not PascalCase"
}

Write-Host ""

# 5. Document Quality Metrics
Write-Host "5. Document Quality Metrics" -ForegroundColor Yellow

$funcFiles = Get-ChildItem "docs/功能模塊" -Filter "*.md" | Where-Object { $_.Name -match '^\d+-' }
$tooShort = 0
$tooLong = 0

foreach ($file in $funcFiles) {
    $lines = (Get-Content $file.FullName | Measure-Object -Line).Lines
    
    if ($lines -lt 60) {
        $tooShort++
        Write-Host "  SHORT: $($file.Name) ($lines lines < 60)" -ForegroundColor Yellow
    } elseif ($lines -gt 500) {
        $tooLong++
        Write-Host "  LONG: $($file.Name) ($lines lines > 500)" -ForegroundColor Yellow
    }
}

if ($tooShort -eq 0 -and $tooLong -eq 0) {
    Write-Host "  OK: All functional modules have appropriate length" -ForegroundColor Green
} else {
    Write-Host "  WARN: $tooShort too short, $tooLong too long" -ForegroundColor Yellow
    if ($tooShort -gt 0) { $warnings += "$tooShort functional docs too short (<60 lines)" }
    if ($tooLong -gt 0) { $warnings += "$tooLong functional docs too long (>500 lines)" }
}

Write-Host ""

# 6. Automation Scripts
Write-Host "6. Automation Scripts" -ForegroundColor Yellow

$cronFiles = Get-ChildItem "docs/自動化流程" -Filter "*.md" -ErrorAction SilentlyContinue
$emptyCron = 0

foreach ($file in $cronFiles) {
    $size = $file.Length
    if ($size -lt 1000) {
        $emptyCron++
        Write-Host "  WARN: $($file.Name) is too small ($size bytes)" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: $($file.Name) ($([math]::Round($size/1024, 1)) KB)" -ForegroundColor Green
    }
}

if ($emptyCron -gt 0) {
    $warnings += "$emptyCron automation docs incomplete"
}

Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Design Quality Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "EXCELLENT: All design quality checks passed!" -ForegroundColor Green
    exit 0
} elseif ($issues.Count -eq 0) {
    Write-Host "GOOD: No critical issues found" -ForegroundColor Green
    Write-Host "Warnings: $($warnings.Count)" -ForegroundColor Yellow
    Write-Host ""
    foreach ($w in $warnings) {
        Write-Host "  - $w" -ForegroundColor Yellow
    }
    exit 0
} else {
    Write-Host "ISSUES FOUND: $($issues.Count) critical" -ForegroundColor Red
    Write-Host "Warnings: $($warnings.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Critical Issues:" -ForegroundColor Red
    foreach ($i in $issues) {
        Write-Host "  - $i" -ForegroundColor Red
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "Warnings:" -ForegroundColor Yellow
        foreach ($w in $warnings) {
            Write-Host "  - $w" -ForegroundColor Yellow
        }
    }
    
    exit 1
}

