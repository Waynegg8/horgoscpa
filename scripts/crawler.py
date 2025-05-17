import sys
import json
import requests
import os
import time
from bs4 import BeautifulSoup
from urllib.parse import quote

def search_google(query):
    # 格式化搜索查詢
    search_query = f"{query} 台灣 會計師 稅務"
    search_url = f"https://www.google.com/search?q={quote(search_query)}&num=10&hl=zh-TW"
    
    # 模擬瀏覽器請求
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7"
    }
    
    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 提取搜索結果URLs
        urls = []
        for result in soup.select("div.g a"):
            href = result.get("href")
            if href and href.startswith("http") and not href.startswith(("https://accounts.google", "https://www.google", "https://youtube")):
                urls.append(href)
        
        # 如果上面的方法沒找到結果，嘗試另一種選擇器
        if not urls:
            for result in soup.select("a[href^='http']"):
                href = result.get("href")
                if href and not href.startswith(("https://accounts.google", "https://www.google", "https://youtube")):
                    urls.append(href)
        
        # 去重
        urls = list(dict.fromkeys(urls))
        return urls[:10]  # 返回前10個結果
    except Exception as e:
        print(f"Error searching Google: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python crawler.py <query> <request_id>")
        sys.exit(1)
    
    query = sys.argv[1]
    request_id = sys.argv[2]
    
    print(f"Searching for: {query}")
    
    # 搜索並獲取URLs
    urls = search_google(query)
    print(f"Found {len(urls)} URLs for query: {query}")
    
    # 保存結果
    output_file = f"crawler-results/{request_id}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "query": query, 
            "urls": urls,
            "timestamp": int(time.time())
        }, f, ensure_ascii=False, indent=2)
    
    print(f"Results saved to {output_file}")