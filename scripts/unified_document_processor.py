#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
统一智能文档处理器 v3.0 - 优化整合版
整合外部专业组件，提供统一接口
"""

import re
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from loguru import logger

# 🔧 v3.0 改进：导入外部专业组件
try:
    from enhanced_word_extractor import EnhancedWordProcessor
    from comprehensive_html_processor import ComprehensiveHTMLProcessor
    from document_classifier import DocumentClassifier
    from seo_optimizer import SEOOptimizer
    from quality_scorer import QualityScorer
    from config_manager import get_config_manager, ConfigManager
    EXTERNAL_COMPONENTS_AVAILABLE = True
    logger.info("✅ 已导入所有外部专业组件")
except ImportError as e:
    logger.warning(f"⚠️ 部分外部组件不可用: {e}")
    EXTERNAL_COMPONENTS_AVAILABLE = False

class UnifiedDocumentProcessor:
    """统一智能文档处理器 v3.0 - 整合版"""
    
    def __init__(self, config: Optional[Dict] = None):
        """
        初始化统一处理器
        
        Args:
            config: 配置字典，如果为None则使用配置管理器
        """
        # 🔧 v3.0 改进：使用配置管理器
        if config is None:
            self.config_manager = get_config_manager()
            self.config = self.config_manager.create_component_config('unified_processor')
        else:
            self.config = config
            self.config_manager = None
        
        self.version = "3.0"
        
        # 🔧 核心改进：初始化外部专业组件
        self._init_external_components()
        
        # 统计信息
        self.processing_stats = {
            'total_processed': 0,
            'successful': 0,
            'failed': 0,
            'validation_warnings': 0,
            'start_time': None,
            'end_time': None
        }
        
        logger.info(f"✅ 统一智能文档处理器 v{self.version} 已初始化")
    
    def _init_external_components(self):
        """🔧 v3.0 核心改进：初始化外部专业组件"""
        
        if not EXTERNAL_COMPONENTS_AVAILABLE:
            logger.warning("⚠️ 外部组件不可用，使用内置备用组件")
            self._init_fallback_components()
            return
        
        try:
            # 1. 增强Word提取器
            self.word_processor = EnhancedWordProcessor()
            logger.info("✅ 增强Word处理器已初始化")
            
            # 2. HTML处理器
            self.html_processor = ComprehensiveHTMLProcessor()
            logger.info("✅ 综合HTML处理器已初始化")
            
            # 3. 文档分类器
            if self.config.get('enable_auto_categorization', True):
                self.doc_classifier = DocumentClassifier()
                logger.info("✅ 文档分类器已初始化")
            else:
                self.doc_classifier = None
            
            # 4. SEO优化器
            if self.config.get('enable_seo_optimization', True):
                seo_config = self.config.get('seo_config', {})
                self.seo_optimizer = SEOOptimizer(**seo_config)
                logger.info("✅ SEO优化器已初始化")
            else:
                self.seo_optimizer = None
            
            # 5. 质量评分器
            quality_config = self.config.get('validation_config', {})
            self.quality_scorer = QualityScorer()
            logger.info("✅ 质量评分器已初始化")
            
            self.using_external_components = True
            
        except Exception as e:
            logger.error(f"❌ 外部组件初始化失败: {e}")
            self._init_fallback_components()
    
    def _init_fallback_components(self):
        """初始化备用组件（简化版）"""
        self.word_processor = None
        self.html_processor = None
        self.doc_classifier = None
        self.seo_optimizer = None
        self.quality_scorer = None
        self.using_external_components = False
        
        logger.warning("⚠️ 使用备用组件模式")
    
    def process_document(self, doc_path: str) -> Dict[str, Any]:
        """
        处理单个文档 - 统一入口
        
        Args:
            doc_path: 文档路径
            
        Returns:
            Dict: 处理结果
        """
        doc_path = Path(doc_path)
        logger.info(f"🔄 开始处理文档: {doc_path.name}")
        
        result = {
            'success': False,
            'doc_path': str(doc_path),
            'processing_time': None,
            'quality_score': 0,
            'validation_result': None,
            'generated_files': [],
            'errors': [],
            'warnings': [],
            'using_external_components': self.using_external_components
        }
        
        start_time = datetime.now()
        
        try:
            if self.using_external_components:
                # 🔧 使用外部专业组件处理
                result = self._process_with_external_components(doc_path, result, start_time)
            else:
                # 使用备用处理逻辑
                result = self._process_with_fallback(doc_path, result, start_time)
            
            logger.success(f"✅ 文档处理完成: {doc_path.name}")
            
        except Exception as e:
            logger.error(f"❌ 处理文档时发生错误: {e}")
            result['errors'].append(str(e))
            result['success'] = False
            result['processing_time'] = (datetime.now() - start_time).total_seconds()
        
        return result
    
    def _process_with_external_components(self, doc_path: Path, result: Dict, start_time: datetime) -> Dict:
        """🔧 使用外部专业组件处理文档"""
        
        # 步骤1: 使用增强Word提取器
        logger.info("📖 步骤1: 增强Word内容提取...")
        enhanced_data = self.word_processor.extract_content(doc_path)
        
        # 步骤2: 文档分类和分析
        logger.info("🔍 步骤2: 文档分类和结构分析...")
        doc_analysis = None
        if self.doc_classifier:
            try:
                doc_analysis = self.doc_classifier.classify_document(enhanced_data)
                logger.info(f"文档分类: {doc_analysis.document_type.value} ({doc_analysis.confidence_score:.2f})")
            except Exception as e:
                logger.warning(f"文档分类失败: {e}")
                result['warnings'].append(f"文档分类失败: {e}")
        
        # 步骤3: HTML生成（使用专业HTML处理器）
        logger.info("🎨 步骤3: 生成优化HTML...")
        html_content = self.html_processor.process_enhanced_content(enhanced_data)
        
        # 🔧 v3.0 新增：HTML高亮质量验证
        if hasattr(self.html_processor, 'validate_highlights'):
            highlight_validation = self.html_processor.validate_highlights(html_content)
            if highlight_validation['quality_score'] < 80:
                result['warnings'].append(f"高亮质量较低: {highlight_validation['quality_score']}")
        
        # 步骤4: SEO优化
        logger.info("🎯 步骤4: SEO优化...")
        seo_data = None
        if self.seo_optimizer:
            try:
                # 准备SEO优化的数据格式
                doc_info = {
                    'title': enhanced_data.get('title', ''),
                    'summary': enhanced_data.get('summary', ''),
                    'content': enhanced_data.get('content', []),
                    'date': enhanced_data.get('date', ''),
                    'extraction_stats': enhanced_data.get('extraction_stats', {})
                }
                seo_data = self.seo_optimizer.optimize_document_seo(doc_info, doc_analysis)
                logger.info(f"SEO优化完成: {seo_data.get('seo_score', 0):.1f}/100")
            except Exception as e:
                logger.warning(f"SEO优化失败: {e}")
                result['warnings'].append(f"SEO优化失败: {e}")
        
        # 步骤5: 质量评分
        logger.info("📊 步骤5: 质量评分...")
        quality_result = None
        if self.quality_scorer:
            try:
                # 准备质量评估的原始文档数据
                original_doc = {
                    'title': enhanced_data.get('title', ''),
                    'content': enhanced_data.get('content', []),
                    'filename': doc_path.name
                }
                
                quality_result = self.quality_scorer.evaluate_document_quality(
                    original_doc, html_content, seo_data, doc_analysis
                )
                result['quality_score'] = quality_result.overall_score
                logger.info(f"质量评分: {quality_result.overall_score:.1f}/100 ({quality_result.quality_level.value})")
                
            except Exception as e:
                logger.warning(f"质量评估失败: {e}")
                result['warnings'].append(f"质量评估失败: {e}")
        
        # 步骤6: 保存结果
        logger.info("💾 步骤6: 保存处理结果...")
        output_files = self._save_processed_content(
            doc_path, enhanced_data, html_content, seo_data, doc_analysis
        )
        
        # 更新结果
        result.update({
            'success': True,
            'quality_score': quality_result.overall_score if quality_result else 0,
            'validation_result': quality_result,
            'generated_files': output_files,
            'seo_data': seo_data,
            'doc_analysis': doc_analysis,
            'enhanced_data': enhanced_data,
            'html_content': html_content,
            'processing_stats': {
                'content_retention_rate': quality_result.document_info.get('html_length', 0) / quality_result.document_info.get('content_length', 1) if quality_result else 1,
                'highlight_coverage': self._calculate_highlight_coverage(html_content),
                'seo_score': seo_data.get('seo_score', 0) if seo_data else 0
            }
        })
        
        result['processing_time'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def _process_with_fallback(self, doc_path: Path, result: Dict, start_time: datetime) -> Dict:
        """备用处理逻辑（当外部组件不可用时）"""
        logger.info("⚠️ 使用备用处理逻辑")
        
        try:
            # 基础Word内容提取
            content = self._basic_word_extraction(doc_path)
            
            # 基础HTML生成
            html_content = self._basic_html_generation(content)
            
            # 保存结果
            output_files = self._save_basic_result(doc_path, content, html_content)
            
            result.update({
                'success': True,
                'quality_score': 60,  # 基础处理默认分数
                'generated_files': output_files,
                'html_content': html_content,
                'processing_mode': 'fallback'
            })
            
        except Exception as e:
            result['errors'].append(str(e))
            result['success'] = False
        
        result['processing_time'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def _basic_word_extraction(self, doc_path: Path) -> Dict:
        """基础Word内容提取"""
        try:
            import docx
            doc = docx.Document(doc_path)
            
            content = []
            for para in doc.paragraphs:
                if para.text.strip():
                    content.append(para.text.strip())
            
            return {
                'title': doc_path.stem,
                'content': content,
                'filename': doc_path.name,
                'date': datetime.now().strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            logger.error(f"基础Word提取失败: {e}")
            raise
    
    def _basic_html_generation(self, content: Dict) -> str:
        """基础HTML生成"""
        html_parts = []
        
        html_parts.append(f"<h1>{content['title']}</h1>")
        
        for para in content['content']:
            # 应用基础高亮
            highlighted_para = self._apply_basic_highlights(para)
            html_parts.append(f"<p>{highlighted_para}</p>")
        
        return '\n'.join(html_parts)
    
    def _apply_basic_highlights(self, text: str) -> str:
        """应用基础高亮（备用方案）"""
        # 🔧 v3.0 修复：包含小数点的正则表达式
        highlight_patterns = [
            (r'(\d+(?:\.\d+)?萬元)', 'highlight-amount'),
            (r'(\d+(?:\.\d+)?%)', 'highlight-percent'),
            (r'(\d{1,2}月\d{1,2}日)', 'highlight-date'),
            (r'(第\d+條)', 'highlight-law')
        ]
        
        result = text
        for pattern, css_class in highlight_patterns:
            result = re.sub(pattern, f'<span class="{css_class}">\\1</span>', result)
        
        return result
    
    def _calculate_highlight_coverage(self, html_content: str) -> float:
        """计算高亮覆盖率"""
        if not html_content:
            return 0
        
        # 统计总数字数量
        total_numbers = len(re.findall(r'\d+(?:\.\d+)?', html_content))
        
        # 统计高亮的数字数量
        highlighted_numbers = len(re.findall(r'<span[^>]*class="[^"]*(?:amount|percent|date)[^"]*"[^>]*>\d+(?:\.\d+)?', html_content))
        
        return highlighted_numbers / total_numbers if total_numbers > 0 else 0
    
    def _save_processed_content(self, doc_path: Path, enhanced_data: Dict, 
                              html_content: str, seo_data: Optional[Dict], 
                              doc_analysis: Optional[Any]) -> List[str]:
        """保存处理结果"""
        output_files = []
        
        try:
            # 生成输出文件名
            if seo_data and 'url_optimization' in seo_data:
                base_name = seo_data['url_optimization'].semantic_url
            else:
                base_name = enhanced_data.get('url', doc_path.stem)
            
            # 保存HTML文件
            output_dir = Path(self.config.get('output_dir', 'blog'))
            html_file = output_dir / f"{base_name}.html"
            html_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 生成完整HTML内容
            complete_html = self._generate_complete_html(
                enhanced_data, html_content, seo_data, doc_analysis
            )
            
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(complete_html)
            
            output_files.append(str(html_file))
            
            # 保存元数据
            assets_dir = Path(self.config.get('assets_dir', 'assets'))
            metadata_file = assets_dir / 'data' / f"{base_name}.json"
            metadata_file.parent.mkdir(parents=True, exist_ok=True)
            
            metadata = {
                'title': enhanced_data.get('title', ''),
                'summary': enhanced_data.get('summary', ''),
                'seo_data': self._serialize_seo_data(seo_data),
                'doc_analysis': self._serialize_doc_analysis(doc_analysis),
                'processing_version': self.version,
                'processed_at': datetime.now().isoformat(),
                'using_external_components': self.using_external_components
            }
            
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            output_files.append(str(metadata_file))
            
            return output_files
            
        except Exception as e:
            logger.error(f"保存文件时发生错误: {e}")
            raise
    
    def _save_basic_result(self, doc_path: Path, content: Dict, html_content: str) -> List[str]:
        """保存基础处理结果"""
        output_files = []
        
        output_dir = Path(self.config.get('output_dir', 'blog'))
        html_file = output_dir / f"{doc_path.stem}.html"
        html_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 基础HTML模板
        complete_html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{content['title']}</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; margin: 0; padding: 20px; }}
        .highlight-amount {{ background-color: #e8f5e8; color: #2e7d32; padding: 2px 4px; border-radius: 3px; }}
        .highlight-percent {{ background-color: #fff3e0; color: #ef6c00; padding: 2px 4px; border-radius: 3px; }}
        .highlight-date {{ background-color: #e3f2fd; color: #1565c0; padding: 2px 4px; border-radius: 3px; }}
        .highlight-law {{ background-color: #fce4ec; color: #c2185b; padding: 2px 4px; border-radius: 3px; }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>"""
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(complete_html)
        
        output_files.append(str(html_file))
        return output_files
    
    def _generate_complete_html(self, enhanced_data: Dict, html_content: str, 
                               seo_data: Optional[Dict], doc_analysis: Optional[Any]) -> str:
        """生成完整的HTML内容"""
        html_parts = ['<!DOCTYPE html>', '<html lang="zh-TW">', '<head>']
        html_parts.append('<meta charset="UTF-8">')
        html_parts.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
        
        # 添加SEO标签
        if seo_data and 'metadata' in seo_data and self.seo_optimizer:
            try:
                meta_tags = self.seo_optimizer.generate_html_meta_tags(seo_data['metadata'])
                html_parts.append(meta_tags)
            except Exception as e:
                logger.warning(f"生成META标签失败: {e}")
        
        # 添加结构化数据
        if seo_data and 'structured_data' in seo_data and self.seo_optimizer:
            try:
                json_ld = self.seo_optimizer.generate_json_ld(seo_data['structured_data'])
                html_parts.append(json_ld)
            except Exception as e:
                logger.warning(f"生成JSON-LD失败: {e}")
        
        # 添加CSS样式
        if hasattr(self.html_processor, 'generate_highlight_css'):
            css_styles = f"<style>\n{self.html_processor.generate_highlight_css()}\n</style>"
            html_parts.append(css_styles)
        else:
            # 基础CSS样式
            basic_css = """<style>
        body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .document-content { max-width: 800px; margin: 0 auto; }
        h1, h2, h3, h4 { color: #2c3e50; margin-top: 2em; margin-bottom: 1em; }
        p { margin-bottom: 1em; }
        .highlight-amount { background-color: #e8f5e8; color: #2e7d32; padding: 2px 4px; border-radius: 3px; }
        .highlight-percent { background-color: #fff3e0; color: #ef6c00; padding: 2px 4px; border-radius: 3px; }
        .highlight-date { background-color: #e3f2fd; color: #1565c0; padding: 2px 4px; border-radius: 3px; }
        </style>"""
            html_parts.append(basic_css)
        
        html_parts.append('</head>')
        html_parts.append('<body>')
        html_parts.append('<main class="document-content">')
        html_parts.append(html_content)
        html_parts.append('</main>')
        html_parts.append('</body>')
        html_parts.append('</html>')
        
        return '\n'.join(html_parts)
    
    def _serialize_seo_data(self, seo_data: Optional[Dict]) -> Optional[Dict]:
        """序列化SEO数据"""
        if not seo_data:
            return None
        
        try:
            # 将SEO数据转换为可序列化的格式
            serialized = {}
            
            # 处理metadata
            if 'metadata' in seo_data and hasattr(seo_data['metadata'], '__dict__'):
                metadata = seo_data['metadata']
                serialized['metadata'] = {
                    'title': getattr(metadata, 'title', ''),
                    'meta_description': getattr(metadata, 'meta_description', ''),
                    'keywords': getattr(metadata, 'keywords', []),
                    'canonical_url': getattr(metadata, 'canonical_url', ''),
                    'og_title': getattr(metadata, 'og_title', ''),
                    'og_description': getattr(metadata, 'og_description', '')
                }
            
            # 处理URL优化数据
            if 'url_optimization' in seo_data and hasattr(seo_data['url_optimization'], '__dict__'):
                url_opt = seo_data['url_optimization']
                serialized['url_optimization'] = {
                    'semantic_url': getattr(url_opt, 'semantic_url', ''),
                    'seo_score': getattr(url_opt, 'seo_score', 0),
                    'optimization_notes': getattr(url_opt, 'optimization_notes', [])
                }
            
            # 直接复制其他字段
            for key in ['seo_score', 'recommendations', 'content_optimization', 'optimization_timestamp']:
                if key in seo_data:
                    serialized[key] = seo_data[key]
            
            return serialized
            
        except Exception as e:
            logger.warning(f"序列化SEO数据失败: {e}")
            return {'error': str(e)}
    
    def _serialize_doc_analysis(self, doc_analysis: Optional[Any]) -> Optional[Dict]:
        """序列化文档分析结果"""
        if not doc_analysis:
            return None
        
        try:
            return {
                'document_type': doc_analysis.document_type.value if hasattr(doc_analysis, 'document_type') else 'unknown',
                'content_theme': doc_analysis.content_theme.value if hasattr(doc_analysis, 'content_theme') else 'unknown',
                'confidence_score': getattr(doc_analysis, 'confidence_score', 0),
                'keywords': getattr(doc_analysis, 'keywords', []),
                'seo_category': getattr(doc_analysis, 'seo_category', ''),
                'content_tags': getattr(doc_analysis, 'content_tags', [])
            }
        except Exception as e:
            logger.warning(f"序列化文档分析结果失败: {e}")
            return {'error': str(e)}
    
    def _serialize_doc_analysis(self, doc_analysis: Optional[Any]) -> Optional[Dict]:
        """序列化文档分析结果"""
        if not doc_analysis:
            return None
        
        try:
            return {
                'document_type': doc_analysis.document_type.value if hasattr(doc_analysis, 'document_type') else 'unknown',
                'content_theme': doc_analysis.content_theme.value if hasattr(doc_analysis, 'content_theme') else 'unknown',
                'confidence_score': getattr(doc_analysis, 'confidence_score', 0),
                'keywords': getattr(doc_analysis, 'keywords', []),
                'seo_category': getattr(doc_analysis, 'seo_category', ''),
                'content_tags': getattr(doc_analysis, 'content_tags', [])
            }
        except Exception as e:
            logger.warning(f"序列化文档分析结果失败: {e}")
            return {'error': str(e)}

    def _serialize_doc_analysis(self, doc_analysis: Optional[Any]) -> Optional[Dict]:
        """序列化文档分析结果"""
        if not doc_analysis:
            return None
        
        try:
            return {
                'document_type': doc_analysis.document_type.value if hasattr(doc_analysis, 'document_type') else 'unknown',
                'content_theme': doc_analysis.content_theme.value if hasattr(doc_analysis, 'content_theme') else 'unknown',
                'confidence_score': getattr(doc_analysis, 'confidence_score', 0),
                'keywords': getattr(doc_analysis, 'keywords', []),
                'seo_category': getattr(doc_analysis, 'seo_category', ''),
                'content_tags': getattr(doc_analysis, 'content_tags', [])
            }
        except Exception as e:
            logger.warning(f"序列化文档分析结果失败: {e}")
            return {'error': str(e)}

# 简化的接口函数

def process_documents_batch(doc_paths: List[str], config: Optional[Dict] = None) -> Dict:
    """
    批量处理文档 - 简化接口（与v2.0兼容）
    
    Args:
        doc_paths: 文档路径列表
        config: 可选配置
        
    Returns:
        Dict: 批量处理结果
    """
    processor = UnifiedDocumentProcessor(config)
    
    results = {
        'total_documents': len(doc_paths),
        'successful': 0,
        'failed': 0,
        'results': [],
        'overall_quality_score': 0,
        'processing_time': 0,
        'version': processor.version,
        'using_external_components': processor.using_external_components
    }
    
    start_time = datetime.now()
    total_quality_score = 0
    
    logger.info(f"🚀 开始批量处理 {len(doc_paths)} 个文档 (v{processor.version})")
    
    for i, doc_path in enumerate(doc_paths, 1):
        logger.info(f"📄 处理进度: {i}/{len(doc_paths)} - {Path(doc_path).name}")
        
        try:
            result = processor.process_document(doc_path)
            results['results'].append(result)
            
            if result['success']:
                results['successful'] += 1
                total_quality_score += result['quality_score']
                logger.success(f"✅ 处理成功: {Path(doc_path).name} (质量: {result['quality_score']:.1f}/100)")
            else:
                results['failed'] += 1
                logger.error(f"❌ 处理失败: {Path(doc_path).name}")
                
        except Exception as e:
            logger.error(f"❌ 处理文档时发生异常: {doc_path} - {e}")
            results['failed'] += 1
            results['results'].append({
                'success': False,
                'doc_path': doc_path,
                'errors': [str(e)]
            })
    
    # 计算总体指标
    if results['successful'] > 0:
        results['overall_quality_score'] = total_quality_score / results['successful']
    
    results['processing_time'] = (datetime.now() - start_time).total_seconds()
    
    # 生成处理摘要
    logger.info("=" * 60)
    logger.info(f"📊 批量处理完成 - 统一智能处理器 v{processor.version}")
    logger.info("=" * 60)
    logger.info(f"✅ 成功处理: {results['successful']} 个")
    logger.info(f"❌ 处理失败: {results['failed']} 个")
    logger.info(f"📈 总体质量评分: {results['overall_quality_score']:.1f}/100")
    logger.info(f"⏱️ 处理时间: {results['processing_time']:.1f} 秒")
    logger.info(f"🔧 使用外部组件: {'是' if processor.using_external_components else '否'}")
    
    return results

# 兼容性函数

def create_unified_processor(config: Optional[Dict] = None) -> UnifiedDocumentProcessor:
    """创建统一处理器实例"""
    return UnifiedDocumentProcessor(config)

def get_processor_version() -> str:
    """获取处理器版本"""
    return "3.0"

def validate_components() -> Dict[str, bool]:
    """验证组件可用性"""
    return {
        'external_components_available': EXTERNAL_COMPONENTS_AVAILABLE,
        'enhanced_word_processor': EXTERNAL_COMPONENTS_AVAILABLE,
        'comprehensive_html_processor': EXTERNAL_COMPONENTS_AVAILABLE,
        'document_classifier': EXTERNAL_COMPONENTS_AVAILABLE,
        'seo_optimizer': EXTERNAL_COMPONENTS_AVAILABLE,
        'quality_scorer': EXTERNAL_COMPONENTS_AVAILABLE,
        'config_manager': EXTERNAL_COMPONENTS_AVAILABLE
    }

# 主函数示例

def main():
    """主函数示例"""
    import argparse
    
    parser = argparse.ArgumentParser(description='统一智能文档处理器 v3.0 - 整合版')
    parser.add_argument('--word-dir', default='word-docs', help='Word文档目录')
    parser.add_argument('--output-dir', default='blog', help='输出目录')
    parser.add_argument('--mode', choices=['basic', 'standard', 'enhanced', 'premium'], 
                       default='enhanced', help='处理模式')
    parser.add_argument('--quality', choices=['basic', 'standard', 'premium'],
                       default='premium', help='质量要求')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    # 组件验证
    component_status = validate_components()
    logger.info(f"🔧 组件状态: {component_status}")
    
    # 配置
    config = {
        'word_dir': args.word_dir,
        'output_dir': args.output_dir,
        'processing_mode': args.mode,
        'quality_level': args.quality,
        'debug': args.debug
    }
    
    # 扫描文档
    doc_paths = list(Path(args.word_dir).glob('*.docx'))
    
    if not doc_paths:
        logger.info("没有找到需要处理的文档")
        return
    
    # 批量处理
    logger.info(f"开始处理 {len(doc_paths)} 个文档...")
    results = process_documents_batch([str(p) for p in doc_paths], config)
    
    # 输出最终结果
    success_rate = (results['successful'] / results['total_documents'] * 100) if results['total_documents'] > 0 else 0
    logger.info(f"🎉 处理完成！成功率: {success_rate:.1f}%")

if __name__ == "__main__":
    main()