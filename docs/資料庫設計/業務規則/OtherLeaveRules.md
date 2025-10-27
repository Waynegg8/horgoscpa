# OtherLeaveRules - 其他假期規則

**用途：** 管理事件型假別（婚假、喪假、產假等），支援複雜的子類別規則  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE OtherLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,                   -- marriage/bereavement/maternity/miscarriage/prenatal_checkup/paternity
  subcategory TEXT,                         -- 子類別（如：喪假的親屬關係、流產假的懷孕週數）
  leave_days INTEGER NOT NULL,              -- 給假天數
  pay_rate REAL NOT NULL DEFAULT 1.0,       -- 薪資比例
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
| `category` | TEXT | 假別類別 | NOT NULL |
| `subcategory` | TEXT | 子類別 | 可選，用於喪假（親屬）、流產假（週數） |
| `leave_days` | INTEGER | 給假天數 | NOT NULL |
| `pay_rate` | REAL | 薪資比例 | NOT NULL, DEFAULT 1.0 |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 假別類別說明

| 類別 | 英文 | 說明 | 是否有子類別 |
|------|------|------|-------------|
| 婚假 | `marriage` | 結婚給假 | 否 |
| 喪假 | `bereavement` | 親屬過世 | 是（依親屬關係） |
| 產假 | `maternity` | 女性生產 | 否 |
| 流產假 | `miscarriage` | 女性流產 | 是（依懷孕週數） |
| 產檢假 | `prenatal_checkup` | 產檢 | 否 |
| 陪產假 | `paternity` | 配偶生產 | 否 |

---

## 索引

```sql
-- 類別查詢
CREATE INDEX idx_other_leave_rules_category 
ON OtherLeaveRules(category, is_active);

-- 子類別查詢
CREATE INDEX idx_other_leave_rules_subcategory 
ON OtherLeaveRules(category, subcategory, is_active);
```

---

## 範例資料（符合台灣勞基法 - 10條規則）

```sql
INSERT INTO OtherLeaveRules (category, subcategory, leave_days, pay_rate, description, sort_order) VALUES
-- 婚假
('marriage', NULL, 8, 1.0, '勞工結婚給予8日婚假', 1),

-- 喪假（依親屬關係）
('bereavement', 'parent', 8, 1.0, '父母、養父母、繼父母或配偶喪亡', 2),
('bereavement', 'grandparent', 6, 1.0, '祖父母、配偶之祖父母、配偶之父母、子女喪亡', 3),
('bereavement', 'sibling', 3, 1.0, '兄弟姊妹喪亡', 4),

-- 產假（女性）
('maternity', NULL, 56, 1.0, '分娩前後給予8週產假（56天）', 5),

-- 流產假（依懷孕週數）
('miscarriage', 'over20weeks', 28, 1.0, '懷孕滿20週以上流產', 6),
('miscarriage', '12to20weeks', 14, 1.0, '懷孕滿12週但未滿20週流產', 7),
('miscarriage', 'under12weeks', 5, 1.0, '懷孕未滿12週流產', 8),

-- 產檢假
('prenatal_checkup', NULL, 7, 1.0, '妊娠期間產檢假7日', 9),

-- 陪產假
('paternity', NULL, 7, 1.0, '配偶分娩時給予7日陪產假', 10);
```

---

## 常用查詢

### 查詢 1：獲取特定類別的規則

```sql
SELECT 
  rule_id,
  subcategory,
  leave_days,
  pay_rate,
  description
FROM OtherLeaveRules
WHERE category = ? AND is_active = TRUE
ORDER BY sort_order;
```

**範例：** 查詢喪假規則
```sql
WHERE category = 'bereavement'
```
**結果：**
- parent: 8天
- grandparent: 6天
- sibling: 3天

---

### 查詢 2：獲取特定子類別的給假天數

```sql
SELECT leave_days, pay_rate
FROM OtherLeaveRules
WHERE category = ? 
  AND subcategory = ? 
  AND is_active = TRUE;
```

**範例：** 查詢祖父母喪假
```sql
WHERE category = 'bereavement' AND subcategory = 'grandparent'
```
**結果：** 6天，全薪

---

### 查詢 3：獲取所有規則（依類別分組）

```sql
SELECT 
  category,
  subcategory,
  leave_days,
  pay_rate,
  description
FROM OtherLeaveRules
WHERE is_active = TRUE
ORDER BY category, sort_order;
```

---

### 查詢 4：恢復法定預設值

```sql
-- 停用所有現有規則
UPDATE OtherLeaveRules SET is_active = FALSE;

-- 重新插入10條法定規則
INSERT INTO OtherLeaveRules (...) VALUES (...);
```

---

## 業務邏輯範例

### 生活事件登記時計算給假天數

```typescript
async function calculateEventLeave(
  category: string, 
  subcategory?: string
): Promise<{ days: number, payRate: number }> {
  const rule = await db.get(`
    SELECT leave_days, pay_rate
    FROM OtherLeaveRules
    WHERE category = ?
      AND (subcategory = ? OR (subcategory IS NULL AND ? IS NULL))
      AND is_active = TRUE
  `, [category, subcategory, subcategory]);
  
  if (!rule) {
    throw new Error('LEAVE_RULE_NOT_FOUND');
  }
  
  return {
    days: rule.leave_days,
    payRate: rule.pay_rate
  };
}

// 使用範例
const bereavement = await calculateEventLeave('bereavement', 'parent');
// 結果：{ days: 8, payRate: 1.0 }

const miscarriage = await calculateEventLeave('miscarriage', '12to20weeks');
// 結果：{ days: 14, payRate: 1.0 }
```

---

## 前端顯示範例

### 生活事件登記介面

```
請選擇事件類型：
☐ 婚假（8天）
☐ 喪假
  └ 親屬關係：
     ○ 父母、配偶（8天）
     ○ 祖父母、配偶父母、子女（6天）
     ○ 兄弟姊妹（3天）
☐ 產假（56天）
☐ 流產假
  └ 懷孕週數：
     ○ 滿20週以上（28天）
     ○ 滿12週未滿20週（14天）
     ○ 未滿12週（5天）
☐ 產檢假（7天）
☐ 陪產假（7天）
```

---

## 資料完整性規則

### 1. 子類別唯一性

```typescript
// 同一類別的同一子類別只能有一筆記錄
const exists = await db.get(`
  SELECT 1 FROM OtherLeaveRules
  WHERE category = ? 
    AND subcategory = ? 
    AND is_active = TRUE
`, [category, subcategory]);

if (exists) {
  throw new Error('DUPLICATE_SUBCATEGORY');
}
```

---

### 2. 薪資比例範圍

```typescript
assert(pay_rate >= 0.0 && pay_rate <= 1.0);
```

---

### 3. 給假天數合理性

```typescript
assert(leave_days >= 0 && leave_days <= 365);
```

---

## 與 LeaveTypes 的區別

| 比較項 | OtherLeaveRules（事件型） | LeaveTypes（權益型） |
|--------|-------------------------|---------------------|
| **觸發方式** | 特定生活事件發生 | 員工主動申請 |
| **給假方式** | 一次性給假 | 年度額度 |
| **範例** | 婚假、喪假、產假 | 病假、事假、特休 |
| **額度管理** | 事件發生時計算 | 年度重置 |
| **申請流程** | 先登記事件 → 系統給假 → 可請假 | 直接申請請假 |

---

## 關聯資料表

### LifeEvents - 生活事件登記

**關係：** N:1

**說明：** 員工登記生活事件時，查詢此表計算給假天數

---

### LeaveBalances - 假期餘額

**關係：** 計算結果寫入餘額

**說明：** 事件給假後，額度寫入餘額表供員工使用

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [功能模塊 - 生活事件登記](../../功能模塊/12-生活事件登記.md)
- [其他假期規則 API](../../API規格/業務規則/其他假期規則/_概覽.md)
- [LeaveTypes](./LeaveTypes.md) - 假別類型（權益型）

---

**最後更新：** 2025年10月27日



**用途：** 管理事件型假別（婚假、喪假、產假等），支援複雜的子類別規則  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE OtherLeaveRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,                   -- marriage/bereavement/maternity/miscarriage/prenatal_checkup/paternity
  subcategory TEXT,                         -- 子類別（如：喪假的親屬關係、流產假的懷孕週數）
  leave_days INTEGER NOT NULL,              -- 給假天數
  pay_rate REAL NOT NULL DEFAULT 1.0,       -- 薪資比例
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
| `category` | TEXT | 假別類別 | NOT NULL |
| `subcategory` | TEXT | 子類別 | 可選，用於喪假（親屬）、流產假（週數） |
| `leave_days` | INTEGER | 給假天數 | NOT NULL |
| `pay_rate` | REAL | 薪資比例 | NOT NULL, DEFAULT 1.0 |
| `description` | TEXT | 說明 | 可選 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 假別類別說明

| 類別 | 英文 | 說明 | 是否有子類別 |
|------|------|------|-------------|
| 婚假 | `marriage` | 結婚給假 | 否 |
| 喪假 | `bereavement` | 親屬過世 | 是（依親屬關係） |
| 產假 | `maternity` | 女性生產 | 否 |
| 流產假 | `miscarriage` | 女性流產 | 是（依懷孕週數） |
| 產檢假 | `prenatal_checkup` | 產檢 | 否 |
| 陪產假 | `paternity` | 配偶生產 | 否 |

---

## 索引

```sql
-- 類別查詢
CREATE INDEX idx_other_leave_rules_category 
ON OtherLeaveRules(category, is_active);

-- 子類別查詢
CREATE INDEX idx_other_leave_rules_subcategory 
ON OtherLeaveRules(category, subcategory, is_active);
```

---

## 範例資料（符合台灣勞基法 - 10條規則）

```sql
INSERT INTO OtherLeaveRules (category, subcategory, leave_days, pay_rate, description, sort_order) VALUES
-- 婚假
('marriage', NULL, 8, 1.0, '勞工結婚給予8日婚假', 1),

-- 喪假（依親屬關係）
('bereavement', 'parent', 8, 1.0, '父母、養父母、繼父母或配偶喪亡', 2),
('bereavement', 'grandparent', 6, 1.0, '祖父母、配偶之祖父母、配偶之父母、子女喪亡', 3),
('bereavement', 'sibling', 3, 1.0, '兄弟姊妹喪亡', 4),

-- 產假（女性）
('maternity', NULL, 56, 1.0, '分娩前後給予8週產假（56天）', 5),

-- 流產假（依懷孕週數）
('miscarriage', 'over20weeks', 28, 1.0, '懷孕滿20週以上流產', 6),
('miscarriage', '12to20weeks', 14, 1.0, '懷孕滿12週但未滿20週流產', 7),
('miscarriage', 'under12weeks', 5, 1.0, '懷孕未滿12週流產', 8),

-- 產檢假
('prenatal_checkup', NULL, 7, 1.0, '妊娠期間產檢假7日', 9),

-- 陪產假
('paternity', NULL, 7, 1.0, '配偶分娩時給予7日陪產假', 10);
```

---

## 常用查詢

### 查詢 1：獲取特定類別的規則

```sql
SELECT 
  rule_id,
  subcategory,
  leave_days,
  pay_rate,
  description
FROM OtherLeaveRules
WHERE category = ? AND is_active = TRUE
ORDER BY sort_order;
```

**範例：** 查詢喪假規則
```sql
WHERE category = 'bereavement'
```
**結果：**
- parent: 8天
- grandparent: 6天
- sibling: 3天

---

### 查詢 2：獲取特定子類別的給假天數

```sql
SELECT leave_days, pay_rate
FROM OtherLeaveRules
WHERE category = ? 
  AND subcategory = ? 
  AND is_active = TRUE;
```

**範例：** 查詢祖父母喪假
```sql
WHERE category = 'bereavement' AND subcategory = 'grandparent'
```
**結果：** 6天，全薪

---

### 查詢 3：獲取所有規則（依類別分組）

```sql
SELECT 
  category,
  subcategory,
  leave_days,
  pay_rate,
  description
FROM OtherLeaveRules
WHERE is_active = TRUE
ORDER BY category, sort_order;
```

---

### 查詢 4：恢復法定預設值

```sql
-- 停用所有現有規則
UPDATE OtherLeaveRules SET is_active = FALSE;

-- 重新插入10條法定規則
INSERT INTO OtherLeaveRules (...) VALUES (...);
```

---

## 業務邏輯範例

### 生活事件登記時計算給假天數

```typescript
async function calculateEventLeave(
  category: string, 
  subcategory?: string
): Promise<{ days: number, payRate: number }> {
  const rule = await db.get(`
    SELECT leave_days, pay_rate
    FROM OtherLeaveRules
    WHERE category = ?
      AND (subcategory = ? OR (subcategory IS NULL AND ? IS NULL))
      AND is_active = TRUE
  `, [category, subcategory, subcategory]);
  
  if (!rule) {
    throw new Error('LEAVE_RULE_NOT_FOUND');
  }
  
  return {
    days: rule.leave_days,
    payRate: rule.pay_rate
  };
}

// 使用範例
const bereavement = await calculateEventLeave('bereavement', 'parent');
// 結果：{ days: 8, payRate: 1.0 }

const miscarriage = await calculateEventLeave('miscarriage', '12to20weeks');
// 結果：{ days: 14, payRate: 1.0 }
```

---

## 前端顯示範例

### 生活事件登記介面

```
請選擇事件類型：
☐ 婚假（8天）
☐ 喪假
  └ 親屬關係：
     ○ 父母、配偶（8天）
     ○ 祖父母、配偶父母、子女（6天）
     ○ 兄弟姊妹（3天）
☐ 產假（56天）
☐ 流產假
  └ 懷孕週數：
     ○ 滿20週以上（28天）
     ○ 滿12週未滿20週（14天）
     ○ 未滿12週（5天）
☐ 產檢假（7天）
☐ 陪產假（7天）
```

---

## 資料完整性規則

### 1. 子類別唯一性

```typescript
// 同一類別的同一子類別只能有一筆記錄
const exists = await db.get(`
  SELECT 1 FROM OtherLeaveRules
  WHERE category = ? 
    AND subcategory = ? 
    AND is_active = TRUE
`, [category, subcategory]);

if (exists) {
  throw new Error('DUPLICATE_SUBCATEGORY');
}
```

---

### 2. 薪資比例範圍

```typescript
assert(pay_rate >= 0.0 && pay_rate <= 1.0);
```

---

### 3. 給假天數合理性

```typescript
assert(leave_days >= 0 && leave_days <= 365);
```

---

## 與 LeaveTypes 的區別

| 比較項 | OtherLeaveRules（事件型） | LeaveTypes（權益型） |
|--------|-------------------------|---------------------|
| **觸發方式** | 特定生活事件發生 | 員工主動申請 |
| **給假方式** | 一次性給假 | 年度額度 |
| **範例** | 婚假、喪假、產假 | 病假、事假、特休 |
| **額度管理** | 事件發生時計算 | 年度重置 |
| **申請流程** | 先登記事件 → 系統給假 → 可請假 | 直接申請請假 |

---

## 關聯資料表

### LifeEvents - 生活事件登記

**關係：** N:1

**說明：** 員工登記生活事件時，查詢此表計算給假天數

---

### LeaveBalances - 假期餘額

**關係：** 計算結果寫入餘額

**說明：** 事件給假後，額度寫入餘額表供員工使用

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [功能模塊 - 生活事件登記](../../功能模塊/12-生活事件登記.md)
- [其他假期規則 API](../../API規格/業務規則/其他假期規則/_概覽.md)
- [LeaveTypes](./LeaveTypes.md) - 假別類型（權益型）

---

**最後更新：** 2025年10月27日



