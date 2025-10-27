# UI設計 - 加權工時計算

**最後更新：** 2025年10月27日

---

## 頁面概述

加權工時計算功能嵌入在「報表中心」內，作為一個獨立的報表類型。不是獨立頁面，而是報表中心的一個功能選項。

**位置：** `/reports?type=weighted`

---

## UI 結構

### 1. 報表中心選單

```
[報表中心]
├── 工時統計
├── 加權工時報表 ← 本功能
├── 假期統計
└── 客戶工時分析
```

---

## 加權工時報表頁面

### 頁面結構

```
┌─────────────────────────────────────────┐
│  加權工時報表                            │
├─────────────────────────────────────────┤
│                                         │
│  查詢條件                               │
│  ┌──────────────────────────────────┐  │
│  │ 員工: [下拉選單]  (管理員可選)   │  │
│  │ 日期範圍: [2024-01-01] 至 [2024-01-31] │
│  │ [查詢] [匯出Excel]                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  加權工時統計                           │
│  ┌──────────────────────────────────┐  │
│  │ 總原始工時: 160 小時              │  │
│  │ 總加權工時: 180 小時              │  │
│  │ 加權係數: 1.125                   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  明細列表                               │
│  ┌──────────────────────────────────┐  │
│  │ 日期     │ 工作類型 │ 原始 │ 加權│  │
│  ├──────────────────────────────────┤  │
│  │ 01/05   │ 正常工時 │ 8    │ 8  │  │
│  │ 01/06   │ 週末加班 │ 4    │ 8  │  │
│  │ 01/10   │ 假日加班 │ 2    │ 5.36│  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 組件設計

### 1. 查詢條件組件

```vue
<template>
  <div class="query-panel">
    <!-- 員工選擇（管理員專用） -->
    <div v-if="isAdmin" class="field">
      <label>員工</label>
      <select v-model="selectedUserId">
        <option value="all">全部員工</option>
        <option v-for="user in employees" :value="user.user_id">
          {{ user.name }}
        </option>
      </select>
    </div>
    
    <!-- 日期範圍 -->
    <div class="field">
      <label>日期範圍</label>
      <input type="date" v-model="startDate" />
      <span>至</span>
      <input type="date" v-model="endDate" />
    </div>
    
    <!-- 操作按鈕 -->
    <div class="actions">
      <button @click="fetchReport" class="btn-primary">查詢</button>
      <button @click="exportExcel" class="btn-secondary">匯出Excel</button>
    </div>
  </div>
</template>
```

---

### 2. 統計卡片組件

```vue
<template>
  <div class="stats-cards">
    <div class="stat-card">
      <div class="label">總原始工時</div>
      <div class="value">{{ totalOriginalHours }} 小時</div>
    </div>
    
    <div class="stat-card">
      <div class="label">總加權工時</div>
      <div class="value primary">{{ totalWeightedHours }} 小時</div>
    </div>
    
    <div class="stat-card">
      <div class="label">平均加權係數</div>
      <div class="value">{{ avgWeightFactor.toFixed(3) }}</div>
    </div>
  </div>
</template>
```

**樣式：**
```css
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

.stat-card {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.stat-card .label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.stat-card .value {
  font-size: 1.875rem;
  font-weight: 600;
  color: #111827;
}

.stat-card .value.primary {
  color: #2563eb;
}
```

---

### 3. 明細表格組件

```vue
<template>
  <div class="detail-table">
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>工作類型</th>
          <th>原始工時</th>
          <th>費率倍數</th>
          <th>加權工時</th>
          <th>客戶</th>
          <th>備註</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in timeLogs" :key="log.log_id">
          <td>{{ formatDate(log.work_date) }}</td>
          <td>
            <span :class="['badge', getWorkTypeClass(log.work_type)]">
              {{ log.work_type }}
            </span>
          </td>
          <td>{{ log.hours }}</td>
          <td>{{ log.rate }}x</td>
          <td class="weighted">{{ log.weighted_hours }}</td>
          <td>{{ log.client_name }}</td>
          <td>{{ log.notes }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2">總計</td>
          <td>{{ totalOriginalHours }}</td>
          <td>-</td>
          <td class="weighted">{{ totalWeightedHours }}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
function getWorkTypeClass(workType: string) {
  if (workType.includes('假日')) return 'badge-red';
  if (workType.includes('週末')) return 'badge-orange';
  return 'badge-gray';
}
</script>
```

**樣式：**
```css
.detail-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.detail-table th {
  background: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.detail-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table td.weighted {
  font-weight: 600;
  color: #2563eb;
}

.badge {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-gray {
  background: #f3f4f6;
  color: #374151;
}

.badge-orange {
  background: #fef3c7;
  color: #d97706;
}

.badge-red {
  background: #fee2e2;
  color: #dc2626;
}

.total-row {
  background: #f9fafb;
  font-weight: 600;
}
```

---

## 互動設計

### 1. 日期範圍選擇

**預設值：**
- 員工：當月 1 號 至 當月最後一天
- 管理員：當月 1 號 至 當月最後一天，預選「全部員工」

**快捷選項：**
```vue
<div class="quick-dates">
  <button @click="setThisMonth">本月</button>
  <button @click="setLastMonth">上月</button>
  <button @click="setThisQuarter">本季</button>
</div>
```

---

### 2. 匯出 Excel

**功能：**
- 點擊「匯出 Excel」按鈕
- 呼叫 API：`GET /api/v1/reports/weighted?format=excel&start_date=...&end_date=...&user_id=...`
- API 回傳 Excel 檔案（`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）
- 瀏覽器自動下載

**檔案名稱：**
```typescript
const filename = `加權工時報表_${userName}_${startDate}_${endDate}.xlsx`;
```

---

### 3. 載入狀態

```vue
<template>
  <div v-if="loading" class="loading-overlay">
    <div class="spinner"></div>
    <p>載入中...</p>
  </div>
  
  <div v-else-if="error" class="error-message">
    {{ error }}
  </div>
  
  <div v-else>
    <!-- 正常內容 -->
  </div>
</template>
```

---

## 響應式設計

### 桌面 (≥1024px)
- 統計卡片：3 欄並排
- 表格：完整顯示所有欄位

### 平板 (768px - 1023px)
- 統計卡片：2 欄並排
- 表格：隱藏「備註」欄位

### 手機 (<768px)
- 統計卡片：1 欄
- 表格：卡片式顯示

```css
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .detail-table table {
    display: none;  /* 隱藏表格 */
  }
  
  .detail-table .card-list {
    display: block;  /* 顯示卡片列表 */
  }
}
```

---

## 權限控制

### 員工
- 只能查看自己的加權工時
- 不顯示「員工選擇」欄位
- API 自動過濾 `user_id = currentUser.user_id`

### 管理員
- 可選擇「全部員工」或「特定員工」
- 顯示「員工選擇」下拉選單
- 可查看所有人的加權工時

---

## 相關文檔

- [功能模塊：加權工時計算](../../功能模塊/09-加權工時計算.md)
- [業務邏輯](./業務邏輯.md)
- [API規格：加權工時](../../API規格/加權工時/)

---

**最後更新：** 2025年10月27日  
**文檔版本：** 2.0（模塊化重組版）

