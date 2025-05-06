#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
霍爾果斯會計師事務所網站共用工具模組
包含各Python腳本共用的函數與設定
"""

import os
import json
import jieba
import re
import datetime
import logging
from typing import Dict, Any, List, Tuple

# 設置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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

def slugify(text: str, translation_dict: dict = None) -> str:
    """
    將文本轉換為 URL 友好的格式
    :param text: 要轉換的文本
    :param translation_dict: 翻譯字典（可選）
    :return: URL 友好的字符串
    """
    logger.debug(f"開始處理標題URL化: {text}")
    
    # 如果沒有提供翻譯字典，加載默認字典
    if translation_dict is None:
        translation_dict = load_translation_dict()
    
    # 內建基本字典作為備用
    base_replacements = {
        '台灣': 'taiwan',
        '創業': 'startup',
        '指南': 'guide',
        '會計': 'accounting',
        '會計師': 'accountant',
        '角色': 'role',
        '價值': 'value',
        '財務': 'finance',
        '稅務': 'tax',
        '申報': 'filing',
        '公司': 'company',
        '規劃': 'planning',
        '管理': 'management',
        '合夥人': 'partner',
        '初期': 'early-stage',
        '資本': 'capital',
        '貸款': 'loan',
        '銀行': 'bank',
        '必知': 'essential',
        '老闆': 'boss',
        '勞工': 'labor',
        '設定': 'setting',
        '攻略': 'guide',
        '法規': 'regulations',
        '全攻略': 'complete-guide',
        '選擇': 'choice',
        '發票': 'invoice',
        '所得稅': 'income-tax',
        '營業稅': 'business-tax',
        '制度': 'system',
        '登記': 'registration',
        '簽證': 'certificate',
        '組織': 'organization',
        '型態': 'type',
        '行號': 'business-entity',
        '營業': 'business'
    }
    
    # 使用 jieba 分詞分割文本
    jieba.setLogLevel(20)  # 抑制 jieba 日誌
    words = list(jieba.cut(text))
    logger.debug(f"分詞結果: {words}")
    
    slug = text.lower()
    replaced_words = set()  # 記錄已替換的詞彙，避免重複
    
    # 優先使用翻譯字典進行替換，按詞彙長度排序
    if translation_dict:
        logger.info("使用翻譯字典進行轉換")
        sorted_dict = sorted(translation_dict.items(), key=lambda x: len(x[0]), reverse=True)
        
        for zh, en in sorted_dict:
            zh_lower = zh.lower()
            if zh_lower in slug and zh_lower not in replaced_words:
                slug = slug.replace(zh_lower, f"{en}-")
                replaced_words.add(zh_lower)
                logger.debug(f"使用翻譯字典替換: {zh} -> {en}")
    
    # 使用基本替換字典進行補充
    logger.info("使用基本替換進行轉換")
    for zh, en in base_replacements.items():
        zh_lower = zh.lower()
        if zh_lower in slug and zh_lower not in replaced_words:
            slug = slug.replace(zh_lower, f"{en}-")
            replaced_words.add(zh_lower)
            logger.debug(f"使用基本替換: {zh} -> {en}")
    
    # 清理特殊字符，但保留數字和點（如 2.0）
    slug = re.sub(r'[^\w\s.-]', '', slug)
    # 將空格轉換為連字符
    slug = re.sub(r'[\s_]+', '-', slug)
    # 移除開頭和結尾的連字符
    slug = re.sub(r'^-+|-+$', '', slug)
    # 移除重複的連字符
    slug = re.sub(r'-+', '-', slug)
    
    # 移除非 ASCII 字符，但保留數字和點
    ascii_slug = ''
    for c in slug:
        if ord(c) < 128 or c in '0123456789.':
            ascii_slug += c
    slug = ascii_slug
    
    # 再次確保結尾沒有連字符
    if slug.endswith('-'):
        slug = slug[:-1]
    
    # 如果處理後為空，使用默認值
    if not slug:
        logger.warning("處理後的標題為空，使用默認值'article'")
        slug = "article"
    
    # 截斷過長的 slug
    if len(slug) > 80:
        slug = slug[:80]
        if slug.endswith('-'):
            slug = slug[:-1]
        logger.info("標題過長，已截斷")
    
    logger.debug(f"處理後的URL: {slug}")
    return slug

def extract_series_info(filename: str) -> Tuple[bool, str, str, str, str]:
    """
    從文件名提取系列信息
    :param filename: 文件名（例如：2025-02-03-系列名稱EP1-文章標題.html）
    :return: (是否為系列, 系列名稱, 集數, 日期, 標題)
    """
    # 移除.html後綴
    name_without_ext = os.path.splitext(os.path.basename(filename))[0]
    
    # 提取日期
    date_match = re.search(r'^(\d{4}-\d{2}-\d{2})', name_without_ext)
    date = date_match.group(1) if date_match else None
    
    # 檢查是否為系列文章
    series_match = re.search(r'-([^-]+)EP(\d+)-', name_without_ext)
    
    if series_match:
        series_name = series_match.group(1)
        episode = series_match.group(2)
        
        # 提取標題（系列名稱和集數之後的部分）
        title_match = re.search(r'EP\d+-(.+)$', name_without_ext)
        title = title_match.group(1) if title_match else ""
        
        return True, series_name, episode, date, title
    else:
        # 非系列文章，提取標題（日期之後的部分）
        title_match = re.search(r'^\d{4}-\d{2}-\d{2}-(.+)$', name_without_ext)
        title = title_match.group(1) if title_match else name_without_ext
        
        return False, None, None, date, title

# 初始化：確保必要的目錄存在
ensure_dir_exists(BLOG_DIR)
ensure_dir_exists(JSON_DATA_DIR)

# 初始化：載入詞典到jieba
if os.path.exists(TRANSLATION_DICT_FILE):
    setup_jieba_dict()
else:
    print(f"警告: 詞典文件不存在 ({TRANSLATION_DICT_FILE})，將使用默認分詞方式")
```