import os
import json
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
BLOG_DIR = BASE_DIR / "blog"
ARTICLES_DIR = BLOG_DIR / "articles"
TEMPLATES_DIR = BASE_DIR / "templates"

def load_template(name):
    with open(TEMPLATES_DIR / f"{name}.html", "r", encoding="utf-8") as f:
        return f.read()

def generate_articles():
    # 載入組件
    base_template = load_template("base")
    navbar = load_template("_navbar")
    footer = load_template("_footer")

    # 讀取文章數據
    articles = []
    for file in ARTICLES_DIR.glob("article*.json"):
        with open(file, "r", encoding="utf-8") as f:
            articles.append(json.load(f))

    # 生成文章HTML
    for article in articles:
        content = "".join(f"<p>{p}</p>" for p in article["content"])
        html = base_template.format(
            title=article["title"],
            description=article["description"],
            keywords=article["keywords"],
            date=article["date"],
            category=article["category"],
            content=content,
            navbar=navbar,
            footer=footer,
            canonical=f"https://yourdomain.com/blog/article{article['id']}.html"
        )
        output_path = BLOG_DIR / f"article{article['id']}.html"
        output_path.write_text(html, encoding="utf-8")

    # 生成文章索引
    articles_data = {
        "articles": sorted(articles, 
            key=lambda x: datetime.strptime(x["date"], "%Y-%m-%d"), 
            reverse=True)
    }
    (BLOG_DIR / "articles.json").write_text(
        json.dumps(articles_data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

if __name__ == "__main__":
    generate_articles()