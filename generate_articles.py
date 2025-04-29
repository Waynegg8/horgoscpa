import os
import json
import shutil
import hashlib
from datetime import datetime

ARTICLES_DIR = "blog/articles"
GENERATED_ARTICLES_DIR = "blog/generated_articles"
HASH_FILE = "blog/articles_hash.json"
ARTICLE_TEMPLATE = """
    <section class="article">
        <h1>{title}</h1>
        <div class="article-meta">
            <span class="article-date">日期：{date}</span>
            <span class="article-category">分類：{category}</span>
        </div>
        <div class="article-content">
            {content}
        </div>
    </section>
    <div class="floating-buttons">
        <a href="https://line.me/R/ti/p/@your-line-id" class="line-button">加入LINE</a>
        <a href="/consult.html" class="consult-button">立即諮詢</a>
    </div>
"""

def compute_file_hash(filename):
    """計算檔案的哈希值"""
    hasher = hashlib.md5()
    with open(filename, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_hashes():
    """載入之前的哈希值"""
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_hashes(hashes):
    """儲存哈希值"""
    with open(HASH_FILE, 'w', encoding='utf-8') as f:
        json.dump(hashes, f, ensure_ascii=False, indent=2)

def extract_article_data(filename):
    """從 .txt 檔案中提取文章數據"""
    if not filename.endswith(".txt") or filename == "article_template.txt":
        return None

    # 提取 ID 從檔案名，例如 article_1.txt -> ID = 1
    try:
        id_str = filename.replace("article_", "").replace(".txt", "")
        article_id = int(id_str)
    except ValueError:
        print(f"錯誤：檔案 {filename} 的名稱格式不正確，應為 article_{id}.txt")
        return None

    # 讀取檔案內容
    with open(os.path.join(ARTICLES_DIR, filename), 'r', encoding='utf-8') as f:
        content = f.read().strip()

    # 分割標題和正文，忽略以 # 開頭的註解
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            lines.append(line)

    if not lines:
        print(f"錯誤：檔案 {filename} 為空或僅含註解")
        return None

    # 第一行為標題
    title = lines[0].strip()
    if not title:
        print(f"錯誤：檔案 {filename} 缺少標題")
        return None

    # 提取正文段落（以空行分隔）
    paragraphs = []
    current_paragraph = []
    for line in lines[1:]:
        line = line.strip()
        if line:
            current_paragraph.append(line)
        else:
            if current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
    if current_paragraph:
        paragraphs.append(' '.join(current_paragraph))

    if not paragraphs:
        print(f"錯誤：檔案 {filename} 缺少正文內容")
        return None

    # 自動生成其他字段
    date = datetime.utcnow().strftime("%Y-%m-%d")  # 當前日期
    category = "未分類"  # 預設分類
    preview_text = paragraphs[0][:100] + "..." if len(paragraphs[0]) > 100 else paragraphs[0]  # 第一段前100字作為預覽
    description = paragraphs[0][:150] + "..." if len(paragraphs[0]) > 150 else paragraphs[0]  # 第一段前150字作為描述
    keywords = "霍爾果斯, 會計資訊"  # 預設關鍵字

    return {
        "id": article_id,
        "title": title,
        "content": paragraphs,
        "date": date,
        "category": category,
        "previewText": preview_text,
        "description": description,
        "keywords": keywords,
        "filename": filename
    }

def generate_articles():
    # 載入之前的哈希值
    previous_hashes = load_hashes()
    current_hashes = {}

    # 確保 generated_articles 目錄存在
    os.makedirs(GENERATED_ARTICLES_DIR, exist_ok=True)

    articles = []
    for filename in os.listdir(ARTICLES_DIR):
        article_data = extract_article_data(filename)
        if article_data:
            # 計算當前檔案的哈希值
            file_path = os.path.join(ARTICLES_DIR, filename)
            current_hash = compute_file_hash(file_path)
            current_hashes[filename] = current_hash

            # 檢查檔案是否變更（包括名稱變更或內容變更）
            previous_hash = previous_hashes.get(filename)
            should_generate = previous_hash != current_hash

            if should_generate:
                articles.append(article_data)
                print(f"檢測到檔案 {filename} 已變更，將重新生成文章")

    # 檢查是否有檔案被刪除或名稱變更（ID 改變）
    for old_filename in previous_hashes.keys():
        if old_filename not in current_hashes:
            # 提取舊檔案的 ID
            try:
                old_id = int(old_filename.replace("article_", "").replace(".txt", ""))
                old_article_path = os.path.join(GENERATED_ARTICLES_DIR, f"article{old_id}.html")
                if os.path.exists(old_article_path):
                    os.remove(old_article_path)
                    print(f"檢測到檔案 {old_filename} 已刪除或更名，移除對應的文章 {old_article_path}")
            except ValueError:
                continue

    # 按 ID 排序
    articles.sort(key=lambda x: x["id"])

    # 讀取現有的 articles.json（如果存在）
    articles_json_path = "blog/articles.json"
    if os.path.exists(articles_json_path):
        with open(articles_json_path, 'r', encoding='utf-8') as f:
            all_articles_data = json.load(f)
    else:
        all_articles_data = {
            "meta": {
                "generated_at": datetime.utcnow().isoformat(),
                "total_articles": 0
            },
            "articles": []
        }

    # 更新 articles.json
    existing_articles = {article["id"]: article for article in all_articles_data["articles"]}
    for article in articles:
        # 生成 HTML
        content_html = ''.join(
            [f'<div class="article-paragraph">{p}</div>' for p in article['content']]
        )
        html_content = ARTICLE_TEMPLATE.format(
            title=article['title'],
            content=content_html,
            date=article['date'],
            category=article['category']
        )
        output_path = os.path.join(GENERATED_ARTICLES_DIR, f"article{article['id']}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(base_html.format(
                title=f"{article['title']} | 霍爾果斯會計師事務所",
                description=article['description'],
                keywords=article['keywords'],
                canonical=f"/blog/generated_articles/article{article['id']}.html",
                navbar=navbar_html,
                content=html_content,
                footer=footer_html
            ))

        # 更新 articles.json 中的條目
        existing_articles[article['id']] = {
            "id": article['id'],
            "title": article['title'],
            "date": article['date'],
            "category": article['category'],
            "url": f"/blog/generated_articles/article{article['id']}.html",
            "previewText": article.get('previewText', article['content'][0] if article['content'] else '')
        }

    # 更新 all_articles_data
    all_articles_data["articles"] = list(existing_articles.values())
    all_articles_data["articles"].sort(key=lambda x: x["id"])
    all_articles_data["meta"]["generated_at"] = datetime.utcnow().isoformat()
    all_articles_data["meta"]["total_articles"] = len(all_articles_data["articles"])

    with open(articles_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_articles_data, f, ensure_ascii=False, indent=2)

    # 儲存當前哈希值
    save_hashes(current_hashes)

    print("文章生成完成！")

if __name__ == '__main__':
    with open("templates/base.html", "r", encoding="utf-8") as f:
        base_html = f.read()
    with open("templates/_navbar.html", "r", encoding="utf-8") as f:
        navbar_html = f.read()
    with open("templates/_footer.html", "r", encoding="utf-8") as f:
        footer_html = f.read()

    generate_articles()