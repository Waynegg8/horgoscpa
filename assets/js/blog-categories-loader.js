/**
 * blog-categories-loader.js - 霍爾果斯會計師事務所部落格頁面分類動態載入
 * 最後更新日期: 2025-05-17
 * 用途: 將部落格頁面的分類標籤從硬編碼改為動態載入，並顯示所有實際使用的分類
 */

document.addEventListener('DOMContentLoaded', function() {
  // 存儲各分類的文章統計
  let categoryStats = {};
  // 存儲所有實際使用的分類（包括預定義和動態發現的）
  let allCategories = [];
  
  // 預設的分類名稱映射（用於未在中央分類數據中定義的新分類）
  const defaultCategoryNames = {
    'tax': '稅務相關',
    'accounting': '會計資訊',
    'business': '企業經營',
    'finance': '財務規劃',
    'insurance': '保險資訊',
    'legal': '法律法規',
    'international': '跨境稅務',
    'investment': '投資理財'
  };
  
  // 動態載入部落格分類標籤
  function loadBlogCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) {
      console.warn('分類過濾容器不存在，無法初始化分類按鈕');
      return;
    }
    
    // 顯示載入中狀態
    categoryFilter.innerHTML = '<div class="loading-filter">載入分類中...</div>';
    
    try {
      // 從window.allPosts中獲取統計資料（如果可用）
      if (window.allPosts && window.allPosts.posts && Array.isArray(window.allPosts.posts)) {
        // 重新計算分類統計
        categoryStats = {};
        window.allPosts.posts.forEach(post => {
          if (post && post.category) {
            categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
          }
        });
        console.log('從文章數據獲取到分類統計:', categoryStats);
      } else if (window.categoriesData && window.categoriesData.initialStats && window.categoriesData.initialStats.blog) {
        // 使用初始統計數據
        categoryStats = window.categoriesData.initialStats.blog;
        console.log('使用初始分類統計:', categoryStats);
      } else {
        console.warn('沒有可用的分類統計資料');
        categoryStats = {};
      }
      
      // 清空現有內容
      categoryFilter.innerHTML = '';
      
      // 綜合預定義分類和實際分類
      prepareCategories();
      
      // 總是添加「全部」分類
      const allButton = document.createElement('button');
      allButton.className = 'filter-btn';
      allButton.setAttribute('data-category', 'all');
      allButton.textContent = '全部文章';
      
      // 設置當前選中的分類
      const currentCat = window.currentCategory || 'all';
      if (currentCat === 'all') {
        allButton.classList.add('active');
      }
      
      categoryFilter.appendChild(allButton);
      
      // 載入分類按鈕 - 顯示所有有文章的分類
      let visibleCategories = 0;
      
      // 排序分類：先根據文章數量（降序），再根據分類名稱（升序）
      allCategories.sort((a, b) => {
        const countA = categoryStats[a.id] || 0;
        const countB = categoryStats[b.id] || 0;
        
        // 先按文章數量排序
        if (countB !== countA) {
          return countB - countA;
        }
        
        // 文章數量相同時按名稱排序
        return a.name.localeCompare(b.name);
      });
      
      // 添加所有有文章的分類
      allCategories.forEach(category => {
        if (!category || !category.id || category.id === 'all') return;
        
        // 確認分類是否有文章
        const categoryCount = categoryStats[category.id] || 0;
        
        // 只有有文章的類別才顯示
        if (categoryCount > 0) {
          visibleCategories++;
          const button = document.createElement('button');
          button.className = 'filter-btn';
          button.setAttribute('data-category', category.id);
          
          // 顯示分類名稱和文章數量
          button.textContent = `${category.name} (${categoryCount})`;
          
          // 設置當前選中的分類
          if (currentCat === category.id) {
            button.classList.add('active');
          }
          
          categoryFilter.appendChild(button);
        }
      });
      
      console.log(`已載入 ${visibleCategories} 個分類按鈕`);
      
      // 觸發一個自定義事件，通知blog.js分類按鈕已加載完成
      document.dispatchEvent(new CustomEvent('categoriesButtonsLoaded'));
      
    } catch (error) {
      console.error('載入分類時發生錯誤:', error);
      loadFallbackCategories();
    }
  }
  
  // 準備分類列表，合併預定義分類和動態發現的分類
  function prepareCategories() {
    // 重置分類列表
    allCategories = [];
    
    // 先加入預定義分類
    if (window.categoriesData && window.categoriesData.blogCategories && Array.isArray(window.categoriesData.blogCategories)) {
      window.categoriesData.blogCategories.forEach(category => {
        if (category && category.id && category.id !== 'all') {
          allCategories.push({
            id: category.id,
            name: category.name
          });
        }
      });
    }
    
    // 檢查是否有預定義分類中不存在的新分類
    const existingCategoryIds = allCategories.map(cat => cat.id);
    
    Object.keys(categoryStats).forEach(categoryId => {
      if (categoryId && categoryId !== 'all' && !existingCategoryIds.includes(categoryId)) {
        // 找到一個新分類
        console.log(`發現新分類: ${categoryId}`);
        
        // 嘗試從預設映射中獲取顯示名稱，否則使用ID作為名稱
        const categoryName = defaultCategoryNames[categoryId] || 
                       (categoryId.charAt(0).toUpperCase() + categoryId.slice(1));
        
        // 添加到分類列表
        allCategories.push({
          id: categoryId,
          name: categoryName
        });
      }
    });
    
    console.log(`總共找到 ${allCategories.length} 個分類（包括預定義和動態發現的）`);
  }
  
  // 載入後備分類
  function loadFallbackCategories() {
    const categoryFilter = document.querySelector('.category-filter');
    if (!categoryFilter) return;
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    // 添加全部分類
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.setAttribute('data-category', 'all');
    allButton.textContent = '全部文章';
    categoryFilter.appendChild(allButton);
    
    // 添加常用分類
    const defaultCategories = [
      { id: 'tax', name: '稅務相關' },
      { id: 'accounting', name: '會計資訊' },
      { id: 'business', name: '企業經營' }
    ];
    
    defaultCategories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-btn';
      button.setAttribute('data-category', category.id);
      button.textContent = category.name;
      categoryFilter.appendChild(button);
    });
    
    // 觸發一個自定義事件，通知blog.js分類按鈕已加載完成
    document.dispatchEvent(new CustomEvent('categoriesButtonsLoaded'));
  }
  
  // 等待DOM完全加載後執行
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
    
    // 檢查對象是否為空
    if (Object.keys(stats).length === 0) {
      console.log('收到空的分類統計，不進行更新');
      return;
    }
    
    // 檢查是否有變化
    let hasChanges = false;
    
    Object.keys(stats).forEach(key => {
      if (categoryStats[key] !== stats[key]) {
        hasChanges = true;
      }
    });
    
    Object.keys(categoryStats).forEach(key => {
      if (categoryStats[key] !== stats[key]) {
        hasChanges = true;
      }
    });
    
    if (!hasChanges) {
      console.log('分類統計沒有變化，不進行更新');
      return;
    }
    
    console.log('更新分類統計:', stats);
    categoryStats = stats;
    loadBlogCategories();
  };
});