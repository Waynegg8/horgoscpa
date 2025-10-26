# API 端點完整說明

## 基本資訊

- **API 基礎 URL**: `https://timesheet-api.hergscpa.workers.dev`
- **認證方式**: Bearer Token (Session Token)
- **Headers**: 
  ```
  Authorization: Bearer {session_token}
  Content-Type: application/json
  ```

## 認證相關 API

### POST /api/login
登入系統

**請求**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**回應**:
```json
{
  "success": true,
  "session_token": "xxx",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "employee_name": "張三"
  }
}
```

### POST /api/logout
登出系統

**回應**:
```json
{
  "success": true
}
```

### GET /api/verify
驗證當前 session

**回應**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "employee_name": "張三"
  }
}
```

### POST /api/change-password
修改密碼

**請求**:
```json
{
  "old_password": "old123",
  "new_password": "new456"
}
```

**回應**:
```json
{
  "success": true,
  "message": "密碼已成功更新"
}
```

## 工時表相關 API

### GET /api/employees
取得員工列表

**權限**: 管理員可看全部，員工只能看自己

**回應**:
```json
[
  {
    "name": "張三",
    "hire_date": "2020-01-15"
  },
  {
    "name": "李四",
    "hire_date": "2021-06-01"
  }
]
```

### GET /api/clients?employee={員工名稱}
取得指定員工的客戶列表（用於工時表）

**參數**:
- `employee`: 員工姓名（必填）

**回應**:
```json
["客戶A", "客戶B", "客戶C"]
```

### GET /api/business-types
取得業務類型列表

**回應**:
```json
[
  {
    "id": 1,
    "name": "記帳",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "稅務",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/leave-types
取得請假類型列表

**回應**:
```json
[
  {
    "id": 1,
    "type_name": "特休",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "type_name": "病假",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/work-types
取得工時類型列表

**回應**:
```json
[
  "正常工時",
  "平日加班(1.34)",
  "平日加班(1.67)",
  "休息日加班(1.34)",
  ...
]
```

### GET /api/holidays?year={年份}
取得國定假日

**參數**:
- `year`: 年份（選填）
  - 有年份：返回該年份的假日日期列表
  - 無年份：返回所有假日的完整資料

**回應（有年份）**:
```json
["2024-01-01", "2024-02-10", "2024-02-11", ...]
```

**回應（無年份）**:
```json
[
  {
    "id": 1,
    "holiday_date": "2024-01-01",
    "holiday_name": "元旦",
    "created_at": "2024-01-01T00:00:00Z"
  },
  ...
]
```

### GET /api/timesheet-data?employee={員工}&year={年}&month={月}
取得工時資料

**參數**:
- `employee`: 員工姓名（必填）
- `year`: 年份（必填）
- `month`: 月份（必填）

**回應**:
```json
{
  "workEntries": [
    {
      "clientName": "客戶A",
      "businessType": "記帳",
      "workType": "正常工時",
      "hours": {
        "1": 8,
        "2": 8,
        "3": 4
      }
    }
  ],
  "leaveEntries": [
    {
      "leaveType": "特休",
      "hours": {
        "4": 8
      }
    }
  ]
}
```

### POST /api/save-timesheet
儲存工時資料

**請求**:
```json
{
  "employee": "張三",
  "year": 2024,
  "month": 10,
  "workEntries": [
    {
      "clientName": "客戶A",
      "businessType": "記帳",
      "workType": "正常工時",
      "hours": {
        "1": 8,
        "2": 8
      }
    }
  ],
  "leaveEntries": [
    {
      "leaveType": "特休",
      "hours": {
        "3": 8
      }
    }
  ]
}
```

**回應**:
```json
{
  "success": true
}
```

## 客戶管理 API（所有員工可用）

### GET /api/clients
取得所有客戶列表（用於設定頁面）

**回應**:
```json
[
  {
    "id": 1,
    "name": "客戶A",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "客戶B",
    "created_at": "2024-01-02T00:00:00Z"
  }
]
```

### POST /api/clients
新增客戶

**請求**:
```json
{
  "name": "新客戶"
}
```

**回應**:
```json
{
  "success": true
}
```

### PUT /api/clients/:id
更新客戶

**請求**:
```json
{
  "name": "更新後的客戶名稱"
}
```

**回應**:
```json
{
  "success": true,
  "message": "客戶已更新"
}
```

### DELETE /api/clients/:id
刪除客戶

**回應**:
```json
{
  "success": true,
  "message": "客戶已刪除"
}
```

## 客戶指派 API（所有員工可用）

### GET /api/assignments?employee={員工}
取得客戶指派列表

**參數**:
- `employee`: 員工姓名（選填，篩選特定員工）

**回應**:
```json
[
  {
    "id": 1,
    "employee_name": "張三",
    "client_name": "客戶A",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/assignments
新增客戶指派

**請求**:
```json
{
  "employee_name": "張三",
  "client_name": "客戶A"
}
```

**回應**:
```json
{
  "success": true
}
```

### DELETE /api/assignments/:id
刪除客戶指派

**回應**:
```json
{
  "success": true,
  "message": "指派已刪除"
}
```

## 業務類型 API（所有員工可用）

### POST /api/business-types
新增業務類型

**請求**:
```json
{
  "name": "新業務類型"
}
```

**回應**:
```json
{
  "success": true,
  "message": "業務類型已新增",
  "id": 3
}
```

### PUT /api/business-types/:id
更新業務類型

**請求**:
```json
{
  "name": "更新後的業務類型"
}
```

**回應**:
```json
{
  "success": true,
  "message": "業務類型已更新"
}
```

### DELETE /api/business-types/:id
刪除業務類型

**回應**:
```json
{
  "success": true,
  "message": "業務類型已刪除"
}
```

## 假期事件 API（所有員工可用）

### GET /api/leave-events?employee={員工}&year={年}
取得假期事件列表

**參數**:
- `employee`: 員工姓名（選填）
- `year`: 年份（選填）

**回應**:
```json
[
  {
    "id": 1,
    "employee_name": "張三",
    "event_date": "2024-03-15",
    "event_type": "婚假",
    "notes": "結婚登記",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/leave-events
新增假期事件

**請求**:
```json
{
  "employee_name": "張三",
  "event_date": "2024-03-15",
  "event_type": "婚假",
  "notes": "結婚登記"
}
```

**回應**:
```json
{
  "success": true,
  "message": "假期事件已新增",
  "id": 1
}
```

### PUT /api/leave-events/:id
更新假期事件

**請求**:
```json
{
  "employee_name": "張三",
  "event_date": "2024-03-16",
  "event_type": "婚假",
  "notes": "更新備註"
}
```

**回應**:
```json
{
  "success": true,
  "message": "假期事件已更新"
}
```

### DELETE /api/leave-events/:id
刪除假期事件

**回應**:
```json
{
  "success": true,
  "message": "假期事件已刪除"
}
```

## 國定假日 API（所有員工可用）

### POST /api/holidays
新增國定假日

**請求**:
```json
{
  "holiday_date": "2024-10-10",
  "holiday_name": "國慶日"
}
```

**回應**:
```json
{
  "success": true,
  "message": "國定假日已新增",
  "id": 1
}
```

### PUT /api/holidays/:id
更新國定假日

**請求**:
```json
{
  "holiday_date": "2024-10-10",
  "holiday_name": "雙十節"
}
```

**回應**:
```json
{
  "success": true,
  "message": "國定假日已更新"
}
```

### DELETE /api/holidays/:id
刪除國定假日

**回應**:
```json
{
  "success": true,
  "message": "國定假日已刪除"
}
```

## 用戶管理 API（僅管理員）

### GET /api/admin/users
取得所有使用者

**回應**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "employee_name": "張三",
    "is_active": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/admin/users
新增使用者

**請求**:
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "employee",
  "employee_name": "李四"
}
```

**回應**:
```json
{
  "success": true
}
```

### PUT /api/admin/users/:id
更新使用者

**請求**:
```json
{
  "username": "updateduser",
  "role": "admin",
  "employee_name": "李四",
  "is_active": true
}
```

**回應**:
```json
{
  "success": true,
  "message": "使用者已更新"
}
```

### DELETE /api/admin/users/:id
刪除使用者

**回應**:
```json
{
  "success": true,
  "message": "使用者已刪除"
}
```

## 假別設定 API（僅管理員）

### POST /api/admin/leave-types
新增假別

**請求**:
```json
{
  "name": "新假別"
}
```

**回應**:
```json
{
  "success": true,
  "message": "假別已新增",
  "id": 1
}
```

### PUT /api/admin/leave-types/:id
更新假別

**請求**:
```json
{
  "name": "更新的假別"
}
```

**回應**:
```json
{
  "success": true,
  "message": "假別已更新"
}
```

### DELETE /api/admin/leave-types/:id
刪除假別

**回應**:
```json
{
  "success": true,
  "message": "假別已刪除"
}
```

## 系統參數 API（僅管理員）

### GET /api/admin/system-params
取得系統參數

**回應**:
```json
[
  {
    "param_name": "max_work_hours",
    "param_value": "8",
    "description": "每日最大工時"
  }
]
```

### PUT /api/admin/system-params
更新系統參數

**請求**:
```json
{
  "params": [
    {
      "name": "max_work_hours",
      "value": "10"
    }
  ]
}
```

**回應**:
```json
{
  "success": true,
  "message": "系統參數已更新"
}
```

## 錯誤回應格式

所有錯誤回應遵循統一格式：

```json
{
  "error": "錯誤訊息"
}
```

### 常見 HTTP 狀態碼

- `200 OK`: 成功
- `400 Bad Request`: 請求參數錯誤
- `401 Unauthorized`: 未授權（未登入或 token 無效）
- `403 Forbidden`: 權限不足
- `404 Not Found`: 資源不存在
- `500 Internal Server Error`: 伺服器錯誤

## 完整調用範例

### JavaScript (Fetch API)

```javascript
const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
const sessionToken = localStorage.getItem('session_token');

// GET 請求
const response = await fetch(`${API_BASE}/api/employees`, {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});
const data = await response.json();

// POST 請求
const response = await fetch(`${API_BASE}/api/clients`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '新客戶'
  })
});
const result = await response.json();
```

## 資料庫對應

所有 API 端點都直接連接到 Cloudflare D1 資料庫，資料真實儲存和讀取。

### 主要資料表

- `users` - 使用者帳號
- `employees` - 員工資料
- `clients` - 客戶資料
- `client_assignments` - 客戶指派
- `business_types` - 業務類型
- `leave_types` - 請假類型
- `timesheets` - 工時記錄
- `holidays` - 國定假日
- `leave_events` - 假期事件
- `sessions` - Session 管理
- `system_parameters` - 系統參數

---

**文檔版本**: 1.0  
**最後更新**: 2025-10-25  
**狀態**: ✅ 所有 API 端點已實現並連接資料庫

## 自動任務生成 API（Automated Tasks）

### POST /api/automated-tasks/generate
手動觸發批次生成到期任務。

請求:
```json
{
  "date": "2025-10-26"  
}
```
回應:
```json
{
  "results": {
    "generated": [{"task_id": 123}],
    "skipped": [],
    "errors": []
  }
}
```

### GET /api/automated-tasks/preview
預覽目前到期、將被生成的任務。

回應:
```json
{
  "tasks_to_generate": 12,
  "tasks": [
    { "client_name": "ABC", "service_type": "vat", "execution_period": "2025-11" }
  ]
}
```

### POST /api/automated-tasks/generate/:service_id
為特定 `client_service` 立即生成任務。

---

## 客戶服務配置 API（Client Services）

### GET /api/client-services?client_id=&service_type=&assigned_to=
查詢服務配置列表（可過濾）。

回應:
```json
{
  "services": [
    {
      "id": 10,
      "client_name": "ABC",
      "service_type": "accounting",
      "frequency": "monthly",
      "assigned_to": "紜蓁",
      "is_active": 1
    }
  ]
}
```

### POST /api/client-services
新增服務配置。

### PUT /api/client-services/:id
更新服務配置（執行日、提前天數、難度、指派等）。

### POST /api/client-services/:id/toggle
啟用/停用服務。

### DELETE /api/client-services/:id
刪除服務配置。

---

## FAQ 內容管理 API

### GET /api/faq/categories
列出 FAQ 分類。

### POST /api/faq/categories
新增 FAQ 分類。

### GET /api/faqs?category_id=&status=
查詢 FAQ 列表。

### POST /api/faqs
新增 FAQ。

### PUT /api/faqs/:id
更新 FAQ。

### DELETE /api/faqs/:id
刪除 FAQ。

---

## 工作量 API

### GET /api/workload/overview?period=YYYY-MM
取得團隊工作量概覽（任務數、剩餘工時等）。

回應:
```json
{
  "workloads": [
    { "employee_name": "紜蓁", "pending_tasks": 18, "remaining_hours": 120.5 }
  ]
}
```

### GET /api/tasks/recurring?year={year}&month={month}
獲取指定月份的週期性任務實例。

**回應**: 直接返回一個任務物件的陣列。
```json
[
  {
    "id": 1,
    "template_id": 101,
    "task_name": "客戶A - 月度記帳",
    "due_date": "2025-10-15",
    "status": "pending",
    "assigned_to": "張紜蓁",
    "notes": null,
    "client_name": "客戶A",
    "service_type": "accounting",
    "frequency": "monthly"
  }
]
```

### 任務範本 API (Templates)

