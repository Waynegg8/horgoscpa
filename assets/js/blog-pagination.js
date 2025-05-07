/**
 * 完全替代的分頁解決方案 - 作為獨立腳本
 * 保存為 /assets/js/blog-pagination.js
 */
document.addEventListener('DOMContentLoaded', function() {
  // 核心參數
  const POSTS_PER_PAGE = 6;
  
  // 關鍵DOM元素
  const blogPostsContainer = document.getElementById('blog-posts-container');
  const paginationContainer = document.getElementById('pagination-container');
  
  // 初始化
  initPagination();
  
  function initPagination() {
    // 取得所有博客卡片
    const allCards = document.querySelectorAll('.blog-card');
    if (!allCards.length || !paginationContainer) return;
    
    console.log(`找到 ${allCards.length} 篇文章`);
    
    // 計算總頁數
    const totalPages = Math.ceil(allCards.length / POSTS_PER_PAGE);
    console.log(`總共 ${totalPages} 頁`);
    
    if (totalPages <= 1) {
      // 只有一頁，不需要分頁
      paginationContainer.style.display = 'none';
      return;
    }
    
    // 創建分頁按鈕
    createPaginationButtons(totalPages);
    
    // 初始顯示第一頁
    showPage(1);
    
    // 設置分頁點擊事件
    paginationContainer.addEventListener('click', function(e) {
      e.preventDefault();
      const button = e.target.closest('.pagination-btn:not(.disabled)');
      if (button) {
        const page = parseInt(button.dataset.page, 10);
        if (page) {
          // 顯示選中頁面的文章
          showPage(page);
          
          // 更新按鈕狀態
          updateButtonsState(page);
          
          // 滾動到頂部
          window.scrollTo({
            top: blogPostsContainer.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      }
    });
  }
  
  function createPaginationButtons(totalPages) {
    let html = '';
    
    // 上一頁按鈕
    html += `
      <button class="pagination-btn prev-btn disabled" data-page="prev" aria-label="上一頁" disabled>
        <span class="material-symbols-rounded">navigate_before</span>
      </button>
    `;
    
    // 頁碼按鈕
    for (let i = 1; i <= totalPages; i++) {
      const active = i === 1 ? 'active' : '';
      html += `
        <button class="pagination-btn page-btn ${active}" data-page="${i}" aria-label="第${i}頁">
          ${i}
        </button>
      `;
    }
    
    // 下一頁按鈕
    const nextDisabled = totalPages === 1 ? 'disabled' : '';
    html += `
      <button class="pagination-btn next-btn ${nextDisabled}" data-page="next" aria-label="下一頁" ${totalPages === 1 ? 'disabled' : ''}>
        <span class="material-symbols-rounded">navigate_next</span>
      </button>
    `;
    
    paginationContainer.innerHTML = html;
  }
  
  function showPage(pageNumber) {
    const allCards = document.querySelectorAll('.blog-card');
    
    // 先隱藏所有卡片
    allCards.forEach(card => {
      card.style.display = 'none';
    });
    
    // 計算當前頁要顯示的卡片範圍
    const startIndex = (pageNumber - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, allCards.length);
    
    console.log(`顯示第 ${pageNumber} 頁，索引範圍: ${startIndex} 到 ${endIndex-1}`);
    
    // 顯示當前頁的卡片
    for (let i = startIndex; i < endIndex; i++) {
      if (allCards[i]) {
        allCards[i].style.display = 'flex';
      }
    }
  }
  
  function updateButtonsState(currentPage) {
    // 更新頁碼按鈕狀態
    const pageButtons = document.querySelectorAll('.pagination-btn.page-btn');
    pageButtons.forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.page) === currentPage) {
        btn.classList.add('active');
      }
    });
    
    // 更新前/後按鈕狀態
    const prevButton = document.querySelector('.pagination-btn.prev-btn');
    const nextButton = document.querySelector('.pagination-btn.next-btn');
    const totalPages = pageButtons.length;
    
    if (prevButton) {
      if (currentPage === 1) {
        prevButton.classList.add('disabled');
        prevButton.setAttribute('disabled', '');
      } else {
        prevButton.classList.remove('disabled');
        prevButton.removeAttribute('disabled');
        prevButton.dataset.page = currentPage - 1;
      }
    }
    
    if (nextButton) {
      if (currentPage === totalPages) {
        nextButton.classList.add('disabled');
        nextButton.setAttribute('disabled', '');
      } else {
        nextButton.classList.remove('disabled');
        nextButton.removeAttribute('disabled');
        nextButton.dataset.page = currentPage + 1;
      }
    }
  }
});