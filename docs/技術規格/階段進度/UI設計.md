# 階段進度更新 - UI 設計

**頁面路徑：** `/tasks/:taskId`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 頁面結構

### 任務詳情頁（步驟條視圖）
```
┌────────────────────────────────────────┐
│  ← 返回  仟鑽企業 - 記帳 - 114年9-10月   │
├────────────────────────────────────────┤
│  總覽                                  │
│  開始：2024-11-01  |  到期：2024-11-15│
│  進度：50% ███████████░░░░░░░░        │
│  狀態：🟡 進行中                       │
├────────────────────────────────────────┤
│                                        │
│  階段進度                              │
│  ────────────────────────────────────  │
│                                        │
│  1. ✅ 資料收集與核對 (3天) 已完成     │
│     2024-11-01 → 2024-11-03           │
│     備註：已收到全部發票               │
│     [編輯備註]                         │
│  ────────────────────────────────────  │
│                                        │
│  2. 🟢 營業稅過帳 (2天) 進行中         │
│     2024-11-04 → 2024-11-05           │
│     ⚠️ 剩1天                          │
│     [標記完成] [新增備註]             │
│  ────────────────────────────────────  │
│                                        │
│  3. 🔒 提列折舊 (1天) 未開始           │
│     ⚠️ 需先完成「階段 2：營業稅過帳」 │
│     [開始此階段] (按鈕禁用)            │
│  ────────────────────────────────────  │
│                                        │
│  4. ⚪ 報表產出與檢查 (2天) 未開始     │
│     (需等待前階段)                    │
│  ────────────────────────────────────  │
│                                        │
└────────────────────────────────────────┘
```

---

## 組件設計

### 1. 階段卡片組件
```vue
<template>
  <div 
    class="stage-card" 
    :class="stageStatusClass"
  >
    <div class="stage-header">
      <span class="stage-icon">{{ stageIcon }}</span>
      <h4>{{ stage.stage_order }}. {{ stage.stage_name }}</h4>
      <span class="stage-days">({{ stage.estimated_days }}天)</span>
      <span :class="`stage-status ${stage.status}`">
        {{ stageStatusText }}
      </span>
    </div>
    
    <div v-if="stage.actual_start_date" class="stage-dates">
      <span>{{ stage.actual_start_date }}</span>
      <span>→</span>
      <span>{{ stage.expected_due_date }}</span>
      <span 
        v-if="stage.days_remaining !== null" 
        :class="remainingClass"
      >
        {{ remainingText }}
      </span>
    </div>
    
    <div v-if="stage.depends_on && stage.status === 'pending'" class="stage-dependency">
      <span class="warning-icon">⚠️</span>
      <span>需先完成「{{ stage.depends_on_name }}」</span>
    </div>
    
    <div v-if="stage.notes" class="stage-notes">
      備註：{{ stage.notes }}
    </div>
    
    <div class="stage-actions">
      <button 
        v-if="stage.status === 'pending' && canStart"
        @click="startStage(stage)"
      >
        開始此階段
      </button>
      
      <button 
        v-if="stage.status === 'in_progress'"
        @click="completeStage(stage)"
        class="btn-primary"
      >
        標記完成
      </button>
      
      <button 
        v-if="stage.status === 'in_progress' || stage.status === 'completed'"
        @click="editNotes(stage)"
        class="btn-secondary"
      >
        {{ stage.notes ? '編輯備註' : '新增備註' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps<{ stage: Stage }>();

const stageIcon = computed(() => {
  switch (props.stage.status) {
    case 'completed': return '✅';
    case 'in_progress': {
      if (props.stage.days_remaining <= 0) return '🔴';
      if (props.stage.days_remaining === 1) return '🟡';
      return '🟢';
    }
    case 'pending': {
      return props.stage.depends_on && !props.stage.can_start ? '🔒' : '⚪';
    }
    default: return '⚪';
  }
});

const stageStatusText = computed(() => {
  const statusMap = {
    pending: '未開始',
    in_progress: '進行中',
    completed: '已完成'
  };
  return statusMap[props.stage.status] || '未知';
});

const remainingText = computed(() => {
  const days = props.stage.days_remaining;
  if (days < 0) return `逾${Math.abs(days)}天`;
  if (days === 0) return '今天到期';
  return `剩${days}天`;
});

const remainingClass = computed(() => {
  const days = props.stage.days_remaining;
  if (days < 0) return 'text-danger';
  if (days <= 1) return 'text-warning';
  return 'text-success';
});

const canStart = computed(() => {
  return !props.stage.depends_on || props.stage.can_start;
});
</script>

<style>
.stage-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: white;
}

.stage-card.completed {
  background: #f0f9ff;
  border-left: 4px solid #2196F3;
}

.stage-card.in-progress {
  background: #f0fff4;
  border-left: 4px solid #4CAF50;
}

.stage-card.overdue {
  background: #fff5f5;
  border-left: 4px solid #ff4444;
}

.stage-card.locked {
  background: #f5f5f5;
  opacity: 0.7;
}

.stage-dependency {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fff3cd;
  border-radius: 4px;
  margin-top: 8px;
}
</style>
```

### 2. 備註編輯對話框
```vue
<template>
  <dialog class="notes-dialog">
    <h3>階段備註</h3>
    <p>{{ stage.stage_name }}</p>
    
    <textarea 
      v-model="notes"
      rows="5"
      placeholder="輸入階段備註..."
    ></textarea>
    
    <div class="dialog-actions">
      <button @click="saveNotes" class="btn-primary">儲存</button>
      <button @click="closeDialog">取消</button>
    </div>
  </dialog>
</template>
```

---

## 顏色規則

### 狀態指示器
| 狀態 | 剩餘天數 | 顏色 | 圖示 | 說明 |
|------|----------|------|------|------|
| 未開始 | - | 灰色 | ⚪ | 尚未開始 |
| 未開始（鎖定） | - | 灰色 | 🔒 | 依賴未完成 |
| 進行中 | ≥2天 | 綠色 | 🟢 | 進行順利 |
| 進行中 | 1天 | 黃色 | 🟡 | 接近到期 |
| 進行中 | 0天 | 橙色 | 🟠 | 今天到期 |
| 逾期 | <0天 | 紅色 | 🔴 | 已逾期 |
| 已完成 | - | 藍色 | ✅ | 已完成 |

---

## 互動流程

### 開始階段
1. 檢查依賴是否滿足
2. 若未滿足，顯示提示並禁用按鈕
3. 若滿足，點擊「開始此階段」
4. 設定開始日期和預計完成日期
5. 更新狀態為「進行中」

### 完成階段
1. 點擊「標記完成」
2. 可選新增備註
3. 設定完成日期
4. 更新狀態為「已完成」
5. 自動檢查下一階段是否可開始

### 新增/編輯備註
1. 點擊「新增備註」或「編輯備註」
2. 彈出對話框
3. 輸入備註內容
4. 點擊「儲存」

---

## 相關文檔

- [功能模塊 - 階段進度更新](../../功能模塊/17-階段進度更新.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)





