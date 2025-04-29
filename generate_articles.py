import os
import json
from datetime import datetime

# 路徑設定
BASE_DIR = "."
BLOG_DIR = os.path.join(BASE_DIR, "blog")
ARTICLES_DIR = os.path.join(BLOG_DIR, "articles")
OUTPUT_DIR = BLOG_DIR

# 文章頁面模板
ARTICLE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{description}">
    <meta name="keywords" content="{keywords}">
    <title>{title} - 霍爾果斯會計師事務所</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="icon" href="../favicon.ico">
</head>
<body>
    <nav class="navbar">
        <div class="logo">
            <img src="../img/logo.png" alt="霍爾果斯會計師事務所 Logo">
            <div class="logo-text">
                <span>霍爾果斯會計師事務所</span>
                <span>Horgoscpa</span>
            </div>
        </div>
        <ul class="nav-links">
            <li><a href="../index.html">首頁</a></li>
            <li><a href="../team.html">服務團隊</a></li>
            <li><a href="../services.html">服務介紹</a></li>
            <li><a href="blog.html">部落格</a></li>
            <li><a href="../contact.html">聯絡我們</a></li>
            <li><a href="../consult.html">立即諮詢</a></li>
        </ul>
    </nav>
    <section class="article">
        <h1>{title}</h1>
        <p>發布日期：{date} | 分類：{category}</p>
        <div>{content}</div>
    </section>
    <div class="floating-buttons">
        <a href="https://line.me/R/ti/p/@your-line-id" class="line-button">加入LINE</a>
        <a href="../consult.html" class="consult-button">立即諮詢</a>
    </div>
    <footer>
        <p>© 2025 霍爾果斯會計師事務所. All Rights Reserved.</p>
    </footer>
    <script src="../js/scripts.js"></script>
</body>
</html>
"""

# index.html 模板
INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="霍爾果斯會計師事務所提供專業會計、稅務與財務諮詢服務，助您事業成功。">
    <meta name="keywords" content="霍爾果斯, 會計師事務所, 會計服務, 稅務諮詢, 財務規劃">
    <meta name="author" content="霍爾果斯會計師事務所">
    <title>霍爾果斯會計師事務所 - 專業會計與財務諮詢</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="icon" href="favicon.ico">
</head>
<body>
    <nav class="navbar">
        <div class="logo">
            <img src="img/logo.png" alt="霍爾果斯會計師事務所 Logo">
            <div class="logo-text">
                <span>霍爾果斯會計師事務所</span>
                <span>Horgoscpa</span>
            </div>
        </div>
        <ul class="nav-links">
            <li><a href="index.html" class="active">首頁</a></li>
            <li><a href="team.html">服務團隊</a></li>
            <li><a href="services.html">服務介紹</a></li>
            <li><a href="blog/blog.html">部落格</a></li>
            <li><a href="contact.html">聯絡我們</a></li>
            <li><a href="consult.html">立即諮詢</a></li>
        </ul>
    </nav>
    <section class="hero">
        <img src="img/banner.jpg" alt="事務所形象Banner" class="banner">
        <h1>霍爾果斯會計師事務所</h1>
        <p>專業會計、稅務與財務諮詢，助您事業成功。</p>
    </section>
    <section class="services-preview">
        <h2>我們的服務 <a href="services.html">了解更多</a></h2>
        <div class="service-grid">
            <div class="service-item">
                <h3>會計服務</h3>
                <p>提供專業的帳務處理與財務報表編制。</p>
            </div>
            <div class="service-item">
                <h3>稅務諮詢</h3>
                <p>協助企業與個人進行稅務規劃與申報。</p>
            </div>
            <div class="service-item">
                <h3>財務顧問</h3>
                <p>提供客製化的財務策略與風險管理。</p>
            </div>
        </div>
    </section>
    <section class="blog-preview">
        <h2>最新文章</h2>
        <div class="blog-grid" id="blog-preview-grid"></div>
        <a href="blog/blog.html" class="cta-button">閱讀更多</a>
    </section>
    <section class="contact-info">
        <h2>聯絡我們</h2>
        <p>電話: +886-2-1234-5678</p>
        <p>Email: info@horgoscpa.com</p>
    </section>
    <div class="floating-buttons">
        <a href="https://line.me/R/ti/p/@your-line-id" class="line-button">加入LINE</a>
        <a href="consult.html" class="consult-button">立即諮詢</a>
    </div>
    <footer>
        <p>© 2025 霍爾果斯會計師事務所. All Rights Reserved.</p>
    </footer>
    {article_scripts}
    <script src="js/scripts.js"></script>
</body>
</html>
"""

# blog.html 模板
BLOG_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="霍爾果斯會計師事務所部落格，分享會計、稅務與財務管理的最新資訊與實用建議。">
    <meta name="keywords" content="霍爾果斯, 會計部落格, 稅務資訊, 財務管理">
    <title>部落格 - 霍爾果斯會計師事務所</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="icon" href="../favicon.ico">
</head>
<body>
    <nav class="navbar">
        <div class="logo">
            <img src="../img/logo.png" alt="霍爾果斯會計師事務所 Logo">
            <div class="logo-text">
                <span>霍爾果斯會計師事務所</span>
                <span>Horgoscpa</span>
            </div>
        </div>
        <ul class="nav-links">
            <li><a href="../index.html">首頁</a></li>
            <li><a href="../team.html">服務團隊</a></li>
            <li><a href="../services.html">服務介紹</a></li>
            <li><a href="blog.html" class="active">部落格</a></li>
            <li><a href="../contact.html">聯絡我們</a></li>
            <li><a href="../consult.html">立即諮詢</a></li>
        </ul>
    </nav>
    <section class="blog">
        <h1>最新文章</h1>
        <div class="search-bar">
            <input type="text" id="search" placeholder="搜尋文章...">
        </div>
        <div class="category-filter">
            <button class="filter-btn active" data-category="all">全部</button>
            <button class="filter-btn" data-category="tax">稅務</button>
            <button class="filter-btn" data-category="accounting">會計</button>
            <button class="filter-btn" data-category="finance">財務</button>
        </div>
        <div class="blog-grid" id="blog-grid"></div>
    </section>
    <div class="floating-buttons">
        <a href="https://line.me/R/ti/p/@your-line-id" class="line-button">加入LINE</a>
        <a href="../consult.html" class="consult-button">立即諮詢</a>
    </div>
    <footer>
        <p>© 2025 霍爾果斯會計師事務所. All Rights Reserved.</p>
    </footer>
    {article_scripts}
    <script src="../js/scripts.js"></script>
</body>
</html>
"""

def generate_static_articles():
    # 確保輸出目錄存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(ARTICLES_DIR, exist_ok=True)

    # 收集所有文章
    articles = []
    for filename in os.listdir(ARTICLES_DIR):
        if filename.startswith("article") and filename.endswith(".json"):
            with open(os.path.join(ARTICLES_DIR, filename), 'r', encoding='utf-8') as f:
                # 讀取 JavaScript 格式的檔案
                content = f.read()
                # 提取 JSON 部分
                json_str = content.split('=')[1].strip().rstrip(';')
                article = json.loads(json_str)
                articles.append(article)

    # 按日期排序
    articles.sort(key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d'), reverse=True)

    # 生成 <script> 標籤
    article_scripts_index = '\n    '.join(f'<script src="blog/articles/article{article["id"]}.json"></script>' for article in articles)
    article_scripts_blog = '\n    '.join(f'<script src="articles/article{article["id"]}.json"></script>' for article in articles)

    # 僅生成尚未存在的 HTML 檔案
    generated_files = []
    for article in articles:
        output_file = os.path.join(OUTPUT_DIR, f"article{article['id']}.html")
        if not os.path.exists(output_file):  # 檢查檔案是否已存在
            content_html = ''.join(f'<p>{p}</p>' for p in article['content'])
            html_content = ARTICLE_TEMPLATE.format(
                title=article['title'],
                description=article['description'],
                keywords=article['keywords'],
                date=article['date'],
                category=article['category'],
                content=content_html
            )
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"生成靜態檔案：{output_file}")
            generated_files.append(output_file)

    # 更新 index.html
    index_html = INDEX_TEMPLATE.format(article_scripts=article_scripts_index)
    with open(os.path.join(BASE_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)
    print("更新 index.html")

    # 更新 blog.html
    blog_html = BLOG_TEMPLATE.format(article_scripts=article_scripts_blog)
    with open(os.path.join(BLOG_DIR, 'blog.html'), 'w', encoding='utf-8') as f:
        f.write(blog_html)
    print("更新 blog.html")

    return generated_files

if __name__ == "__main__":
    generated_files = generate_static_articles()
    if generated_files:
        print("新生成的檔案：")
        for file in generated_files:
            print(f"- {file}")
    else:
        print("沒有新檔案需要生成。")