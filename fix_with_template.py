#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用contact.html作為模板修復導航欄 (修復版)

此腳本會:
1. 使用提供的contact.html作為模板
2. 提取其中的導航欄HTML與樣式
3. 將這些元素應用到所有其他HTML文件中

使用方法:
python fix_with_template.py <template_file> [project_directory]

參數:
- template_file: 模板文件路徑 (contact.html)
- project_directory: 項目目錄 (可選，默認為當前目錄)
"""

import os
import sys
import re
import shutil
from pathlib import Path
import html

def extract_template_parts(template_path):
    """從模板中提取導航欄、CSS樣式和JS代碼"""
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except Exception as e:
        print(f"❌ 無法讀取模板文件: {str(e)}")
        sys.exit(1)
    
    # 提取導航欄樣式
    nav_style_pattern = r'<!-- 導航欄修正樣式 -->\s*<style>(.*?)</style>'
    nav_style_match = re.search(nav_style_pattern, template_content, re.DOTALL)
    nav_style = nav_style_match.group(1).strip() if nav_style_match else ""
    
    # 提取導航欄HTML
    navbar_pattern = r'<!-- 導航欄 -->\s*<nav class="site-nav">(.*?)</nav>'
    navbar_match = re.search(navbar_pattern, template_content, re.DOTALL)
    navbar = navbar_match.group(0).strip() if navbar_match else ""
    
    # 提取JavaScript
    js_pattern = r'<!-- 下拉選單與營業時間 JavaScript -->\s*<script>(.*?)</script>'
    js_match = re.search(js_pattern, template_content, re.DOTALL)
    js_code = js_match.group(1).strip() if js_match else ""
    
    return {
        "nav_style": nav_style,
        "navbar_html": navbar,
        "navbar_js": js_code
    }

def find_html_files(project_dir, exclude_files=None):
    """找到項目中所有HTML文件，排除特定文件"""
    if exclude_files is None:
        exclude_files = []
    
    exclude_files = [os.path.abspath(f) for f in exclude_files]
    
    html_files = []
    for root, _, files in os.walk(project_dir):
        for file in files:
            if file.endswith('.html'):
                full_path = os.path.abspath(os.path.join(root, file))
                if full_path not in exclude_files:
                    html_files.append(full_path)
    return html_files

def fix_html_file(html_file, template_parts):
    """使用模板部分修復HTML文件"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 無法讀取 {html_file}: {str(e)}")
        return False
    
    # 創建修復前的備份
    backup_file = html_file + '.template-fix.bak'
    try:
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ 創建備份: {backup_file}")
    except Exception as e:
        print(f"  ⚠️ 無法創建備份: {str(e)}")
    
    # 檢查是否已經有導航欄樣式
    nav_style_pattern = r'<!-- 導航欄修正樣式 -->\s*<style>(.*?)</style>'
    has_nav_style = re.search(nav_style_pattern, content, re.DOTALL)
    
    # 檢查是否已經有相同的導航欄
    if template_parts["navbar_html"] in content and has_nav_style:
        print(f"  ✓ 文件已包含正確的導航欄，無需修改")
        return True
    
    # 替換或添加導航欄樣式
    if has_nav_style:
        content = re.sub(
            nav_style_pattern,
            f'<!-- 導航欄修正樣式 -->\n<style>{template_parts["nav_style"]}</style>',
            content,
            flags=re.DOTALL
        )
    else:
        # 在</head>前添加樣式
        head_end_pattern = r'</head>'
        if re.search(head_end_pattern, content):
            content = re.sub(
                head_end_pattern,
                f'<!-- 導航欄修正樣式 -->\n<style>{template_parts["nav_style"]}</style>\n</head>',
                content
            )
    
    # 替換導航欄
    patterns = [
        r'<!-- 導航欄.*?</nav>\s*',
        r'<nav class="site-nav">.*?</nav>\s*',
        r'<!--\s*#include virtual="/includes/navbar\.html"\s*-->',
        r'<div id="navbar-container"></div>'
    ]
    
    replaced = False
    for pattern in patterns:
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, template_parts["navbar_html"], content, flags=re.DOTALL, count=1)
            replaced = True
            break
    
    # 如果找不到導航欄，則在<body>標籤後插入
    if not replaced:
        body_pattern = r'<body.*?>'
        if re.search(body_pattern, content):
            content = re.sub(body_pattern, lambda m: m.group(0) + '\n' + template_parts["navbar_html"], content)
            replaced = True
        else:
            print(f"  ❌ 在 {html_file} 中找不到合適的位置插入導航欄")
            return False
    
    # 替換或添加JavaScript
    js_pattern = r'<!-- 下拉選單與營業時間 JavaScript -->\s*<script>.*?</script>'
    end_body_pattern = r'</body>'
    
    if re.search(js_pattern, content, re.DOTALL):
        content = re.sub(
            js_pattern,
            f'<!-- 下拉選單與營業時間 JavaScript -->\n<script>{template_parts["navbar_js"]}</script>',
            content,
            flags=re.DOTALL
        )
    elif re.search(end_body_pattern, content):
        # 檢查是否已經有下拉選單的JS代碼
        has_dropdown_js = "dropdownLinks.forEach" in content
        if not has_dropdown_js:
            js_block = f'''<!-- 下拉選單與營業時間 JavaScript -->
<script>{template_parts["navbar_js"]}</script>
</body>'''
            content = content.replace('</body>', js_block)
    
    # 修復：移除所有現有的active類 (修正正則表達式)
    content = re.sub(r'(<li><a href="[^"]*) class="active"', r'\1', content)
    
    # 為當前頁面添加active類
    current_page = os.path.basename(html_file)
    
    # 處理不同頁面的active狀態
    if 'index.html' in html_file:
        content = content.replace('<a href="/index.html">', '<a href="/index.html" class="active">')
    elif 'services.html' in html_file and 'services/' not in html_file:
        content = content.replace('<a href="/services.html">', '<a href="/services.html" class="active">')
    elif 'services/tax.html' in html_file:
        content = content.replace('<a href="/services/tax.html">', '<a href="/services/tax.html" class="active">')
    elif 'services/accounting.html' in html_file:
        content = content.replace('<a href="/services/accounting.html">', '<a href="/services/accounting.html" class="active">')
    elif 'services/consulting.html' in html_file:
        content = content.replace('<a href="/services/consulting.html">', '<a href="/services/consulting.html" class="active">')
    elif 'team.html' in html_file:
        content = content.replace('<a href="/team.html">', '<a href="/team.html" class="active">')
    elif 'blog.html' in html_file:
        content = content.replace('<a href="/blog.html">', '<a href="/blog.html" class="active">')
    elif 'faq.html' in html_file:
        content = content.replace('<a href="/faq.html">', '<a href="/faq.html" class="active">')
    elif 'video.html' in html_file:
        content = content.replace('<a href="/video.html">', '<a href="/video.html" class="active">')
    elif 'contact.html' in html_file:
        content = content.replace('<a href="/contact.html">', '<a href="/contact.html" class="active">')
    elif 'booking.html' in html_file:
        content = content.replace('<a href="/booking.html">', '<a href="/booking.html" class="active">')
    
    # 寫回文件
    try:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ 成功修復")
        return True
    except Exception as e:
        print(f"  ❌ 寫入失敗: {str(e)}")
        return False

def main():
    """主函數"""
    if len(sys.argv) < 2:
        print("❌ 請提供模板文件路徑")
        print("使用方法: python fix_with_template.py <template_file> [project_directory]")
        sys.exit(1)
    
    template_path = sys.argv[1]
    
    if not os.path.exists(template_path) or not os.path.isfile(template_path):
        print(f"❌ 模板文件不存在: {template_path}")
        sys.exit(1)
    
    # 獲取項目目錄
    if len(sys.argv) > 2:
        project_dir = sys.argv[2]
    else:
        project_dir = os.getcwd()
    
    print(f"🔍 使用模板文件: {template_path}")
    print(f"🔍 使用項目目錄: {project_dir}")
    
    # 提取模板部分
    template_parts = extract_template_parts(template_path)
    
    if not template_parts["navbar_html"]:
        print("❌ 無法從模板中提取導航欄HTML")
        sys.exit(1)
    
    # 找到所有HTML文件，排除模板文件
    html_files = find_html_files(project_dir, [template_path])
    print(f"🔍 找到 {len(html_files)} 個HTML文件需要修復")
    
    # 確認是否繼續
    if len(html_files) > 0:
        confirm = input(f"確認使用模板修復 {len(html_files)} 個HTML文件? (y/n): ")
        if confirm.lower() != 'y':
            print("❌ 操作取消")
            sys.exit(0)
    else:
        print("❌ 未找到需要修復的HTML文件")
        sys.exit(1)
    
    # 處理每個HTML文件
    success_count = 0
    for html_file in html_files:
        print(f"\n🔄 處理: {html_file}")
        if fix_html_file(html_file, template_parts):
            success_count += 1
    
    # 完成提示
    print("\n✅ 修復完成!")
    print(f"✅ 成功修復了 {success_count}/{len(html_files)} 個HTML文件")
    print(f"✅ 每個文件都創建了備份 (.template-fix.bak)")
    
    print("\n📋 後續步驟:")
    print("1. 檢查網站的導航欄是否正確顯示")
    print("2. 如果有問題，可以通過備份文件還原: .template-fix.bak")
    print("3. 請確認style.css文件路徑正確，內容完整")

if __name__ == "__main__":
    main()