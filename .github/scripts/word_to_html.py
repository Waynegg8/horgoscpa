#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Word 文檔轉換為 HTML 工具 - 改進版
用於將 Word 文檔轉換為符合網站風格的 HTML 文件
改進版：專注於純文字內容的處理，並恢復使用utils模組加載翻譯字典
"""

import os
import sys
import re
import json
import random
import datetime
import mammoth
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("word_to_html.log", mode='a')
    ]
)
logger = logging.getLogger(__name__)

# 引入 utils 模組 (如果存在)
try:
    # 調整路徑以確保能夠找到項目根目錄
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
    sys.path.append(PROJECT_ROOT)
    
    # 嘗試導入utils模組
    from utils import load_translation_dict, extract_keywords, setup_jieba_dict
    USE_UTILS = True
    logger.info("成功導入 utils 模組")
except ImportError:
    logger.warning("無法導入 utils 模組，將使用內部函數")
    USE_UTILS = False
    
    def load_translation_dict():
        """簡易版字典加載"""
        try:
            # 首先嘗試在專案根目錄下查找
            dict_path = os.path.join(PROJECT_ROOT, "assets/data/tw_financial_dict.json")
            if not os.path.exists(dict_path):
                # 然後嘗試在當前目錄查找
                dict_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tw_financial_dict.json')
            
            if os.path.exists(dict_path):
                logger.info(f"從 {dict_path} 讀取翻譯字典")
                with open(dict_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"載入字典文件出錯: {str(e)}")
        return {}
    
    def extract_keywords(text, top_n=5):
        """簡易版關鍵詞提取"""
        # 簡單實現，實際使用中應考慮導入 jieba 等分詞工具
        words = re.findall(r'[\w\u4e00-\u9fff]{2,}', text)
        word_freq = {}
        for word in words:
            if word in word_freq:
                word_freq[word] += 1
            else:
                word_freq[word] = 1
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:top_n]]
    
    def setup_jieba_dict():
        """空函數實現"""
        pass

# 加載翻譯字典
TRANSLATION_DICT = load_translation_dict()
logger.info(f"已加載翻譯字典，共 {len(TRANSLATION_DICT)} 個詞條")

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

def extract_date_from_filename(filename: str) -> Optional[str]:
    """
    從文件名中提取日期
    :param filename: 文件名
    :return: 日期字符串 (YYYY-MM-DD) 或 None
    """
    # 嘗試從文件名中提取日期 (YYYY-MM-DD 格式)
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        date_str = date_match.group(1)
        try:
            # 驗證日期格式
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            pass
    
    return None

def translate_text(text: str) -> str:
    """
    使用翻譯字典將中文文本轉換為對應的英文
    :param text: 中文文本
    :return: 轉換後的文本
    """
    if not TRANSLATION_DICT:
        return text
    
    # 對於每個中文詞彙，如果在字典中則替換為英文
    for zh, en in TRANSLATION_DICT.items():
        if zh in text:
            text = text.replace(zh, en)
    
    return text

def slugify(text: str) -> str:
    """
    將文本轉換為 URL 友好的格式 - 使用翻譯字典
    :param text: 要轉換的文本
    :return: URL 友好的字符串
    """
    logger.info(f"開始處理標題: {text}")
    
    # 內建基本字典作為備用
    base_replacements = {
        '台灣': 'taiwan',
        '創業': 'startup',
        '指南': 'guide',
        '會計': 'accounting',
        '會計師': 'accountant',
        '角色': 'role',
        '價值': 'value',
        '財務': 'finance',
        '稅務': 'tax',
        '申報': 'filing',
        '公司': 'company',
        '規劃': 'planning',
        '管理': 'management',
        '合夥人': 'partner',
        '初期': 'early-stage',
        '資本': 'capital',
        '貸款': 'loan',
        '銀行': 'bank',
        '必知': 'essential',
        '老闆': 'boss',
        '勞工': 'labor',
        '設定': 'setting',
        '攻略': 'guide',
        '法規': 'regulations',
        '全攻略': 'complete-guide',
        '選擇': 'choice',
        '發票': 'invoice',
        '所得稅': 'income-tax',
        '營業稅': 'business-tax',
        '制度': 'system',
        '登記': 'registration',
        '簽證': 'certificate',
        '組織': 'organization',
        '型態': 'type',
        '行號': 'business-entity',
        '營業': 'business'
    }
    
    # 如果有翻譯字典，優先使用
    slug = text.lower()
    replaced = False
    
    # 首先嘗試使用翻譯字典
    if TRANSLATION_DICT:
        logger.info("使用翻譯字典進行轉換")
        # 按詞彙長度排序，優先替換較長的詞彙
        sorted_dict = sorted(TRANSLATION_DICT.items(), key=lambda x: len(x[0]), reverse=True)
        
        for zh, en in sorted_dict:
            if zh.lower() in slug:
                replaced_text = slug.replace(zh.lower(), f"{en}-")
                if replaced_text != slug:
                    replaced = True
                    slug = replaced_text
                    logger.info(f"使用翻譯字典替換: {zh} -> {en}")
    
    # 如果沒有使用翻譯字典或替換不完全，使用基本替換
    if not replaced or len(slug) > 50:  # 如果結果還是太長，使用基本替換
        logger.info("使用基本替換進行轉換")
        new_slug = slug
        for zh, en in base_replacements.items():
            if zh in new_slug:
                new_slug = new_slug.replace(zh, f"{en}-")
                logger.info(f"使用基本替換: {zh} -> {en}")
        slug = new_slug
    
    # 移除標點符號和特殊字符
    slug = re.sub(r'[^\w\s-]', '', slug)
    # 將空格轉換為連字符
    slug = re.sub(r'[\s_]+', '-', slug)
    # 移除開頭和結尾的連字符
    slug = re.sub(r'^-+|-+$', '', slug)
    # 移除重複的連字符
    slug = re.sub(r'-+', '-', slug)
    
    # 移除非ASCII字符
    ascii_slug = ''
    for c in slug:
        if ord(c) < 128:
            ascii_slug += c
    slug = ascii_slug
    
    # 如果處理後為空，使用默認值
    if not slug:
        logger.warning("處理後的標題為空，使用默認值'article'")
        slug = "article"
    
    # 截斷過長的slug
    if len(slug) > 80:
        slug = slug[:80]
        logger.info("標題過長，已截斷")
    
    logger.info(f"處理後的標題: {slug}")
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

def extract_content_from_docx(docx_path: str) -> Tuple[str, str, List[Dict[str, str]], List[str], Dict[str, Any]]:
    """
    從 docx 文件中提取純文字內容
    :param docx_path: Word 文檔路徑
    :return: (標題, 摘要, 段落列表, 標籤列表, 附加信息)
    """
    try:
        # 記錄開始處理文件
        logger.info(f"開始處理文件: {docx_path}")
        
        # 檢查文件是否存在
        if not os.path.exists(docx_path):
            logger.error(f"文件不存在: {docx_path}")
            raise FileNotFoundError(f"文件不存在: {docx_path}")
        
        # 檢查文件大小
        file_size = os.path.getsize(docx_path)
        logger.info(f"文件大小: {file_size} 字節")
        if file_size == 0:
            logger.error(f"文件大小為0: {docx_path}")
            raise ValueError(f"文件大小為0: {docx_path}")
        
        # 使用 mammoth 轉換 docx 為 HTML，使用簡化配置
        convert_options = {
            "style_map": "p[style-name='標題'] => h1:fresh\n"
                         "p[style-name='Title'] => h1:fresh\n"
                         "p[style-name='Heading 1'] => h1:fresh\n"
                         "p[style-name='標題 1'] => h1:fresh\n"
                         "p[style-name='Heading 2'] => h2:fresh\n"
                         "p[style-name='標題 2'] => h2:fresh",
            "include_default_style_map": True
        }
        
        with open(docx_path, 'rb') as docx_file:
            # 直接使用 mammoth 轉換，不使用自定義轉換器
            result = mammoth.convert_to_html(docx_file, **convert_options)
            html_content = result.value
            messages = result.messages
            
            logger.info(f"Mammoth 轉換成功，生成HTML長度: {len(html_content)}")
            
            # 如果HTML內容為空，拋出異常
            if not html_content.strip():
                logger.error("轉換後HTML內容為空")
                raise ValueError("轉換後HTML內容為空")
        
        # 記錄警告信息
        for message in messages:
            if message.type == "warning":
                logger.warning(f"Mammoth 警告: {message.message}")
                
        # 使用 BeautifulSoup 解析 HTML
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 提取標題 (假設第一個 h1 或 h2 是標題)
        title_tag = soup.find(['h1', 'h2'])
        title = title_tag.text.strip() if title_tag else os.path.basename(docx_path).replace('.docx', '')
        
        # 從標題中移除日期部分
        title = re.sub(r'^\d{4}-\d{2}-\d{2}\s*-?\s*', '', title)
        
        # 提取段落 - 只處理純文字
        paragraphs = []
        
        # 提取所有段落和標題
        for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4']):
            text = tag.get_text().strip()
            if text:  # 只處理非空文字
                paragraphs.append({
                    "style": tag.name,
                    "text": text
                })
        
        # 提取摘要 (使用第一段非標題文本)
        summary = ""
        for para in paragraphs:
            if para.get("style") == "p" and para.get("text") and len(para.get("text", "")) > 30:
                summary = para["text"][:200] + "..." if len(para["text"]) > 200 else para["text"]
                break
        
        # 如果沒有找到合適的摘要，使用標題
        if not summary:
            summary = f"{title} - 專業財稅知識分享"
        
        # 從內容中提取可能的標籤 - 使用utils模組或備用方法
        keywords = []
        full_text = title + " " + " ".join([p.get("text", "") for p in paragraphs if p.get("text")])
        
        if USE_UTILS:
            # 如果有jieba詞典，設置它
            setup_jieba_dict()
            # 使用utils模組提取關鍵詞
            keywords = extract_keywords(full_text, 5)
            logger.info("使用utils模組提取關鍵詞")
        else:
            # 使用簡單的關鍵詞提取 - 根據常見財稅相關詞彙
            common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業", 
                              "公司", "規劃", "資本", "管理", "勞工", "營業", "行號"]
            for keyword in common_keywords:
                if keyword in full_text and len(keywords) < 3:
                    keywords.append(keyword)
            logger.info("使用內建方法提取關鍵詞")
        
        # 如果沒有找到關鍵詞，使用默認值
        if not keywords:
            keywords = ["財稅", "會計", "企業"]
        
        # 返回附加信息以供調試
        additional_info = {
            "extraction_success": True
        }
        
        logger.info(f"成功提取內容: 標題={title}, 段落數={len(paragraphs)}, 標籤數={len(keywords)}")
        
        return title, summary, paragraphs, keywords, additional_info
    
    except Exception as e:
        logger.error(f"處理 Word 文檔時出錯: {str(e)}", exc_info=True)
        # 在出錯時提供基本內容
        return "文章標題", "文章摘要", [{"style": "p", "text": f"文章內容無法提取，原因: {str(e)}"}], ["財稅", "會計", "企業"], {"extraction_success": False, "error": str(e)}

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
                 date: str, summary: str, primary_category: str, category_code: str) -> str:
    """
    生成簡化版HTML內容 - 只處理文字
    :param title: 文章標題
    :param paragraphs: 段落列表
    :param tags: 標籤列表
    :param date: 日期
    :param summary: 摘要
    :param primary_category: 主要分類(中文)
    :param category_code: 分類代碼(英文)
    :return: HTML內容
    """
    # 設置圖片路徑（僅用於結構化數據）
    image_path = f"/assets/images/blog/{select_thumbnail_for_category(category_code)}"
    
    # 生成檔案名（不含路徑）- 使用改進的slugify
    slug = slugify(title)
    file_name = f"{date}-{slug}.html"
    
    # 生成相對 URL 路徑（僅用於結構化資料）
    relative_url = f"/blog/{file_name}"
    
    # 生成HTML頭部 - 保持不變
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
      "name": "霍爾果斯會計師事務所",
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

<!-- 文章頁面標題區塊 - 簡化版 -->
<header class="article-header">
  <div class="container">
    <div class="article-header-content">
      <!-- 移除多餘內容 -->
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
      
      <!-- 文章標題區 - 簡化版 -->
      <div class="article-header-main">
        <h1 class="article-title">{title}</h1>
      </div>
      
      <!-- 文章內容主體 - 純文字版 -->
      <div class="article-body">
"""
    
    # 添加文章內容 - 僅處理純文字
    for para in paragraphs:
        style = para.get("style", "p")
        text = para.get("text", "")
        
        # 只處理基本段落和標題
        if text and style in ["p", "h1", "h2", "h3", "h4"]:
            html += f'        <{style}>{text}</{style}>\n'
    
    # 添加標籤區域 - 保持不變
    html += """      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
"""
    
    # 添加標籤
    for tag in tags:
        # 使用改進後的slugify處理標籤URL
        tag_slug = slugify(tag)
        html += f'          <a href="/blog.html?tag={tag_slug}" class="article-tag">{tag}</a>\n'
    
    # 底部部分 - 保持不變
    html += """        </div>
      </div>
    </article>
    
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
  });
</script>

</body>
</html>
"""
    
    return html

def process_word_files(input_dir: str, output_dir: str) -> None:
    """
    處理指定目錄中的Word文檔，轉換為HTML - 改進版
    :param input_dir: 輸入目錄
    :param output_dir: 輸出目錄
    """
    # 確保輸出目錄存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        logger.info(f"創建輸出目錄: {output_dir}")
    
    # 獲取所有Word文檔
    docx_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.docx') and not f.startswith('~$')]  # 排除臨時檔案
    
    if not docx_files:
        logger.warning(f"在 {input_dir} 中沒有找到Word文檔")
        return
    
    logger.info(f"找到 {len(docx_files)} 個Word文檔")
    
    # 處理每個Word文檔
    for docx_file in docx_files:
        docx_path = os.path.join(input_dir, docx_file)
        logger.info(f"開始處理文件: {docx_path}")
        
        try:
            # 提取Word文檔內容
            title, summary, paragraphs, tags, additional_info = extract_content_from_docx(docx_path)
            
            # 從文件名提取日期，如果沒有則使用當前日期
            date_from_filename = extract_date_from_filename(docx_file)
            date = date_from_filename if date_from_filename else datetime.datetime.now().strftime("%Y-%m-%d")
            
            # 獲取文章全文用於分類判斷
            full_text = title + " " + summary + " " + " ".join([p.get("text", "") for p in paragraphs if p.get("text")])
            
            # 判斷文章分類
            primary_category, category_code = determine_category(full_text)
            
            # 生成檔案名，使用改進的 slugify
            slug = slugify(title)
            file_name = f"{date}-{slug}.html"
            
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
            
            logger.info(f"成功轉換 {docx_file} 到 {file_name}")
            logger.info(f"  標題: {title}")
            logger.info(f"  分類: {primary_category} ({category_code})")
            logger.info(f"  標籤: {', '.join(tags)}")
            
        except Exception as e:
            logger.error(f"處理 {docx_file} 時出錯: {str(e)}", exc_info=True)

def main() -> None:
    """主函數"""
    # 檢查命令行參數
    if len(sys.argv) < 3:
        print("用法: python word_to_html_improved.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html_improved.py word-docs blog")
        return
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    # 記錄參數
    logger.info(f"輸入目錄: {input_dir}")
    logger.info(f"輸出目錄: {output_dir}")
    
    # 如果有utils模組，使用它來設置詞典
    if USE_UTILS:
        setup_jieba_dict()
        logger.info("已設置jieba詞典")
    
    # 處理Word文檔
    process_word_files(input_dir, output_dir)
    
    logger.info("轉換完成")

if __name__ == "__main__":
    main()