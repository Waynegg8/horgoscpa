/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-07
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 全新版本：完全重構導航邏輯
 */
document.addEventListener('DOMContentLoaded', function() {
  // 添加載入中狀態顯示
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 設置初始載入中狀態
  setLoadingState(true);
  
  // 獲取當前文章信息的多種方法
  const articleInfo = getArticleInfoFromDOM();
  const currentUrl = window.location.pathname;
  const currentFilename = currentUrl.split('/').pop();
  
  console.log('當前頁面URL:', currentUrl);
  console.log('當前頁面文件名:', currentFilename);
  console.log('從DOM獲取的文章信息:', articleInfo);

  // 從 JSON 獲取文章數據
  fetch('/assets/data/blog-posts.json?v=' + new Date().getTime())
    .then(response => {
      if (!response.ok) {
        throw new Error('無法獲取文章數據，狀態碼: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      try {
        processPostsData(data);
      } catch (err) {
        console.error('處理文章數據時出錯:', err);
        setDefaultNavigationState();
      }
    })
    .catch(error => {
      console.error('載入導航數據失敗:', error);
      setDefaultNavigationState();
    });
  
  /**
   * 從DOM中獲取文章信息
   */
  function getArticleInfoFromDOM() {
    const info = {};
    
    // 嘗試從標題獲取信息
    const titleElement = document.querySelector('h1.article-title');
    if (titleElement) {
      info.title = titleElement.textContent.trim();
    }
    
    // 嘗試從日期獲取信息
    const dateElement = document.querySelector('.article-date');
    if (dateElement) {
      const dateMatch = dateElement.textContent.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        info.date = dateMatch[0];
      }
    }
    
    // 嘗試從meta標籤獲取系列信息
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      info.is_series = true;
      info.series_name = seriesNameMeta.getAttribute('content');
      info.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
    }
    
    // 嘗試從類別獲取信息
    const categoryElement = document.querySelector('.article-category');
    if (categoryElement) {
      info.category = categoryElement.textContent.trim();
    }
    
    return info;
  }
  
  /**
   * 處理文章數據找到前後文章
   */
  function processPostsData(data) {
    const allPosts = data.posts || [];
    const seriesData = data.series || {};
    
    if (!allPosts.length) {
      console.error('沒有找到任何文章數據');
      setDefaultNavigationState();
      return;
    }
    
    console.log(`總共找到 ${allPosts.length} 篇文章`);
    
    // 嘗試多種方式找到當前文章
    let currentPost = findCurrentPost(allPosts, currentUrl, currentFilename, articleInfo);
    
    if (!currentPost) {
      console.error('無法確定當前文章，無法設置導航');
      setDefaultNavigationState();
      return;
    }
    
    console.log('確定當前文章:', currentPost.title);
    findAdjacentPosts(currentPost, allPosts, seriesData);
  }
  
  /**
   * 嘗試多種方式找到當前文章
   */
  function findCurrentPost(posts, currentUrl, currentFilename, articleInfo) {
    // 1. 直接URL匹配
    let post = posts.find(p => p.url === currentUrl);
    
    // 2. 忽略域名部分的URL匹配
    if (!post) {
      post = posts.find(p => {
        // 確保URL有效
        if (!p.url) return false;
        // 獲取文件名部分
        const postFilename = p.url.split('/').pop();
        return postFilename === currentFilename;
      });
    }
    
    // 3. 基於標題和日期匹配
    if (!post && articleInfo.title && articleInfo.date) {
      post = posts.find(p => 
        p.title === articleInfo.title && 
        p.date === articleInfo.date
      );
    }
    
    // 4. 系列文章特殊匹配
    if (!post && articleInfo.is_series) {
      post = posts.find(p => 
        p.is_series && 
        p.series_name === articleInfo.series_name && 
        p.episode === articleInfo.episode
      );
    }
    
    // 5. 最後嘗試模糊匹配
    if (!post) {
      // 從URL提取可能的日期
      const dateMatch = currentUrl.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const dateInUrl = dateMatch[1];
        post = posts.find(p => p.date === dateInUrl && currentUrl.includes(p.title.toLowerCase().replace(/\s+/g, '-')));
      }
    }
    
    return post;
  }
  
  /**
   * 根據當前文章找到相鄰文章
   */
  function findAdjacentPosts(currentPost, allPosts, seriesData) {
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    if (currentPost.is_series) {
      console.log('當前是系列文章:', currentPost.series_name, '第', currentPost.episode, '集');
      const seriesPosts = getSeriesPosts(currentPost, allPosts, seriesData);
      
      if (seriesPosts.length > 0) {
        // 按集數排序
        const sortedSeriesPosts = [...seriesPosts].sort((a, b) => a.episode - b.episode);
        const currentEpisode = parseInt(currentPost.episode);
        
        // 查找同系列的上一篇和下一篇
        prevPost = sortedSeriesPosts.find(p => parseInt(p.episode) === currentEpisode - 1);
        nextPost = sortedSeriesPosts.find(p => parseInt(p.episode) === currentEpisode + 1);
        
        // 處理系列的第一篇/最後一篇的特殊情況
        if (!prevPost && sortedSeriesPosts[0]?.episode === currentEpisode) {
          // 系列第一篇，找其他最新文章作為上一篇
          const nonSeriesPosts = allPosts.filter(p => 
            !p.is_series || p.series_name !== currentPost.series_name
          );
          
          if (nonSeriesPosts.length > 0) {
            nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            prevPost = nonSeriesPosts[0];
            prevMessage = '將離開此系列，前往其他文章';
          }
        }
        
        if (!nextPost && sortedSeriesPosts[sortedSeriesPosts.length - 1]?.episode === currentEpisode) {
          // 系列最後一篇，找其他最新文章作為下一篇
          const nonSeriesPosts = allPosts.filter(p => 
            !p.is_series || p.series_name !== currentPost.series_name
          );
          
          if (nonSeriesPosts.length > 0) {
            nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            nextPost = nonSeriesPosts[0];
            nextMessage = '系列已結束，前往其他文章';
          }
        }
      }
    } else {
      // 非系列文章，按日期導航
      const sortedPosts = [...allPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
      const currentIndex = sortedPosts.findIndex(p => p.url === currentPost.url);
      
      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
        }
        
        if (currentIndex < sortedPosts.length - 1) {
          nextPost = sortedPosts[currentIndex + 1];
        }
      } else {
        // 如果找不到精確索引，使用日期比較
        const currentDate = new Date(currentPost.date);
        
        // 找出日期比當前文章早的所有文章
        const earlierPosts = sortedPosts.filter(p => new Date(p.date) < currentDate);
        // 找出日期比當前文章晚的所有文章
        const laterPosts = sortedPosts.filter(p => new Date(p.date) > currentDate);
        
        if (earlierPosts.length > 0) {
          earlierPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
          nextPost = earlierPosts[0]; // 日期較近的文章作為下一篇
        }
        
        if (laterPosts.length > 0) {
          laterPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
          prevPost = laterPosts[0]; // 日期較近的文章作為上一篇
        }
      }
    }
    
    // 更新導航連結
    updateNavigationLinks(prevPost, nextPost, prevMessage, nextMessage);
  }
  
  /**
   * 獲取系列文章列表
   */
  function getSeriesPosts(currentPost, allPosts, seriesData) {
    if (!currentPost || !currentPost.series_name) {
      return [];
    }
    
    const seriesName = currentPost.series_name;
    
    // 先從series對象中查找
    if (seriesData[seriesName] && Array.isArray(seriesData[seriesName].posts)) {
      return seriesData[seriesName].posts;
    }
    
    // 如果找不到，從所有文章中過濾
    return allPosts.filter(p => 
      p.is_series && p.series_name === seriesName
    );
  }
  
  /**
   * 更新導航連結
   */
  function updateNavigationLinks(prevPost, nextPost, prevMessage, nextMessage) {
    // 解除載入狀態
    setLoadingState(false);
    
    // 更新上一篇連結
    if (prevPost && prevPost.url) {
      prevLink.href = prevPost.url;
      prevLink.classList.remove('disabled');
      
      const titleEl = prevLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = prevPost.title || '上一篇文章';
      }
      
      if (prevMessage) {
        const msgEl = prevLink.querySelector('.nav-message');
        if (msgEl) {
          msgEl.textContent = prevMessage;
          prevLink.classList.add('nav-warning');
        }
      }
      
      console.log('設置上一篇:', prevPost.title);
    } else {
      disableLink(prevLink, '無上一篇');
    }
    
    // 更新下一篇連結
    if (nextPost && nextPost.url) {
      nextLink.href = nextPost.url;
      nextLink.classList.remove('disabled');
      
      const titleEl = nextLink.querySelector('.nav-title');
      if (titleEl) {
        titleEl.textContent = nextPost.title || '下一篇文章';
      }
      
      if (nextMessage) {
        const msgEl = nextLink.querySelector('.nav-message');
        if (msgEl) {
          msgEl.textContent = nextMessage;
          nextLink.classList.add('nav-warning');
        }
      }
      
      console.log('設置下一篇:', nextPost.title);
    } else {
      disableLink(nextLink, '無下一篇');
    }
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
  
  /**
   * 設置默認導航狀態
   */
  function setDefaultNavigationState() {
    setLoadingState(false);
    disableLink(prevLink, '無上一篇');
    disableLink(nextLink, '無下一篇');
  }
  
  /**
   * 設置載入狀態
   */
  function setLoadingState(isLoading) {
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (isLoading) {
      prevLink.classList.add('loading');
      nextLink.classList.add('loading');
      if (prevTitle) prevTitle.textContent = '載入中...';
      if (nextTitle) nextTitle.textContent = '載入中...';
    } else {
      prevLink.classList.remove('loading');
      nextLink.classList.remove('loading');
    }
  }
});