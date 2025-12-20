# HorgosCPA Content Index Generator
# Automatically parses HTML/Files to rebuild articles.json and resources.json

# --- 1. Articles Generator ---
$articlesPath = "assets/data/articles.json"
$articlesDir = "articles"
$newArticles = @()

if (Test-Path $articlesDir) {
    Get-ChildItem -Path $articlesDir -Filter "*.html" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        
        # Skip template
        # Skip nothing, process all HTML files in articles/

        # Extract Metadata using Regex
        $title = "Untitled"
        if ($content -match '<title>(.*?)\s*\|\s*霍爾果斯') { $title = $matches[1] }
        elseif ($content -match '<title>(.*?)</title>') { $title = $matches[1] }

        $date = $_.LastWriteTime.ToString("yyyy.MM.dd")
        if ($content -match '<meta name="date" content="(.*?)">') { $date = $matches[1] }
        
        $category = "Insight"
        if ($content -match '<meta name="category" content="(.*?)">') { $category = $matches[1] }
        
        $desc = ""
        if ($content -match '<meta name="description" content="(.*?)">') { $desc = $matches[1] }

        $cover = ""
        if ($content -match '<meta name="cover" content="(.*?)">') { $cover = $matches[1] }

        $newArticles += @{
            title       = $title
            link        = "articles/" + $_.Name
            date        = $date
            category    = $category
            description = $desc
            image       = $cover
        }
    }
}
# Use InputObject to force Array format even with single item
ConvertTo-Json -InputObject $newArticles -Depth 3 | Out-File -Encoding UTF8 $articlesPath


# --- 2. Resources Generator ---
$resourcesPath = "assets/data/resources.json"
$filesDir = "assets/files"
$toolsDir = "tools"
$newResources = @()

# Scan Files (PDFs, etc)
if (Test-Path $filesDir) {
    Get-ChildItem -Path $filesDir | ForEach-Object {
        $newResources += @{
            title       = $_.BaseName
            link        = "assets/files/" + $_.Name
            category    = "download"
            type        = "file"
            description = "點擊下載 " + $_.Extension.ToUpper().Trim('.')
        }
    }
}

# Scan Tools (HTML)
if (Test-Path $toolsDir) {
    Get-ChildItem -Path $toolsDir -Filter "*.html" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $title = $_.BaseName
        if ($content -match '<title>(.*?)\s*\|') { $title = $matches[1] }
        
        $desc = "線上工具"
        if ($content -match '<meta name="description" content="(.*?)">') { $desc = $matches[1] }

        $newResources += @{
            title       = $title
            link        = "tools/" + $_.Name
            category    = "tool"
            type        = "tool"
            description = $desc
        }
    }
}

# Use InputObject to force Array format
ConvertTo-Json -InputObject $newResources -Depth 3 | Out-File -Encoding UTF8 $resourcesPath

Write-Host "Content Indexes Updated!"
