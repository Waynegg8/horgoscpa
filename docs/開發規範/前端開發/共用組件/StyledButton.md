# StyledButton 組件

**最後更新：** 2025年10月27日

---

## 使用範例

```vue
<template>
  <!-- 主要按鈕 -->
  <StyledButton variant="primary" @click="handleSave">
    儲存
  </StyledButton>

  <!-- 次要按鈕 -->
  <StyledButton variant="secondary" @click="handleCancel">
    取消
  </StyledButton>

  <!-- 危險按鈕 -->
  <StyledButton variant="danger" @click="handleDelete">
    刪除
  </StyledButton>

  <!-- 禁用狀態 -->
  <StyledButton variant="primary" :disabled="!isValid">
    提交
  </StyledButton>

  <!-- 載入狀態 -->
  <StyledButton variant="primary" :loading="isLoading">
    儲存中...
  </StyledButton>

  <!-- 不同大小 -->
  <StyledButton size="sm">小</StyledButton>
  <StyledButton size="md">中</StyledButton>
  <StyledButton size="lg">大</StyledButton>
</template>
```

---

## 實作範例

```vue
<!-- components/common/StyledButton.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button'
});

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="[
      'inline-flex items-center justify-center font-medium rounded transition-colors',
      variantClasses[props.variant],
      sizeClasses[props.size],
      { 'opacity-50 cursor-not-allowed': props.disabled || props.loading }
    ]"
  >
    <svg v-if="props.loading" class="animate-spin -ml-1 mr-2 h-4 w-4">
      <!-- Loading icon -->
    </svg>
    <slot />
  </button>
</template>
```

---

## Props

| 屬性 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | 按鈕樣式 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按鈕大小 |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | 按鈕類型 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否顯示載入動畫 |

---

**相關：** [StyledInput](./StyledInput.md) | [共用組件規範](./共用組件規範.md)

