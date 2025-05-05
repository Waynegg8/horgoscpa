/**
 * video-modern.js - 霍爾果斯會計師事務所影片頁面現代化腳本
 * 最後更新日期: 2025-05-10
 * 基於原有video.js優化，增加滾動動畫、改進搜索體驗、側邊欄交互功能
 * 增加動態抓取熱門影片功能
 * 新增SEO優化: 影片縮圖、結構化資料、影片延遲載入
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('影片頁面腳本加載完成');
  
  // 元素容器
  const videoContainer = document.getElementById('video-container');
  const searchResultsContainer = document.getElementById('search-results-container');
  const paginationContainer = document.getElementById('pagination-container');
  const popularVideosContainer = document.getElementById('popular-videos-container');
  const structuredDataContainer = document.getElementById('structured-data-container');
  
  // 過濾按鈕
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // 側邊欄分類條目
  const categoryStats = document.querySelectorAll('.category-stat');
  
  // 搜尋元素
  const searchInput = document.getElementById('video-search');
  const searchBtn = document.getElementById('search-btn');
  const searchContainer = document.querySelector('.search-container');
  
  // 資料與分頁狀態
  let allVideos = null;
  let currentPage = 1;
  let currentCategory = 'all';
  let currentSearchTerm = '';
  let itemsPerPage = 6; // 每頁顯示6個影片
  
  /**
   * 從YouTube URL提取影片ID
   * @param {string} url - YouTube嵌入URL
   * @return {string|null} - YouTube影片ID或null
   */
  function extractYouTubeVideoId(url) {
    if (!url) return null;
    
    // 處理各種可能的YouTube URL格式
    let videoId = null;
    
    // 嵌入URL: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([^\/\?]+)/i);
    if (embedMatch && embedMatch[1]) return embedMatch[1];
    
    // 標準URL: https://www.youtube.com/watch?v=VIDEO_ID
    const standardMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/i);
    if (standardMatch && standardMatch[1]) return standardMatch[1];
    
    // 短URL: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^\/\?]+)/i);
    if (shortMatch && shortMatch[1]) return shortMatch[1];
    
    return null;
  }
  
  /**
   * 生成YouTube縮圖URL
   * @param {string} videoId - YouTube影片ID
   * @param {string} quality - 縮圖品質 (default, mq, hq, sd, maxres)
   * @return {string} - 縮圖URL
   */
  function generateYouTubeThumbnailUrl(videoId, quality = 'maxres') {
    if (!videoId) return '';
    
    const qualityMap = {
      'default': 'default',
      'mq': 'mqdefault',
      'hq': 'hqdefault',
      'sd': 'sddefault',
      'maxres': 'maxresdefault'
    };
    
    const thumbnailQuality = qualityMap[quality] || 'maxresdefault';
    return `https://img.youtube.com/vi/${videoId}/${thumbnailQuality}.jpg`;
  }
  
  /**
   * 生成影片結構化資料
   * @param {Array} videos - 影片資料陣列
   * @return {string} - 結構化資料HTML
   */
  function generateStructuredData(videos) {
    if (!videos || !videos.length) return '';
    
    // 創建ItemList結構化資料
    const itemListData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": [],
      "numberOfItems": videos.length
    };
    
    // 創建各個影片的VideoObject結構化資料
    const videoStructuredDataArray = [];
    
    videos.forEach((video, index) => {
      if (!video.title || !video.embedUrl) return;
      
      // 提取影片ID和生成縮圖URL
      const videoId = extractYouTubeVideoId(video.embedUrl);
      const thumbnailUrl = generateYouTubeThumbnailUrl(videoId, 'maxres');
      
      // 格式化日期
      const isoDate = new Date(video.date).toISOString();
      
      // 創建標準YouTube URL，與嵌入URL不同
      const contentUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : video.embedUrl;
      
      // VideoObject結構化資料
      const videoData = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": video.title,
        "description": video.description || `${video.title} - 霍爾果斯會計師事務所專業影片教學`,
        "thumbnailUrl": thumbnailUrl,
        "uploadDate": isoDate,
        "contentUrl": contentUrl,
        "embedUrl": video.embedUrl,
        "publisher": {
          "@type": "Organization",
          "name": "霍爾果斯會計師事務所",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.horgoscpa.com/assets/images/logo.png"
          }
        }
      };
      
      // 添加到結構化資料陣列
      videoStructuredDataArray.push(
        `<script type="application/ld+json">${JSON.stringify(videoData)}</script>`
      );
      
      // 添加到ItemList中
      itemListData.itemListElement.push({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "VideoObject",
          "name": video.title,
          "url": window.location.href + `?video=${videoId || index}`
        }
      });
    });
    
    // 更新主頁的ItemList結構化資料
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    
    let itemListUpdated = false;
    scriptElements.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data["@type"] === "ItemList") {
          script.textContent = JSON.stringify(itemListData);
          itemListUpdated = true;
        }
      } catch (e) {
        console.error('解析結構化資料時出錯:', e);
      }
    });
    
    // 如果沒有找到現有的ItemList，創建新的
    if (!itemListUpdated) {
      videoStructuredDataArray.unshift(
        `<script type="application/ld+json">${JSON.stringify(itemListData)}</script>`
      );
    }
    
    return videoStructuredDataArray.join('\n');
  }
  
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
      
      // 添加搜索活躍狀態
      searchContainer.classList.add('search-active');
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
      
      // 生成並添加結構化資料
      if (allVideos && allVideos.videos && allVideos.videos.length > 0) {
        structuredDataContainer.innerHTML = generateStructuredData(allVideos.videos);
      }
      
      // 渲染影片列表
      renderFilteredVideos();
      
      // 更新側邊欄統計數據
      updateSidebarStatistics();
      
      // 新增：顯示熱門影片
      renderPopularVideos();
      
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
   * 更新側邊欄統計數據
   */
  function updateSidebarStatistics() {
    if (!allVideos || !allVideos.videos) return;
    
    const videos = allVideos.videos;
    const categoryCountMap = {};
    
    // 初始化每個分類的數量為0
    filterButtons.forEach(btn => {
      const category = btn.dataset.category;
      if (category && category !== 'all') {
        categoryCountMap[category] = 0;
      }
    });
    
    // 計算各分類的數量
    videos.forEach(video => {
      if (video.category && categoryCountMap.hasOwnProperty(video.category)) {
        categoryCountMap[video.category]++;
      }
    });
    
    // 更新側邊欄分類統計數據
    categoryStats.forEach(stat => {
      const category = stat.dataset.category;
      const countElement = stat.querySelector('.category-count');
      
      if (countElement && category && categoryCountMap.hasOwnProperty(category)) {
        countElement.textContent = categoryCountMap[category];
        
        // 為數量為0的分類添加視覺提示
        if (categoryCountMap[category] === 0) {
          stat.classList.add('empty-category');
        } else {
          stat.classList.remove('empty-category');
        }
      }
    });
    
    // 如果定義了全局更新函數，則調用它
    if (typeof window.updateCategoryStats === 'function') {
      window.updateCategoryStats(categoryCountMap);
    }
    
    console.log('分類統計更新完成:', categoryCountMap);
  }
  
  /**
   * 新增：顯示熱門影片
   * 按日期排序選擇最新的4個影片作為熱門影片
   */
  function renderPopularVideos() {
    if (!popularVideosContainer || !allVideos || !allVideos.videos) return;
    
    // 清空容器
    popularVideosContainer.innerHTML = '';
    
    // 將影片按日期排序（新 -> 舊）
    const sortedVideos = [...allVideos.videos].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // 選取前4個最新的影片，或者所有影片（如果少於4個）
    const popularVideos = sortedVideos.slice(0, Math.min(4, sortedVideos.length));
    
    // 生成HTML
    popularVideos.forEach((video, index) => {
      const videoTitle = video.title || '未命名影片';
      const videoDate = formatDate(video.date) || '未知日期';
      const videoId = extractYouTubeVideoId(video.embedUrl);
      const thumbnailUrl = generateYouTubeThumbnailUrl(videoId, 'mq');
      
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="#" id="popular-video-${index + 1}" data-title="${videoTitle}">
          <img src="${thumbnailUrl}" alt="${videoTitle}" class="popular-video-thumbnail" loading="lazy">
          <span class="popular-video-title">${videoTitle}</span>
        </a>
        <span class="video-date">${videoDate}</span>
      `;
      
      popularVideosContainer.appendChild(li);
    });
    
    // 綁定熱門影片點擊事件
    bindPopularVideoEvents();
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
          embedUrl: "https://www.youtube.com/embed/FvRgth0j_P0",
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
    
    // 生成並添加結構化資料
    if (structuredDataContainer) {
      structuredDataContainer.innerHTML = generateStructuredData(allVideos.videos);
    }
    
    // 渲染影片列表
    renderFilteredVideos();
    
    // 更新側邊欄統計數據
    updateSidebarStatistics();
    
    // 新增：顯示熱門影片
    renderPopularVideos();
    
    return fallbackVideos;
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
   * 播放影片 - 將縮圖替換為iframe
   * @param {Element} videoCard - 影片卡片元素
   * @param {string} embedUrl - YouTube嵌入URL
   */
  function playVideo(videoCard, embedUrl) {
    if (!videoCard || !embedUrl) return;
    
    const videoEmbed = videoCard.querySelector('.video-embed');
    if (!videoEmbed) return;
    
    // 移除播放按鈕並替換縮圖為iframe
    videoEmbed.innerHTML = `
      <iframe src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" loading="lazy"></iframe>
    `;
    
    // 移除縮圖類別，添加活躍類別
    videoEmbed.classList.remove('video-thumbnail');
    videoEmbed.classList.add('video-playing');
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
      if (currentSearchTerm || currentCategory !== 'all') {
        let resultText = '';
        
        if (currentSearchTerm) {
          resultText += `搜尋「${currentSearchTerm}」`;
        }
        
        if (currentCategory !== 'all') {
          if (resultText) resultText += '，';
          resultText += `分類「${getCategoryName(currentCategory)}」`;
        }
        
        searchResultsContainer.innerHTML = `
          <div class="search-results-info">
            ${resultText}的結果：找到 ${totalVideos} 部影片
          </div>
        `;
      }
      
      // 創建影片卡片
      videos.forEach(video => {
        const videoElement = createVideoCard(video);
        videoContainer.appendChild(videoElement);
      });
      
      // 添加動畫效果
      setTimeout(() => {
        addScrollAnimations();
      }, 100);
      
      // 綁定影片縮圖點擊事件
      bindVideoThumbnailEvents();
      
      // 渲染分頁控制
      renderPagination(totalPages);
    } else {
      // 如果沒有影片
      videoContainer.innerHTML = `
        <div class="no-results">
          <p>找不到符合條件的影片。</p>
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
            
            // 更新URL並重新渲染
            updateUrlParams();
            renderFilteredVideos();
          });
        }
      }, 0);
    }
  }
  
  /**
   * 獲取分類名稱的顯示文本
   */
  function getCategoryName(category) {
    const categoryMap = {
      'tax': '稅務相關',
      'accounting': '會計記帳',
      'business': '企業經營',
      'tutorial': '操作教學',
      'all': '全部影片'
    };
    
    return categoryMap[category] || category;
  }
  
  /**
   * 創建影片卡片
   */
  function createVideoCard(video) {
    if (!video) return null;
    
    // 確保必要的屬性存在
    const videoEmbedUrl = video.embedUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const videoTitle = video.title || '未命名影片';
    const videoDate = video.date || '未知日期';
    const videoDescription = video.description || '無影片描述';
    const videoTags = video.tags || [];
    const videoCategory = video.category || 'other';
    
    // 提取YouTube影片ID
    const videoId = extractYouTubeVideoId(videoEmbedUrl);
    
    // 生成縮圖URL
    const thumbnailUrl = generateYouTubeThumbnailUrl(videoId, 'maxres');
    
    // 創建卡片元素
    const cardElement = document.createElement('div');
    cardElement.className = 'video-card';
    cardElement.dataset.category = videoCategory;
    cardElement.dataset.videoId = videoId;
    
    // 創建標籤HTML
    let tagsHtml = '';
    if (videoTags.length > 0) {
      tagsHtml = '<div class="video-tags">';
      videoTags.forEach(tag => {
        tagsHtml += `<span class="video-tag" data-tag="${tag}">${tag}</span>`;
      });
      tagsHtml += '</div>';
    }
    
    // 卡片內容 - 使用縮圖代替直接嵌入iframe，點擊後載入影片
    cardElement.innerHTML = `
      <div class="video-embed video-thumbnail" data-embed-url="${videoEmbedUrl}">
        <img src="${thumbnailUrl}" alt="${videoTitle}" loading="lazy" class="video-thumbnail-img">
        <div class="video-play-button" aria-label="播放影片">
          <svg xmlns="http://www.w3.org/2000/svg" width="68" height="48" viewBox="0 0 68 48">
            <path d="M66.5,7.7c-0.8-2.9-3.1-5.2-6-6c-5.3-1.4-26.6-1.4-26.6-1.4s-21.3,0-26.6,1.4c-2.9,0.8-5.2,3.1-6,6 C0,13,0,24,0,24s0,11,1.3,16.3c0.8,2.9,3.1,5.2,6,6c5.3,1.4,26.6,1.4,26.6,1.4s21.3,0,26.6-1.4c2.9-0.8,5.2-3.1,6-6 C68,35,68,24,68,24S68,13,66.5,7.7z M27.2,33.6V14.4L44.8,24L27.2,33.6z" fill="#ff0000"/>
          </svg>
        </div>
      </div>
      <div class="video-content">
        <h2>${videoTitle}</h2>
        <span class="date">${formatDate(videoDate)}</span>
        <p>${videoDescription}</p>
        ${tagsHtml}
      </div>
    `;
    
    return cardElement;
  }
  
  /**
   * 綁定影片縮圖點擊事件
   */
  function bindVideoThumbnailEvents() {
    const videoThumbnails = document.querySelectorAll('.video-thumbnail');
    
    videoThumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', function(e) {
        e.preventDefault();
        
        const videoCard = this.closest('.video-card');
        const embedUrl = this.dataset.embedUrl;
        
        if (videoCard && embedUrl) {
          playVideo(videoCard, embedUrl);
        }
      });
    });
  }
  
  /**
   * 格式化日期顯示
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  }
  
  /**
   * 添加滾動動畫效果
   */
  function addScrollAnimations() {
    // 獲取所有影片卡片
    const videoCards = document.querySelectorAll('.video-card');
    
    // 檢查元素是否在視圖中
    function isElementInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
        rect.bottom >= 0
      );
    }
    
    // 處理卡片動畫
    function animateOnScroll() {
      videoCards.forEach(card => {
        if (isElementInViewport(card) && !card.classList.contains('animated')) {
          card.classList.add('animated');
        }
      });
    }
    
    // 初始執行
    animateOnScroll();
    
    // 滾動時執行
    window.addEventListener('scroll', animateOnScroll);
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
  
  // 防抖函數 - 用於搜索輸入優化
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
    
    // 添加搜索活躍狀態
    if (searchValue.length > 0) {
      searchContainer.classList.add('search-active');
    } else {
      searchContainer.classList.remove('search-active');
      // 空搜索時重置
      currentSearchTerm = '';
      updateUrlParams();
      renderFilteredVideos();
      return;
    }
    
    // 更新搜索條件
    currentSearchTerm = searchValue;
    currentPage = 1;
    
    // 更新URL並重新渲染
    updateUrlParams();
    renderFilteredVideos();
  }, 500); // 500ms防抖延遲
  
  // 綁定熱門影片事件
  function bindPopularVideoEvents() {
    const popularVideos = document.querySelectorAll('.popular-videos li a');
    
    popularVideos.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 獲取影片標題並進行搜索
        const videoTitle = this.getAttribute('data-title') || this.textContent;
        searchInput.value = videoTitle;
        
        // 觸發搜索
        handleSearchInput();
      });
    });
  }
  
  // 初始化事件監聽
  function initEventListeners() {
    // 綁定搜索輸入事件
    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
      
      // 搜索框回車事件
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearchInput();
        }
      });
    }
    
    // 搜索按鈕點擊事件
    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearchInput);
    }
    
    // 分類過濾按鈕事件
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        // 移除所有按鈕的active狀態
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // 設置當前按鈕為active
        this.classList.add('active');
        
        // 設置當前分類
        currentCategory = this.dataset.category;
        currentPage = 1;
        
        // 更新URL並重新渲染
        updateUrlParams();
        renderFilteredVideos();
      });
      
      // 為按鈕添加波紋效果
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
    
    // 側邊欄分類統計點擊事件
    categoryStats.forEach(stat => {
      stat.addEventListener('click', function() {
        const category = this.dataset.category;
        
        // 更新分類按鈕狀態
        filterButtons.forEach(btn => {
          if (btn.dataset.category === category) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        
        // 更新當前分類並重設頁碼
        currentCategory = category;
        currentPage = 1;
        
        // 更新URL並重新渲染
        updateUrlParams();
        renderFilteredVideos();
        
        // 滾動到內容區域
        window.scrollTo({
          top: document.querySelector('.blog-content-section').offsetTop - 100,
          behavior: 'smooth'
        });
      });
    });
    
    // 添加標籤動態點擊處理
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('video-tag')) {
        const tag = e.target.textContent;
        searchInput.value = tag;
        handleSearchInput();
      }
    });
  }
  
  // 監聽瀏覽器前進/後退按鈕
  window.addEventListener('popstate', function() {
    getUrlParams();
    renderFilteredVideos();
  });
  
  // 初始化加載
  loadVideos().then(() => {
    // 初始化事件監聽
    initEventListeners();
  });
});