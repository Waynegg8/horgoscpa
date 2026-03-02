/* HorgosCPA — Components: NAV / FOOTER injection + active link + SEO */

const BASE_URL = 'https://www.horgoscpa.com';

const NAV_HTML = `
<nav class="site-nav scrolled">
  <a href="/index.html" class="logo">
    <div class="logo-container">
      <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img" style="height: 40px; width: auto;">
      <span class="logo-text-en">HORGOS CPA FIRM</span>
    </div>
  </a>
  <ul id="site-nav-links" class="nav-links">
    <li><a href="/services.html">專業服務</a></li>
    <li><a href="/team.html">專業團隊</a></li>
    <li><a href="/articles.html">文章專區</a></li>
    <li><a href="/resources.html">資源專區</a></li>
    <li><a href="/faq.html">常見問題</a></li>
    <li><a href="/contact.html">聯絡我們</a></li>
  </ul>
  <a href="/booking.html" class="btn-solid-gold">預約諮詢</a>
  <button class="mobile-toggle" aria-expanded="false" aria-controls="site-nav-links">選單</button>
</nav>`;

const FOOTER_HTML = `
<footer class="footer-dark">
  <div class="container footer-grid">
    <div class="footer-brand">
      <div class="logo-container" style="margin-bottom: 20px;">
        <img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img" style="height: 48px; width: auto;">
        <span class="logo-text-en">HORGOS CPA FIRM</span>
      </div>
      <p>每一筆數字背後，<br>都有一個值得被守護的夢想。</p>
    </div>
    <div class="footer-links">
      <h4>網站地圖</h4>
      <a href="/services.html">專業服務</a>
      <a href="/team.html">專業團隊</a>
      <a href="/articles.html">文章專區</a>
      <a href="/resources.html">資源專區</a>
      <a href="/faq.html">常見問題</a>
    </div>
    <div class="footer-links">
      <h4>聯絡資訊</h4>
      <p>台中市西區建國路21號3樓之1</p>
      <p><a href="tel:0422205606">04-2220-5606</a></p>
      <p>週一至週五 8:30-17:30</p>
      <p><a href="mailto:contact@horgoscpa.com">contact@horgoscpa.com</a></p>
    </div>
    <div class="footer-links">
      <h4>社群媒體</h4>
      <a href="https://line.me/R/ti/p/@208ihted" target="_blank" rel="noopener noreferrer">Line 官方帳號</a>
    </div>
  </div>
</footer>`;

// --- Schema.org data per page path ---
function buildSchema(path) {
    const org = {
        '@type': 'AccountingService',
        name: '霍爾果斯會計師事務所',
        alternateName: 'HORGOS CPA FIRM',
        url: BASE_URL,
        logo: `${BASE_URL}/assets/images/logo-white.png`,
        telephone: '+886-4-2220-5606',
        email: 'contact@horgoscpa.com',
        address: {
            '@type': 'PostalAddress',
            streetAddress: '建國路21號3樓之1',
            addressLocality: '西區',
            addressRegion: '台中市',
            addressCountry: 'TW'
        },
        openingHoursSpecification: [{
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:30',
            closes: '17:30'
        }],
        sameAs: ['https://line.me/R/ti/p/@208ihted']
    };

    if (path === '/' || path === '/index.html') {
        return {
            '@context': 'https://schema.org',
            ...org,
            image: `${BASE_URL}/assets/images/hero.jpg`,
            description: '為講究細節的創業者，策展您的財務版圖。'
        };
    }

    if (path === '/contact.html') {
        return { '@context': 'https://schema.org', ...org };
    }

    if (path === '/services.html') {
        return {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: '霍爾果斯會計師事務所 - 專業服務',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: '工商登記', url: `${BASE_URL}/service-registration.html` },
                { '@type': 'ListItem', position: 2, name: '帳務處理', url: `${BASE_URL}/service-accounting.html` },
                { '@type': 'ListItem', position: 3, name: '稅務申報', url: `${BASE_URL}/service-tax.html` },
                { '@type': 'ListItem', position: 4, name: '財稅簽證', url: `${BASE_URL}/service-audit.html` }
            ]
        };
    }

    const serviceMap = {
        '/service-registration.html': { name: '工商登記', desc: '一站式公司設立服務，從名稱預查、資本簽證到稅籍登記。' },
        '/service-accounting.html':   { name: '帳務處理', desc: '專業帳務處理與稅務申報，提供清晰財務報表與主動式稅務規劃。' },
        '/service-tax.html':          { name: '稅務申報', desc: '專業稅務申報與節稅規劃，守護每一分企業利潤。' },
        '/service-audit.html':        { name: '財稅簽證', desc: '獨立客觀的財稅簽證服務，財務報表查核與營所稅簽證。' }
    };
    if (serviceMap[path]) {
        const s = serviceMap[path];
        return {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: s.name,
            description: s.desc,
            provider: { '@type': 'AccountingService', name: '霍爾果斯會計師事務所', url: BASE_URL },
            url: BASE_URL + path
        };
    }

    if (path.startsWith('/articles/') && !path.endsWith('/template.html')) {
        const title = document.title.split('|')[0].trim();
        const desc = document.querySelector('meta[name="description"]')?.content || '';
        const image = document.querySelector('meta[property="og:image"]')?.content
            || `${BASE_URL}/assets/images/hero.jpg`;
        return {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description: desc,
            image: image,
            author: { '@type': 'Organization', name: '霍爾果斯會計師事務所', url: BASE_URL },
            publisher: {
                '@type': 'Organization',
                name: '霍爾果斯會計師事務所',
                logo: { '@type': 'ImageObject', url: `${BASE_URL}/assets/images/logo-white.png` }
            },
            url: BASE_URL + path,
            mainEntityOfPage: { '@type': 'WebPage', '@id': BASE_URL + path }
        };
    }

    if (path.startsWith('/tools/')) {
        const title = document.title.split('|')[0].trim();
        return {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: title,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
            url: BASE_URL + path
        };
    }

    return null;
}

export function initComponents() {
    // Skip link + main-content landmark
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = '跳至主要內容';
    document.body.insertBefore(skipLink, document.body.firstChild);

    const mainLandmark = document.querySelector(
        'header.page-header, section.hero-split, .booking-container, .article-hero, .article-container, .container'
    );
    if (mainLandmark && !mainLandmark.id) mainLandmark.id = 'main-content';

    // Inject Nav
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) {
        navPlaceholder.outerHTML = NAV_HTML;
    }

    // Inject Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.outerHTML = FOOTER_HTML;
    }

    // Active Nav Link Highlight
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const linkPath = link.getAttribute('href').replace(/\/$/, '');
        if (linkPath === currentPath || (currentPath === '/' && linkPath === '/index.html')) {
            link.classList.add('active');
        }
    });
}

// --- BreadcrumbList builder ---
const BREADCRUMB_MAP = {
    '/index.html':                { name: '首頁' },
    '/services.html':             { name: '專業服務' },
    '/service-registration.html': { name: '工商登記' },
    '/service-accounting.html':   { name: '帳務處理' },
    '/service-tax.html':          { name: '稅務申報' },
    '/service-audit.html':        { name: '財稅簽證' },
    '/team.html':                 { name: '專業團隊' },
    '/articles.html':             { name: '文章專區' },
    '/resources.html':            { name: '資源專區' },
    '/faq.html':                  { name: '常見問題' },
    '/contact.html':              { name: '聯絡我們' },
    '/booking.html':              { name: '預約諮詢' },
};

function buildBreadcrumb(path) {
    const items = [
        { '@type': 'ListItem', position: 1, name: '首頁', item: BASE_URL + '/' }
    ];

    if (path === '/index.html' || path === '/') return null;

    let name = BREADCRUMB_MAP[path]?.name;
    if (!name && path.startsWith('/articles/')) {
        name = document.title.split('|')[0].trim();
        items.push({ '@type': 'ListItem', position: 2, name: '文章專區', item: BASE_URL + '/articles.html' });
        items.push({ '@type': 'ListItem', position: 3, name, item: BASE_URL + path });
    } else if (name) {
        items.push({ '@type': 'ListItem', position: 2, name, item: BASE_URL + path });
    } else {
        return null;
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items
    };
}

export function initSEO() {
    const path = window.location.pathname.replace(/\/$/, '') || '/index.html';

    // 1. Inject canonical (only if not already present in HTML)
    if (!document.querySelector('link[rel="canonical"]')) {
        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = BASE_URL + path;
        document.head.appendChild(canonical);
    }

    // 2. Hreflang alternate links
    [['zh-Hant', BASE_URL + path], ['x-default', BASE_URL + path]].forEach(([lang, href]) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = lang;
        link.href = href;
        document.head.appendChild(link);
    });

    // 3. Inject main Schema.org JSON-LD (only if not already present in HTML)
    const schema = buildSchema(path);
    if (schema && !document.querySelector('script[type="application/ld+json"]')) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema, null, 2);
        document.head.appendChild(script);
    }

    // 4. Inject BreadcrumbList (always separate, even if main schema exists)
    const breadcrumb = buildBreadcrumb(path);
    if (breadcrumb) {
        const bcScript = document.createElement('script');
        bcScript.type = 'application/ld+json';
        bcScript.textContent = JSON.stringify(breadcrumb, null, 2);
        document.head.appendChild(bcScript);
    }
}
