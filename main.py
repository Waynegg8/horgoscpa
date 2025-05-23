#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
修復版主程序模組
解決導入錯誤，支持多種導入方式
"""

import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# 添加當前目錄和scripts目錄到Python路徑
current_dir = Path(__file__).parent
scripts_dir = current_dir / 'scripts'

# 將路徑添加到sys.path的開頭，確保優先使用
paths_to_add = [str(current_dir), str(scripts_dir)]
for path in paths_to_add:
    if path not in sys.path:
        sys.path.insert(0, path)

from loguru import logger

def dynamic_import():
    """
    動態導入模組，處理不同的導入路徑
    
    Returns:
        tuple: 導入的類和模組
    """
    WordProcessor = None
    HtmlGenerator = None
    ContentManager = None
    
    # 嘗試不同的導入方式
    import_attempts = [
        # 方式1: 直接導入（文件在同一目錄）
        {
            'word_processor': ['word_processor', 'WordProcessor'],
            'html_generator': ['html_generator', 'HtmlGenerator'], 
            'content_manager': ['content_manager', 'ContentManager']
        },
        # 方式2: 從scripts目錄導入
        {
            'word_processor': ['scripts.word_processor', 'WordProcessor'],
            'html_generator': ['scripts.html_generator', 'HtmlGenerator'],
            'content_manager': ['scripts.content_manager', 'ContentManager']
        },
        # 方式3: 檢查是否有改進版本
        {
            'word_processor': ['improved_word_processor', 'ImprovedWordProcessor'],
            'html_generator': ['improved_html_generator', 'ImprovedHtmlGenerator'],
            'content_manager': ['content_manager', 'ContentManager']
        }
    ]
    
    imported_modules = {}
    
    for attempt_idx, attempt in enumerate(import_attempts):
        logger.info(f"嘗試導入方式 {attempt_idx + 1}")
        success = True
        temp_modules = {}
        
        for module_name, (import_path, class_name) in attempt.items():
            try:
                module = __import__(import_path, fromlist=[class_name])
                class_obj = getattr(module, class_name)
                temp_modules[module_name] = class_obj
                logger.debug(f"成功導入: {import_path}.{class_name}")
            except (ImportError, AttributeError) as e:
                logger.debug(f"導入失敗: {import_path}.{class_name} - {e}")
                success = False
                break
        
        if success:
            imported_modules = temp_modules
            logger.info(f"使用導入方式 {attempt_idx + 1} 成功")
            break
    
    if not imported_modules:
        logger.error("所有導入方式都失敗")
        # 提供詳細的錯誤信息
        logger.error("請檢查以下文件是否存在:")
        for file_name in ['word_processor.py', 'html_generator.py', 'content_manager.py']:
            file_path = current_dir / file_name
            scripts_path = scripts_dir / file_name
            logger.error(f"  {file_path} - {'存在' if file_path.exists() else '不存在'}")
            logger.error(f"  {scripts_path} - {'存在' if scripts_path.exists() else '不存在'}")
        
        raise ImportError("無法導入必要的模組")
    
    # 嘗試導入utils
    try:
        from utils import setup_logging, ensure_directories
        logger.debug("成功導入 utils 模組")
    except ImportError:
        logger.warning("無法導入 utils 模組，使用替代方案")
        # 提供簡單的替代實現
        def setup_logging(level):
            pass
        
        def ensure_directories(dirs):
            for name, path in dirs.items():
                Path(path).mkdir(parents=True, exist_ok=True)
    
    return (imported_modules['word_processor'], 
            imported_modules['html_generator'], 
            imported_modules['content_manager'],
            setup_logging, 
            ensure_directories)

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

def process_word_documents(args, WordProcessor, HtmlGenerator, ContentManager, ensure_directories):
    """
    處理Word文檔
    
    Args:
        args: 命令行參數
        WordProcessor: Word處理器類
        HtmlGenerator: HTML生成器類
        ContentManager: 內容管理器類
        ensure_directories: 目錄確保函數
        
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
    
    # 初始化處理器
    try:
        word_processor = WordProcessor(
            word_dir=args.word_dir,
            translation_dict_file=f"{args.assets_dir}/data/translation_dict.json"
        )
        logger.info("Word處理器初始化成功")
    except Exception as e:
        logger.error(f"Word處理器初始化失敗: {e}")
        return 0, 1
    
    try:
        content_manager = ContentManager(
            data_dir=f"{args.assets_dir}/data"
        )
        logger.info("內容管理器初始化成功")
    except Exception as e:
        logger.error(f"內容管理器初始化失敗: {e}")
        return 0, 1
    
    try:
        html_generator = HtmlGenerator(
            output_dir=args.output_dir,
            assets_dir=args.assets_dir
        )
        logger.info("HTML生成器初始化成功")
    except Exception as e:
        logger.error(f"HTML生成器初始化失敗: {e}")
        return 0, 1
    
    # 設置處理日期
    process_date = None
    if args.process_date:
        try:
            process_date = datetime.strptime(args.process_date, "%Y-%m-%d").date()
            logger.info(f"處理特定日期的文件: {process_date}")
        except ValueError:
            logger.error(f"無效的日期格式: {args.process_date}, 應為YYYY-MM-DD")
            return 0, 1
    
    # 掃描Word文檔目錄
    try:
        documents = word_processor.scan_documents(
            process_all=args.process_all,
            process_date=process_date
        )
        logger.info(f"掃描到 {len(documents)} 個文檔")
    except Exception as e:
        logger.error(f"掃描文檔失敗: {e}")
        return 0, 1
    
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
            
            logger.info(f"文章「{doc_info['title']}」處理成功，分類：{category['name']}，標籤數：{len(tags)}")
            
            # 步驟3: 生成HTML
            # 檢查HTML生成器是否支持翻譯器參數
            if hasattr(html_generator, 'generate_html'):
                try:
                    # 嘗試使用改進版本的generate_html方法
                    html, output_file = html_generator.generate_html(
                        doc_info, category, tags, getattr(word_processor, 'translator', None)
                    )
                except TypeError:
                    # 如果不支持翻譯器參數，使用原版方法
                    html, output_file = html_generator.generate_html(doc_info, category, tags)
            else:
                logger.error("HTML生成器缺少generate_html方法")
                fail_count += 1
                continue
            
            success = output_file is not None
            
            # 更新內容管理器的博客文章資料庫
            if success:
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
    
    # 處理完所有文件後，嘗試更新JSON數據
    try:
        # 檢查是否有JsonGenerator
        try:
            from json_generator import JsonGenerator
            json_generator = JsonGenerator(data_dir=f"{args.assets_dir}/data")
            json_generator.generate_all_json()
            logger.info("JSON數據更新完成")
        except ImportError:
            logger.warning("無法導入JsonGenerator，跳過JSON數據更新")
    except Exception as e:
        logger.error(f"JSON數據更新失敗: {e}")
    
    # 輸出處理結果統計
    logger.info(f"處理完成: 成功 {success_count}, 失敗 {fail_count}")
    
    return success_count, fail_count

def main():
    """
    主函數
    """
    # 設置基本日誌
    logger.remove()
    logger.add(sys.stdout, level="INFO", 
               format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    try:
        # 動態導入模組
        WordProcessor, HtmlGenerator, ContentManager, setup_logging, ensure_directories = dynamic_import()
        logger.info("所有必要模組導入成功")
    except Exception as e:
        logger.error(f"模組導入失敗: {e}")
        sys.exit(1)
    
    # 解析命令行參數
    args = parse_args()
    
    # 設置日誌級別
    if args.debug:
        logger.remove()
        logger.add(sys.stdout, level="DEBUG", 
                   format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    logger.info("開始運行Word文檔處理工具")
    logger.info(f"處理模式: {'處理所有文件' if args.process_all else '處理當前日期及更早的文件'}")
    if args.debug:
        logger.debug(f"命令行參數: {args}")
    
    # 處理Word文檔
    try:
        success_count, fail_count = process_word_documents(
            args, WordProcessor, HtmlGenerator, ContentManager, ensure_directories
        )
    except Exception as e:
        logger.exception(f"處理過程中發生嚴重錯誤: {e}")
        sys.exit(1)
    
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