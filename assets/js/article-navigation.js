/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-06
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 */
document.addEventListener('DOMContentLoaded', function() {
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 獲取當前URL並清理可能的錨點和查詢參數
  const currentUrl = window.location.pathname;
  console.log('當前頁面URL:', currentUrl);

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

      // 查找當前文章 - 確保URL比較正確
      const currentPost = allPosts.find(post => {
        // 確保比較的URL都是標準化的
        const postUrl = post.url || '';
        return postUrl === currentUrl || currentUrl.startsWith(postUrl);
      });
      
      if (!currentPost) {
        console.error('找不到當前文章:', currentUrl);
        console.log('可用的文章URL:');
        allPosts.slice(0, 5).forEach(post => console.log(' - ' + post.url));
        return;
      }
      
      console.log('找到當前文章:', currentPost.title);

      let prevPost = null;
      let nextPost = null;
      let prevMessage = '';
      let nextMessage = '';

      if (currentPost.is_series) {
        console.log('當前文章是系列文章:', currentPost.series_name, 'EP' + currentPost.episode);
        
        // 系列文章：按集數導航
        const seriesName = currentPost.series_name;
        const currentEpisode = parseInt(currentPost.episode);
        
        // 從系列數據或過濾帖子中獲取系列文章
        let seriesPosts = [];
        
        if (seriesData[seriesName] && seriesData[seriesName].posts) {
          seriesPosts = seriesData[seriesName].posts;
          console.log('從series對象獲取系列文章，找到:', seriesPosts.length);
        } else {
          // 如果沒有專門的系列數據，則從所有文章中過濾
          seriesPosts = allPosts.filter(post => post.is_series && post.series_name === seriesName);
          console.log('從posts過濾系列文章，找到:', seriesPosts.length);
        }

        if (seriesPosts.length === 0) {
          console.error('找不到系列文章數據');
          seriesPosts = [currentPost]; // 至少包含當前文章
        }

        // 按集數排序
        const sortedSeriesPosts = seriesPosts.sort((a, b) => a.episode - b.episode);
        console.log('系列文章集數範圍:', sortedSeriesPosts[0].episode, '到', 
                   sortedSeriesPosts[sortedSeriesPosts.length-1].episode);

        // 查找上一篇（episode - 1）
        prevPost = sortedSeriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
        if (prevPost) {
          console.log('找到上一集:', prevPost.title);
        }
        
        if (!prevPost && sortedSeriesPosts[0]?.episode === currentEpisode) {
          // 第一集：查找非系列文章或另一系列的最新文章
          console.log('當前是系列第一集，尋找其他文章作為上一篇');
          const nonSeriesPosts = allPosts.filter(post => !post.is_series || post.series_name !== seriesName);
          if (nonSeriesPosts.length > 0) {
            prevPost = nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            prevMessage = '將離開此系列，前往其他主題';
            console.log('找到上一篇非系列文章:', prevPost.title);
          }
        }

        // 查找下一篇（episode + 1）
        nextPost = sortedSeriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
        if (nextPost) {
          console.log('找到下一集:', nextPost.title);
        }
        
        if (!nextPost && sortedSeriesPosts[sortedSeriesPosts.length - 1]?.episode === currentEpisode) {
          // 最後一集：查找非系列文章或另一系列的最新文章
          console.log('當前是系列最後一集，尋找其他文章作為下一篇');
          const nonSeriesPosts = allPosts.filter(post => !post.is_series || post.series_name !== seriesName);
          if (nonSeriesPosts.length > 0) {
            nextPost = nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            nextMessage = '系列完結，下一篇文章為其他主題';
            console.log('找到下一篇非系列文章:', nextPost.title);
          }
        }
      } else {
        console.log('當前文章是非系列文章');
        // 非系列文章：按日期導航
        const sortedPosts = allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const currentIndex = sortedPosts.findIndex(post => {
          const postUrl = post.url || '';
          return postUrl === currentUrl || currentUrl.startsWith(postUrl);
        });
        
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
    })
    .catch(error => {
      console.error('載入導航數據失敗:', error);
      prevLink.classList.add('disabled');
      nextLink.classList.add('disabled');
    });
});