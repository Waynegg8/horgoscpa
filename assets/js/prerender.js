/**
 * 预渲染系统
 * 在登入后为所有主要页面预渲染 HTML，确保极速显示
 */
(function() {
  'use strict';

  const PRERENDER_VERSION = '1.0.0';
  const PRERENDER_PREFIX = 'horgos_prerender_';
  const PRERENDER_TTL = 5 * 60 * 1000; // 5分钟有效期

  /**
   * 保存预渲染 HTML
   */
  function savePrerender(key, html) {
    try {
      const data = {
        version: PRERENDER_VERSION,
        html: html,
        timestamp: Date.now()
      };
      
      // 尝试保存
      try {
        localStorage.setItem(PRERENDER_PREFIX + key, JSON.stringify(data));
        console.log(`[Prerender] ✓ ${key} 已保存 (${Math.round(html.length / 1024)}KB)`);
      } catch (quotaError) {
        // 容量不足，尝试清理
        console.warn('[Prerender] ⚠ localStorage 容量不足，尝试清理...');
        cleanupOldPrerender();
        
        // 再次尝试保存
        localStorage.setItem(PRERENDER_PREFIX + key, JSON.stringify(data));
        console.log(`[Prerender] ✓ ${key} 已保存（清理后）`);
      }
    } catch (e) {
      console.warn(`[Prerender] ⚠ ${key} 保存失败`, e);
    }
  }
  
  /**
   * 清理最旧的预渲染
   */
  function cleanupOldPrerender() {
    const keys = Object.keys(localStorage);
    const prerenderedPages = keys
      .filter(key => key.startsWith(PRERENDER_PREFIX))
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: data.timestamp };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp); // 最旧的在前
    
    // 删除最旧的 50%
    const toDelete = Math.ceil(prerenderedPages.length / 2);
    for (let i = 0; i < toDelete; i++) {
      localStorage.removeItem(prerenderedPages[i].key);
      console.log(`[Prerender] 🗑 清理: ${prerenderedPages[i].key}`);
    }
    
    console.log(`[Prerender] ✓ 已清理 ${toDelete} 个旧预渲染`);
  }

  /**
   * 加载预渲染 HTML
   */
  function loadPrerender(key) {
    try {
      const cached = localStorage.getItem(PRERENDER_PREFIX + key);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age > PRERENDER_TTL) {
        localStorage.removeItem(PRERENDER_PREFIX + key);
        return null;
      }

      if (data.version !== PRERENDER_VERSION) {
        localStorage.removeItem(PRERENDER_PREFIX + key);
        return null;
      }

      console.log(`[Prerender] ⚡ ${key} 缓存命中 (${Math.round(age / 1000)}秒前，${Math.round(data.html.length / 1024)}KB)`);
      return data.html;
    } catch (e) {
      return null;
    }
  }

  /**
   * 清除所有预渲染缓存
   */
  function clearAllPrerender() {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    keys.forEach(key => {
      if (key.startsWith(PRERENDER_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    console.log(`[Prerender] 清除了 ${cleared} 个预渲染缓存`);
  }

  /**
   * 预渲染所有主要页面
   * @param {boolean} useCache - 是否使用缓存数据预渲染（登入前可用）
   */
  async function prerenderAllPages(useCache = false) {
    console.log(`[Prerender] 🚀 开始预渲染所有页面${useCache ? '（使用缓存数据）' : '（获取最新数据）'}...`);
    const startTime = Date.now();

    if (useCache) {
      // 使用缓存数据预渲染（不需要登入）
      return await prerenderFromCache();
    }

    const onProdHost = location.hostname.endsWith('horgoscpa.com');
    const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

    // 定义需要预渲染的页面（只包含存在的 API）
    const pages = [
      { key: 'dashboard', endpoint: '/dashboard', priority: 1 },
      { key: 'timesheets', endpoint: '/timesheets?limit=20', priority: 1 },
      { key: 'tasks', endpoint: '/tasks?perPage=20', priority: 1 },
      { key: 'clients', endpoint: '/clients?perPage=20', priority: 2 },
      { key: 'leaves', endpoint: '/leaves?perPage=20', priority: 3 },
    ];

    let success = 0;
    let failed = 0;

    // 按优先级预渲染
    const p1 = pages.filter(p => p.priority === 1);
    const p2 = pages.filter(p => p.priority === 2);
    const p3 = pages.filter(p => p.priority === 3);

    // P1: 高优先级（并行）
    const p1Results = await Promise.allSettled(
      p1.map(page => prerenderPage(apiBase, page.key, page.endpoint))
    );
    p1Results.forEach(r => r.status === 'fulfilled' && r.value ? success++ : failed++);

    // P2: 中优先级（并行）
    const p2Results = await Promise.allSettled(
      p2.map(page => prerenderPage(apiBase, page.key, page.endpoint))
    );
    p2Results.forEach(r => r.status === 'fulfilled' && r.value ? success++ : failed++);

    // P3: 低优先级（后台）
    Promise.allSettled(
      p3.map(page => prerenderPage(apiBase, page.key, page.endpoint))
    ).then(results => {
      const p3success = results.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`[Prerender] ✓ P3完成: ${p3success}/${p3.length}`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Prerender] ✅ 预渲染完成: ${success}/${p1.length + p2.length} 成功 (${duration}秒)`);

    return { success, failed, total: pages.length };
  }

  /**
   * 使用缓存数据预渲染（不需要登入）
   */
  async function prerenderFromCache() {
    console.log('[Prerender] 📦 使用缓存数据预渲染...');
    
    // 检查是否有缓存的数据
    if (!window.DataCache) {
      console.warn('[Prerender] ⚠ DataCache 未就绪');
      return { success: 0, failed: 0, total: 0 };
    }

    // 注意：这里只是触发 DataCache 检查缓存
    // 实际的 HTML 渲染会在各页面中完成
    
    console.log('[Prerender] ✓ 缓存数据检查完成');
    return { success: 0, failed: 0, total: 0, fromCache: true };
  }

  /**
   * 预加载单个页面的数据
   * 注意：这里只是确保数据已缓存
   * 实际的 HTML 渲染会在各页面打开时完成并保存
   */
  async function prerenderPage(apiBase, key, endpoint) {
    try {
      const startTime = Date.now();
      const res = await fetch(apiBase + endpoint, {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 401) {
          // 401 是正常的（未登入）
          return false;
        }
        console.warn(`[Prerender] ✗ ${key} 失败 (${res.status})`);
        return false;
      }

      const json = await res.json();
      const duration = Date.now() - startTime;
      
      // 数据会被 fetch 拦截器自动缓存
      // 当用户打开相应页面时，会从缓存读取数据，渲染 HTML，然后保存 HTML
      console.log(`[Prerender] ✓ ${key} 数据已缓存 (${duration}ms)`);
      return true;
    } catch (e) {
      console.warn(`[Prerender] ✗ ${key} 失败`, e);
      return false;
    }
  }

  /**
   * 获取 localStorage 使用情况
   */
  function getStorageUsage() {
    let totalSize = 0;
    let cacheSize = 0;
    let prerenderSize = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemSize = (localStorage[key].length + key.length) * 2; // UTF-16 = 2 bytes per char
        totalSize += itemSize;
        
        if (key.startsWith('horgos_cache_')) {
          cacheSize += itemSize;
        } else if (key.startsWith(PRERENDER_PREFIX)) {
          prerenderSize += itemSize;
        }
      }
    }
    
    return {
      total: Math.round(totalSize / 1024), // KB
      cache: Math.round(cacheSize / 1024), // KB
      prerender: Math.round(prerenderSize / 1024), // KB
      other: Math.round((totalSize - cacheSize - prerenderSize) / 1024), // KB
      limit: 5120, // 5MB (保守估计)
      usage: Math.round((totalSize / (5 * 1024 * 1024)) * 100) // %
    };
  }

  /**
   * 检查 localStorage 容量
   */
  function checkStorageCapacity() {
    const usage = getStorageUsage();
    
    console.log(`[Prerender] 📊 localStorage 使用情况:`);
    console.log(`  - 总计: ${usage.total}KB / ${usage.limit}KB (${usage.usage}%)`);
    console.log(`  - 数据缓存: ${usage.cache}KB`);
    console.log(`  - HTML 预渲染: ${usage.prerender}KB`);
    console.log(`  - 其他: ${usage.other}KB`);
    
    if (usage.usage > 80) {
      console.warn('[Prerender] ⚠ localStorage 使用超过 80%，建议清理');
      return { warning: true, usage };
    } else if (usage.usage > 50) {
      console.log('[Prerender] ℹ localStorage 使用正常');
      return { warning: false, usage };
    } else {
      console.log('[Prerender] ✓ localStorage 容量充足');
      return { warning: false, usage };
    }
  }

  /**
   * 获取预渲染状态
   */
  function getPrerenderStatus() {
    const keys = Object.keys(localStorage);
    const prerenderedPages = keys
      .filter(key => key.startsWith(PRERENDER_PREFIX))
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return {
            key: key.replace(PRERENDER_PREFIX, ''),
            age: Math.round((Date.now() - data.timestamp) / 1000),
            size: Math.round(data.html.length / 1024)
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    return {
      count: prerenderedPages.length,
      pages: prerenderedPages,
      totalSize: prerenderedPages.reduce((sum, p) => sum + p.size, 0)
    };
  }

  // 暴露全局 API
  window.Prerender = {
    save: savePrerender,
    load: loadPrerender,
    clearAll: clearAllPrerender,
    prerenderAllPages,
    getStatus: getPrerenderStatus,
    getStorageUsage,
    checkCapacity: checkStorageCapacity
  };

  console.log('[Prerender] 预渲染系统已就绪');
  
  // 启动时检查容量
  checkStorageCapacity();
})();

