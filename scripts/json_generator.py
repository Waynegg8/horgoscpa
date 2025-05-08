#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
更新博客JSON數據
用於GitHub Actions自動化流程
"""

import sys
import os
from datetime import datetime
from pathlib import Path

# 添加主腳本目錄到系統路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'scripts'))

# 導入JSON生成器
try:
    from json_generator import JsonGenerator
    print("成功導入JSON生成器")
except ImportError as e:
    print(f"錯誤: 無法導入JSON生成器 - {e}")
    sys.exit(1)

def main():
    """更新所有博客相關JSON文件"""
    try:
        print(f"開始更新博客JSON文件 - {datetime.now()}")
        
        # 初始化JSON生成器
        data_dir = os.path.join(project_root, 'assets/data')
        generator = JsonGenerator(data_dir)
        
        # 生成所有JSON數據
        result = generator.generate_all_json()
        
        # 輸出更新統計信息
        if result:
            print(f"更新成功: {len(result['blog_index']['posts'])} 篇文章")
            print(f"系列文章: {len(result['series_data']['series_list'])} 個系列")
            latest_posts_count = len(result['latest_posts'])
            print(f"最新文章: {latest_posts_count} 篇")
            print(f"分類數量: {len(result['categories']['categories'])} 個")
            print(f"標籤數量: {len(result['tags']['tags'])} 個")
        
        print(f"博客JSON文件更新完成 - {datetime.now()}")
        return 0
    
    except Exception as e:
        print(f"更新博客JSON文件時發生錯誤: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())