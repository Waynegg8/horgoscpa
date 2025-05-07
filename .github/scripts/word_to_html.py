#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word 文檔轉換為 HTML 工具 - 簡化版
專注於格式轉換，不處理分類和標籤
作者: Claude
日期: 2025-05-07
"""

import os
import sys
import re
import json
import logging
import datetime
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# 添加必要導入
import importlib
import subprocess

# 確保依賴安裝
def ensure_dependencies():
    required_packages = [
        "mammoth", "python-docx", "bs4", "lxml", "docx2txt"
    ]
    
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"安裝缺失的依賴: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# 設置日誌
def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"word_conversion_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("word_converter")

logger = setup_logging()

def extract_date_from_filename(filename: str) -> Optional[str]:
    """從檔名提取日期"""
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        date_str = date_match.group(1)
        try:
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            pass
    return None

def extract_series_info_from_filename(filename: str) -> Tuple[bool, Optional[str], Optional[int]]:
    """從檔名提取系列信息"""
    series_match = re.search(r'EP(\d+)[-_]', filename, re.IGNORECASE)
    if series_match:
        name_parts = filename.split('EP', 1)[0].strip()
        name_parts = re.sub(r'^\d{4}-\d{2}-\d{2}[-_]?', '', name_parts).strip('-_')
        if not name_parts:
            base_name = os.path.splitext(filename)[0]
            parts = re.split(r'EP\d+[-_]', base_name, flags=re.IGNORECASE)[0]
            parts = re.sub(r'^\d{4}-\d{2}-\d{2}[-_]?', '', parts).strip('-_')
            name_parts = parts or "未命名系列"
        series_name = name_parts
        episode = int(series_match.group(1))
        return True, series_name, episode
    return False, None, None

def extract_word_content(docx_path: str) -> Dict:
    """提取Word文檔內容"""
    logger.info(f"開始提取Word文檔內容: {docx_path}")
    
    result = {}
    
    try:
        # 使用mammoth直接提取HTML
        import mammoth
        with open(docx_path, "rb") as docx_file:
            mammoth_result = mammoth.convert_to_html(docx_file)
            result["mammoth_html"] = mammoth_result.value
            result["mammoth_messages"] = mammoth_result.messages
            logger.info("使用mammoth成功提取HTML")
    except Exception as e:
        logger.error(f"使用mammoth提取失敗: {str(e)}")
        result["mammoth_html"] = None
    
    try:
        # 使用python-docx提取文本
        import docx
        doc = docx.Document(docx_path)
        paragraphs = [p.text for p in doc.paragraphs]
        result["docx_text"] = "\n".join(paragraphs)
        logger.info("使用python-docx成功提取文本")
    except Exception as e:
        logger.error(f"使用python-docx提取失敗: {str(e)}")
        result["docx_text"] = None
    
    try:
        # 使用docx2txt提取文本
        import docx2txt
        result["docx2txt_text"] = docx2txt.process(docx_path)
        logger.info("使用docx2txt成功提取文本")
    except Exception as e:
        logger.error(f"使用docx2txt提取失敗: {str(e)}")
        result["docx2txt_text"] = None
    
    return result

def convert_to_html(content_dict: Dict) -> str:
    """將提取的內容轉換為HTML"""
    logger.info("開始將提取內容轉換為HTML")
    
    # 優先使用mammoth提取的HTML
    if content_dict.get("mammoth_html"):
        return content_dict["mammoth_html"]
    
    # 備用方案：使用docx2txt或python-docx提取的文本轉換為HTML
    if content_dict.get("docx2txt_text"):
        text = content_dict["docx2txt_text"]
    elif content_dict.get("docx_text"):
        text = content_dict["docx_text"]
    else:
        logger.error("無法提取Word內容")
        return "<p>無法提取Word內容，請檢查文檔格式。</p>"
    
    # 簡單的文本轉HTML
    lines = text.split("\n")
    html_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 標題判斷
        if re.match(r'^#\s+', line):  # Markdown-like 一級標題
            title = re.sub(r'^#\s+', '', line)
            html_lines.append(f"<h1>{title}</h1>")
        elif re.match(r'^##\s+', line):  # Markdown-like 二級標題
            title = re.sub(r'^##\s+', '', line)
            html_lines.append(f"<h2>{title}</h2>")
        elif re.match(r'^###\s+', line):  # Markdown-like 三級標題
            title = re.sub(r'^###\s+', '', line)
            html_lines.append(f"<h3>{title}</h3>")
        else:
            html_lines.append(f"<p>{line}</p>")
    
    return "\n".join(html_lines)

def clean_html_content(html_content: str) -> str:
    """清理HTML內容，處理格式問題"""
    logger.info("開始清理HTML內容")
    
    try:
        from bs4 import BeautifulSoup
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 移除空段落
        for p in soup.find_all('p'):
            if not p.text.strip():
                p.decompose()
        
        # 替換文檔中的樣式為標準樣式
        for tag in soup.find_all(['span', 'div']):
            if 'style' in tag.attrs:
                del tag['style']
        
        # 返回清理後的HTML
        return str(soup)
    except Exception as e:
        logger.error(f"清理HTML內容時出錯: {str(e)}")
        return html_content

def extract_article_structure(html_content: str) -> Optional[Dict]:
    """提取文章結構（標題、摘要等）"""
    logger.info("開始提取文章結構")
    
    try:
        from bs4 import BeautifulSoup
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 查找標題（假設第一個h1或h2是標題）
        title_tag = soup.find(['h1', 'h2'])
        title = title_tag.text.strip() if title_tag else "無標題文章"
        
        # 如果找到標題，從原HTML中移除
        if title_tag:
            title_tag.extract()
        
        # 提取摘要（假設第一個p是摘要）
        summary_tag = soup.find('p')
        summary = summary_tag.text.strip() if summary_tag else ""
        
        # 限制摘要長度
        if len(summary) > 200:
            summary = summary[:197] + "..."
        
        # 獲取完整內容
        content = str(soup)
        
        return {
            'title': title,
            'summary': summary,
            'content': content
        }
    except Exception as e:
        logger.error(f"提取文章結構時出錯: {str(e)}")
        return None

def generate_basic_html(article_structure: Optional[Dict], date: str, original_filename: str, docx_path: str = None) -> Tuple[str, str]:
    """生成基本HTML文件內容和建議的文件名"""
    logger.info(f"開始生成基本HTML，日期: {date}")
    
    # 處理article_structure為None的情況
    if article_structure is None:
        logger.warning(f"無法通過標準流程提取文章結構: {original_filename}")
        
        # 嘗試直接從Word文件獲取原始內容
        try:
            import mammoth
            from bs4 import BeautifulSoup
            
            with open(docx_path, "rb") as docx_file:
                result = mammoth.convert_to_html(docx_file)
                html_content = result.value
                
                # 使用BeautifulSoup解析HTML
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # 嘗試獲取標題 (假設第一個h1或者h2是標題)
                title_tag = soup.find(['h1', 'h2'])
                title = title_tag.get_text().strip() if title_tag else None
                
                # 如果無法從HTML中獲取標題，嘗試從文件名中提取
                if not title:
                    # 從檔名中提取標題
                    # 移除日期部分
                    clean_filename = re.sub(r'^\d{4}-\d{2}-\d{2}-?', '', original_filename)
                    # 移除EP部分
                    title_match = re.search(r'EP\d+-(.+?)\.docx$', clean_filename)
                    if title_match:
                        title = title_match.group(1)
                    else:
                        title = os.path.splitext(clean_filename)[0]
                
                # 如果找到標題，從原HTML中移除
                if title_tag:
                    title_tag.extract()
                
                # 從文檔前200個字符中提取摘要
                text_content = soup.get_text().strip()
                summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
                
                # 創建article_structure
                article_structure = {
                    'title': title,
                    'summary': summary,
                    'content': html_content
                }
                
                logger.info(f"成功使用備用方法提取文章內容，標題: {title}")
            
        except Exception as e:
            logger.error(f"備用提取方法也失敗: {str(e)}")
            # 創建最基本的文章結構
            title = os.path.splitext(original_filename)[0]
            article_structure = {
                'title': title,
                'summary': "文章摘要暫時無法提取",
                'content': "<p>文章內容提取失敗，請檢查原始文檔格式。</p>"
            }
    
    # 獲取文章標題、摘要和內容
    title = article_structure['title']
    summary = article_structure['summary']
    content = article_structure['content']
    
    # 從文件名提取系列信息
    is_series, series_name, episode = extract_series_info_from_filename(original_filename)
    
    # 生成英文Slug (用於URL)
    title_for_slug = re.sub(r'[^\w\s]', '', title).lower()
    slug_parts = title_for_slug.split()[:5]  # 使用前5個單詞
    slug = '-'.join(slug_parts)
    if is_series:
        slug = f"{series_name.lower().replace(' ', '-')}-ep{episode}-{slug}"
    slug = re.sub(r'-+', '-', slug)  # 移除連續的連字符
    
    # 生成eng_url變數供模板使用
    eng_url = slug
    
    # 生成HTML內容
    html_content = generate_html_template(title, summary, content, date, is_series, series_name, episode, original_filename, eng_url)
    
    # 生成建議的文件名
    if is_series:
        suggested_filename = f"{date}-{series_name.lower().replace(' ', '-')}-ep{episode}-{slug}.html"
    else:
        # 使用哈希值確保文件名唯一
        hash_value = hashlib.md5(title.encode('utf-8')).hexdigest()[:8]
        suggested_filename = f"{date}-{slug}-{hash_value}.html"
    
    return html_content, suggested_filename

def generate_html_template(title, summary, content, date, is_series=False, series_name=None, episode=None, original_filename=None, eng_url=None):
    """生成完整HTML模板，包含導航欄和頁腳"""
    
    # 如果沒有提供eng_url，生成一個默認值
    if eng_url is None:
        eng_url = "article"
    
    # 設置系列文章的meta標籤
    series_meta = ""
    if is_series and series_name and episode:
        series_meta = f"""
  <meta name="series-name" content="{series_name}">
  <meta name="series-episode" content="{episode}">
  <meta name="original-filename" content="{original_filename}">
"""
    
    # 生成結構化數據
    json_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": summary,
        "image": "https://www.horgoscpa.com/assets/images/blog/tax_1.jpg",
        "datePublished": date,
        "dateModified": date,
        "author": {
            "@type": "Person",
            "name": "霍爾果斯會計師事務所",
            "url": "https://www.horgoscpa.com/team.html"
        },
        "publisher": {
            "@type": "Organization",
            "name": "霍爾果斯會計師事務所",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.horgoscpa.com/assets/images/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"https://www.horgoscpa.com/blog/{date}-article.html"
        },
        "keywords": "稅務, 會計, 財務規劃"
    }
    
    # 如果是系列文章，添加系列信息
    if is_series and series_name and episode:
        json_ld["isPartOf"] = {
            "@type": "Series",
            "name": series_name,
            "position": episode,
            "originalFilename": original_filename
        }
    
    # 將結構化數據轉換為JSON字符串
    json_ld_str = json.dumps(json_ld, ensure_ascii=False)
    
    # 生成完整HTML
    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{summary}" />
  <title>{title} | 霍爾果斯會計師事務所</title>
  {series_meta}

<!-- hreflang 標籤 -->
<link rel="alternate" hreflang="zh-TW" href="https://www.horgoscpa.com/blog/{date}-{eng_url}" />
  
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
  
  <!-- 移動版導航欄樣式 -->
  <link rel="stylesheet" href="/assets/css/mobile-navbar.css" />
  
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
  {json_ld_str}
  </script>
</head>
<body>

<!-- 導航欄 -->
<nav class="site-nav">
  <div class="nav-container">
    <div class="logo">
      <a href="/index.html">
        <div class="logo-container">
          <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img">
          <div class="logo-sub">HorgosCPA</div>
        </div>
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

<!-- 移動版導航欄 -->
<div class="mobile-navbar" style="display: none;">
  <div class="mobile-nav-container">
    <div class="mobile-menu-btn" id="mobileMenuBtn">
      <span class="material-symbols-rounded">menu</span>
    </div>
    <div class="logo">
      <a href="/index.html">
        <div class="logo-container">
          <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img">
          <div class="logo-sub">HorgosCPA</div>
        </div>
      </a>
    </div>
    <div class="mobile-nav-spacer"></div>
  </div>
  
  <div class="mobile-menu" id="mobileMenu">
    <ul class="mobile-menu-links">
      <li><a href="/services.html" class="mobile-nav-link">專業服務</a></li>
      <li><a href="/team.html" class="mobile-nav-link">專業團隊</a></li>
      <li><a href="/blog.html" class="mobile-nav-link">專欄文章</a></li>
      <li><a href="/faq.html" class="mobile-nav-link">常見問題</a></li>
      <li><a href="/video.html" class="mobile-nav-link">影音專區</a></li>
      <li><a href="/contact.html" class="mobile-nav-link">聯繫我們</a></li>
      <li><a href="/booking.html" class="mobile-consult-btn">免費諮詢</a></li>
    </ul>
  </div>
</div>

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
        <a href="/blog.html?category=tax" class="article-category">
          <span class="material-symbols-rounded">sell</span>
          稅務相關
        </a>
      </div>
      
      <!-- 文章標題區 -->
      <div class="article-header-main">
        <h1 class="article-title">{title}</h1>
      </div>
      
      <!-- 文章內容主體 -->
      <div class="article-body">
{content}
      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
          <a href="/blog.html?tag=tax" class="article-tag">稅務</a>
          <a href="/blog.html?tag=accounting" class="article-tag">會計</a>
          <a href="/blog.html?tag=financial-planning" class="article-tag">財務規劃</a>
        </div>
      </div>
    </article>
    
    <!-- 文章導航 - 包含上一篇/下一篇和返回部落格 -->
    <div class="article-navigation">
      <a href="#" id="prev-article" class="prev-article disabled">
        <span class="material-symbols-rounded">navigate_before</span>
        <span class="nav-title">載入中...</span>
        <span class="nav-message"></span>
      </a>
      <a href="/blog.html" class="back-to-blog">
        <span class="material-symbols-rounded">view_list</span>
        返回文章列表
      </a>
      <a href="#" id="next-article" class="next-article disabled">
        <span class="material-symbols-rounded">navigate_next</span>
        <span class="nav-title">載入中...</span>
        <span class="nav-message"></span>
      </a>
    </div>
  </div>
</section>

<!-- 頁尾區域 -->
<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-content">
      <!-- Logo與簡介 -->
      <div class="footer-logo">
        <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="footer-logo-img">
        <div class="logo-sub" style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 15px;">HorgosCPA</div>
        <p>專業、誠信、創新的財稅顧問夥伴，致力於提供企業與個人最優質的財務與稅務解決方案。</p>
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
          <li><a href="/video.html"><span class="material-symbols-rounded icon-link">play_circle</span> 影音專區</a></li>
          <li><a href="/contact.html"><span class="material-symbols-rounded icon-link">contact_mail</span> 聯絡資訊</a></li>
        </ul>
      </div>
      
      <!-- 服務項目 -->
      <div class="footer-services">
        <h3>服務項目</h3>
        <ul class="services-list">
          <li><a href="/services/consulting.html"><span class="material-symbols-rounded icon-link">store</span> 工商登記</a></li>
          <li><a href="/services/accounting.html"><span class="material-symbols-rounded icon-link">account_balance_wallet</span> 帳務處理</a></li>
          <li><a href="/services/tax.html"><span class="material-symbols-rounded icon-link">payments</span> 稅務申報</a></li>
          <li><a href="/services/audit.html"><span class="material-symbols-rounded icon-link">verified</span> 財稅簽證</a></li>
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

<!-- 返回頂部按鈕功能 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    const backToTopButton = document.querySelector('.back-to-top');
    backToTopButton.classList.remove('visible');
    window.addEventListener('scroll', function() {{
      if (window.pageYOffset > 300) {{
        backToTopButton.classList.add('visible');
      }} else {{
        backToTopButton.classList.remove('visible');
      }}
    }});
    backToTopButton.addEventListener('click', function() {{
      window.scrollTo({{
        top: 0,
        behavior: 'smooth'
      }});
    }});
    
    // 清理可能的格式問題
    (function cleanupArticleContent() {{
      const headers = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6');
      headers.forEach(header => {{
        header.innerHTML = header.innerHTML.replace(/^#+\\s*/, '');
      }});
      const allElements = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body p, .article-body li');
      allElements.forEach(el => {{
        el.innerHTML = el.innerHTML.replace(/\\*\\*(.*?)\\*\\*/g, '$1');
      }});
      const firstHeader = document.querySelector('.article-body h1:first-child, .article-body h2:first-child');
      const articleTitle = document.querySelector('.article-title');
      if (firstHeader && articleTitle && 
          firstHeader.textContent.trim().toLowerCase() === articleTitle.textContent.trim().toLowerCase()) {{
        firstHeader.style.display = 'none';
      }}
    }})();
  }});
</script>

<!-- 導航欄功能腳本 -->
<script src="/assets/js/navbar.js"></script>

<!-- 移動版導航欄功能腳本 -->
<script src="/assets/js/mobile-navbar.js"></script>

<!-- 文章導航腳本 -->
<script src="/assets/js/article-navigation.js"></script>

<!-- 文章閱讀進度指示器 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
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
    
    function updateReadingProgress() {{
      const articleContent = document.querySelector('.article-card');
      if (!articleContent) return;
      
      const contentHeight = articleContent.offsetHeight;
      const contentTop = articleContent.offsetTop;
      const currentPosition = window.scrollY + window.innerHeight;
      let progress = 0;
      if (currentPosition > contentTop) {{
        progress = Math.min(100, ((currentPosition - contentTop) / (contentHeight)) * 100);
      }}
      progressIndicator.style.width = `${{progress}}%`;
      if (progress >= 99) {{
        progressIndicator.style.transition = 'width 0.5s ease, opacity 1s ease';
        progressIndicator.style.opacity = '0.5';
      }} else {{
        progressIndicator.style.transition = 'width 0.2s ease';
        progressIndicator.style.opacity = '1';
      }}
    }}
    
    window.addEventListener('scroll', updateReadingProgress);
    window.addEventListener('resize', updateReadingProgress);
    updateReadingProgress();
  }});
</script>

</body>
</html>"""
    
    return html

def update_metadata(meta_path: str, classification_info: Dict) -> bool:
    """更新元數據文件，添加分類信息"""
    try:
        # 載入原有元數據
        metadata = load_metadata(meta_path)
        if not metadata:
            return False
        
        # 添加分類信息
        metadata["classification"] = classification_info
        
        # 保存更新後的元數據
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"成功更新元數據: {meta_path}")
        return True
    except Exception as e:
        logger.error(f"更新元數據失敗: {meta_path}, 錯誤: {str(e)}")
        return False

def process_article(html_path: str, output_dir: str) -> Dict:
    """處理單篇文章的HTML完成"""
    logger.info(f"開始處理文章: {html_path}")
    
    # 檢查元數據文件是否存在
    meta_path = html_path.replace('.html', '.meta.json')
    if not os.path.exists(meta_path):
        logger.error(f"找不到元數據文件: {meta_path}")
        return {
            'success': False,
            'html_path': html_path,
            'error': '找不到元數據文件'
        }
    
    # 載入HTML和元數據
    html_content, soup = load_html_content(html_path)
    metadata = load_metadata(meta_path)
    
    if not html_content or not soup or not metadata:
        return {
            'success': False,
            'html_path': html_path,
            'error': '無法載入HTML內容或元數據'
        }
    
    # 檢查元數據中是否有分類和標籤信息
    if "classification" not in metadata:
        logger.warning(f"元數據中缺少分類信息: {meta_path}")
    
    if "tags" not in metadata:
        logger.warning(f"元數據中缺少標籤信息: {meta_path}")
    
    # 載入翻譯字典
    translation_dict = load_translation_dict()
    
    # 根據元數據更新HTML內容
    updated_soup = update_html_with_metadata(soup, metadata)
    
    # 生成優化的文件名
    optimized_filename = generate_optimized_filename(metadata, translation_dict)
    
    # 準備輸出路徑
    output_path = os.path.join(output_dir, optimized_filename)
    
    # 如果輸出文件已存在且不是當前處理的文件，先備份
    if os.path.exists(output_path) and os.path.abspath(output_path) != os.path.abspath(html_path):
        backup_path = output_path + f".bak.{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        shutil.copy2(output_path, backup_path)
        logger.info(f"已備份現有文件: {output_path} -> {backup_path}")
    
    # 保存更新後的HTML
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(str(updated_soup))
        
        # 如果生成的文件與原文件不同，且原文件不是剛創建的臨時文件，則刪除原文件
        if os.path.abspath(output_path) != os.path.abspath(html_path) and not html_path.endswith('.tmp.html'):
            # 更新元數據中的HTML路徑
            metadata["html_path"] = output_path
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            # 重命名元數據文件以匹配新的HTML文件名
            new_meta_path = output_path.replace('.html', '.meta.json')
            if os.path.abspath(new_meta_path) != os.path.abspath(meta_path):
                shutil.move(meta_path, new_meta_path)
            
            # 可以選擇是否刪除原HTML文件
            os.remove(html_path)
        
        logger.info(f"成功處理文章，輸出文件: {output_path}")
        
        return {
            'success': True,
            'original_path': html_path,
            'output_path': output_path,
            'meta_path': meta_path.replace('.html', '.meta.json'),
            'optimized_filename': optimized_filename
        }
    except Exception as e:
        logger.error(f"保存更新後的HTML失敗: {output_path}, 錯誤: {str(e)}")
        return {
            'success': False,
            'html_path': html_path,
            'error': f"保存更新後的HTML失敗: {str(e)}"
        }

def process_word_file(docx_path: str, output_dir: str) -> Dict:
    """處理單個Word文件，轉換為HTML並返回結果信息"""
    try:
        filename = os.path.basename(docx_path)
        original_filename = filename
        logger.info(f"開始處理文件: {filename}")
        
        # 從檔名提取日期和系列信息
        date = extract_date_from_filename(filename) or datetime.datetime.now().strftime("%Y-%m-%d")
        is_series, series_name, episode = extract_series_info_from_filename(filename)
        
        if is_series:
            logger.info(f"檢測到系列文章: {series_name}, EP{episode}")
        
        # 提取Word內容並轉為HTML
        content_dict = extract_word_content(docx_path)
        html_content = convert_to_html(content_dict)
        cleaned_html = clean_html_content(html_content)
        article_structure = extract_article_structure(cleaned_html)
        
        # 生成基本HTML文件內容和建議的文件名
        html_content, suggested_filename = generate_basic_html(article_structure, date, original_filename, docx_path)
        
        # 保存HTML文件
        output_path = os.path.join(output_dir, suggested_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # 保存元數據供後續處理
        if article_structure:  # 確保article_structure不為None
            save_article_metadata(output_path, article_structure, date, 
                                is_series, series_name, episode, original_filename)
        
        logger.info(f"成功將 {filename} 轉換為 {suggested_filename}")
        
        return {
            'success': True,
            'output_file': suggested_filename,
            'original_filename': original_filename,
            'title': article_structure['title'] if article_structure else "無法提取標題",
            'metadata_path': output_path.replace('.html', '.meta.json')
        }
    except Exception as e:
        logger.error(f"處理 {docx_path} 時出錯: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'docx_path': docx_path
        }

def process_word_files(input_dir: str, output_dir: str) -> List[Dict]:
    """處理目錄中的所有Word文件"""
    os.makedirs(output_dir, exist_ok=True)
    docx_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.docx') and not f.startswith('~')]
    
    if not docx_files:
        logger.warning(f"在 {input_dir} 中沒有找到Word文檔")
        return []
    
    logger.info(f"找到 {len(docx_files)} 個Word文檔")
    
    results = []
    for idx, docx_file in enumerate(docx_files, 1):
        docx_path = os.path.join(input_dir, docx_file)
        logger.info(f"處理第 {idx}/{len(docx_files)} 個文件: {docx_file}")
        result = process_word_file(docx_path, output_dir)
        results.append(result)
        success_count = sum(1 for r in results if r['success'])
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def load_metadata(meta_path: str) -> Optional[Dict]:
    """載入文章元數據"""
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"載入元數據失敗: {meta_path}, 錯誤: {str(e)}")
        return None

def load_html_content(html_path: str) -> Tuple[Optional[str], Optional[Any]]:
    """載入HTML文件並解析內容"""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        return html_content, soup
    except Exception as e:
        logger.error(f"載入HTML文件失敗: {html_path}, 錯誤: {str(e)}")
        return None, None

def update_html_with_metadata(soup: Any, metadata: Dict) -> Any:
    """根據元數據更新HTML內容"""
    # 獲取分類信息
    classification = metadata.get("classification", {})
    main_category = classification.get("main_category", "")
    main_category_code = classification.get("main_category_code", "")
    subcategory = classification.get("subcategory", "")
    subcategory_code = classification.get("subcategory_code", "")
    
    # 獲取標籤信息
    tags = metadata.get("tags", [])
    
    # 獲取系列信息
    is_series = metadata.get("is_series", False)
    series_name = metadata.get("series_name", "")
    episode = metadata.get("episode", "")
    original_filename = metadata.get("original_filename", "")
    
    # 1. 更新頭部元數據
    # 找到<head>標籤，如果不存在則創建
    head = soup.head
    if not head:
        head = soup.new_tag("head")
        if soup.html:
            soup.html.insert(0, head)
        else:
            html = soup.new_tag("html")
            html.append(head)
            soup.append(html)
    
    # 添加分類元數據
    if main_category and main_category_code:
        meta_main_category = soup.new_tag("meta")
        meta_main_category["name"] = "main-category"
        meta_main_category["content"] = main_category
        head.append(meta_main_category)
        
        meta_main_category_code = soup.new_tag("meta")
        meta_main_category_code["name"] = "main-category-code"
        meta_main_category_code["content"] = main_category_code
        head.append(meta_main_category_code)
    
    if subcategory and subcategory_code:
        meta_subcategory = soup.new_tag("meta")
        meta_subcategory["name"] = "subcategory"
        meta_subcategory["content"] = subcategory
        head.append(meta_subcategory)
        
        meta_subcategory_code = soup.new_tag("meta")
        meta_subcategory_code["name"] = "subcategory-code"
        meta_subcategory_code["content"] = subcategory_code
        head.append(meta_subcategory_code)
    
    # 添加系列文章元數據
    if is_series and series_name:
        meta_series_name = soup.new_tag("meta")
        meta_series_name["name"] = "series-name"
        meta_series_name["content"] = series_name
        head.append(meta_series_name)
        
        meta_series_episode = soup.new_tag("meta")
        meta_series_episode["name"] = "series-episode"
        meta_series_episode["content"] = str(episode)
        head.append(meta_series_episode)
        
        if original_filename:
            meta_original_filename = soup.new_tag("meta")
            meta_original_filename["name"] = "original-filename"
            meta_original_filename["content"] = original_filename
            head.append(meta_original_filename)
    
    # 2. 更新文章分類顯示
    # 找到分類顯示區域（假設有一個特定的class或ID）
    category_div = soup.find("div", class_="article-category")
    if category_div:
        # 清空現有內容
        category_div.clear()
        
        # 添加分類圖標
        icon_span = soup.new_tag("span")
        icon_span["class"] = "material-symbols-rounded"
        icon_span.string = "sell"
        category_div.append(icon_span)
        
        # 添加空格
        category_div.append(" ")
        
        # 添加分類鏈接
        category_link = soup.new_tag("a")
        category_link["href"] = f"/blog.html?category={main_category_code}"
        category_link.string = main_category
        category_div.append(category_link)
    
    # 3. 更新文章標籤
    # 找到標籤顯示區域
    tags_div = soup.find("div", class_="article-tags")
    if tags_div and tags:
        # 清空現有內容
        tags_div.clear()
        
        # 添加每個標籤
        for tag in tags:
            tag_name = tag.get("name", "")
            tag_slug = tag.get("slug", "")
            
            if tag_name and tag_slug:
                tag_link = soup.new_tag("a")
                tag_link["href"] = f"/blog.html?tag={tag_slug}"
                tag_link["class"] = "article-tag"
                tag_link.string = tag_name
                tags_div.append(tag_link)
                
                # 添加換行符以美化HTML源碼
                tags_div.append("\n          ")
    
    return soup

def generate_optimized_filename(metadata: Dict, translation_dict: Dict[str, str]) -> str:
    """根據元數據生成優化的文件名"""
    # 獲取基本信息
    date = metadata.get("date", datetime.datetime.now().strftime("%Y-%m-%d"))
    title = metadata.get("title", "Untitled")
    
    # 獲取分類信息
    classification = metadata.get("classification", {})
    main_category_code = classification.get("main_category_code", "")
    subcategory_code = classification.get("subcategory_code", "")
    
    # 獲取系列信息
    is_series = metadata.get("is_series", False)
    series_name = metadata.get("series_name", "")
    episode = metadata.get("episode", "")
    
    # 從標題生成英文slug
    title_slug = slugify(title, translation_dict)
    
    # 構建文件名
    if main_category_code and subcategory_code:
        # 如果有分類信息，加入分類代碼
        filename = f"{date}-{main_category_code}-{subcategory_code}-{title_slug}"
    else:
        # 否則使用標題slug
        filename = f"{date}-{title_slug}"
    
    # 如果是系列文章，添加系列信息（修改後的邏輯）
    if series_name and episode:  # 不再檢查 is_series 標誌
        series_slug = slugify(series_name, translation_dict)
        if not series_slug or len(series_slug) < 3:
            series_slug = hashlib.md5(series_name.encode('utf-8')).hexdigest()[:8]
        filename = f"{filename}-{series_slug}-ep{episode}"
    
    # 添加.html擴展名
    filename = f"{filename}.html"
    
    # 確保文件名不會太長
    if len(filename) > 100:
        # 如果文件名過長，截斷並保持擴展名
        base_name, ext = os.path.splitext(filename)
        filename = base_name[:95] + ext
    
    return filename

def save_article_metadata(output_path: str, article_structure: Dict, date: str, 
                         is_series: bool, series_name: str, episode: int, original_filename: str):
    """保存文章元數據供後續處理"""
    metadata = {
        'title': article_structure['title'],
        'summary': article_structure['summary'],
        'date': date,
        'is_series': is_series,
        'series_name': series_name if is_series else None,
        'episode': episode if is_series else None,
        'original_filename': original_filename,
        'html_path': output_path
    }
    
    # 保存元數據到JSON文件
    meta_path = output_path.replace('.html', '.meta.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    logger.info(f"文章元數據已保存至: {meta_path}")

def main() -> int:
    """主函數"""
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return 1
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    logger.info(f"輸入目錄: {input_dir}")
    logger.info(f"輸出目錄: {output_dir}")
    
    # 確保依賴套件已安裝
    ensure_dependencies()
    
    logger.info("====== Word轉HTML處理開始 ======")
    results = process_word_files(input_dir, output_dir)
    
    success_count = sum(1 for r in results if r['success'])
    fail_count = len(results) - success_count
    
    logger.info("====== 處理完成 ======")
    logger.info(f"總計處理: {len(results)} 個文件")
    logger.info(f"成功轉換: {success_count} 個文件")
    logger.info(f"失敗: {fail_count} 個文件")
    
    if fail_count > 0:
        logger.warning("以下文件處理失敗:")
        for r in results:
            if not r.get('success', False):
                logger.warning(f"  - {r.get('docx_path', '未知文件')}: {r.get('error', '未知錯誤')}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())