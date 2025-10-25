#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV數據解析工具
用於解析活頁簿1.csv和活頁簿2.csv並轉換為可用的JSON格式
"""

import csv
import json
import sys

def detect_encoding(file_path):
    """檢測文件編碼"""
    encodings = ['utf-8', 'big5', 'gb2312', 'gbk', 'big5-hkscs']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                f.read()
            return encoding
        except (UnicodeDecodeError, LookupError):
            continue
    
    return 'utf-8'  # 默認

def parse_client_data(csv_path):
    """解析客戶基本資料（活頁簿1）"""
    encoding = detect_encoding(csv_path)
    print(f"檢測到編碼: {encoding}")
    
    clients = []
    
    with open(csv_path, 'r', encoding=encoding, errors='ignore') as f:
        # 跳過可能損壞的第一行
        reader = csv.reader(f)
        headers = next(reader)  # 讀取標題
        
        print(f"CSV標題: {headers[:5]}...")  # 只打印前5個
        
        for row_num, row in enumerate(reader, start=2):
            if len(row) < 5:
                continue
                
            try:
                client = {
                    'tax_id': row[0].strip() if len(row) > 0 else '',
                    'name': row[1].strip() if len(row) > 1 else '',
                    'business_type': row[2].strip() if len(row) > 2 else '',
                    'region': row[3].strip() if len(row) > 3 else '',
                    'contact_person_1': row[4].strip() if len(row) > 4 else '',
                    'contact_person_2': row[5].strip() if len(row) > 5 else '',
                    'phone': row[6].strip() if len(row) > 6 else '',
                    'email': row[7].strip() if len(row) > 7 else '',
                    'monthly_fee': row[8].strip() if len(row) > 8 else '0',
                    'services': {
                        'accounting': row[9].strip() if len(row) > 9 else '',
                        'timesheet': row[10].strip() if len(row) > 10 else '',
                        'report': row[11].strip() if len(row) > 11 else '',
                        'tax_return': row[12].strip() if len(row) > 12 else '',
                        'registration': row[13].strip() if len(row) > 13 else '',
                        'withholding': row[14].strip() if len(row) > 14 else '',
                        'prepayment': row[15].strip() if len(row) > 15 else '',
                        'annual_report': row[16].strip() if len(row) > 16 else '',
                        'payroll': row[17].strip() if len(row) > 17 else '',
                        'audit': row[18].strip() if len(row) > 18 else '',
                    },
                    'notes': row[21].strip() if len(row) > 21 else ''
                }
                
                if client['tax_id'] and client['name']:
                    clients.append(client)
                    
            except Exception as e:
                print(f"第 {row_num} 行解析錯誤: {e}")
                continue
    
    return clients

def parse_service_schedule(csv_path):
    """解析服務排程資料（活頁簿2）"""
    encoding = detect_encoding(csv_path)
    print(f"檢測到編碼: {encoding}")
    
    schedules = []
    
    with open(csv_path, 'r', encoding=encoding, errors='ignore') as f:
        reader = csv.reader(f)
        headers = next(reader)  # 讀取標題
        
        print(f"CSV標題: {headers[:5]}...")
        
        for row_num, row in enumerate(reader, start=2):
            if len(row) < 5:
                continue
                
            try:
                schedule = {
                    'tax_id': row[0].strip() if len(row) > 0 else '',
                    'client_name': row[1].strip() if len(row) > 1 else '',
                    'region': row[2].strip() if len(row) > 2 else '',
                    'service_type': row[3].strip() if len(row) > 3 else '',
                    'frequency': row[4].strip() if len(row) > 4 else '',
                    'monthly_fee': row[5].strip() if len(row) > 5 else '0',
                    'months': {
                        '1': row[7].strip() if len(row) > 7 else '',
                        '2': row[8].strip() if len(row) > 8 else '',
                        '3': row[9].strip() if len(row) > 9 else '',
                        '4': row[10].strip() if len(row) > 10 else '',
                        '5': row[11].strip() if len(row) > 11 else '',
                        '6': row[12].strip() if len(row) > 12 else '',
                        '7': row[13].strip() if len(row) > 13 else '',
                        '8': row[14].strip() if len(row) > 14 else '',
                        '9': row[15].strip() if len(row) > 15 else '',
                        '10': row[16].strip() if len(row) > 16 else '',
                        '11': row[17].strip() if len(row) > 17 else '',
                        '12': row[18].strip() if len(row) > 18 else '',
                    },
                    'service_details': row[19].strip() if len(row) > 19 else '',
                    'notes': row[20].strip() if len(row) > 20 else ''
                }
                
                if schedule['tax_id'] and schedule['client_name']:
                    schedules.append(schedule)
                    
            except Exception as e:
                print(f"第 {row_num} 行解析錯誤: {e}")
                continue
    
    return schedules

def main():
    print("=" * 60)
    print("開始解析CSV數據...")
    print("=" * 60)
    
    # 解析客戶資料
    print("\n1. 解析客戶基本資料 (活頁簿1.csv)...")
    try:
        clients = parse_client_data('活頁簿1.csv')
        print(f"✓ 成功解析 {len(clients)} 筆客戶資料")
        
        with open('scripts/parsed_clients.json', 'w', encoding='utf-8') as f:
            json.dump(clients, f, ensure_ascii=False, indent=2)
        print(f"✓ 已儲存到 scripts/parsed_clients.json")
        
        # 顯示前3筆
        print("\n前3筆客戶資料:")
        for i, client in enumerate(clients[:3], 1):
            print(f"\n  {i}. {client['name']} ({client['tax_id']})")
            print(f"     地區: {client['region']}, 月費: {client['monthly_fee']}")
            
    except Exception as e:
        print(f"✗ 解析失敗: {e}")
    
    # 解析服務排程
    print("\n2. 解析服務排程資料 (活頁簿2.csv)...")
    try:
        schedules = parse_service_schedule('活頁簿2.csv')
        print(f"✓ 成功解析 {len(schedules)} 筆服務排程")
        
        with open('scripts/parsed_schedules.json', 'w', encoding='utf-8') as f:
            json.dump(schedules, f, ensure_ascii=False, indent=2)
        print(f"✓ 已儲存到 scripts/parsed_schedules.json")
        
        # 顯示前3筆
        print("\n前3筆服務排程:")
        for i, schedule in enumerate(schedules[:3], 1):
            print(f"\n  {i}. {schedule['client_name']} - {schedule['service_type']}")
            print(f"     頻率: {schedule['frequency']}, 費用: {schedule['monthly_fee']}")
            months = [k for k, v in schedule['months'].items() if v]
            if months:
                print(f"     執行月份: {', '.join(months)}")
                
    except Exception as e:
        print(f"✗ 解析失敗: {e}")
    
    print("\n" + "=" * 60)
    print("解析完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()

