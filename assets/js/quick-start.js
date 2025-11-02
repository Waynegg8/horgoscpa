/**
 * 快速启动优化
 * 确保关键缓存就绪后再显示页面内容
 */
(function() {
  'use strict';

  // 只在内部页面运行
  if (!location.pathname.startsWith('/internal/')) return;

  // 关键页面的必需数据
  const CRITICAL_CACHE = {
    '/internal/dashboard': ['dashboard', 'me', 'users'],
    '/internal/tasks': ['tasks_pending', 'tasks_all', 'me', 'users'],
    '/internal/timesheets': ['timesheets_recent', 'me', 'users'],
    '/internal/clients': ['clients_all', 'me', 'users'],
    '/internal/receipts': ['receipts_all', 'me', 'users'],
  };

  const currentPath = location.pathname;
  const requiredCache = CRITICAL_CACHE[currentPath] || [];

  // 如果不需要等待缓存，直接返回
  if (requiredCache.length === 0) return;

  /**
   * 检查关键缓存是否就绪
   */
  function checkCriticalCache() {
    if (!window.DataCache) return false;

    try {
      // 检查每个必需的缓存是否存在
      for (const key of requiredCache) {
        const cacheKey = `horgos_cache_1.0.0_${key}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return false;

        // 检查是否过期（1小时）
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        if (age > 60 * 60 * 1000) return false; // 超过1小时
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 等待关键缓存就绪
   */
  async function waitForCriticalCache(maxWait = 3000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (checkCriticalCache()) {
        console.log('[QuickStart] ✓ 关键缓存已就绪');
        return true;
      }

      // 每100ms检查一次
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[QuickStart] ⚠ 缓存未完全就绪，继续加载');
    return false;
  }

  // 隐藏内容，显示加载提示
  const style = document.createElement('style');
  style.id = 'quick-start-style';
  style.textContent = `
    .quick-start-loading body > *:not(#quick-start-loader) {
      opacity: 0;
      pointer-events: none;
    }
    #quick-start-loader {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 99999;
    }
    #quick-start-loader .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #4A90E2;
      border-radius: 50%;
      animation: quick-spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes quick-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #quick-start-loader .text {
      color: #666;
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);

  const loader = document.createElement('div');
  loader.id = 'quick-start-loader';
  loader.innerHTML = `
    <div class="spinner"></div>
    <div class="text">正在準備數據...</div>
  `;
  document.body.appendChild(loader);
  document.body.classList.add('quick-start-loading');

  // 等待缓存或超时
  waitForCriticalCache(2000).then(() => {
    // 移除加载提示
    document.body.classList.remove('quick-start-loading');
    if (loader && loader.parentNode) {
      loader.remove();
    }
    if (style && style.parentNode) {
      style.remove();
    }

    console.log('[QuickStart] 页面已就绪');
  });

  console.log(`[QuickStart] 等待关键缓存: ${requiredCache.join(', ')}`);
})();

