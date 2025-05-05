#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Word 文檔轉換為 HTML 工具 - 改進版
用於將 Word 文檔轉換為符合網站風格的 HTML 文件
重點優化：確保文章內容絕對完整性，並處理Markdown語法標記
"""

import os
import sys
import re
import json
import random
import difflib
import hashlib
import datetime
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import importlib
import subprocess

# 嘗試確保依賴安裝
def ensure_dependencies():
    required_packages = [
        "mammoth", "python-docx", "bs4", "lxml",
        "docx2txt", "difflib"
    ]
    
    # 檢查並安裝缺失的包
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"安裝缺失的依賴: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# 執行依賴檢查
ensure_dependencies()

# 必須的依賴
import mammoth
from bs4 import BeautifulSoup

# 設置日誌
def setup_logging():
    # 創建日誌目錄
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # 設置日誌文件名
    log_file = os.path.join(log_dir, f"word_extraction_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    
    # 配置日誌格式
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger("word_extractor")

# 設置全局日誌器
logger = setup_logging()

# 嘗試導入 utils 模組
try:
    from utils import load_translation_dict, extract_keywords, setup_jieba_dict
    USE_UTILS = True
    logger.info("成功導入 utils 模組")
except ImportError:
    logger.warning("無法導入 utils 模組，將使用內部函數")
    USE_UTILS = False
    
    def load_translation_dict():
        """簡易版字典加載"""
        try:
            # 首先嘗試在專案根目錄下查找
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
            dict_path = os.path.join(project_root, "assets/data/tw_financial_dict.json")
            
            if not os.path.exists(dict_path):
                # 然後嘗試在當前目錄查找
                dict_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tw_financial_dict.json')
            
            if os.path.exists(dict_path):
                logger.info(f"從 {dict_path} 讀取翻譯字典")
                with open(dict_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"載入字典文件出錯: {str(e)}")
        return {}
    
    def extract_keywords(text, top_n=5):
        """簡易版關鍵詞提取"""
        # 簡單實現，實際使用中應考慮導入 jieba 等分詞工具
        words = re.findall(r'[\w\u4e00-\u9fff]{2,}', text)
        word_freq = {}
        for word in words:
            if word in word_freq:
                word_freq[word] += 1
            else:
                word_freq[word] = 1
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:top_n]]
    
    def setup_jieba_dict():
        """空函數實現"""
        pass

# 加載翻譯字典
TRANSLATION_DICT = load_translation_dict()
logger.info(f"已加載翻譯字典，共 {len(TRANSLATION_DICT)} 個詞條")

# 設置預設分類
CATEGORY_MAPPING = {
    "稅務": "tax",
    "會計": "accounting",
    "企業": "business",
    "記帳": "accounting",
    "財務": "financial",
    "創業": "startup",
    "法律": "legal"
}

def extract_date_from_filename(filename: str) -> Optional[str]:
    """
    從文件名中提取日期
    :param filename: 文件名
    :return: 日期字符串 (YYYY-MM-DD) 或 None
    """
    # 嘗試從文件名中提取日期 (YYYY-MM-DD 格式)
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match:
        date_str = date_match.group(1)
        try:
            # 驗證日期格式
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            pass
    
    return None

def is_bullet_point(text: str) -> bool:
    """
    檢查文本是否為項目符號
    :param text: 文本
    :return: 布爾值
    """
    # 檢查各種項目符號格式
    bullet_patterns = [
        r'^\s*[-•·＊※◎○●♦⬤➤➢➣➼✓✔✗✘]\s', # 各種項目符號
        r'^\s*\d+[\.\)]\s', # 數字加點或括號
        r'^\s*[a-zA-Z][\.\)]\s', # 字母加點或括號
        r'^\s*[(（][\da-zA-Z][)）]\s', # 各種帶括號的編號
    ]
    
    return any(re.match(pattern, text) for pattern in bullet_patterns)

def clean_bullet_point(text: str) -> str:
    """
    清理項目符號，保留內容
    :param text: 帶符號的文本
    :return: 清理後的文本
    """
    # 清理各種項目符號格式
    patterns = [
        (r'^\s*[-•·＊※◎○●♦⬤➤➢➣➼✓✔✗✘]\s*', ''), # 各種項目符號
        (r'^\s*\d+[\.\)]\s*', ''), # 數字加點或括號
        (r'^\s*[a-zA-Z][\.\)]\s*', ''), # 字母加點或括號
        (r'^\s*[(（][\da-zA-Z][)）]\s*', ''), # 各種帶括號的編號
    ]
    
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result)
    
    return result

def extract_content_multi_method(docx_path: str) -> Dict:
    """
    實施多種方法提取Word文檔內容，優先確保完整性
    :param docx_path: Word文檔路徑
    :return: 提取結果字典
    """
    logger.info(f"開始處理文件: {docx_path}")
    
    # 檢查文件是否存在
    if not os.path.exists(docx_path):
        logger.error(f"文件不存在: {docx_path}")
        raise FileNotFoundError(f"文件不存在: {docx_path}")
    
    # 檢查文件大小
    file_size = os.path.getsize(docx_path)
    logger.info(f"文件大小: {file_size} 字節")
    if file_size == 0:
        logger.error(f"文件大小為0: {docx_path}")
        raise ValueError(f"文件大小為0: {docx_path}")
    
    # 以空字典收集各種方法的結果
    extraction_results = {}
    
    # 1. 使用mammoth提取HTML結構
    try:
        import mammoth
        with open(docx_path, 'rb') as docx_file:
            # 優化過的樣式映射
            style_map = """
                p[style-name='標題'] => h1:fresh
                p[style-name='Title'] => h1:fresh
                p[style-name='Heading 1'] => h1:fresh
                p[style-name='標題 1'] => h1:fresh
                p[style-name='Heading 2'] => h2:fresh
                p[style-name='標題 2'] => h2:fresh
                p[style-name='Heading 3'] => h3:fresh
                p[style-name='標題 3'] => h3:fresh
                p[style-name='List Paragraph'] => li:fresh
                p[style-name='項目符號'] => li:fresh
                r[style-name='Strong'] => strong
                r[style-name='強調'] => strong
            """
            
            convert_options = {
                "style_map": style_map,
                "include_default_style_map": True
            }
            
            result = mammoth.convert_to_html(docx_file, **convert_options)
            html_content = result.value
            
            # 收集警告信息
            warnings = []
            for message in result.messages:
                if message.type == "warning":
                    warnings.append(message.message)
                    logger.warning(f"Mammoth警告: {message.message}")
            
            if html_content.strip():
                logger.info(f"Mammoth HTML提取成功，長度: {len(html_content)}")
                extraction_results['mammoth_html'] = {
                    'content': html_content,
                    'type': 'html',
                    'warnings': warnings,
                    'length': len(html_content)
                }
            else:
                logger.warning("Mammoth HTML提取結果為空")
    except Exception as e:
        logger.error(f"Mammoth HTML提取錯誤: {str(e)}")
    
    # 2. 使用mammoth提取純文本
    try:
        import mammoth
        with open(docx_path, 'rb') as docx_file:
            text_result = mammoth.extract_raw_text(docx_file)
            raw_text = text_result.value
            
            if raw_text.strip():
                logger.info(f"Mammoth純文本提取成功，長度: {len(raw_text)}")
                extraction_results['mammoth_text'] = {
                    'content': raw_text,
                    'type': 'text',
                    'length': len(raw_text)
                }
            else:
                logger.warning("Mammoth純文本提取結果為空")
    except Exception as e:
        logger.error(f"Mammoth純文本提取錯誤: {str(e)}")
    
    # 3. 使用python-docx進行底層提取
    try:
        import docx
        doc = docx.Document(docx_path)
        
        # 提取段落
        paragraphs = []
        for para in doc.paragraphs:
            # 提取段落文本和樣式
            para_text = para.text
            style_name = para.style.name if para.style else "Normal"
            
            # 檢查是否為列表項
            is_list_item = False
            try:
                # 嘗試訪問段落的numPr屬性檢查是否為列表項
                if hasattr(para._element, 'pPr') and para._element.pPr is not None:
                    numPr = para._element.pPr.numPr
                    is_list_item = numPr is not None
            except:
                pass
            
            if para_text.strip():  # 只添加非空段落
                paragraphs.append({
                    'text': para_text,
                    'style': style_name,
                    'is_list_item': is_list_item
                })
        
        # 提取表格
        tables = []
        for i, table in enumerate(doc.tables):
            table_data = []
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    row_data.append(cell_text)
                table_data.append(row_data)
            tables.append({
                'id': f'table_{i+1}',
                'data': table_data
            })
        
        # 組合結果
        detailed_content = {
            'paragraphs': paragraphs,
            'tables': tables
        }
        
        # 計算總內容長度
        total_text = '\n'.join([p['text'] for p in paragraphs])
        for table in tables:
            for row in table['data']:
                total_text += '\n' + ' | '.join(row)
        
        logger.info(f"Python-docx提取成功，段落數: {len(paragraphs)}, 表格數: {len(tables)}")
        extraction_results['python_docx'] = {
            'content': detailed_content,
            'type': 'structured',
            'length': len(total_text)
        }
    except Exception as e:
        logger.error(f"Python-docx提取錯誤: {str(e)}")
    
    # 4. 使用docx2txt作為備用方法
    try:
        import docx2txt
        text = docx2txt.process(docx_path)
        
        if text.strip():
            logger.info(f"Docx2txt提取成功，長度: {len(text)}")
            extraction_results['docx2txt'] = {
                'content': text,
                'type': 'text',
                'length': len(text)
            }
        else:
            logger.warning("Docx2txt提取結果為空")
    except Exception as e:
        logger.error(f"Docx2txt提取錯誤: {str(e)}")
    
    # 檢查是否至少有一種方法成功
    if not extraction_results:
        raise Exception("所有提取方法均失敗，無法獲取文檔內容")
    
    return extraction_results

def validate_extraction_completeness(extraction_results: Dict) -> Dict:
    """
    驗證不同提取方法的結果完整性，識別最完整的版本
    :param extraction_results: 提取結果字典
    :return: 驗證結果
    """
    logger.info("開始驗證提取內容的完整性")
    
    # 獲取所有文本內容用於比較
    text_contents = {}
    for method, result in extraction_results.items():
        if result['type'] == 'text':
            text_contents[method] = result['content']
        elif result['type'] == 'html':
            # 去除HTML標籤
            soup = BeautifulSoup(result['content'], 'html.parser')
            text_contents[method] = soup.get_text()
        elif result['type'] == 'structured':
            # 從結構化內容中提取純文本
            paragraphs = [p['text'] for p in result['content']['paragraphs']]
            tables_text = []
            for table in result['content']['tables']:
                for row in table['data']:
                    tables_text.append(' | '.join(row))
            text_contents[method] = '\n'.join(paragraphs + tables_text)
    
    # 檢查是否有文本內容可比較
    if not text_contents:
        logger.warning("沒有可用於比較的文本內容")
        return None
    
    # 對每種方法的結果進行指紋比較
    
    # 按長度排序（假設更長的內容包含更多信息）
    sorted_methods = sorted(text_contents.keys(), 
                          key=lambda m: len(text_contents[m]), 
                          reverse=True)
    
    logger.info(f"按內容長度排序的提取方法: {sorted_methods}")
    logger.info(f"內容長度: {[(m, len(text_contents[m])) for m in sorted_methods]}")
    
    # 計算文本相似度矩陣
    similarity_matrix = {}
    for i, method1 in enumerate(sorted_methods):
        text1 = text_contents[method1]
        similarity_matrix[method1] = {}
        
        for method2 in sorted_methods:
            if method1 == method2:
                similarity_matrix[method1][method2] = 1.0
                continue
                
            text2 = text_contents[method2]
            # 使用序列匹配比較相似度
            similarity = difflib.SequenceMatcher(None, text1, text2).ratio()
            similarity_matrix[method1][method2] = similarity
    
    # 輸出相似度矩陣
    logger.info("提取方法間的文本相似度:")
    for method1, similarities in similarity_matrix.items():
        for method2, score in similarities.items():
            if method1 != method2:
                logger.info(f"  {method1} vs {method2}: {score:.4f}")
    
    # 確定最完整的結果
    # 優先選擇最長且與其他方法有高相似度的結果
    best_method = sorted_methods[0]  # 默認選擇最長的
    best_score = 0
    
    for method in sorted_methods:
        # 計算與其他方法的平均相似度
        avg_similarity = sum(similarity_matrix[method].values()) / len(similarity_matrix[method])
        # 計算綜合得分 (長度 + 相似度)
        score = len(text_contents[method]) * 0.7 + avg_similarity * len(sorted_methods) * 30
        logger.info(f"方法 {method} 評分: 長度 {len(text_contents[method])}, 平均相似度 {avg_similarity:.4f}, 總分 {score:.2f}")
        
        if score > best_score:
            best_score = score
            best_method = method
    
    logger.info(f"最完整的提取方法: {best_method}, 綜合得分: {best_score:.2f}")
    
    # 檢查是否有內容明顯缺失
    if best_method != sorted_methods[0]:
        logger.warning(f"注意: 最完整的方法 {best_method} 不是最長的方法 {sorted_methods[0]}")
        # 分析可能缺失的內容
        longest_method = sorted_methods[0]
        missing_chars = len(text_contents[longest_method]) - len(text_contents[best_method])
        logger.warning(f"最長方法比最佳方法多 {missing_chars} 個字符")
    
    return {
        'best_method': best_method,
        'best_content': extraction_results[best_method],
        'similarity_matrix': similarity_matrix,
        'score': best_score
    }

def merge_extraction_results(extraction_results: Dict, validation_results: Dict) -> str:
    """
    融合多種提取方法的結果，填補可能的缺失
    :param extraction_results: 提取結果字典
    :param validation_results: 驗證結果
    :return: 融合後的內容
    """
    logger.info("開始融合提取結果以確保最大完整性")
    
    best_method = validation_results['best_method']
    best_content = extraction_results[best_method]
    
    # 根據內容類型執行不同的融合策略
    if best_content['type'] == 'html':
        # 如果最佳內容是HTML，嘗試增強它
        logger.info("以HTML內容為基礎進行融合")
        return enhance_html_content(best_content['content'], extraction_results)
    
    elif best_content['type'] == 'structured':
        # 如果最佳內容是結構化的，轉換為HTML並增強
        logger.info("以結構化內容為基礎進行融合")
        html_content = convert_structured_to_html(best_content['content'])
        return enhance_html_content(html_content, extraction_results)
    
    else:  # text type
        # 如果最佳內容是純文本，轉換為HTML並增強
        logger.info("以純文本為基礎進行融合")
        html_content = convert_text_to_html(best_content['content'])
        return enhance_html_content(html_content, extraction_results)

def enhance_html_content(html_content: str, extraction_results: Dict) -> str:
    """
    增強HTML內容，填補可能的缺失，並清理Markdown語法
    :param html_content: HTML內容
    :param extraction_results: 提取結果字典
    :return: 增強後的HTML
    """
    from bs4 import BeautifulSoup
    
    # 清理可能的Markdown格式問題
    # 清理標題前的Markdown符號
    html_content = re.sub(r'\*\*\\?#\s*', '', html_content)
    html_content = re.sub(r'\*\*\\?##\s*', '', html_content)
    html_content = re.sub(r'\*\*\\?###\s*', '', html_content)
    
    # 清理粗體標記
    html_content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html_content)
    
    # 清理列表項前的符號
    html_content = re.sub(r'\*\*-\s*\\?\*\*(.*?)\\?\*\*', r'<li>\1</li>', html_content)
    html_content = re.sub(r'-\s*\*\*(.*?)\*\*', r'<li>\1</li>', html_content)
    
    # 解析HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    body = soup.find('body')
    
    # 如果沒有body標籤，創建一個
    if not body:
        body = soup.new_tag('body')
        if soup.html:
            soup.html.append(body)
        else:
            html_tag = soup.new_tag('html')
            html_tag.append(body)
            soup.append(html_tag)
    
    # 獲取HTML中的所有文本段落
    html_paragraphs = []
    for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li']):
        if tag.get_text().strip():
            html_paragraphs.append(tag.get_text().strip())
    
    # 檢查純文本提取的內容是否有HTML中缺失的部分
    for method in ['mammoth_text', 'docx2txt']:
        if method in extraction_results:
            raw_text = extraction_results[method]['content']
            raw_lines = raw_text.split('\n')
            
            # 檢查純文本中有但HTML中缺少的行
            for line in raw_lines:
                line = line.strip()
                if not line:
                    continue
                
                # 檢查是否在HTML中缺失
                found = False
                for html_para in html_paragraphs:
                    # 考慮文本內的空白字符可能不同
                    if re.sub(r'\s+', ' ', line) == re.sub(r'\s+', ' ', html_para):
                        found = True
                        break
                
                # 如果未找到，添加到HTML中
                if not found and len(line) > 10:  # 忽略太短的行
                    logger.info(f"從純文本中添加缺失行: {line[:30]}...")
                    p_tag = soup.new_tag('p')
                    p_tag['class'] = 'merged-content'
                    p_tag.string = line
                    body.append(p_tag)
    
    # 從結構化內容中檢查表格
    if 'python_docx' in extraction_results and 'tables' in extraction_results['python_docx']['content']:
        structured_tables = extraction_results['python_docx']['content']['tables']
        html_tables = soup.find_all('table')
        
        # 如果HTML中沒有表格但結構化內容中有
        if not html_tables and structured_tables:
            logger.info(f"從結構化內容中添加 {len(structured_tables)} 個表格")
            
            # 將結構化表格轉換為HTML表格
            for table_data in structured_tables:
                if not table_data['data']:  # 跳過空表格
                    continue
                    
                table_tag = soup.new_tag('table')
                table_tag['class'] = 'merged-table'
                table_tag['border'] = '1'
                
                for row_data in table_data['data']:
                    tr_tag = soup.new_tag('tr')
                    for cell_text in row_data:
                        td_tag = soup.new_tag('td')
                        td_tag.string = cell_text
                        tr_tag.append(td_tag)
                    table_tag.append(tr_tag)
                
                body.append(table_tag)
    
    # 檢查結構化內容中的段落
    if 'python_docx' in extraction_results:
        structured_paragraphs = extraction_results['python_docx']['content']['paragraphs']
        
        # 檢查結構化內容中的列表項
        list_items = [p for p in structured_paragraphs if p.get('is_list_item', False)]
        
        # 如果HTML中沒有列表項但結構化內容中有
        html_list_items = soup.find_all('li')
        if not html_list_items and list_items:
            logger.info(f"從結構化內容中添加 {len(list_items)} 個列表項")
            
            # 分組列表項
            current_list = None
            for item in list_items:
                text = item['text'].strip()
                if not text:
                    continue
                
                # 創建列表元素
                if not current_list:
                    current_list = soup.new_tag('ul')
                    current_list['class'] = 'merged-list'
                    body.append(current_list)
                
                # 添加列表項
                li_tag = soup.new_tag('li')
                li_tag.string = text
                current_list.append(li_tag)
    
    # 檢查並清理所有標題和段落中可能殘留的Markdown標記
    for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li']):
        text = tag.get_text()
        # 清理標題中的#符號
        if tag.name.startswith('h') and text.startswith('#'):
            text = re.sub(r'^#+\s*', '', text)
            tag.string = text
        
        # 清理粗體標記
        if '**' in text:
            text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
            tag.string = text
        
        # 清理列表項前的標記
        if tag.name == 'li' and text.startswith('-'):
            text = re.sub(r'^-\s*', '', text)
            tag.string = text
    
    # 返回增強後的HTML
    enhanced_html = str(soup)
    logger.info(f"融合後HTML長度: {len(enhanced_html)}")
    return enhanced_html

def convert_structured_to_html(structured_content: Dict) -> str:
    """
    將結構化內容轉換為HTML格式
    :param structured_content: 結構化內容
    :return: HTML字符串
    """
    paragraphs = structured_content['paragraphs']
    tables = structured_content.get('tables', [])
    
    html_parts = ['<!DOCTYPE html>', '<html>', '<head><meta charset="UTF-8"></head>', '<body>']
    
    # 處理段落
    current_list = None
    list_type = None
    
    for para in paragraphs:
        text = para['text']
        style = para['style']
        is_list_item = para.get('is_list_item', False)
        
        # 清理可能的Markdown標記
        # 清理標題前的#符號
        text = re.sub(r'^#+\s*', '', text)
        # 清理粗體標記
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # 跳過空段落
        if not text.strip():
            continue
        
        # 標題處理
        if style.startswith(('Heading', '標題')) or "heading" in style.lower():
            # 結束之前的列表（如果有）
            if current_list:
                html_parts.append(f'</{list_type}>')
                current_list = None
                list_type = None
            
            # 提取標題級別
            level = 1  # 默認
            if style[-1].isdigit():
                level = int(style[-1])
            elif "heading" in style.lower() and style[-1].isdigit():
                level = int(style[-1])
            
            # 確保級別在有效範圍
            level = max(1, min(level, 6))
            html_parts.append(f'<h{level}>{text}</h{level}>')
        
        # 列表項處理
        elif is_list_item or any(text.strip().startswith(prefix) for prefix in ['-', '•', '*', '1.', '2.']):
            # 清理列表項標記
            text = re.sub(r'^[-•*]\s*', '', text)
            
            # 判斷列表類型
            if text.strip()[0].isdigit() and '.' in text.strip()[:3]:
                new_list_type = 'ol'
            else:
                new_list_type = 'ul'
            
            # 如果是新列表或列表類型變更
            if not current_list or list_type != new_list_type:
                # 結束之前的列表（如果有）
                if current_list:
                    html_parts.append(f'</{list_type}>')
                
                # 開始新列表
                list_type = new_list_type
                current_list = True
                html_parts.append(f'<{list_type}>')
            
            # 清理列表項文本
            if text.strip().startswith(('-', '•', '*')):
                cleaned_text = text.strip()[1:].strip()
            elif text.strip()[0].isdigit() and '.' in text.strip()[:3]:
                cleaned_text = text.strip()[text.strip().index('.')+1:].strip()
            else:
                cleaned_text = text.strip()
                
            html_parts.append(f'<li>{cleaned_text}</li>')
        
        # 普通段落
        else:
            # 結束之前的列表（如果有）
            if current_list:
                html_parts.append(f'</{list_type}>')
                current_list = None
                list_type = None
            
            html_parts.append(f'<p>{text}</p>')
    
    # 結束最後的列表（如果有）
    if current_list:
        html_parts.append(f'</{list_type}>')
    
    # 處理表格
    for table in tables:
        table_html = ['<table border="1">']
        for row in table['data']:
            if not row:  # 跳過空行
                continue
            table_html.append('<tr>')
            for cell in row:
                table_html.append(f'<td>{cell}</td>')
            table_html.append('</tr>')
        table_html.append('</table>')
        html_parts.append(''.join(table_html))
    
    html_parts.append('</body></html>')
    return '\n'.join(html_parts)

def convert_text_to_html(text: str) -> str:
    """
    將純文本轉換為簡單HTML格式，嘗試識別結構，並清理Markdown標記
    :param text: 純文本
    :return: HTML字符串
    """
    # 首先清理可能的Markdown標記
    # 清理標題前的#符號
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    # 清理粗體標記
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    # 清理列表項前的標記
    text = re.sub(r'^-\s*', '', text, flags=re.MULTILINE)
    
    lines = text.split('\n')
    html_parts = ['<!DOCTYPE html>', '<html>', '<head><meta charset="UTF-8"></head>', '<body>']
    
    # 識別段落和列表
    current_list = None
    list_type = None
    
    for line in lines:
        line = line.strip()
        
        # 跳過空行
        if not line:
            continue
        
        # 判斷是否為標題（基於啟發式規則）
        is_heading = (len(line) < 100 and  # 標題通常較短
                     (line.isupper() or  # 全大寫可能是標題
                      line.endswith(':') or  # 以冒號結尾可能是標題
                      (not any(c in line for c in ',.;:!?') and len(line) < 50)))  # 沒有標點且較短可能是標題
        
        # 判斷是否為列表項
        is_list_item = line.startswith(('-', '•', '*')) or (line[0].isdigit() and '.' in line[:3])
        
        if is_heading:
            # 結束之前的列表（如果有）
            if current_list:
                html_parts.append(f'</{list_type}>')
                current_list = None
                list_type = None
            
            # 基於行長度猜測標題級別
            if len(line) < 20:
                html_parts.append(f'<h2>{line}</h2>')
            elif len(line) < 40:
                html_parts.append(f'<h3>{line}</h3>')
            else:
                html_parts.append(f'<h4>{line}</h4>')
        
        elif is_list_item:
            # 判斷列表類型
            if line[0].isdigit() and '.' in line[:3]:
                new_list_type = 'ol'
            else:
                new_list_type = 'ul'
            
            # 如果是新列表或列表類型變更
            if not current_list or list_type != new_list_type:
                # 結束之前的列表（如果有）
                if current_list:
                    html_parts.append(f'</{list_type}>')
                
                # 開始新列表
                list_type = new_list_type
                current_list = True
                html_parts.append(f'<{list_type}>')
            
            # 清理列表項文本
            if line.startswith(('-', '•', '*')):
                cleaned_text = line[1:].strip()
            elif line[0].isdigit() and '.' in line[:3]:
                cleaned_text = line[line.index('.')+1:].strip()
            else:
                cleaned_text = line
                
            html_parts.append(f'<li>{cleaned_text}</li>')
        
        else:
            # 結束之前的列表（如果有）
            if current_list:
                html_parts.append(f'</{list_type}>')
                current_list = None
                list_type = None
            
            html_parts.append(f'<p>{line}</p>')
    
    # 結束最後的列表（如果有）
    if current_list:
        html_parts.append(f'</{list_type}>')
    
    html_parts.append('</body></html>')
    return '\n'.join(html_parts)

def extract_title_and_summary(html_content: str) -> Tuple[str, str, List]:
    """
    從HTML內容中提取標題、摘要和段落
    :param html_content: HTML內容
    :return: (標題, 摘要, 段落列表)
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 提取標題（假設第一個h1或h2是標題）
    title_tag = soup.find(['h1', 'h2'])
    title = title_tag.get_text().strip() if title_tag else "未命名文章"
    
    # 從標題中移除日期部分
    title = re.sub(r'^\d{4}-\d{2}-\d{2}\s*-?\s*', '', title)
    
    # 提取段落
    paragraphs = []
    for p in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li']):
        paragraphs.append({
            'style': p.name,
            'text': p.get_text().strip()
        })
    
    # 提取摘要
    summary = ""
    MIN_SUMMARY_LENGTH = 30  # 摘要最小字數要求
    
    # 遍歷所有段落尋找適合的摘要
    for p in paragraphs:
        # 只考慮非標題的段落
        if p['style'] == 'p' and p['text']:
            current_text = p['text']
            
            # 檢查是否與標題相同或過於相似
            title_similarity = difflib.SequenceMatcher(None, title.lower(), current_text.lower()).ratio()
            
            # 如果段落文本與標題相似度低且長度足夠，則使用該段落作為摘要
            if title_similarity < 0.7 and len(current_text) >= MIN_SUMMARY_LENGTH:
                summary = current_text[:200] + "..." if len(current_text) > 200 else current_text
                break
            # 如果段落與標題相似或太短，但還沒有找到任何摘要，先保存下來
            elif not summary:
                summary = current_text[:200] + "..." if len(current_text) > 200 else current_text
    
    # 如果沒有找到合適的摘要，或摘要與標題過於相似、且太短，生成一個通用摘要
    if not summary or (difflib.SequenceMatcher(None, title.lower(), summary.lower()).ratio() > 0.8 and len(summary) < MIN_SUMMARY_LENGTH):
        # 嘗試從文章主體提取關鍵詞來增強摘要
        keywords = []
        for p in paragraphs:
            if p['style'] == 'p' and len(p['text']) > 20:
                # 嘗試使用jieba分詞，如果失敗則使用基本分詞
                try:
                    import jieba
                    jieba.setLogLevel(20)  # 設定日誌級別，抑制結巴的輸出信息
                    words = list(jieba.cut(p['text']))
                except ImportError:
                    words = p['text'].split()
                
                for word in words:
                    if len(word) > 1 and word not in ["的", "是", "在", "了", "和", "與", "或", "有", "為"]:
                        keywords.append(word)
                if len(keywords) >= 5:
                    break
        
        if keywords:
            keywords_text = "、".join(keywords[:5])
            summary = f"{title}：探討{keywords_text}等相關財稅知識"
        else:
            summary = f"{title} - 專業財稅知識分享"
    
    return title, summary, paragraphs

def extract_tags(html_content: str, title: str) -> List[str]:
    """
    從內容中提取標籤
    :param html_content: HTML內容
    :param title: 文章標題
    :return: 標籤列表
    """
    # 提取純文本
    soup = BeautifulSoup(html_content, 'html.parser')
    full_text = title + " " + soup.get_text()
    
    # 提取關鍵詞作為標籤
    keywords = []
    if USE_UTILS:
        # 如果有jieba詞典，設置它
        setup_jieba_dict()
        # 使用utils模組提取關鍵詞
        keywords = extract_keywords(full_text, 5)
        logger.info("使用utils模組提取關鍵詞")
    else:
        # 使用簡單的關鍵詞提取 - 根據常見財稅相關詞彙
        common_keywords = [
            "稅務", "會計", "財務", "企業", "記帳", "報稅", "節稅", "創業", 
            "公司", "規劃", "資本", "管理", "勞工", "營業", "行號", "合夥",
            "統一發票", "加值型營業稅", "所得稅", "財產交易", "投資", "營利事業所得稅"
        ]
        
        for keyword in common_keywords:
            if keyword in full_text and len(keywords) < 5:
                keywords.append(keyword)
        
        logger.info("使用內建方法提取關鍵詞")
    
    # 如果沒有找到關鍵詞，使用默認值
    if not keywords:
        keywords = ["財稅", "會計", "企業"]
    
    return keywords

def determine_category(html_content: str) -> Tuple[str, str]:
    """
    根據文章內容確定分類
    :param html_content: HTML內容
    :return: (主要分類中文名, 分類代碼)
    """
    # 提取純文本
    soup = BeautifulSoup(html_content, 'html.parser')
    text = soup.get_text()
    
    # 計算各個分類關鍵詞出現的次數
    category_scores = {
        "稅務相關": 0,
        "會計記帳": 0,
        "企業經營": 0,
        "投資理財": 0,
        "創業資訊": 0,
        "跨境稅務": 0
    }
    
    # 關鍵詞列表
    keywords = {
        "稅務相關": ["稅", "報稅", "節稅", "稅務", "稅收", "所得稅", "營業稅", "扣繳", "稅法", "免稅", "減稅", "申報"],
        "會計記帳": ["會計", "記帳", "帳務", "財報", "憑證", "審計", "財務報表", "會計師", "傳票", "分錄", "帳簿"],
        "企業經營": ["企業", "公司", "經營", "管理", "營運", "商業", "策略", "執行長", "績效", "組織"],
        "投資理財": ["財務", "規劃", "投資", "理財", "資產", "負債", "現金流", "財富", "報酬", "風險", "股票", "基金"],
        "創業資訊": ["創業", "新創", "新創事業", "創業家", "募資", "新創團隊", "創辦人", "種子輪", "天使輪"],
        "跨境稅務": ["國際", "跨境", "海外", "境外", "外國", "全球", "雙重課稅", "租稅協定", "常設機構", "避稅天堂"]
    }
    
    # 統計關鍵詞出現次數
    for category, words in keywords.items():
        for word in words:
            count = text.count(word)
            if count > 0:
                category_scores[category] += count
    
    # 輸出各類別得分
    logger.info("分類得分:")
    for category, score in category_scores.items():
        logger.info(f"  {category}: {score}")
    
    # 選取得分最高的類別
    primary_category = max(category_scores.items(), key=lambda x: x[1])[0]
    
    # 如果沒有明確的類別，默認為稅務相關
    if category_scores[primary_category] == 0:
        primary_category = "稅務相關"
    
    # 獲取分類代碼
    category_map = {
        "稅務相關": "tax",
        "會計記帳": "accounting",
        "企業經營": "business",
        "投資理財": "investment",
        "創業資訊": "startup",
        "跨境稅務": "international"
    }
    
    category_code = category_map.get(primary_category, "tax")
    logger.info(f"確定分類: {primary_category} ({category_code})")
    
    return primary_category, category_code

def select_image_for_article(category: str, tags: List[str], title: str) -> str:
    """
    智能選擇文章圖片，基於文章分類
    :param category: 文章分類
    :param tags: 文章標籤 (不使用)
    :param title: 文章標題 (不使用)
    :return: 圖片路徑
    """
    # 圖片目錄路徑
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
    images_dir = os.path.join(project_root, "assets/images/blog")
    
    # 設置默認圖片路徑
    default_image = "/assets/images/blog/default.jpg"
    
    # 如果目錄不存在，直接使用默認圖片
    if not os.path.exists(images_dir):
        logger.warning(f"圖片目錄不存在: {images_dir}")
        return default_image
    
    # 獲取所有可用圖片
    all_images = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not all_images:
        logger.warning("圖片目錄中沒有圖片")
        return default_image
    
    # 1. 優先檢查是否存在與分類相關的圖片 (category_*.jpg)
    category_images = [img for img in all_images if img.lower().startswith(f"{category}_")]
    
    # 2. 如果找到與分類相關的圖片，從中隨機選擇一張
    if category_images:
        selected_image = random.choice(category_images)
        logger.info(f"從分類圖片中隨機選擇: {selected_image}")
        return f"/assets/images/blog/{selected_image}"
    
    # 3. 檢查是否有分類默認圖片
    category_default = f"{category}_default.jpg"
    if category_default in all_images:
        logger.info(f"使用分類默認圖片: {category_default}")
        return f"/assets/images/blog/{category_default}"
    
    # 4. 檢查是否有通用默認圖片
    if "default.jpg" in all_images:
        logger.info("使用通用默認圖片: default.jpg")
        return default_image
    
    # 5. 如果以上都沒有，從所有圖片中隨機選擇
    selected_image = random.choice(all_images)
    logger.info(f"從所有圖片中隨機選擇: {selected_image}")
    return f"/assets/images/blog/{selected_image}"

def slugify(text: str) -> str:
    """
    將文本轉換為 URL 友好的格式 - 使用翻譯字典
    :param text: 要轉換的文本
    :return: URL 友好的字符串
    """
    logger.info(f"開始處理標題: {text}")
    
    # 內建基本字典作為備用
    base_replacements = {
        '台灣': 'taiwan',
        '創業': 'startup',
        '指南': 'guide',
        '會計': 'accounting',
        '會計師': 'accountant',
        '角色': 'role',
        '價值': 'value',
        '財務': 'finance',
        '稅務': 'tax',
        '申報': 'filing',
        '公司': 'company',
        '規劃': 'planning',
        '管理': 'management',
        '合夥人': 'partner',
        '初期': 'early-stage',
        '資本': 'capital',
        '貸款': 'loan',
        '銀行': 'bank',
        '必知': 'essential',
        '老闆': 'boss',
        '勞工': 'labor',
        '設定': 'setting',
        '攻略': 'guide',
        '法規': 'regulations',
        '全攻略': 'complete-guide',
        '選擇': 'choice',
        '發票': 'invoice',
        '所得稅': 'income-tax',
        '營業稅': 'business-tax',
        '制度': 'system',
        '登記': 'registration',
        '簽證': 'certificate',
        '組織': 'organization',
        '型態': 'type',
        '行號': 'business-entity',
        '營業': 'business'
    }
    
    # 如果有翻譯字典，優先使用
    slug = text.lower()
    replaced = False
    
    # 首先嘗試使用翻譯字典
    if TRANSLATION_DICT:
        logger.info("使用翻譯字典進行轉換")
        # 按詞彙長度排序，優先替換較長的詞彙
        sorted_dict = sorted(TRANSLATION_DICT.items(), key=lambda x: len(x[0]), reverse=True)
        
        for zh, en in sorted_dict:
            if zh.lower() in slug:
                replaced_text = slug.replace(zh.lower(), f"{en}-")
                if replaced_text != slug:
                    replaced = True
                    slug = replaced_text
                    logger.info(f"使用翻譯字典替換: {zh} -> {en}")
    
    # 如果沒有使用翻譯字典或替換不完全，使用基本替換
    if not replaced or len(slug) > 50:  # 如果結果還是太長，使用基本替換
        logger.info("使用基本替換進行轉換")
        new_slug = slug
        for zh, en in base_replacements.items():
            if zh in new_slug:
                new_slug = new_slug.replace(zh, f"{en}-")
                logger.info(f"使用基本替換: {zh} -> {en}")
        slug = new_slug
    
    # 移除標點符號和特殊字符
    slug = re.sub(r'[^\w\s-]', '', slug)
    # 將空格轉換為連字符
    slug = re.sub(r'[\s_]+', '-', slug)
    # 移除開頭和結尾的連字符
    slug = re.sub(r'^-+|-+$', '', slug)
    # 移除重複的連字符
    slug = re.sub(r'-+', '-', slug)
    
    # 移除非ASCII字符
    ascii_slug = ''
    for c in slug:
        if ord(c) < 128:
            ascii_slug += c
    slug = ascii_slug
    
    # 如果處理後為空，使用默認值
    if not slug:
        logger.warning("處理後的標題為空，使用默認值'article'")
        slug = "article"
    
    # 截斷過長的slug
    if len(slug) > 80:
        slug = slug[:80]
        logger.info("標題過長，已截斷")
    
    logger.info(f"處理後的標題: {slug}")
    return slug

def generate_tag_links(tags: List[str]) -> str:
    """
    生成標籤鏈接HTML
    :param tags: 標籤列表
    :return: HTML標籤鏈接
    """
    tag_links = []
    for tag in tags:
        slug = slugify(tag)
        tag_links.append(f'<a href="/blog.html?tag={slug}" class="article-tag">{tag}</a>')
    return '\n          '.join(tag_links)

def generate_html(title: str, html_content: str, tags: List[str], 
                 date: str, summary: str, primary_category: str, category_code: str) -> str:
    """
    生成最終的HTML文件，適合網站使用
    :param title: 文章標題
    :param html_content: HTML內容
    :param tags: 標籤列表
    :param date: 發布日期
    :param summary: 文章摘要
    :param primary_category: 主要分類名稱
    :param category_code: 分類代碼
    :return: 完整HTML
    """
    # 為文章選擇適合的圖片
    image_path = select_image_for_article(category_code, tags, title)
    
    # 生成檔案名
    slug = slugify(title)
    file_name = f"{date}-{slug}.html"
    
    # 生成相對 URL 路徑
    relative_url = f"/blog/{file_name}"
    
    # 處理HTML內容
    if html_content.startswith(('<!DOCTYPE', '<html')):
        # 提取body內容
        soup = BeautifulSoup(html_content, 'html.parser')
        body = soup.find('body')
        if body:
            # 清理標題中的 # 符號和 Markdown 粗體標記
            for header in body.select('h1, h2, h3, h4, h5, h6'):
                # 清理標題前的#符號
                header_text = header.get_text()
                header_text = re.sub(r'^#+\s*', '', header_text)
                # 清理粗體標記
                header_text = re.sub(r'\*\*(.*?)\*\*', r'\1', header_text)
                header.string = header_text.strip() if header_text else ''
            
            # 清理段落中的Markdown粗體標記
            for p in body.select('p, li'):
                p_text = p.get_text()
                p_text = re.sub(r'\*\*(.*?)\*\*', r'\1', p_text)
                p.string = p_text.strip() if p_text else ''
            
            # 檢查並移除與文章標題重複的標題
            first_header = body.select_one('h1:first-child, h2:first-child')
            if first_header and first_header.text.strip().lower() == title.strip().lower():
                first_header.decompose()
            
            # 獲取清理後的內容
            body_content = ''.join(str(tag) for tag in body.contents)
        else:
            body_content = html_content
    else:
        # 如果不是完整HTML，直接使用
        body_content = html_content
        
        # 嘗試清理文字內容中的標題前缀和Markdown格式
        body_content = re.sub(r'<(h[1-6])>#+\s*', r'<\1>', body_content)
        body_content = re.sub(r'<(p|li|h[1-6])>\*\*(.*?)\*\*</\1>', r'<\1>\2</\1>', body_content)
    
    # 創建網站格式的HTML
    template = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{summary}" />
  <title>{title} | 霍爾果斯會計師事務所</title>
  
  <!-- Favicon -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  
  <!-- Material Symbols 圖示庫 -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  
  <!-- 引用全站共用樣式 -->
  <link rel="stylesheet" href="/assets/css/common.css" />
  <link rel="stylesheet" href="/assets/css/navbar.css" />
  <link rel="stylesheet" href="/assets/css/footer.css" />
  
  <!-- 新增: 首頁特定樣式 - 用於流動式設計 -->
  <link rel="stylesheet" href="/assets/css/index-style.css" />
  
  <!-- 移動版導航欄樣式 -->
  <link rel="stylesheet" href="/assets/css/mobile-navbar.css" />
  
  <!-- 文章內頁專用現代化樣式 -->
  <link rel="stylesheet" href="/assets/css/blog-article-modern.css" />
  
  <!-- Google 分析 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-RKMCS9WVS5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-RKMCS9WVS5');
  </script>
  
  <!-- 結構化資料 -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "{title}",
    "description": "{summary}",
    "image": "https://www.horgoscpa.com{image_path}",
    "datePublished": "{date}",
    "dateModified": "{date}",
    "author": {{
      "@type": "Person",
      "name": "霍爾果斯會計師事務所",
      "url": "https://www.horgoscpa.com/team.html"
    }},
    "publisher": {{
      "@type": "Organization",
      "name": "霍爾果斯會計師事務所",
      "logo": {{
        "@type": "ImageObject",
        "url": "https://www.horgoscpa.com/assets/images/logo.png"
      }}
    }},
    "mainEntityOfPage": {{
      "@type": "WebPage",
      "@id": "https://www.horgoscpa.com{relative_url}"
    }},
    "keywords": "{', '.join(tags)}"
  }}
  </script>
</head>
<body>

<!-- 導航欄 -->
<nav class="site-nav">
  <div class="nav-container">
    <div class="logo">
      <a href="/index.html">
        <div class="logo-container">
          <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img">
          <div class="logo-sub">HorgosCPA</div>
        </div>
      </a>
    </div>
    <input type="checkbox" id="nav-toggle" class="nav-toggle">
    <label for="nav-toggle" class="nav-toggle-label">
      <span></span>
    </label>
    <ul class="nav-menu">
      <li><a href="/services.html">專業服務</a></li>
      <li><a href="/team.html">專業團隊</a></li>
      <li><a href="/blog.html" class="active">專欄文章</a></li>
      <li><a href="/faq.html">常見問題</a></li>
      <li><a href="/video.html">影音專區</a></li>
      <li><a href="/contact.html">聯繫我們</a></li>
      <li><a href="/booking.html" class="nav-consult-btn">免費諮詢</a></li>
    </ul>
  </div>
</nav>

<!-- 移動版導航欄 -->
<div class="mobile-navbar" style="display: none;">
  <div class="mobile-nav-container">
    <div class="mobile-menu-btn" id="mobileMenuBtn">
      <span class="material-symbols-rounded">menu</span>
    </div>
    <div class="logo">
      <a href="/index.html">
        <div class="logo-container">
          <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img">
          <div class="logo-sub">HorgosCPA</div>
        </div>
      </a>
    </div>
    <div class="mobile-nav-spacer"></div>
  </div>
  
  <div class="mobile-menu" id="mobileMenu">
    <ul class="mobile-menu-links">
      <li><a href="/services.html" class="mobile-nav-link">專業服務</a></li>
      <li><a href="/team.html" class="mobile-nav-link">專業團隊</a></li>
      <li><a href="/blog.html" class="mobile-nav-link">專欄文章</a></li>
      <li><a href="/faq.html" class="mobile-nav-link">常見問題</a></li>
      <li><a href="/video.html" class="mobile-nav-link">影音專區</a></li>
      <li><a href="/contact.html" class="mobile-nav-link">聯繫我們</a></li>
      <li><a href="/booking.html" class="mobile-consult-btn">免費諮詢</a></li>
    </ul>
  </div>
</div>

<!-- 文章內容主體區塊 -->
<section class="article-content-section">
  <div class="article-container">
    <!-- 文章卡片 -->
    <article class="article-card">
      <!-- 文章元數據 -->
      <div class="article-meta">
        <div class="article-date">
          <span class="material-symbols-rounded">calendar_month</span>
          {date}
        </div>
        <a href="/blog.html?category={category_code}" class="article-category">
          <span class="material-symbols-rounded">sell</span>
          {primary_category}
        </a>
      </div>
      
      <!-- 文章標題區 -->
      <div class="article-header-main">
        <h1 class="article-title">{title}</h1>
      </div>
      
      <!-- 文章內容主體 -->
      <div class="article-body">
{body_content}
      </div>
      
      <!-- 文章標籤 -->
      <div class="article-footer">
        <div class="article-tags">
          {generate_tag_links(tags)}
        </div>
      </div>
    </article>
    
    <!-- 簡化後的文章導航 - 只保留返回部落格按鈕 -->
    <div class="article-navigation">
      <a href="/blog.html" class="back-to-blog">
        <span class="material-symbols-rounded">view_list</span>
        返回文章列表
      </a>
    </div>
  </div>
</section>

<!-- 頁尾區域 -->
<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-content">
      <!-- Logo與簡介 -->
      <div class="footer-logo">
        <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="footer-logo-img">
        <div class="logo-sub" style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 15px;">HorgosCPA</div>
        <p>專業、誠信、創新的財稅顧問夥伴，致力於提供企業與個人最優質的財務與稅務解決方案。</p>
        <!-- 新增LINE按鈕 -->
        <a href="https://line.me/R/ti/p/@208ihted" target="_blank" class="footer-line-btn">
          <span class="line-icon"></span>
          <span>加入LINE好友</span>
        </a>
      </div>
      
      <!-- 聯絡資訊 -->
      <div class="footer-contact">
        <h3>聯絡我們</h3>
        <ul class="contact-info">
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">location_on</span></i>
            <span>台中市西區建國路21號3樓之1</span>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">call</span></i>
            <a href="tel:+886422205606">04-2220-5606</a>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">schedule</span></i>
            <span>週一至週五 8:30-17:30</span>
          </li>
          <li>
            <i class="icon-contact"><span class="material-symbols-rounded">mail</span></i>
            <a href="mailto:contact@horgoscpa.com">contact@horgoscpa.com</a>
          </li>
        </ul>
      </div>
      
      <!-- 快速連結 -->
      <div class="footer-links">
        <h3>快速連結</h3>
        <ul class="quick-links">
          <li><a href="/index.html"><span class="material-symbols-rounded icon-link">home</span> 首頁</a></li>
          <li><a href="/team.html"><span class="material-symbols-rounded icon-link">groups</span> 專業團隊</a></li>
          <li><a href="/blog.html"><span class="material-symbols-rounded icon-link">article</span> 專欄文章</a></li>
          <li><a href="/faq.html"><span class="material-symbols-rounded icon-link">help</span> 常見問題</a></li>
          <li><a href="/video.html"><span class="material-symbols-rounded icon-link">play_circle</span> 影音專區</a></li>
          <li><a href="/contact.html"><span class="material-symbols-rounded icon-link">contact_mail</span> 聯絡資訊</a></li>
        </ul>
      </div>
      
      <!-- 服務項目 - 更新為與首頁一致 -->
      <div class="footer-services">
        <h3>服務項目</h3>
        <ul class="services-list">
          <li><a href="/services/consulting.html"><span class="material-symbols-rounded icon-link">store</span> 工商登記</a></li>
          <li><a href="/services/accounting.html"><span class="material-symbols-rounded icon-link">account_balance_wallet</span> 帳務處理</a></li>
          <li><a href="/services/tax.html"><span class="material-symbols-rounded icon-link">payments</span> 稅務申報</a></li>
          <li><a href="/services/audit.html"><span class="material-symbols-rounded icon-link">verified</span> 財稅簽證</a></li>
          <li><a href="/booking.html"><span class="material-symbols-rounded icon-link">event_available</span> 預約諮詢</a></li>
        </ul>
      </div>
    </div>
    
    <!-- 版權資訊 -->
    <div class="footer-bottom">
      <div class="footer-text">
        <p>&copy; 2025 霍爾果斯會計師事務所</p>
      </div>
    </div>
  </div>
  
  <!-- 返回頂部按鈕 -->
  <div class="back-to-top">
    <span class="material-symbols-rounded">arrow_upward</span>
  </div>
</footer>

<!-- 返回頂部按鈕功能 - 腳本 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    // 返回頂部按鈕功能
    const backToTopButton = document.querySelector('.back-to-top');
    
    // 初始隱藏按鈕
    backToTopButton.classList.remove('visible');
    
    // 監聽滾動事件
    window.addEventListener('scroll', function() {{
      if (window.pageYOffset > 300) {{
        backToTopButton.classList.add('visible');
      }} else {{
        backToTopButton.classList.remove('visible');
      }}
    }});
    
    // 點擊事件
    backToTopButton.addEventListener('click', function() {{
      window.scrollTo({{
        top: 0,
        behavior: 'smooth'
      }});
    }});
    
    // 清理可能的格式問題
    (function cleanupArticleContent() {{
      // 移除標題前的 # 符號
      const headers = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6');
      headers.forEach(header => {{
        header.innerHTML = header.innerHTML.replace(/^#+\s*/, '');
      }});
      
      // 移除粗體標記符號
      const allElements = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3, .article-body p, .article-body li');
      allElements.forEach(el => {{
        el.innerHTML = el.innerHTML.replace(/\*\*(.*?)\*\*/g, '$1');
      }});
      
      // 如果第一個標題與文章標題相同，則隱藏
      const firstHeader = document.querySelector('.article-body h1:first-child, .article-body h2:first-child');
      const articleTitle = document.querySelector('.article-title');
      
      if (firstHeader && articleTitle && 
          firstHeader.textContent.trim().toLowerCase() === articleTitle.textContent.trim().toLowerCase()) {{
        firstHeader.style.display = 'none';
      }}
    }})();
  }});
</script>

<!-- 導航欄功能腳本 -->
<script src="/assets/js/navbar.js"></script>

<!-- 移動版導航欄功能腳本 -->
<script src="/assets/js/mobile-navbar.js"></script>

<!-- 文章閱讀進度指示器 -->
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    // 創建閱讀進度條
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'reading-progress';
    progressIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 4px;
      background: var(--secondary-color);
      width: 0%;
      z-index: 1001;
      transition: width 0.2s ease;
    `;
    document.body.appendChild(progressIndicator);
    
    // 計算閱讀進度
    function updateReadingProgress() {{
      const articleContent = document.querySelector('.article-card');
      if (!articleContent) return;
      
      const contentHeight = articleContent.offsetHeight;
      const contentTop = articleContent.offsetTop;
      const contentBottom = contentTop + contentHeight;
      const currentPosition = window.scrollY + window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // 考慮視窗大小，確保內容完全可見時進度為100%
      let progress = 0;
      if (currentPosition > contentTop) {{
        progress = Math.min(100, ((currentPosition - contentTop) / (contentHeight)) * 100);
      }}
      
      progressIndicator.style.width = `${{progress}}%`;
      
      // 當閱讀完畢時添加動畫效果
      if (progress >= 99) {{
        progressIndicator.style.transition = 'width 0.5s ease, opacity 1s ease';
        progressIndicator.style.opacity = '0.5';
      }} else {{
        progressIndicator.style.transition = 'width 0.2s ease';
        progressIndicator.style.opacity = '1';
      }}
    }}
    
    // 滾動時更新進度
    window.addEventListener('scroll', updateReadingProgress);
    window.addEventListener('resize', updateReadingProgress);
    
    // 初始化進度
    updateReadingProgress();
  }});
</script>

</body>
</html>"""
    
    return template

def process_word_file(docx_path: str, output_dir: str) -> Dict:
    """
    處理單個Word文件的完整流程
    :param docx_path: Word文檔路徑
    :param output_dir: 輸出目錄
    :return: 處理結果
    """
    try:
        # 1. 提取文件名資訊
        filename = os.path.basename(docx_path)
        logger.info(f"開始處理文件: {filename}")
        
        # 從文件名提取日期
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        date = date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")
        
        # 2. 多方法提取內容
        extraction_results = extract_content_multi_method(docx_path)
        
        # 3. 驗證內容完整性
        validation_results = validate_extraction_completeness(extraction_results)
        
        # 4. 融合最完整的內容
        merged_content = merge_extraction_results(extraction_results, validation_results)
        
        # 5. 從內容中提取標題和摘要
        title, summary, paragraphs = extract_title_and_summary(merged_content)
        
        # 6. 從內容分析提取主題分類和標籤
        primary_category, category_code = determine_category(merged_content)
        tags = extract_tags(merged_content, title)
        
        # 7. 生成最終HTML
        final_html = generate_html(
            title=title,
            html_content=merged_content,
            tags=tags,
            date=date,
            summary=summary,
            primary_category=primary_category,
            category_code=category_code
        )
        
        # 8. 生成友好的URL
        slug = slugify(title)
        file_name = f"{date}-{slug}.html"
        
        # 9. 寫入文件
        output_path = os.path.join(output_dir, file_name)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        logger.info(f"成功將 {filename} 轉換為 {file_name}")
        logger.info(f"標題: {title}")
        logger.info(f"分類: {primary_category} ({category_code})")
        logger.info(f"標籤: {', '.join(tags)}")
        
        return {
            'success': True,
            'output_file': file_name,
            'title': title,
            'metadata': {
                'date': date,
                'summary': summary,
                'primary_category': primary_category,
                'category_code': category_code,
                'tags': tags
            }
        }
        
    except Exception as e:
        logger.error(f"處理 {docx_path} 時出錯: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'docx_path': docx_path
        }

def process_word_files(input_dir: str, output_dir: str) -> List[Dict]:
    """
    處理指定目錄中的Word文檔，轉換為HTML
    :param input_dir: 輸入目錄
    :param output_dir: 輸出目錄
    :return: 處理結果列表
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 獲取所有Word文檔
    docx_files = [f for f in os.listdir(input_dir) 
                 if f.lower().endswith('.docx') and not f.startswith('~)]  # 排除臨時檔案
    
    if not docx_files:
        logger.warning(f"在 {input_dir} 中沒有找到Word文檔")
        return []
    
    logger.info(f"找到 {len(docx_files)} 個Word文檔")
    
    # 處理每個Word文檔
    results = []
    for idx, docx_file in enumerate(docx_files, 1):
        docx_path = os.path.join(input_dir, docx_file)
        logger.info(f"處理第 {idx}/{len(docx_files)} 個文件: {docx_file}")
        
        result = process_word_file(docx_path, output_dir)
        results.append(result)
        
        # 記錄進度
        success_count = sum(1 for r in results if r['success'])
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    # 檢查命令行參數
    if len(sys.argv) < 3:
        print("用法: python word_to_html.py <輸入目錄> <輸出目錄>")
        print("例如: python word_to_html.py word-docs blog")
        return 1
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    # 記錄參數
    logger.info(f"輸入目錄: {input_dir}")
    logger.info(f"輸出目錄: {output_dir}")
    
    # 如果有utils模組，使用它來設置詞典
    if USE_UTILS:
        setup_jieba_dict()
        logger.info("已設置jieba詞典")
    
    # 處理Word文檔
    logger.info("====== Word轉HTML處理開始 ======")
    results = process_word_files(input_dir, output_dir)
    
    # 輸出總結
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