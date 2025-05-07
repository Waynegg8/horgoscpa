#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML 最終完成器 - 將分類和標籤信息添加到 HTML 文件，優化文件名
作者: Claude
日期: 2025-05-07
"""

import os
import sys
import json
import logging
import glob
import re
import datetime  # 添加這一行
import shutil  # html_finalizer.py需要
import hashlib  # html_finalizer.py需要
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from bs4 import BeautifulSoup
# 設置日誌
def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"html_finalizer_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("html_finalizer")

logger = setup_logging()

# 台灣財稅專業詞彙字典路徑
TRANSLATION_DICT_FILE = "tw_financial_dict.json"

def load_translation_dict() -> Dict[str, str]:
    """載入翻譯字典"""
    try:
        if os.path.exists(TRANSLATION_DICT_FILE):
            with open(TRANSLATION_DICT_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"已載入翻譯字典，包含 {len(data)} 個詞條")
            return data
        else:
            logger.warning(f"找不到翻譯字典文件: {TRANSLATION_DICT_FILE}")
            return {}
    except Exception as e:
        logger.error(f"載入翻譯字典時出錯: {str(e)}")
        return {}

def load_html_content(html_path: str) -> Tuple[Optional[str], Optional[BeautifulSoup]]:
    """載入HTML文件並解析內容"""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        soup = BeautifulSoup(html_content, 'html.parser')
        return html_content, soup
    except Exception as e:
        logger.error(f"載入HTML文件失敗: {html_path}, 錯誤: {str(e)}")
        return None, None

def load_metadata(meta_path: str) -> Optional[Dict]:
    """載入文章元數據"""
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"載入元數據失敗: {meta_path}, 錯誤: {str(e)}")
        return None

def slugify(text: str, translation_dict: Dict[str, str] = None) -> str:
    """將文本轉換為 URL 友好的格式"""
    import hashlib
    
    if not text:
        return "untitled"
    
    # 如果有翻譯字典且文本在字典中，直接使用
    if translation_dict and text in translation_dict:
        return translation_dict[text].lower().replace(' ', '-')
    
    # 清理文本，只保留英文、數字和空格
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    # 將空格替換為連字符
    slug = re.sub(r'\s+', '-', cleaned)
    # 移除連續的連字符
    slug = re.sub(r'-+', '-', slug)
    
    # 如果生成的slug為空，使用哈希
    if not slug or len(slug) < 3:
        hash_value = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
        return f"article-{hash_value}"
    
    return slug

def generate_optimized_filename(metadata: Dict, translation_dict: Dict[str, str]) -> str:
    """根據元數據生成優化的文件名"""
    # 獲取基本信息
    date = metadata.get("date", datetime.datetime.now().strftime("%Y-%m-%d"))
    title = metadata.get("title", "Untitled")
    
    # 獲取分類信息
    classification = metadata.get("classification", {})
    main_category_code = classification.get("main_category_code", "")
    subcategory_code = classification.get("subcategory_code", "")
    
    # 獲取系列信息
    is_series = metadata.get("is_series", False)
    series_name = metadata.get("series_name", "")
    episode = metadata.get("episode", "")
    
    # 從標題生成英文slug
    title_slug = slugify(title, translation_dict)
    
    # 構建文件名
    if main_category_code and subcategory_code:
        # 如果有分類信息，加入分類代碼
        filename = f"{date}-{main_category_code}-{subcategory_code}-{title_slug}"
    else:
        # 否則使用標題slug
        filename = f"{date}-{title_slug}"
    
    # 如果是系列文章，添加系列信息
    if is_series and series_name:
        series_slug = slugify(series_name, translation_dict)
        if not series_slug or len(series_slug) < 3:
            series_slug = hashlib.md5(series_name.encode('utf-8')).hexdigest()[:8]
        filename = f"{filename}-{series_slug}-ep{episode}"
    
    # 添加.html擴展名
    filename = f"{filename}.html"
    
    # 確保文件名不會太長
    if len(filename) > 100:
        # 如果文件名過長，截斷並保持擴展名
        base_name, ext = os.path.splitext(filename)
        filename = base_name[:95] + ext
    
    return filename

def update_html_with_metadata(soup: BeautifulSoup, metadata: Dict) -> BeautifulSoup:
    """根據元數據更新HTML內容"""
    # 獲取分類信息
    classification = metadata.get("classification", {})
    main_category = classification.get("main_category", "")
    main_category_code = classification.get("main_category_code", "")
    subcategory = classification.get("subcategory", "")
    subcategory_code = classification.get("subcategory_code", "")
    
    # 獲取標籤信息
    tags = metadata.get("tags", [])
    
    # 獲取系列信息
    is_series = metadata.get("is_series", False)
    series_name = metadata.get("series_name", "")
    episode = metadata.get("episode", "")
    original_filename = metadata.get("original_filename", "")
    
    # 1. 更新頭部元數據
    # 找到<head>標籤，如果不存在則創建
    head = soup.head
    if not head:
        head = soup.new_tag("head")
        if soup.html:
            soup.html.insert(0, head)
        else:
            html = soup.new_tag("html")
            html.append(head)
            soup.append(html)
    
    # 添加分類元數據
    if main_category and main_category_code:
        meta_main_category = soup.new_tag("meta")
        meta_main_category["name"] = "main-category"
        meta_main_category["content"] = main_category
        head.append(meta_main_category)
        
        meta_main_category_code = soup.new_tag("meta")
        meta_main_category_code["name"] = "main-category-code"
        meta_main_category_code["content"] = main_category_code
        head.append(meta_main_category_code)
    
    if subcategory and subcategory_code:
        meta_subcategory = soup.new_tag("meta")
        meta_subcategory["name"] = "subcategory"
        meta_subcategory["content"] = subcategory
        head.append(meta_subcategory)
        
        meta_subcategory_code = soup.new_tag("meta")
        meta_subcategory_code["name"] = "subcategory-code"
        meta_subcategory_code["content"] = subcategory_code
        head.append(meta_subcategory_code)
    
    # 添加系列文章元數據
    if is_series and series_name:
        meta_series_name = soup.new_tag("meta")
        meta_series_name["name"] = "series-name"
        meta_series_name["content"] = series_name
        head.append(meta_series_name)
        
        meta_series_episode = soup.new_tag("meta")
        meta_series_episode["name"] = "series-episode"
        meta_series_episode["content"] = str(episode)
        head.append(meta_series_episode)
        
        if original_filename:
            meta_original_filename = soup.new_tag("meta")
            meta_original_filename["name"] = "original-filename"
            meta_original_filename["content"] = original_filename
            head.append(meta_original_filename)
    
    # 2. 更新文章分類顯示
    # 找到分類顯示區域（假設有一個特定的class或ID）
    category_div = soup.find("div", class_="article-category")
    if category_div:
        # 清空現有內容
        category_div.clear()
        
        # 添加分類圖標
        icon_span = soup.new_tag("span")
        icon_span["class"] = "material-symbols-rounded"
        icon_span.string = "sell"
        category_div.append(icon_span)
        
        # 添加空格
        category_div.append(" ")
        
        # 添加分類鏈接
        category_link = soup.new_tag("a")
        category_link["href"] = f"/blog.html?category={main_category_code}"
        category_link.string = main_category
        category_div.append(category_link)
    
    # 3. 更新文章標籤
    # 找到標籤顯示區域
    tags_div = soup.find("div", class_="article-tags")
    if tags_div and tags:
        # 清空現有內容
        tags_div.clear()
        
        # 添加每個標籤
        for tag in tags:
            tag_name = tag.get("name", "")
            tag_slug = tag.get("slug", "")
            
            if tag_name and tag_slug:
                tag_link = soup.new_tag("a")
                tag_link["href"] = f"/blog.html?tag={tag_slug}"
                tag_link["class"] = "article-tag"
                tag_link.string = tag_name
                tags_div.append(tag_link)
                
                # 添加換行符以美化HTML源碼
                tags_div.append("\n          ")
    
    return soup

def process_article(html_path: str, output_dir: str) -> Dict:
    """處理單篇文章的HTML完成"""
    logger.info(f"開始處理文章: {html_path}")
    
    # 檢查元數據文件是否存在
    meta_path = html_path.replace('.html', '.meta.json')
    if not os.path.exists(meta_path):
        logger.error(f"找不到元數據文件: {meta_path}")
        return {
            'success': False,
            'html_path': html_path,
            'error': '找不到元數據文件'
        }
    
    # 載入HTML和元數據
    html_content, soup = load_html_content(html_path)
    metadata = load_metadata(meta_path)
    
    if not html_content or not soup or not metadata:
        return {
            'success': False,
            'html_path': html_path,
            'error': '無法載入HTML內容或元數據'
        }
    
    # 檢查元數據中是否有分類和標籤信息
    if "classification" not in metadata:
        logger.warning(f"元數據中缺少分類信息: {meta_path}")
    
    if "tags" not in metadata:
        logger.warning(f"元數據中缺少標籤信息: {meta_path}")
    
    # 載入翻譯字典
    translation_dict = load_translation_dict()
    
    # 根據元數據更新HTML內容
    updated_soup = update_html_with_metadata(soup, metadata)
    
    # 生成優化的文件名
    optimized_filename = generate_optimized_filename(metadata, translation_dict)
    
    # 準備輸出路徑
    output_path = os.path.join(output_dir, optimized_filename)
    
    # 如果輸出文件已存在且不是當前處理的文件，先備份
    if os.path.exists(output_path) and os.path.abspath(output_path) != os.path.abspath(html_path):
        backup_path = output_path + f".bak.{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        shutil.copy2(output_path, backup_path)
        logger.info(f"已備份現有文件: {output_path} -> {backup_path}")
    
    # 保存更新後的HTML
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(str(updated_soup))
        
        # 如果生成的文件與原文件不同，且原文件不是剛創建的臨時文件，則刪除原文件
        if os.path.abspath(output_path) != os.path.abspath(html_path) and not html_path.endswith('.tmp.html'):
            # 更新元數據中的HTML路徑
            metadata["html_path"] = output_path
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            # 重命名元數據文件以匹配新的HTML文件名
            new_meta_path = output_path.replace('.html', '.meta.json')
            if os.path.abspath(new_meta_path) != os.path.abspath(meta_path):
                shutil.move(meta_path, new_meta_path)
            
            # 可以選擇是否刪除原HTML文件
            os.remove(html_path)
        
        logger.info(f"成功處理文章，輸出文件: {output_path}")
        
        return {
            'success': True,
            'original_path': html_path,
            'output_path': output_path,
            'meta_path': meta_path.replace('.html', '.meta.json'),
            'optimized_filename': optimized_filename
        }
    except Exception as e:
        logger.error(f"保存更新後的HTML失敗: {output_path}, 錯誤: {str(e)}")
        return {
            'success': False,
            'html_path': html_path,
            'error': f"保存更新後的HTML失敗: {str(e)}"
        }

def process_all_articles(blog_dir: str) -> List[Dict]:
    """處理目錄中的所有HTML文章"""
    # 查找所有HTML文件
    html_files = glob.glob(os.path.join(blog_dir, "*.html"))
    
    if not html_files:
        logger.warning(f"在 {blog_dir} 中沒有找到HTML文件")
        return []
    
    logger.info(f"找到 {len(html_files)} 個HTML文件")
    
    # 處理每個文章
    results = []
    for idx, html_file in enumerate(html_files, 1):
        logger.info(f"處理第 {idx}/{len(html_files)} 個文件: {os.path.basename(html_file)}")
        result = process_article(html_file, blog_dir)
        results.append(result)
        
        # 顯示進度
        success_count = sum(1 for r in results if r.get('success', False))
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    if len(sys.argv) < 2:
        print("用法: python html_finalizer.py <博客目錄>")
        print("例如: python html_finalizer.py blog")
        return 1
    
    blog_dir = sys.argv[1]
    
    logger.info(f"博客目錄: {blog_dir}")
    
    logger.info("====== HTML完成處理開始 ======")
    results = process_all_articles(blog_dir)
    
    success_count = sum(1 for r in results if r.get('success', False))
    fail_count = len(results) - success_count
    
    logger.info("====== 處理完成 ======")
    logger.info(f"總計處理: {len(results)} 個文件")
    logger.info(f"成功: {success_count} 個文件")
    logger.info(f"失敗: {fail_count} 個文件")
    
    if fail_count > 0:
        logger.warning("以下文件處理失敗:")
        for r in results:
            if not r.get('success', False):
                logger.warning(f"  - {r.get('html_path', '未知文件')}: {r.get('error', '未知錯誤')}")
    
    return 0

if __name__ == "__main__":
    import hashlib  # 引入hashlib模組用於生成哈希值
    sys.exit(main())