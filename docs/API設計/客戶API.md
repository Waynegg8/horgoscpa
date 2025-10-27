# 客戶 API 設計

**API 前綴：** `/api/v1/clients`  
**最後更新：** 2025年10月27日

---

## 端點列表

### 獲取客戶列表

```
GET /api/v1/clients
```

**權限：** 需登入，取決於 `module_visibility_clients`

**查詢參數：**
| 參數 | 類型 | 說明 |
|------|------|------|
| `page` | number | 頁碼 |
| `limit` | number | 每頁筆數（預設 50） |
| `search` | string | 搜尋關鍵字（公司名稱、統編） |
| `assignee_user_id` | number | 負責員工篩選 |
| `status` | string | 狀態篩選 |

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "client_id": "12345678",
      "company_name": "仟鑽企業",
      "status": "營業",
      "assignee_user_id": 2,
      "assignee_name": "紜蓁",
      "contact_person_1": "王先生",
      "phone": "02-1234-5678",
      "email": "contact@example.com",
      "invoice_count": 50,
      "difficulty": "中",
      "remarks": "每月15號交件"
    }
  ],
  "meta": {
    "page": 1,
    "total": 120,
    "limit": 50
  }
}
```

---

### 獲取客戶詳情

```
GET /api/v1/clients/:clientId
```

**回應：**
```json
{
  "success": true,
  "data": {
    "client": {
      "client_id": "12345678",
      "company_name": "仟鑽企業",
      ...
    },
    "services": [
      {
        "client_service_id": 1,
        "service_name": "記帳服務",
        "frequency": "雙月",
        "fee": 15000,
        "is_active": true
      }
    ],
    "active_tasks": [
      {
        "active_task_id": 1,
        "title": "仟鑽-記帳-114年9-10月",
        "status": "進行中",
        "progress": "50%"
      }
    ]
  }
}
```

---

### 建立客戶

```
POST /api/v1/clients
```

**權限：** 需登入（取決於模塊可見性）

**請求：**
```json
{
  "client_id": "98765432",
  "company_name": "新創科技股份有限公司",
  "contact_person_1": "張小姐",
  "phone": "02-9876-5432",
  "email": "contact@startup.com",
  "assignee_user_id": 3,
  "invoice_count": 20,
  "difficulty": "簡單"
}
```

**回應（201）：**
```json
{
  "success": true,
  "data": {
    "client_id": "98765432",
    "company_name": "新創科技股份有限公司"
  }
}
```

---

### 更新客戶

```
PUT /api/v1/clients/:clientId
```

---

### 刪除客戶（軟刪除 F010）

```
DELETE /api/v1/clients/:clientId
```

**實現：**
```typescript
// 軟刪除
await db.prepare(
  'UPDATE Clients SET is_deleted = 1, deleted_at = datetime(\'now\'), deleted_by = ? WHERE client_id = ?'
).bind(userId, clientId).run();
```

---

### CSV 匯入

```
POST /api/v1/clients/import-csv
```

**Content-Type：** multipart/form-data

**請求：**
```
file: clients.csv
```

**邏輯：**
```typescript
async function importClientsCSV(file: File) {
  const content = await file.text();
  const rows = parseCSV(content);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const row of rows) {
    try {
      await db.prepare(`
        INSERT INTO Clients 
          (client_id, company_name, contact_person_1, phone, email, assignee_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        row.client_id,
        row.company_name,
        row.contact_person_1,
        row.phone,
        row.email,
        row.assignee_user_id
      ).run();
      
      successCount++;
    } catch (e) {
      errorCount++;
      errors.push({
        row: row.client_id,
        error: e.message
      });
    }
  }
  
  return {
    success_count: successCount,
    error_count: errorCount,
    errors
  };
}
```

---

### 下載 CSV 模板

```
GET /api/v1/clients/csv-template
```

**回應：** CSV 檔案

```csv
client_id,company_name,contact_person_1,phone,email,assignee_user_id
12345678,範例公司,王先生,02-1234-5678,contact@example.com,2
```

---

## 客戶服務管理

### 獲取客戶的服務列表

```
GET /api/v1/clients/:clientId/services
```

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "client_service_id": 1,
      "service_template_id": 1,
      "service_name": "記帳服務",
      "frequency": "雙月",
      "fee": 15000,
      "trigger_months": [1, 3, 5, 7, 9, 11],
      "is_active": true,
      "task_template": {
        "task_template_id": 1,
        "name": "記帳標準流程（雙月）"
      }
    }
  ]
}
```

---

### 為客戶新增服務

```
POST /api/v1/clients/:clientId/services
```

**權限：** 管理員

**請求：**
```json
{
  "service_template_id": 1,
  "frequency": "雙月",
  "fee": 15000,
  "trigger_months": [1, 3, 5, 7, 9, 11],
  "task_template_id": 1,
  "payment_remarks": "每期服務完成後開立發票",
  "service_remarks": "此客戶需特別核對運費發票"
}
```

**回應（201）：**
```json
{
  "success": true,
  "data": {
    "client_service_id": 10,
    "message": "服務已新增，將於下次觸發月份自動建立任務"
  }
}
```

---

### 更新客戶服務

```
PUT /api/v1/services/:serviceId
```

---

### 停用/啟用客戶服務

```
PUT /api/v1/services/:serviceId/toggle
Body: { "is_active": false }
```

---

## 搜尋功能（F119）

```
GET /api/v1/clients/search?q=仟鑽
```

**搜尋範圍：**
- 公司名稱
- 統一編號
- 聯絡人
- 電話

**SQL：**
```sql
SELECT * FROM Clients 
WHERE company_name LIKE ? 
   OR client_id LIKE ?
   OR contact_person_1 LIKE ?
   OR phone LIKE ?
```

---

**相關文檔：**
- [系統設定模塊](../功能模塊/01-系統設定模塊.md) - CSV 導入
- [任務追蹤系統模塊](../功能模塊/05-任務追蹤系統模塊.md) - 客戶服務設定

