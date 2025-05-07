/**
 * blog-categories-loader.js - 霍爾果斯會計師事務所部落格頁面分類動態載入
 * 最後更新日期: 2025-05-17
 * 用途: 將部落格頁面的分類標籤從硬編碼改為動態載入，並只顯示有文章的分類
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入中央分類資料
  if (typeof window.categoriesData === 'undefined') {
    console.error('分類資料尚未載入，請確認categories-data.js是否正確引入');
    return;
  }
  
  // 存儲各分類的文章統計
  let categoryStats = {};
  
  // 動態載入部落格分類標籤
  function loadBlogCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) {
      console.warn('分類過濾容器不存在，無法初始化分類按鈕');
      return;
    }
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    try {
      // 從window.allPosts中獲取統計資料（如果可用）
      if (window.allPosts && window.allPosts.posts && Array.isArray(window.allPosts.posts)) {
        categoryStats = {};
        window.allPosts.posts.forEach(post => {
          if (post && post.category) {
            categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
          }
        });
        console.log('從文章數據獲取到分類統計:', categoryStats);
      } else {
        // 使用初始統計數據
        categoryStats = window.categoriesData.initialStats.blog || {};
        console.log('使用初始分類統計:', categoryStats);
      }
      
      // 載入分類（僅顯示有文章的分類和"全部"分類）
      if (window.categoriesData && window.categoriesData.blogCategories && Array.isArray(window.categoriesData.blogCategories)) {
        window.categoriesData.blogCategories.forEach(category => {
          if (!category || !category.id) return;
          
          // 只有"全部"類別或有文章的類別才顯示
          if (category.id === 'all' || (categoryStats[category.id] && categoryStats[category.id] > 0)) {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.setAttribute('data-category', category.id);
            button.textContent = category.name;
            
            // 設置當前選中的分類
            const currentCat = window.currentCategory || 'all';
            if (currentCat === category.id) {
              button.classList.add('active');
            }
            
            // 如果有統計數據，在按鈕上顯示數量
            if (category.id !== 'all' && categoryStats[category.id]) {
              button.setAttribute('title', `${categoryStats[category.id]} 篇文章`);
            }
            
            categoryFilter.appendChild(button);
          }
        });
      } else {
        console.warn('無法獲取分類數據或格式不正確');
      }
      
      console.log('已載入分類按鈕');
      
      // 觸發一個自定義事件，通知blog.js分類按鈕已加載完成
      document.dispatchEvent(new CustomEvent('categoriesButtonsLoaded'));
      
    } catch (error) {
      console.error('載入分類時發生錯誤:', error);
      
      // 顯示最基本的分類作為後備方案
      const allButton = document.createElement('button');
      allButton.className = 'filter-btn active';
      allButton.setAttribute('data-category', 'all');
      allButton.textContent = '全部文章';
      categoryFilter.appendChild(allButton);
    }
  }
  
  // 等待DOM完全加載後執行，不使用setTimeout
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadBlogCategories();
  } else {
    document.addEventListener('DOMContentLoaded', loadBlogCategories);
  }
  
  // 監聽blog.js發出的數據加載完成事件
  document.addEventListener('blogDataLoaded', function() {
    console.log('收到blogDataLoaded事件，重新加載分類');
    loadBlogCategories();
  });
  
  // 提供給主腳本的回調函數，用於在文章資料載入後更新分類
  window.updateBlogCategoryStats = function(stats) {
    if (!stats) return;
    categoryStats = stats;
    console.log('更新分類統計:', categoryStats);
    loadBlogCategories();
  };
});