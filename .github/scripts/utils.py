#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
霍爾果斯會計師事務所網站共用工具模組
包含各Python腳本共用的函數與設定
"""

import os
import json
import jieba
from typing import Dict, Any, List

# 獲取專案根目錄（假設腳本在 .github/scripts 目錄下）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

# 共用路徑設定
BLOG_DIR = os.path.join(PROJECT_ROOT, "blog")  # 博客文章目錄
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")  # 資產目錄
JSON_DATA_DIR = os.path.join(ASSETS_DIR, "data")  # JSON數據目錄
BLOG_POSTS_JSON = os.path.join(JSON_DATA_DIR, "blog-posts.json")  # 所有文章JSON
LATEST_POSTS_JSON = os.path.join(JSON_DATA_DIR, "latest-posts.json")  # 最新文章JSON
VIDEOS_JSON = os.path.join(JSON_DATA_DIR, "videos.json")  # 影片JSON

# 財稅專業詞彙詞典路徑
TRANSLATION_DICT_FILE = os.path.join(PROJECT_ROOT, "tw_financial_dict.json")  # 台灣財稅專業詞彙詞典

# 分類映射表
CATEGORY_MAPPING = {
    "稅務相關": "tax",
    "會計記帳": "accounting",
    "企業經營": "business",
    "企業登記": "business",
    "創業資訊": "startup",
    "財務規劃": "financial",
    "法律知識": "legal"
}

# 設置停用詞
STOPWORDS = ["的", "了", "和", "是", "在", "我們", "您", "與", "為", "以", "及", "或", "你", 
             "我", "他", "她", "它", "此", "該", "所", "以", "於", "因為", "所以", "如果", 
             "這", "那", "這個", "那個", "如何", "通常", "一般", "之", "所以"]

def load_translation_dict(dict_path=TRANSLATION_DICT_FILE):
    """
    載入翻譯詞典
    :param dict_path: 詞典檔案路徑
    :return: 詞典字典對象
    """
    if os.path.exists(dict_path):
        try:
            with open(dict_path, 'r', encoding='utf-8') as f:
                dict_data = json.load(f)
                print(f"已載入詞典: {dict_path}，包含 {len(dict_data)} 個詞彙")
                return dict_data
        except Exception as e:
            print(f"載入詞典時出錯: {str(e)}")
    else:
        print(f"詞典檔案不存在: {dict_path}")
    return {}

def setup_jieba_dict():
    """
    設置結巴分詞詞典
    :return: None
    """
    # 載入詞典，將專業詞彙添加到結巴詞典中
    tw_dict = load_translation_dict()
    
    # 設置jieba不要輸出日誌信息
    jieba.setLogLevel(20)
    
    # 添加財稅專業詞彙到結巴詞典
    if tw_dict:
        for word in tw_dict.keys():
            jieba.add_word(word)
        print("已將詞典詞彙添加到分詞系統")

def extract_keywords(text: str, top_n: int = 5) -> List[str]:
    """
    從文本中提取關鍵詞
    :param text: 文本內容
    :param top_n: 提取多少個關鍵詞
    :return: 關鍵詞列表
    """
    # 確保jieba已經載入詞典
    setup_jieba_dict()
    
    # 切分詞彙
    words = jieba.cut(text)
    
    # 過濾停用詞與單字詞
    filtered_words = [word for word in words if len(word) > 1 and word not in STOPWORDS]
    
    # 計算詞頻
    word_freq = {}
    for word in filtered_words:
        if word in word_freq:
            word_freq[word] += 1
        else:
            word_freq[word] = 1
    
    # 按照詞頻排序
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    
    # 返回前N個關鍵詞
    keywords = [word for word, freq in sorted_words[:top_n]]
    
    return keywords

def ensure_dir_exists(directory_path: str) -> bool:
    """
    確保指定目錄存在，如果不存在則創建
    :param directory_path: 目錄路徑
    :return: 是否成功
    """
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        print(f"創建目錄時出錯: {str(e)}")
        return False

def load_json_file(file_path: str) -> Dict[str, Any]:
    """
    載入 JSON 文件
    :param file_path: JSON文件路徑
    :return: JSON數據字典
    """
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"載入JSON文件時出錯 ({file_path}): {str(e)}")
    return {}

def save_json_file(file_path: str, data: Dict[str, Any]) -> bool:
    """
    保存 JSON 文件
    :param file_path: JSON文件路徑
    :param data: 要保存的數據
    :return: 是否成功
    """
    try:
        # 確保目錄存在
        ensure_dir_exists(os.path.dirname(file_path))
        
        # 寫入文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存JSON文件時出錯 ({file_path}): {str(e)}")
        return False

# 初始化：確保必要的目錄存在
ensure_dir_exists(BLOG_DIR)
ensure_dir_exists(JSON_DATA_DIR)

# 初始化：載入詞典到jieba
if os.path.exists(TRANSLATION_DICT_FILE):
    setup_jieba_dict()
else:
    print(f"警告: 詞典文件不存在 ({TRANSLATION_DICT_FILE})，將使用默認分詞方式")