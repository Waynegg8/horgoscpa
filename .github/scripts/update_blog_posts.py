#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
自動更新部落格文章 JSON 檔案 (進階版，支持刪除功能)
這個腳本會掃描指定的部落格文章目錄，提取文章資訊，
並更新 blog-posts.json 檔案，支援標籤、分類、分頁和文章刪除。
"""

import os
import json
import re
import datetime
import base64
import requests
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from collections import Counter

# GitHub 設定
GITHUB_TOKEN = os.environ.get('GH_PAT')
GITHUB_REPO = "waynegg8/horgoscpa"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}"

# 部落格文章路徑設定
BLOG_DIR = "blog"  # 博客文章目錄
JSON_PATH = "assets/data/blog-posts.json"  # 完整文章JSON文件路徑
LATEST_POSTS_PATH = "assets/data/latest-posts.json"  # 最新文章JSON文件路徑
ITEMS_PER_PAGE = 6  # 每頁顯示的文章數量

# 文章標題和日期的正則表達式
TITLE_REGEX = r"<title>(.*?)<\/title>"
DATE_REGEX = r'<span class="date">(.*?)<\/span>'
SUMMARY_REGEX = r'<meta name="description" content="(.*?)"'
IMAGE_REGEX = r'<meta property="og:image" content="(.*?)"'
CATEGORY_REGEX = r'<span class="category">分類: <a[^>]*>(.*?)<\/a><\/span>'

# 標籤提取正則表達式
TAG_SECTION_REGEX = r'<div class="post-tags">[\s\S]*?<\/div>'
TAG_REGEX = r'<a href="[^"]*" class="tag">(.*?)<\/a>'

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
PROCESSED_FILES_RECORD = ".processed_blog_files.json"

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

def extract_post_info(content: str, filename: str) -> Dict[str, Any]:
    """
    從 HTML 內容中提取文章資訊
    :param content: HTML 內容
    :param filename: 文件名稱
    :return: 文章資訊字典
    """
    # 提取標題
    title_match = re.search(TITLE_REGEX, content)
    title = title_match.group(1).split(" | ")[0] if title_match else "未找到標題"
    
    # 提取日期
    date_match = re.search(DATE_REGEX, content)
    date = date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")
    
    # 提取摘要
    summary_match = re.search(SUMMARY_REGEX, content)
    summary = summary_match.group(1) if summary_match else "文章摘要未找到"
    
    # 提取圖片
    image_match = re.search(IMAGE_REGEX, content)
    image = image_match.group(1) if image_match else f"/assets/images/blog/default.jpg"
    
    # 確保圖片路徑正確
    if not image.startswith("http") and not image.startswith("/"):
        image = f"/{image}"
    
    # 提取分類
    category_match = re.search(CATEGORY_REGEX, content)
    category_text = category_match.group(1) if category_match else "稅務相關"
    category = CATEGORY_MAPPING.get(category_text, "tax")
    
    # 提取標籤
    tags = []
    tag_section_match = re.search(TAG_SECTION_REGEX, content)
    if tag_section_match:
        tag_section = tag_section_match.group(0)
        tag_matches = re.findall(TAG_REGEX, tag_section)
        tags = tag_matches if tag_matches else []
    
    # 如果沒有提取到標籤，根據標題和摘要生成一些關鍵詞
    if not tags:
        # 從標題和摘要中提取關鍵詞
        text_for_keywords = f"{title} {summary} {category_text}"
        # 根據常見關鍵詞生成標籤
        common_keywords = ["稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業"]
        for keyword in common_keywords:
            if keyword in text_for_keywords and len(tags) < 3:
                tags.append(keyword)
    
    return {
        "title": title,
        "date": date,
        "summary": summary,
        "url": f"/{BLOG_DIR}/{filename}",
        "image": image,
        "category": category,
        "tags": tags
    }

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

def main():
    """主函數"""
    print("開始更新部落格文章 JSON 檔案...")
    
    # 獲取部落格目錄內容
    blog_files = get_directory_contents(BLOG_DIR)
    html_files = [f for f in blog_files if f["name"].endswith(".html")]
    
    if not html_files:
        print(f"在 {BLOG_DIR} 目錄中未找到 HTML 文件")
        return
    
    # 加載已處理文件記錄
    processed_files = load_processed_files()
    
    # 獲取當前HTML文件的名稱集合
    current_files = {f["name"] for f in html_files}
    
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
    
    # 處理每個 HTML 文件
    for file in html_files:
        filename = file["name"]
        
        # 檢查文件是否已處理過並且沒有變化
        if filename in processed_files:
            # 獲取文件的最後修改時間
            last_updated = file.get("updated_at", "")
            
            # 如果文件沒有變化，使用已保存的信息
            if last_updated == processed_files[filename].get("updated_at", ""):
                print(f"文件 {filename} 未變更，使用已保存的信息")
                post_info = processed_files[filename].get("info", {})
                if post_info:
                    posts.append(post_info)
                    continue
        
        # 如果文件有變化或未處理過，重新提取信息
        file_content = get_file_content(file["path"])
        if file_content:
            post_info = extract_post_info(file_content, filename)
            posts.append(post_info)
            
            # 更新處理記錄
            processed_files[filename] = {
                "updated_at": file.get("updated_at", ""),
                "info": post_info
            }
    
    # 保存已處理文件記錄
    save_processed_files(processed_files)
    
    # 按日期排序 (最新的優先)
    posts.sort(key=lambda x: parse_date(x["date"]), reverse=True)
    
    # 獲取最新的3篇文章用於首頁顯示
    latest_posts = posts[:3]
    
    # 生成分頁信息
    total_posts = len(posts)
    total_pages = get_total_pages(total_posts)
    
    # 創建包含分頁信息的完整數據結構
    full_data = {
        "posts": posts,
        "pagination": {
            "total_posts": total_posts,
            "total_pages": total_pages,
            "items_per_page": ITEMS_PER_PAGE
        },
        "categories": list(set(post["category"] for post in posts)),
        "tags": list(set(tag for post in posts for tag in post["tags"]))
    }
    
    # 獲取目前的完整JSON文件
    current_full_json = get_file_content(JSON_PATH)
    current_full_data = json.loads(current_full_json) if current_full_json else {"posts": []}
    
    # 檢查完整文章數據是否有變更
    if json.dumps(full_data["posts"]) != json.dumps(current_full_data.get("posts", [])):
        # 更新完整文章JSON文件
        full_json_content = json.dumps(full_data, ensure_ascii=False, indent=2)
        success_full = update_github_file(
            JSON_PATH,
            full_json_content,
            "自動更新完整博客文章JSON"
        )
        
        if success_full:
            print(f"成功更新完整文章數據: {JSON_PATH}")
            print(f"總文章數: {total_posts}, 總頁數: {total_pages}")
        else:
            print(f"更新完整文章數據失敗: {JSON_PATH}")
    else:
        print("完整文章數據無需更新")
    
    # 獲取目前的最新文章JSON文件
    current_latest_json = get_file_content(LATEST_POSTS_PATH)
    current_latest_posts = json.loads(current_latest_json) if current_latest_json else []
    
    # 檢查最新文章是否有變更
    if json.dumps(latest_posts) != json.dumps(current_latest_posts):
        # 更新最新文章JSON文件
        latest_json_content = json.dumps(latest_posts, ensure_ascii=False, indent=2)
        success_latest = update_github_file(
            LATEST_POSTS_PATH,
            latest_json_content,
            "自動更新最新文章JSON"
        )
        
        if success_latest:
            print(f"成功更新最新文章數據: {LATEST_POSTS_PATH}")
            print("最新文章:")
            for i, post in enumerate(latest_posts, 1):
                print(f"{i}. {post['title']} ({post['date']})")
        else:
            print(f"更新最新文章數據失敗: {LATEST_POSTS_PATH}")
    else:
        print("最新文章數據無需更新")

if __name__ == "__main__":
    if not GITHUB_TOKEN:
        print("錯誤: 未設定 GH_PAT 環境變數")
    else:
        main()