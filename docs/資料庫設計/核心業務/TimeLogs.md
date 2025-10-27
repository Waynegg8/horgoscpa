# TimeLogs (工時記錄資料庫)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE TimeLogs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id TEXT,
  business_type TEXT,
  work_date TEXT NOT NULL,
  work_type TEXT,
  hours REAL CHECK (hours >= 0 AND hours <= 24),
  weighted_hours REAL,
  leave_type TEXT,
  leave_hours REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `log_id` | INTEGER PK | 工時記錄唯一識別碼 |
| `user_id` | INTEGER FK | 員工 ID |
| `client_id` | TEXT FK | 客戶 ID（可為 NULL） |
| `business_type` | TEXT | 業務類型 |
| `work_date` | TEXT | 工作日期 (YYYY-MM-DD) |
| `work_type` | TEXT | 工時類型（例如：'正常工時', '平日加班(1.34)'） |
| `hours` | REAL | 原始時數 |
| `weighted_hours` | REAL | 加權時數（自動計算） |
| `leave_type` | TEXT | 假別 |
| `leave_hours` | REAL | 請假時數 |

---

## 索引

```sql
CREATE INDEX idx_timelogs_user_date ON TimeLogs(user_id, work_date);
CREATE INDEX idx_timelogs_client ON TimeLogs(client_id);
```

---

## 常用查詢

### 查詢員工某月工時

```sql
SELECT * FROM TimeLogs 
WHERE user_id = ? 
  AND work_date BETWEEN ? AND ? 
  AND is_deleted = 0
ORDER BY work_date;
```

### 計算員工總工時

```sql
SELECT 
  SUM(hours) as total_hours,
  SUM(weighted_hours) as total_weighted_hours
FROM TimeLogs 
WHERE user_id = ? AND work_date BETWEEN ? AND ?
  AND is_deleted = 0;
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [工時表填寫](../../功能模塊/08-工時表填寫.md)
- [工時 API](../../API設計/工時API.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE TimeLogs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id TEXT,
  business_type TEXT,
  work_date TEXT NOT NULL,
  work_type TEXT,
  hours REAL CHECK (hours >= 0 AND hours <= 24),
  weighted_hours REAL,
  leave_type TEXT,
  leave_hours REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `log_id` | INTEGER PK | 工時記錄唯一識別碼 |
| `user_id` | INTEGER FK | 員工 ID |
| `client_id` | TEXT FK | 客戶 ID（可為 NULL） |
| `business_type` | TEXT | 業務類型 |
| `work_date` | TEXT | 工作日期 (YYYY-MM-DD) |
| `work_type` | TEXT | 工時類型（例如：'正常工時', '平日加班(1.34)'） |
| `hours` | REAL | 原始時數 |
| `weighted_hours` | REAL | 加權時數（自動計算） |
| `leave_type` | TEXT | 假別 |
| `leave_hours` | REAL | 請假時數 |

---

## 索引

```sql
CREATE INDEX idx_timelogs_user_date ON TimeLogs(user_id, work_date);
CREATE INDEX idx_timelogs_client ON TimeLogs(client_id);
```

---

## 常用查詢

### 查詢員工某月工時

```sql
SELECT * FROM TimeLogs 
WHERE user_id = ? 
  AND work_date BETWEEN ? AND ? 
  AND is_deleted = 0
ORDER BY work_date;
```

### 計算員工總工時

```sql
SELECT 
  SUM(hours) as total_hours,
  SUM(weighted_hours) as total_weighted_hours
FROM TimeLogs 
WHERE user_id = ? AND work_date BETWEEN ? AND ?
  AND is_deleted = 0;
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [工時表填寫](../../功能模塊/08-工時表填寫.md)
- [工時 API](../../API設計/工時API.md)

---

**最後更新：** 2025年10月27日



