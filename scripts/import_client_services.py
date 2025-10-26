#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
客戶服務資料匯入工具
用途：將 CSV 資料匯入到 client_services 系統
"""

import csv
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Any

class ClientServicesImporter:
    """客戶服務資料匯入器"""
    
    # 服務類型映射
    SERVICE_TYPE_MAPPING = {
        '記帳': 'accounting',
        '營業稅': 'vat',
        '營所稅': 'income_tax',
        '扣繳': 'withholding',
        '暫繳': 'prepayment',
        '盈餘分配': 'dividend',
        '二代健保': 'nhi',
        '股東平台': 'shareholder_tax',
        '簽證': 'audit',
    }
    
    # 頻率映射
    FREQUENCY_MAPPING = {
        '每月': 'monthly',
        '雙月': 'bimonthly',
        '每年': 'annual',
        '每季': 'quarterly',
    }
    
    # 負責人映射（統一編號到系統用戶ID）
    ASSIGNEE_MAPPING = {
        '紜蓁': 1,
        '柏澄': 2,
        '凱閔': 3,
    }
    
    def __init__(self, db_path: str):
        """初始化匯入器"""
        self.db_path = db_path
        self.conn = None
        self.stats = {
            'clients_processed': 0,
            'clients_created': 0,
            'clients_updated': 0,
            'services_created': 0,
            'services_skipped': 0,
            'errors': []
        }
    
    def connect_db(self):
        """連接資料庫"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        return self.conn
    
    def close_db(self):
        """關閉資料庫連接"""
        if self.conn:
            self.conn.close()
    
    def read_big5_csv(self, filepath: str) -> List[List[str]]:
        """讀取 Big5 編碼的 CSV 文件"""
        try:
            with open(filepath, 'r', encoding='big5', errors='replace') as f:
                reader = csv.reader(f)
                return list(reader)
        except Exception as e:
            print(f"錯誤讀取 {filepath}: {e}")
            return []
    
    def get_or_create_client(self, tax_id: str, name: str, contact_person: str = '', 
                            phone: str = '', email: str = '') -> int:
        """獲取或創建客戶記錄"""
        cursor = self.conn.cursor()
        
        # 檢查客戶是否已存在
        cursor.execute('SELECT id FROM clients WHERE tax_id = ?', (tax_id,))
        result = cursor.fetchone()
        
        if result:
            client_id = result[0]
            # 更新客戶資訊
            cursor.execute('''
                UPDATE clients 
                SET name = ?, contact_person = ?, phone = ?, email = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (name, contact_person, phone, email, client_id))
            self.stats['clients_updated'] += 1
            return client_id
        else:
            # 創建新客戶
            cursor.execute('''
                INSERT INTO clients (tax_id, name, contact_person, phone, email, status)
                VALUES (?, ?, ?, ?, ?, 'active')
            ''', (tax_id, name, contact_person, phone, email))
            self.stats['clients_created'] += 1
            return cursor.lastrowid
    
    def create_client_service(self, client_id: int, service_data: Dict[str, Any]) -> bool:
        """創建客戶服務配置"""
        cursor = self.conn.cursor()
        
        try:
            # 檢查是否已存在相同的服務配置
            cursor.execute('''
                SELECT id FROM client_services 
                WHERE client_id = ? AND service_type = ? AND is_active = 1
            ''', (client_id, service_data['service_type']))
            
            if cursor.fetchone():
                self.stats['services_skipped'] += 1
                return False
            
            # 插入服務配置
            cursor.execute('''
                INSERT INTO client_services (
                    client_id, service_type, frequency, fee, assigned_to,
                    execution_day, start_month, estimated_hours, invoice_count,
                    difficulty_level, notes, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (
                client_id,
                service_data['service_type'],
                service_data.get('frequency', 'monthly'),
                service_data.get('fee', 0),
                service_data.get('assigned_to'),
                service_data.get('execution_day', 15),
                service_data.get('start_month', 1),
                service_data.get('estimated_hours', 0),
                service_data.get('invoice_count', 0),
                service_data.get('difficulty_level', 3),
                service_data.get('notes', '')
            ))
            
            self.stats['services_created'] += 1
            return True
            
        except Exception as e:
            self.stats['errors'].append({
                'client_id': client_id,
                'service_type': service_data.get('service_type'),
                'error': str(e)
            })
            return False
    
    def import_workbook6(self, filepath: str):
        """
        匯入活頁簿6 - 客戶服務項目總表
        欄位：統一編號, 公司名稱, 狀態, 負責, 聯絡人1, 聯絡人2, 電話, Mail, 
              發票數(月), 記帳, 營業稅, 營所稅, 二代健保, 扣繳, 暫繳, 
              盈餘分配, 股東平台, 簽證, 執行業務, 機關團體, 工商, 難度1-5, 備註
        """
        print(f"\n匯入活頁簿6: {filepath}")
        print("=" * 80)
        
        data = self.read_big5_csv(filepath)
        if not data or len(data) < 2:
            print("無有效資料")
            return
        
        # 跳過標題行
        for row_idx, row in enumerate(data[1:], start=2):
            if len(row) < 10 or not row[0].strip():
                continue
            
            try:
                tax_id = row[0].strip()
                name = row[1].strip()
                status = row[2].strip()
                assignee_name = row[3].strip()
                contact_person = row[4].strip() if len(row) > 4 else ''
                phone = row[6].strip() if len(row) > 6 else ''
                email = row[7].strip() if len(row) > 7 else ''
                invoice_count = int(row[8]) if len(row) > 8 and row[8].strip().isdigit() else 0
                difficulty = int(row[21]) if len(row) > 21 and row[21].strip().isdigit() else 3
                notes = row[22].strip() if len(row) > 22 else ''
                
                # 如果是停業狀態，跳過
                if status == '停業':
                    continue
                
                # 獲取或創建客戶
                client_id = self.get_or_create_client(
                    tax_id=tax_id,
                    name=name,
                    contact_person=contact_person,
                    phone=phone,
                    email=email
                )
                
                self.stats['clients_processed'] += 1
                
                # 獲取負責人ID
                assigned_to = self.ASSIGNEE_MAPPING.get(assignee_name)
                
                # 服務項目欄位索引：9-18
                # 記帳(9), 營業稅(10), 營所稅(11), 二代健保(12), 扣繳(13), 暫繳(14),
                # 盈餘分配(15), 股東平台(16), 簽證(17)
                service_columns = [
                    (9, '記帳', 'monthly'),
                    (10, '營業稅', 'bimonthly'),
                    (11, '營所稅', 'annual'),
                    (12, '二代健保', 'monthly'),
                    (13, '扣繳', 'monthly'),
                    (14, '暫繳', 'biannual'),
                    (15, '盈餘分配', 'annual'),
                    (16, '股東平台', 'annual'),
                    (17, '簽證', 'annual'),
                ]
                
                # 檢查每個服務項目
                for col_idx, service_name, default_frequency in service_columns:
                    if len(row) > col_idx and row[col_idx].strip().upper() == 'V':
                        service_type = self.SERVICE_TYPE_MAPPING.get(service_name)
                        if service_type:
                            service_data = {
                                'service_type': service_type,
                                'frequency': default_frequency,
                                'fee': 0,  # 費用需要從活頁簿7補充
                                'assigned_to': assigned_to,
                                'execution_day': 15,
                                'start_month': 1,
                                'estimated_hours': 0,
                                'invoice_count': invoice_count,
                                'difficulty_level': difficulty,
                                'notes': notes
                            }
                            self.create_client_service(client_id, service_data)
                
                print(f"✓ 處理客戶: {name} ({tax_id})")
                
            except Exception as e:
                error_msg = f"第{row_idx}行錯誤: {str(e)}"
                print(f"✗ {error_msg}")
                self.stats['errors'].append({
                    'row': row_idx,
                    'error': error_msg
                })
    
    def import_workbook7(self, filepath: str):
        """
        匯入活頁簿7 - 服務排程與收費明細表
        用於補充費用、工時等詳細資訊
        欄位：統一編號, 公司名稱, 負責, 服務項目, 頻率, 收費, 預計工時, ...
        """
        print(f"\n匯入活頁簿7: {filepath}")
        print("=" * 80)
        
        data = self.read_big5_csv(filepath)
        if not data or len(data) < 2:
            print("無有效資料")
            return
        
        updated_count = 0
        
        for row_idx, row in enumerate(data[1:], start=2):
            if len(row) < 6 or not row[0].strip():
                continue
            
            try:
                tax_id = row[0].strip()
                service_name = row[3].strip()
                frequency_name = row[4].strip()
                fee_str = row[5].strip().replace(',', '') if len(row) > 5 else '0'
                
                # 解析費用
                fee = 0
                if fee_str and fee_str != '-':
                    try:
                        fee = float(fee_str)
                    except ValueError:
                        pass
                
                # 映射服務類型和頻率
                service_type = self.SERVICE_TYPE_MAPPING.get(service_name)
                frequency = self.FREQUENCY_MAPPING.get(frequency_name, 'monthly')
                
                if not service_type:
                    continue
                
                # 更新服務配置
                cursor = self.conn.cursor()
                cursor.execute('''
                    UPDATE client_services 
                    SET fee = ?, frequency = ?
                    WHERE client_id = (SELECT id FROM clients WHERE tax_id = ?)
                      AND service_type = ?
                      AND is_active = 1
                ''', (fee, frequency, tax_id, service_type))
                
                if cursor.rowcount > 0:
                    updated_count += 1
                    print(f"✓ 更新費用: {tax_id} - {service_name}: ${fee}")
                
            except Exception as e:
                error_msg = f"第{row_idx}行錯誤: {str(e)}"
                print(f"✗ {error_msg}")
        
        print(f"\n總共更新 {updated_count} 筆服務配置費用")
    
    def print_stats(self):
        """打印匯入統計"""
        print("\n" + "=" * 80)
        print("匯入統計")
        print("=" * 80)
        print(f"處理客戶總數: {self.stats['clients_processed']}")
        print(f"新增客戶: {self.stats['clients_created']}")
        print(f"更新客戶: {self.stats['clients_updated']}")
        print(f"新增服務配置: {self.stats['services_created']}")
        print(f"跳過重複服務: {self.stats['services_skipped']}")
        print(f"錯誤數量: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            print("\n錯誤詳情:")
            for error in self.stats['errors'][:10]:  # 只顯示前10個錯誤
                print(f"  - {error}")
        
        print("=" * 80)
    
    def run(self, workbook6_path: str, workbook7_path: str = None):
        """執行完整匯入流程"""
        try:
            self.connect_db()
            
            # 匯入活頁簿6（主要資料）
            if Path(workbook6_path).exists():
                self.import_workbook6(workbook6_path)
            else:
                print(f"找不到檔案: {workbook6_path}")
            
            # 匯入活頁簿7（補充費用資訊）
            if workbook7_path and Path(workbook7_path).exists():
                self.import_workbook7(workbook7_path)
            
            # 提交變更
            self.conn.commit()
            
            # 顯示統計
            self.print_stats()
            
        except Exception as e:
            print(f"\n匯入過程發生錯誤: {e}")
            if self.conn:
                self.conn.rollback()
        finally:
            self.close_db()


def main():
    """主函數"""
    import sys
    
    # 設定路徑
    project_root = Path(__file__).parent.parent
    db_path = project_root / 'timesheet-api' / 'database.db'
    csv_folder = project_root / '新增資料夾'
    
    workbook6 = csv_folder / '活頁簿6.csv'
    workbook7 = csv_folder / '活頁簿7.csv'
    
    print("=" * 80)
    print("客戶服務資料匯入工具")
    print("=" * 80)
    print(f"資料庫: {db_path}")
    print(f"CSV 檔案夾: {csv_folder}")
    print()
    
    # 檢查檔案
    if not db_path.exists():
        print(f"錯誤: 找不到資料庫檔案 {db_path}")
        print("請先執行 migration 腳本創建資料庫結構")
        sys.exit(1)
    
    if not workbook6.exists():
        print(f"錯誤: 找不到 CSV 檔案 {workbook6}")
        sys.exit(1)
    
    # 確認執行
    response = input("\n確定要開始匯入嗎？這將修改資料庫。(y/N): ")
    if response.lower() != 'y':
        print("已取消匯入")
        sys.exit(0)
    
    # 執行匯入
    importer = ClientServicesImporter(str(db_path))
    importer.run(str(workbook6), str(workbook7) if workbook7.exists() else None)
    
    print("\n匯入完成！")


if __name__ == '__main__':
    main()
