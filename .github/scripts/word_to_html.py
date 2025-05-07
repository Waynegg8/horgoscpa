#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
優化版 Word 文檔轉換為 HTML 工具 - 修訂版
解決內容提取不完整和日期下方自動生成內容的問題
新增系列文章識別和保存功能，添加上一篇/下一篇導航
作者: Claude
日期: 2025-05-06
"""
import os
import sys
import re
import json
import random
import hashlib
import datetime
import logging
import glob
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import importlib
import subprocess
import io

# 確保依賴安裝
def ensure_dependencies():
    required_packages = [
        "mammoth", "python-docx", "bs4", "lxml", "docx2txt", "jieba"
    ]
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"安裝缺失的依賴: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

ensure_dependencies()

import mammoth
from bs4 import BeautifulSoup
import docx
import docx2txt

def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"word_extraction_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("word_extractor")

logger = setup_logging()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
BLOG_IMAGES_DIR = os.path.join(PROJECT_ROOT, "assets", "images", "blog")

try:
    from utils import load_translation_dict, extract_keywords, setup_jieba_dict, slugify
    USE_UTILS = True
    logger.info("成功導入 utils 模組")
except ImportError:
    logger.warning("無法導入 utils 模組，將使用內部函數")
    USE_UTILS = False
    
    def load_translation_dict():
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
            dict_path = os.path.join(project_root, "assets/data/tw_financial_dict.json")
            if not os.path.exists(dict_path):
                dict_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tw_financial_dict.json')
            if os.path.exists(dict_path):
                logger.info(f"從 {dict_path} 讀取翻譯字典")
                with open(dict_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"載入字典文件出錯: {str(e)}")
        return {}
    
    def extract_keywords(text, top_n=5):
        words = re.findall(r'[\w\u4e00-\u9fff]{2,}', text)
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:top_n]]
    
    def setup_jieba_dict():
        pass
        
    def slugify(text, translation_dict=None):
        if translation_dict and text in translation_dict:
            return translation_dict[text].lower().replace(' ', '-')
        if re.search(r'[\u4e00-\u9fff]', text):
            hash_value = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
            return f"article-{hash_value}"
        text = re.sub(r'[^\w\s-]', '', text).strip().lower()
        text = re.sub(r'[-\s]+', '-', text)
        return text

TRANSLATION_DICT = load_translation_dict()
logger.info(f"已加載翻譯字典，共 {len(TRANSLATION_DICT)} 個詞條")

CATEGORY_MAPPING = {
    "稅務": "tax",
    "會計": "accounting",
    "企業": "business",
    "記帳": "accounting",
    "財務": "financial",
    "創業": "startup",
    "法律": "legal"
}

def ensure_blog_images_dir():
    try:
        os.makedirs(BLOG_IMAGES_DIR, exist_ok=True)
        logger.info(f"確保圖片目錄存在: {BLOG_IMAGES_DIR}")
        return True
    except Exception as e:
        logger.error(f"創建圖片目錄時出錯: {str(e)}")
        return False

def create_default_images():
    categories = ["tax", "accounting", "business", "startup", "financial", "legal"]
    default_path = os.path.join(BLOG_IMAGES_DIR, "default.jpg")
    if not os.path.exists(default_path):
        logger.info("提示：您應手動上傳圖片到 assets/images/blog 目錄")
    images = get_available_images()
    logger.info(f"可用的圖片文件: {len(images)}")

def get_available_images():
    if not os.path.exists(BLOG_IMAGES_DIR):
        return []
    images = []
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp']:
        images.extend(glob.glob(os.path.join(BLOG_IMAGES_DIR, ext)))
    return images

def select_random_image(category_code):
    ensure_blog_images_dir()
    available_images = get_available_images()
    if not available_images:
        create_default_images()
        return f"/assets/images/blog/{category_code}_default.jpg"
    category_images = [img for img in available_images if category_code in os.path.basename(img).lower()]
    selected_image = random.choice(category_images if category_images else available_images)
    relative_path = selected_image.replace(PROJECT_ROOT, '')
    if not relative_path.startswith('/'):
        relative_path = '/' + relative_path
    logger.info(f"已選擇圖片: {relative_path}")
    return relative_path

def extract_date_from_filename(filename: str) -> Optional[str]:
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

def extract_word_content_direct(docx_path: str) -> str:
    logger.info(f"使用直接提取法從Word獲取內容: {docx_path}")
    try:
        doc = docx.Document(docx_path)
        full_text = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                style_name = para.style.name if para.style else "Normal"
                if style_name.startswith('Heading') or style_name.startswith('標題'):
                    level = 1
                    if len(style_name) > 7 and style_name[-1].isdigit():
                        level = int(style_name[-1])
                    heading_mark = '#' * level + ' '
                    full_text.append(f"{heading_mark}{text}")
                else:
                    full_text.append(text)
        for table in doc.tables:
            full_text.append("表格開始:")
            for row in table.rows:
                row_text = [cell.text.strip() or " " for cell in row.cells]
                full_text.append(" | ".join(row_text))
            full_text.append("表格結束")
        logger.info(f"直接提取了 {len(full_text)} 個段落")
        return "\n\n".join(full_text)
    except Exception as e:
        logger.error(f"直接提取Word內容時出錯: {str(e)}")
        return ""

def extract_docx_with_mammoth(docx_path: str) -> str:
    logger.info(f"使用mammoth從Word獲取HTML: {docx_path}")
    try:
        with open(docx_path, 'rb') as docx_file:
            result = mammoth.convert_to_html(docx_file)
            html_content = result.value
            warnings = [m.message for m in result.messages if m.type == "warning"]
            if warnings:
                logger.warning(f"Mammoth轉換警告: {warnings}")
            logger.info(f"Mammoth提取的HTML長度: {len(html_content)}")
            return html_content
    except Exception as e:
        logger.error(f"Mammoth提取Word內容時出錯: {str(e)}")
        return ""

def extract_docx_with_docx2txt(docx_path: str) -> str:
    logger.info(f"使用docx2txt從Word獲取純文本: {docx_path}")
    try:
        text = docx2txt.process(docx_path)
        logger.info(f"Docx2txt提取的文本長度: {len(text)}")
        return text
    except Exception as e:
        logger.error(f"Docx2txt提取Word內容時出錯: {str(e)}")
        return ""

def extract_word_content(docx_path: str) -> Dict:
    logger.info(f"開始多方法提取Word文檔內容: {docx_path}")
    results = {
        'direct_text': extract_word_content_direct(docx_path),
        'mammoth_html': extract_docx_with_mammoth(docx_path),
        'docx2txt': extract_docx_with_docx2txt(docx_path)
    }
    if not results['direct_text'] and not results['mammoth_html'] and not results['docx2txt']:
        raise Exception("所有提取方法都失敗了，無法獲取Word內容")
    content_lengths = {
        'direct_text': len(results['direct_text']),
        'mammoth_html': len(BeautifulSoup(results['mammoth_html'], 'html.parser').get_text()) if results['mammoth_html'] else 0,
        'docx2txt': len(results['docx2txt'])
    }
    logger.info(f"提取結果長度比較: {content_lengths}")
    best_method = max(content_lengths.items(), key=lambda x: x[1])[0]
    logger.info(f"選擇的最佳提取方法: {best_method}, 長度: {content_lengths[best_method]}")
    return results

def convert_to_html(content_dict: Dict) -> str:
    logger.info("開始將提取內容轉換為HTML")
    if content_dict['mammoth_html']:
        logger.info("使用mammoth提取的HTML")
        return content_dict['mammoth_html']
    if content_dict['direct_text']:
        logger.info("從直接提取的文本生成HTML")
        paragraphs = content_dict['direct_text'].split('\n\n')
        html_parts = ['<!DOCTYPE html>', '<html>', '<head>', '<meta charset="UTF-8">', '</head>', '<body>']
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if para.startswith('#'):
                heading_match = re.match(r'^(#+)\s+(.+)$', para)
                if heading_match:
                    level = len(heading_match.group(1))
                    level = min(level, 6)
                    title_text = heading_match.group(2).strip()
                    html_parts.append(f'<h{level}>{title_text}</h{level}>')
                else:
                    html_parts.append(f'<p>{para}</p>')
            elif para.startswith('表格開始:'):
                continue
            elif para.startswith('表格結束'):
                continue
            elif ' | ' in para and not para.startswith('- '):
                cells = para.split(' | ')
                html_parts.append('<tr>')
                for cell in cells:
                    html_parts.append(f'<td>{cell}</td>')
                html_parts.append('</tr>')
            elif para.startswith('- '):
                item_text = para[2:].strip()
                html_parts.append(f'<li>{item_text}</li>')
            else:
                html_parts.append(f'<p>{para}</p>')
        html_parts.append('</body>')
        html_parts.append('</html>')
        return '\n'.join(html_parts)
    if content_dict['docx2txt']:
        logger.info("從docx2txt提取的文本生成HTML")
        paragraphs = content_dict['docx2txt'].split('\n\n')
        html_parts = ['<!DOCTYPE html>', '<html>', '<head>', '<meta charset="UTF-8">', '</head>', '<body>']
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            html_parts.append(f'<p>{para}</p>')
        html_parts.append('</body>')
        html_parts.append('</html>')
        return '\n'.join(html_parts)
    logger.warning("所有轉換方法都失敗，返回空HTML")
    return '<!DOCTYPE html><html><body><p>無法提取內容</p></body></html>'

def clean_html_content(html_content: str) -> str:
    logger.info("開始清理HTML內容")
    soup = BeautifulSoup(html_content, 'html.parser')
    if not soup.body:
        new_body = soup.new_tag('body')
        for tag in list(soup.children):
            if tag.name not in ['html', 'head']:
                new_body.append(tag.extract())
        if soup.html:
            soup.html.append(new_body)
        else:
            html_tag = soup.new_tag('html')
            html_tag.append(new_body)
            soup.append(html_tag)
    for strong in soup.find_all('strong'):
        if strong.parent and strong.parent.name in ['p', 'li']:
            if len(strong.parent.get_text().strip()) == len(strong.get_text().strip()):
                strong.replace_with(strong.get_text())
    orphan_list_items = [li for li in soup.find_all('li') if li.parent.name not in ['ul', 'ol']]
    if orphan_list_items:
        logger.info(f"發現 {len(orphan_list_items)} 個孤立列表項，將它們放入合適的列表容器")
        current_list = None
        for li in orphan_list_items:
            li_content = li.get_text()
            li.extract()
            if current_list is None:
                current_list = soup.new_tag('ul')
                soup.body.append(current_list)
            new_li = soup.new_tag('li')
            new_li.string = li_content
            current_list.append(new_li)
    for p in soup.find_all('p'):
        nested_p = p.find_all('p')
        for nested in nested_p:
            nested.unwrap()
    for elem in soup.find_all():
        if elem.name not in ['br', 'hr', 'img'] and not elem.contents and not elem.string:
            elem.decompose()
    logger.info("HTML內容清理完成")
    return str(soup)

def extract_article_structure(html_content: str) -> Dict:
    logger.info("開始提取文章結構")
    soup = BeautifulSoup(html_content, 'html.parser')
    body = soup.body or soup
    title = "未命名文章"
    h1 = body.find(['h1'])
    if h1:
        title = h1.get_text().strip()
    else:
        h2 = body.find(['h2'])
        if h2:
            title = h2.get_text().strip()
    title = re.sub(r'^\d{4}-\d{2}-\d{2}\s*-?\s*', '', title)
    summary = ""
    first_p = body.find('p')
    if first_p:
        summary = first_p.get_text().strip()
        if len(summary) > 200:
            summary = summary[:197] + "..."
    content = []
    for elem in body.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'table']):
        if not elem.get_text().strip() or (elem.parent and elem.parent.name in ['td', 'li']):
            continue
        if elem.name.startswith('h'):
            level = int(elem.name[1])
            elem_text = elem.get_text().strip()
            if elem_text != title:
                content.append({'type': 'heading', 'level': level, 'text': elem_text})
        elif elem.name == 'p':
            content.append({'type': 'paragraph', 'text': elem.get_text().strip()})
        elif elem.name in ['ul', 'ol']:
            list_items = [li.get_text().strip() for li in elem.find_all('li', recursive=False)]
            content.append({'type': 'list', 'list_type': elem.name, 'items': list_items})
        elif elem.name == 'table':
            rows = [[td.get_text().strip() for td in tr.find_all(['td', 'th'], recursive=False)] for tr in elem.find_all('tr', recursive=False)]
            content.append({'type': 'table', 'rows': rows})
    logger.info(f"提取到標題: '{title}'")
    logger.info(f"提取到 {len(content)} 個內容元素")
    return {'title': title, 'summary': summary, 'content': content}

def fully_translate_to_english(text: str) -> str:
    if text in TRANSLATION_DICT:
        return TRANSLATION_DICT[text].lower().replace(' ', '-')
    words = list(text)
    translated = []
    for word in words:
        if word in TRANSLATION_DICT:
            translated.append(TRANSLATION_DICT[word].lower())
        elif re.match(r'^[a-zA-Z0-9.]+$', word):
            translated.append(word.lower())
        else:
            translated.append('term')
    result = '-'.join(translated)
    result = re.sub(r'-{2,}', '-', result).strip('-')
    if not result or len(result) > 100:
        hash_value = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
        result = f"article-{hash_value}"
    return result

def generate_article_html(article_structure: Dict, date: str, english_url: str, is_series=False, series_name=None, episode=None, original_filename=None) -> str:
    logger.info(f"開始生成文章HTML，日期: {date}")
    title = article_structure['title']
    summary = article_structure['summary']
    content = article_structure['content']
    
    content_html = []
    for elem in content:
        if elem['type'] == 'heading':
            level = elem['level']
            text = elem['text']
            content_html.append(f'<h{level}>{text}</h{level}>')
        elif elem['type'] == 'paragraph':
            text = elem['text']
            content_html.append(f'<p>{text}</p>')
        elif elem['type'] == 'list':
            list_type = elem['list_type']
            items = elem['items']
            list_html = [f'<{list_type}>']
            for item in items:
                list_html.append(f'<li>{item}</li>')
            list_html.append(f'</{list_type}>')
            content_html.append('\n'.join(list_html))
        elif elem['type'] == 'table':
            rows = elem['rows']
            table_html = ['<table border="1">']
            for row in rows:
                table_html.append('<tr>')
                for cell in row:
                    table_html.append(f'<td>{cell}</td>')
                table_html.append('</tr>')
            table_html.append('</table>')
            content_html.append('\n'.join(table_html))
    
    if not content_html and summary:
        content_html.append(f'<p>{summary}</p>')
    
    text_content = title + " " + summary + " " + ' '.join([elem.get('text', '') for elem in content])
    category_scores = {
        "稅務相關": 0,
        "會計記帳": 0,
        "企業經營": 0,
        "投資理財": 0,
        "創業資訊": 0
    }
    keywords = {
        "稅務相關": ["稅", "報稅", "節稅", "稅務", "稅收", "所得稅", "營業稅", "扣繳", "稅法"],
        "會計記帳": ["會計", "記帳", "帳務", "財報", "憑證", "審計", "財務報表", "會計師"],
        "企業經營": ["企業", "公司", "經營", "管理", "營運", "商業", "策略", "執行長"],
        "投資理財": ["財務", "規劃", "投資", "理財", "資產", "負債", "現金流", "財富"],
        "創業資訊": ["創業", "新創", "新創事業", "創業家", "募資", "新創團隊"]
    }
    for category, words in keywords.items():
        for word in words:
            count = text_content.count(word)
            if count > 0:
                category_scores[category] += count
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    if category_scores[primary_category] == 0:
        primary_category = "稅務相關"
    category_map = {
        "稅務相關": "tax",
        "會計記帳": "accounting",
        "企業經營": "business",
        "投資理財": "investment",
        "創業資訊": "startup"
    }
    category_code = category_map.get(primary_category, "tax")
    
    if USE_UTILS:
        setup_jieba_dict()
        tags = extract_keywords(text_content, 5)
    else:
        common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業", "公司"]
        tags = [kw for kw in common_keywords if kw in text_content and len(tags) < 5]
    
    if not tags:
        tags = ["財稅", "會計", "企業"]
    
    tag_links = []
    for tag in tags:
        slug = slugify(tag)
        tag_links.append(f'<a href="/blog.html?tag={slug}" class="article-tag">{tag}</a>')
    tag_links = '\n          '.join(tag_links)
    
    image_path = select_random_image(category_code)
    relative_url = english_url
    
    series_meta_tags = ""
    if is_series and series_name and episode:
        series_meta_tags = f"""
  <meta name="series-name" content="{series_name}">
  <meta name="series-episode" content="{episode}">
  <meta name="original-filename" content="{original_filename or ''}">
"""
    
    structured_data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": summary,
        "image": f"https://www.horgoscpa.com{image_path}",
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
            "@id": f"https://www.horgoscpa.com{relative_url}"
        },
        "keywords": ", ".join(tags)
    }
    
    if is_series and series_name and episode:
        structured_data["isPartOf"] = {
            "@type": "Series",
            "name": series_name,
            "position": episode,
            "originalFilename": original_filename or ""
        }
    
    structured_data_json = json.dumps(structured_data, ensure_ascii=False)
    
    template = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{summary}" />
  <title>{title} | 霍爾果斯會計師事務所</title>
  {series_meta_tags}

<!-- hreflang 標籤 -->
  <link rel="alternate" hreflang="zh-TW" href="https://www.horgoscpa.com{english_url}" />
  
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
  {structured_data_json}
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
{"".join(content_html)}
      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
          {tag_links}
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
        header.innerHTML = header.innerHTML.replace(/^#+\s*/, '');
      }});
      const allElements = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body p, .article-body li');
      allElements.forEach(el => {{
        el.innerHTML = el.innerHTML.replace(/\*\*(.*?)\*\*/g, '$1');
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
    return template

def generate_tag_links(tags: List[str]) -> str:
    tag_links = []
    for tag in tags:
        slug = slugify(tag)
        tag_links.append(f'<a href="/blog.html?tag={slug}" class="article-tag">{tag}</a>')
    return '\n          '.join(tag_links)

def process_word_file(docx_path: str, output_dir: str) -> Dict:
    try:
        filename = os.path.basename(docx_path)
        original_filename = filename
        logger.info(f"開始處理文件: {filename}")
        
        date = extract_date_from_filename(filename) or datetime.datetime.now().strftime("%Y-%m-%d")
        is_series, series_name, episode = extract_series_info_from_filename(filename)
        
        if is_series:
            logger.info(f"檢測到系列文章: {series_name}, EP{episode}")
        
        content_dict = extract_word_content(docx_path)
        html_content = convert_to_html(content_dict)
        cleaned_html = clean_html_content(html_content)
        article_structure = extract_article_structure(cleaned_html)
        
        word_title = article_structure['title']
        english_slug = slugify(word_title, TRANSLATION_DICT)
        
        if not english_slug or english_slug == "term":
            hash_part = hashlib.md5(word_title.encode('utf-8')).hexdigest()[:8]
            english_slug = f"article-{hash_part}"
        
        html_filename = f"{date}-{english_slug}"
        if is_series:
            series_slug = slugify(series_name, TRANSLATION_DICT)
            if not series_slug or len(series_slug) < 3:
                series_slug = hashlib.md5(series_name.encode('utf-8')).hexdigest()[:8]
            html_filename = f"{html_filename}-{series_slug}-ep{episode}"
        
        html_filename = f"{html_filename}.html"
        english_url = f"/blog/{html_filename}"
        
        final_html = generate_article_html(
            article_structure, 
            date, 
            english_url,
            is_series=is_series,
            series_name=series_name,
            episode=episode,
            original_filename=original_filename
        )
        
        output_path = os.path.join(output_dir, html_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        logger.info(f"成功將 {filename} 轉換為 {html_filename}")
        
        return {
            'success': True,
            'output_file': html_filename,
            'original_filename': original_filename,
            'title': article_structure['title'],
            'english_url': english_url,
            'metadata': {
                'date': date,
                'summary': article_structure['summary'],
                'is_series': is_series,
                'series_name': series_name,
                'episode': episode
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
    os.makedirs(output_dir, exist_ok=True)
    ensure_blog_images_dir()
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

def main() -> int:
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return 1
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    logger.info(f"輸入目錄: {input_dir}")
    logger.info(f"輸出目錄: {output_dir}")
    
    if USE_UTILS:
        setup_jieba_dict()
        logger.info("已設置jieba詞典")
    
    ensure_blog_images_dir()
    
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