# Props 與 Emits 定義

**最後更新：** 2025年10月27日

---

## Props 定義

### TypeScript 定義

```typescript
interface Props {
  clientId: string;          // 必填
  mode?: 'view' | 'edit';    // 可選 + 聯合類型
  showActions?: boolean;      // 可選 + 布林值
  items?: string[];          // 可選 + 陣列
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'view',
  showActions: true,
  items: () => []
});
```

### 命名規範

```typescript
// Props 定義：camelCase
interface Props {
  clientId: string;          // ✅
  showActions: boolean;      // ✅
}

// Template 使用：kebab-case
<ClientForm
  :client-id="id"           // ✅
  :show-actions="true"      // ✅
/>
```

### Props 驗證

```typescript
interface Props {
  // 基本類型
  clientId: string;
  age: number;
  isActive: boolean;
  
  // 聯合類型
  status: 'active' | 'inactive';
  size: 'sm' | 'md' | 'lg';
  
  // 物件
  client: Client;
  
  // 陣列
  items: string[];
  clients: Client[];
}
```

---

## Emits 定義

### TypeScript 定義

```typescript
const emit = defineEmits<{
  save: [client: Client];           // 單一參數
  update: [id: string, data: any];  // 多個參數
  cancel: [];                       // 無參數
}>();

// 使用
emit('save', client);
emit('update', '123', { name: 'New' });
emit('cancel');
```

### 錯誤做法

```typescript
// ❌ 沒有類型定義
const emit = defineEmits(['save', 'cancel']);
```

---

## 檢查清單

- [ ] Props 有完整的 TypeScript 類型
- [ ] 使用 withDefaults 設置預設值
- [ ] Emits 有類型定義
- [ ] Template 中使用 kebab-case

---

**相關：** [組件檔案結構](./組件檔案結構.md) | [響應式狀態](./響應式狀態.md)

