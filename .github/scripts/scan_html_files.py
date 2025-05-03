#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
手動掃描現有HTML文件生成blog-posts.json
用法: python scan_html_files.py
"""

import os
import re
import json
import datetime
import sys
from pathlib import Path
from bs4 import BeautifulSoup

# 引入 utils 模組
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_translation_dict, setup_jieba_dict

# 獲取專案根目錄（假設腳本在 .github/scripts 目錄下）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 部落格文章路徑設定（使用絕對路徑）
BLOG_DIR = os.path.join(PROJECT_ROOT, "blog")  # 博客文章目錄
JSON_PATH = os.path.join(PROJECT_ROOT, "assets/data/blog-posts.json")  # 完整文章JSON文件路徑
LATEST_POSTS_PATH = os.path.join(PROJECT_ROOT, "assets/data/latest-posts.json")  # 最新文章JSON文件路徑
ITEMS_PER_PAGE = 6  # 每頁顯示的文章數量

# 分類映射
CATEGORY_MAPPING = {
    "稅務相關": "tax",
    "會計記帳": "accounting",
    "企業經營": "business",
    "企業登記": "business",
    "創業資訊": "startup",
    "財務規劃": "financial",
    "法律知識": "legal"
}

def extract_info_from_html(file_path):
    """從HTML文件中提取文章資訊"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"檔案大小: {len(content)} 字節")
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(content, 'lxml')
        
        # 提取標題
        title_tag = soup.find('title')
        title = title_tag.text.split(' | ')[0] if title_tag else os.path.basename(file_path)
        print(f"提取標題: {title}")
        
        # 提取日期
        date_span = soup.select_one('span.date')
        date = date_span.text if date_span else os.path.basename(file_path).split('-')[0:3]
        if isinstance(date, list):
            date = '-'.join(date)
        print(f"提取日期: {date}")
        
        # 提取摘要
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        summary = meta_desc['content'] if meta_desc else ""
        print(f"提取摘要: {summary[:50]}...")
        
        # 提取圖片
        meta_image = soup.find('meta', property='og:image')
        image = meta_image['content'] if meta_image else "/assets/images/blog/default.jpg"
        print(f"提取圖片: {image}")
        
        # 提取分類
        category_span = soup.select_one('span.category')
        category_text = ""
        if category_span:
            category_link = category_span.find('a')
            if category_link:
                category_text = category_link.text
        
        category_code = CATEGORY_MAPPING.get(category_text, "tax")
        print(f"提取分類: {category_text} ({category_code})")
        
        # 提取標籤
        tags = []
        tag_links = soup.select('.post-tags .tag')
        for tag_link in tag_links:
            tags.append(tag_link.text)
        
        print(f"提取標籤: {tags}")
        
        # 獲取URL (使用相對於專案根目錄的路徑)
        relative_path = os.path.relpath(file_path, PROJECT_ROOT)
        url = f"/{relative_path.replace(os.sep, '/')}"
        print(f"生成URL: {url}")
        
        return {
            "title": title,
            "date": date,
            "summary": summary,
            "url": url,
            "image": image,
            "category": category_code,
            "tags": tags
        }
    except Exception as e:
        print(f"處理文件 {file_path} 時出錯: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def scan_blog_directory():
    """掃描部落格目錄獲取所有HTML文件信息"""
    posts = []
    
    # 獲取並輸出當前工作目錄
    current_dir = os.getcwd()
    print(f"當前工作目錄: {current_dir}")
    print(f"專案根目錄: {PROJECT_ROOT}")
    
    # 檢查目錄是否存在
    print(f"嘗試存取的部落格目錄: {BLOG_DIR}")
    
    if not os.path.exists(BLOG_DIR):
        print(f"錯誤: 目錄 {BLOG_DIR} 不存在")
        # 列出根目錄下的所有文件和目錄
        print(f"專案根目錄下的文件和目錄:")
        for item in os.listdir(PROJECT_ROOT):
            print(f"  - {item}")
        return posts
    
    # 列出blog目錄中的所有文件
    print(f"{BLOG_DIR}目錄中的文件:")
    for item in os.listdir(BLOG_DIR):
        print(f"  - {item}")
    
    # 掃描目錄下所有HTML文件
    html_count = 0
    for file_name in os.listdir(BLOG_DIR):
        if file_name.endswith('.html'):
            html_count += 1
            file_path = os.path.join(BLOG_DIR, file_name)
            print(f"\n處理HTML文件: {file_path}")
            post_info = extract_info_from_html(file_path)
            if post_info:
                posts.append(post_info)
                print(f"成功提取 {file_path} 的信息:")
                print(f"  標題: {post_info['title']}")
                print(f"  日期: {post_info['date']}")
                print(f"  分類: {post_info['category']}")
                print(f"  標籤: {', '.join(post_info['tags'])}")
            else:
                print(f"無法提取 {file_path} 的信息")
    
    print(f"總共找到 {html_count} 個HTML文件")
    
    # 按日期排序
    posts.sort(key=lambda x: x["date"], reverse=True)
    
    return posts

def update_json_files(posts):
    """更新JSON文件"""
    # 確保目錄存在
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    
    # 獲取所有標籤和分類
    all_tags = set()
    all_categories = set()
    
    for post in posts:
        if 'tags' in post and post['tags']:
            all_tags.update(post['tags'])
        if 'category' in post:
            all_categories.add(post['category'])
    
    # 建立完整數據結構
    full_data = {
        "posts": posts,
        "pagination": {
            "total_posts": len(posts),
            "total_pages": max(1, (len(posts) + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE),
            "items_per_page": ITEMS_PER_PAGE
        },
        "categories": list(all_categories),
        "tags": list(all_tags)
    }
    
    # 檢查目前JSON文件是否存在
    try:
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
            print(f"現有JSON文件中有 {len(current_data.get('posts', []))} 篇文章")
            print(f"現有JSON文件內容: {json.dumps(current_data, ensure_ascii=False, indent=2)[:500]}...")
        else:
            print(f"JSON文件 {JSON_PATH} 不存在，將創建新文件")
    except Exception as e:
        print(f"讀取現有JSON文件時出錯: {str(e)}")
    
    # 寫入完整JSON文件
    try:
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)
        
        print(f"成功更新 {JSON_PATH}")
        print(f"共 {len(posts)} 篇文章，{len(all_categories)} 個分類，{len(all_tags)} 個標籤")
        
        # 顯示部分更新後的JSON內容
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            updated_json = json.load(f)
        print(f"更新後的JSON文件內容: {json.dumps(updated_json, ensure_ascii=False, indent=2)[:500]}...")
    except Exception as e:
        print(f"寫入JSON文件時出錯: {str(e)}")
        return False
    
    # 更新最新文章JSON
    latest_posts = posts[:3] if len(posts) >= 3 else posts
    
    # 確保目錄存在
    os.makedirs(os.path.dirname(LATEST_POSTS_PATH), exist_ok=True)
    
    try:
        with open(LATEST_POSTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(latest_posts, f, ensure_ascii=False, indent=2)
        
        print(f"成功更新 {LATEST_POSTS_PATH}")
        print(f"新增了 {len(latest_posts)} 篇最新文章")
        
        # 顯示最新文章JSON內容
        with open(LATEST_POSTS_PATH, 'r', encoding='utf-8') as f:
            latest_json = json.load(f)
        print(f"最新文章JSON文件內容: {json.dumps(latest_json, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"寫入最新文章JSON時出錯: {str(e)}")
        return False
    
    return True

def main():
    """主函數"""
    print("開始掃描部落格文章...")
    print(f"Python版本: {sys.version}")
    print(f"當前系統: {sys.platform}")
    print(f"JSON_PATH: {JSON_PATH}")
    print(f"LATEST_POSTS_PATH: {LATEST_POSTS_PATH}")
    
    # 使用 utils 模組加載字典
    tw_dict = load_translation_dict()
    if tw_dict:
        print(f"詞典包含 {len(tw_dict)} 個詞彙")
    else:
        print("詞典檔案不存在或為空")
    
    posts = scan_blog_directory()
    
    if posts:
        print(f"找到 {len(posts)} 篇文章")
        update_json_files(posts)
    else:
        print("未找到任何文章，創建空的JSON文件")
        update_json_files([])

if __name__ == "__main__":
    main()