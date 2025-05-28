#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
数字识别器 v3.0 - 修复小数点识别问题
解决原有正则表达式无法正确识别小数点数字的问题
"""

import re
from typing import List, Dict, Tuple, Optional
from loguru import logger

class NumberRecognizer:
    """数字识别器 - 修复小数点支持"""
    
    def __init__(self):
        """初始化数字识别器"""
        # 🔧 核心修复：支持小数点的正则表达式
        self.patterns = {
            # 货币金额（支持小数点）
            'currency': {
                'pattern': r'\d+(?:,\d{3})*(?:\.\d+)?(?:萬?元|萬|億|千)',
                'importance_base': 15,
                'examples': ['1,000萬元', '281.05萬元', '5,000元', '1.5億']
            },
            
            # 百分比（支持小数点）
            'percentage': {
                'pattern': r'\d+(?:\.\d+)?%',
                'importance_base': 12,
                'examples': ['15%', '3.5%', '0.85%']
            },
            
            # 纯小数数字
            'decimal_number': {
                'pattern': r'\d+(?:,\d{3})*\.\d+',
                'importance_base': 10,
                'examples': ['281.05', '1,209.35', '3.14']
            },
            
            # 整数数字（包含千分位）
            'integer_number': {
                'pattern': r'\d+(?:,\d{3})*',
                'importance_base': 8,
                'examples': ['1,000', '5000', '123,456,789']
            },
            
            # 日期格式
            'date': {
                'pattern': r'\d{1,2}月\d{1,2}日',
                'importance_base': 10,
                'examples': ['1月1日', '12月31日']
            },
            
            # 日期范围
            'date_range': {
                'pattern': r'\d{1,2}月\d{1,2}日(?:至\d{1,2}月\d{1,2}日)?',
                'importance_base': 12,
                'examples': ['1月1日至2月5日', '9月22日']
            },
            
            # 法条引用
            'law_reference': {
                'pattern': r'第\d+[条條](?:第\d+[项項款])?',
                'importance_base': 8,
                'examples': ['第15条', '第1项', '第15条第1项']
            },
            
            # 税率相关
            'tax_rate': {
                'pattern': r'(?:税率|稅率).*?\d+(?:\.\d+)?%',
                'importance_base': 14,
                'examples': ['税率15%', '稅率3.5%']
            }
        }
        
        # 重要性关键词权重
        self.importance_keywords = {
            # 最高权重 - 最终结果
            'final_result': {
                'keywords': ['应纳', '應納', '总额', '總額', '合计', '合計', '最终', '最終'],
                'weight': 25
            },
            
            # 高权重 - 关键数据
            'key_data': {
                'keywords': ['免税', '免稅', '扣除', '减免', '減免', '门槛', '門檻'],
                'weight': 20
            },
            
            # 中权重 - 重要参考
            'important_ref': {
                'keywords': ['截止', '期限', '前', '内', '內', '规定', '規定'],
                'weight': 15
            },
            
            # 低权重 - 辅助信息
            'auxiliary': {
                'keywords': ['举例', '舉例', '参考', '參考', '说明', '說明'],
                'weight': 5
            }
        }
        
        logger.info("✅ 数字识别器v3.0已初始化 - 支持小数点识别")
    
    def recognize_all_numbers(self, text: str, context: str = "") -> List[Dict]:
        """
        识别文本中的所有数字
        
        Args:
            text: 要识别的文本
            context: 上下文信息（用于重要性判断）
            
        Returns:
            List[Dict]: 识别结果列表
        """
        results = []
        
        for pattern_name, pattern_info in self.patterns.items():
            matches = re.finditer(pattern_info['pattern'], text)
            
            for match in matches:
                number_info = {
                    'type': pattern_name,
                    'value': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'raw_importance': pattern_info['importance_base'],
                    'context_snippet': self._extract_context(text, match.start(), match.end()),
                    'final_importance': 0
                }
                
                # 计算最终重要性
                number_info['final_importance'] = self._calculate_importance(
                    number_info, text, context
                )
                
                results.append(number_info)
        
        # 按重要性排序
        results.sort(key=lambda x: x['final_importance'], reverse=True)
        
        logger.debug(f"识别到 {len(results)} 个数字，最高重要性: {results[0]['final_importance'] if results else 0}")
        
        return results
    
    def recognize_by_type(self, text: str, number_types: List[str]) -> List[Dict]:
        """
        按指定类型识别数字
        
        Args:
            text: 文本
            number_types: 要识别的数字类型列表
            
        Returns:
            List[Dict]: 指定类型的识别结果
        """
        results = []
        
        for number_type in number_types:
            if number_type in self.patterns:
                pattern_info = self.patterns[number_type]
                matches = re.finditer(pattern_info['pattern'], text)
                
                for match in matches:
                    results.append({
                        'type': number_type,
                        'value': match.group(),
                        'start': match.start(),
                        'end': match.end(),
                        'importance': pattern_info['importance_base']
                    })
        
        return results
    
    def _extract_context(self, text: str, start: int, end: int, context_length: int = 50) -> str:
        """提取数字周围的上下文"""
        context_start = max(0, start - context_length)
        context_end = min(len(text), end + context_length)
        
        context = text[context_start:context_end]
        
        # 在数字位置标记
        relative_start = start - context_start
        relative_end = end - context_start
        
        context_with_marker = (
            context[:relative_start] + 
            "【" + context[relative_start:relative_end] + "】" + 
            context[relative_end:]
        )
        
        return context_with_marker.strip()
    
    def _calculate_importance(self, number_info: Dict, full_text: str, context: str) -> int:
        """
        计算数字的重要性评分
        
        Args:
            number_info: 数字信息
            full_text: 完整文本
            context: 上下文
            
        Returns:
            int: 重要性评分
        """
        importance = number_info['raw_importance']
        
        # 基于上下文关键词加权
        context_snippet = number_info['context_snippet'].lower()
        
        for category, info in self.importance_keywords.items():
            for keyword in info['keywords']:
                if keyword.lower() in context_snippet:
                    importance += info['weight']
                    logger.debug(f"关键词加权: {keyword} +{info['weight']}")
        
        # 🔧 特殊规则：小数点数字在税务文档中通常很重要
        if '.' in number_info['value'] and ('税' in full_text or '應納' in full_text):
            importance += 15
            logger.debug(f"小数点税务数字加权: +15")
        
        # 位置权重：文档前部分的数字通常更重要
        text_position = number_info['start'] / len(full_text)
        if text_position < 0.3:  # 前30%
            importance += 5
        elif text_position > 0.8:  # 后20%
            importance -= 3
        
        # 类型特殊权重
        type_bonus = {
            'currency': 5,
            'percentage': 3,
            'decimal_number': 8,  # 小数通常重要
            'tax_rate': 10
        }
        
        importance += type_bonus.get(number_info['type'], 0)
        
        return max(importance, 0)
    
    def get_most_important_numbers(self, text: str, top_n: int = 5) -> List[Dict]:
        """获取最重要的N个数字"""
        all_numbers = self.recognize_all_numbers(text)
        return all_numbers[:top_n]
    
    def validate_number_recognition(self, original_text: str, processed_text: str) -> Dict:
        """
        验证数字识别的完整性
        
        Args:
            original_text: 原始文本
            processed_text: 处理后文本
            
        Returns:
            Dict: 验证结果
        """
        original_numbers = self.recognize_all_numbers(original_text)
        processed_numbers = self.recognize_all_numbers(processed_text)
        
        # 🔧 重点检查小数点数字
        original_decimals = [n for n in original_numbers if '.' in n['value']]
        processed_decimals = [n for n in processed_numbers if '.' in n['value']]
        
        # 按类型统计
        def count_by_type(numbers):
            counts = {}
            for num in numbers:
                counts[num['type']] = counts.get(num['type'], 0) + 1
            return counts
        
        original_counts = count_by_type(original_numbers)
        processed_counts = count_by_type(processed_numbers)
        
        validation_result = {
            'total_numbers': {
                'original': len(original_numbers),
                'processed': len(processed_numbers),
                'lost': len(original_numbers) - len(processed_numbers)
            },
            'decimal_numbers': {
                'original': len(original_decimals),
                'processed': len(processed_decimals),
                'lost': len(original_decimals) - len(processed_decimals)
            },
            'by_type': {},
            'critical_losses': [],
            'validation_passed': True
        }
        
        # 按类型详细比较
        all_types = set(original_counts.keys()) | set(processed_counts.keys())
        for num_type in all_types:
            original_count = original_counts.get(num_type, 0)
            processed_count = processed_counts.get(num_type, 0)
            lost_count = original_count - processed_count
            
            validation_result['by_type'][num_type] = {
                'original': original_count,
                'processed': processed_count,
                'lost': lost_count
            }
            
            # 检查关键损失
            if lost_count > 0:
                if num_type in ['currency', 'decimal_number', 'percentage']:
                    validation_result['critical_losses'].append({
                        'type': num_type,
                        'lost_count': lost_count,
                        'severity': 'high' if num_type == 'decimal_number' else 'medium'
                    })
        
        # 判断验证是否通过
        total_lost = validation_result['total_numbers']['lost']
        decimal_lost = validation_result['decimal_numbers']['lost']
        
        if decimal_lost > 0:
            validation_result['validation_passed'] = False
            logger.warning(f"❌ 验证失败：丢失 {decimal_lost} 个小数")
        elif total_lost > len(original_numbers) * 0.1:  # 丢失超过10%
            validation_result['validation_passed'] = False
            logger.warning(f"❌ 验证失败：丢失 {total_lost} 个数字 ({total_lost/len(original_numbers)*100:.1f}%)")
        else:
            logger.success("✅ 数字识别验证通过")
        
        return validation_result
    
    def generate_recognition_report(self, text: str) -> str:
        """生成数字识别报告"""
        numbers = self.recognize_all_numbers(text)
        
        report_lines = [
            "=" * 50,
            "数字识别报告 v3.0",
            "=" * 50,
            f"总识别数量: {len(numbers)}",
            ""
        ]
        
        # 按类型统计
        type_counts = {}
        for num in numbers:
            type_counts[num['type']] = type_counts.get(num['type'], 0) + 1
        
        report_lines.append("按类型统计:")
        for num_type, count in sorted(type_counts.items()):
            examples = [n['value'] for n in numbers if n['type'] == num_type][:3]
            examples_str = ', '.join(examples)
            report_lines.append(f"  {num_type}: {count} 个 (例: {examples_str})")
        
        report_lines.append("")
        
        # 重要性排名
        top_numbers = numbers[:10]
        if top_numbers:
            report_lines.append("重要性排名 (前10):")
            for i, num in enumerate(top_numbers, 1):
                report_lines.append(
                    f"  {i}. {num['value']} ({num['type']}) - 重要性: {num['final_importance']}"
                )
        
        report_lines.append("")
        
        # 🔧 小数点数字专项检查
        decimal_numbers = [n for n in numbers if '.' in n['value']]
        if decimal_numbers:
            report_lines.append(f"小数点数字检查: 发现 {len(decimal_numbers)} 个")
            for num in decimal_numbers:
                report_lines.append(f"  - {num['value']} (重要性: {num['final_importance']})")
        else:
            report_lines.append("小数点数字检查: 未发现小数点数字")
        
        report_lines.extend([
            "",
            "=" * 50,
            "报告生成完成"
        ])
        
        return "\n".join(report_lines)

# 测试和验证函数

def test_number_recognition():
    """测试数字识别功能"""
    recognizer = NumberRecognizer()
    
    # 🔧 包含小数点的测试文本
    test_text = """
    遗产总额：1億 5,000萬元
    减除免税额：1,333萬元
    应纳遗产税：9,936萬元 × 15% - 281.05萬元 = 1,209.35萬元
    截止日期：9月22日前
    法规依据：第15条第1项
    """
    
    print("🧪 测试数字识别器...")
    numbers = recognizer.recognize_all_numbers(test_text)
    
    print(f"识别到 {len(numbers)} 个数字:")
    for num in numbers:
        print(f"  {num['value']} ({num['type']}) - 重要性: {num['final_importance']}")
    
    # 检查小数点识别
    decimals = [n for n in numbers if '.' in n['value']]
    print(f"\n小数点数字: {len(decimals)} 个")
    for decimal in decimals:
        print(f"  ✅ {decimal['value']}")
    
    return len(decimals) > 0

if __name__ == "__main__":
    # 运行测试
    success = test_number_recognition()
    if success:
        print("\n✅ 小数点识别测试通过")
    else:
        print("\n❌ 小数点识别测试失败")