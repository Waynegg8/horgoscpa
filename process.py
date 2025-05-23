import os
import glob
import json
import shutil
from datetime import datetime

def process_word_docs():
    count = 0
    docx_files = glob.glob('word-docs/*.docx')
    
    for docx_file in docx_files:
        if os.path.basename(docx_file).startswith('~'):
            continue
            
        basename = os.path.basename(docx_file).replace('.docx', '')
        clean_name = basename.lower().replace(' ', '-')
        
        html_file = f'blog/2025-01-01-{clean_name}.html'
        
        html_content = f'''<!DOCTYPE html>
<html>
<head>
<title>{basename}</title>
<meta charset="utf-8">
</head>
<body>
<h1>{basename}</h1>
<p>Content processed on {datetime.now().strftime('%Y-%m-%d')}</p>
</body>
</html>'''
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        dest_file = f'word-docs/processed/{os.path.basename(docx_file)}'
        shutil.move(docx_file, dest_file)
        
        count += 1
        print(f'Processed: {basename}')
    
    return count

def update_json():
    html_files = glob.glob('blog/*.html')
    posts = []
    
    for html_file in html_files:
        filename = os.path.basename(html_file).replace('.html', '')
        title = filename.replace('-', ' ').title()
        
        post = {
            'title': title,
            'url': filename,
            'date': '2025-01-01'
        }
        posts.append(post)
    
    data = {
        'posts': posts,
        'total': len(posts),
        'updated': datetime.now().isoformat()
    }
    
    with open('assets/data/blog_posts.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f'Updated JSON with {len(posts)} posts')

if __name__ == '__main__':
    processed = process_word_docs()
    update_json()
    print(f'Total processed: {processed}')
