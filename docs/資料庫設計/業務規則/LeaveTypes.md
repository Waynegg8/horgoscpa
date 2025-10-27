# LeaveTypes - 假別類型

**用途：** 管理權益型假別（病假、事假、生理假、補休等）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE LeaveTypes (
  leave_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                -- 假別代碼（如：sick_leave）
  name TEXT NOT NULL,                       -- 假別名稱（如：病假）
  gender_restriction TEXT,                  -- male/female/null（無限制）
  annual_quota_days REAL,                   -- 年度額度（天），NULL=無上限
  pay_rate REAL NOT NULL DEFAULT 1.0,       -- 薪資比例（0.0-1.0）
  requires_proof BOOLEAN DEFAULT FALSE,     -- 是否需證明文件
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
| `leave_type_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `code` | TEXT | 假別代碼 | NOT NULL, UNIQUE |
| `name` | TEXT | 假別名稱 | NOT NULL |
| `gender_restriction` | TEXT | 性別限制 | male/female/null |
| `annual_quota_days` | REAL | 年度額度（天） | NULL=無上限 |
| `pay_rate` | REAL | 薪資比例 | NOT NULL, DEFAULT 1.0, 範圍：0.0-1.0 |
| `requires_proof` | BOOLEAN | 是否需證明 | DEFAULT FALSE |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE, 軟刪除 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 範例資料（符合台灣勞基法）

```sql
INSERT INTO LeaveTypes (code, name, gender_restriction, annual_quota_days, pay_rate, requires_proof, description, sort_order) VALUES
-- 病假
('sick_leave', '病假', NULL, 30, 0.5, TRUE, '全年30天，薪資半薪，超過30天扣全薪', 1),

-- 事假
('personal_leave', '事假', NULL, 14, 0.0, FALSE, '全年14天，無薪', 2),

-- 生理假
('menstrual_leave', '生理假', 'female', 12, 0.5, FALSE, '每月1天，併入病假計算，薪資半薪', 3),

-- 補休
('compensatory_leave', '補休', NULL, NULL, 1.0, FALSE, '加班累積補休，全薪', 4),

-- 特休（由系統自動計算，不在此設定額度）
('annual_leave', '特休', NULL, NULL, 1.0, FALSE, '依年資計算，全薪', 5);
```

---

## 索引

```sql
-- 代碼查詢（最常用）
CREATE UNIQUE INDEX idx_leave_types_code ON LeaveTypes(code);

-- 排序查詢
CREATE INDEX idx_leave_types_active_sort ON LeaveTypes(is_active, sort_order);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的假別

```sql
SELECT 
  leave_type_id,
  code,
  name,
  gender_restriction,
  annual_quota_days,
  pay_rate
FROM LeaveTypes
WHERE is_active = TRUE
ORDER BY sort_order;
```

---

### 查詢 2：根據員工性別過濾可用假別

```sql
SELECT *
FROM LeaveTypes
WHERE is_active = TRUE
  AND (gender_restriction IS NULL OR gender_restriction = ?)
ORDER BY sort_order;
```

**範例：** 女性員工可看到生理假，男性員工看不到

---

### 查詢 3：檢查假別是否需要證明文件

```sql
SELECT requires_proof
FROM LeaveTypes
WHERE code = ?;
```

---

### 查詢 4：計算員工的假別餘額

```sql
-- 與 LeaveBalances 表聯合查詢
SELECT 
  lt.name,
  lt.annual_quota_days,
  COALESCE(lb.used_days, 0) AS used_days,
  lt.annual_quota_days - COALESCE(lb.used_days, 0) AS remaining_days
FROM LeaveTypes lt
LEFT JOIN LeaveBalances lb ON lt.leave_type_id = lb.leave_type_id AND lb.user_id = ?
WHERE lt.is_active = TRUE AND lt.annual_quota_days IS NOT NULL;
```

---

### 查詢 5：軟刪除（停用）

```sql
-- 不直接刪除，改為停用
UPDATE LeaveTypes
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE leave_type_id = ?;
```

---

## 特殊假別說明

### 1. 病假（sick_leave）

- **額度：** 30天/年
- **薪資：** 半薪（50%）
- **特殊規則：** 
  - 超過30天扣全薪
  - 可能需要醫生證明（depends on policy）

---

### 2. 生理假（menstrual_leave）

- **額度：** 12天/年（每月1天）
- **薪資：** 半薪（50%）
- **性別限制：** 僅女性
- **特殊規則：** 併入病假額度計算

---

### 3. 補休（compensatory_leave）

- **額度：** 無上限（依加班累積）
- **薪資：** 全薪（100%）
- **特殊規則：** 
  - 由加班自動累積
  - 月底未使用自動轉加班費

---

### 4. 特休（annual_leave）

- **額度：** 依年資計算（見 AnnualLeaveRules）
- **薪資：** 全薪（100%）
- **特殊規則：** 
  - 依到職日精確計算年資
  - 系統自動計算額度

---

## 資料完整性規則

### 1. 代碼唯一性

```sql
UNIQUE(code)
```

---

### 2. 薪資比例範圍（應用層）

```typescript
assert(pay_rate >= 0.0 && pay_rate <= 1.0);
```

---

### 3. 性別限制驗證（應用層）

```typescript
const validGenders = ['male', 'female', null];
assert(validGenders.includes(gender_restriction));
```

---

### 4. 軟刪除機制

- 停用後仍保留記錄
- 歷史請假記錄不受影響
- 新請假申請無法選擇已停用的假別

---

## 關聯資料表

### LeaveBalances - 假期餘額

**關係：** 1:N

**說明：** 每個假別對應多個員工的餘額記錄

---

### TimeLogs - 工時記錄

**關係：** 1:N

**說明：** 請假記錄關聯到假別類型

---

### OtherLeaveRules - 其他假期規則

**關係：** 無直接關聯

**區別：**
- LeaveTypes：權益型假別（年度額度）
- OtherLeaveRules：事件型假別（婚假、喪假等）

---

## 前端顯示範例

### 請假申請下拉選單

```
可用假別：
☑ 病假（剩餘：25天）
☑ 事假（剩餘：10天）
☑ 生理假（剩餘：8天）  ← 僅女性可見
☑ 補休（剩餘：8小時）
☑ 特休（剩餘：7天）
```

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [假別類型 API](../../API規格/業務規則/假別類型/_概覽.md)
- [OtherLeaveRules](./OtherLeaveRules.md) - 其他假期規則（事件型）
- [AnnualLeaveRules](./AnnualLeaveRules.md) - 特休規則

---

**最後更新：** 2025年10月27日



**用途：** 管理權益型假別（病假、事假、生理假、補休等）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE LeaveTypes (
  leave_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                -- 假別代碼（如：sick_leave）
  name TEXT NOT NULL,                       -- 假別名稱（如：病假）
  gender_restriction TEXT,                  -- male/female/null（無限制）
  annual_quota_days REAL,                   -- 年度額度（天），NULL=無上限
  pay_rate REAL NOT NULL DEFAULT 1.0,       -- 薪資比例（0.0-1.0）
  requires_proof BOOLEAN DEFAULT FALSE,     -- 是否需證明文件
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
| `leave_type_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `code` | TEXT | 假別代碼 | NOT NULL, UNIQUE |
| `name` | TEXT | 假別名稱 | NOT NULL |
| `gender_restriction` | TEXT | 性別限制 | male/female/null |
| `annual_quota_days` | REAL | 年度額度（天） | NULL=無上限 |
| `pay_rate` | REAL | 薪資比例 | NOT NULL, DEFAULT 1.0, 範圍：0.0-1.0 |
| `requires_proof` | BOOLEAN | 是否需證明 | DEFAULT FALSE |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE, 軟刪除 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 範例資料（符合台灣勞基法）

```sql
INSERT INTO LeaveTypes (code, name, gender_restriction, annual_quota_days, pay_rate, requires_proof, description, sort_order) VALUES
-- 病假
('sick_leave', '病假', NULL, 30, 0.5, TRUE, '全年30天，薪資半薪，超過30天扣全薪', 1),

-- 事假
('personal_leave', '事假', NULL, 14, 0.0, FALSE, '全年14天，無薪', 2),

-- 生理假
('menstrual_leave', '生理假', 'female', 12, 0.5, FALSE, '每月1天，併入病假計算，薪資半薪', 3),

-- 補休
('compensatory_leave', '補休', NULL, NULL, 1.0, FALSE, '加班累積補休，全薪', 4),

-- 特休（由系統自動計算，不在此設定額度）
('annual_leave', '特休', NULL, NULL, 1.0, FALSE, '依年資計算，全薪', 5);
```

---

## 索引

```sql
-- 代碼查詢（最常用）
CREATE UNIQUE INDEX idx_leave_types_code ON LeaveTypes(code);

-- 排序查詢
CREATE INDEX idx_leave_types_active_sort ON LeaveTypes(is_active, sort_order);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的假別

```sql
SELECT 
  leave_type_id,
  code,
  name,
  gender_restriction,
  annual_quota_days,
  pay_rate
FROM LeaveTypes
WHERE is_active = TRUE
ORDER BY sort_order;
```

---

### 查詢 2：根據員工性別過濾可用假別

```sql
SELECT *
FROM LeaveTypes
WHERE is_active = TRUE
  AND (gender_restriction IS NULL OR gender_restriction = ?)
ORDER BY sort_order;
```

**範例：** 女性員工可看到生理假，男性員工看不到

---

### 查詢 3：檢查假別是否需要證明文件

```sql
SELECT requires_proof
FROM LeaveTypes
WHERE code = ?;
```

---

### 查詢 4：計算員工的假別餘額

```sql
-- 與 LeaveBalances 表聯合查詢
SELECT 
  lt.name,
  lt.annual_quota_days,
  COALESCE(lb.used_days, 0) AS used_days,
  lt.annual_quota_days - COALESCE(lb.used_days, 0) AS remaining_days
FROM LeaveTypes lt
LEFT JOIN LeaveBalances lb ON lt.leave_type_id = lb.leave_type_id AND lb.user_id = ?
WHERE lt.is_active = TRUE AND lt.annual_quota_days IS NOT NULL;
```

---

### 查詢 5：軟刪除（停用）

```sql
-- 不直接刪除，改為停用
UPDATE LeaveTypes
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE leave_type_id = ?;
```

---

## 特殊假別說明

### 1. 病假（sick_leave）

- **額度：** 30天/年
- **薪資：** 半薪（50%）
- **特殊規則：** 
  - 超過30天扣全薪
  - 可能需要醫生證明（depends on policy）

---

### 2. 生理假（menstrual_leave）

- **額度：** 12天/年（每月1天）
- **薪資：** 半薪（50%）
- **性別限制：** 僅女性
- **特殊規則：** 併入病假額度計算

---

### 3. 補休（compensatory_leave）

- **額度：** 無上限（依加班累積）
- **薪資：** 全薪（100%）
- **特殊規則：** 
  - 由加班自動累積
  - 月底未使用自動轉加班費

---

### 4. 特休（annual_leave）

- **額度：** 依年資計算（見 AnnualLeaveRules）
- **薪資：** 全薪（100%）
- **特殊規則：** 
  - 依到職日精確計算年資
  - 系統自動計算額度

---

## 資料完整性規則

### 1. 代碼唯一性

```sql
UNIQUE(code)
```

---

### 2. 薪資比例範圍（應用層）

```typescript
assert(pay_rate >= 0.0 && pay_rate <= 1.0);
```

---

### 3. 性別限制驗證（應用層）

```typescript
const validGenders = ['male', 'female', null];
assert(validGenders.includes(gender_restriction));
```

---

### 4. 軟刪除機制

- 停用後仍保留記錄
- 歷史請假記錄不受影響
- 新請假申請無法選擇已停用的假別

---

## 關聯資料表

### LeaveBalances - 假期餘額

**關係：** 1:N

**說明：** 每個假別對應多個員工的餘額記錄

---

### TimeLogs - 工時記錄

**關係：** 1:N

**說明：** 請假記錄關聯到假別類型

---

### OtherLeaveRules - 其他假期規則

**關係：** 無直接關聯

**區別：**
- LeaveTypes：權益型假別（年度額度）
- OtherLeaveRules：事件型假別（婚假、喪假等）

---

## 前端顯示範例

### 請假申請下拉選單

```
可用假別：
☑ 病假（剩餘：25天）
☑ 事假（剩餘：10天）
☑ 生理假（剩餘：8天）  ← 僅女性可見
☑ 補休（剩餘：8小時）
☑ 特休（剩餘：7天）
```

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [假別類型 API](../../API規格/業務規則/假別類型/_概覽.md)
- [OtherLeaveRules](./OtherLeaveRules.md) - 其他假期規則（事件型）
- [AnnualLeaveRules](./AnnualLeaveRules.md) - 特休規則

---

**最後更新：** 2025年10月27日



