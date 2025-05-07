/**
 * blog-categories-loader.js - 霍爾果斯會計師事務所部落格頁面分類動態載入
 * 最後更新日期: 2025-05-17
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
        button.className = 'filter-btn';
        button.setAttribute('data-category', category.id);
        button.textContent = category.name;
        
        // 設置當前選中的分類
        if (window.currentCategory === category.id) {
          button.classList.add('active');
        }
        
        // 如果有統計數據，在按鈕上顯示數量
        if (category.id !== 'all' && categoryStats[category.id]) {
          button.setAttribute('title', `${categoryStats[category.id]} 篇文章`);
        }
        
        categoryFilter.appendChild(button);
      }
    });
    
    // 注意: 不在這裡綁定事件，讓blog.js來處理事件綁定
    console.log('已載入分類按鈕，由主腳本處理事件綁定');
  }
  
  // 延遲執行載入，確保blog.js有機會先載入文章
  setTimeout(loadBlogCategories, 500);
  
  // 提供給主腳本的回調函數，用於在文章資料載入後更新分類
  window.updateBlogCategoryStats = function(stats) {
    categoryStats = stats || {};
    console.log('更新分類統計:', categoryStats);
    loadBlogCategories();
  };
});