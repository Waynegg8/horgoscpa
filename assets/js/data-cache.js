/**
 * 數據緩存與預加載系統
 * 在登入後立即加載常用數據，提升系統響應速度
 */
(function() {
  'use strict';

  const CACHE_VERSION = '1.0.0';
  const CACHE_PREFIX = 'horgos_cache_';
  
  // 緩存配置：統一設定為 1 小時（便於管理和循環預加載）
  const ONE_HOUR = 60 * 60 * 1000; // 1小時
  
  const CACHE_CONFIG = {
    // === 核心基礎數據 ===
    me: ONE_HOUR,
    users: ONE_HOUR,
    clients_all: ONE_HOUR,
    clients_page1: ONE_HOUR,
    clients_page2: ONE_HOUR,
    clients_page3: ONE_HOUR,
    tags: ONE_HOUR,
    settings: ONE_HOUR,
    holidays: ONE_HOUR,
    services_types: ONE_HOUR,
    
    // === 儀表板相關 ===
    dashboard: ONE_HOUR,
    dashboard_stats: ONE_HOUR,
    
    // === 任務系統 ===
    tasks_all: ONE_HOUR,
    tasks_pending: ONE_HOUR,
    tasks_in_progress: ONE_HOUR,
    tasks_completed: ONE_HOUR,
    task_templates: ONE_HOUR,
    
    // === 收據與應收款 ===
    receipts_all: ONE_HOUR,
    receipts_unpaid: ONE_HOUR,
    receipts_statistics: ONE_HOUR,
    receipts_aging: ONE_HOUR,
    
    // === 工時系統 ===
    timesheets_recent: ONE_HOUR,
    timesheets_thismonth: ONE_HOUR,
    timesheets_summary: ONE_HOUR,
    
    // === 假期系統 ===
    leaves_all: ONE_HOUR,
    leaves_pending: ONE_HOUR,
    leaves_balances: ONE_HOUR,
    
    // === 薪資系統 ===
    payroll_latest: ONE_HOUR,
    payroll_summary: ONE_HOUR,
    
    // === 成本分析 ===
    costs_summary: ONE_HOUR,
    costs_by_client: ONE_HOUR,
    costs_by_employee: ONE_HOUR,
    
    // === 自動化與規則 ===
    automation_rules: ONE_HOUR,
    billing_schedules: ONE_HOUR,
    
    // === 知識庫 ===
    sop_list: ONE_HOUR,
    faq_list: ONE_HOUR,
    documents_list: ONE_HOUR,
    
    // === 報表數據 ===
    reports_overview: ONE_HOUR,
    reports_financial: ONE_HOUR,
    
    // === CMS內容 ===
    cms_posts: ONE_HOUR,
    cms_resources: ONE_HOUR,
    
    // === 附件系統 ===
    attachments_recent: ONE_HOUR,
  };

  const onProdHost = location.hostname.endsWith('horgoscpa.com');
  const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

  // 預加載進度追蹤
  let preloadStatus = {
    isPreloading: false,
    completed: [],
    failed: [],
    total: 0,
    lastPreloadTime: null
  };
  
  // 循環預加載定時器
  let cyclicPreloadTimer = null;
  const PRELOAD_CYCLE_INTERVAL = 60 * 60 * 1000; // 每1小時重新預加載一次

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
    
    // === 第1波：核心基礎數據（立即需要）===
    const wave1Tasks = [
      { key: 'me', endpoint: '/auth/me' },
      { key: 'users', endpoint: '/users' },
      { key: 'tags', endpoint: '/tags' },
      { key: 'settings', endpoint: '/settings' },
      { key: 'holidays', endpoint: '/holidays' },
    ];
    
    // === 第2波：客戶相關數據 ===
    const wave2Tasks = [
      { key: 'clients_all', endpoint: '/clients?perPage=2000' },
      { key: 'clients_page1', endpoint: '/clients?page=1&perPage=50' },
      { key: 'clients_page2', endpoint: '/clients?page=2&perPage=50' },
      { key: 'clients_page3', endpoint: '/clients?page=3&perPage=50' },
      { key: 'services_types', endpoint: '/services' },
    ];
    
    // === 第3波：儀表板與統計 ===
    const wave3Tasks = [
      { key: 'dashboard', endpoint: '/dashboard' },
      { key: 'dashboard_stats', endpoint: '/dashboard?stats=true' },
    ];
    
    // === 第4波：任務系統（高頻訪問）===
    const wave4Tasks = [
      { key: 'tasks_all', endpoint: '/tasks?perPage=200' },
      { key: 'tasks_pending', endpoint: '/tasks?perPage=100&status=pending' },
      { key: 'tasks_in_progress', endpoint: '/tasks?perPage=100&status=in_progress' },
      { key: 'tasks_completed', endpoint: '/tasks?perPage=50&status=completed' },
      { key: 'task_templates', endpoint: '/task-templates?perPage=100' },
    ];
    
    // === 第5波：收據與財務（高頻訪問）===
    const wave5Tasks = [
      { key: 'receipts_all', endpoint: '/receipts?perPage=200' },
      { key: 'receipts_unpaid', endpoint: '/receipts?perPage=100&status=unpaid' },
      { key: 'receipts_statistics', endpoint: '/receipts/statistics' },
      { key: 'receipts_aging', endpoint: '/receipts/aging-report' },
    ];
    
    // === 第6波：工時與假期 ===
    const wave6Tasks = [
      { key: 'timesheets_recent', endpoint: '/timesheets?limit=200' },
      { key: 'timesheets_summary', endpoint: '/timesheets/summary' },
      { key: 'leaves_all', endpoint: '/leaves?perPage=200' },
      { key: 'leaves_pending', endpoint: '/leaves?perPage=50&status=pending' },
      { key: 'leaves_balances', endpoint: '/leaves/balances' },
    ];
    
    // === 第7波：薪資與成本 ===
    const wave7Tasks = [
      { key: 'payroll_latest', endpoint: '/payroll?perPage=100' },
      { key: 'payroll_summary', endpoint: '/payroll/summary' },
      { key: 'costs_summary', endpoint: '/costs/summary' },
      { key: 'costs_by_client', endpoint: '/costs/by-client' },
      { key: 'costs_by_employee', endpoint: '/costs/by-employee' },
    ];
    
    // === 第8波：知識庫與文檔 ===
    const wave8Tasks = [
      { key: 'sop_list', endpoint: '/knowledge/sops?perPage=200' },
      { key: 'faq_list', endpoint: '/knowledge/faqs?perPage=200' },
      { key: 'documents_list', endpoint: '/knowledge/documents?perPage=200' },
    ];
    
    // === 第9波：自動化與報表 ===
    const wave9Tasks = [
      { key: 'automation_rules', endpoint: '/automation/rules' },
      { key: 'billing_schedules', endpoint: '/billing/schedules?perPage=200' },
      { key: 'reports_overview', endpoint: '/reports/overview' },
    ];
    
    // === 第10波：CMS內容與附件 ===
    const wave10Tasks = [
      { key: 'cms_posts', endpoint: '/cms/posts?perPage=100' },
      { key: 'cms_resources', endpoint: '/cms/resources?perPage=100' },
      { key: 'attachments_recent', endpoint: '/attachments?perPage=100' },
    ];
    
    // 組合所有任務
    const allWaves = [
      ...wave1Tasks,  // 核心（5項）
      ...wave2Tasks,  // 客戶（5項）
      ...wave3Tasks,  // 儀表板（2項）
      ...wave4Tasks,  // 任務（5項）
      ...wave5Tasks,  // 收據（4項）
      ...wave6Tasks,  // 工時假期（5項）
      ...wave7Tasks,  // 薪資成本（5項）
      ...wave8Tasks,  // 知識庫（3項）
      ...wave9Tasks,  // 自動化（3項）
      ...wave10Tasks, // CMS附件（3項）
    ];
    
    const basicTasks = [...wave1Tasks, ...wave2Tasks]; // 基礎模式：10項
    const adminFullTasks = allWaves; // 管理員完整模式：40項
    
    const tasks = adminMode ? adminFullTasks : basicTasks;
    preloadStatus.total = tasks.length;

    // 並行加載所有數據
    const results = await Promise.allSettled(
      tasks.map(async task => {
        const startTime = Date.now();
        const result = await fetchWithCache(task.endpoint, task.key, { forceRefresh: options.forceRefresh });
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
    preloadStatus.lastPreloadTime = Date.now();
    
    console.log(`[DataCache] 預加載完成: ${preloadStatus.completed.length}/${preloadStatus.total} 成功`);
    
    // 發送自定義事件通知預加載完成
    window.dispatchEvent(new CustomEvent('datacache:preload:complete', {
      detail: {
        completed: preloadStatus.completed,
        failed: preloadStatus.failed,
        total: preloadStatus.total
      }
    }));
    
    // 啟動循環預加載（1小時後自動刷新）
    startCyclicPreload(adminMode);

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

  /**
   * 啟動循環預加載
   */
  function startCyclicPreload(adminMode = true) {
    // 清除現有定時器
    if (cyclicPreloadTimer) {
      clearInterval(cyclicPreloadTimer);
    }
    
    console.log(`[DataCache] 啟動循環預加載，每 ${PRELOAD_CYCLE_INTERVAL / 60000} 分鐘刷新一次`);
    
    cyclicPreloadTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPreload = now - (preloadStatus.lastPreloadTime || 0);
      
      // 確保至少間隔 55 分鐘才重新預加載（避免太頻繁）
      if (timeSinceLastPreload >= 55 * 60 * 1000) {
        console.log('[DataCache] 🔄 循環預加載：開始刷新所有緩存數據');
        
        // 強制刷新所有數據
        preloadAll({ adminMode, forceRefresh: true }).then(() => {
          console.log('[DataCache] 🔄 循環預加載：刷新完成');
        }).catch(err => {
          console.warn('[DataCache] 🔄 循環預加載：刷新失敗', err);
        });
      }
    }, PRELOAD_CYCLE_INTERVAL);
    
    // 監聽頁面可見性變化，在頁面重新可見時檢查是否需要刷新
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && preloadStatus.lastPreloadTime) {
        const now = Date.now();
        const timeSinceLastPreload = now - preloadStatus.lastPreloadTime;
        
        // 如果距離上次預加載超過 50 分鐘，立即刷新
        if (timeSinceLastPreload >= 50 * 60 * 1000) {
          console.log('[DataCache] 🔄 頁面重新可見，緩存可能過期，立即刷新');
          preloadAll({ adminMode, forceRefresh: true });
        }
      }
    });
  }

  /**
   * 停止循環預加載
   */
  function stopCyclicPreload() {
    if (cyclicPreloadTimer) {
      clearInterval(cyclicPreloadTimer);
      cyclicPreloadTimer = null;
      console.log('[DataCache] 循環預加載已停止');
    }
  }

  // 初始化：清理舊版本緩存
  clearOldCache();

  // 暴露全局 API
  window.DataCache = {
    // 預加載
    preloadAll,
    getPreloadStatus,
    startCyclicPreload,
    stopCyclicPreload,
    
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

  console.log('[DataCache] 數據緩存系統已就緒（支援管理員完整預加載 + 自動循環刷新）');
})();

