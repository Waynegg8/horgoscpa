#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
整合重構組件的WordProcessor - 替換原有的HTMLContentProcessor
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from loguru import logger
import docx
from docx.opc.exceptions import PackageNotFoundError

# 導入我們的新組件
from enhanced_word_extractor import EnhancedWordExtractor, EnhancedWordProcessor
from comprehensive_html_processor import ComprehensiveHTMLProcessor

from utils import parse_filename, read_json, write_json
from translator import get_translator

class IntegratedWordProcessor:
    """整合重構組件的Word處理器"""
    
    def __init__(self, word_dir="word-docs", processed_dir=None, translation_dict_file=None, api_key=None):
        """
        初始化整合的Word處理器
        
        Args:
            word_dir: Word文檔目錄
            processed_dir: 處理後的Word文檔目錄
            translation_dict_file: 翻譯字典文件路徑
            api_key: DeepL API密鑰
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
        
        # 🔧 使用新的增強組件
        self.enhanced_processor = EnhancedWordProcessor()
        self.html_processor = ComprehensiveHTMLProcessor()
        
        # 載入已處理文件記錄
        self.processed_files = read_json(self.processed_files_file, default={"files": []})
        if "files" not in self.processed_files:
            self.processed_files["files"] = []
        
        logger.info("✅ 已初始化整合的Word處理器 - 使用增強版組件")
    
    def scan_documents(self, process_all=False, process_date=None, current_date=None):
        """掃描Word文檔目錄，獲取需要處理的文檔清單"""
        if current_date is None:
            current_date = datetime.now().date()
        
        documents = []
        skipped_current_future = []
        
        # 支持的Word文檔擴展名
        word_extensions = [".docx", ".doc"]
        
        logger.info(f"開始掃描文件夾: {self.word_dir}, 當前日期: {current_date}")
        
        for file in self.word_dir.glob("*"):
            if file.is_dir():
                continue
            
            if file.suffix.lower() not in word_extensions:
                continue
            
            if str(file) in self.processed_files["files"]:
                logger.debug(f"跳過已處理文件: {file}")
                continue
            
            file_info = parse_filename(file.name)
            if not file_info:
                logger.warning(f"無法解析檔名: {file.name}")
                continue
            
            try:
                file_date = datetime.strptime(file_info["date"], "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"檔名中的日期格式無效: {file_info['date']}")
                continue
            
            if process_all:
                documents.append(file)
            elif process_date:
                if file_date == process_date:
                    documents.append(file)
            else:
                if file_date <= current_date:
                    documents.append(file)
                else:
                    skipped_current_future.append(str(file))
        
        if skipped_current_future:
            logger.warning(f"跳過了{len(skipped_current_future)}個未來日期的文件")
        
        logger.info(f"掃描完成，找到{len(documents)}個需要處理的文件")
        return documents
    
    def extract_content(self, doc_path):
        """
        使用增強版處理器提取Word文檔內容
        
        Args:
            doc_path: Word文檔路徑
            
        Returns:
            dict: 包含增強內容和HTML的字典
        """
        doc_path = Path(doc_path)
        
        # 解析檔名
        file_info = parse_filename(doc_path.name)
        if not file_info:
            raise ValueError(f"無法解析檔名: {doc_path.name}")
        
        logger.info(f"🔄 開始提取文檔內容: {doc_path.name}")
        
        # 🔧 使用增強版提取器
        try:
            enhanced_data = self.enhanced_processor.extract_content(doc_path)
        except Exception as e:
            logger.error(f"增強提取失敗: {e}")
            raise ValueError(f"無法讀取Word文檔: {doc_path} - {str(e)}")
        
        # 提取基本信息
        content = enhanced_data['content']
        enhanced_paragraphs = enhanced_data['enhanced_paragraphs']
        extraction_stats = enhanced_data['extraction_stats']
        
        # 🔧 使用新的HTML處理器
        logger.info("🔄 開始HTML處理...")
        processed_html = self.html_processor.process_enhanced_content(enhanced_data)
        
        # 提取標題
        title = self._extract_title(enhanced_paragraphs, file_info)
        
        # 生成摘要
        summary = self._generate_summary(enhanced_paragraphs)
        
        # 組織結果
        result = {
            "filename": doc_path.name,
            "original_filename": doc_path.name,
            "file_info": file_info,
            "title": title,
            "content": content,  # 原有格式兼容
            "enhanced_paragraphs": enhanced_paragraphs,  # 增強信息
            "processed_html": processed_html,  # 🔧 使用新的HTML處理結果
            "summary": summary,
            "date": file_info["date"],
            "source_path": str(doc_path),
            "extraction_stats": extraction_stats,  # 提取統計
            "processing_version": "enhanced_v2"  # 標記處理版本
        }
        
        # 系列文章信息
        if file_info.get("is_series", False):
            result["is_series"] = True
            result["series_name"] = file_info["series_name"]
            result["episode"] = file_info["episode"]
        else:
            result["is_series"] = False
        
        logger.success(f"✅ 文檔內容提取完成")
        logger.info(f"📊 提取統計: {extraction_stats}")
        logger.info(f"📝 HTML內容長度: {len(processed_html)} 字符")
        
        return result
    
    def _extract_title(self, enhanced_paragraphs, file_info):
        """
        從增強段落中提取標題
        
        Args:
            enhanced_paragraphs: 增強段落信息
            file_info: 文件信息
            
        Returns:
            str: 文檔標題
        """
        # 查找第一個非空段落作為標題
        for para in enhanced_paragraphs:
            if para['clean_text'].strip():
                # 移除可能的粗體標記
                title = para['clean_text'].strip()
                title = re.sub(r'^\*\*(.*)\*\*$', r'\1', title)
                return title
        
        # 如果沒找到，使用檔名中的標題
        return file_info["title"]
    
    def _generate_summary(self, enhanced_paragraphs):
        """
        從增強段落中生成摘要
        
        Args:
            enhanced_paragraphs: 增強段落信息
            
        Returns:
            str: 文檔摘要
        """
        summary_parts = []
        
        # 找前幾個非標題段落作為摘要
        for para in enhanced_paragraphs[:5]:  # 檢查前5個段落
            if (not para.get('is_heading') and 
                not para.get('is_chinese_numbered_title') and 
                not para.get('is_arabic_numbered_title') and
                len(para['clean_text'].strip()) > 20):  # 至少20個字符
                
                text = para['clean_text'].strip()
                # 移除格式標記
                text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
                text = re.sub(r'\*(.*?)\*', r'\1', text)
                
                summary_parts.append(text)
                if len(' '.join(summary_parts)) > 150:  # 摘要長度控制
                    break
        
        if summary_parts:
            summary = ' '.join(summary_parts)
            return summary[:200] + "..." if len(summary) > 200 else summary
        
        return ""
    
    # 以下方法保持與原有WordProcessor兼容
    def translate_keywords(self, text, update_dict=True):
        """翻譯關鍵詞"""
        result = self.translator.translate(text, clean_url=True)
        logger.debug(f"翻譯: {text} -> {result}")
        return result
    
    def translate_batch(self, texts):
        """批量翻譯文本"""
        return self.translator.translate_batch(texts, clean_url=True)
    
    def generate_meta_keywords(self, doc_info, category=None, tags=None):
        """生成META關鍵詞"""
        keywords = []
        
        keywords.append(doc_info["title"])
        
        if category and "name" in category:
            keywords.append(category["name"])
        
        if tags:
            for tag in tags:
                if "name" in tag:
                    keywords.append(tag["name"])
        
        if doc_info.get("is_series", False) and "series_name" in doc_info:
            keywords.append(doc_info["series_name"])
        
        keywords = list(set(keywords))
        en_keywords = self.translate_batch(keywords)
        
        return {
            "zh": ", ".join(keywords),
            "en": ", ".join(en_keywords)
        }
    
    def generate_seo_url(self, doc_info):
        """生成SEO友善的URL"""
        date = doc_info["date"]
        url_components = [date]
        
        category_slug = doc_info.get("category", "")
        if category_slug:
            url_components.append(category_slug)
        
        if doc_info.get("is_series", False):
            series_name = doc_info.get("series_name", "")
            if series_name:
                series_url = self.translate_keywords(series_name)
                series_words = series_url.split('-')
                if len(series_words) > 2:
                    series_url = '-'.join(series_words[:2])
                url_components.append(series_url)
            url_components.append(f"ep{doc_info['episode']}")
        
        title = doc_info.get("title", "")
        if title:
            title_url = self.translate_keywords(title)
            title_words = title_url.split('-')
            if len(title_words) > 3:
                title_url = '-'.join(title_words[:3])
            url_components.append(title_url)
        
        url = "-".join(url_components)
        
        max_url_length = 70
        if len(url) > max_url_length:
            essential_parts = [date]
            if category_slug:
                essential_parts.append(category_slug)
            if doc_info.get("is_series", False):
                if 'series_url' in locals() and series_url.split('-'):
                    essential_parts.append(series_url.split('-')[0])
                essential_parts.append(f"ep{doc_info['episode']}")
            
            essential_url = "-".join(essential_parts)
            remaining_length = max_url_length - len(essential_url) - 1
            
            if remaining_length > 5 and 'title_words' in locals() and title_words:
                title_part = title_words[0]
                if len(title_part) > remaining_length:
                    title_part = title_part[:remaining_length]
                url = f"{essential_url}-{title_part}"
            else:
                url = essential_url
        
        return url.rstrip("-")
    
    def prepare_document(self, doc_path):
        """準備文檔處理"""
        try:
            doc_info = self.extract_content(doc_path)
            doc_info["url"] = self.generate_seo_url(doc_info)
            
            translation_stats = self.translator.get_stats()
            doc_info["translation_stats"] = {
                "total_translations": translation_stats["total_translations"],
                "cache_hits": translation_stats["cache_hits"],
                "dictionary_size": translation_stats["dictionary_size"]
            }
            
            doc_info["prepared"] = True
            logger.success(f"✅ 文檔準備完成: {doc_path}")
            return doc_info
            
        except Exception as e:
            logger.error(f"❌ 準備文檔時出錯: {doc_path} - {str(e)}")
            return {
                "prepared": False,
                "error": str(e),
                "source_path": str(doc_path)
            }
    
    def mark_as_processed(self, doc_path):
        """標記文件為已處理"""
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
        """移動處理過的文件到processed目錄"""
        doc_path = Path(doc_path)
        target_path = self.processed_dir / doc_path.name
        
        try:
            self.processed_dir.mkdir(parents=True, exist_ok=True)
            
            if not doc_path.exists():
                logger.error(f"要移動的文件不存在: {doc_path}")
                return None
            
            if target_path.exists():
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                target_path = self.processed_dir / f"{doc_path.stem}_{timestamp}{doc_path.suffix}"
            
            logger.info(f"移動已處理文件: {doc_path} -> {target_path}")
            shutil.move(str(doc_path), str(target_path))
            
            self.mark_as_processed(doc_path)
            return target_path
            
        except Exception as e:
            logger.error(f"移動文件時出錯: {doc_path} -> {target_path} - {str(e)}")
            return None
    
    def finalize_document_processing(self, doc_info, success=True):
        """完成文檔處理"""
        if not success:
            logger.warning(f"文檔處理失敗: {doc_info.get('source_path', '未知文件')}")
            doc_info["processed"] = False
            return doc_info
        
        source_path = doc_info.get("source_path")
        if not source_path:
            logger.error("文檔信息中缺少源文件路徑")
            doc_info["processed"] = False
            return doc_info
        
        processed_path = self.move_processed_file(source_path)
        if processed_path:
            doc_info["processed_path"] = str(processed_path)
            doc_info["processed"] = True
            logger.success(f"✅ 文件處理成功: {source_path} -> {processed_path}")
        else:
            doc_info["processed"] = False
            logger.error(f"❌ 移動文件失敗: {source_path}")
        
        return doc_info
    
    def get_translation_stats(self):
        """獲取翻譯統計信息"""
        return self.translator.get_stats()