#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文章分類器 - 專門負責分析文章內容和確定分類
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
import datetime  # 添加這一行
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from bs4 import BeautifulSoup

# 設置日誌
def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"article_classifier_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("article_classifier")

logger = setup_logging()

# 定義分類系統
CATEGORY_SYSTEM = {
    # 1. 稅務服務 (taxation)
    "稅務服務": {
        "code": "taxation",
        "subcategories": {
            "所得稅務": "income-tax",
            "營業稅務": "business-tax",
            "遺產贈與": "inheritance-gift",
            "不動產稅務": "real-estate-tax",
            "國際稅務": "international-tax",
            "稅務爭議": "tax-dispute",
            "稅務規劃": "tax-planning",
            "結算申報": "final-tax-filing"
        }
    },
    
    # 2. 會計服務 (accounting)
    "會計服務": {
        "code": "accounting",
        "subcategories": {
            "日常記帳": "bookkeeping",
            "財報編製": "financial-reporting",
            "會計準則": "accounting-standards",
            "成本會計": "cost-accounting",
            "非營利會計": "nonprofit-accounting"
        }
    },
    
    # 3. 工商服務 (business-services)
    "工商服務": {
        "code": "business-services",
        "subcategories": {
            "公司設立": "company-establishment",
            "變更登記": "registration-change",
            "企業重組": "business-restructuring",
            "工商登記": "commercial-registration",
            "股務作業": "shareholder-affairs"
        }
    },
    
    # 4. 審計服務 (audit)
    "審計服務": {
        "code": "audit",
        "subcategories": {
            "財務簽證": "financial-certification",
            "內部控制": "internal-control",
            "專案審查": "project-audit"
        }
    },
    
    # 5. 管理顧問 (management-consulting)
    "管理顧問": {
        "code": "management-consulting",
        "subcategories": {
            "企業管理": "business-management",
            "財務分析": "financial-analysis",
            "投資評估": "investment-evaluation",
            "電子商務": "e-commerce",
            "成本控制": "cost-control"
        }
    },
    
    # 6. 人事顧問 (hr-consulting)
    "人事顧問": {
        "code": "hr-consulting",
        "subcategories": {
            "薪資管理": "payroll-management",
            "勞健保事務": "labor-insurance"
        }
    },
    
    # 7. 財富管理 (wealth-management)
    "財富管理": {
        "code": "wealth-management",
        "subcategories": {
            "財產規劃": "property-planning",
            "家族企業": "family-business",
            "退休規劃": "retirement-planning",
            "投資組合": "investment-portfolio",
            "保險規劃": "insurance-planning",
            "信託服務": "trust-services"
        }
    }
}

# 各分類的關鍵詞定義
CATEGORY_KEYWORDS = {
    # 稅務服務
    "所得稅務": ["所得稅", "綜所稅", "營所稅", "結算申報", "扣繳", "稅額", "扣除額", "免稅額"],
    "營業稅務": ["營業稅", "加值型", "非加值型", "發票", "銷項稅額", "進項稅額", "統一發票"],
    "遺產贈與": ["遺產稅", "贈與稅", "繼承", "遺囑", "遺贈", "死亡", "財產移轉", "遺產總額"],
    "不動產稅務": ["房地合一", "土增稅", "房屋稅", "地價稅", "土地增值稅", "房產", "土地"],
    "國際稅務": ["跨境", "海外", "國外所得", "外國", "國際", "居住者", "非居住者", "常設機構"],
    "稅務爭議": ["稅務爭議", "行政救濟", "復查", "訴願", "稅務案件", "稅單", "補稅", "處罰"],
    "稅務規劃": ["節稅", "避稅", "租稅規劃", "租稅優惠", "稅負", "最適化", "節稅策略"],
    "結算申報": ["年度申報", "結算申報", "决算", "盈餘", "分配", "可分配盈餘"],
    
    # 會計服務
    "日常記帳": ["記帳", "帳務", "憑證", "傳票", "分錄", "帳冊", "分類帳", "總帳"],
    "財報編製": ["財務報表", "資產負債表", "損益表", "現金流量表", "財報", "編製", "報表"],
    "會計準則": ["IFRS", "準則", "會計原則", "公報", "財務報告", "認列", "衡量", "表達"],
    "成本會計": ["成本", "成本計算", "成本分析", "預算", "制度", "分攤", "成本中心"],
    "非營利會計": ["非營利", "協會", "基金會", "社團", "公益", "捐款", "贊助"],
    
    # 工商服務
    "公司設立": ["公司設立", "設立登記", "創立", "籌備", "發起人", "開業", "核准登記"],
    "變更登記": ["變更", "董事", "監察人", "地址", "資本額", "名稱", "修改"],
    "企業重組": ["重組", "改制", "組織調整", "資本變更", "增資", "減資", "合併"],
    "工商登記": ["工商", "登記", "行號", "執照", "商業登記", "立案", "商號", "執照"],
    "股務作業": ["股務", "股東", "股票", "股利", "分配", "股東會", "董事會", "股權"],
    
    # 審計服務
    "財務簽證": ["簽證", "財務報表查核", "會計師", "查核", "核閱", "意見", "保留意見"],
    "內部控制": ["內部控制", "稽核", "制度設計", "內控", "缺失", "控制點", "風險評估"],
    "專案審查": ["專案", "調查", "盡職調查", "特定用途", "覆核", "核實", "事實發現"],
    
    # 管理顧問
    "企業管理": ["經營", "管理", "營運", "策略", "執行", "績效", "目標", "評估", "KPI"],
    "財務分析": ["財務", "分析", "報表分析", "比率", "經營成果", "獲利", "流動性"],
    "投資評估": ["投資", "評估", "報酬率", "風險", "現值", "淨現值", "內部報酬率"],
    "電子商務": ["電商", "網路", "平台", "數位", "線上", "跨境電商", "電子商務"],
    "成本控制": ["成本", "費用", "預算", "控制", "效益", "支出", "降低成本"],
    
    # 人事顧問
    "薪資管理": ["薪資", "薪酬", "獎金", "年終獎金", "加班費", "員工福利", "薪資結構"],
    "勞健保事務": ["勞保", "健保", "勞退", "二代健保", "補充保費", "就保", "退休金"],
    
    # 財富管理
    "財產規劃": ["財產", "資產", "配置", "規劃", "傳承", "管理", "投資組合"],
    "家族企業": ["家族", "傳承", "接班", "繼承", "股權移轉", "家族信託", "企業治理"],
    "退休規劃": ["退休", "退休金", "老年", "養老", "年金", "照護", "生涯規劃"],
    "投資組合": ["投資組合", "資產配置", "多元投資", "風險分散", "證券", "基金"],
    "保險規劃": ["保險", "壽險", "醫療險", "意外險", "理賠", "保單", "風險轉移"],
    "信託服務": ["信託", "受託人", "委託人", "受益人", "財產權", "金錢信託", "不動產信託"]
}

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

def extract_article_text(soup: BeautifulSoup) -> str:
    """從HTML中提取文章純文本內容"""
    # 提取標題
    title = ""
    h1 = soup.find('h1')
    if h1:
        title = h1.get_text().strip()
    
    # 提取內容
    content = ""
    article = soup.find('article')
    if article:
        paragraphs = article.find_all(['p', 'h2', 'h3', 'h4', 'li'])
        content = " ".join([p.get_text().strip() for p in paragraphs])
    
    return title + " " + content

def classify_article(article_text: str) -> Tuple[str, str, Dict]:
    """
    分析文章內容並確定大分類和子分類
    返回: (主分類名稱, 子分類名稱, 分類詳細信息)
    """
    logger.info("開始分析文章分類")
    
    # 使用jieba分詞
    jieba.setLogLevel(20)  # 抑制jieba日誌輸出
    words = list(jieba.cut(article_text))
    
    # 計算各子分類的匹配分數
    subcategory_scores = {}
    for subcategory, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            # 計算關鍵詞在文章中出現的次數
            keyword_count = article_text.count(keyword)
            # 標題權重加倍
            if keyword in article_text[:100]:  # 假設前100個字符為標題和摘要
                keyword_count *= 2
            score += keyword_count
        
        if score > 0:
            subcategory_scores[subcategory] = score
    
    # 找出得分最高的子分類
    if not subcategory_scores:
        logger.warning("沒有找到匹配的子分類，將使用默認分類")
        return "稅務服務", "稅務規劃", {
            "main_category": "稅務服務",
            "main_category_code": "taxation",
            "subcategory": "稅務規劃",
            "subcategory_code": "tax-planning",
            "confidence": 0
        }
    
    # 按得分排序子分類
    sorted_subcategories = sorted(subcategory_scores.items(), key=lambda x: x[1], reverse=True)
    top_subcategory = sorted_subcategories[0][0]
    top_score = sorted_subcategories[0][1]
    
    # 確定主分類
    main_category = None
    for category, info in CATEGORY_SYSTEM.items():
        if top_subcategory in info["subcategories"]:
            main_category = category
            break
    
    if not main_category:
        logger.warning(f"無法確定主分類，將使用默認分類")
        return "稅務服務", top_subcategory, {
            "main_category": "稅務服務",
            "main_category_code": "taxation",
            "subcategory": top_subcategory,
            "subcategory_code": CATEGORY_KEYWORDS.get(top_subcategory, "tax-planning"),
            "confidence": top_score
        }
    
    # 獲取分類代碼
    main_category_code = CATEGORY_SYSTEM[main_category]["code"]
    subcategory_code = CATEGORY_SYSTEM[main_category]["subcategories"][top_subcategory]
    
    # 返回分類結果
    logger.info(f"分類結果: {main_category} / {top_subcategory} (置信度: {top_score})")
    
    return main_category, top_subcategory, {
        "main_category": main_category,
        "main_category_code": main_category_code,
        "subcategory": top_subcategory,
        "subcategory_code": subcategory_code,
        "confidence": top_score
    }

def update_metadata(meta_path: str, classification_info: Dict) -> bool:
    """更新元數據文件，添加分類信息"""
    try:
        # 載入原有元數據
        metadata = load_metadata(meta_path)
        if not metadata:
            return False
        
        # 添加分類信息
        metadata["classification"] = classification_info
        
        # 保存更新後的元數據
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"成功更新元數據: {meta_path}")
        return True
    except Exception as e:
        logger.error(f"更新元數據失敗: {meta_path}, 錯誤: {str(e)}")
        return False

def process_article(html_path: str) -> Dict:
    """處理單篇文章的分類"""
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
    if not html_content or not soup:
        return {
            'success': False,
            'html_path': html_path,
            'error': '無法載入HTML內容'
        }
    
    # 提取文章文本
    article_text = extract_article_text(soup)
    
    # 分類文章
    main_category, subcategory, classification_info = classify_article(article_text)
    
    # 更新元數據
    if update_metadata(meta_path, classification_info):
        return {
            'success': True,
            'html_path': html_path,
            'meta_path': meta_path,
            'main_category': main_category,
            'subcategory': subcategory
        }
    else:
        return {
            'success': False,
            'html_path': html_path,
            'error': '更新元數據失敗'
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
        result = process_article(html_file)
        results.append(result)
        
        # 顯示進度
        success_count = sum(1 for r in results if r.get('success', False))
        logger.info(f"處理進度: {success_count}/{len(results)} 成功")
    
    return results

def main() -> int:
    """主函數"""
    if len(sys.argv) < 2:
        print("用法: python article_classifier.py <博客目錄>")
        print("例如: python article_classifier.py blog")
        return 1
    
    blog_dir = sys.argv[1]
    
    logger.info(f"博客目錄: {blog_dir}")
    
    logger.info("====== 文章分類處理開始 ======")
    results = process_all_articles(blog_dir)
    
    success_count = sum(1 for r in results if r.get('success', False))
    fail_count = len(results) - success_count
    
    logger.info("====== 處理完成 ======")
    logger.info(f"總計處理: {len(results)} 個文件")
    logger.info(f"成功分類: {success_count} 個文件")
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