# AnnualLeaveRules - 特休規則

**用途：** 設定員工年資對應的特休天數（符合台灣勞基法）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE AnnualLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  years_of_service_start INTEGER NOT NULL,  -- 年資範圍開始（月）
  years_of_service_end INTEGER,             -- 年資範圍結束（月），NULL=無上限
  annual_leave_days INTEGER NOT NULL,       -- 特休天數
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `rule_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `years_of_service_start` | INTEGER | 年資範圍開始（月） | NOT NULL, 精確到月 |
| `years_of_service_end` | INTEGER | 年資範圍結束（月） | NULL=無上限 |
| `annual_leave_days` | INTEGER | 特休天數 | NOT NULL |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 年資查詢
CREATE INDEX idx_annual_leave_rules_years 
ON AnnualLeaveRules(years_of_service_start, years_of_service_end);

-- 排序查詢
CREATE INDEX idx_annual_leave_rules_sort 
ON AnnualLeaveRules(is_active, sort_order);
```

---

## 範例資料（符合台灣勞基法 - 26條規則）

```sql
INSERT INTO AnnualLeaveRules (years_of_service_start, years_of_service_end, annual_leave_days, description, sort_order) VALUES
-- 未滿6個月：0天
(0, 5, 0, '未滿6個月', 1),

-- 滿6個月未滿1年：3天
(6, 11, 3, '滿6個月未滿1年', 2),

-- 1年以上，每年遞增（上限30天）
(12, 23, 7, '滿1年未滿2年', 3),
(24, 35, 10, '滿2年未滿3年', 4),
(36, 47, 14, '滿3年未滿4年', 5),
(48, 59, 14, '滿4年未滿5年', 6),
(60, 71, 15, '滿5年未滿6年', 7),
(72, 83, 15, '滿6年未滿7年', 8),
(84, 95, 15, '滿7年未滿8年', 9),
(96, 107, 15, '滿8年未滿9年', 10),
(108, 119, 15, '滿9年未滿10年', 11),
(120, 131, 16, '滿10年未滿11年', 12),
(132, 143, 17, '滿11年未滿12年', 13),
(144, 155, 18, '滿12年未滿13年', 14),
(156, 167, 19, '滿13年未滿14年', 15),
(168, 179, 20, '滿14年未滿15年', 16),
(180, 191, 21, '滿15年未滿16年', 17),
(192, 203, 22, '滿16年未滿17年', 18),
(204, 215, 23, '滿17年未滿18年', 19),
(216, 227, 24, '滿18年未滿19年', 20),
(228, 239, 25, '滿19年未滿20年', 21),
(240, 251, 26, '滿20年未滿21年', 22),
(252, 263, 27, '滿21年未滿22年', 23),
(264, 275, 28, '滿22年未滿23年', 24),
(276, 287, 29, '滿23年未滿24年', 25),
(288, NULL, 30, '滿24年以上', 26);
```

---

## 常用查詢

### 查詢 1：根據年資（月數）查詢特休天數

```sql
SELECT annual_leave_days
FROM AnnualLeaveRules
WHERE is_active = TRUE
  AND years_of_service_start <= ?
  AND (years_of_service_end IS NULL OR years_of_service_end >= ?)
ORDER BY years_of_service_start DESC
LIMIT 1;
```

**範例：** 員工年資 25個月（2年1個月）
```sql
WHERE years_of_service_start <= 25 AND (years_of_service_end IS NULL OR years_of_service_end >= 25)
```
**結果：** 10天

---

### 查詢 2：獲取所有規則（管理介面顯示）

```sql
SELECT 
  rule_id,
  years_of_service_start,
  years_of_service_end,
  annual_leave_days,
  description
FROM AnnualLeaveRules
WHERE is_active = TRUE
ORDER BY sort_order;
```

---

### 查詢 3：恢復法定預設值

```sql
-- 停用所有現有規則
UPDATE AnnualLeaveRules SET is_active = FALSE;

-- 重新插入26條法定規則
INSERT INTO AnnualLeaveRules (...) VALUES (...);
```

---

### 查詢 4：計算員工當前特休天數

```typescript
async function calculateAnnualLeave(userId: number): Promise<number> {
  // 1. 獲取員工到職日
  const user = await db.get(`
    SELECT hire_date FROM Users WHERE user_id = ?
  `, [userId]);
  
  // 2. 計算年資（月數）
  const hireDate = new Date(user.hire_date);
  const today = new Date();
  const monthsOfService = 
    (today.getFullYear() - hireDate.getFullYear()) * 12 +
    (today.getMonth() - hireDate.getMonth());
  
  // 3. 查詢對應的特休天數
  const rule = await db.get(`
    SELECT annual_leave_days
    FROM AnnualLeaveRules
    WHERE is_active = TRUE
      AND years_of_service_start <= ?
      AND (years_of_service_end IS NULL OR years_of_service_end >= ?)
    ORDER BY years_of_service_start DESC
    LIMIT 1
  `, [monthsOfService, monthsOfService]);
  
  return rule?.annual_leave_days || 0;
}
```

---

## 年資計算邏輯

### 精確到月份計算

**到職日：** 2023年3月15日  
**查詢日：** 2025年10月27日

**計算：**
```
年差：2025 - 2023 = 2年
月差：10 - 3 = 7月
總月數：2 × 12 + 7 = 31個月

查詢規則：
WHERE years_of_service_start <= 31 
  AND (years_of_service_end IS NULL OR years_of_service_end >= 31)
  
匹配規則：24-35月 → 10天特休
```

---

## 資料完整性規則

### 1. 年資範圍不可重疊

**應用層規則：**
```typescript
// 檢查新增的範圍是否與現有重疊
const overlapping = await db.get(`
  SELECT 1 FROM AnnualLeaveRules
  WHERE is_active = TRUE
    AND NOT (years_of_service_end < ? OR years_of_service_start > ?)
`, [newStart, newEnd]);

if (overlapping) {
  throw new Error('YEARS_RANGE_OVERLAPPING');
}
```

---

### 2. 年資範圍連續性

- 規則應覆蓋所有年資範圍（0個月 ~ 無上限）
- 不應有間隙

---

### 3. 特休天數上限 30天

```typescript
assert(annual_leave_days >= 0 && annual_leave_days <= 30);
```

---

## 規則變更處理

### 當管理員修改規則時

```typescript
async function updateAnnualLeaveRules(newRules: AnnualLeaveRule[]) {
  // 1. 停用舊規則
  await db.run(`UPDATE AnnualLeaveRules SET is_active = FALSE`);
  
  // 2. 插入新規則
  for (const rule of newRules) {
    await db.run(`
      INSERT INTO AnnualLeaveRules (...) VALUES (...)
    `);
  }
  
  // 3. 重新計算所有員工的特休額度
  await recalculateAllEmployeesAnnualLeave();
}
```

---

## 關聯資料表

### Users - 使用者資料表

**關係：** 透過年資計算關聯

**說明：** 使用 `hire_date` 計算年資，再查詢對應規則

---

### LeaveBalances - 假期餘額

**關係：** 計算結果寫入餘額表

**說明：** 特休額度根據此規則自動計算並更新

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [特休規則 API](../../API規格/業務規則/特休規則/_概覽.md)
- [LeaveTypes](./LeaveTypes.md) - 假別類型

---

**最後更新：** 2025年10月27日



**用途：** 設定員工年資對應的特休天數（符合台灣勞基法）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE AnnualLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  years_of_service_start INTEGER NOT NULL,  -- 年資範圍開始（月）
  years_of_service_end INTEGER,             -- 年資範圍結束（月），NULL=無上限
  annual_leave_days INTEGER NOT NULL,       -- 特休天數
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `rule_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `years_of_service_start` | INTEGER | 年資範圍開始（月） | NOT NULL, 精確到月 |
| `years_of_service_end` | INTEGER | 年資範圍結束（月） | NULL=無上限 |
| `annual_leave_days` | INTEGER | 特休天數 | NOT NULL |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 年資查詢
CREATE INDEX idx_annual_leave_rules_years 
ON AnnualLeaveRules(years_of_service_start, years_of_service_end);

-- 排序查詢
CREATE INDEX idx_annual_leave_rules_sort 
ON AnnualLeaveRules(is_active, sort_order);
```

---

## 範例資料（符合台灣勞基法 - 26條規則）

```sql
INSERT INTO AnnualLeaveRules (years_of_service_start, years_of_service_end, annual_leave_days, description, sort_order) VALUES
-- 未滿6個月：0天
(0, 5, 0, '未滿6個月', 1),

-- 滿6個月未滿1年：3天
(6, 11, 3, '滿6個月未滿1年', 2),

-- 1年以上，每年遞增（上限30天）
(12, 23, 7, '滿1年未滿2年', 3),
(24, 35, 10, '滿2年未滿3年', 4),
(36, 47, 14, '滿3年未滿4年', 5),
(48, 59, 14, '滿4年未滿5年', 6),
(60, 71, 15, '滿5年未滿6年', 7),
(72, 83, 15, '滿6年未滿7年', 8),
(84, 95, 15, '滿7年未滿8年', 9),
(96, 107, 15, '滿8年未滿9年', 10),
(108, 119, 15, '滿9年未滿10年', 11),
(120, 131, 16, '滿10年未滿11年', 12),
(132, 143, 17, '滿11年未滿12年', 13),
(144, 155, 18, '滿12年未滿13年', 14),
(156, 167, 19, '滿13年未滿14年', 15),
(168, 179, 20, '滿14年未滿15年', 16),
(180, 191, 21, '滿15年未滿16年', 17),
(192, 203, 22, '滿16年未滿17年', 18),
(204, 215, 23, '滿17年未滿18年', 19),
(216, 227, 24, '滿18年未滿19年', 20),
(228, 239, 25, '滿19年未滿20年', 21),
(240, 251, 26, '滿20年未滿21年', 22),
(252, 263, 27, '滿21年未滿22年', 23),
(264, 275, 28, '滿22年未滿23年', 24),
(276, 287, 29, '滿23年未滿24年', 25),
(288, NULL, 30, '滿24年以上', 26);
```

---

## 常用查詢

### 查詢 1：根據年資（月數）查詢特休天數

```sql
SELECT annual_leave_days
FROM AnnualLeaveRules
WHERE is_active = TRUE
  AND years_of_service_start <= ?
  AND (years_of_service_end IS NULL OR years_of_service_end >= ?)
ORDER BY years_of_service_start DESC
LIMIT 1;
```

**範例：** 員工年資 25個月（2年1個月）
```sql
WHERE years_of_service_start <= 25 AND (years_of_service_end IS NULL OR years_of_service_end >= 25)
```
**結果：** 10天

---

### 查詢 2：獲取所有規則（管理介面顯示）

```sql
SELECT 
  rule_id,
  years_of_service_start,
  years_of_service_end,
  annual_leave_days,
  description
FROM AnnualLeaveRules
WHERE is_active = TRUE
ORDER BY sort_order;
```

---

### 查詢 3：恢復法定預設值

```sql
-- 停用所有現有規則
UPDATE AnnualLeaveRules SET is_active = FALSE;

-- 重新插入26條法定規則
INSERT INTO AnnualLeaveRules (...) VALUES (...);
```

---

### 查詢 4：計算員工當前特休天數

```typescript
async function calculateAnnualLeave(userId: number): Promise<number> {
  // 1. 獲取員工到職日
  const user = await db.get(`
    SELECT hire_date FROM Users WHERE user_id = ?
  `, [userId]);
  
  // 2. 計算年資（月數）
  const hireDate = new Date(user.hire_date);
  const today = new Date();
  const monthsOfService = 
    (today.getFullYear() - hireDate.getFullYear()) * 12 +
    (today.getMonth() - hireDate.getMonth());
  
  // 3. 查詢對應的特休天數
  const rule = await db.get(`
    SELECT annual_leave_days
    FROM AnnualLeaveRules
    WHERE is_active = TRUE
      AND years_of_service_start <= ?
      AND (years_of_service_end IS NULL OR years_of_service_end >= ?)
    ORDER BY years_of_service_start DESC
    LIMIT 1
  `, [monthsOfService, monthsOfService]);
  
  return rule?.annual_leave_days || 0;
}
```

---

## 年資計算邏輯

### 精確到月份計算

**到職日：** 2023年3月15日  
**查詢日：** 2025年10月27日

**計算：**
```
年差：2025 - 2023 = 2年
月差：10 - 3 = 7月
總月數：2 × 12 + 7 = 31個月

查詢規則：
WHERE years_of_service_start <= 31 
  AND (years_of_service_end IS NULL OR years_of_service_end >= 31)
  
匹配規則：24-35月 → 10天特休
```

---

## 資料完整性規則

### 1. 年資範圍不可重疊

**應用層規則：**
```typescript
// 檢查新增的範圍是否與現有重疊
const overlapping = await db.get(`
  SELECT 1 FROM AnnualLeaveRules
  WHERE is_active = TRUE
    AND NOT (years_of_service_end < ? OR years_of_service_start > ?)
`, [newStart, newEnd]);

if (overlapping) {
  throw new Error('YEARS_RANGE_OVERLAPPING');
}
```

---

### 2. 年資範圍連續性

- 規則應覆蓋所有年資範圍（0個月 ~ 無上限）
- 不應有間隙

---

### 3. 特休天數上限 30天

```typescript
assert(annual_leave_days >= 0 && annual_leave_days <= 30);
```

---

## 規則變更處理

### 當管理員修改規則時

```typescript
async function updateAnnualLeaveRules(newRules: AnnualLeaveRule[]) {
  // 1. 停用舊規則
  await db.run(`UPDATE AnnualLeaveRules SET is_active = FALSE`);
  
  // 2. 插入新規則
  for (const rule of newRules) {
    await db.run(`
      INSERT INTO AnnualLeaveRules (...) VALUES (...)
    `);
  }
  
  // 3. 重新計算所有員工的特休額度
  await recalculateAllEmployeesAnnualLeave();
}
```

---

## 關聯資料表

### Users - 使用者資料表

**關係：** 透過年資計算關聯

**說明：** 使用 `hire_date` 計算年資，再查詢對應規則

---

### LeaveBalances - 假期餘額

**關係：** 計算結果寫入餘額表

**說明：** 特休額度根據此規則自動計算並更新

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [特休規則 API](../../API規格/業務規則/特休規則/_概覽.md)
- [LeaveTypes](./LeaveTypes.md) - 假別類型

---

**最後更新：** 2025年10月27日



