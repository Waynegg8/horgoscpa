/**
 * article-navigation.js - 霍爾果斯會計師事務所文章導航腳本
 * 最後更新日期: 2025-05-06
 * 功能: 為文章頁面生成上一篇和下一篇導航，支援系列文章內導航
 */
document.addEventListener('DOMContentLoaded', function() {
  const BLOG_POSTS_JSON = '/assets/data/blog-posts.json';
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');

  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  // 獲取當前文章的 URL
  const currentUrl = window.location.pathname;

  // 從 JSON 獲取文章數據
  fetch(BLOG_POSTS_JSON)
    .then(response => {
      if (!response.ok) {
        throw new Error('無法獲取文章數據');
      }
      return response.json();
    })
    .then(data => {
      const allPosts = data.posts || [];
      const seriesData = data.series || {};

      // 查找當前文章
      const currentPost = allPosts.find(post => post.url === currentUrl);
      if (!currentPost) {
        console.error('找不到當前文章:', currentUrl);
        return;
      }

      let prevPost = null;
      let nextPost = null;
      let prevMessage = '';
      let nextMessage = '';

      if (currentPost.is_series) {
        // 系列文章：按集數導航
        const seriesName = currentPost.series_name;
        const currentEpisode = parseInt(currentPost.episode);
        const seriesPosts = seriesData[seriesName]?.posts || [];

        // 按集數排序
        const sortedSeriesPosts = seriesPosts.sort((a, b) => a.episode - b.episode);

        // 查找上一篇（episode - 1）
        prevPost = sortedSeriesPosts.find(post => post.episode === currentEpisode - 1);
        if (!prevPost && sortedSeriesPosts[0]?.episode === currentEpisode) {
          // 第一集：查找非系列文章或另一系列的最新文章
          const nonSeriesPosts = allPosts.filter(post => !post.is_series || post.series_name !== seriesName);
          if (nonSeriesPosts.length > 0) {
            prevPost = nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            prevMessage = '將離開此系列，前往其他主題';
          }
        }

        // 查找下一篇（episode + 1）
        nextPost = sortedSeriesPosts.find(post => post.episode === currentEpisode + 1);
        if (!nextPost && sortedSeriesPosts[sortedSeriesPosts.length - 1]?.episode === currentEpisode) {
          // 最後一集：查找非系列文章或另一系列的最新文章
          const nonSeriesPosts = allPosts.filter(post => !post.is_series || post.series_name !== seriesName);
          if (nonSeriesPosts.length > 0) {
            nextPost = nonSeriesPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            nextMessage = '系列完結，下一篇文章為其他主題';
          }
        }
      } else {
        // 非系列文章：按日期導航
        const sortedPosts = allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const currentIndex = sortedPosts.findIndex(post => post.url === currentUrl);

        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
        }
        if (currentIndex < sortedPosts.length - 1) {
          nextPost = sortedPosts[currentIndex + 1];
        }
      }

      // 更新導航連結
      if (prevPost) {
        prevLink.href = prevPost.url;
        prevLink.querySelector('.nav-title').textContent = prevPost.title;
        if (prevMessage) {
          prevLink.querySelector('.nav-message').textContent = prevMessage;
          prevLink.classList.add('nav-warning');
        }
        prevLink.classList.remove('disabled');
      } else {
        prevLink.classList.add('disabled');
        prevLink.querySelector('.nav-title').textContent = '無上一篇';
      }

      if (nextPost) {
        nextLink.href = nextPost.url;
        nextLink.querySelector('.nav-title').textContent = nextPost.title;
        if (nextMessage) {
          nextLink.querySelector('.nav-message').textContent = nextMessage;
          nextLink.classList.add('nav-warning');
        }
        nextLink.classList.remove('disabled');
      } else {
        nextLink.classList.add('disabled');
        nextLink.querySelector('.nav-title').textContent = '無下一篇';
      }
    })
    .catch(error => {
      console.error('載入導航數據失敗:', error);
      prevLink.classList.add('disabled');
      nextLink.classList.add('disabled');
    });
});