# 設定 API 設計

**API 前綴：** `/api/v1/settings`  
**最後更新：** 2025年10月27日

---

## 端點列表

## 模塊權限管理

### 1. 獲取預設權限模板

```
GET /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**回應：**
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

**後端邏輯：**
```typescript
async function getDefaultPermissions() {
  const rows = await db.prepare(`
    SELECT module_name, is_enabled 
    FROM ModulePermissions 
    WHERE user_id IS NULL
  `).all();
  
  const permissions = {};
  rows.results.forEach(row => {
    permissions[row.module_name] = row.is_enabled;
  });
  
  return permissions;
}
```

---

### 2. 更新預設權限模板

```
PUT /api/v1/settings/module-permissions/default
```

**權限：** 管理員

**請求：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**回應：**
```json
{
  "success": true,
  "message": "預設權限模板已更新"
}
```

**後端邏輯：**
```typescript
async function updateDefaultPermissions(permissions: Record<string, boolean>) {
  for (const [moduleName, isEnabled] of Object.entries(permissions)) {
    await db.prepare(`
      INSERT INTO ModulePermissions (user_id, module_name, is_enabled, updated_at)
      VALUES (NULL, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, module_name) 
      DO UPDATE SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(moduleName, isEnabled, isEnabled).run();
  }
  
  return { message: '預設權限模板已更新' };
}
```

---

### 3. 同步預設模板到員工

```
POST /api/v1/settings/module-permissions/sync
```

**權限：** 管理員

**請求：**
```json
{
  "user_ids": [123, 456, 789]
}
```

**回應：**
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

**後端邏輯：**
```typescript
async function syncPermissionsToUsers(userIds: number[]) {
  // 刪除這些員工的個別設定，讓他們使用預設模板
    await db.prepare(`
    DELETE FROM ModulePermissions 
    WHERE user_id IN (${userIds.join(',')})
  `).run();
  
  return { 
    synced_users: userIds,
    synced_count: userIds.length 
  };
}
```

---

### 4. 獲取所有員工的權限狀態列表

```
GET /api/v1/settings/module-permissions/users
```

**權限：** 管理員

**回應：**
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
    }
  ]
}
```

**後端邏輯：**
```typescript
async function getUserPermissionsList() {
  const users = await db.prepare(`
    SELECT u.user_id, u.name,
      CASE WHEN COUNT(mp.id) > 0 THEN 1 ELSE 0 END as is_customized
    FROM Users u
    LEFT JOIN ModulePermissions mp ON u.user_id = mp.user_id
    WHERE u.is_admin = 0
    GROUP BY u.user_id, u.name
  `).all();
  
  return users.results;
}
```

---

### 5. 獲取特定員工的權限

```
GET /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**回應：**
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

**說明：** 同時返回員工的個別權限和預設模板，方便前端做差異標示

**後端邏輯：**
```typescript
async function getUserPermissions(userId: number) {
  // 獲取預設模板
  const defaultPerms = await getDefaultPermissions();
  
  // 獲取員工個別設定
  const userPerms = await db.prepare(`
    SELECT module_name, is_enabled 
    FROM ModulePermissions 
    WHERE user_id = ?
  `).bind(userId).all();
  
  // 合併權限（員工設定優先）
  const permissions = { ...defaultPerms };
  userPerms.results.forEach(row => {
    permissions[row.module_name] = row.is_enabled;
  });
  
  return {
    user_id: userId,
    is_customized: userPerms.results.length > 0,
    permissions,
    default_permissions: defaultPerms
  };
}
```

---

### 6. 更新特定員工的權限

```
PUT /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**請求：**
```json
{
  "permissions": {
    "dashboard": true,
    "reports": true,
    "tasks": false
  }
}
```

**回應：**
```json
{
  "success": true,
  "message": "員工權限已更新"
}
```

**後端邏輯：**
```typescript
async function updateUserPermissions(userId: number, permissions: Record<string, boolean>) {
  for (const [moduleName, isEnabled] of Object.entries(permissions)) {
    await db.prepare(`
      INSERT INTO ModulePermissions (user_id, module_name, is_enabled, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, module_name) 
      DO UPDATE SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(userId, moduleName, isEnabled, isEnabled).run();
  }
  
  return { message: '員工權限已更新' };
}
```

---

### 7. 恢復員工為預設模板

```
DELETE /api/v1/settings/module-permissions/users/:user_id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復為預設模板"
}
```

**後端邏輯：**
```typescript
async function resetUserPermissions(userId: number) {
  // 刪除員工的所有個別設定
  await db.prepare(`
    DELETE FROM ModulePermissions WHERE user_id = ?
  `).bind(userId).run();
  
  return { message: '已恢復為預設模板' };
}
```

---

### 8. 檢查當前用戶權限（給前端使用）

```
GET /api/v1/settings/module-permissions/me
```

**權限：** 所有登入用戶

**回應：**
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

**說明：** 前端用此 API 獲取當前登入用戶的權限，決定顯示哪些導航選單

**後端邏輯：**
```typescript
async function getCurrentUserPermissions(userId: number, isAdmin: boolean) {
  // 管理員擁有所有權限
  if (isAdmin) {
    return getAllModulesEnabled();
  }
  
  // 員工權限：合併預設+個別設定
  return await getUserPermissions(userId).then(result => result.permissions);
}
```

---

## 業務規則管理

### 2.1 國定假日管理

#### 獲取國定假日列表

```
GET /api/v1/settings/holidays
```

**查詢參數：**
- `year` (可選): 篩選年份，如 `2025`
- `type` (可選): 篩選類型，`holiday` 或 `workday`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "holiday_date": "2025-01-01",
      "name": "中華民國開國紀念日",
      "type": "holiday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增國定假日

```
POST /api/v1/settings/holidays
```

**權限：** 管理員

**請求：**
```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**驗證規則：**
- `holiday_date`: 必填，格式 `YYYY-MM-DD`
- `name`: 必填，1-50 字元
- `type`: 必填，只能是 `holiday` 或 `workday`

**回應：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday"
  }
}
```

---

#### 編輯國定假日

```
PUT /api/v1/settings/holidays/:date
```

**權限：** 管理員

**請求：**
```json
{
  "name": "中華民國國慶日",
  "type": "holiday"
}
```

**回應：**
```json
{
  "success": true,
  "message": "國定假日已更新"
}
```

---

#### 刪除國定假日

```
DELETE /api/v1/settings/holidays/:date
```

**權限：** 管理員

**錯誤處理（已使用）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "related_count": 5
}
```

**HTTP 狀態碼：** 409 Conflict

---

#### 批量導入國定假日

```
POST /api/v1/settings/holidays/batch
```

**權限：** 管理員

**請求：**
```json
{
  "holidays": [
    {
      "holiday_date": "2025-01-27",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-28",
      "name": "春節",
      "type": "holiday"
    }
  ],
  "replace_existing": false
}
```

**參數說明：**
- `replace_existing`: `true` = 覆蓋重複資料，`false` = 跳過重複資料

**回應：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 0 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 0,
    "total": 2
  }
}
```

---

#### 匯出國定假日

```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**權限：** 管理員

**回應：** CSV 檔案下載

---

#### 查詢使用情況

```
GET /api/v1/settings/holidays/:date/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "in_use": true,
    "usage_count": 5,
    "can_delete": false,
    "details": {
      "timelogs_count": 5
    }
  }
}
```

---

### 2.2 假別類型管理

#### 獲取假別類型列表

```
GET /api/v1/settings/leave-types
```

**查詢參數：**
- `is_active` (可選): 篩選啟用狀態，`true` 或 `false`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": 1,
      "name": "病假",
      "is_gender_specific": false,
      "annual_quota_days": 30,
      "pay_rate": 0.5,
      "description": "1年內未住院30天，超過部分不支薪",
      "legal_source": "勞工請假規則",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 2,
      "name": "生理假",
      "is_gender_specific": true,
      "annual_quota_days": 12,
      "pay_rate": 0.5,
      "description": "每月1天，全年3天不併入病假",
      "legal_source": "性別工作平等法",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增假別類型

```
POST /api/v1/settings/leave-types
```

**權限：** 管理員

**請求：**
```json
{
  "name": "補休",
  "is_gender_specific": false,
  "annual_quota_days": null,
  "pay_rate": 1.0,
  "description": "加班換補休，每月清零",
  "legal_source": "勞基法第32條之1"
}
```

**驗證規則：**
- `name`: 必填，唯一，1-20 字元
- `is_gender_specific`: 必填，布林值
- `annual_quota_days`: 可選，整數，>= 0，`null` 表示無限制
- `pay_rate`: 必填，0.0-1.0
- `description`: 可選，最多 200 字元
- `legal_source`: 可選，最多 100 字元

**回應：**
```json
{
  "success": true,
  "message": "假別類型新增成功",
  "data": {
    "leave_type_id": 6,
    "name": "補休",
    "is_active": true
  }
}
```

---

#### 編輯假別類型

```
PUT /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 停用假別類型（軟刪除）

```
DELETE /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已停用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": false,
    "related_records_count": 50
  }
}
```

---

#### 重新啟用假別類型

```
PUT /api/v1/settings/leave-types/:id/activate
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已啟用假別類型「病假」"
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/leave-types/:id/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "in_use": true,
    "usage_count": 50,
    "can_delete": false,
    "details": {
      "timelogs_count": 50,
      "recent_usage": [
        {
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 8
        }
      ]
    }
  }
}
```

---

### 2.3 加班費率設定

#### 獲取加班費率列表

```
GET /api/v1/settings/overtime-rates
```

**查詢參數：**
- `work_day_type` (可選): 篩選工作日類型，`weekday`/`rest_day`/`national_holiday`/`holiday`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rate_id": 1,
      "work_day_type": "weekday",
      "hour_from": 1,
      "hour_to": 2,
      "rate": 1.34,
      "description": "平日第1-2小時（第9-10H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rate_id": 2,
      "work_day_type": "weekday",
      "hour_from": 3,
      "hour_to": 4,
      "rate": 1.67,
      "description": "平日第3-4小時（第11-12H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增加班費率

```
POST /api/v1/settings/overtime-rates
```

**權限：** 管理員

**請求：**
```json
{
  "work_day_type": "weekday",
  "hour_from": 1,
  "hour_to": 2,
  "rate": 1.34,
  "description": "平日延長工時第1-2小時",
  "requires_compensatory_leave": false
}
```

**驗證規則：**
- `work_day_type`: 必填，只能是 `weekday`/`rest_day`/`national_holiday`/`holiday`
- `hour_from`: 必填，1-12
- `hour_to`: 必填，1-12，>= hour_from
- `rate`: 必填，> 0
- `description`: 必填，1-100 字元
- `requires_compensatory_leave`: 必填，布林值

**回應：**
```json
{
  "success": true,
  "message": "加班費率新增成功",
  "data": {
    "rate_id": 10
  }
}
```

---

#### 編輯加班費率

```
PUT /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 標記為歷史費率

```
DELETE /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已標記為歷史費率",
  "data": {
    "rate_id": 1,
    "is_historical": true,
    "related_records_count": 100
  }
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/overtime-rates/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定預設費率",
  "data": {
    "created_count": 14,
    "replaced_count": 0
  }
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/overtime-rates/:id/usage
```

**權限：** 管理員

**回應：**（同假別類型）

---

### 2.4 特休規則設定

#### 獲取特休規則列表

```
GET /api/v1/settings/annual-leave-rules
```

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "min_seniority_months": 6,
      "max_seniority_months": 11,
      "grant_days": 3,
      "description": "6個月以上未滿1年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "min_seniority_months": 12,
      "max_seniority_months": 23,
      "grant_days": 7,
      "description": "1年以上未滿2年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增特休規則

```
POST /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**請求：**
```json
{
  "min_seniority_months": 60,
  "max_seniority_months": 71,
  "grant_days": 16,
  "description": "5年以上未滿6年"
}
```

**驗證規則：**
- `min_seniority_months`: 必填，>= 0
- `max_seniority_months`: 必填，>= min_seniority_months
- `grant_days`: 必填，> 0
- `description`: 可選

**回應：**
```json
{
  "success": true,
  "message": "特休規則新增成功",
  "data": {
    "rule_id": 20
  }
}
```

---

#### 編輯特休規則（立即重算）

```
PUT /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

**回應：**
```json
{
  "success": true,
  "message": "特休規則已更新，已重新計算 3 位員工的特休額度",
  "data": {
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 456,
        "name": "李小華",
        "old_days": 15,
        "new_days": 16
      }
    ],
    "affected_count": 3
  }
}
```

---

#### 刪除特休規則

```
DELETE /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "特休規則已刪除"
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/annual-leave-rules/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定特休規則（共 26 條規則）",
  "data": {
    "created_count": 26,
    "replaced_count": 0,
    "affected_employees_count": 15
  }
}
```

---

### 2.5 其他假期規則

#### 獲取其他假期規則列表

```
GET /api/v1/settings/other-leave-rules
```

**查詢參數：**
- `leave_category` (可選): 篩選假別類別，如 `喪假`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "leave_category": "婚假",
      "leave_subcategory": null,
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "勞工結婚",
      "legal_source": "勞工請假規則",
      "notes": "應於結婚登記日前後3個月內休畢",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "leave_category": "喪假",
      "leave_subcategory": "父母、配偶",
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "父母或配偶喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增假期規則

```
POST /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**請求：**
```json
{
  "leave_category": "喪假",
  "leave_subcategory": "兄弟姊妹",
  "grant_days": 3,
  "pay_rate": 1.0,
  "description": "兄弟姊妹喪亡",
  "legal_source": "勞工請假規則",
  "notes": null
}
```

**驗證規則：**
- `leave_category`: 必填，1-20 字元
- `leave_subcategory`: 可選，最多 50 字元
- `grant_days`: 必填，> 0
- `pay_rate`: 必填，0.0-1.0
- `description`: 可選
- `legal_source`: 可選
- `notes`: 可選

**約束：** `(leave_category, leave_subcategory)` 組合必須唯一

**回應：**
```json
{
  "success": true,
  "message": "假期規則新增成功",
  "data": {
    "rule_id": 15
  }
}
```

---

#### 編輯假期規則

```
PUT /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 刪除假期規則

```
DELETE /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "假期規則已刪除"
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/other-leave-rules/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定假期規則（共 10 條規則）",
  "data": {
    "created_count": 10,
    "replaced_count": 0
  }
}
```

---

### 2.6 週期類型管理

#### 獲取週期類型列表

```
GET /api/v1/settings/frequency-types
```

**查詢參數：**
- `is_active` (可選): 篩選啟用狀態

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "frequency_id": 1,
      "name": "每月",
      "description": "每個月執行一次",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "frequency_id": 2,
      "name": "雙月",
      "description": "每兩個月執行一次",
      "sort_order": 2,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增週期類型

```
POST /api/v1/settings/frequency-types
```

**權限：** 管理員

**請求：**
```json
{
  "name": "每週",
  "description": "每週執行一次",
  "sort_order": 7
}
```

**驗證規則：**
- `name`: 必填，唯一，1-20 字元
- `description`: 可選，最多 100 字元
- `sort_order`: 可選，預設 0

**回應：**
```json
{
  "success": true,
  "message": "週期類型新增成功",
  "data": {
    "frequency_id": 7,
    "name": "每週"
  }
}
```

---

#### 編輯週期類型

```
PUT /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 刪除週期類型

```
DELETE /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**錯誤處理（已使用）：**
```json
{
  "error": "Conflict",
  "message": "此週期類型已被 10 個客戶服務使用，無法刪除",
  "code": "FREQUENCY_IN_USE",
  "data": {
    "related_services_count": 10,
    "suggestion": "建議使用「停用」功能"
  }
}
```

**HTTP 狀態碼：** 409 Conflict

---

#### 停用週期類型

```
PUT /api/v1/settings/frequency-types/:id/deactivate
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已停用週期類型「雙月」"
}
```

---

#### 批量排序

```
PUT /api/v1/settings/frequency-types/reorder
```

**權限：** 管理員

**請求：**
```json
{
  "orders": [
    {
      "frequency_id": 1,
      "sort_order": 2
    },
    {
      "frequency_id": 2,
      "sort_order": 1
    }
  ]
}
```

**回應：**
```json
{
  "success": true,
  "message": "排序已更新"
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/frequency-types/:id/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "in_use": true,
    "usage_count": 10,
    "can_delete": false,
    "details": {
      "client_services_count": 10,
      "clients": [
        {
          "client_id": "12345678",
          "company_name": "測試公司",
          "service_name": "記帳服務"
        }
      ]
    }
  }
}
```

---

## 服務項目管理

### 服務模板

```
GET    /api/v1/settings/service-templates
POST   /api/v1/settings/service-templates
PUT    /api/v1/settings/service-templates/:id
DELETE /api/v1/settings/service-templates/:id
```

**POST 請求：**
```json
{
  "name": "稅務申報服務",
  "description": "營所稅、營業稅申報服務"
}
```

---

## 員工管理

### 員工列表

```
GET /api/v1/settings/users
```

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "name": "管理員",
      "username": "admin@firm.com",
      "is_admin": true,
      "gender": "female",
      "status": "啟用"
    }
  ]
}
```

---

### 新增員工

```
POST /api/v1/settings/users
```

**請求：**
```json
{
  "name": "新員工",
  "username": "newuser@firm.com",
  "password": "InitialPassword123",
  "is_admin": false,
  "gender": "male"
}
```

**後端邏輯（F001）：**
```typescript
async function createUser(data: any) {
  // 1. 驗證帳號不重複
  const existing = await db.prepare(
    'SELECT user_id FROM Users WHERE username = ?'
  ).bind(data.username).first();
  
  if (existing) {
    throw new ValidationError('此帳號已存在');
  }
  
  // 2. 雜湊密碼（Argon2）
  const hashedPassword = await argon2.hash(data.password);
  
  // 3. 插入資料庫
  await db.prepare(`
    INSERT INTO Users (name, username, hashed_password, is_admin, gender)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.username,
    hashedPassword,
    data.is_admin ? 1 : 0,
    data.gender
  ).run();
}
```

---

### 重設員工密碼

```
POST /api/v1/settings/users/:userId/reset-password
```

**權限：** 管理員

**請求：**
```json
{
  "new_password": "NewPassword123"
}
```

---

### 停用員工帳號

```
PUT /api/v1/settings/users/:userId/deactivate
```

---

## 系統參數

### 獲取所有系統設定

```
GET /api/v1/settings/system
```

**回應：**
```json
{
  "success": true,
  "data": {
    "module_visibility_tasks": "true",
    "module_visibility_sop": "false",
    "password_min_length": "8",
    "session_timeout": "24"
  }
}
```

---

### 更新系統參數

```
PUT /api/v1/settings/system
Body: { "password_min_length": "10" }
```

---

**相關文檔：**
- [系統設定模塊](../功能模塊/01-系統設定模塊.md)
- [權限系統設計](../權限系統設計.md)


{
  "success": true,
  "message": "已恢復為預設模板"
}
```

**後端邏輯：**
```typescript
async function resetUserPermissions(userId: number) {
  // 刪除員工的所有個別設定
  await db.prepare(`
    DELETE FROM ModulePermissions WHERE user_id = ?
  `).bind(userId).run();
  
  return { message: '已恢復為預設模板' };
}
```

---

### 8. 檢查當前用戶權限（給前端使用）

```
GET /api/v1/settings/module-permissions/me
```

**權限：** 所有登入用戶

**回應：**
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

**說明：** 前端用此 API 獲取當前登入用戶的權限，決定顯示哪些導航選單

**後端邏輯：**
```typescript
async function getCurrentUserPermissions(userId: number, isAdmin: boolean) {
  // 管理員擁有所有權限
  if (isAdmin) {
    return getAllModulesEnabled();
  }
  
  // 員工權限：合併預設+個別設定
  return await getUserPermissions(userId).then(result => result.permissions);
}
```

---

## 業務規則管理

### 2.1 國定假日管理

#### 獲取國定假日列表

```
GET /api/v1/settings/holidays
```

**查詢參數：**
- `year` (可選): 篩選年份，如 `2025`
- `type` (可選): 篩選類型，`holiday` 或 `workday`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "holiday_date": "2025-01-01",
      "name": "中華民國開國紀念日",
      "type": "holiday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    },
    {
      "holiday_date": "2025-01-18",
      "name": "補班日",
      "type": "workday",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增國定假日

```
POST /api/v1/settings/holidays
```

**權限：** 管理員

**請求：**
```json
{
  "holiday_date": "2025-01-27",
  "name": "春節",
  "type": "holiday"
}
```

**驗證規則：**
- `holiday_date`: 必填，格式 `YYYY-MM-DD`
- `name`: 必填，1-50 字元
- `type`: 必填，只能是 `holiday` 或 `workday`

**回應：**
```json
{
  "success": true,
  "message": "國定假日新增成功",
  "data": {
    "holiday_date": "2025-01-27",
    "name": "春節",
    "type": "holiday"
  }
}
```

---

#### 編輯國定假日

```
PUT /api/v1/settings/holidays/:date
```

**權限：** 管理員

**請求：**
```json
{
  "name": "中華民國國慶日",
  "type": "holiday"
}
```

**回應：**
```json
{
  "success": true,
  "message": "國定假日已更新"
}
```

---

#### 刪除國定假日

```
DELETE /api/v1/settings/holidays/:date
```

**權限：** 管理員

**錯誤處理（已使用）：**
```json
{
  "error": "Conflict",
  "message": "此國定假日已被 5 筆工時記錄使用，無法刪除",
  "code": "HOLIDAY_IN_USE",
  "related_count": 5
}
```

**HTTP 狀態碼：** 409 Conflict

---

#### 批量導入國定假日

```
POST /api/v1/settings/holidays/batch
```

**權限：** 管理員

**請求：**
```json
{
  "holidays": [
    {
      "holiday_date": "2025-01-27",
      "name": "春節",
      "type": "holiday"
    },
    {
      "holiday_date": "2025-01-28",
      "name": "春節",
      "type": "holiday"
    }
  ],
  "replace_existing": false
}
```

**參數說明：**
- `replace_existing`: `true` = 覆蓋重複資料，`false` = 跳過重複資料

**回應：**
```json
{
  "success": true,
  "message": "已新增 2 筆，跳過 0 筆重複",
  "data": {
    "created_count": 2,
    "skipped_count": 0,
    "total": 2
  }
}
```

---

#### 匯出國定假日

```
GET /api/v1/settings/holidays/export?year=2025&format=csv
```

**權限：** 管理員

**回應：** CSV 檔案下載

---

#### 查詢使用情況

```
GET /api/v1/settings/holidays/:date/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "holiday_date": "2025-01-01",
    "in_use": true,
    "usage_count": 5,
    "can_delete": false,
    "details": {
      "timelogs_count": 5
    }
  }
}
```

---

### 2.2 假別類型管理

#### 獲取假別類型列表

```
GET /api/v1/settings/leave-types
```

**查詢參數：**
- `is_active` (可選): 篩選啟用狀態，`true` 或 `false`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": 1,
      "name": "病假",
      "is_gender_specific": false,
      "annual_quota_days": 30,
      "pay_rate": 0.5,
      "description": "1年內未住院30天，超過部分不支薪",
      "legal_source": "勞工請假規則",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "leave_type_id": 2,
      "name": "生理假",
      "is_gender_specific": true,
      "annual_quota_days": 12,
      "pay_rate": 0.5,
      "description": "每月1天，全年3天不併入病假",
      "legal_source": "性別工作平等法",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增假別類型

```
POST /api/v1/settings/leave-types
```

**權限：** 管理員

**請求：**
```json
{
  "name": "補休",
  "is_gender_specific": false,
  "annual_quota_days": null,
  "pay_rate": 1.0,
  "description": "加班換補休，每月清零",
  "legal_source": "勞基法第32條之1"
}
```

**驗證規則：**
- `name`: 必填，唯一，1-20 字元
- `is_gender_specific`: 必填，布林值
- `annual_quota_days`: 可選，整數，>= 0，`null` 表示無限制
- `pay_rate`: 必填，0.0-1.0
- `description`: 可選，最多 200 字元
- `legal_source`: 可選，最多 100 字元

**回應：**
```json
{
  "success": true,
  "message": "假別類型新增成功",
  "data": {
    "leave_type_id": 6,
    "name": "補休",
    "is_active": true
  }
}
```

---

#### 編輯假別類型

```
PUT /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 停用假別類型（軟刪除）

```
DELETE /api/v1/settings/leave-types/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已停用假別類型「病假」",
  "data": {
    "leave_type_id": 1,
    "is_active": false,
    "related_records_count": 50
  }
}
```

---

#### 重新啟用假別類型

```
PUT /api/v1/settings/leave-types/:id/activate
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已啟用假別類型「病假」"
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/leave-types/:id/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "in_use": true,
    "usage_count": 50,
    "can_delete": false,
    "details": {
      "timelogs_count": 50,
      "recent_usage": [
        {
          "user_name": "王小明",
          "work_date": "2025-10-27",
          "hours": 8
        }
      ]
    }
  }
}
```

---

### 2.3 加班費率設定

#### 獲取加班費率列表

```
GET /api/v1/settings/overtime-rates
```

**查詢參數：**
- `work_day_type` (可選): 篩選工作日類型，`weekday`/`rest_day`/`national_holiday`/`holiday`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rate_id": 1,
      "work_day_type": "weekday",
      "hour_from": 1,
      "hour_to": 2,
      "rate": 1.34,
      "description": "平日第1-2小時（第9-10H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rate_id": 2,
      "work_day_type": "weekday",
      "hour_from": 3,
      "hour_to": 4,
      "rate": 1.67,
      "description": "平日第3-4小時（第11-12H）",
      "requires_compensatory_leave": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增加班費率

```
POST /api/v1/settings/overtime-rates
```

**權限：** 管理員

**請求：**
```json
{
  "work_day_type": "weekday",
  "hour_from": 1,
  "hour_to": 2,
  "rate": 1.34,
  "description": "平日延長工時第1-2小時",
  "requires_compensatory_leave": false
}
```

**驗證規則：**
- `work_day_type`: 必填，只能是 `weekday`/`rest_day`/`national_holiday`/`holiday`
- `hour_from`: 必填，1-12
- `hour_to`: 必填，1-12，>= hour_from
- `rate`: 必填，> 0
- `description`: 必填，1-100 字元
- `requires_compensatory_leave`: 必填，布林值

**回應：**
```json
{
  "success": true,
  "message": "加班費率新增成功",
  "data": {
    "rate_id": 10
  }
}
```

---

#### 編輯加班費率

```
PUT /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 標記為歷史費率

```
DELETE /api/v1/settings/overtime-rates/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已標記為歷史費率",
  "data": {
    "rate_id": 1,
    "is_historical": true,
    "related_records_count": 100
  }
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/overtime-rates/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定預設費率",
  "data": {
    "created_count": 14,
    "replaced_count": 0
  }
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/overtime-rates/:id/usage
```

**權限：** 管理員

**回應：**（同假別類型）

---

### 2.4 特休規則設定

#### 獲取特休規則列表

```
GET /api/v1/settings/annual-leave-rules
```

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "min_seniority_months": 6,
      "max_seniority_months": 11,
      "grant_days": 3,
      "description": "6個月以上未滿1年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "min_seniority_months": 12,
      "max_seniority_months": 23,
      "grant_days": 7,
      "description": "1年以上未滿2年",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增特休規則

```
POST /api/v1/settings/annual-leave-rules
```

**權限：** 管理員

**請求：**
```json
{
  "min_seniority_months": 60,
  "max_seniority_months": 71,
  "grant_days": 16,
  "description": "5年以上未滿6年"
}
```

**驗證規則：**
- `min_seniority_months`: 必填，>= 0
- `max_seniority_months`: 必填，>= min_seniority_months
- `grant_days`: 必填，> 0
- `description`: 可選

**回應：**
```json
{
  "success": true,
  "message": "特休規則新增成功",
  "data": {
    "rule_id": 20
  }
}
```

---

#### 編輯特休規則（立即重算）

```
PUT /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

**回應：**
```json
{
  "success": true,
  "message": "特休規則已更新，已重新計算 3 位員工的特休額度",
  "data": {
    "affected_employees": [
      {
        "user_id": 123,
        "name": "王小明",
        "old_days": 15,
        "new_days": 16
      },
      {
        "user_id": 456,
        "name": "李小華",
        "old_days": 15,
        "new_days": 16
      }
    ],
    "affected_count": 3
  }
}
```

---

#### 刪除特休規則

```
DELETE /api/v1/settings/annual-leave-rules/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "特休規則已刪除"
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/annual-leave-rules/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定特休規則（共 26 條規則）",
  "data": {
    "created_count": 26,
    "replaced_count": 0,
    "affected_employees_count": 15
  }
}
```

---

### 2.5 其他假期規則

#### 獲取其他假期規則列表

```
GET /api/v1/settings/other-leave-rules
```

**查詢參數：**
- `leave_category` (可選): 篩選假別類別，如 `喪假`

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "leave_category": "婚假",
      "leave_subcategory": null,
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "勞工結婚",
      "legal_source": "勞工請假規則",
      "notes": "應於結婚登記日前後3個月內休畢",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "rule_id": 2,
      "leave_category": "喪假",
      "leave_subcategory": "父母、配偶",
      "grant_days": 8,
      "pay_rate": 1.0,
      "description": "父母或配偶喪亡",
      "legal_source": "勞工請假規則",
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增假期規則

```
POST /api/v1/settings/other-leave-rules
```

**權限：** 管理員

**請求：**
```json
{
  "leave_category": "喪假",
  "leave_subcategory": "兄弟姊妹",
  "grant_days": 3,
  "pay_rate": 1.0,
  "description": "兄弟姊妹喪亡",
  "legal_source": "勞工請假規則",
  "notes": null
}
```

**驗證規則：**
- `leave_category`: 必填，1-20 字元
- `leave_subcategory`: 可選，最多 50 字元
- `grant_days`: 必填，> 0
- `pay_rate`: 必填，0.0-1.0
- `description`: 可選
- `legal_source`: 可選
- `notes`: 可選

**約束：** `(leave_category, leave_subcategory)` 組合必須唯一

**回應：**
```json
{
  "success": true,
  "message": "假期規則新增成功",
  "data": {
    "rule_id": 15
  }
}
```

---

#### 編輯假期規則

```
PUT /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 刪除假期規則

```
DELETE /api/v1/settings/other-leave-rules/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "假期規則已刪除"
}
```

---

#### 恢復法定預設值

```
POST /api/v1/settings/other-leave-rules/reset-defaults
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已恢復法定假期規則（共 10 條規則）",
  "data": {
    "created_count": 10,
    "replaced_count": 0
  }
}
```

---

### 2.6 週期類型管理

#### 獲取週期類型列表

```
GET /api/v1/settings/frequency-types
```

**查詢參數：**
- `is_active` (可選): 篩選啟用狀態

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "frequency_id": 1,
      "name": "每月",
      "description": "每個月執行一次",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "frequency_id": 2,
      "name": "雙月",
      "description": "每兩個月執行一次",
      "sort_order": 2,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 新增週期類型

```
POST /api/v1/settings/frequency-types
```

**權限：** 管理員

**請求：**
```json
{
  "name": "每週",
  "description": "每週執行一次",
  "sort_order": 7
}
```

**驗證規則：**
- `name`: 必填，唯一，1-20 字元
- `description`: 可選，最多 100 字元
- `sort_order`: 可選，預設 0

**回應：**
```json
{
  "success": true,
  "message": "週期類型新增成功",
  "data": {
    "frequency_id": 7,
    "name": "每週"
  }
}
```

---

#### 編輯週期類型

```
PUT /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**請求：**（同新增，所有欄位可選）

---

#### 刪除週期類型

```
DELETE /api/v1/settings/frequency-types/:id
```

**權限：** 管理員

**錯誤處理（已使用）：**
```json
{
  "error": "Conflict",
  "message": "此週期類型已被 10 個客戶服務使用，無法刪除",
  "code": "FREQUENCY_IN_USE",
  "data": {
    "related_services_count": 10,
    "suggestion": "建議使用「停用」功能"
  }
}
```

**HTTP 狀態碼：** 409 Conflict

---

#### 停用週期類型

```
PUT /api/v1/settings/frequency-types/:id/deactivate
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "message": "已停用週期類型「雙月」"
}
```

---

#### 批量排序

```
PUT /api/v1/settings/frequency-types/reorder
```

**權限：** 管理員

**請求：**
```json
{
  "orders": [
    {
      "frequency_id": 1,
      "sort_order": 2
    },
    {
      "frequency_id": 2,
      "sort_order": 1
    }
  ]
}
```

**回應：**
```json
{
  "success": true,
  "message": "排序已更新"
}
```

---

#### 查詢使用情況

```
GET /api/v1/settings/frequency-types/:id/usage
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "in_use": true,
    "usage_count": 10,
    "can_delete": false,
    "details": {
      "client_services_count": 10,
      "clients": [
        {
          "client_id": "12345678",
          "company_name": "測試公司",
          "service_name": "記帳服務"
        }
      ]
    }
  }
}
```

---

## 服務項目管理

### 服務模板

```
GET    /api/v1/settings/service-templates
POST   /api/v1/settings/service-templates
PUT    /api/v1/settings/service-templates/:id
DELETE /api/v1/settings/service-templates/:id
```

**POST 請求：**
```json
{
  "name": "稅務申報服務",
  "description": "營所稅、營業稅申報服務"
}
```

---

## 員工管理

### 員工列表

```
GET /api/v1/settings/users
```

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "name": "管理員",
      "username": "admin@firm.com",
      "is_admin": true,
      "gender": "female",
      "status": "啟用"
    }
  ]
}
```

---

### 新增員工

```
POST /api/v1/settings/users
```

**請求：**
```json
{
  "name": "新員工",
  "username": "newuser@firm.com",
  "password": "InitialPassword123",
  "is_admin": false,
  "gender": "male"
}
```

**後端邏輯（F001）：**
```typescript
async function createUser(data: any) {
  // 1. 驗證帳號不重複
  const existing = await db.prepare(
    'SELECT user_id FROM Users WHERE username = ?'
  ).bind(data.username).first();
  
  if (existing) {
    throw new ValidationError('此帳號已存在');
  }
  
  // 2. 雜湊密碼（Argon2）
  const hashedPassword = await argon2.hash(data.password);
  
  // 3. 插入資料庫
  await db.prepare(`
    INSERT INTO Users (name, username, hashed_password, is_admin, gender)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.username,
    hashedPassword,
    data.is_admin ? 1 : 0,
    data.gender
  ).run();
}
```

---

### 重設員工密碼

```
POST /api/v1/settings/users/:userId/reset-password
```

**權限：** 管理員

**請求：**
```json
{
  "new_password": "NewPassword123"
}
```

---

### 停用員工帳號

```
PUT /api/v1/settings/users/:userId/deactivate
```

---

## 系統參數

### 獲取所有系統設定

```
GET /api/v1/settings/system
```

**回應：**
```json
{
  "success": true,
  "data": {
    "module_visibility_tasks": "true",
    "module_visibility_sop": "false",
    "password_min_length": "8",
    "session_timeout": "24"
  }
}
```

---

### 更新系統參數

```
PUT /api/v1/settings/system
Body: { "password_min_length": "10" }
```

---

**相關文檔：**
- [系統設定模塊](../功能模塊/01-系統設定模塊.md)
- [權限系統設計](../權限系統設計.md)

