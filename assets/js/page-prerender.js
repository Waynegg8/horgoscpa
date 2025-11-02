/**
 * 页面预渲染管理器
 * 自动管理页面的预渲染 HTML 加载和保存
 */
(function() {
  'use strict';

  // 从 URL 识别页面类型
  function getPageKey() {
    const path = location.pathname;
    
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('timesheets')) return 'timesheets';
    if (path.includes('tasks')) return 'tasks';
    if (path.includes('clients')) return 'clients';
    if (path.includes('receipts')) return 'receipts';
    if (path.includes('leaves')) return 'leaves';
    if (path.includes('payroll')) return 'payroll';
    if (path.includes('costs')) return 'costs';
    if (path.includes('lifecycle')) return 'lifecycle';
    if (path.includes('knowledge')) return 'knowledge';
    if (path.includes('reports')) return 'reports';
    if (path.includes('settings')) return 'settings';
    
    return null;
  }

  /**
   * 初始化页面预渲染
   * @param {string} containerSelector - 内容容器选择器（可选）
   * @param {Function} renderCallback - 渲染完成后的回调（用于保存HTML）
   */
  function initPagePrerender(containerSelector, renderCallback) {
    const pageKey = getPageKey();
    if (!pageKey) {
      console.log('[PagePrerender] 当前页面不支持预渲染');
      return { loaded: false, reason: 'unsupported_page' };
    }

    // 如果没有指定容器，使用整个 body
    const container = containerSelector ? document.querySelector(containerSelector) : document.body;
    if (!container) {
      console.warn(`[PagePrerender] 找不到容器: ${containerSelector}`);
      return { loaded: false, reason: 'container_not_found' };
    }

    // 尝试加载预渲染 HTML
    if (window.Prerender) {
      const prerenderedHTML = window.Prerender.load(pageKey);
      
      if (prerenderedHTML) {
        const htmlSize = Math.round(prerenderedHTML.length / 1024);
        console.log(`[PagePrerender] ⚡ ${pageKey} 使用预渲染 HTML (${htmlSize}KB)`);
        
        container.innerHTML = prerenderedHTML;
        
        // 标记为已使用预渲染
        container.dataset.prerendered = 'true';
        
        // 后台更新数据
        if (renderCallback) {
          setTimeout(() => {
            console.log(`[PagePrerender] 🔄 ${pageKey} 后台更新中...`);
            renderCallback(true); // true = 后台更新模式
          }, 100);
        }
        
        return { loaded: true, size: htmlSize };
      } else {
        console.log(`[PagePrerender] ℹ ${pageKey} 无预渲染缓存，正常加载`);
      }
    } else {
      console.warn('[PagePrerender] ⚠ Prerender 系统未就绪');
    }

    return { loaded: false, reason: 'no_cache' };
  }

  /**
   * 保存页面预渲染 HTML
   * @param {string} containerSelector - 内容容器选择器
   */
  function savePagePrerender(containerSelector) {
    const pageKey = getPageKey();
    if (!pageKey) return;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (window.Prerender) {
      const html = container.innerHTML;
      if (html && html.length > 100) {
        window.Prerender.save(pageKey, html);
      }
    }
  }

  /**
   * 监听容器变化，自动保存预渲染
   * @param {string} containerSelector - 内容容器选择器
   */
  function autoSavePrerender(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver(() => {
      // 延迟保存（避免频繁保存）
      if (observer.saveTimer) clearTimeout(observer.saveTimer);
      
      observer.saveTimer = setTimeout(() => {
        savePagePrerender(containerSelector);
      }, 1000); // 1秒后保存
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    console.log(`[PagePrerender] 自动保存已启用`);
  }

  // 暴露全局 API
  window.PagePrerender = {
    init: initPagePrerender,
    save: savePagePrerender,
    autoSave: autoSavePrerender,
    getPageKey
  };

  console.log('[PagePrerender] 页面预渲染管理器已就绪');
})();

