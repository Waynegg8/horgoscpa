<?php
// 導航欄HTML
echo <<<'EOT'
<!-- 導航欄 -->
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
</nav>

EOT;
?>
