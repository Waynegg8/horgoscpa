/**
 * video-categories-loader.js - 霍爾果斯會計師事務所影片頁面分類動態載入
 * 最後更新日期: 2025-05-15
 * 用途: 將影片頁面的分類標籤和側邊欄分類從硬編碼改為動態載入
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入中央分類資料
  if (typeof categoriesData === 'undefined') {
    console.error('分類資料尚未載入，請確認categories-data.js是否正確引入');
    return;
  }
  
  // 動態載入影片分類標籤
  function loadVideoCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) return;
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    // 載入分類
    categoriesData.videoCategories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-btn' + (category.id === 'all' ? ' active' : '');
      button.setAttribute('data-category', category.id);
      button.textContent = category.name;
      categoryFilter.appendChild(button);
    });
  }
  
  // 動態載入側邊欄分類統計
  function loadCategorySidebar() {
    const categoryStats = document.querySelector('.category-stats');
    if (!categoryStats) return;
    
    // 清空現有內容
    categoryStats.innerHTML = '';
    
    // 篩選出非"all"的影片分類
    const categories = categoriesData.videoCategories.filter(cat => cat.id !== 'all');
    
    // 載入分類統計
    categories.forEach(category => {
      // 獲取初始統計數據
      const initialCount = categoriesData.initialStats.video[category.id] || 0;
      
      const statDiv = document.createElement('div');
      statDiv.className = 'category-stat';
      statDiv.setAttribute('data-category', category.id);
      
      statDiv.innerHTML = `
        <span class="category-name">${category.name}</span>
        <span class="category-count">${initialCount}</span>
      `;
      
      categoryStats.appendChild(statDiv);
    });
  }
  
  // 執行載入
  loadVideoCategories();
  loadCategorySidebar();
  
  // 提供給主腳本的回調函數
  window.updateCategoryStats = function(stats) {
    const statItems = document.querySelectorAll('.category-stat');
    
    statItems.forEach(item => {
      const category = item.dataset.category;
      const countElement = item.querySelector('.category-count');
      
      if (countElement && stats[category] !== undefined) {
        countElement.textContent = stats[category];
        
        // 如果數量為0，添加視覺提示
        if (stats[category] === 0) {
          item.classList.add('empty-category');
        } else {
          item.classList.remove('empty-category');
        }
      }
    });
  };
});