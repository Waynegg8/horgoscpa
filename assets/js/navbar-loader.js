// 導航欄動態加載與功能初始化
document.addEventListener('DOMContentLoaded', function() {
    // 載入導航欄
    loadNavbar();
    
    // 窗口大小改變時重新加載頁面以應用正確的樣式
    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        if ((width <= 850 && window.prevWidth > 850) || 
            (width > 850 && window.prevWidth <= 850)) {
            window.prevWidth = width;
            // 延遲重新加載以避免連續調整大小時頻繁重新加載
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(function() {
                location.reload();
            }, 250);
        }
        window.prevWidth = width;
    });
    
    window.prevWidth = window.innerWidth;
});

// 載入導航欄HTML
function loadNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;
    
    // 直接插入導航欄HTML (無需從服務器加載)
    navbarContainer.innerHTML = `<!-- 導航欄 -->
<nav class="site-nav">
  <div class="nav-container">
    <div class="logo">
      <a href="/index.html">
        <div class="logo-main">霍爾果斯會計師事務所</div>
        <div class="logo-sub">HorgosCPA</div>
      </a>
    </div>
    <input type="checkbox" id="nav-toggle" class="nav-toggle">
    <label for="nav-toggle" class="nav-toggle-label">
      <span></span>
    </label>
    <ul class="nav-menu">
      <li class="nav-cta-item"><a href="/booking.html" class="nav-consult-btn">免費諮詢</a></li>
      <li class="nav-cta-item"><a href="https://line.me/R/ti/p/@208ihted" target="_blank" class="nav-line-btn">LINE</a></li>
      <li class="nav-divider"></li>
      <li class="has-dropdown">
        <a href="/services.html">服務項目</a>
        <div class="dropdown-menu">
          <a href="/services/tax.html">稅務服務</a>
          <a href="/services/accounting.html">記帳與會計</a>
          <a href="/services/consulting.html">企業顧問</a>
        </div>
      </li>
      <li><a href="/team.html">服務團隊</a></li>
      <li><a href="/blog.html">部落格</a></li>
      <li><a href="/faq.html">常見問題</a></li>
      <li><a href="/video.html">影片</a></li>
      <li><a href="/contact.html">聯絡資訊</a></li>
    </ul>
  </div>
</nav>`;
    
    // 初始化導航欄功能
    initNavbar();
}

// 初始化導航欄功能
function initNavbar() {
    // 僅在移動設備上添加下拉選單的點擊事件
    if (window.innerWidth <= 850) {
        const dropdownLinks = document.querySelectorAll('.has-dropdown > a');
        
        dropdownLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownMenu = this.nextElementSibling;
                dropdownMenu.classList.toggle('show');
            });
        });
    }
}
