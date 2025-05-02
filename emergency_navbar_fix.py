#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
網站導航欄緊急修復腳本

此腳本會:
1. 尋找備份文件恢復原始HTML (如果存在)
2. 直接將完整導航欄HTML插入各頁面
3. 確保引用了navbar.js

使用方法:
python emergency_navbar_fix.py [project_directory]

如果未指定project_directory，將使用當前目錄
"""

import os
import sys
import re
import shutil
from pathlib import Path

# 完整的導航欄HTML
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

# 必要的JavaScript
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

def create_js_file(project_dir):
    """創建navbar.js文件"""
    js_dir = os.path.join(project_dir, "assets", "js")
    os.makedirs(js_dir, exist_ok=True)
    js_path = os.path.join(js_dir, "navbar.js")
    
    # 只有在文件不存在或內容不同時才寫入
    should_write = True
    if os.path.exists(js_path):
        try:
            with open(js_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
            if existing_content.strip() == NAVBAR_JS.strip():
                should_write = False
        except:
            pass
    
    if should_write:
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(NAVBAR_JS)
        print(f"✅ 創建/更新了 navbar.js: {js_path}")
    else:
        print(f"✓ navbar.js 已存在且內容正確")
    
    return js_path

def find_html_files(project_dir):
    """找到項目中所有HTML文件"""
    html_files = []
    for root, _, files in os.walk(project_dir):
        for file in files:
            if file.endswith('.html'):
                # 排除includes目錄中的文件
                if 'includes' not in root.replace('\\', '/').split('/'):
                    html_files.append(os.path.join(root, file))
    return html_files

def check_css_reference(content):
    """檢查HTML內容是否有正確的CSS引用"""
    # 檢查是否引用了樣式表
    css_pattern = r'<link[^>]*href=["\']/assets/css/style\.css["\']\s*\/?>'
    alt_css_pattern = r'<link[^>]*href=["\'](\.\.\/)*assets/css/style\.css["\']\s*\/?>'
    
    if not (re.search(css_pattern, content) or re.search(alt_css_pattern, content)):
        print("⚠️ 未找到style.css引用，添加引用")
        # 在</head>前添加CSS引用
        head_end_pattern = r'</head>'
        if re.search(head_end_pattern, content):
            return re.sub(
                head_end_pattern, 
                '  <link rel="stylesheet" href="/assets/css/style.css" />\n</head>', 
                content
            )
    return content

def restore_and_fix_html(html_file):
    """恢復和修復HTML文件的導航欄"""
    # 嘗試各種可能的備份文件名
    backup_files = [
        html_file + '.bak',
        html_file + '.pre-js.bak',
        html_file.replace('.html', '.bak.html')
    ]
    
    original_content = None
    for backup in backup_files:
        if os.path.exists(backup):
            print(f"🔄 從備份 {backup} 恢復 {html_file}")
            try:
                with open(backup, 'r', encoding='utf-8') as f:
                    original_content = f.read()
                break
            except Exception as e:
                print(f"  ⚠️ 從備份讀取失敗: {str(e)}")
    
    # 如果找不到備份或無法讀取，讀取當前文件
    if not original_content:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                original_content = f.read()
        except Exception as e:
            print(f"❌ 無法讀取 {html_file}: {str(e)}")
            return False
    
    # 創建修復前的備份
    fix_backup = html_file + '.pre-fix.bak'
    try:
        with open(fix_backup, 'w', encoding='utf-8') as f:
            f.write(original_content)
        print(f"✓ 創建修復前備份: {fix_backup}")
    except Exception as e:
        print(f"⚠️ 無法創建備份: {str(e)}")
    
    # 檢查並添加CSS引用
    content = check_css_reference(original_content)
    
    # 嘗試尋找可能的導航欄位置
    patterns = [
        r'<!-- 導航欄.*?</nav>\s*', 
        r'<nav class="site-nav">.*?</nav>\s*',
        r'<!--\s*#include virtual="/includes/navbar\.html"\s*-->',
        r'<div id="navbar-container"></div>'
    ]
    
    replaced = False
    for pattern in patterns:
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, NAVBAR_HTML, content, flags=re.DOTALL)
            replaced = True
            break
    
    # 如果找不到導航欄，則在<body>標籤後插入
    if not replaced:
        body_pattern = r'<body.*?>'
        if re.search(body_pattern, content):
            content = re.sub(body_pattern, lambda m: m.group(0) + '\n' + NAVBAR_HTML, content)
            replaced = True
        else:
            print(f"❌ 在 {html_file} 中找不到合適的位置插入導航欄")
            return False
    
    # 確保引用了navbar.js
    if "</body>" in content:
        js_pattern = r'<script[^>]*src=["\'](/assets/js/navbar\.js|assets/js/navbar\.js)["\']></script>'
        if not re.search(js_pattern, content):
            content = content.replace("</body>", "  <script src=\"/assets/js/navbar.js\"></script>\n</body>")
    
    # 寫回文件
    try:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 成功修復 {html_file}")
        return True
    except Exception as e:
        print(f"❌ 寫入 {html_file} 失敗: {str(e)}")
        return False

def main():
    """主函數"""
    # 獲取項目目錄
    if len(sys.argv) > 1:
        project_dir = sys.argv[1]
    else:
        project_dir = os.getcwd()
    
    print(f"🔍 使用項目目錄: {project_dir}")
    
    # 創建navbar.js
    create_js_file(project_dir)
    
    # 找到所有HTML文件
    html_files = find_html_files(project_dir)
    print(f"🔍 找到 {len(html_files)} 個HTML文件")
    
    # 確認是否繼續
    if len(html_files) > 0:
        confirm = input(f"確認修復 {len(html_files)} 個HTML文件的導航欄? (y/n): ")
        if confirm.lower() != 'y':
            print("❌ 操作取消")
            sys.exit(0)
    else:
        print("❌ 未找到HTML文件")
        sys.exit(1)
    
    # 處理每個HTML文件
    success_count = 0
    for html_file in html_files:
        print(f"\n🔄 處理: {html_file}")
        if restore_and_fix_html(html_file):
            success_count += 1
    
    # 完成提示
    print("\n✅ 修復完成!")
    print(f"✅ 成功修復了 {success_count}/{len(html_files)} 個HTML文件")
    print(f"✅ 每個文件都創建了備份 (.pre-fix.bak)")
    
    print("\n📋 後續步驟:")
    print("1. 檢查網站的導航欄是否正確顯示")
    print("2. 如果有問題，可以通過備份文件還原: .pre-fix.bak")
    print("3. 請確認style.css文件路徑正確，內容完整")

if __name__ == "__main__":
    main()