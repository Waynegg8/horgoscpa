/**
 * ai-chat.js - 霍爾果斯會計師事務所AI客服聊天功能
 * 最後更新日期: 2025-05-18
 */

// 當DOM加載完成後初始化聊天組件
document.addEventListener('DOMContentLoaded', function() {
  // 創建聊天UI元素
  initChatUI();
  
  // 初始化聊天事件監聽器
  initChatEvents();
});

// AI API Worker URL - 替換為您的新Worker URL
const AI_API_URL = 'https://taiwan-accounting-ai.hergscpa.workers.dev/api/query';

// 創建聊天UI元素並添加到頁面
function initChatUI() {
  // 創建聊天按鈕
  const chatButton = document.createElement('button');
  chatButton.className = 'ai-chat-button';
  chatButton.id = 'ai-chat-button';
  chatButton.innerHTML = `
    <span class="material-symbols-rounded open-icon">smart_toy</span>
    <span class="material-symbols-rounded close-icon">close</span>
  `;
  
  // 創建聊天窗口
  const chatWindow = document.createElement('div');
  chatWindow.className = 'ai-chat-window';
  chatWindow.id = 'ai-chat-window';
  chatWindow.innerHTML = `
    <div class="ai-chat-header">
      <h2 class="ai-chat-header-title">
        <span class="material-symbols-rounded">support_agent</span>
        AI 客服助理
      </h2>
      <button class="ai-chat-close" id="ai-chat-close">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <div class="ai-chat-messages" id="ai-chat-messages">
      <div class="ai-chat-message bot">
        您好，我是霍爾果斯會計師事務所的AI助理，有什麼財稅問題我可以協助您解答？
      </div>
    </div>
    <div class="ai-chat-input-area">
      <input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="輸入您的問題...">
      <button class="ai-chat-send" id="ai-chat-send" disabled>
        <span class="material-symbols-rounded">send</span>
      </button>
    </div>
  `;
  
  // 將元素添加到頁面
  document.body.appendChild(chatButton);
  document.body.appendChild(chatWindow);
}

// 初始化聊天事件監聽器
function initChatEvents() {
  const chatButton = document.getElementById('ai-chat-button');
  const chatWindow = document.getElementById('ai-chat-window');
  const chatClose = document.getElementById('ai-chat-close');
  const chatInput = document.getElementById('ai-chat-input');
  const chatSend = document.getElementById('ai-chat-send');
  const chatMessages = document.getElementById('ai-chat-messages');
  
  // 啟用發送按鈕
  chatInput.addEventListener('input', function() {
    chatSend.disabled = this.value.trim() === '';
  });
  
  // 點擊聊天按鈕打開/關閉聊天窗口
  chatButton.addEventListener('click', function() {
    chatButton.classList.toggle('open');
    chatWindow.classList.toggle('open');
    
    // 如果窗口被打開，聚焦到輸入框
    if (chatWindow.classList.contains('open')) {
      chatInput.focus();
    }
  });
  
  // 點擊關閉按鈕關閉聊天窗口
  chatClose.addEventListener('click', function() {
    chatButton.classList.remove('open');
    chatWindow.classList.remove('open');
  });
  
  // 發送消息事件（點擊發送按鈕）
  chatSend.addEventListener('click', function() {
    sendMessage();
  });
  
  // 發送消息事件（按下Enter鍵）
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim() !== '') {
      sendMessage();
    }
  });
  
  // 發送消息函數
  async function sendMessage() {
    const message = chatInput.value.trim();
    
    // 如果消息為空，不發送
    if (!message) return;
    
    // 添加用戶消息到聊天區域
    addMessage(message, 'user');
    
    // 清空輸入框並禁用發送按鈕
    chatInput.value = '';
    chatSend.disabled = true;
    
    // 顯示機器人正在輸入
    showTypingIndicator();
    
    try {
      // 調用新的AI API端點
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message }), // 改用query作為參數名
      });
      
      const data = await response.json();
      
      // 隱藏正在輸入指示器
      hideTypingIndicator();
      
      if (data.error) {
        // 顯示錯誤訊息
        addMessage('抱歉，我遇到了一些問題。請稍後再試或直接撥打我們的服務專線：04-2220-5606', 'bot');
        console.error('API Error:', data.error);
      } else {
        // 顯示AI回應 - 使用answer而不是response
        addMessage(data.answer, 'bot');
      }
    } catch (error) {
      // 隱藏正在輸入指示器
      hideTypingIndicator();
      
      // 顯示錯誤訊息
      addMessage('抱歉，連線出現問題。請稍後再試或直接撥打我們的服務專線：04-2220-5606', 'bot');
      console.error('Fetch Error:', error);
    }
  }
  
  // 添加消息到聊天區域
  function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `ai-chat-message ${sender}`;
    messageElement.textContent = text;
    
    chatMessages.appendChild(messageElement);
    
    // 滾動到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // 顯示正在輸入指示器
  function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'ai-typing-indicator';
    typingIndicator.id = 'ai-typing-indicator';
    typingIndicator.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // 隱藏正在輸入指示器
  function hideTypingIndicator() {
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
}