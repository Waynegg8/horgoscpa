document.addEventListener('DOMContentLoaded', function() {
  // FAQ 展開收合功能
  const questions = document.querySelectorAll('.faq-question');
  
  questions.forEach(question => {
    question.addEventListener('click', function() {
      // 切換當前問題的active狀態
      this.classList.toggle('active');
      
      // 獲取回答元素
      const answer = this.nextElementSibling;
      
      // 切換回答顯示狀態
      if (answer.classList.contains('show')) {
        answer.classList.remove('show');
      } else {
        answer.classList.add('show');
      }
    });
  });
  
  // 分類標籤功能
  const categoryTabs = document.querySelectorAll('.category-tab');
  const faqItems = document.querySelectorAll('.faq-item');
  
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有標籤的active狀態
      categoryTabs.forEach(t => t.classList.remove('active'));
      
      // 添加當前標籤的active狀態
      this.classList.add('active');
      
      // 獲取分類
      const category = this.getAttribute('data-category');
      
      // 顯示對應分類的問題
      if (category === 'all') {
        faqItems.forEach(item => item.style.display = 'block');
      } else {
        faqItems.forEach(item => {
          if (item.getAttribute('data-category') === category) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      }
    });
  });
  
  // 默認顯示第一個問題的答案
  if (questions.length > 0) {
    questions[0].click();
  }
  
  // 為分類標籤添加點擊波紋效果
  categoryTabs.forEach(button => {
    button.addEventListener('click', function(e) {
      // 創建波紋元素
      const ripple = document.createElement('div');
      this.appendChild(ripple);
      
      // 設置波紋位置
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 添加波紋樣式
      ripple.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        pointer-events: none;
        width: 5px;
        height: 5px;
        top: ${y}px;
        left: ${x}px;
        transform: translate(-50%, -50%);
        animation: ripple 0.6s ease-out;
      `;
      
      // 波紋動畫結束後移除
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
});