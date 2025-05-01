#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
自動更新部落格文章 JSON 檔案 (兼容新HTML格式)
這個腳本會掃描指定的部落格文章目錄，提取最新的3篇文章資訊，
並更新 blog-posts.json 檔案。
"""

import os
import json
import re
import datetime
import base64
import requests
from pathlib import Path
from typing import List, Dict, Any, Optional

# GitHub 設定
GITHUB_TOKEN = os.environ.get('GH_PAT')
GITHUB_REPO = "waynegg8/horgoscpa"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}"

# 部落格文章路徑設定
BLOG_DIR = "blog"  # 博客文章目錄
JSON_PATH = "assets/data/blog-posts.json"  # JSON 文件路徑

# 文章標題和日期的正則表達式 (更新以兼容新HTML格式)
TITLE_REGEX = r"<title>(.*?)<\/title>"
DATE_REGEX = r'<span class="date">(.*?)<\/span>'  # 修改為使用<span>而非<p>
SUMMARY_REGEX = r'<meta name="description" content="(.*?)"'
IMAGE_REGEX = r'<meta property="og:image" content="(.*?)"'

def get_file_content(path: str) -> Optional[str]:
    """
    從 GitHub 獲取檔案內容
    :param path: 檔案路徑
    :return: 檔案內容 (如果存在)
    """
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

def get_directory_contents(path: str) -> List[Dict[str, Any]]:
    """
    從 GitHub 獲取目錄內容
    :param path: 目錄路徑
    :return: 目錄內容列表
    """
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

def update_github_file(path: str, content: str, message: str) -> bool:
    """
    更新 GitHub 上的檔案
    :param path: 檔案路徑
    :param content: 新的內容
    :param message: 提交訊息
    :return: 是否成功
    """
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 獲取目前檔案的 SHA
    response = requests.get(
        f"{GITHUB_API_URL}/contents/{path}",
        headers=headers
    )
    
    if response.status_code == 200:
        current_file = response.json()
        sha = current_file["sha"]
        
        # 更新檔案
        update_data = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "sha": sha
        }
        
        response = requests.put(
            f"{GITHUB_API_URL}/contents/{path}",
            headers=headers,
            json=update_data
        )
        
        return response.status_code in [200, 201]
    
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
    
    # 提取日期 (使用更新的正則表達式)
    date_match = re.search(DATE_REGEX, content)
    date = date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")
    
    # 提取摘要
    summary_match = re.search(SUMMARY_REGEX, content)
    summary = summary_match.group(1) if summary_match else "文章摘要未找到"
    
    # 提取圖片 (如果有)
    image_match = re.search(IMAGE_REGEX, content)
    image = image_match.group(1) if image_match else f"/assets/images/blog/default.jpg"
    
    # 確保圖片路徑正確
    if not image.startswith("http") and not image.startswith("/"):
        image = f"/{image}"
    
    return {
        "title": title,
        "date": date,
        "summary": summary,
        "url": f"/{BLOG_DIR}/{filename}",
        "image": image
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

def main():
    """主函數"""
    print("開始更新部落格文章 JSON 檔案...")
    
    # 獲取部落格目錄內容
    blog_files = get_directory_contents(BLOG_DIR)
    html_files = [f for f in blog_files if f["name"].endswith(".html")]
    
    if not html_files:
        print(f"在 {BLOG_DIR} 目錄中未找到 HTML 文件")
        return
    
    posts = []
    
    # 處理每個 HTML 文件
    for file in html_files:
        file_content = get_file_content(file["path"])
        if file_content:
            post_info = extract_post_info(file_content, file["name"])
            posts.append(post_info)
    
    # 按日期排序 (最新的優先)
    posts.sort(key=lambda x: parse_date(x["date"]), reverse=True)
    
    # 只保留最新的 3 篇
    latest_posts = posts[:3]
    
    # 獲取目前的 JSON 文件
    current_json = get_file_content(JSON_PATH)
    current_posts = json.loads(current_json) if current_json else []
    
    # 檢查是否有變更
    if json.dumps(latest_posts) != json.dumps(current_posts):
        # 更新 JSON 文件
        json_content = json.dumps(latest_posts, ensure_ascii=False, indent=2)
        success = update_github_file(
            JSON_PATH,
            json_content,
            "自動更新最新文章 JSON"
        )
        
        if success:
            print(f"成功更新 {JSON_PATH}")
            print("最新文章:")
            for i, post in enumerate(latest_posts, 1):
                print(f"{i}. {post['title']} ({post['date']})")
        else:
            print(f"更新 {JSON_PATH} 失敗")
    else:
        print("無需更新，文章內容未變更")

if __name__ == "__main__":
    if not GITHUB_TOKEN:
        print("錯誤: 未設定 GH_PAT 環境變數")
    else:
        main()