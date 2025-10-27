# CompensatoryLeaveBalance - 補休餘額

**用途：** 快速查詢員工當月補休餘額  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveBalance (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,              -- 格式：2025-10
  earned_hours REAL DEFAULT 0,           -- 本月累積補休時數
  used_hours REAL DEFAULT 0,             -- 本月已使用時數
  expired_hours REAL DEFAULT 0,          -- 月底清零轉為加班費的時數
  current_balance REAL DEFAULT 0,        -- 當前餘額
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `balance_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NOT NULL, 外鍵關聯 Users |
| `year_month` | TEXT | 年月 | NOT NULL, 格式：2025-10 |
| `earned_hours` | REAL | 本月累積時數 | DEFAULT 0 |
| `used_hours` | REAL | 本月使用時數 | DEFAULT 0 |
| `expired_hours` | REAL | 月底清零時數 | DEFAULT 0 |
| `current_balance` | REAL | 當前餘額 | DEFAULT 0, earned - used |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢員工當月餘額（最常用）
CREATE INDEX idx_comp_leave_balance_user_month 
ON CompensatoryLeaveBalance(user_id, year_month);

-- 查詢特定月份所有員工餘額（月底結算用）
CREATE INDEX idx_comp_leave_balance_month 
ON CompensatoryLeaveBalance(year_month);
```

---

## 範例資料

```sql
INSERT INTO CompensatoryLeaveBalance (user_id, year_month, earned_hours, used_hours, expired_hours, current_balance) VALUES
-- 員工 ID=1，2025年10月
(1, '2025-10', 10.0, 2.0, 0.0, 8.0),

-- 員工 ID=1，2025年9月（已結算）
(1, '2025-09', 6.0, 3.0, 3.0, 0.0),

-- 員工 ID=2，2025年10月
(2, '2025-10', 4.0, 0.0, 0.0, 4.0);
```

---

## 常用查詢

### 查詢 1：獲取員工當月補休餘額

```sql
SELECT 
  balance_id,
  earned_hours,
  used_hours,
  current_balance
FROM CompensatoryLeaveBalance
WHERE user_id = ? AND year_month = ?;
```

---

### 查詢 2：新增或更新補休餘額（累積補休時）

```sql
INSERT INTO CompensatoryLeaveBalance (user_id, year_month, earned_hours, current_balance, updated_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id, year_month)
DO UPDATE SET 
  earned_hours = earned_hours + ?,
  current_balance = current_balance + ?,
  updated_at = CURRENT_TIMESTAMP;
```

---

### 查詢 3：更新使用時數（使用補休時）

```sql
UPDATE CompensatoryLeaveBalance
SET 
  used_hours = used_hours + ?,
  current_balance = current_balance - ?,
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = ? AND year_month = ?;
```

---

### 查詢 4：月底結算（清零餘額）

```sql
UPDATE CompensatoryLeaveBalance
SET 
  expired_hours = current_balance,
  current_balance = 0,
  updated_at = CURRENT_TIMESTAMP
WHERE year_month = ? AND current_balance > 0;
```

---

### 查詢 5：獲取所有有餘額的員工（月底結算用）

```sql
SELECT 
  b.user_id,
  u.name,
  b.current_balance
FROM CompensatoryLeaveBalance b
JOIN Users u ON b.user_id = u.user_id
WHERE b.year_month = ? 
  AND b.current_balance > 0;
```

---

## 資料完整性規則

### 1. 唯一性約束

```sql
UNIQUE(user_id, year_month)
```

**說明：** 同一個員工的同一個月份只能有一筆餘額記錄

---

### 2. 餘額計算規則（應用層）

```typescript
current_balance = earned_hours - used_hours
```

**說明：** 每次異動後都應重新計算並更新

---

### 3. 月底清零規則

- 每月最後一天執行自動任務
- `expired_hours = current_balance`
- `current_balance = 0`

---

## 關聯資料表

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** 1:N (一個餘額記錄對應多筆異動)

**說明：** 
- 此表是彙總表，用於快速查詢
- 詳細明細在 CompensatoryLeaveTransactions 表

### Users - 使用者資料表

**關係：** N:1

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveTransactions](./CompensatoryLeaveTransactions.md)
- [CompensatoryLeaveUsage](./CompensatoryLeaveUsage.md)

---

**最後更新：** 2025年10月27日



**用途：** 快速查詢員工當月補休餘額  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveBalance (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,              -- 格式：2025-10
  earned_hours REAL DEFAULT 0,           -- 本月累積補休時數
  used_hours REAL DEFAULT 0,             -- 本月已使用時數
  expired_hours REAL DEFAULT 0,          -- 月底清零轉為加班費的時數
  current_balance REAL DEFAULT 0,        -- 當前餘額
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `balance_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `user_id` | INTEGER | 員工 ID | NOT NULL, 外鍵關聯 Users |
| `year_month` | TEXT | 年月 | NOT NULL, 格式：2025-10 |
| `earned_hours` | REAL | 本月累積時數 | DEFAULT 0 |
| `used_hours` | REAL | 本月使用時數 | DEFAULT 0 |
| `expired_hours` | REAL | 月底清零時數 | DEFAULT 0 |
| `current_balance` | REAL | 當前餘額 | DEFAULT 0, earned - used |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢員工當月餘額（最常用）
CREATE INDEX idx_comp_leave_balance_user_month 
ON CompensatoryLeaveBalance(user_id, year_month);

-- 查詢特定月份所有員工餘額（月底結算用）
CREATE INDEX idx_comp_leave_balance_month 
ON CompensatoryLeaveBalance(year_month);
```

---

## 範例資料

```sql
INSERT INTO CompensatoryLeaveBalance (user_id, year_month, earned_hours, used_hours, expired_hours, current_balance) VALUES
-- 員工 ID=1，2025年10月
(1, '2025-10', 10.0, 2.0, 0.0, 8.0),

-- 員工 ID=1，2025年9月（已結算）
(1, '2025-09', 6.0, 3.0, 3.0, 0.0),

-- 員工 ID=2，2025年10月
(2, '2025-10', 4.0, 0.0, 0.0, 4.0);
```

---

## 常用查詢

### 查詢 1：獲取員工當月補休餘額

```sql
SELECT 
  balance_id,
  earned_hours,
  used_hours,
  current_balance
FROM CompensatoryLeaveBalance
WHERE user_id = ? AND year_month = ?;
```

---

### 查詢 2：新增或更新補休餘額（累積補休時）

```sql
INSERT INTO CompensatoryLeaveBalance (user_id, year_month, earned_hours, current_balance, updated_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id, year_month)
DO UPDATE SET 
  earned_hours = earned_hours + ?,
  current_balance = current_balance + ?,
  updated_at = CURRENT_TIMESTAMP;
```

---

### 查詢 3：更新使用時數（使用補休時）

```sql
UPDATE CompensatoryLeaveBalance
SET 
  used_hours = used_hours + ?,
  current_balance = current_balance - ?,
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = ? AND year_month = ?;
```

---

### 查詢 4：月底結算（清零餘額）

```sql
UPDATE CompensatoryLeaveBalance
SET 
  expired_hours = current_balance,
  current_balance = 0,
  updated_at = CURRENT_TIMESTAMP
WHERE year_month = ? AND current_balance > 0;
```

---

### 查詢 5：獲取所有有餘額的員工（月底結算用）

```sql
SELECT 
  b.user_id,
  u.name,
  b.current_balance
FROM CompensatoryLeaveBalance b
JOIN Users u ON b.user_id = u.user_id
WHERE b.year_month = ? 
  AND b.current_balance > 0;
```

---

## 資料完整性規則

### 1. 唯一性約束

```sql
UNIQUE(user_id, year_month)
```

**說明：** 同一個員工的同一個月份只能有一筆餘額記錄

---

### 2. 餘額計算規則（應用層）

```typescript
current_balance = earned_hours - used_hours
```

**說明：** 每次異動後都應重新計算並更新

---

### 3. 月底清零規則

- 每月最後一天執行自動任務
- `expired_hours = current_balance`
- `current_balance = 0`

---

## 關聯資料表

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** 1:N (一個餘額記錄對應多筆異動)

**說明：** 
- 此表是彙總表，用於快速查詢
- 詳細明細在 CompensatoryLeaveTransactions 表

### Users - 使用者資料表

**關係：** N:1

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveTransactions](./CompensatoryLeaveTransactions.md)
- [CompensatoryLeaveUsage](./CompensatoryLeaveUsage.md)

---

**最後更新：** 2025年10月27日



