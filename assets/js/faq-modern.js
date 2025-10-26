/**
 * faq-modern.js - 霍爾果斯會計師事務所常見問題頁面功能腳本
 * 最後更新日期: 2025-05-04
 * 基於現有faq.js進行優化，增加了搜索功能和展開/收合控制
 */

document.addEventListener('DOMContentLoaded', () => {
    // FAQ Toggle Functionality
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const answer = faqItem.querySelector('.faq-answer');
            const icon = question.querySelector('.faq-icon');

            const isActive = faqItem.classList.contains('active');

            // Close all other FAQ items in the same category
            const category = faqItem.closest('.faq-category');
            if (category) {
                category.querySelectorAll('.faq-item').forEach(item => {
                    if (item !== faqItem) {
                        item.classList.remove('active');
                        item.querySelector('.faq-answer').style.maxHeight = null;
                        item.querySelector('.faq-icon').textContent = 'expand_more';
                    }
                });
            }

            if (isActive) {
                faqItem.classList.remove('active');
                answer.style.maxHeight = null;
                icon.textContent = 'expand_more';
            } else {
                faqItem.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
                icon.textContent = 'expand_less';
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
  // 獲取元素
  const faqItems = document.querySelectorAll('.faq-item');
  const faqQuestions = document.querySelectorAll('.faq-question');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const categoryStats = document.querySelectorAll('.category-stat');
  const popularQuestionLinks = document.querySelectorAll('.popular-question-link');
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  const searchInput = document.getElementById('faq-search');
  const searchBtn = document.getElementById('search-btn');
  const searchResultsInfo = document.getElementById('search-results-info');
  const searchCount = document.getElementById('search-count');
  
  // 保存所有問題和答案的原始數據，用於搜索
  const faqData = [];
  faqItems.forEach(item => {
    const question = item.querySelector('.question-text').textContent;
    const answer = item.querySelector('.answer-content').textContent;
    const category = item.dataset.category;
    const id = item.querySelector('.faq-question').id;
    
    faqData.push({
      element: item,
      question: question,
      answer: answer,
      category: category,
      id: id,
      visible: true
    });
  });
  
  /**
   * 切換單個問題答案
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
   * 過濾問題 - 更新為使用全局函數
   */
  function filterQuestions(category) {
    if (typeof window.filterQuestions === 'function') {
      // 使用全局函數進行過濾
      window.filterQuestions(category);
    } else {
      // 備用：如果全局函數不存在，使用本地實現
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
    }
  }
  
  /**
   * 搜索問題
   */
  function searchQuestions(searchTerm) {
    if (!searchTerm) {
      // 如果搜索詞為空，重置所有問題的可見性
      faqData.forEach(item => {
        item.visible = true;
        item.element.style.display = 'block';
        
        // 移除之前的高亮
        const questionText = item.element.querySelector('.question-text');
        questionText.innerHTML = item.question;
        
        // 恢復答案內容
        const answerContent = item.element.querySelector('.answer-content');
        const paragraphs = answerContent.querySelectorAll('p, li');
        paragraphs.forEach(p => {
          if (p.innerHTML.includes('<span class="highlight">')) {
            p.innerHTML = p.innerHTML.replace(/<span class="highlight">|<\/span>/g, '');
          }
        });
      });
      
      searchResultsInfo.style.display = 'none';
      return;
    }
    
    searchTerm = searchTerm.toLowerCase();
    let visibleCount = 0;
    
    // 遍歷所有問題，根據搜尋詞過濾
    faqData.forEach(item => {
      const questionLower = item.question.toLowerCase();
      const answerLower = item.answer.toLowerCase();
      
      // 檢查問題或答案是否包含搜尋詞
      if (questionLower.includes(searchTerm) || answerLower.includes(searchTerm)) {
        item.visible = true;
        item.element.style.display = 'block';
        visibleCount++;
        
        // 高亮匹配的文本
        const questionText = item.element.querySelector('.question-text');
        questionText.innerHTML = highlightText(item.question, searchTerm);
        
        // 高亮答案內容
        const answerContent = item.element.querySelector('.answer-content');
        const paragraphs = answerContent.querySelectorAll('p, li');
        paragraphs.forEach(p => {
          if (p.textContent.toLowerCase().includes(searchTerm)) {
            p.innerHTML = highlightText(p.textContent, searchTerm);
          }
        });
      } else {
        item.visible = false;
        item.element.style.display = 'none';
      }
    });
    
    // 更新搜尋結果計數
    searchCount.textContent = visibleCount;
    searchResultsInfo.style.display = 'block';
    
    // 如果沒有結果，顯示提示
    if (visibleCount === 0) {
      const faqList = document.getElementById('faq-list');
      const noResultsElement = document.createElement('div');
      noResultsElement.className = 'no-results';
      noResultsElement.innerHTML = `
        <p>找不到符合「${searchTerm}」的問題。</p>
        <p>請嘗試其他關鍵詞，或瀏覽所有問題。</p>
      `;
      
      // 移除之前的"無結果"提示
      const existingNoResults = faqList.querySelector('.no-results');
      if (existingNoResults) {
        faqList.removeChild(existingNoResults);
      }
      
      faqList.appendChild(noResultsElement);
    } else {
      // 移除"無結果"提示
      const existingNoResults = document.querySelector('.no-results');
      if (existingNoResults) {
        existingNoResults.parentNode.removeChild(existingNoResults);
      }
    }
  }
  
  /**
   * 高亮顯示匹配的文本
   */
  function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const searchTermLower = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    let result = '';
    let lastIndex = 0;
    
    // 找到所有匹配項並添加高亮
    let index = lowerText.indexOf(searchTermLower);
    while (index !== -1) {
      // 添加前面的文本
      result += text.substring(lastIndex, index);
      // 添加高亮的匹配文本
      result += `<span class="highlight">${text.substring(index, index + searchTerm.length)}</span>`;
      
      lastIndex = index + searchTerm.length;
      index = lowerText.indexOf(searchTermLower, lastIndex);
    }
    
    // 添加剩餘的文本
    result += text.substring(lastIndex);
    return result;
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
  
  // ===== 事件監聽器 =====
  
  // 問題點擊事件
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      toggleAnswer(this);
    });
  });
  
  // 分類標籤點擊事件
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 更新標籤狀態
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // 過濾問題
      const category = this.dataset.category;
      filterQuestions(category);
      
      // 重置搜尋
      if (searchInput.value) {
        searchInput.value = '';
        searchQuestions('');
      }
    });
  });
  
  // 側邊欄分類點擊事件
  categoryStats.forEach(stat => {
    stat.addEventListener('click', function() {
      const category = this.dataset.category;
      
      // 更新分類按鈕狀態
      filterButtons.forEach(btn => {
        if (btn.dataset.category === category) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      
      // 過濾問題
      filterQuestions(category);
      
      // 重置搜尋
      if (searchInput.value) {
        searchInput.value = '';
        searchQuestions('');
      }
      
      // 滾動到分類按鈕
      document.getElementById('category-filter').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    });
  });
  
  // 熱門問題點擊事件
  popularQuestionLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const questionId = this.getAttribute('href').substring(1);
      scrollToQuestion(questionId);
    });
  });
  
  // 展開所有按鈕事件
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', function() {
      if (typeof window.expandAll === 'function') {
        window.expandAll();
      }
    });
  }
  
  // 收合所有按鈕事件
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', function() {
      if (typeof window.collapseAll === 'function') {
        window.collapseAll();
      }
    });
  }
  
  // 搜尋輸入事件
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchQuestions(this.value.trim());
    });
  }
  
  // 搜尋按鈕點擊事件
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      searchQuestions(searchInput.value.trim());
    });
  }
  
  // 搜尋框回車事件
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchQuestions(this.value.trim());
      }
    });
  }
  
  // 默認展開第一個問題
  if (faqQuestions.length > 0) {
    toggleAnswer(faqQuestions[0]);
  }
  
  // 如果 URL 包含問題 ID 的錨點，則滾動到相應的問題
  if (window.location.hash) {
    const questionId = window.location.hash.substring(1);
    setTimeout(() => {
      scrollToQuestion(questionId);
    }, 500);
  }
  
  // 為所有分類按鈕添加波紋效果
  filterButtons.forEach(button => {
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