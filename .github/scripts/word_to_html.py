#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
優化版 Word 文檔轉換為 HTML 工具 - 修訂版
解決內容提取不完整和日期下方自動生成內容的問題
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
import io

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
import docx2txt

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

def extract_word_content_direct(docx_path: str) -> str:
    """
    直接從Word文檔提取完整文本內容
    :param docx_path: Word文檔路徑
    :return: 提取的純文本內容
    """
    logger.info(f"使用直接提取法從Word獲取內容: {docx_path}")
    
    try:
        # 使用python-docx直接提取所有段落
        doc = docx.Document(docx_path)
        full_text = []
        
        # 逐段落提取文本
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:  # 忽略空白段落
                # 檢查段落的風格以判斷其類型
                style_name = para.style.name if para.style else "Normal"
                
                # 處理標題
                if style_name.startswith('Heading') or style_name.startswith('標題'):
                    level = 1
                    if len(style_name) > 7 and style_name[-1].isdigit():
                        level = int(style_name[-1])
                    heading_mark = '#' * level + ' '
                    full_text.append(f"{heading_mark}{text}")
                else:
                    full_text.append(text)
        
        # 處理表格
        for table in doc.tables:
            full_text.append("表格開始:")
            for i, row in enumerate(table.rows):
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    row_text.append(cell_text if cell_text else " ")
                full_text.append(" | ".join(row_text))
            full_text.append("表格結束")
        
        logger.info(f"直接提取了 {len(full_text)} 個段落")
        return "\n\n".join(full_text)
    
    except Exception as e:
        logger.error(f"直接提取Word內容時出錯: {str(e)}")
        return ""

def extract_docx_with_mammoth(docx_path: str) -> str:
    """
    使用mammoth提取Word文檔的HTML內容
    :param docx_path: Word文檔路徑
    :return: HTML內容
    """
    logger.info(f"使用mammoth從Word獲取HTML: {docx_path}")
    
    try:
        with open(docx_path, 'rb') as docx_file:
            # 使用最簡單的轉換配置，確保獲取完整內容
            result = mammoth.convert_to_html(docx_file)
            html_content = result.value
            
            # 檢查警告
            warnings = []
            for message in result.messages:
                if message.type == "warning":
                    warnings.append(message.message)
            
            if warnings:
                logger.warning(f"Mammoth轉換警告: {warnings}")
            
            logger.info(f"Mammoth提取的HTML長度: {len(html_content)}")
            return html_content
    
    except Exception as e:
        logger.error(f"Mammoth提取Word內容時出錯: {str(e)}")
        return ""

def extract_docx_with_docx2txt(docx_path: str) -> str:
    """
    使用docx2txt提取Word文檔的純文本內容
    :param docx_path: Word文檔路徑
    :return: 純文本內容
    """
    logger.info(f"使用docx2txt從Word獲取純文本: {docx_path}")
    
    try:
        text = docx2txt.process(docx_path)
        logger.info(f"Docx2txt提取的文本長度: {len(text)}")
        return text
    
    except Exception as e:
        logger.error(f"Docx2txt提取Word內容時出錯: {str(e)}")
        return ""

def extract_word_content(docx_path: str) -> Dict:
    """
    使用多種方法提取Word文檔內容，確保最大程度的完整性
    :param docx_path: Word文檔路徑
    :return: 包含所有提取結果的字典
    """
    logger.info(f"開始多方法提取Word文檔內容: {docx_path}")
    
    results = {
        'direct_text': extract_word_content_direct(docx_path),
        'mammoth_html': extract_docx_with_mammoth(docx_path),
        'docx2txt': extract_docx_with_docx2txt(docx_path)
    }
    
    # 檢查是否所有方法都失敗了
    if not results['direct_text'] and not results['mammoth_html'] and not results['docx2txt']:
        raise Exception("所有提取方法都失敗了，無法獲取Word內容")
    
    # 檢查提取結果的完整性
    content_lengths = {
        'direct_text': len(results['direct_text']),
        'mammoth_html': len(BeautifulSoup(results['mammoth_html'], 'html.parser').get_text()) if results['mammoth_html'] else 0,
        'docx2txt': len(results['docx2txt'])
    }
    
    logger.info(f"提取結果長度比較: {content_lengths}")
    
    # 選擇最完整的內容
    best_method = max(content_lengths.items(), key=lambda x: x[1])[0]
    logger.info(f"選擇的最佳提取方法: {best_method}, 長度: {content_lengths[best_method]}")
    
    return results

def convert_to_html(content_dict: Dict) -> str:
    """
    將提取的內容轉換為HTML
    :param content_dict: 提取的內容字典
    :return: HTML字符串
    """
    logger.info("開始將提取內容轉換為HTML")
    
    # 如果已有mammoth提取的HTML，優先使用它
    if content_dict['mammoth_html']:
        logger.info("使用mammoth提取的HTML")
        return content_dict['mammoth_html']
    
    # 如果沒有HTML，則從直接提取的文本生成HTML
    if content_dict['direct_text']:
        logger.info("從直接提取的文本生成HTML")
        
        paragraphs = content_dict['direct_text'].split('\n\n')
        html_parts = ['<!DOCTYPE html>', '<html>', '<head>', '<meta charset="UTF-8">', '</head>', '<body>']
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # 檢查是否為標題（以#開頭）
            if para.startswith('#'):
                heading_match = re.match(r'^(#+)\s+(.+)$', para)
                if heading_match:
                    level = len(heading_match.group(1))
                    level = min(level, 6)  # 標題級別最大為6
                    title_text = heading_match.group(2).strip()
                    html_parts.append(f'<h{level}>{title_text}</h{level}>')
                else:
                    html_parts.append(f'<p>{para}</p>')
            elif para.startswith('表格開始:'):
                # 跳過表格標記
                continue
            elif para.startswith('表格結束'):
                # 跳過表格標記
                continue
            elif ' | ' in para and not para.startswith('- '):
                # 處理表格行
                cells = para.split(' | ')
                html_parts.append('<tr>')
                for cell in cells:
                    html_parts.append(f'<td>{cell}</td>')
                html_parts.append('</tr>')
            elif para.startswith('- '):
                # 處理列表項
                item_text = para[2:].strip()
                html_parts.append(f'<li>{item_text}</li>')
            else:
                # 普通段落
                html_parts.append(f'<p>{para}</p>')
        
        html_parts.append('</body>')
        html_parts.append('</html>')
        
        return '\n'.join(html_parts)
    
    # 如果都沒有，則從docx2txt生成HTML
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
    
    # 如果所有方法都失敗，返回空HTML
    logger.warning("所有轉換方法都失敗，返回空HTML")
    return '<!DOCTYPE html><html><body><p>無法提取內容</p></body></html>'

def clean_html_content(html_content: str) -> str:
    """
    清理HTML內容，確保格式良好
    :param html_content: 原始HTML內容
    :return: 清理後的HTML內容
    """
    logger.info("開始清理HTML內容")
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 確保有body元素
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
    
    # 清理不必要的強調/加粗標籤
    for strong in soup.find_all('strong'):
        # 如果整個段落都被加粗，則移除加粗
        if strong.parent and strong.parent.name in ['p', 'li']:
            if len(strong.parent.get_text().strip()) == len(strong.get_text().strip()):
                strong.replace_with(strong.get_text())
    
    # 清理列表結構，確保列表項在適當的列表容器中
    orphan_list_items = []
    for li in soup.find_all('li'):
        if li.parent.name not in ['ul', 'ol']:
            orphan_list_items.append(li)
    
    if orphan_list_items:
        logger.info(f"發現 {len(orphan_list_items)} 個孤立列表項，將它們放入合適的列表容器")
        
        current_list = None
        for li in orphan_list_items:
            # 從原位置移除
            li_content = li.get_text()
            li.extract()
            
            # 如果沒有當前列表，創建一個新的
            if current_list is None:
                current_list = soup.new_tag('ul')
                soup.body.append(current_list)
            
            # 創建新的列表項
            new_li = soup.new_tag('li')
            new_li.string = li_content
            current_list.append(new_li)
    
    # 修復嵌套的段落標籤
    for p in soup.find_all('p'):
        nested_p = p.find_all('p')
        for nested in nested_p:
            nested.unwrap()
    
    # 移除空元素
    for elem in soup.find_all():
        if elem.name not in ['br', 'hr', 'img'] and not elem.contents and not elem.string:
            elem.decompose()
    
    logger.info("HTML內容清理完成")
    return str(soup)

def extract_article_structure(html_content: str) -> Dict:
    """
    從HTML內容中提取文章結構
    :param html_content: HTML內容
    :return: 包含文章結構的字典
    """
    logger.info("開始提取文章結構")
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 確保有body元素
    body = soup.body
    if not body:
        logger.warning("HTML中沒有body元素，使用整個文檔")
        body = soup
    
    # 提取標題（第一個h1或h2）
    title = "未命名文章"
    h1 = body.find(['h1'])
    if h1:
        title = h1.get_text().strip()
    else:
        h2 = body.find(['h2'])
        if h2:
            title = h2.get_text().strip()
    
    # 從標題中移除日期（如果有）
    title = re.sub(r'^\d{4}-\d{2}-\d{2}\s*-?\s*', '', title)
    
    # 提取摘要（第一個段落）
    summary = ""
    first_p = body.find('p')
    if first_p:
        summary = first_p.get_text().strip()
        if len(summary) > 200:
            summary = summary[:197] + "..."
    
    # 提取所有內容元素
    content = []
    for elem in body.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'table']):
        # 跳過空元素
        if not elem.get_text().strip():
            continue
        
        # 不處理嵌套元素
        if elem.parent and elem.parent.name in ['td', 'li']:
            continue
        
        # 處理特定類型的元素
        if elem.name.startswith('h'):
            level = int(elem.name[1])
            elem_text = elem.get_text().strip()
            
            # 不重複包含標題
            if elem_text != title:
                content.append({
                    'type': 'heading',
                    'level': level,
                    'text': elem_text
                })
        elif elem.name == 'p':
            content.append({
                'type': 'paragraph',
                'text': elem.get_text().strip()
            })
        elif elem.name in ['ul', 'ol']:
            list_items = []
            for li in elem.find_all('li', recursive=False):
                list_items.append(li.get_text().strip())
            
            content.append({
                'type': 'list',
                'list_type': elem.name,
                'items': list_items
            })
        elif elem.name == 'table':
            rows = []
            for tr in elem.find_all('tr', recursive=False):
                cells = [td.get_text().strip() for td in tr.find_all(['td', 'th'], recursive=False)]
                rows.append(cells)
            
            content.append({
                'type': 'table',
                'rows': rows
            })
    
    result = {
        'title': title,
        'summary': summary,
        'content': content
    }
    
    logger.info(f"提取到標題: '{title}'")
    logger.info(f"提取到 {len(content)} 個內容元素")
    
    return result

def generate_article_html(article_structure: Dict, date: str) -> str:
    """
    根據文章結構生成HTML
    :param article_structure: 文章結構
    :param date: 發布日期
    :return: HTML字符串
    """
    logger.info(f"開始生成文章HTML，日期: {date}")
    
    title = article_structure['title']
    summary = article_structure['summary']
    content = article_structure['content']
    
    # 生成文章內容HTML
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
    
    # 如果沒有內容，添加摘要作為內容
    if not content_html and summary:
        content_html.append(f'<p>{summary}</p>')
    
    # 確定主題分類
    text_content = title + " " + summary + " " + ' '.join([elem.get('text', '') for elem in content])
    
    # 計算各個分類關鍵詞出現的次數
    category_scores = {
        "稅務相關": 0,
        "會計記帳": 0,
        "企業經營": 0,
        "投資理財": 0,
        "創業資訊": 0
    }
    
    # 關鍵詞列表
    keywords = {
        "稅務相關": ["稅", "報稅", "節稅", "稅務", "稅收", "所得稅", "營業稅", "扣繳", "稅法"],
        "會計記帳": ["會計", "記帳", "帳務", "財報", "憑證", "審計", "財務報表", "會計師"],
        "企業經營": ["企業", "公司", "經營", "管理", "營運", "商業", "策略", "執行長"],
        "投資理財": ["財務", "規劃", "投資", "理財", "資產", "負債", "現金流", "財富"],
        "創業資訊": ["創業", "新創", "新創事業", "創業家", "募資", "新創團隊"]
    }
    
    # 統計關鍵詞出現次數
    for category, words in keywords.items():
        for word in words:
            count = text_content.count(word)
            if count > 0:
                category_scores[category] += count
    
    # 選取得分最高的類別
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    
    # 如果沒有明確的類別，默認為稅務相關
    if category_scores[primary_category] == 0:
        primary_category = "稅務相關"
    
    # 對應類別代碼
    category_map = {
        "稅務相關": "tax",
        "會計記帳": "accounting",
        "企業經營": "business",
        "投資理財": "investment",
        "創業資訊": "startup"
    }
    
    category_code = category_map.get(primary_category, "tax")
    
    # 提取標籤
    if USE_UTILS:
        setup_jieba_dict()
        tags = extract_keywords(text_content, 5)
    else:
        # 簡易版標籤提取
        common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業", "公司"]
        tags = []
        for kw in common_keywords:
            if kw in text_content and len(tags) < 5:
                tags.append(kw)
    
    # 確保至少有一些標籤
    if not tags:
        tags = ["財稅", "會計", "企業"]
    
    # 生成標籤連結
    tag_links = generate_tag_links(tags)
    
    # 選擇文章圖片
    image_path = f"/assets/images/blog/{category_code}_default.jpg"
    
    # 生成SEO友好的URL
    slug = slugify(title)
    file_name = f"{date}-{slug}.html"
    relative_url = f"/blog/{file_name}"
    
    # 生成HTML模板
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
{"".join(content_html)}
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
        
        # 2. 使用多種方法提取Word內容
        content_dict = extract_word_content(docx_path)
        
        # 3. 將內容轉換為HTML
        html_content = convert_to_html(content_dict)
        
        # 4. 清理HTML內容
        cleaned_html = clean_html_content(html_content)
        
        # 5. 提取文章結構
        article_structure = extract_article_structure(cleaned_html)
        
        # 6. 生成最終HTML
        final_html = generate_article_html(article_structure, date)
        
        # 7. 生成文件名
        slug = slugify(article_structure['title'])
        file_name = f"{date}-{slug}.html"
        
        # 8. 寫入文件
        output_path = os.path.join(output_dir, file_name)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        logger.info(f"成功將 {filename} 轉換為 {file_name}")
        
        return {
            'success': True,
            'output_file': file_name,
            'title': article_structure['title'],
            'metadata': {
                'date': date,
                'summary': article_structure['summary']
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