# 假期餘額查詢 - UI 設計

**頁面路徑：** `/leaves/balance`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 餘額卡片設計

```vue
<template>
  <div class="leave-balance-page">
    <h2>我的假期餘額 - {{ currentYear }}年</h2>
    
    <div class="balance-cards">
      <div 
        v-for="balance in leaveBalances"
        :key="balance.leave_type_id"
        class="balance-card"
      >
        <h3>{{ balance.leave_type_name }}</h3>
        <div class="balance-amount">
          {{ balance.balance }}
          <span class="unit">小時</span>
        </div>
        <div class="balance-detail">
          已使用：{{ balance.used }}小時
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: usagePercentage(balance) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
```





