import sys
import json
import os
import time
import google.generativeai as genai
from collections import defaultdict

def categorize_content(query, crawled_data, gemini_api_key):
    """使用 Gemini API 對爬取的內容進行分類和分析"""
    genai.configure(api_key=gemini_api_key)
    
    # 設置 Gemini 模型
    model = genai.GenerativeModel('gemini-pro')
    
    processed_data = {
        "query": query,
        "categories": defaultdict(list),
        "summary": "",
        "timestamp": int(time.time())
    }
    
    # 讀取每個爬取頁面的內容
    all_content = []
    for page in crawled_data.get("pages", []):
        try:
            if "file" in page and os.path.exists(page["file"]):
                with open(page["file"], "r", encoding="utf-8") as f:
                    page_data = json.load(f)
                    
                # 添加標題和摘要到內容列表
                content = f"標題: {page_data['title']}\n來源: {page_data['source']}\n"
                
                # 獲取內容的前300個字作為摘要
                content_preview = page_data['content'][:300] + "..." if len(page_data['content']) > 300 else page_data['content']
                content += f"內容摘要: {content_preview}\n"
                
                all_content.append({
                    "url": page_data["url"],
                    "title": page_data["title"],
                    "content": page_data["content"],
                    "source": page_data["source"]
                })
        except Exception as e:
            print(f"Error reading page data: {e}")
    
    if not all_content:
        print("No content to analyze")
        return processed_data
    
    # 根據查詢決定分析重點
    analysis_focus = "公司設立流程" if "公司" in query and ("設立" in query or "登記" in query) else \
                     "稅務申報" if any(keyword in query for keyword in ["稅", "報稅", "發票"]) else \
                     "會計記帳" if any(keyword in query for keyword in ["會計", "記帳"]) else \
                     "一般財務"
    
    print(f"Analyzing content with focus on: {analysis_focus}")
    
    # 使用 Gemini 進行內容分類
    try:
        # 將每個頁面內容分類
        for page in all_content:
            prompt = f"""
            請分析以下關於「{query}」的文章，並確定它屬於哪個類別：
            1. 公司登記流程
            2. 稅務申報
            3. 會計記帳
            4. 一般財務資訊
            
            文章標題: {page['title']}
            文章內容: {page['content'][:1000]}...
            
            僅回答類別編號和名稱，不要解釋。
            """
            
            response = model.generate_content(prompt)
            category = response.text.strip()
            
            # 提取類別（如果回應格式正確）
            if "公司登記" in category or "1" in category:
                processed_data["categories"]["company_registration"].append(page)
            elif "稅務" in category or "2" in category:
                processed_data["categories"]["tax"].append(page)
            elif "會計" in category or "3" in category:
                processed_data["categories"]["accounting"].append(page)
            else:
                processed_data["categories"]["general"].append(page)
    except Exception as e:
        print(f"Error during content classification: {e}")
    
    # 生成查詢摘要
    try:
        # 整理所有文章內容的摘要
        all_titles = "\n".join([f"- {page['title']}" for page in all_content[:5]])
        
        summary_prompt = f"""
        根據以下有關「{query}」的文章標題，生成一個專業的中文摘要，說明這個主題的主要資訊：
        
        {all_titles}
        
        請提供一個 100-200 字的簡潔摘要，專注於與「{analysis_focus}」相關的實用資訊。
        """
        
        summary_response = model.generate_content(summary_prompt)
        processed_data["summary"] = summary_response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        processed_data["summary"] = f"關於「{query}」的資訊整理中..."
    
    return processed_data

def analyze_content(query, request_id):
    """主函數：分析爬取的內容"""
    # 獲取 Gemini API key
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set")
        return False
    
    # 讀取爬取結果
    crawled_file = f"crawler-results/{request_id}_crawled.json"
    if not os.path.exists(crawled_file):
        print(f"Crawled data file not found: {crawled_file}")
        return False
    
    try:
        with open(crawled_file, "r", encoding="utf-8") as f:
            crawled_data = json.load(f)
    except Exception as e:
        print(f"Error reading crawled data: {e}")
        return False
    
    print(f"Analyzing content for query: {query}")
    processed_data = categorize_content(query, crawled_data, gemini_api_key)
    
    # 保存分析結果
    analyzed_file = f"crawler-results/{request_id}_analyzed.json"
    with open(analyzed_file, "w", encoding="utf-8") as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=2)
    
    print(f"Analysis completed and saved to {analyzed_file}")
    
    # 創建最終結果摘要文件（供 Cloudflare Worker 使用）
    final_result = {
        "query": query,
        "request_id": request_id,
        "status": "completed",
        "summary": processed_data["summary"],
        "category_counts": {k: len(v) for k, v in processed_data["categories"].items()},
        "timestamp": int(time.time()),
        "result_file": analyzed_file
    }
    
    with open(f"crawler-results/{request_id}_result.json", "w", encoding="utf-8") as f:
        json.dump(final_result, f, ensure_ascii=False, indent=2)
    
    print("Final result summary created successfully")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python content_analyzer.py <query> <request_id>")
        sys.exit(1)
    
    query = sys.argv[1]
    request_id = sys.argv[2]
    success = analyze_content(query, request_id)
    
    if not success:
        sys.exit(1)