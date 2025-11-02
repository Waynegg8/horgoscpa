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
      // 如果沒有任何已完成的預加載，啟動管理員完整預加載（40項數據）
      if (status.completed.length === 0) {
        console.log('[Bootstrap] 啟動背景管理員完整預加載（40項數據）');
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
      'client-new': 'clients',
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
      const name = json.data?.name || json.data?.username || '—';
      const el = document.getElementById('internalUserName');
      if (el) el.textContent = name;
    } catch(_){}
  }

  function bindMobileToggle(){
    const btn = document.getElementById('internalMobileToggle');
    const links = document.getElementById('internalNavLinks');
    if (!btn || !links) return;
    btn.addEventListener('click', function(){
      links.classList.toggle('active');
    });
  }

  async function ensureNavbar(){
    if (document.querySelector('.internal-navbar')) return;
    const html = await fetchText('/templates/partials/internal-navbar.html', 'tpl:internal-navbar:v2');
    document.body.insertAdjacentHTML('afterbegin', html);
    markActiveNav();
    bindMobileToggle();
    populateUser();
  }

  async function ensureFooter(){
    if (document.querySelector('.internal-footer')) return;
    const html = await fetchText('/templates/partials/internal-footer.html', 'tpl:internal-footer:v1');
    document.body.insertAdjacentHTML('beforeend', html);
  }

  ensureNavbar();
  ensureFooter();
})();


