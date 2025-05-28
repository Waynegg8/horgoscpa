#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
全面重構的HTML內容處理器 - 基於增強的Word提取信息
"""

import re
from typing import List, Dict, Any, Tuple
from loguru import logger

class ComprehensiveHTMLProcessor:
    """全面重構的HTML內容處理器"""
    
    def __init__(self):
        """初始化處理器"""
        # 高亮模式 - 重新排序避免衝突
        self.highlight_patterns = [
            # 1. 法條格式（最高優先級）
            (r'(第\d+條(?:之\d+)?(?:第\d+款)?(?:第\d+項)?(?:規定)?)', 'law-highlight'),
            (r'(所得稅法第\d+條(?:之\d+)?(?:規定)?)', 'law-highlight'),
            
            # 2. 完整日期範圍（高優先級，避免被拆分）
            (r'(\d{1,2}月\d{1,2}日至\d{1,2}月\d{1,2}日)', 'date-highlight'),
            (r'(\d{4}年\d{1,2}月\d{1,2}日)', 'date-highlight'),
            (r'(\d{1,2}月\d{1,2}日)', 'date-highlight'),
            
            # 3. 完整金額表達
            (r'(\d+(?:,\d{3})*萬元)', 'amount-highlight'),
            (r'(\d+(?:,\d{3})*千萬元)', 'amount-highlight'),
            (r'(\d+(?:,\d{3})*億元)', 'amount-highlight'),
            (r'(\d+(?:,\d{3})*元)', 'amount-highlight'),
            
            # 4. 百分比格式
            (r'(\d+(?:\.\d+)?%)', 'percent-highlight'),
            (r'(百分之\d+(?:\.\d+)?)', 'percent-highlight'),
        ]
    
    def process_enhanced_content(self, enhanced_data: Dict[str, Any]) -> str:
        """
        處理增強的Word內容，生成HTML
        
        Args:
            enhanced_data: 來自EnhancedWordProcessor的數據
            
        Returns:
            str: 處理後的HTML內容
        """
        enhanced_paragraphs = enhanced_data.get('enhanced_paragraphs', [])
        stats = enhanced_data.get('extraction_stats', {})
        
        logger.info(f"開始處理增強內容，共 {len(enhanced_paragraphs)} 個段落")
        logger.info(f"提取統計: {stats}")
        
        # 第一步：內容分組和結構化
        structured_content = self._structure_content(enhanced_paragraphs)
        
        # 第二步：生成HTML
        html_parts = self._generate_html_from_structure(structured_content)
        
        return '\n'.join(html_parts)
    
    def _structure_content(self, paragraphs: List[Dict]) -> List[Dict]:
        """
        將段落內容進行結構化分組
        
        Args:
            paragraphs: 增強的段落信息列表
            
        Returns:
            List[Dict]: 結構化的內容組
        """
        structured = []
        current_section = None
        current_list = None
        
        for para in paragraphs:
            para_type = self._classify_paragraph(para)
            
            if para_type == 'main_title':
                # 主標題 - 結束當前所有結構
                self._finalize_current_structures(structured, current_section, current_list)
                current_section = None
                current_list = None
                
                structured.append({
                    'type': 'main_title',
                    'level': 'h2',
                    'number': para.get('chinese_number', ''),
                    'title': para.get('title_text', para['clean_text']),
                    'original': para
                })
                
            elif para_type == 'sub_title':
                # 子標題 - 結束當前列表，可能開始新section
                if current_list:
                    if current_section:
                        current_section['items'].append(current_list)
                    else:
                        structured.append(current_list)
                    current_list = None
                
                structured.append({
                    'type': 'sub_title',
                    'level': 'h3',
                    'number': para.get('arabic_number', ''),
                    'title': para.get('title_text', para['clean_text']),
                    'original': para
                })
                
            elif para_type == 'bold_title':
                # 粗體標題
                if current_list:
                    if current_section:
                        current_section['items'].append(current_list)
                    else:
                        structured.append(current_list)
                    current_list = None
                
                structured.append({
                    'type': 'bold_title',
                    'level': 'h4',
                    'title': para.get('title_text', para['clean_text']),
                    'original': para
                })
                
            elif para_type == 'date_range_item':
                # 日期範圍項目 - 稅務期程列表
                if not current_list or current_list.get('list_type') != 'tax_schedule':
                    if current_list:
                        if current_section:
                            current_section['items'].append(current_list)
                        else:
                            structured.append(current_list)
                    
                    current_list = {
                        'type': 'list',
                        'list_type': 'tax_schedule',
                        'items': []
                    }
                
                current_list['items'].append({
                    'type': 'tax_schedule_item',
                    'date_range': para.get('date_range', ''),
                    'description': para.get('description', ''),
                    'original': para
                })
                
            elif para_type == 'list_item':
                # 普通列表項目
                if not current_list or current_list.get('list_type') != 'regular':
                    if current_list:
                        if current_section:
                            current_section['items'].append(current_list)
                        else:
                            structured.append(current_list)
                    
                    current_list = {
                        'type': 'list',
                        'list_type': 'regular',
                        'items': []
                    }
                
                current_list['items'].append({
                    'type': 'list_item',
                    'content': para['formatted_text'] or para['clean_text'],
                    'original': para
                })
                
            else:
                # 普通段落
                if current_list:
                    if current_section:
                        current_section['items'].append(current_list)
                    else:
                        structured.append(current_list)
                    current_list = None
                
                structured.append({
                    'type': 'paragraph',
                    'content': para['formatted_text'] or para['clean_text'],
                    'css_class': self._get_paragraph_class(para),
                    'original': para
                })
        
        # 結束最後的結構
        self._finalize_current_structures(structured, current_section, current_list)
        
        return structured
    
    def _classify_paragraph(self, para: Dict) -> str:
        """
        分類段落類型
        
        Args:
            para: 段落信息
            
        Returns:
            str: 段落類型
        """
        # 檢查各種類型的標識
        if para.get('is_chinese_numbered_title'):
            return 'main_title'
        elif para.get('is_arabic_numbered_title'):
            return 'sub_title'
        elif para.get('is_bold_title') or (para.get('formatted_text', '').startswith('**') and para.get('formatted_text', '').endswith('**')):
            return 'bold_title'
        elif para.get('is_date_range_item'):
            return 'date_range_item'
        elif para.get('is_list_item') or para.get('list_level', 0) > 0:
            return 'list_item'
        else:
            return 'paragraph'
    
    def _finalize_current_structures(self, structured: List, current_section: Dict, current_list: Dict):
        """完成當前的結構"""
        if current_list:
            if current_section:
                current_section['items'].append(current_list)
            else:
                structured.append(current_list)
        if current_section:
            structured.append(current_section)
    
    def _generate_html_from_structure(self, structured_content: List[Dict]) -> List[str]:
        """
        從結構化內容生成HTML
        
        Args:
            structured_content: 結構化的內容
            
        Returns:
            List[str]: HTML片段列表
        """
        html_parts = []
        
        for item in structured_content:
            if item['type'] == 'main_title':
                title = f"{item['number']}、{item['title']}" if item['number'] else item['title']
                html_parts.append(f"<h2>{self._apply_highlights(title)}</h2>")
                
            elif item['type'] == 'sub_title':
                title = f"{item['number']}. {item['title']}" if item['number'] else item['title']
                html_parts.append(f"<h3>{self._apply_highlights(title)}</h3>")
                
            elif item['type'] == 'bold_title':
                html_parts.append(f"<h4>{self._apply_highlights(item['title'])}</h4>")
                
            elif item['type'] == 'list':
                html_parts.append(self._generate_list_html(item))
                
            elif item['type'] == 'paragraph':
                content = self._convert_markdown_to_html(item['content'])
                content = self._apply_highlights(content)
                
                if item.get('css_class'):
                    html_parts.append(f'<p class="{item["css_class"]}">{content}</p>')
                else:
                    html_parts.append(f'<p>{content}</p>')
        
        return html_parts
    
    def _generate_list_html(self, list_item: Dict) -> str:
        """
        生成列表HTML
        
        Args:
            list_item: 列表項目
            
        Returns:
            str: 列表HTML
        """
        if list_item['list_type'] == 'tax_schedule':
            # 稅務期程特殊列表
            items_html = []
            for item in list_item['items']:
                date_range = f"<strong>{item['date_range']}</strong>"
                description = self._apply_highlights(item['description'])
                items_html.append(f'<li>{date_range}：{description}</li>')
            
            return f'<ul class="tax-schedule-list">\n' + '\n'.join(items_html) + '\n</ul>'
        
        else:
            # 普通列表
            items_html = []
            for item in list_item['items']:
                content = self._convert_markdown_to_html(item['content'])
                content = self._apply_highlights(content)
                items_html.append(f'<li>{content}</li>')
            
            return f'<ul>\n' + '\n'.join(items_html) + '\n</ul>'
    
    def _convert_markdown_to_html(self, text: str) -> str:
        """
        將markdown格式轉換為HTML
        
        Args:
            text: 包含markdown的文本
            
        Returns:
            str: HTML格式的文本
        """
        if not text:
            return text
            
        # 粗體 **text** -> <strong>text</strong>
        text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<strong><em>\1</em></strong>', text)
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        # 斜體 *text* -> <em>text</em>
        text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
        # 下劃線 __text__ -> <u>text</u>
        text = re.sub(r'__(.*?)__', r'<u>\1</u>', text)
        
        return text
    
    def _apply_highlights(self, text: str) -> str:
        """
        應用高亮標記，使用改進的非重疊算法
        
        Args:
            text: 原始文本
            
        Returns:
            str: 高亮處理後的文本
        """
        if not text:
            return text
        
        # 收集所有匹配項
        matches = []
        for pattern, css_class in self.highlight_patterns:
            for match in re.finditer(pattern, text):
                matches.append({
                    'start': match.start(),
                    'end': match.end(),
                    'text': match.group(1),
                    'css_class': css_class,
                    'priority': len(self.highlight_patterns) - self.highlight_patterns.index((pattern, css_class))
                })
        
        # 排序並移除重疊
        matches.sort(key=lambda x: (x['start'], -x['priority']))
        filtered_matches = []
        
        for match in matches:
            overlaps = False
            for existing in filtered_matches:
                if (match['start'] < existing['end'] and match['end'] > existing['start']):
                    overlaps = True
                    break
            if not overlaps:
                filtered_matches.append(match)
        
        # 從後往前替換
        filtered_matches.sort(key=lambda x: x['start'], reverse=True)
        result = text
        
        for match in filtered_matches:
            highlighted = f'<span class="{match["css_class"]}">{match["text"]}</span>'
            result = result[:match['start']] + highlighted + result[match['end']:]
        
        return result
    
    def _get_paragraph_class(self, para: Dict) -> str:
        """
        獲取段落的CSS類名
        
        Args:
            para: 段落信息
            
        Returns:
            str: CSS類名或空字符串
        """
        text = para['clean_text']
        
        # 前言和結語段落
        if text.startswith(('前言', '結語', '摘要')):
            return 'intro-conclusion'
        
        # 重要提示段落
        if any(keyword in text for keyword in ['注意', '重要', '提醒', '警告', '建議']):
            return 'important-note'
        
        # 規劃建議段落
        if '規劃建議' in text or '稅務規劃' in text:
            return 'important-note'
        
        return ''