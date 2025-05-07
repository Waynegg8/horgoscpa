/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-07
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 簡化版：直接從DOM元素取得系列信息
 */
document.addEventListener('DOMContentLoaded', function() {
  // 獲取導航按鈕
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 設置初始狀態
  setLoadingState();
  
  // 步驟1: 從DOM中獲取系列信息
  const seriesInfo = getSeriesInfoFromDOM();
  console.log('從頁面獲取的系列信息:', seriesInfo);
  
  // 步驟2: 從JSON中獲取所有文章數據
  fetch('/assets/data/blog-posts.json?nocache=' + Date.now())
    .then(response => {
      if (!response.ok) {
        throw new Error('無法獲取文章數據');
      }
      return response.json();
    })
    .then(data => {
      console.log('成功加載文章數據:', data.posts.length, '篇文章');
      findAdjacentArticles(data, seriesInfo);
    })
    .catch(error => {
      console.error('加載文章數據時出錯:', error);
      setDefaultState();
    });
  
  /**
   * 從頁面DOM中獲取系列信息
   */
  function getSeriesInfoFromDOM() {
    const result = {
      isSeries: false,
      seriesName: null,
      episode: null,
      date: null,
      title: null
    };
    
    // 獲取標題和日期（用於非系列文章導航）
    const titleElement = document.querySelector('h1.article-title');
    if (titleElement) {
      result.title = titleElement.textContent.trim();
    }
    
    const dateElement = document.querySelector('.article-date');
    if (dateElement) {
      const dateMatch = dateElement.textContent.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        result.date = dateMatch[0];
      }
    }
    
    // 從meta標籤獲取系列信息
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      console.log(`找到系列信息: ${result.seriesName} EP${result.episode}`);
      return result;
    }
    
    // 如果沒有meta標籤，嘗試從結構化數據中獲取
    const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptTags) {
      try {
        const jsonData = JSON.parse(script.textContent);
        if (jsonData.isPartOf) {
          result.isSeries = true;
          result.seriesName = jsonData.isPartOf.name;
          result.episode = parseInt(jsonData.isPartOf.position);
          console.log(`從結構化數據找到系列信息: ${result.seriesName} EP${result.episode}`);
          return result;
        }
      } catch (error) {
        // 忽略解析錯誤
      }
    }
    
    return result;
  }
  
  /**
   * 查找相鄰文章
   */
  function findAdjacentArticles(data, seriesInfo) {
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    const allPosts = data.posts || [];
    
    if (seriesInfo.isSeries) {
      // 系列文章: 根據系列名稱和集數查找前後文章
      handleSeriesArticles(allPosts, data.series, seriesInfo);
    } else {
      // 非系列文章: 根據日期查找前後文章
      handleNonSeriesArticles(allPosts, seriesInfo);
    }
    
    /**
     * 處理系列文章導航
     */
    function handleSeriesArticles(posts, seriesData, info) {
      const seriesName = info.seriesName;
      const currentEpisode = info.episode;
      
      if (!seriesName || !currentEpisode) {
        console.error('系列信息不完整，無法處理導航');
        setDefaultState();
        return;
      }
      
      console.log(`處理系列文章 "${seriesName}" EP${currentEpisode} 的導航`);
      
      // 嘗試從series數據中獲取系列文章
      let seriesPosts = [];
      
      if (seriesData && seriesData[seriesName] && Array.isArray(seriesData[seriesName].posts)) {
        seriesPosts = seriesData[seriesName].posts;
        console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
      } else {
        // 從所有文章中過濾
        seriesPosts = posts.filter(post => 
          post.is_series && 
          post.series_name === seriesName
        );
        console.log(`從所有文章中過濾出 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
      }
      
      if (seriesPosts.length === 0) {
        console.error(`找不到系列 "${seriesName}" 的文章`);
        setDefaultState();
        return;
      }
      
      // 按集數排序
      seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
      console.log('系列文章順序:', seriesPosts.map(p => `EP${p.episode}`).join(', '));
      
      // 直接根據集數查找前一集和後一集，跳過查找當前文章的步驟
      prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
      nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
      
      if (prevPost) {
        console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
        // 處理URL，去掉.html後綴
        prevPost.url = prevPost.url.replace(/\.html$/, '');
      } else {
        console.log(`沒有上一集 (EP${currentEpisode-1})`);
        
        // 如果是系列第一集，找非系列文章作為上一篇
        if (seriesPosts.length > 0 && parseInt(seriesPosts[0].episode) === currentEpisode) {
          const otherPosts = posts.filter(post => 
            !post.is_series || 
            post.series_name !== seriesName
          );
          
          if (otherPosts.length > 0) {
            otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            prevPost = otherPosts[0];
            // 處理URL，去掉.html後綴
            prevPost.url = prevPost.url.replace(/\.html$/, '');
            prevMessage = '離開此系列，前往其他主題';
            console.log(`系列第一集，找到非系列文章作為上一篇: ${prevPost.title}`);
          }
        }
      }
      
      if (nextPost) {
        console.log(`找到下一集 EP${nextPost.episode}: ${nextPost.title}`);
        // 處理URL，去掉.html後綴
        nextPost.url = nextPost.url.replace(/\.html$/, '');
      } else {
        console.log(`沒有下一集 (EP${currentEpisode+1})`);
        
        // 如果是系列最後一集，找非系列文章作為下一篇
        if (seriesPosts.length > 0 && 
            parseInt(seriesPosts[seriesPosts.length-1].episode) === currentEpisode) {
          const otherPosts = posts.filter(post => 
            !post.is_series || 
            post.series_name !== seriesName
          );
          
          if (otherPosts.length > 0) {
            otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            nextPost = otherPosts[0];
            // 處理URL，去掉.html後綴
            nextPost.url = nextPost.url.replace(/\.html$/, '');
            nextMessage = '系列已結束，前往其他主題';
            console.log(`系列最後一集，找到非系列文章作為下一篇: ${nextPost.title}`);
          }
        }
      }
      
      // 更新導航按鈕
      updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
    }
    
    /**
     * 處理非系列文章導航
     */
    function handleNonSeriesArticles(posts, info) {
      if (!info.date) {
        console.error('找不到文章日期，無法處理非系列文章導航');
        setDefaultState();
        return;
      }
      
      console.log(`處理非系列文章的導航 (日期: ${info.date})`);
      
      // 按日期排序所有文章
      const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 嘗試根據日期和標題找到當前文章
      let currentIndex = -1;
      
      if (info.title) {
        currentIndex = sortedPosts.findIndex(post => 
          post.date === info.date && 
          post.title === info.title
        );
      }
      
      // 如果找不到精確匹配，僅使用日期
      if (currentIndex === -1) {
        currentIndex = sortedPosts.findIndex(post => post.date === info.date);
      }
      
      if (currentIndex !== -1) {
        console.log(`找到當前文章索引: ${currentIndex} (共 ${sortedPosts.length} 篇)`);
        
        // 獲取相鄰文章
        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
          // 處理URL，去掉.html後綴
          prevPost.url = prevPost.url.replace(/\.html$/, '');
          console.log(`找到上一篇: ${prevPost.title}`);
        }
        
        if (currentIndex < sortedPosts.length - 1) {
          nextPost = sortedPosts[currentIndex + 1];
          // 處理URL，去掉.html後綴
          nextPost.url = nextPost.url.replace(/\.html$/, '');
          console.log(`找到下一篇: ${nextPost.title}`);
        }
      } else {
        // 如果仍然找不到，使用日期比較
        console.log('無法找到當前文章的精確位置，使用日期比較');
        
        const currentDate = new Date(info.date);
        
        // 找出日期比當前文章早的所有文章
        const earlierPosts = sortedPosts.filter(post => 
          new Date(post.date) < currentDate
        );
        
        // 找出日期比當前文章晚的所有文章
        const laterPosts = sortedPosts.filter(post => 
          new Date(post.date) > currentDate
        );
        
        if (earlierPosts.length > 0) {
          earlierPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
          nextPost = earlierPosts[0]; // 日期較近的文章作為下一篇
          // 處理URL，去掉.html後綴
          nextPost.url = nextPost.url.replace(/\.html$/, '');
          console.log(`根據日期比較找到下一篇: ${nextPost.title}`);
        }
        
        if (laterPosts.length > 0) {
          laterPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
          prevPost = laterPosts[0]; // 日期較近的文章作為上一篇
          // 處理URL，去掉.html後綴
          prevPost.url = prevPost.url.replace(/\.html$/, '');
          console.log(`根據日期比較找到上一篇: ${prevPost.title}`);
        }
      }
      
      // 更新導航按鈕
      updateNavigation(prevPost, nextPost);
    }
  }
  
  /**
   * 更新導航按鈕
   */
  function updateNavigation(prevPost, nextPost, prevMessage = '', nextMessage = '') {
    // 更新上一篇
    if (prevPost && prevPost.url) {
      prevLink.href = prevPost.url;
      prevLink.classList.remove('disabled');
      
      const titleEl = prevLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = prevPost.title;
      }
      
      if (prevMessage) {
        const msgEl = prevLink.querySelector('.nav-message');
        if (msgEl) {
          msgEl.textContent = prevMessage;
          prevLink.classList.add('nav-warning');
        }
      }
    } else {
      prevLink.removeAttribute('href');
      prevLink.classList.add('disabled');
      
      const titleEl = prevLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = '無上一篇';
      }
    }
    
    // 更新下一篇
    if (nextPost && nextPost.url) {
      nextLink.href = nextPost.url;
      nextLink.classList.remove('disabled');
      
      const titleEl = nextLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = nextPost.title;
      }
      
      if (nextMessage) {
        const msgEl = nextLink.querySelector('.nav-message');
        if (msgEl) {
          msgEl.textContent = nextMessage;
          nextLink.classList.add('nav-warning');
        }
      }
    } else {
      nextLink.removeAttribute('href');
      nextLink.classList.add('disabled');
      
      const titleEl = nextLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = '無下一篇';
      }
    }
  }
  
  /**
   * 設置載入中狀態
   */
  function setLoadingState() {
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (prevTitle) prevTitle.textContent = '載入中...';
    if (nextTitle) nextTitle.textContent = '載入中...';
  }
  
  /**
   * 設置默認狀態（無法找到相鄰文章）
   */
  function setDefaultState() {
    prevLink.removeAttribute('href');
    prevLink.classList.add('disabled');
    
    nextLink.removeAttribute('href');
    nextLink.classList.add('disabled');
    
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (prevTitle) prevTitle.textContent = '無上一篇';
    if (nextTitle) nextTitle.textContent = '無下一篇';
  }
});