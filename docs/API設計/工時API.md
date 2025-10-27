# 工時 API 設計

**API 前綴：** `/api/v1/timesheets`  
**最後更新：** 2025年10月27日

---

## 端點列表

### 獲取工時表

```
GET /api/v1/timesheets?month=2025-11
```

**權限：** 需登入

**查詢參數：**
- `month`: 月份（格式：YYYY-MM）
- `user_id`: 使用者 ID（管理員可查詢其他人，員工僅能查詢自己）

**回應：**
```json
{
  "success": true,
  "data": {
    "month": "2025-11",
    "user": {
      "user_id": 2,
      "name": "紜蓁"
    },
    "logs": [
      {
        "log_id": 101,
        "work_date": "2025-11-01",
        "client_id": "12345678",
        "client_name": "仟鑽企業",
        "business_type": "記帳",
        "work_type": "正常工時",
        "hours": 8.0,
        "weighted_hours": 8.0
      },
      {
        "log_id": 102,
        "work_date": "2025-11-04",
        "client_id": "87654321",
        "business_type": "工商",
        "work_type": "平日加班(1.34)",
        "hours": 2.0,
        "weighted_hours": 2.68
      }
    ],
    "holidays": [
      {
        "date": "2025-11-10",
        "name": "國慶日補假"
      }
    ],
    "summary": {
      "total_hours": 56.0,
      "weighted_hours": 64.5,
      "leave_hours": 8.0
    }
  }
}
```

---

### 批量儲存工時

```
POST /api/v1/timesheets
```

**權限：** 需登入

**請求：**
```json
{
  "month": "2025-11",
  "logs": [
    {
      "work_date": "2025-11-01",
      "client_id": "12345678",
      "business_type": "記帳",
      "work_type": "正常工時",
      "hours": 8.0
    },
    {
      "work_date": "2025-11-04",
      "client_id": "87654321",
      "business_type": "工商",
      "work_type": "平日加班(1.34)",
      "hours": 2.0
    }
  ]
}
```

**後端邏輯：**
```typescript
// services/timesheet.service.ts

async function saveTimesheets(userId: number, logs: any[]) {
  for (const log of logs) {
    // 1. 計算加權工時
    const weighted = await this.calculateWeightedHours(
      log.work_date,
      log.work_type,
      log.hours
    );
    
    // 2. 檢查是否已存在
    const existing = await db.prepare(
      'SELECT log_id FROM TimeLogs WHERE user_id = ? AND work_date = ? AND client_id = ?'
    ).bind(userId, log.work_date, log.client_id).first();
    
    if (existing) {
      // 更新
      await db.prepare(`
        UPDATE TimeLogs 
        SET hours = ?, weighted_hours = ?, business_type = ?, work_type = ?
        WHERE log_id = ?
      `).bind(log.hours, weighted, log.business_type, log.work_type, existing.log_id).run();
    } else {
      // 新增
      await db.prepare(`
        INSERT INTO TimeLogs 
          (user_id, work_date, client_id, business_type, work_type, hours, weighted_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, log.work_date, log.client_id, log.business_type, log.work_type, log.hours, weighted).run();
    }
  }
}
```

---

### 刪除單筆工時

```
DELETE /api/v1/timesheets/:logId
```

**權限：** 需登入，且為記錄擁有者或管理員

---

### 獲取工時統計

```
GET /api/v1/timesheets/summary?month=2025-11&user_id=2
```

**回應：**
```json
{
  "success": true,
  "data": {
    "total_hours": 160.0,
    "weighted_hours": 175.2,
    "leave_hours": 16.0,
    "by_business_type": {
      "記帳": { "hours": 80.0, "weighted": 85.0 },
      "工商": { "hours": 50.0, "weighted": 55.2 },
      "稅務": { "hours": 30.0, "weighted": 35.0 }
    }
  }
}
```

---

## 加權工時計算邏輯

```typescript
// services/timesheet.service.ts

async function calculateWeightedHours(
  workDate: string,
  workType: string,
  hours: number
): Promise<number> {
  // 如果是正常工時，不加權
  if (workType === '正常工時') {
    return hours;
  }
  
  // 查詢費率
  const rate = await db.prepare(
    'SELECT rate FROM OvertimeRates WHERE overtime_type = ?'
  ).bind(workType).first();
  
  if (!rate) {
    throw new ValidationError(`找不到費率：${workType}`);
  }
  
  return hours * rate.rate;
}
```

---

## 可選功能

### F126-F127 - 匯出功能

```
GET /api/v1/timesheets/export?month=2025-11&format=excel
GET /api/v1/timesheets/export?month=2025-11&format=csv
```

---

### F159 - 複製上週工時

```
POST /api/v1/timesheets/copy-from-last-week
Body: { "target_week": "2025-11-11" }
```

---

**相關文檔：**
- [工時表與報表模塊](../功能模塊/03-工時表與報表模塊.md)
- [資料庫設計](../資料庫設計.md) - TimeLogs, OvertimeRates

