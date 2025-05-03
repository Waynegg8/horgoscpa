/**
 * navbar.js - 霍爾果斯會計師事務所導航欄功能腳本
 * 最後更新日期: 2025-05-05
 * 優化版本 2.0
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
  
  // 處理下拉菜單功能
  function setupDropdowns() {
    if (window.innerWidth <= 850) {
      // 移動設備上為下拉菜單添加點擊功能
      dropdownItems.forEach(item => {
        const dropdownLink = item.querySelector('a');
        const dropdownMenu = item.querySelector('.dropdown-menu');
        
        // 移除之前的事件
        dropdownLink.removeEventListener('click', handleDropdownClick);
        
        // 添加新的事件
        dropdownLink.addEventListener('click', handleDropdownClick);
        
        function handleDropdownClick(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // 關閉其他下拉菜單
          dropdownItems.forEach(otherItem => {
            if (otherItem !== item) {
              const otherMenu = otherItem.querySelector('.dropdown-menu');
              if (otherMenu && otherMenu.classList.contains('show')) {
                otherMenu.classList.remove('show');
              }
            }
          });
          
          // 切換當前下拉菜單
          dropdownMenu.classList.toggle('show');
        }
      });
    } else {
      // 桌面版：移除點擊事件，使用hover
      dropdownItems.forEach(item => {
        const dropdownLink = item.querySelector('a');
        const dropdownMenu = item.querySelector('.dropdown-menu');
        
        // 移除點擊事件
        if (dropdownLink) {
          const clone = dropdownLink.cloneNode(true);
          if (dropdownLink.parentNode) {
            dropdownLink.parentNode.replaceChild(clone, dropdownLink);
          }
        }
        
        // 移除show類
        if (dropdownMenu && dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
        }
      });
    }
  }
  
  // 初始設置
  setupDropdowns();
  
  // 監聽窗口大小變化 - 使用節流函數防止頻繁觸發
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      setupDropdowns();
    }, 250);
  });
  
  // 點擊頁面其他區域關閉下拉菜單
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 850) {
      const isDropdownButton = e.target.closest('.has-dropdown > a');
      if (!isDropdownButton) {
        dropdownItems.forEach(item => {
          const menu = item.querySelector('.dropdown-menu');
          if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
          }
        });
      }
    }
  });
  
  // 導航欄滾動效果 - 使用防抖和節流技術防止抖動
  const siteNav = document.querySelector('.site-nav');
  let lastScrollTop = 0;
  let scrollThrottleTimer;
  
  // 滾動節流函數
  function throttleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 如果滾動位置變化不大，則忽略
    if (Math.abs(scrollTop - lastScrollTop) < 5) {
      return;
    }
    
    // 滾動超過100px時，添加較小的導航欄樣式
    if (scrollTop > 100) {
      siteNav.classList.add('nav-scrolled');
    } else {
      siteNav.classList.remove('nav-scrolled');
    }
    
    // 更新最後滾動位置
    lastScrollTop = scrollTop;
  }
  
  // 使用 requestAnimationFrame 優化滾動處理
  function onScroll() {
    if (!scrollThrottleTimer) {
      scrollThrottleTimer = setTimeout(function() {
        scrollThrottleTimer = null;
        requestAnimationFrame(throttleScroll);
      }, 100); // 100ms 的節流
    }
  }
  
  // 監聽滾動事件
  window.addEventListener('scroll', onScroll);
  
  // 平滑滾動到頁面頂部
  document.querySelector('.logo a').addEventListener('click', function(e) {
    if (currentPath === '/' || currentPath === '/index.html') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
  
  // 為CTA按鈕添加點擊波紋效果
  const ctaButtons = document.querySelectorAll('.nav-consult-btn, .nav-line-btn');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
  
  // 關閉漢堡選單當點擊選單項目
  const navMenuItems = document.querySelectorAll('.nav-menu a');
  const navToggle = document.getElementById('nav-toggle');
  
  navMenuItems.forEach(item => {
    item.addEventListener('click', function() {
      if (window.innerWidth <= 850 && navToggle.checked) {
        // 延遲關閉導航，讓用戶能看到點擊效果
        setTimeout(() => {
          navToggle.checked = false;
        }, 300);
      }
    });
  });
});

// 添加 CSS 樣式 - 波紋效果
document.addEventListener('DOMContentLoaded', function() {
  if (!document.querySelector('style#ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        width: 100px;
        height: 100px;
        margin-top: -50px;
        margin-left: -50px;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
});