/**
 * mobile-navbar.js - 霍爾果斯會計師事務所移動版導航欄功能
 * 最後更新日期: 2025-05-10
 */

document.addEventListener('DOMContentLoaded', function() {
  // 檢查是否為移動設備
  const isMobile = window.innerWidth <= 850;
  
  // 獲取元素
  const mobileNavbar = document.querySelector('.mobile-navbar');
  const siteNav = document.querySelector('.site-nav');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  
  // 根據設備顯示對應導航欄
  if (isMobile) {
    if (mobileNavbar) mobileNavbar.style.display = 'block';
    if (siteNav) siteNav.style.display = 'none';
  }
  
  // 窗口大小變化時重新檢查
  window.addEventListener('resize', function() {
    const isNowMobile = window.innerWidth <= 850;
    
    if (isNowMobile) {
      if (mobileNavbar) mobileNavbar.style.display = 'block';
      if (siteNav) siteNav.style.display = 'none';
    } else {
      if (mobileNavbar) mobileNavbar.style.display = 'none';
      if (siteNav) siteNav.style.display = 'block';
    }
  });
  
  // 菜單按鈕點擊事件
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenu.classList.toggle('open');
      
      // 切換菜單圖標
      const icon = this.querySelector('span');
      if (mobileMenu.classList.contains('open')) {
        icon.textContent = 'close';
      } else {
        icon.textContent = 'menu';
      }
    });
  }
  
  // 點擊鏈接後關閉菜單
  if (mobileLinks) {
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.remove('open');
        mobileMenuBtn.querySelector('span').textContent = 'menu';
      });
    });
  }
  
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
});