/**
 * blog.js - 霍爾果斯會計師事務所部落格功能腳本
 * 最後更新日期: 2025-05-10
 * 優化: 添加即時搜索功能、滾動時動畫效果、改進圖片加載、支持系列文章
 */

document.addEventListener('DOMContentLoaded', function() {
  // 常量定義
  const BLOG_POSTS_JSON = '/assets/data/blog-posts.json';
  const POSTS_PER_PAGE = 6;
  const SUMMARY_MAX_LENGTH = 120; // 摘要最大長度
  
  // DOM 元素
  const blogPostsContainer = document.getElementById('blog-posts-container');
  const paginationContainer = document.getElementById('pagination-container');
  const popularPostsContainer = document.getElementById('popular-posts-container');
  const tagCloudContainer = document.getElementById('tag-cloud-container');
  const searchInput = document.getElementById('blog-search');
  const searchButton = document.getElementById('search-btn');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchResultsContainer = document.getElementById('search-results-container');
  const searchContainer = document.querySelector('.search-container');
  const seriesListContainer = document.getElementById('series-list-container');
  const seriesSection = document.querySelector('.series-section');
  
  // 狀態變數
  let allPosts = [];
  let currentPage = 1;
  let currentCategory = 'all';
  let currentTag = '';
  let currentSearchQuery = '';
  let currentSeries = ''; // 新增: 當前選中的系列
  
  // 初始化
  init();
  
  /**
   * 初始化函數
   */
  function init() {
    // 獲取URL參數
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'all';
    currentTag = urlParams.get('tag') || '';
    currentSearchQuery = urlParams.get('search') || '';
    currentSeries = urlParams.get('series') || ''; // 新增: 從URL獲取系列參數
    currentPage = parseInt(urlParams.get('page') || '1');
    
    // 載入文章數據
    fetchBlogPosts();
    
    // 設置事件監聽器
    setupEventListeners();
    
    // 設置滾動動畫
    setupScrollAnimations();
  }
  
  /**
   * 設置事件監聽器
   */
  function setupEventListeners() {
    // 分類過濾按鈕點擊事件
    filterButtons.forEach(button => {
      // 設置初始選中狀態
      if (button.dataset.category === currentCategory) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
      
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        currentCategory = this.dataset.category;
        currentPage = 1;
        currentSeries = ''; // 清除系列選擇
        updateURL();
        filterAndDisplayPosts();
      });
    });
    
    // 搜索功能
    if (searchInput && searchButton) {
      // 如果URL有搜索參數，填充搜索框
      if (currentSearchQuery) {
        searchInput.value = currentSearchQuery;
        searchContainer.classList.add('search-active');
      }
      
      // 即時搜索功能
      // 創建防抖函數
      function debounce(func, delay) {
        let timeout;
        return function() {
          const context = this;
          const args = arguments;
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(context, args), delay);
        };
      }
      
      // 搜索處理函數
      const handleSearchInput = debounce(function() {
        const searchValue = searchInput.value.trim();
        
        // 添加搜索活躍狀態樣式
        if (searchValue.length > 0) {
          searchContainer.classList.add('search-active');
        } else {
          searchContainer.classList.remove('search-active');
          // 空搜索時顯示所有文章
          currentSearchQuery = '';
          currentPage = 1;
          currentSeries = ''; // 清除系列選擇
          updateURL();
          filterAndDisplayPosts();
          return;
        }
        
        // 執行搜索
        currentSearchQuery = searchValue;
        currentPage = 1;
        currentSeries = ''; // 清除系列選擇
        updateURL();
        filterAndDisplayPosts();
      }, 500); // 500ms防抖延遲
      
      // 監聽輸入事件
      searchInput.addEventListener('input', handleSearchInput);
      
      // 保留原有按鈕搜索功能
      searchButton.addEventListener('click', function() {
        handleSearchInput();
      });
      
      // 按Enter鍵搜索
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          handleSearchInput();
        }
      });
    }
    
    // 全域點擊事件委託，處理動態生成的元素
    document.addEventListener('click', function(e) {
      // 處理卡片點擊
      handleCardClick(e);
      
      // 處理系列按鈕點擊
      if (e.target.classList.contains('view-series-btn') || 
          e.target.parentElement.classList.contains('view-series-btn')) {
        const btn = e.target.classList.contains('view-series-btn') ? 
                    e.target : e.target.parentElement;
        
        const seriesName = btn.dataset.series;
        if (seriesName) {
          e.preventDefault();
          filterBySeriesName(seriesName);
        }
      }

      // 處理"返回所有文章"按鈕
      if (e.target.id === 'reset-search' || e.target.parentElement.id === 'reset-search') {
        e.preventDefault();
        resetFilters();
      }
    });
  }
  
  /**
   * 設置滾動時的動畫效果
   */
  function setupScrollAnimations() {
    // 添加滾動時的元素動畫效果
    const animateOnScroll = function() {
      // 獲取所有需要動畫的元素
      const blogCards = document.querySelectorAll('.blog-card');
      const seriesCards = document.querySelectorAll('.series-card');
      const sidebarSections = document.querySelectorAll('.sidebar-section');
      
      // 檢查元素是否在視圖中
      function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
          rect.bottom >= 0
        );
      }
      
      // 處理博客卡片動畫
      blogCards.forEach(card => {
        if (isElementInViewport(card) && !card.classList.contains('animated')) {
          card.classList.add('animated');
        }
      });
      
      // 處理系列卡片動畫
      seriesCards.forEach(card => {
        if (isElementInViewport(card) && !card.classList.contains('animated')) {
          card.classList.add('animated');
        }
      });
      
      // 處理側邊欄動畫
      sidebarSections.forEach((section, index) => {
        if (isElementInViewport(section) && !section.classList.contains('animated')) {
          section.classList.add('animated');
          section.style.opacity = '0';
          section.style.transform = 'translateY(20px)';
          
          setTimeout(() => {
            section.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
          }, 300 + (index * 200)); // 依次延遲顯示
        }
      });
    };
    
    // 初始執行
    setTimeout(animateOnScroll, 500);
    
    // 滾動時執行動畫
    window.addEventListener('scroll', function() {
      animateOnScroll();
    });
    
    // 窗口大小改變時重新計算
    window.addEventListener('resize', function() {
      animateOnScroll();
    });
  }
  
  /**
   * 處理卡片點擊事件
   */
  function handleCardClick(e) {
    // 檢查是否點擊了文章卡片或其直接子元素，但不是特定的可點擊元素
    const cardEl = e.target.closest('.blog-card');
    
    if (cardEl) {
      // 如果點擊的不是卡片內的鏈接、按鈕或標籤
      const isLink = e.target.tagName === 'A' || e.target.closest('a');
      const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
      
      if (!isLink && !isButton) {
        // 獲取卡片的URL並導航
        const cardUrl = cardEl.dataset.url;
        if (cardUrl) {
          window.location.href = cardUrl;
        }
      }
    }
  }
  
  /**
   * 更新URL參數，不重新加載頁面
   */
  function updateURL() {
    const url = new URL(window.location);
    
    // 清空現有參數
    url.search = '';
    
    // 添加過濾條件
    if (currentCategory && currentCategory !== 'all') {
      url.searchParams.set('category', currentCategory);
    }
    
    if (currentTag) {
      url.searchParams.set('tag', currentTag);
    }
    
    if (currentSearchQuery) {
      url.searchParams.set('search', currentSearchQuery);
    }
    
    if (currentSeries) {
      url.searchParams.set('series', currentSeries);
    }
    
    if (currentPage > 1) {
      url.searchParams.set('page', currentPage);
    }
    
    // 更新URL但不重新加載頁面
    window.history.pushState({}, '', url);
  }
  
  /**
   * 從JSON文件獲取博客文章數據
   */
  function fetchBlogPosts() {
    showLoading();
    
    fetch(BLOG_POSTS_JSON)
      .then(response => {
        if (!response.ok) {
          throw new Error('無法獲取文章數據');
        }
        return response.json();
      })
      .then(data => {
        allPosts = data || {};
        
        // 初始化標籤雲、熱門文章和系列文章
        initializeTagCloud(data.tags || []);
        initializePopularPosts();
        initializeSeriesList(data.series || {});
        
        // 過濾並顯示文章
        filterAndDisplayPosts();
      })
      .catch(error => {
        console.error('獲取文章數據時出錯:', error);
        showError('無法載入文章數據，請稍後再試。');
      });
  }
  
  /**
   * 根據當前過濾條件過濾和顯示文章
   */
  function filterAndDisplayPosts() {
    let filteredPosts = allPosts.posts || [];
    
    // 根據系列過濾
    if (currentSeries && allPosts.series && allPosts.series[currentSeries]) {
      filteredPosts = allPosts.series[currentSeries] || [];
      
      // 顯示系列結果信息
      showSeriesResults(currentSeries, filteredPosts.length);
    } else {
      // 隱藏系列結果信息
      hideSeriesResults();
      
      // 根據搜索查詢過濾
      if (currentSearchQuery) {
        const searchTerms = currentSearchQuery.toLowerCase().split(' ');
        filteredPosts = filteredPosts.filter(post => {
          const title = post.title.toLowerCase();
          const summary = post.summary ? post.summary.toLowerCase() : '';
          const tags = post.tags ? post.tags.join(' ').toLowerCase() : '';
          
          return searchTerms.every(term => 
            title.includes(term) || 
            summary.includes(term) || 
            tags.includes(term)
          );
        });
        
        // 顯示搜索結果信息
        showSearchResults(filteredPosts.length);
      } else {
        // 隱藏搜索結果信息
        hideSearchResults();
      }
      
      // 根據分類過濾
      if (currentCategory && currentCategory !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
      }
      
      // 根據標籤過濾
      if (currentTag) {
        filteredPosts = filteredPosts.filter(post => 
          post.tags && post.tags.some(tag => 
            tag.toLowerCase() === currentTag.toLowerCase()
          )
        );
      }
    }
    
    // 計算總頁數
    const totalPosts = filteredPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
    
    // 確保當前頁碼有效
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    // 對當前頁進行分頁
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, filteredPosts.length);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    // 顯示文章
    displayPosts(paginatedPosts);
    
    // 生成分頁控制
    generatePagination(currentPage, totalPages);
  }
  
  /**
   * 初始化系列文章列表
   * @param {Object} series 系列文章數據
   */
  function initializeSeriesList(series) {
    if (!seriesListContainer) return;
    
    // 如果沒有系列文章，隱藏整個區域
    if (!series || Object.keys(series).length === 0) {
      if (seriesSection) seriesSection.style.display = 'none';
      return;
    }
    
    // 顯示系列區域
    if (seriesSection) seriesSection.style.display = 'block';
    
    // 生成系列列表HTML
    let seriesHTML = '';
    
    // 遍歷所有系列
    for (const [seriesName, seriesPosts] of Object.entries(series)) {
      if (!seriesPosts || seriesPosts.length === 0) continue;
      
      // 使用第一篇文章的圖片作為系列代表
      const firstPost = seriesPosts[0];
      const seriesImage = firstPost.image || '/assets/images/blog/default.jpg';
      
      seriesHTML += `
        <div class="series-card" data-series="${seriesName}">
          <div class="series-image">
            <img src="${seriesImage}" alt="${seriesName}" loading="lazy">
          </div>
          <div class="series-content">
            <h3>${seriesName}</h3>
            <p>${seriesPosts.length} 篇文章</p>
            <button class="view-series-btn" data-series="${seriesName}">查看系列</button>
          </div>
        </div>
      `;
    }
    
    seriesListContainer.innerHTML = seriesHTML;
  }
  
  /**
   * 根據系列名稱過濾文章
   * @param {string} seriesName 系列名稱
   */
  function filterBySeriesName(seriesName) {
    if (!allPosts.series || !allPosts.series[seriesName]) {
      console.error('找不到系列:', seriesName);
      return;
    }
    
    // 更新過濾條件
    currentSeries = seriesName;
    currentCategory = 'all';
    currentTag = '';
    currentSearchQuery = '';
    currentPage = 1;
    
    // 重置搜索框
    if (searchInput) {
      searchInput.value = '';
      searchContainer.classList.remove('search-active');
    }
    
    // 重置分類按鈕
    filterButtons.forEach(btn => {
      if (btn.dataset.category === 'all') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 更新URL並重新過濾
    updateURL();
    filterAndDisplayPosts();
    
    // 滾動到文章列表頂部
    if (blogPostsContainer) {
      window.scrollTo({
        top: blogPostsContainer.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  }
  
  /**
   * 顯示系列搜索結果
   * @param {string} seriesName 系列名稱
   * @param {number} resultCount 結果數量
   */
  function showSeriesResults(seriesName, resultCount) {
    if (!searchResultsContainer) return;
    
    searchResultsContainer.innerHTML = `
      <div class="search-results-info">
        系列 "${seriesName}" 的文章: ${resultCount} 篇
        <button class="btn-reset" id="reset-search">
          返回所有文章
        </button>
      </div>
    `;
    searchResultsContainer.style.display = 'block';
  }
  
  /**
   * 隱藏系列結果信息
   */
  function hideSeriesResults() {
    // 已包含在hideSearchResults中處理
  }
  
  /**
   * 顯示搜索結果信息
   */
  function showSearchResults(resultCount) {
    if (!searchResultsContainer) return;
    
    searchResultsContainer.innerHTML = `
      <div class="search-results-info">
        搜尋 "${currentSearchQuery}" 的結果: ${resultCount} 篇文章
        <button class="btn-reset" id="reset-search">
          返回所有文章
        </button>
      </div>
    `;
    searchResultsContainer.style.display = 'block';
  }
  
  /**
   * 隱藏搜索結果信息
   */
  function hideSearchResults() {
    if (!searchResultsContainer) return;
    searchResultsContainer.innerHTML = '';
    searchResultsContainer.style.display = 'none';
  }
  
  /**
   * 重置所有過濾器
   */
  function resetFilters() {
    currentCategory = 'all';
    currentTag = '';
    currentSearchQuery = '';
    currentSeries = '';
    currentPage = 1;
    
    // 重置搜索框
    if (searchInput) {
      searchInput.value = '';
      searchContainer.classList.remove('search-active');
    }
    
    // 重置分類按鈕
    filterButtons.forEach(btn => {
      if (btn.dataset.category === 'all') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 更新URL並重新過濾
    updateURL();
    filterAndDisplayPosts();
  }
  
  /**
   * 顯示文章列表
   */
  function displayPosts(posts) {
    if (!blogPostsContainer) return;
    
    if (posts.length === 0) {
      blogPostsContainer.innerHTML = `
        <div class="no-results">
          <p>沒有找到符合條件的文章。</p>
          <button class="btn" id="reset-search">
            返回所有文章
          </button>
        </div>
      `;
      
      // 隱藏分頁
      if (paginationContainer) {
        paginationContainer.style.display = 'none';
      }
      
      return;
    }
    
    // 顯示分頁
    if (paginationContainer) {
      paginationContainer.style.display = 'flex';
    }
    
    const postsHTML = `
      <div class="blog-list">
        ${posts.map(post => createPostCard(post)).join('')}
      </div>
    `;
    
    blogPostsContainer.innerHTML = postsHTML;
    
    // 為每個卡片添加點擊事件
    addCardClickEvents();

    // 由於圖片載入可能需要時間，添加圖片加載監控
    const allImages = blogPostsContainer.querySelectorAll('.blog-image img');
    allImages.forEach(img => {
      // 圖片加載失敗時使用備用圖片
      img.addEventListener('error', function() {
        // 檢測文章分類，使用對應分類的備用圖片
        const cardElement = this.closest('.blog-card');
        if(cardElement) {
          const postCategory = cardElement.dataset.category || 'default';
          this.src = `/assets/images/blog/${postCategory}_default.jpg`;
        } else {
          this.src = '/assets/images/blog/default.jpg';
        }
      });
    });
  }
  
  /**
   * 為文章卡片添加點擊事件
   */
  function addCardClickEvents() {
    const cards = document.querySelectorAll('.blog-card');
    cards.forEach(card => {
      card.addEventListener('click', function(e) {
        // 如果不是點擊特定元素，才進行跳轉
        if (!e.target.closest('a') && !e.target.closest('button')) {
          window.location.href = this.dataset.url;
        }
      });
    });
  }
  
  /**
   * 創建文章卡片HTML
   * 修改：僅使用一種圖標方式，優化摘要顯示，添加容錯處理，支持系列文章標籤
   */
  function createPostCard(post) {
    if (!post) {
      console.error("createPostCard: 收到無效的貼文數據");
      return "";
    }

    // 確保文章資料有效
    const postTitle = post.title || "無標題文章";
    const postDate = post.date || new Date().toISOString().split('T')[0];
    const postUrl = post.url || "#";
    const postCategory = post.category || "default";
    
    // 確保摘要長度適當
    let summary = post.summary || '';
    if (summary === postTitle) {
      summary = "點擊閱讀文章瞭解更多詳情...";
    } else if (summary.length > SUMMARY_MAX_LENGTH) {
      summary = summary.substring(0, SUMMARY_MAX_LENGTH) + '...';
    }
    
    // 確保圖片路徑有效
    let imageUrl = post.image || '/assets/images/blog/default.jpg';
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = '/' + imageUrl;
    }
    
    // 處理標籤 - 最多顯示3個
    const tagsHTML = post.tags && post.tags.length > 0
      ? post.tags.slice(0, 3).map(tag => 
          `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${tag}</a>`
        ).join('')
      : '';
    
    // 處理系列文章標記
    const seriesBadge = post.is_series 
      ? `<div class="series-badge" title="${post.series_name} EP${post.episode}">${post.series_name} EP${post.episode}</div>` 
      : '';
    
    // 使用dataset屬性儲存重要資訊，便於JavaScript處理
    return `
      <article class="blog-card" data-url="${postUrl}" data-category="${postCategory}" ${post.is_series ? `data-series="${post.series_name}" data-episode="${post.episode}"` : ''}>
        <a href="${postUrl}" class="blog-card-link" aria-label="閱讀文章：${postTitle}">閱讀全文</a>
        <div class="blog-image">
          <img src="${imageUrl}" alt="${postTitle}" loading="lazy">
          ${seriesBadge}
        </div>
        <div class="blog-content">
          <div>
            <div class="date">${postDate}</div>
            <h2><a href="${postUrl}">${postTitle}</a></h2>
            <p>${summary}</p>
          </div>
          <div>
            <div class="blog-meta">
              ${tagsHTML}
            </div>
            <a href="${postUrl}" class="read-more">繼續閱讀</a>
          </div>
        </div>
      </article>
    `;
  }
  
  /**
   * 初始化標籤雲
   */
  function initializeTagCloud(tags) {
    if (!tagCloudContainer || !tags || tags.length === 0) return;
    
    // 取前15個標籤(或更少)
    const topTags = tags.slice(0, 15);
    
    const tagsHTML = topTags.map(tag => 
      `<a href="/blog.html?tag=${encodeURIComponent(tag)}" 
          class="${currentTag === tag ? 'active' : ''}">${tag}</a>`
    ).join('');
    
    tagCloudContainer.innerHTML = tagsHTML;
  }
  
  /**
   * 初始化熱門文章
   */
  function initializePopularPosts() {
    if (!popularPostsContainer || !allPosts.posts || allPosts.posts.length === 0) return;
    
    // 取最新的5篇文章作為"熱門"文章
    const popularPosts = allPosts.posts
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    const postsHTML = popularPosts.map(post => {
      // 添加系列文章標記
      const seriesIndicator = post.is_series ? 
        `<span class="series-indicator">[${post.series_name} EP${post.episode}]</span> ` : '';
        
      return `
        <li>
          <a href="${post.url}">${seriesIndicator}${post.title}</a>
          <span class="post-date">${post.date}</span>
        </li>
      `;
    }).join('');
    
    popularPostsContainer.innerHTML = postsHTML;
  }
  
  /**
   * 生成分頁控制
   */
  function generatePagination(currentPage, totalPages) {
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    
    // 上一頁按鈕
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `
      <a href="javascript:void(0)" 
         class="pagination-btn ${prevDisabled}" 
         data-page="${currentPage - 1}"
         ${prevDisabled ? 'aria-disabled="true"' : ''}>
        <span class="material-symbols-rounded">navigate_before</span>
      </a>
    `;
    
    // 頁碼按鈕
    const pagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
    
    // 調整起始頁碼
    if (endPage - startPage + 1 < pagesToShow) {
      startPage = Math.max(1, endPage - pagesToShow + 1);
    }
    
    // 第一頁
    if (startPage > 1) {
      paginationHTML += `
        <a href="javascript:void(0)" class="pagination-btn" data-page="1">1</a>
      `;
      
      if (startPage > 2) {
        paginationHTML += `<span class="pagination-btn disabled">...</span>`;
      }
    }
    
    // 頁碼
    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      paginationHTML += `
        <a href="javascript:void(0)" class="pagination-btn ${active}" data-page="${i}">${i}</a>
      `;
    }
    
    // 最後一頁
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += `<span class="pagination-btn disabled">...</span>`;
      }
      
      paginationHTML += `
        <a href="javascript:void(0)" class="pagination-btn" data-page="${totalPages}">${totalPages}</a>
      `;
    }
    
    // 下一頁按鈕
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `
      <a href="javascript:void(0)" 
         class="pagination-btn ${nextDisabled}" 
         data-page="${currentPage + 1}"
         ${nextDisabled ? 'aria-disabled="true"' : ''}>
        <span class="material-symbols-rounded">navigate_next</span>
      </a>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // 添加分頁按鈕點擊事件
    const pageButtons = paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)');
    pageButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (this.classList.contains('disabled')) return;
        
        const page = parseInt(this.dataset.page);
        if (page && page !== currentPage) {
          currentPage = page;
          updateURL();
          filterAndDisplayPosts();
          
          // 滾動到頁面頂部
          window.scrollTo({
            top: document.querySelector('.blog-content-section').offsetTop - 100,
            behavior: 'smooth'
          });
        }
      });
    });
  }
  
  /**
   * 顯示加載中提示
   */
  function showLoading() {
    if (!blogPostsContainer) return;
    
    blogPostsContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在載入文章...</p>
      </div>
    `;
  }
  
  /**
   * 顯示錯誤提示
   */
  function showError(message) {
    if (!blogPostsContainer) return;
    
    blogPostsContainer.innerHTML = `
      <div class="no-results">
        <p>${message}</p>
        <button class="btn" onclick="window.location.reload()">
          重新加載
        </button>
      </div>
    `;
  }
});