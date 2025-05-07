/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-07
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 * 修正版本：解決URL比較問題和系列文章導航問題
 */
document.addEventListener('DOMContentLoaded', function() {
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 獲取當前URL並標準化處理
  const currentPath = normalizePath(window.location.pathname);
  console.log('當前頁面標準化URL:', currentPath);

  // 從 JSON 獲取文章數據
  fetch('/assets/data/blog-posts.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('無法獲取文章數據');
      }
      return response.json();
    })
    .then(data => {
      const allPosts = data.posts || [];
      const seriesData = data.series || {};
      
      console.log('找到文章總數:', allPosts.length);
      if (Object.keys(seriesData).length) {
        console.log('找到系列總數:', Object.keys(seriesData).length);
      }

      // 使用改進的方法查找當前文章
      const currentPost = findCurrentPost(allPosts, currentPath);
      
      if (!currentPost) {
        console.error('找不到當前文章:', currentPath);
        console.log('可用的文章URL前5個:');
        allPosts.slice(0, 5).forEach(post => console.log(' - ' + normalizePath(post.url)));
        disableNavigationButtons();
        return;
      }
      
      console.log('找到當前文章:', currentPost.title);

      let prevPost = null;
      let nextPost = null;
      let prevMessage = '';
      let nextMessage = '';

      // 根據是否為系列文章採用不同的導航邏輯
      if (currentPost.is_series) {
        console.log('當前文章是系列文章:', currentPost.series_name, 'EP' + currentPost.episode);
        
        // 獲取系列文章
        const seriesPosts = getSeriesPosts(currentPost, allPosts, seriesData);
        
        if (seriesPosts.length === 0) {
          console.error('找不到系列文章數據');
          disableNavigationButtons();
          return;
        }

        // 按集數排序
        const sortedSeriesPosts = seriesPosts.sort((a, b) => a.episode - b.episode);
        console.log('系列文章集數範圍:', sortedSeriesPosts[0].episode, '到', 
                   sortedSeriesPosts[sortedSeriesPosts.length-1].episode);
        
        // 當前集數
        const currentEpisode = parseInt(currentPost.episode);

        // 查找上一篇（episode - 1）
        prevPost = sortedSeriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
        if (prevPost) {
          console.log('找到上一集:', prevPost.title);
        }
        
        // 如果是第一集，尋找其他文章
        if (!prevPost && sortedSeriesPosts[0]?.episode === currentEpisode) {
          console.log('當前是系列第一集，尋找其他文章作為上一篇');
          const nonSeriesPosts = allPosts.filter(post => 
            !post.is_series || post.series_name !== currentPost.series_name
          );
          
          if (nonSeriesPosts.length > 0) {
            // 按日期排序，找出最新的
            prevPost = nonSeriesPosts.sort((a, b) => 
              new Date(b.date) - new Date(a.date)
            )[0];
            prevMessage = '將離開此系列，前往其他主題';
            console.log('找到上一篇非系列文章:', prevPost.title);
          }
        }

        // 查找下一篇（episode + 1）
        nextPost = sortedSeriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
        if (nextPost) {
          console.log('找到下一集:', nextPost.title);
        }
        
        // 如果是最後一集，尋找其他文章
        if (!nextPost && sortedSeriesPosts[sortedSeriesPosts.length - 1]?.episode === currentEpisode) {
          console.log('當前是系列最後一集，尋找其他文章作為下一篇');
          const nonSeriesPosts = allPosts.filter(post => 
            !post.is_series || post.series_name !== currentPost.series_name
          );
          
          if (nonSeriesPosts.length > 0) {
            nextPost = nonSeriesPosts.sort((a, b) => 
              new Date(b.date) - new Date(a.date)
            )[0];
            nextMessage = '系列完結，下一篇文章為其他主題';
            console.log('找到下一篇非系列文章:', nextPost.title);
          }
        }
      } else {
        console.log('當前文章是非系列文章');
        // 非系列文章：按日期導航
        
        // 按日期排序所有文章
        const sortedPosts = allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 在排序後的文章中找到當前文章的索引
        const currentIndex = sortedPosts.findIndex(post => 
          normalizePath(post.url) === currentPath
        );
        
        console.log('當前文章索引:', currentIndex, '(共', sortedPosts.length, '篇)');

        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
          console.log('找到上一篇:', prevPost.title);
        }
        
        if (currentIndex < sortedPosts.length - 1 && currentIndex !== -1) {
          nextPost = sortedPosts[currentIndex + 1];
          console.log('找到下一篇:', nextPost.title);
        }
      }

      // 更新導航連結
      updateNavigationLinks(prevLink, nextLink, prevPost, nextPost, prevMessage, nextMessage);
    })
    .catch(error => {
      console.error('載入導航數據失敗:', error);
      disableNavigationButtons();
    });
    
  // 標準化URL路徑，移除開頭斜線、查詢參數和錨點
  function normalizePath(path) {
    if (!path) return '';
    // 移除查詢參數和錨點
    path = path.split(/[?#]/)[0];
    // 移除尾部的.html (如果有)
    path = path.replace(/\.html$/, '');
    // 確保以/開頭但移除多餘的斜線
    path = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
    return path.toLowerCase();
  }
  
  // 根據標準化URL尋找當前文章
  function findCurrentPost(posts, currentPath) {
    // 先嘗試精確匹配
    let post = posts.find(post => normalizePath(post.url) === currentPath);
    
    // 如果找不到，嘗試更寬鬆的匹配方式
    if (!post) {
      post = posts.find(post => {
        const postPath = normalizePath(post.url);
        return currentPath.includes(postPath) || postPath.includes(currentPath);
      });
    }
    
    return post;
  }
  
  // 獲取系列文章列表
  function getSeriesPosts(currentPost, allPosts, seriesData) {
    const seriesName = currentPost.series_name;
    
    // 嘗試從series對象中獲取
    if (seriesData[seriesName] && Array.isArray(seriesData[seriesName].posts)) {
      const seriesPosts = seriesData[seriesName].posts;
      console.log('從series對象獲取系列文章，找到:', seriesPosts.length);
      return seriesPosts;
    }
    
    // 如果沒有專門的系列數據，則從所有文章中過濾
    const filteredPosts = allPosts.filter(post => 
      post.is_series && post.series_name === seriesName
    );
    
    console.log('從所有文章過濾系列文章，找到:', filteredPosts.length);
    return filteredPosts;
  }
  
  // 更新導航連結
  function updateNavigationLinks(prevLink, nextLink, prevPost, nextPost, prevMessage, nextMessage) {
    // 更新上一篇
    if (prevPost) {
      prevLink.href = prevPost.url;
      const titleElement = prevLink.querySelector('.nav-title');
      if (titleElement) {
        titleElement.textContent = prevPost.title;
      }
      
      const messageElement = prevLink.querySelector('.nav-message');
      if (messageElement && prevMessage) {
        messageElement.textContent = prevMessage;
        prevLink.classList.add('nav-warning');
      }
      
      prevLink.classList.remove('disabled');
    } else {
      prevLink.classList.add('disabled');
      const titleElement = prevLink.querySelector('.nav-title');
      if (titleElement) {
        titleElement.textContent = '無上一篇';
      }
    }

    // 更新下一篇
    if (nextPost) {
      nextLink.href = nextPost.url;
      const titleElement = nextLink.querySelector('.nav-title');
      if (titleElement) {
        titleElement.textContent = nextPost.title;
      }
      
      const messageElement = nextLink.querySelector('.nav-message');
      if (messageElement && nextMessage) {
        messageElement.textContent = nextMessage;
        nextLink.classList.add('nav-warning');
      }
      
      nextLink.classList.remove('disabled');
    } else {
      nextLink.classList.add('disabled');
      const titleElement = nextLink.querySelector('.nav-title');
      if (titleElement) {
        titleElement.textContent = '無下一篇';
      }
    }
  }
  
  // 禁用導航按鈕
  function disableNavigationButtons() {
    prevLink.classList.add('disabled');
    nextLink.classList.add('disabled');
    
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (prevTitle) prevTitle.textContent = '無上一篇';
    if (nextTitle) nextTitle.textContent = '無下一篇';
  }
});