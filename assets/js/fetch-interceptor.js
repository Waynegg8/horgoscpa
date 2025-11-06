/**
 * Fetch 攔截器 - 自動使用緩存
 * 攔截所有 API 請求，優先返回緩存數據
 */
(function() {
  'use strict';

  // 保存原始 fetch
  const originalFetch = window.fetch;
  
  // API 路徑前綴
  const API_PATHS = [
    '/internal/api/v1',
    'horgoscpa.com/internal/api/v1'
  ];

  // 需要緩存的端點映射表
  const CACHE_MAP = {
    // 精確匹配
    '/auth/me': 'me',
    '/users': 'users',
    '/tags': 'tags',
    '/settings': 'settings',
    '/holidays': 'holidays',
    '/services': 'services_types',
    '/dashboard': 'dashboard',
    '/automation/rules': 'automation_rules',
    '/receipts/statistics': 'receipts_statistics',
    '/receipts/aging-report': 'receipts_aging',
    '/timesheets/summary': 'timesheets_summary',
    '/leaves/balances': 'leaves_balances',
    '/payroll/summary': 'payroll_summary',
    '/costs/summary': 'costs_summary',
    '/costs/by-client': 'costs_by_client',
    '/costs/by-employee': 'costs_by_employee',
    '/reports/overview': 'reports_overview',
    
    // 帶參數的匹配
    '/clients?perPage=2000': 'clients_all',
    '/clients?page=1&perPage=50': 'clients_page1',
    '/clients?page=2&perPage=50': 'clients_page2',
    '/clients?page=3&perPage=50': 'clients_page3',
    '/tasks?perPage=200': 'tasks_all',
    '/tasks?perPage=100&status=pending': 'tasks_pending',
    '/tasks?perPage=100&status=in_progress': 'tasks_in_progress',
    '/tasks?perPage=50&status=completed': 'tasks_completed',
    '/receipts?perPage=200': 'receipts_all',
    '/receipts?perPage=100&status=unpaid': 'receipts_unpaid',
    '/timesheets?limit=200': 'timesheets_recent',
    '/timesheets?limit=30': 'timesheets_recent', // 工时表首屏（P1）
    '/leaves?perPage=200': 'leaves_all',
    '/leaves?perPage=50&status=pending': 'leaves_pending',
    '/leaves?perPage=30': 'leaves_recent', // 假期首屏（P1）
    '/payroll?perPage=100': 'payroll_latest',
    '/billing/schedules?perPage=200': 'billing_schedules',
    '/knowledge/sops?perPage=200': 'sop_list',
    '/knowledge/faqs?perPage=200': 'faq_list',
    '/knowledge/documents?perPage=200': 'documents_list',
    '/attachments?perPage=100': 'attachments_recent',
  };

  /**
   * 檢查 URL 是否是 API 請求
   */
  function isAPIRequest(url) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    return API_PATHS.some(path => urlStr.includes(path));
  }

  /**
   * 從 URL 提取端點路徑
   */
  function extractEndpoint(url) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    
    // 提取 /internal/api/v1 之後的部分
    const match = urlStr.match(/\/internal\/api\/v1(\/[^?]*)?(\?.*)?/);
    if (match) {
      const path = match[1] || '';
      const query = match[2] || '';
      return path + query;
    }
    
    return null;
  }

  /**
   * 查找緩存鍵
   */
  function findCacheKey(endpoint) {
    if (!endpoint) return null;
    
    // 精確匹配
    if (CACHE_MAP[endpoint]) {
      return CACHE_MAP[endpoint];
    }
    
    // 部分匹配（用於分頁等）
    for (const [pattern, key] of Object.entries(CACHE_MAP)) {
      if (endpoint.startsWith(pattern.split('?')[0])) {
        // 如果端點開頭匹配，檢查是否是同類請求
        if (pattern.includes('perPage') && endpoint.includes('perPage')) {
          // 對於分頁請求，如果 perPage 相同，使用緩存
          const patternPerPage = pattern.match(/perPage=(\d+)/)?.[1];
          const endpointPerPage = endpoint.match(/perPage=(\d+)/)?.[1];
          if (patternPerPage === endpointPerPage) {
            return key;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 從緩存獲取數據並構造 Response
   */
  async function getFromCache(cacheKey) {
    if (!window.DataCache) return null;
    
    try {
      // 直接从 localStorage 读取缓存，避免递归调用 fetch
      const cacheData = localStorage.getItem(`cache_${cacheKey}`);
      if (!cacheData) return null;
      
      const cached = JSON.parse(cacheData);
      const now = Date.now();
      
      // 检查缓存是否过期（默认 1 小时 = 3600 秒）
      if (cached.timestamp && (now - cached.timestamp) / 1000 < 3600) {
        // 構造一個 Response 對象
        const responseData = {
          ok: true,
          data: cached.data
        };
        
        const response = new Response(JSON.stringify(responseData), {
          status: 200,
          statusText: 'OK (from cache)',
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey
          }
        });
        
        return response;
      }
    } catch (err) {
      console.warn('[FetchInterceptor] 緩存讀取失敗', err);
    }
    
    return null;
  }

  /**
   * 攔截的 fetch 函數
   */
  window.fetch = async function(url, options = {}) {
    // 檢查是否禁用攔截器
    if (window.__DISABLE_FETCH_INTERCEPTOR__) {
      return originalFetch.call(this, url, options);
    }
    
    const method = (options.method || 'GET').toUpperCase();
    
    // 只在內部頁面攔截（不在登入頁面攔截）
    const isInternalPage = location.pathname.startsWith('/internal/') && !location.pathname.includes('/login');
    
    // 只攔截 GET 請求的 API 調用，且必須在內部頁面
    if (method === 'GET' && isAPIRequest(url) && isInternalPage) {
      const endpoint = extractEndpoint(url);
      const cacheKey = findCacheKey(endpoint);
      
      if (cacheKey) {
        // 嘗試從緩存獲取
        try {
          const cachedResponse = await getFromCache(cacheKey);
          
          if (cachedResponse) {
            console.log(`[FetchInterceptor] ✓ 使用緩存: ${cacheKey}`);
            return cachedResponse;
          }
        } catch (err) {
          console.warn(`[FetchInterceptor] 緩存失敗，回退到網路請求:`, err);
        }
      }
    }
    
    // 如果沒有緩存或不是 GET API 請求，使用原始 fetch
    // 重要：必須傳遞 url 和 options 參數，而不是使用 arguments
    return originalFetch.call(this, url, options);
  };

  // 保持原始 fetch 的屬性
  Object.setPrototypeOf(window.fetch, originalFetch);
  for (const key of Object.keys(originalFetch)) {
    if (!(key in window.fetch)) {
      try {
        window.fetch[key] = originalFetch[key];
      } catch (e) {
        // 忽略不可寫屬性
      }
    }
  }

  if (window.__DISABLE_FETCH_INTERCEPTOR__) {
    console.log('[FetchInterceptor] ⚠️ Fetch 攔截器已禁用（頁面要求）');
  } else {
    console.log('[FetchInterceptor] Fetch 攔截器已啟動 - 自動使用緩存');
  }
})();

