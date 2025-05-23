#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sitemap 自動生成工具
這個腳本會掃描網站的HTML文件並生成符合標準的sitemap.xml
支援優先級和更新頻率設定，並依據更新日期排序
新增：支援影片Sitemap，方便Google索引影片內容
"""

import os
import re
import datetime
import sys
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging
from urllib.parse import quote
from bs4 import BeautifulSoup

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("sitemap_generator")

# 獲取專案根目錄（假設腳本在 .github/scripts 目錄下）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 網站配置
SITE_URL = "https://www.horgoscpa.com"
SITEMAP_PATH = os.path.join(PROJECT_ROOT, "sitemap.xml")
VIDEO_SITEMAP_PATH = os.path.join(PROJECT_ROOT, "video-sitemap.xml")
SITEMAP_INDEX_PATH = os.path.join(PROJECT_ROOT, "sitemap_index.xml")
VIDEOS_JSON_PATH = os.path.join(PROJECT_ROOT, "assets", "data", "videos.json")

# 掃描目錄配置
SCAN_DIRS = {
    # 目錄路徑: (更新頻率, 優先級)
    # 更新頻率: always, hourly, daily, weekly, monthly, yearly, never
    # 優先級: 0.0 到 1.0，1.0 為最高
    "": ("weekly", 0.5),  # 根目錄
    "blog": ("weekly", 0.8),  # 部落格目錄
    "services": ("monthly", 0.9),  # 服務頁面
    "team.html": ("monthly", 0.7),  # 團隊頁面
    "contact.html": ("monthly", 0.7),  # 聯繫頁面
    "faq.html": ("monthly", 0.6),  # FAQ頁面
    "video.html": ("weekly", 0.8),  # 影片頁面
}

# 指定特殊文件的優先級
PRIORITY_OVERRIDE = {
    "index.html": 1.0,  # 首頁最高優先級
    "services.html": 0.9,
    "booking.html": 0.9,
}

# 排除的文件和目錄
EXCLUDE_PATTERNS = [
    r".*404\.html$",
    r".*error\.html$",
    r".*test\.html$",
    r".*draft.*\.html$",
    r".*/assets/.*",
    r".*/node_modules/.*",
    r".*\.git/.*",
    r".*\.github/.*",
    r".*sitemap.*\.xml$",
]

def get_page_update_date(file_path: str) -> str:
    """
    嘗試從文件內容或文件屬性獲取更新日期
    優先從HTML meta標籤獲取，然後從文件名提取，最後使用文件修改時間
    :param file_path: HTML文件路徑
    :return: YYYY-MM-DD格式的日期字符串
    """
    # 默認使用當前日期
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    try:
        # 1. 嘗試從文件名提取日期（例如 2025-02-03-article.html）
        file_name = os.path.basename(file_path)
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', file_name)
        if date_match:
            return date_match.group(1)

        # 2. 嘗試從HTML內容提取日期
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # 使用BeautifulSoup解析HTML
            soup = BeautifulSoup(content, 'html.parser')
            
            # 嘗試從meta標籤提取
            meta_date = soup.find('meta', {'property': 'article:modified_time'})
            if meta_date and meta_date.get('content'):
                date_str = meta_date.get('content')
                # 如果是完整的ISO格式，只取日期部分
                if 'T' in date_str:
                    return date_str.split('T')[0]
                return date_str

            # 嘗試從結構化數據提取
            script_tags = soup.find_all('script', {'type': 'application/ld+json'})
            for script in script_tags:
                try:
                    import json
                    data = json.loads(script.string)
                    if data.get('dateModified'):
                        date_str = data['dateModified']
                        if 'T' in date_str:
                            return date_str.split('T')[0]
                        return date_str
                except:
                    pass
                    
            # 嘗試從文章日期元素提取
            date_element = soup.select_one('.article-date')
            if date_element:
                date_text = date_element.get_text().strip()
                date_match = re.search(r'\d{4}-\d{2}-\d{2}', date_text)
                if date_match:
                    return date_match.group(0)

        # 3. 使用文件修改時間
        stat = os.stat(file_path)
        last_modified = datetime.datetime.fromtimestamp(stat.st_mtime)
        return last_modified.strftime("%Y-%m-%d")

    except Exception as e:
        logger.warning(f"無法獲取 {file_path} 的更新日期: {str(e)}")
        return today

def is_excluded(file_path: str) -> bool:
    """
    檢查文件是否應該被排除
    :param file_path: 文件路徑
    :return: 是否排除
    """
    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, file_path):
            return True
    return False

def get_html_files() -> List[Dict[str, Any]]:
    """
    掃描網站目錄，獲取所有HTML文件信息
    :return: HTML文件信息列表
    """
    html_files = []
    
    # 掃描指定目錄
    for dir_path in SCAN_DIRS.keys():
        full_dir_path = os.path.join(PROJECT_ROOT, dir_path)
        
        # 檢查是否是單個文件
        if dir_path.endswith('.html'):
            file_path = full_dir_path
            if os.path.exists(file_path) and not is_excluded(file_path):
                rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                lastmod = get_page_update_date(file_path)
                
                # 獲取配置的更新頻率和優先級
                changefreq, priority = SCAN_DIRS.get(dir_path, ("monthly", 0.5))
                
                # 檢查是否有優先級覆蓋
                if os.path.basename(file_path) in PRIORITY_OVERRIDE:
                    priority = PRIORITY_OVERRIDE[os.path.basename(file_path)]
                
                # 構建URL（移除index.html）
                url_path = rel_path.replace('\\', '/')
                if url_path == "index.html":
                    url_path = ""
                
                html_files.append({
                    "loc": f"{SITE_URL}/{url_path}",
                    "lastmod": lastmod,
                    "changefreq": changefreq,
                    "priority": priority
                })
            continue
            
        # 如果是目錄
        if not os.path.exists(full_dir_path):
            logger.warning(f"目錄 {full_dir_path} 不存在，跳過")
            continue
            
        if os.path.isfile(full_dir_path):
            continue
        
        # 獲取配置的更新頻率和優先級
        dir_changefreq, dir_priority = SCAN_DIRS.get(dir_path, ("monthly", 0.5))
        
        # 遍歷目錄下的所有文件
        for root, dirs, files in os.walk(full_dir_path):
            for file in files:
                if not file.endswith('.html'):
                    continue
                    
                file_path = os.path.join(root, file)
                if is_excluded(file_path):
                    continue
                    
                rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                lastmod = get_page_update_date(file_path)
                
                # 獲取配置的優先級
                priority = dir_priority
                
                # 檢查是否有優先級覆蓋
                if file in PRIORITY_OVERRIDE:
                    priority = PRIORITY_OVERRIDE[file]
                
                # 構建URL（移除index.html）
                url_path = rel_path.replace('\\', '/')
                if url_path.endswith('index.html'):
                    url_path = url_path[:-10]
                
                # URL中的非ASCII字符和特殊字符需要編碼
                url_parts = url_path.split('/')
                url_path = '/'.join(quote(part) for part in url_parts)
                
                html_files.append({
                    "loc": f"{SITE_URL}/{url_path}",
                    "lastmod": lastmod,
                    "changefreq": dir_changefreq,
                    "priority": priority
                })
    
    # 按更新日期排序
    html_files.sort(key=lambda x: x["lastmod"], reverse=True)
    
    return html_files

def get_video_data() -> List[Dict[str, Any]]:
    """
    從videos.json讀取影片資料
    :return: 影片資料列表
    """
    if not os.path.exists(VIDEOS_JSON_PATH):
        logger.warning(f"找不到影片資料: {VIDEOS_JSON_PATH}")
        return []
    
    try:
        with open(VIDEOS_JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        videos = data.get('videos', [])
        logger.info(f"找到 {len(videos)} 部影片")
        return videos
    except Exception as e:
        logger.error(f"載入影片資料時出錯: {str(e)}")
        return []

def format_iso_date(date_str: str) -> str:
    """
    將日期格式化為ISO 8601格式
    :param date_str: YYYY-MM-DD格式的日期
    :return: YYYY-MM-DDT00:00:00+08:00格式的日期
    """
    try:
        date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        return date_obj.strftime("%Y-%m-%dT00:00:00+08:00")
    except:
        # 返回當前日期
        now = datetime.datetime.now()
        return now.strftime("%Y-%m-%dT00:00:00+08:00")

def generate_video_sitemap(videos: List[Dict[str, Any]]) -> str:
    """
    生成影片sitemap.xml內容
    :param videos: 影片資料列表
    :return: video-sitemap.xml內容
    """
    if not videos:
        return ""
    
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
    ]
    
    # 影片頁面基本URL
    video_page_url = f"{SITE_URL}/video.html"
    
    for video in videos:
        if not video.get('title') or not video.get('embedUrl'):
            continue
        
        # 提取必要資料
        title = video.get('title')
        description = video.get('description', '')
        upload_date = format_iso_date(video.get('date', datetime.datetime.now().strftime("%Y-%m-%d")))
        
        # 獲取影片ID
        video_id = video.get('videoId', '')
        if not video_id and 'embedUrl' in video:
            # 嘗試從embedUrl提取
            embed_url = video.get('embedUrl', '')
            match = re.search(r'youtube\.com/embed/([^/?&]+)', embed_url)
            if match:
                video_id = match.group(1)
        
        # 生成縮圖URL
        thumbnail_url = video.get('thumbnailUrl', '')
        if not thumbnail_url and video_id:
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        
        # 生成內容URL（YouTube原始URL）
        content_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else video.get('embedUrl', '')
        
        # 根據影片ID生成獨立頁面URL
        page_url = f"{video_page_url}?video={video_id}" if video_id else video_page_url
        
        # 添加影片URL
        lines.append('  <url>')
        lines.append(f'    <loc>{page_url}</loc>')
        lines.append('    <video:video>')
        lines.append(f'      <video:thumbnail_loc>{thumbnail_url}</video:thumbnail_loc>')
        lines.append(f'      <video:title>{title}</video:title>')
        lines.append(f'      <video:description>{description}</video:description>')
        lines.append(f'      <video:content_loc>{content_url}</video:content_loc>')
        lines.append(f'      <video:player_loc allow_embed="yes">{video.get("embedUrl", "")}</video:player_loc>')
        lines.append(f'      <video:publication_date>{upload_date}</video:publication_date>')
        
        # 添加分類和標籤
        if video.get('category'):
            lines.append(f'      <video:category>{video.get("category")}</video:category>')
        
        if video.get('tags'):
            tags = video.get('tags', [])
            for tag in tags[:10]:  # 最多10個標籤
                lines.append(f'      <video:tag>{tag}</video:tag>')
        
        # 影片設置
        lines.append('      <video:family_friendly>yes</video:family_friendly>')
        lines.append('      <video:requires_subscription>no</video:requires_subscription>')
        lines.append('      <video:live>no</video:live>')
        
        lines.append('    </video:video>')
        lines.append('  </url>')
    
    lines.append('</urlset>')
    
    return '\n'.join(lines)

def generate_sitemap(files: List[Dict[str, Any]]) -> str:
    """
    生成sitemap.xml內容
    :param files: HTML文件信息列表
    :return: sitemap.xml內容
    """
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    for file in files:
        lines.append('  <url>')
        lines.append(f'    <loc>{file["loc"]}</loc>')
        lines.append(f'    <lastmod>{file["lastmod"]}</lastmod>')
        lines.append(f'    <changefreq>{file["changefreq"]}</changefreq>')
        lines.append(f'    <priority>{file["priority"]}</priority>')
        lines.append('  </url>')
    
    lines.append('</urlset>')
    
    return '\n'.join(lines)

def generate_sitemap_index() -> str:
    """
    生成sitemap_index.xml內容
    :return: sitemap_index.xml內容
    """
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <sitemap>',
        f'    <loc>{SITE_URL}/sitemap.xml</loc>',
        f'    <lastmod>{today}</lastmod>',
        '  </sitemap>'
    ]
    
    # 如果存在影片Sitemap，添加到索引中
    if os.path.exists(VIDEO_SITEMAP_PATH):
        lines.extend([
            '  <sitemap>',
            f'    <loc>{SITE_URL}/video-sitemap.xml</loc>',
            f'    <lastmod>{today}</lastmod>',
            '  </sitemap>'
        ])
    
    lines.append('</sitemapindex>')
    
    return '\n'.join(lines)

def main():
    """主函數"""
    logger.info("開始生成 Sitemap")
    
    # 獲取HTML文件信息
    html_files = get_html_files()
    logger.info(f"找到 {len(html_files)} 個HTML文件")
    
    # 生成sitemap.xml
    sitemap_content = generate_sitemap(html_files)
    with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
        f.write(sitemap_content)
    logger.info(f"已生成 sitemap.xml: {SITEMAP_PATH}")
    
    # 獲取影片資料並生成影片Sitemap
    videos = get_video_data()
    if videos:
        logger.info(f"找到 {len(videos)} 部影片資料，開始生成影片Sitemap")
        video_sitemap_content = generate_video_sitemap(videos)
        with open(VIDEO_SITEMAP_PATH, 'w', encoding='utf-8') as f:
            f.write(video_sitemap_content)
        logger.info(f"已生成 video-sitemap.xml: {VIDEO_SITEMAP_PATH}")
    else:
        logger.warning("沒有找到影片資料，跳過生成影片Sitemap")
    
    # 生成sitemap_index.xml
    sitemap_index_content = generate_sitemap_index()
    with open(SITEMAP_INDEX_PATH, 'w', encoding='utf-8') as f:
        f.write(sitemap_index_content)
    logger.info(f"已生成 sitemap_index.xml: {SITEMAP_INDEX_PATH}")
    
    logger.info("Sitemap 生成完成")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())