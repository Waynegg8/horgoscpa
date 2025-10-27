# StyledInput 組件

**最後更新：** 2025年10月27日

---

## 使用範例

```vue
<template>
  <!-- 基本輸入框 -->
  <StyledInput
    v-model="form.company_name"
    label="公司名稱"
    placeholder="請輸入公司名稱"
    required
  />

  <!-- 帶錯誤訊息 -->
  <StyledInput
    v-model="form.email"
    label="電子郵件"
    type="email"
    :error="errors.email"
  />

  <!-- 帶提示文字 -->
  <StyledInput
    v-model="form.tax_id"
    label="統一編號"
    hint="請輸入8位數字"
  />

  <!-- 禁用狀態 -->
  <StyledInput
    v-model="form.created_at"
    label="建立日期"
    disabled
  />
</template>
```

---

## 實作範例

```vue
<!-- components/common/StyledInput.vue -->
<script setup lang="ts">
interface Props {
  modelValue: string | number;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text'
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const inputId = `input-${Math.random().toString(36).substring(7)}`;
</script>

<template>
  <div class="form-group">
    <label v-if="props.label" :for="inputId" class="block text-sm font-medium text-gray-700 mb-1">
      {{ props.label }}
      <span v-if="props.required" class="text-red-600">*</span>
    </label>
    
    <input
      :id="inputId"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :required="props.required"
      :disabled="props.disabled"
      :class="[
        'w-full px-3 py-2 border rounded focus:outline-none focus:ring-2',
        props.error ? 'border-red-500' : 'border-gray-300'
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    
    <small v-if="props.hint && !props.error" class="text-sm text-gray-500 mt-1">
      {{ props.hint }}
    </small>
    
    <span v-if="props.error" class="text-sm text-red-600 mt-1" role="alert">
      {{ props.error }}
    </span>
  </div>
</template>
```

---

## Props

| 屬性 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `modelValue` | `string \| number` | - | 輸入值 |
| `label` | `string` | - | 標籤文字 |
| `type` | `'text' \| 'email' \| 'password' \| 'number'` | `'text'` | 輸入類型 |
| `placeholder` | `string` | - | 占位符 |
| `hint` | `string` | - | 提示文字 |
| `error` | `string` | - | 錯誤訊息 |
| `required` | `boolean` | `false` | 是否必填 |
| `disabled` | `boolean` | `false` | 是否禁用 |

---

**相關：** [StyledButton](./StyledButton.md) | [表單驗證](../../Vue組件/表單驗證.md)

