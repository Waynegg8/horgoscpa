# TaskTemplates 資料表

**用途：** 儲存任務流程模板（如記帳標準流程、公司設立流程）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE TaskTemplates (
  task_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                          -- 模板名稱
  service_template_id INTEGER,                 -- 關聯的服務項目
  description TEXT,                            -- 模板說明
  total_days INTEGER,                          -- 總預計天數
  is_active BOOLEAN DEFAULT 1,                 -- 是否啟用
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (service_template_id) REFERENCES Services(service_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `task_template_id` | INTEGER | ✅ | 主鍵（自動遞增）|
| `name` | TEXT | ✅ | 模板名稱（如：記帳標準流程）|
| `service_template_id` | INTEGER | ❌ | 關聯的服務項目ID |
| `description` | TEXT | ❌ | 模板說明 |
| `total_days` | INTEGER | ❌ | 總預計天數（各階段天數總和）|
| `is_active` | BOOLEAN | ❌ | 是否啟用（預設1）|
| `created_by` | INTEGER | ❌ | 創建者ID |
| `created_at` | TEXT | ❌ | 創建時間 |
| `updated_at` | TEXT | ❌ | 更新時間 |
| `is_deleted` | BOOLEAN | ❌ | 軟刪除標記 |
| `deleted_at` | TEXT | ❌ | 刪除時間 |
| `deleted_by` | INTEGER | ❌ | 刪除者ID |

---

## 範例資料

### 記帳標準流程
```sql
INSERT INTO TaskTemplates (
  task_template_id, name, service_template_id,
  description, total_days
) VALUES (
  1, '記帳標準流程（雙月）', 3,
  '雙月記帳服務的標準作業流程', 8
);
```

### 公司設立流程
```sql
INSERT INTO TaskTemplates (
  task_template_id, name, service_template_id,
  description, total_days
) VALUES (
  2, '公司設立流程', 6,
  '新公司設立的完整作業流程', 14
);
```

---

## 索引設計

```sql
-- 加快名稱搜尋
CREATE INDEX idx_task_templates_name ON TaskTemplates(name) WHERE is_deleted = 0;

-- 加快服務項目查詢
CREATE INDEX idx_task_templates_service ON TaskTemplates(service_template_id) 
WHERE is_deleted = 0;

-- 加快啟用狀態查詢
CREATE INDEX idx_task_templates_active ON TaskTemplates(is_active) 
WHERE is_deleted = 0 AND is_active = 1;
```

---

## 查詢範例

### 查詢所有啟用的模板
```sql
SELECT 
  tt.*,
  s.service_name,
  COUNT(tst.stage_template_id) as stage_count
FROM TaskTemplates tt
LEFT JOIN Services s ON tt.service_template_id = s.service_id
LEFT JOIN TaskStageTemplates tst ON tt.task_template_id = tst.task_template_id
WHERE tt.is_deleted = 0 AND tt.is_active = 1
GROUP BY tt.task_template_id
ORDER BY tt.name;
```

### 查詢模板及其階段
```sql
SELECT 
  tt.task_template_id,
  tt.name as template_name,
  tst.stage_template_id,
  tst.stage_name,
  tst.stage_order,
  tst.estimated_days
FROM TaskTemplates tt
LEFT JOIN TaskStageTemplates tst ON tt.task_template_id = tst.task_template_id
WHERE tt.task_template_id = ?
ORDER BY tst.stage_order;
```

### 計算總預計天數
```sql
SELECT 
  task_template_id,
  SUM(estimated_days) as total_days
FROM TaskStageTemplates
WHERE task_template_id = ?
GROUP BY task_template_id;
```

---

## 關聯資料表

### TaskStageTemplates（任務階段模板）
```sql
CREATE TABLE TaskStageTemplates (
  ...
  task_template_id INTEGER NOT NULL,
  ...
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
);
```

### ClientServices（客戶服務設定）
```sql
CREATE TABLE ClientServices (
  ...
  task_template_id INTEGER,
  ...
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
);
```

### ActiveTasks（任務實例）
```sql
CREATE TABLE ActiveTasks (
  ...
  task_template_id INTEGER,
  ...
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
);
```

---

## 業務規則

### 刪除規則
1. **軟刪除**：設定 `is_deleted = 1`
2. **檢查依賴**：
   - 若有客戶服務使用此模板 → 禁止刪除
   - 若有進行中的任務使用此模板 → 禁止刪除
3. **級聯處理**：刪除模板時同時軟刪除所有階段模板

### 唯一性規則
- 模板名稱不要求全局唯一（可以有多個版本）
- 建議命名包含版本或適用範圍（如：記帳標準流程 v2.0）

### 驗證規則
- `name`: 1-100 字元
- `total_days`: 必須等於所有階段的 `estimated_days` 總和

---

## 觸發器（自動更新總天數）

```sql
CREATE TRIGGER update_task_template_total_days
AFTER INSERT ON TaskStageTemplates
BEGIN
  UPDATE TaskTemplates
  SET total_days = (
    SELECT SUM(estimated_days)
    FROM TaskStageTemplates
    WHERE task_template_id = NEW.task_template_id
  )
  WHERE task_template_id = NEW.task_template_id;
END;

CREATE TRIGGER update_task_template_total_days_on_update
AFTER UPDATE ON TaskStageTemplates
BEGIN
  UPDATE TaskTemplates
  SET total_days = (
    SELECT SUM(estimated_days)
    FROM TaskStageTemplates
    WHERE task_template_id = NEW.task_template_id
  )
  WHERE task_template_id = NEW.task_template_id;
END;

CREATE TRIGGER update_task_template_total_days_on_delete
AFTER DELETE ON TaskStageTemplates
BEGIN
  UPDATE TaskTemplates
  SET total_days = (
    SELECT SUM(estimated_days)
    FROM TaskStageTemplates
    WHERE task_template_id = OLD.task_template_id
  )
  WHERE task_template_id = OLD.task_template_id;
END;
```

---

## 相關文檔

- [功能模塊 - 任務模板管理](../../功能模塊/14-任務模板管理.md)
- [API規格 - 任務模板](../../API規格/任務管理/_概覽.md)
- [TaskStageTemplates 資料表](./TaskStageTemplates.md)
- [ActiveTasks 資料表](./ActiveTasks.md)





