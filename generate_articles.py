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
        <a href="/consult.html" class="consult-button">免費諮詢</a>
    </div>
"""

def compute_file_hash(filename):
    hasher = hashlib.md5()
    with open(filename, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_hashes():
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_hashes(hashes):
    with open(HASH_FILE, 'w', encoding='utf-8') as f:
        json.dump(hashes, f, ensure_ascii=False, indent=2)

def determine_category(title, content):
    text = (title + " " + " ".join(content)).lower()
    if "稅務" in text:
        return "稅務"
    elif "財務" in text or "財稅" in text:
        return "財務管理"
    else:
        return "其他"

def extract_article_data(filename):
    if not filename.endswith(".txt") or filename == "article_template.txt":
        return None

    try:
        id_str = filename.replace("article_", "").replace(".txt", "")
        article_id = int(id_str)
    except ValueError:
        print(f"錯誤：檔案 {filename} 的名稱格式不正確，應為 article_{id}.txt")
        return None

    with open(os.path.join(ARTICLES_DIR, filename), 'r', encoding='utf-8') as f:
        content = f.read().strip()

    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            lines.append(line)

    if not lines:
        print(f"錯誤：檔案 {filename} 為空或僅含註解")
        return None

    title = lines[0].strip()
    if not title:
        print(f"錯誤：檔案 {filename} 缺少標題")
        return None

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

    date = datetime.utcnow().strftime("%Y-%m-%d")
    category = determine_category(title, paragraphs)
    preview_text = paragraphs[0][:100] + "..." if len(paragraphs[0]) > 100 else paragraphs[0]
    description = paragraphs[0][:150] + "..." if len(paragraphs[0]) > 150 else paragraphs[0]
    keywords = "霍爾果斯, 會計資訊"

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
    previous_hashes = load_hashes()
    current_hashes = {}

    os.makedirs(GENERATED_ARTICLES_DIR, exist_ok=True)

    articles = []
    for filename in os.listdir(ARTICLES_DIR):
        article_data = extract_article_data(filename)
        if article_data:
            file_path = os.path.join(ARTICLES_DIR, filename)
            current_hash = compute_file_hash(file_path)
            current_hashes[filename] = current_hash

            previous_hash = previous_hashes.get(filename)
            should_generate = previous_hash != current_hash

            if should_generate:
                articles.append(article_data)
                print(f"檢測到檔案 {filename} 已變更，將重新生成文章")

    for old_filename in previous_hashes.keys():
        if old_filename not in current_hashes:
            try:
                old_id = int(old_filename.replace("article_", "").replace(".txt", ""))
                old_article_path = os.path.join(GENERATED_ARTICLES_DIR, f"article{old_id}.html")
                if os.path.exists(old_article_path):
                    os.remove(old_article_path)
                    print(f"檢測到檔案 {old_filename} 已刪除或更名，移除對應的文章 {old_article_path}")
            except ValueError:
                continue

    articles.sort(key=lambda x: x["id"])

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

    existing_articles = {article["id"]: article for article in all_articles_data["articles"]}
    for article in articles:
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

        existing_articles[article['id']] = {
            "id": article['id'],
            "title": article['title'],
            "date": article['date'],
            "category": article['category'],
            "url": f"/blog/generated_articles/article{article['id']}.html",
            "previewText": article.get('previewText', article['content'][0] if article['content'] else '')
        }

    all_articles_data["articles"] = list(existing_articles.values())
    all_articles_data["articles"].sort(key=lambda x: x["id"])
    all_articles_data["meta"]["generated_at"] = datetime.utcnow().isoformat()
    all_articles_data["meta"]["total_articles"] = len(all_articles_data["articles"])

    with open(articles_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_articles_data, f, ensure_ascii=False, indent=2)

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