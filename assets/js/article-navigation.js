/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-07
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 專注版本：直接使用系列名稱和集數匹配
 */
document.addEventListener('DOMContentLoaded', function() {
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 初始化載入狀態
  setLoadingState(true);
  
  // 首先嘗試從DOM元素獲取系列信息
  let currentSeriesInfo = extractSeriesInfoFromDOM();
  console.log('從DOM提取的系列信息:', currentSeriesInfo);
  
  // 如果無法從DOM獲取，嘗試從URL或檔名獲取
  if (!currentSeriesInfo.isValid) {
    currentSeriesInfo = extractSeriesInfoFromURL(window.location.pathname);
    console.log('從URL提取的系列信息:', currentSeriesInfo);
  }

  // 從 JSON 獲取文章數據
  fetch('/assets/data/blog-posts.json?nocache=' + new Date().getTime())
    .then(response => {
      if (!response.ok) {
        throw new Error('無法獲取文章數據');
      }
      return response.json();
    })
    .then(data => {
      handleBlogData(data, currentSeriesInfo);
    })
    .catch(error => {
      console.error('載入導航數據失敗:', error);
      setDefaultNavigationState();
    });

  /**
   * 從DOM元素提取系列信息
   */
  function extractSeriesInfoFromDOM() {
    const result = { isValid: false };
    
    // 嘗試從meta標籤提取
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isValid = true;
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      return result;
    }
    
    // 嘗試從文章內容提取
    const articleTitle = document.querySelector('h1.article-title');
    if (articleTitle) {
      const titleText = articleTitle.textContent;
      // 檢查標題中是否包含EP或第X集
      const episodeMatch = titleText.match(/EP(\d+)|第(\d+)集/i);
      if (episodeMatch) {
        result.isValid = true;
        result.isSeries = true;
        result.episode = parseInt(episodeMatch[1] || episodeMatch[2]);
        
        // 嘗試從標題中提取系列名稱
        const seriesTitleMatch = titleText.match(/(.*?)(EP\d+|第\d+集)/i);
        if (seriesTitleMatch) {
          result.seriesName = seriesTitleMatch[1].trim();
        }
      }
    }
    
    // 嘗試從標籤或段落中提取
    if (!result.isValid) {
      document.querySelectorAll('p, .article-tag, .series-badge').forEach(el => {
        if (result.isValid) return; // 如果已找到，跳過
        
        const text = el.textContent;
        if (text.includes('系列') || text.includes('EP')) {
          const episodeMatch = text.match(/EP(\d+)|第(\d+)集/i);
          const seriesMatch = text.match(/(.*?)(系列|EP\d+|第\d+集)/i);
          
          if (episodeMatch && seriesMatch) {
            result.isValid = true;
            result.isSeries = true;
            result.episode = parseInt(episodeMatch[1] || episodeMatch[2]);
            result.seriesName = seriesMatch[1].trim();
          }
        }
      });
    }
    
    // 如果無法提取系列信息，表示可能不是系列文章
    if (!result.isValid) {
      result.isSeries = false;
    }
    
    return result;
  }
  
  /**
   * 從URL路徑提取系列信息
   */
  function extractSeriesInfoFromURL(urlPath) {
    const result = { isValid: false };
    
    // 檢查URL中是否有ep標記
    const epMatch = urlPath.match(/ep(\d+)|第(\d+)集/i);
    if (epMatch) {
      result.isValid = true;
      result.isSeries = true;
      result.episode = parseInt(epMatch[1] || epMatch[2]);
      
      // 嘗試從URL提取系列名稱 - 找出位於日期和EP之間的部分
      const pathSegments = urlPath.split('/');
      const filename = pathSegments[pathSegments.length - 1];
      
      // 針對格式為: 2025-05-06-series-name-ep1.html
      const dateSeriesMatch = filename.match(/\d{4}-\d{2}-\d{2}-(.*?)-(ep\d+|第\d+集)/i);
      if (dateSeriesMatch) {
        result.seriesName = dateSeriesMatch[1].replace(/-/g, ' ').trim();
      }
    } else {
      // 如果URL中沒有明確的EP標記，就假設不是系列文章
      result.isSeries = false;
    }
    
    return result;
  }

  /**
   * 處理博客數據
   */
  function handleBlogData(data, currentSeriesInfo) {
    const allPosts = data.posts || [];
    const seriesData = data.series || {};
    
    if (!allPosts.length) {
      console.error('沒有找到文章數據');
      setDefaultNavigationState();
      return;
    }
    
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    // 如果是系列文章，優先查找同系列文章
    if (currentSeriesInfo.isSeries && currentSeriesInfo.seriesName && currentSeriesInfo.episode) {
      const seriesName = currentSeriesInfo.seriesName;
      const currentEpisode = currentSeriesInfo.episode;
      
      console.log(`正在查找系列「${seriesName}」的第${currentEpisode}集的相鄰文章`);
      
      // 找到所有同系列文章
      let seriesPosts = [];
      
      // 嘗試從series對象獲取
      if (seriesData[seriesName] && Array.isArray(seriesData[seriesName].posts)) {
        seriesPosts = seriesData[seriesName].posts;
        console.log(`從series對象找到「${seriesName}」系列的${seriesPosts.length}篇文章`);
      } else {
        // 從所有文章中過濾
        seriesPosts = allPosts.filter(post => {
          return post.is_series && 
                 post.series_name && 
                 (post.series_name === seriesName || 
                  post.series_name.toLowerCase() === seriesName.toLowerCase());
        });
        console.log(`從所有文章中過濾出「${seriesName}」系列的${seriesPosts.length}篇文章`);
      }
      
      // 不同系列間導航的特別處理
      if (seriesPosts.length === 0) {
        // 如果找不到完全匹配的系列名，嘗試模糊匹配
        const possibleSeriesNames = Object.keys(seriesData);
        const similarSeries = possibleSeriesNames.find(name => 
          name.includes(seriesName) || seriesName.includes(name)
        );
        
        if (similarSeries) {
          console.log(`找到類似的系列名稱: ${similarSeries}`);
          seriesPosts = seriesData[similarSeries].posts || [];
        }
      }
      
      if (seriesPosts.length > 0) {
        // 按集數排序
        seriesPosts.sort((a, b) => {
          const epA = parseInt(a.episode);
          const epB = parseInt(b.episode);
          return epA - epB;
        });
        
        console.log('系列文章按集數排序:', seriesPosts.map(p => `EP${p.episode}`).join(', '));
        
        // 找出當前集數的前後文章
        prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
        nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
        
        // 紀錄找到的文章
        if (prevPost) {
          console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
        } else {
          console.log(`未找到上一集 (EP${currentEpisode - 1})`);
        }
        
        if (nextPost) {
          console.log(`找到下一集 EP${nextPost.episode}: ${nextPost.title}`);
        } else {
          console.log(`未找到下一集 (EP${currentEpisode + 1})`);
        }
        
        // 如果是第一集，找其他系列或非系列的文章作為上一篇
        if (!prevPost && seriesPosts[0]?.episode === currentEpisode) {
          const otherPosts = allPosts.filter(post => 
            !post.is_series || 
            (post.is_series && post.series_name !== seriesName)
          );
          
          if (otherPosts.length > 0) {
            otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            prevPost = otherPosts[0];
            prevMessage = '將離開此系列，前往其他主題';
            console.log(`當前為系列第一集，找到非系列文章作為上一篇: ${prevPost.title}`);
          }
        }
        
        // 如果是最後一集，找其他系列或非系列的文章作為下一篇
        if (!nextPost && seriesPosts[seriesPosts.length - 1]?.episode === currentEpisode) {
          const otherPosts = allPosts.filter(post => 
            !post.is_series || 
            (post.is_series && post.series_name !== seriesName)
          );
          
          if (otherPosts.length > 0) {
            otherPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            nextPost = otherPosts[0];
            nextMessage = '系列完結，下一篇文章為其他主題';
            console.log(`當前為系列最後一集，找到非系列文章作為下一篇: ${nextPost.title}`);
          }
        }
      } else {
        console.log(`無法找到系列「${seriesName}」的文章，使用基於日期的導航`);
        // 如果找不到系列文章，回退到基於日期的導航
        findAdjacentPostsByDate(allPosts);
      }
    } else {
      // 非系列文章，使用基於日期的導航
      console.log('當前文章非系列文章或無法確定系列信息，使用基於日期的導航');
      findAdjacentPostsByDate(allPosts);
    }
    
    // 更新導航連結
    updateNavigationLinks(prevPost, nextPost, prevMessage, nextMessage);
    
    /**
     * 基於日期查找前後文章
     */
    function findAdjacentPostsByDate(posts) {
      // 嘗試從DOM中獲取當前文章日期
      const dateElement = document.querySelector('.article-date');
      let currentDate = null;
      
      if (dateElement) {
        const dateMatch = dateElement.textContent.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          currentDate = new Date(dateMatch[0]);
        }
      }
      
      // 如果無法從DOM獲取日期，嘗試從URL提取
      if (!currentDate) {
        const urlDateMatch = window.location.pathname.match(/(\d{4}-\d{2}-\d{2})/);
        if (urlDateMatch) {
          currentDate = new Date(urlDateMatch[1]);
        }
      }
      
      if (!currentDate) {
        console.error('無法確定當前文章日期，無法基於日期導航');
        return;
      }
      
      console.log('當前文章日期:', currentDate.toISOString().split('T')[0]);
      
      // 對文章按日期排序
      const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 找出比當前日期早和晚的文章
      const earlierPosts = sortedPosts.filter(post => new Date(post.date) < currentDate);
      const laterPosts = sortedPosts.filter(post => new Date(post.date) > currentDate);
      
      // 日期與當前文章相同的文章
      const sameDatePosts = sortedPosts.filter(post => post.date === currentDate.toISOString().split('T')[0]);
      
      // 如果有多篇同一天的文章，嘗試通過標題或URL區分
      if (sameDatePosts.length > 1) {
        const currentTitle = document.querySelector('h1.article-title')?.textContent;
        const currentUrl = window.location.pathname;
        
        sameDatePosts.forEach(post => {
          if (post.title === currentTitle || currentUrl.includes(post.url)) {
            // 跳過當前文章
            return;
          }
          
          // 如果還沒有找到下一篇，使用同日期的其他文章
          if (!nextPost) {
            nextPost = post;
          }
        });
      }
      
      // 如果還沒找到前後文章，使用日期比較
      if (!prevPost && laterPosts.length > 0) {
        prevPost = laterPosts.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      }
      
      if (!nextPost && earlierPosts.length > 0) {
        nextPost = earlierPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      }
    }
  }
  
  /**
   * 更新導航連結
   */
  function updateNavigationLinks(prevPost, nextPost, prevMessage, nextMessage) {
    // 取消載入狀態
    setLoadingState(false);
    
    // 更新上一篇導航
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
      disableLink(prevLink, '無上一篇');
    }
    
    // 更新下一篇導航
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
      disableLink(nextLink, '無下一篇');
    }
  }
  
  /**
   * 設置載入狀態
   */
  function setLoadingState(isLoading) {
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (isLoading) {
      if (prevTitle) prevTitle.textContent = '載入中...';
      if (nextTitle) nextTitle.textContent = '載入中...';
    }
  }
  
  /**
   * 設置默認導航狀態
   */
  function setDefaultNavigationState() {
    setLoadingState(false);
    disableLink(prevLink, '無上一篇');
    disableLink(nextLink, '無下一篇');
  }
  
  /**
   * 禁用導航連結
   */
  function disableLink(link, message) {
    link.removeAttribute('href');
    link.classList.add('disabled');
    
    const titleEl = link.querySelector('.nav-title');
    if (titleEl) {
      titleEl.textContent = message || '無相關文章';
    }
  }
});