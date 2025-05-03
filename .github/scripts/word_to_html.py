#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Word 文檔轉換為 HTML 工具
用於將 Word 文檔轉換為符合網站風格的 HTML 文件
優化版本 2.0：強化排版分段表現形式
"""

import os
import sys
import re
import json
import random
import datetime
import mammoth
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# 引入 utils 模組 (如果存在)
try:
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    from utils import load_translation_dict, extract_keywords
except ImportError:
    print("無法導入 utils 模組，將使用內部函數")
    def load_translation_dict():
        return {}
    
    def extract_keywords(text, top_n=5):
        # 簡單實現，實際使用中應考慮導入 jieba 等分詞工具
        words = text.split()
        return words[:top_n]

# 獲取專案根目錄
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 設置預設分類
CATEGORY_MAPPING = {
    "稅務": "tax",
    "會計": "accounting",
    "企業": "business",
    "記帳": "accounting",
    "財務": "financial",
    "創業": "startup",
    "法律": "legal"
}

def slugify(text: str) -> str:
    """
    將文本轉換為 URL 友好的格式
    :param text: 要轉換的文本
    :return: URL 友好的字符串
    """
    # 轉換為小寫
    slug = text.lower()
    # 將空格和特殊字符替換為連接符
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = re.sub(r'^-+|-+$', '', slug)
    return slug

def select_thumbnail_for_category(category: str) -> str:
    """
    根據分類選擇合適的縮略圖
    :param category: 分類代碼
    :return: 圖片文件名
    """
    # 根據分類返回相應的圖片
    category_images = {
        "tax": ["tax-planning.jpg", "cross-border-tax.jpg", "international-tax.jpg"],
        "accounting": ["accounting.jpg", "startup-accounting.jpg", "bookkeeping.jpg"],
        "business": ["business-growth.jpg", "startup-business.jpg", "company-register.jpg"],
        "financial": ["financial-planning.jpg", "investment.jpg", "wealth-management.jpg"],
        "startup": ["startup-business.jpg", "startup-accounting.jpg", "entrepreneur.jpg"],
        "legal": ["legal-advice.jpg", "contract.jpg", "compliance.jpg"]
    }
    
    # 獲取對應分類的圖片列表，如果沒有則使用默認
    images = category_images.get(category, ["default.jpg"])
    
    # 隨機選擇一張圖片
    return random.choice(images)

def extract_content_from_docx(docx_path: str) -> Tuple[str, str, List[Dict[str, str]], List[str]]:
    """
    從 docx 文件中提取內容
    :param docx_path: Word 文檔路徑
    :return: (標題, 摘要, 段落列表, 標籤列表)
    """
    try:
        # 使用 mammoth 轉換 docx 為 HTML
        with open(docx_path, 'rb') as docx_file:
            result = mammoth.convert_to_html(docx_file)
            html_content = result.value
        
        # 提取標題 (假設第一個 h1 或 h2 是標題)
        title_match = re.search(r'<h[12][^>]*>(.*?)</h[12]>', html_content)
        title = title_match.group(1) if title_match else os.path.basename(docx_path).replace('.docx', '')
        
        # 提取段落
        paragraphs = []
        for tag in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote']:
            for match in re.finditer(rf'<{tag}[^>]*>(.*?)</{tag}>', html_content):
                text = match.group(1).strip()
                if text and not text.startswith('<') and not text.endswith('>'):
                    paragraphs.append({
                        "style": tag,
                        "text": text
                    })
        
        # 提取摘要 (使用第一段非標題文本)
        summary = ""
        for para in paragraphs:
            if para["style"] == "p" and len(para["text"]) > 30:
                summary = para["text"][:200] + "..." if len(para["text"]) > 200 else para["text"]
                break
        
        # 如果沒有找到合適的摘要，使用標題
        if not summary:
            summary = f"{title} - 專業財稅知識分享"
        
        # 從內容中提取可能的標籤
        full_text = title + " " + " ".join([p["text"] for p in paragraphs])
        keywords = extract_keywords(full_text, 5)
        
        return title, summary, paragraphs, keywords
    
    except Exception as e:
        print(f"處理 Word 文檔時出錯: {str(e)}")
        return "文章標題", "文章摘要", [{"style": "p", "text": "文章內容無法提取"}], ["財稅", "會計", "企業"]

def determine_category(text: str) -> Tuple[str, str]:
    """
    根據文章內容確定分類
    :param text: 文章內容
    :return: (主要分類中文名, 分類代碼)
    """
    # 計算各個分類關鍵詞出現的次數
    category_scores = {
        "稅務相關": 0,
        "會計記帳": 0,
        "企業經營": 0,
        "財務規劃": 0,
        "創業資訊": 0,
        "法律知識": 0
    }
    
    # 關鍵詞列表
    keywords = {
        "稅務相關": ["稅", "報稅", "節稅", "稅務", "稅收", "所得稅", "營業稅", "扣繳", "稅法"],
        "會計記帳": ["會計", "記帳", "帳務", "財報", "憑證", "審計", "財務報表", "會計師"],
        "企業經營": ["企業", "公司", "經營", "管理", "營運", "商業", "策略", "執行長"],
        "財務規劃": ["財務", "規劃", "投資", "理財", "資產", "負債", "現金流", "財富"],
        "創業資訊": ["創業", "新創", "新創事業", "創業家", "募資", "新創團隊"],
        "法律知識": ["法律", "法規", "合約", "合同", "條款", "法規", "權利", "義務"]
    }
    
    # 統計關鍵詞出現次數
    for category, words in keywords.items():
        for word in words:
            if word in text:
                category_scores[category] += text.count(word)
    
    # 選取得分最高的類別
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    
    # 如果沒有明確的類別，默認為稅務相關
    if category_scores[primary_category] == 0:
        primary_category = "稅務相關"
    
    # 獲取分類代碼
    category_map = {
        "稅務相關": "tax",
        "會計記帳": "accounting",
        "企業經營": "business",
        "財務規劃": "financial",
        "創業資訊": "startup",
        "法律知識": "legal"
    }
    
    category_code = category_map.get(primary_category, "tax")
    
    return primary_category, category_code

def generate_html(title: str, paragraphs: List[Dict[str, str]], tags: List[str], 
                 date: str, summary: str, primary_category: str, category_code: str,
                 image: str = None) -> str:
    """
    生成HTML內容，使用符合 article.html 的格式，但簡化版本
    :param title: 文章標題
    :param paragraphs: 段落列表
    :param tags: 標籤列表
    :param date: 日期
    :param summary: 摘要
    :param primary_category: 主要分類(中文)
    :param category_code: 分類代碼(英文)
    :param image: 圖片名稱
    :return: HTML內容
    """
    # 如果沒有指定圖片，根據分類隨機選擇一張
    if not image:
        image = select_thumbnail_for_category(category_code)
    
    # 設置圖片路徑
    image_path = f"/assets/images/blog/{image}"
    
    # 生成檔案名（不含路徑）
    file_name = f"{date}-{slugify(title)}.html"
    # 生成相對 URL 路徑（僅用於結構化資料）
    relative_url = f"/blog/{file_name}"
    
    # 預設作者相關內容
    author_name = "林會計師"
    author_title = "稅務與國際帳務專家"
    author_bio = "擁有20年以上業界經驗，專長於企業稅務規劃、跨境稅務與投資架構設計。精通臺商赴海外投資的各項財稅規劃，以及外資來臺投資的稅務審查與租稅協定應用。"
    author_image = "/assets/images/team/lin-profile.jpg"
    
    # 生成HTML頭部
    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{summary}" />
  <title>{title} | 霍爾果斯會計師事務所</title>
  
  <!-- Favicon -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  
  <!-- Material Symbols 圖示庫 -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  
  <!-- 引用全站共用樣式 -->
  <link rel="stylesheet" href="/assets/css/common.css" />
  <link rel="stylesheet" href="/assets/css/navbar.css" />
  <link rel="stylesheet" href="/assets/css/footer.css" />
  
  <!-- 新增: 首頁特定樣式 - 用於流動式設計 -->
  <link rel="stylesheet" href="/assets/css/index-style.css" />
  
  <!-- 文章內頁專用現代化樣式 -->
  <link rel="stylesheet" href="/assets/css/blog-article-modern.css" />
  
  <!-- Google 分析 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-RKMCS9WVS5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-RKMCS9WVS5');
  </script>
  
  <!-- 結構化資料 -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "{title}",
    "description": "{summary}",
    "image": "https://www.horgoscpa.com{image_path}",
    "datePublished": "{date}",
    "dateModified": "{date}",
    "author": {{
      "@type": "Person",
      "name": "{author_name}",
      "url": "https://www.horgoscpa.com/team.html"
    }},
    "publisher": {{
      "@type": "Organization",
      "name": "霍爾果斯會計師事務所",
      "logo": {{
        "@type": "ImageObject",
        "url": "https://www.horgoscpa.com/assets/images/logo.png"
      }}
    }},
    "mainEntityOfPage": {{
      "@type": "WebPage",
      "@id": "https://www.horgoscpa.com{relative_url}"
    }},
    "keywords": "{', '.join(tags)}"
  }}
  </script>
</head>
<body>

<!-- 導航欄 - 更新版 -->
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
      <li><a href="/services.html">專業服務</a></li>
      <li><a href="/team.html">專業團隊</a></li>
      <li><a href="/blog.html" class="active">專欄文章</a></li>
      <li><a href="/faq.html">常見問題</a></li>
      <li><a href="/video.html">影音專區</a></li>
      <li><a href="/contact.html">聯繫我們</a></li>
      <li><a href="/booking.html" class="nav-consult-btn">免費諮詢</a></li>
    </ul>
  </div>
</nav>

<!-- 文章頁面標題區塊 -->
<header class="article-header">
  <div class="container">
    <div class="article-header-content">
      <!-- 實際內容由文章卡片展示 -->
    </div>
  </div>
</header>

<!-- 文章內容主體區塊 -->
<section class="article-content-section">
  <div class="article-container">
    <!-- 文章卡片 -->
    <article class="article-card">
      <!-- 文章元數據 -->
      <div class="article-meta">
        <div class="article-date">
          <span class="material-symbols-rounded">calendar_month</span>
          {date}
        </div>
        <a href="/blog.html?category={category_code}" class="article-category">
          <span class="material-symbols-rounded">sell</span>
          {primary_category}
        </a>
      </div>
      
      <!-- 文章標題區 -->
      <div class="article-header-main">
        <h1 class="article-title">{title}</h1>
        <h2 class="article-subtitle">{summary}</h2>
      </div>
      
      <!-- 文章主圖 -->
      <img src="{image_path}" alt="{title}" class="article-featured-image">
"""
    
    # 提取標題以生成目錄
    toc_items = []
    section_id = 0
    for i, para in enumerate(paragraphs):
        if para["style"].startswith('h') and len(para["style"]) == 2 and para["style"][1].isdigit():
            level = int(para["style"][1])
            if level > 1 and level <= 4:  # 只處理h2、h3、h4
                section_id += 1
                anchor_id = f"section-{section_id}"
                toc_class = "article-toc-item" if level == 2 else "article-toc-item article-toc-subitem"
                toc_items.append({
                    "id": anchor_id,
                    "title": para["text"],
                    "level": level,
                    "class": toc_class
                })
    
    # 如果有足夠的標題，添加文章結構導航
    if len(toc_items) >= 2:
        html += """      
      <!-- 文章結構導航 -->
      <div class="article-toc">
        <h3 class="article-toc-title">文章目錄</h3>
        <ul class="article-toc-list">
"""
        
        # 生成目錄HTML
        for item in toc_items:
            html += f"""          <li class="{item['class']}">
            <a href="#{item['id']}" class="article-toc-link">{item['title']}</a>
          </li>
"""
        
        html += """        </ul>
      </div>
"""
    
    html += """      
      <!-- 文章內容主體 -->
      <div class="article-body">
"""
    
    # 添加文章內容，增強對特殊區塊的處理
    section_id = 0
    in_list = False
    list_type = None
    
    for i, para in enumerate(paragraphs):
        text = para["text"]
        style = para["style"]
        
        # 處理標題並添加錨點
        if style.startswith('h') and len(style) == 2 and style[1].isdigit():
            level = int(style[1])
            if level > 1 and level <= 4:  # 只處理h2、h3、h4
                section_id += 1
                anchor_id = f"section-{section_id}"
                html += f'        <{style} id="{anchor_id}">{text}</{style}>\n'
                continue
        
        # 檢測並處理提示區塊
        if text.startswith("提示:") or text.startswith("TIP:"):
            html += f'        <div class="tip-block">\n'
            html += f'          <p>{text[5:].strip()}</p>\n'
            html += f'        </div>\n'
            continue
            
        # 檢測並處理警告區塊
        if text.startswith("警告:") or text.startswith("WARNING:"):
            html += f'        <div class="warning-block">\n'
            html += f'          <p>{text[6:].strip()}</p>\n'
            html += f'        </div>\n'
            continue
            
        # 檢測並處理注意區塊
        if text.startswith("注意:") or text.startswith("NOTE:"):
            html += f'        <div class="note-block">\n'
            html += f'          <p>{text[6:].strip()}</p>\n'
            html += f'        </div>\n'
            continue
        
        # 處理表格標題和注釋
        if style == "p" and (text.startswith("表格:") or text.startswith("表:") or text.startswith("TABLE:")):
            html += f'        <div class="table-note">{text[text.find(":")+1:].strip()}</div>\n'
            continue
        
        # 處理分隔線
        if style == "p" and (text.strip() == "---" or text.strip() == "***" or text.strip() == "___"):
            html += f'        <hr>\n'
            continue
            
        # 處理圖片說明
        if style == "p" and (text.startswith("圖:") or text.startswith("圖片:") or text.startswith("FIGURE:")):
            # 檢查是否有前一個元素
            last_lines = html.splitlines()
            if len(last_lines) > 2 and ("<img" in last_lines[-2] or "<p><img" in last_lines[-2]):
                # 找到最近的圖片並將其包裝在figure中
                img_line_index = -1
                for j in range(len(last_lines) - 1, -1, -1):
                    if "<img" in last_lines[j]:
                        img_line_index = j
                        break
                
                if img_line_index != -1:
                    # 轉換為figure格式
                    img_line = last_lines[img_line_index]
                    if "<p><img" in img_line:
                        img_line = img_line.replace("<p><img", "<figure>\n          <img")
                        # 刪除可能的</p>
                        if "</p>" in last_lines[img_line_index + 1]:
                            last_lines[img_line_index + 1] = ""
                    else:
                        img_line = img_line.replace("<img", "<figure>\n          <img")
                    
                    last_lines[img_line_index] = img_line
                    
                    # 添加figcaption
                    caption_text = text[text.find(":")+1:].strip()
                    figcaption_line = f'          <figcaption>{caption_text}</figcaption>\n        </figure>'
                    
                    # 重建HTML
                    html = "\n".join(last_lines[:img_line_index + 1]) + "\n" + figcaption_line + "\n" + "\n".join(last_lines[img_line_index + 2:])
                    continue
            
            # 如果沒有找到圖片，則作為普通段落處理
            html += f'        <p>{text}</p>\n'
            continue
        
        # 處理列表項
        if style == "li":
            if not in_list:
                # 開始新列表
                in_list = True
                list_type = "ul"  # 默認為無序列表
                html += f'        <{list_type}>\n'
            
            html += f'          <li>{text}</li>\n'
            
            # 檢查下一項是否仍為列表項
            if i == len(paragraphs) - 1 or paragraphs[i+1]["style"] != "li":
                html += f'        </{list_type}>\n'
                in_list = False
            continue
        elif in_list:
            # 如果不是列表項但之前在列表中，關閉列表
            html += f'        </{list_type}>\n'
            in_list = False
        
        # 處理引用區塊
        if style == "blockquote":
            html += f'        <blockquote>\n          <p>{text}</p>\n        </blockquote>\n'
            continue
        
        # 處理普通段落和其他元素
        if style.startswith("h") and len(style) == 2 and style[1].isdigit():
            level = int(style[1])
            if level == 1:  # h1 已經用於標題，所以內容中的 h1 轉為 h2
                html += f'        <h2>{text}</h2>\n'
            else:
                html += f'        <{style}>{text}</{style}>\n'
        else:
            html += f'        <{style}>{text}</{style}>\n'
    
    # 確保列表已關閉
    if in_list:
        html += f'        </{list_type}>\n'
    
    # 添加標籤區域
    html += """      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
"""
    
    # 添加標籤
    for tag in tags:
        html += f'          <a href="/blog.html?tag={slugify(tag)}" class="article-tag">{tag}</a>\n'
    
    html += """        </div>
      </div>
    </article>
    
    <!-- 作者資訊 -->
    <div class="author-card">
      <div class="author-avatar">
        <img src="{author_image}" alt="{author_name}">
      </div>
      <div class="author-info">
        <h3 class="author-name">{author_name}</h3>
        <div class="author-title">{author_title}</div>
        <p class="author-bio">{author_bio}</p>
      </div>
    </div>
    
    <!-- 簡化後的文章導航 - 只保留返回部落格按鈕 -->
    <div class="article-navigation">
      <a href="/blog.html" class="back-to-blog">
        <span class="material-symbols-rounded">view_list</span>
        返回文章列表
      </a>
    </div>
  </div>
</section>

<!-- 頁尾區域 - 更新版 -->
<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-content">
      <!-- Logo與簡介 -->
      <div class="footer-logo">
        <div class="logo-main" style="color: white; font-size: 1.5rem; font-weight: 700; margin-bottom: 5px;">霍爾果斯會計師事務所</div>
        <div class="logo-sub" style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 15px;">HorgosCPA</div>
        <p>專業、誠信、創新的財稅顧問夥伴，致力於提供企業與個人最優質的財務與稅務解決方案。</p>
        <!-- 新增LINE按鈕 -->
        <a href="https://line.me/R/ti/p/@208ihted" target="_blank" class="footer-line-btn">
          <span class="line-icon"></span>
          <span>加入LINE好友</span>
        </a>
      </div>
      
      <!-- 聯絡資訊 -->
      <div class="footer-contact">
        <h3>聯絡我們</h3>
        <ul class="contact-info">
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">location_on</span></i>
            <span>台中市西區建國路21號3樓之1</span>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">call</span></i>
            <a href="tel:+886422205606">04-2220-5606</a>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">schedule</span></i>
            <span>週一至週五 8:30-17:30</span>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">mail</span></i>
            <a href="mailto:contact@horgoscpa.com">contact@horgoscpa.com</a>
          </li>
        </ul>
      </div>
      
      <!-- 快速連結 -->
      <div class="footer-links">
        <h3>快速連結</h3>
        <ul class="quick-links">
          <li><a href="/index.html"><span class="material-symbols-rounded icon-link">home</span> 首頁</a></li>
          <li><a href="/team.html"><span class="material-symbols-rounded icon-link">groups</span> 專業團隊</a></li>
          <li><a href="/blog.html"><span class="material-symbols-rounded icon-link">article</span> 專欄文章</a></li>
          <li><a href="/faq.html"><span class="material-symbols-rounded icon-link">help</span> 常見問題</a></li>
          <li><a href="/video.html"><span class="material-symbols-rounded icon-link">play_circle</span> 影片</a></li>
          <li><a href="/contact.html"><span class="material-symbols-rounded icon-link">contact_mail</span> 聯絡資訊</a></li>
        </ul>
      </div>
      
      <!-- 服務項目 - 更新為與首頁一致 -->
      <div class="footer-services">
        <h3>服務項目</h3>
        <ul class="services-list">
          <li><a href="/services/consulting.html"><span class="material-symbols-rounded icon-link">store</span> 工商登記</a></li>
          <li><a href="/services/accounting.html"><span class="material-symbols-rounded icon-link">account_balance_wallet</span> 帳務處理</a></li>
          <li><a href="/services/tax.html"><span class="material-symbols-rounded icon-link">payments</span> 稅務申報</a></li>
          <li><a href="/services/tax.html"><span class="material-symbols-rounded icon-link">verified</span> 財稅簽證</a></li>
          <li><a href="/booking.html"><span class="material-symbols-rounded icon-link">event_available</span> 預約諮詢</a></li>
        </ul>
      </div>
    </div>
    
    <!-- 版權資訊 -->
    <div class="footer-bottom">
      <div class="footer-text">
        <p>&copy; 2025 霍爾果斯會計師事務所</p>
      </div>
    </div>
  </div>
  
  <!-- 返回頂部按鈕 -->
  <div class="back-to-top">
    <span class="material-symbols-rounded">arrow_upward</span>
  </div>
</footer>

<!-- 返回頂部按鈕功能 - 腳本 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // 返回頂部按鈕功能
    const backToTopButton = document.querySelector('.back-to-top');
    
    // 初始隱藏按鈕
    backToTopButton.classList.remove('visible');
    
    // 監聽滾動事件
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    });
    
    // 點擊事件
    backToTopButton.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  });
</script>

<!-- 導航欄功能腳本 -->
<script src="/assets/js/navbar.js"></script>

<!-- 文章閱讀進度指示器 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // 創建閱讀進度條
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'reading-progress';
    progressIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 4px;
      background: var(--secondary-color);
      width: 0%;
      z-index: 1001;
      transition: width 0.2s ease;
    `;
    document.body.appendChild(progressIndicator);
    
    // 計算閱讀進度
    function updateReadingProgress() {
      const articleContent = document.querySelector('.article-card');
      if (!articleContent) return;
      
      const contentHeight = articleContent.offsetHeight;
      const contentTop = articleContent.offsetTop;
      const contentBottom = contentTop + contentHeight;
      const currentPosition = window.scrollY + window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // 考慮視窗大小，確保內容完全可見時進度為100%
      let progress = 0;
      if (currentPosition > contentTop) {
        progress = Math.min(100, ((currentPosition - contentTop) / (contentHeight)) * 100);
      }
      
      progressIndicator.style.width = `${progress}%`;
      
      // 當閱讀完畢時添加動畫效果
      if (progress >= 99) {
        progressIndicator.style.transition = 'width 0.5s ease, opacity 1s ease';
        progressIndicator.style.opacity = '0.5';
      } else {
        progressIndicator.style.transition = 'width 0.2s ease';
        progressIndicator.style.opacity = '1';
      }
    }
    
    // 滾動時更新進度
    window.addEventListener('scroll', updateReadingProgress);
    window.addEventListener('resize', updateReadingProgress);
    
    // 初始化進度
    updateReadingProgress();
    
    // 目錄導航功能
    const tocLinks = document.querySelectorAll('.article-toc-link');
    const sections = document.querySelectorAll('h2[id^="section-"], h3[id^="section-"], h4[id^="section-"]');
    
    if (tocLinks.length > 0 && sections.length > 0) {
      // 監聽滾動事件，高亮當前閱讀的段落
      window.addEventListener('scroll', function() {
        // 獲取當前滾動位置
        const scrollPosition = window.scrollY;
        
        // 決定當前可見的段落
        let currentSectionId = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop - 120; // 添加一些偏移
          if (scrollPosition >= sectionTop) {
            currentSectionId = section.id;
          }
        });
        
        // 移除所有活動狀態
        tocLinks.forEach(link => {
          link.classList.remove('active');
        });
        
        // 添加當前段落的活動狀態
        if (currentSectionId) {
          const currentLink = document.querySelector(`.article-toc-link[href="#${currentSectionId}"]`);
          if (currentLink) {
            currentLink.classList.add('active');
          }
        }
      });
      
      // 點擊目錄鏈接時平滑滾動到對應段落
      tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          
          const targetId = this.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 100,
              behavior: 'smooth'
            });
            
            // 更新URL錨點但不跳轉
            history.pushState(null, null, `#${targetId}`);
          }
        });
      });
    }
  });
</script>

</body>
</html>
"""
    
    return html

def process_word_files(input_dir: str, output_dir: str) -> None:
    """
    處理指定目錄中的Word文檔，轉換為HTML
    :param input_dir: 輸入目錄
    :param output_dir: 輸出目錄
    """
    # 確保輸出目錄存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 獲取所有Word文檔
    docx_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.docx') and not f.startswith('~$')]  # 排除臨時檔案
    
    if not docx_files:
        print(f"在 {input_dir} 中沒有找到Word文檔")
        return
    
    print(f"找到 {len(docx_files)} 個Word文檔")
    
    # 處理每個Word文檔
    for docx_file in docx_files:
        docx_path = os.path.join(input_dir, docx_file)
        print(f"處理: {docx_path}")
        
        try:
            # 提取Word文檔內容
            title, summary, paragraphs, tags = extract_content_from_docx(docx_path)
            
            # 獲取當前日期
            date = datetime.datetime.now().strftime("%Y-%m-%d")
            
            # 獲取文章全文用於分類判斷
            full_text = title + " " + summary + " " + " ".join([p["text"] for p in paragraphs])
            
            # 判斷文章分類
            primary_category, category_code = determine_category(full_text)
            
            # 生成檔案名
            file_name = f"{date}-{slugify(title)}.html"
            
            # 生成HTML
            html_content = generate_html(
                title=title,
                paragraphs=paragraphs,
                tags=tags,
                date=date,
                summary=summary,
                primary_category=primary_category,
                category_code=category_code
            )
            
            # 寫入HTML文件
            output_path = os.path.join(output_dir, file_name)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"成功轉換 {docx_file} 到 {file_name}")
        
        except Exception as e:
            print(f"處理 {docx_file} 時出錯: {str(e)}")
            import traceback
            traceback.print_exc()

def main() -> None:
    """主函數"""
    # 檢查命令行參數
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    # 處理Word文檔
    process_word_files(input_dir, output_dir)

if __name__ == "__main__":
    main()