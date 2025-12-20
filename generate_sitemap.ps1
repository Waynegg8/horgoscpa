# Sitemap Generator for HorgosCPA
# Automatically scans .html files and updates sitemap.xml

$baseUrl = "https://www.horgoscpa.com"
$sitemapPath = "sitemap.xml"
$ignoreList = @("404.html", "articles/template.html")

# Initialize XML content with header
$script:xmlLines = @()
$script:xmlLines += '<?xml version="1.0" encoding="UTF-8"?>'
$script:xmlLines += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

# Function to add URL entry
function Add-UrlEntry {
    param (
        [string]$relPath,
        [string]$lastMod,
        [string]$priority,
        [string]$freq
    )
    
    # Skip if in ignore list
    foreach ($ignore in $ignoreList) {
        if ($relPath -like $ignore) { return }
    }
    
    # Build clean URL (remove .html extension and index.html -> /)
    $cleanPath = $relPath -replace '\.html$', ''
    if ($cleanPath -eq "index") {
        $url = "$baseUrl/"
    }
    else {
        $url = "$baseUrl/$cleanPath"
    }
    
    $script:xmlLines += "  <url>"
    $script:xmlLines += "    <loc>$url</loc>"
    $script:xmlLines += "    <lastmod>$lastMod</lastmod>"
    $script:xmlLines += "    <changefreq>$freq</changefreq>"
    $script:xmlLines += "    <priority>$priority</priority>"
    $script:xmlLines += "  </url>"
}

# 1. Scan Root HTML Pages
Get-ChildItem -Filter "*.html" | ForEach-Object {
    $prio = "0.8"
    $freq = "monthly"
    
    # Set priority based on page importance
    switch ($_.Name) {
        "index.html" { $prio = "1.0"; $freq = "weekly" }
        "services.html" { $prio = "0.9" }
        "booking.html" { $prio = "0.9" }
        "contact.html" { $prio = "0.8" }
        "articles.html" { $prio = "0.8"; $freq = "weekly" }
        "resources.html" { $prio = "0.7"; $freq = "weekly" }
    }
    
    $lastMod = $_.LastWriteTime.ToString("yyyy-MM-dd")
    Add-UrlEntry -relPath $_.Name -lastMod $lastMod -priority $prio -freq $freq
}

# 2. Scan Articles Directory
if (Test-Path "articles") {
    Get-ChildItem -Path "articles" -Filter "*.html" | ForEach-Object {
        if ($_.Name -eq "template.html") { return }
        
        $relPath = "articles/" + $_.Name
        $lastMod = $_.LastWriteTime.ToString("yyyy-MM-dd")
        Add-UrlEntry -relPath $relPath -lastMod $lastMod -priority "0.7" -freq "monthly"
    }
}

# 3. Scan Tools Directory
if (Test-Path "tools") {
    Get-ChildItem -Path "tools" -Filter "*.html" | ForEach-Object {
        $relPath = "tools/" + $_.Name
        $lastMod = $_.LastWriteTime.ToString("yyyy-MM-dd")
        Add-UrlEntry -relPath $relPath -lastMod $lastMod -priority "0.6" -freq "monthly"
    }
}

# Close XML
$script:xmlLines += "</urlset>"

# Write to file
$script:xmlLines -join "`n" | Out-File -Encoding UTF8 -FilePath $sitemapPath

Write-Host "Sitemap updated successfully! ($sitemapPath)"
Write-Host "Total URLs: $(($script:xmlLines | Where-Object { $_ -match '<url>' }).Count)"
