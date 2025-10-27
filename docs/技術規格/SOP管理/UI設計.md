# SOP文件管理 - UI 設計

**頁面路徑：** `/knowledge/sop`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## SOP 列表頁

```vue
<template>
  <div class="sop-page">
    <div class="page-header">
      <h2>SOP 標準作業流程</h2>
      <button 
        v-if="user.role === 'admin'" 
        @click="createSOP"
        class="btn-primary"
      >
        + 新增 SOP
      </button>
    </div>
    
    <!-- 搜尋與篩選 -->
    <div class="filters">
      <input 
        v-model="search"
        type="text"
        placeholder="搜尋 SOP 標題或內容..."
        class="search-input"
      />
      
      <select v-model="filterCategory">
        <option value="">所有分類</option>
        <option value="記帳服務">記帳服務</option>
        <option value="報稅服務">報稅服務</option>
        <option value="審計服務">審計服務</option>
        <option value="諮詢服務">諮詢服務</option>
      </select>
    </div>
    
    <!-- SOP 卡片列表 -->
    <div class="sop-grid">
      <div 
        v-for="sop in filteredSOPs"
        :key="sop.sop_id"
        class="sop-card"
        @click="viewSOP(sop)"
      >
        <div class="card-header">
          <h3>{{ sop.title }}</h3>
          <span class="version">v{{ sop.version }}</span>
        </div>
        
        <div class="card-meta">
          <span class="category">{{ sop.category }}</span>
          <span class="views">👁️ {{ sop.view_count }}</span>
        </div>
        
        <div class="card-tags">
          <span 
            v-for="tag in JSON.parse(sop.tags || '[]')"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
        
        <div class="card-footer">
          <span class="updated">
            {{ formatDate(sop.updated_at) }}
          </span>
          <button 
            v-if="user.role === 'admin'"
            @click.stop="editSOP(sop)"
            class="btn-icon"
          >
            ✏️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.sop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.sop-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.sop-card:hover {
  border-color: #2196F3;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.version {
  background: #e3f2fd;
  color: #2196F3;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.tag {
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #666;
}
</style>
```

---

## SOP 編輯器

```vue
<template>
  <div class="sop-editor">
    <form @submit.prevent="saveSOP">
      <div class="form-group">
        <label>標題 *</label>
        <input v-model="form.title" required />
      </div>
      
      <div class="form-group">
        <label>分類</label>
        <select v-model="form.category">
          <option value="記帳服務">記帳服務</option>
          <option value="報稅服務">報稅服務</option>
          <option value="審計服務">審計服務</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>內容（支援 Markdown）*</label>
        <textarea 
          v-model="form.content"
          rows="15"
          required
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="previewSOP">預覽</button>
        <button type="submit" class="btn-primary">儲存</button>
      </div>
    </form>
  </div>
</template>
```

---

## 相關文檔

- [功能模塊 - SOP文件管理](../../功能模塊/18-SOP文件管理.md)
- [業務邏輯](./業務邏輯.md)

