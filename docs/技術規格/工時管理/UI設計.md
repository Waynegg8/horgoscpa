# 工時表填寫 - UI 設計

**頁面路徑：** `/timesheet`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## Excel風格網格介面

### 主介面
```vue
<template>
  <div class="timesheet-container">
    <div class="header">
      <h2>工時表 - {{ currentMonth }}</h2>
      <button @click="previousMonth">◀ 上月</button>
      <button @click="nextMonth">下月 ▶</button>
      <button @click="saveAll" class="btn-primary">儲存</button>
    </div>
    
    <table class="timesheet-grid">
      <thead>
        <tr>
          <th>日期</th>
          <th>客戶</th>
          <th>業務類型</th>
          <th>工時類型</th>
          <th>時數</th>
          <th>加權</th>
          <th>假別</th>
          <th>備註</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="log in timeLogs" 
          :key="log.time_log_id"
          :class="{ holiday: isHoliday(log.work_date) }"
        >
          <td>{{ formatDate(log.work_date) }}</td>
          <td>
            <select v-model="log.client_id">
              <option value="">選擇客戶</option>
              <option 
                v-for="client in clients"
                :key="client.client_id"
                :value="client.client_id"
              >
                {{ client.company_name }}
              </option>
            </select>
          </td>
          <td>
            <select v-model="log.service_id">
              <option value="">選擇服務</option>
              <option 
                v-for="service in services"
                :key="service.service_id"
                :value="service.service_id"
              >
                {{ service.service_name }}
              </option>
            </select>
          </td>
          <td>
            <select v-model="log.work_type_id">
              <option 
                v-for="type in workTypes"
                :key="type.work_type_id"
                :value="type.work_type_id"
              >
                {{ type.work_type_name }}
              </option>
            </select>
          </td>
          <td>
            <input 
              type="number" 
              v-model.number="log.hours"
              @input="calculateWeighted(log)"
              step="0.5"
              min="0"
              max="24"
            />
          </td>
          <td>{{ log.weighted_hours }}</td>
          <td>
            <select v-model="log.leave_type_id">
              <option value="">無</option>
              <option 
                v-for="leave in leaveTypes"
                :key="leave.leave_type_id"
                :value="leave.leave_type_id"
              >
                {{ leave.leave_type_name }}
              </option>
            </select>
          </td>
          <td>
            <input 
              type="text" 
              v-model="log.notes"
              placeholder="備註"
            />
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="summary">
      本月統計：正常 {{ normalHours }}h | 加權 {{ weightedHours }}h | 請假 {{ leaveHours }}h
    </div>
    
    <div v-if="dailyExceedsLimit" class="warning">
      ⚠️ {{ selectedDate }} 的工時為 {{ dailyTotal }}小時，請確認是否正確
    </div>
  </div>
</template>

<style>
.timesheet-grid {
  width: 100%;
  border-collapse: collapse;
}

.timesheet-grid th,
.timesheet-grid td {
  border: 1px solid #ddd;
  padding: 8px;
}

.timesheet-grid tr.holiday {
  background-color: #ffe5e5;
}

.warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 12px;
  border-radius: 4px;
  margin-top: 16px;
}
</style>
```

---

## 相關文檔

- [功能模塊 - 工時表填寫](../../功能模塊/08-工時表填寫.md)
- [業務邏輯](./業務邏輯.md)





