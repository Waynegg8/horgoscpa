document.addEventListener('DOMContentLoaded', function() {
  // 輸出調試信息，確認腳本已加載
  console.log('博客頁面腳本已加載');
  
  // 元素容器
  const postsContainer = document.getElementById('blog-posts-container');
  const popularPostsContainer = document.getElementById('popular-posts-container');
  const paginationContainer = document.getElementById('pagination-container');
  const tagCloudContainer = document.getElementById('tag-cloud-container');
  
  // 過濾按鈕
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // 搜尋元素
  const searchInput = document.getElementById('blog-search');
  const searchBtn = document.getElementById('search-btn');
  
  // 資料與分頁狀態
  let allBlogData = null;
  let currentPage = 1;
  let currentCategory = 'all';
  let currentSearchTerm = '';
  let itemsPerPage = 6; // 每頁顯示6篇文章
  
  /**
   * 獲取URL參數
   */
  function getUrlParams() {
    console.log('解析URL參數');
    const params = new URLSearchParams(window.location.search);
    
    // 獲取頁碼參數
    const pageParam = params.get('page');
    if (pageParam && !isNaN(parseInt(pageParam))) {
      currentPage = Math.max(1, parseInt(pageParam));
    }
    
    // 獲取分類參數
    const categoryParam = params.get('category');
    if (categoryParam) {
      currentCategory = categoryParam;
      
      // 更新分類按鈕狀態
      filterButtons.forEach(btn => {
        if (btn.dataset.category === currentCategory) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    
    // 獲取搜尋參數
    const searchParam = params.get('search');
    if (searchParam) {
      currentSearchTerm = searchParam;
      searchInput.value = currentSearchTerm;
    }
    
    // 獲取標籤參數
    const tagParam = params.get('tag');
    if (tagParam) {
      currentSearchTerm = tagParam;
      searchInput.value = tagParam;
    }
    
    console.log('URL參數解析結果:', { page: currentPage, category: currentCategory, search: currentSearchTerm });
  }
  
  /**
   * 更新URL參數
   */
  function updateUrlParams() {
    const params = new URLSearchParams();
    
    if (currentPage > 1) {
      params.set('page', currentPage);
    }
    
    if (currentCategory !== 'all') {
      params.set('category', currentCategory);
    }
    
    if (currentSearchTerm) {
      params.set('search', currentSearchTerm);
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    history.pushState({}, '', newUrl);
    
    console.log('URL已更新:', newUrl);
  }
  
  /**
   * 從JSON格式加載博客數據
   */
  async function loadBlogData() {
    console.log('開始加載博客數據...');
    try {
      // 獲取URL參數
      getUrlParams();
      
      // 加載數據
      postsContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>正在加載文章...</p>
        </div>
      `;
      
      // 嘗試多種路徑加載JSON
      let response;
      let jsonData;
      
      try {
        console.log('嘗試加載路徑1: /assets/data/blog-posts.json');
        response = await fetch('/assets/data/blog-posts.json');
        
        if (!response.ok) {
          throw new Error(`HTTP錯誤: ${response.status}`);
        }
        
        jsonData = await response.json();
        console.log('成功加載JSON數據(路徑1)');
      } catch (error1) {
        console.warn('路徑1加載失敗，嘗試備用路徑:', error1);
        
        try {
          console.log('嘗試加載路徑2: assets/data/blog-posts.json (無前導斜線)');
          response = await fetch('assets/data/blog-posts.json');
          
          if (!response.ok) {
            throw new Error(`HTTP錯誤: ${response.status}`);
          }
          
          jsonData = await response.json();
          console.log('成功加載JSON數據(路徑2)');
        } catch (error2) {
          console.warn('路徑2也加載失敗:', error2);
          console.log('使用備用數據');
          return useFallbackData();
        }
      }
      
      // 如果成功獲取數據
      allBlogData = jsonData;
      
      // 如果JSON中有指定每頁數量，使用其值
      if (allBlogData.pagination && allBlogData.pagination.items_per_page) {
        itemsPerPage = allBlogData.pagination.items_per_page;
      }
      
      // 渲染初始內容
      renderFilteredPosts();
      renderPopularPosts(allBlogData.posts.slice(0, 4));
      renderTagCloud(allBlogData.tags || extractTagsFromPosts(allBlogData.posts));
      
      return allBlogData;
    } catch (error) {
      console.error('加載文章出錯:', error);
      
      // 顯示錯誤信息
      postsContainer.innerHTML = `
        <div class="no-results">
          <p>加載文章時出現問題: ${error.message}</p>
          <p>請稍後再試或聯絡我們。</p>
        </div>
      `;
      
      // 使用備用數據
      return useFallbackData();
    }
  }
  
  /**
   * 在無法加載數據時使用備用數據
   */
  function useFallbackData() {
    console.log('使用備用數據');
    const fallbackPosts = [
      {
        title: '跨境電商如何合法節稅？',
        date: '2025-04-10',
        summary: '面對台灣與境外稅務申報差異，電商業者該注意哪些風險與機會？了解如何合法規劃跨境稅務並避免重複課稅。',
        url: '/blog/cross-border-tax.html',
        category: 'tax',
        image: '/assets/images/blog/cross-border-tax.jpg',
        tags: ["跨境稅務", "電子商務", "稅務規劃"]
      },
      {
        title: '新創公司常見帳務陷阱',
        date: '2025-03-22',
        summary: '從開立發票、勞健保到稅務合規，新創最容易忽略的會計問題整理。避免常見財務錯誤，確保公司財務健全運作。',
        url: '/blog/startup-traps.html',
        category: 'accounting',
        image: '/assets/images/blog/startup-accounting.jpg',
        tags: ["新創企業", "會計實務", "稅務合規"]
      },
      {
        title: '年度稅務規劃指南',
        date: '2025-03-05',
        summary: '提前做好稅務規劃，合理降低稅負，掌握各項扣除額與優惠措施。專業稅務師提供的實用建議，讓您節稅無憂。',
        url: '/blog/tax-planning.html',
        category: 'tax',
        image: '/assets/images/blog/tax-planning.jpg',
        tags: ["稅務規劃", "節稅策略", "扣除額"]
      }
    ];
    
    // 創建備用數據結構
    const fallbackData = {
      posts: fallbackPosts,
      pagination: {
        total_posts: fallbackPosts.length,
        total_pages: 1,
        items_per_page: 6
      },
      categories: ["tax", "accounting", "business"],
      tags: ["跨境稅務", "電子商務", "稅務規劃", "新創企業", "會計實務", "稅務合規", "節稅策略", "扣除額"]
    };
    
    // 使用備用數據
    allBlogData = fallbackData;
    
    // 渲染初始內容
    renderFilteredPosts();
    renderPopularPosts(fallbackPosts);
    renderTagCloud(fallbackData.tags);
    
    return fallbackData;
  }
  
  /**
   * 從文章中提取所有唯一標籤
   */
  function extractTagsFromPosts(posts) {
    console.log('從文章中提取標籤');
    const allTags = new Set();
    
    if (!posts || !Array.isArray(posts)) {
      console.warn('文章數據無效，無法提取標籤');
      return [];
    }
    
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags);
  }
  
  /**
   * 過濾文章並進行分頁
   */
  function filterAndPaginatePosts() {
    console.log('過濾與分頁文章數據');
    if (!allBlogData || !allBlogData.posts || !Array.isArray(allBlogData.posts)) {
      console.warn('文章數據無效，無法過濾與分頁');
      return { posts: [], totalPages: 0, totalPosts: 0 };
    }
    
    // 根據分類過濾
    let filteredPosts = allBlogData.posts;
    if (currentCategory !== 'all') {
      filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
    }
    
    // 根據搜尋詞過濾
    if (currentSearchTerm) {
      const searchTermLower = currentSearchTerm.toLowerCase();
      filteredPosts = filteredPosts.filter(post => {
        return post.title.toLowerCase().includes(searchTermLower) || 
               post.summary.toLowerCase().includes(searchTermLower) ||
               (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTermLower)));
      });
    }
    
    // 計算總頁數
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));
    
    // 確保當前頁碼有效
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    
    // 對當前頁進行分頁
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPosts.length);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    console.log('過濾結果:', { 
      totalPosts: filteredPosts.length, 
      totalPages, 
      currentPage,
      postsOnCurrentPage: paginatedPosts.length
    });
    
    return {
      posts: paginatedPosts,
      totalPages: totalPages,
      totalPosts: filteredPosts.length
    };
  }
  
  /**
   * 渲染經過過濾和分頁的文章
   */
  function renderFilteredPosts() {
    console.log('渲染過濾後的文章');
    const { posts, totalPages, totalPosts } = filterAndPaginatePosts();
    
    // 清空容器
    postsContainer.innerHTML = '';
    
    // 顯示總文章數
    if (totalPosts > 0) {
      const infoElement = document.createElement('div');
      infoElement.className = 'search-results-info';
      infoElement.innerHTML = `<p>共找到 ${totalPosts} 篇文章</p>`;
      postsContainer.appendChild(infoElement);
    }
    
    // 渲染文章
    if (posts && posts.length > 0) {
      // 創建博客網格容器
      const blogGridElement = document.createElement('div');
      blogGridElement.className = 'blog-grid';
      
      posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.className = 'blog-card';
        
        // 確保必要的屬性存在
        const postImage = post.image || '/assets/images/blog/default.jpg';
        const postUrl = post.url || '#';
        const postTitle = post.title || '未命名文章';
        const postDate = post.date || '未知日期';
        const postSummary = post.summary || '無文章摘要';
        
        postElement.innerHTML = `
          <div class="blog-image">
            <img src="${postImage}" alt="${postTitle}" />
          </div>
          <div class="blog-content">
            <h2><a href="${postUrl}">${postTitle}</a></h2>
            <p class="date">${postDate}</p>
            <p>${postSummary}</p>
            <a href="${postUrl}" class="read-more">閱讀更多</a>
          </div>
        `;
        
        blogGridElement.appendChild(postElement);
      });
      
      // 將博客網格添加到容器
      postsContainer.appendChild(blogGridElement);
      
      // 渲染分頁控制
      renderPagination(totalPages);
    } else {
      // 如果沒有文章
      const noResultsElement = document.createElement('div');
      noResultsElement.className = 'no-results';
      noResultsElement.innerHTML = `
        <p>找不到符合「${currentSearchTerm || currentCategory}」的文章。</p>
        <p>請嘗試其他關鍵字，或瀏覽我們的熱門文章。</p>
        <button class="btn" id="reset-search">清除搜尋</button>
      `;
      postsContainer.appendChild(noResultsElement);
      
      // 隱藏分頁
      if (paginationContainer) {
        paginationContainer.style.display = 'none';
      }
      
      // 綁定清除搜尋按鈕事件
      setTimeout(() => {
        const resetBtn = document.getElementById('reset-search');
        if (resetBtn) {
          resetBtn.addEventListener('click', function() {
            currentSearchTerm = '';
            currentCategory = 'all';
            currentPage = 1;
            
            if (searchInput) {
              searchInput.value = '';
            }
            
            // 重置分類按鈕
            filterButtons.forEach(btn => {
              if (btn.dataset.category === 'all') {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            });
            
            // 更新URL並重新渲染
            updateUrlParams();
            renderFilteredPosts();
          });
        }
      }, 0);
    }
  }
  
  /**
   * 渲染分頁控制
   */
  function renderPagination(totalPages) {
    console.log('渲染分頁控制，總頁數:', totalPages);
    if (!paginationContainer) {
      console.warn('找不到分頁容器元素');
      return;
    }
    
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    // 上一頁按鈕
    const prevBtn = document.createElement('a');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '&laquo;';
    prevBtn.href = 'javascript:void(0)';
    if (currentPage > 1) {
      prevBtn.addEventListener('click', () => {
        currentPage--;
        updateUrlParams();
        renderFilteredPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    paginationContainer.appendChild(prevBtn);
    
    // 頁碼按鈕
    // 最多顯示7個頁碼按鈕，其餘用省略號替代
    const maxVisibleButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(startPage + maxVisibleButtons - 1, totalPages);
    
    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }
    
    // 第一頁按鈕
    if (startPage > 1) {
      const firstPageBtn = document.createElement('a');
      firstPageBtn.className = 'pagination-btn';
      firstPageBtn.textContent = '1';
      firstPageBtn.href = 'javascript:void(0)';
      firstPageBtn.addEventListener('click', () => {
        currentPage = 1;
        updateUrlParams();
        renderFilteredPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      paginationContainer.appendChild(firstPageBtn);
      
      // 省略號
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-btn disabled';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }
    
    // 中間頁碼
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('a');
      pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.href = 'javascript:void(0)';
      
      if (i !== currentPage) {
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          updateUrlParams();
          renderFilteredPosts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      
      paginationContainer.appendChild(pageBtn);
    }
    
    // 最後頁按鈕
    if (endPage < totalPages) {
      // 省略號
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-btn disabled';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
      
      const lastPageBtn = document.createElement('a');
      lastPageBtn.className = 'pagination-btn';
      lastPageBtn.textContent = totalPages;
      lastPageBtn.href = 'javascript:void(0)';
      lastPageBtn.addEventListener('click', () => {
        currentPage = totalPages;
        updateUrlParams();
        renderFilteredPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      paginationContainer.appendChild(lastPageBtn);
    }
    
    // 下一頁按鈕
    const nextBtn = document.createElement('a');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '&raquo;';
    nextBtn.href = 'javascript:void(0)';
    if (currentPage < totalPages) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        updateUrlParams();
        renderFilteredPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    paginationContainer.appendChild(nextBtn);
  }
  
  /**
   * 渲染熱門文章
   */
  function renderPopularPosts(posts) {
    console.log('渲染熱門文章，文章數:', posts && posts.length);
    if (!popularPostsContainer) {
      console.warn('找不到熱門文章容器元素');
      return;
    }
    
    // 清空容器
    popularPostsContainer.innerHTML = '';
    
    // 檢查文章數據有效性
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      popularPostsContainer.innerHTML = '<li>暫無熱門文章</li>';
      return;
    }
    
    // 只顯示前4篇熱門文章
    const topPosts = posts.slice(0, 4);
    
    topPosts.forEach(post => {
      // 確保必要的屬性存在
      const postUrl = post.url || '#';
      const postTitle = post.title || '未命名文章';
      const postDate = post.date || '未知日期';
      
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <a href="${postUrl}">${postTitle}</a>
        <span class="post-date">${postDate}</span>
      `;
      popularPostsContainer.appendChild(listItem);
    });
  }
  
  /**
   * 渲染標籤雲
   */
  function renderTagCloud(tags) {
    console.log('渲染標籤雲，標籤數:', tags && tags.length);
    if (!tagCloudContainer) {
      console.warn('找不到標籤雲容器元素');
      return;
    }
    
    // 清空容器
    tagCloudContainer.innerHTML = '';
    
    // 如果沒有標籤
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      tagCloudContainer.innerHTML = '<p>暫無標籤</p>';
      return;
    }
    
    // 最多顯示12個熱門標籤
    const displayTags = tags.slice(0, 12);
    
    displayTags.forEach(tag => {
      const tagLink = document.createElement('a');
      tagLink.href = 'javascript:void(0)';
      tagLink.textContent = tag;
      tagLink.dataset.tag = tag;
      
      tagLink.addEventListener('click', function() {
        currentSearchTerm = tag;
        currentCategory = 'all';
        currentPage = 1;
        
        if (searchInput) {
          searchInput.value = tag;
        }
        
        // 重置分類按鈕
        filterButtons.forEach(btn => {
          if (btn.dataset.category === 'all') {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        
        // 更新URL並重新渲染
        updateUrlParams();
        renderFilteredPosts();
      });
      
      tagCloudContainer.appendChild(tagLink);
    });
  }
  
  // 為所有分類標籤按鈕添加點擊波紋效果
  filterButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // 創建波紋元素
      const ripple = document.createElement('div');
      this.appendChild(ripple);
      
      // 設置波紋位置
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 添加波紋樣式
      ripple.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        pointer-events: none;
        width: 5px;
        height: 5px;
        top: ${y}px;
        left: ${x}px;
        transform: translate(-50%, -50%);
        animation: ripple 0.6s ease-out;
      `;
      
      // 波紋動畫結束後移除
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
  
  // 添加波紋動畫
  if (!document.querySelector('style#ripple-animation')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation';
    style.textContent = `
      @keyframes ripple {
        0% {
          width: 0;
          height: 0;
          opacity: 0.7;
        }
        100% {
          width: 500px;
          height: 500px;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 綁定搜尋按鈕事件
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      if (searchInput) {
        currentSearchTerm = searchInput.value.trim();
        currentPage = 1;
        updateUrlParams();
        renderFilteredPosts();
      }
    });
  }
  
  // 綁定搜尋框回車事件
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        currentSearchTerm = searchInput.value.trim();
        currentPage = 1;
        updateUrlParams();
        renderFilteredPosts();
      }
    });
  }
  
  // 綁定分類過濾按鈕事件
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 移除所有按鈕的active狀態
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // 設置當前按鈕為active
      this.classList.add('active');
      
      // 設置當前分類
      currentCategory = this.getAttribute('data-category');
      currentPage = 1;
      
      // 更新URL並重新渲染
      updateUrlParams();
      renderFilteredPosts();
    });
  });
  
  // 監聽瀏覽器前進/後退按鈕
  window.addEventListener('popstate', function() {
    getUrlParams();
    renderFilteredPosts();
  });
  
  // 初始化加載博客數據
  loadBlogData();
});