# Clients (客戶資料)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE Clients (
  -- 基本識別資料
  client_id TEXT PRIMARY KEY,              -- 營業人統一編號（8位數字）
  tax_registration_number TEXT,            -- 稅籍編號（不限格式）
  company_name TEXT NOT NULL,              -- 營業人名稱
  
  -- 稅務資料
  tax_registration_address TEXT,           -- 營業（稅籍）登記地址
  business_status TEXT DEFAULT '營業中',  -- 營業狀況：營業中/停業/歇業
  
  -- 公司資料
  organization_type TEXT,                  -- 組織種類
  capital_amount DECIMAL,                  -- 資本額（元）
  establishment_date TEXT,                 -- 設立日期（YYYMMDD）
  responsible_person TEXT,                 -- 負責人姓名
  
  -- 營業項目（JSON格式）
  registered_business_items TEXT,          -- [{"name":"項目名稱","code":"代碼"}]
  
  -- 收款資訊
  payment_collection_timing TEXT,          -- 收款時間
  payment_collection_remarks TEXT,         -- 收款備註
  
  -- 內部管理
  assignee_user_id INTEGER,                -- 負責員工
  contact_person_1 TEXT,                   -- 聯絡人1
  contact_person_2 TEXT,                   -- 聯絡人2
  phone TEXT,                              -- 電話
  email TEXT,                              -- Email
  invoice_count INTEGER DEFAULT 0,         -- 發票數量
  remarks TEXT,                            -- 一般備註
  
  -- 審計欄位
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id)
);
```

---

## 索引

```sql
CREATE INDEX idx_clients_tax_reg_number ON Clients(tax_registration_number);
CREATE INDEX idx_clients_company_name ON Clients(company_name);
CREATE INDEX idx_clients_assignee ON Clients(assignee_user_id);
CREATE INDEX idx_clients_status ON Clients(business_status);
CREATE INDEX idx_clients_org_type ON Clients(organization_type);
```

---

## 欄位說明

### 基本識別資料

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `client_id` | TEXT PK | ✅ | 營業人統一編號（8位數字）|
| `tax_registration_number` | TEXT | | 稅籍編號（與統一編號不同，不限格式）|
| `company_name` | TEXT | ✅ | 營業人名稱 |

### 稅務資料

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `tax_registration_address` | TEXT | | 營業（稅籍）登記地址 |
| `business_status` | TEXT | | 營業狀況（預設：營業中）|

**business_status 可選值：**
- `營業中`
- `停業`
- `歇業`

### 公司資料

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `organization_type` | TEXT | | 組織種類 |
| `capital_amount` | DECIMAL | | 資本額（元）|
| `establishment_date` | TEXT | | 設立日期（YYYMMDD格式）|
| `responsible_person` | TEXT | | 負責人姓名 |

**organization_type 可選值：**
- `股份有限公司`
- `有限公司`
- `獨資`
- `合夥`
- `非營利組織`
- `政府機關`
- `其他`

### 營業項目

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `registered_business_items` | TEXT | | 登記營業項目（JSON格式）|

**JSON 格式範例：**
```json
[
  {
    "name": "電腦及電腦周邊設備零售",
    "code": "483111"
  },
  {
    "name": "其他電腦程式設計",
    "code": "620199"
  }
]
```

### 收款資訊

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `payment_collection_timing` | TEXT | | 收款時間（如：每月5日/季末）|
| `payment_collection_remarks` | TEXT | | 收款備註 |

### 內部管理

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `assignee_user_id` | INTEGER FK | | 負責員工 ID |
| `contact_person_1` | TEXT | | 聯絡人1 |
| `contact_person_2` | TEXT | | 聯絡人2 |
| `phone` | TEXT | | 電話 |
| `email` | TEXT | | Email |
| `invoice_count` | INTEGER | | 發票數量（預設：0）|
| `remarks` | TEXT | | 一般備註 |

---

## 常用查詢

### 查詢員工負責的客戶

```sql
SELECT * FROM Clients 
WHERE assignee_user_id = ? 
  AND is_deleted = 0 
ORDER BY company_name;
```

### 搜尋客戶（按公司名稱）

```sql
SELECT * FROM Clients 
WHERE company_name LIKE ? 
  AND is_deleted = 0
ORDER BY company_name;
```

### 按營業狀況篩選

```sql
SELECT * FROM Clients 
WHERE business_status = '營業中' 
  AND is_deleted = 0
ORDER BY company_name;
```

### 按組織種類篩選

```sql
SELECT * FROM Clients 
WHERE organization_type = '股份有限公司' 
  AND is_deleted = 0
ORDER BY company_name;
```

### 查詢客戶及其標籤

```sql
SELECT 
  c.*,
  GROUP_CONCAT(ct.tag_name, ',') as tags
FROM Clients c
LEFT JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
LEFT JOIN CustomerTags ct ON cta.tag_id = ct.tag_id AND ct.is_deleted = 0
WHERE c.is_deleted = 0
GROUP BY c.client_id
ORDER BY c.company_name;
```

---

## 業務規則

1. **client_id（統一編號）**：
   - 必須是8位數字
   - 作為主鍵（Primary Key）
   - 不可重複

2. **營業項目**：
   - 以JSON格式儲存
   - 可包含多個項目
   - 每個項目包含名稱和代碼

3. **營業狀況**：
   - 預設為「營業中」
   - 可修改為「停業」或「歇業」
   - 影響客戶在系統中的顯示和操作權限

4. **軟刪除**：
   - 使用 `is_deleted` 標記
   - 刪除時記錄 `deleted_at` 和 `deleted_by`
   - 不實際刪除資料

---

## 相關表格

- **ClientTagAssignments** - 客戶標籤關聯
- **ClientServices** - 客戶訂閱的服務
- **Tasks** - 客戶相關任務
- **TimeLogs** - 客戶相關工時記錄

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [CustomerTags](./CustomerTags.md)
- [ClientTagAssignments](./ClientTagAssignments.md)
- [客戶管理 API](../../API設計/客戶管理API.md)
- [客戶管理功能模塊](../../功能模塊/23-客戶管理.md)

---

**最後更新：** 2025年10月27日

