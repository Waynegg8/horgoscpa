/**
 * blog.js - 霍爾果斯會計師事務所部落格功能腳本
 * 最後更新日期: 2025-05-17
 * 優化: 修正分類標籤功能、系列文章分類一致性、解決事件綁定衝突
 */
document.addEventListener('DOMContentLoaded', function() {
  // 常量定義
  const BLOG_POSTS_JSON = '/assets/data/blog-posts.json';
  const POSTS_PER_PAGE = 6;
  const SUMMARY_MAX_LENGTH = 120; // 摘要最大長度
  
  // 隨機圖片選擇功能 - 預設圖片庫
  const DEFAULT_IMAGES = [
    '/assets/images/blog/accounting_default.jpg',
    '/assets/images/blog/tax_default.jpg',
    '/assets/images/blog/consulting_default.jpg',
    '/assets/images/blog/business_default.jpg',
    '/assets/images/blog/finance_default.jpg',
    '/assets/images/blog/default.jpg'
  ];
  
  // 隨機選擇圖片函數
  function getRandomImage() {
    const randomIndex = Math.floor(Math.random() * DEFAULT_IMAGES.length);
    return DEFAULT_IMAGES[randomIndex];
  }
  
  // DOM 元素
  const blogPostsContainer = document.getElementById('blog-posts-container');
  const paginationContainer = document.getElementById('pagination-container');
  const popularPostsContainer = document.getElementById('popular-posts-container');
  const tagCloudContainer = document.getElementById('tag-cloud-container');
  const searchInput = document.getElementById('blog-search');
  const searchButton = document.getElementById('search-btn');
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
  
  // 暴露當前狀態給其他腳本
  window.currentCategory = currentCategory;
  window.currentPage = currentPage;
  window.allPosts = null; // 將在資料載入後設置
  
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
    
    // 更新全局變數，供其他腳本使用
    window.currentCategory = currentCategory;
    window.currentPage = currentPage;
    
    console.log('初始化參數:', {
      category: currentCategory,
      tag: currentTag,
      search: currentSearchQuery,
      series: currentSeries,
      page: currentPage
    });
    
    // 發出資料載入開始事件
    document.dispatchEvent(new CustomEvent('blogLoadingStarted'));
    
    fetchBlogPosts();
    setupEventListeners();
    setupScrollAnimations();
  }
  
  function setupEventListeners() {
    // 使用事件委派方式綁定分類按鈕事件
    const categoryFilter = document.querySelector('.category-filter');
    if (categoryFilter) {
      console.log('找到分類過濾容器，設置事件委派');
      
      categoryFilter.addEventListener('click', function(e) {
        const button = e.target.closest('.filter-btn');
        if (!button) return; // 如果點擊的不是按鈕或子元素，返回
        
        e.preventDefault();
        
        const category = button.dataset.category;
        if (!category) return;
        
        console.log(`點擊分類按鈕: ${category}`);
        
        // 更新所有按鈕的狀態
        document.querySelectorAll('.filter-btn').forEach(function(btn) {
          btn.classList.remove('active');
        });
        
        // 設置當前按鈕為活動狀態
        button.classList.add('active');
        
        // 重置其他篩選條件
        if (searchInput) {
          searchInput.value = '';
        }
        if (searchContainer && searchContainer.classList) {
          searchContainer.classList.remove('search-active');
        }
        
        // 更新狀態
        currentCategory = category;
        currentTag = '';
        currentSearchQuery = '';
        currentSeries = '';
        currentPage = 1;
        
        // 更新全局變數
        window.currentCategory = currentCategory;
        window.currentPage = currentPage;
        
        // 篩選並顯示文章
        filterAndDisplayPosts();
        updateURL();
      });
    } else {
      console.warn('無法找到分類過濾容器');
    }
    
    // 設置搜索功能
    if (searchInput && searchButton) {
      if (currentSearchQuery) {
        searchInput.value = currentSearchQuery;
        if (searchContainer && searchContainer.classList) {
          searchContainer.classList.add('search-active');
        }
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
        if (!searchInput) return;
        const searchValue = searchInput.value.trim();
        
        if (searchValue.length > 0) {
          // 搜索狀態激活
          if (searchContainer && searchContainer.classList) {
            searchContainer.classList.add('search-active');
          }
          
          // 更新分類按鈕狀態
          document.querySelectorAll('.filter-btn').forEach(function(btn) {
            if (btn && btn.classList) {
              if (btn.dataset && btn.dataset.category === 'all') {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            }
          });
          
          currentCategory = 'all';
          window.currentCategory = currentCategory;
        } else {
          // 搜索狀態取消
          if (searchContainer && searchContainer.classList) {
            searchContainer.classList.remove('search-active');
          }
          
          currentSearchQuery = '';
          currentPage = 1;
          currentSeries = '';
          
          // 重置為"全部"分類
          currentCategory = 'all';
          window.currentCategory = currentCategory;
          
          // 更新按鈕狀態
          document.querySelectorAll('.filter-btn').forEach(function(btn) {
            if (btn && btn.classList) {
              if (btn.dataset && btn.dataset.category === 'all') {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            }
          });
          
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
      
      searchButton.addEventListener('click', function(e) {
        e.preventDefault();
        handleSearchInput();
      });
      
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearchInput();
        }
      });
    }
    
    // 處理卡片點擊和系列按鈕
    document.addEventListener('click', function(e) {
      handleCardClick(e);
      
      // 系列按鈕點擊
      const seriesBtn = e.target.classList && e.target.classList.contains('view-series-btn') ? 
                    e.target : (e.target.parentElement && e.target.parentElement.classList && 
                              e.target.parentElement.classList.contains('view-series-btn') ? 
                              e.target.parentElement : null);
      
      if (seriesBtn && seriesBtn.dataset && seriesBtn.dataset.series) {
        e.preventDefault();
        filterBySeriesName(seriesBtn.dataset.series);
      }

      // 重置搜索按鈕點擊
      const resetBtn = e.target.id === 'reset-search' ? 
                      e.target : (e.target.parentElement && e.target.parentElement.id === 'reset-search' ? 
                                e.target.parentElement : null);
      
      if (resetBtn) {
        e.preventDefault();
        resetFilters();
      }
    });
    
    // 分頁按鈕事件 - 改進版
    if (paginationContainer) {
      paginationContainer.addEventListener('click', function(e) {
        const pageButton = e.target.closest('.pagination-btn:not(.disabled)');
        if (pageButton && pageButton.dataset) {
          e.preventDefault(); // 阻止預設行為
          
          const page = parseInt(pageButton.dataset.page);
          console.log('點擊分頁按鈕:', page, '當前頁碼:', currentPage);
          
          if (page && page !== currentPage) {
            currentPage = page;
            window.currentPage = currentPage; // 更新全局狀態
            
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
      
      // 更新全局變數
      window.currentCategory = currentCategory;
      window.currentPage = currentPage;
      
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
    
    // 監聽分類按鈕加載完成事件
    document.addEventListener('categoriesButtonsLoaded', function() {
      console.log('分類按鈕已加載，更新UI狀態');
      updateUIState();
    });
  }
  
  // 更新UI元素以反映當前狀態
  function updateUIState() {
    try {
      // 更新分類按鈕狀態
      document.querySelectorAll('.filter-btn').forEach(function(btn) {
        if (btn && btn.classList) {
          btn.classList.remove('active');
          
          if (btn.dataset && btn.dataset.category === currentCategory) {
            btn.classList.add('active');
          }
        }
      });
      
      // 更新搜索框
      if (searchInput) {
        searchInput.value = currentSearchQuery || '';
      }
      
      if (searchContainer && searchContainer.classList) {
        if (currentSearchQuery) {
          searchContainer.classList.add('search-active');
        } else {
          searchContainer.classList.remove('search-active');
        }
      }
    } catch (error) {
      console.error('更新UI狀態時發生錯誤:', error);
    }
  }
  
  function setupScrollAnimations() {
    const animateOnScroll = function() {
      const blogCards = document.querySelectorAll('.blog-card');
      const sidebarSections = document.querySelectorAll('.sidebar-section');
      
      function isElementInViewport(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
          rect.bottom >= 0
        );
      }
      
      if (blogCards) {
        blogCards.forEach(function(card) {
          if (card && card.classList && isElementInViewport(card) && !card.classList.contains('animated')) {
            card.classList.add('animated');
          }
        });
      }
      
      if (sidebarSections) {
        sidebarSections.forEach(function(section, index) {
          if (section && isElementInViewport(section) && !section.classList.contains('animated')) {
            section.classList.add('animated');
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(function() {
              section.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
              section.style.opacity = '1';
              section.style.transform = 'translateY(0)';
            }, 300 + (index * 200));
          }
        });
      }
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
      
      if (!isLink && !isButton && cardEl.dataset) {
        let cardUrl = cardEl.dataset.url;
        
        // 確保URL有/blog/前綴
        if (cardUrl && !cardUrl.startsWith("/blog/")) {
          cardUrl = "/blog/" + cardUrl.replace(/^\//, '');
        }
        
        if (cardUrl) {
          window.location.href = cardUrl;
        } else {
          console.error('無效的文章URL:', cardUrl);
        }
      }
    }
  }
  
  // 暴露給其他腳本使用的函數
  window.updateURL = updateURL;
  function updateURL() {
    try {
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
    } catch (error) {
      console.error('更新URL時發生錯誤:', error);
    }
  }
  
  // 修改: 改進系列文章分類統一邏輯
  function normalizeSeriesCategories(data) {
    if (!data) return data;
    
    try {
      console.log('開始統一系列文章分類');
      
      // 如果沒有系列數據或文章數據，直接返回
      if (!data.series || !data.posts || !Array.isArray(data.posts)) {
        console.warn('無系列或文章數據，跳過分類統一');
        return data;
      }
      
      // 為每個系列確定主要分類
      const seriesCategories = {};
      
      // 第一步：為每個系列確定分類
      Object.keys(data.series).forEach(function(seriesName) {
        const seriesData = data.series[seriesName];
        if (!seriesData) return;
        
        // 根據不同的數據格式獲取系列文章
        let seriesPosts = [];
        
        if (Array.isArray(seriesData)) {
          seriesPosts = seriesData;
        } else if (seriesData.posts && Array.isArray(seriesData.posts)) {
          seriesPosts = seriesData.posts;
        } else {
          console.warn(`無法識別系列 "${seriesName}" 的數據格式`);
          return;
        }
        
        if (seriesPosts.length === 0) {
          console.warn(`系列 "${seriesName}" 沒有文章`);
          return;
        }
        
        // 統計各分類出現次數
        const categoryCount = {};
        seriesPosts.forEach(function(post) {
          if (post && post.category) {
            categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;
          }
        });
        
        // 如果沒有任何分類，使用默認分類
        if (Object.keys(categoryCount).length === 0) {
          seriesCategories[seriesName] = 'tax'; // 默認分類
          console.log(`系列 "${seriesName}" 沒有任何分類，使用默認分類 'tax'`);
          return;
        }
        
        // 找出出現最多的分類
        let mainCategory = 'tax'; // 默認分類
        let maxCount = 0;
        
        Object.keys(categoryCount).forEach(function(category) {
          if (categoryCount[category] > maxCount) {
            maxCount = categoryCount[category];
            mainCategory = category;
          }
        });
        
        seriesCategories[seriesName] = mainCategory;
        console.log(`系列 "${seriesName}" 的主要分類確定為: ${mainCategory}`);
      });
      
      // 第二步：為所有屬於系列的文章統一分類
      let updatedCount = 0;
      data.posts.forEach(function(post) {
        if (post && post.is_series && post.series_name && seriesCategories[post.series_name]) {
          const originalCategory = post.category;
          const seriesCategory = seriesCategories[post.series_name];
          
          if (originalCategory !== seriesCategory) {
            post.category = seriesCategory;
            updatedCount++;
            console.log(`更新文章 "${post.title}" 的分類: ${originalCategory} -> ${seriesCategory}`);
          }
        }
      });
      
      // 第三步：更新系列數據中的文章分類
      Object.keys(data.series).forEach(function(seriesName) {
        if (!seriesCategories[seriesName]) return;
        
        const seriesCategory = seriesCategories[seriesName];
        const seriesData = data.series[seriesName];
        
        // 根據不同的數據格式更新系列文章分類
        if (Array.isArray(seriesData)) {
          seriesData.forEach(function(post) {
            if (post && post.category !== seriesCategory) {
              post.category = seriesCategory;
            }
          });
        } else if (seriesData && seriesData.posts && Array.isArray(seriesData.posts)) {
          seriesData.posts.forEach(function(post) {
            if (post && post.category !== seriesCategory) {
              post.category = seriesCategory;
            }
          });
        }
      });
      
      console.log(`共更新了 ${updatedCount} 篇文章的分類`);
      return data;
    } catch (error) {
      console.error('統一系列文章分類時發生錯誤:', error);
      return data; // 返回原始數據
    }
  }
  
  function fetchBlogPosts() {
    showLoading();
    
    fetch(BLOG_POSTS_JSON)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('無法獲取文章數據');
        }
        return response.json();
      })
      .then(function(data) {
        console.log('獲取到的博客數據:', data);
        
        if (!data) {
          throw new Error('獲取的數據為空');
        }
        
        try {
          // 強化: 徹底統一系列文章分類
          data = normalizeSeriesCategories(data);
          
          // 設置全局數據
          allPosts = data;
          window.allPosts = data;
          
          // 初始化標籤雲和熱門文章
          if (data.tags && Array.isArray(data.tags)) {
            initializeTagCloud(data.tags);
          } else {
            console.warn('未檢測到標籤數據');
          }
          
          // 初始化系列列表
          initializeSidebarSeriesList(data);
          
          // 初始化熱門文章區域
          initializePopularPosts();
          
          // 更新分類統計
          updateCategoryStats();
          
          // 更新UI狀態
          updateUIState();
          
          // 顯示文章
          filterAndDisplayPosts();
          
          // 發出自定義事件，通知其他腳本數據已加載完成
          console.log('發出blogDataLoaded事件');
          document.dispatchEvent(new CustomEvent('blogDataLoaded', { 
            detail: { posts: data.posts }
          }));
        } catch (error) {
          console.error('處理博客數據時發生錯誤:', error);
          // 仍然展示可用的數據
          if (!allPosts || !allPosts.posts) {
            allPosts = data;
            window.allPosts = data;
          }
          filterAndDisplayPosts();
        }
      })
      .catch(function(error) {
        console.error('獲取博客數據失敗:', error);
        showError('無法加載博客數據。請稍後再試。');
      });
  }
  
  function initializeSidebarSeriesList(data) {
    if (!data) return;
    
    const sidebarSeriesContainer = document.getElementById('sidebar-series-list-container');
    if (!sidebarSeriesContainer) {
      console.error('無法找到系列文章容器元素 (sidebar-series-list-container)');
      return;
    }
    
    const seriesSection = document.querySelector('.series-sidebar-section');
    
    // 顯示載入中狀態
    sidebarSeriesContainer.innerHTML = '<div class="loading-item">正在載入系列文章...</div>';
    
    // 優先使用 series_list 數據
    if (data.series_list && Array.isArray(data.series_list) && data.series_list.length > 0) {
      let seriesHTML = '';
      
      data.series_list.forEach(function(series) {
        if (!series || (!series.id && !series.slug)) {
          console.warn('跳過無效系列數據');
          return;
        }
        
        // 使用系列識別碼，優先使用 slug
        const seriesId = series.slug || series.id || '';
        
        // 使用隨機圖片或特定圖片
        const seriesImage = series.image || getRandomImage();
        const seriesTitle = series.title || series.name || seriesId;
        const episodeCount = series.count || (series.posts ? series.posts.length : 0) || 0;
        
        seriesHTML += `
          <div class="sidebar-series-card" data-series="${escapeHtml(seriesId)}">
            <div class="sidebar-series-image">
              <img src="${escapeHtml(seriesImage)}" alt="${escapeHtml(seriesTitle)}" loading="lazy" 
                  onerror="this.src='${getRandomImage()}';">
            </div>
            <div class="sidebar-series-content">
              <h4>${escapeHtml(seriesTitle)}</h4>
              <p>${episodeCount} 篇文章</p>
            </div>
          </div>
        `;
      });
      
      if (seriesHTML) {
        sidebarSeriesContainer.innerHTML = seriesHTML;
        
        // 為系列卡片添加點擊事件
        attachSeriesCardEvents(sidebarSeriesContainer);
        
        // 顯示系列區塊
        if (seriesSection) {
          seriesSection.style.display = 'block';
        }
      } else {
        sidebarSeriesContainer.innerHTML = '<div class="no-series-message">目前沒有系列文章</div>';
      }
    } 
    // 如果沒有 series_list，嘗試使用 series 數據
    else if (data.series && Object.keys(data.series).length > 0) {
      const series = data.series;
      let seriesHTML = '';
      let seriesCount = 0;
      
      for (const seriesName in series) {
        if (!series.hasOwnProperty(seriesName)) continue;
        
        const seriesData = series[seriesName];
        if (!seriesData) continue;
        
        // 獲取系列文章陣列
        let seriesPosts = [];
        if (seriesData.posts && Array.isArray(seriesData.posts)) {
          seriesPosts = seriesData.posts;
        } else if (Array.isArray(seriesData)) {
          seriesPosts = seriesData;
        } else {
          continue;
        }
        
        if (seriesPosts.length === 0) continue;
        
        seriesCount++;
        
        // 使用隨機圖片或特定圖片
        const seriesImage = (seriesData.image || (seriesPosts[0] && seriesPosts[0].image)) || getRandomImage();
        const seriesTitle = seriesData.title || seriesData.name || seriesName;
        
        seriesHTML += `
          <div class="sidebar-series-card" data-series="${escapeHtml(seriesName)}">
            <div class="sidebar-series-image">
              <img src="${escapeHtml(seriesImage)}" alt="${escapeHtml(seriesTitle)}" loading="lazy"
                  onerror="this.src='${getRandomImage()}';">
            </div>
            <div class="sidebar-series-content">
              <h4>${escapeHtml(seriesTitle)}</h4>
              <p>${seriesPosts.length} 篇文章</p>
            </div>
          </div>
        `;
      }
      
      if (seriesCount > 0) {
        sidebarSeriesContainer.innerHTML = seriesHTML;
        
        // 為系列卡片添加點擊事件
        attachSeriesCardEvents(sidebarSeriesContainer);
        
        // 顯示系列區塊
        if (seriesSection) {
          seriesSection.style.display = 'block';
        }
      } else {
        sidebarSeriesContainer.innerHTML = '<div class="no-series-message">目前沒有系列文章</div>';
        
        // 隱藏系列區塊
        if (seriesSection) {
          seriesSection.style.display = 'none';
        }
      }
    } else {
      console.warn('沒有系列文章數據可顯示');
      sidebarSeriesContainer.innerHTML = '<div class="no-series-message">目前沒有系列文章</div>';
      
      // 隱藏系列區塊
      if (seriesSection) {
        seriesSection.style.display = 'none';
      }
    }
  }
  
  // 添加系列卡片點擊事件
  function attachSeriesCardEvents(container) {
    const seriesCards = container.querySelectorAll('.sidebar-series-card');
    if (seriesCards && seriesCards.length > 0) {
      seriesCards.forEach(function(card) {
        if (card) {
          card.addEventListener('click', function() {
            if (this.dataset && this.dataset.series) {
              const seriesName = this.dataset.series;
              if (seriesName) {
                console.log(`選擇系列: ${seriesName}`);
                filterBySeriesName(seriesName);
              }
            }
          });
        }
      });
    }
  }
  
  function filterBySeriesName(seriesName) {
    if (!seriesName || !allPosts) {
      console.error('系列名稱為空或文章數據未載入');
      return;
    }
    
    // 尋找系列文章
    let seriesPosts = [];
    
    if (allPosts.series && allPosts.series[seriesName]) {
      const seriesData = allPosts.series[seriesName];
      if (seriesData) {
        if (seriesData.posts && Array.isArray(seriesData.posts)) {
          seriesPosts = seriesData.posts;
        } else if (Array.isArray(seriesData)) {
          seriesPosts = seriesData;
        }
      }
    }
    
    if (seriesPosts.length === 0) {
      console.error(`找不到系列 "${seriesName}" 的文章`);
      return;
    }
    
    // 更新狀態
    currentSeries = seriesName;
    currentCategory = 'all';
    currentTag = '';
    currentSearchQuery = '';
    currentPage = 1;
    
    // 更新全局變數
    window.currentCategory = currentCategory;
    window.currentPage = currentPage;
    
    // 重置搜索框
    if (searchInput) {
      searchInput.value = '';
    }
    
    if (searchContainer && searchContainer.classList) {
      searchContainer.classList.remove('search-active');
    }
    
    // 更新UI狀態 - 設置"全部"分類按鈕為活動狀態
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      if (btn && btn.classList) {
        if (btn.dataset && btn.dataset.category === 'all') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
    
    // 過濾並顯示文章
    filterAndDisplayPosts();
    
    // 更新URL
    updateURL();
    
    // 滾動到內容區域
    setTimeout(function() {
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
    if (!searchResultsContainer || !seriesName) return;
    
    let seriesTitle = seriesName;
    let seriesDescription = '';
    
    // 嘗試獲取系列詳細信息
    if (allPosts && allPosts.series && allPosts.series[seriesName]) {
      const seriesData = allPosts.series[seriesName];
      if (seriesData) {
        // 嘗試獲取系列標題
        if (seriesData.title) {
          seriesTitle = seriesData.title;
        } else if (seriesData.name) {
          seriesTitle = seriesData.name;
        }
        
        // 嘗試獲取系列描述
        if (seriesData.description) {
          seriesDescription = `<p class="series-description">${escapeHtml(seriesData.description)}</p>`;
        }
      }
    }
    
    // 顯示系列搜索結果信息
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
  
  // 更新分類統計並通知分類加載器
  function updateCategoryStats() {
    if (!allPosts || !allPosts.posts) return;
    
    try {
      // 計算各分類的文章數量
      const categoryStats = {};
      allPosts.posts.forEach(function(post) {
        if (post && post.category) {
          categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
        }
      });
      
      console.log('更新分類統計:', categoryStats);
      
      // 通知分類加載器更新
      if (typeof window.updateBlogCategoryStats === 'function') {
        window.updateBlogCategoryStats(categoryStats);
      }
    } catch (error) {
      console.error('更新分類統計時發生錯誤:', error);
    }
  }
  
  // 暴露給其他腳本使用的函數
  window.filterAndDisplayPosts = filterAndDisplayPosts;
  function filterAndDisplayPosts() {
    if (!allPosts) {
      console.error('文章數據未載入');
      return;
    }
    
    try {
      console.log('執行filterAndDisplayPosts，當前參數:', {
        page: currentPage,
        category: currentCategory,
        tag: currentTag,
        search: currentSearchQuery,
        series: currentSeries
      });
      
      // 確保有文章陣列
      let filteredPosts = allPosts.posts && Array.isArray(allPosts.posts) ? allPosts.posts : [];
      
      if (filteredPosts.length === 0) {
        console.warn('沒有可用的文章數據');
        showError('沒有可用的文章數據');
        return;
      }
      
      if (currentSeries) {
        // 使用系列文章數據
        if (allPosts.series && allPosts.series[currentSeries]) {
          const seriesData = allPosts.series[currentSeries];
          if (seriesData) {
            // 根據數據格式獲取系列文章
            if (seriesData.posts && Array.isArray(seriesData.posts)) {
              filteredPosts = seriesData.posts;
            } else if (Array.isArray(seriesData)) {
              filteredPosts = seriesData;
            } else {
              console.warn(`系列 "${currentSeries}" 數據格式不符合預期`);
            }
            
            // 顯示系列搜索結果
            showSeriesResults(currentSeries, filteredPosts.length);
          }
        } else {
          console.error(`找不到系列: ${currentSeries}`);
          hideSearchResults();
          currentSeries = '';
        }
      } else {
        hideSearchResults();
        
        // 使用關鍵字搜索
        if (currentSearchQuery) {
          const searchTerms = currentSearchQuery.toLowerCase().split(' ');
          filteredPosts = filteredPosts.filter(function(post) {
            if (!post) return false;
            
            const title = post.title ? post.title.toLowerCase() : '';
            const summary = post.summary ? post.summary.toLowerCase() : '';
            const tags = post.tags ? (Array.isArray(post.tags) ? 
                      post.tags.map(t => typeof t === 'object' ? t.name || '' : t).join(' ') : 
                      '').toLowerCase() : '';
            
            return searchTerms.every(function(term) {
              return title.includes(term) || summary.includes(term) || tags.includes(term);
            });
          });
          
          // 顯示搜索結果
          showSearchResults(filteredPosts.length);
        }
        
        // 使用分類篩選
        if (currentCategory && currentCategory !== 'all') {
          console.log(`按分類篩選: ${currentCategory}, 篩選前文章數: ${filteredPosts.length}`);
          
          filteredPosts = filteredPosts.filter(function(post) {
            return post && post.category === currentCategory;
          });
          
          console.log(`分類篩選後文章數: ${filteredPosts.length}`);
        }
        
        // 使用標籤篩選
        if (currentTag) {
          filteredPosts = filteredPosts.filter(function(post) {
            return post && post.tags && post.tags.some(function(tag) {
              // 檢查標籤是否是物件
              if (typeof tag === 'object' && tag !== null) {
                return tag.slug === currentTag || tag.name === currentTag;
              } else {
                return tag === currentTag;
              }
            });
          });
        }
      }
      
      // 計算分頁信息
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
      
      // 統計各分類的文章數量
      if (currentCategory === 'all' && !currentTag && !currentSearchQuery && !currentSeries) {
        const categoryStats = {};
        filteredPosts.forEach(function(post) {
          if (post && post.category) {
            categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
          }
        });
        
        // 通知分類加載器更新
        if (typeof window.updateBlogCategoryStats === 'function') {
          window.updateBlogCategoryStats(categoryStats);
        }
      }
      
      // 顯示文章和分頁
      displayPosts(paginatedPosts);
      generatePagination(currentPage, totalPages);
      
    } catch (error) {
      console.error('過濾和顯示文章時發生錯誤:', error);
      showError('顯示文章時發生錯誤。請刷新頁面重試。');
    }
  }
  
  function displayPosts(posts) {
    if (!blogPostsContainer) return;
    
    if (!posts || posts.length === 0) {
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
        ${posts.map(function(post) { return createPostCard(post); }).join('')}
      </div>
    `;
    
    blogPostsContainer.innerHTML = postsHTML;
    
    const cards = blogPostsContainer.querySelectorAll('.blog-card');
    if (cards) {
      setTimeout(function() {
        cards.forEach(function(card, index) {
          if (card && card.classList) {
            setTimeout(function() {
              card.classList.add('animated');
            }, index * 100);
          }
        });
      }, 100);
    }

    const allImages = blogPostsContainer.querySelectorAll('.blog-image img');
    if (allImages) {
      allImages.forEach(function(img) {
        if (img) {
          img.addEventListener('error', function() {
            this.src = getRandomImage();
          });
        }
      });
    }
  }
  
  function createPostCard(post) {
    if (!post) {
      console.error("createPostCard: 收到無效的貼文數據");
      return "";
    }

    const postTitle = post.title || "無標題文章";
    const postDate = post.date || new Date().toISOString().split('T')[0];
    
    // 確保URL有/blog/前綴
    let postUrl = post.url || "#";
    if (postUrl !== "#" && !postUrl.startsWith("/blog/")) {
      postUrl = "/blog/" + postUrl.replace(/^\//, '');
    }
    
    const postCategory = post.category || "default";
    
    let summary = post.summary || '';
    if (summary === postTitle) {
      summary = "點擊閱讀文章瞭解更多詳情...";
    } else if (summary.length > SUMMARY_MAX_LENGTH) {
      summary = summary.substring(0, SUMMARY_MAX_LENGTH) + '...';
    }
    
    let imageUrl = post.image || getRandomImage();
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = '/' + imageUrl;
    }
    
    // 處理標籤 - 支援物件和字串格式
    const tagsHTML = post.tags && post.tags.length > 0
      ? post.tags.slice(0, 3).map(function(tag) {
          // 檢查標籤是否是物件
          if (typeof tag === 'object' && tag !== null) {
            return `<a href="/blog.html?tag=${encodeURIComponent(tag.slug || tag.name)}" class="blog-tag">${tag.name}</a>`;
          } else {
            // 處理字符串標籤的情況
            return `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${tag}</a>`;
          }
        }).join('')
      : '';
    
    // 系列文章徽章
    const seriesBadge = post.is_series && post.series_name && post.episode
      ? `<div class="series-badge" title="${escapeHtml(post.series_name)} EP${post.episode}">${escapeHtml(post.series_name)} EP${post.episode}</div>` 
      : '';
    
    // 系列文章屬性
    const seriesAttr = post.is_series && post.series_name && post.episode 
      ? `data-series="${escapeHtml(post.series_name)}" data-episode="${post.episode}"` 
      : '';
    
    return `
      <article class="blog-card" data-url="${postUrl}" data-category="${postCategory}" ${seriesAttr}>
        <a href="${postUrl}" class="blog-card-link" aria-label="閱讀文章：${postTitle}">閱讀全文</a>
        <div class="blog-image">
          <img src="${imageUrl}" alt="${postTitle}" loading="lazy" onerror="this.src='${getRandomImage()}';">
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
    if (!tagCloudContainer || !tags || tags.length === 0 || !allPosts || !allPosts.posts) return;
    
    try {
      // 過濾出有文章的標籤
      const filteredTags = tags.filter(function(tag) {
        // 檢查該標籤是否與任何文章的標籤有關聯
        return allPosts.posts.some(function(post) {
          return post && post.tags && post.tags.some(function(postTag) {
            // 檢查標籤是否是物件
            if (typeof postTag === 'object' && postTag !== null) {
              return postTag.slug === (typeof tag === 'object' ? tag.slug : tag) || 
                     postTag.name === (typeof tag === 'object' ? tag.name : tag);
            } else {
              return postTag === (typeof tag === 'object' ? tag.slug || tag.name : tag);
            }
          });
        });
      });
      
      // 如果過濾後沒有標籤，顯示沒有標籤的訊息
      if (filteredTags.length === 0) {
        tagCloudContainer.innerHTML = "<p>目前沒有標籤。</p>";
        return;
      }
      
      // 顯示最多5個標籤
      const topTags = filteredTags.slice(0, 5);
      
      // 生成標籤HTML
      const tagsHTML = topTags.map(function(tag) {
        // 檢查標籤是否是物件
        if (typeof tag === 'object' && tag !== null) {
          const tagSlug = tag.slug || '';
          const tagName = tag.name || '';
          const activeClass = currentTag === tagSlug ? 'active' : '';
          return `<a href="/blog.html?tag=${encodeURIComponent(tagSlug)}" class="${activeClass}">${tagName}</a>`;
        } else {
          // 處理字符串標籤的情況
          const activeClass = currentTag === tag ? 'active' : '';
          return `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="${activeClass}">${tag}</a>`;
        }
      }).join('');
      
      // 將標籤加入頁面
      tagCloudContainer.innerHTML = tagsHTML;
    } catch (error) {
      console.error('初始化標籤雲時發生錯誤:', error);
      tagCloudContainer.innerHTML = "<p>載入標籤時發生錯誤</p>";
    }
  }
  
  function initializePopularPosts() {
    if (!popularPostsContainer || !allPosts || !allPosts.posts || allPosts.posts.length === 0) return;
    
    try {
      // 根據日期排序取最新的5篇文章
      const popularPosts = allPosts.posts
        .filter(function(post) { return post && post.date; })
        .sort(function(a, b) { 
          return new Date(b.date) - new Date(a.date); 
        })
        .slice(0, 5);
      
      const postsHTML = popularPosts.map(function(post) {
        if (!post) return '';
        
        // 確保URL有/blog/前綴
        let postUrl = post.url || "#";
        if (postUrl !== "#" && !postUrl.startsWith("/blog/")) {
          postUrl = "/blog/" + postUrl.replace(/^\//, '');
        }
        
        const seriesIndicator = post.is_series && post.series_name && post.episode 
          ? `<span class="series-indicator">[${escapeHtml(post.series_name)} EP${post.episode}]</span> ` 
          : '';
          
        return `
          <li>
            <a href="${postUrl}">${seriesIndicator}${post.title}</a>
            <span class="post-date">${post.date}</span>
          </li>
        `;
      }).join('');
      
      popularPostsContainer.innerHTML = postsHTML || "<li>暫無熱門文章</li>";
    } catch (error) {
      console.error('初始化熱門文章區域時發生錯誤:', error);
      popularPostsContainer.innerHTML = "<li>載入熱門文章時發生錯誤</li>";
    }
  }
  
  function generatePagination(currentPage, totalPages) {
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    try {
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
    } catch (error) {
      console.error('生成分頁按鈕時發生錯誤:', error);
      paginationContainer.innerHTML = '';
    }
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
    
    // 更新全局變數
    window.currentCategory = currentCategory;
    window.currentPage = currentPage;
    
    if (searchInput) {
      searchInput.value = '';
    }
    
    if (searchContainer && searchContainer.classList) {
      searchContainer.classList.remove('search-active');
    }
    
    // 更新UI狀態
    updateUIState();
    
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