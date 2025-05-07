#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word 文檔轉換為 HTML 工具 - 簡化版
專注於格式轉換，不處理分類和標籤
作者: Claude
日期: 2025-05-07
"""

import os
import sys
import re
import json
import logging
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# 確保依賴安裝
def ensure_dependencies():
    required_packages = [
        "mammoth", "python-docx", "bs4", "lxml", "docx2txt"
    ]
    
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"安裝缺失的依賴: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# 設置日誌
def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"word_conversion_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("word_converter")

logger = setup_logging()

def extract_date_from_filename(filename: str) -> Optional[str]:
    """從檔名提取日期"""
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        date_str = date_match.group(1)
        try:
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            pass
    return None

def extract_series_info_from_filename(filename: str) -> Tuple[bool, Optional[str], Optional[int]]:
    """從檔名提取系列信息"""
    series_match = re.search(r'EP(\d+)[-_]', filename, re.IGNORECASE)
    if series_match:
        name_parts = filename.split('EP', 1)[0].strip()
        name_parts = re.sub(r'^\d{4}-\d{2}-\d{2}[-_]?', '', name_parts).strip('-_')
        if not name_parts:
            base_name = os.path.splitext(filename)[0]
            parts = re.split(r'EP\d+[-_]', base_name, flags=re.IGNORECASE)[0]
            parts = re.sub(r'^\d{4}-\d{2}-\d{2}[-_]?', '', parts).strip('-_')
            name_parts = parts or "未命名系列"
        series_name = name_parts
        episode = int(series_match.group(1))
        return True, series_name, episode
    return False, None, None

def extract_word_content(docx_path: str) -> Dict:
    """提取Word文檔內容"""
    logger.info(f"開始提取Word文檔內容: {docx_path}")
    # 使用mammoth、python-docx、docx2txt等提取內容
    # 返回不同提取方法的結果字典
    # ...

def convert_to_html(content_dict: Dict) -> str:
    """將提取的內容轉換為HTML"""
    logger.info("開始將提取內容轉換為HTML")
    # 選擇最佳提取結果轉為HTML
    # ...

def clean_html_content(html_content: str) -> str:
    """清理HTML內容，處理格式問題"""
    logger.info("開始清理HTML內容")
    # 使用BeautifulSoup處理HTML結構
    # ...

def extract_article_structure(html_content: str) -> Dict:
    """提取文章結構（標題、摘要等）"""
    logger.info("開始提取文章結構")
    # 分析HTML提取標題、摘要、內容結構
    # ...

def generate_basic_html(article_structure: Dict, date: str, original_filename: str) -> Tuple[str, str]:
    """生成基本HTML文件內容和建議的文件名"""
    logger.info(f"開始生成基本HTML，日期: {date}")
    
    # 生成基本HTML，不包含分類和標籤
    title = article_structure['title']
    summary = article_structure['summary']
    content = article_structure['content']
    
    # 生成HTML內容
    html_content = generate_html_template(title, summary, content, date)
    
    # 生成建議的文件名（不含英文slug，這將由後續模組處理）
    suggested_filename = f"{date}-article-{hash(title)[:8]}.html"
    
    return html_content, suggested_filename

def generate_html_template(title, summary, content, date):
    """生成基本HTML模板，不含分類和標籤信息"""
    # 生成基本HTML模板
    # ...

def save_article_metadata(output_path: str, article_structure: Dict, date: str, 
                         is_series: bool, series_name: str, episode: int, original_filename: str):
    """保存文章元數據供後續處理"""
    metadata = {
        'title': article_structure['title'],
        'summary': article_structure['summary'],
        'date': date,
        'is_series': is_series,
        'series_name': series_name if is_series else None,
        'episode': episode if is_series else None,
        'original_filename': original_filename,
        'html_path': output_path
    }
    
    # 保存元數據到JSON文件
    meta_path = output_path.replace('.html', '.meta.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    logger.info(f"文章元數據已保存至: {meta_path}")

def process_word_file(docx_path: str, output_dir: str) -> Dict:
    """處理單個Word文件，轉換為HTML並返回結果信息"""
    try:
        filename = os.path.basename(docx_path)
        original_filename = filename
        logger.info(f"開始處理文件: {filename}")
        
        # 從檔名提取日期和系列信息
        date = extract_date_from_filename(filename) or datetime.datetime.now().strftime("%Y-%m-%d")
        is_series, series_name, episode = extract_series_info_from_filename(filename)
        
        if is_series:
            logger.info(f"檢測到系列文章: {series_name}, EP{episode}")
        
        # 提取Word內容並轉為HTML
        content_dict = extract_word_content(docx_path)
        html_content = convert_to_html(content_dict)
        cleaned_html = clean_html_content(html_content)
        article_structure = extract_article_structure(cleaned_html)
        
        # 生成基本HTML文件內容和建議的文件名
        html_content, suggested_filename = generate_basic_html(article_structure, date, original_filename)
        
        # 保存HTML文件
        output_path = os.path.join(output_dir, suggested_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # 保存元數據供後續處理
        save_article_metadata(output_path, article_structure, date, 
                             is_series, series_name, episode, original_filename)
        
        logger.info(f"成功將 {filename} 轉換為 {suggested_filename}")
        
        return {
            'success': True,
            'output_file': suggested_filename,
            'original_filename': original_filename,
            'title': article_structure['title'],
            'metadata_path': output_path.replace('.html', '.meta.json')
        }
    except Exception as e:
        logger.error(f"處理 {docx_path} 時出錯: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'docx_path': docx_path
        }

def process_word_files(input_dir: str, output_dir: str) -> List[Dict]:
    """處理目錄中的所有Word文件"""
    os.makedirs(output_dir, exist_ok=True)
    docx_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.docx') and not f.startswith('~')]
    
    if not docx_files:
        logger.warning(f"在 {input_dir} 中沒有找到Word文檔")
        return []
    
    logger.info(f"找到 {len(docx_files)} 個Word文檔")
    
    results = []
    for idx, docx_file in enumerate(docx_files, 1):
        docx_path = os.path.join(input_dir, docx_file)
        logger.info(f"處理第 {idx}/{len(docx_files)} 個文件: {docx_file}")
        result = process_word_file(docx_path, output_dir)
        results.append(result)
        success_count = sum(1 for r in results if r['success'])
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return 1
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    logger.info(f"輸入目錄: {input_dir}")
    logger.info(f"輸出目錄: {output_dir}")
    
    # 確保依賴套件已安裝
    ensure_dependencies()
    
    logger.info("====== Word轉HTML處理開始 ======")
    results = process_word_files(input_dir, output_dir)
    
    success_count = sum(1 for r in results if r['success'])
    fail_count = len(results) - success_count
    
    logger.info("====== 處理完成 ======")
    logger.info(f"總計處理: {len(results)} 個文件")
    logger.info(f"成功轉換: {success_count} 個文件")
    logger.info(f"失敗: {fail_count} 個文件")
    
    if fail_count > 0:
        logger.warning("以下文件處理失敗:")
        for r in results:
            if not r.get('success', False):
                logger.warning(f"  - {r.get('docx_path', '未知文件')}: {r.get('error', '未知錯誤')}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())