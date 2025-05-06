#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
更新翻譯字典腳本 - 掃描 Word 文檔並更新翻譯字典
作者: Claude
日期: 2025-05-07
"""

import os
import sys
import glob
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any

# 確保腳本目錄在 Python 路徑中
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
sys.path.append(script_dir)
sys.path.append(project_root)

# 導入翻譯工具
from translate_utils import update_translation_dict

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("update_dictionary")

# 設置路徑
WORD_DOCS_DIR = os.path.join(project_root, "word-docs")
TRANSLATION_DICT_PATH = os.path.join(project_root, "tw_financial_dict.json")

def scan_word_docs() -> List[str]:
    """
    掃描 word-docs 目錄中的 Word 文檔
    :return: Word 文檔路徑列表
    """
    if not os.path.exists(WORD_DOCS_DIR):
        logger.warning(f"目錄不存在: {WORD_DOCS_DIR}")
        return []
    
    # 搜索所有 .docx 文件
    docx_files = glob.glob(os.path.join(WORD_DOCS_DIR, "*.docx"))
    
    if not docx_files:
        logger.info(f"在 {WORD_DOCS_DIR} 中沒有找到 Word 文檔")
    else:
        logger.info(f"找到 {len(docx_files)} 個 Word 文檔")
    
    return docx_files

def main():
    """主函數"""
    # 設置命令行參數
    parser = argparse.ArgumentParser(description='更新翻譯字典')
    parser.add_argument('--dict-path', type=str, default=TRANSLATION_DICT_PATH,
                        help='翻譯字典文件路徑')
    parser.add_argument('--word-dir', type=str, default=WORD_DOCS_DIR,
                        help='Word 文檔目錄路徑')
    args = parser.parse_args()
    
    # 更新路徑
    global WORD_DOCS_DIR, TRANSLATION_DICT_PATH
    WORD_DOCS_DIR = args.word_dir
    TRANSLATION_DICT_PATH = args.dict_path
    
    logger.info(f"Word 文檔目錄: {WORD_DOCS_DIR}")
    logger.info(f"翻譯字典路徑: {TRANSLATION_DICT_PATH}")
    
    # 掃描 Word 文檔
    word_docs = scan_word_docs()
    
    if not word_docs:
        logger.info("沒有 Word 文檔需要處理")
        return 0
    
    # 更新翻譯字典
    success = update_translation_dict(word_docs, TRANSLATION_DICT_PATH)
    
    if success:
        logger.info("翻譯字典更新成功")
        return 0
    else:
        logger.error("翻譯字典更新失敗")
        return 1

if __name__ == "__main__":
    sys.exit(main())