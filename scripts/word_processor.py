#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Word 處理及翻譯模組
負責掃描、讀取 Word 文檔、提取內容並進行翻譯處理
"""

import os
import re
import shutil
from datetime import datetime, timedelta
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
        skipped_current_future = []
        
        # 支持的 Word 文檔擴展名
        word_extensions = [".docx", ".doc"]
        
        # 掃描目錄
        logger.info(f"開始掃描文件夾: {self.word_dir}, 當前日期: {current_date}, 處理模式: {'所有文件' if process_all else '特定日期限制'}")
        
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
                logger.info(f"處理所有文件: {file.name}")
                documents.append(file)
            elif process_date:
                # 處理特定日期的文件
                if file_date == process_date:
                    logger.info(f"處理特定日期文件: {file.name}, 日期: {file_date}")
                    documents.append(file)
            else:
                # 修改: 處理當天及更早的文件（只排除未來日期的文件）
                if file_date <= current_date:
                    logger.info(f"處理當天或更早日期的文件: {file.name}, 日期: {file_date}, 當前日期: {current_date}")
                    documents.append(file)
                else:
                    logger.warning(f"跳過未來日期的文件: {file.name}, 日期: {file_date}, 當前日期: {current_date}")
                    skipped_current_future.append(str(file))
        
        if skipped_current_future:
            logger.warning(f"跳過了{len(skipped_current_future)}個未來日期的文件: {', '.join(skipped_current_future)}")
        
        logger.info(f"掃描完成，找到{len(documents)}個需要處理的文件")
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
            "date": file_info["date"],
            "source_path": str(doc_path)  # 保存原始文件路徑
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
        
        # 初始化 URL 組件列表
        url_components = [date]
        
        # 獲取分類(如果存在)並添加到組件中
        category_slug = doc_info.get("category", "")
        if category_slug:
            url_components.append(category_slug)
        
        # 處理系列文章
        if doc_info.get("is_series", False):
            # 翻譯系列名稱並限制長度
            series_name = doc_info.get("series_name", "")
            if series_name:
                series_url = self.translate_keywords(series_name)
                
                # 限制系列名稱長度，只取前面2個關鍵詞
                series_words = series_url.split('-')
                if len(series_words) > 2:
                    series_url = '-'.join(series_words[:2])
                
                url_components.append(series_url)
            
            # 添加集數標識
            url_components.append(f"ep{doc_info['episode']}")
        
        # 翻譯標題並限制為2-3個關鍵詞
        title = doc_info.get("title", "")
        if title:
            title_url = self.translate_keywords(title)
            
            # 取前3個關鍵詞
            title_words = title_url.split('-')
            if len(title_words) > 3:
                title_url = '-'.join(title_words[:3])
            
            url_components.append(title_url)
        
        # 組合 URL
        url = "-".join(url_components)
        
        # 確保 URL 長度適當
        max_url_length = 70  # 降低最大長度限制
        if len(url) > max_url_length:
            # 保留必要組件
            essential_parts = [date]  # 日期必須保留
            
            # 添加分類(如果有)
            if category_slug:
                essential_parts.append(category_slug)
            
            # 如果是系列文章，保留系列標識(縮短)和集數
            if doc_info.get("is_series", False):
                # 取系列簡稱 - 如果有系列URL
                series_url = series_url if 'series_url' in locals() else ""
                if series_url and len(series_url.split('-')) > 0:
                    essential_parts.append(series_url.split('-')[0])
                
                # 添加集數
                essential_parts.append(f"ep{doc_info['episode']}")
            
            # 構建必要部分
            essential_url = "-".join(essential_parts)
            
            # 為標題保留空間
            remaining_length = max_url_length - len(essential_url) - 1  # -1 為連字符
            
            if remaining_length > 5 and title_words:
                # 取標題最重要的關鍵詞
                title_part = title_words[0]
                if len(title_part) > remaining_length:
                    title_part = title_part[:remaining_length]
                url = f"{essential_url}-{title_part}"
            else:
                # 空間不足，只用必要部分
                url = essential_url
        
        # 確保不以連字符結尾
        url = url.rstrip("-")
        
        return url
    
    def prepare_document(self, doc_path):
        """
        準備文檔處理，提取內容和生成SEO URL，但不移動文件
        
        Args:
            doc_path: Word 文檔路徑
            
        Returns:
            dict: 文檔信息字典
        """
        try:
            # 提取內容
            doc_info = self.extract_content(doc_path)
            
            # 生成 SEO URL
            doc_info["url"] = self.generate_seo_url(doc_info)
            
            # 記錄翻譯使用的統計信息
            translation_stats = self.translator.get_stats()
            doc_info["translation_stats"] = {
                "total_translations": translation_stats["total_translations"],
                "cache_hits": translation_stats["cache_hits"],
                "dictionary_size": translation_stats["dictionary_size"]
            }
            
            # 標記為準備就緒
            doc_info["prepared"] = True
            
            logger.info(f"文檔準備完成: {doc_path}")
            return doc_info
            
        except Exception as e:
            logger.error(f"準備文檔時出錯: {doc_path} - {str(e)}")
            return {
                "prepared": False,
                "error": str(e),
                "source_path": str(doc_path)
            }
    
    def mark_as_processed(self, doc_path):
        """
        將文件標記為已處理，但不移動文件
        
        Args:
            doc_path: 文件路徑
            
        Returns:
            bool: 是否成功標記
        """
        doc_path_str = str(Path(doc_path))
        
        if doc_path_str not in self.processed_files["files"]:
            self.processed_files["files"].append(doc_path_str)
            write_json(self.processed_files_file, self.processed_files)
            logger.info(f"文件已標記為已處理: {doc_path}")
            return True
        else:
            logger.info(f"文件已經被標記為已處理: {doc_path}")
            return False
    
    def move_processed_file(self, doc_path):
        """
        移動處理過的文件到 processed 目錄並標記為已處理
        
        Args:
            doc_path: 文件路徑
            
        Returns:
            Path: 移動後的文件路徑
        """
        doc_path = Path(doc_path)
        target_path = self.processed_dir / doc_path.name
        
        try:
            # 確保目標目錄存在
            self.processed_dir.mkdir(parents=True, exist_ok=True)
            
            # 檢查文件是否存在
            if not doc_path.exists():
                logger.error(f"要移動的文件不存在: {doc_path}")
                return None
            
            # 檢查目標路徑是否已存在文件
            if target_path.exists():
                logger.warning(f"目標路徑已存在文件: {target_path}，將生成新的文件名")
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                target_path = self.processed_dir / f"{doc_path.stem}_{timestamp}{doc_path.suffix}"
            
            # 移動文件
            logger.info(f"移動已處理文件: {doc_path} -> {target_path}")
            shutil.move(str(doc_path), str(target_path))
            
            # 標記為已處理
            self.mark_as_processed(doc_path)
            
            return target_path
            
        except Exception as e:
            logger.error(f"移動文件時出錯: {doc_path} -> {target_path} - {str(e)}")
            return None
    
    def finalize_document_processing(self, doc_info, success=True):
        """
        完成文檔處理，如果成功則移動文件
        
        Args:
            doc_info: 文檔信息字典
            success: 處理是否成功
            
        Returns:
            dict: 更新後的文檔信息字典
        """
        if not success:
            logger.warning(f"文檔處理失敗，不移動文件: {doc_info.get('source_path', '未知文件')}")
            doc_info["processed"] = False
            return doc_info
        
        # 從doc_info中獲取原始文件路徑
        source_path = doc_info.get("source_path")
        if not source_path:
            logger.error("文檔信息中缺少源文件路徑")
            doc_info["processed"] = False
            return doc_info
        
        # 移動文件
        processed_path = self.move_processed_file(source_path)
        if processed_path:
            doc_info["processed_path"] = str(processed_path)
            doc_info["processed"] = True
            logger.info(f"文件處理成功並已移動: {source_path} -> {processed_path}")
        else:
            doc_info["processed"] = False
            logger.error(f"移動文件失敗: {source_path}")
        
        return doc_info
    
    def get_translation_stats(self):
        """
        獲取翻譯統計信息
        
        Returns:
            dict: 翻譯統計信息
        """
        return self.translator.get_stats()