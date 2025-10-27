# ServiceFrequencyTypes - 服務週期類型

**用途：** 定義服務的週期類型選項（月、雙月、季、年等）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE ServiceFrequencyTypes (
  frequency_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,                -- 週期類型名稱（如：月、雙月、季）
  description TEXT,
  sort_order INTEGER DEFAULT 0,             -- 排序順序
  is_active BOOLEAN DEFAULT TRUE,           -- 是否啟用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `frequency_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `name` | TEXT | 週期類型名稱 | NOT NULL, UNIQUE |
| `description` | TEXT | 說明 | 可選 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 名稱查詢
CREATE UNIQUE INDEX idx_service_freq_types_name 
ON ServiceFrequencyTypes(name);

-- 排序查詢
CREATE INDEX idx_service_freq_types_sort 
ON ServiceFrequencyTypes(is_active, sort_order);
```

---

## 範例資料

```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order) VALUES
('每月', '每個月執行一次', 1),
('雙月', '每兩個月執行一次', 2),
('季', '每季執行一次', 3),
('半年', '每半年執行一次', 4),
('年', '每年執行一次', 5),
('一次性', '僅執行一次', 6),
('不定期', '無固定週期', 7);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的週期類型

```sql
SELECT 
  frequency_id,
  name,
  description
FROM ServiceFrequencyTypes
WHERE is_active = TRUE
ORDER BY sort_order;
```

**使用場景：** 前端下拉選單顯示

---

### 查詢 2：新增週期類型

```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order)
VALUES (?, ?, ?);
```

**範例：** 新增「每週」週期
```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order)
VALUES ('每週', '每週執行一次', 0);
```

---

### 查詢 3：停用週期類型（軟刪除）

```sql
UPDATE ServiceFrequencyTypes
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE frequency_id = ?;
```

---

### 查詢 4：批量排序

```sql
-- 拖曳排序後批量更新
UPDATE ServiceFrequencyTypes
SET sort_order = ?
WHERE frequency_id = ?;
```

---

### 查詢 5：檢查是否被使用

```sql
SELECT COUNT(*) AS usage_count
FROM ClientServices
WHERE frequency_type_id = ?;
```

**說明：** 刪除前檢查，避免影響已設定的客戶服務

---

## 使用場景

### 場景 1：服務項目管理

管理員新增服務項目「記帳服務」時，提示：
```
是否為週期性服務？
☑ 是 → 前往「業務規則 → 週期類型」設定週期
☐ 否
```

---

### 場景 2：客戶服務設定

為客戶設定服務時，選擇週期：
```
客戶：ABC公司
服務：記帳服務
週期：[每月 ▾]
      ├─ 每月
      ├─ 雙月
      ├─ 季
      ├─ 半年
      ├─ 年
      ├─ 一次性
      └─ 不定期
```

**注意：** 週期類型只定義選項，具體執行日期在「客戶服務設定」中精確到天設定。

---

## 前端顯示範例

### 管理介面

```
┌─────────────────────────────────────┐
│ 服務週期類型管理                     │
├─────────┬───────────┬───────┬──────┤
│ 拖曳排序 │ 名稱      │ 說明   │ 操作 │
├─────────┼───────────┼───────┼──────┤
│ ⋮⋮      │ 每月      │ 每個月 │ 編輯 │
│ ⋮⋮      │ 雙月      │ 每兩月 │ 編輯 │
│ ⋮⋮      │ 季        │ 每季   │ 編輯 │
│ ⋮⋮      │ 半年      │ 每半年 │ 編輯 │
│ ⋮⋮      │ 年        │ 每年   │ 編輯 │
└─────────┴───────────┴───────┴──────┘
         [+ 新增週期類型]
```

---

## 資料完整性規則

### 1. 名稱唯一性

```sql
UNIQUE(name)
```

---

### 2. 軟刪除機制

- 不直接刪除已被使用的週期類型
- 使用 `is_active = FALSE` 停用
- 前端下拉選單不顯示已停用的類型
- 已設定的客戶服務仍保留停用類型的關聯

---

### 3. 刪除前檢查

```typescript
async function deleteFrequencyType(frequencyId: number) {
  // 檢查是否被使用
  const usage = await db.get(`
    SELECT COUNT(*) AS count
    FROM ClientServices
    WHERE frequency_type_id = ?
  `, [frequencyId]);
  
  if (usage.count > 0) {
    throw new Error('FREQUENCY_TYPE_IN_USE');
  }
  
  // 可安全刪除
  await db.run(`
    DELETE FROM ServiceFrequencyTypes WHERE frequency_id = ?
  `, [frequencyId]);
}
```

---

## 與客戶服務設定的關係

### ServiceFrequencyTypes（通用週期類型）

- **用途：** 定義週期選項（月、季、年等）
- **層級：** 全公司共用
- **範例：** 每月、雙月、季

### ClientServices（客戶服務設定）

- **用途：** 為特定客戶的特定服務設定具體執行時間
- **層級：** 客戶特定
- **範例：** 
  - ABC公司 - 記帳服務 - 每月 - 每月5日執行
  - XYZ公司 - 記帳服務 - 每月 - 每月10日執行

**說明：** 週期類型只是選項，具體日期由「客戶服務設定」精確到天設定。

---

## 關聯資料表

### ClientServices - 客戶服務設定

**關係：** 1:N

**說明：** 客戶服務引用週期類型

```sql
CREATE TABLE ClientServices (
  ...
  frequency_type_id INTEGER,
  execution_dates TEXT,  -- JSON array: ["2025-10-05", "2025-11-05", ...]
  ...
  FOREIGN KEY (frequency_type_id) REFERENCES ServiceFrequencyTypes(frequency_id)
);
```

---

## 擴展性設計

### 未來可能新增的週期類型

```sql
-- 事務所推出新服務模式
INSERT INTO ServiceFrequencyTypes (name, description, sort_order) VALUES
('每週', '每週執行一次', 0),
('每兩週', '每兩週執行一次', 1),
('客製化', '依客戶需求自訂週期', 99);
```

**靈活性：** 管理員可隨時新增，無需修改代碼

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [功能模塊 - 服務項目管理](../../功能模塊/03-服務項目管理.md)
- [功能模塊 - 客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [週期類型 API](../../API規格/業務規則/週期類型/_概覽.md)

---

**最後更新：** 2025年10月27日



**用途：** 定義服務的週期類型選項（月、雙月、季、年等）  
**所屬功能：** [業務規則管理](../../功能模塊/02-業務規則管理.md)  
**最後更新：** 2025年10月27日

---

## 表格結構

```sql
CREATE TABLE ServiceFrequencyTypes (
  frequency_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,                -- 週期類型名稱（如：月、雙月、季）
  description TEXT,
  sort_order INTEGER DEFAULT 0,             -- 排序順序
  is_active BOOLEAN DEFAULT TRUE,           -- 是否啟用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| `frequency_id` | INTEGER | 主鍵 | PRIMARY KEY, AUTO INCREMENT |
| `name` | TEXT | 週期類型名稱 | NOT NULL, UNIQUE |
| `description` | TEXT | 說明 | 可選 |
| `sort_order` | INTEGER | 排序順序 | DEFAULT 0 |
| `is_active` | BOOLEAN | 是否啟用 | DEFAULT TRUE |
| `created_at` | TIMESTAMP | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 索引

```sql
-- 名稱查詢
CREATE UNIQUE INDEX idx_service_freq_types_name 
ON ServiceFrequencyTypes(name);

-- 排序查詢
CREATE INDEX idx_service_freq_types_sort 
ON ServiceFrequencyTypes(is_active, sort_order);
```

---

## 範例資料

```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order) VALUES
('每月', '每個月執行一次', 1),
('雙月', '每兩個月執行一次', 2),
('季', '每季執行一次', 3),
('半年', '每半年執行一次', 4),
('年', '每年執行一次', 5),
('一次性', '僅執行一次', 6),
('不定期', '無固定週期', 7);
```

---

## 常用查詢

### 查詢 1：獲取所有啟用的週期類型

```sql
SELECT 
  frequency_id,
  name,
  description
FROM ServiceFrequencyTypes
WHERE is_active = TRUE
ORDER BY sort_order;
```

**使用場景：** 前端下拉選單顯示

---

### 查詢 2：新增週期類型

```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order)
VALUES (?, ?, ?);
```

**範例：** 新增「每週」週期
```sql
INSERT INTO ServiceFrequencyTypes (name, description, sort_order)
VALUES ('每週', '每週執行一次', 0);
```

---

### 查詢 3：停用週期類型（軟刪除）

```sql
UPDATE ServiceFrequencyTypes
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE frequency_id = ?;
```

---

### 查詢 4：批量排序

```sql
-- 拖曳排序後批量更新
UPDATE ServiceFrequencyTypes
SET sort_order = ?
WHERE frequency_id = ?;
```

---

### 查詢 5：檢查是否被使用

```sql
SELECT COUNT(*) AS usage_count
FROM ClientServices
WHERE frequency_type_id = ?;
```

**說明：** 刪除前檢查，避免影響已設定的客戶服務

---

## 使用場景

### 場景 1：服務項目管理

管理員新增服務項目「記帳服務」時，提示：
```
是否為週期性服務？
☑ 是 → 前往「業務規則 → 週期類型」設定週期
☐ 否
```

---

### 場景 2：客戶服務設定

為客戶設定服務時，選擇週期：
```
客戶：ABC公司
服務：記帳服務
週期：[每月 ▾]
      ├─ 每月
      ├─ 雙月
      ├─ 季
      ├─ 半年
      ├─ 年
      ├─ 一次性
      └─ 不定期
```

**注意：** 週期類型只定義選項，具體執行日期在「客戶服務設定」中精確到天設定。

---

## 前端顯示範例

### 管理介面

```
┌─────────────────────────────────────┐
│ 服務週期類型管理                     │
├─────────┬───────────┬───────┬──────┤
│ 拖曳排序 │ 名稱      │ 說明   │ 操作 │
├─────────┼───────────┼───────┼──────┤
│ ⋮⋮      │ 每月      │ 每個月 │ 編輯 │
│ ⋮⋮      │ 雙月      │ 每兩月 │ 編輯 │
│ ⋮⋮      │ 季        │ 每季   │ 編輯 │
│ ⋮⋮      │ 半年      │ 每半年 │ 編輯 │
│ ⋮⋮      │ 年        │ 每年   │ 編輯 │
└─────────┴───────────┴───────┴──────┘
         [+ 新增週期類型]
```

---

## 資料完整性規則

### 1. 名稱唯一性

```sql
UNIQUE(name)
```

---

### 2. 軟刪除機制

- 不直接刪除已被使用的週期類型
- 使用 `is_active = FALSE` 停用
- 前端下拉選單不顯示已停用的類型
- 已設定的客戶服務仍保留停用類型的關聯

---

### 3. 刪除前檢查

```typescript
async function deleteFrequencyType(frequencyId: number) {
  // 檢查是否被使用
  const usage = await db.get(`
    SELECT COUNT(*) AS count
    FROM ClientServices
    WHERE frequency_type_id = ?
  `, [frequencyId]);
  
  if (usage.count > 0) {
    throw new Error('FREQUENCY_TYPE_IN_USE');
  }
  
  // 可安全刪除
  await db.run(`
    DELETE FROM ServiceFrequencyTypes WHERE frequency_id = ?
  `, [frequencyId]);
}
```

---

## 與客戶服務設定的關係

### ServiceFrequencyTypes（通用週期類型）

- **用途：** 定義週期選項（月、季、年等）
- **層級：** 全公司共用
- **範例：** 每月、雙月、季

### ClientServices（客戶服務設定）

- **用途：** 為特定客戶的特定服務設定具體執行時間
- **層級：** 客戶特定
- **範例：** 
  - ABC公司 - 記帳服務 - 每月 - 每月5日執行
  - XYZ公司 - 記帳服務 - 每月 - 每月10日執行

**說明：** 週期類型只是選項，具體日期由「客戶服務設定」精確到天設定。

---

## 關聯資料表

### ClientServices - 客戶服務設定

**關係：** 1:N

**說明：** 客戶服務引用週期類型

```sql
CREATE TABLE ClientServices (
  ...
  frequency_type_id INTEGER,
  execution_dates TEXT,  -- JSON array: ["2025-10-05", "2025-11-05", ...]
  ...
  FOREIGN KEY (frequency_type_id) REFERENCES ServiceFrequencyTypes(frequency_id)
);
```

---

## 擴展性設計

### 未來可能新增的週期類型

```sql
-- 事務所推出新服務模式
INSERT INTO ServiceFrequencyTypes (name, description, sort_order) VALUES
('每週', '每週執行一次', 0),
('每兩週', '每兩週執行一次', 1),
('客製化', '依客戶需求自訂週期', 99);
```

**靈活性：** 管理員可隨時新增，無需修改代碼

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [功能模塊 - 服務項目管理](../../功能模塊/03-服務項目管理.md)
- [功能模塊 - 客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [週期類型 API](../../API規格/業務規則/週期類型/_概覽.md)

---

**最後更新：** 2025年10月27日



