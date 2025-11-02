/**
 * 數據緩存與預加載系統
 * 在登入後立即加載常用數據，提升系統響應速度
 */
(function() {
  'use strict';

  const CACHE_VERSION = '1.0.0';
  const CACHE_PREFIX = 'horgos_cache_';
  
  // 緩存配置：每種數據的過期時間（毫秒）
  const CACHE_CONFIG = {
    // 基礎數據
    me: 5 * 60 * 1000,           // 當前用戶：5分鐘
    users: 30 * 60 * 1000,       // 員工列表：30分鐘
    clients: 10 * 60 * 1000,     // 客戶列表：10分鐘
    tags: 60 * 60 * 1000,        // 標籤：1小時
    settings: 60 * 60 * 1000,    // 系統設定：1小時
    holidays: 24 * 60 * 60 * 1000, // 假期：24小時
    services: 30 * 60 * 1000,    // 服務類型：30分鐘
    
    // 管理員專用數據
    dashboard: 5 * 60 * 1000,    // 儀表板數據：5分鐘
    tasks_summary: 10 * 60 * 1000, // 任務摘要：10分鐘
    receipts_summary: 10 * 60 * 1000, // 收據摘要：10分鐘
    timesheets_summary: 10 * 60 * 1000, // 工時摘要：10分鐘
    leaves_summary: 10 * 60 * 1000, // 假期摘要：10分鐘
    payroll_summary: 30 * 60 * 1000, // 薪資摘要：30分鐘
    costs_summary: 30 * 60 * 1000, // 成本摘要：30分鐘
    automation_rules: 60 * 60 * 1000, // 自動化規則：1小時
    billing_schedules: 30 * 60 * 1000, // 計費排程：30分鐘
    sop_list: 30 * 60 * 1000,    // SOP列表：30分鐘
    faq_list: 30 * 60 * 1000,    // FAQ列表：30分鐘
    documents_list: 30 * 60 * 1000, // 文檔列表：30分鐘
  };

  const onProdHost = location.hostname.endsWith('horgoscpa.com');
  const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

  // 預加載進度追蹤
  let preloadStatus = {
    isPreloading: false,
    completed: [],
    failed: [],
    total: 0
  };

  /**
   * 獲取緩存鍵名
   */
  function getCacheKey(key) {
    return CACHE_PREFIX + CACHE_VERSION + '_' + key;
  }

  /**
   * 檢查緩存是否有效
   */
  function isCacheValid(cacheData, maxAge) {
    if (!cacheData || !cacheData.timestamp) return false;
    const age = Date.now() - cacheData.timestamp;
    return age < maxAge;
  }

  /**
   * 從 localStorage 讀取緩存
   */
  function getCache(key) {
    try {
      const cacheKey = getCacheKey(key);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const maxAge = CACHE_CONFIG[key] || 5 * 60 * 1000; // 默認5分鐘

      if (isCacheValid(cacheData, maxAge)) {
        console.log(`[DataCache] 命中緩存: ${key} (剩餘 ${Math.round((maxAge - (Date.now() - cacheData.timestamp)) / 1000)}s)`);
        return cacheData.data;
      } else {
        console.log(`[DataCache] 緩存過期: ${key}`);
        localStorage.removeItem(cacheKey);
        return null;
      }
    } catch (err) {
      console.warn(`[DataCache] 讀取緩存失敗: ${key}`, err);
      return null;
    }
  }

  /**
   * 寫入緩存到 localStorage
   */
  function setCache(key, data) {
    try {
      const cacheKey = getCacheKey(key);
      const cacheData = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`[DataCache] 寫入緩存: ${key}`);
    } catch (err) {
      console.warn(`[DataCache] 寫入緩存失敗: ${key}`, err);
      // localStorage 可能已滿，嘗試清理舊緩存
      if (err.name === 'QuotaExceededError') {
        clearOldCache();
        try {
          localStorage.setItem(getCacheKey(key), JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));
        } catch (retryErr) {
          console.error(`[DataCache] 清理後仍無法寫入: ${key}`);
        }
      }
    }
  }

  /**
   * 清除特定緩存
   */
  function clearCache(key) {
    try {
      localStorage.removeItem(getCacheKey(key));
      console.log(`[DataCache] 清除緩存: ${key}`);
    } catch (err) {
      console.warn(`[DataCache] 清除緩存失敗: ${key}`, err);
    }
  }

  /**
   * 清理所有舊版本的緩存
   */
  function clearOldCache() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX) && !key.startsWith(CACHE_PREFIX + CACHE_VERSION)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[DataCache] 清理舊緩存: ${keysToRemove.length} 項`);
    } catch (err) {
      console.warn('[DataCache] 清理舊緩存失敗', err);
    }
  }

  /**
   * 通用 API 請求函數（帶緩存）
   */
  async function fetchWithCache(endpoint, cacheKey, options = {}) {
    // 優先返回有效緩存
    const cached = getCache(cacheKey);
    if (cached !== null && !options.forceRefresh) {
      return { data: cached, fromCache: true };
    }

    // 發起 API 請求
    try {
      const res = await fetch(apiBase + endpoint, {
        method: 'GET',
        credentials: 'include',
        ...options
      });

      if (res.status === 401) {
        console.warn(`[DataCache] 未授權: ${endpoint}`);
        return { error: 'UNAUTHORIZED', fromCache: false };
      }

      const json = await res.json();
      
      if (res.ok && json.ok) {
        const data = json.data;
        setCache(cacheKey, data);
        return { data, fromCache: false };
      } else {
        console.warn(`[DataCache] API 錯誤: ${endpoint}`, json);
        return { error: json.message || 'API_ERROR', fromCache: false };
      }
    } catch (err) {
      console.error(`[DataCache] 請求失敗: ${endpoint}`, err);
      // 如果有緩存（即使過期），在網絡失敗時也返回
      const staleCache = getCache(cacheKey);
      if (staleCache !== null) {
        console.log(`[DataCache] 使用過期緩存: ${cacheKey}`);
        return { data: staleCache, fromCache: true, stale: true };
      }
      return { error: 'NETWORK_ERROR', fromCache: false };
    }
  }

  /**
   * 預加載所有關鍵數據（包含管理員專用數據）
   */
  async function preloadAll(options = {}) {
    if (preloadStatus.isPreloading) {
      console.log('[DataCache] 預加載已在進行中');
      return;
    }

    const adminMode = options.adminMode !== false; // 默認啟用管理員模式
    
    console.log(`[DataCache] 開始預加載${adminMode ? '（管理員完整模式）' : '（基礎模式）'}...`);
    preloadStatus.isPreloading = true;
    preloadStatus.completed = [];
    preloadStatus.failed = [];
    
    // 基礎數據（所有用戶都需要）
    const basicTasks = [
      { key: 'me', endpoint: '/auth/me' },
      { key: 'users', endpoint: '/users' },
      { key: 'clients', endpoint: '/clients?perPage=1000' },
      { key: 'tags', endpoint: '/tags' },
      { key: 'settings', endpoint: '/settings' },
      { key: 'holidays', endpoint: '/holidays' },
      { key: 'services', endpoint: '/services' },
    ];
    
    // 管理員專用數據（完整數據集）
    const adminTasks = [
      { key: 'dashboard', endpoint: '/dashboard' },
      { key: 'tasks_summary', endpoint: '/tasks?perPage=100&status=pending' },
      { key: 'receipts_summary', endpoint: '/receipts?perPage=100' },
      { key: 'timesheets_summary', endpoint: '/timesheets?limit=100' },
      { key: 'leaves_summary', endpoint: '/leaves?perPage=100' },
      { key: 'payroll_summary', endpoint: '/payroll?perPage=50' },
      { key: 'costs_summary', endpoint: '/costs/summary' },
      { key: 'automation_rules', endpoint: '/automation/rules' },
      { key: 'billing_schedules', endpoint: '/billing/schedules?perPage=100' },
      { key: 'sop_list', endpoint: '/knowledge/sops?perPage=100' },
      { key: 'faq_list', endpoint: '/knowledge/faqs?perPage=100' },
      { key: 'documents_list', endpoint: '/knowledge/documents?perPage=100' },
    ];
    
    const tasks = adminMode ? [...basicTasks, ...adminTasks] : basicTasks;
    preloadStatus.total = tasks.length;

    // 並行加載所有數據
    const results = await Promise.allSettled(
      tasks.map(async task => {
        const startTime = Date.now();
        const result = await fetchWithCache(task.endpoint, task.key);
        const duration = Date.now() - startTime;
        
        if (result.error) {
          preloadStatus.failed.push(task.key);
          console.warn(`[DataCache] ✗ ${task.key} 加載失敗 (${duration}ms)`, result.error);
        } else {
          preloadStatus.completed.push(task.key);
          console.log(`[DataCache] ✓ ${task.key} 加載完成 (${duration}ms)${result.fromCache ? ' [緩存]' : ' [網絡]'}`);
        }
        
        return result;
      })
    );

    preloadStatus.isPreloading = false;
    
    console.log(`[DataCache] 預加載完成: ${preloadStatus.completed.length}/${preloadStatus.total} 成功`);
    
    // 發送自定義事件通知預加載完成
    window.dispatchEvent(new CustomEvent('datacache:preload:complete', {
      detail: {
        completed: preloadStatus.completed,
        failed: preloadStatus.failed,
        total: preloadStatus.total
      }
    }));

    return results;
  }

  /**
   * 獲取當前用戶信息
   */
  async function getMe(forceRefresh = false) {
    const result = await fetchWithCache('/auth/me', 'me', { forceRefresh });
    return result.data || null;
  }

  /**
   * 獲取員工列表
   */
  async function getUsers(forceRefresh = false) {
    const result = await fetchWithCache('/users', 'users', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取客戶列表
   */
  async function getClients(forceRefresh = false) {
    const result = await fetchWithCache('/clients?perPage=1000', 'clients', { forceRefresh });
    return result.data?.items || [];
  }

  /**
   * 獲取標籤列表
   */
  async function getTags(forceRefresh = false) {
    const result = await fetchWithCache('/tags', 'tags', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取系統設定
   */
  async function getSettings(forceRefresh = false) {
    const result = await fetchWithCache('/settings', 'settings', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取假期列表
   */
  async function getHolidays(forceRefresh = false) {
    const result = await fetchWithCache('/holidays', 'holidays', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取服務類型列表
   */
  async function getServices(forceRefresh = false) {
    const result = await fetchWithCache('/services', 'services', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取儀表板數據
   */
  async function getDashboard(forceRefresh = false) {
    const result = await fetchWithCache('/dashboard', 'dashboard', { forceRefresh });
    return result.data || null;
  }

  /**
   * 獲取任務摘要
   */
  async function getTasksSummary(forceRefresh = false) {
    const result = await fetchWithCache('/tasks?perPage=100&status=pending', 'tasks_summary', { forceRefresh });
    return result.data || { items: [], total: 0 };
  }

  /**
   * 獲取收據摘要
   */
  async function getReceiptsSummary(forceRefresh = false) {
    const result = await fetchWithCache('/receipts?perPage=100', 'receipts_summary', { forceRefresh });
    return result.data || { items: [], total: 0 };
  }

  /**
   * 獲取工時摘要
   */
  async function getTimesheetsSummary(forceRefresh = false) {
    const result = await fetchWithCache('/timesheets?limit=100', 'timesheets_summary', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取假期摘要
   */
  async function getLeavesSummary(forceRefresh = false) {
    const result = await fetchWithCache('/leaves?perPage=100', 'leaves_summary', { forceRefresh });
    return result.data || { items: [], total: 0 };
  }

  /**
   * 獲取自動化規則
   */
  async function getAutomationRules(forceRefresh = false) {
    const result = await fetchWithCache('/automation/rules', 'automation_rules', { forceRefresh });
    return result.data || [];
  }

  /**
   * 獲取 SOP 列表
   */
  async function getSopList(forceRefresh = false) {
    const result = await fetchWithCache('/knowledge/sops?perPage=100', 'sop_list', { forceRefresh });
    return result.data || { items: [], total: 0 };
  }

  /**
   * 刷新特定數據
   */
  async function refresh(key) {
    clearCache(key);
    const endpoints = {
      me: '/auth/me',
      users: '/users',
      clients: '/clients?perPage=1000',
      tags: '/tags',
      settings: '/settings',
      holidays: '/holidays',
      services: '/services',
      dashboard: '/dashboard',
      tasks_summary: '/tasks?perPage=100&status=pending',
      receipts_summary: '/receipts?perPage=100',
      timesheets_summary: '/timesheets?limit=100',
      leaves_summary: '/leaves?perPage=100',
      payroll_summary: '/payroll?perPage=50',
      costs_summary: '/costs/summary',
      automation_rules: '/automation/rules',
      billing_schedules: '/billing/schedules?perPage=100',
      sop_list: '/knowledge/sops?perPage=100',
      faq_list: '/knowledge/faqs?perPage=100',
      documents_list: '/knowledge/documents?perPage=100'
    };
    
    if (endpoints[key]) {
      return await fetchWithCache(endpoints[key], key, { forceRefresh: true });
    }
  }

  /**
   * 清除所有緩存
   */
  function clearAll() {
    Object.keys(CACHE_CONFIG).forEach(key => clearCache(key));
    clearOldCache();
    console.log('[DataCache] 已清除所有緩存');
  }

  /**
   * 獲取預加載狀態
   */
  function getPreloadStatus() {
    return { ...preloadStatus };
  }

  // 初始化：清理舊版本緩存
  clearOldCache();

  // 暴露全局 API
  window.DataCache = {
    // 預加載
    preloadAll,
    getPreloadStatus,
    
    // 基礎數據獲取
    getMe,
    getUsers,
    getClients,
    getTags,
    getSettings,
    getHolidays,
    getServices,
    
    // 管理員數據獲取
    getDashboard,
    getTasksSummary,
    getReceiptsSummary,
    getTimesheetsSummary,
    getLeavesSummary,
    getAutomationRules,
    getSopList,
    
    // 緩存管理
    refresh,
    clearCache,
    clearAll,
    
    // 底層 API（供高級使用）
    fetchWithCache,
    apiBase
  };

  console.log('[DataCache] 數據緩存系統已就緒（支援管理員完整預加載）');
})();

