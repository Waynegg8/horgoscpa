#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
改進的Word文檔轉HTML腳本 (增強版)
自動將Word文檔轉換為網站所需的HTML格式，並支援標籤和分類功能

依賴套件:
- python-docx: 用於讀取.docx文件
- markdown: 處理Markdown格式
- jieba: 中文分詞
- gensim: 用於主題模型和標籤生成
- python-slugify: 用於生成URL友好的標題

安裝依賴:
pip install python-docx markdown jieba gensim python-slugify
"""

import os
import re
import sys
import json
import docx
import jieba
import hashlib
import datetime
import random  # 導入隨機模組
from typing import List, Dict, Any, Tuple, Optional
from slugify import slugify
from collections import Counter

# 引入 utils 模組
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_translation_dict, setup_jieba_dict

# 獲取專案根目錄（假設腳本在 .github/scripts 目錄下）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 配置區域（使用絕對路徑）
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "blog")                  # 輸出HTML的目錄
IMAGES_DIR = os.path.join(PROJECT_ROOT, "assets/images/blog")    # 博客圖片目錄
CSS_PATH = "/assets/css/style.css"  # 全站CSS路徑
BLOG_URL_PREFIX = "/blog/"           # 博客URL前綴
DEFAULT_AUTHOR = "霍爾果斯會計師事務所"  # 默認作者
DEFAULT_IMAGE = "default.jpg"   # 默認圖片
PROCESSED_LOG_FILE = os.path.join(PROJECT_ROOT, ".processed_docs.json")  # 已處理文件記錄

# 配置博客分類
BLOG_CATEGORIES = {
    "稅務相關": ["稅務", "報稅", "節稅", "扣繳", "稅法", "所得稅", "營業稅", "營所稅", "綜所稅", "稅務規劃"],
    "會計記帳": ["會計", "記帳", "帳務", "財報", "財務報表", "會計準則", "審計", "記帳士"],
    "企業經營": ["創業", "新創", "公司設立", "企業", "經營", "營運", "公司登記", "管理"],
    "財務規劃": ["財務", "投資", "理財", "資金", "現金流", "資產", "負債"],
    "法律知識": ["法律", "法規", "合約", "合同", "契約", "勞基法", "公司法", "商業法", "法務"],
    "進出口": ["進出口", "跨境", "報關", "關稅", "國際貿易", "貿易", "外銷", "出口", "進口"]
}

# 分類對應的英文識別碼，用於URL和篩選
CATEGORY_CODES = {
    "稅務相關": "tax",
    "會計記帳": "accounting",
    "企業經營": "business",
    "財務規劃": "financial",
    "法律知識": "legal",
    "進出口": "import-export"
}

# 縮圖集合，用於隨機選擇文章縮圖
THUMBNAIL_IMAGES = [
    "tax_thumb1.jpg", 
    "tax_thumb2.jpg", 
    "accounting_thumb1.jpg", 
    "accounting_thumb2.jpg", 
    "business_thumb1.jpg", 
    "business_thumb2.jpg",
    "financial_thumb1.jpg",
    "legal_thumb1.jpg",
    "import_export_thumb1.jpg",
    "default.jpg"
]

def translate_title_for_url(title):
    """
    將中文標題翻譯為適合URL的英文
    :param title: 中文標題
    :return: 英文URL友好標題
    """
    # 使用 utils 模組載入詞典
    tw_dict = load_translation_dict()
    
    if not tw_dict:
        print("詞典為空或載入失敗，使用默認音譯")
        return slugify(title)
    
    # 使用jieba分詞
    jieba.setLogLevel(20)  # 設定日誌級別，抑制結巴的輸出信息
    words = list(jieba.cut(title))
    
    # 翻譯結果
    translated_parts = []
    
    # 翻譯結果日誌，用於記錄哪些詞未在詞典中找到
    miss_words = []
    
    for word in words:
        # 去除標點符號和空格
        word = word.strip()
        if not word or word.isspace():
            continue
            
        # 查詞典
        if word in tw_dict:
            translated_parts.append(tw_dict[word])
        else:
            # 對於詞典中沒有的詞，使用音譯
            miss_words.append(word)
            translated_parts.append(slugify(word))
    
    # 記錄未在詞典中找到的詞
    if miss_words:
        print(f"以下詞彙未在詞典中找到: {', '.join(miss_words)}")
    
    # 組合結果
    translated_title = "-".join(part for part in translated_parts if part)
    
    # 確保URL友好
    translated_title = re.sub(r'-+', '-', translated_title)  # 移除多餘的連字符
    translated_title = translated_title.strip('-')  # 移除首尾的連字符
    
    # 如果翻譯失敗或結果為空，回退到原來的音譯方法
    if not translated_title:
        print("翻譯失敗，使用默認音譯")
        translated_title = slugify(title)
    
    return translated_title

def load_processed_docs() -> Dict[str, str]:
    """
    載入已處理文件的記錄
    :return: 文件摘要和處理時間的字典
    """
    if os.path.exists(PROCESSED_LOG_FILE):
        try:
            with open(PROCESSED_LOG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"載入已處理文件記錄時出錯: {str(e)}")
    return {}

def save_processed_docs(processed_docs: Dict[str, str]) -> None:
    """
    保存已處理文件的記錄
    :param processed_docs: 文件摘要和處理時間的字典
    """
    try:
        with open(PROCESSED_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(processed_docs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存已處理文件記錄時出錯: {str(e)}")

def get_file_hash(file_path: str) -> str:
    """
    計算文件的哈希值
    :param file_path: 文件路徑
    :return: 文件的MD5哈希值
    """
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def extract_text_from_docx(docx_path: str) -> Tuple[str, List[Dict[str, str]]]:
    """
    從Word文檔中提取文本內容
    :param docx_path: Word文檔路徑
    :return: 標題和內容段落列表
    """
    doc = docx.Document(docx_path)
    
    # 提取標題 (假設第一段是標題)
    title = doc.paragraphs[0].text.strip() if doc.paragraphs else "未命名文章"
    
    # 提取所有段落
    paragraphs = []
    for i, para in enumerate(doc.paragraphs):
        if i == 0:  # 跳過標題
            continue
            
        text = para.text.strip()
        if not text:
            continue
            
        # 檢查段落樣式以決定HTML標籤
        style = "p"  # 默認段落
        
        # 如果是標題樣式
        if para.style.name.startswith('Heading'):
            level = para.style.name[-1]
            if level.isdigit() and 1 <= int(level) <= 6:
                style = f"h{level}"
        
        # 對於列表項目
        elif para.style.name.startswith('List'):
            style = "li"
        
        paragraphs.append({
            "text": text,
            "style": style
        })
    
    return title, paragraphs

def get_date_from_filename(filename: str) -> str:
    """
    從文件名提取日期 (格式如: 2023-01-01-article-name.docx)
    :param filename: 文件名
    :return: 日期字符串 (YYYY-MM-DD)
    """
    date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        return date_match.group(1)
    return datetime.datetime.now().strftime("%Y-%m-%d")

def extract_summary(paragraphs: List[Dict[str, str]], max_length: int = 150) -> str:
    """
    從段落中提取文章摘要
    :param paragraphs: 段落列表
    :param max_length: 最大摘要長度
    :return: 摘要文本
    """
    # 從非標題段落中提取文本
    content_text = " ".join([p["text"] for p in paragraphs if p["style"] == "p"])
    
    # 取第一段適當長度的文本作為摘要
    if len(content_text) <= max_length:
        return content_text
    
    # 嘗試在合適的位置截斷
    cutoff = max_length
    while cutoff > 0 and content_text[cutoff] not in "。.!?，,;；":
        cutoff -= 1
    
    if cutoff == 0:  # 如果找不到合適的截斷點
        cutoff = max_length
    
    return content_text[:cutoff+1]

def generate_tags(title: str, paragraphs: List[Dict[str, str]]) -> List[str]:
    """
    使用NLP技術生成文章標籤
    :param title: 文章標題
    :param paragraphs: 段落列表
    :return: 標籤列表
    """
    # 使用 utils 模組設置 jieba 分詞詞典
    setup_jieba_dict()
    
    # 合併所有文本
    full_text = title + " " + " ".join([p["text"] for p in paragraphs])
    
    # 使用結巴分詞進行分詞
    words = jieba.cut(full_text)
    
    # 過濾停用詞
    stopwords = ["的", "了", "和", "是", "在", "我們", "您", "與", "為", "以", "及", "或", "你", "我", "他", "她", "它", "此", "該"]
    filtered_words = [word for word in words if len(word) > 1 and word not in stopwords]
    
    # 計算詞頻
    word_counts = Counter(filtered_words)
    
    # 提取頻率最高的詞作為標籤候選
    top_words = [word for word, _ in word_counts.most_common(12)]
    
    # 根據預設分類篩選標籤
    selected_tags = []
    selected_categories = set()
    
    for word in top_words:
        if len(selected_tags) >= 5:  # 最多選5個標籤
            break
            
        for category, keywords in BLOG_CATEGORIES.items():
            if category in selected_categories:
                continue  # 每個分類最多選一個標籤
                
            if any(keyword in word for keyword in keywords):
                selected_tags.append(word)
                selected_categories.add(category)
                break
    
    # 如果沒有找到足夠的標籤，添加一些高頻詞
    if len(selected_tags) < 3:
        for word in top_words:
            if word not in selected_tags and len(word) > 1:
                selected_tags.append(word)
                if len(selected_tags) >= 3:
                    break
    
    return selected_tags

def determine_primary_category(tags: List[str], title: str, paragraphs: List[Dict[str, str]]) -> Tuple[str, str]:
    """
    根據標籤、標題和內容確定主要分類
    :param tags: 標籤列表
    :param title: 文章標題
    :param paragraphs: 段落列表
    :return: (主要分類中文名, 主要分類英文代碼)
    """
    # 使用 utils 模組設置 jieba 分詞詞典
    setup_jieba_dict()
            
    # 合併所有文本用於分析
    full_text = title + " " + " ".join([p["text"] for p in paragraphs]) + " " + " ".join(tags)
    
    category_scores = {category: 0 for category in BLOG_CATEGORIES}
    
    # 計算每個分類的得分
    for category, keywords in BLOG_CATEGORIES.items():
        for keyword in keywords:
            if keyword in full_text:
                category_scores[category] += full_text.count(keyword) * 2  # 給予更高權重
    
    # 標籤也進行計分
    for tag in tags:
        for category, keywords in BLOG_CATEGORIES.items():
            if any(keyword in tag for keyword in keywords):
                category_scores[category] += 5  # 標籤命中給予更高權重
    
    # 選取得分最高的分類
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    
    # 如果沒有任何匹配，默認為"稅務相關"
    if category_scores[primary_category] == 0:
        primary_category = "稅務相關"
    
    # 返回中文分類名和英文代碼
    return primary_category, CATEGORY_CODES.get(primary_category, "tax")

def select_thumbnail_for_category(category_code: str) -> str:
    """
    根據文章分類隨機選擇合適的縮圖
    :param category_code: 文章分類代碼
    :return: 縮圖文件名
    """
    # 檢查圖片目錄是否存在
    if not os.path.exists(IMAGES_DIR):
        try:
            os.makedirs(IMAGES_DIR)
            print(f"創建圖片目錄: {IMAGES_DIR}")
        except Exception as e:
            print(f"創建圖片目錄失敗: {str(e)}")
            return DEFAULT_IMAGE
    
    # 獲取博客圖片目錄中的所有圖片
    try:
        available_images = [f for f in os.listdir(IMAGES_DIR) if f.endswith(('.jpg', '.jpeg', '.png', '.gif'))]
    except Exception as e:
        print(f"讀取圖片目錄失敗: {str(e)}")
        available_images = []
    
    # 如果目錄為空或讀取失敗，使用預設縮圖集合
    if not available_images:
        available_images = THUMBNAIL_IMAGES
    
    # 根據分類過濾相關圖片
    category_images = [img for img in available_images if category_code in img.lower()]
    
    # 如果沒有該分類的圖片，使用所有可用圖片
    if not category_images:
        category_images = available_images
    
    # 隨機選擇一張圖片
    selected_image = random.choice(category_images) if category_images else DEFAULT_IMAGE
    
    return selected_image

def generate_html(title: str, paragraphs: List[Dict[str, str]], tags: List[str], 
                 date: str, summary: str, primary_category: str, category_code: str,
                 image: str = None) -> str:
    """
    生成HTML內容，使用外部CSS樣式表
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
    
    # 生成HTML頭部
    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | 霍爾果斯會計師事務所</title>
  <meta name="description" content="{summary}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{summary}" />
  <meta property="og:image" content="{image_path}" />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content="{date}" />
  <meta property="article:author" content="{DEFAULT_AUTHOR}" />
  <meta property="article:section" content="{primary_category}" />
"""
    
    # 添加標籤meta標籤
    for tag in tags:
        html += f'  <meta property="article:tag" content="{tag}" />\n'
    
    # 引用外部CSS樣式表，加入Material Symbols圖示庫
    html += f"""  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  
  <!-- Material Symbols 圖示庫 -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  
  <!-- 引用全站共用樣式 -->
  <link rel="stylesheet" href="/assets/css/common.css" />
  <link rel="stylesheet" href="/assets/css/navbar.css" />
  <link rel="stylesheet" href="/assets/css/footer.css" />
  <link rel="stylesheet" href="/assets/css/blog.css" />
  
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RKMCS9WVS5"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-RKMCS9WVS5');
</script>

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{title}",
  "image": "{image_path}",
  "datePublished": "{date}",
  "dateModified": "{date}",
  "author": {{
    "@type": "Organization",
    "name": "霍爾果斯會計師事務所"
  }},
  "publisher": {{
    "@type": "Organization",
    "name": "霍爾果斯會計師事務所",
    "logo": {{
      "@type": "ImageObject",
      "url": "https://www.horgoscpa.com/assets/images/logo.png"
    }}
  }},
  "description": "{summary}"
}}
</script>
</head>
<body>

<!-- 導航欄 - 修改版 -->
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
      <li class="has-dropdown">
        <a href="/services.html">服務項目</a>
        <div class="dropdown-menu">
          <a href="/services/tax.html">稅務服務</a>
          <a href="/services/accounting.html">記帳與會計</a>
          <a href="/services/consulting.html">企業顧問</a>
        </div>
      </li>
      <li><a href="/team.html">服務團隊</a></li>
      <li><a href="/blog.html" class="active">專欄文章</a></li>
      <li><a href="/faq.html">常見問題</a></li>
      <li><a href="/video.html">影音專區</a></li>
      <li><a href="/contact.html">聯繫我們</a></li>
      <li><a href="/booking.html" class="nav-consult-btn">免費諮詢</a></li>
    </ul>
  </div>
</nav>

<main class="blog-post">
  <div class="container">
    <article>
      <header class="post-header">
        <h1>{title}</h1>
        <div class="post-meta">
          <span class="date">{date}</span>
          <span class="category">分類: <a href="/blog/category/{slugify(category_code)}.html">{primary_category}</a></span>
        </div>
      </header>
      
      <div class="post-image">
        <img src="{image_path}" alt="{title}">
      </div>
      
      <div class="post-content">
"""
    
    # 添加文章內容
    for para in paragraphs:
        tag = para["style"]
        content = para["text"]
        
        if tag == "li":
            html += f"        <ul>\n          <li>{content}</li>\n        </ul>\n"
        else:
            html += f"        <{tag}>{content}</{tag}>\n"
    
    # 添加標籤區域
    html += """      </div>
      
      <footer class="post-footer">
        <div class="post-tags">
          <span>標籤:</span>
"""
    
    # 添加標籤
    for tag in tags:
        html += f'          <a href="/blog/tag/{slugify(tag)}.html" class="tag">{tag}</a>\n'
    
    # 完成HTML
    html += """        </div>
      </footer>
    </article>
    
    <div class="post-navigation">
      <a href="/blog.html" class="back-to-blog">← 返回部落格</a>
    </div>
  </div>
</main>

<!-- 頁尾區域 - 修改版 -->
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
          <li><a href="/team.html"><span class="material-symbols-rounded icon-link">groups</span> 服務團隊</a></li>
          <li><a href="/blog.html"><span class="material-symbols-rounded icon-link">article</span> 部落格</a></li>
          <li><a href="/faq.html"><span class="material-symbols-rounded icon-link">help</span> 常見問題</a></li>
          <li><a href="/video.html"><span class="material-symbols-rounded icon-link">play_circle</span> 影片</a></li>
          <li><a href="/contact.html"><span class="material-symbols-rounded icon-link">contact_mail</span> 聯絡資訊</a></li>
        </ul>
      </div>
      
      <!-- 服務項目 -->
      <div class="footer-services">
        <h3>服務項目</h3>
        <ul class="services-list">
          <li><a href="/services/tax.html"><span class="material-symbols-rounded icon-link">attach_money</span> 稅務服務</a></li>
          <li><a href="/services/accounting.html"><span class="material-symbols-rounded icon-link">account_balance</span> 記帳與會計</a></li>
          <li><a href="/services/consulting.html"><span class="material-symbols-rounded icon-link">work</span> 企業顧問</a></li>
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

</body>
</html>
"""
    
    return html

def process_docx(docx_path: str, output_dir: str = OUTPUT_DIR, processed_docs: Dict[str, str] = None) -> Optional[str]:
    """
    處理Word文檔並生成HTML
    :param docx_path: Word文檔路徑
    :param output_dir: 輸出目錄
    :param processed_docs: 已處理文件記錄
    :return: 生成的HTML文件路徑或None
    """
    try:
        # 檢查文件是否已處理過
        if processed_docs is None:
            processed_docs = {}
            
        file_hash = get_file_hash(docx_path)
        if file_hash in processed_docs:
            print(f"文件 {docx_path} 已處理過，跳過 (處理時間: {processed_docs[file_hash]})")
            return None
        
        # 獲取文件信息
        filename = os.path.basename(docx_path)
        date = get_date_from_filename(filename)
        
        # 提取內容
        title, paragraphs = extract_text_from_docx(docx_path)
        
        # 生成摘要
        summary = extract_summary(paragraphs)
        
        # 生成標籤
        tags = generate_tags(title, paragraphs)
        
        # 確定主要分類
        primary_category, category_code = determine_primary_category(tags, title, paragraphs)
        
        # 選擇縮圖
        image = select_thumbnail_for_category(category_code)
        
        # 生成HTML
        html_content = generate_html(
            title=title,
            paragraphs=paragraphs,
            tags=tags,
            date=date,
            summary=summary,
            primary_category=primary_category,
            category_code=category_code,
            image=image
        )
        
        # 確保輸出目錄存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 使用新的翻譯函數生成檔案名
        translated_title = translate_title_for_url(title)
        html_filename = f"{date}-{translated_title}.html"
        
        print(f"生成檔案名: {html_filename}")
        print(f"(原標題: {title})")
        
        html_path = os.path.join(output_dir, html_filename)
        
        # 寫入HTML文件
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # 記錄已處理的文件
        processed_docs[file_hash] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"成功生成HTML文件: {html_path}")
        print(f"標題: {title}")
        print(f"分類: {primary_category} ({category_code})")
        print(f"縮圖: {image}")
        print(f"標籤: {', '.join(tags)}")
        
        return html_path
    
    except Exception as e:
        print(f"處理文件 {docx_path} 時出錯: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def scan_directory(input_dir: str, output_dir: str = OUTPUT_DIR) -> List[str]:
    """
    掃描目錄中的所有Word文檔並處理
    :param input_dir: 輸入目錄
    :param output_dir: 輸出目錄
    :return: 生成的HTML文件路徑列表
    """
    generated_files = []
    
    # 載入已處理文件記錄
    processed_docs = load_processed_docs()
    
    for file in os.listdir(input_dir):
        if file.endswith(".docx") and not file.startswith("~$"):  # 跳過臨時文件
            docx_path = os.path.join(input_dir, file)
            html_path = process_docx(docx_path, output_dir, processed_docs)
            if html_path:
                generated_files.append(html_path)
    
    # 保存已處理文件記錄
    save_processed_docs(processed_docs)
    
    return generated_files

def main():
    """主函數"""
    print(f"專案根目錄: {PROJECT_ROOT}")
    print(f"輸出目錄: {OUTPUT_DIR}")
    
    # 檢查詞典使用 utils 模組
    tw_dict = load_translation_dict()
    if tw_dict:
        print(f"詞典包含 {len(tw_dict)} 個詞彙")
    else:
        print("詞典檔案不存在或為空")
        print("將使用默認音譯方式生成檔案名")
    
    if len(sys.argv) < 2:
        print("請提供Word文檔路徑或包含Word文檔的目錄路徑")
        print("用法: python word_to_html.py <path_to_docx_or_directory> [output_directory]")
        return
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else OUTPUT_DIR
    
    # 載入已處理文件記錄
    processed_docs = load_processed_docs()
    
    if os.path.isdir(input_path):
        print(f"掃描目錄 {input_path} 中的Word文檔...")
        generated_files = scan_directory(input_path, output_dir)
        print(f"總共處理了 {len(generated_files)} 個文件")
    elif os.path.isfile(input_path) and input_path.endswith(".docx"):
        html_path = process_docx(input_path, output_dir, processed_docs)
        if html_path:
            print(f"成功處理文件: {input_path}")
        
        # 保存已處理文件記錄
        save_processed_docs(processed_docs)
    else:
        print(f"無效的路徑或不支持的文件類型: {input_path}")

if __name__ == "__main__":
    main()