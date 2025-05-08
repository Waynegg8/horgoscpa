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
        console.error('解析JSON-LD時出錯:', error);
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
    
    // 檢查是否存在系列數據
    if (!data.series) {
      console.log('沒有發現系列數據');
      data.series = {};
    }
    
    if (seriesInfo.isSeries) {
      console.log('處理系列文章導航');
      handleSeriesArticles(allPosts, data.series, seriesInfo);
    } else {
      console.log('處理非系列文章導航');
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
      
      console.log(`尋找系列 "${seriesName}" 的文章`);
      
      // 從seriesData中獲取系列文章
      if (seriesData && seriesData[seriesName]) {
        if (seriesData[seriesName].posts && Array.isArray(seriesData[seriesName].posts)) {
          seriesPosts = seriesData[seriesName].posts;
          console.log(`從series對象中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        } else if (Array.isArray(seriesData[seriesName])) {
          seriesPosts = seriesData[seriesName];
          console.log(`從series陣列中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        } else {
          console.log(`系列 "${seriesName}" 的格式不支援，嘗試其他方法`);
        }
      } else {
        console.log(`在系列數據中找不到 "${seriesName}"，嘗試從所有文章中篩選`);
      }
      
      // 如果從seriesData中找不到，嘗試從所有文章中過濾
      if (seriesPosts.length === 0) {
        seriesPosts = posts.filter(post => 
          post && post.is_series && 
          (post.series_name === seriesName || post.series_slug === seriesName)
        );
        console.log(`從所有文章中過濾出 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
      }
      
      // 如果仍然沒有找到，嘗試在series_list中尋找
      if (seriesPosts.length === 0 && data.series_list) {
        const seriesItem = data.series_list.find(series => 
          series && (series.name === seriesName || series.slug === seriesName)
        );
        
        if (seriesItem && seriesItem.posts && Array.isArray(seriesItem.posts)) {
          seriesPosts = seriesItem.posts;
          console.log(`從series_list中找到 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
        }
      }
      
      if (seriesPosts.length === 0) {
        console.error(`找不到系列 "${seriesName}" 的文章`);
        setDefaultState();
        return;
      }
      
      // 對系列文章按集數排序
      try {
        seriesPosts.sort((a, b) => {
          const epA = a && a.episode ? parseInt(a.episode) : 0;
          const epB = b && b.episode ? parseInt(b.episode) : 0;
          return epA - epB;
        });
        console.log(`系列文章已按集數排序`);
      } catch (error) {
        console.error(`排序系列文章時出錯:`, error);
      }
      
      // 查找當前文章的集數
      console.log(`當前集數: ${currentEpisode}, 系列共 ${seriesPosts.length} 集`);
      
      // 找出系列的最大集數
      let maxEpisode = 0;
      try {
        if (seriesPosts.length > 0) {
          maxEpisode = Math.max(...seriesPosts.map(post => parseInt(post.episode || 0)));
        }
      } catch (error) {
        console.error(`計算最大集數時出錯:`, error);
      }
      console.log(`系列最大集數: ${maxEpisode}`);
      
      // 尋找上一篇
      try {
        prevPost = seriesPosts.find(post => parseInt(post.episode || 0) === currentEpisode - 1);
        
        if (prevPost) {
          console.log(`找到上一集 EP${prevPost.episode}: ${prevPost.title}`);
          prevPost.url = processUrl(prevPost.url);
        } else {
          console.log(`沒有找到上一集 (EP${currentEpisode - 1})`);
          
          // 檢查是否是第一集
          if (currentEpisode === 1 || currentEpisode === Math.min(...seriesPosts.map(post => parseInt(post.episode || 0)))) {
            console.log(`當前是系列第一集，尋找其他系列的第一集作為上一篇`);
            const otherSeriesFirstEpisodes = getOtherSeriesFirstEpisodes(seriesData, seriesName);
            console.log(`找到 ${otherSeriesFirstEpisodes.length} 個其他系列的第一集`);
            
            if (otherSeriesFirstEpisodes.length > 0) {
              prevPost = getRandomItem(otherSeriesFirstEpisodes);
              if (prevPost) {
                prevPost.url = processUrl(prevPost.url);
                prevMessage = '離開此系列，前往其他系列的第一篇';
                console.log(`系列第一集，推薦其他系列的第一篇: ${prevPost.title}`);
              } else {
                console.log(`未能選取其他系列的第一集`);
              }
            } else {
              console.log(`沒有找到其他系列的第一集`);
            }
          }
        }
      } catch (error) {
        console.error(`尋找上一篇文章時出錯:`, error);
      }
      
      // 尋找下一篇
      try {
        nextPost = seriesPosts.find(post => parseInt(post.episode || 0) === currentEpisode + 1);
        
        if (nextPost) {
          console.log(`找到下一集 EP${nextPost.episode}: ${nextPost.title}`);
          nextPost.url = processUrl(nextPost.url);
        } else {
          console.log(`沒有找到下一集 (EP${currentEpisode + 1})`);
          
          // 檢查是否是最後一集
          if (currentEpisode === maxEpisode || currentEpisode === Math.max(...seriesPosts.map(post => parseInt(post.episode || 0)))) {
            console.log(`當前是系列最後一集，尋找其他系列的第一集作為下一篇`);
            const otherSeriesFirstEpisodes = getOtherSeriesFirstEpisodes(seriesData, seriesName);
            console.log(`找到 ${otherSeriesFirstEpisodes.length} 個其他系列的第一集`);
            
            if (otherSeriesFirstEpisodes.length > 0) {
              nextPost = getRandomItem(otherSeriesFirstEpisodes);
              if (nextPost) {
                nextPost.url = processUrl(nextPost.url);
                nextMessage = '此系列已結束，查看其他系列的第一篇';
                console.log(`系列最後一集，推薦其他系列的第一篇: ${nextPost.title}`);
              } else {
                console.log(`未能選取其他系列的第一集`);
              }
            } else {
              console.log(`沒有找到其他系列的第一集`);
            }
          } else {
            console.log(`當前集數 ${currentEpisode} 不是最後一集 ${maxEpisode}，但找不到下一集`);
          }
        }
      } catch (error) {
        console.error(`尋找下一篇文章時出錯:`, error);
      }
      
      updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
    }
    
    function handleNonSeriesArticles(posts, seriesData, info) {
      const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      let currentIndex = -1;
      
      console.log(`處理非系列文章，嘗試根據標題和日期找到當前文章`);
      
      if (info.title) {
        if (info.date) {
          currentIndex = sortedPosts.findIndex(post => 
            post.date === info.date && 
            post.title === info.title
          );
          console.log(`嘗試通過標題和日期找到當前文章: ${currentIndex !== -1 ? '成功' : '失敗'}`);
        }
        
        if (currentIndex === -1) {
          currentIndex = sortedPosts.findIndex(post => post.title === info.title);
          console.log(`嘗試僅通過標題找到當前文章: ${currentIndex !== -1 ? '成功' : '失敗'}`);
        }
      }
      
      if (currentIndex === -1 && info.date) {
        currentIndex = sortedPosts.findIndex(post => post.date === info.date);
        console.log(`嘗試僅通過日期找到當前文章: ${currentIndex !== -1 ? '成功' : '失敗'}`);
      }
      
      if (currentIndex !== -1) {
        console.log(`找到當前文章在排序後的索引位置: ${currentIndex}`);
        
        if (currentIndex > 0) {
          prevPost = sortedPosts[currentIndex - 1];
          prevPost.url = processUrl(prevPost.url);
          console.log(`找到上一篇文章: ${prevPost.title}`);
        } else {
          console.log(`當前文章已經是最新的，沒有上一篇`);
        }
        
        if (currentIndex < sortedPosts.length - 1) {
          nextPost = sortedPosts[currentIndex + 1];
          nextPost.url = processUrl(nextPost.url);
          console.log(`找到下一篇文章: ${nextPost.title}`);
        } else {
          console.log(`當前文章已經是最舊的，嘗試推薦系列文章`);
          
          const seriesFirstEpisodes = getAllSeriesFirstEpisodes(seriesData);
          if (seriesFirstEpisodes.length > 0) {
            nextPost = getRandomItem(seriesFirstEpisodes);
            nextPost.url = processUrl(nextPost.url);
            nextMessage = '即將進入系列文章';
            console.log(`推薦系列文章: ${nextPost.title}`);
          } else {
            console.log(`沒有找到可推薦的系列文章`);
          }
        }
      } else {
        console.log(`未能找到當前文章，嘗試根據日期進行比較`);
        
        if (info.date) {
          const currentDate = new Date(info.date);
          
          const earlierPosts = sortedPosts.filter(post => 
            new Date(post.date) < currentDate
          );
          
          const laterPosts = sortedPosts.filter(post => 
            new Date(post.date) > currentDate
          );
          
          console.log(`找到 ${earlierPosts.length} 篇早於當前文章的文章, ${laterPosts.length} 篇晚於當前文章的文章`);
          
          if (earlierPosts.length > 0) {
            earlierPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            prevPost = earlierPosts[0];
            prevPost.url = processUrl(prevPost.url);
            console.log(`根據日期找到上一篇文章: ${prevPost.title}`);
          }
          
          if (laterPosts.length > 0) {
            laterPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
            nextPost = laterPosts[0];
            nextPost.url = processUrl(nextPost.url);
            console.log(`根據日期找到下一篇文章: ${nextPost.title}`);
          }
        } else {
          console.log(`無法確定當前文章的日期，無法進行比較`);
        }
      }
      
      updateNavigation(prevPost, nextPost, prevMessage, nextMessage);
    }
    
    function getOtherSeriesFirstEpisodes(seriesData, excludedSeriesName) {
      let firstEpisodes = [];
      
      if (!seriesData) {
        console.log('seriesData為空，無法獲取其他系列');
        return firstEpisodes;
      }
      
      console.log(`開始尋找除 "${excludedSeriesName}" 外的其他系列`);
      
      // 計算檢查了多少系列
      let checkedSeries = 0;
      let validSeries = 0;
      
      for (const seriesName in seriesData) {
        checkedSeries++;
        
        if (seriesName === excludedSeriesName) {
          continue;
        }
        
        console.log(`檢查系列: ${seriesName}`);
        validSeries++;
        
        let seriesPosts = [];
        
        // 處理不同的數據結構
        if (seriesData[seriesName]) {
          if (Array.isArray(seriesData[seriesName])) {
            seriesPosts = [...seriesData[seriesName]];
            console.log(`從陣列中取得 ${seriesPosts.length} 篇文章`);
          } else if (typeof seriesData[seriesName] === 'object') {
            if (seriesData[seriesName].posts && Array.isArray(seriesData[seriesName].posts)) {
              seriesPosts = [...seriesData[seriesName].posts];
              console.log(`從物件的posts屬性中取得 ${seriesPosts.length} 篇文章`);
            } else {
              console.log(`系列 ${seriesName} 的數據格式不支援，無posts屬性`);
              
              // 嘗試從所有文章中過濾
              if (allPosts && allPosts.length > 0) {
                const filteredPosts = allPosts.filter(post => 
                  post && post.is_series && 
                  (post.series_name === seriesName || post.series_slug === seriesName)
                );
                
                if (filteredPosts.length > 0) {
                  seriesPosts = filteredPosts;
                  console.log(`從所有文章中過濾出 ${seriesPosts.length} 篇 "${seriesName}" 系列文章`);
                }
              }
            }
          } else {
            console.log(`系列 ${seriesName} 的數據格式不支援`);
          }
        } else {
          console.log(`系列 ${seriesName} 無效或為空`);
        }
        
        // 排序並取第一集
        if (seriesPosts.length > 0) {
          try {
            seriesPosts.sort((a, b) => {
              const epA = a && a.episode ? parseInt(a.episode) : 0;
              const epB = b && b.episode ? parseInt(b.episode) : 0;
              return epA - epB;
            });
            const firstEpisode = seriesPosts[0];
            if (firstEpisode) {
              console.log(`添加系列 ${seriesName} 的第一集: ${firstEpisode.title}`);
              firstEpisodes.push(firstEpisode);
            }
          } catch (error) {
            console.error(`排序系列 ${seriesName} 文章時出錯:`, error);
          }
        }
      }
      
      // 如果seriesData中沒有找到足夠的系列，嘗試使用series_list
      if (firstEpisodes.length === 0 && data.series_list && Array.isArray(data.series_list)) {
        console.log(`從seriesData中沒有找到其他系列，嘗試使用series_list`);
        
        for (const series of data.series_list) {
          if (!series || !series.name || series.name === excludedSeriesName) {
            continue;
          }
          
          if (series.posts && Array.isArray(series.posts) && series.posts.length > 0) {
            try {
              const sortedPosts = [...series.posts].sort((a, b) => {
                const epA = a && a.episode ? parseInt(a.episode) : 0;
                const epB = b && b.episode ? parseInt(b.episode) : 0;
                return epA - epB;
              });
              
              if (sortedPosts.length > 0) {
                console.log(`從series_list添加系列 ${series.name} 的第一集: ${sortedPosts[0].title}`);
                firstEpisodes.push(sortedPosts[0]);
              }
            } catch (error) {
              console.error(`處理series_list中的系列 ${series.name} 時出錯:`, error);
            }
          }
        }
      }
      
      console.log(`總共檢查了 ${checkedSeries} 個系列，找到 ${validSeries} 個有效系列，獲取 ${firstEpisodes.length} 個其他系列的第一集`);
      return firstEpisodes;
    }

    function getAllSeriesFirstEpisodes(seriesData) {
      let firstEpisodes = [];
      
      // 使用改進版的getOtherSeriesFirstEpisodes，但不排除任何系列
      firstEpisodes = getOtherSeriesFirstEpisodes(seriesData, "");
      
      return firstEpisodes;
    }
  }
  
  function updateNavigation(prevPost, nextPost, prevMessage = '', nextMessage = '') {
    console.log(`更新導航: 上一篇=${prevPost ? prevPost.title : '無'}, 下一篇=${nextPost ? nextPost.title : '無'}`);
    
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