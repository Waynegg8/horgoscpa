#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
增強版Word內容提取器 - 保留完整格式和結構信息
"""

import re
import docx
from docx.opc.exceptions import PackageNotFoundError
from docx.enum.text import WD_BREAK
from loguru import logger

class EnhancedWordExtractor:
    """增強版Word文檔內容提取器"""
    
    def __init__(self):
        """初始化提取器"""
        pass
    
    def extract_document_content(self, doc_path):
        """
        提取Word文檔的完整內容，保留格式信息
        
        Args:
            doc_path: Word文檔路徑
            
        Returns:
            list: 增強的段落內容列表，包含格式信息  
        """
        try:
            doc = docx.Document(doc_path)
        except PackageNotFoundError:
            raise ValueError(f"無法讀取 Word 文檔: {doc_path}")
        
        enhanced_content = []
        
        for i, para in enumerate(doc.paragraphs):
            if not para.text.strip():
                continue
                
            # 提取段落的完整信息
            para_info = self._extract_paragraph_info(para, i)
            if para_info:
                enhanced_content.append(para_info)
                
        return enhanced_content
    
    def _extract_paragraph_info(self, para, index):
        """
        提取段落的詳細信息
        
        Args:
            para: docx段落對象
            index: 段落索引
            
        Returns:
            dict: 段落信息字典
        """
        if not para.text.strip():
            return None
            
        # 基本信息
        para_info = {
            'index': index,
            'raw_text': para.text,
            'clean_text': para.text.strip(),
            'style_name': para.style.name if para.style else 'Normal',
            'is_heading': False,
            'heading_level': 0,
            'is_list_item': False,
            'list_level': 0,
            'has_bold': False,
            'has_italic': False,
            'formatted_text': '',
            'paragraph_format': {}
        }
        
        # 檢查是否為標題
        if para.style and para.style.name.startswith('Heading'):
            para_info['is_heading'] = True
            para_info['heading_level'] = int(para.style.name.split()[-1]) if para.style.name.split()[-1].isdigit() else 1
        
        # 檢查段落格式
        if para._element.pPr is not None:
            # 檢查編號列表
            numPr = para._element.pPr.numPr
            if numPr is not None:
                para_info['is_list_item'] = True
                # 獲取列表層級
                if numPr.ilvl is not None:
                    para_info['list_level'] = int(numPr.ilvl.val)
        
        # 提取格式化文本（保留粗體、斜體等）
        para_info['formatted_text'] = self._extract_formatted_text(para)
        
        # 分析文本結構
        para_info.update(self._analyze_text_structure(para.text.strip()))
        
        return para_info
    
    def _extract_formatted_text(self, para):
        """
        提取段落的格式化文本，保留粗體、斜體等格式
        
        Args:
            para: docx段落對象
            
        Returns:
            str: 格式化的文本（使用markdown標記）
        """
        formatted_parts = []
        
        for run in para.runs:
            if not run.text:
                continue
                
            text = run.text
            
            # 檢查格式
            if run.bold and run.italic:
                text = f"***{text}***"
            elif run.bold:
                text = f"**{text}**"
            elif run.italic:
                text = f"*{text}*"
            elif run.underline:
                text = f"__{text}__"
                
            formatted_parts.append(text)
        
        return ''.join(formatted_parts)
    
    def _analyze_text_structure(self, text):
        """
        分析文本結構，識別特殊模式
        
        Args:
            text: 原始文本
            
        Returns:
            dict: 結構分析結果
        """
        analysis = {
            'is_chinese_numbered_title': False,
            'is_arabic_numbered_title': False,
            'is_date_range_item': False,
            'is_tax_schedule_item': False,
            'is_bold_title': False,
            'chinese_number': '',
            'arabic_number': '',
            'date_range': '',
            'title_text': '',
            'description': ''
        }
        
        # 檢查中文數字標題 (一、二、三、...)
        chinese_title_match = re.match(r'^([一二三四五六七八九十]+)、(.+)$', text)
        if chinese_title_match:
            analysis['is_chinese_numbered_title'] = True
            analysis['chinese_number'] = chinese_title_match.group(1)
            analysis['title_text'] = chinese_title_match.group(2).strip()
        
        # 檢查阿拉伯數字標題 (1. 2. 3. ...) - 排除日期
        arabic_title_match = re.match(r'^(\d+)\.?\s+([^月日年\d].+)$', text)
        if arabic_title_match and not re.search(r'\d+月|\d+日|\d+年', text[:10]):
            analysis['is_arabic_numbered_title'] = True
            analysis['arabic_number'] = arabic_title_match.group(1)
            analysis['title_text'] = arabic_title_match.group(2).strip()
        
        # 檢查日期範圍項目 (1月1日至2月5日：...)  
        date_range_match = re.match(r'^(\d{1,2}月\d{1,2}日(?:至\d{1,2}月\d{1,2}日)?)[：:](.+)$', text)
        if date_range_match:
            analysis['is_date_range_item'] = True
            analysis['date_range'] = date_range_match.group(1)
            analysis['description'] = date_range_match.group(2).strip()
        
        # 檢查稅務期程項目 (包含"申報"、"繳納"、"開徵"等關鍵字)
        if any(keyword in text for keyword in ['申報', '繳納', '開徵', '截止', '前5日', '前10日', '前15日']):
            analysis['is_tax_schedule_item'] = True
        
        # 檢查粗體標題 (**文字** 或已識別的粗體)
        bold_match = re.match(r'^\*\*(.+)\*\*$', text)
        if bold_match:
            analysis['is_bold_title'] = True
            analysis['title_text'] = bold_match.group(1).strip()
        
        return analysis

class EnhancedWordProcessor:
    """增強版Word處理器 - 整合提取器"""
    
    def __init__(self):
        self.extractor = EnhancedWordExtractor()
    
    def extract_content(self, doc_path):
        """
        提取Word文檔內容
        
        Args:
            doc_path: Word文檔路徑
            
        Returns:
            dict: 包含增強內容信息的字典
        """
        # 使用增強提取器
        enhanced_paragraphs = self.extractor.extract_document_content(doc_path)
        
        # 轉換為原有格式，同時保留增強信息
        content_list = []
        enhanced_info = []
        
        for para_info in enhanced_paragraphs:
            # 使用格式化文本（保留粗體等格式）
            text_to_use = para_info['formatted_text'] if para_info['formatted_text'] else para_info['clean_text']
            content_list.append(text_to_use)
            enhanced_info.append(para_info)
        
        # 統計信息
        stats = {
            'total_paragraphs': len(enhanced_paragraphs),
            'headings_count': sum(1 for p in enhanced_paragraphs if p['is_heading']),
            'list_items_count': sum(1 for p in enhanced_paragraphs if p['is_list_item']),
            'chinese_titles_count': sum(1 for p in enhanced_paragraphs if p['is_chinese_numbered_title']),
            'arabic_titles_count': sum(1 for p in enhanced_paragraphs if p['is_arabic_numbered_title']),
            'date_items_count': sum(1 for p in enhanced_paragraphs if p['is_date_range_item']),
            'tax_schedule_items_count': sum(1 for p in enhanced_paragraphs if p['is_tax_schedule_item'])
        }
        
        logger.info(f"文檔提取統計: {stats}")
        
        # 提取标题 - 从第一个有内容的段落
        title = "未命名文档"
        for para in enhanced_paragraphs:
            if para['clean_text'].strip():
                # 优先使用标题格式的段落
                if para.get('is_heading') or para.get('is_chinese_numbered_title') or para.get('is_bold_title'):
                    title = para['clean_text'].strip()
                    break
                # 否则使用第一个非空段落
                elif len(para['clean_text'].strip()) > 10:
                    title = para['clean_text'].strip()
                    if len(title) > 100:
                        title = title[:100] + "..."
                    break
        
        # 从文件名提取日期和其他信息
        from pathlib import Path
        import re
        
        file_name = Path(doc_path).stem
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', file_name)
        date = date_match.group(1) if date_match else None
        
        # 提取系列信息
        is_series = False
        series_name = ""
        episode = 0
        series_match = re.match(r'^\d{4}-\d{2}-\d{2}-(.+?)EP(\d+)-', file_name)
        if series_match:
            is_series = True
            series_name = series_match.group(1)
            episode = int(series_match.group(2))
        
        # 生成摘要
        summary = ""
        if len(content_list) > 0:
            # 从前几个段落生成摘要
            summary_parts = []
            for content in content_list[:5]:
                if content.strip() and not content.startswith('**'):  # 跳过标题
                    summary_parts.append(content.strip())
                    if len(' '.join(summary_parts)) > 200:
                        break
            summary = ' '.join(summary_parts)
            if len(summary) > 300:
                summary = summary[:297] + "..."
        
        result = {
            'content': content_list,  # 原有格式兼容
            'enhanced_paragraphs': enhanced_info,  # 增強信息
            'extraction_stats': stats,  # 統計信息
            'title': title,
            'date': date,
            'filename': Path(doc_path).name,
            'summary': summary,
            'is_series': is_series,
            'series_name': series_name,
            'episode': episode
        }
        
        # 如果是系列文章，生成series_slug
        if is_series:
            series_slug = re.sub(r'[^\w\s-]', '', series_name.lower())
            series_slug = re.sub(r'[-\s]+', '-', series_slug).strip('-')
            result['series_slug'] = series_slug
        
        return result