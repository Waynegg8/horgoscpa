# OvertimeRates - 加班費率設定

**用途：** 管理不同工作日類型和時段的加班費率（符合勞基法）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE OvertimeRates (
  rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_day_type TEXT NOT NULL,              -- weekday/rest_day/national_holiday/holiday
  hour_range_start INTEGER NOT NULL,        -- 時數範圍開始（第幾小時）
  hour_range_end INTEGER NOT NULL,          -- 時數範圍結束
  rate_multiplier REAL NOT NULL,            -- 費率倍數
  requires_compensatory_leave BOOLEAN DEFAULT FALSE,  -- 是否需額外補休
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,           -- 軟刪除
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `rate_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `work_day_type` | TEXT | 工作日類型 | NOT NULL, weekday/rest_day/national_holiday/holiday |
| `hour_range_start` | INTEGER | 時數範圍開始 | NOT NULL, 第幾小時（1-based） |
| `hour_range_end` | INTEGER | 時數範圍結束 | NOT NULL |
| `rate_multiplier` | REAL | 費率倍數 | NOT NULL, 如 1.34, 1.67 |
| `requires_compensatory_leave` | BOOLEAN | 是否需額外補休 | DEFAULT FALSE, 例假日加班需補休 |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE, 軟刪除 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 工作日類型說明

| 類型 | 英文 | 說明 |
|------|------|------|
| 平日 | `weekday` | 正常工作日，超過8H算加班 |
| 休息日 | `rest_day` | 例如週六（非例假日） |
| 國定假日 | `national_holiday` | 政府公告的國定假日 |
| 例假日 | `holiday` | 例如週日，僅限天災等突發事件可加班 |

---

## 索引

```sql
-- 查詢特定工作日類型的費率
CREATE INDEX idx_overtime_rates_work_day_type 
ON OvertimeRates(work_day_type, is_active);

-- 排序查詢
CREATE INDEX idx_overtime_rates_sort 
ON OvertimeRates(work_day_type, sort_order);
```

---

## 範例資料（符合台灣勞基法）

```sql
INSERT INTO OvertimeRates (work_day_type, hour_range_start, hour_range_end, rate_multiplier, requires_compensatory_leave, description, sort_order) VALUES
-- 平日加班
('weekday', 9, 10, 1.34, FALSE, '平日第1-2小時（第9-10H）', 1),
('weekday', 11, 12, 1.67, FALSE, '平日第3-4小時（第11-12H）', 2),

-- 休息日加班
('rest_day', 1, 2, 1.34, FALSE, '休息日第1-2小時', 3),
('rest_day', 3, 8, 1.67, FALSE, '休息日第3-8小時', 4),
('rest_day', 9, 12, 2.67, FALSE, '休息日第9-12小時', 5),

-- 國定假日加班
('national_holiday', 1, 8, 1.0, FALSE, '國定假日8小時內另加發1日工資', 6),
('national_holiday', 9, 10, 1.34, FALSE, '國定假日第9-10小時', 7),
('national_holiday', 11, 12, 1.67, FALSE, '國定假日第11-12小時', 8),

-- 例假日加班（僅限天災等突發事件）
('holiday', 1, 8, 1.0, TRUE, '例假日8小時內另加發1日工資+補休', 9),
('holiday', 9, 12, 2.0, TRUE, '例假日第9-12小時+補休', 10);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的費率（依工作日類型分組）

```sql
SELECT 
  work_day_type,
  hour_range_start,
  hour_range_end,
  rate_multiplier,
  requires_compensatory_leave,
  description
FROM OvertimeRates
WHERE is_active = TRUE
ORDER BY work_day_type, sort_order;
```

---

### 查詢 2：計算加班費率（給定工作日類型和加班時數）

```sql
SELECT 
  rate_id,
  hour_range_start,
  hour_range_end,
  rate_multiplier,
  requires_compensatory_leave
FROM OvertimeRates
WHERE work_day_type = ?
  AND is_active = TRUE
  AND ? >= hour_range_start  -- 加班時數範圍
  AND ? <= hour_range_end
ORDER BY hour_range_start;
```

**範例（平日加班3H）：**
```sql
WHERE work_day_type = 'weekday' AND 9 >= hour_range_start AND 11 <= hour_range_end
```

**結果：**
- 第9-10H: 2H × 1.34倍 = 2.68倍
- 第11H: 1H × 1.67倍 = 1.67倍
- 總計：4.35倍時薪

---

### 查詢 3：恢復法定預設值

```sql
-- 軟刪除所有現有費率
UPDATE OvertimeRates SET is_active = FALSE;

-- 重新插入法定預設值
INSERT INTO OvertimeRates (...) VALUES (...);
```

---

### 查詢 4：檢查是否有工時記錄使用此費率

```sql
SELECT COUNT(*) 
FROM TimeLogs 
WHERE overtime_rate_id = ?;
```

---

## 費率計算邏輯

### 範例：休息日加班 10H

```
時數範圍         | 費率   | 計算
----------------|--------|------------------
第 1-2H         | 1.34倍 | 2H × 1.34 = 2.68倍
第 3-8H         | 1.67倍 | 6H × 1.67 = 10.02倍
第 9-10H        | 2.67倍 | 2H × 2.67 = 5.34倍
----------------|--------|------------------
總計            |        | 18.04倍時薪
```

---

## 資料完整性規則

### 1. 時數範圍不可重疊（同一工作日類型）

**應用層規則：**
```typescript
// 檢查新增的時數範圍是否與現有重疊
const overlapping = await db.get(`
  SELECT 1 FROM OvertimeRates
  WHERE work_day_type = ?
    AND is_active = TRUE
    AND NOT (hour_range_end < ? OR hour_range_start > ?)
`, [workDayType, newStart, newEnd]);

if (overlapping) {
  throw new Error('HOUR_RANGE_OVERLAPPING');
}
```

---

### 2. 費率倍數必須 >= 1.0

```typescript
assert(rate_multiplier >= 1.0);
```

---

### 3. 軟刪除機制

- 不可刪除已被工時記錄使用的費率
- 使用 `is_active = FALSE` 標記為歷史費率
- 保留歷史記錄以維持資料一致性

---

## 關聯資料表

### TimeLogs - 工時記錄

**關係：** 1:N (一個費率對應多筆工時記錄)

**說明：** 工時記錄會參考此表計算加班費

---

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** 1:N

**說明：** 累積補休時記錄原始費率，用於月底結算

---

## 勞基法對照

詳見：[2.3 加班費率 - 勞基法對照表](../../技術規格/業務規則/2.3-加班費率-勞基法對照表.md)

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [加班費率 API](../../API規格/業務規則/加班費率/_概覽.md)

---

**最後更新：** 2025年10月27日



**用途：** 管理不同工作日類型和時段的加班費率（符合勞基法）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE OvertimeRates (
  rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_day_type TEXT NOT NULL,              -- weekday/rest_day/national_holiday/holiday
  hour_range_start INTEGER NOT NULL,        -- 時數範圍開始（第幾小時）
  hour_range_end INTEGER NOT NULL,          -- 時數範圍結束
  rate_multiplier REAL NOT NULL,            -- 費率倍數
  requires_compensatory_leave BOOLEAN DEFAULT FALSE,  -- 是否需額外補休
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,           -- 軟刪除
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `rate_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `work_day_type` | TEXT | 工作日類型 | NOT NULL, weekday/rest_day/national_holiday/holiday |
| `hour_range_start` | INTEGER | 時數範圍開始 | NOT NULL, 第幾小時（1-based） |
| `hour_range_end` | INTEGER | 時數範圍結束 | NOT NULL |
| `rate_multiplier` | REAL | 費率倍數 | NOT NULL, 如 1.34, 1.67 |
| `requires_compensatory_leave` | BOOLEAN | 是否需額外補休 | DEFAULT FALSE, 例假日加班需補休 |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE, 軟刪除 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 工作日類型說明

| 類型 | 英文 | 說明 |
|------|------|------|
| 平日 | `weekday` | 正常工作日，超過8H算加班 |
| 休息日 | `rest_day` | 例如週六（非例假日） |
| 國定假日 | `national_holiday` | 政府公告的國定假日 |
| 例假日 | `holiday` | 例如週日，僅限天災等突發事件可加班 |

---

## 索引

```sql
-- 查詢特定工作日類型的費率
CREATE INDEX idx_overtime_rates_work_day_type 
ON OvertimeRates(work_day_type, is_active);

-- 排序查詢
CREATE INDEX idx_overtime_rates_sort 
ON OvertimeRates(work_day_type, sort_order);
```

---

## 範例資料（符合台灣勞基法）

```sql
INSERT INTO OvertimeRates (work_day_type, hour_range_start, hour_range_end, rate_multiplier, requires_compensatory_leave, description, sort_order) VALUES
-- 平日加班
('weekday', 9, 10, 1.34, FALSE, '平日第1-2小時（第9-10H）', 1),
('weekday', 11, 12, 1.67, FALSE, '平日第3-4小時（第11-12H）', 2),

-- 休息日加班
('rest_day', 1, 2, 1.34, FALSE, '休息日第1-2小時', 3),
('rest_day', 3, 8, 1.67, FALSE, '休息日第3-8小時', 4),
('rest_day', 9, 12, 2.67, FALSE, '休息日第9-12小時', 5),

-- 國定假日加班
('national_holiday', 1, 8, 1.0, FALSE, '國定假日8小時內另加發1日工資', 6),
('national_holiday', 9, 10, 1.34, FALSE, '國定假日第9-10小時', 7),
('national_holiday', 11, 12, 1.67, FALSE, '國定假日第11-12小時', 8),

-- 例假日加班（僅限天災等突發事件）
('holiday', 1, 8, 1.0, TRUE, '例假日8小時內另加發1日工資+補休', 9),
('holiday', 9, 12, 2.0, TRUE, '例假日第9-12小時+補休', 10);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的費率（依工作日類型分組）

```sql
SELECT 
  work_day_type,
  hour_range_start,
  hour_range_end,
  rate_multiplier,
  requires_compensatory_leave,
  description
FROM OvertimeRates
WHERE is_active = TRUE
ORDER BY work_day_type, sort_order;
```

---

### 查詢 2：計算加班費率（給定工作日類型和加班時數）

```sql
SELECT 
  rate_id,
  hour_range_start,
  hour_range_end,
  rate_multiplier,
  requires_compensatory_leave
FROM OvertimeRates
WHERE work_day_type = ?
  AND is_active = TRUE
  AND ? >= hour_range_start  -- 加班時數範圍
  AND ? <= hour_range_end
ORDER BY hour_range_start;
```

**範例（平日加班3H）：**
```sql
WHERE work_day_type = 'weekday' AND 9 >= hour_range_start AND 11 <= hour_range_end
```

**結果：**
- 第9-10H: 2H × 1.34倍 = 2.68倍
- 第11H: 1H × 1.67倍 = 1.67倍
- 總計：4.35倍時薪

---

### 查詢 3：恢復法定預設值

```sql
-- 軟刪除所有現有費率
UPDATE OvertimeRates SET is_active = FALSE;

-- 重新插入法定預設值
INSERT INTO OvertimeRates (...) VALUES (...);
```

---

### 查詢 4：檢查是否有工時記錄使用此費率

```sql
SELECT COUNT(*) 
FROM TimeLogs 
WHERE overtime_rate_id = ?;
```

---

## 費率計算邏輯

### 範例：休息日加班 10H

```
時數範圍         | 費率   | 計算
----------------|--------|------------------
第 1-2H         | 1.34倍 | 2H × 1.34 = 2.68倍
第 3-8H         | 1.67倍 | 6H × 1.67 = 10.02倍
第 9-10H        | 2.67倍 | 2H × 2.67 = 5.34倍
----------------|--------|------------------
總計            |        | 18.04倍時薪
```

---

## 資料完整性規則

### 1. 時數範圍不可重疊（同一工作日類型）

**應用層規則：**
```typescript
// 檢查新增的時數範圍是否與現有重疊
const overlapping = await db.get(`
  SELECT 1 FROM OvertimeRates
  WHERE work_day_type = ?
    AND is_active = TRUE
    AND NOT (hour_range_end < ? OR hour_range_start > ?)
`, [workDayType, newStart, newEnd]);

if (overlapping) {
  throw new Error('HOUR_RANGE_OVERLAPPING');
}
```

---

### 2. 費率倍數必須 >= 1.0

```typescript
assert(rate_multiplier >= 1.0);
```

---

### 3. 軟刪除機制

- 不可刪除已被工時記錄使用的費率
- 使用 `is_active = FALSE` 標記為歷史費率
- 保留歷史記錄以維持資料一致性

---

## 關聯資料表

### TimeLogs - 工時記錄

**關係：** 1:N (一個費率對應多筆工時記錄)

**說明：** 工時記錄會參考此表計算加班費

---

### CompensatoryLeaveTransactions - 補休異動明細

**關係：** 1:N

**說明：** 累積補休時記錄原始費率，用於月底結算

---

## 勞基法對照

詳見：[2.3 加班費率 - 勞基法對照表](../../技術規格/業務規則/2.3-加班費率-勞基法對照表.md)

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [補休機制完整設計](../../技術規格/業務規則/補休機制.md)
- [加班費率 API](../../API規格/業務規則/加班費率/_概覽.md)

---

**最後更新：** 2025年10月27日



