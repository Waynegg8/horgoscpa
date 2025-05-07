#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
標籤生成器 - 為文章生成專業標籤
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
import jieba  # tag_generator.py需要
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from bs4 import BeautifulSoup

# 設置日誌
def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"tag_generator_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("tag_generator")

logger = setup_logging()

# 台灣財稅專業詞彙字典路徑
TRANSLATION_DICT_FILE = "tw_financial_dict.json"

# 標籤生成配置
MAX_TAGS = 3  # 每篇文章最多生成的標籤數量

# 停用詞列表
STOP_WORDS = ["的", "是", "在", "了", "和", "與", "或", "及", "等", "有", "都", "也", 
              "這", "那", "這個", "那個", "您", "我們", "可以", "將會", "如果", "因為", "所以"]

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

def extract_article_text(soup: BeautifulSoup) -> Dict[str, str]:
    """
    從HTML中提取文章結構化文本內容
    返回包含標題、摘要、內容的字典
    """
    result = {
        "title": "",
        "summary": "",
        "content": ""
    }
    
    # 提取標題
    h1 = soup.find('h1')
    if h1:
        result["title"] = h1.get_text().strip()
    
    # 提取摘要
    summary = soup.find('meta', {'name': 'description'})
    if summary and summary.get('content'):
        result["summary"] = summary.get('content')
    else:
        # 嘗試從第一段落獲取摘要
        first_p = soup.find('p')
        if first_p:
            result["summary"] = first_p.get_text().strip()
    
    # 提取內容
    article = soup.find('article')
    if article:
        paragraphs = article.find_all(['p', 'h2', 'h3', 'h4', 'li'])
        result["content"] = " ".join([p.get_text().strip() for p in paragraphs])
    
    return result

def setup_jieba():
    """設置結巴分詞"""
    jieba.setLogLevel(20)  # 抑制jieba日誌輸出
    
    # 載入翻譯字典中的詞彙到jieba
    translation_dict = load_translation_dict()
    for word in translation_dict.keys():
        jieba.add_word(word)
    
    logger.info("結巴分詞設置完成")

def get_category_related_terms(category_info: Dict) -> List[str]:
    """獲取與分類相關的專業詞彙"""
    # 定義各分類的相關詞彙
    category_terms = {
        "稅務服務": ["稅務", "稅法", "報稅", "扣繳", "節稅", "稅額", "稅率"],
        "所得稅務": ["所得稅", "綜所稅", "營所稅", "扣繳", "稅額", "扣除額"],
        "營業稅務": ["營業稅", "加值型", "發票", "銷項", "進項"],
        "遺產贈與": ["遺產", "贈與", "繼承", "遺囑", "遺贈", "財產移轉"],
        "不動產稅務": ["房地合一", "土增稅", "房屋稅", "地價稅", "不動產"],
        "國際稅務": ["跨境", "海外", "國外所得", "外國", "國際", "居住者"],
        "稅務爭議": ["稅務爭議", "行政救濟", "復查", "訴願", "補稅"],
        "稅務規劃": ["節稅", "租稅規劃", "租稅優惠", "稅負", "最適化"],
        "結算申報": ["結算申報", "年度申報", "決算", "盈餘", "分配"],
        
        "會計服務": ["會計", "記帳", "帳務", "財報", "憑證", "審計"],
        "日常記帳": ["記帳", "帳務", "憑證", "傳票", "分錄", "帳冊"],
        "財報編製": ["財務報表", "資產負債表", "損益表", "現金流量表"],
        "會計準則": ["IFRS", "準則", "會計原則", "公報", "財務報告"],
        "成本會計": ["成本", "成本計算", "成本分析", "預算", "分攤"],
        "非營利會計": ["非營利", "協會", "基金會", "社團", "公益"],
        
        "工商服務": ["工商", "登記", "設立", "變更", "公司"],
        "公司設立": ["公司設立", "設立登記", "創立", "籌備", "發起人"],
        "變更登記": ["變更", "董事", "監察人", "地址", "資本額"],
        "企業重組": ["重組", "改制", "組織調整", "資本變更", "增資"],
        "工商登記": ["工商登記", "行號", "執照", "商業登記", "立案"],
        "股務作業": ["股務", "股東", "股票", "股利", "股東會"],
        
        "審計服務": ["審計", "簽證", "查核", "確信", "內控"],
        "財務簽證": ["簽證", "財務報表查核", "會計師", "查核", "意見"],
        "內部控制": ["內部控制", "稽核", "制度設計", "內控", "風險評估"],
        "專案審查": ["專案", "調查", "盡職調查", "特定用途", "核實"],
        
        "管理顧問": ["管理", "顧問", "諮詢", "策略", "規劃"],
        "企業管理": ["經營", "管理", "營運", "策略", "執行", "績效"],
        "財務分析": ["財務", "分析", "報表分析", "比率", "獲利"],
        "投資評估": ["投資", "評估", "報酬率", "風險", "淨現值"],
        "電子商務": ["電商", "網路", "平台", "數位", "線上", "跨境電商"],
        "成本控制": ["成本", "費用", "預算", "控制", "效益", "支出"],
        
        "人事顧問": ["人事", "人力", "員工", "勞工", "福利"],
        "薪資管理": ["薪資", "薪酬", "獎金", "年終獎金", "加班費"],
        "勞健保事務": ["勞保", "健保", "勞退", "二代健保", "補充保費"],
        
        "財富管理": ["財富", "管理", "資產", "配置", "規劃"],
        "財產規劃": ["財產", "資產", "配置", "規劃", "傳承"],
        "家族企業": ["家族", "傳承", "接班", "繼承", "股權移轉"],
        "退休規劃": ["退休", "退休金", "老年", "養老", "年金"],
        "投資組合": ["投資組合", "資產配置", "多元投資", "風險分散"],
        "保險規劃": ["保險", "壽險", "醫療險", "意外險", "保單"],
        "信託服務": ["信託", "受託人", "委託人", "受益人", "財產權"]
    }
    
    # 獲取主分類和子分類
    main_category = category_info.get("main_category", "")
    subcategory = category_info.get("subcategory", "")
    
    # 合併主分類和子分類的相關詞彙
    related_terms = []
    if main_category in category_terms:
        related_terms.extend(category_terms[main_category])
    if subcategory in category_terms:
        related_terms.extend(category_terms[subcategory])
    
    # 去重
    related_terms = list(set(related_terms))
    
    return related_terms

def generate_tags(article_text: Dict, category_info: Dict, translation_dict: Dict) -> List[Dict]:
    """
    生成文章標籤
    返回標籤列表，每個標籤包含中文名稱和英文slug
    """
    logger.info("開始生成文章標籤")
    
    # 合併標題、摘要和內容，但對標題和摘要賦予更高權重
    weighted_text = (
        article_text["title"] + " " + article_text["title"] + " " + 
        article_text["summary"] + " " + 
        article_text["content"]
    )
    
    # 使用jieba分詞
    words = list(jieba.cut(weighted_text))
    
    # 過濾停用詞並統計詞頻
    word_freq = {}
    for word in words:
        if word in STOP_WORDS or len(word) < 2:
            continue
        word_freq[word] = word_freq.get(word, 0) + 1
    
    # 獲取與分類相關的詞彙
    category_terms = get_category_related_terms(category_info)
    
    # 詞彙權重調整
    for word in list(word_freq.keys()):
        # 標題中出現的詞彙權重加倍
        if word in article_text["title"]:
            word_freq[word] *= 2
        
        # 摘要中出現的詞彙權重增加
        if word in article_text["summary"]:
            word_freq[word] *= 1.5
        
        # 分類相關詞彙權重增加
        if word in category_terms:
            word_freq[word] *= 2
        
        # 翻譯字典中的詞彙權重增加
        if word in translation_dict:
            word_freq[word] *= 1.5
    
    # 按權重排序詞彙
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    
    # 提取候選標籤
    candidate_tags = [word for word, _ in sorted_words[:10]]
    
    # 1. 確保至少有一個與主分類相關的標籤
    final_tags = []
    main_category = category_info.get("main_category", "")
    main_category_terms = get_category_related_terms({"main_category": main_category, "subcategory": ""})
    
    main_category_tag_found = False
    for tag in candidate_tags:
        if any(term in tag for term in main_category_terms) and not main_category_tag_found:
            final_tags.append(tag)
            main_category_tag_found = True
            break
    
    # 如果沒有找到與主分類相關的標籤，使用主分類名稱
    if not main_category_tag_found:
        final_tags.append(main_category)
    
    # 2. 添加與子分類相關的標籤
    subcategory = category_info.get("subcategory", "")
    subcategory_tag_found = False
    
    for tag in candidate_tags:
        if tag in final_tags:
            continue
        
        if tag == subcategory or subcategory in tag:
            final_tags.append(tag)
            subcategory_tag_found = True
            break
    
    # 3. 添加其他高權重標籤，直到達到最大標籤數量
    for tag in candidate_tags:
        if tag in final_tags:
            continue
        
        if len(final_tags) < MAX_TAGS:
            final_tags.append(tag)
        else:
            break
    
    # 將中文標籤轉換為包含英文slug的完整標籤
    result_tags = []
    for tag in final_tags:
        # 查找翻譯字典中的對應英文slug
        if tag in translation_dict:
            slug = translation_dict[tag].lower().replace(' ', '-')
        else:
            # 如果沒有對應翻譯，生成簡單的slug
            slug = "tag-" + re.sub(r'[^\w]', '', tag.lower())
        
        result_tags.append({
            "name": tag,
            "slug": slug
        })
    
    logger.info(f"生成了 {len(result_tags)} 個標籤: {[t['name'] for t in result_tags]}")
    return result_tags

def update_metadata(meta_path: str, tags: List[Dict]) -> bool:
    """更新元數據文件，添加標籤信息"""
    try:
        # 載入原有元數據
        metadata = load_metadata(meta_path)
        if not metadata:
            return False
        
        # 添加標籤信息
        metadata["tags"] = tags
        
        # 保存更新後的元數據
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"成功更新元數據: {meta_path}")
        return True
    except Exception as e:
        logger.error(f"更新元數據失敗: {meta_path}, 錯誤: {str(e)}")
        return False

def process_article(html_path: str) -> Dict:
    """處理單篇文章的標籤生成"""
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
    
    # 檢查元數據中是否有分類信息
    if "classification" not in metadata:
        logger.error(f"元數據中缺少分類信息: {meta_path}")
        return {
            'success': False,
            'html_path': html_path,
            'error': '元數據中缺少分類信息'
        }
    
    # 提取文章文本
    article_text = extract_article_text(soup)
    
    # 載入翻譯字典
    translation_dict = load_translation_dict()
    
    # 生成標籤
    tags = generate_tags(article_text, metadata["classification"], translation_dict)
    
    # 更新元數據
    if update_metadata(meta_path, tags):
        return {
            'success': True,
            'html_path': html_path,
            'meta_path': meta_path,
            'tags': [t['name'] for t in tags]
        }
    else:
        return {
            'success': False,
            'html_path': html_path,
            'error': '更新元數據失敗'
        }

def process_all_articles(blog_dir: str) -> List[Dict]:
    """處理目錄中的所有HTML文章"""
    # 設置結巴分詞
    setup_jieba()
    
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
        result = process_article(html_file)
        results.append(result)
        
        # 顯示進度
        success_count = sum(1 for r in results if r.get('success', False))
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    if len(sys.argv) < 2:
        print("用法: python tag_generator.py <博客目錄>")
        print("例如: python tag_generator.py blog")
        return 1
    
    blog_dir = sys.argv[1]
    
    logger.info(f"博客目錄: {blog_dir}")
    
    logger.info("====== 標籤生成處理開始 ======")
    results = process_all_articles(blog_dir)
    
    success_count = sum(1 for r in results if r.get('success', False))
    fail_count = len(results) - success_count
    
    logger.info("====== 處理完成 ======")
    logger.info(f"總計處理: {len(results)} 個文件")
    logger.info(f"成功生成標籤: {success_count} 個文件")
    logger.info(f"失敗: {fail_count} 個文件")
    
    if fail_count > 0:
        logger.warning("以下文件處理失敗:")
        for r in results:
            if not r.get('success', False):
                logger.warning(f"  - {r.get('html_path', '未知文件')}: {r.get('error', '未知錯誤')}")
    
    return 0

if __name__ == "__main__":
    import datetime  # 引入datetime模組用於日誌檔名
    sys.exit(main())