#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
全面重构的HTML内容处理器 v3.0 - 修复高亮冲突版本
"""

import re
from typing import List, Dict, Any, Tuple
from loguru import logger

class ComprehensiveHTMLProcessor:
    """全面重构的HTML内容处理器 - v3.0修复版"""
    
    def __init__(self):
        """初始化处理器"""
        # 🔧 v3.0 核心修复：优先级高亮模式，避免冲突
        self.highlight_patterns = {
            # 优先级1：最终结果（最高优先级）
            'final_result': {
                'patterns': [
                    r'(应纳.*?税.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?元)',
                    r'(总.*?税.*?额.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?元)',
                    r'(应缴.*?金额.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?元)'
                ],
                'css_class': 'highlight-final-result',
                'style': 'background: #ffeb3b; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
                'priority': 1
            },
            
            # 优先级2：关键时间点
            'key_deadline': {
                'patterns': [
                    r'(\d{1,2}月\d{1,2}日(?:前|截止))',
                    r'(前\d+日)',
                    r'(截止.*?\d{1,2}月\d{1,2}日)',
                    r'(\d{4}年\d{1,2}月\d{1,2}日(?:前|截止)?)'
                ],
                'css_class': 'highlight-deadline',
                'style': 'background: #f44336; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority': 2
            },
            
            # 优先级3：重要金额门槛
            'important_amount': {
                'patterns': [
                    r'((?:免税额|扣除额).*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?元)',
                    r'(\d+(?:,\d{3})*(?:\.\d+)?萬元)',
                    r'(\d+(?:,\d{3})*(?:\.\d+)?千萬元)',
                    r'(\d+(?:,\d{3})*(?:\.\d+)?億元)'
                ],
                'css_class': 'highlight-amount',
                'style': 'background: #4caf50; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority': 3
            },
            
            # 优先级4：法规引用
            'regulation_reference': {
                'patterns': [
                    r'(第\d+[条條](?:第\d+[项項])?(?:規定)?)',
                    r'([法規].*?第\d+[条條])',
                    r'(所得稅法第\d+[条條](?:之\d+)?(?:規定)?)'
                ],
                'css_class': 'highlight-regulation',
                'style': 'background: #2196f3; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority': 4
            },
            
            # 优先级5：百分比（修复小数点支持）
            'percentage': {
                'patterns': [
                    r'(\d+(?:\.\d+)?%)',
                    r'(百分之\d+(?:\.\d+)?)',
                    r'(\d+(?:\.\d+)?個百分點)'
                ],
                'css_class': 'highlight-percent',
                'style': 'background: #ff9800; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority': 5
            },
            
            # 优先级6：一般日期
            'general_date': {
                'patterns': [
                    r'(\d{1,2}月\d{1,2}日(?!前|截止))',  # 排除已被deadline捕获的
                ],
                'css_class': 'highlight-date',
                'style': 'background: #e3f2fd; color: #1565c0; padding: 2px 4px; border-radius: 3px;',
                'priority': 6
            },
            
            # 优先级7：一般金额（修复小数点支持）
            'general_amount': {
                'patterns': [
                    r'(\d+(?:,\d{3})*(?:\.\d+)?元)(?!萬|千萬|億)'  # 排除已被重要金额捕获的
                ],
                'css_class': 'highlight-amount-general',
                'style': 'background: #e8f5e8; color: #2e7d32; padding: 2px 4px; border-radius: 3px;',
                'priority': 7
            }
        }
    
    def process_enhanced_content(self, enhanced_data: Dict[str, Any]) -> str:
        """
        处理增强的Word内容，生成HTML
        
        Args:
            enhanced_data: 来自EnhancedWordProcessor的数据
            
        Returns:
            str: 处理后的HTML内容
        """
        enhanced_paragraphs = enhanced_data.get('enhanced_paragraphs', [])
        stats = enhanced_data.get('extraction_stats', {})
        
        logger.info(f"开始处理增强内容，共 {len(enhanced_paragraphs)} 个段落")
        logger.info(f"提取统计: {stats}")
        
        # 第一步：内容分组和结构化
        structured_content = self._structure_content(enhanced_paragraphs)
        
        # 第二步：生成HTML
        html_parts = self._generate_html_from_structure(structured_content)
        
        return '\n'.join(html_parts)
    
    def _structure_content(self, paragraphs: List[Dict]) -> List[Dict]:
        """
        将段落内容进行结构化分组
        """
        structured = []
        current_section = None
        current_list = None
        
        for para in paragraphs:
            para_type = self._classify_paragraph(para)
            
            if para_type == 'main_title':
                # 主标题 - 结束当前所有结构
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
                # 子标题
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
                # 粗体标题
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
                # 日期范围项目 - 税务期程列表
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
                # 普通列表项目
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
        
        # 结束最后的结构
        self._finalize_current_structures(structured, current_section, current_list)
        
        return structured
    
    def _classify_paragraph(self, para: Dict) -> str:
        """分类段落类型"""
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
        """完成当前的结构"""
        if current_list:
            if current_section:
                current_section['items'].append(current_list)
            else:
                structured.append(current_list)
        if current_section:
            structured.append(current_section)
    
    def _generate_html_from_structure(self, structured_content: List[Dict]) -> List[str]:
        """从结构化内容生成HTML"""
        html_parts = []
        
        for item in structured_content:
            if item['type'] == 'main_title':
                title = f"{item['number']}、{item['title']}" if item['number'] else item['title']
                html_parts.append(f"<h2>{self._apply_advanced_highlights(title)}</h2>")
                
            elif item['type'] == 'sub_title':
                title = f"{item['number']}. {item['title']}" if item['number'] else item['title']
                html_parts.append(f"<h3>{self._apply_advanced_highlights(title)}</h3>")
                
            elif item['type'] == 'bold_title':
                html_parts.append(f"<h4>{self._apply_advanced_highlights(item['title'])}</h4>")
                
            elif item['type'] == 'list':
                html_parts.append(self._generate_list_html(item))
                
            elif item['type'] == 'paragraph':
                content = self._convert_markdown_to_html(item['content'])
                content = self._apply_advanced_highlights(content)
                
                if item.get('css_class'):
                    html_parts.append(f'<p class="{item["css_class"]}">{content}</p>')
                else:
                    html_parts.append(f'<p>{content}</p>')
        
        return html_parts
    
    def _generate_list_html(self, list_item: Dict) -> str:
        """生成列表HTML"""
        if list_item['list_type'] == 'tax_schedule':
            # 税务期程特殊列表
            items_html = []
            for item in list_item['items']:
                date_range = f"<strong>{self._apply_advanced_highlights(item['date_range'])}</strong>"
                description = self._apply_advanced_highlights(item['description'])
                items_html.append(f'<li>{date_range}：{description}</li>')
            
            return f'<ul class="tax-schedule-list">\n' + '\n'.join(items_html) + '\n</ul>'
        
        else:
            # 普通列表
            items_html = []
            for item in list_item['items']:
                content = self._convert_markdown_to_html(item['content'])
                content = self._apply_advanced_highlights(content)
                items_html.append(f'<li>{content}</li>')
            
            return f'<ul>\n' + '\n'.join(items_html) + '\n</ul>'
    
    def _convert_markdown_to_html(self, text: str) -> str:
        """将markdown格式转换为HTML"""
        if not text:
            return text
            
        # 粗体 **text** -> <strong>text</strong>
        text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<strong><em>\1</em></strong>', text)
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        # 斜体 *text* -> <em>text</em>
        text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
        # 下划线 __text__ -> <u>text</u>
        text = re.sub(r'__(.*?)__', r'<u>\1</u>', text)
        
        return text
    
    def _apply_advanced_highlights(self, text: str) -> str:
        """
        🔧 v3.0 核心修复：应用高级高亮标记，彻底解决重叠问题
        
        Args:
            text: 原始文本
            
        Returns:
            str: 高亮处理后的文本
        """
        if not text or not text.strip():
            return text
        
        # 第一步：收集所有匹配项
        all_matches = []
        
        for rule_name, rule_config in self.highlight_patterns.items():
            for pattern in rule_config['patterns']:
                for match in re.finditer(pattern, text):
                    all_matches.append({
                        'start': match.start(1),  # 使用捕获组的位置
                        'end': match.end(1),
                        'text': match.group(1),
                        'css_class': rule_config['css_class'],
                        'priority': rule_config['priority'],
                        'rule_name': rule_name
                    })
        
        if not all_matches:
            return text
        
        # 第二步：按优先级和位置排序
        all_matches.sort(key=lambda x: (x['start'], x['priority']))
        
        # 第三步：移除重叠，保留高优先级
        filtered_matches = self._resolve_conflicts(all_matches)
        
        # 第四步：按位置倒序应用高亮（从后往前，避免位置偏移）
        filtered_matches.sort(key=lambda x: x['start'], reverse=True)
        
        result = text
        for match in filtered_matches:
            highlighted = f'<span class="{match["css_class"]}">{match["text"]}</span>'
            result = result[:match['start']] + highlighted + result[match['end']:]
        
        # 验证结果
        if self._has_nested_spans(result):
            logger.warning("检测到嵌套span标签，回退到原文本")
            return text
        
        logger.debug(f"高亮处理: {len(all_matches)} 个匹配项 -> {len(filtered_matches)} 个应用")
        return result
    
    def _resolve_conflicts(self, matches: List[Dict]) -> List[Dict]:
        """
        🔧 核心冲突解决算法
        
        Args:
            matches: 所有匹配项列表
            
        Returns:
            List[Dict]: 解决冲突后的匹配项
        """
        if not matches:
            return []
        
        # 按位置排序
        matches.sort(key=lambda x: x['start'])
        
        resolved = []
        
        for current in matches:
            conflict_found = False
            
            # 检查与已选择的匹配项是否冲突
            for existing in resolved:
                if self._is_overlapping(current, existing):
                    # 发生重叠，比较优先级
                    if current['priority'] < existing['priority']:
                        # 当前匹配项优先级更高，移除已存在的
                        resolved.remove(existing)
                        resolved.append(current)
                        logger.debug(f"优先级替换: {existing['rule_name']} -> {current['rule_name']}")
                    else:
                        # 已存在的优先级更高，忽略当前匹配项
                        logger.debug(f"优先级保持: {existing['rule_name']} > {current['rule_name']}")
                    conflict_found = True
                    break
            
            if not conflict_found:
                resolved.append(current)
        
        return resolved
    
    def _is_overlapping(self, match1: Dict, match2: Dict) -> bool:
        """检查两个匹配项是否重叠"""
        return not (match1['end'] <= match2['start'] or match2['end'] <= match1['start'])
    
    def _has_nested_spans(self, html: str) -> bool:
        """检查HTML中是否有嵌套的span标签"""
        # 简单检查嵌套span
        span_pattern = r'<span[^>]*>.*?<span[^>]*>'
        return bool(re.search(span_pattern, html))
    
    def _get_paragraph_class(self, para: Dict) -> str:
        """获取段落的CSS类名"""
        text = para['clean_text']
        
        # 前言和结语段落
        if text.startswith(('前言', '结语', '摘要')):
            return 'intro-conclusion'
        
        # 重要提示段落
        if any(keyword in text for keyword in ['注意', '重要', '提醒', '警告', '建议']):
            return 'important-note'
        
        # 规划建议段落
        if '规划建议' in text or '税务规划' in text:
            return 'important-note'
        
        return ''
    
    def generate_highlight_css(self) -> str:
        """
        生成高亮样式的CSS
        
        Returns:
            str: CSS样式代码
        """
        css_rules = []
        
        for rule_name, rule_config in self.highlight_patterns.items():
            css_class = rule_config['css_class']
            style = rule_config['style']
            
            css_rules.append(f".{css_class} {{ {style} }}")
        
        # 添加基础样式
        base_css = """
        /* v3.0 高亮基础样式 */
        .tax-schedule-list { 
            background-color: #f8f9fa; 
            padding: 1em; 
            border-radius: 8px; 
            border-left: 4px solid #007bff;
        }
        .tax-schedule-list li { 
            margin-bottom: 0.5em; 
            padding: 0.25em 0;
        }
        .important-note { 
            background-color: #fff8e1; 
            border-left: 4px solid #ffc107; 
            padding: 1em; 
            margin: 1em 0; 
        }
        .intro-conclusion {
            font-style: italic;
            background-color: #f5f5f5;
            padding: 0.5em;
            border-radius: 4px;
        }
        """
        
        css_rules.insert(0, base_css)
        
        return '\n'.join(css_rules)
    
    def validate_highlights(self, html_content: str) -> Dict[str, Any]:
        """
        验证高亮处理质量
        
        Args:
            html_content: HTML内容
            
        Returns:
            Dict: 验证结果
        """
        validation_result = {
            'total_highlights': 0,
            'highlight_types': {},
            'nested_spans': 0,
            'unclosed_tags': 0,
            'quality_score': 0
        }
        
        # 统计高亮数量
        for rule_name, rule_config in self.highlight_patterns.items():
            css_class = rule_config['css_class']
            count = len(re.findall(f'class="{css_class}"', html_content))
            validation_result['highlight_types'][rule_name] = count
            validation_result['total_highlights'] += count
        
        # 检查嵌套span
        nested_spans = re.findall(r'<span[^>]*>.*?<span[^>]*>', html_content)
        validation_result['nested_spans'] = len(nested_spans)
        
        # 检查未闭合标签
        open_spans = len(re.findall(r'<span[^>]*>', html_content))
        close_spans = len(re.findall(r'</span>', html_content))
        validation_result['unclosed_tags'] = abs(open_spans - close_spans)
        
        # 计算质量分数
        quality_score = 100
        if validation_result['nested_spans'] > 0:
            quality_score -= validation_result['nested_spans'] * 10
        if validation_result['unclosed_tags'] > 0:
            quality_score -= validation_result['unclosed_tags'] * 15
        
        validation_result['quality_score'] = max(0, quality_score)
        
        return validation_result