# 資源中心管理 - UI 設計

**頁面路徑：** `/resources`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 資源中心首頁

```vue
<template>
  <div class="resources-page">
    <div class="page-header">
      <h2>📦 資源中心</h2>
      <button 
        v-if="user.role === 'admin'"
        @click="uploadResource"
        class="btn-primary"
      >
        + 上傳資源
      </button>
    </div>
    
    <!-- 搜尋與篩選 -->
    <div class="filters">
      <input 
        v-model="search"
        type="text"
        placeholder="搜尋資源..."
        class="search-input"
      />
      
      <select v-model="filterType">
        <option value="">所有類型</option>
        <option value="file">檔案</option>
        <option value="link">連結</option>
      </select>
      
      <select v-model="filterCategory">
        <option value="">所有分類</option>
        <option value="表單範本">表單範本</option>
        <option value="官方網站">官方網站</option>
        <option value="參考文件">參考文件</option>
        <option value="工具軟體">工具軟體</option>
      </select>
    </div>
    
    <!-- 資源列表 -->
    <div class="resources-grid">
      <div 
        v-for="resource in filteredResources"
        :key="resource.resource_id"
        class="resource-card"
        :class="resource.resource_type"
      >
        <div class="card-icon">
          {{ getResourceIcon(resource) }}
        </div>
        
        <div class="card-body">
          <h3>{{ resource.title }}</h3>
          
          <p v-if="resource.description" class="description">
            {{ resource.description }}
          </p>
          
          <div class="card-meta">
            <span class="type">
              {{ resource.resource_type === 'file' ? '📄 檔案' : '🔗 連結' }}
            </span>
            <span v-if="resource.file_extension" class="extension">
              .{{ resource.file_extension }}
            </span>
            <span v-if="resource.file_size" class="size">
              {{ formatFileSize(resource.file_size) }}
            </span>
            <span class="downloads">
              👇 {{ resource.download_count }}
            </span>
          </div>
          
          <div class="card-tags">
            <span 
              v-for="tag in JSON.parse(resource.tags || '[]')"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
          </div>
          
          <div class="card-actions">
            <button 
              v-if="resource.resource_type === 'file'"
              @click="downloadFile(resource)"
              class="btn-primary"
            >
              下載檔案
            </button>
            <button 
              v-else
              @click="openLink(resource)"
              class="btn-primary"
            >
              開啟連結
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.resource-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  gap: 16px;
}

.resource-card.file {
  border-left: 4px solid #2196F3;
}

.resource-card.link {
  border-left: 4px solid #4caf50;
}

.card-icon {
  font-size: 3rem;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
}

.description {
  color: #666;
  font-size: 0.875rem;
  margin: 8px 0;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 12px 0;
  font-size: 0.875rem;
  color: #666;
}

.extension {
  background: #e3f2fd;
  color: #2196F3;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
</style>
```

---

## 上傳資源表單

```vue
<template>
  <div class="upload-resource-form">
    <form @submit.prevent="submitResource">
      <div class="form-group">
        <label>資源類型 *</label>
        <select v-model="form.resource_type" required>
          <option value="file">檔案</option>
          <option value="link">連結</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>標題 *</label>
        <input v-model="form.title" required />
      </div>
      
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="form.description" rows="3"></textarea>
      </div>
      
      <!-- 檔案上傳 -->
      <div v-if="form.resource_type === 'file'" class="form-group">
        <label>選擇檔案 *</label>
        <input 
          type="file" 
          @change="handleFileChange"
          required
        />
      </div>
      
      <!-- 連結輸入 -->
      <div v-else class="form-group">
        <label>外部連結 *</label>
        <input 
          v-model="form.external_url" 
          type="url"
          required
        />
      </div>
      
      <div class="form-group">
        <label>分類</label>
        <select v-model="form.category">
          <option value="表單範本">表單範本</option>
          <option value="官方網站">官方網站</option>
          <option value="參考文件">參考文件</option>
        </select>
      </div>
      
      <button type="submit" class="btn-primary">上傳</button>
    </form>
  </div>
</template>
```

---

## 相關文檔

- [功能模塊 - 資源中心管理](../../功能模塊/22-資源中心管理.md)
- [業務邏輯](./業務邏輯.md)

