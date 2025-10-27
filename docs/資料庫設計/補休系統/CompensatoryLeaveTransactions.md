# CompensatoryLeaveTransactions - 補休異動明細

**用途：** 記錄所有補休的累積、使用、清零  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveTransactions (
  transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('earn', 'use', 'expire')),
  hours REAL NOT NULL,                   -- 補休時數（實際）
  original_work_day_type TEXT,           -- 原始加班類型（weekday/rest_day/national_holiday/holiday）
  original_overtime_rate REAL,           -- 原始費率（月底結算用）
  year_month TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  related_timelog_id INTEGER,            -- 關聯的工時記錄
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (related_timelog_id) REFERENCES TimeLogs(log_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `transaction_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NOT NULL, 外鍵關聯 Users |
| `transaction_type` | TEXT | 異動類型 | CHECK (earn/use/expire) |
| `hours` | REAL | 補休時數 | NOT NULL |
| `original_work_day_type` | TEXT | 原始加班類型 | weekday/rest_day/national_holiday/holiday |
| `original_overtime_rate` | REAL | 原始加班費率 | 用於月底結算 |
| `year_month` | TEXT | 年月 | NOT NULL, 格式：2025-10 |
| `transaction_date` | TEXT | 異動日期 | NOT NULL, 格式：2025-10-15 |
| `related_timelog_id` | INTEGER | 關聯工時記錄 | 外鍵關聯 TimeLogs |
| `notes` | TEXT | 備註 | 可選 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 異動類型說明

| 類型 | 說明 | 何時產生 |
|------|------|---------|
| `earn` | 累積補休 | 員工填寫加班工時，系統自動產生 |
| `use` | 使用補休 | 員工在工時表選擇「補休」請假 |
| `expire` | 到期清零 | 月底自動任務，未使用的補休轉加班費 |

---

## 索引

```sql
-- 查詢員工的異動明細
CREATE INDEX idx_comp_leave_trans_user 
ON CompensatoryLeaveTransactions(user_id, year_month);

-- FIFO 查找可扣除的累積記錄
CREATE INDEX idx_comp_leave_trans_earn 
ON CompensatoryLeaveTransactions(user_id, transaction_type, created_at)
WHERE transaction_type = 'earn';

-- 關聯工時記錄
CREATE INDEX idx_comp_leave_trans_timelog 
ON CompensatoryLeaveTransactions(related_timelog_id);
```

---

## 範例資料

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, original_work_day_type, original_overtime_rate, 
  year_month, transaction_date, related_timelog_id, notes
) VALUES
-- 累積補休
(1, 'earn', 2.0, 'weekday', 1.34, '2025-10', '2025-10-01', 1001, '平日加班2H'),
(1, 'earn', 3.0, 'rest_day', 1.67, '2025-10', '2025-10-05', 1002, '休息日加班3H'),
(1, 'earn', 2.0, 'weekday', 1.34, '2025-10', '2025-10-10', 1003, '平日加班2H'),

-- 使用補休
(1, 'use', 4.0, NULL, NULL, '2025-10', '2025-10-15', 1004, '使用補休4H'),

-- 月底清零
(1, 'expire', 3.0, NULL, NULL, '2025-09', '2025-09-30', NULL, '月底未使用轉加班費');
```

---

## 常用查詢

### 查詢 1：FIFO 查找可扣除的累積記錄

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours,
  t.original_work_day_type,
  t.original_overtime_rate
FROM CompensatoryLeaveTransactions t
LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
WHERE t.user_id = ?
  AND t.year_month = ?
  AND t.transaction_type = 'earn'
GROUP BY t.transaction_id
HAVING remaining_hours > 0
ORDER BY t.created_at ASC;
```

---

### 查詢 2：新增累積記錄

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, original_work_day_type, original_overtime_rate,
  year_month, transaction_date, related_timelog_id, notes
) VALUES (?, 'earn', ?, ?, ?, ?, ?, ?, ?);
```

---

### 查詢 3：新增使用記錄

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, year_month, transaction_date, related_timelog_id, notes
) VALUES (?, 'use', ?, ?, ?, ?, ?);
```

---

### 查詢 4：月底結算 - 查找未使用的補休

```sql
-- 與查詢1相同，用於計算月底結算的加班費
```

---

### 查詢 5：獲取員工的異動明細（含類型標籤）

```sql
SELECT 
  transaction_id,
  transaction_type,
  hours,
  transaction_date,
  CASE transaction_type
    WHEN 'earn' THEN '+ ' || hours || 'H (' || original_work_day_type || ')'
    WHEN 'use' THEN '- ' || hours || 'H (使用)'
    WHEN 'expire' THEN '- ' || hours || 'H (到期)'
  END AS display_text
FROM CompensatoryLeaveTransactions
WHERE user_id = ? AND year_month = ?
ORDER BY transaction_date DESC, created_at DESC;
```

---

## 資料完整性規則

### 1. 異動類型約束

```sql
CHECK (transaction_type IN ('earn', 'use', 'expire'))
```

---

### 2. 累積記錄必須有費率資訊

**應用層規則：**
```typescript
if (transaction_type === 'earn') {
  // 必須提供這些欄位
  assert(original_work_day_type !== null);
  assert(original_overtime_rate !== null);
}
```

---

### 3. 使用/到期記錄不需要費率資訊

```typescript
if (transaction_type === 'use' || transaction_type === 'expire') {
  original_work_day_type = null;
  original_overtime_rate = null;
}
```

---

## 關聯資料表

### CompensatoryLeaveBalance - 補休餘額

**關係：** N:1

**說明：** 多筆異動記錄彙總到一筆餘額

---

### CompensatoryLeaveUsage - 補休使用明細

**關係：** 1:N

**說明：** 一筆「使用」記錄對應多筆使用明細（FIFO扣除）

---

### TimeLogs - 工時記錄

**關係：** N:1

**說明：** 異動記錄關聯到具體的工時記錄

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveBalance](./CompensatoryLeaveBalance.md)
- [CompensatoryLeaveUsage](./CompensatoryLeaveUsage.md)

---

**最後更新：** 2025年10月27日



**用途：** 記錄所有補休的累積、使用、清零  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveTransactions (
  transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('earn', 'use', 'expire')),
  hours REAL NOT NULL,                   -- 補休時數（實際）
  original_work_day_type TEXT,           -- 原始加班類型（weekday/rest_day/national_holiday/holiday）
  original_overtime_rate REAL,           -- 原始費率（月底結算用）
  year_month TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  related_timelog_id INTEGER,            -- 關聯的工時記錄
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (related_timelog_id) REFERENCES TimeLogs(log_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `transaction_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NOT NULL, 外鍵關聯 Users |
| `transaction_type` | TEXT | 異動類型 | CHECK (earn/use/expire) |
| `hours` | REAL | 補休時數 | NOT NULL |
| `original_work_day_type` | TEXT | 原始加班類型 | weekday/rest_day/national_holiday/holiday |
| `original_overtime_rate` | REAL | 原始加班費率 | 用於月底結算 |
| `year_month` | TEXT | 年月 | NOT NULL, 格式：2025-10 |
| `transaction_date` | TEXT | 異動日期 | NOT NULL, 格式：2025-10-15 |
| `related_timelog_id` | INTEGER | 關聯工時記錄 | 外鍵關聯 TimeLogs |
| `notes` | TEXT | 備註 | 可選 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 異動類型說明

| 類型 | 說明 | 何時產生 |
|------|------|---------|
| `earn` | 累積補休 | 員工填寫加班工時，系統自動產生 |
| `use` | 使用補休 | 員工在工時表選擇「補休」請假 |
| `expire` | 到期清零 | 月底自動任務，未使用的補休轉加班費 |

---

## 索引

```sql
-- 查詢員工的異動明細
CREATE INDEX idx_comp_leave_trans_user 
ON CompensatoryLeaveTransactions(user_id, year_month);

-- FIFO 查找可扣除的累積記錄
CREATE INDEX idx_comp_leave_trans_earn 
ON CompensatoryLeaveTransactions(user_id, transaction_type, created_at)
WHERE transaction_type = 'earn';

-- 關聯工時記錄
CREATE INDEX idx_comp_leave_trans_timelog 
ON CompensatoryLeaveTransactions(related_timelog_id);
```

---

## 範例資料

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, original_work_day_type, original_overtime_rate, 
  year_month, transaction_date, related_timelog_id, notes
) VALUES
-- 累積補休
(1, 'earn', 2.0, 'weekday', 1.34, '2025-10', '2025-10-01', 1001, '平日加班2H'),
(1, 'earn', 3.0, 'rest_day', 1.67, '2025-10', '2025-10-05', 1002, '休息日加班3H'),
(1, 'earn', 2.0, 'weekday', 1.34, '2025-10', '2025-10-10', 1003, '平日加班2H'),

-- 使用補休
(1, 'use', 4.0, NULL, NULL, '2025-10', '2025-10-15', 1004, '使用補休4H'),

-- 月底清零
(1, 'expire', 3.0, NULL, NULL, '2025-09', '2025-09-30', NULL, '月底未使用轉加班費');
```

---

## 常用查詢

### 查詢 1：FIFO 查找可扣除的累積記錄

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours,
  t.original_work_day_type,
  t.original_overtime_rate
FROM CompensatoryLeaveTransactions t
LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
WHERE t.user_id = ?
  AND t.year_month = ?
  AND t.transaction_type = 'earn'
GROUP BY t.transaction_id
HAVING remaining_hours > 0
ORDER BY t.created_at ASC;
```

---

### 查詢 2：新增累積記錄

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, original_work_day_type, original_overtime_rate,
  year_month, transaction_date, related_timelog_id, notes
) VALUES (?, 'earn', ?, ?, ?, ?, ?, ?, ?);
```

---

### 查詢 3：新增使用記錄

```sql
INSERT INTO CompensatoryLeaveTransactions (
  user_id, transaction_type, hours, year_month, transaction_date, related_timelog_id, notes
) VALUES (?, 'use', ?, ?, ?, ?, ?);
```

---

### 查詢 4：月底結算 - 查找未使用的補休

```sql
-- 與查詢1相同，用於計算月底結算的加班費
```

---

### 查詢 5：獲取員工的異動明細（含類型標籤）

```sql
SELECT 
  transaction_id,
  transaction_type,
  hours,
  transaction_date,
  CASE transaction_type
    WHEN 'earn' THEN '+ ' || hours || 'H (' || original_work_day_type || ')'
    WHEN 'use' THEN '- ' || hours || 'H (使用)'
    WHEN 'expire' THEN '- ' || hours || 'H (到期)'
  END AS display_text
FROM CompensatoryLeaveTransactions
WHERE user_id = ? AND year_month = ?
ORDER BY transaction_date DESC, created_at DESC;
```

---

## 資料完整性規則

### 1. 異動類型約束

```sql
CHECK (transaction_type IN ('earn', 'use', 'expire'))
```

---

### 2. 累積記錄必須有費率資訊

**應用層規則：**
```typescript
if (transaction_type === 'earn') {
  // 必須提供這些欄位
  assert(original_work_day_type !== null);
  assert(original_overtime_rate !== null);
}
```

---

### 3. 使用/到期記錄不需要費率資訊

```typescript
if (transaction_type === 'use' || transaction_type === 'expire') {
  original_work_day_type = null;
  original_overtime_rate = null;
}
```

---

## 關聯資料表

### CompensatoryLeaveBalance - 補休餘額

**關係：** N:1

**說明：** 多筆異動記錄彙總到一筆餘額

---

### CompensatoryLeaveUsage - 補休使用明細

**關係：** 1:N

**說明：** 一筆「使用」記錄對應多筆使用明細（FIFO扣除）

---

### TimeLogs - 工時記錄

**關係：** N:1

**說明：** 異動記錄關聯到具體的工時記錄

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveBalance](./CompensatoryLeaveBalance.md)
- [CompensatoryLeaveUsage](./CompensatoryLeaveUsage.md)

---

**最後更新：** 2025年10月27日



