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
      // 在加載 blog-posts.json 後再加載 series.json
      return fetch('/assets/data/series.json?nocache=' + Date.now())
        .then(response => {
          if (!response.ok) {
            console.warn('無法獲取系列數據，將只使用文章數據');
            return { blogData: data, seriesData: null };
          }
          return response.json()
            .then(seriesData => {
              console.log('獲取到系列數據，系列數量:', Object.keys(seriesData.series || {}).length);
              return { blogData: data, seriesData: seriesData };
            });
        })
        .catch(error => {
          console.warn('獲取系列數據時出錯:', error);
          return { blogData: data, seriesData: null };
        });
    })
    .then(result => {
      const { blogData, seriesData } = result;
      
      // 合併數據
      let combinedData = blogData;
      if (seriesData) {
        combinedData.series = seriesData.series || {};
        combinedData.series_list = seriesData.series_list || [];
      }
      
      findAdjacentArticles(combinedData, seriesInfo);
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
    
    // 確保數據完整性
    if (!allPosts || allPosts.length === 0) {
      console.error('沒有文章數據');
      setDefaultState();
      return;
    }
    
    if (seriesInfo.isSeries) {
      console.log('處理系列文章導航');
      handleSeriesArticles(data, seriesInfo);
    } else {
      console.log('處理非系列文章導航');
      handleNonSeriesArticles(allPosts, data, seriesInfo);
    }
    
    function handleSeriesArticles(data, info) {
      const seriesName = info.seriesName;
      const currentEpisode = info.episode;
      
      if (!seriesName || !currentEpisode) {
        console.error('系列信息不完整，無法處理導航');
        setDefaultState();
        return;
      }
      
      console.log(`尋找系列 "${seriesName}" 文章，當前集數: ${currentEpisode}`);
      
      // 從多個來源獲取系列文章
      let seriesPosts = findSeriesPosts(data, seriesName);
      
      if (seriesPosts.length === 0) {
        console.error(`找不到系列 "${seriesName}" 的文章`);
        setDefaultState();
        return;
      }
      
      console.log(`找到系列 "${seriesName}" 的 ${seriesPosts.length} 篇文章`);
      
      // 對系列文章按集數排序
      try {
        seriesPosts.sort((a, b) => {
          const epA = parseInt(a.episode || 0);
          const epB = parseInt(b.episode || 0);
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
          
          // 修正：檢查是否是第一集，如果是則顯示其他系列的第一篇
          if (currentEpisode === 1 || currentEpisode === Math.min(...seriesPosts.map(post => parseInt(post.episode || 0)))) {
            console.log(`當前是系列第一集，尋找其他系列的第一篇作為上一篇`);
            const otherSeriesFirstEpisodes = getOtherSeriesFirstEpisodes(data, seriesName);
            console.log(`找到 ${otherSeriesFirstEpisodes.length} 個其他系列的第一集`);
            
            if (otherSeriesFirstEpisodes.length > 0) {
              prevPost = getRandomItem(otherSeriesFirstEpisodes);
              if (prevPost) {
                prevPost.url = processUrl(prevPost.url);
                prevMessage = '離開此系列，前往其他系列的第一篇';
                console.log(`系列第一集，推薦其他系列的第一篇: ${prevPost.title}`);
              } else {
                console.log(`未能選取其他系列的第一篇`);
              }
            } else {
              console.log(`沒有找到其他系列的第一篇`);
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
            const otherSeriesFirstEpisodes = getOtherSeriesFirstEpisodes(data, seriesName);
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
    
    function handleNonSeriesArticles(posts, data, info) {
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
          
          const seriesFirstEpisodes = getAllSeriesFirstEpisodes(data);
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
    
    // 改進的函數：從多個數據來源尋找系列文章
    function findSeriesPosts(data, seriesName) {
      let seriesPosts = [];
      
      // 方法1: 從 series 物件中尋找
      if (data.series && data.series[seriesName]) {
        console.log(`嘗試從 series 物件中獲取系列 "${seriesName}" 的文章`);
        const seriesData = data.series[seriesName];
        
        if (seriesData) {
          if (Array.isArray(seriesData)) {
            seriesPosts = seriesData;
            console.log(`從 series 物件中獲取到 ${seriesPosts.length} 篇文章（陣列格式）`);
          } else if (seriesData.posts && Array.isArray(seriesData.posts)) {
            seriesPosts = seriesData.posts;
            console.log(`從 series 物件中獲取到 ${seriesPosts.length} 篇文章（物件格式）`);
          }
        }
      }
      
      // 方法2: 從 series_list 陣列中尋找
      if (seriesPosts.length === 0 && data.series_list && Array.isArray(data.series_list)) {
        console.log(`嘗試從 series_list 陣列中獲取系列 "${seriesName}" 的文章`);
        
        const seriesItem = data.series_list.find(series => 
          series && (series.name === seriesName || series.slug === seriesName)
        );
        
        if (seriesItem && seriesItem.posts && Array.isArray(seriesItem.posts)) {
          seriesPosts = seriesItem.posts;
          console.log(`從 series_list 中獲取到 ${seriesPosts.length} 篇文章`);
        }
      }
      
      // 方法3: 從所有文章中過濾
      if (seriesPosts.length === 0 && data.posts && Array.isArray(data.posts)) {
        console.log(`嘗試從所有文章中過濾系列 "${seriesName}" 的文章`);
        
        seriesPosts = data.posts.filter(post => 
          post && post.is_series && 
          (post.series_name === seriesName || post.series_slug === seriesName)
        );
        
        console.log(`從所有文章中過濾出 ${seriesPosts.length} 篇文章`);
      }
      
      return seriesPosts;
    }
    
    // 改進的函數：獲取其他系列的第一篇文章
    function getOtherSeriesFirstEpisodes(data, excludedSeriesName) {
      console.log(`開始獲取除 "${excludedSeriesName}" 外的其他系列第一篇文章`);
      let firstEpisodes = [];
      
      try {
        // 方法1: 從 series 物件中獲取
        if (data.series && typeof data.series === 'object') {
          console.log(`從 series 物件中查找其他系列，共 ${Object.keys(data.series).length} 個系列`);
          
          for (const seriesName in data.series) {
            if (seriesName === excludedSeriesName) continue;
            
            console.log(`處理系列: ${seriesName}`);
            const seriesData = data.series[seriesName];
            
            if (!seriesData) continue;
            
            let seriesPosts = [];
            
            if (Array.isArray(seriesData)) {
              seriesPosts = seriesData;
            } else if (seriesData.posts && Array.isArray(seriesData.posts)) {
              seriesPosts = seriesData.posts;
            }
            
            if (seriesPosts.length > 0) {
              // 排序並取第一集
              seriesPosts.sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              const firstEpisode = seriesPosts[0];
              if (firstEpisode) {
                console.log(`添加系列 ${seriesName} 的第一集: ${firstEpisode.title || '無標題'}`);
                firstEpisodes.push(firstEpisode);
              }
            }
          }
        }
        
        // 方法2: 從 series_list 陣列中獲取
        if (data.series_list && Array.isArray(data.series_list)) {
          console.log(`從 series_list 陣列中查找其他系列，共 ${data.series_list.length} 個系列`);
          
          for (const series of data.series_list) {
            if (!series || !series.name || series.name === excludedSeriesName) continue;
            
            console.log(`處理系列列表中的: ${series.name}`);
            
            if (series.posts && Array.isArray(series.posts) && series.posts.length > 0) {
              // 排序並取第一集
              const sortedPosts = [...series.posts].sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              if (sortedPosts.length > 0) {
                console.log(`添加系列 ${series.name} 的第一集: ${sortedPosts[0].title || '無標題'}`);
                firstEpisodes.push(sortedPosts[0]);
              }
            }
          }
        }
        
        // 方法3: 從所有文章中獲取
        if (firstEpisodes.length === 0 && data.posts && Array.isArray(data.posts)) {
          console.log(`嘗試從所有文章中獲取其他系列的第一集`);
          
          // 獲取所有系列名稱
          const seriesNames = new Set();
          data.posts.forEach(post => {
            if (post && post.is_series && post.series_name && post.series_name !== excludedSeriesName) {
              seriesNames.add(post.series_name);
            }
          });
          
          console.log(`找到 ${seriesNames.size} 個其他系列名稱`);
          
          // 對每個系列，找出第一集
          seriesNames.forEach(seriesName => {
            const seriesPosts = data.posts.filter(post => 
              post && post.is_series && post.series_name === seriesName
            );
            
            if (seriesPosts.length > 0) {
              // 排序並取第一集
              seriesPosts.sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              console.log(`添加系列 ${seriesName} 的第一集: ${seriesPosts[0].title || '無標題'}`);
              firstEpisodes.push(seriesPosts[0]);
            }
          });
        }
        
        console.log(`共找到 ${firstEpisodes.length} 個其他系列的第一集`);
        return firstEpisodes;
      } catch (error) {
        console.error('獲取其他系列第一篇文章時出錯:', error);
        return [];
      }
    }

    // 改進的函數：獲取所有系列的第一篇文章
    function getAllSeriesFirstEpisodes(data) {
      console.log('開始獲取所有系列的第一篇文章');
      let firstEpisodes = [];
      
      try {
        // 方法1: 從 series 物件中獲取
        if (data.series && typeof data.series === 'object') {
          console.log(`從 series 物件中查找系列，共 ${Object.keys(data.series).length} 個系列`);
          
          for (const seriesName in data.series) {
            console.log(`處理系列: ${seriesName}`);
            const seriesData = data.series[seriesName];
            
            if (!seriesData) continue;
            
            let seriesPosts = [];
            
            if (Array.isArray(seriesData)) {
              seriesPosts = seriesData;
            } else if (seriesData.posts && Array.isArray(seriesData.posts)) {
              seriesPosts = seriesData.posts;
            }
            
            if (seriesPosts.length > 0) {
              // 排序並取第一集
              seriesPosts.sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              const firstEpisode = seriesPosts[0];
              if (firstEpisode) {
                console.log(`添加系列 ${seriesName} 的第一集: ${firstEpisode.title || '無標題'}`);
                firstEpisodes.push(firstEpisode);
              }
            }
          }
        }
        
        // 方法2: 從 series_list 陣列中獲取
        if (firstEpisodes.length === 0 && data.series_list && Array.isArray(data.series_list)) {
          console.log(`從 series_list 陣列中查找系列，共 ${data.series_list.length} 個系列`);
          
          for (const series of data.series_list) {
            if (!series || !series.name) continue;
            
            console.log(`處理系列列表中的: ${series.name}`);
            
            if (series.posts && Array.isArray(series.posts) && series.posts.length > 0) {
              // 排序並取第一集
              const sortedPosts = [...series.posts].sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              if (sortedPosts.length > 0) {
                console.log(`添加系列 ${series.name} 的第一集: ${sortedPosts[0].title || '無標題'}`);
                firstEpisodes.push(sortedPosts[0]);
              }
            }
          }
        }
        
        // 方法3: 從所有文章中獲取
        if (firstEpisodes.length === 0 && data.posts && Array.isArray(data.posts)) {
          console.log(`嘗試從所有文章中獲取系列的第一集`);
          
          // 獲取所有系列名稱
          const seriesNames = new Set();
          data.posts.forEach(post => {
            if (post && post.is_series && post.series_name) {
              seriesNames.add(post.series_name);
            }
          });
          
          console.log(`找到 ${seriesNames.size} 個系列名稱`);
          
          // 對每個系列，找出第一集
          seriesNames.forEach(seriesName => {
            const seriesPosts = data.posts.filter(post => 
              post && post.is_series && post.series_name === seriesName
            );
            
            if (seriesPosts.length > 0) {
              // 排序並取第一集
              seriesPosts.sort((a, b) => {
                const epA = parseInt(a.episode || 0);
                const epB = parseInt(b.episode || 0);
                return epA - epB;
              });
              
              console.log(`添加系列 ${seriesName} 的第一集: ${seriesPosts[0].title || '無標題'}`);
              firstEpisodes.push(seriesPosts[0]);
            }
          });
        }
        
        console.log(`共找到 ${firstEpisodes.length} 個系列的第一集`);
        return firstEpisodes;
      } catch (error) {
        console.error('獲取所有系列第一篇文章時出錯:', error);
        return [];
      }
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