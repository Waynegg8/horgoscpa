# 假期管理 API

**模塊：** 假期管理  
**權限：** 所有員工  
**基礎路徑：** `/api/v1/leave`

---

## 📋 目錄
- [1. 新增假期申請](#1-新增假期申請)
- [2. 查詢假期記錄](#2-查詢假期記錄)
- [3. 查詢假期餘額](#3-查詢假期餘額)
- [4. 登記生活事件](#4-登記生活事件)
- [業務邏輯說明](#業務邏輯說明)

---

## 1. 新增假期申請

**端點：** `POST /api/v1/leave/applications`  
**權限：** 所有員工

### 請求 Body
```json
{
  "leave_type_id": 1,
  "start_date": "2025-11-01",
  "end_date": "2025-11-03",
  "days": 3,
  "reason": "家庭事務",
  "hours": null
}
```

### 欄位說明
| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `leave_type_id` | integer | ✅ | 假別類型 ID |
| `start_date` | string | ✅ | 開始日期（YYYY-MM-DD）|
| `end_date` | string | ✅ | 結束日期（YYYY-MM-DD）|
| `days` | number | ✅ | 請假天數 |
| `reason` | string | ❌ | 請假原因 |
| `hours` | number | ❌ | 請假小時數（小於1天時使用）|

### 成功回應
**HTTP 狀態碼：** 201
```json
{
  "success": true,
  "data": {
    "application_id": 123,
    "message": "假期申請成功",
    "remaining_balance": 7
  }
}
```

### 錯誤回應

#### 假期餘額不足
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_LEAVE_BALANCE",
    "message": "假期餘額不足，剩餘 2 天，申請 3 天"
  }
}
```

#### 日期重疊
```json
{
  "success": false,
  "error": {
    "code": "LEAVE_OVERLAP",
    "message": "與現有假期重疊"
  }
}
```

#### 假別類型不存在
```json
{
  "success": false,
  "error": {
    "code": "LEAVE_TYPE_NOT_FOUND",
    "message": "假別類型不存在"
  }
}
```

---

## 2. 查詢假期記錄

**端點：** `GET /api/v1/leave/applications`  
**權限：** 所有員工

### 查詢參數
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `user_id` | integer | ❌ | 員工 ID（管理員可查詢他人）|
| `leave_type_id` | integer | ❌ | 假別類型 |
| `start_date` | string | ❌ | 開始日期 |
| `end_date` | string | ❌ | 結束日期 |
| `limit` | integer | ❌ | 每頁筆數（預設 50）|
| `offset` | integer | ❌ | 偏移量 |

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": [
    {
      "application_id": 123,
      "user_id": 5,
      "user_name": "紜蓁",
      "leave_type_id": 1,
      "leave_type_name": "特休",
      "start_date": "2025-11-01",
      "end_date": "2025-11-03",
      "days": 3,
      "reason": "家庭事務",
      "applied_at": "2025-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

### 權限說明
- **非管理員**：只能查詢自己的假期記錄
- **管理員**：可以查詢所有員工的假期記錄

---

## 3. 查詢假期餘額

**端點：** `GET /api/v1/leave/balance`  
**權限：** 所有員工

### 查詢參數
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `user_id` | integer | ❌ | 員工 ID（管理員可查詢他人，預設查詢自己）|
| `year` | integer | ❌ | 年度（預設當前年度）|

### 成功回應
**HTTP 狀態碼：** 200
```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "user_name": "紜蓁",
    "year": 2025,
    "balances": [
      {
        "leave_type_id": 1,
        "leave_type_name": "特休",
        "entitled_days": 10,
        "used_days": 3,
        "remaining_days": 7
      },
      {
        "leave_type_id": 2,
        "leave_type_name": "病假",
        "entitled_days": 30,
        "used_days": 2,
        "remaining_days": 28
      },
      {
        "leave_type_id": 3,
        "leave_type_name": "事假",
        "entitled_days": 14,
        "used_days": 0,
        "remaining_days": 14
      }
    ]
  }
}
```

### 權限說明
- **非管理員**：只能查詢自己的假期餘額
- **管理員**：可以查詢所有員工的假期餘額

---

## 4. 登記生活事件

**端點：** `POST /api/v1/leave/life-events`  
**權限：** 所有員工

### 請求 Body
```json
{
  "event_type": "結婚",
  "event_date": "2025-12-01",
  "description": "婚禮日期",
  "has_children": false
}
```

### 欄位說明
| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `event_type` | string | ✅ | 事件類型（結婚、生育、親屬過世等）|
| `event_date` | string | ✅ | 事件日期 |
| `description` | string | ❌ | 事件說明 |
| `has_children` | boolean | ❌ | 是否有子女（影響陪產假/產檢假）|

### 成功回應
**HTTP 狀態碼：** 201
```json
{
  "success": true,
  "data": {
    "event_id": 456,
    "message": "生活事件登記成功",
    "granted_leave": {
      "leave_type_name": "婚假",
      "days": 8,
      "valid_until": "2026-12-01"
    }
  }
}
```

### 自動產生假期邏輯
登記生活事件後，系統會：
1. 查詢 `OtherLeaveRules` 表找到對應規則
2. 自動在 `LeaveBalances` 表增加假期額度
3. 設定有效期限（通常為事件後 1 年內）

---

## 業務邏輯說明

### 假期餘額計算

#### 特休計算
根據員工到職日期和 `AnnualLeaveRules` 表計算：
```typescript
async function calculateAnnualLeave(userId: number, year: number) {
  // 1. 獲取員工到職日期
  const user = await db.prepare(
    'SELECT start_date FROM Users WHERE user_id = ?'
  ).bind(userId).first();
  
  // 2. 計算到今年的工作月數
  const monthsWorked = calculateMonthsBetween(user.start_date, `${year}-12-31`);
  
  // 3. 查詢對應的特休規則
  const rule = await db.prepare(`
    SELECT days FROM AnnualLeaveRules
    WHERE min_months <= ? AND max_months > ?
  `).bind(monthsWorked, monthsWorked).first();
  
  return rule ? rule.days : 0;
}
```

#### 病假/事假計算
根據 `LeaveTypes` 表的 `annual_quota` 欄位：
```typescript
async function calculateLeaveQuota(leaveTypeId: number) {
  const leaveType = await db.prepare(
    'SELECT annual_quota FROM LeaveTypes WHERE leave_type_id = ?'
  ).bind(leaveTypeId).first();
  
  return leaveType.annual_quota; // 例如：病假 30 天/年，事假 14 天/年
}
```

#### 其他假期計算
根據生活事件自動產生：
```typescript
async function grantLeaveFromLifeEvent(userId: number, eventType: string, eventDate: string) {
  // 1. 查詢假期規則
  const rule = await db.prepare(`
    SELECT leave_type_id, days, validity_days
    FROM OtherLeaveRules
    WHERE event_type = ?
  `).bind(eventType).first();
  
  if (!rule) return;
  
  // 2. 計算有效期限
  const validUntil = addDays(eventDate, rule.validity_days || 365);
  
  // 3. 增加假期餘額
  await db.prepare(`
    INSERT INTO LeaveBalances (user_id, leave_type_id, entitled_days, valid_until)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, leave_type_id, year) 
    DO UPDATE SET entitled_days = entitled_days + ?
  `).bind(userId, rule.leave_type_id, rule.days, validUntil, rule.days).run();
  
  return {
    leave_type_id: rule.leave_type_id,
    days: rule.days,
    valid_until: validUntil
  };
}
```

---

### 假期申請驗證

#### 驗證流程
```
1. 驗證假別類型存在且啟用
   ↓
2. 驗證日期範圍有效（end_date >= start_date）
   ↓
3. 檢查假期餘額是否足夠
   ↓
4. 檢查是否與現有假期重疊
   ↓
5. 插入申請記錄
   ↓
6. 更新假期餘額（used_days += days）
   ↓
7. 返回成功
```

#### 餘額檢查
```typescript
async function checkLeaveBalance(userId: number, leaveTypeId: number, days: number) {
  const balance = await db.prepare(`
    SELECT entitled_days, used_days
    FROM LeaveBalances
    WHERE user_id = ? AND leave_type_id = ?
  `).bind(userId, leaveTypeId).first();
  
  if (!balance) {
    throw new Error('尚無此類型假期額度');
  }
  
  const remaining = balance.entitled_days - balance.used_days;
  
  if (remaining < days) {
    throw new InsufficientBalanceError(
      `假期餘額不足，剩餘 ${remaining} 天，申請 ${days} 天`
    );
  }
  
  return true;
}
```

#### 重疊檢查
```typescript
async function checkLeaveOverlap(userId: number, startDate: string, endDate: string) {
  const overlap = await db.prepare(`
    SELECT COUNT(*) as count
    FROM LeaveApplications
    WHERE user_id = ?
      AND (
        (start_date <= ? AND end_date >= ?)
        OR (start_date <= ? AND end_date >= ?)
        OR (start_date >= ? AND end_date <= ?)
      )
  `).bind(userId, startDate, startDate, endDate, endDate, startDate, endDate).first();
  
  if (overlap.count > 0) {
    throw new Error('與現有假期重疊');
  }
  
  return true;
}
```

---

### 生活事件與假期規則對應

| 事件類型 | 對應假別 | 天數 | 有效期限 | 依據 |
|---------|---------|------|---------|------|
| 結婚 | 婚假 | 8 天 | 事件後 1 年 | 勞基法 |
| 生育（女性）| 產假 | 56 天（8週）| 即時使用 | 勞基法 |
| 配偶生育 | 陪產假 | 7 天 | 前後 15 天內 | 勞基法 |
| 父母過世 | 喪假 | 8 天 | 事件後 1 年 | 勞基法 |
| 配偶過世 | 喪假 | 8 天 | 事件後 1 年 | 勞基法 |
| 子女過世 | 喪假 | 8 天 | 事件後 1 年 | 勞基法 |
| 祖父母過世 | 喪假 | 6 天 | 事件後 1 年 | 勞基法 |
| 配偶父母過世 | 喪假 | 6 天 | 事件後 1 年 | 勞基法 |
| 兄弟姊妹過世 | 喪假 | 3 天 | 事件後 1 年 | 勞基法 |
| 曾祖父母過世 | 喪假 | 3 天 | 事件後 1 年 | 勞基法 |
| 配偶祖父母過世 | 喪假 | 3 天 | 事件後 1 年 | 勞基法 |

---

## 錯誤碼總覽

| 錯誤碼 | HTTP | 說明 |
|--------|------|------|
| `LEAVE_TYPE_NOT_FOUND` | 404 | 假別類型不存在 |
| `INSUFFICIENT_LEAVE_BALANCE` | 422 | 假期餘額不足 |
| `LEAVE_OVERLAP` | 409 | 與現有假期重疊 |
| `INVALID_DATE_RANGE` | 422 | 日期區間錯誤 |
| `LEAVE_TYPE_DISABLED` | 400 | 假別類型已停用 |

---

## 範例代碼

### 新增假期申請完整實現
```typescript
app.post('/api/v1/leave/applications', authMiddleware, async (c) => {
  const userId = c.get('user').user_id;
  const input = await c.req.json();
  
  // 1. 驗證假別類型
  const leaveType = await c.env.DB.prepare(
    'SELECT * FROM LeaveTypes WHERE leave_type_id = ? AND is_enabled = 1'
  ).bind(input.leave_type_id).first();
  
  if (!leaveType) {
    return c.json(
      errorResponse('LEAVE_TYPE_NOT_FOUND', '假別類型不存在或已停用'),
      404
    );
  }
  
  // 2. 驗證日期範圍
  if (input.end_date < input.start_date) {
    return c.json(
      errorResponse('INVALID_DATE_RANGE', '結束日期不能早於開始日期'),
      422
    );
  }
  
  // 3. 檢查餘額
  const balance = await c.env.DB.prepare(`
    SELECT entitled_days, used_days
    FROM LeaveBalances
    WHERE user_id = ? AND leave_type_id = ?
  `).bind(userId, input.leave_type_id).first();
  
  const remaining = balance.entitled_days - balance.used_days;
  
  if (remaining < input.days) {
    return c.json(
      errorResponse(
        'INSUFFICIENT_LEAVE_BALANCE', 
        `假期餘額不足，剩餘 ${remaining} 天，申請 ${input.days} 天`
      ),
      422
    );
  }
  
  // 4. 檢查重疊
  const overlap = await c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM LeaveApplications
    WHERE user_id = ? AND (
      (start_date <= ? AND end_date >= ?)
      OR (start_date <= ? AND end_date >= ?)
      OR (start_date >= ? AND end_date <= ?)
    )
  `).bind(
    userId, 
    input.start_date, input.start_date,
    input.end_date, input.end_date,
    input.start_date, input.end_date
  ).first();
  
  if (overlap.count > 0) {
    return c.json(
      errorResponse('LEAVE_OVERLAP', '與現有假期重疊'),
      409
    );
  }
  
  // 5. 插入申請
  const result = await c.env.DB.prepare(`
    INSERT INTO LeaveApplications (
      user_id, leave_type_id, start_date, end_date, days, reason
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    input.leave_type_id,
    input.start_date,
    input.end_date,
    input.days,
    input.reason || null
  ).run();
  
  // 6. 更新餘額
  await c.env.DB.prepare(`
    UPDATE LeaveBalances
    SET used_days = used_days + ?
    WHERE user_id = ? AND leave_type_id = ?
  `).bind(input.days, userId, input.leave_type_id).run();
  
  return c.json(successResponse({
    application_id: result.meta.last_row_id,
    message: '假期申請成功',
    remaining_balance: remaining - input.days
  }), 201);
});
```

---

## 🔗 相關文檔

- **[功能模塊 - 假期登記](../功能模塊/11-假期登記.md)**
- **[功能模塊 - 假期餘額查詢](../功能模塊/13-假期餘額查詢.md)**
- **[功能模塊 - 生活事件登記](../功能模塊/12-生活事件登記.md)**
- **[LeaveBalances 資料表](../資料庫設計/假期系統表.md#leavebalances)**
- **[LeaveApplications 資料表](../資料庫設計/假期系統表.md#leaveapplications)**
- **[LeaveEvents 資料表](../資料庫設計/假期系統表.md#leaveevents)**

---

**最後更新：** 2025年10月27日  
**API 端點數：** 4 個

---

## 📝 這個文檔新增並完善了：
1. 假期申請的完整 API 規格
2. 假期餘額查詢 API
3. 生活事件登記 API
4. 假期餘額自動計算邏輯
5. 生活事件與假期規則的關聯邏輯
6. 完整的驗證流程和錯誤處理

