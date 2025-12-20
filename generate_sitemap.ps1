# Sitemap Generator for HorgosCPA
# Automatically scans .html files and updates sitemap.xml

$baseUrl = "https://www.horgoscpa.com"
$sitemapPath = "sitemap.xml"
$ignoreList = @("404.html", "articles/template.html", "google*.html")

# Header
$xmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"@

# Function to add URL
function Add-Url {
    param ($file, $priority, $freq)
    $relPath = $file.FullName.Substring($PWD.Path.Length + 1).Replace("\", "/")
    
    if ($ignoreList -contains $relPath) { return }

    $lastMod = $file.LastWriteTime.ToString("yyyy-MM-dd")
    $url = "$baseUrl/$relPath"
    
    $xmlContent += @"

  <url>
    <loc>$url</loc>
    <lastmod>$lastMod</lastmod>
    <changefreq>$freq</changefreq>
    <priority>$priority</priority>
  </url>
"@
}

# 1. Root Pages
Get-ChildItem -Filter "*.html" | ForEach-Object {
    $prio = "0.8"
    if ($_.Name -eq "index.html") { $prio = "1.0" }
    Add-Url $_ $prio "monthly"
}

# 2. Articles
if (Test-Path "articles") {
    Get-ChildItem -Path "articles" -Filter "*.html" | ForEach-Object {
        Add-Url $_ "0.8" "monthly"
    }
}

# 3. Tools
if (Test-Path "tools") {
    Get-ChildItem -Path "tools" -Filter "*.html" | ForEach-Object {
        Add-Url $_ "0.8" "monthly"
    }
}

# Footer
$xmlContent += @"

</urlset>
"@

# Write File
$xmlContent | Out-File -Encoding UTF8 $sitemapPath
Write-Host "Sitemap updated successfully! ($sitemapPath)"
