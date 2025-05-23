#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
更新影片數據腳本
從 video/videos.txt 讀取影片資訊，自動生成分類和標籤，更新 assets/data/videos.json
增加SEO優化: 提取YouTube影片ID、生成縮圖URL、推算影片持續時間
"""

import os
import json
import jieba
import datetime
import random
import sys
import re
import requests
from collections import Counter
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from urllib.parse import urlparse, parse_qs

# 引入 utils 模組
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
try:
    from utils import load_translation_dict, setup_jieba_dict
except ImportError:
    # 如果找不到 utils 模組，使用空函數
    def load_translation_dict():
        return {}
    def setup_jieba_dict():
        pass

# 獲取專案根目錄
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 配置區域（使用絕對路徑）
VIDEOS_TXT_PATH = os.path.join(PROJECT_ROOT, "video", "videos.txt")
VIDEOS_JSON_PATH = os.path.join(PROJECT_ROOT, "assets", "data", "videos.json")
ITEMS_PER_PAGE = 6  # 每頁顯示的影片數量

# 配置影片分類
VIDEO_CATEGORIES = {
    "tax": ["稅務", "報稅", "節稅", "扣繳", "稅法", "所得稅", "營業稅", "營所稅", "綜所稅", "稅務規劃"],
    "accounting": ["會計", "記帳", "帳務", "財報", "財務報表", "會計準則", "審計", "記帳士"],
    "business": ["創業", "新創", "公司設立", "企業", "經營", "營運", "公司登記", "管理"],
    "tutorial": ["教學", "操作", "流程", "使用", "系統", "後台", "介面", "功能", "設定", "設置"]
}

def extract_youtube_id(url: str) -> Optional[str]:
    """
    從 YouTube 網址提取影片 ID
    支援多種 YouTube URL 格式:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    
    :param url: YouTube URL
    :return: YouTube 影片 ID 或 None
    """
    if not url:
        return None
        
    # 針對不同格式的 YouTube URL 進行處理
    
    # 1. 嵌入格式: https://www.youtube.com/embed/VIDEO_ID
    embed_pattern = r'youtube\.com/embed/([a-zA-Z0-9_-]+)'
    embed_match = re.search(embed_pattern, url)
    if embed_match:
        return embed_match.group(1)
    
    # 2. 標準格式: https://www.youtube.com/watch?v=VIDEO_ID
    parsed_url = urlparse(url)
    if 'youtube.com' in parsed_url.netloc and '/watch' in parsed_url.path:
        query_params = parse_qs(parsed_url.query)
        video_ids = query_params.get('v', [])
        if video_ids:
            return video_ids[0]
    
    # 3. 短網址格式: https://youtu.be/VIDEO_ID
    if 'youtu.be' in parsed_url.netloc:
        return parsed_url.path.lstrip('/')
    
    return None

def generate_thumbnail_url(video_id: str, quality: str = 'maxres') -> str:
    """
    生成 YouTube 縮圖 URL
    
    :param video_id: YouTube 影片 ID
    :param quality: 縮圖品質 ('maxres', 'sd', 'hq', 'mq', 'default')
    :return: 縮圖 URL
    """
    if not video_id:
        return ''
    
    quality_map = {
        'maxres': 'maxresdefault',  # 最高解析度 (1280x720)
        'sd': 'sddefault',          # 標準解析度 (640x480)
        'hq': 'hqdefault',          # 高品質 (480x360)
        'mq': 'mqdefault',          # 中等品質 (320x180)
        'default': 'default'        # 默認品質 (120x90)
    }
    
    thumbnail_quality = quality_map.get(quality, 'maxresdefault')
    return f'https://img.youtube.com/vi/{video_id}/{thumbnail_quality}.jpg'

def check_thumbnail_exists(thumbnail_url: str) -> bool:
    """
    檢查縮圖是否存在
    
    :param thumbnail_url: 縮圖 URL
    :return: 是否存在
    """
    try:
        response = requests.head(thumbnail_url, timeout=5)
        return response.status_code == 200
    except:
        return False

def get_best_thumbnail(video_id: str) -> str:
    """
    獲取最佳縮圖 URL
    嘗試從最高品質開始，如果不存在則降級
    
    :param video_id: YouTube 影片 ID
    :return: 最佳縮圖 URL
    """
    if not video_id:
        return ''
    
    # 按優先級嘗試不同品質
    for quality in ['maxres', 'sd', 'hq', 'mq', 'default']:
        thumbnail_url = generate_thumbnail_url(video_id, quality)
        if check_thumbnail_exists(thumbnail_url):
            return thumbnail_url
    
    # 如果所有品質都失敗，返回默認品質 URL
    return generate_thumbnail_url(video_id, 'default')

def load_videos_from_txt(file_path: str) -> List[Dict[str, Any]]:
    """
    從 txt 文件中載入影片資訊
    :param file_path: txt 文件路徑
    :return: 影片信息列表
    """
    videos = []
    
    if not os.path.exists(file_path):
        print(f"警告：找不到影片信息文件 {file_path}")
        # 如果文件不存在，創建一個空文件
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("# 影片信息格式示例:\n")
            f.write("標題=台灣報稅流程簡介\n")
            f.write("日期=2025-03-15\n")
            f.write("描述=本影片詳細介紹台灣個人與企業報稅流程，包含申報時間、必要文件與常見問題解析，讓您輕鬆掌握報稅要點。\n")
            f.write("網址=https://www.youtube.com/embed/FvRwth0j_P0\n")
            f.write("縮圖=https://img.youtube.com/vi/FvRwth0j_P0/maxresdefault.jpg\n")
            f.write("---\n")
        print(f"已創建空的影片信息文件 {file_path}")
        return videos
    
    # 檢查文件是否為空或只有注釋
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not content.strip() or content.strip().startswith('#') and not '---' in content:
        print(f"影片信息文件 {file_path} 為空或只有註釋")
        return videos
    
    # 用 --- 分隔每個影片信息
    video_blocks = content.split('---')
    
    for block in video_blocks:
        if not block.strip() or block.strip().startswith('#'):
            continue
        
        video_info = {}
        lines = block.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # 根據鍵名對應到JSON字段
                if key == '標題':
                    video_info['title'] = value
                elif key == '日期':
                    video_info['date'] = value
                elif key == '描述':
                    video_info['description'] = value
                elif key == '網址':
                    video_info['embedUrl'] = value
                elif key == '分類':  # 允許手動指定分類（可選）
                    video_info['category'] = value
                elif key == '標籤':  # 允許手動指定標籤（可選）
                    video_info['tags'] = [tag.strip() for tag in value.split(',')]
                elif key == '縮圖':  # 新增: 手動指定縮圖URL（可選）
                    video_info['thumbnailUrl'] = value
                elif key == '影片ID':  # 新增: 手動指定YouTube影片ID（可選）
                    video_info['videoId'] = value
                elif key == '持續時間':  # 新增: 手動指定影片持續時間（可選）
                    video_info['duration'] = value
        
        # 檢查必填字段
        required_fields = ['title', 'description', 'embedUrl']
        if all(field in video_info for field in required_fields):
            # 如果沒有指定日期，使用當前日期
            if 'date' not in video_info:
                video_info['date'] = datetime.datetime.now().strftime("%Y-%m-%d")
            
            # 提取YouTube影片ID（如果尚未手動提供）
            if 'videoId' not in video_info and 'embedUrl' in video_info:
                video_id = extract_youtube_id(video_info['embedUrl'])
                if video_id:
                    video_info['videoId'] = video_id
            
            # 生成縮圖URL（如果尚未手動提供）
            if 'thumbnailUrl' not in video_info and 'videoId' in video_info:
                video_info['thumbnailUrl'] = get_best_thumbnail(video_info['videoId'])
                
            # 如果沒有指定分類和標籤，生成它們
            if 'category' not in video_info or 'tags' not in video_info:
                category, tags = generate_category_and_tags(
                    video_info['title'], 
                    video_info.get('description', '')
                )
                
                if 'category' not in video_info:
                    video_info['category'] = category
                    
                if 'tags' not in video_info:
                    video_info['tags'] = tags
            
            videos.append(video_info)
    
    # 按日期降序排序
    videos.sort(key=lambda x: x['date'], reverse=True)
    
    return videos

def generate_category_and_tags(title: str, description: str) -> Tuple[str, List[str]]:
    """
    根據標題和描述自動生成分類和標籤
    :param title: 影片標題
    :param description: 影片描述
    :return: (分類, 標籤列表)
    """
    # 使用 utils 模組載入詞典並設置 jieba 分詞
    setup_jieba_dict()
    
    # 合併文本
    full_text = f"{title} {description}"
    
    # 使用結巴分詞
    jieba.setLogLevel(20)  # 設定日誌級別，抑制結巴的輸出信息
            
    words = jieba.cut(full_text)
    
    # 過濾停用詞
    stopwords = ["的", "了", "和", "是", "在", "我們", "您", "與", "為", "以", "及", "或", "你", "我", "他", "她", "它", "此", "該"]
    filtered_words = [word for word in words if len(word) > 1 and word not in stopwords]
    
    # 計算詞頻
    word_counts = Counter(filtered_words)
    
    # 確定分類
    category_scores = {cat: 0 for cat in VIDEO_CATEGORIES}
    
    for cat, keywords in VIDEO_CATEGORIES.items():
        for keyword in keywords:
            if keyword in full_text:
                category_scores[cat] += full_text.count(keyword)
    
    # 選取得分最高的分類
    if any(score > 0 for score in category_scores.values()):
        category = max(category_scores.items(), key=lambda x: x[1])[0]
    else:
        # 默認分類
        category = "tax"
    
    # 生成標籤 (從高頻詞中選取)
    tags = []
    for word, count in word_counts.most_common(15):
        if len(word) > 1 and len(tags) < 5:
            tags.append(word)
    
    # 確保至少有3個標籤
    if len(tags) < 3:
        default_tags_for_category = {
            "tax": ["稅務", "報稅", "節稅"],
            "accounting": ["會計", "財務", "記帳"],
            "business": ["企業", "經營", "管理"],
            "tutorial": ["教學", "操作", "使用"]
        }
        
        # 添加預設標籤
        default_tags = default_tags_for_category.get(category, ["財稅", "專業", "服務"])
        for tag in default_tags:
            if tag not in tags:
                tags.append(tag)
                if len(tags) >= 3:
                    break
    
    return category, tags

def update_videos_json(videos: List[Dict[str, Any]]) -> bool:
    """
    更新影片JSON文件
    :param videos: 影片列表
    :return: 是否成功
    """
    # 檢查資料夾是否存在
    os.makedirs(os.path.dirname(VIDEOS_JSON_PATH), exist_ok=True)
    
    # 計算總頁數
    total_videos = len(videos)
    total_pages = max(1, (total_videos + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
    
    # 構建完整的JSON數據
    data = {
        "videos": videos,
        "pagination": {
            "total": total_videos,
            "totalPages": total_pages,
            "itemsPerPage": ITEMS_PER_PAGE
        }
    }
    
    try:
        # 寫入JSON文件
        with open(VIDEOS_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"成功更新影片數據：{VIDEOS_JSON_PATH}")
        print(f"總影片數：{total_videos}，總頁數：{total_pages}")
        return True
    except Exception as e:
        print(f"更新影片數據時出錯：{str(e)}")
        return False

def check_videos_txt_deleted() -> bool:
    """
    檢查 videos.txt 是否已被刪除
    :return: True如果被刪除, False如果仍存在
    """
    # 檢查 git 歷史記錄中是否有刪除 videos.txt 的紀錄
    try:
        import subprocess
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=D", "HEAD~1", "HEAD"],
            capture_output=True,
            text=True,
            check=False
        )
        deleted_files = result.stdout.strip().split('\n')
        
        if "video/videos.txt" in deleted_files:
            print("檢測到 videos.txt 已被刪除")
            return True
        return False
    except Exception as e:
        print(f"檢查 videos.txt 刪除狀態時出錯: {str(e)}")
        return False

def main():
    """主函數"""
    print("開始更新影片數據...")
    
    # 使用 utils 模組載入詞典
    tw_dict = load_translation_dict()
    
    # 檢查是否有詞典檔案
    if tw_dict:
        print(f"詞典包含 {len(tw_dict)} 個詞彙")
    else:
        print("詞典檔案不存在或為空")
        print("將使用默認分詞方式處理標題與描述")
    
    # 檢查是否 videos.txt 已被刪除
    is_deleted = check_videos_txt_deleted()
    
    # 載入影片信息
    videos = load_videos_from_txt(VIDEOS_TXT_PATH)
    print(f"從 {VIDEOS_TXT_PATH} 載入了 {len(videos)} 部影片")
    
    # 顯示影片信息，包括新增的SEO欄位
    for i, video in enumerate(videos, 1):
        print(f"影片 #{i}: {video.get('title')}")
        print(f"  - 分類: {video.get('category')}")
        print(f"  - 影片ID: {video.get('videoId', '未提取')}")
        print(f"  - 縮圖URL: {video.get('thumbnailUrl', '未生成')}")
    
    # 更新JSON
    if videos:
        success = update_videos_json(videos)
        if success:
            print("影片數據更新成功")
        else:
            print("影片數據更新失敗")
    else:
        if is_deleted or not os.path.exists(VIDEOS_TXT_PATH) or os.path.getsize(VIDEOS_TXT_PATH) == 0:
            print("沒有找到影片數據或 videos.txt 已被刪除，將清空影片JSON")
            # 創建空的影片數據
            empty_data = {
                "videos": [],
                "pagination": {
                    "total": 0,
                    "totalPages": 1,
                    "itemsPerPage": ITEMS_PER_PAGE
                }
            }
            # 寫入空的JSON數據
            os.makedirs(os.path.dirname(VIDEOS_JSON_PATH), exist_ok=True)
            with open(VIDEOS_JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump(empty_data, f, ensure_ascii=False, indent=2)
            print("已清空影片數據")
        else:
            print("沒有找到有效的影片數據，不進行更新")

if __name__ == "__main__":
    main()