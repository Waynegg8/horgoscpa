#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
自動更新部落格文章 JSON 檔案 (進階版，支持系列文章與排程發布)
這個腳本會掃描指定的部落格文章目錄，提取文章資訊，
並更新 blog-posts.json 檔案，支援標籤、分類、系列文章和發布排程。
"""

import os
import sys  # 添加此行以引入sys模組
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
from bs4 import BeautifulSoup  # 添加BeautifulSoup用於更可靠的HTML解析

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
    script_tags = soup.find_all('script', {'type': 'application/ld+json'})
    for script in script_tags:
        try:
            data = json.loads(script.string)
            if data.get('image'):
                image_url = data['image']
                # 如果是完整URL，提取路徑部分
                if image_url.startswith('https://www.horgoscpa.com'):
                    return image_url.replace('https://www.horgoscpa.com', '')
                return image_url
        except:
            pass
    
    # 2. 查找Open Graph標籤
    og_image = soup.find('meta', {'property': 'og:image'})
    if og_image and og_image.get('content'):
        image_url = og_image.get('content')
        if image_url.startswith('https://www.horgoscpa.com'):
            return image_url.replace('https://www.horgoscpa.com', '')
        return image_url
    
    # 3. 在文章內容中查找第一張圖片
    article_body = soup.select_one('.article-body')
    if article_body:
        first_img = article_body.find('img')
        if first_img and first_img.get('src'):
            return first_img.get('src')
    
    # 4. 在整個頁面中查找圖片
    first_img = soup.find('img')
    if first_img and first_img.get('src'):
        return first_img.get('src')
    
    # 如果都找不到，返回默認圖片
    category_code = detect_category_in_html(html_content)
    return f"/assets/images/blog/{category_code}_default.jpg" if category_code else "/assets/images/blog/default.jpg"

def detect_category_in_html(html_content: str) -> str:
    """
    從HTML內容中檢測文章分類
    :param html_content: HTML內容
    :return: 分類代碼
    """
    # 使用正則表達式查找分類
    category_match = re.search(CATEGORY_REGEX, html_content)
    if category_match:
        return category_match.group(1)
    
    # 使用BeautifulSoup進行更可靠的查找
    soup = BeautifulSoup(html_content, 'html.parser')
    category_link = soup.select_one('a.article-category')
    if category_link:
        href = category_link.get('href', '')
        category_match = re.search(r'category=(\w+)', href)
        if category_match:
            return category_match.group(1)
    
    # 如果不能從HTML中提取，嘗試從內容推斷
    text_content = soup.get_text()
    categories = {
        "tax": ["稅務", "稅金", "稅法", "報稅", "節稅", "扣繳", "所得稅", "營業稅"],
        "accounting": ["會計", "記帳", "財報", "簿記", "帳務", "財務報表"],
        "business": ["企業", "經營", "管理", "公司", "營運", "登記"],
        "startup": ["創業", "新創", "資金", "募資"],
        "investment": ["投資", "理財", "資產", "報酬", "風險"],
        "international": ["跨境", "國際", "海外", "全球"]
    }
    
    scores = {category: 0 for category in categories}
    for category, keywords in categories.items():
        for keyword in keywords:
            scores[category] += text_content.count(keyword)
    
    # 找出得分最高的分類
    max_score = 0
    best_category = "tax"  # 默認為稅務相關
    for category, score in scores.items():
        if score > max_score:
            max_score = score
            best_category = category
    
    return best_category

def extract_post_info(content: str, filename: str) -> Dict[str, Any]:
    """
    從 HTML 內容中提取文章資訊
    :param content: HTML 內容
    :param filename: 文件名稱
    :return: 文章資訊字典
    """
    # 使用 utils 模組設置 jieba 分詞詞典
    setup_jieba_dict()
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(content, 'html.parser')
    
    # 提取系列信息
    is_series, series_name, episode, date_from_filename, title_from_filename = extract_series_info(filename)
    
    # 提取標題
    title_element = soup.select_one('h1.article-title')
    title = title_element.get_text().strip() if title_element else None
    
    if not title:
        title_match = re.search(TITLE_REGEX, content)
        title = title_match.group(1) if title_match else "未找到標題"
    
    # 如果標題仍然未找到，使用文件名作為備選
    if title == "未找到標題":
        # 從文件名提取可能的標題
        base_name = os.path.basename(filename)
        name_without_ext = os.path.splitext(base_name)[0]
        # 移除日期部分和連字符
        title_from_filename = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', name_without_ext)
        title_from_filename = title_from_filename.replace('-', ' ').title()
        title = title_from_filename
    
    # 提取日期
    # 首先嘗試從文章元數據中提取
    date_element = soup.select_one('.article-date')
    date = None
    if date_element:
        date_text = date_element.get_text().strip()
        date_match = re.search(r'\d{4}-\d{2}-\d{2}', date_text)
        if date_match:
            date = date_match.group(0)
    
    # 如果無法從元數據提取，嘗試從正則表達式提取
    if not date:
        date_match = re.search(DATE_REGEX, content)
        date = date_match.group(1) if date_match else None
    
    # 如果仍然無法提取，從文件名提取
    if not date:
        date = date_from_filename if date_from_filename else extract_date_from_filename(filename)
    
    # 提取摘要（第一個段落）
    summary = None
    meta_description = soup.find('meta', {'name': 'description'})
    if meta_description and meta_description.get('content'):
        summary = meta_description.get('content')
    
    # 如果無法從meta標籤提取，嘗試提取第一個有意義的段落
    if not summary or summary == title:
        summary = extract_first_paragraph(content)
    
    # 提取圖片
    image = detect_image_in_html(content)
    
    # 確保圖片路徑正確
    if not image.startswith("http") and not image.startswith("/"):
        image = f"/{image}"
    
    # 提取分類
    category_code = detect_category_in_html(content)
    
    # 提取標籤
    tags = []
    tag_elements = soup.select('.article-tag')
    for tag_el in tag_elements:
        tag_text = tag_el.get_text().strip()
        if tag_text:
            tags.append(tag_text)
    
    # 如果沒有提取到標籤，嘗試從正則表達式提取
    if not tags:
        tag_section_match = re.search(TAG_SECTION_REGEX, content)
        if tag_section_match:
            tag_section = tag_section_match.group(0)
            tag_matches = re.findall(TAG_REGEX, tag_section)
            tags = tag_matches if tag_matches else []
    
    # 如果仍然沒有標籤，生成基於內容的關鍵詞
    if not tags:
        # 從標題和摘要中提取關鍵詞
        # 使用jieba分詞
        jieba.setLogLevel(20)  # 設定日誌級別，抑制結巴的輸出信息
        text_for_keywords = f"{title} {summary} {category_code}"
        words = list(jieba.cut(text_for_keywords))
        
        # 過濾停用詞
        stopwords = ["的", "了", "和", "是", "在", "我們", "您", "與", "為", "以", "及", "或", "你", "我", "他", "她", "它", "此", "該"]
        filtered_words = [word for word in words if len(word) > 1 and word not in stopwords]
        
        # 計算詞頻
        word_counts = Counter(filtered_words)
        
        # 提取頻率最高的詞作為標籤候選
        top_words = [word for word, _ in word_counts.most_common(5)]
        
        # 選取至多3個標籤
        tags = top_words[:3]
        
        # 如果仍然沒有標籤，使用一些預設標籤
        if not tags:
            common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業"]
            for keyword in common_keywords:
                if keyword in text_for_keywords and len(tags) < 3:
                    tags.append(keyword)
    
    # 使用相對路徑
    url = f"/blog/{filename}"
    
    # 構建結果字典
    result = {
        "title": title,
        "date": date,
        "summary": summary,
        "url": url,
        "image": image,
        "category": category_code,
        "tags": tags
    }
    
    # 如果是系列文章，添加系列信息
    if is_series:
        result["is_series"] = True
        result["series_name"] = series_name
        result["episode"] = int(episode)
    
    return result

def parse_date(date_str: str) -> datetime.datetime:
    """
    解析日期字串
    :param date_str: 日期字串 (YYYY-MM-DD)
    :return: datetime 物件
    """
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return datetime.datetime.now()

def get_total_pages(total_posts: int) -> int:
    """
    計算總頁數
    :param total_posts: 總文章數
    :return: 總頁數
    """
    return (total_posts + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE

def load_processed_files() -> Dict[str, str]:
    """
    加載已處理文件記錄
    :return: 文件名稱和處理時間的字典
    """
    try:
        content = get_file_content(PROCESSED_FILES_RECORD)
        if content:
            return json.loads(content)
        return {}
    except Exception as e:
        print(f"加載已處理文件記錄時發生錯誤: {str(e)}")
        return {}

def save_processed_files(processed_files: Dict[str, str]) -> bool:
    """
    保存已處理文件記錄
    :param processed_files: 文件名稱和處理時間的字典
    :return: 是否保存成功
    """
    try:
        content = json.dumps(processed_files, ensure_ascii=False, indent=2)
        return update_github_file(
            PROCESSED_FILES_RECORD,
            content,
            "更新已處理文件記錄"
        )
    except Exception as e:
        print(f"保存已處理文件記錄時發生錯誤: {str(e)}")
        return False

def filter_by_date(posts: List[Dict[str, Any]], cutoff_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    篩選指定日期及之前的文章
    :param posts: 所有文章列表
    :param cutoff_date: 截止日期 (YYYY-MM-DD) 或 None（使用當天日期）
    :return: 篩選後的文章列表
    """
    if cutoff_date is None:
        cutoff_date = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # 篩選日期在截止日期及之前的文章
    filtered_posts = [post for post in posts if post["date"] <= cutoff_date]
    
    return filtered_posts

def group_series_posts(posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    將系列文章分組
    :param posts: 所有文章列表
    :return: 包含系列分組的字典
    """
    # 分組系列文章
    series_posts = defaultdict(list)
    non_series_posts = []
    
    for post in posts:
        if post.get("is_series"):
            series_name = post["series_name"]
            series_posts[series_name].append(post)
        else:
            non_series_posts.append(post)
    
    # 對每個系列中的文章按集數排序
    for series_name in series_posts:
        series_posts[series_name].sort(key=lambda x: x["episode"])
    
    # 對非系列文章按日期排序
    non_series_posts.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "series_posts": dict(series_posts),
        "non_series_posts": non_series_posts
    }

def standardize_filename(filename: str, post_info: Dict[str, Any]) -> str:
    """
    標準化文件名
    :param filename: 原始文件名
    :param post_info: 文章信息
    :return: 標準化後的文件名
    """
    # 取得基本信息
    date = post_info["date"]
    title = post_info["title"]
    
    # 將標題轉換為URL友好的格式
    title_slug = slugify(title)
    
    # 如果是系列文章
    if post_info.get("is_series"):
        series_name = post_info["series_name"]
        episode = post_info["episode"]
        # 格式: YYYY-MM-DD-系列名稱EP編號-標題.html
        new_filename = f"{date}-{series_name}EP{episode}-{title_slug}.html"
    else:
        # 格式: YYYY-MM-DD-標題.html
        new_filename = f"{date}-{title_slug}.html"
    
    return new_filename

def rename_file_if_needed(old_path: str, new_path: str) -> bool:
    """
    如果需要，重命名文件
    :param old_path: 舊文件路徑
    :param new_path: 新文件路徑
    :return: 是否重命名成功
    """
    if old_path != new_path and os.path.exists(old_path):
        try:
            # 確保目標目錄存在
            os.makedirs(os.path.dirname(new_path), exist_ok=True)
            
            # 如果目標文件已存在，先刪除
            if os.path.exists(new_path):
                os.remove(new_path)
            
            # 重命名文件
            os.rename(old_path, new_path)
            print(f"重命名文件: {old_path} -> {new_path}")
            return True
        except Exception as e:
            print(f"重命名文件時出錯: {str(e)}")
            return False
    return True  # 不需要重命名

def main():
    """主函數"""
    print("開始更新部落格文章 JSON 檔案...")
    print(f"專案根目錄: {PROJECT_ROOT}")
    print(f"部落格目錄: {BLOG_DIR}")
    
    # 使用 utils 模組檢查詞典
    tw_dict = load_translation_dict()
    if tw_dict:
        print(f"詞典包含 {len(tw_dict)} 個詞彙")
    else:
        print("詞典檔案不存在或為空")
        print("將使用默認分詞方式處理標題與描述")
    
    # 檢查目錄是否存在
    if not os.path.exists(BLOG_DIR):
        print(f"錯誤: 目錄 {BLOG_DIR} 不存在")
        return
    
    # 獲取部落格目錄內容
    try:
        blog_files = os.listdir(BLOG_DIR)
        html_files = [f for f in blog_files if f.endswith(".html")]
        
        # 檢查並修復檔案名稱問題
        fixed_files = []
        for filename in html_files:
            if filename.endswith('-.html'):
                print(f"發現問題檔案名: {filename}")
                new_filename = filename.replace('-.html', '.html')
                # 檢查新檔名是否有意義
                if new_filename == filename:
                    # 如果只是移除了尾部的連字符，則需要更有意義的名稱
                    base_name = os.path.splitext(filename)[0]  # 不含副檔名
                    date_part = base_name[:10] if len(base_name) >= 10 else ""
                    # 從檔案內容提取標題，為簡單起見，這裡使用一個更有意義的固定名稱
                    new_filename = f"{date_part}-article.html" if date_part else "article.html"
                
                print(f"修正為: {new_filename}")
                
                # 實際修改檔案名
                old_path = os.path.join(BLOG_DIR, filename)
                new_path = os.path.join(BLOG_DIR, new_filename)
                try:
                    os.rename(old_path, new_path)
                    print(f"已重命名檔案 {filename} 為 {new_filename}")
                    fixed_files.append((filename, new_filename))
                except Exception as e:
                    print(f"重命名檔案時出錯: {e}")
        
        # 重新獲取檔案列表（包含可能已重命名的檔案）
        if fixed_files:
            blog_files = os.listdir(BLOG_DIR)
            html_files = [f for f in blog_files if f.endswith(".html")]
            print(f"更新後的HTML檔案列表: {len(html_files)} 個檔案")
        
        if not html_files:
            print(f"在 {BLOG_DIR} 目錄中未找到 HTML 文件")
            return
    except Exception as e:
        print(f"獲取部落格目錄內容時發生錯誤: {str(e)}")
        return
    
    # 加載已處理文件記錄
    processed_files = load_processed_files()
    
    # 更新已處理檔案記錄以反映已重命名的檔案
    for old_name, new_name in fixed_files:
        if old_name in processed_files:
            processed_files[new_name] = processed_files[old_name]
            processed_files.pop(old_name, None)
            print(f"已更新處理記錄: {old_name} -> {new_name}")
    
    # 獲取當前HTML文件的名稱集合
    current_files = set(html_files)
    
    # 檢查是否有文件被刪除
    stored_files = set(processed_files.keys())
    deleted_files = stored_files - current_files
    
    if deleted_files:
        print(f"檢測到 {len(deleted_files)} 個文件已被刪除:")
        for filename in deleted_files:
            print(f"  - {filename}")
            # 從記錄中移除
            processed_files.pop(filename, None)
        
        # 更新已處理文件記錄
        save_processed_files(processed_files)
    
    posts = []
    renamed_files = []
    
    # 處理每個 HTML 文件
    for filename in html_files:
        # 檢查文件是否已處理過並且沒有變化
        if filename in processed_files:
            # 如果文件沒有變化，使用已保存的信息
            print(f"文件 {filename} 未變更，使用已保存的信息")
            post_info = processed_files[filename].get("info", {})
            if post_info:
                # 檢查文件名是否需要標準化
                new_filename = standardize_filename(filename, post_info)
                old_path = os.path.join(BLOG_DIR, filename)
                new_path = os.path.join(BLOG_DIR, new_filename)
                
                # 如果需要重命名
                if new_filename != filename:
                    if rename_file_if_needed(old_path, new_path):
                        # 更新記錄和文件名
                        processed_files[new_filename] = processed_files[filename]
                        processed_files.pop(filename, None)
                        filename = new_filename
                        renamed_files.append((old_path, new_path))
                        
                        # 更新URL
                        post_info["url"] = f"/blog/{new_filename}"
                
                posts.append(post_info)
                continue
        
        # 如果文件有變化或未處理過，重新提取信息
        file_path = os.path.join(BLOG_DIR, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
                
            post_info = extract_post_info(file_content, filename)
            
            # 檢查文件名是否需要標準化
            new_filename = standardize_filename(filename, post_info)
            old_path = os.path.join(BLOG_DIR, filename)
            new_path = os.path.join(BLOG_DIR, new_filename)
            
            # 如果需要重命名
            if new_filename != filename:
                if rename_file_if_needed(old_path, new_path):
                    # 更新文件名
                    filename = new_filename
                    renamed_files.append((old_path, new_path))
                    
                    # 更新URL
                    post_info["url"] = f"/blog/{new_filename}"
            
            posts.append(post_info)
            
            # 更新處理記錄
            processed_files[filename] = {
                "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "info": post_info
            }
            
            print(f"成功處理文件: {filename}")
            print(f"  標題: {post_info['title']}")
            print(f"  日期: {post_info['date']}")
            print(f"  分類: {post_info['category']}")
            print(f"  系列: {post_info.get('series_name', '非系列')}")
            if post_info.get("is_series"):
                print(f"  集數: EP{post_info.get('episode')}")
            print(f"  摘要: {post_info['summary'][:50]}...")
            print(f"  圖片: {post_info['image']}")
            print(f"  標籤: {', '.join(post_info['tags'])}")
        except Exception as e:
            print(f"處理文件 {filename} 時出錯: {str(e)}")
    
    # 保存已處理文件記錄
    save_processed_files(processed_files)
    
    # 篩選今天及之前日期的文章
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    filtered_posts = filter_by_date(posts, today)
    print(f"篩選後 (日期 <= {today})：{len(filtered_posts)} 篇文章")
    
    # 按日期排序 (最新的優先)
    filtered_posts.sort(key=lambda x: parse_date(x["date"]), reverse=True)
    
    # 獲取系列文章分組
    grouped_posts = group_series_posts(filtered_posts)
    series_posts = grouped_posts["series_posts"]
    non_series_posts = grouped_posts["non_series_posts"]
    
    # 輸出系列文章統計
    print(f"系列文章數: {len(series_posts)} 個系列")
    for series_name, series_articles in series_posts.items():
        print(f"  - {series_name}: {len(series_articles)} 篇")
    print(f"非系列文章數: {len(non_series_posts)} 篇")
    
    # 獲取最新的3篇文章用於首頁顯示
    latest_posts = filtered_posts[:3]
    
    # 生成分頁信息
    total_posts = len(filtered_posts)
    total_pages = get_total_pages(total_posts)
    
    # 創建包含分頁信息的完整數據結構
    full_data = {
        "posts": filtered_posts,
        "series": series_posts,
        "pagination": {
            "total_posts": total_posts,
            "total_pages": total_pages,
            "items_per_page": ITEMS_PER_PAGE
        },
        "categories": list(set(post["category"] for post in filtered_posts)),
        "tags": list(set(tag for post in filtered_posts for tag in post["tags"]))
    }
    
    # 檢查目前的完整JSON文件是否存在
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                current_full_data = json.load(f)
            print(f"現有JSON文件中有 {len(current_full_data.get('posts', []))} 篇文章")
        except Exception as e:
            print(f"讀取現有JSON文件時出錯: {str(e)}")
            current_full_data = {"posts": []}
    else:
        current_full_data = {"posts": []}
    
    # 檢查完整文章數據是否有變更
    try:
        current_posts = current_full_data.get("posts", [])
        if len(filtered_posts) != len(current_posts) or len(renamed_files) > 0:
            # 更新完整文章JSON文件
            with open(JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump(full_data, f, ensure_ascii=False, indent=2)
            
            print(f"成功更新完整文章數據: {JSON_PATH}")
            print(f"總文章數: {total_posts}, 總頁數: {total_pages}")
        else:
            print("完整文章數據無需更新")
    except Exception as e:
        print(f"更新完整文章數據時出錯: {str(e)}")
    
    # 檢查最新文章JSON文件是否存在
    if os.path.exists(LATEST_POSTS_PATH):
        try:
            with open(LATEST_POSTS_PATH, 'r', encoding='utf-8') as f:
                current_latest_posts = json.load(f)
        except Exception as e:
            print(f"讀取最新文章JSON時出錯: {str(e)}")
            current_latest_posts = []
    else:
        current_latest_posts = []
    
    # 檢查最新文章是否有變更
    try:
        if len(latest_posts) != len(current_latest_posts) or len(renamed_files) > 0:
            # 更新最新文章JSON文件
            with open(LATEST_POSTS_PATH, 'w', encoding='utf-8') as f:
                json.dump(latest_posts, f, ensure_ascii=False, indent=2)
            
            print(f"成功更新最新文章數據: {LATEST_POSTS_PATH}")
            print("最新文章:")
            for i, post in enumerate(latest_posts, 1):
                print(f"{i}. {post['title']} ({post['date']})")
        else:
            print("最新文章數據無需更新")
    except Exception as e:
        print(f"更新最新文章數據時出錯: {str(e)}")

if __name__ == "__main__":
    # 檢查是否有 --publish-scheduled 參數
    publish_scheduled = "--publish-scheduled" in sys.argv
    if publish_scheduled:
        print("執行自動發布排定文章模式")
    
    if not GITHUB_TOKEN:
        print("錯誤: 未設定 GH_PAT 環境變數")
        print("本地執行時會跳過GitHub API相關操作")
    main()