/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-08
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 極簡版: 直接匹配系列名稱和集數
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
      console.log('成功加載文章數據:', data.posts ? data.posts.length : 0, '篇文章');
      processNavigation(data, seriesInfo);
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
    
    // 從URL提取日期（作為備用）
    if (!result.date) {
      const urlDateMatch = window.location.pathname.match(/\/blog\/(\d{4}-\d{2}-\d{2})/);
      if (urlDateMatch) {
        result.date = urlDateMatch[1];
      }
    }
    
    // 從meta標籤獲取系列信息（最優先）
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      console.log(`從meta標籤找到系列信息: ${result.seriesName} EP${result.episode}`);
      return result;
    }
    
    // 從結構化數據中獲取系列信息（次優先）
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
   * 處理導航邏輯
   */
  function processNavigation(data, seriesInfo) {
    const allPosts = data.posts || [];
    if (allPosts.length === 0) {
      console.error('文章數據為空');
      setDefaultState();
      return;
    }
    
    let currentPost = null;
    
    // 如果是系列文章，直接根據系列名稱和集數匹配
    if (seriesInfo.isSeries && seriesInfo.seriesName && seriesInfo.episode) {
      currentPost = allPosts.find(post => 
        post.is_series && 
        post.series_name === seriesInfo.seriesName && 
        post.episode === seriesInfo.episode
      );
      
      if (currentPost) {
        console.log(`找到系列文章: ${currentPost.title}`);
        handleSeriesNavigation(data, currentPost);
        return;
      }
    }
    
    // 如果不是系列文章或找不到精確匹配，嘗試用標題和日期匹配
    if (seriesInfo.title && seriesInfo.date) {
      currentPost = allPosts.find(post => 
        post.title === seriesInfo.title && 
        post.date === seriesInfo.date
      );
      
      if (currentPost) {
        console.log(`找到普通文章: ${currentPost.title}`);
        
        // 如果找到的是系列文章，使用系列導航邏輯
        if (currentPost.is_series) {
          handleSeriesNavigation(data, currentPost);
        } else {
          // 否則使用普通導航邏輯
          const currentIndex = allPosts.findIndex(post => post === currentPost);
          handleNormalNavigation(allPosts, currentIndex);
        }
        return;
      }
    }
    
    // 如果仍然找不到，根據日期嘗試匹配最接近的文章
    if (seriesInfo.date) {
      const dateMatchingPosts = allPosts.filter(post => post.date === seriesInfo.date);
      if (dateMatchingPosts.length > 0) {
        currentPost = dateMatchingPosts[0];
        console.log(`通過日期找到文章: ${currentPost.title}`);
        
        if (currentPost.is_series) {
          handleSeriesNavigation(data, currentPost);
        } else {
          const currentIndex = allPosts.findIndex(post => post === currentPost);
          handleNormalNavigation(allPosts, currentIndex);
        }
        return;
      }
    }
    
    console.error('無法找到匹配的文章');
    setDefaultState();
  }
  
  /**
   * 處理系列文章導航
   */
  function handleSeriesNavigation(data, currentPost) {
    const seriesName = currentPost.series_name;
    const currentEpisode = currentPost.episode;
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    console.log(`處理系列文章 "${seriesName}" EP${currentEpisode} 的導航`);
    
    // 獲取系列所有文章
    let seriesPosts = [];
    
    // 嘗試從series對象中獲取系列文章（新格式）
    if (data.series && data.series[seriesName] && Array.isArray(data.series[seriesName].posts)) {
      seriesPosts = data.series[seriesName].posts;
      console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
    } 
    // 從所有文章中過濾（舊格式）
    else {
      seriesPosts = data.posts.filter(post => 
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
    
    // 查找前一集和後一集（直接根據集數匹配）
    prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
    nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
    
    if (prevPost) {
      console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
    } else {
      console.log(`沒有上一集 (EP${currentEpisode-1})`);
      
      // 如果是系列第一集，找非系列文章作為上一篇
      if (seriesPosts[0] && parseInt(seriesPosts[0].episode) === currentEpisode) {
        const otherPosts = data.posts.filter(post => 
          !post.is_series || 
          post.series_name !== seriesName
        );
        
        if (otherPosts.length > 0) {
          otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
          prevPost = otherPosts[0];
          prevMessage = '離開此系列，前往其他主題';
          console.log(`系列第一集，找到非系列文章作為上一篇: ${prevPost.title}`);
        }
      }
    }
    
    if (nextPost) {
      console.log(`找到下一集 EP${nextPost.episode}: ${nextPost.title}`);
    } else {
      console.log(`沒有下一集 (EP${currentEpisode+1})`);
      
      // 如果是系列最後一集，找非系列文章作為下一篇
      const maxEpisode = Math.max(...seriesPosts.map(p => parseInt(p.episode)));
      if (currentEpisode === maxEpisode) {
        const otherPosts = data.posts.filter(post => 
          !post.is_series || 
          post.series_name !== seriesName
        );
        
        if (otherPosts.length > 0) {
          otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
          nextPost = otherPosts[0];
          nextMessage = '系列已結束，前往其他主題';
          console.log(`系列最後一集，找到非系列文章作為下一篇: ${nextPost.title}`);
        }
      }
    }
    
    // 更新導航按鈕
    updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
  }
  
  /**
   * 處理普通文章導航
   */
  function handleNormalNavigation(posts, currentIndex) {
    let prevPost = null;
    let nextPost = null;
    
    console.log(`處理普通文章導航 (索引: ${currentIndex})`);
    
    if (currentIndex === -1) {
      console.error('找不到當前文章的索引');
      setDefaultState();
      return;
    }
    
    // 按日期排序所有文章
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 在排序後的文章中找到當前文章
    const currentPost = posts[currentIndex];
    let sortedIndex = sortedPosts.findIndex(post => 
      post.title === currentPost.title && post.date === currentPost.date
    );
    
    if (sortedIndex !== -1) {
      console.log(`在排序後的文章中找到當前文章 (索引: ${sortedIndex})`);
      
      // 獲取相鄰文章
      if (sortedIndex > 0) {
        prevPost = sortedPosts[sortedIndex - 1];
        console.log(`找到上一篇: ${prevPost.title}`);
      }
      
      if (sortedIndex < sortedPosts.length - 1) {
        nextPost = sortedPosts[sortedIndex + 1];
        console.log(`找到下一篇: ${nextPost.title}`);
      }
    } else {
      console.log('在排序後的文章中未找到當前文章，使用原始索引');
      
      // 如果在排序後的文章中找不到，使用原始順序
      if (currentIndex > 0) {
        prevPost = posts[currentIndex - 1];
        console.log(`找到上一篇: ${prevPost.title}`);
      }
      
      if (currentIndex < posts.length - 1) {
        nextPost = posts[currentIndex + 1];
        console.log(`找到下一篇: ${nextPost.title}`);
      }
    }
    
    // 更新導航按鈕
    updateNavigation(prevPost, nextPost);
  }
  
  /**
   * 更新導航按鈕
   * 注意：在設置URL時，移除.html後綴
   */
  function updateNavigation(prevPost, nextPost, prevMessage = '', nextMessage = '') {
    // 更新上一篇
    if (prevPost && prevPost.url) {
      // 去掉.html後綴
      prevLink.href = prevPost.url.replace(/\.html$/, '');
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
      // 去掉.html後綴
      nextLink.href = nextPost.url.replace(/\.html$/, '');
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