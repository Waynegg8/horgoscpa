import sys
import json
import requests
import os
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OfficialCrawler:
    def __init__(self, config, crawl_id, zenscrape_api_key):
        self.config = config
        self.crawl_id = crawl_id
        self.zenscrape_api_key = zenscrape_api_key
        self.visited_urls = set()
        self.queue = []
        self.results = []
        self.max_depth = config.get('maxDepth', 3)
        self.max_pages = config.get('maxPages', 1000)
        
        # 從配置中加載核心站點
        self.core_sites = {
            # 經濟部商業司
            'gcis': {
                'base': 'https://gcis.nat.gov.tw/mainNew/',
                'pages': [
                    'index.jsp',
                    'subclassNAction.do?method=getFile&fid=2022121900',
                    'matterAction.do?method=showAll',
                    'subclassAction.do?method=getFile&isNew=true&pkid=397',
                    'subclassAction.do?method=getFile&isNew=true&pkid=353'
                ],
                'sections': [
                    { 'name': '公司登記', 'url': 'subclassAction.do?method=getFile&isNew=true&pkid=41' },
                    { 'name': '商業登記', 'url': 'subclassAction.do?method=getFile&isNew=true&pkid=56' },
                    { 'name': '資本額簽證', 'url': 'subclassAction.do?method=getFile&isNew=true&pkid=353' }
                ]
            },
            
            # 經濟部中小企業處會計資訊服務網
            'accounting': {
                'base': 'https://accounting.sme.gov.tw/',
                'pages': [
                    'run.php?name=forum&file=forumCat_list',
                    'run.php?name=download&file=index',
                    'run.php?name=qa&file=index',
                    'run.php?name=laws&file=index'
                ],
                'forums': [
                    { 'id': 1, 'name': '會計處理', 'url': 'run.php?name=forum&file=forum_list&cat_id=1' },
                    { 'id': 2, 'name': '稅務法規', 'url': 'run.php?name=forum&file=forum_list&cat_id=2' },
                    { 'id': 4, 'name': '商業登記', 'url': 'run.php?name=forum&file=forum_list&cat_id=4' },
                    { 'id': 5, 'name': '公司登記', 'url': 'run.php?name=forum&file=forum_list&cat_id=5' }
                ]
            }
        }
    
    def initialize(self):
        """初始化爬蟲，添加種子URL"""
        logger.info("Initializing official crawler...")
        
        # 清空隊列
        self.queue = []
        self.visited_urls = set()
        self.results = []
        
        # 確定要爬取的網站
        sites = self.config.get('sites', list(self.core_sites.keys()))
        
        # 添加種子URL
        for site_key in sites:
            site = self.core_sites.get(site_key)
            if site:
                # 添加基本頁面
                base_url = site['base']
                for page in site.get('pages', []):
                    full_url = urljoin(base_url, page)
                    self.queue.append({
                        'url': full_url,
                        'depth': 0,
                        'source': site_key
                    })
                
                # 添加專區頁面
                for section in site.get('sections', []):
                    full_url = urljoin(base_url, section['url'])
                    self.queue.append({
                        'url': full_url,
                        'depth': 0,
                        'source': site_key
                    })
                
                # 添加論壇頁面
                for forum in site.get('forums', []):
                    full_url = urljoin(base_url, forum['url'])
                    self.queue.append({
                        'url': full_url,
                        'depth': 0,
                        'source': site_key
                    })
        
        logger.info(f"Added {len(self.queue)} URLs to crawl queue")
    
    def fetch_page(self, url):
        """使用 ZenScrape 爬取頁面"""
        logger.info(f"Fetching page: {url}")
        
        try:
            # 使用 ZenScrape API
            zenscrape_url = "https://app.zenscrape.com/api/v1/get"
            params = {
                "apikey": self.zenscrape_api_key,
                "url": url,
                "render": "false",  # 官方網站通常不需要渲染 JavaScript
                "premium": "false",
                "country": "tw"
            }
            
            response = requests.get(zenscrape_url, params=params)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', '')
            html = response.text
            
            return {'html': html, 'content_type': content_type}
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return {'html': None, 'content_type': ''}
    
    def extract_links(self, html, base_url):
        """從HTML中提取鏈接"""
        if not html:
            return []
        
        links = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                
                # 忽略錨點鏈接和javascript鏈接
                if href.startswith('#') or href.startswith('javascript:'):
                    continue
                
                # 處理相對URL
                if not href.startswith('http'):
                    href = urljoin(base_url, href)
                
                links.append(href)
        except Exception as e:
            logger.error(f"Error extracting links from {base_url}: {e}")
        
        # 去重
        return list(set(links))
    
    def process_html(self, html, url):
        """處理HTML內容，提取標題和正文"""
        if not html:
            return {'title': '', 'content': ''}
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 提取標題
            title = soup.title.string if soup.title else ''
            
            # 移除腳本和樣式
            for script in soup(["script", "style"]):
                script.decompose()
            
            # 提取正文內容
            body = soup.body
            if not body:
                return {'title': title, 'content': ''}
            
            # 獲取所有文本
            text = body.get_text(separator='\n', strip=True)
            
            # 清理文本
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            content = '\n'.join(lines)
            
            return {'title': title, 'content': content}
        except Exception as e:
            logger.error(f"Error processing HTML from {url}: {e}")
            return {'title': '', 'content': ''}
    
    def categorize_url(self, url):
        """根據URL路徑分類內容"""
        try:
            path = urlparse(url).path.lower()
            
            if 'registration' in path or 'company' in path or '設立' in path or '登記' in path:
                return 'company_registration'
            elif 'tax' in path or '稅務' in path or 'invoice' in path or '發票' in path:
                return 'tax'
            elif 'accounting' in path or '會計' in path or 'financial' in path or '財務' in path:
                return 'accounting'
            elif 'qa' in path or 'faq' in path or '問答' in path or '常見問題' in path:
                return 'faq'
            elif 'download' in path or '下載' in path or 'form' in path or '表單' in path:
                return 'resources'
            else:
                return 'general'
        except Exception:
            return 'general'
    
    def is_valid_url(self, url, base_url):
        """檢查URL是否有效（屬於目標域名）"""
        try:
            url_obj = urlparse(url)
            base_url_obj = urlparse(base_url)
            
            # 檢查是否屬於同一域名
            return url_obj.netloc == base_url_obj.netloc
        except Exception:
            return False
    
    def generate_id(self, url):
        """生成頁面ID"""
        import base64
        # 簡單的URL轉ID函數
        try:
            encoded = base64.b64encode(url.encode('utf-8')).decode('utf-8')
            return encoded.replace('/', '_').replace('+', '-').replace('=', '')
        except Exception:
            # 如果編碼失敗，返回URL的雜湊值
            import hashlib
            return hashlib.md5(url.encode('utf-8')).hexdigest()
    
    def crawl(self):
        """執行爬蟲"""
        logger.info("Starting official site crawl...")
        
        start_time = time.time()
        processed_count = 0
        
        # 處理隊列中的URL
        while self.queue and len(self.results) < self.max_pages:
            current = self.queue.pop(0)
            
            # 檢查是否已訪問過
            if current['url'] in self.visited_urls:
                continue
            
            # 標記為已訪問
            self.visited_urls.add(current['url'])
            processed_count += 1
            
            logger.info(f"Crawling {current['url']} (Depth: {current['depth']}, Queue: {len(self.queue)})")
            
            try:
                # 爬取頁面
                page_result = self.fetch_page(current['url'])
                
                if page_result['html']:
                    # 處理HTML頁面
                    processed_page = self.process_html(page_result['html'], current['url'])
                    
                    # 如果內容不為空
                    if processed_page['content']:
                        # 存儲結果
                        page_id = self.generate_id(current['url'])
                        page_data = {
                            'id': page_id,
                            'url': current['url'],
                            'title': processed_page['title'],
                            'content': processed_page['content'],
                            'source': current['source'],
                            'source_type': 'official',
                            'reliability': 1.0,  # 官方網站可靠性最高
                            'category': self.categorize_url(current['url']),
                            'crawl_time': int(time.time())
                        }
                        
                        self.results.append(page_data)
                        logger.info(f"Processed page: {current['url']}, title: {processed_page['title'][:30]}...")
                        
                        # 如果未達到最大深度，添加新鏈接到隊列
                        if current['depth'] < self.max_depth:
                            links = self.extract_links(page_result['html'], current['url'])
                            for link in links:
                                # 確認鏈接屬於同一個網站
                                site = self.core_sites.get(current['source'])
                                if site and self.is_valid_url(link, site['base']):
                                    self.queue.append({
                                        'url': link,
                                        'depth': current['depth'] + 1,
                                        'source': current['source']
                                    })
                
                # 添加延遲避免過快請求
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error processing {current['url']}: {e}")
        
        end_time = time.time()
        logger.info(f"Crawling completed. Processed {processed_count} URLs, stored {len(self.results)} pages.")
        logger.info(f"Total crawl time: {(end_time - start_time):.2f} seconds")
        
        return {
            'processedUrls': processed_count,
            'storedPages': len(self.results),
            'crawlTime': round(end_time - start_time, 2)
        }
    
    def save_results(self):
        """儲存爬蟲結果"""
        output_file = f"crawler-results/official_{self.crawl_id}.json"
        
        # 將結果分批保存，避免單個文件過大
        batch_size = 100
        batches = [self.results[i:i+batch_size] for i in range(0, len(self.results), batch_size)]
        
        # 儲存總結果概要
        summary = {
            'crawl_id': self.crawl_id,
            'total_pages': len(self.results),
            'timestamp': int(time.time()),
            'config': self.config,
            'batches': len(batches),
            'pages': []  # 此處只儲存頁面概要，不包含完整內容
        }
        
        # 儲存每個批次
        for i, batch in enumerate(batches):
            batch_file = f"crawler-results/official_{self.crawl_id}_batch_{i+1}.json"
            
            with open(batch_file, 'w', encoding='utf-8') as f:
                json.dump(batch, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Saved batch {i+1}/{len(batches)} to {batch_file}")
            
            # 添加頁面概要到總結果
            for page in batch:
                summary['pages'].append({
                    'id': page['id'],
                    'url': page['url'],
                    'title': page['title'],
                    'source': page['source'],
                    'category': page['category'],
                    'batch_file': batch_file
                })
        
        # 儲存總結果概要
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Saved official crawl results to {output_file}")
        return output_file

def main():
    if len(sys.argv) < 3:
        logger.error("Usage: python official_crawler.py <crawl_id> <config_json>")
        sys.exit(1)
    
    crawl_id = sys.argv[1]
    config_json = sys.argv[2]
    
    logger.info(f"Starting official crawler with crawl_id: {crawl_id}")
    logger.info(f"Config JSON: {config_json}")
    
    try:
        config = json.loads(config_json)
        logger.info(f"Parsed config: {config}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON config: {e}")
        logger.error(f"Received config string: {config_json}")
        sys.exit(1)
    
    # 獲取 ZenScrape API key
    zenscrape_api_key = os.environ.get('ZENSCRAPE_API_KEY')
    if not zenscrape_api_key:
        logger.error("ZENSCRAPE_API_KEY environment variable is not set")
        sys.exit(1)
    
    logger.info(f"ZenScrape API key available: {bool(zenscrape_api_key)}")
    
    # 創建爬蟲實例
    crawler = OfficialCrawler(config, crawl_id, zenscrape_api_key)
    
    # 初始化爬蟲
    crawler.initialize()
    
    # 執行爬蟲
    stats = crawler.crawl()
    
    # 儲存結果
    output_file = crawler.save_results()
    
    logger.info(f"Official crawl completed successfully. Results saved to {output_file}")
    logger.info(f"Stats: {stats}")

if __name__ == "__main__":
    main()