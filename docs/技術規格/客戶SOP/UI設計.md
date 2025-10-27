# 客戶專屬SOP連結 - UI 設計

**頁面路徑：** `/clients/:id/sop`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 客戶 SOP 管理介面

```vue
<template>
  <div class="client-sop-page">
    <h2>{{ client.name }} - 專屬 SOP</h2>
    
    <!-- 新增 SOP 關聯 -->
    <div v-if="user.role === 'admin'" class="add-sop-section">
      <h3>關聯新 SOP</h3>
      <form @submit.prevent="linkSOP">
        <div class="form-row">
          <select v-model="selectedSOPId" required>
            <option value="">選擇 SOP</option>
            <option 
              v-for="sop in availableSOPs"
              :key="sop.sop_id"
              :value="sop.sop_id"
            >
              {{ sop.title }}
            </option>
          </select>
          
          <input 
            v-model="sopNotes"
            type="text"
            placeholder="客戶專屬備註（選填）"
          />
          
          <button type="submit" class="btn-primary">+ 關聯</button>
        </div>
      </form>
    </div>
    
    <!-- 已關聯的 SOP 列表 -->
    <div class="linked-sop-list">
      <h3>已關聯的 SOP</h3>
      
      <div v-if="linkedSOPs.length === 0" class="empty-state">
        此客戶尚未關聯任何 SOP
      </div>
      
      <div v-else class="sop-cards">
        <div 
          v-for="link in linkedSOPs"
          :key="link.link_id"
          class="sop-card"
        >
          <div class="card-header">
            <h4 @click="openSOP(link.sop_id)">
              {{ link.sop_title }}
            </h4>
            <button 
              v-if="user.role === 'admin'"
              @click="unlinkSOP(link.link_id)"
              class="btn-icon"
            >
              🗑️
            </button>
          </div>
          
          <div class="card-meta">
            <span class="category">{{ link.sop_category }}</span>
            <span class="version">v{{ link.sop_version }}</span>
          </div>
          
          <div v-if="link.notes" class="client-notes">
            <strong>專屬備註：</strong>{{ link.notes }}
          </div>
          
          <button 
            @click="openSOP(link.sop_id)"
            class="btn-secondary"
          >
            查看 SOP →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.add-sop-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-row select,
.form-row input {
  flex: 1;
}

.sop-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.sop-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.sop-card h4 {
  margin: 0 0 12px 0;
  color: #2196F3;
  cursor: pointer;
}

.sop-card h4:hover {
  text-decoration: underline;
}

.client-notes {
  background: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  margin: 12px 0;
  font-size: 0.875rem;
}
</style>
```

---

## 相關文檔

- [功能模塊 - 客戶專屬SOP連結](../../功能模塊/19-客戶專屬SOP連結.md)
- [業務邏輯](./業務邏輯.md)

