/**
 * navbar.js - 霍爾果斯會計師事務所導航欄功能腳本
 * 最後更新日期: 2025-05-03
 */

document.addEventListener('DOMContentLoaded', function() {
  // 獲取當前頁面URL路徑
  const currentPath = window.location.pathname;
  
  // 找到所有導航菜單項目
  const navLinks = document.querySelectorAll('.nav-menu a:not(.nav-consult-btn):not(.nav-line-btn)');
  
  // 為當前頁面添加active類
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    
    // 檢查是否為當前頁面路徑
    if (linkPath === currentPath || 
        (currentPath.includes(linkPath) && linkPath !== '/' && linkPath !== '/index.html')) {
      link.classList.add('active');
    }
  });
  
  // 移動設備下拉菜單處理
  const dropdownItems = document.querySelectorAll('.has-dropdown');
  
  // 在移動設備上為下拉菜單添加點擊切換功能
  if (window.innerWidth <= 850) {
    dropdownItems.forEach(item => {
      const dropdownLink = item.querySelector('a');
      const dropdownMenu = item.querySelector('.dropdown-menu');
      
      // 阻止下拉鏈接的默認行為
      dropdownLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 關閉所有其他的下拉菜單
        dropdownItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.querySelector('.dropdown-menu').classList.remove('show');
          }
        });
        
        // 切換當前下拉菜單的顯示狀態
        dropdownMenu.classList.toggle('show');
      });
    });
  }
  
  // 監聽窗口大小變化，根據屏幕寬度重新啟用或禁用下拉菜單的點擊功能
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 850) {
      // 移動設備上為下拉菜單添加點擊功能
      dropdownItems.forEach(item => {
        const dropdownLink = item.querySelector('a');
        const dropdownMenu = item.querySelector('.dropdown-menu');
        
        // 移除之前的事件監聽器，以避免重複添加
        dropdownLink.removeEventListener('click', handleDropdownClick);
        
        // 添加新的事件監聽器
        dropdownLink.addEventListener('click', handleDropdownClick);
        
        // 處理下拉菜單點擊的函數
        function handleDropdownClick(e) {
          e.preventDefault();
          
          dropdownItems.forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.querySelector('.dropdown-menu').classList.remove('show');
            }
          });
          
          dropdownMenu.classList.toggle('show');
        }
      });
    } else {
      // 當屏幕寬度大於850px時，移除所有的show類和點擊事件
      dropdownItems.forEach(item => {
        const dropdownMenu = item.querySelector('.dropdown-menu');
        dropdownMenu.classList.remove('show');
      });
    }
  });
  
  // 平滑滾動到頁面頂部的功能（可選，當導航欄固定在頂部時很有用）
  document.querySelector('.logo a').addEventListener('click', function(e) {
    if (currentPath === '/' || currentPath === '/index.html') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
  
  // 滾動時的導航欄效果
  const siteNav = document.querySelector('.site-nav');
  let lastScrollTop = 0;
  
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 滾動超過100px時，添加較小的導航欄樣式
    if (scrollTop > 100) {
      siteNav.classList.add('nav-scrolled');
    } else {
      siteNav.classList.remove('nav-scrolled');
    }
    
    lastScrollTop = scrollTop;
  });
});