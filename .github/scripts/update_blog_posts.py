```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
自動更新部落格文章 JSON 檔案 (進階版，支持系列文章與排程發布)
這個腳本會掃描指定的部落格文章目錄，提取文章資訊，
並更新 blog-posts.json 檔案，支援標籤、分類、系列文章和發布排程。
"""

import os
import sys
import json
import re
import datetime
import base64
import requests
import jieba
import math
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
from collections import Counter, defaultdict
from bs4 import BeautifulSoup

# 引入 utils 模組
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_translation_dict, setup_jieba_dict, extract_series_info, slugify

# 獲取專案根目錄（假設腳本在 .github/scripts 目錄下）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# GitHub 設定
GITHUB_TOKEN = os.environ.get('GH_PAT')
GITHUB_REPO = "waynegg8/horgoscpa"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}"

# 部落格文章路徑設定（使用絕對路徑）
BLOG_DIR = os.path.join(PROJECT_ROOT, "blog")  # 博客文章目錄
JSON_PATH = os.path.join(PROJECT_ROOT, "assets/data/blog-posts.json")  # 完整文章JSON文件路徑
LATEST_POSTS_PATH = os.path.join(PROJECT_ROOT, "assets/data/latest-posts.json")  # 最新文章JSON文件路徑
ITEMS_PER_PAGE = 6  # 每頁顯示的文章數量

# 文章標題和日期的正則表達式（更新為更精確的匹配）
TITLE_REGEX = r"<h1 class=\"article-title\">(.*?)<\/h1>"
DATE_REGEX = r'<div class="article-date">[\s\S]*?(\d{4}-\d{2}-\d{2})[\s\S]*?<\/div>'
SUMMARY_REGEX = r'<meta name="description" content="(.*?)"'
IMAGE_REGEX = r'image": "https://www\.horgoscpa\.com(.*?)"'
CATEGORY_REGEX = r'<a href="/blog\.html\?category=(.*?)" class="article-category">'

# 標籤提取正則表達式
TAG_SECTION_REGEX = r'<div class="article-tags">[\s\S]*?<\/div>'
TAG_REGEX = r'<a href="/blog\.html\?tag=.*?" class="article-tag">(.*?)<\/a>'

# 文章分類映射
CATEGORY_MAPPING = {
    "稅務相關": "tax",
    "會計記帳": "accounting",
    "企業經營": "business",
    "企業登記": "business",
    "創業資訊": "startup",
    "財務規劃": "financial",
    "法律知識": "legal"
}

# 已處理文件記錄
PROCESSED_FILES_RECORD = os.path.join(PROJECT_ROOT, ".processed_blog_files.json")

def get_file_content(path: str) -> Optional[str]:
    """
    從 GitHub 獲取檔案內容
    :param path: 檔案路徑
    :return: 檔案內容 (如果存在)
    """
    try:
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(
            f"{GITHUB_API_URL}/contents/{path}",
            headers=headers
        )
        
        if response.status_code == 200:
            content = response.json()
            if content.get("type") == "file":
                file_content = base64.b64decode(content["content"]).decode("utf-8")
                return file_content
        return None
    except Exception as e:
        print(f"獲取文件內容時發生錯誤 ({path}): {str(e)}")
        return None

def get_directory_contents(path: str) -> List[Dict[str, Any]]:
    """
    從 GitHub 獲取目錄內容
    :param path: 目錄路徑
    :return: 目錄內容列表
    """
    try:
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(
            f"{GITHUB_API_URL}/contents/{path}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"獲取目錄內容時發生錯誤 ({path}): {str(e)}")
        return []

def update_github_file(path: str, content: str, message: str) -> bool:
    """
    更新 GitHub 上的檔案
    :param path: 檔案路徑
    :param content: 新的內容
    :param message: 提交訊息
    :return: 是否成功
    """
    try:
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # 獲取目前檔案的 SHA
        response = requests.get(
            f"{GITHUB_API_URL}/contents/{path}",
            headers=headers
        )
        
        sha = None
        if response.status_code == 200:
            current_file = response.json()
            sha = current_file["sha"]
            
        # 準備更新數據
        update_data = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8")
        }
        
        if sha:
            update_data["sha"] = sha
        
        # 更新或創建檔案
        response = requests.put(
            f"{GITHUB_API_URL}/contents/{path}",
            headers=headers,
            json=update_data
        )
        
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"更新文件時發生錯誤 ({path}): {str(e)}")
        return False

def extract_date_from_filename(filename: str) -> str:
    """
    從文件名中提取日期
    :param filename: 文件名
    :return: 日期字符串 (YYYY-MM-DD)
    """
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    return date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")

def extract_first_paragraph(html_content: str) -> str:
    """
    從HTML內容中提取第一個有意義的段落作為摘要
    :param html_content: HTML內容
    :return: 第一個段落文字
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 查找文章內容區域
    article_body = soup.select_one('.article-body')
    
    if article_body:
        # 從文章內容中查找第一個非空段落
        paragraphs = article_body.find_all('p')
        for p in paragraphs:
            text = p.get_text().strip()
            if text and len(text) > 20:  # 確保段落有足夠的內容
                return text[:200] + "..." if len(text) > 200 else text
    
    # 如果在文章內容中找不到合適的段落，嘗試在整個文檔中查找
    paragraphs = soup.find_all('p')
    for p in paragraphs:
        text = p.get_text().strip()
        if text and len(text) > 20:
            return text[:200] + "..." if len(text) > 200 else text
    
    return "本文介紹了相關財稅知識，點擊閱讀全文瞭解更多。"

def detect_image_in_html(html_content: str) -> str:
    """
    從HTML內容中檢測文章主圖
    :param html_content: HTML內容
    :return: 圖片路徑
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 查找可能的圖片位置
    # 1. 查找結構化數據中的圖片
    script_tags = soup.find_all('script', {'