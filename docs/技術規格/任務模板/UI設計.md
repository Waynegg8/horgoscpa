# 任務模板管理 - UI 設計

**頁面路徑：** `/settings/task-templates`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 頁面結構

### 主介面布局
```
┌────────────────────────────────────────┐
│  設定 > 任務模板管理           [+ 新增模板] │
├────────────────────────────────────────┤
│                                        │
│  記帳標準流程（雙月）            [編輯]  │
│  關聯服務：記帳服務 - 收集憑證         │
│  總計：8天 | 4個階段                   │
│  ────────────────────────────────────  │
│  1. 資料收集與核對 (3天)               │
│  2. 營業稅過帳 (2天) ← 依賴階段1       │
│  3. 提列折舊 (1天) ← 依賴階段2         │
│  4. 報表產出與檢查 (2天) ← 依賴階段3   │
│  [複製模板] [刪除]                     │
│                                        │
│  ────────────────────────────────────  │
│                                        │
│  公司設立流程                    [編輯]  │
│  關聯服務：工商登記服務 - 公司設立     │
│  總計：14天 | 5個階段                  │
│  [複製模板] [刪除]                     │
│                                        │
└────────────────────────────────────────┘
```

---

## 組件設計

### 1. 模板卡片組件
```vue
<template>
  <div class="template-card">
    <div class="template-header">
      <h3>{{ template.name }}</h3>
      <button @click="editTemplate(template)">編輯</button>
    </div>
    
    <div class="template-info">
      <span v-if="template.service_name">
        關聯服務：{{ template.service_name }}
      </span>
      <span>總計：{{ template.total_days }}天 | {{ template.stage_count }}個階段</span>
    </div>
    
    <div class="stage-list">
      <div 
        v-for="stage in template.stages" 
        :key="stage.stage_template_id"
        class="stage-item"
      >
        <span class="stage-order">{{ stage.stage_order }}.</span>
        <span class="stage-name">{{ stage.stage_name }}</span>
        <span class="stage-days">({{ stage.estimated_days }}天)</span>
        <span v-if="stage.depends_on_name" class="stage-dependency">
          ← 依賴 {{ stage.depends_on_name }}
        </span>
      </div>
    </div>
    
    <div class="template-actions">
      <button @click="copyTemplate(template)">複製模板</button>
      <button @click="deleteTemplate(template)" class="danger">刪除</button>
    </div>
  </div>
</template>
```

### 2. 新增/編輯模板對話框
```vue
<template>
  <dialog class="template-form-dialog">
    <h2>{{ isEdit ? '編輯' : '新增' }}模板</h2>
    
    <form @submit.prevent="handleSubmit">
      <!-- 基本資訊 -->
      <div class="form-group">
        <label>模板名稱 *</label>
        <input 
          v-model="form.name" 
          required
          placeholder="記帳標準流程（雙月）"
        />
      </div>
      
      <div class="form-group">
        <label>關聯服務項目</label>
        <select v-model="form.service_template_id">
          <option :value="null">不關聯</option>
          <optgroup 
            v-for="main in services" 
            :key="main.service_id"
            :label="main.service_name"
          >
            <option 
              v-for="sub in main.children"
              :key="sub.service_id"
              :value="sub.service_id"
            >
              {{ main.service_name }} - {{ sub.service_name }}
            </option>
          </optgroup>
        </select>
      </div>
      
      <div class="form-group">
        <label>模板說明</label>
        <textarea 
          v-model="form.description"
          rows="3"
          placeholder="描述此模板的用途和適用場景..."
        ></textarea>
      </div>
      
      <!-- 階段管理 -->
      <div class="stages-section">
        <div class="section-header">
          <h3>階段設定</h3>
          <button type="button" @click="addStage">+ 新增階段</button>
        </div>
        
        <draggable 
          v-model="form.stages" 
          handle=".drag-handle"
          @end="updateStageOrder"
        >
          <div 
            v-for="(stage, index) in form.stages" 
            :key="index"
            class="stage-form-item"
          >
            <span class="drag-handle">⋮⋮</span>
            <span class="stage-number">{{ index + 1 }}</span>
            
            <input 
              v-model="stage.stage_name"
              placeholder="階段名稱"
              required
            />
            
            <input 
              v-model.number="stage.estimated_days"
              type="number"
              min="1"
              placeholder="天數"
              required
            />
            <span>天</span>
            
            <select v-model="stage.depends_on">
              <option :value="null">無依賴</option>
              <option 
                v-for="(s, i) in form.stages.slice(0, index)"
                :key="i"
                :value="i"
              >
                依賴階段{{ i + 1 }}
              </option>
            </select>
            
            <button 
              type="button" 
              @click="removeStage(index)"
              class="icon-button danger"
            >
              ✕
            </button>
          </div>
        </draggable>
        
        <div class="stages-summary">
          總計：{{ totalDays }}天
        </div>
      </div>
      
      <!-- 表單按鈕 -->
      <div class="form-actions">
        <button type="submit" class="btn-primary">儲存</button>
        <button type="button" @click="closeDialog">取消</button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { computed } from 'vue';
import draggable from 'vuedraggable';

const totalDays = computed(() => {
  return form.stages.reduce((sum, stage) => sum + (stage.estimated_days || 0), 0);
});

function addStage() {
  form.stages.push({
    stage_name: '',
    estimated_days: 1,
    depends_on: null,
    description: ''
  });
}

function updateStageOrder() {
  // 重新計算依賴（如果階段順序改變，依賴也要更新）
  form.stages.forEach((stage, index) => {
    if (stage.depends_on !== null && stage.depends_on >= index) {
      stage.depends_on = null; // 清除無效依賴
    }
  });
}
</script>
```

---

## 互動流程

### 新增模板
1. 點擊「+ 新增模板」
2. 填寫模板名稱和說明
3. 選擇關聯服務（可選）
4. 點擊「+ 新增階段」
5. 填寫階段名稱和預計天數
6. 設定階段依賴（可選）
7. 拖曳調整階段順序
8. 系統自動計算總天數
9. 點擊「儲存」

### 編輯模板
1. 點擊模板卡片的「編輯」按鈕
2. 修改模板資訊或階段
3. 點擊「儲存」
4. 確認是否影響現有任務實例

### 複製模板
1. 點擊「複製模板」
2. 系統複製模板及所有階段
3. 新模板名稱自動加上「(副本)」
4. 可立即編輯新模板

### 刪除模板
1. 點擊「刪除」
2. 檢查是否有客戶服務使用此模板
3. 若有，顯示警告並禁止刪除
4. 若無，確認刪除

---

## 階段依賴視覺化

### 依賴指示器
```
1. 資料收集 (3天)

2. 營業稅過帳 (2天)
   ↑ 需先完成「資料收集」

3. 提列折舊 (1天)
   ↑ 需先完成「營業稅過帳」
```

---

## 權限控制

```typescript
const canManageTemplates = computed(() => {
  const user = useUserStore();
  return user.is_admin;
});
```

---

## 相關文檔

- [功能模塊 - 任務模板管理](../../功能模塊/14-任務模板管理.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)


