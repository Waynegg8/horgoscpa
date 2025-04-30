// 首頁輪播功能
document.addEventListener('DOMContentLoaded', function() {
  // 檢查是否存在輪播元素
  const carousel = document.querySelector('.carousel');
  if (carousel) {
    const items = carousel.querySelectorAll('.carousel-item');
    if (items.length > 0) {
      let currentIndex = 0;
      
      // 設置第一個項目為活動狀態
      items[0].classList.add('active');
      
      // 自動輪播函數
      function nextSlide() {
        items[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].classList.add('active');
      }
      
      // 設置定時器，每5秒切換一次
      setInterval(nextSlide, 5000);
    }
  }
  
  // FAQ 展開/收起功能
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const answer = this.nextElementSibling;
      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
      } else {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
  
  // 滾動到頂部按鈕顯示/隱藏
  window.addEventListener('scroll', function() {
    const scrollTopBtn = document.querySelector('.scroll-top-btn');
    if (scrollTopBtn) {
      if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('show');
      } else {
        scrollTopBtn.classList.remove('show');
      }
    }
  });
  
  // 點擊滾動到頂部
  const scrollTopBtn = document.querySelector('.scroll-top-btn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  // 表單驗證
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      let valid = true;
      const requiredFields = contactForm.querySelectorAll('[required]');
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });
      
      // 電子郵件格式驗證
      const emailField = contactForm.querySelector('input[type="email"]');
      if (emailField && emailField.value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailField.value)) {
          valid = false;
          emailField.classList.add('error');
        }
      }
      
      if (!valid) {
        e.preventDefault();
        alert('請檢查表單填寫是否完整且正確。');
      }
    });
  }
  
  // 部落格搜尋功能
  const blogSearch = document.querySelector('.blog-search');
  if (blogSearch) {
    blogSearch.addEventListener('input', function() {
      const searchValue = this.value.toLowerCase();
      const blogCards = document.querySelectorAll('.blog-card');
      
      blogCards.forEach(card => {
        const title = card.querySelector('.blog-title').textContent.toLowerCase();
        const content = card.querySelector('.blog-excerpt').textContent.toLowerCase();
        const tags = card.querySelectorAll('.blog-tag');
        
        let tagMatch = false;
        tags.forEach(tag => {
          if (tag.textContent.toLowerCase().includes(searchValue)) {
            tagMatch = true;
          }
        });
        
        if (title.includes(searchValue) || content.includes(searchValue) || tagMatch) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
});
