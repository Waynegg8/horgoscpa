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
from loguru import logger

from word_processor import WordProcessor
from html_generator import HTMLGenerator  # 假設有此模組
from utils import setup_logging, read_json, write_json


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
    
    parser.add_argument('--process-all', action='store_true',
                        help='處理所有文件，忽略日期限制')
    
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
    # 確保輸出目錄存在
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 初始化Word處理器
    word_processor = WordProcessor(
        word_dir=args.word_dir,
        translation_dict_file=f"{args.assets_dir}/data/translation_dict.json"
    )
    
    # 初始化HTML生成器
    html_generator = HTMLGenerator(
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
            
            # 步驟2: 生成HTML
            html_content, success = html_generator.generate_html(doc_info)
            
            if not success:
                logger.error(f"HTML生成失敗: {doc_path}")
                fail_count += 1
                continue
            
            # 步驟3: 完成處理 - 如果成功則移動文件
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
    setup_logging(level=log_level)
    
    logger.info("開始運行Word文檔處理工具")
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


# 假設的HTML生成器類，您需要替換為實際的實現
class HTMLGenerator:
    """HTML生成器類，負責將Word文檔內容轉換為HTML格式"""
    
    def __init__(self, output_dir, assets_dir):
        """
        初始化HTML生成器
        
        Args:
            output_dir: HTML輸出目錄
            assets_dir: 資源文件目錄
        """
        self.output_dir = Path(output_dir)
        self.assets_dir = Path(assets_dir)
        
        # 確保輸出目錄存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_html(self, doc_info):
        """
        生成HTML內容
        
        Args:
            doc_info: 文檔信息字典
            
        Returns:
            tuple: (生成的HTML內容, 是否成功)
        """
        try:
            # 這裡應該是實際的HTML生成邏輯
            # 使用doc_info中的內容生成HTML
            
            # 生成HTML文件名
            url_path = doc_info["url"]
            html_filename = f"{url_path}.html"
            html_path = self.output_dir / html_filename
            
            # 生成HTML內容
            # 這裡是示例，您需要替換為實際的實現
            title = doc_info["title"]
            content = "\n".join(doc_info["content"])
            
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>
    <h1>{title}</h1>
    <div>{content}</div>
</body>
</html>
"""
            
            # 寫入HTML文件
            html_path.parent.mkdir(parents=True, exist_ok=True)
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            
            logger.info(f"生成HTML文件: {html_path}")
            
            return html_content, True
            
        except Exception as e:
            logger.exception(f"生成HTML時發生錯誤: {str(e)}")
            return None, False


# 自定義的日誌設置函數，您需要替換為實際的實現
def setup_logging(level="INFO"):
    """
    設置日誌配置
    
    Args:
        level: 日誌級別
    """
    # 配置loguru
    logger.remove()  # 移除默認處理器
    
    # 添加控制台處理器
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=level
    )
    
    # 添加文件處理器
    logs_dir = Path("logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    logger.add(
        logs_dir / "word_processor_{time:YYYY-MM-DD}.log",
        rotation="1 day",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=level
    )


if __name__ == "__main__":
    main()