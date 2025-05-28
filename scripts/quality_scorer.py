#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文檔質量智能評分器 v3.0
多維度評估文檔處理質量，提供詳細的質量報告和改進建議
"""

import re
import math
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from loguru import logger

class QualityLevel(Enum):
    """質量級別枚舉"""
    EXCELLENT = "excellent"      # 90-100分
    GOOD = "good"               # 80-89分  
    ACCEPTABLE = "acceptable"    # 70-79分
    NEEDS_IMPROVEMENT = "needs_improvement"  # 60-69分
    POOR = "poor"               # <60分

class QualityDimension(Enum):
    """質量維度枚舉"""
    CONTENT_INTEGRITY = "content_integrity"        # 內容完整性
    FORMAT_CONVERSION = "format_conversion"        # 格式轉換質量
    STRUCTURE_QUALITY = "structure_quality"        # 結構質量
    SEO_OPTIMIZATION = "seo_optimization"          # SEO優化程度
    HIGHLIGHT_ACCURACY = "highlight_accuracy"      # 高亮準確性
    READABILITY = "readability"                    # 可讀性
    TECHNICAL_ACCURACY = "technical_accuracy"      # 技術準確性

@dataclass
class QualityScore:
    """質量評分數據類"""
    dimension: QualityDimension
    score: float
    max_score: float
    weight: float
    details: Dict[str, Any] = field(default_factory=dict)
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)

@dataclass
class QualityReport:
    """質量報告數據類"""
    overall_score: float
    quality_level: QualityLevel
    dimension_scores: List[QualityScore]
    processing_time: float
    document_info: Dict[str, Any]
    
    # 統計信息
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    
    # 改進建議
    priority_improvements: List[str] = field(default_factory=list)
    technical_recommendations: List[str] = field(default_factory=list)
    
    # 時間戳
    evaluation_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

class QualityScorer:
    """文檔質量智能評分器"""
    
    def __init__(self):
        """初始化質量評分器"""
        
        # 評分權重配置
        self.dimension_weights = {
            QualityDimension.CONTENT_INTEGRITY: 0.25,    # 內容完整性 25%
            QualityDimension.FORMAT_CONVERSION: 0.20,    # 格式轉換 20%
            QualityDimension.STRUCTURE_QUALITY: 0.15,    # 結構質量 15%
            QualityDimension.SEO_OPTIMIZATION: 0.15,     # SEO優化 15%
            QualityDimension.HIGHLIGHT_ACCURACY: 0.10,   # 高亮準確性 10%
            QualityDimension.READABILITY: 0.10,          # 可讀性 10%
            QualityDimension.TECHNICAL_ACCURACY: 0.05    # 技術準確性 5%
        }
        
        # 質量標準
        self.quality_standards = self._load_quality_standards()
        
        # 檢查規則
        self.check_rules = self._load_check_rules()
        
        logger.info("✅ 質量評分器初始化完成")
    
    def evaluate_document_quality(self, 
                                  original_doc: Dict[str, Any],
                                  processed_html: str,
                                  seo_result: Optional[Dict] = None,
                                  classification_result: Optional[Any] = None) -> QualityReport:
        """
        全面評估文檔質量
        
        Args:
            original_doc: 原始文檔數據
            processed_html: 處理後的HTML
            seo_result: SEO優化結果（可選）
            classification_result: 分類結果（可選）
            
        Returns:
            QualityReport: 詳細的質量報告
        """
        logger.info("🔍 開始文檔質量評估...")
        start_time = datetime.now()
        
        dimension_scores = []
        
        # 1. 內容完整性評估
        content_score = self._evaluate_content_integrity(original_doc, processed_html)
        dimension_scores.append(content_score)
        
        # 2. 格式轉換質量評估
        format_score = self._evaluate_format_conversion(original_doc, processed_html)
        dimension_scores.append(format_score)
        
        # 3. 結構質量評估
        structure_score = self._evaluate_structure_quality(original_doc, processed_html)
        dimension_scores.append(structure_score)
        
        # 4. SEO優化評估
        seo_score = self._evaluate_seo_optimization(original_doc, processed_html, seo_result)
        dimension_scores.append(seo_score)
        
        # 5. 高亮準確性評估（v3.0核心改進）
        highlight_score = self._evaluate_highlight_accuracy(processed_html)
        dimension_scores.append(highlight_score)
        
        # 6. 可讀性評估
        readability_score = self._evaluate_readability(processed_html)
        dimension_scores.append(readability_score)
        
        # 7. 技術準確性評估
        technical_score = self._evaluate_technical_accuracy(processed_html)
        dimension_scores.append(technical_score)
        
        # 計算總體評分
        overall_score = self._calculate_overall_score(dimension_scores)
        
        # 確定質量級別
        quality_level = self._determine_quality_level(overall_score)
        
        # 生成改進建議
        improvements = self._generate_improvement_suggestions(dimension_scores, overall_score)
        
        # 統計檢查結果
        total_checks = sum(len(score.details.get('checks', [])) for score in dimension_scores)
        passed_checks = sum(len([c for c in score.details.get('checks', []) if c.get('passed', False)]) for score in dimension_scores)
        failed_checks = total_checks - passed_checks
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        report = QualityReport(
            overall_score=overall_score,
            quality_level=quality_level,
            dimension_scores=dimension_scores,
            processing_time=processing_time,
            document_info={
                'title': original_doc.get('title', ''),
                'content_length': len(' '.join(original_doc.get('content', []))),
                'html_length': len(processed_html),
                'file_name': original_doc.get('filename', '')
            },
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            priority_improvements=improvements['priority'],
            technical_recommendations=improvements['technical']
        )
        
        logger.success(f"✅ 質量評估完成，總分: {overall_score:.1f}/100 ({quality_level.value})")
        return report
    
    def _evaluate_content_integrity(self, original_doc: Dict, processed_html: str) -> QualityScore:
        """評估內容完整性"""
        original_content = ' '.join(original_doc.get('content', []))
        html_text = re.sub(r'<[^>]+>', '', processed_html)
        
        checks = []
        score = 100
        issues = []
        
        # 檢查1: 內容長度保留率
        original_length = len(original_content)
        html_length = len(html_text)
        retention_rate = html_length / original_length if original_length > 0 else 0
        
        checks.append({
            'name': '內容長度保留',
            'passed': retention_rate >= 0.85,
            'value': f"{retention_rate:.2%}",
            'expected': '≥85%'
        })
        
        if retention_rate < 0.85:
            score -= 20
            issues.append(f"內容保留率過低: {retention_rate:.2%}")
        
        # 檢查2: 關鍵信息保留
        # 🔧 v3.0 改進：精確檢查小數點數字
        original_decimals = re.findall(r'\d+\.\d+', original_content)
        html_decimals = re.findall(r'\d+\.\d+', html_text)
        
        decimal_retention = len(html_decimals) / len(original_decimals) if original_decimals else 1.0
        
        checks.append({
            'name': '小數點數字保留',
            'passed': decimal_retention >= 0.95,
            'value': f"{len(html_decimals)}/{len(original_decimals)}",
            'expected': '≥95%保留率'
        })
        
        if decimal_retention < 0.95:
            score -= 15
            issues.append(f"小數點數字丟失: {len(original_decimals) - len(html_decimals)} 個")
        
        # 檢查3: 日期信息保留
        original_dates = re.findall(r'\d{1,2}月\d{1,2}日', original_content)
        html_dates = re.findall(r'\d{1,2}月\d{1,2}日', html_text)
        
        date_retention = len(html_dates) / len(original_dates) if original_dates else 1.0
        
        checks.append({
            'name': '日期信息保留',
            'passed': date_retention >= 0.95,
            'value': f"{len(html_dates)}/{len(original_dates)}",
            'expected': '≥95%保留率'
        })
        
        if date_retention < 0.95:
            score -= 10
            issues.append(f"日期信息丟失: {len(original_dates) - len(html_dates)} 個")
        
        # 檢查4: 法條引用保留
        original_laws = re.findall(r'第\d+條(?:之\d+)?', original_content)
        html_laws = re.findall(r'第\d+條(?:之\d+)?', html_text)
        
        law_retention = len(html_laws) / len(original_laws) if original_laws else 1.0
        
        checks.append({
            'name': '法條引用保留',
            'passed': law_retention >= 0.95,
            'value': f"{len(html_laws)}/{len(original_laws)}",
            'expected': '≥95%保留率'
        })
        
        if law_retention < 0.95:
            score -= 10
            issues.append(f"法條引用丟失: {len(original_laws) - len(html_laws)} 個")
        
        return QualityScore(
            dimension=QualityDimension.CONTENT_INTEGRITY,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.CONTENT_INTEGRITY],
            details={
                'retention_rate': retention_rate,
                'decimal_retention': decimal_retention,
                'date_retention': date_retention,
                'law_retention': law_retention,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_content_suggestions(retention_rate, issues)
        )
    
    def _evaluate_format_conversion(self, original_doc: Dict, processed_html: str) -> QualityScore:
        """評估格式轉換質量"""
        score = 100
        checks = []
        issues = []
        
        # 檢查1: HTML結構有效性
        has_valid_structure = bool(re.search(r'<h[1-6]>', processed_html) and 
                                   re.search(r'<p>', processed_html))
        
        checks.append({
            'name': 'HTML結構有效性',
            'passed': has_valid_structure,
            'value': '有效' if has_valid_structure else '無效',
            'expected': '包含標題和段落'
        })
        
        if not has_valid_structure:
            score -= 25
            issues.append("缺少基本HTML結構元素")
        
        # 檢查2: 粗體格式轉換
        original_bold_count = len(re.findall(r'\*\*(.*?)\*\*', ' '.join(original_doc.get('content', []))))
        html_bold_count = len(re.findall(r'<strong>(.*?)</strong>', processed_html))
        
        bold_conversion_rate = html_bold_count / original_bold_count if original_bold_count > 0 else 1.0
        
        checks.append({
            'name': '粗體格式轉換',
            'passed': bold_conversion_rate >= 0.8,
            'value': f"{html_bold_count}/{original_bold_count}",
            'expected': '≥80%轉換率'
        })
        
        if bold_conversion_rate < 0.8:
            score -= 15
            issues.append(f"粗體格式轉換不完整: {bold_conversion_rate:.2%}")
        
        # 檢查3: 列表結構轉換
        has_lists = bool(re.search(r'<ul>|<ol>', processed_html))
        list_items_count = len(re.findall(r'<li>', processed_html))
        
        checks.append({
            'name': '列表結構轉換',
            'passed': has_lists or list_items_count == 0,
            'value': f"{list_items_count} 個列表項目",
            'expected': '正確轉換列表結構'
        })
        
        # 檢查4: 特殊字符處理
        special_chars_preserved = not bool(re.search(r'&lt;|&gt;|&amp;(?!#)', processed_html))
        
        checks.append({
            'name': '特殊字符處理',
            'passed': special_chars_preserved,
            'value': '正確' if special_chars_preserved else '有問題',
            'expected': '正確編碼特殊字符'
        })
        
        if not special_chars_preserved:
            score -= 10
            issues.append("特殊字符編碼有問題")
        
        return QualityScore(
            dimension=QualityDimension.FORMAT_CONVERSION,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.FORMAT_CONVERSION],
            details={
                'bold_conversion_rate': bold_conversion_rate,
                'list_items_count': list_items_count,
                'has_valid_structure': has_valid_structure,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_format_suggestions(issues)
        )
    
    def _evaluate_structure_quality(self, original_doc: Dict, processed_html: str) -> QualityScore:
        """評估結構質量"""
        score = 100
        checks = []
        issues = []
        
        # 檢查1: 標題層級結構
        h1_count = len(re.findall(r'<h1>', processed_html))
        h2_count = len(re.findall(r'<h2>', processed_html))
        h3_count = len(re.findall(r'<h3>', processed_html))
        
        has_proper_hierarchy = h1_count <= 1 and h2_count >= 1
        
        checks.append({
            'name': '標題層級結構',
            'passed': has_proper_hierarchy,
            'value': f"H1:{h1_count}, H2:{h2_count}, H3:{h3_count}",
            'expected': 'H1≤1, H2≥1'
        })
        
        if not has_proper_hierarchy:
            score -= 20
            issues.append("標題層級結構不當")
        
        # 檢查2: 段落長度分布
        paragraphs = re.findall(r'<p>(.*?)</p>', processed_html, re.DOTALL)
        if paragraphs:
            avg_para_length = sum(len(p) for p in paragraphs) / len(paragraphs)
            reasonable_length = 50 <= avg_para_length <= 500
            
            checks.append({
                'name': '段落長度分布',
                'passed': reasonable_length,
                'value': f"平均 {avg_para_length:.0f} 字符",
                'expected': '50-500字符'
            })
            
            if not reasonable_length:
                score -= 10
                issues.append(f"段落長度不當: 平均{avg_para_length:.0f}字符")
        
        # 檢查3: 內容組織邏輯
        has_logical_flow = self._check_logical_flow(processed_html)
        
        checks.append({
            'name': '內容組織邏輯',
            'passed': has_logical_flow,
            'value': '邏輯清晰' if has_logical_flow else '邏輯混亂',
            'expected': '清晰的內容流'
        })
        
        if not has_logical_flow:
            score -= 15
            issues.append("內容組織邏輯性不足")
        
        return QualityScore(
            dimension=QualityDimension.STRUCTURE_QUALITY,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.STRUCTURE_QUALITY],
            details={
                'title_hierarchy': {'h1': h1_count, 'h2': h2_count, 'h3': h3_count},
                'paragraph_count': len(paragraphs),
                'avg_paragraph_length': avg_para_length if paragraphs else 0,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_structure_suggestions(issues)
        )
    
    def _evaluate_seo_optimization(self, original_doc: Dict, processed_html: str, seo_result: Optional[Dict]) -> QualityScore:
        """評估SEO優化質量"""
        score = 100
        checks = []
        issues = []
        
        # 檢查1: META標籤存在性
        if seo_result:
            metadata = seo_result.get('metadata')
            has_title = bool(metadata and metadata.title)
            has_description = bool(metadata and metadata.meta_description)
            has_keywords = bool(metadata and metadata.keywords)
            
            checks.append({
                'name': 'META標籤完整性',
                'passed': has_title and has_description,
                'value': f"標題:{has_title}, 描述:{has_description}, 關鍵詞:{has_keywords}",
                'expected': '包含標題和描述'
            })
            
            if not (has_title and has_description):
                score -= 20
                issues.append("缺少必要的META標籤")
        else:
            score -= 30
            issues.append("未進行SEO優化")
        
        # 檢查2: URL友好性
        if seo_result and 'url_optimization' in seo_result:
            url_score = seo_result['url_optimization'].seo_score
            url_friendly = url_score >= 70
            
            checks.append({
                'name': 'URL友好性',
                'passed': url_friendly,
                'value': f"{url_score:.0f}/100",
                'expected': '≥70分'
            })
            
            if not url_friendly:
                score -= 15
                issues.append(f"URL不夠友好: {url_score:.0f}分")
        
        # 檢查3: 內容關鍵詞密度
        content_text = re.sub(r'<[^>]+>', '', processed_html)
        keyword_density = self._calculate_keyword_density(content_text)
        appropriate_density = 0.01 <= keyword_density <= 0.03
        
        checks.append({
            'name': '關鍵詞密度',
            'passed': appropriate_density,
            'value': f"{keyword_density:.2%}",
            'expected': '1%-3%'
        })
        
        if not appropriate_density:
            score -= 10
            issues.append(f"關鍵詞密度不當: {keyword_density:.2%}")
        
        return QualityScore(
            dimension=QualityDimension.SEO_OPTIMIZATION,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.SEO_OPTIMIZATION],
            details={
                'has_seo_optimization': bool(seo_result),
                'keyword_density': keyword_density,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_seo_suggestions(issues)
        )
    
    def _evaluate_highlight_accuracy(self, processed_html: str) -> QualityScore:
        """評估高亮準確性（v3.0核心改進）"""
        score = 100
        checks = []
        issues = []
        
        # 檢查1: 小數點數字高亮
        decimal_numbers = re.findall(r'\d+\.\d+', processed_html)
        highlighted_decimals = re.findall(r'<span[^>]*class="[^"]*(?:amount|percent)[^"]*"[^>]*>\d+\.\d+', processed_html)
        
        decimal_highlight_rate = len(highlighted_decimals) / len(decimal_numbers) if decimal_numbers else 1.0
        
        checks.append({
            'name': '小數點數字高亮',
            'passed': decimal_highlight_rate >= 0.8,
            'value': f"{len(highlighted_decimals)}/{len(decimal_numbers)}",
            'expected': '≥80%高亮率'
        })
        
        if decimal_highlight_rate < 0.8:
            score -= 25
            issues.append(f"小數點數字高亮不足: {decimal_highlight_rate:.2%}")
        
        # 檢查2: 日期高亮
        dates = re.findall(r'\d{1,2}月\d{1,2}日', processed_html)
        highlighted_dates = re.findall(r'<span[^>]*class="[^"]*date[^"]*"[^>]*>\d{1,2}月\d{1,2}日', processed_html)
        
        date_highlight_rate = len(highlighted_dates) / len(dates) if dates else 1.0
        
        checks.append({
            'name': '日期高亮',
            'passed': date_highlight_rate >= 0.7,
            'value': f"{len(highlighted_dates)}/{len(dates)}",
            'expected': '≥70%高亮率'
        })
        
        if date_highlight_rate < 0.7:
            score -= 20
            issues.append(f"日期高亮不足: {date_highlight_rate:.2%}")
        
        # 檢查3: 法條高亮
        laws = re.findall(r'第\d+條(?:之\d+)?', processed_html)
        highlighted_laws = re.findall(r'<span[^>]*class="[^"]*law[^"]*"[^>]*>第\d+條(?:之\d+)?', processed_html)
        
        law_highlight_rate = len(highlighted_laws) / len(laws) if laws else 1.0
        
        checks.append({
            'name': '法條引用高亮',
            'passed': law_highlight_rate >= 0.8,
            'value': f"{len(highlighted_laws)}/{len(laws)}",
            'expected': '≥80%高亮率'
        })
        
        if law_highlight_rate < 0.8:
            score -= 15
            issues.append(f"法條高亮不足: {law_highlight_rate:.2%}")
        
        # 檢查4: 高亮衝突檢測
        highlight_conflicts = self._detect_highlight_conflicts(processed_html)
        
        checks.append({
            'name': '高亮衝突檢測',
            'passed': len(highlight_conflicts) == 0,
            'value': f"{len(highlight_conflicts)} 個衝突",
            'expected': '無衝突'
        })
        
        if highlight_conflicts:
            score -= 10
            issues.append(f"發現 {len(highlight_conflicts)} 個高亮衝突")
        
        return QualityScore(
            dimension=QualityDimension.HIGHLIGHT_ACCURACY,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.HIGHLIGHT_ACCURACY],
            details={
                'decimal_highlight_rate': decimal_highlight_rate,
                'date_highlight_rate': date_highlight_rate,
                'law_highlight_rate': law_highlight_rate,
                'highlight_conflicts': highlight_conflicts,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_highlight_suggestions(issues)
        )
    
    def _evaluate_readability(self, processed_html: str) -> QualityScore:
        """評估可讀性"""
        score = 100
        checks = []
        issues = []
        
        # 移除HTML標籤獲取純文本
        text = re.sub(r'<[^>]+>', '', processed_html)
        
        # 檢查1: 句子長度分布
        sentences = re.split(r'[。！？.!?]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if sentences:
            avg_sentence_length = sum(len(s) for s in sentences) / len(sentences)
            reasonable_sentence_length = 15 <= avg_sentence_length <= 50
            
            checks.append({
                'name': '句子長度',
                'passed': reasonable_sentence_length,
                'value': f"平均 {avg_sentence_length:.1f} 字符",
                'expected': '15-50字符'
            })
            
            if not reasonable_sentence_length:
                score -= 15
                issues.append(f"句子長度不當: 平均{avg_sentence_length:.1f}字符")
        
        # 檢查2: 段落結構
        paragraphs = re.findall(r'<p>(.*?)</p>', processed_html, re.DOTALL)
        if paragraphs:
            empty_paragraphs = sum(1 for p in paragraphs if len(re.sub(r'<[^>]+>', '', p).strip()) < 10)
            empty_rate = empty_paragraphs / len(paragraphs)
            
            checks.append({
                'name': '段落結構',
                'passed': empty_rate < 0.2,
                'value': f"{empty_paragraphs}/{len(paragraphs)} 空段落",
                'expected': '<20%空段落'
            })
            
            if empty_rate >= 0.2:
                score -= 10
                issues.append(f"空段落過多: {empty_rate:.2%}")
        
        # 檢查3: 列表使用
        list_count = len(re.findall(r'<ul>|<ol>', processed_html))
        has_appropriate_lists = list_count > 0 or len(text) < 500
        
        checks.append({
            'name': '列表使用',
            'passed': has_appropriate_lists,
            'value': f"{list_count} 個列表",
            'expected': '適當使用列表'
        })
        
        return QualityScore(
            dimension=QualityDimension.READABILITY,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.READABILITY],
            details={
                'avg_sentence_length': avg_sentence_length if sentences else 0,
                'paragraph_count': len(paragraphs),
                'list_count': list_count,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_readability_suggestions(issues)
        )
    
    def _evaluate_technical_accuracy(self, processed_html: str) -> QualityScore:
        """評估技術準確性"""
        score = 100
        checks = []
        issues = []
        
        # 檢查1: HTML有效性
        html_errors = self._check_html_validity(processed_html)
        
        checks.append({
            'name': 'HTML有效性',
            'passed': len(html_errors) == 0,
            'value': f"{len(html_errors)} 個錯誤",
            'expected': '無HTML錯誤'
        })
        
        if html_errors:
            score -= min(len(html_errors) * 5, 30)
            issues.extend(html_errors[:3])  # 只顯示前3個錯誤
        
        # 檢查2: CSS類名規範
        css_classes = re.findall(r'class="([^"]*)"', processed_html)
        invalid_classes = [cls for cls in css_classes if not re.match(r'^[a-z0-9\-_\s]+$', cls)]
        
        checks.append({
            'name': 'CSS類名規範',
            'passed': len(invalid_classes) == 0,
            'value': f"{len(invalid_classes)} 個無效類名",
            'expected': '符合命名規範'
        })
        
        if invalid_classes:
            score -= 10
            issues.append(f"CSS類名不規範: {invalid_classes[:2]}")
        
        # 檢查3: 編碼問題
        encoding_issues = self._check_encoding_issues(processed_html)
        
        checks.append({
            'name': '字符編碼',
            'passed': len(encoding_issues) == 0,
            'value': f"{len(encoding_issues)} 個編碼問題",
            'expected': '無編碼問題'
        })
        
        if encoding_issues:
            score -= 15
            issues.append("存在字符編碼問題")
        
        return QualityScore(
            dimension=QualityDimension.TECHNICAL_ACCURACY,
            score=max(score, 0),
            max_score=100,
            weight=self.dimension_weights[QualityDimension.TECHNICAL_ACCURACY],
            details={
                'html_errors': html_errors,
                'invalid_css_classes': invalid_classes,
                'encoding_issues': encoding_issues,
                'checks': checks
            },
            issues=issues,
            suggestions=self._generate_technical_suggestions(issues)
        )
    
    def _calculate_overall_score(self, dimension_scores: List[QualityScore]) -> float:
        """計算總體評分"""
        weighted_sum = sum(score.score * score.weight for score in dimension_scores)
        total_weight = sum(score.weight for score in dimension_scores)
        
        return weighted_sum / total_weight if total_weight > 0 else 0
    
    def _determine_quality_level(self, score: float) -> QualityLevel:
        """確定質量級別"""
        if score >= 90:
            return QualityLevel.EXCELLENT
        elif score >= 80:
            return QualityLevel.GOOD
        elif score >= 70:
            return QualityLevel.ACCEPTABLE
        elif score >= 60:
            return QualityLevel.NEEDS_IMPROVEMENT
        else:
            return QualityLevel.POOR
    
    def _generate_improvement_suggestions(self, dimension_scores: List[QualityScore], overall_score: float) -> Dict[str, List[str]]:
        """生成改進建議"""
        priority = []
        technical = []
        
        # 基於整體分數的建議
        if overall_score < 70:
            priority.append("整體質量需要顯著改進")
        
        # 基於各維度分數的建議
        for score in dimension_scores:
            if score.score < 70:
                priority.extend(score.suggestions[:2])  # 每個維度最多2個優先建議
            
            if score.dimension == QualityDimension.TECHNICAL_ACCURACY and score.issues:
                technical.extend(score.suggestions)
        
        return {
            'priority': list(set(priority)),  # 去重
            'technical': list(set(technical))
        }
    
    # 輔助方法
    def _check_logical_flow(self, html: str) -> bool:
        """檢查內容邏輯流"""
        # 簡化檢查：確保有標題和段落的合理分布
        headings = len(re.findall(r'<h[1-6]>', html))
        paragraphs = len(re.findall(r'<p>', html))
        
        return headings > 0 and paragraphs > headings * 2
    
    def _calculate_keyword_density(self, text: str) -> float:
        """計算關鍵詞密度"""
        words = text.split()
        if not words:
            return 0
        
        # 統計重要關鍵詞
        keywords = ['稅務', '所得稅', '申報', '投資', '規劃', '企業']
        keyword_count = sum(text.count(keyword) for keyword in keywords)
        
        return keyword_count / len(words)
    
    def _detect_highlight_conflicts(self, html: str) -> List[str]:
        """檢測高亮衝突"""
        conflicts = []
        
        # 檢查嵌套的span標籤
        nested_spans = re.findall(r'<span[^>]*>.*?<span[^>]*>.*?</span>.*?</span>', html)
        if nested_spans:
            conflicts.append("發現嵌套高亮標籤")
        
        # 檢查重疊的高亮
        overlapping = re.findall(r'<span[^>]*class="[^"]*highlight[^"]*"[^>]*>[^<]*<span', html)
        if overlapping:
            conflicts.append("發現重疊高亮")
        
        return conflicts
    
    def _check_html_validity(self, html: str) -> List[str]:
        """檢查HTML有效性"""
        errors = []
        
        # 檢查未閉合標籤
        open_tags = re.findall(r'<([^/\s>]+)', html)
        close_tags = re.findall(r'</([^>\s]+)', html)
        
        for tag in open_tags:
            if tag not in ['br', 'hr', 'img', 'meta', 'link'] and open_tags.count(tag) > close_tags.count(tag):
                errors.append(f"未閉合的 <{tag}> 標籤")
        
        # 檢查無效屬性
        invalid_attrs = re.findall(r'<[^>]*\s([^=\s]+)="[^"]*[<>][^"]*"', html)
        if invalid_attrs:
            errors.append("屬性值包含無效字符")
        
        return errors[:5]  # 最多返回5個錯誤
    
    def _check_encoding_issues(self, html: str) -> List[str]:
        """檢查編碼問題"""
        issues = []
        
        # 檢查亂碼字符
        if re.search(r'[ \ufffd]', html):
            issues.append("發現亂碼字符")
        
        # 檢查不一致的引號
        if re.search(r'[""][^"""]*[""]', html):
            issues.append("使用了不一致的引號字符")
        
        return issues
    
    # 建議生成方法
    def _generate_content_suggestions(self, retention_rate: float, issues: List[str]) -> List[str]:
        """生成內容改進建議"""
        suggestions = []
        
        if retention_rate < 0.85:
            suggestions.append("檢查內容提取邏輯，確保完整保留原文信息")
        
        if any("小數點" in issue for issue in issues):
            suggestions.append("修復小數點數字識別問題，確保精確轉換")
        
        if any("日期" in issue for issue in issues):
            suggestions.append("改進日期格式識別，防止信息丟失")
        
        return suggestions
    
    def _generate_format_suggestions(self, issues: List[str]) -> List[str]:
        """生成格式改進建議"""
        suggestions = []
        
        if any("HTML結構" in issue for issue in issues):
            suggestions.append("確保生成有效的HTML結構")
        
        if any("粗體" in issue for issue in issues):
            suggestions.append("改進markdown到HTML的格式轉換")
        
        return suggestions
    
    def _generate_structure_suggestions(self, issues: List[str]) -> List[str]:
        """生成結構改進建議"""
        suggestions = []
        
        if any("標題層級" in issue for issue in issues):
            suggestions.append("優化標題層級結構，使用合理的H1-H6標籤")
        
        if any("段落長度" in issue for issue in issues):
            suggestions.append("調整段落長度，提升可讀性")
        
        return suggestions
    
    def _generate_seo_suggestions(self, issues: List[str]) -> List[str]:
        """生成SEO改進建議"""
        suggestions = []
        
        if any("META" in issue for issue in issues):
            suggestions.append("完善META標籤信息")
        
        if any("URL" in issue for issue in issues):
            suggestions.append("優化URL結構，提升SEO友好性")
        
        return suggestions
    
    def _generate_highlight_suggestions(self, issues: List[str]) -> List[str]:
        """生成高亮改進建議"""
        suggestions = []
        
        if any("小數點" in issue for issue in issues):
            suggestions.append("修復小數點數字高亮邏輯")
        
        if any("衝突" in issue for issue in issues):
            suggestions.append("解決高亮標籤衝突問題")
        
        return suggestions
    
    def _generate_readability_suggestions(self, issues: List[str]) -> List[str]:
        """生成可讀性改進建議"""
        suggestions = []
        
        if any("句子長度" in issue for issue in issues):
            suggestions.append("優化句子長度分布")
        
        if any("段落" in issue for issue in issues):
            suggestions.append("改進段落結構")
        
        return suggestions
    
    def _generate_technical_suggestions(self, issues: List[str]) -> List[str]:
        """生成技術改進建議"""
        suggestions = []
        
        if any("HTML" in issue for issue in issues):
            suggestions.append("修復HTML語法錯誤")
        
        if any("編碼" in issue for issue in issues):
            suggestions.append("解決字符編碼問題")
        
        return suggestions
    
    def _load_quality_standards(self) -> Dict:
        """載入質量標準"""
        return {
            'content_retention_min': 0.85,
            'decimal_retention_min': 0.95,
            'highlight_coverage_min': 0.8,
            'seo_score_min': 70,
            'readability_score_min': 60
        }
    
    def _load_check_rules(self) -> Dict:
        """載入檢查規則"""
        return {
            'critical_checks': [
                'content_integrity',
                'highlight_accuracy',
                'format_conversion'
            ],
            'warning_thresholds': {
                'content_retention': 0.9,
                'highlight_accuracy': 0.85
            }
        }
    
    def export_report(self, report: QualityReport, format: str = 'json') -> str:
        """匯出質量報告"""
        if format == 'json':
            return self._export_json_report(report)
        elif format == 'markdown':
            return self._export_markdown_report(report)
        else:
            raise ValueError(f"不支持的格式: {format}")
    
    def _export_json_report(self, report: QualityReport) -> str:
        """匯出JSON格式報告"""
        import json
        
        report_dict = {
            'overall_score': report.overall_score,
            'quality_level': report.quality_level.value,
            'processing_time': report.processing_time,
            'document_info': report.document_info,
            'dimension_scores': [
                {
                    'dimension': score.dimension.value,
                    'score': score.score,
                    'weight': score.weight,
                    'issues': score.issues,
                    'suggestions': score.suggestions
                }
                for score in report.dimension_scores
            ],
            'recommendations': {
                'priority': report.priority_improvements,
                'technical': report.technical_recommendations
            },
            'timestamp': report.evaluation_timestamp
        }
        
        return json.dumps(report_dict, ensure_ascii=False, indent=2)
    
    def _export_markdown_report(self, report: QualityReport) -> str:
        """匯出Markdown格式報告"""
        md_lines = []
        
        md_lines.append(f"# 文檔質量評估報告")
        md_lines.append(f"")
        md_lines.append(f"**總體評分**: {report.overall_score:.1f}/100 ({report.quality_level.value})")
        md_lines.append(f"**評估時間**: {report.evaluation_timestamp}")
        md_lines.append(f"**處理時間**: {report.processing_time:.2f} 秒")
        md_lines.append(f"")
        
        md_lines.append(f"## 📊 維度評分")
        md_lines.append(f"")
        
        for score in report.dimension_scores:
            md_lines.append(f"### {score.dimension.value}")
            md_lines.append(f"- **評分**: {score.score:.1f}/100 (權重: {score.weight:.1%})")
            
            if score.issues:
                md_lines.append(f"- **問題**: {', '.join(score.issues)}")
            
            if score.suggestions:
                md_lines.append(f"- **建議**: {'; '.join(score.suggestions)}")
            
            md_lines.append(f"")
        
        if report.priority_improvements:
            md_lines.append(f"## 🎯 優先改進建議")
            for suggestion in report.priority_improvements:
                md_lines.append(f"- {suggestion}")
            md_lines.append(f"")
        
        return '\n'.join(md_lines)

def test_quality_scorer():
    """測試質量評分器"""
    scorer = QualityScorer()
    
    # 模擬測試數據
    original_doc = {
        'title': '2025年個人所得稅申報指南',
        'content': [
            '2025年個人所得稅申報期間為5月1日至5月31日',
            '標準扣除額為12.5萬元，比去年增加1.2萬元',
            '稅率為5%、12%、20%、30%、40%五個級距',
            '投資收益超過27萬元需要申報'
        ],
        'filename': 'test.docx'
    }
    
    processed_html = '''
    <h2>2025年個人所得稅申報指南</h2>
    <p>2025年個人所得稅申報期間為<span class="date-highlight">5月1日至5月31日</span></p>
    <p>標準扣除額為<span class="amount-highlight">12.5萬元</span>，比去年增加<span class="amount-highlight">1.2萬元</span></p>
    <p>稅率為<span class="percent-highlight">5%</span>、<span class="percent-highlight">12%</span>、<span class="percent-highlight">20%</span>、<span class="percent-highlight">30%</span>、<span class="percent-highlight">40%</span>五個級距</p>
    <p>投資收益超過<span class="amount-highlight">27萬元</span>需要申報</p>
    '''
    
    # 執行質量評估
    report = scorer.evaluate_document_quality(original_doc, processed_html)
    
    print("🧪 質量評分測試結果:")
    print(f"  總體評分: {report.overall_score:.1f}/100")
    print(f"  質量級別: {report.quality_level.value}")
    print(f"  檢查統計: {report.passed_checks}/{report.total_checks} 通過")
    
    print("\n📊 各維度評分:")
    for score in report.dimension_scores:
        print(f"  {score.dimension.value}: {score.score:.1f}/100")
        if score.issues:
            print(f"    問題: {score.issues}")
    
    if report.priority_improvements:
        print(f"\n🎯 優先改進: {report.priority_improvements}")

if __name__ == "__main__":
    test_quality_scorer()