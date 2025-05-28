#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
內容完整性驗證工具 - 確保Word到HTML轉換過程無內容丟失
"""

import re
from typing import Dict, List, Any
from loguru import logger
from pathlib import Path

class ContentValidationTool:
    """內容完整性驗證工具"""
    
    def __init__(self):
        """初始化驗證工具"""
        self.validation_rules = {
            'title_preservation': True,
            'content_length_threshold': 0.8,  # HTML長度應至少為原文的80%
            'structure_elements': ['h2', 'h3', 'h4', 'ul', 'ol', 'li'],
            'highlight_elements': ['date-highlight', 'amount-highlight', 'law-highlight'],
            'required_sections': ['前言', '結語']
        }
    
    def validate_conversion(self, original_doc: Dict[str, Any], converted_html: str) -> Dict[str, Any]:
        """
        驗證Word到HTML的轉換完整性
        
        Args:
            original_doc: 原始文檔信息
            converted_html: 轉換後的HTML
            
        Returns:
            Dict: 驗證結果
        """
        logger.info("🔍 開始內容完整性驗證...")
        
        validation_result = {
            'is_valid': True,
            'warnings': [],
            'errors': [],
            'statistics': {},
            'suggestions': []
        }
        
        # 1. 基本長度檢查
        self._validate_content_length(original_doc, converted_html, validation_result)
        
        # 2. 結構元素檢查
        self._validate_html_structure(converted_html, validation_result)
        
        # 3. 關鍵內容檢查
        self._validate_key_content(original_doc, converted_html, validation_result)
        
        # 4. 格式轉換檢查
        self._validate_formatting(original_doc, converted_html, validation_result)
        
        # 5. 高亮功能檢查
        self._validate_highlights(converted_html, validation_result)
        
        # 總結驗證結果
        if validation_result['errors']:
            validation_result['is_valid'] = False
            logger.error(f"❌ 驗證失敗，發現 {len(validation_result['errors'])} 個錯誤")
        elif validation_result['warnings']:
            logger.warning(f"⚠️  驗證通過但有 {len(validation_result['warnings'])} 個警告")
        else:
            logger.success("✅ 內容完整性驗證通過")
        
        return validation_result
    
    def _validate_content_length(self, original_doc: Dict, html: str, result: Dict):
        """驗證內容長度"""
        original_content = original_doc.get('content', [])
        original_length = sum(len(para) for para in original_content)
        
        # 移除HTML標籤計算純文本長度
        html_text = re.sub(r'<[^>]+>', '', html)
        html_length = len(html_text.strip())
        
        length_ratio = html_length / original_length if original_length > 0 else 0
        
        result['statistics']['original_length'] = original_length
        result['statistics']['html_length'] = html_length
        result['statistics']['length_ratio'] = length_ratio
        
        if length_ratio < self.validation_rules['content_length_threshold']:
            result['errors'].append(
                f"內容長度過短：HTML文本長度 ({html_length}) 與原文長度 ({original_length}) 比例僅 {length_ratio:.2%}，低於閾值 {self.validation_rules['content_length_threshold']:.2%}"
            )
        
        logger.info(f"📊 長度統計 - 原文: {original_length}, HTML: {html_length}, 比例: {length_ratio:.2%}")
    
    def _validate_html_structure(self, html: str, result: Dict):
        """驗證HTML結構"""
        structure_stats = {}
        
        for element in self.validation_rules['structure_elements']:
            if element in ['ul', 'ol']:
                # 列表元素
                count = len(re.findall(rf'<{element}(?:\s[^>]*)?>.*?</{element}>', html, re.DOTALL))
            elif element == 'li':
                # 列表項目
                count = len(re.findall(r'<li(?:\s[^>]*)?>.*?</li>', html, re.DOTALL))
            else:
                # 標題元素
                count = len(re.findall(rf'<{element}(?:\s[^>]*)?>', html))
            
            structure_stats[element] = count
        
        result['statistics']['structure_elements'] = structure_stats
        
        # 檢查是否有基本結構
        if structure_stats.get('h2', 0) == 0:
            result['warnings'].append("未發現h2主標題，可能缺少主要章節結構")
        
        if structure_stats.get('li', 0) == 0:
            result['warnings'].append("未發現列表項目，原文中的列表可能未正確轉換")
        
        logger.info(f"🏗️  結構統計: {structure_stats}")
    
    def _validate_key_content(self, original_doc: Dict, html: str, result: Dict):
        """驗證關鍵內容"""
        original_content = ' '.join(original_doc.get('content', []))
        
        # 檢查必要章節
        for section in self.validation_rules['required_sections']:
            if section in original_content and section not in html:
                result['errors'].append(f"缺少必要章節：{section}")
        
        # 檢查數字內容（日期、金額等）
        original_dates = re.findall(r'\d{1,2}月\d{1,2}日', original_content)
        html_dates = re.findall(r'\d{1,2}月\d{1,2}日', html)
        
        if len(original_dates) > len(html_dates):
            result['warnings'].append(
                f"日期信息可能丟失：原文 {len(original_dates)} 個日期，HTML中 {len(html_dates)} 個"
            )
        
        # 檢查金額信息
        original_amounts = re.findall(r'\d+(?:,\d{3})*(?:萬?元|萬)', original_content)
        html_amounts = re.findall(r'\d+(?:,\d{3})*(?:萬?元|萬)', html)
        
        if len(original_amounts) > len(html_amounts):
            result['warnings'].append(
                f"金額信息可能丟失：原文 {len(original_amounts)} 個金額，HTML中 {len(html_amounts)} 個"
            )
        
        logger.info(f"🔍 關鍵內容 - 日期: {len(html_dates)}/{len(original_dates)}, 金額: {len(html_amounts)}/{len(original_amounts)}")
    
    def _validate_formatting(self, original_doc: Dict, html: str, result: Dict):
        """驗證格式轉換"""
        original_content = ' '.join(original_doc.get('content', []))
        
        # 檢查粗體轉換
        original_bold = re.findall(r'\*\*(.*?)\*\*', original_content)
        html_bold = re.findall(r'<strong>(.*?)</strong>', html)
        
        result['statistics']['bold_conversion'] = {
            'original': len(original_bold),
            'converted': len(html_bold)
        }
        
        if len(original_bold) > len(html_bold):
            result['warnings'].append(
                f"粗體格式轉換不完整：原文 {len(original_bold)} 個，HTML中 {len(html_bold)} 個"
            )
        
        logger.info(f"🎨 格式轉換 - 粗體: {len(html_bold)}/{len(original_bold)}")
    
    def _validate_highlights(self, html: str, result: Dict):
        """驗證高亮功能"""
        highlight_stats = {}
        
        for highlight_class in self.validation_rules['highlight_elements']:
            count = len(re.findall(rf'class="{highlight_class}"', html))
            highlight_stats[highlight_class] = count
        
        result['statistics']['highlights'] = highlight_stats
        
        total_highlights = sum(highlight_stats.values())
        if total_highlights == 0:
            result['warnings'].append("未發現任何高亮標記，可能需要檢查高亮功能")
        
        logger.info(f"🎯 高亮統計: {highlight_stats} (總計: {total_highlights})")
    
    def generate_validation_report(self, validation_result: Dict) -> str:
        """
        生成驗證報告
        
        Args:
            validation_result: 驗證結果
            
        Returns:
            str: 格式化的報告
        """
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append("📋 內容完整性驗證報告")
        report_lines.append("=" * 60)
        
        # 總體結果
        status = "✅ 通過" if validation_result['is_valid'] else "❌ 失敗"
        report_lines.append(f"驗證結果: {status}")
        report_lines.append("")
        
        # 統計信息
        if 'statistics' in validation_result:
            report_lines.append("📊 統計信息:")
            stats = validation_result['statistics']
            
            if 'original_length' in stats:
                report_lines.append(f"  • 原文長度: {stats['original_length']} 字符")
                report_lines.append(f"  • HTML長度: {stats['html_length']} 字符")
                report_lines.append(f"  • 保留比例: {stats['length_ratio']:.2%}")
            
            if 'structure_elements' in stats:
                report_lines.append("  • 結構元素:")
                for element, count in stats['structure_elements'].items():
                    report_lines.append(f"    - {element}: {count}")
            
            if 'highlights' in stats:
                report_lines.append("  • 高亮統計:")
                for highlight, count in stats['highlights'].items():
                    report_lines.append(f"    - {highlight}: {count}")
            
            report_lines.append("")
        
        # 錯誤信息
        if validation_result['errors']:
            report_lines.append("❌ 錯誤:")
            for error in validation_result['errors']:
                report_lines.append(f"  • {error}")
            report_lines.append("")
        
        # 警告信息
        if validation_result['warnings']:
            report_lines.append("⚠️  警告:")
            for warning in validation_result['warnings']:
                report_lines.append(f"  • {warning}")
            report_lines.append("")
        
        # 建議
        if validation_result['suggestions']:
            report_lines.append("💡 建議:")
            for suggestion in validation_result['suggestions']:
                report_lines.append(f"  • {suggestion}")
            report_lines.append("")
        
        report_lines.append("=" * 60)
        
        return "\n".join(report_lines)

def test_word_to_html_conversion(word_file_path: str):
    """
    測試Word到HTML轉換的完整流程
    
    Args:
        word_file_path: Word文件路徑
    """
    from integrated_word_processor import IntegratedWordProcessor
    
    logger.info(f"🧪 開始測試Word到HTML轉換: {word_file_path}")
    
    try:
        # 初始化處理器
        processor = IntegratedWordProcessor()
        validator = ContentValidationTool()
        
        # 提取內容
        doc_info = processor.extract_content(word_file_path)
        
        # 驗證轉換結果
        validation_result = validator.validate_conversion(doc_info, doc_info['processed_html'])
        
        # 生成報告
        report = validator.generate_validation_report(validation_result)
        print(report)
        
        # 保存HTML到文件用於檢查
        output_path = Path(word_file_path).with_suffix('.test.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>測試轉換結果</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', sans-serif; margin: 2rem; }}
        .validation-info {{ background: #f0f8ff; padding: 1rem; margin-bottom: 2rem; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="validation-info">
        <h2>驗證結果</h2>
        <pre>{report}</pre>
    </div>
    <hr>
    <div class="content">
        {doc_info['processed_html']}
    </div>
</body>
</html>
            """)
        
        logger.success(f"✅ 測試完成，結果已保存到: {output_path}")
        return validation_result
        
    except Exception as e:
        logger.error(f"❌ 測試失敗: {str(e)}")
        return None

if __name__ == "__main__":
    # 測試示例
    test_file = "word-docs/2025-01-02-2025年台灣稅務行事曆全攻略：企業與個人不可不知的關鍵時程.docx"
    test_word_to_html_conversion(test_file)