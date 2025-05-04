/**
 * faq-loader.js - 霍爾果斯會計師事務所FAQ動態載入腳本
 * 最後更新日期: 2025-05-15
 * 用途: 動態載入FAQ資料，取代原有的硬編碼HTML
 */

document.addEventListener('DOMContentLoaded', function() {
  // 確認是否已載入FAQ資料
  if (typeof faqData === 'undefined') {
    console.error('FAQ資料尚未載入，請確認faq-data.js是否正確引入');
    return;
  }
  
  // 主要DOM元素
  const faqContainer = document.getElementById('faq-list');
  const popularQuestionsContainer = document.querySelector('.popular-questions');
  
  // 如果找不到容器元素，則退出
  if (!faqContainer) {
    console.error('找不到FAQ列表容器 (#faq-list)');
    return;
  }
  
  /**
   * 動態載入FAQ問題列表
   */
  function loadFaqQuestions() {
    // 清空現有內容
    faqContainer.innerHTML = '';
    
    // 載入所有問題
    faqData.questions.forEach(questionData => {
      const faqItem = createFaqItem(questionData);
      faqContainer.appendChild(faqItem);
    });
    
    // 綁定問題點擊事件
    bindQuestionEvents();
    
    // 默認展開第一個問題
    const firstQuestion = document.querySelector('.faq-question');
    if (firstQuestion) {
      toggleAnswer(firstQuestion);
    }
  }
  
  /**
   * 動態載入熱門問題列表
   */
  function loadPopularQuestions() {
    if (!popularQuestionsContainer) return;
    
    // 清空現有內容
    popularQuestionsContainer.innerHTML = '';
    
    // 載入熱門問題
    faqData.popularQuestions.forEach(questionId => {
      // 找到對應問題資料
      const questionData = faqData.questions.find(q => q.id === questionId);
      if (!questionData) return;
      
      // 創建列表項目
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${questionId}" class="popular-question-link">${questionData.question}</a>`;
      popularQuestionsContainer.appendChild(li);
    });
    
    // 綁定熱門問題點擊事件
    bindPopularQuestionEvents();
  }
  
  /**
   * 創建FAQ項目元素
   */
  function createFaqItem(questionData) {
    const faqItem = document.createElement('div');
    faqItem.className = 'faq-item';
    faqItem.setAttribute('data-category', questionData.category);
    
    faqItem.innerHTML = `
      <div class="faq-question" id="${questionData.id}">
        <span class="question-icon">Q</span>
        <span class="question-text">${questionData.question}</span>
        <span class="toggle-icon material-symbols-rounded">expand_more</span>
      </div>
      <div class="faq-answer">
        <div class="answer-content">
          ${questionData.answer}
        </div>
      </div>
    `;
    
    return faqItem;
  }
  
  /**
   * 綁定問題點擊事件
   */
  function bindQuestionEvents() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
      question.addEventListener('click', function() {
        toggleAnswer(this);
      });
    });
  }
  
  /**
   * 綁定熱門問題點擊事件
   */
  function bindPopularQuestionEvents() {
    const popularQuestionLinks = document.querySelectorAll('.popular-question-link');
    
    popularQuestionLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const questionId = this.getAttribute('href').substring(1);
        scrollToQuestion(questionId);
      });
    });
  }
  
  /**
   * 切換問題答案顯示/隱藏
   */
  function toggleAnswer(question) {
    // 獲取相關元素
    const answer = question.nextElementSibling;
    const isActive = question.classList.contains('active');
    
    // 切換狀態
    if (isActive) {
      // 收合
      question.classList.remove('active');
      answer.style.maxHeight = '0';
      
      // 延遲移除 show 類以保留過渡動畫
      setTimeout(() => {
        answer.classList.remove('show');
      }, 10);
    } else {
      // 展開
      question.classList.add('active');
      answer.classList.add('show');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  }
  
  /**
   * 捲動至指定問題並展開
   */
  function scrollToQuestion(questionId) {
    const question = document.getElementById(questionId);
    if (question) {
      // 捲動到問題
      window.scrollTo({
        top: question.offsetTop - 100,
        behavior: 'smooth'
      });
      
      // 展開答案
      if (!question.classList.contains('active')) {
        toggleAnswer(question);
      }
      
      // 添加一個小動畫以突顯問題
      question.style.backgroundColor = '#e5efff';
      setTimeout(() => {
        question.style.backgroundColor = '';
        question.style.transition = 'background-color 1s ease';
      }, 100);
    }
  }
  
  // 執行載入
  loadFaqQuestions();
  loadPopularQuestions();
  
  // 如果 URL 包含問題 ID 的錨點，則滾動到相應的問題
  if (window.location.hash) {
    const questionId = window.location.hash.substring(1);
    setTimeout(() => {
      scrollToQuestion(questionId);
    }, 500);
  }
  
  // 全局公開 filterQuestions 函數，方便其他腳本調用
  window.filterQuestions = function(category) {
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
  };
  
  // 展開所有問題
  window.expandAll = function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
      // 只對當前可見的項目進行操作
      if (item.style.display !== 'none') {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (!question.classList.contains('active')) {
          question.classList.add('active');
          answer.classList.add('show');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      }
    });
  };
  
  // 收合所有問題
  window.collapseAll = function() {
    const faqQuestions = document.querySelectorAll('.faq-question.active');
    
    faqQuestions.forEach(question => {
      toggleAnswer(question);
    });
  };
  
  // 綁定展開/收合所有按鈕
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', window.expandAll);
  }
  
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', window.collapseAll);
  }
});