/**
 * blog.js - 霍爾果斯會計師事務所部落格功能腳本
 * 最後更新日期: 2025-05-10
 * 優化: 修正URL導航問題、系列文章顯示功能、支持豐富的系列文章信息、修正分頁問題
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
  const sidebarSeriesContainer = document.getElementById('sidebar-series-list-container');
  
  // 狀態變數
  let allPosts = [];
  let currentPage = 1;
  let currentCategory = 'all';
  let currentTag = '';
  let currentSearchQuery = '';
  let currentSeries = '';
  
  // 初始化
  init();
  
  function init() {
    // 從URL讀取參數
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'all';
    currentTag = urlParams.get('tag') || '';
    currentSearchQuery = urlParams.get('search') || '';
    currentSeries = urlParams.get('series') || '';
    currentPage = parseInt(urlParams.get('page') || '1');
    
    console.log('初始化參數:', {
      category: currentCategory,
      tag: currentTag,
      search: currentSearchQuery,
      series: currentSeries,
      page: currentPage
    });
    
    fetchBlogPosts();
    setupEventListeners();
    setupScrollAnimations();
  }
  
  function setupEventListeners() {
    // 設置分類過濾按鈕
    filterButtons.forEach(button => {
      if (button.dataset.category === currentCategory) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
      
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        currentCategory = this.dataset.category;
        currentPage = 1; // 重置頁碼
        currentSeries = '';
        
        console.log('點擊分類按鈕:', currentCategory);
        filterAndDisplayPosts();
        updateURL();
      });
    });
    
    // 設置搜索功能
    if (searchInput && searchButton) {
      if (currentSearchQuery) {
        searchInput.value = currentSearchQuery;
        searchContainer.classList.add('search-active');
      }
      
      function debounce(func, delay) {
        let timeout;
        return function() {
          const context = this;
          const args = arguments;
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(context, args), delay);
        };
      }
      
      const handleSearchInput = debounce(function() {
        const searchValue = searchInput.value.trim();
        
        if (searchValue.length > 0) {
          searchContainer.classList.add('search-active');
        } else {
          searchContainer.classList.remove('search-active');
          currentSearchQuery = '';
          currentPage = 1;
          currentSeries = '';
          filterAndDisplayPosts();
          updateURL();
          return;
        }
        
        currentSearchQuery = searchValue;
        currentPage = 1; // 重置頁碼
        currentSeries = '';
        
        console.log('搜索查詢:', currentSearchQuery);
        filterAndDisplayPosts();
        updateURL();
      }, 500);
      
      searchInput.addEventListener('input', handleSearchInput);
      searchButton.addEventListener('click', handleSearchInput);
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          handleSearchInput();
        }
      });
    }
    
    // 處理卡片點擊和系列按鈕
    document.addEventListener('click', function(e) {
      handleCardClick(e);
      
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

      if (e.target.id === 'reset-search' || e.target.parentElement.id === 'reset-search') {
        e.preventDefault();
        resetFilters();
      }
    });
    
    // 分頁按鈕事件 - 改進版
    if (paginationContainer) {
      paginationContainer.addEventListener('click', function(e) {
        const pageButton = e.target.closest('.pagination-btn:not(.disabled)');
        if (pageButton) {
          e.preventDefault(); // 阻止預設行為
          
          const page = parseInt(pageButton.dataset.page);
          console.log('點擊分頁按鈕:', page, '當前頁碼:', currentPage);
          
          if (page && page !== currentPage) {
            currentPage = page;
            
            console.log('更新當前頁碼為:', currentPage);
            filterAndDisplayPosts(); // 先更新內容
            updateURL(); // 後更新URL
            
            // 滾動到內容頂部
            const targetElement = document.querySelector('.blog-content-section');
            if (targetElement) {
              window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
              });
            }
          }
        }
      });
    }
    
    // 添加瀏覽器歷史狀態變化監聽
    window.addEventListener('popstate', function(event) {
      console.log('瀏覽器歷史狀態變化:', event.state);
      
      // 從URL讀取參數
      const urlParams = new URLSearchParams(window.location.search);
      currentCategory = urlParams.get('category') || 'all';
      currentTag = urlParams.get('tag') || '';
      currentSearchQuery = urlParams.get('search') || '';
      currentSeries = urlParams.get('series') || '';
      currentPage = parseInt(urlParams.get('page') || '1');
      
      console.log('從URL更新參數:', {
        category: currentCategory,
        tag: currentTag,
        search: currentSearchQuery,
        series: currentSeries,
        page: currentPage
      });
      
      // 更新UI狀態
      updateUIState();
      
      // 重新過濾和顯示
      filterAndDisplayPosts();
    });
  }
  
  // 更新UI元素以反映當前狀態
  function updateUIState() {
    // 更新分類按鈕狀態
    filterButtons.forEach(btn => {
      if (btn.dataset.category === currentCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 更新搜索框
    if (searchInput) {
      searchInput.value = currentSearchQuery;
      if (currentSearchQuery) {
        searchContainer.classList.add('search-active');
      } else {
        searchContainer.classList.remove('search-active');
      }
    }
  }
  
  function setupScrollAnimations() {
    const animateOnScroll = function() {
      const blogCards = document.querySelectorAll('.blog-card');
      const sidebarSections = document.querySelectorAll('.sidebar-section');
      
      function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
          rect.bottom >= 0
        );
      }
      
      blogCards.forEach(card => {
        if (isElementInViewport(card) && !card.classList.contains('animated')) {
          card.classList.add('animated');
        }
      });
      
      sidebarSections.forEach((section, index) => {
        if (isElementInViewport(section) && !section.classList.contains('animated')) {
          section.classList.add('animated');
          section.style.opacity = '0';
          section.style.transform = 'translateY(20px)';
          
          setTimeout(() => {
            section.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
          }, 300 + (index * 200));
        }
      });
    };
    
    setTimeout(animateOnScroll, 500);
    window.addEventListener('scroll', animateOnScroll);
    window.addEventListener('resize', animateOnScroll);
  }
  
  function handleCardClick(e) {
    const cardEl = e.target.closest('.blog-card');
    
    if (cardEl) {
      const isLink = e.target.tagName === 'A' || e.target.closest('a');
      const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
      
      if (!isLink && !isButton) {
        const cardUrl = cardEl.dataset.url;
        if (cardUrl && cardUrl.startsWith('/blog/')) {
          window.location.href = cardUrl;
        } else {
          console.error('無效的文章URL:', cardUrl);
        }
      }
    }
  }
  
  function updateURL() {
    const url = new URL(window.location);
    url.search = '';
    
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
    
    // 使用pushState而非直接修改location
    const stateObj = {
      category: currentCategory,
      tag: currentTag,
      search: currentSearchQuery,
      series: currentSeries,
      page: currentPage
    };
    
    window.history.pushState(stateObj, '', url);
    console.log('更新URL:', url.toString());
  }
  
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
        console.log('獲取到的博客數據:', data);
        
        if (data.series_list && Array.isArray(data.series_list)) {
          console.log('新格式系列列表:', data.series_list);
        }
        
        if (data.series) {
          console.log('系列文章數據:', data.series);
        }
        
        allPosts = data;
        
        if (!data.series || Object.keys(data.series).length === 0) {
          console.warn('未檢測到系列文章數據');
        }
        
        initializeTagCloud(data.tags || []);
        initializePopularPosts();
        initializeSidebarSeriesList(data);
        filterAndDisplayPosts();
      })
      .catch(error => {
        console.error('獲取文章數據時出錯:', error);
        showError('無法載入文章數據，請稍後再試。');
      });
  }
  
  function initializeSidebarSeriesList(data) {
    const sidebarSeriesContainer = document.getElementById('sidebar-series-list-container');
    if (!sidebarSeriesContainer) {
      console.error('無法找到系列文章容器元素 (sidebar-series-list-container)');
      return;
    }
    
    const seriesSection = document.querySelector('.series-sidebar-section');
    
    if (data.series_list && Array.isArray(data.series_list) && data.series_list.length > 0) {
      let seriesHTML = '';
      
      data.series_list.forEach(series => {
        if (!series || !series.id) {
          console.warn('跳過無效系列數據');
          return;
        }
        
        const seriesImage = series.image || '/assets/images/blog/default.jpg';
        const seriesId = series.id;
        const seriesTitle = series.title || seriesId;
        const episodeCount = series.episode_count || 0;
        
        seriesHTML += `
          <div class="sidebar-series-card" data-series="${escapeHtml(seriesId)}">
            <div class="sidebar-series-image">
              <img src="${escapeHtml(seriesImage)}" alt="${escapeHtml(seriesTitle)}" loading="lazy" 
                  onerror="this.src='/assets/images/blog/default.jpg';">
            </div>
            <div class="sidebar-series-content">
              <h4>${escapeHtml(seriesTitle)}</h4>
              <p>${episodeCount} 篇文章</p>
            </div>
          </div>
        `;
      });
      
      sidebarSeriesContainer.innerHTML = seriesHTML;
      
      const seriesCards = sidebarSeriesContainer.querySelectorAll('.sidebar-series-card');
      seriesCards.forEach(card => {
        card.addEventListener('click', function() {
          const seriesName = this.dataset.series;
          if (seriesName) {
            console.log(`選擇系列: ${seriesName}`);
            filterBySeriesName(seriesName);
          }
        });
      });
      
      if (seriesSection) {
        seriesSection.style.display = 'block';
      }
    } else if (data.series && Object.keys(data.series).length > 0) {
      const series = data.series;
      let seriesHTML = '';
      let seriesCount = 0;
      
      for (const seriesName in series) {
        if (!series.hasOwnProperty(seriesName)) continue;
        
        const seriesData = series[seriesName];
        if (seriesData.posts && Array.isArray(seriesData.posts)) {
          const seriesPosts = seriesData.posts;
          const seriesImage = seriesData.image || '/assets/images/blog/default.jpg';
          const seriesTitle = seriesData.title || seriesName;
          
          seriesCount++;
          seriesHTML += `
            <div class="sidebar-series-card" data-series="${escapeHtml(seriesName)}">
              <div class="sidebar-series-image">
                <img src="${escapeHtml(seriesImage)}" alt="${escapeHtml(seriesTitle)}" loading="lazy"
                    onerror="this.src='/assets/images/blog/default.jpg';">
              </div>
              <div class="sidebar-series-content">
                <h4>${escapeHtml(seriesTitle)}</h4>
                <p>${seriesPosts.length} 篇文章</p>
              </div>
            </div>
          `;
        } else if (Array.isArray(seriesData)) {
          const seriesPosts = seriesData;
          if (seriesPosts.length === 0) continue;
          
          seriesCount++;
          const firstPost = seriesPosts[0];
          const seriesImage = firstPost.image || '/assets/images/blog/default.jpg';
          
          seriesHTML += `
            <div class="sidebar-series-card" data-series="${escapeHtml(seriesName)}">
              <div class="sidebar-series-image">
                <img src="${escapeHtml(seriesImage)}" alt="${escapeHtml(seriesName)}" loading="lazy"
                    onerror="this.src='/assets/images/blog/default.jpg';">
              </div>
              <div class="sidebar-series-content">
                <h4>${escapeHtml(seriesName)}</h4>
                <p>${seriesPosts.length} 篇文章</p>
              </div>
            </div>
          `;
        }
      }
      
      if (seriesCount > 0) {
        sidebarSeriesContainer.innerHTML = seriesHTML;
        
        const seriesCards = sidebarSeriesContainer.querySelectorAll('.sidebar-series-card');
        seriesCards.forEach(card => {
          card.addEventListener('click', function() {
            const seriesName = this.dataset.series;
            if (seriesName) {
              console.log(`選擇系列: ${seriesName}`);
              filterBySeriesName(seriesName);
            }
          });
        });
        
        if (seriesSection) {
          seriesSection.style.display = 'block';
        }
      } else {
        if (seriesSection) {
          seriesSection.style.display = 'none';
        }
        sidebarSeriesContainer.innerHTML = '<div class="no-series-message">目前沒有系列文章</div>';
      }
    } else {
      console.warn('沒有系列文章數據可顯示');
      if (seriesSection) {
        seriesSection.style.display = 'none';
      }
      sidebarSeriesContainer.innerHTML = '<div class="no-series-message">目前沒有系列文章</div>';
    }
  }
  
  function filterBySeriesName(seriesName) {
    if (!seriesName) {
      console.error('系列名稱為空');
      return;
    }
    
    let seriesPosts = [];
    
    if (allPosts.series && allPosts.series[seriesName]) {
      const seriesData = allPosts.series[seriesName];
      if (seriesData.posts && Array.isArray(seriesData.posts)) {
        seriesPosts = seriesData.posts;
      } else if (Array.isArray(seriesData)) {
        seriesPosts = seriesData;
      }
    }
    
    if (seriesPosts.length === 0) {
      console.error(`找不到系列 "${seriesName}" 的文章`);
      return;
    }
    
    currentSeries = seriesName;
    currentCategory = 'all';
    currentTag = '';
    currentSearchQuery = '';
    currentPage = 1;
    
    if (searchInput) {
      searchInput.value = '';
      searchContainer.classList.remove('search-active');
    }
    
    filterButtons.forEach(btn => {
      if (btn.dataset.category === 'all') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    filterAndDisplayPosts();
    updateURL();
    
    setTimeout(() => {
      const targetElement = (searchResultsContainer && searchResultsContainer.style.display === 'block') 
        ? searchResultsContainer 
        : blogPostsContainer;
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.5
        );
        
        if (!isVisible) {
          window.scrollTo({
            top: targetElement.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  }
  
  function showSeriesResults(seriesName, resultCount) {
    if (!searchResultsContainer) return;
    
    let seriesTitle = seriesName;
    let seriesDescription = '';
    
    if (allPosts.series && allPosts.series[seriesName]) {
      const seriesData = allPosts.series[seriesName];
      if (seriesData.title) {
        seriesTitle = seriesData.title;
      }
      if (seriesData.description) {
        seriesDescription = `<p class="series-description">${escapeHtml(seriesData.description)}</p>`;
      }
    }
    
    searchResultsContainer.innerHTML = `
      <div class="search-results-info">
        <h3>系列: "${seriesTitle}"</h3>
        ${seriesDescription}
        <div class="results-meta">${resultCount} 篇文章</div>
        <button class="btn-reset" id="reset-search">
          返回所有文章
        </button>
      </div>
    `;
    searchResultsContainer.style.display = 'block';
  }
  
  function filterAndDisplayPosts() {
    console.log('執行filterAndDisplayPosts，當前參數:', {
      page: currentPage,
      category: currentCategory,
      tag: currentTag,
      search: currentSearchQuery,
      series: currentSeries
    });
    
    let filteredPosts = allPosts.posts || [];
    
    if (currentSeries) {
      if (allPosts.series && allPosts.series[currentSeries]) {
        const seriesData = allPosts.series[currentSeries];
        filteredPosts = seriesData.posts && Array.isArray(seriesData.posts) ? seriesData.posts : (Array.isArray(seriesData) ? seriesData : []);
        showSeriesResults(currentSeries, filteredPosts.length);
      } else {
        console.error(`找不到系列: ${currentSeries}`);
        hideSearchResults();
        currentSeries = '';
      }
    } else {
      hideSearchResults();
      
      if (currentSearchQuery) {
        const searchTerms = currentSearchQuery.toLowerCase().split(' ');
        filteredPosts = filteredPosts.filter(post => {
          const title = post.title.toLowerCase();
          const summary = post.summary ? post.summary.toLowerCase() : '';
          const tags = post.tags ? post.tags.join(' ').toLowerCase() : '';
          return searchTerms.every(term => title.includes(term) || summary.includes(term) || tags.includes(term));
        });
        showSearchResults(filteredPosts.length);
      } else {
        hideSearchResults();
      }
      
      if (currentCategory && currentCategory !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
      }
      
      if (currentTag) {
        filteredPosts = filteredPosts.filter(post => post.tags && post.tags.some(tag => tag.toLowerCase() === currentTag.toLowerCase()));
      }
    }
    
    const totalPosts = filteredPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
    
    console.log(`總共 ${totalPosts} 篇文章, ${totalPages} 頁, 當前第 ${currentPage} 頁`);
    
    // 確保頁碼在有效範圍內
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    // 計算當前頁的起始和結束索引
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, filteredPosts.length);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    console.log(`顯示第 ${startIndex+1} 到 ${endIndex} 篇文章`);
    
    displayPosts(paginatedPosts);
    generatePagination(currentPage, totalPages);
  }
  
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
      if (paginationContainer) {
        paginationContainer.style.display = 'none';
      }
      return;
    }
    
    if (paginationContainer) {
      paginationContainer.style.display = 'flex';
    }
    
    const postsHTML = `
      <div class="blog-list">
        ${posts.map(post => createPostCard(post)).join('')}
      </div>
    `;
    
    blogPostsContainer.innerHTML = postsHTML;
    
    const cards = blogPostsContainer.querySelectorAll('.blog-card');
    setTimeout(() => {
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('animated');
        }, index * 100);
      });
    }, 100);

    const allImages = blogPostsContainer.querySelectorAll('.blog-image img');
    allImages.forEach(img => {
      img.addEventListener('error', function() {
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
  
  function createPostCard(post) {
    if (!post) {
      console.error("createPostCard: 收到無效的貼文數據");
      return "";
    }

    const postTitle = post.title || "無標題文章";
    const postDate = post.date || new Date().toISOString().split('T')[0];
    const postUrl = post.url || "#";
    const postCategory = post.category || "default";
    
    let summary = post.summary || '';
    if (summary === postTitle) {
      summary = "點擊閱讀文章瞭解更多詳情...";
    } else if (summary.length > SUMMARY_MAX_LENGTH) {
      summary = summary.substring(0, SUMMARY_MAX_LENGTH) + '...';
    }
    
    let imageUrl = post.image || '/assets/images/blog/default.jpg';
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = '/' + imageUrl;
    }
    
    const tagsHTML = post.tags && post.tags.length > 0
      ? post.tags.slice(0, 3).map(tag => `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${tag}</a>`).join('')
      : '';
    
    const seriesBadge = post.is_series 
      ? `<div class="series-badge" title="${post.series_name} EP${post.episode}">${post.series_name} EP${post.episode}</div>` 
      : '';
    
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
  
  function initializeTagCloud(tags) {
    if (!tagCloudContainer || !tags || tags.length === 0) return;
    
    const topTags = tags.slice(0, 15);
    const tagsHTML = topTags.map(tag => `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="${currentTag === tag ? 'active' : ''}">${tag}</a>`).join('');
    tagCloudContainer.innerHTML = tagsHTML;
  }
  
  function initializePopularPosts() {
    if (!popularPostsContainer || !allPosts.posts || allPosts.posts.length === 0) return;
    
    const popularPosts = allPosts.posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    const postsHTML = popularPosts.map(post => {
      const seriesIndicator = post.is_series ? `<span class="series-indicator">[${post.series_name} EP${post.episode}]</span> ` : '';
      return `
        <li>
          <a href="${post.url}">${seriesIndicator}${post.title}</a>
          <span class="post-date">${post.date}</span>
        </li>
      `;
    }).join('');
    
    popularPostsContainer.innerHTML = postsHTML;
  }
  
  function generatePagination(currentPage, totalPages) {
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    console.log(`生成分頁按鈕: 當前頁 ${currentPage}, 總頁數 ${totalPages}`);
    let paginationHTML = '';
    
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `
      <a href="javascript:void(0)" class="pagination-btn ${prevDisabled}" data-page="${currentPage - 1}" ${prevDisabled ? 'aria-disabled="true"' : ''}>
        <span class="material-symbols-rounded">navigate_before</span>
      </a>
    `;
    
    const pagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
    
    if (endPage - startPage + 1 < pagesToShow) {
      startPage = Math.max(1, endPage - pagesToShow + 1);
    }
    
    if (startPage > 1) {
      paginationHTML += `<a href="javascript:void(0)" class="pagination-btn" data-page="1">1</a>`;
      if (startPage > 2) {
        paginationHTML += `<span class="pagination-btn disabled">...</span>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      paginationHTML += `<a href="javascript:void(0)" class="pagination-btn ${active}" data-page="${i}">${i}</a>`;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += `<span class="pagination-btn disabled">...</span>`;
      }
      paginationHTML += `<a href="javascript:void(0)" class="pagination-btn" data-page="${totalPages}">${totalPages}</a>`;
    }
    
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `
      <a href="javascript:void(0)" class="pagination-btn ${nextDisabled}" data-page="${currentPage + 1}" ${nextDisabled ? 'aria-disabled="true"' : ''}>
        <span class="material-symbols-rounded">navigate_next</span>
      </a>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
  }
  
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
  
  function hideSearchResults() {
    if (!searchResultsContainer) return;
    searchResultsContainer.innerHTML = '';
    searchResultsContainer.style.display = 'none';
  }
  
  function resetFilters() {
    currentCategory = 'all';
    currentTag = '';
    currentSearchQuery = '';
    currentSeries = '';
    currentPage = 1;
    
    if (searchInput) {
      searchInput.value = '';
      searchContainer.classList.remove('search-active');
    }
    
    filterButtons.forEach(btn => {
      if (btn.dataset.category === 'all') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    filterAndDisplayPosts();
    updateURL();
  }
  
  function showLoading() {
    if (!blogPostsContainer) return;
    
    blogPostsContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在載入文章...</p>
      </div>
    `;
  }
  
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
  
  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
      return '';
    }
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});