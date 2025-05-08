#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
錯誤處理與恢復機制
提供完善的錯誤處理、記錄和恢復機制
"""

import os
import json
import traceback
from datetime import datetime
from pathlib import Path
from loguru import logger

class ErrorHandler:
    """錯誤處理與恢復機制"""
    
    def __init__(self, error_log_file=None):
        """
        初始化錯誤處理器
        
        Args:
            error_log_file: 錯誤日誌文件路徑，默認為 'assets/data/error_log.json'
        """
        self.error_log_file = error_log_file or Path('assets/data/error_log.json')
        
        # 確保錯誤日誌文件目錄存在
        self.error_log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 載入錯誤日誌
        self.error_log = self._load_error_log()
    
    def _load_error_log(self):
        """
        載入錯誤日誌
        
        Returns:
            dict: 錯誤日誌內容
        """
        if not self.error_log_file.exists():
            return {'errors': []}
        
        try:
            with open(self.error_log_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"載入錯誤日誌失敗: {e}")
            return {'errors': []}
    
    def _save_error_log(self):
        """保存錯誤日誌"""
        try:
            with open(self.error_log_file, 'w', encoding='utf-8') as f:
                json.dump(self.error_log, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存錯誤日誌失敗: {e}")
    
    def handle_error(self, error, file_path=None, context=None):
        """
        處理錯誤
        
        Args:
            error: 錯誤物件
            file_path: 錯誤相關的文件路徑
            context: 錯誤發生的上下文信息
        """
        error_info = {
            'timestamp': datetime.now().isoformat(),
            'file': str(file_path) if file_path else None,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc(),
            'context': context
        }
        
        # 記錄錯誤到日誌
        logger.error(f"處理錯誤: {error_info['error_type']} - {error_info['error_message']}")
        if file_path:
            logger.error(f"錯誤相關文件: {file_path}")
        
        # 添加到錯誤日誌
        self.error_log['errors'].append(error_info)
        self._save_error_log()
    
    def can_retry(self, file_path, max_retries=3):
        """
        檢查文件是否可以重試處理
        
        Args:
            file_path: 文件路徑
            max_retries: 最大重試次數
            
        Returns:
            bool: 是否可以重試
        """
        retry_count = 0
        str_file_path = str(file_path)
        
        for error in self.error_log['errors']:
            if error['file'] == str_file_path:
                retry_count += 1
        
        return retry_count < max_retries
    
    def mark_as_resolved(self, file_path):
        """
        標記文件的錯誤為已解決
        
        Args:
            file_path: 文件路徑
        """
        str_file_path = str(file_path)
        
        # 過濾出不相關的錯誤
        self.error_log['errors'] = [
            error for error in self.error_log['errors']
            if error['file'] != str_file_path
        ]
        
        self._save_error_log()
    
    def get_unresolved_errors(self):
        """
        獲取未解決的錯誤
        
        Returns:
            list: 未解決的錯誤列表
        """
        return self.error_log['errors']