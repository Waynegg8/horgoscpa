#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主程序模組
負責協調Word文檔處理、HTML生成、分類處理等流程
"""

import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# 添加 scripts 目錄到 Python 模組搜尋路徑
scripts_dir = os.path.join(os.path.dirname(__file__), 'scripts')
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from loguru import logger

from word_processor import WordProcessor
from html_generator import HtmlGenerator  # 正確導入
from content_manager import ContentManager  # 導入內容管理器
from utils import setup_logging, ensure_directories


def parse_args():
    """
    解析命令行參數
    
    Returns:
        argparse.Namespace: 解析後的參數
    """
    parser = argparse.ArgumentParser(description='Word文檔處理與HTML生成工具')
    
    parser.add_argument('--word-dir', type=str, default='word-docs',
                        help='Word文檔目錄 (默認: word-docs)')
    
    parser.add_argument('--output-dir', type=str, default='blog',
                        help='HTML輸出目錄 (默認: blog)')
    
    parser.add_argument('--assets-dir', type=str, default='assets',
                        help='資源文件目錄 (默認: assets)')
    
    parser.add_argument('--process-all', action='store_true', default=True,
                        help='處理所有文件，忽略日期限制 (默認: 啟用)')
    
    parser.add_argument('--only-before-today', action='store_true',
                        help='僅處理當天日期之前的文件')
    
    parser.add_argument('--process-date', type=str,
                        help='處理特定日期的文件，格式: YYYY-MM-DD')
    
    parser.add_argument('--debug', action='store_true',
                        help='啟用調試模式')
    
    parser.add_argument('--skip-translation', action='store_true',
                        help='跳過翻譯步驟')
    
    parser.add_argument('--force', action='store_true',
                        help='強制重新處理已處理的文件')
    
    return parser.parse_args()


def process_word_documents(args):
    """
    處理Word文檔
    
    Args:
        args: 命令行參數
        
    Returns:
        tuple: (成功處理的文檔數, 失敗的文檔數)
    """
    # 確保目錄結構存在
    ensure_directories({
        'output': args.output_dir,
        'assets': args.assets_dir,
        'data': f"{args.assets_dir}/data",
        'images': f"{args.assets_dir}/images/blog"
    })
    
    # 初始化Word處理器
    word_processor = WordProcessor(
        word_dir=args.word_dir,
        translation_dict_file=f"{args.assets_dir}/data/translation_dict.json"
    )
    
    # 初始化內容管理器
    content_manager = ContentManager(
        data_dir=f"{args.assets_dir}/data"
    )
    
    # 初始化HTML生成器 - 使用正確的類
    html_generator = HtmlGenerator(
        output_dir=args.output_dir,
        assets_dir=args.assets_dir
    )
    
    # 設置處理日期
    process_date = None
    if args.process_date:
        try:
            process_date = datetime.strptime(args.process_date, "%Y-%m-%d").date()
            logger.info(f"處理特定日期的文件: {process_date}")
        except ValueError:
            logger.error(f"無效的日期格式: {args.process_date}, 應為YYYY-MM-DD")
            return 0, 0
    
    # 如果指定只處理當天之前的文件，禁用處理所有文件的選項
    if args.only_before_today:
        args.process_all = False
        logger.info("已啟用僅處理當天日期之前的文件模式")
    
    # 掃描Word文檔目錄
    documents = word_processor.scan_documents(
        process_all=args.process_all,
        process_date=process_date
    )
    
    if not documents:
        logger.info("沒有找到需要處理的Word文檔")
        return 0, 0
    
    logger.info(f"開始處理{len(documents)}個Word文檔")
    
    # 統計處理結果
    success_count = 0
    fail_count = 0
    
    # 處理每個文檔
    for doc_path in documents:
        logger.info(f"處理文檔: {doc_path}")
        
        try:
            # 步驟1: 準備文檔 - 提取內容和生成SEO URL
            doc_info = word_processor.prepare_document(doc_path)
            
            if not doc_info.get("prepared", False):
                logger.error(f"文檔準備失敗: {doc_path} - {doc_info.get('error', '未知錯誤')}")
                fail_count += 1
                continue
            
            # 步驟2: 處理文章信息 - 生成分類和標籤
            doc_info, category, tags = content_manager.process_article(doc_info)
            
            # 提升日誌層級，包含關鍵信息
            logger.info(f"文章「{doc_info['title']}」處理成功，分類：{category['name']}，標籤數：{len(tags)}")
            
            # 步驟3: 生成HTML
            html, output_file = html_generator.generate_html(doc_info, category, tags)
            success = output_file is not None
            
            # 更新內容管理器的博客文章資料庫
            if success:
                # 將包含 URL 的 doc_info 添加到博客資料庫
                content_manager.update_blog_post(doc_info)
                logger.info(f"文章已加入博客資料庫：{doc_info['url']}")
            
            if not success:
                logger.error(f"HTML生成失敗: {doc_path}")
                fail_count += 1
                continue
            
            # 步驟4: 完成處理 - 如果成功則移動文件
            doc_info = word_processor.finalize_document_processing(doc_info, success=success)
            
            if doc_info.get("processed", False):
                logger.info(f"文檔處理成功: {doc_path} -> {doc_info.get('processed_path', '未知路徑')}")
                success_count += 1
            else:
                logger.error(f"文檔處理失敗: {doc_path}")
                fail_count += 1
            
        except Exception as e:
            logger.exception(f"處理文檔時發生錯誤: {doc_path} - {str(e)}")
            fail_count += 1
    
    # 輸出處理結果統計
    logger.info(f"處理完成: 成功 {success_count}, 失敗 {fail_count}")
    
    return success_count, fail_count


def main():
    """
    主函數
    """
    # 解析命令行參數
    args = parse_args()
    
    # 設置日誌級別
    log_level = "DEBUG" if args.debug else "INFO"
    setup_logging(log_level)  # 使用 utils.py 中的版本
    
    logger.info("開始運行Word文檔處理工具")
    logger.info(f"處理模式: {'處理所有文件' if args.process_all else '僅處理當天日期之前的文件'}")
    logger.debug(f"命令行參數: {args}")
    
    # 處理Word文檔
    success_count, fail_count = process_word_documents(args)
    
    # 輸出處理結果
    if success_count == 0 and fail_count == 0:
        logger.info("沒有處理任何文檔")
        sys.exit(0)
    elif fail_count == 0:
        logger.info(f"所有{success_count}個文檔處理成功")
        sys.exit(0)
    else:
        logger.warning(f"處理完成，但有{fail_count}個文檔失敗")
        sys.exit(1)


if __name__ == "__main__":
    main()