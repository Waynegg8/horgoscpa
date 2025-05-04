/**
 * blog-categories-loader.js - 霍爾果斯會計師事務所部落格頁面分類動態載入
 * 最後更新日期: 2025-05-15
 * 用途: 將部落格頁面的分類標籤從硬編碼改為動態載入
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入中央分類資料
  if (typeof categoriesData === 'undefined') {
    console.error('分類資料尚未載入，請確認categories-data.js是否正確引入');
    return;
  }
  
  // 動態載入部落格分類標籤
  function loadBlogCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) return;
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    // 載入分類
    categoriesData.blogCategories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-btn' + (category.id === 'all' ? ' active' : '');
      button.setAttribute('data-category', category.id);
      button.textContent = category.name;
      categoryFilter.appendChild(button);
    });
    
    // 重新綁定分類按鈕事件
    bindCategoryEvents();
  }
  
  // 綁定分類按鈕事件
  function bindCategoryEvents() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
      // 移除舊有事件監聽器（如果有）
      button.replaceWith(button.cloneNode(true));
      
      // 重新獲取DOM元素
      const newButton = document.querySelector(`.filter-btn[data-category="${button.dataset.category}"]`);
      
      // 添加新的事件監聽器
      newButton.addEventListener('click', function() {
        // 移除所有按鈕的active狀態
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // 設置當前按鈕為active
        this.classList.add('active');
        
        // 如果存在主腳本中的篩選函數，則調用它
        if (typeof filterAndDisplayPosts === 'function') {
          // 設置當前分類
          window.currentCategory = this.dataset.category;
          window.currentPage = 1;
          
          // 更新URL並重新顯示文章
          if (typeof updateURL === 'function') {
            updateURL();
          }
          
          filterAndDisplayPosts();
        } else {
          console.warn('未找到篩選函數，請確認blog.js是否正確載入');
        }
      });
    });
  }
  
  // 執行載入
  loadBlogCategories();
  
  // 提供給主腳本的回調函數
  window.updateBlogCategoryStats = function(stats) {
    // 如果存在側邊欄分類統計，可以在這裡更新
    console.log('Blog category stats updated:', stats);
  };
});