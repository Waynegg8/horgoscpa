/**
 * faq-categories-loader.js - 霍爾果斯會計師事務所FAQ頁面分類動態載入
 * 最後更新日期: 2025-05-15
 * 用途: 將FAQ頁面的分類標籤和側邊欄分類統計從硬編碼改為動態載入
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入中央分類資料
  if (typeof categoriesData === 'undefined') {
    console.error('分類資料尚未載入，請確認categories-data.js是否正確引入');
    return;
  }
  
  // 確認是否已載入FAQ資料
  if (typeof faqData === 'undefined') {
    console.error('FAQ資料尚未載入，請確認faq-data.js是否正確引入');
    return;
  }
  
  // 動態載入FAQ分類標籤
  function loadFaqCategories() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // 清空現有內容
    categoryFilter.innerHTML = '';
    
    // 載入分類
    categoriesData.faqCategories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-btn' + (category.id === 'all' ? ' active' : '');
      button.setAttribute('data-category', category.id);
      button.textContent = category.name;
      categoryFilter.appendChild(button);
    });
    
    // 重新綁定分類按鈕事件
    bindCategoryEvents();
  }
  
  // 動態載入側邊欄分類統計
  function loadCategorySidebar() {
    const categoryStats = document.querySelector('.category-stats');
    if (!categoryStats) return;
    
    // 清空現有內容
    categoryStats.innerHTML = '';
    
    // 獲取FAQ分類統計
    const stats = calculateCategoryStats();
    
    // 篩選出非"all"的FAQ分類
    const categories = categoriesData.faqCategories.filter(cat => cat.id !== 'all');
    
    // 載入分類統計
    categories.forEach(category => {
      const statDiv = document.createElement('a');
      statDiv.className = 'category-stat';
      statDiv.setAttribute('data-category', category.id);
      statDiv.href = 'javascript:void(0)';
      
      statDiv.innerHTML = `
        <span class="category-name">${category.name}</span>
        <span class="category-count">${stats[category.id] || 0}</span>
      `;
      
      categoryStats.appendChild(statDiv);
    });
    
    // 綁定側邊欄分類點擊事件
    bindSidebarEvents();
  }
  
  // 計算各分類問題數量
  function calculateCategoryStats() {
    const stats = {};
    
    faqData.questions.forEach(question => {
      if (!stats[question.category]) {
        stats[question.category] = 0;
      }
      stats[question.category]++;
    });
    
    return stats;
  }
  
  // 綁定分類按鈕事件 - 修正選擇問題
  function bindCategoryEvents() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // 清除所有按鈕的之前綁定的事件
    filterButtons.forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });

    // 重新獲取新的按鈕元素
    const newFilterButtons = document.querySelectorAll('.filter-btn');
    
    // 添加新的事件監聽器
    newFilterButtons.forEach(button => {
      button.addEventListener('click', function() {
        // 移除所有按鈕的active狀態
        newFilterButtons.forEach(btn => {
          btn.classList.remove('active');
        });
        
        // 設置當前按鈕為active
        this.classList.add('active');
        
        // 調用FAQ篩選函數
        filterQuestions(this.dataset.category);
      });
    });
  }
  
  // 綁定側邊欄分類點擊事件
  function bindSidebarEvents() {
    const categoryStats = document.querySelectorAll('.category-stat');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    categoryStats.forEach(stat => {
      stat.addEventListener('click', function() {
        const category = this.dataset.category;
        
        // 更新分類按鈕狀態
        filterButtons.forEach(btn => {
          if (btn.dataset.category === category) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        
        // 調用FAQ篩選函數
        filterQuestions(category);
        
        // 滾動到分類按鈕
        document.getElementById('category-filter').scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      });
    });
  }
  
  // 篩選問題顯示
  function filterQuestions(category) {
    const faqItems = document.querySelectorAll('.faq-item');
    
    // 如果是 "all"，顯示所有項目
    if (category === 'all') {
      faqItems.forEach(item => {
        item.style.display = 'block';
      });
      return;
    }
    
    // 否則，只顯示所選類別的項目
    faqItems.forEach(item => {
      if (item.dataset.category === category) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
  // 執行載入
  loadFaqCategories();
  loadCategorySidebar();
});