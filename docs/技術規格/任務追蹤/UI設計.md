# 任務進度追蹤 - UI 設計

**頁面路徑：** `/tasks`  
**權限：** 所有員工（依據 `module_visibility_tasks`）  
**最後更新：** 2025年10月27日

---

## 頁面結構

### 看板視圖
```
┌────────────────────────────────────────┐
│  我的任務         [看板] [列表]  [篩選▼] │
├────────────────────────────────────────┤
│                                        │
│  ┌─待開始──┬─進行中──┬─已完成──┬─逾期──┐│
│  │         │         │         │       ││
│  │ 宏達    │ 仟鑽    │ 新創    │ 大成  ││
│  │ 記帳    │ 記帳    │ 工商    │ 記帳  ││
│  │ 0% ░░░  │ 50% ███ │ 100% ███│ 75% ██││
│  │ 剩15天  │ 剩8天   │ 已完成  │逾5天  ││
│  │         │         │         │🔴    ││
│  │         │         │         │       ││
│  │ 台晶    │         │         │       ││
│  │ 稅務    │         │         │       ││
│  │ 0% ░░░  │         │         │       ││
│  │ 剩20天  │         │         │       ││
│  └─────────┴─────────┴─────────┴───────┘│
└────────────────────────────────────────┘
```

### 列表視圖
```
┌────────────────────────────────────────┐
│  我的任務         [看板] [列表]  [篩選▼] │
├────────────────────────────────────────┤
│                                        │
│  ☑ 仟鑽 - 記帳 - 9-10月     🟡 進行中  │
│     進度：50% ████████████░░░░░░       │
│     開始：11-01 | 到期：11-15 (剩8天)  │
│     [查看詳情]                         │
│  ────────────────────────────────────  │
│                                        │
│  ☐ 宏達 - 記帳 - 11月       ⚪ 待開始  │
│     進度：0% ░░░░░░░░░░░░░░░░░░       │
│     開始：未開始 | 到期：11-20 (剩15天) │
│     [開始任務]                         │
│  ────────────────────────────────────  │
│                                        │
│  ☑ 大成 - 記帳 - 9-10月     🔴 逾期    │
│     進度：75% ██████████████████░░░░   │
│     開始：10-25 | 到期：11-05 (逾5天)  │
│     [查看詳情]                         │
│                                        │
└────────────────────────────────────────┘
```

---

## 組件設計

### 1. 任務卡片（看板視圖）
```vue
<template>
  <div 
    class="task-card" 
    :class="statusClass"
    @click="viewTask(task)"
  >
    <h4>{{ task.client_name }}</h4>
    <p class="task-name">{{ task.task_name }}</p>
    
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: task.progress + '%' }"
      ></div>
      <span class="progress-text">{{ task.progress }}%</span>
    </div>
    
    <div class="task-info">
      <span v-if="task.status === 'overdue'" class="overdue-badge">
        逾{{ task.overdue_days }}天
      </span>
      <span v-else-if="task.days_remaining !== null">
        剩{{ task.days_remaining }}天
      </span>
      <span v-else>
        已完成
      </span>
    </div>
  </div>
</template>

<style>
.task-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.task-card.overdue {
  border-left: 4px solid #ff4444;
}

.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  position: relative;
  margin: 8px 0;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 4px;
  transition: width 0.3s;
}
</style>
```

### 2. 任務列表項（列表視圖）
```vue
<template>
  <div class="task-list-item" :class="{ overdue: task.status === 'overdue' }">
    <div class="task-header">
      <input 
        type="checkbox" 
        v-model="selected"
        @click.stop
      />
      <h4>{{ task.client_name }} - {{ task.task_name }}</h4>
      <span :class="`status-badge ${task.status}`">
        {{ statusIcon }} {{ statusText }}
      </span>
    </div>
    
    <div class="task-body">
      <div class="progress-section">
        <span>進度：{{ task.progress }}%</span>
        <div class="progress-bar">
          <div :style="{ width: task.progress + '%' }"></div>
        </div>
      </div>
      
      <div class="task-dates">
        <span>開始：{{ task.actual_start_date || '未開始' }}</span>
        <span class="divider">|</span>
        <span>到期：{{ task.expected_due_date }}</span>
        <span v-if="task.status === 'overdue'" class="overdue-text">
          (逾{{ task.overdue_days }}天)
        </span>
        <span v-else-if="task.days_remaining !== null" class="remaining-text">
          (剩{{ task.days_remaining }}天)
        </span>
      </div>
    </div>
    
    <div class="task-actions">
      <button @click.stop="viewTask(task)">查看詳情</button>
      <button 
        v-if="task.status === 'pending'"
        @click.stop="startTask(task)"
      >
        開始任務
      </button>
    </div>
  </div>
</template>
```

---

## 篩選功能

### 篩選器組件
```vue
<template>
  <div class="filter-panel">
    <div class="filter-group">
      <label>狀態</label>
      <select v-model="filters.status">
        <option value="">全部</option>
        <option value="pending">待開始</option>
        <option value="in_progress">進行中</option>
        <option value="completed">已完成</option>
        <option value="overdue">逾期</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>客戶</label>
      <select v-model="filters.client_id">
        <option value="">全部客戶</option>
        <option 
          v-for="client in clients"
          :key="client.client_id"
          :value="client.client_id"
        >
          {{ client.company_name }}
        </option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>月份</label>
      <input 
        type="month" 
        v-model="filters.month"
      />
    </div>
    
    <button @click="applyFilters">套用</button>
    <button @click="resetFilters">重置</button>
  </div>
</template>
```

---

## 批量操作

### 批量操作工具列
```vue
<template>
  <div v-if="selectedTasks.length > 0" class="bulk-actions-bar">
    <span>已選擇 {{ selectedTasks.length }} 個任務</span>
    
    <div class="bulk-buttons">
      <button @click="bulkUpdateStatus('completed')">
        批量標記為完成
      </button>
      <button @click="bulkAssign">
        批量分配
      </button>
      <button @click="clearSelection">
        取消選擇
      </button>
    </div>
  </div>
</template>
```

---

## 狀態管理

### Pinia Store
```typescript
export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    filters: {
      status: '',
      client_id: '',
      month: ''
    },
    viewMode: 'board' as 'board' | 'list',
    selectedTasks: [] as number[],
    loading: false
  }),
  
  getters: {
    filteredTasks(state) {
      let tasks = state.tasks;
      
      if (state.filters.status) {
        tasks = tasks.filter(t => t.status === state.filters.status);
      }
      
      if (state.filters.client_id) {
        tasks = tasks.filter(t => t.client_id === state.filters.client_id);
      }
      
      if (state.filters.month) {
        tasks = tasks.filter(t => 
          t.expected_due_date?.startsWith(state.filters.month)
        );
      }
      
      return tasks;
    },
    
    tasksByStatus(state) {
      return {
        pending: state.tasks.filter(t => t.status === 'pending'),
        in_progress: state.tasks.filter(t => t.status === 'in_progress'),
        completed: state.tasks.filter(t => t.status === 'completed'),
        overdue: state.tasks.filter(t => t.status === 'overdue')
      };
    }
  },
  
  actions: {
    async fetchTasks() {
      this.loading = true;
      const response = await fetch('/api/v1/tasks');
      const { data } = await response.json();
      this.tasks = data;
      this.loading = false;
    },
    
    async startTask(taskId: number) {
      await fetch(`/api/v1/tasks/${taskId}/start`, { method: 'POST' });
      await this.fetchTasks();
    }
  }
});
```

---

## 相關文檔

- [功能模塊 - 任務進度追蹤](../../功能模塊/16-任務進度追蹤.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)





