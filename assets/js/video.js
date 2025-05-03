document.addEventListener('DOMContentLoaded', function() {
  console.log('影片頁面腳本加載完成');
  
  // 元素容器
  const videoContainer = document.getElementById('video-container');
  const searchResultsContainer = document.getElementById('search-results-container');
  const paginationContainer = document.getElementById('pagination-container');
  
  // 過濾按鈕
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // 搜尋元素
  const searchInput = document.getElementById('video-search');
  const searchBtn = document.getElementById('search-btn');
  
  // 資料與分頁狀態
  let allVideos = null;
  let currentPage = 1;
  let currentCategory = 'all';
  let currentSearchTerm = '';
  let itemsPerPage = 6; // 每頁顯示6個影片
  
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
   * 加載影片數據
   */
  async function loadVideos() {
    console.log('開始加載影片數據');
    try {
      // 獲取URL參數
      getUrlParams();
      
      // 顯示加載中
      videoContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>正在加載影片...</p>
        </div>
      `;
      
      // 清空搜索結果容器
      searchResultsContainer.innerHTML = '';
      
      // 嘗試多種路徑加載JSON
      let response;
      let jsonData;
      
      try {
        console.log('嘗試加載路徑1: /assets/data/videos.json');
        response = await fetch('/assets/data/videos.json');
        
        if (!response.ok) {
          throw new Error(`HTTP錯誤: ${response.status}`);
        }
        
        jsonData = await response.json();
        console.log('成功加載JSON數據(路徑1)');
      } catch (error1) {
        console.warn('路徑1加載失敗，嘗試備用路徑:', error1);
        
        try {
          console.log('嘗試加載路徑2: assets/data/videos.json (無前導斜線)');
          response = await fetch('assets/data/videos.json');
          
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
      allVideos = jsonData;
      
      // 渲染影片列表
      renderFilteredVideos();
      
      return jsonData;
    } catch (error) {
      console.error('加載影片出錯:', error);
      
      // 顯示錯誤信息
      videoContainer.innerHTML = `
        <div class="no-results">
          <p>加載影片時出現問題: ${error.message}</p>
          <p>請稍後再試或聯絡我們。</p>
        </div>
      `;
      
      // 清空搜索結果容器
      searchResultsContainer.innerHTML = '';
      
      // 使用備用數據
      return useFallbackData();
    }
  }
  
  /**
   * 在無法加載數據時使用備用數據
   */
  function useFallbackData() {
    console.log('使用備用數據');
    // 備用影片數據
    const fallbackVideos = {
      videos: [
        {
          title: "台灣報稅流程簡介",
          date: "2025-03-15",
          description: "本影片詳細介紹台灣個人與企業報稅流程，包含申報時間、必要文件與常見問題解析，讓您輕鬆掌握報稅要點。",
          embedUrl: "https://www.youtube.com/embed/FvRwth0j_P0",
          category: "tax",
          tags: ["報稅", "個人所得稅", "企業報稅"]
        },
        {
          title: "創業公司會計注意事項",
          date: "2025-03-08",
          description: "針對新創企業的會計實務指南，說明創業初期常見的會計問題與解決方案，包含成本控制、現金流管理與稅務規劃。",
          embedUrl: "https://www.youtube.com/embed/MJlb2OEBuvA",
          category: "accounting",
          tags: ["新創企業", "會計實務", "財務管理"]
        }
      ],
      pagination: {
        total: 2,
        totalPages: 1,
        itemsPerPage: 6
      }
    };
    
    // 使用備用數據
    allVideos = fallbackVideos;
    
    // 渲染影片列表
    renderFilteredVideos();
    
    return fallbackVideos;
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
   * 過濾影片並進行分頁
   */
  function filterAndPaginateVideos() {
    console.log('過濾與分頁影片數據');
    if (!allVideos || !allVideos.videos || !Array.isArray(allVideos.videos)) {
      console.warn('影片數據無效，無法過濾與分頁');
      return { videos: [], totalPages: 0, totalVideos: 0 };
    }
    
    // 根據分類過濾
    let filteredVideos = allVideos.videos;
    if (currentCategory !== 'all') {
      filteredVideos = filteredVideos.filter(video => video.category === currentCategory);
    }
    
    // 根據搜尋詞過濾
    if (currentSearchTerm) {
      const searchTermLower = currentSearchTerm.toLowerCase();
      filteredVideos = filteredVideos.filter(video => {
        return video.title.toLowerCase().includes(searchTermLower) || 
               video.description.toLowerCase().includes(searchTermLower) ||
               (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTermLower)));
      });
    }
    
    // 計算總頁數
    const totalVideos = filteredVideos.length;
    const totalPages = Math.max(1, Math.ceil(totalVideos / itemsPerPage));
    
    // 確保當前頁碼有效
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    
    // 對當前頁進行分頁
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalVideos);
    const paginatedVideos = filteredVideos.slice(startIndex, endIndex);
    
    console.log('過濾結果:', { 
      totalVideos, 
      totalPages, 
      currentPage,
      videosOnCurrentPage: paginatedVideos.length
    });
    
    return {
      videos: paginatedVideos,
      totalPages: totalPages,
      totalVideos: totalVideos
    };
  }
  
  /**
   * 渲染經過過濾和分頁的影片
   */
  function renderFilteredVideos() {
    console.log('渲染過濾後的影片');
    const { videos, totalPages, totalVideos } = filterAndPaginateVideos();
    
    // 清空容器
    videoContainer.innerHTML = '';
    searchResultsContainer.innerHTML = '';
    
    // 渲染影片
    if (videos && videos.length > 0) {
      // 顯示搜索結果信息
      searchResultsContainer.innerHTML = `<div class="search-results-info">共找到 ${totalVideos} 部影片</div>`;
      
      // 渲染影片卡片
      videos.forEach(video => {
        const videoElement = document.createElement('div');
        videoElement.className = 'video-card';
        
        // 確保必要的屬性存在
        const videoEmbedUrl = video.embedUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        const videoTitle = video.title || '未命名影片';
        const videoDate = video.date || '未知日期';
        const videoDescription = video.description || '無影片描述';
        const videoTags = video.tags || [];
        
        // 創建標籤HTML
        let tagsHtml = '';
        if (videoTags.length > 0) {
          tagsHtml = '<div class="video-tags">';
          videoTags.forEach(tag => {
            tagsHtml += `<span class="video-tag" data-tag="${tag}">${tag}</span>`;
          });
          tagsHtml += '</div>';
        }
        
        videoElement.innerHTML = `
          <div class="video-embed">
            <iframe src="${videoEmbedUrl}" frameborder="0" allowfullscreen></iframe>
          </div>
          <div class="video-content">
            <h2>${videoTitle}</h2>
            <p class="date">${videoDate}</p>
            <p>${videoDescription}</p>
            ${tagsHtml}
          </div>
        `;
        
        videoContainer.appendChild(videoElement);
      });
      
      // 綁定標籤點擊事件
      document.querySelectorAll('.video-tag').forEach(tag => {
        tag.addEventListener('click', function() {
          const tagText = this.textContent;
          searchInput.value = tagText;
          currentSearchTerm = tagText;
          currentPage = 1;
          updateUrlParams();
          renderFilteredVideos();
        });
      });
      
      // 渲染分頁控制
      renderPagination(totalPages);
    } else {
      // 如果沒有影片
      videoContainer.innerHTML = `
        <div class="no-results">
          <p>找不到符合「${currentSearchTerm || currentCategory}」的影片。</p>
          <p>請嘗試其他關鍵字，或瀏覽我們的全部影片。</p>
          <button class="btn" id="reset-search">清除搜尋</button>
        </div>
      `;
      
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
            renderFilteredVideos();
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
        renderFilteredVideos();
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
        renderFilteredVideos();
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
          renderFilteredVideos();
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
        renderFilteredVideos();
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
        renderFilteredVideos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    paginationContainer.appendChild(nextBtn);
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
        renderFilteredVideos();
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
        renderFilteredVideos();
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
      renderFilteredVideos();
    });
  });
  
  // 監聽瀏覽器前進/後退按鈕
  window.addEventListener('popstate', function() {
    getUrlParams();
    renderFilteredVideos();
  });
  
  // 初始化加載
  loadVideos();
});