#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
目錄結構檢查工具
用於檢測專案目錄結構並列出相關文件
"""

import os
import sys

# 引入 utils 模組 (如果需要使用字典)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_translation_dict

def check_directory_structure():
    """檢查專案目錄結構"""
    # 獲取當前工作目錄
    current_dir = os.getcwd()
    print(f"當前工作目錄: {current_dir}")
    
    # 嘗試獲取專案根目錄
    try:
        if os.path.exists(os.path.join(current_dir, '.git')):
            project_root = current_dir
        elif os.path.exists(os.path.join(current_dir, '..', '.git')):
            project_root = os.path.abspath(os.path.join(current_dir, '..'))
        elif os.path.exists(os.path.join(current_dir, '..', '..', '.git')):
            project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
        else:
            # 如果找不到 .git 目錄，嘗試從當前目錄開始
            project_root = current_dir
        
        print(f"推斷的專案根目錄: {project_root}")
    except Exception as e:
        print(f"嘗試確定專案根目錄時出錯: {str(e)}")
        project_root = current_dir
    
    # 列出根目錄下所有目錄和文件
    print("\n專案根目錄的內容:")
    try:
        for item in os.listdir(project_root):
            item_path = os.path.join(project_root, item)
            item_type = "目錄" if os.path.isdir(item_path) else "文件"
            print(f"  - {item} ({item_type})")
    except Exception as e:
        print(f"列出根目錄內容時出錯: {str(e)}")
    
    # 檢查 blog 目錄
    blog_dir = os.path.join(project_root, 'blog')
    print(f"\n檢查 blog 目錄: {blog_dir}")
    
    if os.path.exists(blog_dir):
        print("blog 目錄存在")
        try:
            # 檢查是否為目錄
            if os.path.isdir(blog_dir):
                print("blog 是一個目錄")
                # 列出 blog 目錄中的文件
                print("blog 目錄中的文件:")
                blog_files = os.listdir(blog_dir)
                if blog_files:
                    for file in blog_files:
                        file_path = os.path.join(blog_dir, file)
                        file_size = os.path.getsize(file_path)
                        print(f"  - {file} (大小: {file_size} 字節)")
                else:
                    print("  blog 目錄為空")
            else:
                print("blog 不是一個目錄，而是一個文件")
        except Exception as e:
            print(f"讀取 blog 目錄時出錯: {str(e)}")
    else:
        print("blog 目錄不存在")
        # 嘗試創建 blog 目錄
        try:
            os.makedirs(blog_dir, exist_ok=True)
            print(f"已創建 blog 目錄: {blog_dir}")
        except Exception as e:
            print(f"嘗試創建 blog 目錄時出錯: {str(e)}")
    
    # 檢查 assets/data 目錄
    data_dir = os.path.join(project_root, 'assets', 'data')
    print(f"\n檢查 assets/data 目錄: {data_dir}")
    
    if os.path.exists(data_dir):
        print("assets/data 目錄存在")
        try:
            # 列出 assets/data 目錄中的文件
            print("assets/data 目錄中的文件:")
            data_files = os.listdir(data_dir)
            if data_files:
                for file in data_files:
                    file_path = os.path.join(data_dir, file)
                    file_size = os.path.getsize(file_path)
                    print(f"  - {file} (大小: {file_size} 字節)")
            else:
                print("  assets/data 目錄為空")
        except Exception as e:
            print(f"讀取 assets/data 目錄時出錯: {str(e)}")
    else:
        print("assets/data 目錄不存在")
        # 嘗試創建 assets/data 目錄
        try:
            os.makedirs(data_dir, exist_ok=True)
            print(f"已創建 assets/data 目錄: {data_dir}")
        except Exception as e:
            print(f"嘗試創建 assets/data 目錄時出錯: {str(e)}")
            
    # 檢查翻譯詞典
    tw_dict_path = os.path.join(project_root, "tw_financial_dict.json")
    print(f"\n檢查翻譯詞典: {tw_dict_path}")
    
    if os.path.exists(tw_dict_path):
        print("翻譯詞典存在")
        # 使用 utils 模組加載詞典
        tw_dict = load_translation_dict()
        if tw_dict:
            print(f"詞典包含 {len(tw_dict)} 個詞彙")
        else:
            print("詞典檔案存在但無法加載或為空")
    else:
        print("翻譯詞典不存在")

if __name__ == "__main__":
    print(f"Python 版本: {sys.version}")
    print(f"平台: {sys.platform}")
    check_directory_structure()