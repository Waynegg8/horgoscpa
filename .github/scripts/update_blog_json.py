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

def main():
    """更新所有博客相關JSON文件"""
    try:
        print(f"開始更新博客JSON文件 - {datetime.now()}")
        
        # 只在這裡設置路徑並導入，避免在模組層級導入
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        
        # 確保我們首先查找項目根目錄，然後是scripts目錄
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
            
        # 直接添加本地 scripts 目錄(如果存在)
        scripts_dir = os.path.join(project_root, 'scripts')
        if os.path.exists(scripts_dir) and scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
            
        # 檢查json_generator.py是否存在於預期的位置
        json_generator_path = os.path.join(scripts_dir, 'json_generator.py')
        if not os.path.exists(json_generator_path):
            print(f"警告: 找不到 json_generator.py 在 {json_generator_path}")
            # 嘗試查找可能的位置
            for root, dirs, files in os.walk(project_root):
                if 'json_generator.py' in files:
                    print(f"找到 json_generator.py 在 {os.path.join(root, 'json_generator.py')}")
        
        # 導入JSON生成器 - 延遲到這裡導入以避免循環
        try:
            from json_generator import JsonGenerator
            print("成功導入JSON生成器")
        except ImportError as e:
            print(f"錯誤: 無法導入JSON生成器 - {e}")
            sys.exit(1)
        
        # 初始化JSON生成器
        data_dir = os.path.join(project_root, 'assets/data')
        generator = JsonGenerator(data_dir)
        
        # 生成所有JSON數據
        result = generator.generate_all_json()
        
        # 輸出更新統計信息
        if result:
            print(f"更新成功: {len(result['blog_index']['posts'])} 篇文章")
            print(f"系列文章: {len(result['series_data']['series_list'])} 個系列")
            print(f"最新文章: {len(result['latest_posts'])} 篇")
            print(f"分類數量: {len(result['categories']['categories'])} 個")
            print(f"標籤數量: {len(result['tags']['tags'])} 個")
        
        print(f"博客JSON文件更新完成 - {datetime.now()}")
        return 0
    
    except Exception as e:
        print(f"更新博客JSON文件時發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())