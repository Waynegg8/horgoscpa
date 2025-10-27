# 生活事件登記 - UI 設計

**頁面路徑：** `/leaves/events`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 事件登記表單

```vue
<template>
  <div class="leave-events-page">
    <h2>生活事件登記</h2>
    
    <form @submit.prevent="submitEvent" class="event-form">
      <div class="form-group">
        <label>事件類型 *</label>
        <select v-model="form.event_type" required>
          <option value="">選擇事件類型</option>
          <option value="結婚">結婚（8天婚假）</option>
          <option value="喪假-父母">喪假-父母（3天）</option>
          <option value="喪假-配偶">喪假-配偶（3天）</option>
          <option value="喪假-子女">喪假-子女（3天）</option>
          <option value="產假">產假（8週）</option>
          <option value="陪產假">陪產假（7天）</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>事件日期 *</label>
        <input 
          type="date" 
          v-model="form.event_date"
          required
        />
      </div>
      
      <div class="form-group">
        <label>備註</label>
        <textarea 
          v-model="form.notes"
          rows="3"
          placeholder="可補充說明..."
        ></textarea>
      </div>
      
      <button type="submit" class="btn-primary">提交登記</button>
    </form>
    
    <div class="events-history">
      <h3>已登記事件</h3>
      <div v-if="events.length === 0" class="empty-state">
        尚未登記任何事件
      </div>
      <div v-else class="event-list">
        <div 
          v-for="event in events"
          :key="event.event_id"
          class="event-item"
        >
          <div class="event-icon">📅</div>
          <div class="event-info">
            <h4>{{ event.event_type }}</h4>
            <p>事件日期：{{ event.event_date }}</p>
            <p>給予假期：{{ event.granted_hours }}小時 ({{ event.granted_hours / 8 }}天)</p>
            <p v-if="event.notes" class="notes">{{ event.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.event-form {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.events-history {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.event-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 12px;
}

.event-icon {
  font-size: 2rem;
}

.event-info h4 {
  margin: 0 0 8px 0;
}

.event-info p {
  margin: 4px 0;
  color: #666;
}
</style>
```

---

## 相關文檔

- [功能模塊 - 生活事件登記](../../功能模塊/12-生活事件登記.md)
- [業務邏輯](./業務邏輯.md)


