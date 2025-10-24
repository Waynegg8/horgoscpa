#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工時資料上傳腳本
從 CSV 檔案讀取工時記錄並上傳到 Cloudflare Worker API
"""

import csv
import json
import requests
from collections import defaultdict
from datetime import datetime

# API 端點
API_BASE_URL = 'https://timesheet-api.hergscpa.workers.dev'

# 工時類型對應
WORK_TYPE_MAPPING = {
    '正常工時': '正常工時',
    '平日加班(1.34)': '平日加班(1.34)',
    '平日加班(1.67)': '平日加班(1.67)',
    '休息日加班(1.34)': '休息日加班(1.34)',
    '休息日加班(1.67)': '休息日加班(1.67)',
    '休息日加班(2.67)': '休息日加班(2.67)',
    '本月例假日加班': '本月例假日加班',
    '本月例假日加班(2)': '本月例假日加班(2)',
    '本月國定假日加班': '本月國定假日加班',
    '本月國定假日加班(1.34)': '本月國定假日加班(1.34)',
    '本月國定假日加班(1.67)': '本月國定假日加班(1.67)'
}

def read_csv_with_encoding(filename):
    """嘗試不同編碼讀取 CSV 檔案"""
    encodings = ['utf-8', 'big5', 'gb2312', 'gbk', 'cp950']
    
    for encoding in encodings:
        try:
            with open(filename, 'r', encoding=encoding) as f:
                content = f.read()
                if '員工姓名' in content or '客戶名稱' in content:
                    # 找到正確的編碼
                    f.seek(0)
                    reader = csv.DictReader(f)
                    data = list(reader)
                    print(f"[OK] 成功使用 {encoding} 編碼讀取檔案")
                    return data
        except (UnicodeDecodeError, UnicodeError):
            continue
    
    raise Exception("無法讀取 CSV 檔案，請檢查檔案編碼")

def parse_timesheet_data(csv_data):
    """解析 CSV 資料並按員工/年月分組"""
    grouped_data = defaultdict(lambda: {
        'workEntries': defaultdict(lambda: defaultdict(dict)),
        'leaveEntries': defaultdict(lambda: defaultdict(dict))
    })
    
    for row in csv_data:
        try:
            employee = row.get('員工姓名', '').strip()
            client = row.get('客戶名稱', '').strip()
            date_str = row.get('工作日期', '').strip()
            year_str = row.get('年度', '').strip()
            month_str = row.get('月份', '').strip()
            business_type = row.get('業務類型', '').strip()
            
            # 轉換年月為整數
            if not year_str or not month_str:
                continue
            year = int(year_str)
            month = int(month_str)
            
            if not employee or not year or not month:
                continue
            
            # 解析日期
            if '/' in date_str:
                date_parts = date_str.split('/')
                day = int(date_parts[2])
            else:
                continue
            
            # 檢查是否為請假
            leave_type = row.get('假別', '').strip()
            leave_hours = row.get('請假時數', '').strip()
            
            if leave_type and leave_hours:
                # 處理請假記錄
                key = (employee, year, month)
                leave_hours_float = float(leave_hours)
                if leave_hours_float > 0:
                    grouped_data[key]['leaveEntries'][leave_type][day] = leave_hours_float
            
            # 處理工時記錄
            for col_idx, col_name in enumerate([
                '正常工時', '平日加班(1.34)', '平日加班(1.67)',
                '休息日加班(1.34)', '休息日加班(1.67)', '休息日加班(2.67)',
                '本月例假日加班', '本月例假日加班(2)',
                '本月國定假日加班', '本月國定假日加班(1.34)', '本月國定假日加班(1.67)'
            ]):
                hours_str = row.get(col_name, '').strip()
                if hours_str:
                    try:
                        hours = float(hours_str)
                        if hours > 0:
                            key = (employee, year, month)
                            work_key = f"{client}|{business_type}|{col_name}"
                            grouped_data[key]['workEntries'][work_key][day] = hours
                            grouped_data[key]['workEntries'][work_key]['client'] = client
                            grouped_data[key]['workEntries'][work_key]['businessType'] = business_type
                            grouped_data[key]['workEntries'][work_key]['workType'] = col_name
                    except ValueError:
                        pass
        
        except Exception as e:
            print(f"[警告] 處理行時發生錯誤: {e}")
            continue
    
    return grouped_data

def format_api_payload(employee, year, month, data):
    """將分組資料轉換為 API 格式"""
    work_entries = []
    leave_entries = []
    
    # 處理工時記錄
    for work_key, hours_data in data['workEntries'].items():
        client = hours_data.pop('client', '')
        business_type = hours_data.pop('businessType', '')
        work_type = hours_data.pop('workType', '')
        
        if client and business_type and work_type:
            work_entries.append({
                'clientName': client,
                'businessType': business_type,
                'workType': work_type,
                'hours': {day: hours for day, hours in hours_data.items() if isinstance(day, int)}
            })
    
    # 處理請假記錄
    for leave_type, hours_data in data['leaveEntries'].items():
        if hours_data:
            leave_entries.append({
                'leaveType': leave_type,
                'hours': hours_data
            })
    
    return {
        'employee': employee,
        'year': year,
        'month': month,
        'workEntries': work_entries,
        'leaveEntries': leave_entries
    }

def upload_to_api(payload):
    """上傳資料到 API"""
    url = f"{API_BASE_URL}/api/save-timesheet"
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return True, response.json()
    except requests.exceptions.RequestException as e:
        return False, str(e)

def main():
    """主程式"""
    import sys
    # 設定 Windows 終端機編碼
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    csv_file = '活頁簿4.csv'
    
    print("=" * 60)
    print("工時資料上傳腳本")
    print("=" * 60)
    
    # 讀取 CSV 檔案
    print(f"\n[讀取] CSV 檔案: {csv_file}")
    try:
        csv_data = read_csv_with_encoding(csv_file)
        print(f"[OK] 成功讀取 {len(csv_data)} 筆資料")
    except Exception as e:
        print(f"[錯誤] 讀取檔案失敗: {e}")
        return
    
    # 解析資料
    print("\n[處理] 解析資料...")
    grouped_data = parse_timesheet_data(csv_data)
    print(f"[OK] 已分組 {len(grouped_data)} 個員工/月份組合")
    
    # 上傳資料
    print("\n[上傳] 上傳資料到 API...")
    success_count = 0
    fail_count = 0
    
    for (employee, year, month), data in grouped_data.items():
        payload = format_api_payload(employee, year, month, data)
        
        print(f"\n處理: {employee} - {year}年{month}月")
        print(f"  - 工時記錄: {len(payload['workEntries'])} 筆")
        print(f"  - 請假記錄: {len(payload['leaveEntries'])} 筆")
        
        success, result = upload_to_api(payload)
        
        if success:
            print(f"  [OK] 上傳成功")
            success_count += 1
        else:
            print(f"  [失敗] 上傳失敗: {result}")
            fail_count += 1
    
    # 總結
    print("\n" + "=" * 60)
    print("上傳完成")
    print(f"成功: {success_count} 筆")
    print(f"失敗: {fail_count} 筆")
    print("=" * 60)

if __name__ == '__main__':
    main()

