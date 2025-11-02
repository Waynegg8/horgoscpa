/**
 * 通用智能预渲染系统
 * 自动检测页面并应用预渲染
 */
(function() {
  'use strict';

  if (!window.Prerender) {
    console.warn('[UniversalPrerender] Prerender 系统未就绪');
    return;
  }

  // 自动检测页面类型
  const path = window.location.pathname;
  let pageKey = null;
  let containerSelector = null;

  // 页面映射表
  const pageMap = {
    '/internal/dashboard': { key: 'dashboard', selector: '.dashboard-grid' },
    '/dashboard': { key: 'dashboard', selector: '.dashboard-grid' },
    
    '/internal/timesheets': { key: 'timesheets', selector: '#timesheetBody' },
    '/timesheets': { key: 'timesheets', selector: '#timesheetBody' },
    
    '/internal/leaves': { key: 'leaves', selector: 'body' },
    '/leaves': { key: 'leaves', selector: 'body' },
    
    '/internal/tasks': { key: 'tasks', selector: '.task-container' },
    '/tasks': { key: 'tasks', selector: '.task-container' },
    
    '/internal/clients': { key: 'clients', selector: '.clients-card' },
    '/clients': { key: 'clients', selector: '.clients-card' },
    
    '/internal/receipts': { key: 'receipts', selector: '.receipts-container' },
    '/receipts': { key: 'receipts', selector: '.receipts-container' },
    
    '/internal/costs': { key: 'costs', selector: '.costs-container' },
    '/costs': { key: 'costs', selector: '.costs-container' },
    
    '/internal/payroll': { key: 'payroll', selector: '.payroll-container' },
    '/payroll': { key: 'payroll', selector: '.payroll-container' },
    
    '/internal/reports': { key: 'reports', selector: '.reports-container' },
    '/reports': { key: 'reports', selector: '.reports-container' },
    
    '/internal/rules': { key: 'rules', selector: '.rules-container' },
    '/rules': { key: 'rules', selector: '.rules-container' },
    
    '/internal/settings': { key: 'settings', selector: '.settings-container' },
    '/settings': { key: 'settings', selector: '.settings-container' },
    
    '/internal/lifecycle': { key: 'lifecycle', selector: '.lifecycle-container' },
    '/lifecycle': { key: 'lifecycle', selector: '.lifecycle-container' },
    
    '/internal/cms': { key: 'cms', selector: '.cms-container' },
    '/cms': { key: 'cms', selector: '.cms-container' },
    
    '/internal/attachments': { key: 'attachments', selector: '.attachments-container' },
    '/attachments': { key: 'attachments', selector: '.attachments-container' },
    
    '/internal/knowledge': { key: 'knowledge', selector: 'main.internal-container' },
    '/knowledge': { key: 'knowledge', selector: 'main.internal-container' }
  };

  // 检测当前页面
  const pageConfig = pageMap[path];
  if (pageConfig) {
    pageKey = pageConfig.key;
    containerSelector = pageConfig.selector;
  } else {
    // 尝试从路径推断
    const pathParts = path.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'internal') {
      pageKey = lastPart;
      containerSelector = 'body'; // 默认使用 body
    }
  }

  if (!pageKey) {
    console.log('[UniversalPrerender] 当前页面不需要预渲染');
    return;
  }

  console.log(`[UniversalPrerender] 检测到页面: ${pageKey}`);

  // 加载预渲染内容
  const cachedHTML = window.Prerender.load(pageKey);

  if (cachedHTML && cachedHTML.length > 300) {
    // 有缓存：立即显示
    document.addEventListener('DOMContentLoaded', function() {
      const container = document.querySelector(containerSelector);
      if (container) {
        console.log(`[UniversalPrerender] ⚡ ${pageKey} 使用预渲染 HTML (${Math.round(cachedHTML.length/1024)}KB)`);
        
        // 特殊处理：timesheets 只渲染 tbody
        if (pageKey === 'timesheets') {
          container.innerHTML = cachedHTML;
          container.dataset.prerendered = 'true';
        } else {
          container.innerHTML = cachedHTML;
          container.dataset.prerendered = 'true';
        }
        
        console.log(`[UniversalPrerender] ⚡ ${pageKey} 预渲染内容已加载`);
      } else {
        console.warn(`[UniversalPrerender] 找不到容器: ${containerSelector}`);
      }
    });
  } else {
    // 无缓存：正常加载，完成后保存
    console.log(`[UniversalPrerender] ℹ ${pageKey} 无缓存，正常加载`);
    
    window.addEventListener('load', function() {
      // 等待数据完全渲染
      setTimeout(function() {
        const container = document.querySelector(containerSelector);
        if (container && container.innerHTML.length > 300) {
          window.Prerender.save(pageKey, container.innerHTML);
          console.log(`[UniversalPrerender] ✓ ${pageKey} 预渲染已保存`);
        }
      }, 3000); // 等待 3 秒确保数据完全渲染
    });
  }

  // 暴露强制刷新方法
  window.UniversalPrerender = {
    refresh: function() {
      if (pageKey && containerSelector) {
        const container = document.querySelector(containerSelector);
        if (container && container.innerHTML.length > 300) {
          window.Prerender.save(pageKey, container.innerHTML);
          console.log(`[UniversalPrerender] ✓ ${pageKey} 已手动刷新预渲染`);
        }
      }
    },
    clear: function() {
      if (pageKey) {
        localStorage.removeItem('horgos_prerender_' + pageKey);
        console.log(`[UniversalPrerender] 🗑 ${pageKey} 预渲染已清除`);
      }
    }
  };

  console.log('[UniversalPrerender] 通用预渲染系统已就绪');
})();


