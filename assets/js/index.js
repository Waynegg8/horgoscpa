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
        <p>無法載入最新文章</p>
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
    
    // 為每個卡片添加點擊事件
    addCardClickEvents();
  }
  
  /**
   * 渲染單篇文章
   */
  function renderPost(post) {
    const postElement = document.createElement('article');
    postElement.className = 'blog-card';
    
    postElement.innerHTML = `
      <!-- 添加覆蓋整個卡片的連結 -->
      <a href="${post.url}" class="blog-card-link">閱讀完整文章</a>
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
   * 為文章卡片添加點擊事件
   */
  function addCardClickEvents() {
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach(card => {
      card.addEventListener('click', function(e) {
        // 如果不是點擊特定元素，才進行跳轉
        if (!e.target.closest('a.read-more') && !e.target.closest('a h3') && !e.target.closest('button')) {
          // 获取卡片内的链接并跳转
          const link = this.querySelector('.blog-card-link');
          if (link) {
            window.location.href = link.href;
          }
        }
      });
    });
  }
  
  /**
   * 從JSON格式加載博客數據
   * 同時處理新舊兩種格式的JSON
   */
  async function loadPosts() {
    try {
      // 顯示載入中狀態（可選）
      postsContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>正在載入最新文章...</p>
        </div>
      `;
      
      // 嘗試加載最新文章資料
      const response = await fetch('/assets/data/latest-posts.json');
      
      if (!response.ok) {
        throw new Error('無法獲取文章資料');
      }
      
      let responseData = await response.json();
      
      // 處理可能的資料結構差異 - 支援新舊格式
      // 1. 如果資料是陣列，則直接使用
      // 2. 如果資料有 latest_posts 欄位，則使用該欄位的值
      let posts = Array.isArray(responseData) ? responseData : 
                  (responseData.latest_posts ? responseData.latest_posts : []);
      
      // 如果取得的不是陣列或無資料，顯示錯誤
      if (!Array.isArray(posts) || posts.length === 0) {
        console.error('文章資料格式不正確或無資料');
        showError();
        return;
      }
      
      // 清空容器
      postsContainer.innerHTML = '';
      
      // 渲染最新的3篇文章
      const recentPosts = posts.slice(0, 3);
      recentPosts.forEach(post => {
        renderPost(post);
      });
      
      // 為卡片添加點擊事件
      addCardClickEvents();
      
    } catch (error) {
      console.error('載入文章時發生錯誤:', error);
      showError();
    }
  }
  
  // 執行載入
  loadPosts();
  
  // 處理服務卡片點擊
  const serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // 如果不是點擊具體的鏈接或按鈕，才進行跳轉
      if (!e.target.closest('a.read-more') && !e.target.closest('button')) {
        // 獲取卡片內的第一個鏈接并跳轉
        const link = this.querySelector('.service-card-link');
        if (link) {
          window.location.href = link.href;
        }
      }
    });
  });
});