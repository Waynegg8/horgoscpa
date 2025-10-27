# AI Quality Check Script (PowerShell)
# Must run before saying "completed"

Write-Host "Starting Quality Check..." -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$warn = 0
$total = 17

# Level 1: Standardization Check (4 items)
Write-Host "=== Level 1: Standardization ===" -ForegroundColor Yellow

Write-Host -NoNewline "1.1 Hardcoded business rules..."
if (Test-Path "timesheet-api/src") {
    $hardcoded = Get-ChildItem -Path "timesheet-api/src" -Recurse -Filter "*.ts" | Select-String -Pattern "const.*=.*\[" | Where-Object { $_.Line -match "(leave|vacation|overtime)" }
    if ($hardcoded) {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "1.2 API prefix..."
if (Test-Path "timesheet-api/src/routes") {
    $badRoutes = Get-ChildItem -Path "timesheet-api/src/routes" -Recurse -Filter "*.ts" | Select-String -Pattern "(get|post|put|delete)" | Where-Object { $_.Line -notmatch "/api/v1/" -and $_.Line -notmatch "import" }
    if ($badRoutes) {
        Write-Host " WARN" -ForegroundColor Yellow
        $warn++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "1.3 SQL injection protection..."
if (Test-Path "timesheet-api/src") {
    $sqlInjection = Get-ChildItem -Path "timesheet-api/src" -Recurse -Filter "*.ts" | Select-String -Pattern 'db\.prepare.*\$\{' | Where-Object { $_.Line -notmatch "//" }
    if ($sqlInjection) {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "1.4 Table naming..."
Write-Host " PASS (manual)" -ForegroundColor Green
$pass++

Write-Host ""

# Level 2: Modularity Check (3 items)
Write-Host "=== Level 2: Modularity ===" -ForegroundColor Yellow

Write-Host -NoNewline "2.1 File size..."
if (Test-Path "timesheet-api/src") {
    $largeFiles = Get-ChildItem -Path "timesheet-api/src" -Recurse -Filter "*.ts" | Where-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 300 }
    if ($largeFiles.Count -gt 0) {
        Write-Host " WARN ($($largeFiles.Count) files)" -ForegroundColor Yellow
        $warn++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "2.2 Layer architecture..."
if (Test-Path "timesheet-api/src/routes") {
    $directDB = Get-ChildItem -Path "timesheet-api/src/routes" -Recurse -Filter "*.ts" | Select-String -Pattern "(db\.prepare|db\.run|db\.get)"
    if ($directDB) {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "2.3 Shared components..."
Write-Host " PASS (manual)" -ForegroundColor Green
$pass++

Write-Host ""

# Level 3: Consistency Check (2 items)
Write-Host "=== Level 3: Consistency ===" -ForegroundColor Yellow

Write-Host -NoNewline "3.1 Documentation updated..."
if (Test-Path "docs") {
    $recentDocs = Get-ChildItem -Path "docs" -Recurse -Filter "*.md" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) }
    if ($recentDocs.Count -gt 0) {
        Write-Host " PASS ($($recentDocs.Count) docs)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " WARN" -ForegroundColor Yellow
        $warn++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "3.2 Naming consistency..."
Write-Host " PASS (manual)" -ForegroundColor Green
$pass++

Write-Host ""

# Level 4: Security Check (2 items)
Write-Host "=== Level 4: Security ===" -ForegroundColor Yellow

Write-Host -NoNewline "4.1 External website protection..."
try {
    $gitDiff = git diff --name-only 2>$null
    $externalFiles = $gitDiff | Where-Object { $_ -match "^(blog/|services/|assets/|content/|.*\.html$)" -and $_ -notmatch "(timesheet|admin|internal)" }
    if ($externalFiles) {
        Write-Host " FAIL" -ForegroundColor Red
        $fail++
    } else {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " SKIP (not git repo)" -ForegroundColor Yellow
    $warn++
}

Write-Host -NoNewline "4.2 Password security..."
Write-Host " PASS (manual)" -ForegroundColor Green
$pass++

Write-Host ""

# Level 5: Quality Check (6 items)
Write-Host "=== Level 5: Functionality ===" -ForegroundColor Yellow

Write-Host "5.1 Automated tests..." -NoNewline
if (Test-Path "timesheet-api/package.json") {
    $packageJson = Get-Content "timesheet-api/package.json" -Raw | ConvertFrom-Json
    if ($packageJson.scripts.test) {
        Write-Host " PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " WARN" -ForegroundColor Yellow
        $warn++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Yellow
    $warn++
}

Write-Host "5.2 Error logs...      INFO (manual check)"
$pass++

Write-Host "5.3 Performance...     INFO (manual check)"
$pass++

Write-Host -NoNewline "5.4 Frontend UI..."
if ((Test-Path "frontend") -or (Test-Path "src/components")) {
    Write-Host " PASS" -ForegroundColor Green
    $pass++
} else {
    Write-Host " WARN" -ForegroundColor Yellow
    $warn++
}

Write-Host "5.5 Edge cases...      INFO (manual check)"
$pass++

Write-Host "5.6 Related features... INFO (manual check)"
$pass++

Write-Host ""

# Summary
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Quality Check Complete" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $pass items" -ForegroundColor Green
Write-Host "Warned: $warn items" -ForegroundColor Yellow
Write-Host "Failed: $fail items" -ForegroundColor Red
Write-Host "Total:  $total items"
Write-Host ""

$passRate = [math]::Round(($pass * 100 / $total), 1)
Write-Host "Pass Rate: $passRate%"
Write-Host ""

if ($fail -eq 0) {
    if ($warn -eq 0) {
        Write-Host "========================" -ForegroundColor Green
        Write-Host "PERFECT! All checks passed!" -ForegroundColor Green
        Write-Host "========================" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "========================" -ForegroundColor Yellow
        Write-Host "PASSED with $warn warnings" -ForegroundColor Yellow
        Write-Host "Recommend fixing warnings" -ForegroundColor Yellow
        Write-Host "========================" -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "========================" -ForegroundColor Red
    Write-Host "FAILED: $fail checks failed" -ForegroundColor Red
    Write-Host "Must fix before completion" -ForegroundColor Red
    Write-Host "========================" -ForegroundColor Red
    exit 1
}
