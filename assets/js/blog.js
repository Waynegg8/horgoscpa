// Blog.js - 从 CMS 加载文章列表
(function() {
  const onProdHost = location.hostname.endsWith('horgoscpa.com');
  const apiBase = onProdHost ? '/api/v1/public' : 'https://www.horgoscpa.com/api/v1/public';
  
  let currentPage = 1;
  let totalPages = 1;
  const perPage = 9;
  
  // 从 URL 获取筛选参数
  function getFilters() {
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || '',
      tag: params.get('tag') || '',
      keyword: params.get('q') || params.get('keyword') || ''
    };
  }
  
  // 加载文章列表
  async function loadPosts(page = 1) {
    const container = document.getElementById('blog-posts-container');
    container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>正在載入文章...</p></div>';
    
    try {
      const filters = getFilters();
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString()
      });
      
      if (filters.category) params.set('category', filters.category);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.keyword) params.set('keyword', filters.keyword);
      
      const res = await fetch(`${apiBase}/articles?${params.toString()}`);
      if (!res.ok) throw new Error('載入失敗');
      
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error('數據格式錯誤');
      
      const posts = json.data;
      const meta = json.meta || {};
      
      currentPage = meta.page || 1;
      totalPages = Math.ceil((meta.total || 0) / perPage);
      
      renderPosts(posts);
      renderPagination();
      
      // 如果有筛选条件，显示提示
      if (filters.category || filters.tag || filters.keyword) {
        showSearchResults(filters, meta.total || 0);
      }
    } catch (err) {
      console.error('載入文章失敗:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">😔</div>
          <p>載入文章失敗，請稍後再試</p>
        </div>
      `;
    }
  }
  
  // 渲染文章列表
  function renderPosts(posts) {
    const container = document.getElementById('blog-posts-container');
    
    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <p>目前沒有文章</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'blog-grid';
    
    posts.forEach(post => {
      const article = document.createElement('article');
      article.className = 'blog-card';
      
      const publishedDate = post.publishedAt ? new Date(post.publishedAt) : new Date();
      const tags = Array.isArray(post.tags) ? post.tags : [];
      const articleUrl = `/blog-article.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      
      article.innerHTML = `
        <a href="${articleUrl}" class="blog-card-link">
          ${post.featuredImage ? `
          <div class="blog-card-image">
            <img src="${post.featuredImage}" alt="${post.title}" loading="lazy">
          </div>
          ` : ''}
          <div class="blog-card-content">
            <div class="blog-card-meta">
              <span class="blog-category">${post.category || '未分類'}</span>
              <span class="blog-date">${publishedDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h2 class="blog-card-title">${post.title}</h2>
            ${post.summary ? `<p class="blog-card-excerpt">${post.summary}</p>` : ''}
            ${tags.length > 0 ? `
            <div class="blog-tags">
              ${tags.slice(0, 3).map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
            </div>
            ` : ''}
            <div class="blog-card-footer">
              <span class="read-more">閱讀更多 →</span>
              <span class="view-count">👁️ ${post.viewCount || 0}</span>
            </div>
          </div>
        </a>
      `;
      
      grid.appendChild(article);
    });
    
    container.appendChild(grid);
  }
  
  // 渲染分页
  function renderPagination() {
    const container = document.getElementById('pagination-container');
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    
    let html = '<div class="pagination-wrapper">';
    
    // 上一页
    if (currentPage > 1) {
      html += `<button class="pagination-btn" onclick="window.blogLoadPage(${currentPage - 1})">上一頁</button>`;
    }
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        html += `<button class="pagination-btn active">${i}</button>`;
      } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        html += `<button class="pagination-btn" onclick="window.blogLoadPage(${i})">${i}</button>`;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }
    
    // 下一页
    if (currentPage < totalPages) {
      html += `<button class="pagination-btn" onclick="window.blogLoadPage(${currentPage + 1})">下一頁</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  // 显示搜索结果提示
  function showSearchResults(filters, total) {
    const container = document.getElementById('search-results-container');
    let message = '搜尋結果：';
    
    if (filters.keyword) message += `關鍵字「${filters.keyword}」`;
    if (filters.category) message += ` 分類「${filters.category}」`;
    if (filters.tag) message += ` 標籤「${filters.tag}」`;
    
    message += ` - 共 ${total} 篇文章`;
    
    container.innerHTML = `
      <div style="background: #f0f9ff; border-left: 4px solid #2c5f7c; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0; color: #1e4a63; font-weight: 600;">${message}</p>
        <a href="/blog.html" style="color: #2c5f7c; text-decoration: none; font-size: 14px; margin-top: 8px; display: inline-block;">清除篩選</a>
      </div>
    `;
  }
  
  // 加载热门文章
  async function loadPopularPosts() {
    try {
      const res = await fetch(`${apiBase}/articles?perPage=5`);
      if (!res.ok) return;
      
      const json = await res.json();
      if (!json.ok || !json.data) return;
      
      const container = document.getElementById('popular-posts-container');
      if (!container) return;
      
      const posts = json.data.slice(0, 5);
      container.innerHTML = posts.map(post => `
        <li>
          <a href="/blog-article.html?slug=${encodeURIComponent(post.slug || post.id)}">
            ${post.title}
            <span style="font-size: 12px; color: #9ca3af; display: block; margin-top: 4px;">👁️ ${post.viewCount || 0} 次瀏覽</span>
          </a>
        </li>
      `).join('');
    } catch (err) {
      console.error('載入熱門文章失敗:', err);
    }
  }
  
  // 加载标签云
  async function loadTagCloud() {
    try {
      const res = await fetch(`${apiBase}/articles?perPage=50`);
      if (!res.ok) return;
      
      const json = await res.json();
      if (!json.ok || !json.data) return;
      
      const container = document.getElementById('tag-cloud-container');
      if (!container) return;
      
      // 统计标签
      const tagCount = {};
      json.data.forEach(post => {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });
      
      // 排序并显示前 10 个
      const topTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (topTags.length === 0) {
        container.innerHTML = '<span style="color: #9ca3af;">暫無標籤</span>';
        return;
      }
      
      container.innerHTML = topTags.map(([tag, count]) => `
        <a href="/blog.html?tag=${encodeURIComponent(tag)}" class="tag-item">
          ${tag} <span class="tag-count">(${count})</span>
        </a>
      `).join('');
    } catch (err) {
      console.error('載入標籤雲失敗:', err);
    }
  }
  
  // 全局函数，用于分页点击
  window.blogLoadPage = function(page) {
    loadPosts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    loadPosts(1);
    loadPopularPosts();
    loadTagCloud();
  });
})();

