#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Word 文檔到部落格 HTML 自動轉換系統
主程序入口

此程式作為系統的主要入口點，負責協調整個文檔處理與轉換流程。
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from pathlib import Path

# 添加腳本目錄到系統路徑
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(script_dir, 'scripts'))

# 導入其他模組
from word_processor import WordProcessor
from html_generator import HtmlGenerator
from content_manager import ContentManager
from json_generator import JsonGenerator
from error_handler import ErrorHandler
from utils import setup_logging, ensure_directories
from translator import get_translator  # 引入翻譯器

def parse_arguments():
    """解析命令行參數"""
    parser = argparse.ArgumentParser(description='Word 文檔到部落格 HTML 自動轉換系統')
    
    parser.add_argument('--word-dir', type=str, default='word-docs',
                        help='Word 文檔目錄 (預設: word-docs)')
    
    parser.add_argument('--output-dir', type=str, default='blog',
                        help='輸出 HTML 目錄 (預設: blog)')
    
    parser.add_argument('--assets-dir', type=str, default='assets',
                        help='資源目錄 (預設: assets)')
    
    parser.add_argument('--all', action='store_true',
                        help='處理所有文件，忽略日期限制')
    
    parser.add_argument('--date', type=str,
                        help='指定處理特定日期的文件 (格式: YYYY-MM-DD)')
    
    parser.add_argument('--debug', action='store_true',
                        help='啟用除錯模式')
    
    parser.add_argument('--force', action='store_true',
                        help='強制重新處理已處理過的文件')
    
    parser.add_argument('--api-key', type=str,
                        help='DeepL API 密鑰 (如不指定則使用環境變數 DEEPL_API_KEY)')
    
    parser.add_argument('--skip-translation', action='store_true',
                        help='跳過翻譯步驟，僅使用現有翻譯字典')
    
    parser.add_argument('--export-dict', type=str,
                        help='導出翻譯字典到指定文件')
    
    parser.add_argument('--import-dict', type=str,
                        help='從指定文件導入翻譯字典')
    
    return parser.parse_args()

def process_document(doc_path, word_processor, html_generator, content_manager, json_generator, error_handler):
    """
    處理單個 Word 文檔
    
    Args:
        doc_path: Word 文檔路徑
        word_processor: Word 處理器
        html_generator: HTML 生成器
        content_manager: 內容管理器
        json_generator: JSON 生成器
        error_handler: 錯誤處理器
        
    Returns:
        bool: 是否處理成功
    """
    try:
        # 提取文檔內容
        doc_info = word_processor.extract_content(doc_path)
        
        # 檢查文檔日期
        doc_date = datetime.strptime(doc_info["date"], "%Y-%m-%d").date()
        current_date = datetime.now().date()
        
        # 如果文檔日期晚於當前日期，不處理但記錄日誌
        if doc_date > current_date:
            logger.info(f"文檔 {doc_path} 的日期 {doc_info['date']} 晚於當前日期，跳過處理")
            return False
        
        # 生成 SEO URL
        doc_info["url"] = word_processor.generate_seo_url(doc_info)
        
        # 處理文章內容，生成分類和標籤
        doc_info, category, tags = content_manager.process_article(doc_info)
        
        # 生成 META 關鍵詞
        doc_info["keywords"] = word_processor.generate_meta_keywords(doc_info, category, tags)
        
        # 生成 HTML
        html_content, output_file = html_generator.generate_html(doc_info, category, tags)
        
        # 清理 HTML 內容（可選）
        cleaned_html = html_generator.clean_html(html_content)
        
        # 更新文章 JSON 資料
        json_generator.update_blog_post(doc_info)
        
        # 只有成功生成HTML後才移動文件
        processed_path = word_processor.move_processed_file(doc_path)
        
        logger.info(f"成功處理文檔: {doc_path}")
        logger.info(f"生成 HTML 文件: {output_file}")
        
        # 顯示翻譯統計信息
        translation_stats = word_processor.get_translation_stats()
        logger.info(f"翻譯統計: 總共 {translation_stats['total_translations']} 次翻譯，字典中有 {translation_stats['dictionary_size']} 個詞條")
        
        return True
    
    except Exception as e:
        error_handler.handle_error(e, doc_path, {"step": "process_document"})
        logger.error(f"處理文檔 {doc_path} 失敗: {e}")
        return False

def main():
    """主程序入口"""
    # 解析命令行參數
    args = parse_arguments()
    
    # 設置日誌系統
    global logger
    log_level = logging.DEBUG if args.debug else logging.INFO
    logger = setup_logging(log_level)
    
    # 確保目錄存在
    project_dirs = {
        'word_docs': args.word_dir,
        'word_docs_processed': os.path.join(args.word_dir, 'processed'),
        'blog': args.output_dir,
        'assets_data': os.path.join(args.assets_dir, 'data'),
        'assets_images': os.path.join(args.assets_dir, 'images', 'blog')
    }
    ensure_directories(project_dirs)
    
    # 設定當前日期
    current_date = datetime.now().date()
    process_date = None
    
    if args.date:
        try:
            process_date = datetime.strptime(args.date, '%Y-%m-%d').date()
        except ValueError:
            logger.error(f"無效的日期格式: {args.date}，請使用 YYYY-MM-DD 格式")
            return 1
    
    try:
        # 處理翻譯字典導入/導出
        translation_dict_file = os.path.join(args.assets_dir, 'data', 'translation_dict.json')
        
        # 初始化翻譯器
        translator = get_translator(translation_dict_file, args.api_key)
        
        # 導出翻譯字典
        if args.export_dict:
            logger.info(f"正在導出翻譯字典到: {args.export_dict}")
            export_path = translator.export_dictionary(args.export_dict)
            if export_path:
                logger.info(f"翻譯字典導出成功: {export_path}")
                return 0
            else:
                logger.error("翻譯字典導出失敗")
                return 1
        
        # 導入翻譯字典
        if args.import_dict:
            logger.info(f"正在從 {args.import_dict} 導入翻譯字典")
            if translator.import_dictionary(args.import_dict):
                logger.info("翻譯字典導入成功")
                return 0
            else:
                logger.error("翻譯字典導入失敗")
                return 1
        
        # 顯示翻譯統計信息
        translation_stats = translator.get_stats()
        logger.info(f"翻譯統計: 字典中有 {translation_stats['dictionary_size']} 個詞條")
        
        # 初始化錯誤處理器
        error_handler = ErrorHandler()
        
        # 初始化 Word 處理器
        word_processor = WordProcessor(
            word_dir=args.word_dir,
            processed_dir=project_dirs['word_docs_processed'],
            translation_dict_file=translation_dict_file,
            api_key=args.api_key
        )
        
        # 初始化 HTML 生成器
        html_generator = HtmlGenerator(
            output_dir=args.output_dir,
            assets_dir=args.assets_dir
        )
        
        # 初始化內容管理器
        content_manager = ContentManager(
            data_dir=project_dirs['assets_data']
        )
        
        # 初始化 JSON 生成器
        json_generator = JsonGenerator(
            data_dir=project_dirs['assets_data']
        )
        
        # 掃描並處理 Word 文檔
        logger.info("開始掃描 Word 文檔...")
        documents = word_processor.scan_documents(
            process_all=args.all,
            process_date=process_date,
            current_date=current_date
        )
        
        if not documents:
            logger.info("沒有找到需要處理的文檔")
            
            # 即使沒有新文檔，仍然更新 JSON 索引
            logger.info("更新 JSON 索引資料...")
            json_generator.generate_all_json(current_date)
            
            return 0
        
        logger.info(f"找到 {len(documents)} 個文檔需要處理")
        
        # 處理每個文檔
        success_count = 0
        for doc_path in documents:
            logger.info(f"處理文檔: {doc_path}")
            
            # 檢查是否可以重試處理
            if not args.force and not error_handler.can_retry(doc_path):
                logger.warning(f"文檔 {doc_path} 已達到最大重試次數，跳過處理")
                continue
            
            # 處理文檔
            if process_document(doc_path, word_processor, html_generator, content_manager, json_generator, error_handler):
                success_count += 1
                # 標記錯誤為已解決
                error_handler.mark_as_resolved(doc_path)
        
        # 更新 JSON 索引
        logger.info("更新 JSON 索引資料...")
        json_generator.generate_all_json(current_date)
        
        # 顯示處理結果
        logger.info(f"處理完成: 總共 {len(documents)} 個文檔，成功 {success_count} 個")
        
        # 檢查是否有未解決的錯誤
        unresolved_errors = error_handler.get_unresolved_errors()
        if unresolved_errors:
            logger.warning(f"存在 {len(unresolved_errors)} 個未解決的錯誤")
        
        # 顯示最終翻譯統計信息
        final_stats = translator.get_stats()
        logger.info(f"翻譯統計: 總共 {final_stats['total_translations']} 次翻譯，緩存命中 {final_stats['cache_hits']} 次")
        logger.info(f"字典大小: {final_stats['dictionary_size']} 個詞條，最後更新: {final_stats['last_updated']}")
        
        return 0
        
    except Exception as e:
        logger.exception(f"程序執行過程中發生錯誤: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())