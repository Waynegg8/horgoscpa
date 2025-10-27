# Services 資料表

**用途：** 儲存事務所提供的服務項目（兩層結構：主項目 + 子項目）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE Services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_service_id INTEGER,                   -- 父項目ID（NULL = 主項目）
  service_name TEXT NOT NULL,                  -- 服務名稱
  description TEXT,                            -- 服務說明
  sort_order INTEGER DEFAULT 0,               -- 排序順序
  is_active BOOLEAN DEFAULT 1,                -- 是否啟用
  created_by INTEGER,                         -- 創建者
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (parent_service_id) REFERENCES Services(service_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `service_id` | INTEGER | ✅ | 主鍵（自動遞增）|
| `parent_service_id` | INTEGER | ❌ | 父項目ID，NULL = 主項目 |
| `service_name` | TEXT | ✅ | 服務名稱（如：記帳服務、收集憑證）|
| `description` | TEXT | ❌ | 服務說明 |
| `sort_order` | INTEGER | ❌ | 排序順序（預設0）|
| `is_active` | BOOLEAN | ❌ | 是否啟用（預設1）|
| `created_by` | INTEGER | ❌ | 創建者ID |
| `created_at` | TEXT | ❌ | 創建時間 |
| `updated_at` | TEXT | ❌ | 更新時間 |
| `is_deleted` | BOOLEAN | ❌ | 軟刪除標記 |
| `deleted_at` | TEXT | ❌ | 刪除時間 |
| `deleted_by` | INTEGER | ❌ | 刪除者ID |

---

## 層級結構

### 兩層設計
```
主項目 (parent_service_id = NULL)
  └── 子項目 (parent_service_id = 主項目ID)
```

### 範例資料
```sql
-- 主項目
INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (1, NULL, '記帳服務');

INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (2, NULL, '工商登記服務');

-- 子項目
INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (3, 1, '收集憑證');

INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (4, 1, '整理傳票');

INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (5, 1, '結帳報表');

INSERT INTO Services (service_id, parent_service_id, service_name) 
VALUES (6, 2, '公司設立');
```

---

## 索引設計

```sql
-- 加快父子查詢
CREATE INDEX idx_services_parent ON Services(parent_service_id) WHERE is_deleted = 0;

-- 加快名稱搜尋
CREATE INDEX idx_services_name ON Services(service_name) WHERE is_deleted = 0;

-- 加快排序查詢
CREATE INDEX idx_services_sort ON Services(parent_service_id, sort_order) WHERE is_deleted = 0;
```

---

## 查詢範例

### 查詢所有主項目
```sql
SELECT * FROM Services 
WHERE parent_service_id IS NULL 
  AND is_deleted = 0
ORDER BY sort_order, service_name;
```

### 查詢特定主項目的子項目
```sql
SELECT * FROM Services 
WHERE parent_service_id = ? 
  AND is_deleted = 0
ORDER BY sort_order, service_name;
```

### 查詢完整層級（主項目 + 子項目）
```sql
SELECT 
  s1.service_id AS main_id,
  s1.service_name AS main_name,
  s2.service_id AS sub_id,
  s2.service_name AS sub_name
FROM Services s1
LEFT JOIN Services s2 ON s2.parent_service_id = s1.service_id AND s2.is_deleted = 0
WHERE s1.parent_service_id IS NULL 
  AND s1.is_deleted = 0
ORDER BY s1.sort_order, s1.service_name, s2.sort_order, s2.service_name;
```

---

## 關聯資料表

### ClientServices（客戶服務設定）
```sql
CREATE TABLE ClientServices (
  ...
  service_id INTEGER NOT NULL,
  ...
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);
```

### TimeLogs（工時記錄）
```sql
CREATE TABLE TimeLogs (
  ...
  service_id INTEGER,
  ...
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);
```

### TaskTemplates（任務模板）
```sql
CREATE TABLE TaskTemplates (
  ...
  service_template_id INTEGER,
  ...
  FOREIGN KEY (service_template_id) REFERENCES Services(service_id)
);
```

---

## 業務規則

### 刪除規則
1. **軟刪除**：設定 `is_deleted = 1`
2. **檢查依賴**：
   - 若有客戶使用此服務 → 禁止刪除
   - 若有工時記錄 → 禁止刪除
   - 若有任務模板關聯 → 禁止刪除
3. **刪除主項目**：同時軟刪除所有子項目

### 唯一性規則
- 同一主項目下的子項目名稱不可重複
- 主項目名稱不可重複

### 驗證規則
- `service_name`: 1-100 字元
- 主項目的 `parent_service_id` 必須為 `NULL`
- 子項目的 `parent_service_id` 必須存在

---

## 相關文檔

- [功能模塊 - 服務項目管理](../../功能模塊/03-服務項目管理.md)
- [API規格 - 服務項目](../../API規格/服務項目/_概覽.md)
- [ClientServices 資料表](../業務服務/ClientServices.md)
- [ServiceTemplates 資料表](../業務服務/ServiceTemplates.md)





