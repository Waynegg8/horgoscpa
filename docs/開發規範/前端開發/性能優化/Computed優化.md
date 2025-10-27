# Computed 與性能優化

**最後更新：** 2025年10月27日

---

## 使用 Computed（快取）

```vue
<script setup lang="ts">
// ✅ 快取計算結果
const filteredClients = computed(() => {
  return clients.value.filter(c => c.status === 'active');
});
</script>

<template>
  <!-- 只在 clients 改變時重新計算 -->
  <div v-for="client in filteredClients" :key="client.id">
    {{ client.name }}
  </div>
</template>
```

---

## 避免 Methods

```vue
<script setup lang="ts">
// ❌ 每次渲染都執行
const getFilteredClients = () => {
  return clients.value.filter(c => c.status === 'active');
};
</script>

<template>
  <!-- 每次渲染都重新計算 -->
  <div v-for="client in getFilteredClients()" :key="client.id">
    {{ client.name }}
  </div>
</template>
```

---

## v-memo（條件快取）

```vue
<template>
  <!-- 只在 updated_at 改變時重渲染 -->
  <div
    v-for="client in clients"
    :key="client.id"
    v-memo="[client.updated_at]"
  >
    <ClientCard :client="client" />
  </div>
</template>
```

---

**相關：** [列表優化](./列表優化.md)

