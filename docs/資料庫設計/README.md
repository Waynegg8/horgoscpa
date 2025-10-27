# 資料庫設計索引

**層級：** 第4層（資料表結構）  
**資料庫：** Cloudflare D1 (SQLite)  
**最後更新：** 2025年10月27日

---

## 概述

本目錄包含所有資料表的詳細設計文檔。每個資料表文檔包含欄位定義、索引、外鍵約束、預設值等。

---

## 資料庫標準規範

### 設計規範（8項標準）

詳見：[資料庫設計](./資料庫設計.md#data-table-design-specification)

1. **命名規範**：PascalCase（如 `Users`、`TimeLogs`）
2. **主鍵規範**：`[table_name]_id`（如 `user_id`、`log_id`）
3. **時間戳**：`created_at`、`updated_at`（自動維護）
4. **軟刪除**：`deleted_at`（NULL = 未刪除）
5. **外鍵約束**：明確定義關聯，啟用級聯操作
6. **索引策略**：常用查詢欄位建立索引
7. **資料完整性**：NOT NULL、DEFAULT、CHECK 約束
8. **可擴展性**：預留 JSON 欄位（`metadata`、`custom_fields`）

---

## 資料表組織

### 按功能模塊組織

```
資料庫設計/
├── 權限系統/
│   └── ModulePermissions.md
├── 業務規則/
│   ├── Holidays.md
│   ├── LeaveTypes.md
│   ├── OvertimeRates.md
│   ├── AnnualLeaveRules.md
│   ├── OtherLeaveRules.md
│   └── ServiceFrequencyTypes.md
├── 補休系統/
│   ├── CompensatoryLeaveBalance.md
│   ├── CompensatoryLeaveTransactions.md
│   └── CompensatoryLeaveUsage.md
└── [其他模塊...]
```

---

## 核心資料表

### 用戶與權限

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Users` | 員工帳號資訊 | [詳細設計](./資料庫設計.md#users) |
| `ModulePermissions` | 員工模塊權限 | [詳細設計](./權限系統/ModulePermissions.md) |

---

### 業務規則

#### 假期規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Holidays` | 國定假日與補班日 | [詳細設計](./業務規則/Holidays.md) |
| `LeaveTypes` | 假別類型（病假、事假等） | [詳細設計](./業務規則/LeaveTypes.md) |
| `OtherLeaveRules` | 其他假期規則（婚假、喪假等） | [詳細設計](./業務規則/OtherLeaveRules.md) |

#### 工時規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `OvertimeRates` | 加班費率設定 | [詳細設計](./業務規則/OvertimeRates.md) |
| `AnnualLeaveRules` | 特休規則（年資對應天數） | [詳細設計](./業務規則/AnnualLeaveRules.md) |

#### 服務規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `ServiceFrequencyTypes` | 服務週期類型 | [詳細設計](./業務規則/ServiceFrequencyTypes.md) |

---

### 補休系統

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `CompensatoryLeaveBalance` | 補休餘額（每員工一筆） | [詳細設計](./補休系統/CompensatoryLeaveBalance.md) |
| `CompensatoryLeaveTransactions` | 補休異動明細（累積記錄） | [詳細設計](./補休系統/CompensatoryLeaveTransactions.md) |
| `CompensatoryLeaveUsage` | 補休使用明細（FIFO追蹤） | [詳細設計](./補休系統/CompensatoryLeaveUsage.md) |

---

### 工時管理

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `TimeLogs` | 工時記錄 | [詳細設計](./資料庫設計.md#timelogs) |
| `WeightedTimeCache` | 加權工時快取 | [詳細設計](./資料庫設計.md#weightedtimecache) |

---

### 客戶與任務

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Clients` | 客戶資訊 | [詳細設計](./資料庫設計.md#clients) |
| `Tasks` | 任務記錄 | [詳細設計](./資料庫設計.md#tasks) |
| `TaskStages` | 任務階段 | [詳細設計](./資料庫設計.md#taskstages) |

---

## 資料表欄位標準

### 必備欄位

所有資料表都應包含：

```sql
CREATE TABLE TableName (
  table_name_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 業務欄位
  ...
  
  -- 標準時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- 軟刪除（可選）
  deleted_at TEXT DEFAULT NULL
);
```

---

### 索引命名規範

```sql
-- 單欄位索引
CREATE INDEX idx_TableName_column_name ON TableName(column_name);

-- 複合索引
CREATE INDEX idx_TableName_col1_col2 ON TableName(col1, col2);

-- 唯一索引
CREATE UNIQUE INDEX idx_TableName_unique_col ON TableName(column_name);
```

---

### 外鍵約束

```sql
FOREIGN KEY (user_id) REFERENCES Users(user_id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
```

**級聯操作類型：**
- `CASCADE` - 級聯刪除/更新
- `SET NULL` - 設為 NULL
- `RESTRICT` - 禁止操作

---

## ER 圖（主要關聯）

```
Users
 ├─→ ModulePermissions
 ├─→ TimeLogs
 ├─→ CompensatoryLeaveBalance
 └─→ Tasks

TimeLogs
 ├─→ OvertimeRates (加班費率)
 ├─→ LeaveTypes (假別類型)
 └─→ Clients (客戶)

CompensatoryLeaveTransactions
 ├─→ Users
 └─→ OvertimeRates (原始費率)

Tasks
 ├─→ Clients
 ├─→ Users (assigned_to)
 └─→ TaskTemplates
```

---

## 相關文檔

- [功能模塊索引](../功能模塊/README.md) - 第1層：功能概覽
- [技術規格索引](../技術規格/README.md) - 第2層：技術實現細節
- [API規格索引](../API規格/README.md) - 第3層：API端點規格
- [資料庫設計](./資料庫設計.md) - 完整資料庫設計文檔

---

**最後更新：** 2025年10月27日



**層級：** 第4層（資料表結構）  
**資料庫：** Cloudflare D1 (SQLite)  
**最後更新：** 2025年10月27日

---

## 概述

本目錄包含所有資料表的詳細設計文檔。每個資料表文檔包含欄位定義、索引、外鍵約束、預設值等。

---

## 資料庫標準規範

### 設計規範（8項標準）

詳見：[資料庫設計](./資料庫設計.md#data-table-design-specification)

1. **命名規範**：PascalCase（如 `Users`、`TimeLogs`）
2. **主鍵規範**：`[table_name]_id`（如 `user_id`、`log_id`）
3. **時間戳**：`created_at`、`updated_at`（自動維護）
4. **軟刪除**：`deleted_at`（NULL = 未刪除）
5. **外鍵約束**：明確定義關聯，啟用級聯操作
6. **索引策略**：常用查詢欄位建立索引
7. **資料完整性**：NOT NULL、DEFAULT、CHECK 約束
8. **可擴展性**：預留 JSON 欄位（`metadata`、`custom_fields`）

---

## 資料表組織

### 按功能模塊組織

```
資料庫設計/
├── 權限系統/
│   └── ModulePermissions.md
├── 業務規則/
│   ├── Holidays.md
│   ├── LeaveTypes.md
│   ├── OvertimeRates.md
│   ├── AnnualLeaveRules.md
│   ├── OtherLeaveRules.md
│   └── ServiceFrequencyTypes.md
├── 補休系統/
│   ├── CompensatoryLeaveBalance.md
│   ├── CompensatoryLeaveTransactions.md
│   └── CompensatoryLeaveUsage.md
└── [其他模塊...]
```

---

## 核心資料表

### 用戶與權限

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Users` | 員工帳號資訊 | [詳細設計](./資料庫設計.md#users) |
| `ModulePermissions` | 員工模塊權限 | [詳細設計](./權限系統/ModulePermissions.md) |

---

### 業務規則

#### 假期規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Holidays` | 國定假日與補班日 | [詳細設計](./業務規則/Holidays.md) |
| `LeaveTypes` | 假別類型（病假、事假等） | [詳細設計](./業務規則/LeaveTypes.md) |
| `OtherLeaveRules` | 其他假期規則（婚假、喪假等） | [詳細設計](./業務規則/OtherLeaveRules.md) |

#### 工時規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `OvertimeRates` | 加班費率設定 | [詳細設計](./業務規則/OvertimeRates.md) |
| `AnnualLeaveRules` | 特休規則（年資對應天數） | [詳細設計](./業務規則/AnnualLeaveRules.md) |

#### 服務規則
| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `ServiceFrequencyTypes` | 服務週期類型 | [詳細設計](./業務規則/ServiceFrequencyTypes.md) |

---

### 補休系統

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `CompensatoryLeaveBalance` | 補休餘額（每員工一筆） | [詳細設計](./補休系統/CompensatoryLeaveBalance.md) |
| `CompensatoryLeaveTransactions` | 補休異動明細（累積記錄） | [詳細設計](./補休系統/CompensatoryLeaveTransactions.md) |
| `CompensatoryLeaveUsage` | 補休使用明細（FIFO追蹤） | [詳細設計](./補休系統/CompensatoryLeaveUsage.md) |

---

### 工時管理

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `TimeLogs` | 工時記錄 | [詳細設計](./資料庫設計.md#timelogs) |
| `WeightedTimeCache` | 加權工時快取 | [詳細設計](./資料庫設計.md#weightedtimecache) |

---

### 客戶與任務

| 資料表 | 說明 | 文檔 |
|-------|------|------|
| `Clients` | 客戶資訊 | [詳細設計](./資料庫設計.md#clients) |
| `Tasks` | 任務記錄 | [詳細設計](./資料庫設計.md#tasks) |
| `TaskStages` | 任務階段 | [詳細設計](./資料庫設計.md#taskstages) |

---

## 資料表欄位標準

### 必備欄位

所有資料表都應包含：

```sql
CREATE TABLE TableName (
  table_name_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 業務欄位
  ...
  
  -- 標準時間戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- 軟刪除（可選）
  deleted_at TEXT DEFAULT NULL
);
```

---

### 索引命名規範

```sql
-- 單欄位索引
CREATE INDEX idx_TableName_column_name ON TableName(column_name);

-- 複合索引
CREATE INDEX idx_TableName_col1_col2 ON TableName(col1, col2);

-- 唯一索引
CREATE UNIQUE INDEX idx_TableName_unique_col ON TableName(column_name);
```

---

### 外鍵約束

```sql
FOREIGN KEY (user_id) REFERENCES Users(user_id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
```

**級聯操作類型：**
- `CASCADE` - 級聯刪除/更新
- `SET NULL` - 設為 NULL
- `RESTRICT` - 禁止操作

---

## ER 圖（主要關聯）

```
Users
 ├─→ ModulePermissions
 ├─→ TimeLogs
 ├─→ CompensatoryLeaveBalance
 └─→ Tasks

TimeLogs
 ├─→ OvertimeRates (加班費率)
 ├─→ LeaveTypes (假別類型)
 └─→ Clients (客戶)

CompensatoryLeaveTransactions
 ├─→ Users
 └─→ OvertimeRates (原始費率)

Tasks
 ├─→ Clients
 ├─→ Users (assigned_to)
 └─→ TaskTemplates
```

---

## 相關文檔

- [功能模塊索引](../功能模塊/README.md) - 第1層：功能概覽
- [技術規格索引](../技術規格/README.md) - 第2層：技術實現細節
- [API規格索引](../API規格/README.md) - 第3層：API端點規格
- [資料庫設計](./資料庫設計.md) - 完整資料庫設計文檔

---

**最後更新：** 2025年10月27日



