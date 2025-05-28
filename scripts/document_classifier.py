#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文档类型智能识别器 v3.0
基于内容分析自动识别文档类型、主题和特征
支持SEO优化和高亮策略定制
"""

import re
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from loguru import logger

class DocumentType(Enum):
    """文档类型枚举"""
    TAX_GUIDE = "tax_guide"           # 稅務指南
    TAX_CALENDAR = "tax_calendar"     # 稅務行事曆
    INVESTMENT_GUIDE = "investment_guide"  # 投資指南
    BUSINESS_GUIDE = "business_guide"  # 企業指南
    PERSONAL_FINANCE = "personal_finance"  # 個人理財
    NEWS_ANALYSIS = "news_analysis"    # 新聞分析
    TUTORIAL = "tutorial"              # 教學文章
    COMPARISON = "comparison"          # 比較分析
    REGULATION = "regulation"          # 法規解讀
    PLANNING = "planning"              # 規劃建議
    UNKNOWN = "unknown"                # 未知類型

class ContentTheme(Enum):
    """內容主題枚舉"""
    TAX_PLANNING = "tax_planning"      # 稅務規劃
    INVESTMENT = "investment"          # 投資理財
    BUSINESS_OPS = "business_ops"      # 企業營運
    COMPLIANCE = "compliance"          # 法規遵循
    EDUCATION = "education"            # 教育培訓
    ANALYSIS = "analysis"              # 分析研究
    PRACTICAL = "practical"            # 實務操作

@dataclass
class DocumentFeatures:
    """文檔特徵數據類"""
    has_dates: bool = False
    has_amounts: bool = False
    has_percentages: bool = False
    has_laws: bool = False
    has_deadlines: bool = False
    has_steps: bool = False
    has_comparisons: bool = False
    has_calculations: bool = False
    
    # 統計特徵
    title_count: int = 0
    list_count: int = 0
    table_count: int = 0
    bold_count: int = 0
    
    # 內容長度特徵
    total_length: int = 0
    avg_paragraph_length: float = 0.0
    
    # 特殊格式
    chinese_numbered_titles: int = 0
    arabic_numbered_titles: int = 0
    date_range_items: int = 0

@dataclass
class ClassificationResult:
    """分類結果數據類"""
    document_type: DocumentType
    content_theme: ContentTheme
    confidence_score: float
    features: DocumentFeatures
    keywords: List[str]
    seo_category: str
    highlight_strategy: str
    content_tags: List[str]
    
    # SEO相關
    suggested_title: Optional[str] = None
    meta_description: Optional[str] = None
    target_keywords: List[str] = None

class DocumentClassifier:
    """文檔類型智能識別器"""
    
    def __init__(self):
        """初始化分類器"""
        self.classification_rules = self._load_classification_rules()
        self.keyword_patterns = self._load_keyword_patterns()
        self.seo_mappings = self._load_seo_mappings()
        
        logger.info("✅ 文檔分類器初始化完成")
    
    def classify_document(self, enhanced_data: Dict[str, Any]) -> ClassificationResult:
        """
        分類文檔並提取特徵
        
        Args:
            enhanced_data: 增強的文檔數據（來自EnhancedWordProcessor）
            
        Returns:
            ClassificationResult: 分類結果
        """
        logger.info("🔍 開始智能文檔分類...")
        
        # 提取文檔特徵
        features = self._extract_features(enhanced_data)
        
        # 執行分類
        doc_type, confidence = self._classify_document_type(enhanced_data, features)
        theme = self._identify_content_theme(enhanced_data, features)
        
        # 提取關鍵詞
        keywords = self._extract_keywords(enhanced_data)
        
        # 生成SEO信息
        seo_info = self._generate_seo_info(doc_type, theme, enhanced_data)
        
        # 決定高亮策略
        highlight_strategy = self._determine_highlight_strategy(doc_type, features)
        
        # 生成內容標籤
        content_tags = self._generate_content_tags(doc_type, theme, features)
        
        result = ClassificationResult(
            document_type=doc_type,
            content_theme=theme,
            confidence_score=confidence,
            features=features,
            keywords=keywords,
            seo_category=seo_info['category'],
            highlight_strategy=highlight_strategy,
            content_tags=content_tags,
            suggested_title=seo_info.get('title'),
            meta_description=seo_info.get('description'),
            target_keywords=seo_info.get('keywords', [])
        )
        
        logger.success(f"✅ 分類完成: {doc_type.value} | {theme.value} | 信心度: {confidence:.2f}")
        return result
    
    def _extract_features(self, enhanced_data: Dict[str, Any]) -> DocumentFeatures:
        """提取文檔特徵"""
        enhanced_paragraphs = enhanced_data.get('enhanced_paragraphs', [])
        content = enhanced_data.get('content', [])
        stats = enhanced_data.get('extraction_stats', {})
        
        # 合併所有文本進行分析
        full_text = ' '.join(content)
        
        features = DocumentFeatures()
        
        # 🔧 v3.0 改進：更精確的特徵檢測
        features.has_dates = self._detect_dates(full_text)
        features.has_amounts = self._detect_amounts(full_text)
        features.has_percentages = self._detect_percentages(full_text)
        features.has_laws = self._detect_laws(full_text)
        features.has_deadlines = self._detect_deadlines(full_text)
        features.has_steps = self._detect_steps(full_text)
        features.has_comparisons = self._detect_comparisons(full_text)
        features.has_calculations = self._detect_calculations(full_text)
        
        # 統計特徵
        features.title_count = stats.get('headings_count', 0) + stats.get('chinese_titles_count', 0)
        features.list_count = stats.get('list_items_count', 0)
        features.bold_count = sum(1 for p in enhanced_paragraphs if '**' in p.get('formatted_text', ''))
        
        # 內容特徵
        features.total_length = len(full_text)
        if enhanced_paragraphs:
            features.avg_paragraph_length = sum(len(p['clean_text']) for p in enhanced_paragraphs) / len(enhanced_paragraphs)
        
        # 特殊格式統計
        features.chinese_numbered_titles = stats.get('chinese_titles_count', 0)
        features.arabic_numbered_titles = stats.get('arabic_titles_count', 0)
        features.date_range_items = stats.get('date_items_count', 0)
        
        return features
    
    def _detect_dates(self, text: str) -> bool:
        """檢測日期信息"""
        date_patterns = [
            r'\d{4}年\d{1,2}月\d{1,2}日',
            r'\d{1,2}月\d{1,2}日',
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}'
        ]
        return any(re.search(pattern, text) for pattern in date_patterns)
    
    def _detect_amounts(self, text: str) -> bool:
        """檢測金額信息"""
        # 🔧 v3.0 改進：更精確的金額檢測，包含小數點
        amount_patterns = [
            r'\d+(?:,\d{3})*(?:\.\d+)?萬元',
            r'\d+(?:,\d{3})*(?:\.\d+)?千萬元',
            r'\d+(?:,\d{3})*(?:\.\d+)?億元',
            r'\d+(?:,\d{3})*(?:\.\d+)?元',
            r'NT\$\s?\d+(?:,\d{3})*(?:\.\d+)?',
            r'新台幣\d+(?:,\d{3})*(?:\.\d+)?',
            r'\$\d+(?:,\d{3})*(?:\.\d+)?'
        ]
        return any(re.search(pattern, text) for pattern in amount_patterns)
    
    def _detect_percentages(self, text: str) -> bool:
        """檢測百分比信息"""
        # 🔧 v3.0 改進：支持小數點百分比
        percentage_patterns = [
            r'\d+(?:\.\d+)?%',
            r'百分之\d+(?:\.\d+)?',
            r'\d+(?:\.\d+)?個百分點'
        ]
        return any(re.search(pattern, text) for pattern in percentage_patterns)
    
    def _detect_laws(self, text: str) -> bool:
        """檢測法條信息"""
        law_patterns = [
            r'第\d+條(?:之\d+)?',
            r'所得稅法',
            r'營業稅法',
            r'稅捐稽徵法',
            r'行政程序法',
            r'公司法'
        ]
        return any(re.search(pattern, text) for pattern in law_patterns)
    
    def _detect_deadlines(self, text: str) -> bool:
        """檢測截止期限"""
        deadline_keywords = ['截止', '期限', '申報', '繳納', '前\d+日', '之前', '以前']
        return any(keyword in text for keyword in deadline_keywords)
    
    def _detect_steps(self, text: str) -> bool:
        """檢測步驟流程"""
        step_patterns = [
            r'第[一二三四五六七八九十]+步',
            r'步驟[一二三四五六七八九十]+',
            r'STEP\s?\d+',
            r'\d+\.\s*',
            r'首先.*其次.*最後'
        ]
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in step_patterns)
    
    def _detect_comparisons(self, text: str) -> bool:
        """檢測比較分析"""
        comparison_keywords = ['比較', '對比', '相較於', '相比之下', 'VS', 'vs', '差異', '區別']
        return any(keyword in text for keyword in comparison_keywords)
    
    def _detect_calculations(self, text: str) -> bool:
        """檢測計算內容"""
        # 🔧 v3.0 改進：檢測包含小數點的計算
        calculation_patterns = [
            r'\d+(?:\.\d+)?\s*[+\-×÷]\s*\d+(?:\.\d+)?',
            r'計算公式',
            r'計算方式',
            r'算法',
            r'應納稅額',
            r'應繳金額'
        ]
        return any(re.search(pattern, text) for pattern in calculation_patterns)
    
    def _classify_document_type(self, enhanced_data: Dict, features: DocumentFeatures) -> Tuple[DocumentType, float]:
        """分類文檔類型"""
        content = ' '.join(enhanced_data.get('content', []))
        title = enhanced_data.get('title', '')
        
        # 計算各類型的匹配分數
        scores = {}
        
        # 稅務行事曆
        if (features.date_range_items > 3 or 
            '行事曆' in title or '期程' in title or
            features.has_deadlines and features.has_dates):
            scores[DocumentType.TAX_CALENDAR] = 0.9
        
        # 稅務指南
        if ('稅務' in content and ('指南' in title or '攻略' in title) or
            features.has_laws and features.has_amounts):
            scores[DocumentType.TAX_GUIDE] = 0.8
        
        # 投資指南
        if ('投資' in content or '理財' in content) and not '稅務' in title:
            scores[DocumentType.INVESTMENT_GUIDE] = 0.7
        
        # 企業指南
        if ('企業' in content or '公司' in content) and features.has_laws:
            scores[DocumentType.BUSINESS_GUIDE] = 0.7
        
        # 教學文章
        if features.has_steps or '教學' in title or '如何' in title:
            scores[DocumentType.TUTORIAL] = 0.6
        
        # 比較分析
        if features.has_comparisons or '比較' in title:
            scores[DocumentType.COMPARISON] = 0.6
        
        # 法規解讀
        if features.has_laws and ('解讀' in title or '分析' in title):
            scores[DocumentType.REGULATION] = 0.7
        
        # 規劃建議
        if '規劃' in content or '建議' in title:
            scores[DocumentType.PLANNING] = 0.6
        
        # 新聞分析
        if '新聞' in title or '最新' in title:
            scores[DocumentType.NEWS_ANALYSIS] = 0.5
        
        # 個人理財
        if '個人' in content and ('理財' in content or '所得稅' in content):
            scores[DocumentType.PERSONAL_FINANCE] = 0.6
        
        # 選擇最高分數的類型
        if scores:
            best_type = max(scores.keys(), key=lambda k: scores[k])
            confidence = scores[best_type]
        else:
            best_type = DocumentType.UNKNOWN
            confidence = 0.0
        
        return best_type, confidence
    
    def _identify_content_theme(self, enhanced_data: Dict, features: DocumentFeatures) -> ContentTheme:
        """識別內容主題"""
        content = ' '.join(enhanced_data.get('content', []))
        
        # 主題關鍵詞映射
        theme_keywords = {
            ContentTheme.TAX_PLANNING: ['稅務規劃', '節稅', '稅務策略', '稅務優化'],
            ContentTheme.INVESTMENT: ['投資', '理財', '基金', '股票', '債券'],
            ContentTheme.BUSINESS_OPS: ['企業', '營運', '管理', '經營'],
            ContentTheme.COMPLIANCE: ['法規', '遵循', '合規', '申報'],
            ContentTheme.EDUCATION: ['教學', '學習', '培訓', '指導'],
            ContentTheme.ANALYSIS: ['分析', '研究', '評估', '比較'],
            ContentTheme.PRACTICAL: ['實務', '操作', '步驟', '流程']
        }
        
        # 計算主題分數
        theme_scores = {}
        for theme, keywords in theme_keywords.items():
            score = sum(1 for keyword in keywords if keyword in content)
            if score > 0:
                theme_scores[theme] = score
        
        # 根據特徵增加額外分數
        if features.has_steps:
            theme_scores[ContentTheme.PRACTICAL] = theme_scores.get(ContentTheme.PRACTICAL, 0) + 2
        
        if features.has_laws:
            theme_scores[ContentTheme.COMPLIANCE] = theme_scores.get(ContentTheme.COMPLIANCE, 0) + 2
        
        if features.has_comparisons:
            theme_scores[ContentTheme.ANALYSIS] = theme_scores.get(ContentTheme.ANALYSIS, 0) + 2
        
        # 選擇最高分數的主題
        if theme_scores:
            return max(theme_scores.keys(), key=lambda k: theme_scores[k])
        
        return ContentTheme.ANALYSIS  # 默認主題
    
    def _extract_keywords(self, enhanced_data: Dict[str, Any]) -> List[str]:
        """提取關鍵詞"""
        content = ' '.join(enhanced_data.get('content', []))
        title = enhanced_data.get('title', '')
        
        # 預定義的重要關鍵詞
        important_keywords = [
            '所得稅', '營業稅', '稅務', '申報', '繳納', '期限', '截止',
            '投資', '理財', '規劃', '企業', '個人', '法規', '條文',
            '金額', '百分比', '計算', '公式', '分析', '比較'
        ]
        
        # 從內容中提取的關鍵詞
        extracted = []
        for keyword in important_keywords:
            if keyword in content or keyword in title:
                extracted.append(keyword)
        
        # 提取數字關鍵詞（金額、百分比等）
        # 🔧 v3.0 改進：包含小數點數字
        amount_matches = re.findall(r'\d+(?:\.\d+)?(?:萬|千萬|億)?元', content)
        percentage_matches = re.findall(r'\d+(?:\.\d+)?%', content)
        
        extracted.extend(amount_matches[:3])  # 最多取3個金額
        extracted.extend(percentage_matches[:3])  # 最多取3個百分比
        
        return list(set(extracted))[:10]  # 去重並限制數量
    
    def _generate_seo_info(self, doc_type: DocumentType, theme: ContentTheme, enhanced_data: Dict) -> Dict[str, Any]:
        """生成SEO信息"""
        title = enhanced_data.get('title', '')
        
        # SEO類別映射
        seo_mappings = {
            DocumentType.TAX_GUIDE: 'tax-guide',
            DocumentType.TAX_CALENDAR: 'tax-calendar', 
            DocumentType.INVESTMENT_GUIDE: 'investment',
            DocumentType.BUSINESS_GUIDE: 'business',
            DocumentType.PERSONAL_FINANCE: 'personal-finance',
            DocumentType.TUTORIAL: 'tutorial',
            DocumentType.COMPARISON: 'comparison',
            DocumentType.REGULATION: 'regulation',
            DocumentType.PLANNING: 'planning'
        }
        
        seo_info = {
            'category': seo_mappings.get(doc_type, 'general'),
            'title': self._optimize_title_for_seo(title, doc_type),
            'description': self._generate_meta_description(enhanced_data, doc_type),
            'keywords': self._generate_target_keywords(doc_type, theme, enhanced_data)
        }
        
        return seo_info
    
    def _optimize_title_for_seo(self, title: str, doc_type: DocumentType) -> str:
        """優化標題以提升SEO"""
        if not title:
            return None
        
        # 添加SEO友好的前綴或後綴
        seo_enhancements = {
            DocumentType.TAX_GUIDE: '完整指南',
            DocumentType.TAX_CALENDAR: '時程攻略',
            DocumentType.INVESTMENT_GUIDE: '投資指南',
            DocumentType.TUTORIAL: '詳細教學',
            DocumentType.COMPARISON: '完整比較'
        }
        
        enhancement = seo_enhancements.get(doc_type, '')
        if enhancement and enhancement not in title:
            # 智能添加增強詞，避免重複
            if len(title) < 40:  # 標題不太長時才添加
                return f"{title} - {enhancement}"
        
        return title
    
    def _generate_meta_description(self, enhanced_data: Dict, doc_type: DocumentType) -> str:
        """生成META描述"""
        content = enhanced_data.get('content', [])
        if not content:
            return None
        
        # 取前兩個段落作為描述基礎
        description_text = ' '.join(content[:2])
        
        # 清理和截短
        description = re.sub(r'\s+', ' ', description_text).strip()
        
        # 限制長度（SEO最佳實踐：150-160字符）
        if len(description) > 150:
            description = description[:147] + "..."
        
        return description
    
    def _generate_target_keywords(self, doc_type: DocumentType, theme: ContentTheme, enhanced_data: Dict) -> List[str]:
        """生成目標關鍵詞"""
        base_keywords = []
        
        # 根據文檔類型添加關鍵詞
        type_keywords = {
            DocumentType.TAX_GUIDE: ['稅務指南', '稅務規劃', '節稅'],
            DocumentType.TAX_CALENDAR: ['稅務期程', '申報時間', '繳稅期限'],
            DocumentType.INVESTMENT_GUIDE: ['投資理財', '理財規劃', '投資策略'],
            DocumentType.BUSINESS_GUIDE: ['企業稅務', '公司稅務', '營業稅'],
            DocumentType.PERSONAL_FINANCE: ['個人理財', '個人所得稅', '個人稅務']
        }
        
        base_keywords.extend(type_keywords.get(doc_type, []))
        
        # 根據主題添加關鍵詞
        theme_keywords = {
            ContentTheme.TAX_PLANNING: ['稅務規劃', '稅務策略'],
            ContentTheme.COMPLIANCE: ['法規遵循', '稅務法規'],
            ContentTheme.PRACTICAL: ['實務操作', '具體步驟']
        }
        
        base_keywords.extend(theme_keywords.get(theme, []))
        
        return list(set(base_keywords))[:5]  # 去重並限制數量
    
    def _determine_highlight_strategy(self, doc_type: DocumentType, features: DocumentFeatures) -> str:
        """決定高亮策略"""
        # 🔧 v3.0 核心改進：智能高亮策略
        if doc_type == DocumentType.TAX_CALENDAR:
            return "tax_calendar_strategy"  # 強調日期和期限
        elif features.has_amounts and features.has_calculations:
            return "financial_calculation_strategy"  # 強調金額和計算
        elif features.has_laws:
            return "legal_reference_strategy"  # 強調法條引用
        elif features.has_steps:
            return "tutorial_strategy"  # 強調步驟流程
        else:
            return "general_strategy"  # 通用策略
    
    def _generate_content_tags(self, doc_type: DocumentType, theme: ContentTheme, features: DocumentFeatures) -> List[str]:
        """生成內容標籤"""
        tags = []
        
        # 基於文檔類型的標籤
        tags.append(doc_type.value.replace('_', '-'))
        
        # 基於主題的標籤
        tags.append(theme.value.replace('_', '-'))
        
        # 基於特徵的標籤
        if features.has_dates:
            tags.append('has-dates')
        if features.has_amounts:
            tags.append('has-amounts')
        if features.has_calculations:
            tags.append('has-calculations')
        if features.has_laws:
            tags.append('legal-reference')
        if features.has_steps:
            tags.append('step-by-step')
        
        return tags
    
    def _load_classification_rules(self) -> Dict:
        """載入分類規則"""
        # 這裡可以從配置文件載入更複雜的規則
        return {
            'min_confidence': 0.5,
            'fallback_type': DocumentType.UNKNOWN,
            'boost_keywords': {
                '稅務': 0.2,
                '投資': 0.15,
                '企業': 0.1
            }
        }
    
    def _load_keyword_patterns(self) -> Dict:
        """載入關鍵詞模式"""
        return {
            'tax_keywords': ['所得稅', '營業稅', '稅務', '申報', '繳納'],
            'investment_keywords': ['投資', '理財', '基金', '股票'],
            'business_keywords': ['企業', '公司', '營運', '管理'],
            'amount_patterns': [r'\d+(?:\.\d+)?萬元', r'\d+(?:\.\d+)?元']
        }
    
    def _load_seo_mappings(self) -> Dict:
        """載入SEO映射配置"""
        return {
            'category_slugs': {
                DocumentType.TAX_GUIDE: 'tax-planning',
                DocumentType.INVESTMENT_GUIDE: 'investment-advice'
            },
            'title_templates': {
                DocumentType.TAX_CALENDAR: '{title} - 完整時程指南'
            }
        }

def test_document_classifier():
    """測試文檔分類器"""
    classifier = DocumentClassifier()
    
    # 模擬增強數據
    test_data = {
        'title': '2025年台灣稅務行事曆全攻略',
        'content': [
            '2025年的稅務申報期程已經確定',
            '1月1日至1月31日：營業稅申報',
            '5月1日至5月31日：個人所得稅申報',
            '企業應特別注意各項申報期限'
        ],
        'enhanced_paragraphs': [
            {
                'clean_text': '2025年的稅務申報期程已經確定',
                'is_chinese_numbered_title': False,
                'is_date_range_item': False,
                'formatted_text': '2025年的稅務申報期程已經確定'
            },
            {
                'clean_text': '1月1日至1月31日：營業稅申報',
                'is_date_range_item': True,
                'date_range': '1月1日至1月31日',
                'description': '營業稅申報'
            }
        ],
        'extraction_stats': {
            'date_items_count': 2,
            'chinese_titles_count': 1,
            'headings_count': 0
        }
    }
    
    result = classifier.classify_document(test_data)
    
    print("🧪 分類測試結果:")
    print(f"  文檔類型: {result.document_type}")
    print(f"  內容主題: {result.content_theme}")
    print(f"  信心度: {result.confidence_score:.2f}")
    print(f"  SEO類別: {result.seo_category}")
    print(f"  高亮策略: {result.highlight_strategy}")
    print(f"  關鍵詞: {result.keywords}")
    print(f"  內容標籤: {result.content_tags}")

if __name__ == "__main__":
    test_document_classifier()