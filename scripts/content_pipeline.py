#!/usr/bin/env python3
"""
內容產線 - Markdown → JSON + HTML
功能：掃描 content/posts/*.md 與 content/resources/*.md，生成 posts.json、resources.json 與靜態 HTML
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

# 簡化的 Markdown 解析（可用 markdown 套件替代）
def parse_frontmatter(content):
    """解析 YAML front-matter"""
    if not content.startswith('---'):
        return {}, content
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    
    fm_text = parts[1].strip()
    body = parts[2].strip()
    
    metadata = {}
    for line in fm_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip().strip('"\'')
            # 處理陣列（tags, calculator_urls 等）
            if value.startswith('[') and value.endswith(']'):
                value = [v.strip().strip('"\'') for v in value[1:-1].split(',') if v.strip()]
            metadata[key] = value
    
    return metadata, body

def generate_posts_json():
    """掃描 content/posts/ 產生 posts.json"""
    posts = []
    posts_dir = Path('content/posts')
    
    if posts_dir.exists():
        for md_file in posts_dir.glob('**/*.md'):
            content = md_file.read_text(encoding='utf-8')
            metadata, body = parse_frontmatter(content)
            
            # 預設值
            post = {
                'id': metadata.get('slug', md_file.stem),
                'title': metadata.get('title', md_file.stem),
                'slug': metadata.get('slug', md_file.stem),
                'category': metadata.get('category', '未分類'),
                'tags': metadata.get('tags', []),
                'summary': metadata.get('summary', ''),
                'cover_image': metadata.get('cover_image', '/assets/images/blog/default.jpg'),
                'published_at': metadata.get('published_at', datetime.now().isoformat()),
                'updated_at': metadata.get('updated_at', datetime.now().isoformat()),
                'reading_minutes': metadata.get('reading_minutes', 5),
                'html_url': f'/blog/{metadata.get("slug", md_file.stem)}.html',
                'body': body
            }
            posts.append(post)
    
    # 依發布日期排序
    posts.sort(key=lambda x: x.get('published_at', ''), reverse=True)
    
    # 寫入 JSON
    output_path = Path('assets/data/posts.json')
    output_path.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'✓ 已生成 {len(posts)} 篇文章至 {output_path}')
    
    return posts

def generate_resources_json():
    """掃描 content/resources/ 產生 resources.json"""
    resources = []
    resources_dir = Path('content/resources')
    
    if resources_dir.exists():
        for md_file in resources_dir.glob('**/*.md'):
            content = md_file.read_text(encoding='utf-8')
            metadata, body = parse_frontmatter(content)
            
            resource = {
                'id': metadata.get('slug', md_file.stem),
                'title': metadata.get('title', md_file.stem),
                'slug': metadata.get('slug', md_file.stem),
                'type': metadata.get('type', 'guide'),
                'category': metadata.get('category', ''),
                'tags': metadata.get('tags', []),
                'summary': metadata.get('summary', ''),
                'updated_at': metadata.get('updated_at', datetime.now().isoformat()),
                'download_url': metadata.get('download_url', ''),
                'file_size': metadata.get('file_size', ''),
                'calculator_urls': metadata.get('calculator_urls', []),
                'body': body
            }
            resources.append(resource)
    
    # 依更新日期排序
    resources.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    
    # 寫入 JSON
    output_path = Path('assets/data/resources.json')
    output_path.write_text(json.dumps(resources, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'✓ 已生成 {len(resources)} 筆資源至 {output_path}')
    
    return resources

def generate_html_files(posts):
    """為每篇文章生成靜態 HTML（使用模板）"""
    template_path = Path('templates/post.html')
    if not template_path.exists():
        print('! 找不到 templates/post.html，跳過 HTML 生成')
        return
    
    template = template_path.read_text(encoding='utf-8')
    blog_dir = Path('blog')
    blog_dir.mkdir(exist_ok=True)
    
    for post in posts:
        # 簡化：直接替換占位符（實務可用 Jinja2）
        html = template.replace('{{TITLE}}', post['title'])
        html = html.replace('{{SLUG}}', post['slug'])
        html = html.replace('{{SUMMARY}}', post['summary'])
        html = html.replace('{{COVER_IMAGE}}', post['cover_image'])
        html = html.replace('{{PUBLISHED_AT}}', post['published_at'])
        html = html.replace('{{CATEGORY}}', post['category'])
        html = html.replace('{{BODY}}', post['body'])
        
        output_file = blog_dir / f"{post['slug']}.html"
        output_file.write_text(html, encoding='utf-8')
    
    print(f'✓ 已生成 {len(posts)} 個 HTML 文件至 blog/')

if __name__ == '__main__':
    print('=== 內容產線開始 ===')
    posts = generate_posts_json()
    resources = generate_resources_json()
    generate_html_files(posts)
    print('=== 完成 ===')



