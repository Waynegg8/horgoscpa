javascript
/**
 * index-animation.js - 霍爾果斯會計師事務所首頁動畫效果
 * 實現流動式層疊設計的交互動效
 * 最後更新日期: 2025-05-07
 * 修改: 取消英雄區視差效果
 */

document.addEventListener('DOMContentLoaded', function() {
  // 添加滾動時的元素動畫效果
  const animateOnScroll = function() {
    // 獲取所有需要動畫的元素
    const sections = document.querySelectorAll('.about-section, .services-section, .blog-section');
    const sectionTitles = document.querySelectorAll('.section-title');
    const serviceCards = document.querySelectorAll('.service-card');
    const blogCards = document.querySelectorAll('.blog-card');
    
    // 檢查元素是否在視圖中
    function isElementInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
        rect.bottom >= 0
      );
    }
    
    // 處理區塊標題動畫
    sectionTitles.forEach(title => {
      if (isElementInViewport(title) && !title.classList.contains('animated')) {
        title.classList.add('animated');
        
        // 為標題添加動畫類
        const heading = title.querySelector('h2');
        const description = title.querySelector('p');
        
        if (heading) {
          heading.style.opacity = '0';
          heading.style.transform = 'translateY(20px)';
          setTimeout(() => {
            heading.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heading.style.opacity = '1';
            heading.style.transform = 'translateY(0)';
          }, 100);
        }
        
        if (description) {
          description.style.opacity = '0';
          description.style.transform = 'translateY(20px)';
          setTimeout(() => {
            description.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            description.style.opacity = '1';
            description.style.transform = 'translateY(0)';
          }, 300); // 延遲出現，形成錯位感
        }
      }
    });
    
    // 處理服務卡片動畫
    const visibleServiceCards = Array.from(serviceCards).filter(card => isElementInViewport(card) && !card.classList.contains('animated'));
    
    visibleServiceCards.forEach((card, index) => {
      card.classList.add('animated');
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        card.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 150)); // 依次延遲顯示
    });
    
    // 處理部落格卡片動畫
    const visibleBlogCards = Array.from(blogCards).filter(card => isElementInViewport(card) && !card.classList.contains('animated'));
    
    visibleBlogCards.forEach((card, index) => {
      card.classList.add('animated');
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        card.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 150)); // 依次延遲顯示
    });
  };
  
  // 英雄區視差效果 - 已修改為靜態背景
  const heroParallax = function() {
    const hero = document.querySelector('.home-hero');
    const heroContent = document.querySelector('.hero-content');
    
    if (hero && heroContent) {
      // 設置固定的背景位置，取消動態視差效果
      hero.style.backgroundPosition = 'center center';
      hero.style.backgroundAttachment = 'scroll';
      
      // 移除滾動事件監聽，不再產生視差效果
    }
  };
  
  // 添加裝飾元素
  const addDecorativeElements = function() {
    // 創建服務區的裝飾圓點
    const servicesSection = document.querySelector('.services-section');
    if (servicesSection) {
      const dots = document.createElement('div');
      dots.className = 'decorative-dots';
      servicesSection.appendChild(dots);
      
      // 添加圓點CSS
      const style = document.createElement('style');
      style.textContent = `
        .decorative-dots {
          position: absolute;
          right: 5%;
          bottom: 15%;
          width: 200px;
          height: 200px;
          z-index: 0;
          opacity: 0.1;
          background-image: radial-gradient(circle, var(--secondary-color) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `;
      document.head.appendChild(style);
    }
  };
  
  // 初始執行
  animateOnScroll();
  heroParallax(); // 保留調用，但內部行為已更改
  addDecorativeElements();
  
  // 滾動時執行動畫
  window.addEventListener('scroll', function() {
    animateOnScroll();
  });
  
  // 窗口大小改變時重新計算
  window.addEventListener('resize', function() {
    animateOnScroll();
  });
});