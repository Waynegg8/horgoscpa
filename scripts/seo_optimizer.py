#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
SEO智能優化器 v3.0
全方位SEO優化解決方案，支持語義化URL生成、結構化數據、內容優化
"""

import re
import json
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
from urllib.parse import quote
from loguru import logger

@dataclass
class SEOMetadata:
    """SEO元數據"""
    title: str
    meta_description: str
    canonical_url: str
    og_title: str
    og_description: str
    og_image: Optional[str] = None
    og_type: str = "article"
    twitter_card: str = "summary_large_image"
    keywords: List[str] = None
    author: str = "台灣稅務專家"
    publish_date: Optional[str] = None
    modified_date: Optional[str] = None
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []

@dataclass 
class StructuredData:
    """結構化數據（JSON-LD）"""
    type: str = "Article"
    headline: str = ""
    description: str = ""
    author: Dict[str, str] = None
    publisher: Dict[str, Any] = None
    date_published: Optional[str] = None
    date_modified: Optional[str] = None
    main_entity_of_page: Dict[str, str] = None
    image: Optional[str] = None
    
    def __post_init__(self):
        if self.author is None:
            self.author = {
                "@type": "Person",
                "name": "台灣稅務專家"
            }
        if self.publisher is None:
            self.publisher = {
                "@type": "Organization", 
                "name": "台灣稅務規劃專家",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://example.com/logo.png"
                }
            }

@dataclass
class URLOptimization:
    """URL優化結果"""
    semantic_url: str
    url_segments: List[str]
    seo_score: float
    optimization_notes: List[str]

class SEOOptimizer:
    """SEO智能優化器"""
    
    def __init__(self, base_url: str = "https://example.com", translator=None):
        """
        初始化SEO優化器
        
        Args:
            base_url: 網站基礎URL
            translator: 翻譯器實例（用於URL翻譯）
        """
        self.base_url = base_url.rstrip('/')
        self.translator = translator
        
        # SEO配置
        self.seo_config = {
            'title_max_length': 60,
            'description_max_length': 160,
            'url_max_length': 75,
            'keywords_max_count': 10,
            'target_keyword_density': 0.015,  # 1.5%
            'readability_min_score': 60
        }
        
        # 停用詞列表（SEO不友好的詞）
        self.stop_words = {
            'zh': ['的', '了', '在', '是', '有', '和', '與', '或', '但', '而且', '然而', '因此', '所以'],
            'en': ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
        }
        
        # 語義映射表
        self.semantic_mappings = self._load_semantic_mappings()
        
        logger.info("✅ SEO優化器初始化完成")
    
    def optimize_document_seo(self, doc_info: Dict[str, Any], classification_result=None) -> Dict[str, Any]:
        """
        全方位SEO優化
        
        Args:
            doc_info: 文檔信息
            classification_result: 分類結果（可選）
            
        Returns:
            Dict: 包含SEO優化結果的字典
        """
        logger.info("🚀 開始全方位SEO優化...")
        
        # 1. 基礎SEO元數據優化
        metadata = self._optimize_metadata(doc_info, classification_result)
        
        # 2. URL優化
        url_optimization = self._optimize_url(doc_info, classification_result)
        
        # 3. 內容優化
        content_optimization = self._optimize_content(doc_info)
        
        # 4. 結構化數據生成
        structured_data = self._generate_structured_data(doc_info, metadata)
        
        # 5. SEO評分
        seo_score = self._calculate_seo_score(doc_info, metadata, url_optimization)
        
        # 6. 優化建議
        recommendations = self._generate_seo_recommendations(doc_info, seo_score)
        
        seo_result = {
            'metadata': metadata,
            'url_optimization': url_optimization,
            'content_optimization': content_optimization,
            'structured_data': structured_data,
            'seo_score': seo_score,
            'recommendations': recommendations,
            'optimization_timestamp': datetime.now().isoformat()
        }
        
        logger.success(f"✅ SEO優化完成，評分: {seo_score:.1f}/100")
        return seo_result
    
    def _optimize_metadata(self, doc_info: Dict, classification_result=None) -> SEOMetadata:
        """優化SEO元數據"""
        title = doc_info.get('title', '')
        summary = doc_info.get('summary', '')
        content = doc_info.get('content', [])
        
        # 🔧 v3.0 改進：智能標題優化
        optimized_title = self._optimize_title(title, classification_result)
        
        # 生成描述
        optimized_description = self._generate_meta_description(summary, content)
        
        # 生成關鍵詞
        keywords = self._extract_target_keywords(doc_info, classification_result)
        
        # 生成URL
        canonical_url = f"{self.base_url}/{doc_info.get('url', '')}"
        
        # 社交媒體優化
        og_title = self._optimize_og_title(optimized_title)
        og_description = self._optimize_og_description(optimized_description)
        
        return SEOMetadata(
            title=optimized_title,
            meta_description=optimized_description,
            canonical_url=canonical_url,
            og_title=og_title,
            og_description=og_description,
            keywords=keywords,
            publish_date=doc_info.get('date'),
            modified_date=datetime.now().strftime('%Y-%m-%d')
        )
    
    def _optimize_title(self, title: str, classification_result=None) -> str:
        """優化標題"""
        if not title:
            return "台灣稅務指南"
        
        # 清理標題
        cleaned_title = self._clean_title(title)
        
        # 🔧 根據分類結果優化標題
        if classification_result:
            doc_type = classification_result.document_type.value if hasattr(classification_result, 'document_type') else None
            
            # 添加SEO友好的修飾詞
            seo_modifiers = {
                'tax_calendar': '完整攻略',
                'tax_guide': '詳細指南', 
                'investment_guide': '投資秘笈',
                'tutorial': '實用教學',
                'comparison': '深度比較'
            }
            
            modifier = seo_modifiers.get(doc_type, '')
            if modifier and modifier not in cleaned_title and len(cleaned_title) < 40:
                cleaned_title = f"{cleaned_title} - {modifier}"
        
        # 確保標題長度合適
        if len(cleaned_title) > self.seo_config['title_max_length']:
            cleaned_title = cleaned_title[:self.seo_config['title_max_length']-3] + "..."
        
        return cleaned_title
    
    def _clean_title(self, title: str) -> str:
        """清理標題"""
        # 移除多餘的空白
        title = ' '.join(title.split())
        
        # 移除特殊符號（保留中文、英文、數字、常用標點）
        title = re.sub(r'[^\w\s\-\.\:：（）()【】\[\]、，,！!？?]', '', title)
        
        # 首字母大寫（如果是英文）
        words = title.split()
        for i, word in enumerate(words):
            if re.match(r'^[a-zA-Z]', word):
                words[i] = word.capitalize()
        
        return ' '.join(words).strip()
    
    def _generate_meta_description(self, summary: str, content: List[str]) -> str:
        """生成META描述"""
        # 優先使用摘要
        if summary and len(summary.strip()) > 50:
            description = summary.strip()
        elif content:
            # 使用前兩個段落
            description = ' '.join(content[:2])
        else:
            description = "台灣稅務規劃專業指南，提供最新稅務資訊和實用建議。"
        
        # 清理描述
        description = re.sub(r'\s+', ' ', description).strip()
        
        # 移除HTML標籤
        description = re.sub(r'<[^>]+>', '', description)
        
        # 確保長度合適
        max_length = self.seo_config['description_max_length']
        if len(description) > max_length:
            # 在句子邊界截斷
            sentences = re.split(r'[。！？.!?]', description)
            truncated = ""
            for sentence in sentences:
                if len(truncated + sentence) < max_length - 3:
                    truncated += sentence + "。"
                else:
                    break
            description = truncated.rstrip('。') + "..."
        
        return description
    
    def _extract_target_keywords(self, doc_info: Dict, classification_result=None) -> List[str]:
        """提取目標關鍵詞"""
        keywords = []
        
        # 從標題提取
        title = doc_info.get('title', '')
        title_keywords = self._extract_keywords_from_text(title)
        keywords.extend(title_keywords)
        
        # 從內容提取
        content = ' '.join(doc_info.get('content', []))
        content_keywords = self._extract_keywords_from_text(content, max_keywords=5)
        keywords.extend(content_keywords)
        
        # 🔧 從分類結果添加
        if classification_result and hasattr(classification_result, 'target_keywords'):
            keywords.extend(classification_result.target_keywords or [])
        
        # 去重並排序
        unique_keywords = list(dict.fromkeys(keywords))  # 保持順序去重
        
        return unique_keywords[:self.seo_config['keywords_max_count']]
    
    def _extract_keywords_from_text(self, text: str, max_keywords: int = 5) -> List[str]:
        """從文本提取關鍵詞"""
        if not text:
            return []
        
        # 預定義重要關鍵詞
        important_terms = [
            '所得稅', '營業稅', '稅務規劃', '節稅', '申報', '繳納',
            '投資', '理財', '企業', '個人', '法規', '期限',
            '台灣', '2025', '指南', '攻略', '教學'
        ]
        
        found_keywords = []
        for term in important_terms:
            if term in text:
                found_keywords.append(term)
        
        # 🔧 v3.0 改進：提取數字關鍵詞（包含小數點）
        # 提取金額
        amounts = re.findall(r'\d+(?:\.\d+)?(?:萬|千萬|億)?元', text)
        # 提取百分比
        percentages = re.findall(r'\d+(?:\.\d+)?%', text)
        # 提取年份
        years = re.findall(r'20\d{2}年?', text)
        
        found_keywords.extend(amounts[:2])
        found_keywords.extend(percentages[:2])
        found_keywords.extend(years[:1])
        
        return found_keywords[:max_keywords]
    
    def _optimize_url(self, doc_info: Dict, classification_result=None) -> URLOptimization:
        """優化URL"""
        date = doc_info.get('date', '')
        title = doc_info.get('title', '')
        category = classification_result.seo_category if classification_result else 'general'
        
        # 🔧 v3.0 核心改進：語義化URL生成
        semantic_url = self._generate_semantic_url(date, title, category, doc_info)
        
        # 分析URL組成
        url_segments = semantic_url.split('-')
        
        # 計算SEO評分
        seo_score = self._calculate_url_seo_score(semantic_url)
        
        # 生成優化建議
        optimization_notes = self._generate_url_optimization_notes(semantic_url)
        
        return URLOptimization(
            semantic_url=semantic_url,
            url_segments=url_segments,
            seo_score=seo_score,
            optimization_notes=optimization_notes
        )
    
    def _generate_semantic_url(self, date: str, title: str, category: str, doc_info: Dict) -> str:
        """生成語義化URL"""
        url_parts = []
        
        # 1. 日期部分
        if date:
            url_parts.append(date)
        
        # 2. 類別部分
        if category and category != 'general':
            url_parts.append(category)
        
        # 3. 系列信息
        if doc_info.get('is_series', False):
            series_name = doc_info.get('series_name', '')
            episode = doc_info.get('episode', '')
            
            if series_name:
                series_slug = self._translate_to_url_slug(series_name, max_words=2)
                if series_slug:
                    url_parts.append(series_slug)
            
            if episode:
                url_parts.append(f"ep{episode}")
        
        # 4. 標題部分（核心改進）
        if title:
            title_slug = self._generate_advanced_title_slug(title)
            if title_slug:
                url_parts.append(title_slug)
        
        # 組合URL
        url = '-'.join(filter(None, url_parts))
        
        # 🔧 確保URL長度合適
        max_length = self.seo_config['url_max_length']
        if len(url) > max_length:
            url = self._optimize_url_length(url, date, category)
        
        return url.lower().strip('-')
    
    def _generate_advanced_title_slug(self, title: str) -> str:
        """生成高級標題slug"""
        if not title:
            return ""
        
        # 🔧 v3.0 核心改進：提取語義核心
        semantic_core = self._extract_semantic_core(title)
        
        if self.translator:
            try:
                # 使用翻譯器進行語義化翻譯
                translated_slug = self.translator.translate(semantic_core, clean_url=True)
                
                # 進一步優化
                optimized_slug = self._optimize_slug_for_seo(translated_slug)
                
                return optimized_slug
                
            except Exception as e:
                logger.warning(f"翻譯失敗，使用備用方法: {e}")
        
        # 備用方法：基於規則的slug生成
        return self._generate_rule_based_slug(semantic_core)
    
    def _extract_semantic_core(self, title: str) -> str:
        """提取標題的語義核心"""
        # 移除無意義的修飾詞
        title = re.sub(r'^(關於|有關|針對|對於|最新)', '', title)
        title = re.sub(r'(的說明|的介紹|的分析|完整指南|詳細教學)$', '', title)
        
        # 保留核心概念詞
        core_concepts = []
        important_terms = [
            '稅務', '所得稅', '營業稅', '申報', '繳納', '規劃', '節稅',
            '投資', '理財', '企業', '個人', '期程', '攻略', '指南'
        ]
        
        words = title.split()
        for word in words:
            # 保留重要術語
            if any(term in word for term in important_terms):
                core_concepts.append(word)
            # 保留年份
            elif re.match(r'20\d{2}', word):
                core_concepts.append(word)
            # 保留有意義的英文詞
            elif re.match(r'^[A-Za-z]{3,}$', word):
                core_concepts.append(word)
        
        # 如果沒有找到核心概念，保留前3個詞
        if not core_concepts:
            core_concepts = words[:3]
        
        return ' '.join(core_concepts).strip()
    
    def _optimize_slug_for_seo(self, slug: str, max_words: int = 4) -> str:
        """為SEO優化slug"""
        if not slug:
            return ""
        
        # 轉為小寫
        slug = slug.lower()
        
        # 分割為單詞
        words = re.findall(r'[a-z0-9]+', slug)
        
        # 🔧 移除SEO不友好的詞
        seo_unfriendly = self.stop_words['en'] | {
            'how', 'what', 'when', 'where', 'why', 'guide', 'tutorial', 
            'complete', 'full', 'comprehensive', 'detailed'
        }
        
        # 保留有價值的詞
        valuable_words = []
        for word in words:
            if (len(word) >= 3 and 
                word not in seo_unfriendly and 
                not word.isdigit() or len(word) == 4):  # 保留年份
                valuable_words.append(word)
        
        # 限制詞數
        if len(valuable_words) > max_words:
            valuable_words = valuable_words[:max_words]
        
        return '-'.join(valuable_words) if valuable_words else ""
    
    def _generate_rule_based_slug(self, text: str) -> str:
        """基於規則的slug生成（備用方法）"""
        # 簡化版本：提取關鍵中文詞並音譯
        chinese_chars = re.findall(r'[\u4e00-\u9fff]+', text)
        
        # 簡單的中文到拼音映射（實際應用中可使用pypinyin）
        common_mappings = {
            '稅務': 'tax',
            '所得稅': 'income-tax',
            '營業稅': 'business-tax',
            '申報': 'filing',
            '規劃': 'planning',
            '投資': 'investment',
            '理財': 'finance',
            '企業': 'business',
            '個人': 'personal',
            '指南': 'guide',
            '攻略': 'strategy'
        }
        
        slug_parts = []
        for char_group in chinese_chars[:3]:  # 最多3個詞組
            mapped = common_mappings.get(char_group)
            if mapped:
                slug_parts.append(mapped)
        
        return '-'.join(slug_parts) if slug_parts else 'article'
    
    def _translate_to_url_slug(self, text: str, max_words: int = 3) -> str:
        """翻譯文本為URL slug"""
        if self.translator:
            try:
                return self.translator.translate(text, clean_url=True)
            except:
                pass
        
        # 備用方法
        return self._generate_rule_based_slug(text)
    
    def _optimize_url_length(self, url: str, date: str, category: str) -> str:
        """優化URL長度"""
        max_length = self.seo_config['url_max_length']
        
        if len(url) <= max_length:
            return url
        
        # 重新構建精簡版
        essential_parts = [date, category]
        remaining_space = max_length - len('-'.join(essential_parts)) - 1
        
        # 從URL中提取最重要的詞
        url_words = url.split('-')
        important_words = []
        
        for word in url_words:
            if word not in [date, category] and len(word) >= 3:
                if len('-'.join(important_words + [word])) <= remaining_space:
                    important_words.append(word)
                else:
                    break
        
        return '-'.join(essential_parts + important_words)
    
    def _calculate_url_seo_score(self, url: str) -> float:
        """計算URL的SEO評分"""
        score = 0
        
        # 長度評分（50-75字符最佳）
        length = len(url)
        if 50 <= length <= 75:
            score += 30
        elif 40 <= length < 50 or 75 < length <= 85:
            score += 20
        elif length < 40 or length > 85:
            score += 10
        
        # 結構評分
        segments = url.split('-')
        if 3 <= len(segments) <= 6:
            score += 25
        elif len(segments) < 3 or len(segments) > 6:
            score += 15
        
        # 關鍵詞評分
        important_keywords = ['tax', 'investment', 'guide', 'planning', 'business']
        keyword_count = sum(1 for keyword in important_keywords if keyword in url)
        score += min(keyword_count * 10, 30)
        
        # 可讀性評分
        if not re.search(r'\d{8,}', url):  # 沒有長數字串
            score += 15
        
        return min(score, 100)
    
    def _generate_url_optimization_notes(self, url: str) -> List[str]:
        """生成URL優化建議"""
        notes = []
        
        if len(url) > 75:
            notes.append("URL長度建議控制在75字符以內")
        
        if len(url.split('-')) > 6:
            notes.append("URL段落建議控制在6個以內")
        
        if not re.search(r'(tax|investment|finance|business)', url):
            notes.append("建議在URL中包含核心業務關鍵詞")
        
        return notes
    
    def _optimize_content(self, doc_info: Dict) -> Dict[str, Any]:
        """優化內容SEO"""
        content = doc_info.get('content', [])
        title = doc_info.get('title', '')
        
        optimization = {
            'keyword_density': self._calculate_keyword_density(content, title),
            'readability_score': self._calculate_readability_score(content),
            'content_length': sum(len(para) for para in content),
            'heading_structure': self._analyze_heading_structure(doc_info),
            'internal_links': self._suggest_internal_links(content),
            'content_improvements': []
        }
        
        # 生成內容改進建議
        if optimization['keyword_density'] < 0.01:
            optimization['content_improvements'].append("建議增加目標關鍵詞密度")
        
        if optimization['content_length'] < 500:
            optimization['content_improvements'].append("建議增加內容長度以提升SEO效果")
        
        return optimization
    
    def _calculate_keyword_density(self, content: List[str], title: str) -> float:
        """計算關鍵詞密度"""
        if not content:
            return 0
        
        full_text = ' '.join(content + [title])
        total_words = len(full_text.split())
        
        # 計算主要關鍵詞出現次數
        main_keywords = ['稅務', '投資', '規劃', '申報', '企業']
        keyword_count = sum(full_text.count(keyword) for keyword in main_keywords)
        
        return keyword_count / total_words if total_words > 0 else 0
    
    def _calculate_readability_score(self, content: List[str]) -> float:
        """計算可讀性評分（簡化版）"""
        if not content:
            return 0
        
        total_sentences = 0
        total_words = 0
        
        for para in content:
            sentences = len(re.split(r'[。！？.!?]', para))
            words = len(para.split())
            total_sentences += sentences
            total_words += words
        
        if total_sentences == 0:
            return 0
        
        avg_words_per_sentence = total_words / total_sentences
        
        # 簡化的可讀性計算（12-18字/句最佳）
        if 12 <= avg_words_per_sentence <= 18:
            return 90
        elif 8 <= avg_words_per_sentence < 12 or 18 < avg_words_per_sentence <= 25:
            return 70
        else:
            return 50
    
    def _analyze_heading_structure(self, doc_info: Dict) -> Dict[str, Any]:
        """分析標題結構"""
        # 這裡需要分析HTML中的標題層級
        return {
            'has_h1': True,  # 假設總是有H1
            'h2_count': doc_info.get('extraction_stats', {}).get('chinese_titles_count', 0),
            'h3_count': doc_info.get('extraction_stats', {}).get('arabic_titles_count', 0),
            'structure_score': 85
        }
    
    def _suggest_internal_links(self, content: List[str]) -> List[str]:
        """建議內部連結"""
        suggestions = []
        
        full_text = ' '.join(content)
        
        # 根據內容建議相關文章連結
        if '所得稅' in full_text:
            suggestions.append("建議連結到相關的所得稅規劃文章")
        
        if '投資' in full_text:
            suggestions.append("建議連結到投資理財相關文章")
        
        return suggestions
    
    def _optimize_og_title(self, title: str) -> str:
        """優化Open Graph標題"""
        # OG標題可以比META標題稍長
        if len(title) <= 70:
            return title
        
        return title[:67] + "..."
    
    def _optimize_og_description(self, description: str) -> str:
        """優化Open Graph描述"""
        # OG描述可以比META描述稍長
        if len(description) <= 200:
            return description
        
        return description[:197] + "..."
    
    def _generate_structured_data(self, doc_info: Dict, metadata: SEOMetadata) -> StructuredData:
        """生成結構化數據"""
        structured_data = StructuredData(
            headline=metadata.title,
            description=metadata.meta_description,
            date_published=doc_info.get('date'),
            date_modified=metadata.modified_date,
            main_entity_of_page={
                "@type": "WebPage",
                "@id": metadata.canonical_url
            }
        )
        
        return structured_data
    
    def _calculate_seo_score(self, doc_info: Dict, metadata: SEOMetadata, url_opt: URLOptimization) -> float:
        """計算總體SEO評分"""
        scores = []
        
        # 標題評分
        title_score = 100
        if len(metadata.title) > 60:
            title_score -= 20
        if not any(keyword in metadata.title for keyword in ['稅務', '投資', '規劃']):
            title_score -= 15
        scores.append(title_score * 0.25)
        
        # 描述評分
        desc_score = 100
        if len(metadata.meta_description) > 160:
            desc_score -= 20
        if len(metadata.meta_description) < 120:
            desc_score -= 10
        scores.append(desc_score * 0.20)
        
        # URL評分
        scores.append(url_opt.seo_score * 0.20)
        
        # 內容評分
        content_score = 80  # 基礎分數
        if doc_info.get('extraction_stats', {}).get('total_paragraphs', 0) > 5:
            content_score += 10
        scores.append(content_score * 0.25)
        
        # 關鍵詞評分
        keyword_score = min(len(metadata.keywords) * 10, 100)
        scores.append(keyword_score * 0.10)
        
        return sum(scores)
    
    def _generate_seo_recommendations(self, doc_info: Dict, seo_score: float) -> List[str]:
        """生成SEO優化建議"""
        recommendations = []
        
        if seo_score < 70:
            recommendations.append("整體SEO分數偏低，建議全面優化")
        
        title = doc_info.get('title', '')
        if len(title) > 60:
            recommendations.append("標題長度過長，建議控制在60字符以內")
        
        content = doc_info.get('content', [])
        total_length = sum(len(para) for para in content)
        if total_length < 500:
            recommendations.append("內容長度較短，建議增加更多有價值的內容")
        
        return recommendations
    
    def _load_semantic_mappings(self) -> Dict:
        """載入語義映射表"""
        return {
            'tax_terms': {
                '所得稅': 'income-tax',
                '營業稅': 'business-tax',
                '稅務規劃': 'tax-planning',
                '節稅': 'tax-saving'
            },
            'business_terms': {
                '企業': 'business',
                '公司': 'company',
                '營運': 'operations',
                '管理': 'management'
            },
            'investment_terms': {
                '投資': 'investment',
                '理財': 'finance',
                '基金': 'fund',
                '股票': 'stock'
            }
        }
    
    def generate_html_meta_tags(self, metadata: SEOMetadata) -> str:
        """生成HTML META標籤"""
        meta_tags = f"""
    <!-- Basic Meta Tags -->
    <title>{metadata.title}</title>
    <meta name="description" content="{metadata.meta_description}">
    <meta name="keywords" content="{', '.join(metadata.keywords)}">
    <meta name="author" content="{metadata.author}">
    <link rel="canonical" href="{metadata.canonical_url}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="{metadata.og_type}">
    <meta property="og:title" content="{metadata.og_title}">
    <meta property="og:description" content="{metadata.og_description}">
    <meta property="og:url" content="{metadata.canonical_url}">
    {f'<meta property="og:image" content="{metadata.og_image}">' if metadata.og_image else ''}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="{metadata.twitter_card}">
    <meta name="twitter:title" content="{metadata.og_title}">
    <meta name="twitter:description" content="{metadata.og_description}">
    {f'<meta name="twitter:image" content="{metadata.og_image}">' if metadata.og_image else ''}
    
    <!-- Article Meta Tags -->
    {f'<meta property="article:published_time" content="{metadata.publish_date}">' if metadata.publish_date else ''}
    {f'<meta property="article:modified_time" content="{metadata.modified_date}">' if metadata.modified_date else ''}
    <meta property="article:author" content="{metadata.author}">
    """
        
        return meta_tags.strip()
    
    def generate_json_ld(self, structured_data: StructuredData) -> str:
        """生成JSON-LD結構化數據"""
        json_ld = {
            "@context": "https://schema.org",
            "@type": structured_data.type,
            "headline": structured_data.headline,
            "description": structured_data.description,
            "author": structured_data.author,
            "publisher": structured_data.publisher,
            "mainEntityOfPage": structured_data.main_entity_of_page
        }
        
        # 添加可選字段
        if structured_data.date_published:
            json_ld["datePublished"] = structured_data.date_published
        
        if structured_data.date_modified:
            json_ld["dateModified"] = structured_data.date_modified
        
        if structured_data.image:
            json_ld["image"] = structured_data.image
        
        return f'<script type="application/ld+json">\n{json.dumps(json_ld, ensure_ascii=False, indent=2)}\n</script>'

def test_seo_optimizer():
    """測試SEO優化器"""
    optimizer = SEOOptimizer("https://example.com")
    
    # 模擬文檔數據
    test_doc = {
        'title': '2025年台灣個人所得稅申報完整指南：節稅策略與注意事項',
        'summary': '詳細解析2025年個人所得稅申報流程，提供實用的節稅建議和常見問題解答。',
        'content': [
            '2025年個人所得稅申報期間為5月1日至5月31日',
            '今年新增多項節稅優惠措施，包括投資抵減和教育支出扣除',
            '申報時需要特別注意12.5%的稅率變化',
            '建議提前準備相關文件，避免申報期間的擁擠'
        ],
        'date': '2025-01-15',
        'url': 'temp-url',
        'extraction_stats': {
            'total_paragraphs': 4,
            'chinese_titles_count': 2,
            'arabic_titles_count': 1
        }
    }
    
    # 模擬分類結果
    class MockClassification:
        def __init__(self):
            self.document_type = type('DocumentType', (), {'value': 'tax_guide'})()
            self.seo_category = 'tax-planning'
            self.target_keywords = ['所得稅申報', '節稅策略', '稅務規劃']
    
    classification = MockClassification()
    
    # 執行SEO優化
    seo_result = optimizer.optimize_document_seo(test_doc, classification)
    
    print("🧪 SEO優化測試結果:")
    print(f"  優化標題: {seo_result['metadata'].title}")
    print(f"  META描述: {seo_result['metadata'].meta_description}")
    print(f"  語義化URL: {seo_result['url_optimization'].semantic_url}")
    print(f"  SEO評分: {seo_result['seo_score']:.1f}/100")
    print(f"  關鍵詞: {seo_result['metadata'].keywords}")
    print(f"  優化建議: {seo_result['recommendations']}")
    
    # 測試HTML生成
    meta_tags = optimizer.generate_html_meta_tags(seo_result['metadata'])
    json_ld = optimizer.generate_json_ld(seo_result['structured_data'])
    
    print("\n📄 生成的META標籤:")
    print(meta_tags[:200] + "...")
    
    print("\n🔗 生成的JSON-LD:")
    print(json_ld[:200] + "...")

if __name__ == "__main__":
    test_seo_optimizer()