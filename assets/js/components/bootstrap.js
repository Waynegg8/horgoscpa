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

  // 加入內部系統必要樣式（若尚未載入）
  ensureCss('/assets/css/internal-system.css');
  ensureCss('/assets/css/internal-components.css');

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
    
    const selector = `a.internal-nav-link[href^="/internal/${seg}"]`;
    const a = document.querySelector(selector) || document.querySelector('a.internal-nav-link[href="/internal/dashboard"]');
    if (a) a.classList.add('active');
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


