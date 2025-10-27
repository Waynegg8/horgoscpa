# ClientServices 資料表

**用途：** 儲存客戶訂閱的服務項目及其設定（頻率、費用、任務模板）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,                      -- 客戶統編
  service_id INTEGER NOT NULL,                  -- 服務項目ID
  frequency_type_id INTEGER,                    -- 週期類型ID（雙月、每月等）
  trigger_months TEXT,                          -- JSON: 觸發月份 [1,3,5,7,9,11]
  fee_amount DECIMAL,                           -- 服務費用
  task_template_id INTEGER,                     -- 關聯的任務模板
  difficulty TEXT,                              -- 難易度（簡單/中等/困難）
  start_date TEXT,                              -- 服務開始日期
  end_date TEXT,                                -- 服務結束日期（NULL = 持續中）
  is_active BOOLEAN DEFAULT 1,                  -- 是否啟用
  notes TEXT,                                   -- 備註
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (frequency_type_id) REFERENCES ServiceFrequencyTypes(frequency_type_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `client_service_id` | INTEGER | ✅ | 主鍵（自動遞增）|
| `client_id` | TEXT | ✅ | 客戶統編（8位數字）|
| `service_id` | INTEGER | ✅ | 服務項目ID（關聯 Services 表）|
| `frequency_type_id` | INTEGER | ❌ | 週期類型ID（雙月、每月、單次等）|
| `trigger_months` | TEXT | ❌ | 觸發月份JSON（如：`[1,3,5,7,9,11]`）|
| `fee_amount` | DECIMAL | ❌ | 服務費用 |
| `task_template_id` | INTEGER | ❌ | 關聯的任務模板 |
| `difficulty` | TEXT | ❌ | 難易度（簡單/中等/困難）|
| `start_date` | TEXT | ❌ | 服務開始日期 |
| `end_date` | TEXT | ❌ | 服務結束日期（NULL = 持續中）|
| `is_active` | BOOLEAN | ❌ | 是否啟用（預設1）|
| `notes` | TEXT | ❌ | 備註 |
| `created_by` | INTEGER | ❌ | 創建者ID |
| `created_at` | TEXT | ❌ | 創建時間 |
| `updated_at` | TEXT | ❌ | 更新時間 |
| `is_deleted` | BOOLEAN | ❌ | 軟刪除標記 |
| `deleted_at` | TEXT | ❌ | 刪除時間 |
| `deleted_by` | INTEGER | ❌ | 刪除者ID |

---

## 範例資料

### 雙月記帳服務
```sql
INSERT INTO ClientServices (
  client_service_id, client_id, service_id, frequency_type_id,
  trigger_months, fee_amount, task_template_id, difficulty
) VALUES (
  1, '12345678', 3, 2,
  '[1,3,5,7,9,11]', 15000, 1, '中等'
);
```

### 每月工商服務
```sql
INSERT INTO ClientServices (
  client_service_id, client_id, service_id, frequency_type_id,
  trigger_months, fee_amount, difficulty
) VALUES (
  2, '12345678', 6, 1,
  '[1,2,3,4,5,6,7,8,9,10,11,12]', 5000, '簡單'
);
```

### 單次性服務（公司設立）
```sql
INSERT INTO ClientServices (
  client_service_id, client_id, service_id, frequency_type_id,
  fee_amount, start_date, end_date, difficulty
) VALUES (
  3, '87654321', 6, 3,
  50000, '2025-01-01', '2025-01-31', '困難'
);
```

---

## 索引設計

```sql
-- 加快客戶查詢
CREATE INDEX idx_client_services_client ON ClientServices(client_id) 
WHERE is_deleted = 0;

-- 加快服務項目查詢
CREATE INDEX idx_client_services_service ON ClientServices(service_id) 
WHERE is_deleted = 0;

-- 加快週期類型查詢
CREATE INDEX idx_client_services_frequency ON ClientServices(frequency_type_id) 
WHERE is_deleted = 0 AND is_active = 1;

-- 複合索引（客戶+服務唯一性）
CREATE UNIQUE INDEX idx_client_services_unique 
ON ClientServices(client_id, service_id) 
WHERE is_deleted = 0;
```

---

## 查詢範例

### 查詢客戶的所有服務
```sql
SELECT 
  cs.client_service_id,
  cs.client_id,
  c.company_name,
  s.service_name,
  ft.frequency_name,
  cs.trigger_months,
  cs.fee_amount,
  cs.difficulty,
  cs.is_active
FROM ClientServices cs
JOIN Clients c ON cs.client_id = c.client_id
JOIN Services s ON cs.service_id = s.service_id
LEFT JOIN ServiceFrequencyTypes ft ON cs.frequency_type_id = ft.frequency_type_id
WHERE cs.client_id = '12345678' 
  AND cs.is_deleted = 0
ORDER BY cs.created_at DESC;
```

### 查詢特定月份需要執行的服務
```sql
-- 查詢1月份需要執行的服務
SELECT 
  cs.client_service_id,
  cs.client_id,
  c.company_name,
  s.service_name,
  cs.fee_amount
FROM ClientServices cs
JOIN Clients c ON cs.client_id = c.client_id
JOIN Services s ON cs.service_id = s.service_id
WHERE cs.is_deleted = 0 
  AND cs.is_active = 1
  AND json_array_length(cs.trigger_months) > 0
  AND json_extract(cs.trigger_months, '$') LIKE '%1%'
ORDER BY c.company_name;
```

### 查詢服務的總金額
```sql
SELECT 
  client_id,
  SUM(fee_amount) as total_fee
FROM ClientServices
WHERE is_deleted = 0 AND is_active = 1
GROUP BY client_id;
```

---

## 業務規則

### 唯一性規則
- 同一客戶不能重複訂閱同一服務項目
- 透過 UNIQUE INDEX 強制執行

### 觸發月份規則
- `trigger_months` 為 JSON 陣列：`[1,3,5,7,9,11]`
- 值範圍：1-12
- 用於 Cron Job 自動建立任務

### 難易度規則
- **簡單**：標準流程，工時少
- **中等**：一般複雜度
- **困難**：複雜流程，工時多

### 服務狀態
- **啟用中**：`is_active = 1`, `end_date IS NULL`
- **已停用**：`is_active = 0`
- **已結束**：`end_date < 今天`

---

## 自動化流程整合

### Cron Job 邏輯
```typescript
// 每月1日執行
async function createMonthlyTasks() {
  const currentMonth = new Date().getMonth() + 1;
  
  // 查詢本月需執行的服務
  const services = await db.prepare(`
    SELECT * FROM ClientServices 
    WHERE is_deleted = 0 
      AND is_active = 1
      AND json_extract(trigger_months, '$') LIKE ?
  `).bind(`%${currentMonth}%`).all();
  
  for (const service of services.results) {
    // 建立任務實例
    await createTaskInstance(service);
  }
}
```

---

## 關聯資料表

### Clients（客戶）
```sql
FOREIGN KEY (client_id) REFERENCES Clients(client_id)
```

### Services（服務項目）
```sql
FOREIGN KEY (service_id) REFERENCES Services(service_id)
```

### ServiceFrequencyTypes（週期類型）
```sql
FOREIGN KEY (frequency_type_id) REFERENCES ServiceFrequencyTypes(frequency_type_id)
```

### TaskTemplates（任務模板）
```sql
FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
```

---

## 歷史記錄設計

### 方案1：使用軟刪除
- 服務修改時不刪除舊記錄
- 透過 `updated_at` 追蹤變更

### 方案2：建立歷史表（未來考慮）
```sql
CREATE TABLE ClientServicesHistory (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER,
  -- 複製所有欄位 --
  changed_at TEXT,
  changed_by INTEGER
);
```

---

## 相關文檔

- [功能模塊 - 客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [API規格 - 客戶服務](../../API規格/客戶服務/_概覽.md)
- [Clients 資料表](../核心業務/Clients.md)
- [Services 資料表](../../資料庫設計/服務項目/Services.md)
- [ServiceFrequencyTypes 資料表](../業務規則/ServiceFrequencyTypes.md)


