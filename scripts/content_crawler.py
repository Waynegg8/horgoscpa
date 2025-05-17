import sys
import json
import requests
import os
import time
from bs4 import BeautifulSoup

def process_html(html, url):
    """處理 HTML 內容，提取標題和正文"""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # 提取標題
        title = soup.title.string if soup.title else "無標題"
        
        # 移除腳本和樣式
        for script in soup(["script", "style"]):
            script.decompose()
            
        # 提取正文內容
        body = soup.body
        if not body:
            return {"title": title, "content": ""}
            
        # 獲取所有文本
        text = body.get_text(separator='\n', strip=True)
        
        # 清理文本
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        content = '\n'.join(lines)
        
        return {"title": title, "content": content}
    except Exception as e:
        print(f"Error processing HTML: {e}")
        return {"title": "處理錯誤", "content": f"錯誤: {str(e)}"}

def fetch_with_zenscrape(url, api_key):
    """使用 ZenScrape 爬取網頁內容"""
    print(f"Fetching {url} with ZenScrape")
    
    zenscrape_url = "https://app.zenscrape.com/api/v1/get"
    params = {
        "apikey": api_key,
        "url": url,
        "render": "true",  # 使用渲染模式處理 JavaScript
        "premium": "false",  # 使用免費代理
        "country": "tw"    # 從台灣 IP 訪問
    }
    
    try:
        response = requests.get(zenscrape_url, params=params)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"ZenScrape error for {url}: {e}")
        return None

def crawl_urls(request_id):
    """爬取 URL 列表中的所有頁面內容"""
    # 獲取 API key
    api_key = os.environ.get("ZENSCRAPE_API_KEY")
    if not api_key:
        print("ERROR: ZENSCRAPE_API_KEY environment variable not set")
        return False
    
    # 讀取 URL 列表
    try:
        with open(f"crawler-results/{request_id}.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if not "urls" in data or not data["urls"]:
            print("No URLs found in input file")
            return False
            
        urls = data["urls"]
        print(f"Found {len(urls)} URLs to crawl")
    except Exception as e:
        print(f"Error reading URL list: {e}")
        return False
    
    # 創建結果目錄
    os.makedirs(f"crawler-results/{request_id}", exist_ok=True)
    
    # 爬取每個 URL
    crawled_pages = []
    for i, url in enumerate(urls):
        try:
            print(f"Crawling URL {i+1}/{len(urls)}: {url}")
            
            # 使用 ZenScrape 爬取頁面
            html = fetch_with_zenscrape(url, api_key)
            if not html:
                print(f"Failed to fetch {url}, skipping")
                continue
                
            # 處理 HTML 內容
            processed = process_html(html, url)
            
            # 將處理後的頁面數據保存到列表
            page_data = {
                "url": url,
                "title": processed["title"],
                "content": processed["content"],
                "source": url.split('/')[2],  # 提取域名作為來源
                "source_type": "zenscrape_crawl",
                "crawl_time": int(time.time())
            }
            
            # 保存頁面內容到獨立文件（以防內容過大）
            page_filename = f"crawler-results/{request_id}/page_{i+1}.json"
            with open(page_filename, "w", encoding="utf-8") as f:
                json.dump(page_data, f, ensure_ascii=False, indent=2)
            
            # 添加到爬取結果列表（不包含內容以減少大小）
            crawled_pages.append({
                "url": url,
                "title": processed["title"],
                "file": page_filename,
                "source": page_data["source"]
            })
            
            print(f"Successfully crawled and saved {url}")
            
            # 短暫延遲，避免過快請求
            if i < len(urls) - 1:
                time.sleep(1)
                
        except Exception as e:
            print(f"Error processing URL {url}: {e}")
    
    # 保存爬取結果摘要
    results_file = f"crawler-results/{request_id}_crawled.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump({
            "query": data.get("query", ""),
            "request_id": request_id,
            "crawled_count": len(crawled_pages),
            "timestamp": int(time.time()),
            "pages": crawled_pages
        }, f, ensure_ascii=False, indent=2)
    
    print(f"Crawl completed. Crawled {len(crawled_pages)}/{len(urls)} pages")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python content_crawler.py <request_id>")
        sys.exit(1)
    
    request_id = sys.argv[1]
    success = crawl_urls(request_id)
    
    if not success:
        sys.exit(1)