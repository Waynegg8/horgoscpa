# Holidays - 國定假日與補班日

**用途：** 管理國定假日與補班日，用於判定加班類型和工時計算  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE Holidays (
  holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,                -- 日期（YYYY-MM-DD）
  name TEXT NOT NULL,                       -- 假日名稱
  holiday_type TEXT NOT NULL,               -- national_holiday/makeup_workday
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `holiday_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `date` | TEXT | 日期 | NOT NULL, UNIQUE, 格式：YYYY-MM-DD |
| `name` | TEXT | 假日名稱 | NOT NULL, 如：春節、中秋節 |
| `holiday_type` | TEXT | 假日類型 | NOT NULL, national_holiday/makeup_workday |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 假日類型說明

| 類型 | 英文 | 說明 | 加班類型 |
|------|------|------|---------|
| 國定假日 | `national_holiday` | 政府公告的國定假日 | 國定假日加班費率 |
| 補班日 | `makeup_workday` | 因連假調整的補班日 | 視為正常工作日 |

---

## 索引

```sql
-- 日期查詢（最常用）
CREATE UNIQUE INDEX idx_holidays_date ON Holidays(date);

-- 按類型和年份查詢
CREATE INDEX idx_holidays_type_date ON Holidays(holiday_type, date);

-- 按年份查詢
CREATE INDEX idx_holidays_year ON Holidays(substr(date, 1, 4));
```

---

## 範例資料（2025年台灣國定假日）

```sql
INSERT INTO Holidays (date, name, holiday_type, description) VALUES
-- 2025年國定假日
('2025-01-01', '中華民國開國紀念日', 'national_holiday', '元旦'),
('2025-01-27', '農曆除夕前一日', 'national_holiday', '調整放假'),
('2025-01-28', '農曆除夕', 'national_holiday', '春節'),
('2025-01-29', '春節', 'national_holiday', '農曆正月初一'),
('2025-01-30', '春節', 'national_holiday', '農曆正月初二'),
('2025-01-31', '春節', 'national_holiday', '農曆正月初三'),
('2025-02-28', '和平紀念日', 'national_holiday', ''),
('2025-04-04', '兒童節', 'national_holiday', ''),
('2025-04-05', '清明節', 'national_holiday', '民族掃墓節'),
('2025-05-01', '勞動節', 'national_holiday', ''),
('2025-06-02', '端午節', 'national_holiday', '農曆五月初五'),
('2025-09-03', '軍人節', 'national_holiday', '僅軍人放假'),
('2025-10-05', '中秋節', 'national_holiday', '農曆八月十五'),
('2025-10-10', '國慶日', 'national_holiday', '雙十節'),

-- 補班日
('2025-01-26', '補班日', 'makeup_workday', '補1/27調整放假'),
('2025-09-20', '補班日', 'makeup_workday', '補中秋連假');
```

---

## 常用查詢

### 查詢 1：檢查某日是否為國定假日

```sql
SELECT holiday_id, name, holiday_type
FROM Holidays
WHERE date = ? AND is_active = TRUE;
```

**使用場景：** 員工填寫工時時，系統自動判定該日是國定假日還是補班日

---

### 查詢 2：獲取某年的所有國定假日

```sql
SELECT date, name, holiday_type
FROM Holidays
WHERE substr(date, 1, 4) = ?
  AND holiday_type = 'national_holiday'
  AND is_active = TRUE
ORDER BY date;
```

---

### 查詢 3：批量匯入（CSV導入）

```sql
INSERT INTO Holidays (date, name, holiday_type, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(date) DO UPDATE SET
  name = excluded.name,
  holiday_type = excluded.holiday_type,
  description = excluded.description,
  updated_at = CURRENT_TIMESTAMP;
```

---

### 查詢 4：檢查是否有工時記錄使用此假日

```sql
SELECT COUNT(*) 
FROM TimeLogs 
WHERE work_date = ?;
```

**說明：** 刪除前檢查，避免影響已有工時記錄

---

### 查詢 5：獲取某月的假日列表（含週末）

```sql
-- 僅國定假日
SELECT date, name
FROM Holidays
WHERE date BETWEEN ? AND ?
  AND holiday_type = 'national_holiday'
  AND is_active = TRUE
ORDER BY date;
```

---

## 資料完整性規則

### 1. 日期唯一性約束

```sql
UNIQUE(date)
```

**說明：** 同一天只能有一筆記錄

---

### 2. 日期格式驗證（應用層）

```typescript
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
assert(datePattern.test(date));
```

---

### 3. 軟刪除機制

- 不直接刪除已被使用的假日
- 使用 `is_active = FALSE` 標記
- 保留歷史記錄

---

## 業務邏輯

### 工作日類型判定流程

```typescript
function getWorkDayType(date: string): string {
  // 1. 檢查是否為補班日
  const makeup = await db.get(`
    SELECT 1 FROM Holidays 
    WHERE date = ? AND holiday_type = 'makeup_workday'
  `, [date]);
  
  if (makeup) {
    return 'weekday';  // 補班日視為正常工作日
  }
  
  // 2. 檢查是否為國定假日
  const holiday = await db.get(`
    SELECT 1 FROM Holidays 
    WHERE date = ? AND holiday_type = 'national_holiday'
  `, [date]);
  
  if (holiday) {
    return 'national_holiday';
  }
  
  // 3. 檢查是否為週日（例假日）
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0) {
    return 'holiday';
  }
  
  // 4. 檢查是否為週六（休息日）
  if (dayOfWeek === 6) {
    return 'rest_day';
  }
  
  // 5. 平日
  return 'weekday';
}
```

---

## 關聯資料表

### TimeLogs - 工時記錄

**關係：** 1:N

**說明：** 工時記錄根據日期查詢此表，判定加班類型

---

## CSV 批量匯入格式

```csv
日期,名稱,類型,說明
2025-01-01,中華民國開國紀念日,national_holiday,元旦
2025-01-26,補班日,makeup_workday,補1/27調整放假
```

**匯入邏輯：**
1. 驗證日期格式
2. 驗證類型為 `national_holiday` 或 `makeup_workday`
3. 使用 `ON CONFLICT DO UPDATE` 更新現有記錄

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [國定假日 API](../../API規格/業務規則/國定假日/_概覽.md)
- [OvertimeRates](./OvertimeRates.md) - 加班費率設定

---

**最後更新：** 2025年10月27日



**用途：** 管理國定假日與補班日，用於判定加班類型和工時計算  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE Holidays (
  holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,                -- 日期（YYYY-MM-DD）
  name TEXT NOT NULL,                       -- 假日名稱
  holiday_type TEXT NOT NULL,               -- national_holiday/makeup_workday
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `holiday_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `date` | TEXT | 日期 | NOT NULL, UNIQUE, 格式：YYYY-MM-DD |
| `name` | TEXT | 假日名稱 | NOT NULL, 如：春節、中秋節 |
| `holiday_type` | TEXT | 假日類型 | NOT NULL, national_holiday/makeup_workday |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 假日類型說明

| 類型 | 英文 | 說明 | 加班類型 |
|------|------|------|---------|
| 國定假日 | `national_holiday` | 政府公告的國定假日 | 國定假日加班費率 |
| 補班日 | `makeup_workday` | 因連假調整的補班日 | 視為正常工作日 |

---

## 索引

```sql
-- 日期查詢（最常用）
CREATE UNIQUE INDEX idx_holidays_date ON Holidays(date);

-- 按類型和年份查詢
CREATE INDEX idx_holidays_type_date ON Holidays(holiday_type, date);

-- 按年份查詢
CREATE INDEX idx_holidays_year ON Holidays(substr(date, 1, 4));
```

---

## 範例資料（2025年台灣國定假日）

```sql
INSERT INTO Holidays (date, name, holiday_type, description) VALUES
-- 2025年國定假日
('2025-01-01', '中華民國開國紀念日', 'national_holiday', '元旦'),
('2025-01-27', '農曆除夕前一日', 'national_holiday', '調整放假'),
('2025-01-28', '農曆除夕', 'national_holiday', '春節'),
('2025-01-29', '春節', 'national_holiday', '農曆正月初一'),
('2025-01-30', '春節', 'national_holiday', '農曆正月初二'),
('2025-01-31', '春節', 'national_holiday', '農曆正月初三'),
('2025-02-28', '和平紀念日', 'national_holiday', ''),
('2025-04-04', '兒童節', 'national_holiday', ''),
('2025-04-05', '清明節', 'national_holiday', '民族掃墓節'),
('2025-05-01', '勞動節', 'national_holiday', ''),
('2025-06-02', '端午節', 'national_holiday', '農曆五月初五'),
('2025-09-03', '軍人節', 'national_holiday', '僅軍人放假'),
('2025-10-05', '中秋節', 'national_holiday', '農曆八月十五'),
('2025-10-10', '國慶日', 'national_holiday', '雙十節'),

-- 補班日
('2025-01-26', '補班日', 'makeup_workday', '補1/27調整放假'),
('2025-09-20', '補班日', 'makeup_workday', '補中秋連假');
```

---

## 常用查詢

### 查詢 1：檢查某日是否為國定假日

```sql
SELECT holiday_id, name, holiday_type
FROM Holidays
WHERE date = ? AND is_active = TRUE;
```

**使用場景：** 員工填寫工時時，系統自動判定該日是國定假日還是補班日

---

### 查詢 2：獲取某年的所有國定假日

```sql
SELECT date, name, holiday_type
FROM Holidays
WHERE substr(date, 1, 4) = ?
  AND holiday_type = 'national_holiday'
  AND is_active = TRUE
ORDER BY date;
```

---

### 查詢 3：批量匯入（CSV導入）

```sql
INSERT INTO Holidays (date, name, holiday_type, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(date) DO UPDATE SET
  name = excluded.name,
  holiday_type = excluded.holiday_type,
  description = excluded.description,
  updated_at = CURRENT_TIMESTAMP;
```

---

### 查詢 4：檢查是否有工時記錄使用此假日

```sql
SELECT COUNT(*) 
FROM TimeLogs 
WHERE work_date = ?;
```

**說明：** 刪除前檢查，避免影響已有工時記錄

---

### 查詢 5：獲取某月的假日列表（含週末）

```sql
-- 僅國定假日
SELECT date, name
FROM Holidays
WHERE date BETWEEN ? AND ?
  AND holiday_type = 'national_holiday'
  AND is_active = TRUE
ORDER BY date;
```

---

## 資料完整性規則

### 1. 日期唯一性約束

```sql
UNIQUE(date)
```

**說明：** 同一天只能有一筆記錄

---

### 2. 日期格式驗證（應用層）

```typescript
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
assert(datePattern.test(date));
```

---

### 3. 軟刪除機制

- 不直接刪除已被使用的假日
- 使用 `is_active = FALSE` 標記
- 保留歷史記錄

---

## 業務邏輯

### 工作日類型判定流程

```typescript
function getWorkDayType(date: string): string {
  // 1. 檢查是否為補班日
  const makeup = await db.get(`
    SELECT 1 FROM Holidays 
    WHERE date = ? AND holiday_type = 'makeup_workday'
  `, [date]);
  
  if (makeup) {
    return 'weekday';  // 補班日視為正常工作日
  }
  
  // 2. 檢查是否為國定假日
  const holiday = await db.get(`
    SELECT 1 FROM Holidays 
    WHERE date = ? AND holiday_type = 'national_holiday'
  `, [date]);
  
  if (holiday) {
    return 'national_holiday';
  }
  
  // 3. 檢查是否為週日（例假日）
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0) {
    return 'holiday';
  }
  
  // 4. 檢查是否為週六（休息日）
  if (dayOfWeek === 6) {
    return 'rest_day';
  }
  
  // 5. 平日
  return 'weekday';
}
```

---

## 關聯資料表

### TimeLogs - 工時記錄

**關係：** 1:N

**說明：** 工時記錄根據日期查詢此表，判定加班類型

---

## CSV 批量匯入格式

```csv
日期,名稱,類型,說明
2025-01-01,中華民國開國紀念日,national_holiday,元旦
2025-01-26,補班日,makeup_workday,補1/27調整放假
```

**匯入邏輯：**
1. 驗證日期格式
2. 驗證類型為 `national_holiday` 或 `makeup_workday`
3. 使用 `ON CONFLICT DO UPDATE` 更新現有記錄

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [國定假日 API](../../API規格/業務規則/國定假日/_概覽.md)
- [OvertimeRates](./OvertimeRates.md) - 加班費率設定

---

**最後更新：** 2025年10月27日



