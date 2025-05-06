#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
翻譯工具模組 - 使用 LibreTranslate API 將中文翻譯為英文
作者: Claude
日期: 2025-05-07
"""

import os
import re
import json
import time
import logging
import requests
from typing import Dict, List, Optional, Union, Any

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("translate_utils")

# 翻譯服務配置
# 使用免費的 LibreTranslate API 服務，可以根據需要替換為其他服務
LIBRE_TRANSLATE_ENDPOINTS = [
    "https://libretranslate.de/translate",
    "https://translate.terraprint.co/translate",
    "https://translate.argosopentech.com/translate"
]

def clean_text_for_translation(text: str) -> str:
    """
    清理文本，準備翻譯
    移除數字、標點符號，並只保留有意義的文本
    """
    if not text:
        return ""
    
    # 移除URL、日期、文件擴展名等
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\d{4}-\d{2}-\d{2}', '', text)
    text = re.sub(r'\.docx?|\.html?|\.pdf', '', text)
    
    # 移除標點符號和特殊字符
    text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)
    
    # 移除多餘的空格
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def translate_text(text: str, source_lang: str = "zh", target_lang: str = "en", max_retries: int = 3) -> Optional[str]:
    """
    使用 LibreTranslate API 翻譯文本
    :param text: 要翻譯的文本
    :param source_lang: 源語言代碼 (默認為中文)
    :param target_lang: 目標語言代碼 (默認為英文)
    :param max_retries: 最大重試次數
    :return: 翻譯結果或 None (如果翻譯失敗)
    """
    if not text or not text.strip():
        return ""
    
    # 清理文本
    cleaned_text = clean_text_for_translation(text)
    if not cleaned_text:
        return ""
    
    # 如果文本不包含中文字符，則直接返回原文
    if not re.search(r'[\u4e00-\u9fff]', cleaned_text):
        return cleaned_text
    
    # 輪詢所有端點，直到成功為止
    for endpoint in LIBRE_TRANSLATE_ENDPOINTS:
        for attempt in range(max_retries):
            try:
                data = {
                    "q": cleaned_text,
                    "source": source_lang,
                    "target": target_lang,
                    "format": "text"
                }
                
                headers = {
                    "Content-Type": "application/json"
                }
                
                response = requests.post(endpoint, json=data, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    result = response.json()
                    if 'translatedText' in result:
                        translated_text = result['translatedText']
                        logger.info(f"成功翻譯文本，字節數: {len(cleaned_text)}")
                        return translated_text
                    else:
                        logger.warning(f"翻譯 API 回應缺少 'translatedText' 字段: {result}")
                else:
                    logger.warning(f"翻譯請求失敗: 狀態碼 {response.status_code}")
                    
                # 在重試前等待一段時間（避免頻率限制）
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"翻譯文本時發生錯誤: {str(e)}")
                # 在重試前等待一段時間
                time.sleep(1)
                
    logger.error(f"所有翻譯端點均失敗，無法翻譯文本: {cleaned_text[:100]}")
    return None

def translate_to_english_slug(text: str, existing_dict: Dict[str, str] = None) -> str:
    """
    將中文文本轉換為英文 slug
    :param text: 中文文本
    :param existing_dict: 現有翻譯字典 (可選)
    :return: 英文 slug
    """
    import hashlib
    
    if not text:
        return "untitled"
    
    # 如果有現有字典且文本在字典中，直接使用
    if existing_dict and text in existing_dict:
        return existing_dict[text].lower().replace(' ', '-')
    
    # 嘗試翻譯
    translated = translate_text(text)
    
    if translated:
        # 清理翻譯結果，只保留英文、數字和空格
        cleaned = re.sub(r'[^\w\s]', '', translated).strip().lower()
        # 將空格替換為連字符
        slug = re.sub(r'\s+', '-', cleaned)
        # 移除連續的連字符
        slug = re.sub(r'-+', '-', slug)
        # 確保 slug 不超過 100 個字符
        if len(slug) > 100:
            slug = slug[:100]
        
        # 確保 slug 不為空
        if slug:
            return slug
    
    # 如果翻譯失敗或結果為空，使用哈希
    hash_value = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    return f"article-{hash_value}"

def batch_translate_terms(terms: List[str], existing_dict: Dict[str, str] = None) -> Dict[str, str]:
    """
    批量翻譯術語
    :param terms: 術語列表
    :param existing_dict: 現有翻譯字典 (可選)
    :return: 翻譯結果字典
    """
    if existing_dict is None:
        existing_dict = {}
    
    result_dict = {}
    
    for term in terms:
        # 跳過空術語或純數字、英文
        if not term or not re.search(r'[\u4e00-\u9fff]', term):
            continue
        
        # 如果已在字典中，跳過
        if term in existing_dict:
            continue
        
        # 翻譯並轉換為 slug
        translated = translate_to_english_slug(term)
        if translated:
            result_dict[term] = translated
            logger.info(f"翻譯術語: {term} -> {translated}")
        
        # 避免頻率限制
        time.sleep(0.5)
    
    return result_dict

def extract_chinese_terms_from_filename(filename: str) -> List[str]:
    """
    從文件名中提取中文詞彙
    :param filename: 文件名
    :return: 中文詞彙列表
    """
    # 移除文件擴展名
    base_name = os.path.splitext(filename)[0]
    
    # 移除日期部分
    name_without_date = re.sub(r'^\d{4}-\d{2}-\d{2}-?', '', base_name)
    
    # 分割 EP 部分前後
    parts = re.split(r'EP\d+[-_]?', name_without_date, flags=re.IGNORECASE)
    
    # 提取中文詞彙
    chinese_terms = []
    
    for part in parts:
        # 使用正則表達式匹配連續的中文字符
        matches = re.findall(r'[\u4e00-\u9fff]+', part)
        chinese_terms.extend(matches)
    
    # 添加完整的中文詞組（如果存在）
    if re.search(r'[\u4e00-\u9fff]', name_without_date):
        # 移除 EP 部分
        clean_name = re.sub(r'EP\d+[-_]?', '', name_without_date)
        # 只保留中文部分
        chinese_only = ''.join(re.findall(r'[\u4e00-\u9fff]', clean_name))
        if chinese_only and len(chinese_only) > 1:
            chinese_terms.append(chinese_only)
    
    return chinese_terms

def update_translation_dict(file_paths: List[str], dict_path: str) -> bool:
    """
    更新翻譯字典
    :param file_paths: 文件路徑列表
    :param dict_path: 字典文件路徑
    :return: 是否成功更新
    """
    try:
        # 加載現有字典
        existing_dict = {}
        if os.path.exists(dict_path):
            with open(dict_path, 'r', encoding='utf-8') as f:
                existing_dict = json.load(f)
        
        # 收集需要翻譯的術語
        terms_to_translate = []
        
        for file_path in file_paths:
            if not os.path.exists(file_path):
                logger.warning(f"文件不存在: {file_path}")
                continue
            
            filename = os.path.basename(file_path)
            chinese_terms = extract_chinese_terms_from_filename(filename)
            
            for term in chinese_terms:
                if term and term not in existing_dict and term not in terms_to_translate:
                    terms_to_translate.append(term)
        
        if not terms_to_translate:
            logger.info("沒有新術語需要翻譯")
            return True
        
        logger.info(f"將翻譯 {len(terms_to_translate)} 個新術語")
        
        # 批量翻譯
        new_translations = batch_translate_terms(terms_to_translate, existing_dict)
        
        if not new_translations:
            logger.warning("沒有獲得新的翻譯結果")
            return True
        
        # 更新字典
        existing_dict.update(new_translations)
        
        # 保存更新後的字典
        with open(dict_path, 'w', encoding='utf-8') as f:
            json.dump(existing_dict, f, ensure_ascii=False, indent=2, sort_keys=True)
        
        logger.info(f"成功更新翻譯字典，新增 {len(new_translations)} 個翻譯")
        return True
        
    except Exception as e:
        logger.error(f"更新翻譯字典時發生錯誤: {str(e)}")
        return False

if __name__ == "__main__":
    # 測試代碼
    test_word = "資本變更"
    result = translate_text(test_word)
    print(f"翻譯結果: {test_word} -> {result}")
    
    result_slug = translate_to_english_slug(test_word)
    print(f"Slug 結果: {test_word} -> {result_slug}")