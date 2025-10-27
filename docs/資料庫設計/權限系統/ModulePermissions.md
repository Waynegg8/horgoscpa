# ModulePermissions - 模塊權限管理

**用途：** 管理員工對系統模塊的存取權限  
**所屬功能：** [員工權限設定](../../功能模塊/01-員工權限設定.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE ModulePermissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                            -- NULL = 預設模板, 非NULL = 特定員工
  module_name TEXT NOT NULL,                  -- 模塊名稱
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否啟用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, module_name),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NULL=預設模板, 外鍵關聯 Users, CASCADE刪除 |
| `module_name` | TEXT | 模塊名稱 | NOT NULL, 必須在可開放清單中 |
| `is_enabled` | BOOLEAN | 是否啟用 | NOT NULL, DEFAULT FALSE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢員工權限（最常用）
CREATE INDEX idx_module_permissions_user ON ModulePermissions(user_id);

-- 查詢特定模塊的使用情況
CREATE INDEX idx_module_permissions_module ON ModulePermissions(module_name);

-- 查詢預設模板
CREATE INDEX idx_module_permissions_default ON ModulePermissions(user_id) WHERE user_id IS NULL;
```

---

## 設計邏輯

### 預設模板機制

**預設模板記錄：**
- `user_id = NULL` 的記錄代表預設模板
- 新員工加入時，自動套用預設模板（不複製記錄）

**權限查詢邏輯：**
```sql
-- 查詢員工的某個模塊權限
SELECT COALESCE(
  (SELECT is_enabled FROM ModulePermissions WHERE user_id = ? AND module_name = ?),
  (SELECT is_enabled FROM ModulePermissions WHERE user_id IS NULL AND module_name = ?)
) AS has_permission;
```

### 個別調整機制

**個別調整記錄：**
- `user_id != NULL` 的記錄代表個別調整
- 只儲存與預設模板不同的模塊權限
- 查詢時，個別設定優先於預設模板

---

## 範例資料

```sql
-- 預設模板（新員工自動套用）
INSERT INTO ModulePermissions (user_id, module_name, is_enabled) VALUES
(NULL, 'dashboard', TRUE),
(NULL, 'personal_settings', TRUE),
(NULL, 'timesheet', TRUE),
(NULL, 'reports', FALSE),
(NULL, 'tasks', FALSE);

-- 員工 ID=123 的個別調整（開放報表功能）
INSERT INTO ModulePermissions (user_id, module_name, is_enabled) VALUES
(123, 'reports', TRUE);

-- 員工 ID=456 使用預設模板（無個別調整記錄）
```

**查詢結果：**
- 員工 123：
  - dashboard: TRUE (預設)
  - timesheet: TRUE (預設)
  - reports: **TRUE** (個別調整)
  - tasks: FALSE (預設)
- 員工 456：
  - dashboard: TRUE (預設)
  - timesheet: TRUE (預設)
  - reports: FALSE (預設)
  - tasks: FALSE (預設)

---

## 常用查詢

### 查詢 1：獲取預設模板

```sql
SELECT module_name, is_enabled
FROM ModulePermissions
WHERE user_id IS NULL;
```

---

### 查詢 2：獲取員工的實際權限（合併預設+個別）

```sql
SELECT 
  module_name,
  is_enabled
FROM ModulePermissions
WHERE user_id = ? OR user_id IS NULL
ORDER BY user_id DESC  -- 個別設定優先（非NULL排在前）
LIMIT 1 PER module_name;  -- 每個模塊只取一筆
```

**SQLite 替代寫法（使用子查詢）：**
```sql
SELECT 
  m.module_name,
  COALESCE(
    (SELECT is_enabled FROM ModulePermissions WHERE user_id = ? AND module_name = m.module_name),
    m.is_enabled
  ) AS is_enabled
FROM ModulePermissions m
WHERE m.user_id IS NULL;
```

---

### 查詢 3：檢查員工是否已個別調整

```sql
SELECT EXISTS(
  SELECT 1 FROM ModulePermissions WHERE user_id = ?
) AS is_customized;
```

---

### 查詢 4：獲取所有員工的權限狀態

```sql
SELECT 
  u.user_id,
  u.name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM ModulePermissions WHERE user_id = u.user_id)
    THEN 1 
    ELSE 0 
  END AS is_customized
FROM Users u
WHERE u.role = 'employee'
ORDER BY u.name;
```

---

### 查詢 5：檢查特定模塊的使用情況

```sql
-- 查詢哪些員工有此模塊的個別設定
SELECT u.name, mp.is_enabled
FROM ModulePermissions mp
JOIN Users u ON mp.user_id = u.user_id
WHERE mp.module_name = 'reports';
```

---

### 查詢 6：恢復員工為預設模板

```sql
-- 刪除所有個別設定
DELETE FROM ModulePermissions
WHERE user_id = ?;
```

---

### 查詢 7：同步預設模板到多個員工

```sql
-- 刪除這些員工的所有個別設定
DELETE FROM ModulePermissions
WHERE user_id IN (123, 456, 789);
```

---

## 資料完整性規則

### 1. 唯一性約束

```sql
UNIQUE(user_id, module_name)
```

**說明：** 同一個員工對同一個模塊只能有一筆權限記錄

---

### 2. 外鍵約束

```sql
FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
```

**說明：** 員工刪除時，自動刪除其權限記錄

---

### 3. 模塊名稱驗證（應用層）

**可開放給員工的模塊（14個）：**
```
dashboard, personal_settings, timesheet, reports, life_events,
task_templates, tasks, stage_updates, client_services, booking_records,
sop_management, knowledge_base, service_management, csv_import
```

**管理員專屬模塊（8個，不可出現在此表）：**
```
employee_permissions, business_rules, employee_accounts,
external_articles, external_faq, external_resources,
external_images, booking_settings
```

---

## 關聯資料表

### Users - 使用者資料表

**關係：** ModulePermissions.user_id → Users.user_id (N:1)

**說明：**
- 一個員工可以有多個模塊權限記錄
- 員工刪除時，CASCADE 刪除所有權限記錄

---

## 效能考量

### 快取策略

```typescript
// Redis 快取結構
const cacheKey = `permissions:user:${userId}`;
const cacheTTL = 300; // 5分鐘

// 快取內容：員工的所有權限
{
  "dashboard": true,
  "timesheet": true,
  "reports": false,
  ...
}

// 清除時機：
// 1. 管理員更新該員工權限時
// 2. 管理員更新預設模板並同步該員工時
// 3. 員工刪除時
```

---

### 查詢優化建議

1. **使用索引：** 所有查詢都應使用 `user_id` 或 `module_name` 索引
2. **避免全表掃描：** 不要查詢沒有 WHERE 條件的 ModulePermissions
3. **批次查詢：** 一次查詢獲取員工的所有權限，而非逐個模塊查詢
4. **快取熱資料：** 常用的預設模板和活躍員工權限應快取

---

## 相關文檔

- [功能模塊 - 員工權限設定](../../功能模塊/01-員工權限設定.md)
- [API 概覽 - 員工權限](../../API規格/員工權限/_概覽.md)
- [UI 設計 - 員工權限](../../技術規格/員工權限/UI設計.md)
- [權限驗證邏輯](../../技術規格/員工權限/權限驗證邏輯.md)

---

**最後更新：** 2025年10月27日  
**表格版本：** 1.0



**用途：** 管理員工對系統模塊的存取權限  
**所屬功能：** [員工權限設定](../../功能模塊/01-員工權限設定.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE ModulePermissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                            -- NULL = 預設模板, 非NULL = 特定員工
  module_name TEXT NOT NULL,                  -- 模塊名稱
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否啟用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, module_name),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NULL=預設模板, 外鍵關聯 Users, CASCADE刪除 |
| `module_name` | TEXT | 模塊名稱 | NOT NULL, 必須在可開放清單中 |
| `is_enabled` | BOOLEAN | 是否啟用 | NOT NULL, DEFAULT FALSE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢員工權限（最常用）
CREATE INDEX idx_module_permissions_user ON ModulePermissions(user_id);

-- 查詢特定模塊的使用情況
CREATE INDEX idx_module_permissions_module ON ModulePermissions(module_name);

-- 查詢預設模板
CREATE INDEX idx_module_permissions_default ON ModulePermissions(user_id) WHERE user_id IS NULL;
```

---

## 設計邏輯

### 預設模板機制

**預設模板記錄：**
- `user_id = NULL` 的記錄代表預設模板
- 新員工加入時，自動套用預設模板（不複製記錄）

**權限查詢邏輯：**
```sql
-- 查詢員工的某個模塊權限
SELECT COALESCE(
  (SELECT is_enabled FROM ModulePermissions WHERE user_id = ? AND module_name = ?),
  (SELECT is_enabled FROM ModulePermissions WHERE user_id IS NULL AND module_name = ?)
) AS has_permission;
```

### 個別調整機制

**個別調整記錄：**
- `user_id != NULL` 的記錄代表個別調整
- 只儲存與預設模板不同的模塊權限
- 查詢時，個別設定優先於預設模板

---

## 範例資料

```sql
-- 預設模板（新員工自動套用）
INSERT INTO ModulePermissions (user_id, module_name, is_enabled) VALUES
(NULL, 'dashboard', TRUE),
(NULL, 'personal_settings', TRUE),
(NULL, 'timesheet', TRUE),
(NULL, 'reports', FALSE),
(NULL, 'tasks', FALSE);

-- 員工 ID=123 的個別調整（開放報表功能）
INSERT INTO ModulePermissions (user_id, module_name, is_enabled) VALUES
(123, 'reports', TRUE);

-- 員工 ID=456 使用預設模板（無個別調整記錄）
```

**查詢結果：**
- 員工 123：
  - dashboard: TRUE (預設)
  - timesheet: TRUE (預設)
  - reports: **TRUE** (個別調整)
  - tasks: FALSE (預設)
- 員工 456：
  - dashboard: TRUE (預設)
  - timesheet: TRUE (預設)
  - reports: FALSE (預設)
  - tasks: FALSE (預設)

---

## 常用查詢

### 查詢 1：獲取預設模板

```sql
SELECT module_name, is_enabled
FROM ModulePermissions
WHERE user_id IS NULL;
```

---

### 查詢 2：獲取員工的實際權限（合併預設+個別）

```sql
SELECT 
  module_name,
  is_enabled
FROM ModulePermissions
WHERE user_id = ? OR user_id IS NULL
ORDER BY user_id DESC  -- 個別設定優先（非NULL排在前）
LIMIT 1 PER module_name;  -- 每個模塊只取一筆
```

**SQLite 替代寫法（使用子查詢）：**
```sql
SELECT 
  m.module_name,
  COALESCE(
    (SELECT is_enabled FROM ModulePermissions WHERE user_id = ? AND module_name = m.module_name),
    m.is_enabled
  ) AS is_enabled
FROM ModulePermissions m
WHERE m.user_id IS NULL;
```

---

### 查詢 3：檢查員工是否已個別調整

```sql
SELECT EXISTS(
  SELECT 1 FROM ModulePermissions WHERE user_id = ?
) AS is_customized;
```

---

### 查詢 4：獲取所有員工的權限狀態

```sql
SELECT 
  u.user_id,
  u.name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM ModulePermissions WHERE user_id = u.user_id)
    THEN 1 
    ELSE 0 
  END AS is_customized
FROM Users u
WHERE u.role = 'employee'
ORDER BY u.name;
```

---

### 查詢 5：檢查特定模塊的使用情況

```sql
-- 查詢哪些員工有此模塊的個別設定
SELECT u.name, mp.is_enabled
FROM ModulePermissions mp
JOIN Users u ON mp.user_id = u.user_id
WHERE mp.module_name = 'reports';
```

---

### 查詢 6：恢復員工為預設模板

```sql
-- 刪除所有個別設定
DELETE FROM ModulePermissions
WHERE user_id = ?;
```

---

### 查詢 7：同步預設模板到多個員工

```sql
-- 刪除這些員工的所有個別設定
DELETE FROM ModulePermissions
WHERE user_id IN (123, 456, 789);
```

---

## 資料完整性規則

### 1. 唯一性約束

```sql
UNIQUE(user_id, module_name)
```

**說明：** 同一個員工對同一個模塊只能有一筆權限記錄

---

### 2. 外鍵約束

```sql
FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
```

**說明：** 員工刪除時，自動刪除其權限記錄

---

### 3. 模塊名稱驗證（應用層）

**可開放給員工的模塊（14個）：**
```
dashboard, personal_settings, timesheet, reports, life_events,
task_templates, tasks, stage_updates, client_services, booking_records,
sop_management, knowledge_base, service_management, csv_import
```

**管理員專屬模塊（8個，不可出現在此表）：**
```
employee_permissions, business_rules, employee_accounts,
external_articles, external_faq, external_resources,
external_images, booking_settings
```

---

## 關聯資料表

### Users - 使用者資料表

**關係：** ModulePermissions.user_id → Users.user_id (N:1)

**說明：**
- 一個員工可以有多個模塊權限記錄
- 員工刪除時，CASCADE 刪除所有權限記錄

---

## 效能考量

### 快取策略

```typescript
// Redis 快取結構
const cacheKey = `permissions:user:${userId}`;
const cacheTTL = 300; // 5分鐘

// 快取內容：員工的所有權限
{
  "dashboard": true,
  "timesheet": true,
  "reports": false,
  ...
}

// 清除時機：
// 1. 管理員更新該員工權限時
// 2. 管理員更新預設模板並同步該員工時
// 3. 員工刪除時
```

---

### 查詢優化建議

1. **使用索引：** 所有查詢都應使用 `user_id` 或 `module_name` 索引
2. **避免全表掃描：** 不要查詢沒有 WHERE 條件的 ModulePermissions
3. **批次查詢：** 一次查詢獲取員工的所有權限，而非逐個模塊查詢
4. **快取熱資料：** 常用的預設模板和活躍員工權限應快取

---

## 相關文檔

- [功能模塊 - 員工權限設定](../../功能模塊/01-員工權限設定.md)
- [API 概覽 - 員工權限](../../API規格/員工權限/_概覽.md)
- [UI 設計 - 員工權限](../../技術規格/員工權限/UI設計.md)
- [權限驗證邏輯](../../技術規格/員工權限/權限驗證邏輯.md)

---

**最後更新：** 2025年10月27日  
**表格版本：** 1.0



