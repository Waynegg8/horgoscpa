#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
整合重構組件的WordProcessor - 改進版
新增智能URL生成和更好的標題提取邏輯
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
    """整合重構組件的Word處理器 - 改進版"""
    
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
        
        # 🔧 改進的標題提取
        title = self._extract_smart_title(enhanced_paragraphs, file_info)
        
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
    
    def _extract_smart_title(self, enhanced_paragraphs, file_info):
        """
        🔧 智能提取文檔標題 - 改進版
        優先順序：
        1. 第一個標題級別段落
        2. 第一個粗體段落
        3. 第一個中文編號標題
        4. 第一個非空段落
        5. 檔名中的標題
        
        Args:
            enhanced_paragraphs: 增強段落信息
            file_info: 文件信息
            
        Returns:
            str: 文檔標題
        """
        
        # 策略1: 查找真正的標題級別
        for para in enhanced_paragraphs[:3]:  # 只在前3個段落中查找
            if para.get('is_heading') and para['clean_text'].strip():
                title = para['clean_text'].strip()
                title = self._clean_title_text(title)
                if len(title) > 5:  # 標題長度合理
                    logger.info(f"找到標題級別標題: {title}")
                    return title
        
        # 策略2: 查找粗體段落
        for para in enhanced_paragraphs[:5]:
            if para.get('is_bold_title') and para.get('title_text'):
                title = para['title_text'].strip()
                title = self._clean_title_text(title)
                if len(title) > 5:
                    logger.info(f"找到粗體標題: {title}")
                    return title
            
            # 檢查格式化文本中的粗體
            formatted_text = para.get('formatted_text', '')
            if formatted_text.startswith('**') and formatted_text.endswith('**'):
                title = formatted_text[2:-2].strip()
                title = self._clean_title_text(title)
                if len(title) > 5:
                    logger.info(f"找到格式化粗體標題: {title}")
                    return title
        
        # 策略3: 查找中文編號標題
        for para in enhanced_paragraphs[:5]:
            if para.get('is_chinese_numbered_title') and para.get('title_text'):
                title = para['title_text'].strip()
                title = self._clean_title_text(title)
                if len(title) > 5:
                    logger.info(f"找到中文編號標題: {title}")
                    return title
        
        # 策略4: 第一個有實質內容的段落
        for para in enhanced_paragraphs[:3]:
            if para['clean_text'].strip():
                text = para['clean_text'].strip()
                # 排除明顯不是標題的內容
                if not self._is_likely_content_paragraph(text):
                    title = self._clean_title_text(text)
                    if 8 <= len(title) <= 100:  # 標題長度合理
                        logger.info(f"使用第一個段落作為標題: {title}")
                        return title
        
        # 策略5: 使用檔名中的標題
        filename_title = file_info.get("title", "")
        if filename_title:
            logger.info(f"使用檔名標題: {filename_title}")
            return filename_title
            
        logger.warning("無法提取到合適的標題，使用預設標題")
        return "未命名文檔"
    
    def _clean_title_text(self, text):
        """清理標題文本"""
        if not text:
            return ""
        
        # 移除格式標記
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        text = re.sub(r'__(.*?)__', r'\1', text)
        
        # 移除多餘空白
        text = ' '.join(text.split())
        
        # 移除開頭的編號
        text = re.sub(r'^[一二三四五六七八九十]+、', '', text)
        text = re.sub(r'^\d+\.?\s*', '', text)
        
        return text.strip()
    
    def _is_likely_content_paragraph(self, text):
        """判斷是否為內容段落而非標題"""
        # 太長的通常是內容
        if len(text) > 100:
            return True
        
        # 包含句號的通常是內容
        if '。' in text or '.' in text:
            return True
        
        # 包含日期格式的通常是內容
        if re.search(r'\d{4}年\d{1,2}月\d{1,2}日', text):
            return True
            
        return False
    
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
        for para in enhanced_paragraphs[:8]:  # 檢查前8個段落
            if (not para.get('is_heading') and 
                not para.get('is_chinese_numbered_title') and 
                not para.get('is_arabic_numbered_title') and
                not para.get('is_bold_title') and
                len(para['clean_text'].strip()) > 25):  # 至少25個字符
                
                text = para['clean_text'].strip()
                # 移除格式標記
                text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
                text = re.sub(r'\*(.*?)\*', r'\1', text)
                
                # 排除純數字、日期等
                if not re.match(r'^[\d\s\-月日年：:]+$', text):
                    summary_parts.append(text)
                    if len(' '.join(summary_parts)) > 200:  # 摘要長度控制
                        break
        
        if summary_parts:
            summary = ' '.join(summary_parts)
            return summary[:300] + "..." if len(summary) > 300 else summary
        
        return ""
    
    # 🔧 全新的URL生成邏輯
    def generate_seo_url(self, doc_info):
        """
        🔧 生成SEO友善的URL - 完全重寫版
        使用語義化翻譯而非逐詞翻譯
        """
        date = doc_info["date"]
        url_components = [date]
        
        # 獲取分類slug
        category_slug = doc_info.get("category", "")
        if category_slug and len(category_slug) <= 15:
            url_components.append(category_slug)
        
        # 處理系列文章
        if doc_info.get("is_series", False):
            series_name = doc_info.get("series_name", "")
            if series_name:
                series_slug = self._generate_semantic_slug(series_name, max_words=2)
                if series_slug:
                    url_components.append(series_slug)
            url_components.append(f"ep{doc_info['episode']}")
        
        # 🔧 核心改進：標題的語義化處理
        title = doc_info.get("title", "")
        if title:
            title_slug = self._generate_semantic_slug(title, max_words=4, is_title=True)
            if title_slug:
                url_components.append(title_slug)
        
        # 組合URL
        url = "-".join(filter(None, url_components))
        
        # 確保URL長度合理 (SEO最佳實踐: 50-60字符)
        if len(url) > 55:
            url = self._optimize_url_length(url, date, category_slug, doc_info)
        
        logger.info(f"生成SEO URL: {url}")
        return url.rstrip("-")
    
    def _generate_semantic_slug(self, text, max_words=3, is_title=False):
        """
        🔧 生成語義化slug - 核心改進方法
        使用整句理解而非逐詞翻譯
        """
        if not text or not text.strip():
            return ""
        
        # 預處理：提取關鍵概念
        cleaned_text = self._extract_key_concepts(text)
        
        if not cleaned_text:
            cleaned_text = text.strip()
        
        # 🔧 關鍵改進：使用整句翻譯
        try:
            # 構建更好的翻譯提示
            translation_prompt = cleaned_text
            if is_title:
                # 對標題進行更精準的翻譯
                translated_text = self.translator.translate(translation_prompt, clean_url=True)
            else:
                translated_text = self.translator.translate(translation_prompt, clean_url=True)
            
            # 進一步優化slug
            slug = self._optimize_slug_for_seo(translated_text, max_words)
            
            logger.debug(f"語義翻譯: '{text}' -> '{translated_text}' -> '{slug}'")
            return slug
            
        except Exception as e:
            logger.warning(f"翻譯失敗，使用備用方法: {e}")
            # 備用方法：直接處理中文
            return self._fallback_slug_generation(text, max_words)
    
    def _extract_key_concepts(self, text):
        """
        🔧 提取文本關鍵概念
        移除無意義的詞彙，保留核心概念
        """
        if not text:
            return ""
        
        # 移除常見的無意義前綴/後綴
        text = re.sub(r'^(關於|有關|針對|對於)', '', text)
        text = re.sub(r'(的說明|的介紹|的分析|的探討|的研究)$', '', text)
        
        # 移除日期表達
        text = re.sub(r'\d{4}年\d{1,2}月\d{1,2}日', '', text)
        text = re.sub(r'\d{1,2}月\d{1,2}日', '', text)
        
        # 移除多餘的標點符號
        text = re.sub(r'[：:；;，,。.！!？?]+', ' ', text)
        
        # 移除多餘空白
        text = ' '.join(text.split())
        
        return text.strip()
    
    def _optimize_slug_for_seo(self, translated_text, max_words=3):
        """
        🔧 為SEO優化slug
        移除SEO不友好的詞彙，保留關鍵詞
        """
        if not translated_text:
            return ""
        
        # 轉為小寫
        text = translated_text.lower()
        
        # 🔧 更全面的SEO不友好詞彙清單
        seo_stop_words = {
            # 英文停用詞
            'of', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 
            'after', 'above', 'below', 'between', 'among', 'throughout', 'despite',
            'the', 'a', 'an', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 
            'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
            # 常見連接詞
            'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom',
            # 其他無SEO價值的詞
            'some', 'any', 'many', 'much', 'most', 'more', 'less', 'few', 'several',
            'all', 'both', 'each', 'every', 'other', 'another', 'such', 'same',
            'own', 'very', 'just', 'now', 'here', 'there', 'then', 'than'
        }
        
        # 提取有意義的單詞
        words = re.findall(r'[a-zA-Z0-9]+', text)
        
        # 過濾停用詞，保留有價值的關鍵詞
        meaningful_words = []
        for word in words:
            if (len(word) >= 3 and  # 至少3個字符
                word not in seo_stop_words and  # 不是停用詞
                not word.isdigit()):  # 不是純數字
                meaningful_words.append(word)
            elif len(word) == 2 and word.isalnum() and word not in ['of', 'in', 'on', 'at', 'to', 'by', 'or']:
                # 保留有意義的2字符詞（如縮寫）
                meaningful_words.append(word)
        
        # 如果過濾後沒有詞，使用原始詞的前幾個
        if not meaningful_words:
            meaningful_words = [w for w in words if len(w) >= 3][:max_words]
        
        # 限制詞數
        if len(meaningful_words) > max_words:
            meaningful_words = meaningful_words[:max_words]
        
        return '-'.join(meaningful_words) if meaningful_words else ""
    
    def _fallback_slug_generation(self, text, max_words=3):
        """
        備用的slug生成方法（當翻譯失敗時使用）
        """
        # 使用拼音或其他方法
        # 這裡可以集成pypinyin等庫
        # 暫時返回簡化處理
        words = text.split()[:max_words]
        return '-'.join([re.sub(r'[^\w]', '', word) for word in words if word.strip()])
    
    def _optimize_url_length(self, url, date, category_slug, doc_info):
        """
        🔧 優化URL長度 - 確保SEO友好
        """
        max_url_length = 55  # SEO最佳長度
        
        if len(url) <= max_url_length:
            return url
        
        # 重新構建精簡版URL
        essential_parts = [date]
        
        # 分類（如果不太長）
        if category_slug and len(category_slug) <= 10:
            essential_parts.append(category_slug)
        
        # 系列信息精簡處理
        if doc_info.get("is_series", False):
            series_name = doc_info.get("series_name", "")
            if series_name:
                # 只取系列名稱的第一個關鍵詞
                series_slug = self._generate_semantic_slug(series_name, max_words=1)
                if series_slug and len(series_slug) <= 8:
                    essential_parts.append(series_slug)
            essential_parts.append(f"ep{doc_info['episode']}")
        
        # 計算標題可用空間
        base_url = "-".join(essential_parts)
        remaining_space = max_url_length - len(base_url) - 1
        
        # 為標題生成精簡slug
        title = doc_info.get("title", "")
        if title and remaining_space > 8:
            title_slug = self._generate_semantic_slug(title, max_words=2, is_title=True)
            if title_slug and len(title_slug) <= remaining_space:
                return f"{base_url}-{title_slug}"
        
        return base_url
    
    # 🔧 新增：高級語義URL生成（可選）
    def generate_advanced_semantic_url(self, doc_info):
        """
        🔧 高級語義URL生成
        基於文檔內容分析生成更有意義的URL
        """
        date = doc_info["date"]
        
        # 分析文檔內容主題
        title = doc_info.get("title", "")
        summary = doc_info.get("summary", "")
        
        # 結合標題和摘要進行主題分析
        content_for_analysis = f"{title}. {summary[:100]}".strip()
        
        # 提取主題關鍵詞
        theme_keywords = self._extract_document_themes(content_for_analysis)
        
        # 構建URL
        url_parts = [date]
        
        category_slug = doc_info.get("category", "")
        if category_slug and len(category_slug) <= 10:
            url_parts.append(category_slug)
        
        if doc_info.get("is_series", False):
            url_parts.append(f"ep{doc_info['episode']}")
        
        # 使用主題關鍵詞
        if theme_keywords:
            theme_slug = '-'.join(theme_keywords[:3])  # 最多3個主題詞
            url_parts.append(theme_slug)
        else:
            # 回退到標準方法
            title_slug = self._generate_semantic_slug(title, max_words=3, is_title=True)
            if title_slug:
                url_parts.append(title_slug)
        
        url = "-".join(filter(None, url_parts))
        
        # 確保長度合適
        if len(url) > 55:
            url = url[:55].rstrip('-')
        
        return url
    
    def _extract_document_themes(self, content):
        """
        從文檔內容中提取主題關鍵詞
        這裡可以使用更sophisticated的NLP技術
        """
        if not content:
            return []
        
        # 簡單的主題提取邏輯
        # 在實際應用中可以使用jieba、BERT等工具
        
        # 移除無意義的詞語
        content = re.sub(r'[的、了、是、在、和、與、或、但、而且、然而、因此、所以、由於]', ' ', content)
        
        # 提取名詞性詞語（簡單規則）
        potential_keywords = re.findall(r'[\u4e00-\u9fff]{2,}', content)
        
        # 過濾和排序
        keyword_freq = {}
        for keyword in potential_keywords:
            if len(keyword) >= 2 and len(keyword) <= 8:
                keyword_freq[keyword] = keyword_freq.get(keyword, 0) + 1
        
        # 返回頻率最高的關鍵詞
        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        
        # 翻譯前3個關鍵詞
        top_keywords = [kw[0] for kw in sorted_keywords[:3]]
        
        if top_keywords:
            try:
                translated_keywords = []
                for keyword in top_keywords:
                    translated = self.translator.translate(keyword, clean_url=True)
                    if translated and len(translated) <= 15:
                        # 進一步清理
                        cleaned = self._optimize_slug_for_seo(translated, max_words=1)
                        if cleaned:
                            translated_keywords.append(cleaned)
                
                return translated_keywords[:2]  # 最多返回2個
                
            except Exception as e:
                logger.warning(f"主題詞翻譯失敗: {e}")
        
        return []
    
    # 保持原有的其他方法不變...
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
    
    def prepare_document(self, doc_path):
        """準備文檔處理"""
        try:
            doc_info = self.extract_content(doc_path)
            
            # 🔧 使用改進的URL生成
            doc_info["url"] = self.generate_seo_url(doc_info)
            
            # 可選：也生成高級語義URL供參考
            doc_info["semantic_url"] = self.generate_advanced_semantic_url(doc_info)
            
            translation_stats = self.translator.get_stats()
            doc_info["translation_stats"] = {
                "total_translations": translation_stats["total_translations"],
                "cache_hits": translation_stats["cache_hits"],
                "dictionary_size": translation_stats["dictionary_size"]
            }
            
            doc_info["prepared"] = True
            logger.success(f"✅ 文檔準備完成: {doc_path}")
            logger.info(f"🔗 生成URL: {doc_info['url']}")
            logger.info(f"🎯 語義URL: {doc_info['semantic_url']}")
            
            return doc_info
            
        except Exception as e:
            logger.error(f"❌ 準備文檔時出錯: {doc_path} - {str(e)}")
            return {
                "prepared": False,
                "error": str(e),
                "source_path": str(doc_path)
            }
    
    # 其他方法保持不變...
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