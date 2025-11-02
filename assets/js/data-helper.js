/**
 * 數據訪問輔助工具
 * 為頁面提供簡單易用的數據訪問接口
 */
(function() {
  'use strict';

  const onProdHost = location.hostname.endsWith('horgoscpa.com');
  const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

  /**
   * 等待 DataCache 就緒
   */
  function waitForDataCache(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (window.DataCache) {
        resolve(window.DataCache);
        return;
      }

      let elapsed = 0;
      const interval = 50;
      const timer = setInterval(() => {
        elapsed += interval;
        if (window.DataCache) {
          clearInterval(timer);
          resolve(window.DataCache);
        } else if (elapsed >= timeout) {
          clearInterval(timer);
          reject(new Error('DataCache 加載超時'));
        }
      }, interval);
    });
  }

  /**
   * 智能 fetch：優先使用緩存，回退到直接請求
   */
  async function smartFetch(endpoint, options = {}) {
    try {
      // 嘗試使用 DataCache
      const cache = await waitForDataCache(1000).catch(() => null);
      
      if (cache && cache.fetchWithCache) {
        // 從 endpoint 提取合適的 cacheKey
        let cacheKey = null;
        if (endpoint.includes('/users')) cacheKey = 'users';
        else if (endpoint.includes('/clients')) cacheKey = 'clients';
        else if (endpoint.includes('/tags')) cacheKey = 'tags';
        else if (endpoint.includes('/settings')) cacheKey = 'settings';
        else if (endpoint.includes('/holidays')) cacheKey = 'holidays';
        else if (endpoint.includes('/services')) cacheKey = 'services';
        else if (endpoint.includes('/auth/me')) cacheKey = 'me';
        
        if (cacheKey) {
          console.log(`[DataHelper] 使用緩存策略: ${cacheKey}`);
          const result = await cache.fetchWithCache(endpoint, cacheKey, options);
          if (!result.error) {
            return {
              ok: true,
              data: result.data,
              fromCache: result.fromCache
            };
          }
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 緩存訪問失敗，使用直接請求', err);
    }

    // 回退到直接 API 請求
    console.log(`[DataHelper] 直接請求: ${endpoint}`);
    const res = await fetch(apiBase + endpoint, {
      method: 'GET',
      credentials: 'include',
      ...options
    });

    if (res.status === 401) {
      const currentPath = location.pathname;
      location.assign('/login?redirect=' + encodeURIComponent(currentPath));
      throw new Error('UNAUTHORIZED');
    }

    const json = await res.json();
    return {
      ok: res.ok && json.ok,
      data: json.data,
      message: json.message,
      fromCache: false
    };
  }

  /**
   * 載入員工列表（優先從緩存）
   */
  async function loadUsers() {
    try {
      const cache = await waitForDataCache(1000).catch(() => null);
      if (cache && cache.getUsers) {
        const users = await cache.getUsers();
        if (users && users.length > 0) {
          console.log('[DataHelper] 從緩存載入員工列表', users.length);
          return users;
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 從緩存載入員工失敗', err);
    }

    // 回退到直接請求
    const result = await smartFetch('/users');
    return result.data || [];
  }

  /**
   * 載入客戶列表（優先從緩存）
   */
  async function loadClients() {
    try {
      const cache = await waitForDataCache(1000).catch(() => null);
      if (cache && cache.getClients) {
        const clients = await cache.getClients();
        if (clients && clients.length > 0) {
          console.log('[DataHelper] 從緩存載入客戶列表', clients.length);
          return clients;
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 從緩存載入客戶失敗', err);
    }

    // 回退到直接請求
    const result = await smartFetch('/clients?perPage=1000');
    return result.data?.items || [];
  }

  /**
   * 載入標籤列表（優先從緩存）
   */
  async function loadTags() {
    try {
      const cache = await waitForDataCache(1000).catch(() => null);
      if (cache && cache.getTags) {
        const tags = await cache.getTags();
        if (tags && tags.length > 0) {
          console.log('[DataHelper] 從緩存載入標籤列表', tags.length);
          return tags;
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 從緩存載入標籤失敗', err);
    }

    // 回退到直接請求
    const result = await smartFetch('/tags');
    return result.data || [];
  }

  /**
   * 載入系統設定（優先從緩存）
   */
  async function loadSettings() {
    try {
      const cache = await waitForDataCache(1000).catch(() => null);
      if (cache && cache.getSettings) {
        const settings = await cache.getSettings();
        if (settings && settings.length > 0) {
          console.log('[DataHelper] 從緩存載入系統設定', settings.length);
          return settings;
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 從緩存載入設定失敗', err);
    }

    // 回退到直接請求
    const result = await smartFetch('/settings');
    return result.data || [];
  }

  /**
   * 載入當前用戶信息（優先從緩存）
   */
  async function loadMe() {
    try {
      const cache = await waitForDataCache(1000).catch(() => null);
      if (cache && cache.getMe) {
        const me = await cache.getMe();
        if (me) {
          console.log('[DataHelper] 從緩存載入用戶信息', me.username);
          return me;
        }
      }
    } catch (err) {
      console.warn('[DataHelper] 從緩存載入用戶失敗', err);
    }

    // 回退到直接請求
    const result = await smartFetch('/auth/me');
    return result.data || null;
  }

  /**
   * 顯示加載提示（可選）
   */
  function showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'global-loading-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #4A90E2 0%, #50E3C2 100%);
      z-index: 99999;
      animation: loading-pulse 1.5s ease-in-out infinite;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes loading-pulse {
        0%, 100% { opacity: 0.6; transform: scaleX(0.8); }
        50% { opacity: 1; transform: scaleX(1); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    return indicator;
  }

  /**
   * 隱藏加載提示
   */
  function hideLoadingIndicator() {
    const indicator = document.getElementById('global-loading-indicator');
    if (indicator) {
      indicator.style.transition = 'opacity 0.3s';
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }

  /**
   * 批量載入多個資源（並行）
   */
  async function loadMultiple(loaders) {
    const indicator = showLoadingIndicator();
    try {
      const results = await Promise.all(loaders.map(loader => 
        loader().catch(err => {
          console.error('[DataHelper] 載入失敗', err);
          return null;
        })
      ));
      return results;
    } finally {
      hideLoadingIndicator();
    }
  }

  // 暴露全局 API
  window.DataHelper = {
    // 智能加載
    smartFetch,
    
    // 常用數據載入器
    loadUsers,
    loadClients,
    loadTags,
    loadSettings,
    loadMe,
    
    // 批量載入
    loadMultiple,
    
    // UI 輔助
    showLoadingIndicator,
    hideLoadingIndicator,
    
    // 工具
    waitForDataCache,
    apiBase
  };

  console.log('[DataHelper] 數據輔助工具已就緒');
})();

