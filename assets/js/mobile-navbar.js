/**
 * mobile-navbar.js - 霍爾果斯會計師事務所移動版導航欄功能
 * 最後更新日期: 2025-05-10
 */

document.addEventListener('DOMContentLoaded', function() {
  // 獲取元素
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const mobileBtnIcon = document.querySelector('.mobile-menu-btn span');
  
  // 菜單按鈕點擊事件
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 防止事件冒泡
      mobileMenu.classList.toggle('open');
      
      // 切換圖標
      if (mobileBtnIcon) {
        mobileBtnIcon.textContent = mobileMenu.classList.contains('open') ? 'close' : 'menu';
      }
    });
  }
  
  // 點擊鏈接後關閉菜單
  if (mobileLinks) {
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.remove('open');
        if (mobileBtnIcon) mobileBtnIcon.textContent = 'menu';
      });
    });
  }
  
  // 點擊頁面其他區域關閉菜單
  document.addEventListener('click', function(e) {
    if (mobileMenu && mobileMenu.classList.contains('open')) {
      // 檢查點擊是否在菜單區域外
      if (!e.target.closest('.mobile-menu') && !e.target.closest('.mobile-menu-btn')) {
        mobileMenu.classList.remove('open');
        if (mobileBtnIcon) mobileBtnIcon.textContent = 'menu';
      }
    }
  });
  
  // 設置當前頁面的活動狀態
  const currentPath = window.location.pathname;
  if (mobileLinks) {
    mobileLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      
      // 檢查是否為當前頁面路徑
      if (linkPath === currentPath || 
          (currentPath.includes(linkPath) && linkPath !== '/' && linkPath !== '/index.html')) {
        link.classList.add('active');
      }
    });
  }
  
  // 調整內容區域的頂部間距
  const adjustContentPadding = function() {
    if (window.innerWidth <= 850) {
      document.body.style.paddingTop = '60px';
    } else {
      document.body.style.paddingTop = '0';
    }
  };
  
  // 初始調整
  adjustContentPadding();
  
  // 窗口大小變化時重新調整
  window.addEventListener('resize', adjustContentPadding);
});