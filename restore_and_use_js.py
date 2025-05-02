#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
恢復HTML檔案並修改為使用JavaScript動態加載導航欄

這個腳本執行兩個主要功能:
1. 恢復備份的HTML文件(如果備份存在)
2. 修改HTML文件以使用JavaScript動態加載導航欄

使用方法:
python restore_and_use_js.py [project_directory]

如果未指定project_directory，將使用當前目錄
"""

import os
import sys
import re
import shutil
from pathlib import Path

# 導航欄HTML內容 - 用於創建navbar.html文件
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

# 導航欄加載器JavaScript
NAVBAR_LOADER_JS = """// 導航欄動態加載與功能初始化
document.addEventListener('DOMContentLoaded', function() {
    // 載入導航欄
    loadNavbar();
    
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

// 載入導航欄HTML
function loadNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;
    
    // 直接插入導航欄HTML (無需從服務器加載)
    navbarContainer.innerHTML = `<!-- 導航欄 -->
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
</nav>`;
    
    // 初始化導航欄功能
    initNavbar();
}

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
}
"""

# 需要添加在HTML中的導航欄容器和JS引用
NAVBAR_CONTAINER = """<!-- 導航欄容器 - 將由JS加載 -->
<div id="navbar-container"></div>
"""

# JS引用代碼 - 將加在body結束標籤前
JS_INCLUDE = """<script src="/assets/js/navbar-loader.js"></script>
</body>"""

def create_assets_js_dir(project_dir):
    """創建assets/js目錄"""
    js_dir = os.path.join(project_dir, "assets", "js")
    os.makedirs(js_dir, exist_ok=True)
    return js_dir

def create_navbar_loader_js(js_dir):
    """創建navbar-loader.js文件"""
    navbar_js_path = os.path.join(js_dir, "navbar-loader.js")
    with open(navbar_js_path, 'w', encoding='utf-8') as f:
        f.write(NAVBAR_LOADER_JS)
    print(f"✅ 創建了 navbar-loader.js: {navbar_js_path}")
    return navbar_js_path

def find_html_files(project_dir):
    """找到項目中所有HTML文件"""
    html_files = []
    for root, _, files in os.walk(project_dir):
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    return html_files

def restore_from_backup(html_file):
    """如果有備份檔案，恢復HTML文件"""
    backup_file = html_file + '.bak'
    if os.path.exists(backup_file):
        print(f"🔄 發現備份檔案，恢復 {html_file} 從備份")
        shutil.copy2(backup_file, html_file)
        return True
    return False

def update_html_file(html_file):
    """更新HTML文件，使用JS動態加載導航欄"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 創建新的備份
    backup_file = html_file + '.pre-js.bak'
    shutil.copy2(html_file, backup_file)
    
    # 匹配導航欄部分
    navbar_pattern = r'<!-- 導航欄.*?</nav>\s*'
    if not re.search(navbar_pattern, content, re.DOTALL):
        navbar_pattern = r'<nav class="site-nav">.*?</nav>\s*'
    
    # 檢查是否有SSI引用，也嘗試替換它
    ssi_pattern = r'<!--\s*#include virtual="/includes/navbar\.html"\s*-->'
    
    # 先嘗試替換SSI引用
    if re.search(ssi_pattern, content):
        modified_content = re.sub(ssi_pattern, NAVBAR_CONTAINER, content, flags=re.DOTALL)
    # 再嘗試替換完整的導航欄
    elif re.search(navbar_pattern, content, re.DOTALL):
        modified_content = re.sub(navbar_pattern, NAVBAR_CONTAINER, content, flags=re.DOTALL)
    else:
        # 如果找不到導航欄，在<body>標籤後插入
        body_pattern = r'<body.*?>'
        if re.search(body_pattern, content):
            modified_content = re.sub(body_pattern, lambda m: m.group(0) + '\n' + NAVBAR_CONTAINER, content)
        else:
            print(f"⚠️ 在 {html_file} 中找不到導航欄或<body>標籤")
            return False
    
    # 添加JS引用
    if "</body>" in modified_content and "navbar-loader.js" not in modified_content:
        modified_content = modified_content.replace("</body>", JS_INCLUDE)
    
    # 寫回文件
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    return True

def main():
    # 獲取項目目錄
    if len(sys.argv) > 1:
        project_dir = sys.argv[1]
    else:
        project_dir = os.getcwd()
    
    print(f"🔍 使用項目目錄: {project_dir}")
    
    # 創建JS目錄並生成navbar-loader.js
    js_dir = create_assets_js_dir(project_dir)
    create_navbar_loader_js(js_dir)
    
    # 找到所有HTML文件
    html_files = find_html_files(project_dir)
    print(f"🔍 找到 {len(html_files)} 個HTML文件")
    
    # 提示用戶確認
    confirm = input(f"確認修改 {len(html_files)} 個HTML文件以使用JS動態加載導航欄? (y/n): ")
    if confirm.lower() != 'y':
        print("❌ 操作取消")
        sys.exit(0)
    
    # 處理每個HTML文件
    success_count = 0
    for html_file in html_files:
        print(f"🔄 處理: {html_file}")
        # 嘗試恢復備份
        restored = restore_from_backup(html_file)
        if restored:
            print(f"  ✓ 從備份恢復成功")
        
        # 更新HTML使用JS加載
        if update_html_file(html_file):
            success_count += 1
            print(f"  ✓ 更新為使用JS動態加載")
        else:
            print(f"  ❌ 更新失敗")
    
    # 完成提示
    print("\n✅ 處理完成!")
    print(f"✅ 成功更新了 {success_count}/{len(html_files)} 個HTML文件")
    print(f"✅ 創建了 {len(html_files)} 個新備份文件 (.pre-js.bak)")
    print(f"✅ 成功創建了導航欄JavaScript文件: {os.path.join(js_dir, 'navbar-loader.js')}")
    
    print("\n📋 如何驗證:")
    print("1. 打開任意HTML頁面")
    print("2. 確認導航欄正確顯示")
    print("3. 縮小瀏覽器窗口，檢查移動版導航欄功能")

if __name__ == "__main__":
    main()