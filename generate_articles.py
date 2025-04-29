import os
import json
from datetime import datetime

# 路徑設定
BASE_DIR = "."
BLOG_DIR = os.path.join(BASE_DIR, "blog")
ARTICLES_DIR = os.path.join(BLOG_DIR, "articles")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUTPUT_DIR = BLOG_DIR

# HTML模板
with open(os.path.join(TEMPLATES_DIR, "base_template.html"), "r", encoding="utf-8") as f:
    BASE_TEMPLATE = f.read()

def load_component(component_name):
    with open(os.path.join(TEMPLATES_DIR, f"_{component_name}.html"), "r", encoding="utf-8") as f:
        return f.read()

def generate_articles():
    # 載入組件
    navbar = load_component("navbar")
    footer = load_component("footer")
    
    # 收集文章數據
    articles = []
    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(ARTICLES_DIR, filename), "r", encoding="utf-8") as f:
                articles.append(json.load(f))
    
    # 生成文章頁面
    for article in articles:
        content = "".join(f"<p>{paragraph}</p>" for paragraph in article["content"])
        html = BASE_TEMPLATE.format(
            title=article["title"],
            description=article["description"],
            keywords=article["keywords"],
            date=article["date"],
            category=article["category"],
            content=content,
            navbar=navbar,
            footer=footer,
            canonical=f"https://horgoscpa.com/blog/article{article['id']}.html"
        )
        with open