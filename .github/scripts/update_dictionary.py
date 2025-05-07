#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新翻譯字典腳本 - 從Word文檔提取內容並更新翻譯字典
作者: Claude
日期: 2025-05-07
"""

import os
import sys
import json
import logging
import glob
import re
import jieba
from pathlib import Path
from typing import List, Dict, Any, Set

# 確保腳本目錄在 Python 路徑中
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
sys.path.append(script_dir)
sys.path.append(project_root)

# 導入共用函數
from word_extractor import extract_word_document_content
from translate_utils import translate_to_english_slug

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("update_dictionary")

# 設置路徑
WORD_DOCS_DIR = os.path.join(project_root, "word-docs")
TRANSLATION_DICT_PATH = os.path.join(project_root, "tw_financial_dict.json")

def load_translation_dict() -> Dict[str, str]:
    """載入翻譯字典"""
    try:
        if os.path.exists(TRANSLATION_DICT_PATH):
            with open(TRANSLATION_DICT_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"已載入翻譯字典，包含 {len(data)} 個詞條")
            return data
        else:
            logger.warning(f"找不到翻譯字典文件: {TRANSLATION_DICT_PATH}")
            return {}
    except Exception as e:
        logger.error(f"載入翻譯字典時出錯: {str(e)}")
        return {}

def save_translation_dict(translation_dict: Dict[str, str]) -> bool:
    """保存翻譯字典"""
    try:
        with open(TRANSLATION_DICT_PATH, 'w', encoding='utf-8') as f:
            json.dump(translation_dict, f, ensure_ascii=False, indent=2, sort_keys=True)
        logger.info(f"已保存翻譯字典，包含 {len(translation_dict)} 個詞條")
        return True
    except Exception as e:
        logger.error(f"保存翻譯字典時出錯: {str(e)}")
        return False

def extract_terms_from_word_document(docx_path: str) -> Set[str]:
    """從Word文檔中提取專業詞彙"""
    try:
        logger.info(f"從Word文檔提取專業詞彙: {docx_path}")
        
        # 提取Word文檔內容
        content = extract_word_document_content(docx_path)
        if not content:
            logger.warning(f"無法提取Word文檔內容: {docx_path}")
            return set()
        
        # 設置jieba分詞
        jieba.setLogLevel(20)  # 抑制jieba日誌輸出
        
        # 專業財稅領域前綴詞和後綴詞
        prefixes = ["稅", "財", "會計", "企業", "審計", "資產", "負債", "股權", "財產", "營業", "合約"]
        suffixes = ["稅", "務", "規劃", "申報", "制度", "記帳", "簽證", "憑證", "分析", "報表", "規範"]
        
        # 專業領域短語和詞組
        professional_phrases = [
            "所得稅", "營業稅", "扣繳", "節稅", "稅務規劃", "會計制度", "財務報表", 
            "資產管理", "負債結構", "現金流量", "財產傳承", "股權分配", "企業登記",
            "工商登記", "公司設立", "變更登記", "不動產", "房地合一", "土地增值稅"
        ]
        
        # 使用jieba分詞
        words = list(jieba.cut(content))
        
        # 提取專業詞彙
        professional_terms = set()
        
        # 檢查標題和段落開頭，提取專業詞彙
        title_match = re.search(r'^(.+?)[\n\r]', content)
        if title_match:
            title = title_match.group(1).strip()
            title_parts = re.split(r'[，、：:；;\s]', title)
            for part in title_parts:
                if len(part) >= 2 and not re.match(r'^\d+$', part):
                    professional_terms.add(part)
        
        # 從所有分詞中提取專業詞彙
        for word in words:
            # 忽略單字詞和數字
            if len(word) < 2 or re.match(r'^\d+$', word):
                continue
            
            # 檢查是否為專業詞組
            if word in professional_phrases:
                professional_terms.add(word)
                continue
                
            # 檢查前綴和後綴
            has_prefix = any(word.startswith(prefix) for prefix in prefixes)
            has_suffix = any(word.endswith(suffix) for suffix in suffixes)
            
            if has_prefix or has_suffix:
                professional_terms.add(word)
        
        logger.info(f"從文檔中提取了 {len(professional_terms)} 個專業詞彙")
        return professional_terms
    
    except Exception as e:
        logger.error(f"提取專業詞彙時出錯: {str(e)}")
        return set()

def update_dictionary_with_terms(terms: Set[str], existing_dict: Dict[str, str]) -> Dict[str, str]:
    """使用新提取的專業詞彙更新翻譯字典"""
    if not terms:
        logger.info("沒有新詞彙需要更新字典")
        return existing_dict
    
    # 收集需要翻譯的新詞彙
    new_terms = [term for term in terms if term not in existing_dict]
    
    if not new_terms:
        logger.info("所有詞彙已在字典中")
        return existing_dict
        
    logger.info(f"需要翻譯 {len(new_terms)} 個新詞彙")
    
    # 使用翻譯工具翻譯新詞彙
    updated_dict = existing_dict.copy()
    for term in new_terms:
        try:
            # 翻譯詞彙
            english_slug = translate_to_english_slug(term)
            if english_slug:
                updated_dict[term] = english_slug
                logger.info(f"翻譯詞彙: {term} -> {english_slug}")
            else:
                logger.warning(f"無法翻譯詞彙: {term}")
        except Exception as e:
            logger.error(f"翻譯詞彙時出錯: {term}, 錯誤: {str(e)}")
    
    logger.info(f"成功更新字典，新增 {len(updated_dict) - len(existing_dict)} 個詞條")
    return updated_dict

def scan_word_docs() -> List[str]:
    """掃描 word-docs 目錄中的 Word 文檔"""
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

def update_translation_dictionary() -> bool:
    """主要功能：掃描Word文檔，提取專業詞彙並更新翻譯字典"""
    # 掃描Word文檔
    word_docs = scan_word_docs()
    if not word_docs:
        logger.info("沒有Word文檔需要處理")
        return True
    
    # 載入現有翻譯字典
    translation_dict = load_translation_dict()
    
    # 從每個Word文檔提取專業詞彙
    all_terms = set()
    for doc_path in word_docs:
        terms = extract_terms_from_word_document(doc_path)
        all_terms.update(terms)
    
    if not all_terms:
        logger.info("沒有提取到專業詞彙")
        return True
    
    logger.info(f"總共提取了 {len(all_terms)} 個專業詞彙")
    
    # 使用提取的詞彙更新翻譯字典
    updated_dict = update_dictionary_with_terms(all_terms, translation_dict)
    
    # 保存更新後的字典
    if save_translation_dict(updated_dict):
        logger.info("翻譯字典更新成功")
        return True
    else:
        logger.error("翻譯字典更新失敗")
        return False

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
    
    # 執行字典更新
    success = update_translation_dictionary()
    
    if success:
        logger.info("字典更新流程完成")
        return 0
    else:
        logger.error("字典更新流程失敗")
        return 1

if __name__ == "__main__":
    import argparse  # 導入argparse模組用於命令行參數
    sys.exit(main())