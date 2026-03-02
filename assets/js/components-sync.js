/* HorgosCPA — Synchronous Nav/Footer Injection (eliminates CLS) */
/* This script is loaded synchronously (non-module) to inject nav/footer
   BEFORE the browser's first paint, preventing layout shift. */

(function () {
    var NAV_HTML = '<nav class="site-nav scrolled">' +
        '<a href="/index.html" class="logo">' +
        '<div class="logo-container">' +
        '<img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img" style="height: 40px; width: auto;" width="124" height="56">' +
        '<span class="logo-text-en">HORGOS CPA FIRM</span>' +
        '</div></a>' +
        '<ul id="site-nav-links" class="nav-links">' +
        '<li><a href="/services.html">專業服務</a></li>' +
        '<li><a href="/team.html">專業團隊</a></li>' +
        '<li><a href="/articles.html">文章專區</a></li>' +
        '<li><a href="/resources.html">資源專區</a></li>' +
        '<li><a href="/faq.html">常見問題</a></li>' +
        '<li><a href="/contact.html">聯絡我們</a></li>' +
        '</ul>' +
        '<a href="/booking.html" class="btn-solid-gold">預約諮詢</a>' +
        '<button class="mobile-toggle" aria-expanded="false" aria-controls="site-nav-links">選單</button>' +
        '</nav>';

    var FOOTER_HTML = '<footer class="footer-dark">' +
        '<div class="container footer-grid">' +
        '<div class="footer-brand">' +
        '<div class="logo-container" style="margin-bottom: 20px;">' +
        '<img src="/assets/images/logo-white.png" alt="霍爾果斯會計師事務所" class="logo-img" style="height: 48px; width: auto;" width="124" height="56">' +
        '<span class="logo-text-en">HORGOS CPA FIRM</span>' +
        '</div>' +
        '<p>每一筆數字背後，<br>都有一個值得被守護的夢想。</p>' +
        '</div>' +
        '<div class="footer-links">' +
        '<h4>網站地圖</h4>' +
        '<a href="/services.html">專業服務</a>' +
        '<a href="/team.html">專業團隊</a>' +
        '<a href="/articles.html">文章專區</a>' +
        '<a href="/resources.html">資源專區</a>' +
        '<a href="/faq.html">常見問題</a>' +
        '</div>' +
        '<div class="footer-links">' +
        '<h4>聯絡資訊</h4>' +
        '<p>台中市西區建國路21號3樓之1</p>' +
        '<p><a href="tel:0422205606">04-2220-5606</a></p>' +
        '<p>週一至週五 8:30-17:30</p>' +
        '<p><a href="mailto:contact@horgoscpa.com">contact@horgoscpa.com</a></p>' +
        '</div>' +
        '<div class="footer-links">' +
        '<h4>社群媒體</h4>' +
        '<a href="https://line.me/R/ti/p/@208ihted" target="_blank" rel="noopener noreferrer">Line 官方帳號</a>' +
        '</div>' +
        '</div></footer>';

    var nav = document.getElementById('nav-placeholder');
    if (nav) nav.outerHTML = NAV_HTML;

    var footer = document.getElementById('footer-placeholder');
    if (footer) footer.outerHTML = FOOTER_HTML;
})();
