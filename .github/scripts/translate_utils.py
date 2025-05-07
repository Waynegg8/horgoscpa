#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
翻譯工具模組 - 使用多種免費翻譯 API 將中文翻譯為英文
作者: Claude
日期: 2025-05-17
"""

import os
import re
import json
import time
import logging
import requests
import hashlib
from typing import Dict, List, Optional, Union, Any

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("translate_utils")

# 翻譯服務配置 - 增加更多免費服務
TRANSLATE_ENDPOINTS = [
    # LibreTranslate 系列
    {
        "url": "https://translate.terraprint.co/translate",
        "type": "libretranslate",
        "timeout": 10,
        "retry_delay": 1
    },
    {
        "url": "https://translate.argosopentech.com/translate",
        "type": "libretranslate",
        "timeout": 10,
        "retry_delay": 1
    },
    {
        "url": "https://libretranslate.de/translate",
        "type": "libretranslate",
        "timeout": 10,
        "retry_delay": 1
    },
    # Lingva 翻譯 (開源 Google 翻譯替代品)
    {
        "url": "https://lingva.ml/api/v1/{source}/{target}/{query}",
        "type": "lingva",
        "timeout": 10,
        "retry_delay": 1
    },
    # MyMemory API (每天 100 次免費請求)
    {
        "url": "https://api.mymemory.translated.net/get",
        "type": "mymemory",
        "timeout": 10,
        "retry_delay": 1
    },
    # Yandex 翻譯鏡像
    {
        "url": "https://translate.api.skitzen.com/api/v1/translate",
        "type": "skitzen",
        "timeout": 10,
        "retry_delay": 1
    },
    # Translate.eu API (無需金鑰)
    {
        "url": "https://www.translate.eu/api/translate",
        "type": "translateeu",
        "timeout": 10,
        "retry_delay": 1
    },
    # FunTranslations API (每小時 60 次免費請求)
    {
        "url": "https://api.funtranslations.com/translate/chinese-simplified.json",
        "type": "funtranslations",
        "timeout": 10,
        "retry_delay": 2
    }
]

# 保存當前工作的翻譯服務索引
current_working_endpoint_index = 0

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

def translate_with_libretranslate(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 LibreTranslate API 翻譯文本"""
    try:
        data = {
            "q": text,
            "source": source_lang,
            "target": target_lang,
            "format": "text"
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            endpoint["url"], 
            json=data, 
            headers=headers, 
            timeout=endpoint["timeout"]
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'translatedText' in result:
                return result['translatedText']
        
        logger.warning(f"LibreTranslate 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"LibreTranslate 翻譯出錯: {str(e)}")
        return None

def translate_with_lingva(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 Lingva API 翻譯文本"""
    try:
        url = endpoint["url"].format(
            source=source_lang,
            target=target_lang,
            query=text
        )
        
        response = requests.get(url, timeout=endpoint["timeout"])
        
        if response.status_code == 200:
            result = response.json()
            if 'translation' in result:
                return result['translation']
        
        logger.warning(f"Lingva 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"Lingva 翻譯出錯: {str(e)}")
        return None

def translate_with_funtranslations(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 FunTranslations API 翻譯文本"""
    try:
        data = {
            "text": text
        }
        
        response = requests.post(
            endpoint["url"], 
            data=data, 
            timeout=endpoint["timeout"]
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'contents' in result and 'translated' in result['contents']:
                return result['contents']['translated']
        
        logger.warning(f"FunTranslations 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"FunTranslations 翻譯出錯: {str(e)}")
        return None

def translate_with_mymemory(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 MyMemory API 翻譯文本"""
    try:
        langpair = f"{source_lang}|{target_lang}"
        params = {
            "q": text,
            "langpair": langpair
        }
        
        response = requests.get(
            endpoint["url"], 
            params=params, 
            timeout=endpoint["timeout"]
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'responseData' in result and 'translatedText' in result['responseData']:
                return result['responseData']['translatedText']
        
        logger.warning(f"MyMemory 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"MyMemory 翻譯出錯: {str(e)}")
        return None

def translate_with_skitzen(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 Skitzen API 翻譯文本"""
    try:
        data = {
            "text": text,
            "from": source_lang,
            "to": target_lang
        }
        
        response = requests.post(
            endpoint["url"], 
            json=data, 
            timeout=endpoint["timeout"]
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'translated' in result:
                return result['translated']
        
        logger.warning(f"Skitzen 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"Skitzen 翻譯出錯: {str(e)}")
        return None

def translate_with_translateeu(endpoint: Dict, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """使用 Translate.eu API 翻譯文本"""
    try:
        data = {
            "text": text,
            "from": source_lang,
            "to": target_lang,
            "format": "json"
        }
        
        response = requests.post(
            endpoint["url"], 
            data=data, 
            timeout=endpoint["timeout"]
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'text' in result:
                return result['text']
        
        logger.warning(f"Translate.eu 請求失敗: 狀態碼 {response.status_code}")
        return None
    except Exception as e:
        logger.warning(f"Translate.eu 翻譯出錯: {str(e)}")
        return None

def find_working_translation_endpoint(text: str, source_lang: str = "zh", target_lang: str = "en") -> Optional[int]:
    """
    查找一個可用的翻譯服務
    :return: 可用的翻譯服務索引，或 None 如果全部失敗
    """
    global current_working_endpoint_index
    
    # 首先檢查當前工作服務是否仍然可用
    if 0 <= current_working_endpoint_index < len(TRANSLATE_ENDPOINTS):
        endpoint = TRANSLATE_ENDPOINTS[current_working_endpoint_index]
        
        try:
            # 根據端點類型選擇不同的翻譯方法
            result = None
            if endpoint["type"] == "libretranslate":
                result = translate_with_libretranslate(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "lingva":
                result = translate_with_lingva(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "funtranslations":
                result = translate_with_funtranslations(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "mymemory":
                result = translate_with_mymemory(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "skitzen":
                result = translate_with_skitzen(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "translateeu":
                result = translate_with_translateeu(endpoint, text, source_lang, target_lang)
            
            if result:
                logger.info(f"當前翻譯服務 {endpoint['type']} 仍然可用")
                return current_working_endpoint_index
            
            logger.info(f"當前翻譯服務 {endpoint['type']} 無法使用，將嘗試其他服務")
            
        except Exception as e:
            logger.warning(f"檢查當前翻譯服務時出錯: {str(e)}")
    
    # 輪詢所有端點，尋找工作的端點
    for index, endpoint in enumerate(TRANSLATE_ENDPOINTS):
        if index == current_working_endpoint_index:
            continue  # 跳過已經檢查過的當前端點
        
        try:
            # 根據端點類型選擇不同的翻譯方法
            result = None
            if endpoint["type"] == "libretranslate":
                result = translate_with_libretranslate(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "lingva":
                result = translate_with_lingva(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "funtranslations":
                result = translate_with_funtranslations(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "mymemory":
                result = translate_with_mymemory(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "skitzen":
                result = translate_with_skitzen(endpoint, text, source_lang, target_lang)
            elif endpoint["type"] == "translateeu":
                result = translate_with_translateeu(endpoint, text, source_lang, target_lang)
            
            if result:
                logger.info(f"發現可用的翻譯服務: {endpoint['type']}")
                current_working_endpoint_index = index
                return index
            
        except Exception as e:
            logger.warning(f"檢查翻譯服務 {endpoint['type']} 時出錯: {str(e)}")
    
    logger.error("所有翻譯服務均不可用")
    return None

def translate_text(text: str, source_lang: str = "zh", target_lang: str = "en", max_retries: int = 2) -> Optional[str]:
    """
    使用可用的翻譯服務翻譯文本
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
    
    # 找到可用的翻譯服務
    endpoint_index = find_working_translation_endpoint(cleaned_text, source_lang, target_lang)
    
    if endpoint_index is not None:
        # 使用找到的可用服務
        endpoint = TRANSLATE_ENDPOINTS[endpoint_index]
        
        for attempt in range(max_retries):
            try:
                # 根據端點類型選擇不同的翻譯方法
                result = None
                if endpoint["type"] == "libretranslate":
                    result = translate_with_libretranslate(endpoint, cleaned_text, source_lang, target_lang)
                elif endpoint["type"] == "lingva":
                    result = translate_with_lingva(endpoint, cleaned_text, source_lang, target_lang)
                elif endpoint["type"] == "funtranslations":
                    result = translate_with_funtranslations(endpoint, cleaned_text, source_lang, target_lang)
                elif endpoint["type"] == "mymemory":
                    result = translate_with_mymemory(endpoint, cleaned_text, source_lang, target_lang)
                elif endpoint["type"] == "skitzen":
                    result = translate_with_skitzen(endpoint, cleaned_text, source_lang, target_lang)
                elif endpoint["type"] == "translateeu":
                    result = translate_with_translateeu(endpoint, cleaned_text, source_lang, target_lang)
                
                if result:
                    logger.info(f"使用 {endpoint['type']} 成功翻譯文本，字節數: {len(cleaned_text)}")
                    return result
                
                # 如果失敗，嘗試找到其他可用服務
                logger.warning(f"嘗試用 {endpoint['type']} 翻譯失敗，尋找其他服務")
                endpoint_index = find_working_translation_endpoint(cleaned_text, source_lang, target_lang)
                if endpoint_index is None:
                    break
                endpoint = TRANSLATE_ENDPOINTS[endpoint_index]
                
            except Exception as e:
                logger.error(f"翻譯服務 {endpoint['type']} 出錯: {str(e)}")
                # 尋找其他可用服務
                endpoint_index = find_working_translation_endpoint(cleaned_text, source_lang, target_lang)
                if endpoint_index is None:
                    break
                endpoint = TRANSLATE_ENDPOINTS[endpoint_index]
    
    # 如果所有翻譯服務都失敗，使用哈希值作為回退方案
    logger.warning(f"所有翻譯端點均失敗，無法翻譯文本: {cleaned_text[:100]}")
    
    # 生成哈希值作為回退方案
    hash_value = hashlib.md5(cleaned_text.encode('utf-8')).hexdigest()[:8]
    return f"untranslated-{hash_value}"

def translate_to_english_slug(text: str, existing_dict: Dict[str, str] = None) -> str:
    """
    將中文文本轉換為英文 slug
    :param text: 中文文本
    :param existing_dict: 現有翻譯字典 (可選)
    :return: 英文 slug
    """
    if not text:
        return "untitled"
    
    # 如果有現有字典且文本在字典中，直接使用
    if existing_dict and text in existing_dict:
        return existing_dict[text].lower().replace(' ', '-')
    
    # 嘗試翻譯
    try:
        translated = translate_text(text)
        
        if translated and not translated.startswith("untranslated-"):
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
    except Exception as e:
        logger.warning(f"翻譯失敗，使用備用方法: {str(e)}")
    
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
    
    # 查找一個可用的翻譯服務
    test_term = next((term for term in terms if term not in existing_dict), None)
    if test_term:
        find_working_translation_endpoint(test_term)
    
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