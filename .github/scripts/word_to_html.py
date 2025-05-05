#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
優化版 Word 文檔轉換為 HTML 工具
修復日期下方自動生成內容和格式轉換問題
作者: Claude
日期: 2025-05-05
"""

import os
import sys
import re
import json
import random
import hashlib
import datetime
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import importlib
import subprocess

# 確保依賴安裝
def ensure_dependencies():
    required_packages = [
        "mammoth", "python-docx", "bs4", "lxml", "docx2txt"
    ]
    
    # 檢查並安裝缺失的包
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"安裝缺失的依賴: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# 執行依賴檢查
ensure_dependencies()

# 必須的依賴
import mammoth
from bs4 import BeautifulSoup
import docx

# 設置日誌
def setup_logging():
    # 創建日誌目錄
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # 設置日誌文件名
    log_file = os.path.join(log_dir, f"word_extraction_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    
    # 配置日誌格式
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger("word_extractor")

# 設置全局日誌器
logger = setup_logging()

# 嘗試導入 utils 模組
try:
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
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
            dict_path = os.path.join(project_root, "assets/data/tw_financial_dict.json")
            
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

def extract_word_content(docx_path: str) -> Dict:
    """
    提取Word文檔的結構化內容
    :param docx_path: Word文檔路徑
    :return: 包含結構化內容的字典
    """
    logger.info(f"開始提取Word文檔內容: {docx_path}")
    
    # 定義結果結構
    result = {
        'title': '',
        'sections': [],
        'paragraphs': [],
        'lists': [],
        'metadata': {},
        'raw_html': ''
    }
    
    try:
        # 方法1: 使用mammoth提取HTML
        with open(docx_path, 'rb') as docx_file:
            # 自定義樣式映射，避免過度使用強調標記
            style_map = """
                p[style-name='標題'] => h1:fresh
                p[style-name='Title'] => h1:fresh
                p[style-name='Heading 1'] => h1:fresh
                p[style-name='標題 1'] => h1:fresh
                p[style-name='Heading 2'] => h2:fresh
                p[style-name='標題 2'] => h2:fresh
                p[style-name='Heading 3'] => h3:fresh
                p[style-name='標題 3'] => h3:fresh
                p[style-name='Heading 4'] => h4:fresh
                p[style-name='標題 4'] => h4:fresh
                p[style-name='List Paragraph'] => li:fresh
                p[style-name='項目符號'] => li:fresh
            """
            
            convert_options = {
                "style_map": style_map,
                "include_default_style_map": True
            }
            
            # 使用mammoth提取HTML
            mammoth_result = mammoth.convert_to_html(docx_file, **convert_options)
            result['raw_html'] = mammoth_result.value
            
            # 使用BeautifulSoup解析HTML
            soup = BeautifulSoup(result['raw_html'], 'html.parser')
            
            # 提取標題 (第一個h1或h2)
            title_tag = soup.find(['h1', 'h2'])
            if title_tag:
                result['title'] = title_tag.get_text().strip()
            
            # 提取段落和標題
            for elem in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li']):
                text = elem.get_text().strip()
                if not text:
                    continue
                
                elem_type = elem.name
                if elem_type.startswith('h'):
                    # 標題
                    level = int(elem_type[1])
                    result['sections'].append({
                        'type': 'heading',
                        'level': level,
                        'text': text
                    })
                elif elem_type == 'p':
                    # 段落
                    result['paragraphs'].append({
                        'type': 'paragraph',
                        'text': text
                    })
                elif elem_type == 'li':
                    # 列表項
                    result['lists'].append({
                        'type': 'list_item',
                        'text': text
                    })
        
        # 方法2: 使用python-docx提取更詳細的結構
        doc = docx.Document(docx_path)
        
        # 提取文檔屬性
        result['metadata'] = {
            'author': doc.core_properties.author,
            'created': doc.core_properties.created,
            'modified': doc.core_properties.modified,
            'title': doc.core_properties.title,
            'subject': doc.core_properties.subject,
            'keywords': doc.core_properties.keywords
        }
        
        logger.info(f"成功提取Word文檔內容，找到 {len(result['sections'])} 個標題，{len(result['paragraphs'])} 個段落，{len(result['lists'])} 個列表項")
        return result
        
    except Exception as e:
        logger.error(f"提取Word內容時出錯: {str(e)}", exc_info=True)
        raise Exception(f"提取Word內容失敗: {str(e)}")

def clean_html_content(html_content: str) -> str:
    """
    清理HTML內容，解決格式問題
    :param html_content: 原始HTML內容
    :return: 清理後的HTML內容
    """
    logger.info("開始清理HTML內容")
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 1. 清理不必要的強調/加粗標籤
    for strong in soup.find_all('strong'):
        # 如果整個段落都被加粗，則移除加粗
        if strong.parent and strong.parent.name in ['p', 'li']:
            if len(strong.parent.get_text().strip()) == len(strong.get_text().strip()):
                strong.replace_with(strong.get_text())
    
    # 2. 處理列表項，確保它們在正確的容器中
    list_items = soup.find_all('li')
    current_list = None
    
    for li in list_items:
        # 如果列表項不在ul或ol中
        if li.parent.name not in ['ul', 'ol']:
            # 如果沒有當前列表，創建一個新的
            if current_list is None:
                current_list = soup.new_tag('ul')
                li.insert_before(current_list)
            
            # 將列表項移動到列表中
            original_li = li.extract()
            current_list.append(original_li)
        else:
            # 如果列表項在正確的容器中，更新當前列表引用
            current_list = li.parent
    
    # 3. 合併相鄰的相同類型列表
    lists = soup.find_all(['ul', 'ol'])
    for i in range(len(lists) - 1, 0, -1):
        current_list = lists[i]
        prev_list = lists[i-1]
        
        # 檢查是否相鄰且相同類型
        if current_list.name == prev_list.name and current_list.previous_sibling == prev_list:
            # 將當前列表的項目移動到前一個列表
            items = current_list.find_all('li', recursive=False)
            for item in items:
                prev_list.append(item.extract())
            
            # 移除空列表
            current_list.decompose()
    
    # 4. 為長列表添加分組標記
    long_lists = [lst for lst in soup.find_all(['ul', 'ol']) if len(lst.find_all('li')) > 5]
    for lst in long_lists:
        # 為長列表添加類別
        lst['class'] = lst.get('class', []) + ['grouped-list']
    
    # 5. 清理空元素
    for elem in soup.find_all():
        if not elem.contents and elem.name not in ['br', 'hr', 'img']:
            elem.decompose()
        elif elem.name in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'] and not elem.get_text().strip():
            elem.decompose()
    
    # 6. 確保所有標題有適當的層次
    headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    for i, h in enumerate(headings):
        if i == 0 and h.name != 'h1':
            # 第一個標題應該是h1
            h.name = 'h1'
        elif i > 0:
            # 其他標題不應該跳級
            prev_level = int(headings[i-1].name[1])
            curr_level = int(h.name[1])
            if curr_level > prev_level + 1:
                h.name = f'h{prev_level + 1}'
    
    logger.info("HTML內容清理完成")
    return str(soup)

def organize_content(content_dict: Dict) -> Dict:
    """
    組織提取的內容，為HTML生成做準備
    :param content_dict: 提取的內容字典
    :return: 組織後的內容字典
    """
    logger.info("開始組織內容結構")
    
    result = {
        'title': content_dict.get('title', '未命名文章'),
        'main_content': [],
        'list_sections': [],
        'summary': '',
        'metadata': content_dict.get('metadata', {})
    }
    
    # 從段落中提取摘要
    if content_dict['paragraphs']:
        first_para = content_dict['paragraphs'][0]['text']
        result['summary'] = first_para[:200] + ('...' if len(first_para) > 200 else '')
    
    # 組織主要內容
    all_elements = []
    
    # 添加標題
    for section in content_dict['sections']:
        all_elements.append({
            'type': 'heading',
            'level': section['level'],
            'text': section['text'],
            'order': len(all_elements)
        })
    
    # 添加段落
    for para in content_dict['paragraphs']:
        all_elements.append({
            'type': 'paragraph',
            'text': para['text'],
            'order': len(all_elements)
        })
    
    # 按原始順序排序
    all_elements.sort(key=lambda x: x['order'])
    
    # 將內容分為主要內容和列表部分
    result['main_content'] = all_elements
    
    # 如果有列表項，將它們組織成單獨的部分
    if content_dict['lists']:
        # 獲取可能的列表主題
        list_topics = []
        for item in content_dict['lists']:
            first_words = item['text'].split()[:2]
            if first_words:
                potential_topic = first_words[0]
                if len(potential_topic) > 1 and potential_topic not in list_topics:
                    list_topics.append(potential_topic)
        
        # 按主題分組列表項
        grouped_items = {}
        for item in content_dict['lists']:
            assigned = False
            for topic in list_topics:
                if topic in item['text'][:20]:  # 檢查項目開頭是否包含主題詞
                    if topic not in grouped_items:
                        grouped_items[topic] = []
                    grouped_items[topic].append(item)
                    assigned = True
                    break
            
            # 如果沒有分配到主題，放入"其他"類別
            if not assigned:
                if '其他' not in grouped_items:
                    grouped_items['其他'] = []
                grouped_items['其他'].append(item)
        
        # 轉換為列表部分
        for topic, items in grouped_items.items():
            result['list_sections'].append({
                'topic': topic,
                'items': items
            })
    
    logger.info(f"內容組織完成: 找到 {len(result['main_content'])} 個主要內容元素和 {len(result['list_sections'])} 個列表部分")
    return result

def generate_article_html(organized_content: Dict, date: str, category_code: str = "tax") -> str:
    """
    生成文章HTML
    :param organized_content: 組織後的內容
    :param date: 發布日期
    :param category_code: 分類代碼
    :return: 文章HTML
    """
    logger.info(f"開始生成文章HTML，日期: {date}，分類: {category_code}")
    
    # 獲取標題和摘要
    title = organized_content['title']
    summary = organized_content.get('summary', f"{title} - 專業財稅知識分享")
    
    # 生成標籤 (從摘要和標題中提取)
    all_text = title + " " + summary
    for elem in organized_content['main_content']:
        all_text += " " + elem['text']
    
    # 提取標籤
    if USE_UTILS:
        setup_jieba_dict()
        tags = extract_keywords(all_text, 5)
    else:
        # 簡易版標籤提取
        common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業", "公司"]
        tags = []
        for kw in common_keywords:
            if kw in all_text and len(tags) < 5:
                tags.append(kw)
    
    # 確保至少有一些標籤
    if not tags:
        tags = ["財稅", "會計", "企業"]
    
    # 決定主要分類
    primary_category = "稅務相關"  # 默認
    category_scores = {
        "稅務相關": 0,
        "會計記帳": 0,
        "企業經營": 0,
        "創業資訊": 0
    }
    
    # 關鍵詞列表
    keywords = {
        "稅務相關": ["稅", "報稅", "節稅", "稅務", "稅收", "所得稅", "營業稅", "扣繳", "稅法"],
        "會計記帳": ["會計", "記帳", "帳務", "財報", "憑證", "審計", "財務報表", "會計師"],
        "企業經營": ["企業", "公司", "經營", "管理", "營運", "商業", "策略", "執行長"],
        "創業資訊": ["創業", "新創", "新創事業", "創業家", "募資", "新創團隊"]
    }
    
    # 統計關鍵詞出現次數
    for category, words in keywords.items():
        for word in words:
            count = all_text.count(word)
            if count > 0:
                category_scores[category] += count
    
    # 選取得分最高的類別
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    
    # 映射到類別代碼
    category_map = {
        "稅務相關": "tax",
        "會計記帳": "accounting",
        "企業經營": "business",
        "創業資訊": "startup"
    }
    
    # 如果有提供類別代碼，使用它，否則使用推斷的類別
    if not category_code or category_code not in category_map.values():
        category_code = category_map.get(primary_category, "tax")
    
    # 選擇文章圖片
    image_path = f"/assets/images/blog/{category_code}_default.jpg"
    
    # 生成slug (SEO友好URL)
    slug = slugify(title)
    file_name = f"{date}-{slug}.html"
    relative_url = f"/blog/{file_name}"
    
    # 生成標籤連結HTML
    tag_links = generate_tag_links(tags)
    
    # 生成主要內容HTML
    main_content_html = []
    for elem in organized_content['main_content']:
        if elem['type'] == 'heading':
            level = elem['level']
            main_content_html.append(f'<h{level}>{elem["text"]}</h{level}>')
        elif elem['type'] == 'paragraph':
            main_content_html.append(f'<p>{elem["text"]}</p>')
    
    main_content_html = "\n".join(main_content_html)
    
    # HTML模板
    template = f"""<!DOCTYPE html>
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
        <a href="/blog.html?category={category_code}" class="article-category">
          <span class="material-symbols-rounded">sell</span>
          {primary_category}
        </a>
      </div>
      
      <!-- 文章標題區 -->
      <div class="article-header-main">
        <h1 class="article-title">{title}</h1>
      </div>
      
      <!-- 文章內容主體 -->
      <div class="article-body">
{main_content_html}
      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
          {tag_links}
        </div>
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

<!-- 頁尾區域 -->
<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-content">
      <!-- Logo與簡介 -->
      <div class="footer-logo">
        <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="footer-logo-img">
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
          <li><a href="/video.html"><span class="material-symbols-rounded icon-link">play_circle</span> 影音專區</a></li>
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

<!-- 返回頂部按鈕功能 - 腳本 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    // 返回頂部按鈕功能
    const backToTopButton = document.querySelector('.back-to-top');
    
    // 初始隱藏按鈕
    backToTopButton.classList.remove('visible');
    
    // 監聽滾動事件
    window.addEventListener('scroll', function() {{
      if (window.pageYOffset > 300) {{
        backToTopButton.classList.add('visible');
      }} else {{
        backToTopButton.classList.remove('visible');
      }}
    }});
    
    // 點擊事件
    backToTopButton.addEventListener('click', function() {{
      window.scrollTo({{
        top: 0,
        behavior: 'smooth'
      }});
    }});
    
    // 清理可能的格式問題
    (function cleanupArticleContent() {{
      // 移除標題前的 # 符號
      const headers = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6');
      headers.forEach(header => {{
        header.innerHTML = header.innerHTML.replace(/^#+\s*/, '');
      }});
      
      // 移除粗體標記符號
      const allElements = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body p, .article-body li');
      allElements.forEach(el => {{
        el.innerHTML = el.innerHTML.replace(/\*\*(.*?)\*\*/g, '$1');
      }});
      
      // 如果第一個標題與文章標題相同，則隱藏
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

<!-- 文章閱讀進度指示器 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
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
    function updateReadingProgress() {{
      const articleContent = document.querySelector('.article-card');
      if (!articleContent) return;
      
      const contentHeight = articleContent.offsetHeight;
      const contentTop = articleContent.offsetTop;
      const contentBottom = contentTop + contentHeight;
      const currentPosition = window.scrollY + window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // 考慮視窗大小，確保內容完全可見時進度為100%
      let progress = 0;
      if (currentPosition > contentTop) {{
        progress = Math.min(100, ((currentPosition - contentTop) / (contentHeight)) * 100);
      }}
      
      progressIndicator.style.width = `${{progress}}%`;
      
      // 當閱讀完畢時添加動畫效果
      if (progress >= 99) {{
        progressIndicator.style.transition = 'width 0.5s ease, opacity 1s ease';
        progressIndicator.style.opacity = '0.5';
      }} else {{
        progressIndicator.style.transition = 'width 0.2s ease';
        progressIndicator.style.opacity = '1';
      }}
    }}
    
    // 滾動時更新進度
    window.addEventListener('scroll', updateReadingProgress);
    window.addEventListener('resize', updateReadingProgress);
    
    // 初始化進度
    updateReadingProgress();
  }});
</script>

</body>
</html>"""
    
    return template

def slugify(text: str) -> str:
    """
    將文本轉換為 URL 友好的格式 - 使用翻譯字典
    :param text: 要轉換的文本
    :return: URL 友好的字符串
    """
    logger.info(f"開始處理標題URL化: {text}")
    
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
    
    logger.info(f"處理後的URL: {slug}")
    return slug

def generate_tag_links(tags: List[str]) -> str:
    """
    生成標籤鏈接HTML
    :param tags: 標籤列表
    :return: HTML標籤鏈接
    """
    tag_links = []
    for tag in tags:
        slug = slugify(tag)
        tag_links.append(f'<a href="/blog.html?tag={slug}" class="article-tag">{tag}</a>')
    return '\n          '.join(tag_links)

def process_word_file(docx_path: str, output_dir: str) -> Dict:
    """
    處理單個Word文件的完整流程
    :param docx_path: Word文檔路徑
    :param output_dir: 輸出目錄
    :return: 處理結果
    """
    try:
        # 1. 提取文件名資訊
        filename = os.path.basename(docx_path)
        logger.info(f"開始處理文件: {filename}")
        
        # 從文件名提取日期
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        date = date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")
        
        # 2. 提取Word內容
        content_dict = extract_word_content(docx_path)
        
        # 3. 組織內容結構
        organized_content = organize_content(content_dict)
        
        # 4. 生成HTML
        html_content = generate_article_html(organized_content, date)
        
        # 5. 生成文件名
        slug = slugify(organized_content['title'])
        file_name = f"{date}-{slug}.html"
        
        # 6. 寫入文件
        output_path = os.path.join(output_dir, file_name)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"成功將 {filename} 轉換為 {file_name}")
        
        return {
            'success': True,
            'output_file': file_name,
            'title': organized_content['title'],
            'metadata': {
                'date': date,
                'summary': organized_content.get('summary', ''),
                'tags': organized_content.get('tags', [])
            }
        }
        
    except Exception as e:
        logger.error(f"處理 {docx_path} 時出錯: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'docx_path': docx_path
        }

def process_word_files(input_dir: str, output_dir: str) -> List[Dict]:
    """
    處理指定目錄中的Word文檔，轉換為HTML
    :param input_dir: 輸入目錄
    :param output_dir: 輸出目錄
    :return: 處理結果列表
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 獲取所有Word文檔
    docx_files = [f for f in os.listdir(input_dir) 
             if f.lower().endswith('.docx') and not f.startswith('~')]  # 排除臨時檔案
    
    if not docx_files:
        logger.warning(f"在 {input_dir} 中沒有找到Word文檔")
        return []
    
    logger.info(f"找到 {len(docx_files)} 個Word文檔")
    
    # 處理每個Word文檔
    results = []
    for idx, docx_file in enumerate(docx_files, 1):
        docx_path = os.path.join(input_dir, docx_file)
        logger.info(f"處理第 {idx}/{len(docx_files)} 個文件: {docx_file}")
        
        result = process_word_file(docx_path, output_dir)
        results.append(result)
        
        # 記錄進度
        success_count = sum(1 for r in results if r['success'])
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    # 檢查命令行參數
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return 1
    
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
    logger.info("====== Word轉HTML處理開始 ======")
    results = process_word_files(input_dir, output_dir)
    
    # 輸出總結
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