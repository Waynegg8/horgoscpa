/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-09
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 直接導航版: 跳過當前文章匹配，直接查找相鄰文章
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
  
  // 從DOM中獲取系列信息
  const articleInfo = getArticleInfoFromDOM();
  console.log('從頁面獲取的文章信息:', articleInfo);
  
  // 使用延遲確保DOM完全加載
  setTimeout(() => {
    // 獲取文章數據
    fetch('/assets/data/blog-posts.json?v=' + new Date().getTime())
      .then(response => {
        if (!response.ok) {
          throw new Error('無法獲取文章數據');
        }
        return response.json();
      })
      .then(data => {
        if (!data || !data.posts || data.posts.length === 0) {
          throw new Error('文章數據為空');
        }
        
        console.log('成功加載文章數據:', data.posts.length, '篇文章');
        
        // 直接查找相鄰文章，無需匹配當前文章
        findAdjacentArticles(data, articleInfo);
      })
      .catch(error => {
        console.error('加載或處理文章數據時出錯:', error);
        setDefaultState();
      });
  }, 300);  // 300ms延遲確保DOM完全加載
  
  /**
   * 從頁面DOM中獲取文章信息
   */
  function getArticleInfoFromDOM() {
    const result = {
      isSeries: false,
      seriesName: null,
      episode: null,
      date: null,
      title: null
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
    
    // 優先從meta標籤獲取系列信息
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      console.log(`從meta標籤找到系列信息: ${result.seriesName} EP${result.episode}`);
      return result;
    }
    
    // 如果沒有meta標籤，嘗試從結構化數據獲取
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
        console.warn('解析JSON結構化數據時出錯:', error);
      }
    }
    
    return result;
  }
  
  /**
   * 直接查找相鄰文章，無需匹配當前文章
   */
  function findAdjacentArticles(data, articleInfo) {
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    // 系列文章：直接根據系列名稱和集數查找相鄰文章
    if (articleInfo.isSeries && articleInfo.seriesName && articleInfo.episode) {
      const seriesName = articleInfo.seriesName;
      const currentEpisode = articleInfo.episode;
      
      console.log(`查找系列 "${seriesName}" EP${currentEpisode} 的相鄰文章`);
      
      // 獲取系列所有文章
      let seriesPosts = [];
      
      // 從series對象中獲取系列文章（新格式）
      if (data.series && data.series[seriesName]) {
        if (data.series[seriesName].posts && Array.isArray(data.series[seriesName].posts)) {
          seriesPosts = data.series[seriesName].posts;
          console.log(`從series.posts找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        } else if (Array.isArray(data.series[seriesName])) {
          seriesPosts = data.series[seriesName];
          console.log(`從series數組找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        }
      }
      
      // 如果從series中找不到，嘗試從所有文章中過濾
      if (seriesPosts.length === 0) {
        seriesPosts = data.posts.filter(post => 
          post.is_series && 
          post.series_name === seriesName
        );
        console.log(`從全部文章過濾出 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
      }
      
      if (seriesPosts.length === 0) {
        console.error(`找不到系列 "${seriesName}" 的文章，嘗試模糊匹配`);
        
        // 嘗試模糊匹配系列名稱
        seriesPosts = data.posts.filter(post => 
          post.is_series && 
          (post.series_name.includes(seriesName) || 
           seriesName.includes(post.series_name))
        );
        
        if (seriesPosts.length > 0) {
          console.log(`通過模糊匹配找到 ${seriesPosts.length} 篇相關系列文章`);
        }
      }
      
      if (seriesPosts.length > 0) {
        // 按集數排序
        seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
        console.log('系列文章順序:', seriesPosts.map(p => `EP${p.episode}`).join(', '));
        
        // 直接查找前一集和後一集
        prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
        nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
        
        // 記錄結果
        if (prevPost) {
          console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
        } else {
          console.log(`沒有上一集 EP${currentEpisode - 1}`);
          
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
          console.log(`沒有下一集 EP${currentEpisode + 1}`);
          
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
      } else {
        console.error(`找不到任何相關的系列文章`);
        setDefaultState();
        return;
      }
    } 
    // 非系列文章：使用日期和標題查找相鄰文章
    else if (articleInfo.date) {
      console.log(`查找日期為 ${articleInfo.date} 的相鄰文章`);
      
      // 按日期排序所有文章
      const sortedPosts = [...data.posts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      // 找出最接近當前日期的文章
      let closestIndex = -1;
      const currentDate = new Date(articleInfo.date);
      
      if (articleInfo.title) {
        // 如果有標題，嘗試精確匹配
        closestIndex = sortedPosts.findIndex(post => 
          post.title === articleInfo.title && 
          post.date === articleInfo.date
        );
      }
      
      // 如果沒有找到精確匹配，使用日期找最接近的
      if (closestIndex === -1) {
        let minDiff = Infinity;
        
        for (let i = 0; i < sortedPosts.length; i++) {
          const postDate = new Date(sortedPosts[i].date);
          const diff = Math.abs(postDate - currentDate);
          
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
      }
      
      console.log(`找到最接近的文章索引: ${closestIndex}`);
      
      // 獲取相鄰文章
      if (closestIndex > 0) {
        prevPost = sortedPosts[closestIndex - 1];
        console.log(`找到上一篇: ${prevPost.title}`);
      }
      
      if (closestIndex < sortedPosts.length - 1) {
        nextPost = sortedPosts[closestIndex + 1];
        console.log(`找到下一篇: ${nextPost.title}`);
      }
    } else {
      console.error('無法從頁面獲取足夠的信息來找到相鄰文章');
      setDefaultState();
      return;
    }
    
    // 更新導航按鈕
    updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
  }
  
  /**
   * 更新導航按鈕，同時清理URL
   */
  function updateNavigation(prevPost, nextPost, prevMessage = '', nextMessage = '') {
    // 更新上一篇
    if (prevPost && prevPost.url) {
      // 去掉.html後綴
      const cleanUrl = prevPost.url.replace(/\.html$/, '');
      prevLink.href = cleanUrl;
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
      const cleanUrl = nextPost.url.replace(/\.html$/, '');
      nextLink.href = cleanUrl;
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