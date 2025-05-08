#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
翻譯模組
提供中英文翻譯服務，支援 DeepL API 和備用免費翻譯服務
"""

import os
import re
import json
import time
import random
import requests
from pathlib import Path
from loguru import logger
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

class Translator:
    """翻譯服務類"""
    
    def __init__(self, dict_file=None, api_key=None):
        """
        初始化翻譯服務
        
        Args:
            dict_file: 翻譯字典文件路徑，默認為 'assets/data/translation_dict.json'
            api_key: DeepL API 密鑰，默認從環境變數 DEEPL_API_KEY 讀取
        """
        self.dict_file = Path(dict_file or 'assets/data/translation_dict.json')
        self.api_key = api_key or os.environ.get('DEEPL_API_KEY', '3bd36bba-fe3f-4b76-8bcf-7f6fcbe2a5c4:fx')
        
        # 確保字典檔案目錄存在
        self.dict_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 載入翻譯字典
        self.translation_dict = self._load_dict()
        
        # 設定翻譯服務
        self.services = [
            self._translate_with_deepl,    # DeepL API (主要服務)
            self._translate_with_google,   # Google Translate (備用服務1)
            self._translate_with_bing      # Bing Translator (備用服務2)
        ]
        
        # 記錄服務失敗次數
        self.service_failures = [0, 0, 0]
        
        # 翻譯計數
        self.translation_count = 0
        self.cache_hit_count = 0
        
        # 記錄上次保存時間，用於控制保存頻率
        self._last_save_time = time.time()
        
        logger.info(f"翻譯服務初始化完成，已載入 {len(self.translation_dict['translations'])} 個翻譯詞條")
    
    def _load_dict(self):
        """
        載入翻譯字典
        
        Returns:
            dict: 翻譯字典
        """
        if not self.dict_file.exists():
            logger.info(f"翻譯字典文件不存在，建立新字典: {self.dict_file}")
            return {"translations": {}, "last_updated": None}
        
        try:
            with open(self.dict_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if "translations" not in data:
                    data["translations"] = {}
                if "last_updated" not in data:
                    data["last_updated"] = None
                return data
        except Exception as e:
            logger.error(f"載入翻譯字典失敗: {e}，建立新字典")
            return {"translations": {}, "last_updated": None}
    
    def _save_dict(self, force_save=False):
        """
        保存翻譯字典
        
        Args:
            force_save: 是否強制立即保存，不考慮緩存時間
        """
        # 增加防抖功能，避免頻繁保存
        current_time = time.time()
        if force_save or not hasattr(self, '_last_save_time') or current_time - self._last_save_time > 30:  # 設定最小保存間隔為30秒
            try:
                with open(self.dict_file, 'w', encoding='utf-8') as f:
                    self.translation_dict["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
                    json.dump(self.translation_dict, f, ensure_ascii=False, indent=2)
                self._last_save_time = current_time
                logger.debug(f"翻譯字典已保存，共 {len(self.translation_dict['translations'])} 個詞條")
            except Exception as e:
                logger.error(f"保存翻譯字典失敗: {e}")
    
    def _translate_with_deepl(self, text, source_lang="ZH", target_lang="EN-US"):
        """
        使用 DeepL API 翻譯文本
        
        Args:
            text: 要翻譯的文本
            source_lang: 源語言代碼，默認為 'ZH'（中文）
            target_lang: 目標語言代碼，默認為 'EN-US'（美式英文）
            
        Returns:
            str: 翻譯後的文本，如果失敗則返回 None
        """
        if not self.api_key:
            logger.warning("未設置 DeepL API Key，跳過 DeepL 翻譯")
            return None
        
        try:
            url = "https://api-free.deepl.com/v2/translate"
            headers = {
                "Authorization": f"DeepL-Auth-Key {self.api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "text": [text],
                "source_lang": source_lang,
                "target_lang": target_lang
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if "translations" in result and result["translations"]:
                    return result["translations"][0]["text"]
                else:
                    logger.warning(f"DeepL 翻譯結果異常: {result}")
                    return None
            else:
                logger.warning(f"DeepL 翻譯請求失敗: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"DeepL 翻譯異常: {e}")
            return None
    
    def _translate_with_google(self, text, source_lang="zh-TW", target_lang="en"):
        """
        使用 Google Translate API 翻譯文本（免費版）
        
        Args:
            text: 要翻譯的文本
            source_lang: 源語言代碼，默認為 'zh-TW'（繁體中文）
            target_lang: 目標語言代碼，默認為 'en'（英文）
            
        Returns:
            str: 翻譯後的文本，如果失敗則返回 None
        """
        try:
            # 使用免費 API 翻譯
            encoded_text = quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={encoded_text}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "application/json"
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result and isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
                    translated_text = "".join([part[0] for part in result[0] if part[0]])
                    return translated_text
                else:
                    logger.warning(f"Google 翻譯結果異常: {result}")
                    return None
            else:
                logger.warning(f"Google 翻譯請求失敗: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Google 翻譯異常: {e}")
            return None
    
    def _translate_with_bing(self, text, source_lang="zh-Hant", target_lang="en"):
        """
        使用 Bing 翻譯 API 翻譯文本（免費版）
        
        Args:
            text: 要翻譯的文本
            source_lang: 源語言代碼，默認為 'zh-Hant'（繁體中文）
            target_lang: 目標語言代碼，默認為 'en'（英文）
            
        Returns:
            str: 翻譯後的文本，如果失敗則返回 None
        """
        try:
            # 使用免費 API 翻譯
            encoded_text = quote(text)
            url = f"https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from={source_lang}&to={target_lang}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": "00000000000000000000000000000000",  # 免費訪問不需要真實密鑰
                "Ocp-Apim-Subscription-Region": "global"
            }
            
            data = [{"text": text}]
            
            response = requests.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result and isinstance(result, list) and len(result) > 0:
                    return result[0]["translations"][0]["text"]
                else:
                    logger.warning(f"Bing 翻譯結果異常: {result}")
                    return None
            else:
                logger.warning(f"Bing 翻譯請求失敗: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Bing 翻譯異常: {e}")
            return None
    
    def translate(self, text, clean_url=True):
        """
        翻譯文本，自動選擇可用的翻譯服務
        
        Args:
            text: 要翻譯的文本
            clean_url: 是否清理結果以適合 URL 使用
            
        Returns:
            str: 翻譯後的文本
        """
        # 檢查是否為空文本
        if not text or not text.strip():
            return ""
        
        # 增加翻譯計數
        self.translation_count += 1
        
        # 檢查字典中是否已存在翻譯
        if text in self.translation_dict["translations"]:
            self.cache_hit_count += 1
            result = self.translation_dict["translations"][text]
            logger.debug(f"從字典中獲取翻譯: {text} -> {result}")
            return result
        
        # 嘗試使用各個翻譯服務
        for i, service in enumerate(self.services):
            # 如果服務失敗次數過多，跳過
            if self.service_failures[i] >= 3:
                continue
                
            logger.debug(f"嘗試使用翻譯服務 {i+1}: {text}")
            result = service(text)
            
            if result:
                # 翻譯成功，清理字串並保存到字典
                if clean_url:
                    result = self._clean_for_url(result)
                
                self.translation_dict["translations"][text] = result
                # 每次成功翻譯後立即保存字典 (有防抖機制)
                self._save_dict(force_save=True)
                
                # 重置服務失敗計數
                self.service_failures[i] = 0
                
                logger.debug(f"翻譯成功 ({i+1}): {text} -> {result}")
                return result
            else:
                # 翻譯失敗，增加失敗計數
                self.service_failures[i] += 1
                logger.warning(f"翻譯服務 {i+1} 失敗，失敗計數: {self.service_failures[i]}")
        
        # 所有服務都失敗，使用簡單的拼音轉換
        logger.warning(f"所有翻譯服務都失敗，使用簡單轉換: {text}")
        result = self._simple_convert(text)
        if clean_url:
            result = self._clean_for_url(result)
        
        # 保存到字典
        self.translation_dict["translations"][text] = result
        self._save_dict(force_save=True)
        
        return result
    
    def translate_batch(self, texts, clean_url=True):
        """
        批量翻譯文本
        
        Args:
            texts: 要翻譯的文本列表
            clean_url: 是否清理結果以適合 URL 使用
            
        Returns:
            list: 翻譯後的文本列表
        """
        # 移除已在字典中的文本
        to_translate = []
        for text in texts:
            if text not in self.translation_dict["translations"]:
                to_translate.append(text)
        
        # 如果沒有需要翻譯的文本，直接返回結果
        if not to_translate:
            return [self.translation_dict["translations"].get(text, "") for text in texts]
        
        # 使用線程池批量翻譯
        with ThreadPoolExecutor(max_workers=min(5, len(to_translate))) as executor:
            futures = [executor.submit(self.translate, text, clean_url) for text in to_translate]
            for future in futures:
                future.result()  # 等待所有翻譯完成
        
        # 完成批量翻譯後立即保存字典
        self._save_dict(force_save=True)
        
        # 返回結果
        return [self.translation_dict["translations"].get(text, "") for text in texts]
    
    def _simple_convert(self, text):
        """
        簡單的中文轉拼音（拼音化）處理
        當所有翻譯服務都失敗時使用
        
        Args:
            text: 要轉換的文本
            
        Returns:
            str: 轉換後的文本
        """
        # 簡單替換常見中文字元為英文
        simplified_text = text.lower()
        simplified_text = simplified_text.replace("，", ",").replace("。", ".")
        simplified_text = simplified_text.replace("；", ";").replace("：", ":")
        simplified_text = simplified_text.replace("（", "(").replace("）", ")")
        simplified_text = simplified_text.replace("「", "\"").replace("」", "\"")
        simplified_text = simplified_text.replace("！", "!").replace("？", "?")
        simplified_text = simplified_text.replace("、", "-").replace("　", " ")
        
        # 替換中文數字為阿拉伯數字
        cn_nums = {"零": "0", "一": "1", "二": "2", "三": "3", "四": "4", 
                   "五": "5", "六": "6", "七": "7", "八": "8", "九": "9"}
        for cn, num in cn_nums.items():
            simplified_text = simplified_text.replace(cn, num)
        
        # 移除剩餘的中文字元
        simplified_text = re.sub(r'[^\x00-\x7F]+', '', simplified_text)
        
        # 清理文本
        simplified_text = self._clean_for_url(simplified_text)
        
        return simplified_text
    
    def _clean_for_url(self, text):
        """
        清理文本使其適合作為 URL
        
        Args:
            text: 要清理的文本
            
        Returns:
            str: 清理後的文本
        """
        # 轉為小寫
        text = text.lower()
        
        # 替換特殊字元為連字符
        text = re.sub(r'[^\w\s-]', '', text)
        
        # 將空格替換為連字符
        text = re.sub(r'\s+', '-', text.strip())
        
        # 移除連續的連字符
        text = re.sub(r'-+', '-', text)
        
        # 移除開頭和結尾的連字符
        text = text.strip('-')
        
        return text
    
    def get_stats(self):
        """
        獲取翻譯統計信息
        
        Returns:
            dict: 統計信息
        """
        return {
            "total_translations": self.translation_count,
            "cache_hits": self.cache_hit_count,
            "dictionary_size": len(self.translation_dict["translations"]),
            "service_failures": self.service_failures,
            "last_updated": self.translation_dict.get("last_updated")
        }
    
    def export_dictionary(self, output_file=None):
        """
        導出翻譯字典
        
        Args:
            output_file: 輸出文件路徑，默認為原字典文件加上時間戳
            
        Returns:
            str: 輸出文件路徑
        """
        if not output_file:
            timestamp = time.strftime("%Y%m%d%H%M%S")
            output_file = f"{self.dict_file.stem}_{timestamp}{self.dict_file.suffix}"
            output_file = self.dict_file.parent / output_file
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.translation_dict, f, ensure_ascii=False, indent=2)
            
            logger.info(f"翻譯字典導出成功: {output_file}")
            return str(output_file)
        except Exception as e:
            logger.error(f"翻譯字典導出失敗: {e}")
            return None
    
    def import_dictionary(self, import_file, merge=True):
        """
        導入翻譯字典
        
        Args:
            import_file: 導入文件路徑
            merge: 是否合併到現有字典
            
        Returns:
            bool: 是否導入成功
        """
        try:
            with open(import_file, 'r', encoding='utf-8') as f:
                imported_dict = json.load(f)
            
            if "translations" not in imported_dict:
                logger.error(f"導入文件格式錯誤: {import_file}")
                return False
            
            # 備份當前字典
            self.export_dictionary()
            
            if merge:
                # 合併字典
                self.translation_dict["translations"].update(imported_dict["translations"])
            else:
                # 替換字典
                self.translation_dict = imported_dict
            
            # 更新時間
            self.translation_dict["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            # 保存字典
            self._save_dict(force_save=True)
            
            logger.info(f"翻譯字典導入成功: {import_file}，{'合併' if merge else '替換'}模式")
            return True
        except Exception as e:
            logger.error(f"翻譯字典導入失敗: {e}")
            return False

# 單例模式
_translator_instance = None

def get_translator(dict_file=None, api_key=None):
    """
    獲取翻譯器實例（單例模式）
    
    Args:
        dict_file: 翻譯字典文件路徑
        api_key: DeepL API 密鑰
        
    Returns:
        Translator: 翻譯器實例
    """
    global _translator_instance
    if _translator_instance is None:
        _translator_instance = Translator(dict_file, api_key)
    return _translator_instance