# CompensatoryLeaveUsage - 補休使用明細（FIFO追蹤）

**用途：** 追蹤每次使用補休時從哪些累積記錄扣除（FIFO機制）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveUsage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  earn_transaction_id INTEGER NOT NULL,   -- 對應哪筆「累積」
  use_transaction_id INTEGER NOT NULL,    -- 對應哪筆「使用」
  used_hours REAL NOT NULL,               -- 從該累積記錄扣除了多少時數
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (earn_transaction_id) REFERENCES CompensatoryLeaveTransactions(transaction_id),
  FOREIGN KEY (use_transaction_id) REFERENCES CompensatoryLeaveTransactions(transaction_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `usage_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `earn_transaction_id` | INTEGER | 累積記錄 ID | NOT NULL, 外鍵關聯 CompensatoryLeaveTransactions |
| `use_transaction_id` | INTEGER | 使用記錄 ID | NOT NULL, 外鍵關聯 CompensatoryLeaveTransactions |
| `used_hours` | REAL | 扣除時數 | NOT NULL |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢某筆累積記錄的使用情況
CREATE INDEX idx_comp_leave_usage_earn 
ON CompensatoryLeaveUsage(earn_transaction_id);

-- 查詢某筆使用記錄的明細
CREATE INDEX idx_comp_leave_usage_use 
ON CompensatoryLeaveUsage(use_transaction_id);
```

---

## 設計說明

### FIFO 機制實現

當員工使用補休時，系統需要記錄從哪些累積記錄扣除：

```
員工申請使用 4H 補休
↓
找到最早的累積記錄：
  1. 2025/10/01 累積 2H（剩餘2H）→ 扣除 2H
  2. 2025/10/05 累積 3H（剩餘3H）→ 扣除 2H
↓
寫入 2 筆使用明細：
  - usage_id=1: earn_transaction_id=1, use_transaction_id=999, used_hours=2.0
  - usage_id=2: earn_transaction_id=2, use_transaction_id=999, used_hours=2.0
```

---

## 範例資料

### 情境說明

**累積記錄：**
- ID=100: 2025/10/01 累積 2H (平日, 1.34倍)
- ID=101: 2025/10/05 累積 3H (休息日, 1.67倍)
- ID=102: 2025/10/10 累積 2H (平日, 1.34倍)

**使用記錄：**
- ID=200: 2025/10/15 使用 4H

**使用明細：**
```sql
INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours) VALUES
-- 從 ID=100 累積記錄扣除 2H
(100, 200, 2.0),

-- 從 ID=101 累積記錄扣除 2H
(101, 200, 2.0);
```

**結果：**
- 累積記錄 ID=100: 已全部使用 (2/2H)
- 累積記錄 ID=101: 已使用 2H，剩餘 1H (2/3H)
- 累積記錄 ID=102: 未使用，剩餘 2H (0/2H)

---

## 常用查詢

### 查詢 1：計算某筆累積記錄的剩餘時數

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
FROM CompensatoryLeaveTransactions t
LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
WHERE t.transaction_id = ?
GROUP BY t.transaction_id;
```

---

### 查詢 2：FIFO 查找可扣除的累積記錄（含剩餘時數）

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
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

### 查詢 3：新增使用明細

```sql
INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours)
VALUES (?, ?, ?);
```

---

### 查詢 4：獲取某次使用的明細

```sql
SELECT 
  u.usage_id,
  u.used_hours,
  e.transaction_date AS earn_date,
  e.original_work_day_type,
  e.original_overtime_rate
FROM CompensatoryLeaveUsage u
JOIN CompensatoryLeaveTransactions e ON u.earn_transaction_id = e.transaction_id
WHERE u.use_transaction_id = ?
ORDER BY u.usage_id;
```

**範例結果：**
```
usage_id | used_hours | earn_date  | work_day_type | overtime_rate
---------|------------|------------|---------------|---------------
1        | 2.0        | 2025-10-01 | weekday       | 1.34
2        | 2.0        | 2025-10-05 | rest_day      | 1.67
```

---

## 資料完整性規則

### 1. 使用時數不可超過累積記錄剩餘時數

**應用層規則：**
```typescript
const remaining = earnRecord.hours - earnRecord.used_hours;
assert(usedHours <= remaining);
```

---

### 2. 一筆使用記錄可對應多筆使用明細

```typescript
// 員工使用 4H，可能從 2-3 筆累積記錄扣除
```

---

### 3. 累積記錄的已使用時數總和

```sql
SELECT SUM(used_hours) 
FROM CompensatoryLeaveUsage 
WHERE earn_transaction_id = ?;

-- 不可超過累積記錄的總時數
```

---

## 關聯資料表

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** N:1 (多筆使用明細對應一筆累積記錄)

**說明：**
- `earn_transaction_id` 關聯累積記錄
- `use_transaction_id` 關聯使用記錄

---

## 實作範例

### TypeScript 實作 FIFO 扣除邏輯

```typescript
async function deductCompensatoryLeave(
  userId: number,
  yearMonth: string,
  requestedHours: number,
  useTransactionId: number
) {
  // 1. 查找可扣除的累積記錄（FIFO順序）
  const earnRecords = await db.all(`
    SELECT 
      t.transaction_id,
      t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
    FROM CompensatoryLeaveTransactions t
    LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
    WHERE t.user_id = ? AND t.year_month = ? AND t.transaction_type = 'earn'
    GROUP BY t.transaction_id
    HAVING remaining_hours > 0
    ORDER BY t.created_at ASC
  `, [userId, yearMonth]);
  
  // 2. 依序扣除
  let remainingToDeduct = requestedHours;
  
  for (const record of earnRecords) {
    if (remainingToDeduct <= 0) break;
    
    const deductAmount = Math.min(remainingToDeduct, record.remaining_hours);
    
    // 3. 記錄使用明細
    await db.run(`
      INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours)
      VALUES (?, ?, ?)
    `, [record.transaction_id, useTransactionId, deductAmount]);
    
    remainingToDeduct -= deductAmount;
  }
  
  if (remainingToDeduct > 0) {
    throw new Error('INSUFFICIENT_COMPENSATORY_LEAVE');
  }
}
```

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveBalance](./CompensatoryLeaveBalance.md)
- [CompensatoryLeaveTransactions](./CompensatoryLeaveTransactions.md)

---

**最後更新：** 2025年10月27日



**用途：** 追蹤每次使用補休時從哪些累積記錄扣除（FIFO機制）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE CompensatoryLeaveUsage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  earn_transaction_id INTEGER NOT NULL,   -- 對應哪筆「累積」
  use_transaction_id INTEGER NOT NULL,    -- 對應哪筆「使用」
  used_hours REAL NOT NULL,               -- 從該累積記錄扣除了多少時數
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (earn_transaction_id) REFERENCES CompensatoryLeaveTransactions(transaction_id),
  FOREIGN KEY (use_transaction_id) REFERENCES CompensatoryLeaveTransactions(transaction_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `usage_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `earn_transaction_id` | INTEGER | 累積記錄 ID | NOT NULL, 外鍵關聯 CompensatoryLeaveTransactions |
| `use_transaction_id` | INTEGER | 使用記錄 ID | NOT NULL, 外鍵關聯 CompensatoryLeaveTransactions |
| `used_hours` | REAL | 扣除時數 | NOT NULL |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 查詢某筆累積記錄的使用情況
CREATE INDEX idx_comp_leave_usage_earn 
ON CompensatoryLeaveUsage(earn_transaction_id);

-- 查詢某筆使用記錄的明細
CREATE INDEX idx_comp_leave_usage_use 
ON CompensatoryLeaveUsage(use_transaction_id);
```

---

## 設計說明

### FIFO 機制實現

當員工使用補休時，系統需要記錄從哪些累積記錄扣除：

```
員工申請使用 4H 補休
↓
找到最早的累積記錄：
  1. 2025/10/01 累積 2H（剩餘2H）→ 扣除 2H
  2. 2025/10/05 累積 3H（剩餘3H）→ 扣除 2H
↓
寫入 2 筆使用明細：
  - usage_id=1: earn_transaction_id=1, use_transaction_id=999, used_hours=2.0
  - usage_id=2: earn_transaction_id=2, use_transaction_id=999, used_hours=2.0
```

---

## 範例資料

### 情境說明

**累積記錄：**
- ID=100: 2025/10/01 累積 2H (平日, 1.34倍)
- ID=101: 2025/10/05 累積 3H (休息日, 1.67倍)
- ID=102: 2025/10/10 累積 2H (平日, 1.34倍)

**使用記錄：**
- ID=200: 2025/10/15 使用 4H

**使用明細：**
```sql
INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours) VALUES
-- 從 ID=100 累積記錄扣除 2H
(100, 200, 2.0),

-- 從 ID=101 累積記錄扣除 2H
(101, 200, 2.0);
```

**結果：**
- 累積記錄 ID=100: 已全部使用 (2/2H)
- 累積記錄 ID=101: 已使用 2H，剩餘 1H (2/3H)
- 累積記錄 ID=102: 未使用，剩餘 2H (0/2H)

---

## 常用查詢

### 查詢 1：計算某筆累積記錄的剩餘時數

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
FROM CompensatoryLeaveTransactions t
LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
WHERE t.transaction_id = ?
GROUP BY t.transaction_id;
```

---

### 查詢 2：FIFO 查找可扣除的累積記錄（含剩餘時數）

```sql
SELECT 
  t.transaction_id,
  t.hours AS total_hours,
  COALESCE(SUM(u.used_hours), 0) AS used_hours,
  t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
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

### 查詢 3：新增使用明細

```sql
INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours)
VALUES (?, ?, ?);
```

---

### 查詢 4：獲取某次使用的明細

```sql
SELECT 
  u.usage_id,
  u.used_hours,
  e.transaction_date AS earn_date,
  e.original_work_day_type,
  e.original_overtime_rate
FROM CompensatoryLeaveUsage u
JOIN CompensatoryLeaveTransactions e ON u.earn_transaction_id = e.transaction_id
WHERE u.use_transaction_id = ?
ORDER BY u.usage_id;
```

**範例結果：**
```
usage_id | used_hours | earn_date  | work_day_type | overtime_rate
---------|------------|------------|---------------|---------------
1        | 2.0        | 2025-10-01 | weekday       | 1.34
2        | 2.0        | 2025-10-05 | rest_day      | 1.67
```

---

## 資料完整性規則

### 1. 使用時數不可超過累積記錄剩餘時數

**應用層規則：**
```typescript
const remaining = earnRecord.hours - earnRecord.used_hours;
assert(usedHours <= remaining);
```

---

### 2. 一筆使用記錄可對應多筆使用明細

```typescript
// 員工使用 4H，可能從 2-3 筆累積記錄扣除
```

---

### 3. 累積記錄的已使用時數總和

```sql
SELECT SUM(used_hours) 
FROM CompensatoryLeaveUsage 
WHERE earn_transaction_id = ?;

-- 不可超過累積記錄的總時數
```

---

## 關聯資料表

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** N:1 (多筆使用明細對應一筆累積記錄)

**說明：**
- `earn_transaction_id` 關聯累積記錄
- `use_transaction_id` 關聯使用記錄

---

## 實作範例

### TypeScript 實作 FIFO 扣除邏輯

```typescript
async function deductCompensatoryLeave(
  userId: number,
  yearMonth: string,
  requestedHours: number,
  useTransactionId: number
) {
  // 1. 查找可扣除的累積記錄（FIFO順序）
  const earnRecords = await db.all(`
    SELECT 
      t.transaction_id,
      t.hours - COALESCE(SUM(u.used_hours), 0) AS remaining_hours
    FROM CompensatoryLeaveTransactions t
    LEFT JOIN CompensatoryLeaveUsage u ON t.transaction_id = u.earn_transaction_id
    WHERE t.user_id = ? AND t.year_month = ? AND t.transaction_type = 'earn'
    GROUP BY t.transaction_id
    HAVING remaining_hours > 0
    ORDER BY t.created_at ASC
  `, [userId, yearMonth]);
  
  // 2. 依序扣除
  let remainingToDeduct = requestedHours;
  
  for (const record of earnRecords) {
    if (remainingToDeduct <= 0) break;
    
    const deductAmount = Math.min(remainingToDeduct, record.remaining_hours);
    
    // 3. 記錄使用明細
    await db.run(`
      INSERT INTO CompensatoryLeaveUsage (earn_transaction_id, use_transaction_id, used_hours)
      VALUES (?, ?, ?)
    `, [record.transaction_id, useTransactionId, deductAmount]);
    
    remainingToDeduct -= deductAmount;
  }
  
  if (remainingToDeduct > 0) {
    throw new Error('INSUFFICIENT_COMPENSATORY_LEAVE');
  }
}
```

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [CompensatoryLeaveBalance](./CompensatoryLeaveBalance.md)
- [CompensatoryLeaveTransactions](./CompensatoryLeaveTransactions.md)

---

**最後更新：** 2025年10月27日



