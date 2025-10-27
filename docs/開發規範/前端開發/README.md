# 前端開發規範

**最後更新：** 2025年10月27日  
**適用範圍：** 所有前端代碼（HTML、CSS、JavaScript/TypeScript、Vue.js）

---

## 📋 文檔索引

本目錄包含所有前端開發相關的規範文檔，涵蓋 HTML、CSS、Vue.js、性能優化等各個方面。

### 1. 核心規範（必讀）

- **[HTML 規範](./HTML規範.md)**
  - 語義化標籤
  - 層級結構
  - 表單規範
  - 按鈕規範

- **[CSS 與 Tailwind 規範](./CSS與Tailwind規範.md)**
  - Tailwind 優先原則
  - 間距、顏色、文字大小標準
  - 何時使用自訂 CSS
  - BEM 命名法

- **[Vue.js 組件規範](./Vue組件規範.md)**
  - 組件檔案結構
  - Props 和 Emits 定義
  - 條件渲染與列表渲染
  - 組件命名規範

### 2. 組件開發

- **[共用組件庫](./共用組件庫.md)**
  - 組件庫結構
  - 標準組件（StyledButton、StyledInput 等）
  - 何時創建新共用組件

### 3. 設計與體驗

- **[響應式設計](./響應式設計.md)**
  - Tailwind 斷點標準
  - Mobile First 設計
  - 響應式組件範例

- **[可訪問性規範](./可訪問性規範.md)**
  - ARIA 標籤
  - 鍵盤操作
  - 無障礙設計

### 4. 優化與組織

- **[性能優化](./性能優化.md)**
  - 圖片優化
  - 列表性能優化
  - 避免不必要的重渲染

- **[前端文件組織](./前端文件組織.md)**
  - 目錄結構
  - 導入順序規範
  - 檔案命名規範

---

## 🎯 快速參考

### 核心原則

1. **語義化優先** - 使用正確的 HTML 標籤（不濫用 div）
2. **Tailwind 優先** - 優先使用 Tailwind utility classes
3. **組件化思維** - 重複3次以上的UI應提取為共用組件
4. **TypeScript 嚴格** - 所有 Props、Emits、API 都要定義類型
5. **Mobile First** - 從手機版開始設計，逐步增強到桌面版
6. **可訪問性** - 確保所有交互元素可鍵盤操作

### 常用 Tailwind Classes

```html
<!-- 間距 -->
p-4    <!-- padding: 1rem -->
m-4    <!-- margin: 1rem -->
gap-4  <!-- gap: 1rem -->

<!-- 顏色 -->
bg-blue-600      <!-- 主要按鈕 -->
bg-gray-100      <!-- 背景 -->
text-gray-900    <!-- 主要文字 -->

<!-- 文字 -->
text-base        <!-- 16px -->
text-lg          <!-- 18px -->
font-medium      <!-- 字重 500 -->

<!-- 佈局 -->
flex items-center justify-between
grid grid-cols-3 gap-4

<!-- 響應式 -->
sm:p-6          <!-- 平板 -->
lg:grid-cols-4  <!-- 桌面 -->
```

### 組件範例

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue';
import StyledButton from '@/components/common/StyledButton.vue';
import type { Client } from '@/types/client';

// 2. Props
interface Props {
  clientId: string;
  mode?: 'view' | 'edit';
}
const props = withDefaults(defineProps<Props>(), {
  mode: 'view'
});

// 3. Emits
const emit = defineEmits<{
  save: [client: Client];
  cancel: [];
}>();

// 4. State
const isLoading = ref(false);
const form = ref<Partial<Client>>({});

// 5. Computed
const isValid = computed(() => {
  return form.value.company_name?.length >= 2;
});

// 6. Methods
const handleSave = async () => {
  if (!isValid.value) return;
  // ...
};

// 7. Lifecycle
onMounted(() => {
  // ...
});
</script>

<template>
  <div class="p-4 bg-white rounded-lg shadow">
    <form @submit.prevent="handleSave">
      <!-- Content -->
      <StyledButton type="submit" variant="primary">
        儲存
      </StyledButton>
    </form>
  </div>
</template>
```

---

## ✅ 開發檢查清單

### HTML
- [ ] 使用語義化標籤
- [ ] 避免過深嵌套（≤5層）
- [ ] 表單有 label 和 id
- [ ] 按鈕使用 button 元素

### CSS/Tailwind
- [ ] 優先使用 Tailwind classes
- [ ] 使用標準間距/顏色
- [ ] 自訂 CSS 有頁面前綴

### Vue.js
- [ ] TypeScript 類型定義完整
- [ ] 使用 computed 快取計算
- [ ] 列表渲染有正確的 :key
- [ ] 組件命名 PascalCase

### 共用組件
- [ ] 檢查是否有現成組件
- [ ] 重複3次以上提取為組件

### 性能
- [ ] 圖片使用 loading="lazy"
- [ ] 長列表使用分頁/虛擬滾動

### 可訪問性
- [ ] 交互元素可鍵盤操作
- [ ] 僅圖示按鈕有 aria-label

---

## 🔗 相關文檔

- [命名規範](../命名規範/)
- [API 標準規範](../../API設計/)
- [後端開發規範](../後端開發/)
- [專案開發規格總覽](../../AI開發指南/專案開發規格總覽.md)

---

**最後更新：** 2025年10月27日

