/**
 * navbar.js - 霍爾果斯會計師事務所導航欄功能腳本
 * 最後更新日期: 2025-05-06
 * 優化版本 3.1 - 移除下拉菜單後的精簡版
 */

document.addEventListener('DOMContentLoaded', function() {
  // 獲取當前頁面URL路徑
  const currentPath = window.location.pathname;
  
  // 找到所有導航菜單項目
  const navLinks = document.querySelectorAll('.nav-menu a:not(.nav-consult-btn)');
  
  // 為當前頁面添加active類
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    
    // 檢查是否為當前頁面路徑
    if (linkPath === currentPath || 
        (currentPath.includes(linkPath) && linkPath !== '/' && linkPath !== '/index.html') {
      link.classList.add('active');
    }
  });

  // 導航欄滾動效果
  const siteNav = document.querySelector('.site-nav');
  let lastScrollTop = 0;
  let scrollThrottleTimer;
  
  function throttleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) {
      siteNav.classList.add('nav-scrolled');
    } else {
      siteNav.classList.remove('nav-scrolled');
    }
    lastScrollTop = scrollTop;
  }

  window.addEventListener('scroll', function() {
    if (!scrollThrottleTimer) {
      scrollThrottleTimer = setTimeout(function() {
        scrollThrottleTimer = null;
        throttleScroll();
      }, 100);
    }
  });

  // 漢堡菜單功能
  const navToggle = document.getElementById('nav-toggle');
  const navMenuItems = document.querySelectorAll('.nav-menu a');
  
  navMenuItems.forEach(item => {
    item.addEventListener('click', function() {
      if (window.innerWidth <= 850 && navToggle.checked) {
        setTimeout(() => {
          navToggle.checked = false;
        }, 300);
      }
    });
  });

  // 按鈕波紋效果
  function createRipple(event, element) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  document.querySelectorAll('.nav-consult-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      createRipple(e, this);
    });
  });
});