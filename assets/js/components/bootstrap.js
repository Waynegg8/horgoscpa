(function(){
  const isInternalPath = location.pathname.startsWith('/internal/');
  if (!isInternalPath) return;

  function ensureCss(href){
    if ([...document.styleSheets].some(ss => ss.href && ss.href.endsWith(href))) return;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => (l.getAttribute('href')||'').endsWith(href))) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src, async = true){
    if ([...document.querySelectorAll('script')].some(s => (s.getAttribute('src')||'').endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 加入內部系統必要樣式（若尚未載入）
  ensureCss('/assets/css/internal-system.css');
  ensureCss('/assets/css/internal-components.css');

  // 確保數據緩存系統已加載
  ensureScript('/assets/js/data-cache.js', false).then(() => {
    console.log('[Bootstrap] 數據緩存系統已就緒');
    
    // 加載 Fetch 攔截器（自動使用緩存）
    return ensureScript('/assets/js/fetch-interceptor.js', false);
  }).then(() => {
    console.log('[Bootstrap] Fetch 攔截器已啟動');
    
    // 如果預加載尚未開始，現在啟動（適用於直接訪問內部頁面的情況）
    if (window.DataCache && !window.DataCache.getPreloadStatus().isPreloading) {
      const status = window.DataCache.getPreloadStatus();
      // 如果沒有任何已完成的預加載，啟動管理員完整預加載（25項數據）
      if (status.completed.length === 0) {
        console.log('[Bootstrap] 啟動背景分級預加載（P0→P1→P2→P3）');
        window.DataCache.preloadAll({ adminMode: true });
      } else {
        console.log(`[Bootstrap] 預加載已完成 ${status.completed.length}/${status.total} 項`);
      }
    }
  }).catch(err => {
    console.warn('[Bootstrap] 加載系統失敗', err);
  });

  const onProdHost = location.hostname.endsWith('horgoscpa.com');
  const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

  async function fetchText(url, cacheKey){
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch(_){}
    const res = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    const text = await res.text();
    try { sessionStorage.setItem(cacheKey, text); } catch(_){}
    return text;
  }

  function markActiveNav(){
    const path = location.pathname;
    let seg = path.replace(/^\/internal\//, '').split(/[/?#]/)[0] || 'dashboard';
    
    // 特殊路径映射：将详情页/新增页映射到列表页
    const pathMapping = {
      'client-detail': 'clients',
      'client-add': 'clients',
      'task-detail': 'tasks',
      'task-new': 'tasks'
    };
    
    if (pathMapping[seg]) {
      seg = pathMapping[seg];
    }
    
    // 先尝试精确匹配，再尝试模糊匹配
    const selector = `a.internal-nav-link[href="/internal/${seg}"], a.internal-nav-link[href="/internal/${seg}.html"]`;
    const a = document.querySelector(selector);
    
    if (a) {
      a.classList.add('active');
    } else if (seg === 'dashboard') {
      // 只有真正在 dashboard 页面时才高亮 dashboard
      const dashboardLink = document.querySelector('a.internal-nav-link[href="/internal/dashboard"]');
      if (dashboardLink) dashboardLink.classList.add('active');
    }
  }

  async function populateUser(){
    try {
      const res = await fetch(`${apiBase}/auth/me`, { credentials:'include' });
      if (!res.ok) return;
      const json = await res.json().catch(()=>null);
      if (!json || json.ok !== true) return;
      const userData = json.data;
      const name = userData?.name || userData?.username || '—';
      const isAdmin = userData?.is_admin === true || userData?.isAdmin === true;
      
      const el = document.getElementById('internalUserName');
      if (el) el.textContent = name;
      
      // 根据权限隐藏导航链接
      hideNavLinksForNonAdmin(isAdmin);
    } catch(_){}
  }

  function hideNavLinksForNonAdmin(isAdmin){
    if (isAdmin) {
      console.log('[Bootstrap] 管理員身份，顯示所有導航');
      return; // 管理员显示所有链接
    }
    
    console.log('[Bootstrap] 非管理員身份，隱藏管理員專用導航');
    
    // 管理员专用的页面路径
    const adminOnlyPaths = [
      '/internal/costs',        // 成本管理
      '/internal/cms',          // CMS 內容管理
      '/internal/reports'       // 報表
    ];
    
    // 隐藏管理员专用的导航链接
    document.querySelectorAll('.internal-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (adminOnlyPaths.includes(href)) {
        link.style.display = 'none';
        console.log('[Bootstrap] 隱藏導航:', href);
      }
    });
  }

  function bindMobileToggle(){
    const btn = document.getElementById('internalMobileToggle');
    const links = document.getElementById('internalNavLinks');
    if (!btn || !links) return;
    btn.addEventListener('click', function(){
      links.classList.toggle('active');
    });
  }

  function bindLogout(){
    const logoutBtn = document.getElementById('internalLogoutBtn');
    console.log('[Bootstrap] 登出按鈕:', logoutBtn);
    
    if (!logoutBtn) {
      console.error('[Bootstrap] 找不到登出按鈕！');
      return;
    }
    
    console.log('[Bootstrap] 開始綁定登出事件');
    
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[Bootstrap] 登出按鈕被點擊');
      
      if (!confirm('確定要登出嗎？')) {
        console.log('[Bootstrap] 用戶取消登出');
        return;
      }

      logoutBtn.disabled = true;
      logoutBtn.textContent = '登出中...';
      
      console.log('[Bootstrap] 開始登出流程...');

      try {
        const apiUrl = '/internal/api/v1/auth/logout';
        console.log('[Bootstrap] 呼叫 API:', apiUrl);
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        console.log('[Bootstrap] API 回應狀態:', res.status);
        
        const json = await res.json().catch(() => {
          console.error('[Bootstrap] 無法解析 JSON');
          return null;
        });
        
        console.log('[Bootstrap] API 回應:', json);
        
        if (res.ok && json && json.ok === true) {
          // 登出成功，導向登入頁
          console.log('[Bootstrap] 登出成功，導向登入頁');
          window.location.href = '/login.html';
        } else {
          // 登出失敗，顯示錯誤訊息
          console.error('[Bootstrap] 登出失敗:', json);
          alert('登出失敗: ' + (json?.message || '未知錯誤'));
          logoutBtn.disabled = false;
          logoutBtn.textContent = '登出';
        }
      } catch (err) {
        console.error('[Bootstrap] 登出錯誤:', err);
        alert('網路或伺服器異常: ' + err.message);
        logoutBtn.disabled = false;
        logoutBtn.textContent = '登出';
      }
    });
    
    console.log('[Bootstrap] 登出事件監聽器已註冊');
  }

  async function ensureNavbar(){
    if (document.querySelector('.internal-navbar')) return;
    if (!document.body) {
      console.warn('[Bootstrap] document.body 尚未就緒，等待...');
      return;
    }
    const html = await fetchText('/templates/partials/internal-navbar.html', 'tpl:internal-navbar:v8');
    document.body.insertAdjacentHTML('afterbegin', html);
    markActiveNav();
    bindMobileToggle();
    bindLogout();
    populateUser();
  }

  async function ensureFooter(){
    if (document.querySelector('.internal-footer')) return;
    if (!document.body) {
      console.warn('[Bootstrap] document.body 尚未就緒，等待...');
      return;
    }
    const html = await fetchText('/templates/partials/internal-footer.html', 'tpl:internal-footer:v1');
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // 確保 DOM 就緒後再執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureNavbar();
      ensureFooter();
    });
  } else {
    ensureNavbar();
    ensureFooter();
  }
})();


