# ModulePermissions（模塊權限表）

**表格類型：** 權限系統  
**最後更新：** 2025年10月27日

---

## 表格概述

控制員工可訪問哪些系統模塊。管理員自動擁有所有權限，不受此表限制。

**特點：**
- `user_id = NULL` 表示預設模板
- `user_id = <特定員工>` 表示個別設定
- 14個可控制的模塊（布林欄位）
- 個別設定覆蓋預設模板

---

## 表格結構

```sql
CREATE TABLE ModulePermissions (
  permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  
  -- 基礎功能
  dashboard BOOLEAN NOT NULL DEFAULT true,
  personal_settings BOOLEAN NOT NULL DEFAULT true,
  timesheet BOOLEAN NOT NULL DEFAULT true,
  
  -- 報表與統計
  reports BOOLEAN NOT NULL DEFAULT false,
  
  -- 假期管理
  life_events BOOLEAN NOT NULL DEFAULT false,
  
  -- 任務管理
  task_templates BOOLEAN NOT NULL DEFAULT false,
  tasks BOOLEAN NOT NULL DEFAULT false,
  stage_updates BOOLEAN NOT NULL DEFAULT false,
  
  -- 客戶管理
  client_services BOOLEAN NOT NULL DEFAULT false,
  booking_records BOOLEAN NOT NULL DEFAULT false,
  
  -- 知識管理
  sop_management BOOLEAN NOT NULL DEFAULT false,
  knowledge_base BOOLEAN NOT NULL DEFAULT false,
  
  -- 系統功能
  service_management BOOLEAN NOT NULL DEFAULT false,
  csv_import BOOLEAN NOT NULL DEFAULT false,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- 索引
CREATE UNIQUE INDEX idx_user_permissions ON ModulePermissions(user_id);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `permission_id` | INTEGER | 是 | AUTO | 權限記錄 ID |
| `user_id` | INTEGER | 否 | NULL | 員工 ID（NULL = 預設模板） |
| `dashboard` | BOOLEAN | 是 | true | 儀表板權限 |
| `personal_settings` | BOOLEAN | 是 | true | 個人資料設定權限 |
| `timesheet` | BOOLEAN | 是 | true | 工時表填寫權限 |
| `reports` | BOOLEAN | 是 | false | 報表中心權限 |
| `life_events` | BOOLEAN | 是 | false | 生活事件登記權限 |
| `task_templates` | BOOLEAN | 是 | false | 任務模板管理權限 |
| `tasks` | BOOLEAN | 是 | false | 任務進度追蹤權限 |
| `stage_updates` | BOOLEAN | 是 | false | 階段進度更新權限 |
| `client_services` | BOOLEAN | 是 | false | 客戶服務設定權限 |
| `booking_records` | BOOLEAN | 是 | false | 預約記錄查看權限 |
| `sop_management` | BOOLEAN | 是 | false | SOP 文件管理權限 |
| `knowledge_base` | BOOLEAN | 是 | false | 通用知識庫權限 |
| `service_management` | BOOLEAN | 是 | false | 服務項目管理權限 |
| `csv_import` | BOOLEAN | 是 | false | CSV 導入功能權限 |
| `created_at` | TEXT | 是 | NOW | 建立時間 |
| `updated_at` | TEXT | 是 | NOW | 更新時間 |

---

## 資料範例

### 預設模板

```sql
INSERT INTO ModulePermissions (
  user_id, dashboard, personal_settings, timesheet, 
  reports, life_events, task_templates, tasks, stage_updates,
  client_services, booking_records, sop_management, 
  knowledge_base, service_management, csv_import
) VALUES (
  NULL, true, true, true,     -- 基礎功能：全開
  false, false, false, false, false,  -- 報表/假期/任務：全關
  false, false, false,        -- 客戶管理：全關
  false, false, false         -- 知識/系統：全關
);
```

**說明：** `user_id = NULL` 表示這是預設模板，新員工自動繼承。

### 個別員工設定

```sql
-- 資深員工（user_id = 3）開放更多權限
INSERT INTO ModulePermissions (
  user_id, dashboard, personal_settings, timesheet,
  reports, life_events, task_templates, tasks, stage_updates,
  client_services, booking_records, sop_management,
  knowledge_base, service_management, csv_import
) VALUES (
  3, true, true, true,        -- 基礎功能：全開
  true, false, true, true, true,     -- 報表/任務：開放
  true, false, true,          -- 客戶管理部分開放
  true, false, false          -- 知識庫開放
);
```

**說明：** 這個設定會覆蓋預設模板，user_id = 3 的員工使用此設定。

---

## 業務邏輯

### 權限查詢邏輯

```typescript
async function getUserPermissions(userId: number, isAdmin: boolean) {
  // 1. 管理員：所有權限自動為 true
  if (isAdmin) {
    return {
      dashboard: true,
      personal_settings: true,
      timesheet: true,
      reports: true,
      life_events: true,
      task_templates: true,
      tasks: true,
      stage_updates: true,
      client_services: true,
      booking_records: true,
      sop_management: true,
      knowledge_base: true,
      service_management: true,
      csv_import: true
    };
  }
  
  // 2. 員工：查詢個別設定
  const userPerm = await db.prepare(
    `SELECT * FROM ModulePermissions WHERE user_id = ?`
  ).bind(userId).first();
  
  if (userPerm) {
    return userPerm;  // 有個別設定
  }
  
  // 3. 無個別設定：使用預設模板
  const defaultPerm = await db.prepare(
    `SELECT * FROM ModulePermissions WHERE user_id IS NULL`
  ).first();
  
  return defaultPerm || getDefaultPermissions();
}
```

### 更新預設模板時的同步邏輯

```typescript
async function updateDefaultTemplate(newPermissions: object, syncUserIds: number[]) {
  // 1. 更新預設模板
  await db.prepare(`
    UPDATE ModulePermissions 
    SET dashboard = ?, personal_settings = ?, timesheet = ?, 
        reports = ?, ... 
    WHERE user_id IS NULL
  `).bind(...Object.values(newPermissions)).run();
  
  // 2. 同步到選定的員工
  for (const userId of syncUserIds) {
    // 刪除該員工的個別設定，使其恢復使用預設模板
    await db.prepare(`DELETE FROM ModulePermissions WHERE user_id = ?`)
      .bind(userId).run();
  }
}
```

---

## 約束條件

### Primary Key
- `permission_id` - 主鍵，自動遞增

### Foreign Key
- `user_id` → `Users(user_id)` ON DELETE CASCADE
  - 員工刪除時，自動刪除其權限設定

### Unique
- `user_id` - 每個員工最多一條權限記錄

### NOT NULL
- 所有模塊欄位必須有明確值（`true` 或 `false`）

---

## 索引設計

### 索引 1：用戶查詢
```sql
CREATE UNIQUE INDEX idx_user_permissions ON ModulePermissions(user_id);
```
**用途：** 快速查詢特定員工的權限設定

**查詢範例：**
```sql
SELECT * FROM ModulePermissions WHERE user_id = 123;  -- 使用索引
SELECT * FROM ModulePermissions WHERE user_id IS NULL;  -- 查詢預設模板
```

---

## 初始化資料

### 系統安裝時執行

```sql
-- 建立預設模板（基礎功能開放）
INSERT INTO ModulePermissions (
  user_id, dashboard, personal_settings, timesheet,
  reports, life_events, task_templates, tasks, stage_updates,
  client_services, booking_records, sop_management,
  knowledge_base, service_management, csv_import
) VALUES (
  NULL, true, true, true,
  false, false, false, false, false,
  false, false, false,
  false, false, false
);
```

---

## 相關文檔

- [功能模塊：員工權限設定](../../功能模塊/01-員工權限設定.md)
- [技術規格：員工權限](../../技術規格/員工權限/)
- [API規格：員工權限](../../API規格/員工權限/)
- [權限系統設計](../../權限系統設計.md)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 2.0（模塊化重組版）

