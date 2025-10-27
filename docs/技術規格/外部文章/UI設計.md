# 外部文章管理 - UI 設計

**頁面路徑：** `/knowledge/external`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 外部文章列表

```vue
<template>
  <div class="external-articles-page">
    <div class="page-header">
      <h2>🔗 外部文章</h2>
      <button 
        v-if="user.role === 'admin'"
        @click="addArticle"
        class="btn-primary"
      >
        + 新增連結
      </button>
    </div>
    
    <!-- 搜尋與篩選 -->
    <div class="filters">
      <input 
        v-model="search"
        type="text"
        placeholder="搜尋文章標題..."
        class="search-input"
      />
      
      <select v-model="filterSource">
        <option value="">所有來源</option>
        <option value="財政部">財政部</option>
        <option value="國稅局">國稅局</option>
        <option value="經濟部">經濟部</option>
        <option value="勞動部">勞動部</option>
      </select>
      
      <select v-model="filterCategory">
        <option value="">所有分類</option>
        <option value="稅務法規">稅務法規</option>
        <option value="公司法規">公司法規</option>
        <option value="勞動法規">勞動法規</option>
      </select>
    </div>
    
    <!-- 文章列表 -->
    <div class="articles-list">
      <div 
        v-for="article in filteredArticles"
        :key="article.external_article_id"
        class="article-item"
      >
        <div class="article-header">
          <h3>
            <a 
              :href="article.url" 
              target="_blank"
              @click="trackClick(article.external_article_id)"
            >
              {{ article.title }} 🔗
            </a>
          </h3>
          <button 
            v-if="user.role === 'admin'"
            @click="editArticle(article)"
            class="btn-icon"
          >
            ✏️
          </button>
        </div>
        
        <div class="article-meta">
          <span class="source">📰 {{ article.source }}</span>
          <span class="category">{{ article.category }}</span>
          <span class="date">{{ formatDate(article.published_date) }}</span>
          <span class="clicks">👆 {{ article.click_count }} 次點擊</span>
        </div>
        
        <p v-if="article.summary" class="summary">
          {{ article.summary }}
        </p>
        
        <div class="article-tags">
          <span 
            v-for="tag in JSON.parse(article.tags || '[]')"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.articles-list {
  margin-top: 24px;
}

.article-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.article-header h3 {
  margin: 0;
  flex: 1;
}

.article-header a {
  color: #2196F3;
  text-decoration: none;
}

.article-header a:hover {
  text-decoration: underline;
}

.article-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 0.875rem;
  color: #666;
}

.source {
  color: #4caf50;
  font-weight: 500;
}

.summary {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
  line-height: 1.6;
}
</style>
```

---

## 新增外部文章表單

```vue
<template>
  <div class="add-external-form">
    <form @submit.prevent="submitArticle">
      <div class="form-group">
        <label>文章標題 *</label>
        <input v-model="form.title" required />
      </div>
      
      <div class="form-group">
        <label>外部連結 *</label>
        <input v-model="form.url" type="url" required />
      </div>
      
      <div class="form-group">
        <label>來源</label>
        <input v-model="form.source" placeholder="例如：財政部" />
      </div>
      
      <div class="form-group">
        <label>摘要說明</label>
        <textarea v-model="form.summary" rows="3"></textarea>
      </div>
      
      <div class="form-group">
        <label>分類</label>
        <select v-model="form.category">
          <option value="稅務法規">稅務法規</option>
          <option value="公司法規">公司法規</option>
          <option value="勞動法規">勞動法規</option>
        </select>
      </div>
      
      <button type="submit" class="btn-primary">新增</button>
    </form>
  </div>
</template>
```

---

## 相關文檔

- [功能模塊 - 外部文章管理](../../功能模塊/21-外部文章管理.md)
- [業務邏輯](./業務邏輯.md)

