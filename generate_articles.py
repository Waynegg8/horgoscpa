import os
import json
from datetime import datetime

ARTICLES_DIR = "blog/articles"
GENERATED_ARTICLES_DIR = "blog/generated_articles"
ARTICLE_TEMPLATE = """
    <section class="article">
        <h1>{title}</h1>
        <div class="article-date">日期：{date}</div>
        <div class="article-category">分類：{category}</div>
        <div class="article-content">
            {content}
        </div>
    </section>
    <div class="floating-buttons">
        <a href="https://line.me/R/ti/p/@your-line-id" class="line-button">加入LINE</a>
        <a href="/consult.html" class="consult-button">立即諮詢</a>
    </div>
"""


def generate_articles():
    articles = []
    os.makedirs(GENERATED_ARTICLES_DIR, exist_ok=True)

    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(ARTICLES_DIR, filename), 'r', encoding='utf-8') as f:
                try:
                    article = json.load(f)
                    required_fields = ['id', 'title', 'content', 'date', 'category', 'description', 'keywords']
                    if not all(field in article for field in required_fields):
                        print(f"錯誤：文件 {filename} 缺少必要字段")
                        continue
                    articles.append(article)
                except json.JSONDecodeError:
                    print(f"錯誤：文件 {filename} 不是有效的 JSON 格式")
                    continue

    all_articles_data = {"articles": []}

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

        all_articles_data["articles"].append({
            "id": article['id'],
            "title": article['title'],
            "date": article['date'],
            "category": article['category'],
            "url": f"/blog/generated_articles/article{article['id']}.html",
            "previewText": article.get('previewText', article['content'][0] if article['content'] else '')
        })

    articles_json_path = "blog/articles.json"
    with open(articles_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_articles_data, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    with open("base.html", "r", encoding="utf-8") as f:
        base_html = f.read()
    with open("_navbar.html", "r", encoding="utf-8") as f:
        navbar_html = f.read()
    with open("_footer.html", "r", encoding="utf-8") as f:
        footer_html = f.read()

    generate_articles()
    print("文章生成完成！")