#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析Big5編碼的CSV文件並輸出為UTF-8 JSON
"""
import csv
import json
import sys

def parse_csv_big5(input_file, output_file):
    """解析Big5編碼的CSV並輸出為JSON"""
    try:
        # 嘗試不同的編碼
        encodings = ['big5', 'cp950', 'big5hkscs', 'gbk', 'gb18030']
        data = None
        used_encoding = None
        
        for encoding in encodings:
            try:
                with open(input_file, 'r', encoding=encoding, errors='ignore') as f:
                    reader = csv.reader(f)
                    data = list(reader)
                    used_encoding = encoding
                    print(f"成功使用 {encoding} 編碼讀取文件")
                    break
            except Exception as e:
                print(f"嘗試 {encoding} 編碼失敗: {e}")
                continue
        
        if data is None:
            print("無法讀取文件")
            return False
        
        # 輸出為JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"已將數據寫入 {output_file}")
        
        # 打印前幾行預覽
        print("\n前5行預覽:")
        for i, row in enumerate(data[:5]):
            print(f"第{i+1}行: {row}")
        
        return True
        
    except Exception as e:
        print(f"錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # 解析活頁簿1.csv
    print("="*50)
    print("解析活頁簿1.csv")
    print("="*50)
    parse_csv_big5('活頁簿1.csv', 'scripts/workbook1_parsed.json')
    
    print("\n" + "="*50)
    print("解析活頁簿2.csv")
    print("="*50)
    parse_csv_big5('活頁簿2.csv', 'scripts/workbook2_parsed.json')

