#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主程序模組 - 重構版本
負責協調Word文檔處理、HTML生成、分類處理等流程
支持增強版Word處理和內容驗證
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

# 🔧 修正：從正確的模組導入IntegratedWordProcessor
try:
    # 🔧 修正：IntegratedWordProcessor實際在word_processor.py中
    from word_processor import IntegratedWordProcessor
    from content_validation_tool import ContentValidationTool
    ENHANCED_VERSION_AVAILABLE = True
    logger.info("✅ 使用增強版Word處理器")
except ImportError as e:
    logger.warning(f"⚠️  增強版組件不可用，嘗試回退: {e}")
    try:
        # 🔧 回退選項：嘗試導入基本的WordProcessor
        from word_processor import WordProcessor as IntegratedWordProcessor
        ContentValidationTool = None
        ENHANCED_VERSION_AVAILABLE = False
        logger.warning("使用基本版Word處理器")
    except ImportError as e2:
        logger.error(f"❌ 無法導入任何Word處理器: {e2}")
        # 🔧 最後的回退：創建一個基本的處理器類
        class IntegratedWordProcessor:
            def __init__(self, **kwargs):
                raise ImportError("未找到可用的Word處理器")
        ContentValidationTool = None
        ENHANCED_VERSION_AVAILABLE = False

# 🔧 導入其他必要組件，添加錯誤處理
try:
    from html_generator import HtmlGenerator
except ImportError as e:
    logger.error(f"❌ 無法導入HtmlGenerator: {e}")
    class HtmlGenerator:
        def __init__(self, **kwargs):
            raise ImportError("未找到HtmlGenerator")

try:
    from content_manager import ContentManager
except ImportError as e:
    logger.error(f"❌ 無法導入ContentManager: {e}")
    class ContentManager:
        def __init__(self, **kwargs):
            raise ImportError("未找到ContentManager")

try:
    from utils import setup_logging, ensure_directories
except ImportError as e:
    logger.error(f"❌ 無法導入utils: {e}")
    def setup_logging(level):
        pass
    def ensure_directories(dirs):
        for name, path in dirs.items():
            Path(path).mkdir(parents=True, exist_ok=True)


def parse_args():
    """
    解析命令行參數
    
    Returns:
        argparse.Namespace: 解析後的參數
    """
    parser = argparse.ArgumentParser(description='Word文檔處理與HTML生成工具 - 重構版本')
    
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
    
    # 🔧 新增：內容驗證相關參數
    parser.add_argument('--validate-content', action='store_true', default=True,
                        help='執行內容完整性驗證 (默認: 啟用)')
    
    parser.add_argument('--skip-validation', action='store_true',
                        help='跳過內容驗證步驟')
    
    parser.add_argument('--validation-report', type=str, 
                        help='生成詳細的驗證報告文件路徑')
    
    parser.add_argument('--fail-on-validation-error', action='store_true',
                        help='驗證失敗時終止程序')
    
    # 🔧 新增：增強版處理器參數
    parser.add_argument('--enhanced', action='store_true',
                        help='強制使用增強版處理器')
    
    return parser.parse_args()


def validate_document_conversion(doc_info, validator, args):
    """
    驗證文檔轉換結果
    
    Args:
        doc_info: 文檔信息
        validator: 驗證器實例
        args: 命令行參數
        
    Returns:
        dict: 驗證結果
    """
    if args.skip_validation or not ENHANCED_VERSION_AVAILABLE or not validator:
        logger.info("跳過內容驗證")
        return {'is_valid': True, 'message': '驗證已跳過'}
    
    try:
        # 執行驗證
        validation_result = validator.validate_conversion(
            doc_info, 
            doc_info.get('processed_html', '')
        )
        
        # 生成驗證報告
        if args.validation_report:
            report = validator.generate_validation_report(validation_result)
            report_path = Path(args.validation_report)
            report_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report)
            
            logger.info(f"📋 驗證報告已保存: {report_path}")
        
        # 記錄驗證結果
        if validation_result['is_valid']:
            logger.success("✅ 內容完整性驗證通過")
        else:
            logger.error("❌ 內容完整性驗證失敗")
            for error in validation_result.get('errors', []):
                logger.error(f"  • {error}")
        
        if validation_result.get('warnings'):
            for warning in validation_result.get('warnings', []):
                logger.warning(f"  ⚠️  {warning}")
        
        return validation_result
        
    except Exception as e:
        logger.error(f"驗證過程中發生錯誤: {str(e)}")
        return {
            'is_valid': False,
            'errors': [f'驗證過程異常: {str(e)}'],
            'message': '驗證過程異常'
        }


def process_word_documents(args):
    """
    處理Word文檔
    
    Args:
        args: 命令行參數
        
    Returns:
        tuple: (成功處理的文檔數, 失敗的文檔數, 驗證失敗的文檔數)
    """
    # 🔧 增加錯誤檢查
    try:
        # 確保目錄結構存在
        ensure_directories({
            'output': args.output_dir,
            'assets': args.assets_dir,
            'data': f"{args.assets_dir}/data",
            'images': f"{args.assets_dir}/images/blog"
        })
        
        # 🔧 初始化增強版Word處理器，添加錯誤處理
        try:
            word_processor = IntegratedWordProcessor(
                word_dir=args.word_dir,
                translation_dict_file=f"{args.assets_dir}/data/translation_dict.json"
            )
            logger.success("✅ Word處理器初始化成功")
        except Exception as e:
            logger.error(f"❌ Word處理器初始化失敗: {e}")
            return 0, 1, 0
        
        # 🔧 初始化內容驗證器
        validator = None
        if ENHANCED_VERSION_AVAILABLE and ContentValidationTool and not args.skip_validation:
            try:
                validator = ContentValidationTool()
                logger.info("✅ 內容驗證器已初始化")
            except Exception as e:
                logger.warning(f"⚠️  內容驗證器初始化失敗: {e}")
        
        # 初始化內容管理器
        try:
            content_manager = ContentManager(
                data_dir=f"{args.assets_dir}/data"
            )
            logger.success("✅ 內容管理器初始化成功")
        except Exception as e:
            logger.error(f"❌ 內容管理器初始化失敗: {e}")
            return 0, 1, 0
        
        # 初始化HTML生成器
        try:
            html_generator = HtmlGenerator(
                output_dir=args.output_dir,
                assets_dir=args.assets_dir
            )
            logger.success("✅ HTML生成器初始化成功")
        except Exception as e:
            logger.error(f"❌ HTML生成器初始化失敗: {e}")
            return 0, 1, 0
        
    except Exception as e:
        logger.error(f"❌ 初始化過程中發生錯誤: {e}")
        return 0, 1, 0
    
    # 設置處理日期
    process_date = None
    if args.process_date:
        try:
            process_date = datetime.strptime(args.process_date, "%Y-%m-%d").date()
            logger.info(f"處理特定日期的文件: {process_date}")
        except ValueError:
            logger.error(f"無效的日期格式: {args.process_date}, 應為YYYY-MM-DD")
            return 0, 0, 0
    
    # 掃描Word文檔目錄
    try:
        documents = word_processor.scan_documents(
            process_all=args.process_all,
            process_date=process_date
        )
    except Exception as e:
        logger.error(f"❌ 掃描文檔時發生錯誤: {e}")
        return 0, 1, 0
    
    if not documents:
        logger.info("沒有找到需要處理的Word文檔")
        return 0, 0, 0
    
    logger.info(f"開始處理{len(documents)}個Word文檔")
    if ENHANCED_VERSION_AVAILABLE:
        logger.info("🚀 使用增強版處理引擎")
    
    # 統計處理結果
    success_count = 0
    fail_count = 0
    validation_fail_count = 0
    
    # 處理每個文檔
    for doc_path in documents:
        logger.info(f"📄 處理文檔: {doc_path}")
        
        try:
            # 步驟1: 準備文檔 - 提取內容和生成SEO URL
            logger.info("🔄 步驟1: 提取和處理Word內容...")
            doc_info = word_processor.prepare_document(doc_path)
            
            if not doc_info.get("prepared", False):
                logger.error(f"文檔準備失敗: {doc_path} - {doc_info.get('error', '未知錯誤')}")
                fail_count += 1
                continue
            
            # 🔧 顯示處理統計信息（如果有的話）
            if 'extraction_stats' in doc_info:
                stats = doc_info['extraction_stats']
                logger.info(f"📊 提取統計: {stats}")
            
            # 步驟2: 內容驗證
            if validator:
                logger.info("🔍 步驟2: 執行內容完整性驗證...")
                validation_result = validate_document_conversion(doc_info, validator, args)
                
                if not validation_result['is_valid']:
                    validation_fail_count += 1
                    if args.fail_on_validation_error:
                        logger.error(f"驗證失敗，終止處理: {doc_path}")
                        fail_count += 1
                        continue
                    else:
                        logger.warning(f"驗證失敗但繼續處理: {doc_path}")
            
            # 步驟3: 處理文章信息 - 生成分類和標籤
            logger.info("🔄 步驟3: 處理分類和標籤...")
            doc_info, category, tags = content_manager.process_article(doc_info)
            
            logger.info(f"✅ 文章「{doc_info['title']}」處理成功")
            logger.info(f"   📂 分類：{category['name']}")  
            logger.info(f"   🏷️  標籤：{len(tags)} 個")
            
            # 步驟4: 生成HTML
            logger.info("🔄 步驟4: 生成HTML文件...")
            html, output_file = html_generator.generate_html(doc_info, category, tags)
            success = output_file is not None
            
            # 更新內容管理器的博客文章資料庫
            if success:
                content_manager.update_blog_post(doc_info)
                logger.info(f"📝 文章已加入博客資料庫：{doc_info['url']}")
            
            if not success:
                logger.error(f"❌ HTML生成失敗: {doc_path}")
                fail_count += 1
                continue
            
            # 步驟5: 完成處理 - 移動文件
            logger.info("🔄 步驟5: 完成處理並移動文件...")
            doc_info = word_processor.finalize_document_processing(doc_info, success=success)
            
            if doc_info.get("processed", False):
                logger.success(f"✅ 文檔處理完全成功: {doc_path}")
                logger.info(f"   📁 已移動到: {doc_info.get('processed_path', '未知路徑')}")
                success_count += 1
            else:
                logger.error(f"❌ 文檔處理失敗: {doc_path}")
                fail_count += 1
            
        except Exception as e:
            logger.exception(f"❌ 處理文檔時發生錯誤: {doc_path} - {str(e)}")
            fail_count += 1
    
    # 輸出處理結果統計
    logger.info("=" * 60)
    logger.info("📊 處理結果統計")
    logger.info("=" * 60)
    logger.info(f"✅ 成功處理: {success_count} 個")
    logger.info(f"❌ 處理失敗: {fail_count} 個")
    if validator:
        logger.info(f"⚠️  驗證警告: {validation_fail_count} 個")
    logger.info(f"📄 總計文檔: {len(documents)} 個")
    
    # 🔧 輸出翻譯統計（如果有的話）
    if hasattr(word_processor, 'get_translation_stats'):
        try:
            translation_stats = word_processor.get_translation_stats()
            logger.info(f"🌐 翻譯統計: {translation_stats}")
        except:
            pass
    
    return success_count, fail_count, validation_fail_count


def main():
    """
    主函數
    """
    # 解析命令行參數
    args = parse_args()
    
    # 設置日誌級別
    log_level = "DEBUG" if args.debug else "INFO"
    setup_logging(log_level)
    
    logger.info("🚀 開始運行Word文檔處理工具 - 重構版本")
    if ENHANCED_VERSION_AVAILABLE:
        logger.info("✨ 使用增強版處理引擎")
    else:
        logger.warning("⚠️  使用標準版處理引擎")
    
    logger.info(f"🔧 處理模式: {'處理所有文件' if args.process_all else '處理當前日期及更早的文件'}")
    logger.debug(f"📋 命令行參數: {args}")
    
    # 🔧 增加強制增強版處理器的檢查
    if args.enhanced and not ENHANCED_VERSION_AVAILABLE:
        logger.error("❌ 要求使用增強版處理器，但增強版組件不可用")
        sys.exit(1)
    
    # 處理Word文檔
    success_count, fail_count, validation_fail_count = process_word_documents(args)
    
    # 輸出最終結果並設置退出碼
    if success_count == 0 and fail_count == 0:
        logger.info("ℹ️  沒有處理任何文檔")
        sys.exit(0)
    elif fail_count == 0:
        if validation_fail_count > 0:
            logger.warning(f"✅ 所有{success_count}個文檔處理成功，但有{validation_fail_count}個驗證警告")
        else:
            logger.success(f"🎉 所有{success_count}個文檔處理成功")
        sys.exit(0)
    else:
        logger.error(f"⚠️  處理完成，但有{fail_count}個文檔失敗")
        if validation_fail_count > 0:
            logger.error(f"   另外還有{validation_fail_count}個驗證警告")
        sys.exit(1)


if __name__ == "__main__":
    main()