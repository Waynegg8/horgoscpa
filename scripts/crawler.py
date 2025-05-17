import sys
import json
import requests
import os
import time

def search_google_api(query, api_key, cse_id):
    print(f"Using Google Custom Search API for query: {query}")
    
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": api_key,
        "cx": cse_id,
        "q": f"{query} 台灣 會計師 稅務",
        "num": 10,
        "hl": "zh-TW"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        results = response.json()
        print(f"API response received, status: {response.status_code}")
        
        urls = []
        
        if "items" in results:
            for item in results["items"]:
                urls.append(item["link"])
            print(f"Extracted {len(urls)} URLs from search results")
        else:
            print("No items found in search results")
            if "error" in results:
                print(f"API Error: {results['error']['message']}")
        
        return urls
    except Exception as e:
        print(f"Error using Google Search API: {e}")
        if 'response' in locals():
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text[:200]}...")  # 只打印前200個字符
        return []

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python crawler.py <query> <request_id>")
        sys.exit(1)
    
    query = sys.argv[1]
    request_id = sys.argv[2]
    
    print(f"Starting crawler with query: {query}, request_id: {request_id}")
    
    # 獲取API密鑰，從環境變量獲取
    api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
    cse_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
    
    if not api_key:
        print("ERROR: GOOGLE_SEARCH_API_KEY environment variable not set")
        sys.exit(1)
    
    if not cse_id:
        print("ERROR: GOOGLE_SEARCH_ENGINE_ID environment variable not set")
        sys.exit(1)
    
    print(f"API Key available: Yes (length: {len(api_key)})")
    print(f"CSE ID available: Yes (length: {len(cse_id)})")
    
    # 確保結果目錄存在
    os.makedirs("crawler-results", exist_ok=True)
    
    # 搜索並獲取URLs
    urls = search_google_api(query, api_key, cse_id)
    print(f"Found {len(urls)} URLs for query: {query}")
    
    # 打印找到的URLs (方便調試)
    if urls:
        print("URLs found:")
        for i, url in enumerate(urls, 1):
            print(f"{i}. {url}")
    else:
        print("No URLs found")
    
    # 保存結果
    output_file = f"crawler-results/{request_id}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "query": query, 
            "urls": urls,
            "timestamp": int(time.time())
        }, f, ensure_ascii=False, indent=2)
    
    print(f"Results saved to {output_file}")