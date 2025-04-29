import os
import json
from datetime import datetime

# 路径设置
BASE_DIR = "."
BLOG_DIR = os.path.join(BASE_DIR, "blog")
ARTICLES_SOURCE_DIR = os.path.join(BLOG_DIR, "articles")  # 文章源文件目录
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

def generate_articles():
    # 读取所有文章
    articles = []
    for filename in os.listdir(ARTICLES_SOURCE_DIR):
        if filename.endswith(".json"):
            path = os.path.join(ARTICLES_SOURCE_DIR, filename)
            with open(path, "r", encoding="utf-8") as f:
                articles.append(json.load(f))

    # 按日期排序
    articles.sort(key=lambda x: datetime.strptime(x["date"], "%Y-%m-%d"), reverse=True)

    # 生成 articles.json 到 /blog 目录
    output_path = os.path.join(BLOG_DIR, "articles.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"articles": articles}, f, ensure_ascii=False, indent=2)

    print(f"已生成 {len(articles)} 篇文章索引到 {output_path}")

if __name__ == "__main__":
    generate_articles()