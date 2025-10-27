# 假期登記 - UI 設計

**頁面路徑：** `/leaves/apply`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 假期申請表單

```vue
<template>
  <div class="leave-apply-form">
    <h2>假期申請</h2>
    
    <form @submit.prevent="submitLeave">
      <div class="form-group">
        <label>假別 *</label>
        <select v-model="form.leave_type_id" required>
          <option 
            v-for="type in leaveTypes"
            :key="type.leave_type_id"
            :value="type.leave_type_id"
          >
            {{ type.leave_type_name }} (剩餘：{{ type.balance }}小時)
          </option>
        </select>
      </div>
      
      <div class="form-group-row">
        <div class="form-group">
          <label>開始日期 *</label>
          <input type="date" v-model="form.start_date" required />
        </div>
        <div class="form-group">
          <label>結束日期 *</label>
          <input type="date" v-model="form.end_date" required />
        </div>
      </div>
      
      <div class="form-group">
        <label>時數 *</label>
        <input 
          type="number" 
          v-model.number="form.total_hours"
          step="0.5"
          required
        />
        <small>系統自動計算工作日天數</small>
      </div>
      
      <div class="form-group">
        <label>請假事由</label>
        <textarea 
          v-model="form.reason"
          rows="3"
          placeholder="請簡述請假原因..."
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-primary">提交申請</button>
        <button type="button" @click="cancel">取消</button>
      </div>
    </form>
  </div>
</template>
```





