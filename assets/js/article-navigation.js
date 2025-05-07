/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-08
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 增強版: 改用文章內容特徵匹配而非URL匹配
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
  
  // 步驟1: 從DOM中獲取文章信息
  const articleInfo = getArticleInfoFromDOM();
  console.log('從頁面獲取的文章信息:', articleInfo);
  
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
      findArticleInData(data, articleInfo);
    })
    .catch(error => {
      console.error('加載文章數據時出錯:', error);
      setDefaultState();
    });
  
  /**
   * 從頁面DOM中獲取文章信息
   */
  function getArticleInfoFromDOM() {
    const result = {
      title: null,
      date: null,
      isSeries: false,
      seriesName: null,
      episode: null,
      category: null,
      tags: []
    };
    
    // 獲取標題
    const titleElement = document.querySelector('h1.article-title');
    if (titleElement) {
      result.title = titleElement.textContent.trim();
      console.log(`找到文章標題: "${result.title}"`);
    }
    
    // 獲取日期
    const dateElement = document.querySelector('.article-date');
    if (dateElement) {
      const dateMatch = dateElement.textContent.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        result.date = dateMatch[0];
        console.log(`找到文章日期: ${result.date}`);
      }
    }
    
    // 從URL提取日期（作為備用）
    if (!result.date) {
      const urlDateMatch = window.location.pathname.match(/\/blog\/(\d{4}-\d{2}-\d{2})/);
      if (urlDateMatch) {
        result.date = urlDateMatch[1];
        console.log(`從URL提取日期: ${result.date}`);
      }
    }
    
    // 獲取分類（如果有）
    const categoryElement = document.querySelector('.article-category, .tag-links a[href*="category"]');
    if (categoryElement) {
      result.category = categoryElement.textContent.trim();
      console.log(`找到文章分類: ${result.category}`);
    }
    
    // 獲取標籤（如果有）
    const tagElements = document.querySelectorAll('.article-tags a, .tag-links a:not([href*="category"])');
    if (tagElements.length > 0) {
      tagElements.forEach(tag => {
        result.tags.push(tag.textContent.trim());
      });
      console.log(`找到文章標籤: ${result.tags.join(', ')}`);
    }
    
    // 從meta標籤獲取系列信息
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      console.log(`從meta標籤找到系列信息: ${result.seriesName} EP${result.episode}`);
      return result;
    }
    
    // 從結構化數據中獲取系列信息
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
    
    // 從標題或URL嘗試提取系列信息
    const titleSeriesMatch = result.title ? result.title.match(/(.+)[：\s]EP(\d+)/i) : null;
    const urlSeriesMatch = window.location.pathname.match(/-(ep\d+)($|[.-])/i);
    
    if (titleSeriesMatch) {
      result.isSeries = true;
      result.seriesName = titleSeriesMatch[1].trim();
      result.episode = parseInt(titleSeriesMatch[2]);
      console.log(`從標題提取系列信息: ${result.seriesName} EP${result.episode}`);
    } else if (urlSeriesMatch) {
      result.isSeries = true;
      result.episode = parseInt(urlSeriesMatch[1].replace(/[^\d]/g, ''));
      
      // 嘗試從標題推斷系列名稱
      if (result.title) {
        // 移除EP部分和可能的分隔符
        const seriesNameCandidate = result.title.replace(/EP\d+[：\s]*/, '').trim();
        const keywordIndex = seriesNameCandidate.indexOf('解析');
        if (keywordIndex > 0) {
          result.seriesName = seriesNameCandidate.substring(0, keywordIndex + 2);
        } else {
          // 如果找不到特定關鍵字，使用標題前三個字作為系列名稱猜測
          result.seriesName = seriesNameCandidate.substring(0, Math.min(6, seriesNameCandidate.length));
        }
        console.log(`從URL和標題推斷系列信息: ${result.seriesName} EP${result.episode}`);
      }
    }
    
    return result;
  }
  
  /**
   * 在數據中查找當前文章並處理導航
   */
  function findArticleInData(data, articleInfo) {
    const allPosts = data.posts || [];
    if (allPosts.length === 0) {
      console.error('文章數據為空');
      setDefaultState();
      return;
    }
    
    // 查找最匹配的文章
    let currentPost = null;
    let currentIndex = -1;
    let matchScore = 0;
    
    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      let score = 0;
      
      // 計算匹配分數
      if (articleInfo.title && post.title && post.title.includes(articleInfo.title)) {
        score += 5; // 標題包含(不要求完全匹配)
      }
      
      if (articleInfo.date && post.date === articleInfo.date) {
        score += 3; // 日期匹配
      }
      
      if (articleInfo.isSeries && post.is_series) {
        score += 1; // 都是系列文章
        
        if (articleInfo.seriesName && post.series_name && 
            (post.series_name.includes(articleInfo.seriesName) || 
             articleInfo.seriesName.includes(post.series_name))) {
          score += 3; // 系列名稱相似
          
          if (articleInfo.episode && post.episode && 
              articleInfo.episode === post.episode) {
            score += 5; // 集數匹配
          }
        }
      }
      
      // 如果發現更匹配的文章
      if (score > matchScore) {
        matchScore = score;
        currentPost = post;
        currentIndex = i;
      }
    }
    
    if (currentPost) {
      console.log(`找到最匹配的文章: "${currentPost.title}" (匹配分數: ${matchScore})`);
      
      // 處理導航
      if (articleInfo.isSeries && currentPost.is_series) {
        handleSeriesNavigation(data, articleInfo, currentPost);
      } else {
        handleNormalNavigation(allPosts, currentIndex);
      }
    } else {
      console.error('無法找到匹配的文章');
      setDefaultState();
    }
  }
  
  /**
   * 處理系列文章導航
   */
  function handleSeriesNavigation(data, articleInfo, currentPost) {
    const seriesName = currentPost.series_name;
    const currentEpisode = currentPost.episode;
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    console.log(`處理系列文章 "${seriesName}" EP${currentEpisode} 的導航`);
    
    // 嘗試從series數據中獲取系列文章
    let seriesPosts = [];
    
    if (data.series && data.series[seriesName] && Array.isArray(data.series[seriesName].posts)) {
      seriesPosts = data.series[seriesName].posts;
      console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
    } else {
      // 從所有文章中過濾
      seriesPosts = data.posts.filter(post => 
        post.is_series && 
        post.series_name === seriesName
      );
      console.log(`從所有文章中過濾出 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
    }
    
    if (seriesPosts.length === 0) {
      console.error(`找不到系列 "${seriesName}" 的文章，嘗試使用一般導航`);
      const allPosts = data.posts || [];
      const currentIndex = allPosts.findIndex(post => post.title === currentPost.title && post.date === currentPost.date);
      if (currentIndex !== -1) {
        handleNormalNavigation(allPosts, currentIndex);
      } else {
        setDefaultState();
      }
      return;
    }
    
    // 按集數排序
    seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
    console.log('系列文章順序:', seriesPosts.map(p => `EP${p.episode}`).join(', '));
    
    // 查找前一集和後一集
    prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
    nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
    
    // 處理找不到前一集或後一集的情況
    if (!prevPost && currentEpisode > 1) {
      // 嘗試模糊匹配前一集
      seriesPosts.sort((a, b) => Math.abs(parseInt(a.episode) - (currentEpisode - 1)) - 
                               Math.abs(parseInt(b.episode) - (currentEpisode - 1)));
      if (seriesPosts[0] && parseInt(seriesPosts[0].episode) < currentEpisode) {
        prevPost = seriesPosts[0];
        console.log(`未找到EP${currentEpisode-1}，改用EP${prevPost.episode}作為上一篇`);
      }
    }
    
    if (!nextPost && currentEpisode < Math.max(...seriesPosts.map(p => parseInt(p.episode)))) {
      // 嘗試模糊匹配後一集
      seriesPosts.sort((a, b) => Math.abs(parseInt(a.episode) - (currentEpisode + 1)) - 
                               Math.abs(parseInt(b.episode) - (currentEpisode + 1)));
      if (seriesPosts[0] && parseInt(seriesPosts[0].episode) > currentEpisode) {
        nextPost = seriesPosts[0];
        console.log(`未找到EP${currentEpisode+1}，改用EP${nextPost.episode}作為下一篇`);
      }
    }
    
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
    
    // 按日期排序所有文章
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 嘗試在排序後的文章中找到當前文章
    const currentPost = posts[currentIndex];
    let sortedIndex = -1;
    
    for (let i = 0; i < sortedPosts.length; i++) {
      if (sortedPosts[i].title === currentPost.title && 
          sortedPosts[i].date === currentPost.date) {
        sortedIndex = i;
        break;
      }
    }
    
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
      
      // 使用原始索引
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