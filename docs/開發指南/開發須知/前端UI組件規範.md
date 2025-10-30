# 前端 UI 組件規範

**給 AI：** 統一的前端組件設計規範

---

## 🎨 共用組件

### LoadingState（加載狀態組件）

```vue
<template>
  <div v-if="isLoading" class="loading-overlay" :class="{ inline }" role="status" aria-live="polite">
    <div class="loading-spinner">
      <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-3 text-gray-700">{{ loadingText || '載入中...' }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading: Boolean,
  loadingText: String,
  inline: Boolean  // 行内模式（不遮罩全屏）
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-overlay.inline {
  position: relative;
  background: transparent;
  min-height: 100px;
}

.loading-spinner {
  display: flex;
  align-items: center;
  padding: 1.5rem 2rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
```

---

### ErrorMessage（錯誤提示組件）

```vue
<template>
  <div v-if="error" class="error-container" :class="errorType" role="alert" aria-live="assertive">
    <div class="error-icon">
      <svg v-if="errorType === 'error'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <svg v-else-if="errorType === 'warning'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <svg v-else-if="errorType === 'success'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
    </div>
    
    <div class="error-content">
      <p class="error-title" v-if="errorTitle">{{ errorTitle }}</p>
      <p class="error-message">{{ errorMessage }}</p>
      
      <ul v-if="errorDetails && errorDetails.length" class="error-details">
        <li v-for="(detail, index) in errorDetails" :key="index">{{ detail }}</li>
      </ul>
    </div>
    
    <button 
      v-if="dismissible" 
      @click="$emit('dismiss')"
      class="error-close"
      aria-label="關閉"
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  error: Boolean,
  errorType: {
    type: String,
    default: 'error',  // error, warning, success, info
    validator: (value) => ['error', 'warning', 'success', 'info'].includes(value)
  },
  errorTitle: String,
  errorMessage: {
    type: String,
    required: true
  },
  errorDetails: Array,  // 詳細錯誤列表
  dismissible: {
    type: Boolean,
    default: true
  }
});

defineEmits(['dismiss']);
</script>

<style scoped>
.error-container {
  display: flex;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  border-width: 1px;
}

.error-container.error {
  background-color: #FEF2F2;
  border-color: #FCA5A5;
  color: #991B1B;
}

.error-container.warning {
  background-color: #FFFBEB;
  border-color: #FCD34D;
  color: #92400E;
}

.error-container.success {
  background-color: #F0FDF4;
  border-color: #86EFAC;
  color: #166534;
}

.error-container.info {
  background-color: #EFF6FF;
  border-color: #93C5FD;
  color: #1E40AF;
}

.error-icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-message {
  font-size: 0.875rem;
}

.error-details {
  margin-top: 0.5rem;
  margin-left: 1.25rem;
  list-style-type: disc;
  font-size: 0.875rem;
}

.error-close {
  flex-shrink: 0;
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.error-close:hover {
  opacity: 1;
}
</style>
```

---

### ButtonWithLoading（帶加載狀態的按鈕）

```vue
<template>
  <button
    :disabled="isLoading || disabled"
    :class="[
      'btn',
      variant,
      size,
      { 'btn-loading': isLoading }
    ]"
    @click="handleClick"
  >
    <svg 
      v-if="isLoading" 
      class="animate-spin h-4 w-4 mr-2" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot></slot>
  </button>
</template>

<script setup>
const props = defineProps({
  isLoading: Boolean,
  disabled: Boolean,
  variant: {
    type: String,
    default: 'primary',  // primary, secondary, danger
    validator: (value) => ['primary', 'secondary', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',  // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
});

const emit = defineEmits(['click']);

function handleClick(event) {
  if (!props.isLoading && !props.disabled) {
    emit('click', event);
  }
}
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn.medium {
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
}

.btn.large {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}

.btn.primary {
  background-color: #2563EB;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background-color: #1D4ED8;
}

.btn.secondary {
  background-color: #6B7280;
  color: white;
}

.btn.secondary:hover:not(:disabled) {
  background-color: #4B5563;
}

.btn.danger {
  background-color: #DC2626;
  color: white;
}

.btn.danger:hover:not(:disabled) {
  background-color: #B91C1C;
}
</style>
```

---

## 📋 使用示例

### 頁面中使用加載狀態

```vue
<template>
  <div class="clients-page">
    <h1>客戶管理</h1>
    
    <!-- 加載狀態 -->
    <LoadingState :isLoading="isLoading" loadingText="載入客戶資料中..." />
    
    <!-- 錯誤提示 -->
    <ErrorMessage
      v-if="error"
      :error="!!error"
      errorType="error"
      errorTitle="載入失敗"
      :errorMessage="error"
      @dismiss="error = null"
    />
    
    <!-- 主要內容 -->
    <div v-if="!isLoading && !error">
      <ClientList :clients="clients" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ErrorMessage from '@/components/shared/ErrorMessage.vue';
import { getClients } from '@/api/clients';

const isLoading = ref(false);
const error = ref(null);
const clients = ref([]);

async function loadClients() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await getClients();
    clients.value = response.data;
  } catch (err) {
    error.value = err.message || '載入客戶資料失敗';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadClients();
});
</script>
```

### 表單提交帶加載狀態

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <ErrorMessage
      v-if="submitError"
      :error="!!submitError"
      errorType="error"
      errorTitle="儲存失敗"
      :errorMessage="submitError"
      :errorDetails="validationErrors"
      @dismiss="submitError = null"
    />
    
    <!-- 表單字段 -->
    <input v-model="form.company_name" placeholder="公司名稱" />
    
    <!-- 提交按鈕 -->
    <ButtonWithLoading
      :isLoading="isSubmitting"
      variant="primary"
      @click="handleSubmit"
    >
      儲存
    </ButtonWithLoading>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import ErrorMessage from '@/components/shared/ErrorMessage.vue';
import ButtonWithLoading from '@/components/shared/ButtonWithLoading.vue';
import { createClient } from '@/api/clients';

const form = ref({
  company_name: ''
});

const isSubmitting = ref(false);
const submitError = ref(null);
const validationErrors = ref([]);

async function handleSubmit() {
  isSubmitting.value = true;
  submitError.value = null;
  validationErrors.value = [];
  
  try {
    await createClient(form.value);
    // 成功處理
  } catch (err) {
    submitError.value = err.message || '儲存失敗';
    if (err.details) {
      validationErrors.value = err.details;
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

### Toast 通知組件

```vue
<template>
  <Transition name="toast">
    <div v-if="visible" :class="['toast', type]" role="alert">
      <div class="toast-content">
        <span class="toast-icon">{{ iconMap[type] }}</span>
        <span class="toast-message">{{ message }}</span>
      </div>
      <button @click="close" class="toast-close">×</button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  message: String,
  type: {
    type: String,
    default: 'info',  // success, error, warning, info
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000  // 3秒後自動關閉
  }
});

const emit = defineEmits(['close']);

const visible = ref(false);
const iconMap = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

let timer = null;

function close() {
  visible.value = false;
  emit('close');
}

watch(() => props.message, (newMessage) => {
  if (newMessage) {
    visible.value = true;
    
    if (timer) clearTimeout(timer);
    
    if (props.duration > 0) {
      timer = setTimeout(() => {
        close();
      }, props.duration);
    }
  }
});

onMounted(() => {
  if (props.message) {
    visible.value = true;
    
    if (props.duration > 0) {
      timer = setTimeout(() => {
        close();
      }, props.duration);
    }
  }
});
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 9999;
}

.toast.success {
  background: #10B981;
  color: white;
}

.toast.error {
  background: #EF4444;
  color: white;
}

.toast.warning {
  background: #F59E0B;
  color: white;
}

.toast.info {
  background: #3B82F6;
  color: white;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  margin-left: 1rem;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
```

---

## 📚 組件庫清單

### 基礎組件
- ✅ LoadingState - 加載狀態
- ✅ ErrorMessage - 錯誤提示
- ✅ ButtonWithLoading - 帶加載的按鈕
- ✅ Toast - 輕量級通知

### 表單組件
- StyledInput - 統一輸入框
- StyledSelect - 統一下拉選擇
- StyledTextarea - 統一文本域
- DatePicker - 日期選擇器

### 佈局組件
- Modal - 彈窗
- Drawer - 抽屜
- Tabs - 標籤頁
- Card - 卡片

### 數據展示
- DataTable - 數據表格
- Pagination - 分頁組件
- EmptyState - 空狀態
- Badge - 標籤徽章

---

**這個文檔定義了所有共用 UI 組件的標準實現。**

