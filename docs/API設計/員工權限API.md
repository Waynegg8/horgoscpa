# 員工權限 API

**API 前綴：** `/api/v1/settings/module-permissions`  
**最後更新：** 2025年10月27日

---

## 概述

管理員工的系統模塊存取權限，採用「預設模板 + 個別調整」機制。管理員可設定預設權限模板，並針對個別員工進行調整。

**主要功能：**
- 預設權限模板管理
- 個別員工權限管理
- 同步權限到員工
- 當前用戶權限查詢（供前端使用）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/module-permissions/default` | 獲取預設模板 | 管理員 |
| PUT | `/module-permissions/default` | 更新預設模板 | 管理員 |
| POST | `/module-permissions/sync` | 同步到員工 | 管理員 |
| GET | `/module-permissions/users` | 獲取員工列表 | 管理員 |
| GET | `/module-permissions/users/:id` | 獲取員工權限 | 管理員 |
| PUT | `/module-permissions/users/:id` | 更新員工權限 | 管理員 |
| DELETE | `/module-permissions/users/:id` | 恢復為預設 | 管理員 |
| GET | `/module-permissions/me` | 獲取當前權限 | 所有用戶 |

---

## 詳細規格

### 1. 獲取預設權限模板

```
GET /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": false,
    "life_events": false,
    "task_templates": false,
    "tasks": false,
    "stage_updates": false,
    "client_services": false,
    "booking_records": false,
    "sop_management": false,
    "knowledge_base": false,
    "service_management": false,
    "csv_import": false
  }
}
```

---

### 2. 更新預設權限模板

```
PUT /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**請求 Body：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**說明：** 只需傳遞要更新的模塊，未傳遞的保持不變

**回應範例（200）：**
```json
{
  "success": true,
  "message": "預設權限模板已更新"
}
```

---

### 3. 同步預設模板到員工

```
POST /api/v1/settings/module-permissions/sync
```

**權限：** 管理員

**請求 Body：**
```json
{
  "user_ids": [123, 456, 789]
}
```

**驗證規則：**
- `user_ids`: 
  - 必填
  - 陣列，至少包含 1 個員工 ID
  - 所有 ID 必須存在且為非管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已同步 3 位員工的權限",
  "data": {
    "synced_users": [123, 456, 789],
    "synced_count": 3
  }
}
```

**說明：** 刪除這些員工的所有個別設定，讓他們使用預設模板

---

### 4. 獲取所有員工的權限狀態列表

```
GET /api/v1/settings/module-permissions/users
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 123,
      "name": "王小明",
      "is_customized": false
    },
    {
      "user_id": 456,
      "name": "李小華",
      "is_customized": true
    },
    {
      "user_id": 789,
      "name": "張小美",
      "is_customized": false
    }
  ]
}
```

**說明：**
- `is_customized`: `true` = 已個別調整，`false` = 使用預設模板

---

### 5. 獲取特定員工的權限

```
GET /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "name": "王小明",
    "is_customized": true,
    "permissions": {
      "dashboard": true,
      "reports": true,
      "tasks": false
    },
    "default_permissions": {
      "dashboard": true,
      "reports": false,
      "tasks": false
    }
  }
}
```

**說明：** 
- `permissions`: 員工的實際權限（合併預設+個別調整）
- `default_permissions`: 預設模板的權限
- 前端可以比對兩者，顯示差異標示

---

### 6. 更新特定員工的權限

```
PUT /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**請求 Body：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**回應範例（200）：**
```json
{
  "success": true,
  "message": "員工權限已更新",
  "data": {
    "user_id": 123,
    "is_customized": true,
    "updated_modules": ["reports", "tasks"]
  }
}
```

---

### 7. 恢復員工為預設模板

```
DELETE /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復為預設模板",
  "data": {
    "user_id": 123,
    "is_customized": false
  }
}
```

**說明：** 刪除該員工的所有個別設定

---

### 8. 獲取當前用戶權限

```
GET /api/v1/settings/module-permissions/me
```

**權限：** 所有登入用戶

**回應範例（員工）：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": false,
    "tasks": false
  }
}
```

**回應範例（管理員）：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": true,
    "tasks": true,
    "sop_management": true,
    "knowledge_base": true,
    "service_management": true,
    "csv_import": true,
    "employee_permissions": true,
    "business_rules": true,
    "employee_accounts": true,
    "external_content": true
  }
}
```

**說明：** 
- 管理員擁有所有權限
- 員工權限為預設模板+個別調整的合併結果
- 前端用此 API 決定顯示哪些導航選單

---

## 資料模型

### ModulePermission

```typescript
interface ModulePermission {
  id: number;              // 權限記錄 ID
  user_id: number | null;  // 員工 ID，null=預設模板
  module_name: string;     // 模塊名稱
  is_enabled: boolean;     // 是否啟用
  created_at: string;      // 建立時間
  updated_at: string;      // 更新時間
}
```

### UserPermissionStatus

```typescript
interface UserPermissionStatus {
  user_id: number;
  name: string;
  is_customized: boolean;  // 是否已個別調整
}
```

### UserPermissionDetail

```typescript
interface UserPermissionDetail {
  user_id: number;
  name: string;
  is_customized: boolean;
  permissions: Record<string, boolean>;         // 實際權限
  default_permissions: Record<string, boolean>; // 預設模板權限
}
```

---

## 模塊名稱列表

### 可開放給員工的模塊（14個）

```typescript
const EMPLOYEE_MODULES = [
  'dashboard',           // 儀表板
  'personal_settings',   // 個人資料設定
  'timesheet',          // 工時表填寫
  'reports',            // 報表中心
  'life_events',        // 生活事件登記
  'task_templates',     // 任務模板管理
  'tasks',              // 任務進度追蹤
  'stage_updates',      // 階段進度更新
  'client_services',    // 客戶服務設定
  'booking_records',    // 預約記錄查看
  'sop_management',     // SOP文件管理
  'knowledge_base',     // 通用知識庫
  'service_management', // 服務項目管理
  'csv_import'          // CSV導入功能
];
```

### 管理員專屬模塊（8個）

```typescript
const ADMIN_ONLY_MODULES = [
  'employee_permissions',     // 員工權限設定
  'business_rules',          // 業務規則管理
  'employee_accounts',       // 員工帳號管理
  'external_articles',       // 外部文章管理
  'external_faq',           // 外部常見問題管理
  'external_resources',     // 外部資源中心管理
  'external_images',        // 外部圖片資源管理
  'booking_settings'        // 預約表單設定
];
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `USER_NOT_FOUND` | 404 | 找不到指定的員工 |
| `INVALID_MODULE_NAME` | 400 | 無效的模塊名稱 |
| `ADMIN_PERMISSION_REQUIRED` | 403 | 需要管理員權限 |
| `MODULE_PERMISSION_DENIED` | 403 | 沒有存取此模塊的權限 |
| `CANNOT_MODIFY_ADMIN` | 400 | 不可修改管理員的權限 |

---

## 相關文檔

- [API 標準規範](./00-API標準規範.md)
- [員工權限設定功能模塊](../功能模塊/01-員工權限設定.md)
- [資料庫設計 - ModulePermissions](../資料庫設計.md#modulepermissions-模塊權限管理)
- [權限系統設計](../權限系統設計.md)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



**API 前綴：** `/api/v1/settings/module-permissions`  
**最後更新：** 2025年10月27日

---

## 概述

管理員工的系統模塊存取權限，採用「預設模板 + 個別調整」機制。管理員可設定預設權限模板，並針對個別員工進行調整。

**主要功能：**
- 預設權限模板管理
- 個別員工權限管理
- 同步權限到員工
- 當前用戶權限查詢（供前端使用）

---

## 端點列表

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/module-permissions/default` | 獲取預設模板 | 管理員 |
| PUT | `/module-permissions/default` | 更新預設模板 | 管理員 |
| POST | `/module-permissions/sync` | 同步到員工 | 管理員 |
| GET | `/module-permissions/users` | 獲取員工列表 | 管理員 |
| GET | `/module-permissions/users/:id` | 獲取員工權限 | 管理員 |
| PUT | `/module-permissions/users/:id` | 更新員工權限 | 管理員 |
| DELETE | `/module-permissions/users/:id` | 恢復為預設 | 管理員 |
| GET | `/module-permissions/me` | 獲取當前權限 | 所有用戶 |

---

## 詳細規格

### 1. 獲取預設權限模板

```
GET /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": false,
    "life_events": false,
    "task_templates": false,
    "tasks": false,
    "stage_updates": false,
    "client_services": false,
    "booking_records": false,
    "sop_management": false,
    "knowledge_base": false,
    "service_management": false,
    "csv_import": false
  }
}
```

---

### 2. 更新預設權限模板

```
PUT /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**請求 Body：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**說明：** 只需傳遞要更新的模塊，未傳遞的保持不變

**回應範例（200）：**
```json
{
  "success": true,
  "message": "預設權限模板已更新"
}
```

---

### 3. 同步預設模板到員工

```
POST /api/v1/settings/module-permissions/sync
```

**權限：** 管理員

**請求 Body：**
```json
{
  "user_ids": [123, 456, 789]
}
```

**驗證規則：**
- `user_ids`: 
  - 必填
  - 陣列，至少包含 1 個員工 ID
  - 所有 ID 必須存在且為非管理員

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已同步 3 位員工的權限",
  "data": {
    "synced_users": [123, 456, 789],
    "synced_count": 3
  }
}
```

**說明：** 刪除這些員工的所有個別設定，讓他們使用預設模板

---

### 4. 獲取所有員工的權限狀態列表

```
GET /api/v1/settings/module-permissions/users
```

**權限：** 管理員

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 123,
      "name": "王小明",
      "is_customized": false
    },
    {
      "user_id": 456,
      "name": "李小華",
      "is_customized": true
    },
    {
      "user_id": 789,
      "name": "張小美",
      "is_customized": false
    }
  ]
}
```

**說明：**
- `is_customized`: `true` = 已個別調整，`false` = 使用預設模板

---

### 5. 獲取特定員工的權限

```
GET /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**回應範例：**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "name": "王小明",
    "is_customized": true,
    "permissions": {
      "dashboard": true,
      "reports": true,
      "tasks": false
    },
    "default_permissions": {
      "dashboard": true,
      "reports": false,
      "tasks": false
    }
  }
}
```

**說明：** 
- `permissions`: 員工的實際權限（合併預設+個別調整）
- `default_permissions`: 預設模板的權限
- 前端可以比對兩者，顯示差異標示

---

### 6. 更新特定員工的權限

```
PUT /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**請求 Body：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**回應範例（200）：**
```json
{
  "success": true,
  "message": "員工權限已更新",
  "data": {
    "user_id": 123,
    "is_customized": true,
    "updated_modules": ["reports", "tasks"]
  }
}
```

---

### 7. 恢復員工為預設模板

```
DELETE /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**路徑參數：**
- `user_id` (必填, integer): 員工 ID

**回應範例（200）：**
```json
{
  "success": true,
  "message": "已恢復為預設模板",
  "data": {
    "user_id": 123,
    "is_customized": false
  }
}
```

**說明：** 刪除該員工的所有個別設定

---

### 8. 獲取當前用戶權限

```
GET /api/v1/settings/module-permissions/me
```

**權限：** 所有登入用戶

**回應範例（員工）：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": false,
    "tasks": false
  }
}
```

**回應範例（管理員）：**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "personal_settings": true,
    "timesheet": true,
    "reports": true,
    "tasks": true,
    "sop_management": true,
    "knowledge_base": true,
    "service_management": true,
    "csv_import": true,
    "employee_permissions": true,
    "business_rules": true,
    "employee_accounts": true,
    "external_content": true
  }
}
```

**說明：** 
- 管理員擁有所有權限
- 員工權限為預設模板+個別調整的合併結果
- 前端用此 API 決定顯示哪些導航選單

---

## 資料模型

### ModulePermission

```typescript
interface ModulePermission {
  id: number;              // 權限記錄 ID
  user_id: number | null;  // 員工 ID，null=預設模板
  module_name: string;     // 模塊名稱
  is_enabled: boolean;     // 是否啟用
  created_at: string;      // 建立時間
  updated_at: string;      // 更新時間
}
```

### UserPermissionStatus

```typescript
interface UserPermissionStatus {
  user_id: number;
  name: string;
  is_customized: boolean;  // 是否已個別調整
}
```

### UserPermissionDetail

```typescript
interface UserPermissionDetail {
  user_id: number;
  name: string;
  is_customized: boolean;
  permissions: Record<string, boolean>;         // 實際權限
  default_permissions: Record<string, boolean>; // 預設模板權限
}
```

---

## 模塊名稱列表

### 可開放給員工的模塊（14個）

```typescript
const EMPLOYEE_MODULES = [
  'dashboard',           // 儀表板
  'personal_settings',   // 個人資料設定
  'timesheet',          // 工時表填寫
  'reports',            // 報表中心
  'life_events',        // 生活事件登記
  'task_templates',     // 任務模板管理
  'tasks',              // 任務進度追蹤
  'stage_updates',      // 階段進度更新
  'client_services',    // 客戶服務設定
  'booking_records',    // 預約記錄查看
  'sop_management',     // SOP文件管理
  'knowledge_base',     // 通用知識庫
  'service_management', // 服務項目管理
  'csv_import'          // CSV導入功能
];
```

### 管理員專屬模塊（8個）

```typescript
const ADMIN_ONLY_MODULES = [
  'employee_permissions',     // 員工權限設定
  'business_rules',          // 業務規則管理
  'employee_accounts',       // 員工帳號管理
  'external_articles',       // 外部文章管理
  'external_faq',           // 外部常見問題管理
  'external_resources',     // 外部資源中心管理
  'external_images',        // 外部圖片資源管理
  'booking_settings'        // 預約表單設定
];
```

---

## 錯誤代碼

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|------------|------|
| `USER_NOT_FOUND` | 404 | 找不到指定的員工 |
| `INVALID_MODULE_NAME` | 400 | 無效的模塊名稱 |
| `ADMIN_PERMISSION_REQUIRED` | 403 | 需要管理員權限 |
| `MODULE_PERMISSION_DENIED` | 403 | 沒有存取此模塊的權限 |
| `CANNOT_MODIFY_ADMIN` | 400 | 不可修改管理員的權限 |

---

## 相關文檔

- [API 標準規範](./00-API標準規範.md)
- [員工權限設定功能模塊](../功能模塊/01-員工權限設定.md)
- [資料庫設計 - ModulePermissions](../資料庫設計.md#modulepermissions-模塊權限管理)
- [權限系統設計](../權限系統設計.md)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0



