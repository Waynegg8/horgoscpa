import os
import json
import shutil
from datetime import datetime
from pathlib import Path

# 路径配置
BASE_DIR = Path(__file__).parent
BLOG_DIR = BASE_DIR / "blog"
ARTICLES_DIR = BLOG_DIR / "articles"
TEMPLATES_DIR = BASE_DIR / "templates"

# HTML模板组件
def load_template(name):
    with open(TEMPLATES_DIR / f"{name}.html", "r", encoding="utf-8") as f:
        return f.read()

# 核心生成逻辑
def generate_articles():
    # 清空旧文章（保留原始JSON）
    output_dir = BLOG_DIR / "generated_articles"
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(exist_ok=True)

    # 加载模板组件
    base_template = load_template("base")
    navbar = load_template("_navbar")
    footer = load_template("_footer")

    # 收集所有文章数据
    articles = []
    for root, _, files in os.walk(ARTICLES_DIR):
        for file in files:
            if file.endswith(".json"):
                file_path = Path(root) / file
                with open(file_path, "r", encoding="utf-8") as f:
                    try:
                        article = json.load(f)
                        article["file_path"] = file_path  # 保留原始路径信息
                        articles.append(article)
                    except json.JSONDecodeError as e:
                        print(f"错误：文件 {file} 格式无效 ({e})")
                        continue

    # 强制按日期重新排序
    articles.sort(
        key=lambda x: datetime.strptime(x["date"], "%Y-%m-%d"),
        reverse=True
    )

    # 生成HTML文件（强制覆盖）
    for article in articles:
        try:
            # 构建输出路径
            output_path = output_dir / f"article{article['id']}.html"
            
            # 生成内容
            content = "".join(f"<p>{p}</p>" for p in article["content"])
            html = base_template.format(
                title=article["title"],
                description=article.get("description", ""),
                content=content,
                date=article["date"],
                category=article["category"],
                navbar=navbar,
                footer=footer,
                canonical=f"https://horgoscpa.com/blog/article{article['id']}.html"
            )
            
            # 强制写入文件
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"已生成：{output_path}")

        except KeyError as e:
            print(f"错误：文章 {article.get('id', '未知')} 缺少必要字段 {e}")
            continue

    # 生成全局索引（强制覆盖）
    articles_data = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "total_articles": len(articles)
        },
        "articles": [
            {
                "id": a["id"],
                "title": a["title"],
                "date": a["date"],
                "category": a["category"],
                "url": f"/blog/generated_articles/article{a['id']}.html"
            } for a in articles
        ]
    }
    
    index_path = BLOG_DIR / "articles.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(articles_data, f, ensure_ascii=False, indent=2)
    print(f"已生成全局索引：{index_path}")

if __name__ == "__main__":
    generate_articles()