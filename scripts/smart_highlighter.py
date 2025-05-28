#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
智能高亮系统 v3.0 - 修复高亮不一致问题
解决数字、日期、法条引用等高亮不统一的问题
"""

import re
from typing import List, Dict, Tuple, Optional, Set
from loguru import logger

class SmartHighlighter:
    """智能高亮系统 - 解决高亮不一致问题"""
    
    def __init__(self, priorities: Optional[Dict] = None):
        """
        初始化智能高亮系统
        
        Args:
            priorities: 高亮优先级配置
        """
        self.priorities = priorities or {
            'final_result': 1,      # 最终结果（如应纳税额）
            'key_deadline': 2,      # 关键时间点  
            'important_amount': 3,  # 重要金额门槛
            'regulation_reference': 4, # 法规引用
            'auxiliary_data': 5     # 辅助数据
        }
        
        # 🔧 修复：高亮规则包含完整的小数点支持
        self.highlight_rules = {
            'final_result': {
                'patterns': [
                    # 🔧 核心修复：支持小数点的应纳税额匹配
                    r'应纳.*?税.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'總.*?税.*?额.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'最终.*?金额.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'合計.*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元'
                ],
                'css_class': 'highlight-final-result',
                'style': 'background: linear-gradient(135deg, #ffeb3b, #ffc107); font-weight: bold; padding: 3px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
                'priority_weight': 100
            },
            
            'calculation_formula': {
                'patterns': [
                    # 🔧 修复：包含小数点的计算公式
                    r'\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元\s*[×x]\s*\d+(?:\.\d+)?%\s*[-−]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元\s*=\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'\d+(?:,\d{3})*(?:\.\d+)?\s*[×x÷/]\s*\d+(?:\.\d+)?',
                    r'(?:税率|稅率).*?\d+(?:\.\d+)?%'
                ],
                'css_class': 'highlight-calculation',
                'style': 'background: #e3f2fd; border: 2px solid #2196f3; padding: 2px 4px; border-radius: 3px; font-family: monospace;',
                'priority_weight': 90
            },
            
            'key_deadline': {
                'patterns': [
                    r'\d{1,2}月\d{1,2}日(?:前|截止|之前)',
                    r'前\d+[日天]',
                    r'截止.*?\d{1,2}月\d{1,2}日',
                    r'\d{1,2}月\d{1,2}日(?:至\d{1,2}月\d{1,2}日)?.*?[:：].*?(?:申报|申報|缴纳|繳納|截止)'
                ],
                'css_class': 'highlight-deadline',
                'style': 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
                'priority_weight': 85
            },
            
            'important_amount': {
                'patterns': [
                    # 🔧 修复：重要金额包含小数点支持
                    r'(?:免税额|免稅額|扣除额|扣除額).*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'(?:门槛|門檻|起征点|起徵點).*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万]?元',
                    r'(?:总额|總額|总计|總計).*?[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?.*?[萬万億亿]?元?',
                    r'\d+(?:,\d{3})*(?:\.\d+)?[萬万億亿]元(?!\s*[×x÷/])'  # 独立的重要金额
                ],
                'css_class': 'highlight-amount',
                'style': 'background: #4caf50; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority_weight': 70
            },
            
            'regulation_reference': {
                'patterns': [
                    r'第\d+[条條](?:第\d+[项項款])?',
                    r'[法規规].*?第\d+[条條]',
                    r'(?:税法|稅法|所得税法|所得稅法).*?第\d+[条條]',
                    r'(?:办法|辦法|规定|規定).*?第\d+[条條]'
                ],
                'css_class': 'highlight-regulation',
                'style': 'background: #2196f3; color: white; padding: 2px 4px; border-radius: 3px;',
                'priority_weight': 60
            },
            
            'date_highlight': {
                'patterns': [
                    r'\d{1,2}月\d{1,2}日',
                    r'\d{4}年\d{1,2}月\d{1,2}日',
                    r'\d{1,2}月\d{1,2}日(?:至\d{1,2}月\d{1,2}日)?'
                ],
                'css_class': 'highlight-date',
                'style': 'background: #e1f5fe; color: #0277bd; padding: 1px 3px; border-radius: 2px; border-bottom: 2px solid #03a9f4;',
                'priority_weight': 50
            },
            
            'percentage_highlight': {
                'patterns': [
                    # 🔧 修复：百分比支持小数点
                    r'\d+(?:\.\d+)?%',
                    r'百分之\d+(?:\.\d+)?',
                    r'(?:税率|稅率|利率).*?\d+(?:\.\d+)?%'
                ],
                'css_class': 'highlight-percentage',
                'style': 'background: #fff3e0; color: #f57c00; padding: 1px 3px; border-radius: 2px; font-weight: bold;',
                'priority_weight': 45
            },
            
            'auxiliary_data': {
                'patterns': [
                    # 一般数字（作为最后的fallback）
                    r'\d+(?:,\d{3})*(?:\.\d+)?(?![萬万億亿%])',  # 🔧 修复：包含小数点但排除已匹配的
                ],
                'css_class': 'highlight-auxiliary',
                'style': 'background: #f5f5f5; color: #666; padding: 1px 2px; border-radius: 2px;',
                'priority_weight': 20
            }
        }
        
        # 特殊上下文增强规则
        self.context_enhancers = {
            'tax_calculation': {
                'context_keywords': ['应纳', '應納', '税额', '稅額', '计算', '計算'],
                'enhancement_factor': 1.5
            },
            'deadline_context': {
                'context_keywords': ['截止', '期限', '前', '申报', '申報', '缴纳', '繳納'],
                'enhancement_factor': 1.3
            },
            'legal_context': {
                'context_keywords': ['法规', '法規', '条文', '條文', '规定', '規定'],
                'enhancement_factor': 1.2
            }
        }
        
        logger.info("✅ 智能高亮系统v3.0已初始化 - 支持小数点和优先级管理")
    
    def process_content(self, content: Dict, doc_type: str = "general") -> List[Dict]:
        """
        处理内容并生成智能高亮
        
        Args:
            content: 文档内容（包含paragraphs）
            doc_type: 文档类型
            
        Returns:
            List[Dict]: 高亮元素列表
        """
        logger.info(f"🎨 开始智能高亮处理 - 文档类型: {doc_type}")
        
        highlighted_elements = []
        
        # 处理每个段落
        for para in content.get('paragraphs', []):
            text = para.get('text', '')
            if not text.strip():
                continue
            
            # 获取段落的高亮元素
            para_highlights = self._extract_highlights_from_text(
                text, para.get('index', 0), doc_type
            )
            
            highlighted_elements.extend(para_highlights)
        
        # 🔧 关键改进：去重和优先级排序
        highlighted_elements = self._deduplicate_and_prioritize(highlighted_elements)
        
        logger.info(f"✅ 高亮处理完成 - 生成 {len(highlighted_elements)} 个高亮元素")
        
        return highlighted_elements
    
    def _extract_highlights_from_text(self, text: str, paragraph_index: int, doc_type: str) -> List[Dict]:
        """从文本中提取高亮元素"""
        highlights = []
        processed_ranges = set()  # 防止重叠高亮
        
        # 按优先级顺序处理规则
        sorted_rules = sorted(
            self.highlight_rules.items(),
            key=lambda x: x[1]['priority_weight'],
            reverse=True
        )
        
        for rule_name, rule_config in sorted_rules:
            for pattern in rule_config['patterns']:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    start, end = match.span()
                    
                    # 🔧 检查是否与已处理范围重叠
                    if self._has_overlap(start, end, processed_ranges):
                        continue
                    
                    # 计算上下文增强重要性
                    importance = self._calculate_contextual_importance(
                        match.group(), text, rule_config['priority_weight'], doc_type
                    )
                    
                    highlight_info = {
                        'text': match.group(),
                        'start': start,
                        'end': end,
                        'type': rule_name,
                        'css_class': rule_config['css_class'],
                        'style': rule_config['style'],
                        'priority': importance,
                        'paragraph_index': paragraph_index,
                        'rule_matched': pattern,
                        'context': self._extract_context(text, start, end)
                    }
                    
                    highlights.append(highlight_info)
                    processed_ranges.add((start, end))
        
        return highlights
    
    def _has_overlap(self, start: int, end: int, processed_ranges: Set[Tuple[int, int]]) -> bool:
        """检查范围是否与已处理范围重叠"""
        for proc_start, proc_end in processed_ranges:
            # 检查重叠：如果新范围与已有范围有交集
            if not (end <= proc_start or start >= proc_end):
                return True
        return False
    
    def _calculate_contextual_importance(self, matched_text: str, full_text: str, 
                                       base_priority: int, doc_type: str) -> int:
        """计算上下文增强的重要性"""
        importance = base_priority
        
        # 基于文档类型调整
        doc_type_bonus = {
            'tax_analysis': 10,
            'tax_schedule': 5,
            'general': 0
        }
        importance += doc_type_bonus.get(doc_type, 0)
        
        # 🔧 小数点数字特殊加权
        if '.' in matched_text and re.search(r'\d+\.\d+', matched_text):
            importance += 15
            logger.debug(f"小数点数字加权: {matched_text} +15")
        
        # 上下文增强
        context_window = 100
        text_lower = full_text.lower()
        matched_lower = matched_text.lower()
        
        # 找到匹配文本在全文中的位置
        match_pos = text_lower.find(matched_lower)
        if match_pos != -1:
            context_start = max(0, match_pos - context_window)
            context_end = min(len(full_text), match_pos + len(matched_text) + context_window)
            context = text_lower[context_start:context_end]
            
            # 应用上下文增强规则
            for enhancer_name, enhancer_config in self.context_enhancers.items():
                for keyword in enhancer_config['context_keywords']:
                    if keyword.lower() in context:
                        bonus = int(base_priority * (enhancer_config['enhancement_factor'] - 1))
                        importance += bonus
                        logger.debug(f"上下文增强: {enhancer_name} +{bonus}")
                        break
        
        return importance
    
    def _extract_context(self, text: str, start: int, end: int, length: int = 30) -> str:
        """提取高亮元素的上下文"""
        context_start = max(0, start - length)
        context_end = min(len(text), end + length)
        return text[context_start:context_end].strip()
    
    def _deduplicate_and_prioritize(self, highlights: List[Dict]) -> List[Dict]:
        """去重并按优先级排序高亮元素"""
        # 🔧 去重逻辑：相同文本且位置接近的视为重复
        unique_highlights = []
        seen_combinations = set()
        
        # 按优先级排序
        sorted_highlights = sorted(highlights, key=lambda x: x['priority'], reverse=True)
        
        for highlight in sorted_highlights:
            # 创建唯一标识
            text_key = highlight['text'].strip()
            position_key = highlight['paragraph_index']
            combination_key = f"{text_key}_{position_key}"
            
            if combination_key not in seen_combinations:
                unique_highlights.append(highlight)
                seen_combinations.add(combination_key)
            else:
                logger.debug(f"去重跳过: {highlight['text']}")
        
        logger.info(f"去重完成: {len(highlights)} -> {len(unique_highlights)}")
        return unique_highlights
    
    def generate_css_styles(self) -> str:
        """生成CSS样式"""
        css_lines = [
            "/* 智能高亮系统 v3.0 样式 */",
            ""
        ]
        
        for rule_name, rule_config in self.highlight_rules.items():
            css_class = rule_config['css_class']
            style = rule_config['style']
            
            css_lines.append(f".{css_class} {{")
            
            # 解析内联样式为CSS属性
            style_properties = [prop.strip() for prop in style.split(';') if prop.strip()]
            for prop in style_properties:
                if ':' in prop:
                    css_lines.append(f"    {prop};")
            
            css_lines.append("}")
            css_lines.append("")
        
        # 添加响应式和交互效果
        css_lines.extend([
            "/* 响应式效果 */",
            ".highlight-final-result:hover {",
            "    transform: scale(1.02);",
            "    transition: transform 0.2s ease;",
            "}",
            "",
            ".highlight-deadline:hover {",
            "    background: #d32f2f;",
            "    transition: background 0.2s ease;",
            "}",
            "",
            "/* 打印样式 */",
            "@media print {",
            "    [class^='highlight-'] {",
            "        background: transparent !important;",
            "        border: 1px solid #ccc !important;",
            "        color: black !important;",
            "    }",
            "}",
            "",
            "/* 深色模式支持 */",
            "@media (prefers-color-scheme: dark) {",
            "    .highlight-amount {",
            "        background: #2e7d32;",
            "    }",
            "    .highlight-date {",
            "        background: #0d47a1;",
            "        color: #e3f2fd;",
            "    }",
            "}"
        ])
        
        return "\n".join(css_lines)
    
    def apply_highlights_to_html(self, html_content: str, highlights: List[Dict]) -> str:
        """将高亮应用到HTML内容"""
        if not highlights:
            return html_content
        
        # 🔧 按位置倒序排序，避免位置偏移问题
        sorted_highlights = sorted(highlights, key=lambda x: x['start'], reverse=True)
        
        modified_html = html_content
        
        for highlight in sorted_highlights:
            start = highlight['start']
            end = highlight['end']
            css_class = highlight['css_class']
            
            # 检查位置是否仍然有效
            if end <= len(modified_html):
                original_text = modified_html[start:end]
                
                # 🔧 确保不在HTML标签内
                if not self._is_inside_html_tag(modified_html, start):
                    highlighted_text = f'<span class="{css_class}" title="重要性: {highlight["priority"]}">{original_text}</span>'
                    modified_html = modified_html[:start] + highlighted_text + modified_html[end:]
        
        return modified_html
    
    def _is_inside_html_tag(self, html: str, position: int) -> bool:
        """检查位置是否在HTML标签内"""
        # 简单检查：找最近的 < 和 >
        last_open = html.rfind('<', 0, position)
        last_close = html.rfind('>', 0, position)
        
        return last_open > last_close
    
    def validate_highlight_coverage(self, original_text: str, highlighted_html: str) -> Dict:
        """验证高亮覆盖率"""
        from number_recognizer import NumberRecognizer
        
        recognizer = NumberRecognizer()
        original_numbers = recognizer.recognize_all_numbers(original_text)
        
        # 统计不同类型数字的高亮情况
        coverage_stats = {
            'total_numbers': len(original_numbers),
            'highlighted_numbers': 0,
            'coverage_by_type': {},
            'missed_important_numbers': []
        }
        
        # 检查每个数字是否被高亮
        for number_info in original_numbers:
            number_text = number_info['value']
            is_highlighted = f'class="highlight-' in highlighted_html and number_text in highlighted_html
            
            if is_highlighted:
                coverage_stats['highlighted_numbers'] += 1
            elif number_info['final_importance'] > 50:  # 重要数字未高亮
                coverage_stats['missed_important_numbers'].append({
                    'text': number_text,
                    'importance': number_info['final_importance'],
                    'type': number_info['type']
                })
            
            # 按类型统计
            num_type = number_info['type']
            if num_type not in coverage_stats['coverage_by_type']:
                coverage_stats['coverage_by_type'][num_type] = {'total': 0, 'highlighted': 0}
            
            coverage_stats['coverage_by_type'][num_type]['total'] += 1
            if is_highlighted:
                coverage_stats['coverage_by_type'][num_type]['highlighted'] += 1
        
        # 计算总体覆盖率
        coverage_stats['overall_coverage'] = (
            coverage_stats['highlighted_numbers'] / coverage_stats['total_numbers']
            if coverage_stats['total_numbers'] > 0 else 0
        )
        
        return coverage_stats
    
    def generate_highlight_report(self, highlights: List[Dict]) -> str:
        """生成高亮报告"""
        if not highlights:
            return "未生成任何高亮元素"
        
        report_lines = [
            "=" * 50,
            "智能高亮报告 v3.0",
            "=" * 50,
            f"总高亮元素: {len(highlights)}",
            ""
        ]
        
        # 按类型统计
        type_counts = {}
        for highlight in highlights:
            h_type = highlight['type']
            type_counts[h_type] = type_counts.get(h_type, 0) + 1
        
        report_lines.append("按类型统计:")
        for h_type, count in sorted(type_counts.items()):
            report_lines.append(f"  {h_type}: {count} 个")
        
        report_lines.append("")
        
        # 优先级分布
        high_priority = [h for h in highlights if h['priority'] >= 80]
        medium_priority = [h for h in highlights if 50 <= h['priority'] < 80]
        low_priority = [h for h in highlights if h['priority'] < 50]
        
        report_lines.extend([
            "优先级分布:",
            f"  高优先级 (≥80): {len(high_priority)} 个",
            f"  中优先级 (50-79): {len(medium_priority)} 个", 
            f"  低优先级 (<50): {len(low_priority)} 个",
            ""
        ])
        
        # 🔧 小数点高亮检查
        decimal_highlights = [h for h in highlights if '.' in h['text']]
        if decimal_highlights:
            report_lines.append(f"小数点高亮: {len(decimal_highlights)} 个")
            for h in decimal_highlights:
                report_lines.append(f"  ✅ {h['text']} (优先级: {h['priority']})")
        else:
            report_lines.append("小数点高亮: 未发现小数点元素")
        
        report_lines.extend([
            "",
            "=" * 50
        ])
        
        return "\n".join(report_lines)

# 测试函数

def test_smart_highlighter():
    """测试智能高亮系统"""
    highlighter = SmartHighlighter()
    
    # 🔧 包含小数点的测试内容
    test_content = {
        'paragraphs': [
            {
                'index': 0,
                'text': '遗产总额：1億 5,000萬元'
            },
            {
                'index': 1, 
                'text': '应纳遗产税：9,936萬元 × 15% - 281.05萬元 = 1,209.35萬元'
            },
            {
                'index': 2,
                'text': '截止日期：9月22日前申报'
            },
            {
                'index': 3,
                'text': '法规依据：第15条第1项'
            }
        ]
    }
    
    print("🧪 测试智能高亮系统...")
    highlights = highlighter.process_content(test_content, 'tax_analysis')
    
    print(f"生成 {len(highlights)} 个高亮元素:")
    for h in highlights:
        print(f"  {h['text']} ({h['type']}) - 优先级: {h['priority']}")
    
    # 检查小数点高亮
    decimal_highlights = [h for h in highlights if '.' in h['text']]
    print(f"\n小数点高亮: {len(decimal_highlights)} 个")
    for h in decimal_highlights:
        print(f"  ✅ {h['text']}")
    
    return len(decimal_highlights) > 0

if __name__ == "__main__":
    success = test_smart_highlighter()
    if success:
        print("\n✅ 小数点高亮测试通过")
    else:
        print("\n❌ 小数点高亮测试失败")