# 客戶服務設定 - UI 設計

**頁面路徑：** `/clients/:clientId/services`  
**權限：** 管理員、會計師（只能管理自己負責的客戶）  
**最後更新：** 2025年10月27日

---

## 頁面結構

### 主介面布局（在客戶詳情頁內）
```
┌────────────────────────────────────────┐
│  客戶詳情 - 冠群資訊股份有限公司         │
├────────────────────────────────────────┤
│  [基本資料] [服務項目] [任務記錄]      │
├────────────────────────────────────────┤
│                                        │
│  服務項目管理                   [+ 新增]│
│  ────────────────────────────────────  │
│                                        │
│  ✓ 記帳服務 - 收集憑證          [編輯]  │
│    頻率：雙月（1,3,5,7,9,11月）        │
│    費用：NT$ 15,000 | 難度：中等       │
│    任務模板：記帳標準流程              │
│    開始日期：2024-01-01                │
│    [停用] [刪除]                       │
│                                        │
│  ✓ 工商登記服務 - 公司變更      [編輯]  │
│    頻率：每月                          │
│    費用：NT$ 5,000 | 難度：簡單        │
│    開始日期：2024-06-01                │
│    [停用] [刪除]                       │
│                                        │
│  ⊗ 稅務申報服務（已停用）       [編輯]  │
│    [啟用] [刪除]                       │
│                                        │
└────────────────────────────────────────┘
```

---

## 組件設計

### 1. 服務卡片組件
```html
<div class="service-card" :class="{ inactive: !service.is_active }">
  <div class="service-header">
    <span class="status-icon">{{ service.is_active ? '✓' : '⊗' }}</span>
    <h4>{{ service.service_name }}</h4>
    <button @click="editService(service)">編輯</button>
  </div>
  
  <div class="service-details">
    <div class="detail-row">
      <label>頻率：</label>
      <span>{{ service.frequency_name }}</span>
      <span v-if="service.trigger_months" class="trigger-months">
        （{{ formatMonths(service.trigger_months) }}）
      </span>
    </div>
    
    <div class="detail-row">
      <label>費用：</label>
      <span>NT$ {{ service.fee_amount?.toLocaleString() }}</span>
      <span class="divider">|</span>
      <label>難度：</label>
      <span :class="`difficulty-${service.difficulty}`">
        {{ service.difficulty }}
      </span>
    </div>
    
    <div class="detail-row" v-if="service.task_template_name">
      <label>任務模板：</label>
      <span>{{ service.task_template_name }}</span>
    </div>
    
    <div class="detail-row">
      <label>開始日期：</label>
      <span>{{ service.start_date }}</span>
      <span v-if="service.end_date">
        ~ {{ service.end_date }}（已結束）
      </span>
    </div>
  </div>
  
  <div class="service-actions">
    <button 
      v-if="service.is_active"
      @click="toggleActive(service)"
    >停用</button>
    <button 
      v-else
      @click="toggleActive(service)"
    >啟用</button>
    <button 
      @click="deleteService(service)"
      class="danger"
    >刪除</button>
  </div>
</div>
```

### 2. 新增/編輯服務表單對話框
```html
<dialog class="service-form-dialog">
  <h2>{{ isEdit ? '編輯' : '新增' }}服務</h2>
  
  <form @submit.prevent="handleSubmit">
    <!-- 服務項目選擇 -->
    <div class="form-group">
      <label>服務項目 *</label>
      <select v-model="form.service_id" required :disabled="isEdit">
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
      <small v-if="isEdit">服務項目不可修改</small>
    </div>
    
    <!-- 週期類型 -->
    <div class="form-group">
      <label>服務頻率 *</label>
      <select v-model="form.frequency_type_id" required>
        <option :value="null">選擇頻率</option>
        <option 
          v-for="freq in frequencyTypes"
          :key="freq.frequency_type_id"
          :value="freq.frequency_type_id"
        >
          {{ freq.frequency_name }}
        </option>
      </select>
    </div>
    
    <!-- 觸發月份（僅週期性服務） -->
    <div 
      class="form-group" 
      v-if="selectedFrequency?.is_recurring"
    >
      <label>觸發月份 *</label>
      <div class="month-checkboxes">
        <label v-for="month in 12" :key="month">
          <input 
            type="checkbox" 
            :value="month"
            v-model="form.trigger_months"
          />
          {{ month }}月
        </label>
      </div>
    </div>
    
    <!-- 費用 -->
    <div class="form-group">
      <label>服務費用</label>
      <input 
        type="number" 
        v-model.number="form.fee_amount"
        placeholder="15000"
        min="0"
        step="100"
      />
      <span class="unit">元</span>
    </div>
    
    <!-- 難易度 -->
    <div class="form-group">
      <label>難易度</label>
      <select v-model="form.difficulty">
        <option value="">不指定</option>
        <option value="簡單">簡單</option>
        <option value="中等">中等</option>
        <option value="困難">困難</option>
      </select>
    </div>
    
    <!-- 任務模板 -->
    <div class="form-group">
      <label>關聯任務模板</label>
      <select v-model="form.task_template_id">
        <option :value="null">不關聯</option>
        <option 
          v-for="template in taskTemplates"
          :key="template.task_template_id"
          :value="template.task_template_id"
        >
          {{ template.name }}
        </option>
      </select>
    </div>
    
    <!-- 服務期間 -->
    <div class="form-group-row">
      <div class="form-group">
        <label>開始日期</label>
        <input type="date" v-model="form.start_date" />
      </div>
      <div class="form-group">
        <label>結束日期</label>
        <input type="date" v-model="form.end_date" />
        <small>（留空表示持續中）</small>
      </div>
    </div>
    
    <!-- 備註 -->
    <div class="form-group">
      <label>備註</label>
      <textarea 
        v-model="form.notes"
        rows="3"
        placeholder="其他說明..."
      ></textarea>
    </div>
    
    <!-- 表單按鈕 -->
    <div class="form-actions">
      <button type="submit" class="btn-primary">儲存</button>
      <button type="button" @click="closeDialog">取消</button>
    </div>
  </form>
</dialog>
```

---

## 互動流程

### 新增服務
1. 點擊「+ 新增」按鈕
2. 彈出表單對話框
3. 選擇服務項目（下拉選單分組顯示）
4. 選擇頻率類型
5. 若為週期性，勾選觸發月份
6. 填寫費用、難易度等
7. 可選關聯任務模板
8. 點擊「儲存」
9. 呼叫 API `POST /api/v1/clients/:clientId/services`
10. 成功後關閉對話框並刷新列表

### 編輯服務
1. 點擊服務卡片的「編輯」按鈕
2. 彈出表單對話框（已填入現有資料）
3. 服務項目欄位為灰色（不可修改）
4. 修改其他資料
5. 點擊「儲存」
6. 呼叫 API `PUT /api/v1/client-services/:id`
7. 成功後關閉對話框並刷新列表

### 停用/啟用服務
1. 點擊「停用」或「啟用」按鈕
2. 顯示確認對話框
3. 確認後呼叫 API `PUT /api/v1/client-services/:id`
4. 更新 `is_active` 狀態
5. 卡片樣式變為灰色（停用狀態）

### 刪除服務
1. 點擊「刪除」按鈕
2. 顯示確認對話框：「確定要刪除此服務嗎？」
3. 確認後呼叫 API `DELETE /api/v1/client-services/:id`
4. 成功後從列表移除

---

## 狀態管理

### Pinia Store
```typescript
// stores/clientServices.ts
export const useClientServicesStore = defineStore('clientServices', {
  state: () => ({
    services: [] as ClientService[],
    loading: false
  }),
  
  actions: {
    async fetchClientServices(clientId: string) {
      this.loading = true;
      const response = await fetch(`/api/v1/clients/${clientId}/services`);
      const { data } = await response.json();
      this.services = data;
      this.loading = false;
    },
    
    async createService(clientId: string, service: CreateServiceInput) {
      await fetch(`/api/v1/clients/${clientId}/services`, {
        method: 'POST',
        body: JSON.stringify(service)
      });
      await this.fetchClientServices(clientId);
    },
    
    async updateService(id: number, service: UpdateServiceInput) {
      await fetch(`/api/v1/client-services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(service)
      });
      await this.fetchClientServices(service.client_id);
    },
    
    async toggleActive(id: number, isActive: boolean) {
      await this.updateService(id, { is_active: !isActive });
    },
    
    async deleteService(id: number, clientId: string) {
      await fetch(`/api/v1/client-services/${id}`, {
        method: 'DELETE'
      });
      await this.fetchClientServices(clientId);
    }
  }
});
```

---

## 輔助函數

### 格式化觸發月份
```typescript
function formatMonths(triggerMonths: number[]): string {
  if (!triggerMonths || triggerMonths.length === 0) {
    return '';
  }
  
  if (triggerMonths.length === 12) {
    return '每月';
  }
  
  return triggerMonths.map(m => `${m}月`).join(',');
}
```

---

## 權限控制

### 顯示邏輯
```typescript
const canManageService = computed(() => {
  const user = useUserStore();
  const client = useClientStore().currentClient;
  
  // 管理員可管理所有客戶
  if (user.is_admin) return true;
  
  // 會計師只能管理自己負責的客戶
  return client.assignee_user_id === user.user_id;
});
```

### 按鈕顯示
```html
<button 
  v-if="canManageService"
  @click="addService"
>
  + 新增
</button>
```

---

## 相關文檔

- [功能模塊 - 客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)





