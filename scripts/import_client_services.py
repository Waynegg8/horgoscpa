#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
導入客戶服務配置和每月固定任務
從活頁簿1.csv和活頁簿2.csv導入數據
"""
import csv
import json
import sqlite3
import sys
from datetime import datetime

def parse_csv_big5(filename):
    """解析Big5編碼的CSV文件"""
    encodings = ['big5', 'cp950', 'big5hkscs', 'gbk']
    
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

def parse_workbook1(data):
    """解析活頁簿1 - 客戶基本資料"""
    if not data or len(data) < 2:
        return []
    
    headers = data[0]
    clients = []
    
    for row in data[1:]:
        if len(row) < 2 or not row[0].strip():  # 跳過空行
            continue
            
        client = {
            'tax_id': row[0].strip() if len(row) > 0 else '',
            'name': row[1].strip() if len(row) > 1 else '',
            'status': row[2].strip() if len(row) > 2 else '',
            'assigned_to': row[3].strip() if len(row) > 3 else '',
            'contact1': row[4].strip() if len(row) > 4 else '',
            'contact2': row[5].strip() if len(row) > 5 else '',
            'phone': row[6].strip() if len(row) > 6 else '',
            'email': row[7].strip() if len(row) > 7 else '',
            'invoice_count': row[8].strip() if len(row) > 8 else '0',
            'services': {
                '記帳': row[9].strip() if len(row) > 9 else '',
                '營業稅': row[10].strip() if len(row) > 10 else '',
                '營所稅': row[11].strip() if len(row) > 11 else '',
                '二代健保': row[12].strip() if len(row) > 12 else '',
                '扣繳': row[13].strip() if len(row) > 13 else '',
                '暫繳': row[14].strip() if len(row) > 14 else '',
                '盈餘分配': row[15].strip() if len(row) > 15 else '',
                '股東平台': row[16].strip() if len(row) > 16 else '',
                '簽證': row[17].strip() if len(row) > 17 else '',
                '執行業務': row[18].strip() if len(row) > 18 else '',
                '機關團體': row[19].strip() if len(row) > 19 else '',
                '工商': row[20].strip() if len(row) > 20 else '',
            },
            'difficulty': row[21].strip() if len(row) > 21 else '',
            'notes': row[22].strip() if len(row) > 22 else ''
        }
        clients.append(client)
    
    return clients

def parse_workbook2(data):
    """解析活頁簿2 - 每月固定任務配置"""
    if not data or len(data) < 2:
        return []
    
    headers = data[0]
    services = []
    
    for row in data[1:]:
        if len(row) < 2 or not row[0].strip():  # 跳過空行
            continue
        
        # 解析每月執行配置（1月到12月）
        monthly_schedule = {}
        for month in range(1, 13):
            col_index = 7 + month - 1  # 從第8列開始是1月
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
    
    # 記帳類
    if '記帳' in service_name or '帳' in service_name:
        return '記帳'
    
    # 工商類
    if '工商' in service_name or '登記' in service_name or '設立' in service_name or '變更' in service_name or '解散' in service_name:
        return '工商'
    
    # 財簽類
    if '簽證' in service_name or '財簽' in service_name or '查核' in service_name:
        return '財簽'
    
    # 稅簽類
    if any(x in service_name for x in ['營業稅', '營所稅', '扣繳', '暫繳', '二代健保', '盈餘', '所得稅', '稅']):
        return '稅簽'
    
    # 其他
    return '其他'

def import_to_database(clients, services, db_path='timesheet-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'):
    """導入數據到SQLite數據庫"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n開始導入數據...")
        
        # 1. 導入客戶服務配置（從活頁簿2）
        inserted_services = 0
        for service in services:
            try:
                category = map_service_to_category(service['service_name'])
                
                # 清理費用數據
                fee_str = service['fee'].strip()
                if fee_str == '-' or fee_str == '':
                    fee = 0
                else:
                    fee = float(fee_str)
                
                # 清理工時數據
                hours_str = service['estimated_hours'].strip()
                if hours_str == '-' or hours_str == '':
                    hours = 0
                else:
                    hours = float(hours_str)
                
                cursor.execute('''
                    INSERT INTO client_services 
                    (client_name, client_tax_id, service_name, service_category, frequency, 
                     fee, estimated_hours, monthly_schedule, billing_timing, billing_notes, 
                     service_notes, assigned_to, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ''', (
                    service['name'],
                    service['tax_id'],
                    service['service_name'],
                    category,
                    service['frequency'],
                    fee,
                    hours,
                    json.dumps(service['monthly_schedule'], ensure_ascii=False),
                    service['billing_timing'],
                    service['billing_notes'],
                    service['service_notes'],
                    service['assigned_to']
                ))
                inserted_services += 1
            except Exception as e:
                print(f"✗ 導入服務失敗: {service['name']} - {service['service_name']}: {e}")
        
        conn.commit()
        print(f"✓ 成功導入 {inserted_services} 條服務配置")
        
        # 2. 統計信息
        cursor.execute('SELECT service_category, COUNT(*) FROM client_services GROUP BY service_category')
        stats = cursor.fetchall()
        print("\n按類別統計:")
        for category, count in stats:
            print(f"  {category}: {count} 項")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ 數據庫操作失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("="*60)
    print("客戶服務配置導入工具")
    print("="*60)
    
    # 1. 解析活頁簿1
    print("\n[步驟1] 解析活頁簿1.csv（客戶基本資料）")
    workbook1_data = parse_csv_big5('活頁簿1.csv')
    if not workbook1_data:
        print("✗ 無法讀取活頁簿1.csv")
        return False
    
    clients = parse_workbook1(workbook1_data)
    print(f"✓ 解析完成，共 {len(clients)} 個客戶")
    
    # 2. 解析活頁簿2
    print("\n[步驟2] 解析活頁簿2.csv（每月固定任務）")
    workbook2_data = parse_csv_big5('活頁簿2.csv')
    if not workbook2_data:
        print("✗ 無法讀取活頁簿2.csv")
        return False
    
    services = parse_workbook2(workbook2_data)
    print(f"✓ 解析完成，共 {len(services)} 項服務配置")
    
    # 3. 顯示一些樣本
    print("\n[樣本預覽]")
    if services:
        sample = services[0]
        print(f"客戶: {sample['name']}")
        print(f"服務: {sample['service_name']}")
        print(f"頻率: {sample['frequency']}")
        print(f"收費: {sample['fee']}")
        print(f"每月執行: {json.dumps(sample['monthly_schedule'], ensure_ascii=False)}")
    
    # 4. 導入到數據庫
    print("\n[步驟3] 導入到數據庫")
    response = input("確定要導入數據嗎？(y/n): ")
    if response.lower() == 'y':
        success = import_to_database(clients, services)
        if success:
            print("\n✓ 數據導入完成！")
        else:
            print("\n✗ 數據導入失敗")
    else:
        print("\n已取消導入")
    
    # 5. 生成JSON供檢查
    print("\n[步驟4] 生成JSON文件供檢查")
    with open('scripts/clients_imported.json', 'w', encoding='utf-8') as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)
    print("✓ 已生成 scripts/clients_imported.json")
    
    with open('scripts/services_imported.json', 'w', encoding='utf-8') as f:
        json.dump(services, f, ensure_ascii=False, indent=2)
    print("✓ 已生成 scripts/services_imported.json")
    
    print("\n" + "="*60)
    print("完成！")
    print("="*60)

if __name__ == '__main__':
    main()

