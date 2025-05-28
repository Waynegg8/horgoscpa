#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
智能批量處理工具 v3.0
高效批量處理Word文檔，支持並行處理、錯誤恢復、進度追蹤
"""

import os
import json
import asyncio
import threading
from typing import Dict, List, Any, Optional, Callable, Tuple
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger

# 導入其他組件
try:
    from document_classifier import DocumentClassifier
    from seo_optimizer import SEOOptimizer  
    from quality_scorer import QualityScorer, QualityLevel
except ImportError as e:
    logger.warning(f"部分組件無法導入: {e}")

class ProcessingStatus(Enum):
    """處理狀態枚舉"""
    PENDING = "pending"          # 等待處理
    PROCESSING = "processing"    # 正在處理
    COMPLETED = "completed"      # 處理完成
    FAILED = "failed"           # 處理失敗
    SKIPPED = "skipped"         # 已跳過
    RETRYING = "retrying"       # 重試中

class ProcessingMode(Enum):
    """處理模式枚舉"""
    SEQUENTIAL = "sequential"    # 順序處理
    PARALLEL = "parallel"       # 並行處理
    ADAPTIVE = "adaptive"       # 自適應處理

@dataclass
class ProcessingTask:
    """處理任務數據類"""
    task_id: str
    doc_path: Path
    status: ProcessingStatus = ProcessingStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: float = 0.0
    
    # 處理結果
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    quality_score: float = 0.0
    
    # 重試信息
    retry_count: int = 0
    max_retries: int = 3
    
    # 依賴關係
    dependencies: List[str] = field(default_factory=list)
    dependents: List[str] = field(default_factory=list)

@dataclass
class BatchConfig:
    """批量處理配置"""
    max_workers: int = 4
    processing_mode: ProcessingMode = ProcessingMode.ADAPTIVE
    enable_retry: bool = True
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout: float = 300.0  # 5分鐘超時
    
    # 質量控制
    min_quality_score: float = 70.0
    fail_on_low_quality: bool = False
    
    # 輸出配置
    output_dir: Path = Path("blog")
    backup_dir: Path = Path("backup")
    
    # 處理選項
    force_reprocess: bool = False
    skip_validation: bool = False
    enable_seo_optimization: bool = True
    enable_classification: bool = True

@dataclass
class BatchResult:
    """批量處理結果"""
    total_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    skipped_tasks: int = 0
    
    total_processing_time: float = 0.0
    average_quality_score: float = 0.0
    
    task_results: List[ProcessingTask] = field(default_factory=list)
    error_summary: Dict[str, int] = field(default_factory=dict)
    
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

class ProgressTracker:
    """進度追蹤器"""
    
    def __init__(self, total_tasks: int):
        self.total_tasks = total_tasks
        self.completed_tasks = 0
        self.failed_tasks = 0
        self.start_time = datetime.now()
        self.callbacks: List[Callable] = []
    
    def add_callback(self, callback: Callable):
        """添加進度回調"""
        self.callbacks.append(callback)
    
    def update_progress(self, completed: int = 0, failed: int = 0):
        """更新進度"""
        self.completed_tasks += completed
        self.failed_tasks += failed
        
        # 調用回調
        for callback in self.callbacks:
            try:
                callback(self.get_progress_info())
            except Exception as e:
                logger.warning(f"進度回調執行失敗: {e}")
    
    def get_progress_info(self) -> Dict[str, Any]:
        """獲取進度信息"""
        processed = self.completed_tasks + self.failed_tasks
        progress_percent = (processed / self.total_tasks * 100) if self.total_tasks > 0 else 0
        
        elapsed_time = datetime.now() - self.start_time
        
        # 估算剩餘時間
        if processed > 0:
            avg_time_per_task = elapsed_time.total_seconds() / processed
            remaining_tasks = self.total_tasks - processed
            eta = timedelta(seconds=avg_time_per_task * remaining_tasks)
        else:
            eta = timedelta(0)
        
        return {
            'total_tasks': self.total_tasks,
            'completed': self.completed_tasks,
            'failed': self.failed_tasks,
            'processed': processed,
            'progress_percent': progress_percent,
            'elapsed_time': elapsed_time,
            'eta': eta,
            'success_rate': (self.completed_tasks / processed * 100) if processed > 0 else 0
        }

class BatchProcessor:
    """智能批量處理器"""
    
    def __init__(self, config: Optional[BatchConfig] = None):
        """
        初始化批量處理器
        
        Args:
            config: 批量處理配置
        """
        self.config = config or BatchConfig()
        
        # 初始化組件
        self.classifier = None
        self.seo_optimizer = None
        self.quality_scorer = None
        
        self._init_components()
        
        # 狀態管理
        self.tasks: Dict[str, ProcessingTask] = {}
        self.executor: Optional[ThreadPoolExecutor] = None
        self.is_processing = False
        
        # 狀態持久化
        self.state_file = Path("batch_processing_state.json")
        
        logger.info("✅ 批量處理器初始化完成")
    
    def _init_components(self):
        """初始化處理組件"""
        try:
            if self.config.enable_classification:
                self.classifier = DocumentClassifier()
                logger.info("✅ 文檔分類器已載入")
        except Exception as e:
            logger.warning(f"文檔分類器載入失敗: {e}")
        
        try:
            if self.config.enable_seo_optimization:
                self.seo_optimizer = SEOOptimizer()
                logger.info("✅ SEO優化器已載入")
        except Exception as e:
            logger.warning(f"SEO優化器載入失敗: {e}")
        
        try:
            self.quality_scorer = QualityScorer()
            logger.info("✅ 質量評分器已載入")
        except Exception as e:
            logger.warning(f"質量評分器載入失敗: {e}")
    
    def add_documents(self, doc_paths: List[Path]) -> List[str]:
        """
        添加文檔到處理隊列
        
        Args:
            doc_paths: 文檔路徑列表
            
        Returns:
            List[str]: 任務ID列表
        """
        task_ids = []
        
        for doc_path in doc_paths:
            if not doc_path.exists():
                logger.warning(f"文檔不存在: {doc_path}")
                continue
            
            # 檢查是否已存在
            existing_task = self._find_task_by_path(doc_path)
            if existing_task and not self.config.force_reprocess:
                if existing_task.status == ProcessingStatus.COMPLETED:
                    logger.info(f"文檔已處理，跳過: {doc_path}")
                    continue
            
            # 創建新任務
            task_id = self._generate_task_id(doc_path)
            task = ProcessingTask(
                task_id=task_id,
                doc_path=doc_path,
                max_retries=self.config.max_retries
            )
            
            self.tasks[task_id] = task
            task_ids.append(task_id)
            
            logger.debug(f"添加處理任務: {doc_path} -> {task_id}")
        
        logger.info(f"已添加 {len(task_ids)} 個處理任務")
        return task_ids
    
    def process_batch(self, progress_callback: Optional[Callable] = None) -> BatchResult:
        """
        執行批量處理
        
        Args:
            progress_callback: 進度回調函數
            
        Returns:
            BatchResult: 批量處理結果
        """
        if self.is_processing:
            raise RuntimeError("已有批量處理在執行中")
        
        self.is_processing = True
        logger.info(f"🚀 開始批量處理 {len(self.tasks)} 個文檔")
        
        try:
            # 初始化結果
            result = BatchResult(
                total_tasks=len(self.tasks)
            )
            
            # 初始化進度追蹤
            progress_tracker = ProgressTracker(len(self.tasks))
            if progress_callback:
                progress_tracker.add_callback(progress_callback)
            
            # 根據處理模式執行
            if self.config.processing_mode == ProcessingMode.SEQUENTIAL:
                result = self._process_sequential(result, progress_tracker)
            elif self.config.processing_mode == ProcessingMode.PARALLEL:
                result = self._process_parallel(result, progress_tracker)
            else:  # ADAPTIVE
                result = self._process_adaptive(result, progress_tracker)
            
            result.completed_at = datetime.now()
            result.total_processing_time = (result.completed_at - result.started_at).total_seconds()
            
            # 計算統計信息
            self._calculate_statistics(result)
            
            # 保存狀態
            self._save_state()
            
            logger.success(f"✅ 批量處理完成: {result.completed_tasks}/{result.total_tasks} 成功")
            return result
            
        except Exception as e:
            logger.error(f"❌ 批量處理失敗: {e}")
            raise
        finally:
            self.is_processing = False
    
    def _process_sequential(self, result: BatchResult, tracker: ProgressTracker) -> BatchResult:
        """順序處理"""
        logger.info("📋 使用順序處理模式")
        
        for task in self.tasks.values():
            if task.status == ProcessingStatus.COMPLETED and not self.config.force_reprocess:
                result.skipped_tasks += 1
                continue
            
            try:
                self._process_single_task(task)
                
                if task.status == ProcessingStatus.COMPLETED:
                    result.completed_tasks += 1
                    tracker.update_progress(completed=1)
                else:
                    result.failed_tasks += 1
                    tracker.update_progress(failed=1)
                    
            except Exception as e:
                logger.error(f"處理任務失敗: {task.doc_path} - {e}")
                task.status = ProcessingStatus.FAILED
                task.error = str(e)
                result.failed_tasks += 1
                tracker.update_progress(failed=1)
            
            result.task_results.append(task)
        
        return result
    
    def _process_parallel(self, result: BatchResult, tracker: ProgressTracker) -> BatchResult:
        """並行處理"""
        logger.info(f"🔄 使用並行處理模式 (工作線程: {self.config.max_workers})")
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # 提交所有任務
            future_to_task = {}
            
            for task in self.tasks.values():
                if task.status == ProcessingStatus.COMPLETED and not self.config.force_reprocess:
                    result.skipped_tasks += 1
                    continue
                
                future = executor.submit(self._process_single_task, task)
                future_to_task[future] = task
            
            # 處理完成的任務
            for future in as_completed(future_to_task, timeout=self.config.timeout):
                task = future_to_task[future]
                
                try:
                    future.result()  # 獲取結果，如果有異常會拋出
                    
                    if task.status == ProcessingStatus.COMPLETED:
                        result.completed_tasks += 1
                        tracker.update_progress(completed=1)
                    else:
                        result.failed_tasks += 1
                        tracker.update_progress(failed=1)
                        
                except Exception as e:
                    logger.error(f"並行處理任務失敗: {task.doc_path} - {e}")
                    task.status = ProcessingStatus.FAILED
                    task.error = str(e)
                    result.failed_tasks += 1
                    tracker.update_progress(failed=1)
                
                result.task_results.append(task)
        
        return result
    
    def _process_adaptive(self, result: BatchResult, tracker: ProgressTracker) -> BatchResult:
        """自適應處理"""
        logger.info("🧠 使用自適應處理模式")
        
        # 根據任務數量和系統資源決定處理方式
        total_tasks = len([t for t in self.tasks.values() 
                          if t.status != ProcessingStatus.COMPLETED or self.config.force_reprocess])
        
        if total_tasks <= 2:
            # 少量任務用順序處理
            return self._process_sequential(result, tracker)
        else:
            # 較多任務用並行處理，但動態調整工作線程數
            import psutil
            cpu_count = psutil.cpu_count()
            optimal_workers = min(self.config.max_workers, max(2, cpu_count - 1))
            
            original_workers = self.config.max_workers
            self.config.max_workers = optimal_workers
            
            logger.info(f"自適應調整工作線程數: {original_workers} -> {optimal_workers}")
            
            try:
                return self._process_parallel(result, tracker)
            finally:
                self.config.max_workers = original_workers
    
    def _process_single_task(self, task: ProcessingTask) -> None:
        """
        處理單個任務
        
        Args:
            task: 處理任務
        """
        task.status = ProcessingStatus.PROCESSING
        task.started_at = datetime.now()
        
        logger.info(f"🔄 開始處理: {task.doc_path}")
        
        try:
            # 1. 載入並處理文檔
            doc_result = self._process_document(task.doc_path)
            
            # 2. 文檔分類
            classification_result = None
            if self.classifier:
                try:
                    classification_result = self.classifier.classify_document(doc_result)
                    logger.debug(f"文檔分類完成: {classification_result.document_type.value}")
                except Exception as e:
                    logger.warning(f"文檔分類失敗: {e}")
            
            # 3. SEO優化
            seo_result = None
            if self.seo_optimizer:
                try:
                    seo_result = self.seo_optimizer.optimize_document_seo(doc_result, classification_result)
                    logger.debug(f"SEO優化完成: {seo_result['seo_score']:.1f}/100")
                except Exception as e:
                    logger.warning(f"SEO優化失敗: {e}")
            
            # 4. 質量評估
            quality_result = None
            if self.quality_scorer and not self.config.skip_validation:
                try:
                    processed_html = doc_result.get('processed_html', '')
                    quality_result = self.quality_scorer.evaluate_document_quality(
                        doc_result, processed_html, seo_result, classification_result
                    )
                    task.quality_score = quality_result.overall_score
                    logger.debug(f"質量評估完成: {quality_result.overall_score:.1f}/100")
                except Exception as e:
                    logger.warning(f"質量評估失敗: {e}")
            
            # 5. 質量檢查
            if (quality_result and 
                task.quality_score < self.config.min_quality_score and 
                self.config.fail_on_low_quality):
                raise ValueError(f"質量分數過低: {task.quality_score:.1f} < {self.config.min_quality_score}")
            
            # 6. 保存結果
            output_result = self._save_processing_result(
                task, doc_result, classification_result, seo_result, quality_result
            )
            
            task.result = output_result
            task.status = ProcessingStatus.COMPLETED
            task.completed_at = datetime.now()
            task.processing_time = (task.completed_at - task.started_at).total_seconds()
            
            logger.success(f"✅ 處理完成: {task.doc_path} (質量: {task.quality_score:.1f}/100)")
            
        except Exception as e:
            task.status = ProcessingStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.now()
            task.processing_time = (task.completed_at - task.started_at).total_seconds()
            
            logger.error(f"❌ 處理失敗: {task.doc_path} - {e}")
            
            # 重試邏輯
            if self.config.enable_retry and task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = ProcessingStatus.RETRYING
                
                logger.info(f"🔄 準備重試 ({task.retry_count}/{task.max_retries}): {task.doc_path}")
                
                # 延遲重試
                import time
                time.sleep(self.config.retry_delay * task.retry_count)
                
                # 遞歸重試
                return self._process_single_task(task)
            
            raise
    
    def _process_document(self, doc_path: Path) -> Dict[str, Any]:
        """
        處理單個文檔
        
        Args:
            doc_path: 文檔路徑
            
        Returns:
            Dict: 處理結果
        """
        # 這裡需要導入並使用原有的文檔處理邏輯
        try:
            # 嘗試使用增強處理器
            from word_processor import IntegratedWordProcessor
            
            processor = IntegratedWordProcessor()
            result = processor.extract_content(doc_path)
            
            return result
            
        except ImportError:
            logger.warning("增強處理器不可用，使用基礎處理邏輯")
            
            # 基礎處理邏輯
            return {
                'title': doc_path.stem,
                'content': [f"基礎處理結果: {doc_path}"],
                'filename': doc_path.name,
                'date': datetime.now().strftime('%Y-%m-%d'),
                'processed_html': f"<h1>{doc_path.stem}</h1><p>基礎處理內容</p>"
            }
    
    def _save_processing_result(self, 
                               task: ProcessingTask,
                               doc_result: Dict[str, Any],
                               classification_result: Any,
                               seo_result: Optional[Dict],
                               quality_result: Any) -> Dict[str, Any]:
        """
        保存處理結果
        
        Args:
            task: 處理任務
            doc_result: 文檔處理結果
            classification_result: 分類結果
            seo_result: SEO優化結果
            quality_result: 質量評估結果
            
        Returns:
            Dict: 保存結果信息
        """
        # 確保輸出目錄存在
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成輸出文件名
        if seo_result and 'url_optimization' in seo_result:
            filename = f"{seo_result['url_optimization'].semantic_url}.html"
        else:
            base_name = task.doc_path.stem
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{base_name}_{timestamp}.html"
        
        output_path = self.config.output_dir / filename
        
        # 生成完整HTML內容
        html_content = self._generate_complete_html(
            doc_result, classification_result, seo_result, quality_result
        )
        
        # 保存HTML文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # 備份原始文檔
        if self.config.backup_dir:
            self._backup_original_document(task.doc_path)
        
        return {
            'output_path': str(output_path),
            'html_length': len(html_content),
            'seo_optimized': bool(seo_result),
            'classified': bool(classification_result),
            'quality_checked': bool(quality_result)
        }
    
    def _generate_complete_html(self,
                               doc_result: Dict[str, Any],
                               classification_result: Any,
                               seo_result: Optional[Dict],
                               quality_result: Any) -> str:
        """生成完整的HTML內容"""
        
        # HTML頭部
        html_parts = ['<!DOCTYPE html>', '<html lang="zh-TW">', '<head>']
        html_parts.append('<meta charset="UTF-8">')
        html_parts.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
        
        # SEO標籤
        if seo_result and 'metadata' in seo_result:
            try:
                meta_tags = self.seo_optimizer.generate_html_meta_tags(seo_result['metadata'])
                html_parts.append(meta_tags)
            except Exception as e:
                logger.warning(f"生成META標籤失敗: {e}")
        
        # 結構化數據
        if seo_result and 'structured_data' in seo_result:
            try:
                json_ld = self.seo_optimizer.generate_json_ld(seo_result['structured_data'])
                html_parts.append(json_ld)
            except Exception as e:
                logger.warning(f"生成JSON-LD失敗: {e}")
        
        # CSS樣式
        html_parts.append(self._generate_css_styles(classification_result))
        
        html_parts.append('</head>')
        html_parts.append('<body>')
        
        # 主要內容
        processed_html = doc_result.get('processed_html', '')
        if processed_html:
            html_parts.append('<main class="document-content">')
            html_parts.append(processed_html)
            html_parts.append('</main>')
        
        # 質量信息（調試模式）
        if quality_result and logger.level.name == 'DEBUG':
            html_parts.append(self._generate_quality_info_html(quality_result))
        
        html_parts.extend(['</body>', '</html>'])
        
        return '\n'.join(html_parts)
    
    def _generate_css_styles(self, classification_result: Any) -> str:
        """生成CSS樣式"""
        base_styles = """
    <style>
        body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .document-content { max-width: 800px; margin: 0 auto; }
        h1, h2, h3, h4 { color: #2c3e50; margin-top: 2em; margin-bottom: 1em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        
        /* v3.0 高亮樣式 - 修復優先級問題 */
        .date-highlight { background-color: #e3f2fd; color: #1565c0; padding: 2px 4px; border-radius: 3px; }
        .amount-highlight { background-color: #e8f5e8; color: #2e7d32; padding: 2px 4px; border-radius: 3px; font-weight: bold; }
        .percent-highlight { background-color: #fff3e0; color: #ef6c00; padding: 2px 4px; border-radius: 3px; }
        .law-highlight { background-color: #fce4ec; color: #c2185b; padding: 2px 4px; border-radius: 3px; }
        
        /* 稅務期程特殊樣式 */
        .tax-schedule-list { background-color: #f8f9fa; padding: 1em; border-radius: 8px; }
        .tax-schedule-list li { margin-bottom: 0.5em; }
        
        /* 重要提示樣式 */
        .important-note { background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 1em; margin: 1em 0; }
        
        /* 質量信息樣式 */
        .quality-info { background-color: #f5f5f5; border: 1px solid #ddd; padding: 1em; margin-top: 2em; font-size: 0.9em; }
    </style>
        """
        
        # 根據分類結果添加特定樣式
        if classification_result:
            doc_type = getattr(classification_result, 'document_type', None)
            if doc_type and hasattr(doc_type, 'value'):
                if doc_type.value == 'tax_calendar':
                    base_styles += """
        .tax-calendar-item { border-left: 3px solid #2196f3; padding-left: 1em; margin-bottom: 1em; }
                    """
        
        return base_styles
    
    def _generate_quality_info_html(self, quality_result: Any) -> str:
        """生成質量信息HTML（調試用）"""
        if not quality_result:
            return ""
        
        html = ['<div class="quality-info">']
        html.append('<h4>📊 質量評估信息</h4>')
        html.append(f'<p><strong>總體評分:</strong> {quality_result.overall_score:.1f}/100 ({quality_result.quality_level.value})</p>')
        html.append(f'<p><strong>處理時間:</strong> {quality_result.processing_time:.2f} 秒</p>')
        
        if quality_result.priority_improvements:
            html.append('<p><strong>優先改進:</strong></p>')
            html.append('<ul>')
            for improvement in quality_result.priority_improvements:
                html.append(f'<li>{improvement}</li>')
            html.append('</ul>')
        
        html.append('</div>')
        
        return '\n'.join(html)
    
    def _backup_original_document(self, doc_path: Path) -> None:
        """備份原始文檔"""
        if not self.config.backup_dir:
            return
        
        try:
            self.config.backup_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"{doc_path.stem}_{timestamp}{doc_path.suffix}"
            backup_path = self.config.backup_dir / backup_name
            
            import shutil
            shutil.copy2(doc_path, backup_path)
            
            logger.debug(f"原始文檔已備份: {backup_path}")
            
        except Exception as e:
            logger.warning(f"備份原始文檔失敗: {e}")
    
    def _calculate_statistics(self, result: BatchResult) -> None:
        """計算統計信息"""
        if not result.task_results:
            return
        
        # 計算平均質量分數
        quality_scores = [task.quality_score for task in result.task_results if task.quality_score > 0]
        if quality_scores:
            result.average_quality_score = sum(quality_scores) / len(quality_scores)
        
        # 錯誤統計
        error_counts = {}
        for task in result.task_results:
            if task.error:
                error_type = type(task.error).__name__ if hasattr(task.error, '__class__') else 'Unknown'
                error_counts[error_type] = error_counts.get(error_type, 0) + 1
        
        result.error_summary = error_counts
    
    def _find_task_by_path(self, doc_path: Path) -> Optional[ProcessingTask]:
        """根據路徑查找任務"""
        for task in self.tasks.values():
            if task.doc_path == doc_path:
                return task
        return None
    
    def _generate_task_id(self, doc_path: Path) -> str:
        """生成任務ID"""
        import hashlib
        
        path_str = str(doc_path.resolve())
        timestamp = datetime.now().isoformat()
        
        hash_input = f"{path_str}_{timestamp}".encode('utf-8')
        return hashlib.md5(hash_input).hexdigest()[:12]
    
    def _save_state(self) -> None:
        """保存處理狀態"""
        try:
            state_data = {
                'timestamp': datetime.now().isoformat(),
                'config': {
                    'max_workers': self.config.max_workers,
                    'processing_mode': self.config.processing_mode.value,
                    'min_quality_score': self.config.min_quality_score
                },
                'tasks': {
                    task_id: {
                        'doc_path': str(task.doc_path),
                        'status': task.status.value,
                        'quality_score': task.quality_score,
                        'processing_time': task.processing_time,
                        'retry_count': task.retry_count,
                        'error': task.error,
                        'completed_at': task.completed_at.isoformat() if task.completed_at else None
                    }
                    for task_id, task in self.tasks.items()
                }
            }
            
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state_data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.warning(f"保存狀態失敗: {e}")
    
    def load_state(self) -> bool:
        """載入處理狀態"""
        try:
            if not self.state_file.exists():
                return False
            
            with open(self.state_file, 'r', encoding='utf-8') as f:
                state_data = json.load(f)
            
            # 重建任務
            for task_id, task_data in state_data.get('tasks', {}).items():
                task = ProcessingTask(
                    task_id=task_id,
                    doc_path=Path(task_data['doc_path']),
                    status=ProcessingStatus(task_data['status']),
                    quality_score=task_data['quality_score'],
                    processing_time=task_data['processing_time'],
                    retry_count=task_data['retry_count'],
                    error=task_data['error']
                )
                
                if task_data['completed_at']:
                    task.completed_at = datetime.fromisoformat(task_data['completed_at'])
                
                self.tasks[task_id] = task
            
            logger.info(f"已載入 {len(self.tasks)} 個任務狀態")
            return True
            
        except Exception as e:
            logger.warning(f"載入狀態失敗: {e}")
            return False
    
    def get_processing_summary(self) -> Dict[str, Any]:
        """獲取處理摘要"""
        total_tasks = len(self.tasks)
        if total_tasks == 0:
            return {'total_tasks': 0}
        
        status_counts = {}
        quality_scores = []
        processing_times = []
        
        for task in self.tasks.values():
            status = task.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
            
            if task.quality_score > 0:
                quality_scores.append(task.quality_score)
            
            if task.processing_time > 0:
                processing_times.append(task.processing_time)
        
        summary = {
            'total_tasks': total_tasks,
            'status_distribution': status_counts,
            'average_quality_score': sum(quality_scores) / len(quality_scores) if quality_scores else 0,
            'average_processing_time': sum(processing_times) / len(processing_times) if processing_times else 0,
            'success_rate': status_counts.get('completed', 0) / total_tasks * 100,
        }
        
        return summary

def create_progress_callback():
    """創建進度回調函數示例"""
    def progress_callback(progress_info: Dict[str, Any]):
        print(f"\r🔄 進度: {progress_info['progress_percent']:.1f}% "
              f"({progress_info['completed']}/{progress_info['total_tasks']}) "
              f"成功率: {progress_info['success_rate']:.1f}% "
              f"預計剩餘: {progress_info['eta']}", end='', flush=True)
    
    return progress_callback

def test_batch_processor():
    """測試批量處理器"""
    # 配置
    config = BatchConfig(
        max_workers=2,
        processing_mode=ProcessingMode.PARALLEL,
        min_quality_score=60.0,
        output_dir=Path("test_output"),
        backup_dir=Path("test_backup")
    )
    
    # 初始化處理器
    processor = BatchProcessor(config)
    
    # 模擬文檔路徑
    test_docs = [
        Path("word-docs/test1.docx"),
        Path("word-docs/test2.docx")
    ]
    
    # 創建測試文件（如果不存在）
    for doc_path in test_docs:
        doc_path.parent.mkdir(parents=True, exist_ok=True)
        if not doc_path.exists():
            doc_path.write_text("測試文檔內容")
    
    try:
        # 添加文檔
        task_ids = processor.add_documents(test_docs)
        print(f"📝 已添加 {len(task_ids)} 個任務")
        
        # 執行批量處理
        progress_callback = create_progress_callback()
        result = processor.process_batch(progress_callback)
        
        print(f"\n✅ 批量處理完成!")
        print(f"  總任務: {result.total_tasks}")
        print(f"  成功: {result.completed_tasks}")
        print(f"  失敗: {result.failed_tasks}")
        print(f"  平均質量: {result.average_quality_score:.1f}/100")
        print(f"  總時間: {result.total_processing_time:.2f} 秒")
        
        # 顯示摘要
        summary = processor.get_processing_summary()
        print(f"\n📊 處理摘要: {summary}")
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")

if __name__ == "__main__":
    test_batch_processor()