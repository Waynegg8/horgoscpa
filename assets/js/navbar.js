/**
 * navbar.js - 霍爾果斯會計師事務所導航欄功能腳本
 * 最後更新日期: 2025-05-06
 * 優化版本 3.0 - 現代簡約設計
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
        if (dropdownLink._clickHandler) {
          dropdownLink.removeEventListener('click', dropdownLink._clickHandler);
        }
        
        // 創建新的事件處理程序
        dropdownLink._clickHandler = function(e) {
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
        };
        
        // 添加新的事件
        dropdownLink.addEventListener('click', dropdownLink._clickHandler);
      });
    } else {
      // 桌面版：移除點擊事件，使用hover
      dropdownItems.forEach(item => {
        const dropdownLink = item.querySelector('a');
        const dropdownMenu = item.querySelector('.dropdown-menu');
        
        // 移除點擊事件
        if (dropdownLink && dropdownLink._clickHandler) {
          dropdownLink.removeEventListener('click', dropdownLink._clickHandler);
          dropdownLink._clickHandler = null;
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
  let scrollDirectionChangeCount = 0;
  let prevScrollDirection = null;
  
  // 滾動節流函數
  function throttleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 忽略微小的滾動變化
    if (Math.abs(scrollTop - lastScrollTop) < 5) {
      return;
    }
    
    // 檢測滾動方向變化
    const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
    if (prevScrollDirection !== null && prevScrollDirection !== currentScrollDirection) {
      scrollDirectionChangeCount++;
    } else {
      scrollDirectionChangeCount = 0;
    }
    prevScrollDirection = currentScrollDirection;
    
    // 如果短時間內滾動方向變化超過閾值，忽略此次滾動處理以防止抖動
    if (scrollDirectionChangeCount > 3) {
      return;
    }
    
    // 滾動超過閾值時，添加捲動樣式
    if (scrollTop > 50) {
      if (!siteNav.classList.contains('nav-scrolled')) {
        requestAnimationFrame(() => {
          siteNav.classList.add('nav-scrolled');
        });
      }
    } else {
      if (siteNav.classList.contains('nav-scrolled')) {
        requestAnimationFrame(() => {
          siteNav.classList.remove('nav-scrolled');
        });
      }
    }
    
    // 更新最後滾動位置
    lastScrollTop = scrollTop;
  }
  
  // 使用 requestAnimationFrame 優化滾動處理
  function onScroll() {
    if (!scrollThrottleTimer) {
      scrollThrottleTimer = setTimeout(function() {
        scrollThrottleTimer = null;
        throttleScroll();
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
  
  // 波紋效果函數
  function createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const diameter = Math.max(rect.width, rect.height) * 2;
    const radius = diameter / 2;
    
    const ripple = document.createElement('span');
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${x - radius}px`;
    ripple.style.top = `${y - radius}px`;
    ripple.classList.add('ripple-effect');
    
    const existingRipple = element.querySelector('.ripple-effect');
    if (existingRipple) {
      existingRipple.remove();
    }
    
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  // 為CTA按鈕添加點擊波紋效果
  const ctaButtons = document.querySelectorAll('.nav-consult-btn');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      createRipple(e, this);
    });
  });
  
  // 關閉漢堡選單當點擊選單項目
  const navMenuItems = document.querySelectorAll('.nav-menu a:not(.has-dropdown > a)');
  const navToggle = document.getElementById('nav-toggle');
  
  navMenuItems.forEach(item => {
    item.addEventListener('click', function() {
      if (window.innerWidth <= 850 && navToggle.checked) {
        // 延遲關閉導航，讓用戶能看到點擊效果
        setTimeout(() => {
          navToggle.checked = false;
          
          // 關閉所有打開的下拉菜單
          dropdownItems.forEach(item => {
            const menu = item.querySelector('.dropdown-menu');
            if (menu && menu.classList.contains('show')) {
              menu.classList.remove('show');
            }
          });
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
      }
      
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
});