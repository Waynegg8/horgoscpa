# 業務規則 API

**模塊：** 業務規則管理  
**權限：** 僅管理員  
**基礎路徑：** `/api/v1/settings/business-rules`

---

## 📋 目錄
- [國定假日管理](#國定假日管理)
- [假別類型管理](#假別類型管理)
- [加班費率管理](#加班費率管理)
- [特休規則管理](#特休規則管理)
- [其他假期規則管理](#其他假期規則管理)
- [週期類型管理](#週期類型管理)

---

## 國定假日管理

**路徑前綴：** `/api/v1/settings/business-rules/holidays`

### 1. 獲取國定假日列表
**端點：** `GET /holidays`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "holiday_id": 1,
      "holiday_date": "2025-01-01",
      "name": "元旦",
      "is_compensatory_day_off": false
    }
  ]
}
```

### 2. 新增國定假日
**端點：** `POST /holidays`

#### 請求 Body
```json
{
  "holiday_date": "2025-01-01",
  "name": "元旦",
  "is_compensatory_day_off": false
}
```

### 3. 編輯國定假日
**端點：** `PUT /holidays/:id`

### 4. 刪除國定假日
**端點：** `DELETE /holidays/:id`

### 5. 批量導入
**端點：** `POST /holidays/import`

#### 請求 Body
```json
{
  "holidays": [
    { "holiday_date": "2025-01-01", "name": "元旦" },
    { "holiday_date": "2025-02-10", "name": "春節" }
  ]
}
```

### 6. 匯出CSV
**端點：** `GET /holidays/export`

---

## 假別類型管理

**路徑前綴：** `/api/v1/settings/business-rules/leave-types`

### 1. 獲取假別類型列表
**端點：** `GET /leave-types`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": 1,
      "type_name": "特休",
      "deduct_leave": true,
      "is_paid": true,
      "description": "法定特別休假",
      "is_enabled": true,
      "sort_order": 0
    }
  ]
}
```

### 2. 新增假別類型
**端點：** `POST /leave-types`

#### 請求 Body
```json
{
  "type_name": "婚假",
  "deduct_leave": true,
  "is_paid": true,
  "description": "員工結婚假",
  "sort_order": 0
}
```

### 3. 編輯假別類型
**端點：** `PUT /leave-types/:id`

### 4. 啟用假別類型
**端點：** `POST /leave-types/:id/enable`

### 5. 停用假別類型
**端點：** `POST /leave-types/:id/disable`

### 6. 查詢使用情況
**端點：** `GET /leave-types/:id/usage`

#### 成功回應
```json
{
  "success": true,
  "data": {
    "in_use": true,
    "application_count": 25,
    "affected_users": 5
  }
}
```

---

## 加班費率管理

**路徑前綴：** `/api/v1/settings/business-rules/overtime-rates`

### 1. 獲取加班費率列表
**端點：** `GET /overtime-rates`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "rate_id": 1,
      "work_type_id": 1,
      "work_type_name": "平日加班",
      "rate_multiplier": 1.34,
      "is_current": true,
      "effective_date": "2025-01-01"
    }
  ]
}
```

### 2. 新增加班費率
**端點：** `POST /overtime-rates`

#### 請求 Body
```json
{
  "work_type_id": 1,
  "rate_multiplier": 1.34,
  "effective_date": "2025-01-01"
}
```

**費率說明：**
- 平日加班：1.34 倍
- 休息日加班（前2小時）：1.34 倍
- 休息日加班（第3小時起）：1.67 倍
- 國定假日加班：2.00 倍

### 3. 編輯加班費率
**端點：** `PUT /overtime-rates/:id`

### 4. 標記為歷史費率
**端點：** `POST /overtime-rates/:id/archive`

### 5. 恢復法定預設值
**端點：** `POST /overtime-rates/restore-defaults`

---

## 特休規則管理

**路徑前綴：** `/api/v1/settings/business-rules/annual-leave-rules`

### 1. 獲取特休規則列表
**端點：** `GET /annual-leave-rules`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "min_months": 6,
      "max_months": 12,
      "days": 3,
      "description": "6個月以上未滿1年"
    },
    {
      "rule_id": 2,
      "min_months": 12,
      "max_months": 24,
      "days": 7,
      "description": "1年以上未滿2年"
    }
  ]
}
```

### 2. 新增特休規則
**端點：** `POST /annual-leave-rules`

#### 請求 Body
```json
{
  "min_months": 6,
  "max_months": 12,
  "days": 3,
  "description": "6個月以上未滿1年"
}
```

### 3. 編輯特休規則
**端點：** `PUT /annual-leave-rules/:id`

### 4. 刪除特休規則
**端點：** `DELETE /annual-leave-rules/:id`

### 5. 恢復法定預設值
**端點：** `POST /annual-leave-rules/restore-defaults`

**法定預設值：**
```
6個月以上未滿1年：3天
1年以上未滿2年：7天
2年以上未滿3年：10天
3年以上未滿5年：每年14天
5年以上未滿10年：每年15天
10年以上：每滿1年加1天，最高30天
```

---

## 其他假期規則管理

**路徑前綴：** `/api/v1/settings/business-rules/other-leave-rules`

### 1. 獲取其他假期規則列表
**端點：** `GET /other-leave-rules`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "rule_id": 1,
      "leave_type_id": 2,
      "leave_type_name": "婚假",
      "event_type": "結婚",
      "days": 8,
      "description": "員工結婚可請婚假8天"
    }
  ]
}
```

### 2. 新增規則
**端點：** `POST /other-leave-rules`

#### 請求 Body
```json
{
  "leave_type_id": 2,
  "event_type": "結婚",
  "days": 8,
  "description": "員工結婚可請婚假8天"
}
```

### 3. 編輯規則
**端點：** `PUT /other-leave-rules/:id`

### 4. 刪除規則
**端點：** `DELETE /other-leave-rules/:id`

### 5. 恢復法定預設值
**端點：** `POST /other-leave-rules/restore-defaults`

**法定預設值：**
```
婚假：8天
喪假（父母、配偶）：8天
喪假（祖父母、子女、配偶父母）：6天
喪假（曾祖父母、兄弟姊妹、配偶祖父母）：3天
產假：8週（56天）
陪產假：7天
產檢假：7天
```

---

## 週期類型管理

**路徑前綴：** `/api/v1/settings/business-rules/frequency-types`

### 1. 獲取週期類型列表
**端點：** `GET /frequency-types`

#### 成功回應
```json
{
  "success": true,
  "data": [
    {
      "frequency_id": 1,
      "name": "每月",
      "days_interval": 30,
      "months_interval": 1,
      "is_enabled": true,
      "sort_order": 0
    }
  ]
}
```

### 2. 新增週期類型
**端點：** `POST /frequency-types`

#### 請求 Body
```json
{
  "name": "每月",
  "days_interval": 30,
  "months_interval": 1,
  "sort_order": 0
}
```

**預設週期類型：**
```
每月：30天
雙月：60天
每季：90天
半年：180天
每年：365天
```

### 3. 編輯週期類型
**端點：** `PUT /frequency-types/:id`

### 4. 啟用週期類型
**端點：** `POST /frequency-types/:id/enable`

### 5. 停用週期類型
**端點：** `POST /frequency-types/:id/disable`

### 6. 調整排序
**端點：** `PUT /frequency-types/reorder`

#### 請求 Body
```json
{
  "order": [1, 3, 2, 4, 5]
}
```

---

## 通用錯誤碼

| 錯誤碼 | HTTP | 說明 |
|--------|------|------|
| `FORBIDDEN` | 403 | 非管理員嘗試管理業務規則 |
| `RESOURCE_NOT_FOUND` | 404 | 規則不存在 |
| `DUPLICATE_NAME` | 409 | 名稱已存在 |
| `RULE_IN_USE` | 409 | 規則使用中，無法刪除 |
| `INVALID_DATE_RANGE` | 422 | 日期區間錯誤 |
| `INVALID_RATE` | 422 | 費率值錯誤 |

---

## 業務邏輯

### 刪除檢查邏輯
```javascript
// 檢查假別類型是否被使用
async function checkLeaveTypeUsage(leaveTypeId) {
  const usage = await db.prepare(`
    SELECT COUNT(*) as count
    FROM LeaveApplications
    WHERE leave_type_id = ?
  `).bind(leaveTypeId).first();
  
  if (usage.count > 0) {
    throw new ConflictError('此假別類型已被使用，無法刪除');
  }
}

// 檢查特休規則是否被使用
async function checkAnnualLeaveRuleUsage(ruleId) {
  const usage = await db.prepare(`
    SELECT COUNT(*) as count
    FROM LeaveBalances lb
    JOIN Users u ON lb.user_id = u.user_id
    JOIN AnnualLeaveRules ar ON 
      MONTHS_BETWEEN(CURRENT_DATE, u.start_date) >= ar.min_months
      AND MONTHS_BETWEEN(CURRENT_DATE, u.start_date) < ar.max_months
    WHERE ar.rule_id = ?
  `).bind(ruleId).first();
  
  if (usage.count > 0) {
    throw new ConflictError('此特休規則影響現有員工，無法刪除');
  }
}
```

### 恢復法定預設值邏輯
```javascript
async function restoreDefaultAnnualLeaveRules() {
  // 1. 刪除所有現有規則
  await db.prepare('DELETE FROM AnnualLeaveRules').run();
  
  // 2. 插入法定預設值
  const defaults = [
    { min_months: 6, max_months: 12, days: 3 },
    { min_months: 12, max_months: 24, days: 7 },
    { min_months: 24, max_months: 36, days: 10 },
    { min_months: 36, max_months: 60, days: 14 },
    { min_months: 60, max_months: 120, days: 15 },
    // ... 更多規則
  ];
  
  for (const rule of defaults) {
    await db.prepare(`
      INSERT INTO AnnualLeaveRules (min_months, max_months, days)
      VALUES (?, ?, ?)
    `).bind(rule.min_months, rule.max_months, rule.days).run();
  }
  
  // 3. 重新計算所有員工的特休餘額
  await recalculateAllLeaveBalances();
}
```

---

## 📝 重要提示

### ⚠️ 修改業務規則的影響

#### 修改特休規則
- 會影響所有員工的特休餘額計算
- 建議在年度開始時調整
- 修改後需重新計算餘額

#### 修改加班費率
- 只影響新的加權工時計算
- 歷史資料不受影響
- 建議保留歷史費率記錄

#### 修改假別類型
- 停用後員工無法選擇該假別
- 不影響歷史申請記錄
- 刪除前需確認無人使用

#### 修改國定假日
- 影響工時計算和加班費率
- 影響特休和假期計算
- 建議每年初更新

---

## 🔗 相關文檔

- **[功能模塊 - 業務規則管理](../功能模塊/02-業務規則管理.md)**
- **[業務規則資料表](../資料庫設計/業務規則表.md)**

---

**最後更新：** 2025年10月27日  
**API 端點數：** 45 個（6 個子模塊）

---

## 📝 這個文檔合併了以下 45+ 個獨立文檔：

### 國定假日（9 個）
- _概覽.md, 獲取國定假日列表.md, 新增國定假日.md, 編輯國定假日.md, 刪除國定假日.md, 批量導入.md, 匯出CSV.md, 查詢使用情況.md, 獲取特定國定假日.md

### 假別類型（7 個）
- _概覽.md, 獲取假別類型列表.md, 新增假別類型.md, 編輯假別類型.md, 啟用假別類型.md, 停用假別類型.md, 查詢使用情況.md

### 加班費率（8 個）
- _概覽.md, 獲取加班費率列表.md, 新增加班費率.md, 編輯加班費率.md, 標記為歷史費率.md, 恢復法定預設值.md, 查詢使用情況.md, 獲取特定費率.md

### 特休規則（7 個）
- _概覽.md, 獲取特休規則列表.md, 新增特休規則.md, 編輯特休規則.md, 刪除特休規則.md, 恢復法定預設值.md, 獲取特定規則.md

### 其他假期規則（7個）
- _概覽.md, 獲取規則列表.md, 新增規則.md, 編輯規則.md, 刪除規則.md, 恢復法定預設值.md, 獲取特定規則.md

### 週期類型（8 個）
- _概覽.md, 獲取週期類型列表.md, 新增週期類型.md, 編輯週期類型.md, 啟用週期類型.md, 停用週期類型.md, 調整排序.md, 獲取特定週期類型.md

