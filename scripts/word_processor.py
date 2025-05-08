#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Word 處理及翻譯模組
負責掃描、讀取 Word 文檔、提取內容並進行翻譯處理
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from loguru import logger
import docx
from docx.opc.exceptions import PackageNotFoundError

from utils import parse_filename, read_json, write_json
from translator import get_translator  # 引入翻譯器

class WordProcessor:
    """Word 文檔處理類"""
    
    def __init__(self, word_dir="word-docs", processed_dir=None, translation_dict_file=None, api_key=None):
        """
        初始化 Word 處理器
        
        Args:
            word_dir: Word 文檔目錄
            processed_dir: 處理後的 Word 文檔目錄
            translation_dict_file: 翻譯字典文件路徑
            api_key: DeepL API 密鑰，默認從環境變數 DEEPL_API_KEY 讀取
        """
        self.word_dir = Path(word_dir)
        self.processed_dir = Path(processed_dir or os.path.join(word_dir, "processed"))
        self.translation_dict_file = Path(translation_dict_file or "assets/data/translation_dict.json")
        self.processed_files_file = Path("assets/data/processed_files.json")
        
        # 確保目錄存在
        self.word_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.translation_dict_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化翻譯器
        self.translator = get_translator(self.translation_dict_file, api_key)
        
        # 載入已處理文件記錄
        self.processed_files = read_json(self.processed_files_file, default={"files": []})
        if "files" not in self.processed_files:
            self.processed_files["files"] = []
    
    def scan_documents(self, process_all=False, process_date=None, current_date=None):
        """
        掃描 Word 文檔目錄，獲取需要處理的文檔清單
        
        Args:
            process_all: 是否處理所有文件，忽略日期限制
            process_date: 指定處理特定日期的文件
            current_date: 當前日期，默認為今天
            
        Returns:
            list: 需要處理的文檔路徑列表
        """
        if current_date is None:
            current_date = datetime.now().date()
        
        documents = []
        
        # 支持的 Word 文檔擴展名
        word_extensions = [".docx", ".doc"]
        
        # 掃描目錄
        for file in self.word_dir.glob("*"):
            # 跳過目錄
            if file.is_dir():
                continue
            
            # 檢查擴展名
            if file.suffix.lower() not in word_extensions:
                continue
            
            # 檢查是否已處理
            if str(file) in self.processed_files["files"]:
                logger.debug(f"跳過已處理文件: {file}")
                continue
            
            # 解析檔名獲取日期
            file_info = parse_filename(file.name)
            if not file_info:
                logger.warning(f"無法解析檔名: {file.name}，跳過處理")
                continue
            
            # 解析文件日期
            try:
                file_date = datetime.strptime(file_info["date"], "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"檔名中的日期格式無效: {file_info['date']}，跳過處理")
                continue
            
            # 根據日期過濾文件
            if process_all:
                # 處理所有文件
                documents.append(file)
            elif process_date:
                # 處理特定日期的文件
                if file_date == process_date:
                    documents.append(file)
            else:
                # 只處理日期不晚於當天的文件
                if file_date <= current_date:
                    documents.append(file)
        
        return documents
    
    def extract_content(self, doc_path):
        """
        提取 Word 文檔內容
        
        Args:
            doc_path: Word 文檔路徑
            
        Returns:
            dict: 包含文檔內容和元數據的字典
        """
        doc_path = Path(doc_path)
        
        # 解析檔名
        file_info = parse_filename(doc_path.name)
        if not file_info:
            raise ValueError(f"無法解析檔名: {doc_path.name}")
        
        # 讀取 Word 文檔
        try:
            doc = docx.Document(doc_path)
        except PackageNotFoundError:
            raise ValueError(f"無法讀取 Word 文檔: {doc_path}，可能是舊版格式或損壞")
        
        # 提取標題（第一個段落）
        title = doc.paragraphs[0].text.strip() if doc.paragraphs else file_info["title"]
        
        # 提取內容
        content = []
        for i, para in enumerate(doc.paragraphs):
            # 跳過空段落
            if not para.text.strip():
                continue
            
            # 跳過標題（已經提取）
            if i == 0 and para.text.strip() == title:
                continue
            
            # 收集段落內容
            content.append(para.text)
        
        # 提取摘要（使用前兩段）
        summary = ""
        if content:
            summary = content[0]
            if len(content) > 1:
                summary += " " + content[1]
            summary = summary[:200] + "..." if len(summary) > 200 else summary
        
        # 組織結果
        result = {
            "filename": doc_path.name,
            "original_filename": doc_path.name,  # 保存原始檔名
            "file_info": file_info,
            "title": title,
            "content": content,
            "summary": summary,
            "date": file_info["date"]
        }
        
        # 如果是系列文章，添加相關信息
        if file_info.get("is_series", False):
            result["is_series"] = True
            result["series_name"] = file_info["series_name"]
            result["episode"] = file_info["episode"]
        else:
            result["is_series"] = False
        
        return result
    
    def translate_keywords(self, text, update_dict=True):
        """
        翻譯關鍵詞，用於生成 URL
        
        Args:
            text: 要翻譯的文本
            update_dict: 是否更新翻譯字典
            
        Returns:
            str: 翻譯後的文本
        """
        # 使用翻譯器進行翻譯
        result = self.translator.translate(text, clean_url=True)
        logger.debug(f"翻譯: {text} -> {result}")
        return result
    
    def translate_batch(self, texts):
        """
        批量翻譯文本
        
        Args:
            texts: 要翻譯的文本列表
            
        Returns:
            list: 翻譯後的文本列表
        """
        return self.translator.translate_batch(texts, clean_url=True)
    
    def generate_meta_keywords(self, doc_info, category=None, tags=None):
        """
        生成 META 關鍵詞
        
        Args:
            doc_info: 文檔信息
            category: 分類
            tags: 標籤
            
        Returns:
            dict: 中英文對照的 META 關鍵詞
        """
        keywords = []
        
        # 添加標題關鍵詞
        keywords.append(doc_info["title"])
        
        # 添加分類關鍵詞
        if category and "name" in category:
            keywords.append(category["name"])
        
        # 添加標籤關鍵詞
        if tags:
            for tag in tags:
                if "name" in tag:
                    keywords.append(tag["name"])
        
        # 如果是系列文章，添加系列名稱
        if doc_info.get("is_series", False) and "series_name" in doc_info:
            keywords.append(doc_info["series_name"])
        
        # 去除重複
        keywords = list(set(keywords))
        
        # 批量翻譯
        en_keywords = self.translate_batch(keywords)
        
        # 組合結果
        result = {
            "zh": ", ".join(keywords),
            "en": ", ".join(en_keywords)
        }
        
        return result
    
    def generate_seo_url(self, doc_info):
        """
        生成 SEO 友善的 URL
        
        Args:
            doc_info: 文檔信息字典
            
        Returns:
            str: SEO 友善的 URL
        """
        # 提取日期
        date = doc_info["date"]
        
        # 生成 URL 組件
        url_components = [date]
        
        # 如果是系列文章，添加系列信息
        if doc_info.get("is_series", False):
            series_url = self.translate_keywords(doc_info["series_name"])
            url_components.append(series_url)
            url_components.append(f"ep{doc_info['episode']}")
        
        # 添加標題
        title_url = self.translate_keywords(doc_info["title"])
        url_components.append(title_url)
        
        # 組合 URL
        url = "-".join(url_components)
        
        # 確保 URL 的唯一性（這裡可以添加檢查邏輯）
        # 截斷過長的 URL
        if len(url) > 100:
            url = url[:100]
            # 確保不以連字符結尾
            url = url.rstrip("-")
        
        return url
    
    def move_processed_file(self, doc_path):
        """
        移動處理過的文件到 processed 目錄
        
        Args:
            doc_path: 文件路徑
            
        Returns:
            Path: 移動後的文件路徑
        """
        doc_path = Path(doc_path)
        target_path = self.processed_dir / doc_path.name
        
        # 移動文件
        shutil.move(str(doc_path), str(target_path))
        
        # 更新已處理文件記錄
        if str(doc_path) not in self.processed_files["files"]:
            self.processed_files["files"].append(str(doc_path))
            write_json(self.processed_files_file, self.processed_files)
        
        return target_path
    
    def process_document(self, doc_path):
        """
        處理單個 Word 文檔
        
        Args:
            doc_path: Word 文檔路徑
            
        Returns:
            dict: 處理結果字典
        """
        # 提取內容
        doc_info = self.extract_content(doc_path)
        
        # 生成 SEO URL
        doc_info["url"] = self.generate_seo_url(doc_info)
        
        # 移動處理過的文件
        processed_path = self.move_processed_file(doc_path)
        doc_info["processed_path"] = str(processed_path)
        
        # 記錄翻譯使用的統計信息
        translation_stats = self.translator.get_stats()
        doc_info["translation_stats"] = {
            "total_translations": translation_stats["total_translations"],
            "cache_hits": translation_stats["cache_hits"],
            "dictionary_size": translation_stats["dictionary_size"]
        }
        
        return doc_info
    
    def get_translation_stats(self):
        """
        獲取翻譯統計信息
        
        Returns:
            dict: 翻譯統計信息
        """
        return self.translator.get_stats()