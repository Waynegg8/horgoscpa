#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
统一配置管理器 v3.0
集中管理所有组件配置，支持环境变量、配置文件和参数传递
"""

import os
import json
from typing import Dict, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass, field, asdict
from enum import Enum
from loguru import logger

class ProcessingMode(Enum):
    """处理模式枚举"""
    BASIC = "basic"
    STANDARD = "standard"
    ENHANCED = "enhanced"
    PREMIUM = "premium"

class QualityLevel(Enum):
    """质量级别枚举"""
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"

class ValidationLevel(Enum):
    """验证级别枚举"""
    NONE = "none"
    BASIC = "basic"
    SMART = "smart"
    STRICT = "strict"

@dataclass
class PathConfig:
    """路径配置"""
    word_dir: str = "word-docs"
    output_dir: str = "blog"
    assets_dir: str = "assets"
    processed_dir: str = "word-docs/processed"
    backup_dir: Optional[str] = None
    logs_dir: str = "logs"
    reports_dir: str = "reports"

@dataclass
class ProcessingConfig:
    """处理配置"""
    processing_mode: ProcessingMode = ProcessingMode.ENHANCED
    quality_level: QualityLevel = QualityLevel.PREMIUM
    validation_level: ValidationLevel = ValidationLevel.SMART
    
    # 处理选项
    force_process_all: bool = False
    process_date: Optional[str] = None
    skip_validation: bool = False
    generate_report: bool = True
    
    # 并行处理
    max_workers: int = 4
    enable_parallel: bool = True
    timeout: float = 300.0  # 5分钟超时

@dataclass
class HighlightConfig:
    """高亮配置"""
    enable_smart_highlighting: bool = True
    
    # 高亮优先级（数字越小优先级越高）
    highlight_priorities: Dict[str, int] = field(default_factory=lambda: {
        'final_result': 1,      # 最终结果（如应纳税额）
        'key_deadline': 2,      # 关键时间点
        'important_amount': 3,  # 重要金额门槛
        'regulation_reference': 4, # 法规引用
        'percentage': 5,        # 百分比
        'general_date': 6,      # 一般日期
        'general_amount': 7     # 一般金额
    })
    
    # 高亮样式配置
    custom_styles: Dict[str, str] = field(default_factory=dict)
    
    # 冲突解决策略
    conflict_resolution: str = "priority_based"  # priority_based, length_based, context_based

@dataclass
class SEOConfig:
    """SEO配置"""
    enable_seo_optimization: bool = True
    max_title_length: int = 60
    max_description_length: int = 160
    max_url_length: int = 75
    target_keywords_count: int = 5
    
    # URL优化
    enable_semantic_urls: bool = True
    url_language: str = "en"  # en, zh, mixed
    
    # 结构化数据
    enable_structured_data: bool = True
    schema_type: str = "Article"
    
    # 社交媒体
    enable_open_graph: bool = True
    enable_twitter_cards: bool = True

@dataclass
class QualityConfig:
    """质量配置"""
    enable_quality_scoring: bool = True
    min_quality_score: float = 70.0
    fail_on_low_quality: bool = False
    
    # 内容完整性
    min_content_retention: float = 0.85
    min_decimal_retention: float = 0.95
    min_date_retention: float = 0.95
    
    # 高亮质量
    min_highlight_coverage: float = 0.8
    enable_highlight_validation: bool = True
    
    # SEO质量
    min_seo_score: float = 70.0
    require_meta_tags: bool = True

@dataclass
class ClassificationConfig:
    """文档分类配置"""
    enable_auto_categorization: bool = True
    confidence_threshold: float = 0.6
    
    # 分类策略
    use_title_analysis: bool = True
    use_content_analysis: bool = True
    use_structure_analysis: bool = True
    
    # 自定义分类规则
    custom_categories: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TranslationConfig:
    """翻译配置"""
    enable_translation: bool = True
    api_key: Optional[str] = None
    translation_dict_file: str = "assets/data/translation_dict.