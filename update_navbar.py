#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
HTML導航欄更新自動化腳本

此腳本用於:
1. 創建一個導航欄包含文件 (navbar.html)
2. 在项目根目錄創建一個JavaScript文件 (navbar.js)
3. 更新所有HTML文件, 用包含文件替換導航欄
4. 在所有HTML文件中添加引用navbar.js的代碼

使用方法:
python update_navbar.py [project_directory]

如果未指定project_directory，將使用當前目錄
"""

import os
import sys
import re
from pathlib import Path
import shutil

# 導航欄HTML内容
NAVBAR_HTML = """<!-- 導航欄 -->
<nav class="site-nav">
  <div class="nav-container">
    <div class="logo">
      <a href="/index.html">
        <div class="logo-main">霍爾果斯會計師事務所</div>
        <div class="logo-sub">HorgosCPA</div>
      </a>
    </div>
    <input type="checkbox" id="nav-toggle" class="nav-toggle">
    <label for="nav-toggle" class="nav-toggle-label">
      <span></span>
    </label>
    <ul class="nav-menu">
      <li class="nav-cta-item"><a href="/booking.html" class="nav-consult-btn">免費諮詢</a></li>
      <li class="nav-cta-item"><a href="https://line.me/R/ti/p/@208ihted" target="_blank" class="nav-line-btn">LINE</a></li>
      <li class="nav-divider"></li>
      <li class="has-dropdown">
        <a href="/services.html">服務項目</a>
        <div class="dropdown-menu">
          <a href="/services/tax.html">稅務服務</a>
          <a href="/services/accounting.html">記帳與會計</a>
          <a href="/services/consulting.html">企業顧問</a>
        </div>
      </li>
      <li><a href="/team.html">服務團隊</a></li>
      <li><a href="/blog.html">部落格</a></li>
      <li><a href="/faq.html">常見問題</a></li>
      <li><a href="/video.html">影片</a></li>
      <li><a href="/contact.html">聯絡資訊</a></li>
    </ul>
  </div>
</nav>
"""

# 导航栏JavaScript內容 
NAVBAR_JS = """// 導航欄下拉選單和響應式功能
document.addEventListener('DOMContentLoaded', function() {
  // 僅在移動設備上添加下拉選單的點擊事件
  if (window.innerWidth <= 850) {
    const dropdownLinks = document.querySelectorAll('.has-dropdown > a');
    
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const dropdownMenu = this.nextElementSibling;
        dropdownMenu.classList.toggle('show');
      });
    });
  }
  
  // 窗口大小改變時重新加載頁面以應用正確的樣式
  window.addEventListener('resize', function() {
    const width = window.innerWidth;
    if ((width <= 850 && window.prevWidth > 850) || 
        (width > 850 && window.prevWidth <= 850)) {
      window.prevWidth = width;
      // 延遲重新加載以避免連續調整大小時頻繁重新加載
      clearTimeout(window.resizeTimer);
      window.resizeTimer = setTimeout(function() {
        location.reload();
      }, 250);
    }
    window.prevWidth = width;
  });
  
  window.prevWidth = window.innerWidth;
});
"""

# 導航欄引用代碼 - 用於替換原導航欄
NAVBAR_INCLUDE = """<!-- 導航欄 (從navbar.html引入) -->
<!--#include virtual="/includes/navbar.html" -->
"""

# JavaScript引用代碼 - 添加到</body>前
JS_INCLUDE = """<script src="/assets/js/navbar.js"></script>
</body>"""

def create_include_dir(project_dir):
    """創建includes目錄"""
    includes_dir = os.path.join(project_dir, "includes")
    os.makedirs(includes_dir, exist_ok=True)
    return includes_dir

def create_assets_js_dir(project_dir):
    """創建assets/js目錄"""
    js_dir = os.path.join(project_dir, "assets", "js")
    os.makedirs(js_dir, exist_ok=True)
    return js_dir

def create_navbar_html(includes_dir):
    """創建navbar.html文件"""
    navbar_path = os.path.join(includes_dir, "navbar.html")
    with open(navbar_path, 'w', encoding='utf-8') as f:
        f.write(NAVBAR_HTML)
    print(f"✅ 創建了 navbar.html: {navbar_path}")
    return navbar_path

def create_navbar_js(js_dir):
    """創建navbar.js文件"""
    navbar_js_path = os.path.join(js_dir, "navbar.js")
    with open(navbar_js_path, 'w', encoding='utf-8') as f:
        f.write(NAVBAR_JS)
    print(f"✅ 創建了 navbar.js: {navbar_js_path}")
    return navbar_js_path

def find_html_files(project_dir):
    """找到項目中所有HTML文件"""
    html_files = []
    for root, _, files in os.walk(project_dir):
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    return html_files

def update_html_file(html_file):
    """更新HTML文件的導航欄和添加JS引用"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 備份原始文件
    backup_file = html_file + '.bak'
    shutil.copy2(html_file, backup_file)
    
    # 匹配導航欄部分
    navbar_pattern = r'<!-- 導航欄.*?</nav>\s*'
    if not re.search(navbar_pattern, content, re.DOTALL):
        navbar_pattern = r'<nav class="site-nav">.*?</nav>\s*'
    
    # 替換導航欄
    modified_content = re.sub(navbar_pattern, NAVBAR_INCLUDE, content, flags=re.DOTALL)
    
    # 添加JS引用
    if "</body>" in modified_content and "navbar.js" not in modified_content:
        modified_content = modified_content.replace("</body>", JS_INCLUDE)
    
    # 寫回文件
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    return backup_file

def create_htaccess(project_dir):
    """創建.htaccess文件以啟用SSI"""
    htaccess_path = os.path.join(project_dir, ".htaccess")
    htaccess_content = """# 啟用Server Side Includes
Options +Includes
AddType text/html .html
AddOutputFilter INCLUDES .html
"""
    with open(htaccess_path, 'w', encoding='utf-8') as f:
        f.write(htaccess_content)
    print(f"✅ 創建了 .htaccess 文件: {htaccess_path}")

def create_ssi_php_solution(project_dir):
    """為不支持SSI的環境創建PHP解決方案"""
    # 創建一個PHP版本的navbar.php
    includes_dir = os.path.join(project_dir, "includes")
    navbar_php_path = os.path.join(includes_dir, "navbar.php")
    with open(navbar_php_path, 'w', encoding='utf-8') as f:
        f.write("<?php\n")
        f.write("// 導航欄HTML\n")
        f.write("echo <<<'EOT'\n")
        f.write(NAVBAR_HTML)
        f.write("\nEOT;\n")
        f.write("?>\n")
    
    # 創建一個index.php示例，展示如何使用include
    example_path = os.path.join(project_dir, "example-php-include.php")
    with open(example_path, 'w', encoding='utf-8') as f:
        f.write("""<!DOCTYPE html>
<html>
<head>
    <title>PHP Include 示例</title>
</head>
<body>
    <!-- 引入導航欄 -->
    <?php include 'includes/navbar.php'; ?>
    
    <h1>PHP Include 示例</h1>
    <p>這是一個使用PHP include引入導航欄的示例。</p>
    
    <script src="/assets/js/navbar.js"></script>
</body>
</html>
""")
    print(f"✅ 創建了PHP解決方案文件")
    print(f"   - {navbar_php_path}")
    print(f"   - {example_path}")

def create_js_solution(project_dir, js_dir):
    """創建JavaScript解決方案 - 動態加載導航欄"""
    js_loader_path = os.path.join(js_dir, "navbar-loader.js")
    js_loader_content = """// 動態加載導航欄
document.addEventListener('DOMContentLoaded', function() {
    // 獲取導航欄容器
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;
    
    // 加載導航欄HTML
    fetch('/includes/navbar.html')
        .then(response => response.text())
        .then(html => {
            // 插入導航欄HTML
            navbarContainer.innerHTML = html;
            
            // 初始化下拉選單功能
            initNavbar();
        })
        .catch(error => {
            console.error('無法加載導航欄:', error);
            navbarContainer.innerHTML = '<p>無法加載導航欄</p>';
        });
});

// 初始化導航欄功能
function initNavbar() {
    // 僅在移動設備上添加下拉選單的點擊事件
    if (window.innerWidth <= 850) {
        const dropdownLinks = document.querySelectorAll('.has-dropdown > a');
        
        dropdownLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownMenu = this.nextElementSibling;
                dropdownMenu.classList.toggle('show');
            });
        });
    }
    
    // 窗口大小改變時重新加載頁面以應用正確的樣式
    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        if ((width <= 850 && window.prevWidth > 850) || 
            (width > 850 && window.prevWidth <= 850)) {
            window.prevWidth = width;
            // 延遲重新加載以避免連續調整大小時頻繁重新加載
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(function() {
                location.reload();
            }, 250);
        }
        window.prevWidth = width;
    });
    
    window.prevWidth = window.innerWidth;
}
"""
    with open(js_loader_path, 'w', encoding='utf-8') as f:
        f.write(js_loader_content)
    
    # 創建一個示例HTML，展示如何使用JS加載
    example_path = os.path.join(project_dir, "example-js-loader.html")
    with open(example_path, 'w', encoding='utf-8') as f:
        f.write("""<!DOCTYPE html>
<html>
<head>
    <title>JS 導航欄加載示例</title>
    <link rel="stylesheet" href="/assets/css/style.css" />
</head>
<body>
    <!-- 導航欄容器 - JS將在此加載導航欄 -->
    <div id="navbar-container"></div>
    
    <h1>JavaScript 導航欄加載示例</h1>
    <p>這是一個使用JavaScript動態加載導航欄的示例。</p>
    
    <!-- 先加載navbar-loader.js -->
    <script src="/assets/js/navbar-loader.js"></script>
</body>
</html>
""")
    print(f"✅ 創建了JavaScript解決方案文件")
    print(f"   - {js_loader_path}")
    print(f"   - {example_path}")

def create_html_include_guides(project_dir):
    """創建HTML導航欄包含指南"""
    guide_path = os.path.join(project_dir, "navbar-guide.md")
    guide_content = """# 導航欄包含使用指南

本項目使用了包含文件來統一導航欄，以下是各種使用方法。

## 方法1: 使用服務器端包含 (SSI)

對於支持SSI的服務器 (Apache, Nginx等)，使用以下代碼:

```html
<!-- 導航欄 (從navbar.html引入) -->
<!--#include virtual="/includes/navbar.html" -->
```

## 方法2: 使用PHP包含 

如果網站運行在PHP環境下，可使用:

```php
<?php include 'includes/navbar.php'; ?>
```

## 方法3: 使用JavaScript動態加載

在HTML中添加容器和腳本引用:

```html
<div id="navbar-container"></div>
<script src="/assets/js/navbar-loader.js"></script>
```

## 手動更新步驟

如果需要更新導航欄，只需修改以下文件:

1. `/includes/navbar.html` - 所有使用SSI或JS加載的頁面
2. `/includes/navbar.php` - 所有使用PHP include的頁面

修改後，所有頁面會自動使用新的導航欄結構。
"""
    with open(guide_path, 'w', encoding='utf-8') as f:
        f.write(guide_content)
    print(f"✅ 創建了導航欄包含指南: {guide_path}")

def main():
    # 獲取項目目錄
    if len(sys.argv) > 1:
        project_dir = sys.argv[1]
    else:
        project_dir = os.getcwd()
    
    print(f"🔍 使用項目目錄: {project_dir}")
    
    # 創建目錄
    includes_dir = create_include_dir(project_dir)
    js_dir = create_assets_js_dir(project_dir)
    
    # 創建文件
    create_navbar_html(includes_dir)
    create_navbar_js(js_dir)
    
    # 更新HTML文件
    html_files = find_html_files(project_dir)
    print(f"🔍 找到 {len(html_files)} 個HTML文件")
    
    # 提示用戶確認
    confirm = input(f"確認更新 {len(html_files)} 個HTML文件? (y/n): ")
    if confirm.lower() != 'y':
        print("❌ 操作取消")
        sys.exit(0)
    
    backup_files = []
    for html_file in html_files:
        print(f"🔄 更新: {html_file}", end="")
        try:
            backup = update_html_file(html_file)
            backup_files.append(backup)
            print(" ✅")
        except Exception as e:
            print(f" ❌ 錯誤: {str(e)}")
    
    # 創建.htaccess文件
    create_htaccess(project_dir)
    
    # 創建PHP解決方案
    create_ssi_php_solution(project_dir)
    
    # 創建JavaScript解決方案
    create_js_solution(project_dir, js_dir)
    
    # 創建使用指南
    create_html_include_guides(project_dir)
    
    # 完成提示
    print("\n✅ 處理完成!")
    print(f"✅ 成功創建了導航欄包含文件: {os.path.join(includes_dir, 'navbar.html')}")
    print(f"✅ 成功創建了導航欄JavaScript文件: {os.path.join(js_dir, 'navbar.js')}")
    print(f"✅ 成功更新了 {len(html_files)} 個HTML文件")
    print(f"✅ 創建了 {len(backup_files)} 個備份文件 (.html.bak)")
    print("\n📋 恢復原始文件 (如需要):")
    print("將 .bak 文件重命名回原始文件名")
    
    print("\n📋 使用說明:")
    print("1. 若使用Apache，啟用SSI模組")
    print("2. 若使用Nginx，添加以下配置:")
    print("   location ~ \.html$ {")
    print("       ssi on;")
    print("   }")
    print("3. 若不支持SSI，請考慮使用PHP或JavaScript方案")
    print("   詳細內容請閱讀生成的'navbar-guide.md'文件")

if __name__ == "__main__":
    main()