document.addEventListener('DOMContentLoaded', function() {
  const postsContainer = document.getElementById('latest-posts-container');
  
  // 如果找不到容器元素，則退出
  if (!postsContainer) return;
  
  /**
   * 顯示錯誤訊息和備用文章
   */
  function showError() {
    postsContainer.innerHTML = `
      <div class="error-message">
        <p>無法載入最新文章，顯示備用內容</p>
      </div>
    `;
    // 顯示備用文章
    showFallbackPosts();
  }
  
  /**
   * 顯示備用文章內容
   */
  function showFallbackPosts() {
    // 備用的文章資料
    const fallbackPosts = [
      {
        title: '跨境電商如何合法節稅？',
        date: '2025-04-10',
        summary: '面對台灣與境外稅務申報差異，電商業者該注意哪些風險與機會？了解如何合法規劃跨境稅務並避免重複課稅。',
        url: '/blog/cross-border-tax.html',
        image: '/assets/images/blog/cross-border-tax.jpg'
      },
      {
        title: '新創公司常見帳務陷阱',
        date: '2025-03-22',
        summary: '從開立發票、勞健保到稅務合規，新創最容易忽略的會計問題整理。避免常見財務錯誤，確保公司財務健全運作。',
        url: '/blog/startup-traps.html',
        image: '/assets/images/blog/startup-accounting.jpg'
      },
      {
        title: '年度稅務規劃指南',
        date: '2025-03-05',
        summary: '提前做好稅務規劃，合理降低稅負，掌握各項扣除額與優惠措施。專業稅務師提供的實用建議，讓您節稅無憂。',
        url: '/blog/tax-planning.html',
        image: '/assets/images/blog/tax-planning.jpg'
      }
    ];
    
    // 先清空容器
    postsContainer.innerHTML = '';
    
    // 重新渲染文章
    fallbackPosts.forEach(post => {
      renderPost(post);
    });
  }
  
  /**
   * 渲染單篇文章
   */
  function renderPost(post) {
    const postElement = document.createElement('article');
    postElement.className = 'blog-card';
    
    postElement.innerHTML = `
      <div class="blog-image">
        <img src="${post.image}" alt="${post.title}">
      </div>
      <div class="blog-content">
        <span class="date">${post.date}</span>
        <h3><a href="${post.url}">${post.title}</a></h3>
        <p>${post.summary}</p>
        <a href="${post.url}" class="read-more">閱讀更多</a>
      </div>
    `;
    
    postsContainer.appendChild(postElement);
  }
  
  /**
   * 從JSON格式加載博客數據
   */
  async function loadPosts() {
    try {
      // 延遲1秒，顯示載入中狀態
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 嘗試加載最新文章資料
      const response = await fetch('/assets/data/latest-posts.json');
      
      if (!response.ok) {
        throw new Error('無法獲取文章資料');
      }
      
      const posts = await response.json();
      
      // 清空容器
      postsContainer.innerHTML = '';
      
      // 渲染最新的3篇文章
      const recentPosts = posts.slice(0, 3);
      recentPosts.forEach(post => {
        renderPost(post);
      });
      
    } catch (error) {
      console.error('載入文章時發生錯誤:', error);
      showError();
    }
  }
  
  // 執行載入
  loadPosts();
});