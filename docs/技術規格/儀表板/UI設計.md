# 儀表板 - UI 設計

**頁面路徑：** `/dashboard`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 儀表板佈局

```vue
<template>
  <div class="dashboard">
    <h1>歡迎回來，{{ user.name }}</h1>
    
    <div class="dashboard-grid">
      <!-- Widget 1: 我的任務 -->
      <div class="widget tasks-widget">
        <h2>我的任務 <span class="count">{{ tasks.length }}</span></h2>
        <div v-if="tasks.length === 0" class="empty-state">
          目前沒有進行中的任務
        </div>
        <div v-else class="task-list">
          <div 
            v-for="task in tasks.slice(0, 5)" 
            :key="task.task_id"
            class="task-item"
            @click="goToTask(task)"
          >
            <h4>{{ task.client_name }} - {{ task.task_name }}</h4>
            <div class="task-meta">
              <span class="progress">{{ task.progress }}%</span>
              <span 
                class="due-date" 
                :class="getDueDateClass(task)"
              >
                {{ formatDueDate(task.expected_due_date) }}
              </span>
            </div>
          </div>
        </div>
        <router-link to="/tasks" class="view-all">
          查看全部 →
        </router-link>
      </div>
      
      <!-- Widget 2: 待辦階段 -->
      <div class="widget stages-widget">
        <h2>待辦階段</h2>
        <div class="stage-list">
          <div 
            v-for="stage in pendingStages" 
            :key="stage.active_stage_id"
            class="stage-item"
          >
            <div class="stage-icon">{{ getStageIcon(stage) }}</div>
            <div class="stage-info">
              <h4>{{ stage.task_name }}</h4>
              <p>{{ stage.stage_name }}</p>
              <span class="due-hint">{{ formatStageDue(stage) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Widget 3: 工時統計 -->
      <div class="widget timesheet-widget">
        <h2>本月工時</h2>
        <div class="stat-card">
          <div class="stat-value">{{ monthlyHours.normal }}h</div>
          <div class="stat-label">正常工時</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ monthlyHours.weighted }}h</div>
          <div class="stat-label">加權工時</div>
        </div>
        <router-link to="/timesheet" class="btn-primary">
          填寫工時 →
        </router-link>
      </div>
      
      <!-- Widget 4: 假期餘額 -->
      <div class="widget leave-widget">
        <h2>假期餘額</h2>
        <div class="leave-list">
          <div 
            v-for="balance in leaveBalances.slice(0, 3)"
            :key="balance.leave_type_id"
            class="leave-item"
          >
            <span class="leave-type">{{ balance.leave_type_name }}</span>
            <span class="leave-balance">
              {{ balance.balance }}h
            </span>
          </div>
        </div>
        <router-link to="/leaves/balance" class="view-all">
          查看詳情 →
        </router-link>
      </div>
    </div>
  </div>
</template>

<style>
.dashboard {
  padding: 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.widget {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.widget h2 {
  font-size: 1.25rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  background: #2196F3;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
}

.task-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  border-color: #2196F3;
  background: #f5f5f5;
}

.view-all {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: #2196F3;
  text-decoration: none;
}
</style>
```

---

## 相關文檔

- [功能模塊 - 儀表板](../../功能模塊/06-儀表板.md)
- [業務邏輯](./業務邏輯.md)


