document.addEventListener('DOMContentLoaded', function() {
  const prevLink = document.getElementById('prev-article');
  const nextLink = document.getElementById('next-article');
  
  if (!prevLink || !nextLink) {
    console.error('導航元素未找到');
    return;
  }

  setLoadingState();
  
  const seriesInfo = getSeriesInfoFromDOM();
  console.log('從頁面獲取的系列信息:', seriesInfo);
  
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
  
  function getSeriesInfoFromDOM() {
    const result = {
      isSeries: false,
      seriesName: null,
      episode: null,
      date: null,
      title: null
    };
    
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
    
    const seriesNameMeta = document.querySelector('meta[name="series-name"]');
    const seriesEpisodeMeta = document.querySelector('meta[name="series-episode"]');
    
    if (seriesNameMeta && seriesEpisodeMeta) {
      result.isSeries = true;
      result.seriesName = seriesNameMeta.getAttribute('content');
      result.episode = parseInt(seriesEpisodeMeta.getAttribute('content'));
      console.log(`找到系列信息: ${result.seriesName} EP${result.episode}`);
      return result;
    }
    
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
      }
    }
    
    return result;
  }

  function processUrl(url) {
    if (!url) return '';
    
    // 確保URL有/blog/前綴
    if (!url.startsWith("/blog/")) {
      url = "/blog/" + url.replace(/^\//, '');
    }
    
    // 如果需要絕對URL，可以添加域名
    if (url.startsWith('/')) {
      url = 'https://horgoscpa.com' + url;
    }
    
    return url;
  }
  
  function getRandomItem(array) {
    if (!array || array.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * array.length);
    console.log(`隨機選擇索引 ${randomIndex}，共 ${array.length} 個元素`);
    return array[randomIndex];
  }

  function findAdjacentArticles(data, seriesInfo) {
    let prevPost = null;
    let nextPost = null;
    let prevMessage = '';
    let nextMessage = '';
    
    const allPosts = data.posts || [];
    
    if (seriesInfo.isSeries) {
      handleSeriesArticles(allPosts, data.series, seriesInfo);
    } else {
      handleNonSeriesArticles(allPosts, data.series, seriesInfo);
    }
    
    function handleSeriesArticles(posts, seriesData, info) {
      const seriesName = info.seriesName;
      const currentEpisode = info.episode;
      
      if (!seriesName || !currentEpisode) {
        console.error('系列信息不完整，無法處理導航');
        setDefaultState();
        return;
      }
      
      let seriesPosts = [];
      
      if (seriesData && seriesData[seriesName]) {
        if (Array.isArray(seriesData[seriesName].posts)) {
          seriesPosts = seriesData[seriesName].posts;
          console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        } else if (Array.isArray(seriesData[seriesName])) {
          seriesPosts = seriesData[seriesName];
          console.log(`從series陣列中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        }
      }
      
      if (seriesPosts.length === 0) {
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
      
      seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
      
      prevPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode - 1);
      nextPost = seriesPosts.find(post => parseInt(post.episode) === currentEpisode + 1);
      
      if (prevPost) {
        console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
        prevPost.url = processUrl(prevPost.url);
      } else {
        if (currentEpisode === 1) {
          const otherSeriesFirstEpisodes = getOtherSeriesFirstEpisodes(seriesData, seriesName);
          if (otherSeriesFirstEpisodes.length > 0) {
            prevPost = getRandomItem(otherSeriesFirstEpisodes);
            prevPost.url = processUrl(prevPost.url);
            prevMessage = '離開此系列，前往其他系列的第一篇';
            console.log(`系列第一集，找到其他系列的第一篇: ${prevPost.title}`);
          }
        }
      }
      
      if (nextPost) {
        console.log(`找到下一集 EP${nextPost.episode}: ${nextPost.title}`);
        nextPost.url = processUrl(nextPost.url);
      }
      
      updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
    }
    
    function handleNonSeriesArticles(posts, seriesData, info) {
      const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      let currentIndex = -1;
      
      if (info.title) {
        if (info.date) {
          currentIndex = sortedPosts.findIndex(post => 
            post.date === info.date && 
            post.title === info.title
          );
        }
        
        if (currentIndex === -1) {
          currentIndex = sortedPosts.findIndex(post => post.title === info.title);
        }
      }
      
      if (currentIndex === -1 && info.date) {
        currentIndex = sortedPosts.findIndex(post => post.date === info.date);
      }
      
      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
          prevPost.url = processUrl(prevPost.url);
        }
        
        if (currentIndex < sortedPosts.length - 1) {
          nextPost = sortedPosts[currentIndex + 1];
          nextPost.url = processUrl(nextPost.url);
        } else {
          const seriesFirstEpisodes = getAllSeriesFirstEpisodes(seriesData);
          if (seriesFirstEpisodes.length > 0) {
            nextPost = getRandomItem(seriesFirstEpisodes);
            nextPost.url = processUrl(nextPost.url);
            nextMessage = '即將進入系列文章';
          }
        }
      } else {
        if (info.date) {
          const currentDate = new Date(info.date);
          
          const earlierPosts = sortedPosts.filter(post => 
            new Date(post.date) < currentDate
          );
          
          const laterPosts = sortedPosts.filter(post => 
            new Date(post.date) > currentDate
          );
          
          if (earlierPosts.length > 0) {
            earlierPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            prevPost = earlierPosts[0];
            prevPost.url = processUrl(prevPost.url);
          }
          
          if (laterPosts.length > 0) {
            laterPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
            nextPost = laterPosts[0];
            nextPost.url = processUrl(nextPost.url);
          }
        }
      }
      
      updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
    }
    
    function getOtherSeriesFirstEpisodes(seriesData, excludedSeriesName) {
      let firstEpisodes = [];
      
      for (const seriesName in seriesData) {
        if (seriesName !== excludedSeriesName) {
          let seriesPosts = seriesData[seriesName].posts || [];
          seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
          if (seriesPosts.length > 0) {
            firstEpisodes.push(seriesPosts[0]);
          }
        }
      }
      
      return firstEpisodes;
    }

    function getAllSeriesFirstEpisodes(seriesData) {
      let firstEpisodes = [];
      
      for (const seriesName in seriesData) {
        let seriesPosts = seriesData[seriesName].posts || [];
        seriesPosts.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
        if (seriesPosts.length > 0) {
          firstEpisodes.push(seriesPosts[0]);
        }
      }
      
      return firstEpisodes;
    }
  }
  
  function updateNavigation(prevPost, nextPost, prevMessage = '', nextMessage = '') {
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
  
  function setLoadingState() {
    const prevTitle = prevLink.querySelector('.nav-title');
    const nextTitle = nextLink.querySelector('.nav-title');
    
    if (prevTitle) prevTitle.textContent = '載入中...';
    if (nextTitle) nextTitle.textContent = '載入中...';
  }
  
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