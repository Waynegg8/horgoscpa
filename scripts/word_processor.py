#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
改進版 Word 處理及翻譯模組
優化 URL 生成邏輯，讓 URL 更能表達文章標題意涵
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
from translator import get_translator

class ImprovedWordProcessor:
    """改進版 Word 文檔處理類"""
    
    def __init__(self, word_dir="word-docs", processed_dir=None, translation_dict_file=None, api_key=None):
        """
        初始化改進版 Word 處理器
        
        Args:
            word_dir: Word 文檔目錄
            processed_dir: 處理後的 Word 文檔目錄
            translation_dict_file: 翻譯字典文件路徑
            api_key: DeepL API 密鑰
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
        
        # 載入關鍵詞映射表
        self.keyword_mappings = self._load_keyword_mappings()
    
    def _load_keyword_mappings(self):
        """
        載入中英文關鍵詞映射表
        
        Returns:
            dict: 關鍵詞映射字典
        """
        mappings_file = Path("assets/data/keyword_mappings.json")
        
        # 預設的關鍵詞映射
        default_mappings = {
            # 稅務相關
            "稅務": "tax",
            "稅法": "tax-law",
            "稅務規劃": "tax-planning",
            "節稅": "tax-saving",
            "避稅": "tax-avoidance",
            "稅務申報": "tax-filing",
            "遺產稅": "estate-tax",
            "贈與稅": "gift-tax",
            "所得稅": "income-tax",
            "營業稅": "business-tax",
            "房屋稅": "house-tax",
            "地價稅": "land-value-tax",
            "印花稅": "stamp-tax",
            
            # 保險相關
            "保險": "insurance",
            "人壽保險": "life-insurance",
            "保險給付": "insurance-benefit",
            "保險規劃": "insurance-planning",
            "保單": "insurance-policy",
            "受益人": "beneficiary",
            "要保人": "policyholder",
            "被保險人": "insured",
            
            # 會計相關
            "會計": "accounting",
            "帳務": "bookkeeping",
            "財務": "finance",
            "審計": "audit",
            "財報": "financial-report",
            "成本": "cost",
            "費用": "expense",
            "收入": "income",
            "資產": "asset",
            "負債": "liability",
            
            # 企業相關
            "企業": "business",
            "公司": "company",
            "工商登記": "business-registration",
            "營運": "operation",
            "投資": "investment",
            "理財": "financial-planning",
            
            # 法規相關
            "法規": "regulation",
            "法律": "law",
            "條文": "clause",
            "辦法": "regulation",
            "準則": "standard",
            "制度": "system",
            "政策": "policy",
            
            # 其他專業詞彙
            "諮詢": "consultation",
            "顧問": "advisory",
            "服務": "service",
            "申請": "application",
            "申報": "filing",
            "處理": "processing",
            "管理": "management",
            "分析": "analysis",
            "評估": "evaluation",
            "規劃": "planning",
            "策略": "strategy",
            "方案": "solution",
            "措施": "measure",
            "注意事項": "considerations",
            "實務": "practice",
            "案例": "case",
            "範例": "example",
            "指南": "guide",
            "手冊": "manual",
            "流程": "process",
            "程序": "procedure",
            "步驟": "steps",
            "方法": "method",
            "技巧": "tips",
            "要點": "key-points",
            "重點": "highlights",
            "總結": "summary",
            "結論": "conclusion"
        }
        
        # 如果映射文件存在，載入並合併
        if mappings_file.exists():
            try:
                custom_mappings = read_json(mappings_file)
                default_mappings.update(custom_mappings)
                logger.info(f"已載入自定義關鍵詞映射: {mappings_file}")
            except Exception as e:
                logger.warning(f"載入自定義關鍵詞映射失敗: {e}，使用預設映射")
        else:
            # 保存預設映射到文件
            write_json(mappings_file, default_mappings)
            logger.info(f"已創建預設關鍵詞映射文件: {mappings_file}")
        
        return default_mappings
    
    def scan_documents(self, process_all=False, process_date=None, current_date=None):
        """
        掃描 Word 文檔目錄（保持與原版相同）
        """
        if current_date is None:
            current_date = datetime.now().date()
        
        documents = []
        skipped_current_future = []
        
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
        
        logger.info(f"找到{len(documents)}個需要處理的文件")
        return documents
    
    def extract_content(self, doc_path):
        """
        提取 Word 文檔內容（保持與原版相同）
        """
        doc_path = Path(doc_path)
        
        file_info = parse_filename(doc_path.name)
        if not file_info:
            raise ValueError(f"無法解析檔名: {doc_path.name}")
        
        try:
            doc = docx.Document(doc_path)
        except PackageNotFoundError:
            raise ValueError(f"無法讀取 Word 文檔: {doc_path}")
        
        title = doc.paragraphs[0].text.strip() if doc.paragraphs else file_info["title"]
        
        content = []
        for i, para in enumerate(doc.paragraphs):
            if not para.text.strip():
                continue
            
            if i == 0 and para.text.strip() == title:
                continue
            
            content.append(para.text)
        
        summary = ""
        if content:
            summary = content[0]
            if len(content) > 1:
                summary += " " + content[1]
            summary = summary[:200] + "..." if len(summary) > 200 else summary
        
        result = {
            "filename": doc_path.name,
            "original_filename": doc_path.name,
            "file_info": file_info,
            "title": title,
            "content": content,
            "summary": summary,
            "date": file_info["date"],
            "source_path": str(doc_path)
        }
        
        if file_info.get("is_series", False):
            result["is_series"] = True
            result["series_name"] = file_info["series_name"]
            result["episode"] = file_info["episode"]
        else:
            result["is_series"] = False
        
        return result
    
    def _extract_meaningful_keywords(self, text):
        """
        從文本中提取有意義的關鍵詞
        
        Args:
            text: 輸入文本
            
        Returns:
            list: 關鍵詞列表
        """
        keywords = []
        
        # 1. 先匹配已知的專業詞彙映射
        for zh_term, en_term in self.keyword_mappings.items():
            if zh_term in text:
                keywords.append((zh_term, en_term))
        
        # 2. 如果關鍵詞不足，使用智能分詞
        if len(keywords) < 3:
            extracted_terms = self._intelligent_term_extraction(text)
            for term in extracted_terms:
                if term not in [k[0] for k in keywords]:
                    # 對未映射的詞彙進行翻譯
                    translated = self.translator.translate(term, clean_url=True)
                    keywords.append((term, translated))
        
        # 3. 去重並限制數量
        unique_keywords = []
        seen_en = set()
        for zh, en in keywords:
            if en not in seen_en and len(unique_keywords) < 5:
                unique_keywords.append((zh, en))
                seen_en.add(en)
        
        return unique_keywords
    
    def _intelligent_term_extraction(self, text):
        """
        智能詞彙提取
        
        Args:
            text: 輸入文本
            
        Returns:
            list: 提取的詞彙列表
        """
        # 移除標點符號
        clean_text = re.sub(r'[^\w\s]', '', text)
        
        # 財稅專業詞彙特徵模式
        professional_patterns = [
            r'\w*稅\w*',     # 包含"稅"的詞
            r'\w*險\w*',     # 包含"險"的詞
            r'\w*務\w*',     # 包含"務"的詞
            r'\w*計\w*',     # 包含"計"的詞
            r'\w*財\w*',     # 包含"財"的詞
            r'\w*法\w*',     # 包含"法"的詞
            r'\w*規\w*',     # 包含"規"的詞
            r'\w*劃\w*',     # 包含"劃"的詞
        ]
        
        extracted_terms = []
        
        # 使用模式匹配提取專業詞彙
        for pattern in professional_patterns:
            matches = re.findall(pattern, clean_text)
            for match in matches:
                if len(match) >= 2 and len(match) <= 6:  # 合理的詞彙長度
                    extracted_terms.append(match)
        
        # 去重並排序（按長度降序，優先選擇較長的詞彙）
        unique_terms = list(set(extracted_terms))
        unique_terms.sort(key=len, reverse=True)
        
        return unique_terms[:5]
    
    def generate_meaningful_url(self, doc_info):
        """
        生成有意義的 SEO 友善 URL
        
        Args:
            doc_info: 文檔信息字典
            
        Returns:
            str: 有意義的 URL
        """
        # 提取日期
        date = doc_info["date"]
        
        # 初始化 URL 組件
        url_components = [date]
        
        # 添加分類（如果存在）
        category_slug = doc_info.get("category", "")
        if category_slug:
            url_components.append(category_slug)
        
        # 處理系列文章
        if doc_info.get("is_series", False):
            series_name = doc_info.get("series_name", "")
            if series_name:
                # 提取系列名稱關鍵詞
                series_keywords = self._extract_meaningful_keywords(series_name)
                if series_keywords:
                    # 使用前兩個關鍵詞
                    series_terms = [kw[1] for kw in series_keywords[:2]]
                    series_url = "-".join(series_terms)
                    url_components.append(series_url)
            
            # 添加集數
            url_components.append(f"ep{doc_info['episode']}")
        
        # 處理標題 - 這是關鍵改進部分
        title = doc_info.get("title", "")
        if title:
            # 提取標題的有意義關鍵詞
            title_keywords = self._extract_meaningful_keywords(title)
            
            # 如果標題關鍵詞不夠，從內容中補充
            if len(title_keywords) < 2 and "content" in doc_info:
                content_text = " ".join(doc_info["content"][:2])  # 前兩段
                content_keywords = self._extract_meaningful_keywords(content_text)
                # 合併但避免重複
                existing_en = [kw[1] for kw in title_keywords]
                for kw in content_keywords:
                    if kw[1] not in existing_en and len(title_keywords) < 4:
                        title_keywords.append(kw)
            
            # 構建標題URL部分
            if title_keywords:
                # 選擇最相關的關鍵詞
                selected_keywords = self._select_best_keywords(title_keywords, title)
                title_url_parts = [kw[1] for kw in selected_keywords]
                title_url = "-".join(title_url_parts)
                url_components.append(title_url)
        
        # 組合URL
        url = "-".join(url_components)
        
        # 清理URL
        url = self._clean_and_optimize_url(url)
        
        return url
    
    def _select_best_keywords(self, keywords, original_title):
        """
        選擇最佳關鍵詞
        
        Args:
            keywords: 關鍵詞列表 [(zh, en), ...]
            original_title: 原始標題
            
        Returns:
            list: 選擇的最佳關鍵詞
        """
        # 按關鍵詞在標題中的重要性排序
        scored_keywords = []
        
        for zh, en in keywords:
            score = 0
            
            # 標題中出現越早，得分越高
            pos = original_title.find(zh)
            if pos >= 0:
                score += max(0, 50 - pos)  # 位置越前面得分越高
            
            # 關鍵詞長度適中得分更高
            if 2 <= len(zh) <= 4:
                score += 10
            
            # 專業詞彙得分更高
            if zh in self.keyword_mappings:
                score += 20
            
            # 常用詞彙稍微降分
            common_words = ["方法", "技巧", "注意", "重點", "分析", "處理"]
            if zh in common_words:
                score -= 5
            
            scored_keywords.append((score, zh, en))
        
        # 按得分排序，選擇前3個
        scored_keywords.sort(key=lambda x: x[0], reverse=True)
        selected = [(zh, en) for score, zh, en in scored_keywords[:3]]
        
        return selected
    
    def _clean_and_optimize_url(self, url):
        """
        清理和優化URL
        
        Args:
            url: 原始URL
            
        Returns:
            str: 優化後的URL
        """
        # 基本清理
        url = url.lower()
        url = re.sub(r'[^\w\s-]', '', url)
        url = re.sub(r'\s+', '-', url.strip())
        url = re.sub(r'-+', '-', url)
        url = url.strip('-')
        
        # 長度優化
        max_length = 80
        if len(url) > max_length:
            # 保留重要部分
            parts = url.split('-')
            
            # 日期必須保留
            essential_parts = [parts[0]]  # 日期
            
            # 保留分類（如果存在）  
            if len(parts) > 1 and len(parts[1]) <= 15:  # 分類通常較短
                essential_parts.append(parts[1])
            
            # 為其他部分保留空間
            used_length = len('-'.join(essential_parts))
            remaining_length = max_length - used_length - 1  # -1 for separator
            
            # 從剩餘部分中選擇最重要的
            remaining_parts = parts[len(essential_parts):]
            for part in remaining_parts:
                if len(part) + 1 <= remaining_length:  # +1 for separator
                    essential_parts.append(part)
                    remaining_length -= len(part) + 1
                else:
                    # 如果部分太長，嘗試縮短
                    if remaining_length > 10:
                        shortened = part[:remaining_length]
                        essential_parts.append(shortened)
                    break
            
            url = '-'.join(essential_parts)
        
        return url
    
    def translate_keywords(self, text, update_dict=True):
        """
        翻譯關鍵詞（保持與原版兼容）
        """
        return self.translator.translate(text, clean_url=True)
    
    def translate_batch(self, texts):
        """
        批量翻譯文本（保持與原版兼容）
        """
        return self.translator.translate_batch(texts, clean_url=True)
    
    def generate_meta_keywords(self, doc_info, category=None, tags=None):
        """
        生成改進的 META 關鍵詞
        """
        keywords = []
        
        # 從標題提取關鍵詞
        title_keywords = self._extract_meaningful_keywords(doc_info["title"])
        keywords.extend([kw[0] for kw in title_keywords])
        
        # 添加分