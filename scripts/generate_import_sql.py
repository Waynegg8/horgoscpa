#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成CSV匯入SQL腳本
從解析好的JSON生成SQL INSERT語句
"""

import json
import sys

def generate_client_sql():
    """生成客戶詳細資料SQL"""
    
    with open('scripts/parsed_clients.json', 'r', encoding='utf-8') as f:
        clients = json.load(f)
    
    sql_statements = []
    sql_statements.append("-- ============================================================")
    sql_statements.append("-- 客戶詳細資料匯入")
    sql_statements.append(f"-- 總計: {len(clients)} 筆")
    sql_statements.append("-- ============================================================\n")
    
    for client in clients:
        # 處理服務項目
        services = client.get('services', {})
        
        # 清理數據
        tax_id = client['tax_id'].replace("'", "''")
        name = client['name'].replace("'", "''")
        contact_1 = client.get('contact_person_1', '').replace("'", "''")
        contact_2 = client.get('contact_person_2', '').replace("'", "''")
        phone = client.get('phone', '').replace("'", "''")
        email = client.get('email', '').replace("'", "''")
        notes = client.get('notes', '').replace("'", "''")
        region = client.get('region', '').replace("'", "''")
        
        # 處理月費
        monthly_fee_str = client.get('monthly_fee', '0')
        try:
            monthly_fee = int(monthly_fee_str.replace(',', '').replace('-', '0'))
        except:
            monthly_fee = 0
        
        # 服務項目轉換 (V 表示有此服務)
        service_accounting = 1 if services.get('accounting') == 'V' else 0
        service_tax_return = 1 if services.get('tax_return') == 'V' else 0
        service_income_tax = 1 if services.get('report') == 'V' else 0
        service_registration = 1 if services.get('registration') == 'V' else 0
        service_withholding = 1 if services.get('withholding') == 'V' else 0
        service_prepayment = 1 if services.get('prepayment') == 'V' else 0
        service_payroll = 1 if services.get('payroll') == 'V' else 0
        service_annual_report = 1 if services.get('timesheet') == 'V' else 0
        service_audit = 1 if services.get('audit') == 'V' else 0
        
        sql = f"""
-- {name} ({tax_id})
INSERT OR REPLACE INTO clients_extended (
    client_name, tax_id, contact_person_1, contact_person_2, phone, email,
    monthly_fee, region, status,
    service_accounting, service_tax_return, service_income_tax,
    service_registration, service_withholding, service_prepayment,
    service_payroll, service_annual_report, service_audit,
    notes
) VALUES (
    '{name}', '{tax_id}', '{contact_1}', '{contact_2}', '{phone}', '{email}',
    {monthly_fee}, '{region}', 'active',
    {service_accounting}, {service_tax_return}, {service_income_tax},
    {service_registration}, {service_withholding}, {service_prepayment},
    {service_payroll}, {service_annual_report}, {service_audit},
    '{notes}'
);
"""
        sql_statements.append(sql)
    
    return '\n'.join(sql_statements)

def generate_schedule_sql():
    """生成服務排程SQL"""
    
    with open('scripts/parsed_schedules.json', 'r', encoding='utf-8') as f:
        schedules = json.load(f)
    
    sql_statements = []
    sql_statements.append("\n-- ============================================================")
    sql_statements.append("-- 服務排程資料匯入")
    sql_statements.append(f"-- 總計: {len(schedules)} 筆")
    sql_statements.append("-- ============================================================\n")
    
    for schedule in schedules:
        # 清理數據
        tax_id = schedule['tax_id'].replace("'", "''")
        client_name = schedule['client_name'].replace("'", "''")
        service_type = schedule['service_type'].replace("'", "''")
        frequency = schedule.get('frequency', '每月').replace("'", "''")
        service_details = schedule.get('service_details', '').replace("'", "''")
        notes = schedule.get('notes', '').replace("'", "''")
        
        # 處理月費
        monthly_fee_str = schedule.get('monthly_fee', '0')
        try:
            monthly_fee = int(monthly_fee_str.replace(',', '').replace('-', '0'))
        except:
            monthly_fee = 0
        
        # 處理12個月的勾選狀態
        months = schedule.get('months', {})
        month_values = []
        for i in range(1, 13):
            month_val = months.get(str(i), '')
            month_values.append('1' if month_val == 'V' else '0')
        
        sql = f"""
-- {client_name} - {service_type}
INSERT INTO service_schedule (
    tax_id, client_name, service_type, frequency, monthly_fee,
    month_1, month_2, month_3, month_4, month_5, month_6,
    month_7, month_8, month_9, month_10, month_11, month_12,
    service_details, notes
) VALUES (
    '{tax_id}', '{client_name}', '{service_type}', '{frequency}', {monthly_fee},
    {', '.join(month_values)},
    '{service_details}', '{notes}'
);
"""
        sql_statements.append(sql)
    
    return '\n'.join(sql_statements)

def main():
    print("=" * 60)
    print("生成CSV匯入SQL腳本...")
    print("=" * 60)
    
    # 生成完整SQL文件
    sql_content = []
    
    sql_content.append("-- ============================================================")
    sql_content.append("-- CSV數據批量匯入SQL腳本")
    sql_content.append("-- 自動生成 - 請勿手動編輯")
    sql_content.append("-- ============================================================")
    sql_content.append("")
    
    # 客戶資料
    print("\n1. 生成客戶詳細資料SQL...")
    client_sql = generate_client_sql()
    sql_content.append(client_sql)
    print("   ✓ 完成")
    
    # 服務排程
    print("\n2. 生成服務排程SQL...")
    schedule_sql = generate_schedule_sql()
    sql_content.append(schedule_sql)
    print("   ✓ 完成")
    
    # 寫入文件
    output_file = 'timesheet-api/migrations/009_import_csv_data.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_content))
    
    print(f"\n✓ SQL腳本已生成: {output_file}")
    print("=" * 60)
    print("\n下一步:")
    print("1. 執行: cd timesheet-api")
    print("2. 執行: npx wrangler d1 execute timesheet-db --remote --file=migrations/009_import_csv_data.sql")
    print("=" * 60)

if __name__ == '__main__':
    main()

