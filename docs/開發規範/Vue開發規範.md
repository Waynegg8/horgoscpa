# Vue 開發規範

**適用範圍：** 所有前端 Vue.js 組件開發  
**最後更新：** 2025年10月27日

---

## 📋 目錄
- [組件結構](#組件結構)
- [響應式狀態](#響應式狀態)
- [Props 與 Emits](#props-與-emits)
- [生命週期](#生命週期)
- [條件與列表渲染](#條件與列表渲染)
- [性能優化](#性能優化)
- [可訪問性](#可訪問性)

---

## 組件結構

### 標準組件檔案結構
```vue
<template>
  <!-- HTML 模板 -->
</template>

<script setup>
// 1. 引入依賴
import { ref, computed, onMounted } from 'vue';
import ComponentA from './ComponentA.vue';

// 2. 定義 Props
const props = defineProps({
  title: String,
  count: Number
});

// 3. 定義 Emits
const emit = defineEmits(['update', 'delete']);

// 4. 響應式狀態
const isLoading = ref(false);
const items = ref([]);

// 5. Computed 屬性
const filteredItems = computed(() => {
  return items.value.filter(item => item.active);
});

// 6. 方法
function handleClick() {
  emit('update', data);
}

// 7. 生命週期
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* 組件專屬樣式（優先使用 Tailwind） */
</style>
```

---

## 響應式狀態

### 使用 ref
```javascript
// 基本類型使用 ref
const count = ref(0);
const message = ref('Hello');
const isActive = ref(false);

// 訪問值需要 .value
count.value++;
console.log(message.value);
```

### 使用 reactive
```javascript
// 物件使用 reactive
const state = reactive({
  user: null,
  isLoading: false,
  error: null
});

// 直接訪問屬性
state.isLoading = true;
state.user = { name: '紜蓁' };
```

### 選擇原則
- 基本類型 → 使用 `ref`
- 物件/陣列 → 使用 `reactive` 或 `ref`
- 保持一致性，建議**統一使用 ref**

---

## Props 與 Emits

### Props 定義
```javascript
// 基本定義
const props = defineProps({
  title: String,
  count: Number,
  isActive: Boolean
});

// 完整定義（推薦）
const props = defineProps({
  title: {
    type: String,
    required: true,
    default: ''
  },
  count: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
});
```

### Emits 定義
```javascript
// 基本定義
const emit = defineEmits(['update', 'delete']);

// 帶驗證（推薦）
const emit = defineEmits({
  update: (data) => {
    return data && typeof data === 'object';
  },
  delete: (id) => {
    return typeof id === 'number';
  }
});

// 使用
emit('update', formData);
emit('delete', itemId);
```

---

## 生命週期

### 常用生命週期鉤子
```javascript
import { onMounted, onUpdated, onBeforeUnmount } from 'vue';

// 組件掛載後執行（最常用）
onMounted(() => {
  console.log('組件已掛載');
  fetchData();
});

// 組件更新後執行
onUpdated(() => {
  console.log('組件已更新');
});

// 組件卸載前執行（清理工作）
onBeforeUnmount(() => {
  console.log('組件即將卸載');
  clearInterval(timer);
});
```

### 使用場景
- `onMounted`: 獲取初始數據、設置事件監聽
- `onUpdated`: 響應 DOM 更新（少用）
- `onBeforeUnmount`: 清理定時器、移除事件監聽

---

## 條件與列表渲染

### 條件渲染
```vue
<template>
  <!-- v-if：條件不常變 -->
  <div v-if="isAdmin">管理員功能</div>
  
  <!-- v-show：條件常變（保留 DOM） -->
  <div v-show="isVisible">可見內容</div>
  
  <!-- v-else-if, v-else -->
  <div v-if="status === 'loading'">載入中...</div>
  <div v-else-if="status === 'error'">發生錯誤</div>
  <div v-else>顯示內容</div>
</template>
```

### 列表渲染
```vue
<template>
  <ul>
    <li 
      v-for="item in items" 
      :key="item.id"
      @click="handleClick(item)"
    >
      {{ item.name }}
    </li>
  </ul>
</template>

<script setup>
// ✅ 必須使用唯一的 key
// ❌ 不要使用 index 作為 key（會導致性能問題）
const items = ref([
  { id: 1, name: '項目1' },
  { id: 2, name: '項目2' }
]);
</script>
```

---

## 性能優化

### 使用 Computed 優化
```javascript
// ❌ 不好：每次渲染都重新計算
const filteredItems = items.value.filter(item => item.active);

// ✅ 好：使用 computed 緩存
const filteredItems = computed(() => {
  return items.value.filter(item => item.active);
});
```

### 列表優化
```vue
<template>
  <!-- ✅ 使用唯一 key -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
  
  <!-- ❌ 不要使用 index -->
  <div v-for="(item, index) in items" :key="index">
    {{ item.name }}
  </div>
</template>
```

### 圖片優化
```vue
<template>
  <!-- Lazy loading -->
  <img 
    :src="imageUrl" 
    loading="lazy"
    alt="描述文字"
  />
  
  <!-- 使用 srcset 支持不同螢幕 -->
  <img 
    :src="image.url"
    :srcset="`${image.url} 1x, ${image.url2x} 2x`"
    alt="描述文字"
  />
</template>
```

---

## 可訪問性

### ARIA 標籤
```vue
<template>
  <!-- 按鈕 -->
  <button 
    aria-label="關閉對話框"
    @click="closeModal"
  >
    ×
  </button>
  
  <!-- 表單 -->
  <input 
    id="email"
    type="email"
    aria-required="true"
    aria-invalid="!!errors.email"
    aria-describedby="email-error"
  />
  <span id="email-error" role="alert">
    {{ errors.email }}
  </span>
  
  <!-- 載入狀態 -->
  <div 
    role="status" 
    aria-live="polite"
    aria-busy="true"
  >
    載入中...
  </div>
</template>
```

### 錯誤訊息
```vue
<template>
  <div>
    <input 
      v-model="email"
      :aria-invalid="!!errors.email"
      aria-describedby="email-error"
    />
    <span 
      v-if="errors.email" 
      id="email-error"
      role="alert"
      class="text-red-600 text-sm"
    >
      {{ errors.email }}
    </span>
  </div>
</template>
```

### 鍵盤操作
```vue
<template>
  <div 
    tabindex="0"
    @keydown.enter="handleEnter"
    @keydown.esc="handleEscape"
  >
    可鍵盤操作的元素
  </div>
</template>

<script setup>
function handleEnter() {
  console.log('Enter 鍵');
}

function handleEscape() {
  console.log('ESC 鍵');
}
</script>
```

---

## 共用組件使用

### StyledButton
```vue
<template>
  <StyledButton 
    variant="primary"
    size="md"
    :loading="isSubmitting"
    @click="handleSubmit"
  >
    提交
  </StyledButton>
</template>
```

### StyledInput
```vue
<template>
  <StyledInput
    v-model="form.email"
    label="Email"
    type="email"
    :required="true"
    :error="errors.email"
    placeholder="請輸入 Email"
  />
</template>
```

詳見：[UI 共用組件規範](../技術規格/UI共用組件規範.md)

---

## 最佳實踐

### ✅ 必須遵守
1. 使用 `<script setup>` 語法
2. 所有組件使用 PascalCase 命名
3. Props 使用完整定義（type, required, default）
4. 列表渲染必須使用唯一 key
5. 使用 Computed 緩存計算結果
6. 優先使用 Tailwind CSS 類名
7. 添加適當的 ARIA 標籤

### ❌ 禁止事項
1. 不要使用 index 作為 v-for 的 key
2. 不要在模板中使用複雜表達式
3. 不要直接修改 Props
4. 不要忘記清理事件監聽器
5. 不要使用內聯樣式（優先 Tailwind）

---

## 🔗 相關文檔

- [UI 共用組件規範](../技術規格/UI共用組件規範.md)
- [命名與格式規範](./命名與格式規範.md)

---

**最後更新：** 2025年10月27日  
**本文檔合併了前端開發下的所有子文檔（約15個）**

