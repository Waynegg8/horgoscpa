#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
共用工具函數
提供系統中各模組共用的工具函數
"""

import os
import json
import logging
import re
from pathlib import Path
from datetime import datetime
from loguru import logger

def setup_logging(log_level=logging.INFO):
    """
    設置日誌系統
    
    Args:
        log_level: 日誌級別，預設為 INFO
        
    Returns:
        logger: 設置好的 logger 物件
    """
    # 移除所有處理器
    logger.remove()
    
    # 添加控制台處理器
    logger.add(
        sink=lambda msg: print(msg, end=''),
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    # 添加文件處理器
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / f"process_{datetime.now().strftime('%Y%m%d')}.log"
    logger.add(
        sink=log_file,
        rotation="500 MB",
        retention="10 days",
        level=log_level,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )
    
    return logger

def ensure_directories(directories):
    """
    確保所需目錄存在，如不存在則創建
    
    Args:
        directories: 字典，包含目錄名稱和路徑
    """
    for name, path in directories.items():
        dir_path = Path(path)
        if not dir_path.exists():
            logger.info(f"創建目錄: {path}")
            dir_path.mkdir(parents=True, exist_ok=True)

def read_json(file_path, default=None):
    """
    讀取 JSON 文件
    
    Args:
        file_path: JSON 文件路徑
        default: 如果文件不存在或讀取失敗時返回的默認值
        
    Returns:
        dict: JSON 文件內容，或默認值
    """
    path = Path(file_path)
    if not path.exists():
        return default if default is not None else {}
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"讀取 JSON 文件 {file_path} 失敗: {e}")
        return default if default is not None else {}

def write_json(file_path, data, indent=2):
    """
    寫入 JSON 文件
    
    Args:
        file_path: JSON 文件路徑
        data: 要寫入的數據
        indent: 縮進空格數，預設為 2
    """
    path = Path(file_path)
    
    # 確保目錄存在
    path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=indent)
    except Exception as e:
        logger.error(f"寫入 JSON 文件 {file_path} 失敗: {e}")
        raise

def parse_filename(filename):
    """
    解析文件名，獲取日期、系列信息和標題
    
    Args:
        filename: 文件名
        
    Returns:
        dict: 包含解析結果的字典
    """
    # 移除文件擴展名
    name_without_ext = os.path.splitext(filename)[0]
    
    # 系列文章格式: YYYY-MM-DD-系列名稱EP數字-文章標題
    series_pattern = r'^(\d{4}-\d{2}-\d{2})-(.+)EP(\d+)-(.+)$'
    
    # 非系列文章格式: YYYY-MM-DD-文章標題
    normal_pattern = r'^(\d{4}-\d{2}-\d{2})-(.+)$'
    
    # 嘗試匹配系列文章格式
    series_match = re.match(series_pattern, name_without_ext)
    if series_match:
        date_str, series_name, episode_str, title = series_match.groups()
        return {
            'date': date_str,
            'is_series': True,
            'series_name': series_name,
            'episode': int(episode_str),
            'title': title
        }
    
    # 嘗試匹配非系列文章格式
    normal_match = re.match(normal_pattern, name_without_ext)
    if normal_match:
        date_str, title = normal_match.groups()
        return {
            'date': date_str,
            'is_series': False,
            'title': title
        }
    
    # 如果都不匹配，返回 None
    return None

def sanitize_filename(text):
    """
    清理文件名，移除不合法字符
    
    Args:
        text: 要清理的文本
        
    Returns:
        str: 清理後的文本
    """
    # 移除不合法的文件名字符
    # 在 Windows 上，文件名不能包含以下字符: \ / : * ? " < > |
    illegal_chars = r'[\\/:*?"<>|]'
    return re.sub(illegal_chars, '', text)