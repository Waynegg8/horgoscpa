# 服務項目管理 - UI 設計

**頁面路徑：** `/settings/services`  
**權限：** 依模塊權限設定決定  
**最後更新：** 2025年10月27日

---

## 頁面結構

### 主介面布局
```
┌──────────────────────────────────────┐
│  服務項目管理                         │
│  [+ 新增主項目]                      │
├──────────────────────────────────────┤
│                                      │
│  📋 記帳服務                [編輯]   │
│    ├─ 收集憑證               [編輯]  │
│    ├─ 整理傳票               [編輯]  │
│    └─ 結帳報表               [編輯]  │
│     [+ 新增子項目]                   │
│                                      │
│  📋 工商登記服務            [編輯]   │
│    ├─ 公司設立               [編輯]  │
│    ├─ 公司變更               [編輯]  │
│    └─ 公司解散               [編輯]  │
│     [+ 新增子項目]                   │
│                                      │
└──────────────────────────────────────┘
```

---

## 組件設計

### 1. 主項目卡片
```html
<div class="service-main-card">
  <div class="service-header">
    <span class="icon">📋</span>
    <h3>{{ service.service_name }}</h3>
    <button @click="editService(service)">編輯</button>
    <button @click="deleteService(service)">刪除</button>
  </div>
  
  <div class="service-description">
    {{ service.description }}
  </div>
  
  <div class="sub-services">
    <SubServiceItem 
      v-for="sub in service.children" 
      :key="sub.service_id"
      :service="sub"
    />
  </div>
  
  <button @click="addSubService(service)">
    + 新增子項目
  </button>
</div>
```

### 2. 子項目列表項
```html
<div class="sub-service-item">
  <span class="indent">└─</span>
  <span class="name">{{ service.service_name }}</span>
  <button @click="editService(service)">編輯</button>
  <button @click="deleteService(service)">刪除</button>
</div>
```

### 3. 新增/編輯表單對話框
```html
<dialog class="service-form-dialog">
  <h2>{{ isEdit ? '編輯' : '新增' }}{{ isMain ? '主項目' : '子項目' }}</h2>
  
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label>服務名稱 *</label>
      <input 
        v-model="form.service_name" 
        placeholder="如：記帳服務"
        maxlength="100"
        required
      />
    </div>
    
    <div class="form-group">
      <label>服務說明</label>
      <textarea 
        v-model="form.description" 
        placeholder="簡要描述此服務項目"
        rows="3"
      ></textarea>
    </div>
    
    <div v-if="!isMain" class="form-group">
      <label>所屬主項目</label>
      <select v-model="form.parent_service_id" disabled>
        <option :value="parentService.service_id">
          {{ parentService.service_name }}
        </option>
      </select>
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary">儲存</button>
      <button type="button" @click="closeDialog">取消</button>
    </div>
  </form>
</dialog>
```

---

## 互動流程

### 新增主項目
1. 點擊「新增主項目」按鈕
2. 彈出表單對話框
3. 填寫服務名稱和說明
4. 點擊「儲存」
5. 呼叫 API `POST /api/v1/services`
6. 成功後關閉對話框並刷新列表

### 新增子項目
1. 點擊主項目下的「新增子項目」按鈕
2. 彈出表單對話框（已自動選擇父項目）
3. 填寫子項目名稱和說明
4. 點擊「儲存」
5. 呼叫 API `POST /api/v1/services` (帶 parent_service_id)
6. 成功後關閉對話框並刷新列表

### 編輯服務項目
1. 點擊「編輯」按鈕
2. 彈出表單對話框（已填入現有資料）
3. 修改資料
4. 點擊「儲存」
5. 呼叫 API `PUT /api/v1/services/:id`
6. 成功後關閉對話框並刷新列表

### 刪除服務項目
1. 點擊「刪除」按鈕
2. 顯示確認對話框：「確定要刪除嗎？」
3. 確認後呼叫 API `DELETE /api/v1/services/:id`
4. 若有依賴錯誤，顯示錯誤訊息
5. 成功後刷新列表

---

## 狀態管理

### Pinia Store
```typescript
// stores/services.ts
export const useServicesStore = defineStore('services', {
  state: () => ({
    services: [] as Service[],
    loading: false
  }),
  
  actions: {
    async fetchServices() {
      this.loading = true;
      const response = await fetch('/api/v1/services');
      const { data } = await response.json();
      this.services = buildTree(data);  // 建立層級結構
      this.loading = false;
    },
    
    async createService(service: CreateServiceInput) {
      await fetch('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify(service)
      });
      await this.fetchServices();
    },
    
    async updateService(id: number, service: UpdateServiceInput) {
      await fetch(`/api/v1/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(service)
      });
      await this.fetchServices();
    },
    
    async deleteService(id: number) {
      await fetch(`/api/v1/services/${id}`, {
        method: 'DELETE'
      });
      await this.fetchServices();
    }
  }
});

function buildTree(flatList: Service[]): Service[] {
  const tree: Service[] = [];
  const map = new Map<number, Service>();
  
  flatList.forEach(item => {
    map.set(item.service_id, { ...item, children: [] });
  });
  
  map.forEach(item => {
    if (item.parent_service_id === null) {
      tree.push(item);
    } else {
      const parent = map.get(item.parent_service_id);
      if (parent) {
        parent.children.push(item);
      }
    }
  });
  
  return tree;
}
```

---

## 權限控制

### 顯示邏輯
```typescript
const permissions = usePermissionsStore();

// 是否顯示服務項目管理頁面
const canViewServices = computed(() => 
  permissions.has('service_management')
);

// 是否可以編輯
const canEditServices = computed(() => 
  user.is_admin || permissions.has('service_management')
);
```

### 按鈕顯示
```html
<button 
  v-if="canEditServices"
  @click="addMainService"
>
  + 新增主項目
</button>
```

---

## 響應式設計

### 桌面版（≥768px）
- 卡片式布局
- 每行顯示完整主項目和子項目

### 行動版（<768px）
- 堆疊式布局
- 主項目可折疊展開
- 按鈕改為圖示

---

## 相關文檔

- [功能模塊 - 服務項目管理](../../功能模塊/03-服務項目管理.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)


