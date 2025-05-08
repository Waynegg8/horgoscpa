#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
HTML 生成模組
負責將處理後的文檔內容轉換為 HTML 部落格文章
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

class HtmlGenerator:
    """HTML 生成類"""
    
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
    
    def _generate_meta_tags(self, article_info, category=None, tags=None):
        """
        生成 META 標籤
        
        Args:
            article_info: 文章信息字典
            category: 文章分類
            tags: 文章標籤列表
            
        Returns:
            dict: META 標籤字典
        """
        # 提取摘要（使用前兩段內容）
        summary = article_info.get("summary", "")
        if not summary and "content" in article_info and len(article_info["content"]) > 0:
            summary = article_info["content"][0]
            if len(article_info["content"]) > 1:
                summary += " " + article_info["content"][1]
            summary = summary[:200] + "..." if len(summary) > 200 else summary
        
        # 處理關鍵詞
        keywords = ""
        if "keywords" in article_info and article_info["keywords"]:
            # 使用文章中已處理的多語言關鍵詞
            keywords = article_info["keywords"].get("zh", "")
        else:
            # 如果沒有預處理的關鍵詞，則從標籤生成
            keywords = ", ".join([tag["name"] for tag in tags]) if tags else ""
        
        # 生成 META 標籤
        meta_tags = {
            "title": article_info["title"],
            "description": summary,
            "keywords": keywords,
            "original_filename": article_info["original_filename"],
            "date": article_info.get("date", "")  # 添加日期到META標籤
        }
        
        # 添加英文關鍵詞（如果有）
        if "keywords" in article_info and article_info["keywords"] and "en" in article_info["keywords"]:
            meta_tags["keywords_en"] = article_info["keywords"]["en"]
        
        # 添加分類信息
        if category:
            meta_tags["main_category"] = category["name"]
            meta_tags["main_category_code"] = category["slug"]
        
        # 添加系列文章信息
        if article_info.get("is_series", False):
            meta_tags["series_name"] = article_info["series_name"]
            meta_tags["series_episode"] = article_info["episode"]
            # 添加系列標識
            if "series_slug" in article_info:
                meta_tags["series_slug"] = article_info["series_slug"]
        
        return meta_tags
    
    def _generate_jsonld(self, article_info, category=None, tags=None, base_url="https://www.horgoscpa.com"):
        """
        生成 JSON-LD 結構化資料
        
        Args:
            article_info: 文章信息字典
            category: 文章分類
            tags: 文章標籤列表
            base_url: 網站基本 URL
            
        Returns:
            str: JSON-LD 結構化資料
        """
        # 選擇圖片路徑
        image_url = article_info.get("image", f"{base_url}/assets/images/blog/tax_1.jpg")
        if not image_url.startswith("http"):
            image_url = f"{base_url}{image_url}"
        
        # 提取摘要
        summary = article_info.get("summary", "")
        if not summary and "content" in article_info and len(article_info["content"]) > 0:
            summary = article_info["content"][0]
            if len(article_info["content"]) > 1:
                summary += " " + article_info["content"][1]
            summary = summary[:200] + "..." if len(summary) > 200 else summary
        
        # 生成關鍵詞
        keywords = ""
        if "keywords" in article_info and article_info["keywords"]:
            keywords = article_info["keywords"].get("zh", "")
        elif tags:
            keywords = ", ".join([tag["name"] for tag in tags])
        else:
            keywords = "稅務, 會計, 財務規劃"
        
        # 基本結構
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
        
        # 添加系列文章信息
        if article_info.get("is_series", False):
            jsonld["isPartOf"] = {
                "@type": "Series",
                "name": article_info["series_name"],
                "position": article_info["episode"],
                "originalFilename": article_info["original_filename"]
            }
        
        # 添加分類信息
        if category:
            jsonld["articleSection"] = category["name"]
        
        return json.dumps(jsonld, ensure_ascii=False, indent=2)
    
    def _select_random_image(self, category=None):
        """
        從圖片目錄中隨機選擇一張圖片
        
        Args:
            category: 文章分類，用於優先選擇相關圖片
            
        Returns:
            str: 圖片相對路徑
        """
        # 獲取所有圖片
        all_images = list(self.images_dir.glob("**/*.jpg")) + list(self.images_dir.glob("**/*.png"))
        
        if not all_images:
            # 如果沒有圖片，返回預設圖片路徑
            return "/assets/images/blog/default.jpg"
        
        # 如果有分類，優先選擇分類相關圖片
        if category:
            category_images = []
            category_slug = category.get("slug", "")
            
            # 檢查分類目錄中的圖片
            category_dir = self.images_dir / category_slug
            if category_dir.exists():
                category_images.extend(list(category_dir.glob("*.jpg")))
                category_images.extend(list(category_dir.glob("*.png")))
            
            # 如果沒有找到分類目錄，使用文件名匹配
            if not category_images:
                category_images = [img for img in all_images if category_slug in str(img)]
            
            # 如果找到了分類相關圖片，從中隨機選擇
            if category_images:
                selected_image = random.choice(category_images)
                return f"/assets/images/blog/{selected_image.relative_to(self.images_dir)}"
        
        # 隨機選擇一張圖片
        selected_image = random.choice(all_images)
        return f"/assets/images/blog/{selected_image.relative_to(self.images_dir)}"
    
    def _convert_content_to_html(self, content):
        """
        將內容轉換為 HTML
        
        Args:
            content: 內容列表（段落）
            
        Returns:
            str: HTML 內容
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
            
            # 檢測標題
            if paragraph.startswith("# "):
                html_content.append(f"<h1>{paragraph[2:].strip()}</h1>")
                continue
            elif paragraph.startswith("## "):
                html_content.append(f"<h2>{paragraph[3:].strip()}</h2>")
                continue
            elif paragraph.startswith("### "):
                html_content.append(f"<h3>{paragraph[4:].strip()}</h3>")
                continue
            elif paragraph.startswith("#### "):
                html_content.append(f"<h4>{paragraph[5:].strip()}</h4>")
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
                        html_content.append(f"</{list_type}>")
                    
                    # 開始新列表
                    list_items = []
                    list_type = current_list_type
                    in_list = True
                
                # 添加列表項
                item_text = numbered_list_match.group(1) if numbered_list_match else bullet_list_match.group(1)
                list_items.append(f"<li>{item_text}</li>")
                continue
            
            # 不是列表項，如果之前在列表中，結束列表
            if in_list:
                html_content.append(f"<{list_type}>")
                html_content.extend(list_items)
                html_content.append(f"</{list_type}>")
                in_list = False
                list_items = []
                list_type = None
            
            # 處理普通段落
            # 替換 Markdown 格式的強調
            paragraph = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', paragraph)
            paragraph = re.sub(r'\*(.*?)\*', r'<em>\1</em>', paragraph)
            
            # 處理超連結
            paragraph = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" target="_blank">\1</a>', paragraph)
            
            html_content.append(f"<p>{paragraph}</p>")
        
        # 確保最後的列表被處理
        if in_list:
            html_content.append(f"<{list_type}>")
            html_content.extend(list_items)
            html_content.append(f"</{list_type}>")
        
        return "".join(html_content)
    
    def generate_html(self, article_info, category=None, tags=None):
        """
        生成 HTML 文件
        
        Args:
            article_info: 文章信息字典
            category: 文章分類
            tags: 文章標籤列表
            
        Returns:
            tuple: (HTML 內容, 輸出文件路徑)
        """
        # 生成 META 標籤
        meta_tags = self._generate_meta_tags(article_info, category, tags)
        
        # 生成 JSON-LD 結構化資料
        jsonld = self._generate_jsonld(article_info, category, tags)
        
        # 選擇圖片（如果文章沒有指定圖片）
        if "image" not in article_info or not article_info["image"]:
            image_path = self._select_random_image(category)
            article_info["image"] = image_path
        else:
            image_path = article_info["image"]
        
        # 轉換內容為 HTML
        html_content = self._convert_content_to_html(article_info["content"])
        
        # 構建文章標籤 HTML
        tags_html = ""
        if tags:
            tags_html = '<div class="article-tags">'
            for tag in tags:
                tags_html += f'<a class="article-tag" href="/blog.html?tag={tag["slug"]}">{tag["name"]}</a>\n          '
            tags_html += '</div>'
        
        # 構建完整 HTML
        html = f"""<!DOCTYPE html>

<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<meta content="{meta_tags['description']}" name="description"/>
<meta content="{meta_tags['keywords']}" name="keywords"/>
<meta content="{meta_tags['date']}" name="date"/>
"""

        # 添加英文關鍵詞（如果有）
        if "keywords_en" in meta_tags and meta_tags["keywords_en"]:
            html += f'<meta content="{meta_tags["keywords_en"]}" name="keywords:en"/>\n'

        html += f"""<title>{meta_tags['title']} | 霍爾果斯會計師事務所</title>
<meta content="{meta_tags.get('series_name', '')}" name="series-name"/>
<meta content="{meta_tags.get('series_episode', '')}" name="series-episode"/>
<meta content="{meta_tags.get('series_slug', '')}" name="series-slug"/>
<meta content="{meta_tags['original_filename']}" name="original-filename"/>
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
<!-- 新增: 首頁特定樣式 - 用於流動式設計 -->
<link href="/assets/css/index-style.css" rel="stylesheet"/>
<!-- 移動版導航欄樣式 -->
<link href="/assets/css/mobile-navbar.css" rel="stylesheet"/>
<!-- 文章內頁專用現代化樣式 -->
<link href="/assets/css/blog-article-modern.css" rel="stylesheet"/>
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
</link></link></link></link><meta content="{meta_tags.get('main_category', '')}" name="main-category"/><meta content="{meta_tags.get('main_category_code', '')}" name="main-category-code"/><meta content="{meta_tags.get('series_name', '')}" name="series-name"/><meta content="{meta_tags.get('series_episode', '')}" name="series-episode"/><meta content="{meta_tags['original_filename']}" name="original-filename"/></head>
<body>
<!-- 導航欄 -->
{self.templates.get("navbar", "")}

<!-- 移動版導航欄 -->
{self.templates.get("mobile_nav", "")}

<!-- 文章內容主體區塊 -->
<section class="article-content-section">
<div class="article-container">
<!-- 文章卡片 -->
<article class="article-card">
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
<!-- 文章標題區 -->
<div class="article-header-main">
<h1 class="article-title">{meta_tags['title']}</h1>
</div>
<!-- 文章內容主體 -->
<div class="article-body">
{html_content}
</div>
<!-- 文章標籤 -->
<div class="article-footer">
{tags_html}
</div>
</article>
<!-- 文章導航 - 包含上一篇/下一篇和返回部落格 -->
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

<!-- 返回頂部按鈕功能 -->
{self.templates.get("scripts", {}).get("basic", "")}
<!-- 導航欄功能腳本 -->
<script src="/assets/js/navbar.js"></script>
<!-- 移動版導航欄功能腳本 -->
<script src="/assets/js/mobile-navbar.js"></script>
<!-- 文章導航腳本 -->
<script src="/assets/js/article-navigation.js"></script>
<!-- 文章閱讀進度指示器 -->
{self.templates.get("scripts", {}).get("progress_indicator", "")}
</body>
</html>"""
        
        # 寫入 HTML 文件
        output_file = self.output_dir / f"{article_info['url']}.html"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        logger.info(f"生成 HTML 文件: {output_file}")
        
        return html, output_file
    
    def clean_html(self, html_content):
        """
        清理 HTML 內容
        
        Args:
            html_content: HTML 內容
            
        Returns:
            str: 清理後的 HTML 內容
        """
        # 使用 BeautifulSoup 清理 HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 移除空段落
        for p in soup.find_all('p'):
            if not p.text.strip():
                p.decompose()
        
        # 確保標題層級正確
        for i, h in enumerate(soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])):
            h_tag = h.name
            h_level = int(h_tag[1])
            h_text = h.get_text().strip()
            
            # 移除標題中的 Markdown 標記
            if h_text.startswith('#'):
                h_text = re.sub(r'^#+\s*', '', h_text)
                h.string = h_text
        
        # 其他清理操作...
        
        return str(soup)