#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通過API導入客戶服務配置到遠程數據庫
"""
import csv
import json
import requests
from datetime import datetime

API_BASE = 'https://timesheet-api.hergscpa.workers.dev'

def parse_csv_big5(filename):
    """解析Big5編碼的CSV文件"""
    encodings = ['big5', 'cp950', 'big5hkscs']
    
    for encoding in encodings:
        try:
            with open(filename, 'r', encoding=encoding, errors='ignore') as f:
                reader = csv.reader(f)
                data = list(reader)
                print(f"✓ 成功使用 {encoding} 編碼讀取 {filename}")
                return data
        except Exception as e:
            continue
    
    print(f"✗ 無法讀取文件 {filename}")
    return None

def parse_workbook2(data):
    """解析活頁簿2 - 每月固定任務配置"""
    if not data or len(data) < 2:
        return []
    
    services = []
    
    for row in data[1:]:
        if len(row) < 2 or not row[0].strip():
            continue
        
        # 解析每月執行配置
        monthly_schedule = {}
        for month in range(1, 13):
            col_index = 7 + month - 1
            if len(row) > col_index:
                value = row[col_index].strip()
                monthly_schedule[str(month)] = (value == 'V' or value.upper() == 'V')
        
        service = {
            'tax_id': row[0].strip() if len(row) > 0 else '',
            'name': row[1].strip() if len(row) > 1 else '',
            'assigned_to': row[2].strip() if len(row) > 2 else '',
            'service_name': row[3].strip() if len(row) > 3 else '',
            'frequency': row[4].strip() if len(row) > 4 else '',
            'fee': row[5].strip().replace(',', '').replace(' ', '') if len(row) > 5 else '0',
            'estimated_hours': row[6].strip() if len(row) > 6 else '0',
            'monthly_schedule': monthly_schedule,
            'billing_timing': row[19].strip() if len(row) > 19 else '',
            'billing_notes': row[20].strip() if len(row) > 20 else '',
            'service_notes': row[21].strip() if len(row) > 21 else ''
        }
        services.append(service)
    
    return services

def map_service_to_category(service_name):
    """將服務項目對應到5大類別"""
    service_name = service_name.strip()
    
    if '記帳' in service_name or '帳' in service_name:
        return '記帳'
    
    if '工商' in service_name or '登記' in service_name or '設立' in service_name or '變更' in service_name or '解散' in service_name:
        return '工商'
    
    if '簽證' in service_name or '財簽' in service_name or '查核' in service_name:
        return '財簽'
    
    if any(x in service_name for x in ['營業稅', '營所稅', '扣繳', '暫繳', '二代健保', '盈餘', '所得稅', '稅']):
        return '稅簽'
    
    return '其他'

def import_via_api(services, token):
    """通過API導入數據"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    imported_count = 0
    failed_count = 0
    
    for service in services:
        try:
            category = map_service_to_category(service['service_name'])
            
            fee_str = service['fee'].strip()
            if fee_str == '-' or fee_str == '':
                fee = 0
            else:
                fee = float(fee_str)
            
            hours_str = service['estimated_hours'].strip()
            if hours_str == '-' or hours_str == '':
                hours = 0
            else:
                hours = float(hours_str)
            
            data = {
                'client_name': service['name'],
                'client_tax_id': service['tax_id'],
                'service_name': service['service_name'],
                'service_category': category,
                'frequency': service['frequency'],
                'fee': fee,
                'estimated_hours': hours,
                'monthly_schedule': service['monthly_schedule'],
                'billing_timing': service['billing_timing'],
                'billing_notes': service['billing_notes'],
                'service_notes': service['service_notes'],
                'assigned_to': service['assigned_to']
            }
            
            response = requests.post(f'{API_BASE}/api/services', headers=headers, json=data)
            
            if response.status_code == 200:
                imported_count += 1
                if imported_count % 10 == 0:
                    print(f"已導入 {imported_count} 項...")
            else:
                failed_count += 1
                print(f"✗ 導入失敗: {service['name']} - {service['service_name']}: {response.text}")
        
        except Exception as e:
            failed_count += 1
            print(f"✗ 導入失敗: {service['name']} - {service['service_name']}: {e}")
    
    return imported_count, failed_count

def main():
    print("="*60)
    print("客戶服務配置導入工具（API版本）")
    print("="*60)
    
    # 1. 解析活頁簿2
    print("\n[步驟1] 解析活頁簿2.csv（每月固定任務）")
    workbook2_data = parse_csv_big5('活頁簿2.csv')
    if not workbook2_data:
        print("✗ 無法讀取活頁簿2.csv")
        return False
    
    services = parse_workbook2(workbook2_data)
    print(f"✓ 解析完成，共 {len(services)} 項服務配置")
    
    # 2. 顯示樣本
    print("\n[樣本預覽]")
    if services:
        sample = services[0]
        print(f"客戶: {sample['name']}")
        print(f"服務: {sample['service_name']}")
        print(f"頻率: {sample['frequency']}")
        print(f"收費: {sample['fee']}")
        print(f"類別: {map_service_to_category(sample['service_name'])}")
    
    # 3. 按類別統計
    category_stats = {}
    for service in services:
        category = map_service_to_category(service['service_name'])
        category_stats[category] = category_stats.get(category, 0) + 1
    
    print("\n[類別統計]")
    for category, count in sorted(category_stats.items()):
        print(f"  {category}: {count} 項")
    
    # 4. 導入確認
    print("\n[步驟2] 通過API導入到遠程數據庫")
    token = input("請輸入 session token（從瀏覽器localStorage取得）: ").strip()
    
    if not token:
        print("✗ 未提供 token")
        return False
    
    confirm = input(f"確定要導入 {len(services)} 項服務配置嗎？(y/n): ")
    if confirm.lower() != 'y':
        print("已取消導入")
        return False
    
    print("\n開始導入...")
    imported_count, failed_count = import_via_api(services, token)
    
    print(f"\n✓ 導入完成！")
    print(f"  成功: {imported_count} 項")
    print(f"  失敗: {failed_count} 項")
    
    print("\n" + "="*60)
    print("完成！")
    print("="*60)

if __name__ == '__main__':
    main()

