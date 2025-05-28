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
    translation_dict_file: str = "assets/data/translation_dict.json"
    
    # 翻译服务配置
    primary_service: str = "deepl"  # deepl, google, bing
    fallback_services: list = field(default_factory=lambda: ["google", "bing"])
    
    # 语言配置
    source_language: str = "zh"
    target_language: str = "en"
    
    # 缓存配置
    enable_cache: bool = True
    cache_max_size: int = 10000
    
    # 批量处理配置
    batch_size: int = 100
    max_workers: int = 5

@dataclass
class BatchProcessingConfig:
    """批量处理配置"""
    enable_batch_processing: bool = True
    max_workers: int = 4
    chunk_size: int = 10
    timeout_per_document: float = 60.0
    
    # 错误处理
    max_retries: int = 3
    retry_delay: float = 1.0
    continue_on_error: bool = True
    
    # 进度报告
    enable_progress_reporting: bool = True
    progress_callback_interval: int = 5

@dataclass
class UnifiedConfig:
    """统一配置类"""
    paths: PathConfig = field(default_factory=PathConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    highlighting: HighlightConfig = field(default_factory=HighlightConfig)
    seo: SEOConfig = field(default_factory=SEOConfig)
    quality: QualityConfig = field(default_factory=QualityConfig)
    classification: ClassificationConfig = field(default_factory=ClassificationConfig)
    translation: TranslationConfig = field(default_factory=TranslationConfig)
    batch_processing: BatchProcessingConfig = field(default_factory=BatchProcessingConfig)
    
    # 元数据
    version: str = "3.0"
    created_at: Optional[str] = None
    last_modified: Optional[str] = None

class ConfigManager:
    """配置管理器主类"""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        初始化配置管理器
        
        Args:
            config_file: 配置文件路径，可选
        """
        self.config_file = Path(config_file) if config_file else None
        self.config = UnifiedConfig()
        
        # 从环境变量加载配置
        self._load_from_environment()
        
        # 从配置文件加载配置（如果存在）
        if self.config_file and self.config_file.exists():
            self._load_from_file()
        
        logger.info("✅ 配置管理器初始化完成")
    
    def _load_from_environment(self):
        """从环境变量加载配置"""
        # 路径配置
        if os.getenv('WORD_DIR'):
            self.config.paths.word_dir = os.getenv('WORD_DIR')
        if os.getenv('OUTPUT_DIR'):
            self.config.paths.output_dir = os.getenv('OUTPUT_DIR')
        if os.getenv('ASSETS_DIR'):
            self.config.paths.assets_dir = os.getenv('ASSETS_DIR')
        
        # 处理配置
        if os.getenv('PROCESSING_MODE'):
            try:
                self.config.processing.processing_mode = ProcessingMode(os.getenv('PROCESSING_MODE'))
            except ValueError:
                logger.warning(f"无效的处理模式: {os.getenv('PROCESSING_MODE')}")
        
        if os.getenv('QUALITY_LEVEL'):
            try:
                self.config.processing.quality_level = QualityLevel(os.getenv('QUALITY_LEVEL'))
            except ValueError:
                logger.warning(f"无效的质量级别: {os.getenv('QUALITY_LEVEL')}")
        
        if os.getenv('MAX_WORKERS'):
            try:
                self.config.processing.max_workers = int(os.getenv('MAX_WORKERS'))
            except ValueError:
                logger.warning(f"无效的工作线程数: {os.getenv('MAX_WORKERS')}")
        
        # 翻译配置
        if os.getenv('DEEPL_API_KEY'):
            self.config.translation.api_key = os.getenv('DEEPL_API_KEY')
        
        # 布尔值配置
        bool_env_mappings = {
            'FORCE_PROCESS_ALL': ('processing', 'force_process_all'),
            'SKIP_VALIDATION': ('processing', 'skip_validation'),
            'ENABLE_SEO_OPTIMIZATION': ('seo', 'enable_seo_optimization'),
            'ENABLE_TRANSLATION': ('translation', 'enable_translation'),
        }
        
        for env_var, (section, key) in bool_env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                bool_value = env_value.lower() in ('true', '1', 'yes', 'on')
                setattr(getattr(self.config, section), key, bool_value)
    
    def _load_from_file(self):
        """从配置文件加载配置"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # 更新配置
            self._update_config_from_dict(config_data)
            
            logger.info(f"已从文件加载配置: {self.config_file}")
            
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
    
    def _update_config_from_dict(self, config_data: Dict[str, Any]):
        """从字典更新配置"""
        for section_name, section_data in config_data.items():
            if hasattr(self.config, section_name):
                section = getattr(self.config, section_name)
                if isinstance(section_data, dict):
                    for key, value in section_data.items():
                        if hasattr(section, key):
                            # 处理枚举类型
                            attr = getattr(section.__class__, key, None)
                            if hasattr(attr, 'type') and issubclass(attr.type, Enum):
                                try:
                                    value = attr.type(value)
                                except ValueError:
                                    logger.warning(f"无效的枚举值: {key}={value}")
                                    continue
                            
                            setattr(section, key, value)
                        else:
                            logger.warning(f"未知配置项: {section_name}.{key}")
                else:
                    # 直接设置值（如version等）
                    if hasattr(self.config, section_name):
                        setattr(self.config, section_name, section_data)
    
    def save_to_file(self, output_file: Optional[str] = None):
        """保存配置到文件"""
        if output_file:
            self.config_file = Path(output_file)
        
        if not self.config_file:
            logger.error("未指定配置文件路径")
            return False
        
        try:
            # 确保目录存在
            self.config_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 转换为字典并保存
            config_dict = asdict(self.config)
            
            # 处理枚举值
            config_dict = self._convert_enums_to_strings(config_dict)
            
            # 添加时间戳
            import datetime
            config_dict['last_modified'] = datetime.datetime.now().isoformat()
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, ensure_ascii=False, indent=2)
            
            logger.info(f"配置已保存到: {self.config_file}")
            return True
            
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")
            return False
    
    def _convert_enums_to_strings(self, data):
        """递归转换枚举值为字符串"""
        if isinstance(data, dict):
            return {k: self._convert_enums_to_strings(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._convert_enums_to_strings(item) for item in data]
        elif isinstance(data, Enum):
            return data.value
        else:
            return data
    
    def get_component_config(self, component_name: str) -> Dict[str, Any]:
        """
        获取特定组件的配置
        
        Args:
            component_name: 组件名称
            
        Returns:
            Dict: 组件配置字典
        """
        component_configs = {
            'unified_processor': self._get_unified_processor_config(),
            'word_processor': self._get_word_processor_config(),
            'html_processor': self._get_html_processor_config(),
            'document_classifier': self._get_classifier_config(),
            'seo_optimizer': self._get_seo_config(),
            'quality_scorer': self._get_quality_config(),
            'batch_processor': self._get_batch_config(),
            'translator': self._get_translator_config()
        }
        
        return component_configs.get(component_name, {})
    
    def create_component_config(self, component_name: str) -> Dict[str, Any]:
        """
        创建组件配置（别名方法，与get_component_config相同）
        
        Args:
            component_name: 组件名称
            
        Returns:
            Dict: 组件配置字典
        """
        return self.get_component_config(component_name)
    
    def _get_unified_processor_config(self) -> Dict[str, Any]:
        """获取统一处理器配置"""
        return {
            'word_dir': self.config.paths.word_dir,
            'output_dir': self.config.paths.output_dir,
            'assets_dir': self.config.paths.assets_dir,
            'processing_mode': self.config.processing.processing_mode.value,
            'quality_level': self.config.processing.quality_level.value,
            'validation_level': self.config.processing.validation_level.value,
            'force_process_all': self.config.processing.force_process_all,
            'skip_validation': self.config.processing.skip_validation,
            'generate_report': self.config.processing.generate_report,
            'enable_auto_categorization': self.config.classification.enable_auto_categorization,
            'enable_seo_optimization': self.config.seo.enable_seo_optimization,
            'seo_config': self._get_seo_config(),
            'validation_config': self._get_quality_config()
        }
    
    def _get_word_processor_config(self) -> Dict[str, Any]:
        """获取Word处理器配置"""
        return {
            'word_dir': self.config.paths.word_dir,
            'processed_dir': self.config.paths.processed_dir,
            'translation_dict_file': self.config.translation.translation_dict_file,
            'api_key': self.config.translation.api_key
        }
    
    def _get_html_processor_config(self) -> Dict[str, Any]:
        """获取HTML处理器配置"""
        return {
            'enable_smart_highlighting': self.config.highlighting.enable_smart_highlighting,
            'highlight_priorities': self.config.highlighting.highlight_priorities,
            'custom_styles': self.config.highlighting.custom_styles,
            'conflict_resolution': self.config.highlighting.conflict_resolution
        }
    
    def _get_classifier_config(self) -> Dict[str, Any]:
        """获取分类器配置"""
        return {
            'enable_auto_categorization': self.config.classification.enable_auto_categorization,
            'confidence_threshold': self.config.classification.confidence_threshold,
            'use_title_analysis': self.config.classification.use_title_analysis,
            'use_content_analysis': self.config.classification.use_content_analysis,
            'use_structure_analysis': self.config.classification.use_structure_analysis,
            'custom_categories': self.config.classification.custom_categories
        }
    
    def _get_seo_config(self) -> Dict[str, Any]:
        """获取SEO配置"""
        return {
            'enable_seo_optimization': self.config.seo.enable_seo_optimization,
            'max_title_length': self.config.seo.max_title_length,
            'max_description_length': self.config.seo.max_description_length,
            'max_url_length': self.config.seo.max_url_length,
            'target_keywords_count': self.config.seo.target_keywords_count,
            'enable_semantic_urls': self.config.seo.enable_semantic_urls,
            'url_language': self.config.seo.url_language,
            'enable_structured_data': self.config.seo.enable_structured_data,
            'schema_type': self.config.seo.schema_type,
            'enable_open_graph': self.config.seo.enable_open_graph,
            'enable_twitter_cards': self.config.seo.enable_twitter_cards
        }
    
    def _get_quality_config(self) -> Dict[str, Any]:
        """获取质量配置"""
        return {
            'enable_quality_scoring': self.config.quality.enable_quality_scoring,
            'min_quality_score': self.config.quality.min_quality_score,
            'fail_on_low_quality': self.config.quality.fail_on_low_quality,
            'min_content_retention': self.config.quality.min_content_retention,
            'min_decimal_retention': self.config.quality.min_decimal_retention,
            'min_date_retention': self.config.quality.min_date_retention,
            'min_highlight_coverage': self.config.quality.min_highlight_coverage,
            'enable_highlight_validation': self.config.quality.enable_highlight_validation,
            'min_seo_score': self.config.quality.min_seo_score,
            'require_meta_tags': self.config.quality.require_meta_tags
        }
    
    def _get_batch_config(self) -> Dict[str, Any]:
        """获取批量处理配置"""
        return {
            'enable_batch_processing': self.config.batch_processing.enable_batch_processing,
            'max_workers': self.config.batch_processing.max_workers,
            'chunk_size': self.config.batch_processing.chunk_size,
            'timeout_per_document': self.config.batch_processing.timeout_per_document,
            'max_retries': self.config.batch_processing.max_retries,
            'retry_delay': self.config.batch_processing.retry_delay,
            'continue_on_error': self.config.batch_processing.continue_on_error,
            'enable_progress_reporting': self.config.batch_processing.enable_progress_reporting,
            'progress_callback_interval': self.config.batch_processing.progress_callback_interval
        }
    
    def _get_translator_config(self) -> Dict[str, Any]:
        """获取翻译器配置"""
        return {
            'enable_translation': self.config.translation.enable_translation,
            'api_key': self.config.translation.api_key,
            'translation_dict_file': self.config.translation.translation_dict_file,
            'primary_service': self.config.translation.primary_service,
            'fallback_services': self.config.translation.fallback_services,
            'source_language': self.config.translation.source_language,
            'target_language': self.config.translation.target_language,
            'enable_cache': self.config.translation.enable_cache,
            'cache_max_size': self.config.translation.cache_max_size,
            'batch_size': self.config.translation.batch_size,
            'max_workers': self.config.translation.max_workers
        }
    
    def update_config(self, **kwargs):
        """
        更新配置
        
        Args:
            **kwargs: 配置参数
        """
        for section_key, updates in kwargs.items():
            if hasattr(self.config, section_key):
                section = getattr(self.config, section_key)
                if isinstance(updates, dict):
                    for key, value in updates.items():
                        if hasattr(section, key):
                            setattr(section, key, value)
                        else:
                            logger.warning(f"未知配置项: {section_key}.{key}")
                else:
                    logger.warning(f"配置更新值必须是字典格式: {section_key}")
            else:
                logger.warning(f"未知配置节: {section_key}")
    
    def reset_to_defaults(self):
        """重置配置为默认值"""
        self.config = UnifiedConfig()
        logger.info("配置已重置为默认值")
    
    def validate_config(self) -> Dict[str, Any]:
        """
        验证配置的有效性
        
        Returns:
            Dict: 验证结果
        """
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # 验证路径
        paths_to_check = [
            (self.config.paths.word_dir, "Word文档目录"),
            (self.config.paths.assets_dir, "资源目录")
        ]
        
        for path, name in paths_to_check:
            if not Path(path).exists():
                validation_result['warnings'].append(f"{name}不存在: {path}")
        
        # 验证数值范围
        if self.config.processing.max_workers <= 0:
            validation_result['errors'].append("最大工作线程数必须大于0")
            validation_result['valid'] = False
        
        if self.config.quality.min_quality_score < 0 or self.config.quality.min_quality_score > 100:
            validation_result['errors'].append("最小质量分数必须在0-100之间")
            validation_result['valid'] = False
        
        # 验证文件路径
        if self.config.translation.translation_dict_file:
            dict_path = Path(self.config.translation.translation_dict_file)
            if not dict_path.parent.exists():
                validation_result['warnings'].append(f"翻译字典目录不存在: {dict_path.parent}")
        
        return validation_result
    
    def get_summary(self) -> str:
        """获取配置摘要"""
        return f"""
配置管理器 v{self.config.version} 摘要:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 路径配置:
  - Word目录: {self.config.paths.word_dir}
  - 输出目录: {self.config.paths.output_dir}
  - 资源目录: {self.config.paths.assets_dir}

⚙️ 处理配置:
  - 处理模式: {self.config.processing.processing_mode.value}
  - 质量级别: {self.config.processing.quality_level.value}
  - 验证级别: {self.config.processing.validation_level.value}
  - 工作线程: {self.config.processing.max_workers}

🎨 功能开关:
  - 智能高亮: {self.config.highlighting.enable_smart_highlighting}
  - SEO优化: {self.config.seo.enable_seo_optimization}
  - 自动分类: {self.config.classification.enable_auto_categorization}
  - 翻译服务: {self.config.translation.enable_translation}
  - 质量评分: {self.config.quality.enable_quality_scoring}

📊 质量标准:
  - 最小质量分数: {self.config.quality.min_quality_score}
  - 内容保留率: {self.config.quality.min_content_retention}
  - 小数保留率: {self.config.quality.min_decimal_retention}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """.strip()

# 全局配置管理器实例
_config_manager_instance: Optional[ConfigManager] = None

def get_config_manager(config_file: Optional[str] = None, force_reload: bool = False) -> ConfigManager:
    """
    获取配置管理器实例（单例模式）
    
    Args:
        config_file: 配置文件路径，可选
        force_reload: 是否强制重新加载
        
    Returns:
        ConfigManager: 配置管理器实例
    """
    global _config_manager_instance
    
    if _config_manager_instance is None or force_reload:
        _config_manager_instance = ConfigManager(config_file)
        logger.info("✅ 全局配置管理器已初始化")
    
    return _config_manager_instance

def create_default_config_file(output_path: str = "config/default_config.json"):
    """
    创建默认配置文件
    
    Args:
        output_path: 输出文件路径
    """
    config_manager = ConfigManager()
    
    # 确保目录存在
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    if config_manager.save_to_file(output_path):
        logger.info(f"✅ 默认配置文件已创建: {output_path}")
    else:
        logger.error(f"❌ 创建默认配置文件失败: {output_path}")

# 便捷函数
def load_config_from_file(config_file: str) -> ConfigManager:
    """从文件加载配置"""
    return ConfigManager(config_file)

def create_config_from_dict(config_dict: Dict[str, Any]) -> ConfigManager:
    """从字典创建配置"""
    config_manager = ConfigManager()
    config_manager._update_config_from_dict(config_dict)
    return config_manager

# 测试函数
def test_config_manager():
    """测试配置管理器"""
    print("🧪 测试配置管理器...")
    
    # 创建配置管理器
    config_manager = get_config_manager()
    
    # 显示配置摘要
    print(config_manager.get_summary())
    
    # 验证配置
    validation_result = config_manager.validate_config()
    print(f"\n✅ 配置验证结果: {validation_result}")
    
    # 测试组件配置获取
    unified_config = config_manager.get_component_config('unified_processor')
    print(f"\n🔧 统一处理器配置示例:")
    for key, value in list(unified_config.items())[:5]:
        print(f"  {key}: {value}")
    
    print("\n✅ 配置管理器测试完成!")

if __name__ == "__main__":
    test_config_manager()