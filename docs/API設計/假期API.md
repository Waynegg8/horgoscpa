# 假期 API 設計

**API 前綴：** `/api/v1/leave`  
**最後更新：** 2025年10月27日

---

## 端點列表

### 獲取假期餘額

```
GET /api/v1/leave/balance?year=2025
```

**權限：** 需登入

**回應：**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "user": {
      "user_id": 2,
      "name": "紜蓁"
    },
    "balances": [
      {
        "leave_type": "特休",
        "granted": 56,
        "used": 16,
        "remaining": 40,
        "unit": "小時"
      },
      {
        "leave_type": "病假",
        "granted": 240,
        "used": 16,
        "remaining": 224,
        "unit": "小時"
      },
      {
        "leave_type": "婚假",
        "granted": 64,
        "used": 64,
        "remaining": 0,
        "unit": "小時",
        "event_date": "2023-05-10"
      }
    ]
  }
}
```

---

### 計算邏輯

```typescript
// services/leave.service.ts

async function calculateLeaveBalance(userId: number, year: number) {
  const balances = [];
  
  // 1. 計算特休
  const annualLeave = await this.calculateAnnualLeave(userId, year);
  balances.push(annualLeave);
  
  // 2. 計算其他假別
  const otherRules = await db.prepare(
    'SELECT * FROM OtherLeaveRules'
  ).all();
  
  for (const rule of otherRules.results) {
    const used = await db.prepare(`
      SELECT SUM(leave_hours) as total
      FROM TimeLogs
      WHERE user_id = ? 
        AND leave_type = ?
        AND strftime('%Y', work_date) = ?
    `).bind(userId, rule.name, year.toString()).first();
    
    // 檢查是否為事件給假
    let granted = rule.grant_days * 8;
    if (rule.grant_type === '事件給假') {
      // 查詢事件
      const event = await db.prepare(
        'SELECT event_date FROM LeaveEvents WHERE user_id = ? AND event_type = ?'
      ).bind(userId, rule.name.replace('假', '')).first();
      
      if (!event) {
        granted = 0;  // 沒有事件，沒有額度
      }
    }
    
    balances.push({
      leave_type: rule.name,
      granted,
      used: used.total || 0,
      remaining: granted - (used.total || 0)
    });
  }
  
  return balances;
}
```

---

### 獲取假期日曆

```
GET /api/v1/leave/calendar?month=2025-11
```

**回應：**
```json
{
  "success": true,
  "data": {
    "month": "2025-11",
    "holidays": [
      { "date": "2025-11-10", "name": "國慶日補假" }
    ],
    "user_leaves": [
      { "date": "2025-11-05", "type": "病假", "hours": 8 },
      { "date": "2025-11-13", "type": "特休", "hours": 8 },
      { "date": "2025-11-14", "type": "特休", "hours": 8 }
    ]
  }
}
```

---

### 登記請假

```
POST /api/v1/leave/apply
```

**權限：** 需登入

**請求：**
```json
{
  "work_date": "2025-11-15",
  "leave_type": "特休",
  "leave_hours": 8,
  "notes": "個人事務"
}
```

**驗證邏輯：**
```typescript
async function applyLeave(userId: number, data: any) {
  // 1. 檢查餘額
  const balance = await this.getLeaveBalance(userId, data.leave_type, currentYear);
  
  if (balance.remaining < data.leave_hours) {
    throw new ValidationError(`${data.leave_type}餘額不足（剩餘：${balance.remaining}小時）`);
  }
  
  // 2. 檢查衝突（F150）
  const existing = await db.prepare(
    'SELECT * FROM TimeLogs WHERE user_id = ? AND work_date = ? AND leave_type IS NOT NULL'
  ).bind(userId, data.work_date).first();
  
  if (existing) {
    throw new ValidationError('此日期已登記請假');
  }
  
  // 3. 寫入資料庫
  await db.prepare(`
    INSERT INTO TimeLogs (user_id, work_date, leave_type, leave_hours)
    VALUES (?, ?, ?, ?)
  `).bind(userId, data.work_date, data.leave_type, data.leave_hours).run();
  
  // 4. 檢查是否需要預警（F151）
  const newBalance = balance.remaining - data.leave_hours;
  let warning = null;
  
  if (newBalance < 24 && newBalance >= 0) {  // 少於 3 天
    warning = `您的${data.leave_type}僅剩 ${newBalance / 8} 天`;
  }
  
  return {
    message: '請假已登記',
    warning
  };
}
```

---

### 獲取可用假別

```
GET /api/v1/leave/types
```

**權限：** 需登入

**回應：**
```json
{
  "success": true,
  "data": [
    { "name": "特休", "is_gender_specific": false },
    { "name": "病假", "is_gender_specific": false },
    { "name": "生理假", "is_gender_specific": true }
  ]
}
```

**後端邏輯（gender 篩選）：**
```typescript
async function getAvailableLeaveTypes(userId: number) {
  const user = await getUserById(userId);
  
  return await db.prepare(`
    SELECT * FROM LeaveTypes 
    WHERE is_gender_specific = 0 
       OR (is_gender_specific = 1 AND ? = 'female')
  `).bind(user.gender).all();
}
```

---

### 登記生活事件

```
POST /api/v1/leave/events
```

**權限：** 需登入

**請求：**
```json
{
  "event_type": "結婚",
  "event_date": "2025-12-25"
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "event_id": 5,
    "granted_leave": {
      "type": "婚假",
      "days": 8,
      "hours": 64
    },
    "message": "已為您增加 8 天婚假額度"
  }
}
```

---

## 可選功能

### F152 - 假期統計報表

```
GET /api/v1/leave/statistics?year=2025
```

**回應：**
```json
{
  "success": true,
  "data": {
    "by_type": {
      "特休": { "used": 16, "percentage": 28.6 },
      "病假": { "used": 16, "percentage": 6.7 }
    },
    "monthly_trend": [
      { "month": "2025-01", "total_hours": 8 },
      { "month": "2025-02", "total_hours": 16 }
    ],
    "comparison": {
      "this_year": 80,
      "last_year": 72,
      "change": "+11%"
    }
  }
}
```

---

**相關文檔：**
- [假期管理模塊](../功能模塊/04-假期管理模塊.md)
- [資料庫設計](../資料庫設計.md) - LeaveTypes, LeaveEvents

