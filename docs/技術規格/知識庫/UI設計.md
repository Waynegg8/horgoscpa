# 通用知識庫 - UI 設計

**頁面路徑：** `/knowledge/articles`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 知識庫首頁

```vue
<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h2>📚 知識庫</h2>
      <button 
        v-if="user.role === 'admin'"
        @click="createArticle"
        class="btn-primary"
      >
        + 新增文章
      </button>
    </div>
    
    <!-- 置頂文章 -->
    <div v-if="pinnedArticles.length > 0" class="pinned-section">
      <h3>📌 置頂文章</h3>
      <div class="article-list">
        <div 
          v-for="article in pinnedArticles"
          :key="article.article_id"
          class="article-item pinned"
          @click="viewArticle(article)"
        >
          <h4>{{ article.title }}</h4>
          <div class="meta">
            <span class="category">{{ article.category }}</span>
            <span class="views">👁️ {{ article.view_count }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 搜尋與篩選 -->
    <div class="filters">
      <input 
        v-model="search"
        type="text"
        placeholder="搜尋文章標題或內容..."
        class="search-input"
      />
      
      <select v-model="filterCategory">
        <option value="">所有分類</option>
        <option value="稅務知識">稅務知識</option>
        <option value="記帳技巧">記帳技巧</option>
        <option value="法規解讀">法規解讀</option>
        <option value="系統使用">系統使用</option>
      </select>
    </div>
    
    <!-- 文章列表 -->
    <div class="articles-grid">
      <div 
        v-for="article in filteredArticles"
        :key="article.article_id"
        class="article-card"
        @click="viewArticle(article)"
      >
        <h3>{{ article.title }}</h3>
        
        <div class="card-meta">
          <span class="category">{{ article.category }}</span>
          <span class="date">{{ formatDate(article.created_at) }}</span>
        </div>
        
        <div class="card-tags">
          <span 
            v-for="tag in JSON.parse(article.tags || '[]')"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
        
        <div class="card-footer">
          <span class="views">👁️ {{ article.view_count }}</span>
          <span class="author">by {{ article.author_name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.pinned-section {
  background: #fff9c4;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.article-item.pinned {
  background: white;
  border-left: 4px solid #ffc107;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  border-radius: 4px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.article-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.article-card:hover {
  border-color: #2196F3;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
</style>
```

---

## 相關文檔

- [功能模塊 - 通用知識庫](../../功能模塊/20-通用知識庫.md)
- [業務邏輯](./業務邏輯.md)

