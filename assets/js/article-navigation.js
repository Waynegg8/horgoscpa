/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-08
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 修復版: 處理URL中的井號(#)並忽略.html後綴
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
  
  // 步驟1: 從DOM中獲取系列信息和當前URL
  const seriesInfo = getSeriesInfoFromDOM();
  const currentUrl = cleanUrl(window.location.href);
  
  console.log('從頁面獲取的系列信息:', seriesInfo);
  console.log('清理後的當前URL:', currentUrl);
  
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
      processNavigation(data, seriesInfo, currentUrl);
    })
    .catch(error => {
      console.error('加載文章數據時出錯:', error);
      setDefaultState();
    });
  
  /**
   * 清理URL，移除網域、參數、錨點和html後綴
   */
  function cleanUrl(url) {
    // 創建URL對象
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      // 如果不是完整URL，假設是相對路徑
      return url.split('#')[0].split('?')[0].replace(/\.html$/, '');
    }
    
    // 只保留路徑部分，移除域名、查詢參數和錨點
    let path = urlObj.pathname;
    
    // 移除.html後綴
    path = path.replace(/\.html$/, '');
    
    console.log(`清理URL: ${url} -> ${path}`);
    return path;
  }
  
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
    
    // 從URL嘗試提取EP集數
    const urlPath = window.location.pathname;
    const epMatch = urlPath.match(/[Ee][Pp](\d+)/i);
    if (epMatch) {
      result.isSeries = true;
      result.episode = parseInt(epMatch[1]);
      console.log(`從URL提取EP集數: EP${result.episode}`);
      
      // 嘗試從URL提取系列名稱
      const urlParts = urlPath.split('-');
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i].toLowerCase().includes('analysis') || 
            urlParts[i].toLowerCase().includes('解析')) {
          // 找到可能是系列名稱的部分
          const possibleSeriesParts = urlParts.slice(Math.max(0, i-2), i+1);
          result.seriesName = possibleSeriesParts.join('-');
          console.log(`從URL推斷系列名稱: ${result.seriesName}`);
          break;
        }
      }
    }
    
    return result;
  }
  
  /**
   * 處理導航邏輯
   */
  function processNavigation(data, seriesInfo, currentUrl) {
    const allPosts = data.posts || [];
    if (allPosts.length === 0) {
      console.error('文章數據為空');
      setDefaultState();
      return;
    }
    
    // 根據URL查找當前文章
    let currentPost = findPostByUrl(allPosts, currentUrl);
    
    // 如果找不到，嘗試使用系列信息查找
    if (!currentPost && seriesInfo.isSeries) {
      currentPost = findPostBySeriesInfo(allPosts, seriesInfo);
    }
    
    // 如果找不到，嘗試使用標題和日期查找
    if (!currentPost && seriesInfo.title && seriesInfo.date) {
      currentPost = findPostByTitleAndDate(allPosts, seriesInfo);
    }
    
    if (currentPost) {
      console.log(`找到當前文章: ${currentPost.title}`);
      
      // 根據是否為系列文章選擇不同的處理方式
      if (currentPost.is_series) {
        handleSeriesNavigation(data, currentPost);
      } else {
        const currentIndex = allPosts.findIndex(post => post === currentPost);
        handleNormalNavigation(allPosts, currentIndex);
      }
    } else {
      console.error('無法找到匹配的文章');
      setDefaultState();
    }
  }
  
  /**
   * 根據URL查找文章
   */
  function findPostByUrl(posts, currentUrl) {
    // 嘗試直接匹配清理後的URL
    for (const post of posts) {
      const postUrl = cleanUrl(post.url);
      
      if (postUrl === currentUrl) {
        console.log(`通過URL精確匹配找到文章: ${post.title}`);
        return post;
      }
    }
    
    // 嘗試URL部分匹配
    const urlParts = currentUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    
    if (lastPart) {
      for (const post of posts) {
        const postUrlParts = cleanUrl(post.url).split('/');
        const postLastPart = postUrlParts[postUrlParts.length - 1];
        
        if (postLastPart === lastPart) {
          console.log(`通過URL最後部分匹配找到文章: ${post.title}`);
          return post;
        }
        
        // 嘗試移除數字後的匹配（針對EP數字可能不同的情況）
        const lastPartWithoutEp = lastPart.replace(/-ep\d+$/i, '');
        const postLastPartWithoutEp = postLastPart.replace(/-ep\d+$/i, '');
        
        if (lastPartWithoutEp === postLastPartWithoutEp) {
          console.log(`通過URL最後部分（忽略EP）匹配找到文章: ${post.title}`);
          return post;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 根據系列信息查找文章
   */
  function findPostBySeriesInfo(posts, seriesInfo) {
    if (!seriesInfo.isSeries || !seriesInfo.episode) return null;
    
    // 嘗試精確匹配系列名稱和集數
    if (seriesInfo.seriesName) {
      const exactMatch = posts.find(post => 
        post.is_series && 
        post.series_name === seriesInfo.seriesName && 
        post.episode === seriesInfo.episode
      );
      
      if (exactMatch) {
        console.log(`通過系列名稱和集數精確匹配找到文章: ${exactMatch.title}`);
        return exactMatch;
      }
      
      // 嘗試模糊匹配系列名稱
      const fuzzyMatch = posts.find(post => 
        post.is_series && 
        (post.series_name.includes(seriesInfo.seriesName) || 
         seriesInfo.seriesName.includes(post.series_name)) && 
        post.episode === seriesInfo.episode
      );
      
      if (fuzzyMatch) {
        console.log(`通過系列名稱模糊匹配和集數精確匹配找到文章: ${fuzzyMatch.title}`);
        return fuzzyMatch;
      }
    }
    
    // 只用集數匹配
    const episodeMatches = posts.filter(post => 
      post.is_series && post.episode === seriesInfo.episode
    );
    
    if (episodeMatches.length === 1) {
      console.log(`通過集數匹配找到唯一文章: ${episodeMatches[0].title}`);
      return episodeMatches[0];
    } else if (episodeMatches.length > 1) {
      // 如果有多個結果，優先選擇日期最接近的
      if (seriesInfo.date) {
        episodeMatches.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          const targetDate = new Date(seriesInfo.date);
          return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
        });
        
        console.log(`通過集數匹配和日期接近度找到文章: ${episodeMatches[0].title}`);
        return episodeMatches[0];
      }
      
      // 如果沒有日期，選第一個結果
      console.log(`通過集數匹配找到多篇文章，選擇第一篇: ${episodeMatches[0].title}`);
      return episodeMatches[0];
    }
    
    return null;
  }
  
  /**
   * 根據標題和日期查找文章
   */
  function findPostByTitleAndDate(posts, seriesInfo) {
    if (!seriesInfo.title || !seriesInfo.date) return null;
    
    // 精確匹配標題和日期
    const exactMatch = posts.find(post => 
      post.title === seriesInfo.title && 
      post.date === seriesInfo.date
    );
    
    if (exactMatch) {
      console.log(`通過標題和日期精確匹配找到文章: ${exactMatch.title}`);
      return exactMatch;
    }
    
    // 嘗試只用日期匹配
    const dateMatches = posts.filter(post => post.date === seriesInfo.date);
    
    if (dateMatches.length === 1) {
      console.log(`通過日期匹配找到唯一文章: ${dateMatches[0].title}`);
      return dateMatches[0];
    } else if (dateMatches.length > 1) {
      // 如果有多個結果，嘗試部分標題匹配
      for (const post of dateMatches) {
        if (post.title.includes(seriesInfo.title) || seriesInfo.title.includes(post.title)) {
          console.log(`通過日期匹配和標題模糊匹配找到文章: ${post.title}`);
          return post;
        }
      }
      
      // 如果沒有部分標題匹配，返回第一個結果
      console.log(`通過日期匹配找到多篇文章，選擇第一篇: ${dateMatches[0].title}`);
      return dateMatches[0];
    }
    
    return null;
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
    
    // 嘗試從series對象中獲取系列文章
    if (data.series && data.series[seriesName] && Array.isArray(data.series[seriesName].posts)) {
      seriesPosts = data.series[seriesName].posts;
      console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
    } 
    // 從所有文章中過濾
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
    
    // 查找前一集和後一集
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
      prevLink.href = cleanUrl(prevPost.url);
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
      nextLink.href = cleanUrl(nextPost.url);
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