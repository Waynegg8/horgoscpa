#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
改進版 HTML 生成模組
負責將處理後的文檔內容轉換為格式優化的 HTML 部落格文章
"""

import os
import re
import json
import random
from datetime import datetime
from pathlib import Path
from loguru import logger
from bs4 import BeautifulSoup

from utils import read_json, write_json

class ImprovedHtmlGenerator:
    """改進版 HTML 生成類"""
    
    def __init__(self, output_dir="blog", assets_dir="assets", templates_file=None):
        """
        初始化 HTML 生成器
        
        Args:
            output_dir: 輸出 HTML 目錄
            assets_dir: 資源目錄
            templates_file: 模板配置文件路徑
        """
        self.output_dir = Path(output_dir)
        self.assets_dir = Path(assets_dir)
        self.templates_file = Path(templates_file or f"{assets_dir}/data/templates.json")
        self.images_dir = Path(f"{assets_dir}/images/blog")
        
        # 確保目錄存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
        
        # 載入模板
        self.templates = read_json(self.templates_file)
        logger.info(f"已載入模板: {self.templates_file}")
    
    def _generate_meaningful_url(self, doc_info, translator):
        """
        生成有意義的 SEO 友善 URL
        
        Args:
            doc_info: 文檔信息字典
            translator: 翻譯器實例
            
        Returns:
            str: 有意義的 URL
        """
        # 提取日期
        date = doc_info["date"]
        
        # 初始化 URL 組件列表
        url_components = [date]
        
        # 獲取分類並添加到組件中
        category_slug = doc_info.get("category", "")
        if category_slug:
            url_components.append(category_slug)
        
        # 處理系列文章
        if doc_info.get("is_series", False):
            # 翻譯系列名稱
            series_name = doc_info.get("series_name", "")
            if series_name:
                # 提取系列名稱的關鍵詞
                series_keywords = self._extract_key_terms(series_name)
                series_url = translator.translate(" ".join(series_keywords))
                url_components.append(series_url)
            
            # 添加集數標識
            url_components.append(f"ep{doc_info['episode']}")
        
        # 處理標題 - 提取關鍵詞而非直接翻譯
        title = doc_info.get("title", "")
        if title:
            # 提取標題關鍵詞
            title_keywords = self._extract_key_terms(title)
            
            # 如果關鍵詞太少，嘗試從內容中補充
            if len(title_keywords) < 2 and "content" in doc_info:
                content_keywords = self._extract_content_keywords(doc_info["content"])
                title_keywords.extend(content_keywords[:2])
            
            # 翻譯關鍵詞組合
            if title_keywords:
                title_url = translator.translate(" ".join(title_keywords[:3]))
                url_components.append(title_url)
        
        # 組合 URL
        url = "-".join(url_components)
        
        # 清理和優化URL
        url = self._clean_url(url)
        
        # 確保URL長度適當且有意義
        if len(url) > 80:
            url = self._optimize_url_length(url, url_components, doc_info)
        
        return url
    
    def _extract_key_terms(self, text):
        """
        從文本中提取關鍵詞
        
        Args:
            text: 輸入文本
            
        Returns:
            list: 關鍵詞列表
        """
        # 移除常見的停用詞
        stop_words = {
            "的", "是", "在", "有", "和", "與", "及", "或", "但", "而", "就", "都", "會", "能", "可", "要", "不",
            "了", "著", "過", "來", "去", "上", "下", "中", "內", "外", "前", "後", "左", "右", "東", "西", 
            "南", "北", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "個", "些", "此", "該",
            "如何", "什麼", "為什麼", "怎麼", "哪裡", "何時", "詳解", "分析", "探討", "研究", "介紹"
        }
        
        # 分詞（簡單版本）
        words = []
        
        # 使用正則表達式分割中文詞語
        # 保留重要的財稅相關詞彙
        important_terms = [
            "保險", "稅務", "遺產稅", "贈與稅", "所得稅", "營業稅", "房屋稅", "地價稅", "印花稅",
            "會計", "審計", "財務", "投資", "理財", "節稅", "避稅", "合規", "申報", "規劃",
            "企業", "公司", "個人", "家庭", "資產", "負債", "收入", "支出", "成本", "費用",
            "法規", "法律", "條文", "辦法", "準則", "標準", "制度", "政策", "措施", "方案"
        ]
        
        # 先找出重要詞彙
        for term in important_terms:
            if term in text:
                words.append(term)
        
        # 如果重要詞彙不足，則進行簡單分詞
        if len(words) < 3:
            # 移除標點符號
            clean_text = re.sub(r'[^\w\s]', '', text)
            
            # 簡單的中文分詞（基於常見詞彙長度）
            i = 0
            while i < len(clean_text):
                # 嘗試匹配2-4字的詞彙
                found = False
                for length in [4, 3, 2]:
                    if i + length <= len(clean_text):
                        word = clean_text[i:i+length]
                        if word not in stop_words and len(word.strip()) > 1:
                            # 檢查是否包含數字或英文
                            if re.search(r'[a-zA-Z0-9]', word) or self._is_meaningful_term(word):
                                words.append(word)
                                i += length
                                found = True
                                break
                
                if not found:
                    i += 1
        
        # 去重並保持順序
        seen = set()
        unique_words = []
        for word in words:
            if word not in seen and len(word) > 1:
                seen.add(word)
                unique_words.append(word)
        
        return unique_words[:5]  # 返回最多5個關鍵詞
    
    def _is_meaningful_term(self, term):
        """
        判斷詞彙是否有意義
        
        Args:
            term: 詞彙
            
        Returns:
            bool: 是否有意義
        """
        # 財稅相關的常見詞根
        meaningful_roots = [
            "稅", "險", "務", "計", "財", "資", "產", "債", "法", "規", "劃", "理", "管", "營", "業"
        ]
        
        return any(root in term for root in meaningful_roots)
    
    def _extract_content_keywords(self, content):
        """
        從內容中提取關鍵詞
        
        Args:
            content: 內容列表
            
        Returns:
            list: 關鍵詞列表
        """
        if not content or not isinstance(content, list):
            return []
        
        # 合併前幾段內容
        text = " ".join(content[:3])
        
        # 提取關鍵詞
        keywords = self._extract_key_terms(text)
        
        return keywords[:3]
    
    def _clean_url(self, url):
        """
        清理URL
        
        Args:
            url: 原始URL
            
        Returns:
            str: 清理後的URL
        """
        # 轉為小寫
        url = url.lower()
        
        # 替換特殊字元為連字符
        url = re.sub(r'[^\w\s-]', '', url)
        
        # 將空格替換為連字符
        url = re.sub(r'\s+', '-', url.strip())
        
        # 移除連續的連字符
        url = re.sub(r'-+', '-', url)
        
        # 移除開頭和結尾的連字符
        url = url.strip('-')
        
        return url
    
    def _optimize_url_length(self, url, components, doc_info):
        """
        優化URL長度
        
        Args:
            url: 原始URL
            components: URL組件
            doc_info: 文檔信息
            
        Returns:
            str: 優化後的URL
        """
        # 保留必要組件：日期和分類
        essential = [components[0]]  # 日期
        
        if len(components) > 1 and doc_info.get("category"):
            essential.append(components[1])  # 分類
        
        # 如果是系列文章，保留系列標識和集數
        if doc_info.get("is_series", False):
            for i, comp in enumerate(components):
                if comp.startswith("ep") or i == 2:  # 系列名稱或集數
                    essential.append(comp)
                    break
        
        # 添加最重要的標題關鍵詞
        title_part = components[-1] if components else ""
        if title_part:
            # 縮短標題部分
            title_words = title_part.split('-')
            shortened_title = '-'.join(title_words[:2])  # 只取前兩個詞
            essential.append(shortened_title)
        
        return "-".join(essential)
    
    def _convert_content_to_html(self, content):
        """
        將內容轉換為格式優化的 HTML
        
        Args:
            content: 內容列表（段落）
            
        Returns:
            str: 格式優化的 HTML 內容
        """
        html_content = []
        in_list = False
        list_items = []
        list_type = None
        
        for paragraph in content:
            # 清理段落文本
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # 檢測標題 - 改進標題處理
            if paragraph.startswith("# "):
                title_text = paragraph[2:].strip()
                html_content.append(f'<h1 class="content-heading content-h1">{title_text}</h1>')
                continue
            elif paragraph.startswith("## "):
                title_text = paragraph[3:].strip()
                html_content.append(f'<h2 class="content-heading content-h2">{title_text}</h2>')
                continue
            elif paragraph.startswith("### "):
                title_text = paragraph[4:].strip()
                html_content.append(f'<h3 class="content-heading content-h3">{title_text}</h3>')
                continue
            elif paragraph.startswith("#### "):
                title_text = paragraph[5:].strip()
                html_content.append(f'<h4 class="content-heading content-h4">{title_text}</h4>')
                continue
            
            # 檢測是否為重要段落（前言、結語等）
            if self._is_important_paragraph(paragraph):
                # 結束當前列表（如果有）
                if in_list:
                    html_content.append(f"<{list_type}>")
                    html_content.extend(list_items)
                    html_content.append(f"</{list_type}>")
                    in_list = False
                    list_items = []
                    list_type = None
                
                html_content.append(f'<div class="important-paragraph"><p>{self._format_text(paragraph)}</p></div>')
                continue
            
            # 檢測列表
            numbered_list_match = re.match(r'^\d+\.\s+(.+)$', paragraph)
            bullet_list_match = re.match(r'^[\*\-]\s+(.+)$', paragraph)
            
            if numbered_list_match or bullet_list_match:
                # 確定列表類型
                current_list_type = "ol" if numbered_list_match else "ul"
                
                # 如果不在列表中或列表類型變化，處理之前的列表
                if not in_list or list_type != current_list_type:
                    if in_list:
                        # 結束之前的列表
                        html_content.append(f'<{list_type} class="content-list">')
                        html_content.extend(list_items)
                        html_content.append(f"</{list_type}>")
                    
                    # 開始新列表
                    list_items = []
                    list_type = current_list_type
                    in_list = True
                
                # 添加列表項
                item_text = numbered_list_match.group(1) if numbered_list_match else bullet_list_match.group(1)
                formatted_item = self._format_text(item_text)
                list_items.append(f'<li class="content-list-item">{formatted_item}</li>')
                continue
            
            # 不是列表項，如果之前在列表中，結束列表
            if in_list:
                html_content.append(f'<{list_type} class="content-list">')
                html_content.extend(list_items)
                html_content.append(f"</{list_type}>")
                in_list = False
                list_items = []
                list_type = None
            
            # 處理普通段落
            formatted_text = self._format_text(paragraph)
            
            # 檢測是否為引用段落
            if paragraph.startswith('"') and paragraph.endswith('"'):
                html_content.append(f'<blockquote class="content-quote"><p>{formatted_text}</p></blockquote>')
            elif self._is_definition_paragraph(paragraph):
                html_content.append(f'<div class="definition-paragraph"><p>{formatted_text}</p></div>')
            else:
                html_content.append(f'<p class="content-paragraph">{formatted_text}</p>')
        
        # 確保最後的列表被處理
        if in_list:
            html_content.append(f'<{list_type} class="content-list">')
            html_content.extend(list_items)
            html_content.append(f"</{list_type}>")
        
        return "".join(html_content)
    
    def _is_important_paragraph(self, paragraph):
        """
        判斷是否為重要段落
        
        Args:
            paragraph: 段落文本
            
        Returns:
            bool: 是否為重要段落
        """
        important_keywords = ["前言", "結語", "總結", "摘要", "重點", "注意", "提醒", "警告"]
        return any(keyword in paragraph[:10] for keyword in important_keywords)
    
    def _is_definition_paragraph(self, paragraph):
        """
        判斷是否為定義段落
        
        Args:
            paragraph: 段落文本
            
        Returns:
            bool: 是否為定義段落
        """
        definition_patterns = [
            r'^.+規定：',
            r'^.+定義為',
            r'^根據.+法.+條',
            r'^依據.+辦法'
        ]
        return any(re.match(pattern, paragraph) for pattern in definition_patterns)
    
    def _format_text(self, text):
        """
        格式化文本
        
        Args:
            text: 原始文本
            
        Returns:
            str: 格式化後的文本
        """
        # 處理粗體文字
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong class="content-strong">\1</strong>', text)
        text = re.sub(r'\*(.*?)\*', r'<em class="content-em">\1</em>', text)
        
        # 處理超連結
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" target="_blank" class="content-link">\1</a>', text)
        
        # 處理專有名詞高亮
        tax_terms = [
            "遺產稅", "贈與稅", "所得稅", "營業稅", "房屋稅", "地價稅", "印花稅",
            "保險法", "稅法", "會計法", "公司法"
        ]
        
        for term in tax_terms:
            if term in text:
                text = text.replace(term, f'<span class="tax-term">{term}</span>')
        
        return text
    
    def generate_html(self, article_info, category=None, tags=None, translator=None):
        """
        生成改進的 HTML 文件
        
        Args:
            article_info: 文章信息字典
            category: 文章分類
            tags: 文章標籤列表
            translator: 翻譯器實例
            
        Returns:
            tuple: (HTML 內容, 輸出文件路徑)
        """
        # 如果提供了翻譯器，使用改進的URL生成
        if translator:
            article_info["url"] = self._generate_meaningful_url(article_info, translator)
        
        # 生成 META 標籤
        meta_tags = self._generate_meta_tags(article_info, category, tags)
        
        # 生成 JSON-LD 結構化資料
        jsonld = self._generate_jsonld(article_info, category, tags)
        
        # 選擇圖片
        if "image" not in article_info or not article_info["image"]:
            image_path = self._select_random_image(category)
            article_info["image"] = image_path
        
        # 轉換內容為優化的 HTML
        html_content = self._convert_content_to_html(article_info["content"])
        
        # 構建文章標籤 HTML
        tags_html = ""
        if tags:
            tags_html = '<div class="article-tags">'
            for tag in tags:
                tags_html += f'<a class="article-tag" href="/blog.html?tag={tag["slug"]}">{tag["name"]}</a>\n          '
            tags_html += '</div>'
        
        # 構建完整 HTML（包含改進的CSS）
        html = self._build_complete_html(article_info, meta_tags, jsonld, html_content, tags_html)
        
        # 寫入 HTML 文件
        output_file = self.output_dir / f"{article_info['url']}.html"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        logger.info(f"生成改進版 HTML 文件: {output_file}")
        
        return html, output_file
    
    def _build_complete_html(self, article_info, meta_tags, jsonld, html_content, tags_html):
        """
        構建完整的 HTML 文檔
        """
        return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<meta content="{meta_tags['description']}" name="description"/>
<meta content="{meta_tags['keywords']}" name="keywords"/>
<meta content="{meta_tags['date']}" name="date"/>
<title>{meta_tags['title']} | 霍爾果斯會計師事務所</title>

<!-- 系列文章META標籤 -->
{self._generate_series_meta(meta_tags)}

<!-- hreflang 標籤 -->
<link href="https://www.horgoscpa.com/blog/{article_info['url']}" hreflang="zh-TW" rel="alternate"/>

<!-- Favicon -->
{self.templates.get("meta", {}).get("favicon", "")}

<!-- Material Symbols 圖示庫 -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

<!-- 引用全站共用樣式 -->
<link href="/assets/css/common.css" rel="stylesheet">
<link href="/assets/css/navbar.css" rel="stylesheet">
<link href="/assets/css/footer.css" rel="stylesheet">
<link href="/assets/css/index-style.css" rel="stylesheet"/>
<link href="/assets/css/mobile-navbar.css" rel="stylesheet"/>
<link href="/assets/css/blog-article-modern.css" rel="stylesheet"/>

<!-- 改進版文章樣式 -->
<style>
{self._generate_improved_css()}
</style>

<!-- Google 分析 -->
<script async="" src="https://www.googletagmanager.com/gtag/js?id=G-RKMCS9WVS5"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-RKMCS9WVS5');
</script>

<!-- 結構化資料 -->
<script type="application/ld+json">
{jsonld}
</script>
</head>

<body>
<!-- 導航欄 -->
{self.templates.get("navbar", "")}

<!-- 移動版導航欄 -->
{self.templates.get("mobile_nav", "")}

<!-- 文章內容主體區塊 -->
<section class="article-content-section">
<div class="article-container">
<!-- 文章卡片 -->
<article class="article-card enhanced-article">

<!-- 文章元數據 -->
<div class="article-meta">
<div class="article-date">
<span class="material-symbols-rounded">calendar_month</span>
{article_info['date']}
</div>
<a class="article-category" href="/blog.html?category={meta_tags.get('main_category_code', 'tax')}">
<span class="material-symbols-rounded">sell</span>
{meta_tags.get('main_category', '稅務相關')}
</a>
</div>

<!-- 系列信息（如果是系列文章） -->
{self._generate_series_info_html(article_info)}

<!-- 文章標題區 -->
<div class="article-header-main">
<h1 class="article-title enhanced-title">{meta_tags['title']}</h1>
</div>

<!-- 文章內容主體 -->
<div class="article-body enhanced-content">
{html_content}
</div>

<!-- 文章標籤 -->
<div class="article-footer">
{tags_html}
</div>

</article>

<!-- 文章導航 -->
<div class="article-navigation">
<a class="prev-article disabled" href="#" id="prev-article">
<span class="material-symbols-rounded">navigate_before</span>
<span class="nav-title">載入中...</span>
<span class="nav-message"></span>
</a>
<a class="back-to-blog" href="/blog.html">
<span class="material-symbols-rounded">view_list</span>
返回文章列表
</a>
<a class="next-article disabled" href="#" id="next-article">
<span class="material-symbols-rounded">navigate_next</span>
<span class="nav-title">載入中...</span>
<span class="nav-message"></span>
</a>
</div>

</div>
</section>

<!-- 頁尾區域 -->
{self.templates.get("footer", "")}

<!-- JavaScript -->
{self.templates.get("scripts", {}).get("basic", "")}
<script src="/assets/js/navbar.js"></script>
<script src="/assets/js/mobile-navbar.js"></script>
<script src="/assets/js/article-navigation.js"></script>
{self.templates.get("scripts", {}).get("progress_indicator", "")}

</body>
</html>"""
    
    def _generate_series_meta(self, meta_tags):
        """生成系列文章META標籤"""
        if not meta_tags.get('series_name'):
            return ""
        
        return f"""<meta content="{meta_tags.get('series_name', '')}" name="series-name"/>
<meta content="{meta_tags.get('series_episode', '')}" name="series-episode"/>
<meta content="{meta_tags.get('series_slug', '')}" name="series-slug"/>"""
    
    def _generate_series_info_html(self, article_info):
        """生成系列信息HTML"""
        if not article_info.get("is_series", False):
            return ""
        
        return f"""<div class="series-info">
<span class="series-badge">系列文章</span>
<span class="series-name">{article_info.get('series_name', '')}</span>
<span class="series-episode">第 {article_info.get('episode', 1)} 集</span>
</div>"""
    
    def _generate_improved_css(self):
        """生成改進版CSS樣式"""
        return """
/* 改進版文章樣式 */
.enhanced-article {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.8;
    color: #2c3e50;
}

.enhanced-title {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.enhanced-content {
    font-size: 1.1rem;
    max-width: none;
}

/* 標題樣式改進 */
.content-heading {
    margin-top: 2.5rem;
    margin-bottom: 1.2rem;
    font-weight: 600;
    color: #2c3e50;
    border-left: 4px solid #3498db;
    padding-left: 1rem;
}

.content-h1 { font-size: 1.8rem; }
.content-h2 { font-size: 1.6rem; }
.content-h3 { font-size: 1.4rem; }
.content-h4 { font-size: 1.2rem; }

/* 段落樣式改進 */
.content-paragraph {
    margin-bottom: 1.5rem;
    text-align: justify;
    text-justify: inter-ideograph;
}

.important-paragraph {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
    padding: 1.5rem;
    margin: 2rem 0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(240, 147, 251, 0.3);
}

.important-paragraph p {
    color: white;
    font-weight: 500;
    margin: 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.definition-paragraph {
    background: #f8f9ff;
    border-left: 4px solid #667eea;
    padding: 1.2rem;
    margin: 1.5rem 0;
    border-radius: 0 8px 8px 0;
}

/* 列表樣式改進 */
.content-list {
    margin: 1.5rem 0;
    padding-left: 2rem;
}

.content-list-item {
    margin-bottom: 0.8rem;
    line-height: 1.6;
}

.content-list-item::marker {
    color: #3498db;
    font-weight: bold;
}

/* 引用樣式 */
.content-quote {
    background: #f7f9fc;
    border-left: 4px solid #3498db;
    margin: 2rem 0;
    padding: 1.5rem 2rem;
    font-style: italic;
    border-radius: 0 8px 8px 0;
    position: relative;
}

.content-quote::before {
    content: '"';
    font-size: 4rem;
    color: #3498db;
    position: absolute;
    top: -10px;
    left: 20px;
    opacity: 0.3;
}

/* 文本格式化 */
.content-strong {
    font-weight: 700;
    color: #e74c3c;
}

.content-em {
    font-style: italic;
    color: #8e44ad;
}

.content-link {
    color: #3498db;
    text-decoration: none;
    border-bottom: 1px dotted #3498db;
    transition: all 0.3s ease;
}

.content-link:hover {
    color: #2980b9;
    border-bottom-style: solid;
}

.tax-term {
    background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    color: #2c3e50;
}

/* 系列信息樣式 */
.series-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
}

.series-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
}

.series-name {
    font-weight: 600;
    flex-grow: 1;
}

.series-episode {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
    .enhanced-title {
        font-size: 1.8rem;
    }
    
    .enhanced-content {
        font-size: 1rem;
    }
    
    .content-heading {
        margin-top: 2rem;
        padding-left: 0.8rem;
    }
    
    .important-paragraph,
    .definition-paragraph,
    .content-quote {
        margin: 1.5rem -1rem;
        border-radius: 0;
    }
    
    .series-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
}

/* 打印樣式 */
@media print {
    .enhanced-article {
        font-size: 12pt;
        line-height: 1.5;
    }
    
    .important-paragraph,
    .definition-paragraph {
        background: #f5f5f5 !important;
        color: #000 !important;
    }
    
    .tax-term {
        background: #e0e0e0 !important;
        color: #000 !important;
    }
}
"""
    
    # 其他方法保持與原版相同，但添加一些輔助方法
    def _generate_meta_tags(self, article_info, category=None, tags=None):
        """生成 META 標籤（與原版相同但增加改進）"""
        # 原有的 META 標籤生成邏輯
        summary = article_info.get("summary", "")
        if not summary and "content" in article_info and len(article_info["content"]) > 0:
            summary = article_info["content"][0]
            if len(article_info["content"]) > 1:
                summary += " " + article_info["content"][1]
            summary = summary[:200] + "..." if len(summary) > 200 else summary
        
        keywords = ""
        if "keywords" in article_info and article_info["keywords"]:
            keywords = article_info["keywords"].get("zh", "")
        else:
            keywords = ", ".join([tag["name"] for tag in tags]) if tags else ""
        
        meta_tags = {
            "title": article_info["title"],
            "description": summary,
            "keywords": keywords,
            "original_filename": article_info["original_filename"],
            "date": article_info.get("date", "")
        }
        
        if "keywords" in article_info and article_info["keywords"] and "en" in article_info["keywords"]:
            meta_tags["keywords_en"] = article_info["keywords"]["en"]
        
        if category:
            meta_tags["main_category"] = category["name"]
            meta_tags["main_category_code"] = category["slug"]
        
        if article_info.get("is_series", False):
            meta_tags["series_name"] = article_info["series_name"]
            meta_tags["series_episode"] = article_info["episode"]
            if "series_slug" in article_info:
                meta_tags["series_slug"] = article_info["series_slug"]
        
        return meta_tags
    
    def _generate_jsonld(self, article_info, category=None, tags=None, base_url="https://www.horgoscpa.com"):
        """生成 JSON-LD 結構化資料（與原版類似）"""
        # 原有的 JSON-LD 生成邏輯...
        image_url = article_info.get("image", f"{base_url}/assets/images/blog/tax_1.jpg")
        if not image_url.startswith("http"):
            image_url = f"{base_url}{image_url}"
        
        summary = article_info.get("summary", "")
        if not summary and "content" in article_info and len(article_info["content"]) > 0:
            summary = article_info["content"][0][:200] + "..."
        
        keywords = ""
        if "keywords" in article_info and article_info["keywords"]:
            keywords = article_info["keywords"].get("zh", "")
        elif tags:
            keywords = ", ".join([tag["name"] for tag in tags])
        
        jsonld = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article_info["title"],
            "description": summary,
            "image": image_url,
            "datePublished": article_info["date"],
            "dateModified": article_info["date"],
            "author": {
                "@type": "Person",
                "name": "霍爾果斯會計師事務所",
                "url": f"{base_url}/team.html"
            },
            "publisher": {
                "@type": "Organization",
                "name": "霍爾果斯會計師事務所",
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{base_url}/assets/images/logo.png"
                }
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": f"{base_url}/blog/{article_info['url']}.html"
            },
            "keywords": keywords,
            "inLanguage": "zh-TW"
        }
        
        if article_info.get("is_series", False):
            jsonld["isPartOf"] = {
                "@type": "Series",
                "name": article_info["series_name"],
                "position": article_info["episode"]
            }
        
        if category:
            jsonld["articleSection"] = category["name"]
        
        return json.dumps(jsonld, ensure_ascii=False, indent=2)
    
    def _select_random_image(self, category=None):
        """隨機選擇圖片（與原版相同）"""
        all_images = list(self.images_dir.glob("**/*.jpg")) + list(self.images_dir.glob("**/*.png"))
        
        if not all_images:
            return "/assets/images/blog/default.jpg"
        
        if category:
            category_images = []
            category_slug = category.get("slug", "")
            category_dir = self.images_dir / category_slug
            if category_dir.exists():
                category_images.extend(list(category_dir.glob("*.jpg")))
                category_images.extend(list(category_dir.glob("*.png")))
            
            if not category_images:
                category_images = [img for img in all_images if category_slug in str(img)]
            
            if category_images:
                selected_image = random.choice(category_images)
                return f"/assets/images/blog/{selected_image.relative_to(self.images_dir)}"
        
        selected_image = random.choice(all_images)
        return f"/assets/images/blog/{selected_image.relative_to(self.images_dir)}"