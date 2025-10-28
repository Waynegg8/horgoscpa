# UI 共用組件規範

**所有前端組件的統一標準** | 組件設計、Tailwind樣式、交互規範

---

## 📋 目錄
- [通用組件列表](#通用組件列表)
- [StyledButton 按鈕](#styledbutton-按鈕)
- [StyledInput 輸入框](#styledinput-輸入框)
- [Modal 彈窗](#modal-彈窗)
- [DataTable 資料表格](#datatable-資料表格)
- [FormLayout 表單布局](#formlayout-表單布局)
- [LoadingSpinner 載入動畫](#loadingspinner-載入動畫)
- [Toast 提示訊息](#toast-提示訊息)
- [Pagination 分頁器](#pagination-分頁器)

---

## 通用組件列表

| 組件名稱 | 用途 | 使用頻率 | 文檔位置 |
|---------|------|---------|---------|
| `StyledButton` | 所有按鈕 | ⭐⭐⭐ 非常高 | [詳見](#styledbutton-按鈕) |
| `StyledInput` | 所有輸入框 | ⭐⭐⭐ 非常高 | [詳見](#styledinput-輸入框) |
| `Modal` | 彈窗對話框 | ⭐⭐⭐ 非常高 | [詳見](#modal-彈窗) |
| `DataTable` | 資料表格 | ⭐⭐⭐ 非常高 | [詳見](#datatable-資料表格) |
| `FormLayout` | 表單布局 | ⭐⭐ 高 | [詳見](#formlayout-表單布局) |
| `LoadingSpinner` | 載入動畫 | ⭐⭐ 高 | [詳見](#loadingspinner-載入動畫) |
| `Toast` | 提示訊息 | ⭐⭐ 高 | [詳見](#toast-提示訊息) |
| `Pagination` | 分頁器 | ⭐⭐ 高 | [詳見](#pagination-分頁器) |
| `Tabs` | 分頁標籤 | ⭐ 中 | [詳見](#tabs-分頁標籤) |
| `Dropdown` | 下拉選單 | ⭐ 中 | [詳見](#dropdown-下拉選單) |

---

## StyledButton 按鈕

### 基本用法

```vue
<template>
  <StyledButton 
    variant="primary" 
    size="md" 
    @click="handleClick"
  >
    確認
  </StyledButton>
</template>
```

### Props

| Prop | 類型 | 預設值 | 說明 | 可選值 |
|------|------|--------|------|-------|
| `variant` | string | `'primary'` | 按鈕樣式 | `primary`, `secondary`, `danger`, `ghost` |
| `size` | string | `'md'` | 按鈕大小 | `sm`, `md`, `lg` |
| `disabled` | boolean | `false` | 是否禁用 | - |
| `loading` | boolean | `false` | 是否載入中 | - |
| `icon` | string | - | 圖標名稱 | - |
| `iconPosition` | string | `'left'` | 圖標位置 | `left`, `right` |

### 樣式變體

#### Primary（主要按鈕）
```vue
<StyledButton variant="primary">主要操作</StyledButton>
```
**Tailwind 類名：**
```
bg-blue-600 text-white hover:bg-blue-700 
focus:ring-2 focus:ring-blue-500
```

#### Secondary（次要按鈕）
```vue
<StyledButton variant="secondary">次要操作</StyledButton>
```
**Tailwind 類名：**
```
bg-gray-200 text-gray-800 hover:bg-gray-300 
focus:ring-2 focus:ring-gray-400
```

#### Danger（危險操作）
```vue
<StyledButton variant="danger">刪除</StyledButton>
```
**Tailwind 類名：**
```
bg-red-600 text-white hover:bg-red-700 
focus:ring-2 focus:ring-red-500
```

#### Ghost（透明按鈕）
```vue
<StyledButton variant="ghost">取消</StyledButton>
```
**Tailwind 類名：**
```
bg-transparent text-gray-600 hover:bg-gray-100 
focus:ring-2 focus:ring-gray-300
```

### 尺寸變體

```vue
<!-- 小型 -->
<StyledButton size="sm">小按鈕</StyledButton>
<!-- px-3 py-1.5 text-sm -->

<!-- 中型（預設）-->
<StyledButton size="md">中按鈕</StyledButton>
<!-- px-4 py-2 text-base -->

<!-- 大型 -->
<StyledButton size="lg">大按鈕</StyledButton>
<!-- px-6 py-3 text-lg -->
```

### 載入狀態

```vue
<template>
  <StyledButton 
    variant="primary" 
    :loading="isSubmitting"
    @click="handleSubmit"
  >
    提交
  </StyledButton>
</template>

<script setup>
const isSubmitting = ref(false);

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    await submitForm();
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

### 完整實現

```vue
<!-- components/StyledButton.vue -->
<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="mr-2">
      <LoadingSpinner size="sm" />
    </span>
    <span v-if="icon && iconPosition === 'left'" class="mr-2">
      <i :class="`icon-${icon}`"></i>
    </span>
    <slot />
    <span v-if="icon && iconPosition === 'right'" class="ml-2">
      <i :class="`icon-${icon}`"></i>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  disabled: Boolean,
  loading: Boolean,
  icon: String,
  iconPosition: {
    type: String,
    default: 'left',
    validator: (v) => ['left', 'right'].includes(v)
  }
});

defineEmits(['click']);

const buttonClass = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return [base, variants[props.variant], sizes[props.size]].join(' ');
});
</script>
```

---

## StyledInput 輸入框

### 基本用法

```vue
<template>
  <StyledInput
    v-model="clientName"
    label="公司名稱"
    placeholder="請輸入公司名稱"
    :required="true"
    :error="errors.clientName"
  />
</template>
```

### Props

| Prop | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `modelValue` | string | - | v-model 綁定值 |
| `label` | string | - | 標籤文字 |
| `placeholder` | string | - | 佔位符文字 |
| `type` | string | `'text'` | 輸入框類型 |
| `required` | boolean | `false` | 是否必填 |
| `disabled` | boolean | `false` | 是否禁用 |
| `error` | string | - | 錯誤訊息 |
| `hint` | string | - | 提示訊息 |
| `maxlength` | number | - | 最大長度 |

### 樣式狀態

#### 正常狀態
```
border-gray-300 focus:border-blue-500 focus:ring-blue-500
```

#### 錯誤狀態
```
border-red-500 focus:border-red-500 focus:ring-red-500
```

#### 禁用狀態
```
bg-gray-100 text-gray-500 cursor-not-allowed
```

### 完整實現

```vue
<!-- components/StyledInput.vue -->
<template>
  <div class="mb-4">
    <label 
      v-if="label" 
      :for="inputId" 
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="maxlength"
      :class="inputClass"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    />
    
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
    
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  type: {
    type: String,
    default: 'text'
  },
  required: Boolean,
  disabled: Boolean,
  error: String,
  hint: String,
  maxlength: Number
});

defineEmits(['update:modelValue', 'blur', 'focus']);

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`);

const inputClass = computed(() => {
  const base = 'block w-full rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
  
  if (props.error) {
    return `${base} border-red-500 focus:border-red-500 focus:ring-red-500`;
  }
  
  if (props.disabled) {
    return `${base} border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed`;
  }
  
  return `${base} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
});
</script>
```

---

## Modal 彈窗

### 基本用法

```vue
<template>
  <Modal
    :show="showModal"
    title="新增客戶"
    @close="showModal = false"
    @confirm="handleConfirm"
  >
    <template #default>
      <!-- 彈窗內容 -->
      <p>這是彈窗內容</p>
    </template>
  </Modal>
</template>
```

### Props

| Prop | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `show` | boolean | `false` | 是否顯示彈窗 |
| `title` | string | - | 彈窗標題 |
| `size` | string | `'md'` | 彈窗大小 (`sm`, `md`, `lg`, `xl`) |
| `confirmText` | string | `'確認'` | 確認按鈕文字 |
| `cancelText` | string | `'取消'` | 取消按鈕文字 |
| `loading` | boolean | `false` | 確認按鈕載入狀態 |
| `hideFooter` | boolean | `false` | 是否隱藏底部按鈕 |

### 完整實現

```vue
<!-- components/Modal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="show" 
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="handleClose"
      >
        <!-- 背景遮罩 -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <!-- 彈窗容器 -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div :class="modalClass" @click.stop>
            <!-- 標題 -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ title }}
              </h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                @click="handleClose"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- 內容 -->
            <div class="px-6 py-4">
              <slot />
            </div>
            
            <!-- 底部按鈕 -->
            <div v-if="!hideFooter" class="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <StyledButton
                variant="ghost"
                @click="handleClose"
              >
                {{ cancelText }}
              </StyledButton>
              <StyledButton
                variant="primary"
                :loading="loading"
                @click="$emit('confirm')"
              >
                {{ confirmText }}
              </StyledButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import StyledButton from './StyledButton.vue';

const props = defineProps({
  show: Boolean,
  title: String,
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
  },
  confirmText: {
    type: String,
    default: '確認'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  loading: Boolean,
  hideFooter: Boolean
});

const emit = defineEmits(['close', 'confirm']);

const modalClass = computed(() => {
  const base = 'bg-white rounded-lg shadow-xl relative';
  const sizes = {
    sm: 'max-w-sm w-full',
    md: 'max-w-md w-full',
    lg: 'max-w-2xl w-full',
    xl: 'max-w-4xl w-full'
  };
  return `${base} ${sizes[props.size]}`;
});

function handleClose() {
  emit('close');
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
```

---

## DataTable 資料表格

### 基本用法

```vue
<template>
  <DataTable
    :columns="columns"
    :data="clients"
    :loading="isLoading"
    @row-click="handleRowClick"
  />
</template>

<script setup>
const columns = [
  { key: 'client_id', label: '統一編號', width: '120px' },
  { key: 'company_name', label: '公司名稱', sortable: true },
  { key: 'assignee_name', label: '負責人', width: '100px' },
  { key: 'actions', label: '操作', width: '120px', type: 'actions' }
];

const clients = ref([]);
</script>
```

### Props

| Prop | 類型 | 說明 |
|------|------|------|
| `columns` | array | 欄位配置 |
| `data` | array | 資料陣列 |
| `loading` | boolean | 載入狀態 |
| `selectable` | boolean | 是否可選擇 |
| `emptyText` | string | 空資料提示文字 |

### 欄位配置

```javascript
{
  key: 'client_id',        // 資料鍵值
  label: '統一編號',        // 顯示標籤
  width: '120px',          // 欄位寬度（可選）
  sortable: true,          // 是否可排序（可選）
  type: 'text',            // 欄位類型（text, date, actions）
  align: 'left'            // 對齊方式（left, center, right）
}
```

---

## FormLayout 表單布局

### 基本用法

```vue
<template>
  <FormLayout title="客戶資料">
    <StyledInput
      v-model="form.client_id"
      label="統一編號"
      :required="true"
    />
    <StyledInput
      v-model="form.company_name"
      label="公司名稱"
      :required="true"
    />
  </FormLayout>
</template>
```

### Props

| Prop | 類型 | 說明 |
|------|------|------|
| `title` | string | 表單標題 |
| `columns` | number | 欄位數量（1 或 2）|

---

## 統一設計原則

### ✅ 必須遵守
1. **使用 Tailwind CSS**：所有樣式使用 Tailwind 類名
2. **響應式設計**：支持手機、平板、桌面
3. **無障礙設計**：支持鍵盤操作和屏幕閱讀器
4. **統一色彩**：
   - Primary: `blue-600`
   - Success: `green-600`
   - Danger: `red-600`
   - Gray: `gray-600`
5. **統一間距**：使用 4px 倍數（4, 8, 12, 16, 24, 32, 48）
6. **統一圓角**：使用 `rounded-md`（6px）或 `rounded-lg`（8px）
7. **統一陰影**：使用 `shadow-sm` 或 `shadow-md`

### 📏 間距規範
```
間距 4px:  space-1  (0.25rem)
間距 8px:  space-2  (0.5rem)
間距 12px: space-3  (0.75rem)
間距 16px: space-4  (1rem)
間距 24px: space-6  (1.5rem)
間距 32px: space-8  (2rem)
```

### 🎨 色彩規範
```
主色調：  bg-blue-600 text-white
次要色：  bg-gray-200 text-gray-800
成功色：  bg-green-600 text-white
警告色：  bg-yellow-500 text-white
危險色：  bg-red-600 text-white
```

---

## 🔗 相關文檔

- **[Vue 開發規範](../開發規範/Vue開發規範.md)** - Vue 組件開發標準
- **[快速開發指南](../快速參考/快速開發指南.md)** - 開發流程指引

---

**最後更新：** 2025年10月27日  
**適用範圍：** 所有前端組件

