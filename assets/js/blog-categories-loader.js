/**
 * blog-categories-loader.js - 霍爾果斯會計師事務所部落格頁面分類動態載入
 * 最後更新日期: 2025-05-16
 * 用途: 將部落格頁面的分類標籤從硬編碼改為動態載入，並只顯示有文章的分類
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入中央分類資料
  if (typeof categoriesData === 'undefined') {
    console.error('分類資料尚未載入，請確認categories-data.js是否正確引入');
    return;
  }
  
  // 存儲各分類的文章統計
  let categoryStats = {};
  
  // 動態載入部落格分類標籤
  function loadBlogCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) return;
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    // 從window.allPosts中獲取統計資料（如果可用）
    if (window.allPosts && window.allPosts.posts && Array.isArray(window.allPosts.posts)) {
      categoryStats = {};
      window.allPosts.posts.forEach(post => {
        if (post.category) {
          categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
        }
      });
      console.log('從文章數據獲取到分類統計:', categoryStats);
    } else {
      // 使用初始統計數據
      categoryStats = categoriesData.initialStats.blog || {};
      console.log('使用初始分類統計:', categoryStats);
    }
    
    // 載入分類（僅顯示有文章的分類和"全部"分類）
    categoriesData.blogCategories.forEach(category => {
      // 只有"全部"類別或有文章的類別才顯示
      if (category.id === 'all' || categoryStats[category.id] > 0) {
        const button = document.createElement('button');
        button.className = 'filter-btn' + (category.id === 'all' ? ' active' : '');
        button.setAttribute('data-category', category.id);
        button.textContent = category.name;
        
        // 如果有統計數據，在按鈕上顯示數量
        if (category.id !== 'all' && categoryStats[category.id]) {
          button.setAttribute('title', `${categoryStats[category.id]} 篇文章`);
        }
        
        categoryFilter.appendChild(button);
      }
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
      if (!newButton) return; // 確保按鈕存在
      
      // 添加新的事件監聽器
      newButton.addEventListener('click', function() {
        // 移除所有按鈕的active狀態
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        
        // 設置當前按鈕為active
        this.classList.add('active');
        
        // 如果存在主腳本中的篩選函數，則調用它
        if (typeof window.filterAndDisplayPosts === 'function') {
          // 設置當前分類
          window.currentCategory = this.dataset.category;
          window.currentPage = 1;
          
          // 更新URL並重新顯示文章
          if (typeof window.updateURL === 'function') {
            window.updateURL();
          }
          
          window.filterAndDisplayPosts();
        } else {
          console.warn('未找到篩選函數，請確認blog.js是否正確載入');
        }
      });
    });
  }
  
  // 延遲執行載入，確保blog.js有機會先載入文章
  setTimeout(loadBlogCategories, 500);
  
  // 提供給主腳本的回調函數，用於在文章資料載入後更新分類
  window.updateBlogCategoryStats = function(stats) {
    categoryStats = stats || {};
    console.log('更新分類統計:', categoryStats);
    loadBlogCategories();
  };
})